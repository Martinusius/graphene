import { DynamicArray } from "../../DynamicArray";
import type { GraphRenderer } from "../../GraphRenderer";
import { Ids } from "../../Ids";
import { Versioner } from "../../Versioner";
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

  public vertices = new DynamicArray(1024);
  public edges = new DynamicArray(1024);

  public whereVertex = new Ids<number>();
  public whereEdge = new Ids<number>();

  public changed = false;

  public opCount = 0;

  private versioner = new Versioner();

  constructor(public readonly renderer: GraphRenderer) {
    this.incidency = [];

    this.versioner.track(
      this,
      "incidency",
      "vertexCount",
      "edgeCount",
      "vertices",
      "edges",
      "whereVertex",
      "whereEdge"
    );
  }

  undo() {
    this.changed = true;
    this.versioner.undo();
  }

  redo() {
    this.changed = true;
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

    this.edges.pushUint32(uIndex << 2);
    this.edges.pushUint32(vIndex << 2);
    this.edges.pushUint32(0);
    this.edges.pushUint32(id);

    this.edgeCount++;

    this.incidency[uIndex].set(v.id, id);
    this.incidency[vIndex].set(u.id, id);

    return new Edge(this, id);
  }

  addVertex(x?: number, y?: number) {
    this.changed = true;
    this.opCount++;

    this.incidency.push(new Map());

    const id = this.whereVertex.create(this.vertexCount);

    this.vertices.pushFloat32(x ?? random(100));
    this.vertices.pushFloat32(y ?? random(100));
    this.vertices.pushUint32(0);
    this.vertices.pushUint32(id);

    this.vertexCount++;

    return new Vertex(this, id);
  }

  deleteEdge(e: Edge) {
    this.changed = true;
    this.edgeCount--;

    this.opCount++;

    const edgeIndex = e.index;

    const u =
      this.edges.getUint32(edgeIndex * EDGE_SIZE + EdgeProperty.U_INDEX) >> 2;
    const v =
      this.edges.getUint32(edgeIndex * EDGE_SIZE + EdgeProperty.V_INDEX) >> 2;
    const uid = this.vertices.getUint32(u * VERTEX_SIZE + VertexProperty.ID);
    const vid = this.vertices.getUint32(v * VERTEX_SIZE + VertexProperty.ID);

    this.incidency[u].delete(vid);
    this.incidency[v].delete(uid);

    const id = this.edges.getUint32(edgeIndex * EDGE_SIZE + EdgeProperty.ID);
    this.whereEdge.delete(id);

    this.edges.setFrom(
      this.edges,
      this.edgeCount * EDGE_SIZE,
      edgeIndex * EDGE_SIZE,
      EDGE_SIZE
    );
    this.edges.length -= EDGE_SIZE;

    const swappedId = this.edges.getUint32(
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

    for (const incidentEdgeId of this.incidency[vertexIndex].values()) {
      const eIndex = this.whereEdge.get(incidentEdgeId)!;

      const u = this.edges.getUint32(eIndex * EDGE_SIZE + EdgeProperty.U_INDEX);
      const v = this.edges.getUint32(eIndex * EDGE_SIZE + EdgeProperty.V_INDEX);

      if (u >> 2 === this.vertexCount) {
        this.edges.setUint32(
          eIndex * EDGE_SIZE + EdgeProperty.U_INDEX,
          (vertexIndex << 2) | (u & 3)
        );
      } else if (v >> 2 === this.vertexCount) {
        this.edges.setUint32(
          eIndex * EDGE_SIZE + EdgeProperty.V_INDEX,
          (vertexIndex << 2) | (v & 3)
        );
      }
    }

    const id = this.vertices.getUint32(
      vertexIndex * VERTEX_SIZE + VertexProperty.ID
    );
    this.whereVertex.delete(id);

    this.vertices.setFrom(
      this.vertices,
      this.vertexCount * VERTEX_SIZE,
      vertexIndex * VERTEX_SIZE,
      VERTEX_SIZE
    );
    this.vertices.length -= VERTEX_SIZE;

    const swappedId = this.vertices.getUint32(
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

    this.vertices.buffer = vertexData.buffer;
    this.edges.buffer = edgeData.buffer;
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
    if (!this.transactions.length) return;

    const transaction = this.transactions.shift()!;

    await this.download();
    await transaction.callback();

    if (!transaction.undo && !transaction.redo && this.changed) {
      this.versioner.commit();
    }

    if (!transaction.redo && !transaction.undo) {
      this.versioner.clearRedo();
    }

    await this.upload();

    transaction.resolve();
  }

  async upload() {
    if (!this.changed) return;

    if (this.vertices.length > 16 * this.renderer.vertexData.size)
      this.renderer.vertexData.resizeErase(this.vertices.length / 16);

    if (this.edges.length > 16 * this.renderer.edgeData.size)
      this.renderer.edgeData.resizeErase(this.edges.length / 16);

    await Promise.all([
      this.vertexCount > 0
        ? this.renderer.vertexData.write(
            this.vertices.asFloat32Array(),
            0,
            this.vertexCount
          )
        : Promise.resolve(),
      this.edgeCount > 0
        ? this.renderer.edgeData.write(
            this.edges.asFloat32Array(),
            0,
            this.edgeCount
          )
        : Promise.resolve(),
    ]);

    this.renderer.vertices.count = this.vertexCount;
    this.renderer.edges.count = this.edgeCount;

    this.changed = false;
  }
}

export class Vertex {
  constructor(public readonly graph: Graph, public readonly id: number) {}

  get index() {
    return this.graph.whereVertex.get(this.id)!;
  }

  get x() {
    return this.graph.vertices.getFloat32(this.index * 16);
  }

  get y() {
    return this.graph.vertices.getFloat32(this.index * 16 + 4);
  }

  set x(x: number) {
    this.graph.vertices.setFloat32(this.index * 16, x);
  }

  set y(y: number) {
    this.graph.vertices.setFloat32(this.index * 16 + 4, y);
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
  constructor(public readonly graph: Graph, public id: number) {}

  get index() {
    return this.graph.whereEdge.get(this.id)!;
  }

  get u() {
    const index = this.graph.edges.getUint32(this.index * 16) >> 2;
    const id = this.graph.vertices.getUint32(index * 16 + 12);

    return this.graph.getVertex(id)!;
  }

  get v() {
    const index = this.graph.edges.getUint32(this.index * 16 + 4) >> 2;
    const id = this.graph.vertices.getUint32(index * 16 + 12);

    return this.graph.getVertex(id)!;
  }

  delete() {
    this.graph.deleteEdge(this);
  }
}
