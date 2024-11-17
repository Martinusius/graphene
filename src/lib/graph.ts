// External API
export type VertexAttributes = {
  x?: number;
  y?: number;
  z?: number;
  [key: string]: any;
};

export type EdgeAttributes = {
  weight?: number;
  [key: string]: any;
}

export abstract class Vertex {
  abstract get edges(): Edge[];
  abstract delete(): void;
}

export abstract class Edge {
  abstract get vertices(): [Vertex, Vertex];
  abstract delete(): void;
}

export abstract class Graph {
  abstract set directed(directed: boolean);
  abstract get directed(): boolean;

  abstract createVertex(attributes?: VertexAttributes): Vertex;
  abstract createEdge(vertex1: Vertex, vertex2: Vertex, attributes?: EdgeAttributes): void;

  abstract get vertices(): Vertex[];
  abstract get edges(): Edge[];
}