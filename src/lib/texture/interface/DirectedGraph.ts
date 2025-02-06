export class DirectedGraph extends Graph {
  addEdge(u: Vertex | number, v: Vertex | number) {
    super.addEdge(u instanceof Vertex ? u.id : u, v instanceof Vertex ? v.id : v, true, false);
  }
}