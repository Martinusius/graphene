import type { GraphRenderer } from "../GraphRenderer";
import { floatBitsToUint, uintBitsToFloat } from "../reinterpret";
import { Ids } from "./Ids";

const PHI = 1.6180339887;

function random(r: number) {
  return r * 2 * (Math.random() - 1);
}
type Transaction = {
  callback: () => void;
  resolve: () => void;
};


export class DirectedGraph {
  // for each vertex index: map from neighbor id to edge id
  public incidency: Map<number, number>[];
  public outcidency: Map<number, number>[];

  private vertexCount = 0;
  private edgeCount = 0;

  public vertices = new Float32Array(1024);
  public edges = new Float32Array(1024);

  public whereVertex = new Ids<number>();
  public whereEdge = new Ids<number>();

  private changed = false;

  constructor(public readonly renderer: GraphRenderer) {
    this.incidency = [];
    this.outcidency = [];
  }

  reserve(vertices: number, edges: number) {
    if (vertices * 4 > this.vertices.length) {
      const newVertices = new Float32Array(Math.round(vertices * 4 * PHI / 4));
      newVertices.set(this.vertices);
      this.vertices = newVertices;
    }

    if (edges * 4 > this.edges.length) {
      const newEdges = new Float32Array(Math.round(edges * 4 * PHI / 4));
      newEdges.set(this.edges);
      this.edges = newEdges;
    }
  }

  merge(vertices: DirectedVertex[]) {
    if (vertices.length === 0) return;

    const ids = new Set(vertices.map(vertex => vertex.id));
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

    const newVertex = this.addVertex(averagePosition.x / count, averagePosition.y / count);

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
    this.changed = true;

    const uIndex = u.index;
    const vIndex = v.index;

    if (this.outcidency[uIndex].has(v.id)) throw new Error('Edge already exists');

    if (4 * (this.edgeCount + 1) >= this.edges.length) {
      const newEdges = new Float32Array(Math.round(this.edges.length * PHI / 4) * 4);
      newEdges.set(this.edges);
      this.edges = newEdges;
    }

    const id = this.whereEdge.create(this.edgeCount);

    const inverseId = this.incidency[uIndex].get(v.id);

    this.edges[this.edgeCount * 4] = uintBitsToFloat(uIndex << 2 | (inverseId ? 2 : 0));
    this.edges[this.edgeCount * 4 + 1] = uintBitsToFloat((vIndex << 2) | 1);
    this.edges[this.edgeCount * 4 + 2] = uintBitsToFloat(0);
    this.edges[this.edgeCount * 4 + 3] = uintBitsToFloat(id);
    this.edgeCount++;

    // if inverse edge exists, make it dual
    if (inverseId) {
      const inverseIndex = this.whereEdge.get(inverseId)!;
      this.edges[inverseIndex * 4] = uintBitsToFloat(floatBitsToUint(this.edges[inverseIndex * 4]) | 2);
    }

    this.outcidency[uIndex].set(v.id, id);
    this.incidency[vIndex].set(u.id, id);

    return new DirectedEdge(this, id);
  }

  addVertex(x?: number, y?: number) {
    this.changed = true;

    if (4 * (this.vertexCount + 1) >= this.vertices.length) {
      const newVertices = new Float32Array(Math.round(this.vertices.length * PHI / 4) * 4);
      newVertices.set(this.vertices);
      this.vertices = newVertices;
    }

    this.incidency.push(new Map());
    this.outcidency.push(new Map());

    const id = this.whereVertex.create(this.vertexCount);

    this.vertices[this.vertexCount * 4 + 0] = x ?? random(100)
    this.vertices[this.vertexCount * 4 + 1] = y ?? random(100)
    this.vertices[this.vertexCount * 4 + 2] = uintBitsToFloat(0);
    this.vertices[this.vertexCount * 4 + 3] = uintBitsToFloat(id);
    this.vertexCount++;


    return new DirectedVertex(this, id);
  }

  deleteEdge(e: DirectedEdge) {
    this.changed = true;

    const eIndex = e.index;

    const existsInverse = floatBitsToUint(this.edges[eIndex * 4]) & 2;

    const u = floatBitsToUint(this.edges[eIndex * 4]) >> 2;
    const v = floatBitsToUint(this.edges[eIndex * 4 + 1]) >> 2;
    const id = floatBitsToUint(this.edges[eIndex * 4 + 3]);

    const uid = floatBitsToUint(this.vertices[u * 4 + 3]);
    const vid = floatBitsToUint(this.vertices[v * 4 + 3]);

    // if inverse edge exists, make it non-dual
    if (existsInverse) {
      const inverseId = this.incidency[v].get(uid)!;
      const inverseIndex = this.whereEdge.get(inverseId)!;
      this.edges[inverseIndex * 4] = uintBitsToFloat(u << 2);
    }

    this.outcidency[u].delete(vid);
    this.incidency[v].delete(uid);

    this.edges[eIndex * 4] = this.edges[this.edgeCount * 4 - 4];
    this.edges[eIndex * 4 + 1] = this.edges[this.edgeCount * 4 - 3];
    this.edges[eIndex * 4 + 2] = this.edges[this.edgeCount * 4 - 2];
    this.edges[eIndex * 4 + 3] = this.edges[this.edgeCount * 4 - 1];

    const id2 = floatBitsToUint(this.edges[eIndex * 4 + 3]);

    this.edges[this.edgeCount * 4 - 1] = uintBitsToFloat(0);

    this.whereEdge.delete(id);

    this.whereEdge.set(id2, eIndex);

    this.edgeCount--;
  }

  deleteVertex(v: DirectedVertex) {
    this.changed = true;

    const vIndex = v.index;

    for (const e of v.in)
      this.deleteEdge(e);

    for (const e of v.out)
      this.deleteEdge(e);

    const id = floatBitsToUint(this.vertices[vIndex * 4 + 3]);

    this.incidency[vIndex] = this.incidency[this.vertexCount - 1];
    this.outcidency[vIndex] = this.outcidency[this.vertexCount - 1];

    for (const outcidentEdgeId of this.outcidency[vIndex].values()) {
      const eIndex = this.whereEdge.get(outcidentEdgeId)!;
      this.edges[eIndex * 4] = uintBitsToFloat((vIndex << 2) | floatBitsToUint(this.edges[eIndex * 4]) & 3);
    }

    for (const incidentEdgeId of this.incidency[vIndex].values()) {
      const eIndex = this.whereEdge.get(incidentEdgeId)!;
      this.edges[eIndex * 4 + 1] = uintBitsToFloat((vIndex << 2) | floatBitsToUint(this.edges[eIndex * 4 + 1]) & 3);
    }

    this.vertices[vIndex * 4] = this.vertices[this.vertexCount * 4 - 4];
    this.vertices[vIndex * 4 + 1] = this.vertices[this.vertexCount * 4 - 3];
    this.vertices[vIndex * 4 + 2] = this.vertices[this.vertexCount * 4 - 2];
    this.vertices[vIndex * 4 + 3] = this.vertices[this.vertexCount * 4 - 1];

    const id2 = floatBitsToUint(this.vertices[vIndex * 4 + 3]);

    this.vertices[this.vertexCount * 4 - 1] = uintBitsToFloat(0);

    this.whereVertex.delete(id);

    this.whereVertex.set(id2, vIndex);

    this.incidency.pop();
    this.outcidency.pop();

    this.vertexCount--;
  }

  getVertex(id: number): DirectedVertex | undefined {
    if (!this.whereVertex.has(id)) return undefined;
    return new DirectedVertex(this, id);
  }

  getEdge(id: number): DirectedEdge | undefined {
    if (!this.whereEdge.has(id)) return undefined;
    return new DirectedEdge(this, id);
  }

  getEdgeFromTo(u: DirectedVertex, v: DirectedVertex): DirectedEdge | undefined {
    return this.getEdge(this.outcidency[u.index].get(v.id) ?? -1);
  }

  async download() {
    const [vertexData, edgeData] = await Promise.all([
      this.renderer.vertexData.read(),
      this.renderer.edgeData.read(),
    ]);

    this.vertices = vertexData;
    this.edges = edgeData;

  }

  private transactions: Transaction[] = [];

  transaction(callback: () => void) {
    return new Promise<void>(resolve => {
      this.transactions.push({
        callback,
        resolve
      });
    });
  }

  async tick() {
    if (!this.transactions.length) return;

    const transaction = this.transactions.shift()!;

    await this.download();
    await transaction.callback();
    await this.upload();

    transaction.resolve();
  }


  async upload() {
    if (!this.changed) return;

    if (this.vertices.length > 4 * this.renderer.vertexData.size)
      this.renderer.vertexData.resizeErase(this.vertices.length / 4);

    if (this.edges.length > 4 * this.renderer.edgeData.size)
      this.renderer.edgeData.resizeErase(this.edges.length / 4);

    await Promise.all([
      this.vertexCount > 0 ? this.renderer.vertexData.write(this.vertices) : Promise.resolve(),
      this.edgeCount > 0 ? this.renderer.edgeData.write(this.edges) : Promise.resolve(),
    ]);

    this.renderer.vertices.count = this.vertexCount;
    this.renderer.edges.count = this.edgeCount;

    this.changed = false;
  }
}

export class DirectedVertex {
  constructor(public readonly graph: DirectedGraph, public readonly id: number) { }

  get index() {
    return this.graph.whereVertex.get(this.id)!;
  }

  get x() {
    return this.graph.vertices[this.index * 4];
  }

  get y() {
    return this.graph.vertices[this.index * 4 + 1];
  }

  set x(x: number) {
    this.graph.vertices[this.index * 4] = x;
  }

  set y(y: number) {
    this.graph.vertices[this.index * 4 + 1] = y;
  }

  get out() {
    return this.graph.outcidency[this.index].values().map(e => this.graph.getEdge(e)!);
  }

  get in() {
    return this.graph.incidency[this.index].values().map(e => this.graph.getEdge(e)!);
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
    const index = floatBitsToUint(this.graph.edges[this.index * 4]) >> 2;
    const id = floatBitsToUint(this.graph.vertices[index * 4 + 3]);
    return this.graph.getVertex(id)!;
  }

  get v() {
    const index = floatBitsToUint(this.graph.edges[this.index * 4 + 1]) >> 2;
    const id = floatBitsToUint(this.graph.vertices[index * 4 + 3]);
    return this.graph.getVertex(id)!;
  }

  delete() {
    this.graph.deleteEdge(this);
  }
}