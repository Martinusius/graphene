import { DynamicArray } from "../DynamicArray";
import type { GraphRenderer } from "../GraphRenderer";
import { Ids } from "../Ids";
import { Operation } from "./Operation";
import type { Transaction, TransactionOptions } from "./Transaction";

function random(r: number) {
  return r * 2 * (Math.random() - 1);
}

export class Graph {
  // for each vertex index: map from neighbor id to edge id
  public incidency: Map<number, number>[];

  private vertexCount = 0;
  private edgeCount = 0;

  public vertices = new DynamicArray(1024);
  public edges = new DynamicArray(1024);

  public whereVertex = new Ids<number>();
  public whereEdge = new Ids<number>();

  private changed = false;

  private undoStack = new DynamicArray(1024);
  private redoStack = new DynamicArray(1024);

  private opCount = 0;

  constructor(public readonly renderer: GraphRenderer) {
    this.incidency = [];
  }

  private undoAddVertex() {
    this.changed = true;

    this.vertexCount--;

    this.redoStack.pushFrom(this.vertices, this.vertexCount * 16, 16);
    this.redoStack.pushUint8(Operation.ADD_VERTEX);

    const id = this.vertices.getUint32(this.vertexCount * 16 + 12);

    this.whereVertex.delete(id);
    this.incidency.pop();

    this.vertices.setUint32(this.vertexCount * 16 + 12, 0);

    this.vertices.length -= 16;
  }

  private undoAddEdge() {
    this.changed = true;

    this.edgeCount--;

    this.redoStack.pushFrom(this.edges, this.edgeCount * 16, 16);
    this.redoStack.pushUint8(Operation.ADD_EDGE);

    const id = this.edges.getUint32(this.edgeCount * 16 + 12);

    this.edges.setUint32(this.edgeCount * 16 + 12, 0);

    const u = this.edges.getUint32(this.edgeCount * 16) >> 2;
    const uid = this.vertices.getUint32(u * 16 + 12);

    const v = this.edges.getUint32(this.edgeCount * 16 + 4) >> 2;
    const vid = this.vertices.getUint32(v * 16 + 12);

    this.incidency[u].delete(vid);
    this.incidency[v].delete(uid);

    this.whereEdge.delete(id);


    this.edges.length -= 16;
  }

  private undoDeleteVertex() {
    this.changed = true;

    const vIndex = this.undoStack.popUint32();

    this.vertices.length += 16;
    this.vertices.setFrom(this.vertices, vIndex * 16, this.vertexCount * 16, 16);

    const id2 = this.vertices.getUint32(vIndex * 16 + 12);

    this.vertices.popFrom(this.undoStack, vIndex * 16, 16);

    const id = this.vertices.getUint32(vIndex * 16 + 12);

    const nid = this.whereVertex.create(vIndex); // Ids implementation guarantees the id will be the same as last time

    if (id !== nid) throw new Error('Id mismatch in undoDeleteVertex');


    if (vIndex !== this.vertexCount) this.whereVertex.set(id2, this.vertexCount);

    this.incidency.push(this.incidency[vIndex] ?? new Map());
    this.incidency[vIndex] = new Map();


    for (const incidentEdgeId of this.incidency[this.vertexCount].values()) {
      const eIndex = this.whereEdge.get(incidentEdgeId)!;

      const u = this.edges.getUint32(eIndex * 16);
      const v = this.edges.getUint32(eIndex * 16 + 4);

      if (u >> 2 === vIndex) {
        this.edges.setUint32(eIndex * 16, (this.vertexCount << 2) | (u & 3));
      }
      else if (v >> 2 === vIndex) {
        this.edges.setUint32(eIndex * 16 + 4, (this.vertexCount << 2) | (v & 3));
      }
    }

    this.redoStack.pushUint32(vIndex);
    this.redoStack.pushUint8(Operation.DELETE_VERTEX);

    this.vertexCount++;
  }

  private undoDeleteEdge() {
    this.changed = true;

    const eIndex = this.undoStack.popUint32();

    this.edges.length += 16;
    this.edges.setFrom(this.edges, eIndex * 16, this.edgeCount * 16, 16);

    const id2 = this.edges.getUint32(eIndex * 16 + 12);

    this.edges.popFrom(this.undoStack, eIndex * 16, 16);

    const id = this.edges.getUint32(eIndex * 16 + 12);

    const nid = this.whereEdge.create(eIndex); // Ids implementation guarantees the id will be the same as last time
    if (id !== nid) throw new Error('Id mismatch in undoDeleteEdge');

    if (eIndex !== this.edgeCount) this.whereEdge.set(id2, this.edgeCount);

    const uIndex = this.edges.getUint32(eIndex * 16) >> 2;
    const uid = this.vertices.getUint32(uIndex * 16 + 12);

    const vIndex = this.edges.getUint32(eIndex * 16 + 4) >> 2;
    const vid = this.vertices.getUint32(vIndex * 16 + 12);

    this.incidency[uIndex].set(vid, id);
    this.incidency[vIndex].set(uid, id);

    this.redoStack.pushUint32(eIndex);
    this.redoStack.pushUint8(Operation.DELETE_EDGE);

    this.edgeCount++;
  }


  undo() {
    if (this.undoStack.length === 0) {
      console.warn('Nothing to undo');
      return;
    }

    const opCount = this.undoStack.popUint32();
    for (let i = 0; i < opCount; i++) {
      const type = this.undoStack.popUint8();

      switch (type) {
        case Operation.ADD_VERTEX:
          this.undoAddVertex();
          break;
        case Operation.ADD_EDGE:
          this.undoAddEdge();
          break;
        case Operation.DELETE_VERTEX:
          this.undoDeleteVertex();
          break;
        case Operation.DELETE_EDGE:
          this.undoDeleteEdge();
          break;
      }
    }
    this.redoStack.pushUint32(opCount);
  }

  private redoAddVertex() {
    this.changed = true;
    this.opCount++;

    this.incidency.push(new Map());

    const nid = this.whereVertex.create(this.vertexCount);
    const id = this.redoStack.getUint32(this.redoStack.length - 4);

    if (id !== nid) throw new Error(`Id mismatch in redoAddVertex ${id} vs ${nid}`);

    this.vertices.pushFrom(this.redoStack, this.redoStack.length - 16, 16);
    this.redoStack.length -= 16;

    this.vertexCount++;

    this.undoStack.pushUint8(Operation.ADD_VERTEX);
  }

  private redoAddEdge() {
    this.changed = true;
    this.opCount++;

    const uIndex = this.redoStack.getUint32(this.redoStack.length - 16) >> 2;
    const vIndex = this.redoStack.getUint32(this.redoStack.length - 12) >> 2;

    const vid = this.vertices.getUint32(vIndex * 16 + 12);
    const uid = this.vertices.getUint32(uIndex * 16 + 12);

    if (this.incidency[uIndex].has(vid)) throw new Error('Edge already exists in redoAddEdge (this should never happen)');

    const id = this.redoStack.getUint32(this.redoStack.length - 4);
    const nid = this.whereEdge.create(this.edgeCount);

    if (id !== nid) throw new Error('Id mismatch in redoAddEdge');

    this.edges.pushFrom(this.redoStack, this.redoStack.length - 16, 16);
    this.redoStack.length -= 16;

    this.edgeCount++;

    this.incidency[uIndex].set(vid, id);
    this.incidency[vIndex].set(uid, id);

    this.undoStack.pushUint8(Operation.ADD_EDGE);
  }

  private redoDeleteVertex() {
    this.changed = true;
    this.opCount++;

    const vIndex = this.redoStack.popUint32();

    this.vertexCount--;

    const id = this.vertices.getUint32(vIndex * 16 + 12);

    this.incidency[vIndex] = this.incidency[this.vertexCount];

    for (const incidentEdgeId of this.incidency[vIndex].values()) {
      const eIndex = this.whereEdge.get(incidentEdgeId)!;

      const u = this.edges.getUint32(eIndex * 16);
      const v = this.edges.getUint32(eIndex * 16 + 4);

      if (u >> 2 === this.vertexCount) {
        this.edges.setUint32(eIndex * 16, (vIndex << 2) | (u & 3));
      }
      else if (v >> 2 === this.vertexCount) {
        this.edges.setUint32(eIndex * 16 + 4, (vIndex << 2) | (v & 3));
      }
    }

    this.undoStack.pushFrom(this.vertices, vIndex * 16, 16);
    this.undoStack.pushUint32(vIndex);
    this.undoStack.pushUint8(Operation.DELETE_VERTEX);

    this.vertices.setFrom(this.vertices, this.vertexCount * 16, vIndex * 16, 16);

    this.vertices.length -= 16;


    const id2 = this.vertices.getUint32(vIndex * 16 + 12);

    this.vertices.setUint32(this.vertexCount * 16 + 12, 0);


    this.whereVertex.delete(id);

    this.whereVertex.set(id2, vIndex);

    this.incidency.pop();
  }

  private redoDeleteEdge() {
    this.changed = true;
    this.edgeCount--;

    this.opCount++;

    const eIndex = this.redoStack.popUint32();

    const u = this.edges.getUint32(eIndex * 16) >> 2;
    const v = this.edges.getUint32(eIndex * 16 + 4) >> 2;
    const id = this.edges.getUint32(eIndex * 16 + 12);

    const uid = this.vertices.getUint32(u * 16 + 12);
    const vid = this.vertices.getUint32(v * 16 + 12);

    this.incidency[u].delete(vid);
    this.incidency[v].delete(uid);

    this.undoStack.pushFrom(this.edges, eIndex * 16, 16);

    this.undoStack.pushUint32(eIndex);
    this.undoStack.pushUint8(Operation.DELETE_EDGE);

    this.edges.setFrom(this.edges, this.edgeCount * 16, eIndex * 16, 16);

    this.edges.length -= 16;

    const id2 = this.edges.getUint32(eIndex * 16 + 12);

    this.edges.setUint32(this.edgeCount * 16 + 12, 0);

    this.whereEdge.delete(id);

    this.whereEdge.set(id2, eIndex);
  }

  redo() {
    if (this.redoStack.length === 0) {
      console.warn('Nothing to redo');
      return;
    }

    const opCount = this.redoStack.popUint32();
    for (let i = 0; i < opCount; i++) {
      const type = this.redoStack.popUint8();

      switch (type) {
        case Operation.ADD_VERTEX:
          this.redoAddVertex();
          break;
        case Operation.ADD_EDGE:
          this.redoAddEdge();
          break;
        case Operation.DELETE_VERTEX:
          this.redoDeleteVertex();
          break;
        case Operation.DELETE_EDGE:
          this.redoDeleteEdge();
          break;
      }
    }
  }


  merge(vertices: Vertex[]) {
    if (vertices.length === 0) return;

    const ids = new Set(vertices.map(vertex => vertex.id));
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

    const newVertex = this.addVertex(averagePosition.x / count, averagePosition.y / count);

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
    this.changed = true;
    this.opCount++;

    const uIndex = u.index;
    const vIndex = v.index;

    if (this.incidency[uIndex].has(v.id)) throw new Error('Edge already exists');

    const id = this.whereEdge.create(this.edgeCount);


    this.edges.pushUint32(uIndex << 2);
    this.edges.pushUint32(vIndex << 2);
    this.edges.pushUint32(0);
    this.edges.pushUint32(id);

    this.edgeCount++;

    this.incidency[uIndex].set(v.id, id);
    this.incidency[vIndex].set(u.id, id);

    this.undoStack.pushUint8(Operation.ADD_EDGE);

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

    this.undoStack.pushUint8(Operation.ADD_VERTEX);

    return new Vertex(this, id);
  }

  deleteEdge(e: Edge) {
    this.changed = true;
    this.edgeCount--;

    this.opCount++;

    const eIndex = e.index;

    const u = this.edges.getUint32(eIndex * 16) >> 2;
    const v = this.edges.getUint32(eIndex * 16 + 4) >> 2;
    const id = this.edges.getUint32(eIndex * 16 + 12);

    const uid = this.vertices.getUint32(u * 16 + 12);
    const vid = this.vertices.getUint32(v * 16 + 12);

    this.incidency[u].delete(vid);
    this.incidency[v].delete(uid);

    this.undoStack.pushFrom(this.edges, eIndex * 16, 16);
    this.undoStack.pushUint32(eIndex);
    this.undoStack.pushUint8(Operation.DELETE_EDGE);

    this.edges.setFrom(this.edges, this.edgeCount * 16, eIndex * 16, 16);

    this.edges.length -= 16;

    const id2 = this.edges.getUint32(eIndex * 16 + 12);

    this.edges.setUint32(this.edgeCount * 16 + 12, 0);

    this.whereEdge.delete(id);

    this.whereEdge.set(id2, eIndex);
  }

  deleteVertex(v: Vertex) {
    this.changed = true;
    this.opCount++;

    const vIndex = v.index;

    for (const e of v.edges)
      this.deleteEdge(e);


    this.vertexCount--;

    const id = this.vertices.getUint32(vIndex * 16 + 12);

    this.incidency[vIndex] = this.incidency[this.vertexCount];

    for (const incidentEdgeId of this.incidency[vIndex].values()) {
      const eIndex = this.whereEdge.get(incidentEdgeId)!;

      const u = this.edges.getUint32(eIndex * 16);
      const v = this.edges.getUint32(eIndex * 16 + 4);

      if (u >> 2 === this.vertexCount) {
        this.edges.setUint32(eIndex * 16, (vIndex << 2) | (u & 3));
      }
      else if (v >> 2 === this.vertexCount) {
        this.edges.setUint32(eIndex * 16 + 4, (vIndex << 2) | (v & 3));
      }
    }

    this.undoStack.pushFrom(this.vertices, vIndex * 16, 16);
    this.undoStack.pushUint32(vIndex);
    this.undoStack.pushUint8(Operation.DELETE_VERTEX);

    this.vertices.setFrom(this.vertices, this.vertexCount * 16, vIndex * 16, 16);

    this.vertices.length -= 16;


    const id2 = this.vertices.getUint32(vIndex * 16 + 12);

    this.vertices.setUint32(this.vertexCount * 16 + 12, 0);

    this.whereVertex.delete(id);

    this.whereVertex.set(id2, vIndex);

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
    return new Promise<void>(resolve => {
      this.transactions.push({
        callback,
        resolve,
        ...options
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

    transaction.resolve();
  }


  async upload() {
    if (!this.changed) return;

    if (this.vertices.length > 16 * this.renderer.vertexData.size)
      this.renderer.vertexData.resizeErase(this.vertices.length / 16);

    if (this.edges.length > 16 * this.renderer.edgeData.size)
      this.renderer.edgeData.resizeErase(this.edges.length / 16);

    await Promise.all([
      this.vertexCount > 0 ? this.renderer.vertexData.write(this.vertices.asFloat32Array(), 0, this.vertexCount) : Promise.resolve(),
      this.edgeCount > 0 ? this.renderer.edgeData.write(this.edges.asFloat32Array(), 0, this.edgeCount) : Promise.resolve(),
    ]);

    this.renderer.vertices.count = this.vertexCount;
    this.renderer.edges.count = this.edgeCount;

    this.changed = false;
  }
}

export class Vertex {
  constructor(public readonly graph: Graph, public readonly id: number) { }

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
    return this.graph.incidency[this.index].values().map(e => this.graph.getEdge(e)!);
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