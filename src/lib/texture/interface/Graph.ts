import type { TransactionOptions } from "./Transaction";

export interface GraphObject {
  graph: Graph;
  id: number;
  index: number;
  isSelected: boolean;
  delete(): void;
  download(): Promise<void>;

  setProperty(name: string, value: number): void;
  getProperty(name: string): number;
};

export interface Vertex extends GraphObject {
  x: number;
  y: number;
};

export interface Edge extends GraphObject {
  readonly u: Vertex;
  readonly v: Vertex;
};

export interface Graph {
  addVertex(x: number, y: number): Vertex;
  addEdge(u: Vertex, v: Vertex): Edge;

  merge(vertices: Vertex[]): void;
  cliqueify(vertices: Vertex[]): void;

  undo(): void;
  redo(): void;

  transaction(callback: () => void, options?: TransactionOptions): Promise<void>;

  deleteVertex(vertex: Vertex): void;
  deleteEdge(edge: Edge): void;

  getVertex(id: number): Vertex | undefined;
  getEdge(id: number): Edge | undefined;

  vertices: Vertex[];
  edges: Edge[];

  vertexAt(index: number): Vertex;
  edgeAt(index: number): Edge;

  isDirected: boolean;

  get vertexCount(): number;
  get edgeCount(): number;
};

