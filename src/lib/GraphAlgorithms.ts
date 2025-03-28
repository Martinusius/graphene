import { ArrayQueue } from "./ArrayQueue";
import type { DirectedEdge, DirectedVertex } from "./texture/interface/directed/DirectedGraph";
import type { Edge, Graph, Vertex } from "./texture/interface/Graph";
import type { UndirectedEdge, UndirectedVertex } from "./texture/interface/undirected/UndirectedGraph";
import { uint } from "./texture/reinterpret";

export class GraphAlgorithms {
  constructor(public graph: Graph) {
    
  }

  dfs(root: Vertex, depthProperty?: string) {
    return this.graph.transaction(() => {
      if(depthProperty) {
        this.graph.vertices.forEach((vertex) => {
          vertex.setProperty(depthProperty, uint(-1));
        });
      }
  
      const visited = new Set<number>();
      const stack = [root];
      let depth = 0;
  
      while (stack.length > 0) {
        const vertex = stack.pop()!;
        if (visited.has(vertex.id)) continue;
  
        visited.add(vertex.id);
        if(depthProperty) vertex.setProperty(depthProperty, depth++);
  
        let edges: Edge[] = [];
        let to: (edge: Edge) => Vertex;
  
        if(this.graph.isDirected) {
          edges = [...(vertex as DirectedVertex).out];
          to = ((edge: DirectedEdge) => edge.v) as any;
        }
        else {
          edges = [...(vertex as UndirectedVertex).edges];
          to = ((edge: DirectedEdge) => edge.u.id === vertex.id ? edge.v : edge.u) as any
        }
  
        for (const edge of edges) {
          const neighbor = to(edge);
          stack.push(neighbor);
        }
      }
    });
  }

  bfs(root: Vertex, depthProperty?: string) {
    return this.graph.transaction(() => {
      if(depthProperty) {
        this.graph.vertices.forEach((vertex) => {
          vertex.setProperty(depthProperty, uint(-1));
        });
      }
      
      const visited = new Set<number>();
      const queue = new ArrayQueue([[root, 0] as [Vertex, number]]);
  
      while (queue.length > 0) {
        const [vertex, depth] = queue.shift()!;
        if (visited.has(vertex.id)) continue;
  
        visited.add(vertex.id);
        if(depthProperty) vertex.setProperty(depthProperty, depth);
  
        let edges: Edge[] = [];
        let to: (edge: Edge) => Vertex;
  
        if(this.graph.isDirected) {
          edges = [...(vertex as DirectedVertex).out];
          to = ((edge: DirectedEdge) => edge.v) as any;
        }
        else {
          edges = [...(vertex as UndirectedVertex).edges];
          to = ((edge: DirectedEdge) => edge.u.id === vertex.id ? edge.v : edge.u) as any
        }
  
        for (const edge of edges) {
          const neighbor = to(edge);
          queue.push([neighbor, depth + 1]);
        }
      }
    });
  }
};