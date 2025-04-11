import type { GraphRenderer } from "../../GraphRenderer";
import { Ids } from "../../Ids";
import { DynamicArray } from "../../DynamicArray";
import type { Transaction, TransactionOptions } from "../Transaction";
import { EDGE_SIZE, VERTEX_SIZE, VertexProperty } from "../Constants";
import { EdgeProperty } from "../Constants";
import { Auxiliary } from "../Auxiliary";
import { Versioner } from "../../Versioner";
import type { Edge, Graph, Vertex } from "../Graph";

function random(r: number) {
  return r * 2 * (Math.random() - 1);
}

// Terminology:
// Index:
// - Position of a vertex or an edge in the buffer
// - Changes regularly during deletion
// Id:
// - Uniquely identifies a vertex or an edge
// - Does not change during the lifetime of the vertex or edge
// - After deletion of the vertex or edge, the id is free to be reused (not universally unique)

// How the vertices and edges are stored in the buffer:
// Vertex (16 bytes):
// - Position x (4 bytes)
// - Position y (4 bytes)
// - Selection flags (4 bytes): isSelected, isTemporarilySelected (while dragging selection rectangle), isHovered, isDragged
// - Id (4 bytes): Unique identifier of the vertex (as mentioned above)

// Edge (16 bytes):
// - U index (4 bytes): The index of the vertex the edge is coming from (2 LSB are used)
// - V index (4 bytes): The index of the vertex the edge is going to
// - Selection flags (4 bytes): isSelected, isTemporarilySelected (while dragging selection rectangle), isHovered, isDragged
// - Id (4 bytes): Unique identifier of the edge (as mentioned above)

// Note:
// Changing other selection flags than isSelected is generally not recommended

export class DirectedGraph implements Graph {
  public isDirected = true;

  // Incident outgoing edges of i-th vertex
  // Neighbor vertex Id -> Outgoing edge Id
  public outcidency: Map<number, number>[];

  // Incident incoming edges of i-th vertex
  // Neighbor vertex Id -> Incoming edge Id
  public incidency: Map<number, number>[];

  public vertexCount = 0;
  public edgeCount = 0;

  public vertexData = new DynamicArray(1024);
  public edgeData = new DynamicArray(1024);

  public whereVertex = new Ids<number>();
  public whereEdge = new Ids<number>();

  public changed = false;

  public opCount = 0;

  public vertexAuxiliary: Auxiliary;
  public edgeAuxiliary: Auxiliary;

  public versioner = new Versioner();

  public vertexDisplayProperty: string | null = null;
  public edgeDisplayProperty: string | null = null;

  constructor(public readonly renderer: GraphRenderer) {
    this.incidency = [];
    this.outcidency = [];

    this.versioner.track(
      this,
      "outcidency",
      "incidency",
      "vertexCount",
      "edgeCount",
      "vertexData",
      "edgeData",
      "whereVertex",
      "whereEdge",
      "vertexDisplayProperty",
      "edgeDisplayProperty",
    );

    this.vertexAuxiliary = new Auxiliary(this.renderer.compute);
    this.edgeAuxiliary = new Auxiliary(this.renderer.compute);

    [this.vertexAuxiliary, this.edgeAuxiliary].forEach((auxiliary) => {
      this.versioner.track(
        auxiliary,
        "arrays",
        "properties",
        "propertyNames",
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

  merge(vertices: DirectedVertex[]) {
    if (vertices.length === 0) return;

    const ids = new Set(vertices.map((vertex) => vertex.id));
    const outIds = new Set<number>();
    const inIds = new Set<number>();

    const averagePosition = { x: 0, y: 0 };
    const count = vertices.length;

    for (const vertex of vertices) {
      for (const edge of vertex.out) {
        const v = edge.v;
        if (!ids.has(v.id)) outIds.add(v.id);
      }

      for (const edge of vertex.in) {
        const u = edge.u;
        if (!ids.has(u.id)) inIds.add(u.id);
      }

      averagePosition.x += vertex.x;
      averagePosition.y += vertex.y;

      vertex.delete();
    }

    const newVertex = this.addVertex(
      averagePosition.x / count,
      averagePosition.y / count
    );

    for (const id of outIds) {
      const vertex = this.getVertex(id)!;
      this.addEdge(newVertex, vertex);
    }

    for (const id of inIds) {
      const vertex = this.getVertex(id)!;
      this.addEdge(vertex, newVertex);
    }

    return newVertex;
  }

  cliqueify(vertices: DirectedVertex[]) {
    for (const vertex of vertices) {
      for (const other of vertices) {
        if (vertex === other || this.getEdgeFromTo(vertex, other)) continue;

        this.addEdge(vertex, other);
      }
    }
  }

  addEdge(u: DirectedVertex, v: DirectedVertex) {
    if (u.id === v.id)
      throw new Error("Cannot add self-loop");

    const uIndex = u.index;
    const vIndex = v.index;

    if (this.outcidency[uIndex].has(v.id))
      throw new Error("Edge already exists");

    this.changed = true;
    this.opCount++;

    const id = this.whereEdge.create(this.edgeCount);

    const inverseId = this.incidency[uIndex].get(v.id);

    this.edgeData.pushUint32((uIndex << 2) | (inverseId ? 2 : 0));
    this.edgeData.pushUint32((vIndex << 2) | 1);
    this.edgeData.pushUint32(0);
    this.edgeData.pushUint32(id);

    this.edgeAuxiliary.pushObject();

    // if inverse edge exists, make it dual
    if (inverseId) {
      const inverseIndex = this.whereEdge.get(inverseId)!;
      this.edgeData.setUint32(
        inverseIndex * EDGE_SIZE,
        this.edgeData.getUint32(inverseIndex * EDGE_SIZE) | 2
      );
    }

    this.outcidency[uIndex].set(v.id, id);
    this.incidency[vIndex].set(u.id, id);

    this.edgeCount++;


    return new DirectedEdge(this, id);
  }

  addVertex(x?: number, y?: number) {
    this.changed = true;
    this.opCount++;

    this.incidency.push(new Map());
    this.outcidency.push(new Map());

    const id = this.whereVertex.create(this.vertexCount);

    this.vertexData.pushFloat32(x ?? random(100));
    this.vertexData.pushFloat32(y ?? random(100));
    this.vertexData.pushUint32(0);
    this.vertexData.pushUint32(id);

    this.vertexAuxiliary.pushObject();

    this.vertexCount++;

    return new DirectedVertex(this, id);
  }

  deleteEdge(e: DirectedEdge) {
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

    const existsInverse = this.edgeData.getUint32(edgeIndex * EDGE_SIZE) & 2;

    // if inverse edge exists, make it non-dual
    if (existsInverse) {
      const inverseId = this.outcidency[v].get(uid)!;
      const inverseIndex = this.whereEdge.get(inverseId)!;
      this.edgeData.setUint32(inverseIndex * EDGE_SIZE, v << 2);
    }

    this.outcidency[u].delete(vid);
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

  deleteVertex(v: DirectedVertex) {
    this.changed = true;
    this.opCount++;

    const vertexIndex = v.index;

    for (const edge of v.in) this.deleteEdge(edge);
    for (const edge of v.out) this.deleteEdge(edge);

    this.vertexCount--;

    this.incidency[vertexIndex] = this.incidency[this.vertexCount];
    this.outcidency[vertexIndex] = this.outcidency[this.vertexCount];

    this.vertexAuxiliary.swapObjectWithLast(vertexIndex);
    this.vertexAuxiliary.popObject();

    for (const outcidentEdgeId of this.outcidency[vertexIndex].values()) {
      const eIndex = this.whereEdge.get(outcidentEdgeId)!;
      const u = this.edgeData.getUint32(eIndex * EDGE_SIZE + EdgeProperty.U_INDEX);
      this.edgeData.setUint32(
        eIndex * EDGE_SIZE + EdgeProperty.U_INDEX,
        (vertexIndex << 2) | (u & 3)
      );
    }

    for (const incidentEdgeId of this.incidency[vertexIndex].values()) {
      const eIndex = this.whereEdge.get(incidentEdgeId)!;
      const v = this.edgeData.getUint32(eIndex * EDGE_SIZE + EdgeProperty.V_INDEX);
      this.edgeData.setUint32(
        eIndex * EDGE_SIZE + EdgeProperty.V_INDEX,
        (vertexIndex << 2) | (v & 3)
      );
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
    this.outcidency.pop();
  }

  getVertex(id: number): DirectedVertex {
    if (!this.whereVertex.has(id)) return undefined as any;
    return new DirectedVertex(this, id);
  }

  getEdge(id: number): DirectedEdge | undefined {
    if (!this.whereEdge.has(id)) return undefined;
    return new DirectedEdge(this, id);
  }

  getEdgeFromTo(
    u: DirectedVertex,
    v: DirectedVertex
  ): DirectedEdge | undefined {
    return this.getEdge(this.outcidency[u.index].get(v.id) ?? -1);
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

  async beforeRender() {
    this.renderer.text.vertices.maxDigits = this.vertexDisplayProperty ? 8 : 0;
    this.renderer.text.edges.maxDigits = this.edgeDisplayProperty ? 8 : 0;

    if (this.vertexDisplayProperty === 'ID' || this.vertexDisplayProperty === null) {
      this.renderer.text.vertices.aux = this.renderer.text.vertices.defaultAux;
    }
    else {
      this.renderer.text.vertices.aux = this.vertexAuxiliary.ref(this.vertexDisplayProperty);
    }

    if (this.edgeDisplayProperty === 'ID' || this.edgeDisplayProperty === null) {
      this.renderer.text.edges.aux = this.renderer.text.edges.defaultAux;
    }
    else {
      this.renderer.text.edges.aux = this.edgeAuxiliary.ref(this.edgeDisplayProperty);
    }
  }

  async tick() {
    if (!this.transactions.length) return null;

    const transaction = this.transactions.shift()!;

    await this.download();

    if (!transaction.undo && !transaction.redo) {
      this.versioner.precommit();
    }

    await transaction.callback();

    if (!transaction.undo && !transaction.redo) {
      this.versioner.commit();
    }

    if (!transaction.redo && !transaction.undo) {
      this.versioner.clearRedo();
    }

    await this.upload();
    await this.vertexAuxiliary.upload();
    await this.edgeAuxiliary.upload();

    return () => transaction.resolve();
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

  dispose() {
    this.vertexAuxiliary.dispose();
    this.edgeAuxiliary.dispose();
    this.renderer.vertexData.write(new Float32Array(this.renderer.vertexData.size * 4));
    this.renderer.edgeData.write(new Float32Array(this.renderer.vertexData.size * 4));

    this.renderer.vertices.count = 0;
    this.renderer.edges.count = 0;
  }

  get vertices() {
    const result: DirectedVertex[] = [];

    for (let i = 0; i < this.vertexCount; i++) {
      result.push(this.vertexAt(i));
    }

    return result;
  }

  get edges() {
    const result: DirectedEdge[] = [];

    for (let i = 0; i < this.edgeCount; i++) {
      result.push(this.edgeAt(i));
    }

    return result;
  }

  vertexAt(index: number) {
    return new DirectedVertex(this, this.vertexData.getUint32(index * VERTEX_SIZE + VertexProperty.ID));
  }

  edgeAt(index: number) {
    return new DirectedEdge(this, this.edgeData.getUint32(index * EDGE_SIZE + EdgeProperty.ID))
  }
}

export class DirectedVertex implements Vertex {
  constructor(
    public readonly graph: DirectedGraph,
    public readonly id: number
  ) { }

  get index() {
    return this.graph.whereVertex.get(this.id)!;
  }

  get x() {
    return this.graph.vertexData.getFloat32(
      this.index * VERTEX_SIZE + VertexProperty.POSITION_X
    );
  }

  get y() {
    return this.graph.vertexData.getFloat32(
      this.index * VERTEX_SIZE + VertexProperty.POSITION_Y
    );
  }

  set x(x: number) {
    this.graph.changed = true;
    this.graph.vertexData.setFloat32(
      this.index * VERTEX_SIZE + VertexProperty.POSITION_X,
      x
    );
  }

  set y(y: number) {
    this.graph.changed = true;
    this.graph.vertexData.setFloat32(
      this.index * VERTEX_SIZE + VertexProperty.POSITION_Y,
      y
    );
  }

  setProperty(name: string, value: number): void {
    this.graph.vertexAuxiliary.setProperty(name, this.index, value);
  }

  getProperty(name: string): number {
    return this.graph.vertexAuxiliary.getProperty(name, this.index);
  }

  get out() {
    return this.graph.outcidency[this.index]
      .values()
      .map((e) => this.graph.getEdge(e)!);
  }

  get in() {
    return this.graph.incidency[this.index]
      .values()
      .map((e) => this.graph.getEdge(e)!);
  }

  get isSelected() {
    return (this.graph.vertexData.getUint32(this.index * VERTEX_SIZE + VertexProperty.SELECTION_FLAGS) & 1) === 1;
  }

  set isSelected(value: boolean) {
    const flags = this.graph.vertexData.getUint32(this.index * VERTEX_SIZE + VertexProperty.SELECTION_FLAGS);
    this.graph.vertexData.setUint32(
      this.index * VERTEX_SIZE + VertexProperty.SELECTION_FLAGS,
      flags & ~0b11 | Number(value) * 0b11
    );
  }

  delete() {
    this.graph.deleteVertex(this);
  }

  async download() {
    const vertex = await this.graph.renderer.vertexData.read(this.index, 1);
    this.graph.vertexData.setFrom(vertex, 0, this.index * VERTEX_SIZE, VERTEX_SIZE);
  }
}

export class DirectedEdge implements Edge {
  constructor(public readonly graph: DirectedGraph, public id: number) { }

  get index() {
    return this.graph.whereEdge.get(this.id)!;
  }

  get u() {
    const index =
      this.graph.edgeData.getUint32(
        this.index * EDGE_SIZE + EdgeProperty.U_INDEX
      ) >> 2;
    const id = this.graph.vertexData.getUint32(
      index * VERTEX_SIZE + VertexProperty.ID
    );
    return this.graph.getVertex(id)!;
  }

  get v() {
    const index =
      this.graph.edgeData.getUint32(
        this.index * EDGE_SIZE + EdgeProperty.V_INDEX
      ) >> 2;
    const id = this.graph.vertexData.getUint32(
      index * VERTEX_SIZE + VertexProperty.ID
    );
    return this.graph.getVertex(id)!;
  }

  setProperty(name: string, value: number): void {
    this.graph.edgeAuxiliary.setProperty(name, this.index, value);
  }

  getProperty(name: string): number {
    return this.graph.edgeAuxiliary.getProperty(name, this.index);
  }

  get isSelected() {
    return (this.graph.edgeData.getUint32(this.index * EDGE_SIZE + EdgeProperty.SELECTION_FLAGS) & 1) === 1;
  }

  set isSelected(value: boolean) {
    const flags = this.graph.edgeData.getUint32(this.index * EDGE_SIZE + EdgeProperty.SELECTION_FLAGS);
    this.graph.edgeData.setUint32(
      this.index * EDGE_SIZE + EdgeProperty.SELECTION_FLAGS,
      flags & ~0b11 | Number(value) * 0b11
    );
  }

  delete() {
    this.graph.deleteEdge(this);
  }

  async download() {
    const edge = await this.graph.renderer.edgeData.read(this.index, 1);
    this.graph.edgeData.setFrom(edge, 0, this.index * EDGE_SIZE, EDGE_SIZE);
  }
}
