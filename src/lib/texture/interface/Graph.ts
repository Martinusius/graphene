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

  private vertexId = 0;
  private edgeId = 0;

  public whereVertex = new Map<number, number>();
  public whereEdge = new Map<number, number>();

  private changed = false;

  constructor(public readonly renderer: GraphRenderer) {
    this.incidency = [];
  }

  addEdge(u: Vertex, v: Vertex, forwards = true, backwards = true) {
    this.changed = true;

    const uIndex = u.index;
    const vIndex = v.index;

    // console.log(i)

    if (this.edgeCount >= this.edges.length) {
      const newEdges = new Float32Array(Math.round(this.edges.length * PHI));
      newEdges.set(this.edges);
      this.edges = newEdges;
    }

    this.edges.set([
      uintBitsToFloat((uIndex << 1) | Number(forwards)),
      uintBitsToFloat((vIndex << 1) | Number(backwards)),
      uintBitsToFloat(0),
      uintBitsToFloat(this.edgeId++)
    ], this.edgeCount++ * 4);

    this.incidency[uIndex].add(this.edgeId - 1);
    this.incidency[vIndex].add(this.edgeId - 1);

    this.whereEdge.set(this.edgeId - 1, this.edgeCount - 1);

    return new Edge(this, this.edgeId - 1);
  }

  addVertex(x?: number, y?: number) {
    this.changed = true;

    if (this.vertexCount >= this.vertices.length) {
      const newVertices = new Float32Array(Math.round(this.vertices.length * PHI));
      newVertices.set(this.vertices);
      this.vertices = newVertices;
    }

    this.incidency.push(new Set());

    this.vertices.set([x ?? random(100), y ?? random(100), uintBitsToFloat(0), uintBitsToFloat(this.vertexId++)], this.vertexCount++ * 4);

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

    this.whereVertex.delete(id);

    const id2 = floatBitsToUint(this.vertices[vIndex * 4 + 3]);
    this.whereVertex.set(id2, vIndex);

    this.incidency.pop();
    this.vertexCount--;
  }

  async refresh() {
    if (!this.changed) return;

    if (this.vertexCount > this.renderer.vertexData.size)
      this.renderer.vertexData.resizeErase(this.vertexCount);

    if (this.edgeCount > this.renderer.edgeData.size)
      this.renderer.edgeData.resizeErase(this.edgeCount);

    await Promise.all([
      this.renderer.vertexData.write(this.vertices),
      this.renderer.edgeData.write(this.edges),
    ]);

    this.renderer.vertices.count = this.vertexCount;
    this.renderer.edges.count = this.edgeCount;

    this.changed = false;

    // await Promise.all([
    //   this.renderer.vertexData.read(),
    //   this.renderer.edgeData.read(),
    // ])

    // const vertexData = this.renderer.vertexData.read();
    // const edgeData = this.renderer.edgeData.read();
  }

  getVertex(id: number) {
    return new Vertex(this, id);
  }

  getEdge(id: number) {
    return new Edge(this, id);
  }
}

export class Vertex {
  constructor(public readonly graph: Graph, public readonly id: number) { }

  get index() {
    return this.graph.whereVertex.get(this.id)!;
  }

  get edges() {
    // console.log('aaa', this.id, this.index);
    return [...this.graph.incidency[this.index]].map(e => this.graph.getEdge(e));
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
    return floatBitsToUint(this.graph.edges[this.index * 4]) >> 1;
  }

  get v() {
    return floatBitsToUint(this.graph.edges[this.index * 4 + 1]) >> 1;
  }

  get forwards() {
    return floatBitsToUint(this.graph.edges[this.index * 4]) & 1;
  }

  get backwards() {
    return floatBitsToUint(this.graph.edges[this.index * 4 + 1]) & 1;
  }

  delete() {
    this.graph.deleteEdge(this.index);
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
