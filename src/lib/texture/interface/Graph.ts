import type { GraphRenderer } from "../GraphRenderer";
import { floatBitsToUint, uintBitsToFloat } from "../reinterpret";

const PHI = 1.6180339887;

function random(r: number) {
  return r * 2 * (Math.random() - 1);
}

export class Graph {
  public incidency: Set<number>[];

  private vertexCount = 0;
  private edgeCount = 0;

  public vertices = new Float32Array(1024);
  public edges = new Float32Array(1024);

  private vertexId = 1;
  private edgeId = 1;

  public whereVertex = new Map<number, number>();
  public whereEdge = new Map<number, number>();

  private changed = false;

  constructor(public readonly renderer: GraphRenderer) {
    this.incidency = [];
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

  addEdge(u: Vertex, v: Vertex, forwards = true, backwards = true) {
    this.changed = true;

    const uIndex = u.index;
    const vIndex = v.index;


    if (4 * (this.edgeCount + 1) >= this.edges.length) {
      const newEdges = new Float32Array(Math.round(this.edges.length * PHI / 4) * 4);
      newEdges.set(this.edges);
      this.edges = newEdges;
    }

    // this.edges.set([
    //   uintBitsToFloat((uIndex << 1) | Number(forwards)),
    //   uintBitsToFloat((vIndex << 1) | Number(backwards)),
    //   uintBitsToFloat(0),
    //   uintBitsToFloat(this.edgeId++)
    // ], this.edgeCount++ * 4);

    this.edges[this.edgeCount * 4] = uintBitsToFloat((uIndex << 1) | Number(forwards));
    this.edges[this.edgeCount * 4 + 1] = uintBitsToFloat((vIndex << 1) | Number(backwards));
    this.edges[this.edgeCount * 4 + 2] = uintBitsToFloat(0);
    this.edges[this.edgeCount * 4 + 3] = uintBitsToFloat(this.edgeId++);
    this.edgeCount++;

    this.incidency[uIndex].add(this.edgeId - 1);
    this.incidency[vIndex].add(this.edgeId - 1);

    this.whereEdge.set(this.edgeId - 1, this.edgeCount - 1);

    return new Edge(this, this.edgeId - 1);
  }

  addVertex(x?: number, y?: number) {
    this.changed = true;

    if (4 * (this.vertexCount + 1) >= this.vertices.length) {
      const newVertices = new Float32Array(Math.round(this.vertices.length * PHI / 4) * 4);
      newVertices.set(this.vertices);
      this.vertices = newVertices;
    }

    this.incidency.push(new Set());

    this.vertices[this.vertexCount * 4 + 0] = x ?? random(100)
    this.vertices[this.vertexCount * 4 + 1] = y ?? random(100)
    this.vertices[this.vertexCount * 4 + 2] = uintBitsToFloat(0);
    this.vertices[this.vertexCount * 4 + 3] = uintBitsToFloat(this.vertexId++);
    this.vertexCount++;

    this.whereVertex.set(this.vertexId - 1, this.vertexCount - 1);

    return new Vertex(this, this.vertexId - 1);
  }

  deleteEdge(e: Edge) {
    this.changed = true;


    const eIndex = e instanceof Edge ? e.index : this.whereEdge.get(e)!;

    const u = floatBitsToUint(this.edges[eIndex * 4]) >> 1;
    const v = floatBitsToUint(this.edges[eIndex * 4 + 1]) >> 1;
    const id = floatBitsToUint(this.edges[eIndex * 4 + 3]);

    this.incidency[u].delete(id);
    this.incidency[v].delete(id);

    this.edges.set(this.edges.slice(this.edgeCount * 4 - 4, this.edgeCount * 4), eIndex * 4);
    this.edges[this.edgeCount * 4 - 1] = 0;

    this.whereEdge.delete(id);

    const id2 = floatBitsToUint(this.edges[eIndex * 4 + 3]);




    this.whereEdge.set(id2, eIndex);

    this.edgeCount--;
  }

  deleteVertex(v: Vertex) {
    this.changed = true;

    const vIndex = v.index;

    for (const e of v.edges)
      this.deleteEdge(e);


    const id = floatBitsToUint(this.vertices[vIndex * 4 + 3]);

    this.incidency[vIndex] = this.incidency[this.vertexCount - 1];

    this.incidency[vIndex].forEach(e => {
      const eIndex = this.whereEdge.get(e)!;

      const u = floatBitsToUint(this.edges[eIndex * 4]);
      const v = floatBitsToUint(this.edges[eIndex * 4 + 1]);

      if (u >> 1 === this.vertexCount - 1) this.edges[eIndex * 4] = uintBitsToFloat((vIndex << 1) | (u & 1));
      else if (v >> 1 === this.vertexCount - 1) this.edges[eIndex * 4 + 1] = uintBitsToFloat((vIndex << 1) | (v & 1));
    });

    this.vertices.set(this.vertices.slice(this.vertexCount * 4 - 4, this.vertexCount * 4), vIndex * 4);
    this.vertices[this.vertexCount * 4 - 1] = uintBitsToFloat(0);

    this.whereVertex.delete(id);

    const id2 = floatBitsToUint(this.vertices[vIndex * 4 + 3]);
    this.whereVertex.set(id2, vIndex);

    this.incidency.pop();
    this.vertexCount--;
  }

  getVertex(id: number): Vertex | undefined {
    if (!this.whereVertex.has(id)) return undefined;
    return new Vertex(this, id);
  }

  getEdge(id: number): Edge | undefined {
    if (!this.whereEdge.has(id)) return undefined;
    return new Edge(this, id);
  }

  async download() {
    const [vertexData, edgeData] = await Promise.all([
      this.renderer.vertexData.read(),
      this.renderer.edgeData.read(),
    ]);

    this.vertices = vertexData;
    this.edges = edgeData;

    // this.vertexCount = vertexData.length / 4;
    // this.edgeCount = edgeData.length / 4;
  }

  async upload() {
    if (!this.changed) return;

    // console.log('uploading', this.vertexCount, this.renderer.vertexData.size);

    if (this.vertices.length > 4 * this.renderer.vertexData.size)
      this.renderer.vertexData.resizeErase(this.vertices.length / 4);

    if (this.edges.length > 4 * this.renderer.edgeData.size)
      this.renderer.edgeData.resizeErase(this.edges.length / 4);

    await Promise.all([
      this.renderer.vertexData.write(this.vertices),
      this.renderer.edgeData.write(this.edges),
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

  get edges() {
    // console.log('aaa', this.id, this.index);
    return [...this.graph.incidency[this.index]].map(e => this.graph.getEdge(e)!);
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
    const index = floatBitsToUint(this.graph.edges[this.index * 4]) >> 1;
    const id = floatBitsToUint(this.graph.vertices[index * 4 + 3]);
    return this.graph.getVertex(id)!;
  }

  get v() {
    const index = floatBitsToUint(this.graph.edges[this.index * 4 + 1]) >> 1;
    const id = floatBitsToUint(this.graph.vertices[index * 4 + 3]);
    return this.graph.getVertex(id)!;
  }

  get forwards() {
    return floatBitsToUint(this.graph.edges[this.index * 4]) & 1;
  }

  get backwards() {
    return floatBitsToUint(this.graph.edges[this.index * 4 + 1]) & 1;
  }

  delete() {
    this.graph.deleteEdge(this);
  }
}

// export class Vertex {
//   constructor(public readonly id: number) {

//   }
// }

// export class Edge {
//   protected u: number;
//   v: number;

//   forwards: boolean;
//   backwards: boolean;

//   constructor(public id: number, protected u: number, protected v: number, protected forwards: boolean, protected backwards: boolean) {

//   }
// }
