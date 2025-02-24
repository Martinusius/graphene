import type { GraphRenderer } from "../../GraphRenderer";
import { Ids } from "../../Ids";
import { DynamicArray } from "../../DynamicArray";
import type { Transaction, TransactionOptions } from "../Transaction";
import { Operation } from "../Operation";
import { EDGE_SIZE, VERTEX_SIZE, VertexProperty } from "../Constants";
import { EdgeProperty } from "../Constants";
import { DirectedGraphUndo } from "./DirectedGraphUndo";
import { DirectedGraphRedo } from "./DirectedGraphRedo";
import { Auxiliary } from "../Auxiliary";

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

export class DirectedGraph {
  // Incident outgoing edges of i-th vertex
  // Neighbor vertex Id -> Outgoing edge Id
  public outcidency: Map<number, number>[];

  // Incident incoming edges of i-th vertex
  // Neighbor vertex Id -> Incoming edge Id
  public incidency: Map<number, number>[];

  public vertexCount = 0;
  public edgeCount = 0;

  public vertices = new DynamicArray(1024);
  public edges = new DynamicArray(1024);

  public whereVertex = new Ids<number>();
  public whereEdge = new Ids<number>();

  public changed = false;

  public undoStack = new DynamicArray(1024);
  public redoStack = new DynamicArray(1024);

  public opCount = 0;

  private undoManager: DirectedGraphUndo;
  private redoManager: DirectedGraphRedo;

  public vertexAuxiliary: Auxiliary;
  public edgeAuxiliary: Auxiliary;

  constructor(public readonly renderer: GraphRenderer) {
    this.incidency = [];
    this.outcidency = [];

    this.vertexAuxiliary = new Auxiliary(this.renderer.compute, false, this);
    this.edgeAuxiliary = new Auxiliary(this.renderer.compute, true, this);

    this.undoManager = new DirectedGraphUndo(
      this.outcidency,
      this.incidency,
      this,
      this.vertices,
      this.edges,
      this.undoStack,
      this.redoStack,
      this.whereVertex,
      this.whereEdge,
      this.vertexAuxiliary,
      this.edgeAuxiliary
    );

    this.redoManager = new DirectedGraphRedo(
      this.outcidency,
      this.incidency,
      this,
      this.vertices,
      this.edges,
      this.undoStack,
      this.redoStack,
      this.whereVertex,
      this.whereEdge,
      this.vertexAuxiliary,
      this.edgeAuxiliary
    );
  }

  undo() {
    if (this.undoStack.length === 0) {
      console.warn('Nothing to undo');
      return;
    }

    const opCount = this.undoStack.popUint32();
    console.log('undo opCount', opCount);
    for (let i = 0; i < opCount; i++) {
      const opIndex = this.undoStack.popUint8();

      const valid = this.undoManager.undo(opIndex) ||
        this.vertexAuxiliary.undo(opIndex) ||
        this.edgeAuxiliary.undo(opIndex);

      if (!valid) throw new Error('Invalid undo operation');
    }

    this.changed ||= opCount > 0;
    this.redoStack.pushUint32(opCount);
  }

  redo() {
    if (this.redoStack.length === 0) {
      console.warn('Nothing to redo');
      return;
    }

    const opCount = this.redoStack.popUint32();
    console.log('redo opCount', opCount);
    for (let i = 0; i < opCount; i++) {
      const opIndex = this.redoStack.popUint8();

      const valid = this.redoManager.redo(opIndex) ||
        this.vertexAuxiliary.redo(opIndex) ||
        this.edgeAuxiliary.redo(opIndex);

      if (!valid) throw new Error('Invalid redo operation');
    }

    this.changed ||= opCount > 0;
    this.opCount += opCount;
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
    const uIndex = u.index;
    const vIndex = v.index;

    if (this.outcidency[uIndex].has(v.id))
      throw new Error("Edge already exists");

    this.changed = true;
    this.opCount++;

    const id = this.whereEdge.create(this.edgeCount);

    const inverseId = this.incidency[uIndex].get(v.id);

    this.edges.pushUint32((uIndex << 2) | (inverseId ? 2 : 0));
    this.edges.pushUint32((vIndex << 2) | 1);
    this.edges.pushUint32(0);
    this.edges.pushUint32(id);

    this.edgeCount++;

    // if inverse edge exists, make it dual
    if (inverseId) {
      const inverseIndex = this.whereEdge.get(inverseId)!;
      this.edges.setUint32(
        inverseIndex * EDGE_SIZE,
        this.edges.getUint32(inverseIndex * EDGE_SIZE) | 2
      );
    }

    this.outcidency[uIndex].set(v.id, id);
    this.incidency[vIndex].set(u.id, id);

    this.edgeAuxiliary.pushObject();

    this.undoStack.pushUint8(Operation.ADD_EDGE);

    return new DirectedEdge(this, id);
  }

  addVertex(x?: number, y?: number) {
    this.changed = true;
    this.opCount++;

    this.incidency.push(new Map());
    this.outcidency.push(new Map());

    const id = this.whereVertex.create(this.vertexCount);

    this.vertices.pushFloat32(x ?? random(100));
    this.vertices.pushFloat32(y ?? random(100));
    this.vertices.pushUint32(0);
    this.vertices.pushUint32(id);

    this.vertexCount++;

    this.vertexAuxiliary.pushObject();

    this.undoStack.pushUint8(Operation.ADD_VERTEX);

    return new DirectedVertex(this, id);
  }

  deleteEdge(e: DirectedEdge) {
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

    const existsInverse = this.edges.getUint32(edgeIndex * EDGE_SIZE) & 2;

    // if inverse edge exists, make it non-dual
    if (existsInverse) {
      const inverseId = this.outcidency[v].get(uid)!;
      const inverseIndex = this.whereEdge.get(inverseId)!;
      this.edges.setUint32(inverseIndex * EDGE_SIZE, v << 2);
    }

    this.outcidency[u].delete(vid);
    this.incidency[v].delete(uid);

    this.edgeAuxiliary.swapObjectsLast(edgeIndex);
    this.edgeAuxiliary.popObjectToArray(this.redoStack);

    this.undoStack.pushFrom(this.edges, edgeIndex * EDGE_SIZE, EDGE_SIZE);
    this.undoStack.pushUint32(edgeIndex);
    this.undoStack.pushUint8(Operation.DELETE_EDGE);


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

  deleteVertex(v: DirectedVertex) {
    this.changed = true;
    this.opCount++;

    const vertexIndex = v.index;

    for (const edge of v.in) this.deleteEdge(edge);

    for (const edge of v.out) this.deleteEdge(edge);

    this.vertexCount--;

    this.incidency[vertexIndex] = this.incidency[this.vertexCount];
    this.outcidency[vertexIndex] = this.outcidency[this.vertexCount];

    for (const outcidentEdgeId of this.outcidency[vertexIndex].values()) {
      const eIndex = this.whereEdge.get(outcidentEdgeId)!;
      const u = this.edges.getUint32(eIndex * EDGE_SIZE + EdgeProperty.U_INDEX);
      this.edges.setUint32(
        eIndex * EDGE_SIZE + EdgeProperty.U_INDEX,
        (vertexIndex << 2) | (u & 3)
      );
    }

    for (const incidentEdgeId of this.incidency[vertexIndex].values()) {
      const eIndex = this.whereEdge.get(incidentEdgeId)!;
      const v = this.edges.getUint32(eIndex * EDGE_SIZE + EdgeProperty.V_INDEX);
      this.edges.setUint32(
        eIndex * EDGE_SIZE + EdgeProperty.V_INDEX,
        (vertexIndex << 2) | (v & 3)
      );
    }

    this.vertexAuxiliary.swapObjectsLast(vertexIndex);
    this.vertexAuxiliary.popObjectToArray(this.undoStack);

    this.undoStack.pushFrom(
      this.vertices,
      vertexIndex * VERTEX_SIZE,
      VERTEX_SIZE
    );

    this.undoStack.pushUint32(vertexIndex);
    this.undoStack.pushUint8(Operation.DELETE_VERTEX);

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
    this.outcidency.pop();
  }

  getVertex(id: number): DirectedVertex | undefined {
    if (!this.whereVertex.has(id)) return undefined;
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

    if (!transaction.undo && this.changed) {
      this.undoStack.pushUint32(this.opCount);
      this.opCount = 0;
    }

    if (!transaction.redo && !transaction.undo) {
      this.redoStack.length = 0;
    }

    await this.upload();
    await this.vertexAuxiliary.upload();
    await this.edgeAuxiliary.upload();

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

export class DirectedVertex {
  constructor(
    public readonly graph: DirectedGraph,
    public readonly id: number
  ) { }

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

  delete() {
    this.graph.deleteVertex(this);
  }
}

export class DirectedEdge {
  constructor(public readonly graph: DirectedGraph, public id: number) { }

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
