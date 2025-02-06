import { Graph } from "./Graph";

export class UndirectedGraph extends Graph {
  addEdge(u: number, v: number): void {
    super.addEdge(u, v, false, false);
  }
}
