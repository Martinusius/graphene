import type { Graph } from "./interface/Graph";

export class GraphExporter {
  constructor(public readonly graph: Graph) {}

  edgeList() {
    return this.graph.transaction(() => {
      const edges: string[] = [];

      this.graph.edges.forEach(edge => {
        const { u, v } = edge;
        edges.push(`${u.index} ${v.index}`);
      });
  
      return edges.join("\n");
    }); 
  }

  weightedEdgeList(weightProperty: string) {
    return this.graph.transaction(() => {
      const edges: string[] = [];

      this.graph.edges.forEach(edge => {
        const { u, v } = edge;
        const weight = edge.getProperty(weightProperty);

        edges.push(`${u.index} ${v.index} ${weight}`);
      });

      return edges.join("\n");
    });
  }
}