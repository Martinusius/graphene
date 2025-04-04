import type { Graph, Vertex } from "./interface/Graph";

export class GraphImporter {
  constructor(public readonly graph: Graph) {}

  edgeList(data: string) {    
    return this.graph.transaction(() => {
      const indexToVertex: Vertex[] = [];

      data.split('\n').forEach(line => {
        const [u, v] = line.split(' ').map(Number);
  
        if (indexToVertex[u] === undefined) {
          indexToVertex[u] = this.graph.addVertex(Math.random() * 100, Math.random() * 100);
        }
  
        if (indexToVertex[v] === undefined) {
          indexToVertex[v] = this.graph.addVertex(Math.random() * 100, Math.random() * 100);
        }
  
        this.graph.addEdge(indexToVertex[u]!, indexToVertex[v]!);
      });
    });
  }

  weightedEdgeList(data: string, weightProperty = 'Weight') {
    return this.graph.transaction(() => {
      const indexToVertex: Vertex[] = [];

      data.split('\n').forEach(line => {
        const [u, v, weight] = line.split(' ').map(Number);
  
        if (indexToVertex[u] === undefined) {
          indexToVertex[u] = this.graph.addVertex(Math.random() * 100, Math.random() * 100);
        }
  
        if (indexToVertex[v] === undefined) {
          indexToVertex[v] = this.graph.addVertex(Math.random() * 100, Math.random() * 100);
        }
  
        const edge = this.graph.addEdge(indexToVertex[u]!, indexToVertex[v]!);
        edge.setProperty(weightProperty, weight);
      });
    });
  }
}