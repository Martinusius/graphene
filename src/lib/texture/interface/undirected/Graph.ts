import { DynamicArray } from "../../DynamicArray";
import type { GraphRenderer } from "../../GraphRenderer";
import { Ids } from "../../Ids";
import { Versioner } from "../../Versioner";
import { Auxiliary } from "../Auxiliary";
import {
  EDGE_SIZE,
  EdgeProperty,
  VERTEX_SIZE,
  VertexProperty,
} from "../Constants";

import type { Transaction, TransactionOptions } from "../Transaction";

function random(r: number) {
  return r * 2 * (Math.random() - 1);
}

export class Graph {
  // for each vertex index: map from neighbor id to edge id
  public incidency: Map<number, number>[];

  public vertexCount = 0;
  public edgeCount = 0;

  public vertexData = new DynamicArray(1024);
  public edgeData = new DynamicArray(1024);

  public whereVertex = new Ids<number>();
  public whereEdge = new Ids<number>();

  public changed = false;

  public opCount = 0;

  private vertexAuxiliary: Auxiliary;
  private edgeAuxiliary: Auxiliary;

  public versioner = new Versioner();

  constructor(public readonly renderer: GraphRenderer) {
    this.incidency = [];

    this.versioner.track(
      this,
      "incidency",
      "vertexCount",
      "edgeCount",
      "vertexData",
      "edgeData",
      "whereVertex",
      "whereEdge"
    );

    this.vertexAuxiliary = new Auxiliary(this.renderer.compute);
    this.edgeAuxiliary = new Auxiliary(this.renderer.compute);

    [this.vertexAuxiliary, this.edgeAuxiliary].forEach((auxiliary) => {
      this.versioner.track(
        auxiliary,
        "arrays",
        "whereProperty",
        "objectCount",
        "propertyCount"
      );
    });
  }

  undo() {
    this.changed = true;
    this.vertexAuxiliary.changed = true;
    this.edgeAuxiliary.changed = true;

    this.versioner.undo();
  }

  redo() {
    this.changed = true;
    this.vertexAuxiliary.changed = true;
    this.edgeAuxiliary.changed = true;

    this.versioner.redo();
  }

  merge(vertices: Vertex[]) {
    if (vertices.length === 0) return;

    const ids = new Set(vertices.map((vertex) => vertex.id));
    const neighborIds = new Set<number>();

    const averagePosition = { x: 0, y: 0 };
    const count = vertices.length;

    for (const vertex of vertices) {
      for (const edge of vertex.edges) {
        const u = edge.u;
        const v = edge.v;

        if (!ids.has(u.id)) neighborIds.add(u.id);
        if (!ids.has(v.id)) neighborIds.add(v.id);
      }

      averagePosition.x += vertex.x;
      averagePosition.y += vertex.y;

      vertex.delete();
    }

    const newVertex = this.addVertex(
      averagePosition.x / count,
      averagePosition.y / count
    );

    for (const id of neighborIds) {
      const vertex = this.getVertex(id)!;
      this.addEdge(newVertex, vertex);
    }

    return newVertex;
  }

  cliqueify(vertices: Vertex[]) {
    for (const vertex of vertices) {
      for (const other of vertices) {
        if (vertex === other || this.getEdgeBetween(vertex, other)) continue;

        this.addEdge(vertex, other);
      }
    }
  }

  addEdge(u: Vertex, v: Vertex) {
    const uIndex = u.index;
    const vIndex = v.index;

    if (this.incidency[uIndex].has(v.id))
      throw new Error("Edge already exists");

    this.changed = true;
    this.opCount++;

    const id = this.whereEdge.create(this.edgeCount);

    this.edgeData.pushUint32(uIndex << 2);
    this.edgeData.pushUint32(vIndex << 2);
    this.edgeData.pushUint32(0);
    this.edgeData.pushUint32(id);

    this.edgeAuxiliary.pushObject();

    this.incidency[uIndex].set(v.id, id);
    this.incidency[vIndex].set(u.id, id);

    this.edgeCount++;

    return new Edge(this, id);
  }

  addVertex(x?: number, y?: number) {
    this.changed = true;
    this.opCount++;

    this.incidency.push(new Map());

    const id = this.whereVertex.create(this.vertexCount);

    this.vertexData.pushFloat32(x ?? random(100));
    this.vertexData.pushFloat32(y ?? random(100));
    this.vertexData.pushUint32(0);
    this.vertexData.pushUint32(id);

    this.vertexAuxiliary.pushObject();

    this.vertexCount++;

    return new Vertex(this, id);
  }

  deleteEdge(e: Edge) {
    this.changed = true;
    this.edgeCount--;

    this.opCount++;

    const edgeIndex = e.index;

    const u =
      this.edgeData.getUint32(edgeIndex * EDGE_SIZE + EdgeProperty.U_INDEX) >> 2;
    const v =
      this.edgeData.getUint32(edgeIndex * EDGE_SIZE + EdgeProperty.V_INDEX) >> 2;
    const uid = this.vertexData.getUint32(u * VERTEX_SIZE + VertexProperty.ID);
    const vid = this.vertexData.getUint32(v * VERTEX_SIZE + VertexProperty.ID);

    this.incidency[u].delete(vid);
    this.incidency[v].delete(uid);

    this.edgeAuxiliary.swapObjectWithLast(edgeIndex);
    this.edgeAuxiliary.popObject();

    const id = this.edgeData.getUint32(edgeIndex * EDGE_SIZE + EdgeProperty.ID);
    this.whereEdge.delete(id);

    this.edgeData.setFrom(
      this.edgeData,
      this.edgeCount * EDGE_SIZE,
      edgeIndex * EDGE_SIZE,
      EDGE_SIZE
    );
    this.edgeData.length -= EDGE_SIZE;

    const swappedId = this.edgeData.getUint32(
      edgeIndex * EDGE_SIZE + EdgeProperty.ID
    );
    this.whereEdge.set(swappedId, edgeIndex);
  }

  deleteVertex(v: Vertex) {
    this.changed = true;
    this.opCount++;

    const vertexIndex = v.index;

    for (const edge of v.edges) this.deleteEdge(edge);

    this.vertexCount--;

    this.incidency[vertexIndex] = this.incidency[this.vertexCount];

    this.vertexAuxiliary.swapObjectWithLast(vertexIndex);
    this.vertexAuxiliary.popObject();

    for (const incidentEdgeId of this.incidency[vertexIndex].values()) {
      const eIndex = this.whereEdge.get(incidentEdgeId)!;

      const u = this.edgeData.getUint32(eIndex * EDGE_SIZE + EdgeProperty.U_INDEX);
      const v = this.edgeData.getUint32(eIndex * EDGE_SIZE + EdgeProperty.V_INDEX);

      if (u >> 2 === this.vertexCount) {
        this.edgeData.setUint32(
          eIndex * EDGE_SIZE + EdgeProperty.U_INDEX,
          (vertexIndex << 2) | (u & 3)
        );
      } else if (v >> 2 === this.vertexCount) {
        this.edgeData.setUint32(
          eIndex * EDGE_SIZE + EdgeProperty.V_INDEX,
          (vertexIndex << 2) | (v & 3)
        );
      }
    }

    const id = this.vertexData.getUint32(
      vertexIndex * VERTEX_SIZE + VertexProperty.ID
    );
    this.whereVertex.delete(id);

    this.vertexData.setFrom(
      this.vertexData,
      this.vertexCount * VERTEX_SIZE,
      vertexIndex * VERTEX_SIZE,
      VERTEX_SIZE
    );
    this.vertexData.length -= VERTEX_SIZE;

    const swappedId = this.vertexData.getUint32(
      vertexIndex * VERTEX_SIZE + VertexProperty.ID
    );
    this.whereVertex.set(swappedId, vertexIndex);

    this.incidency.pop();
  }

  getVertex(id: number): Vertex | undefined {
    if (!this.whereVertex.has(id)) return undefined;
    return new Vertex(this, id);
  }

  getEdge(id: number): Edge | undefined {
    if (!this.whereEdge.has(id)) return undefined;
    return new Edge(this, id);
  }

  getEdgeBetween(u: Vertex, v: Vertex): Edge | undefined {
    return this.getEdge(this.incidency[u.index].get(v.id) ?? -1);
  }

  async download() {
    const [vertexData, edgeData] = await Promise.all([
      this.renderer.vertexData.read(),
      this.renderer.edgeData.read(),
    ]);

    this.vertexData.buffer = vertexData.buffer;
    this.edgeData.buffer = edgeData.buffer;
  }

  private transactions: Transaction[] = [];

  transaction(callback: () => void, options: TransactionOptions = {}) {
    return new Promise<void>((resolve) => {
      this.transactions.push({
        callback,
        resolve,
        ...options,
      });
    });
  }

  async tick() {
    if (!this.transactions.length) return false;

    const transaction = this.transactions.shift()!;

    await this.download();
    await transaction.callback();

    if (!transaction.undo &&
      !transaction.redo &&
      (this.changed ||
        this.vertexAuxiliary.changed ||
        this.edgeAuxiliary.changed)
    ) {
      this.versioner.commit();
    }

    if (!transaction.redo && !transaction.undo) {
      this.versioner.clearRedo();
    }

    await this.upload();
    await this.vertexAuxiliary.upload();
    await this.edgeAuxiliary.upload();

    transaction.resolve();

    return true;
  }

  async upload() {
    if (!this.changed) return;

    if (this.vertexData.length > 16 * this.renderer.vertexData.size)
      this.renderer.vertexData.resizeErase(this.vertexData.length / 16);

    if (this.edgeData.length > 16 * this.renderer.edgeData.size)
      this.renderer.edgeData.resizeErase(this.edgeData.length / 16);

    await Promise.all([
      this.vertexCount > 0
        ? this.renderer.vertexData.write(
          this.vertexData.asFloat32Array(),
          0,
          this.vertexCount
        )
        : Promise.resolve(),
      this.edgeCount > 0
        ? this.renderer.edgeData.write(
          this.edgeData.asFloat32Array(),
          0,
          this.edgeCount
        )
        : Promise.resolve(),
    ]);

    this.renderer.vertices.count = this.vertexCount;
    this.renderer.edges.count = this.edgeCount;

    this.changed = false;
  }

  get vertices() {
    const result: Vertex[] = [];

    for (let i = 0; i < this.vertexCount; i++) {
      result.push(this.vertexAt(i));
    }

    return result;
  }

  get edges() {
    const result: Edge[] = [];

    for (let i = 0; i < this.edgeCount; i++) {
      result.push(this.edgeAt(i));
    }

    return result;
  }

  vertexAt(index: number) {
    return new Vertex(this, this.vertexData.getUint32(index * VERTEX_SIZE + VertexProperty.ID));
  }

  edgeAt(index: number) {
    return new Edge(this, this.edgeData.getUint32(index * EDGE_SIZE + EdgeProperty.ID));
  }
}

export class Vertex {
  constructor(public readonly graph: Graph, public readonly id: number) { }

  get index() {
    return this.graph.whereVertex.get(this.id)!;
  }

  get x() {
    return this.graph.vertexData.getFloat32(this.index * VERTEX_SIZE + VertexProperty.POSITION_X);
  }

  get y() {
    return this.graph.vertexData.getFloat32(this.index * VERTEX_SIZE + VertexProperty.POSITION_Y);
  }

  set x(x: number) {
    this.graph.changed = true;
    this.graph.vertexData.setFloat32(this.index * VERTEX_SIZE + VertexProperty.POSITION_X, x);
  }

  set y(y: number) {
    this.graph.changed = true;
    this.graph.vertexData.setFloat32(this.index * VERTEX_SIZE + VertexProperty.POSITION_Y, y);
  }

  get isSelected() {
    return (this.graph.vertexData.getUint32(this.index * VERTEX_SIZE + VertexProperty.SELECTION_FLAGS) & 1) === 1;
  }

  get edges() {
    return this.graph.incidency[this.index]
      .values()
      .map((e) => this.graph.getEdge(e)!);
  }

  delete() {
    this.graph.deleteVertex(this);
  }
}

export class Edge {
  constructor(public readonly graph: Graph, public id: number) { }

  get index() {
    return this.graph.whereEdge.get(this.id)!;
  }

  get u() {
    const index = this.graph.edgeData.getUint32(this.index * EDGE_SIZE + EdgeProperty.U_INDEX) >> 2;
    const id = this.graph.vertexData.getUint32(index * VERTEX_SIZE + VertexProperty.ID);

    return this.graph.getVertex(id)!;
  }

  get v() {
    const index = this.graph.edgeData.getUint32(this.index * EDGE_SIZE + EdgeProperty.V_INDEX) >> 2;
    const id = this.graph.vertexData.getUint32(index * VERTEX_SIZE + VertexProperty.ID);

    return this.graph.getVertex(id)!;
  }

  get isSelected() {
    return (this.graph.edgeData.getUint32(this.index * EDGE_SIZE + EdgeProperty.SELECTION_FLAGS) & 1) === 1;
  }

  delete() {
    this.graph.deleteEdge(this);
  }
}
