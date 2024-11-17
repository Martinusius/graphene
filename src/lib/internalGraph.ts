import { Graph, Vertex, Edge, type VertexAttributes } from './graph';

// Internal graph implementation
export abstract class InternalVertex extends Vertex {
  graph: InternalGraph;
  deleted = false;

  _edges = new Set<InternalEdge>();

  override get edges() {
    if (this.deleted) throw new Error('Trying to access edges of a vertex that has been deleted');
    return [...this._edges];
  }

  constructor(graph: InternalGraph) {
    super();
    this.graph = graph;
  }

  override delete() {
    if (this.deleted) throw new Error('Trying to delete a vertex that has already been deleted');
    this.deleted = true;

    // Delete all indicent edges
    this._edges.forEach(edge => {
      this.graph._edges.delete(edge);
      edge.deleted = true;
    });
    this._edges.clear();
  }
}

export abstract class InternalEdge extends Edge {
  graph: InternalGraph;
  deleted = false;

  _vertices: [InternalVertex, InternalVertex];

  constructor(graph: InternalGraph, vertex1: InternalVertex, vertex2: InternalVertex) {
    super();
    this.graph = graph;
    this._vertices = [vertex1, vertex2];
  }

  override get vertices() {
    if (this.deleted) throw new Error('Trying to access vertices of an edge that has been deleted');
    return this._vertices;
  }

  override delete() {
    if (this.deleted) throw new Error('Trying to delete an edge that has already been deleted');
    this.deleted = true;

    // Remove this edge from incident vertices
    this._vertices[0]._edges.delete(this);
    this._vertices[1]._edges.delete(this);

    this.graph._edges.delete(this);
  }
}

export abstract class InternalGraph extends Graph {
  _vertices = new Set<InternalVertex>();
  _edges = new Set<InternalEdge>();

  override get vertices() {
    return [...this._vertices];
  }

  override get edges() {
    return [...this._edges];
  }
}
