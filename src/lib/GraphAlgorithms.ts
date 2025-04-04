import { FibonacciHeap, type INode } from "@tyriar/fibonacci-heap";
import { ArrayQueue } from "./ArrayQueue";
import type { DirectedEdge, DirectedVertex } from "./texture/interface/directed/DirectedGraph";
import type { Edge, Graph, Vertex } from "./texture/interface/Graph";
import type { UndirectedVertex } from "./texture/interface/undirected/UndirectedGraph";
import { uint } from "./texture/reinterpret";
import { INTEGER_POSITIVE_INIFNITY, VERTEX_NULL } from "../Properties";

export class GraphAlgorithms {
  constructor(public graph: Graph) {

  }

  dfs(root: Vertex, depthProperty?: string) {
    return this.graph.transaction(() => {
      if (depthProperty) {
        this.graph.vertices.forEach((vertex) => {
          vertex.setProperty(depthProperty, INTEGER_POSITIVE_INIFNITY);
        });
      }

      const visited = new Set<number>();
      const stack = [root];
      let depth = 0;

      while (stack.length > 0) {
        const vertex = stack.pop()!;
        if (visited.has(vertex.id)) continue;

        visited.add(vertex.id);
        if (depthProperty) vertex.setProperty(depthProperty, depth++);

        let edges: Edge[] = [];
        let to: (edge: Edge) => Vertex;

        if (this.graph.isDirected) {
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
      if (depthProperty) {
        this.graph.vertices.forEach((vertex) => {
          vertex.setProperty(depthProperty, INTEGER_POSITIVE_INIFNITY);
        });
      }

      const visited = new Set<number>();
      const queue = new ArrayQueue([[root, 0] as [Vertex, number]]);

      while (queue.length > 0) {
        const [vertex, depth] = queue.shift()!;
        if (visited.has(vertex.id)) continue;

        visited.add(vertex.id);
        if (depthProperty) vertex.setProperty(depthProperty, depth);

        let edges: Edge[] = [];
        let to: (edge: Edge) => Vertex;

        if (this.graph.isDirected) {
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

  dijkstra(root: Vertex, inDistanceProperty: string, outDistanceProperty?: string, outLastVertexProperty?: string) {
    return this.graph.transaction(() => {
      if (outDistanceProperty) {
        this.graph.vertices.forEach((vertex) => {
          vertex.setProperty(outDistanceProperty, INTEGER_POSITIVE_INIFNITY);
        });
      }

      if (outLastVertexProperty) {
        this.graph.vertices.forEach((vertex) => {
          vertex.setProperty(outLastVertexProperty, VERTEX_NULL);
        });
      }

      const heap = new FibonacciHeap<number, Vertex>();
      const nodes = new Array<INode<number, Vertex> | null>(this.graph.vertexCount).fill(null);

      nodes[root.index] = heap.insert(0, root);
      if(outDistanceProperty) root.setProperty(outDistanceProperty, 0);

      while (!heap.isEmpty()) {
        const closest = heap.extractMinimum();
        const { key: distance, value: vertex } = closest!;

        if(!vertex) continue;
        
        let edges: Edge[] = [];
        let to: (edge: Edge) => Vertex;

        if (this.graph.isDirected) {
          edges = [...(vertex as DirectedVertex).out];
          to = ((edge: DirectedEdge) => edge.v) as any;
        }
        else {
          edges = [...(vertex as UndirectedVertex).edges];
          to = ((edge: DirectedEdge) => edge.u.id === vertex.id ? edge.v : edge.u) as any
        }

        for (const edge of edges) {
          const neighbor = to(edge);
          const neighborNode = nodes[neighbor.index];

          const totalDistance = distance + edge.getProperty(inDistanceProperty);

          if(!neighborNode) {
            nodes[neighbor.index] = heap.insert(totalDistance, neighbor);
            if(outDistanceProperty) neighbor.setProperty(outDistanceProperty, totalDistance);
            if(outLastVertexProperty) neighbor.setProperty(outLastVertexProperty, vertex.id);
          }
          else if(totalDistance < neighborNode.key) {
            heap.decreaseKey(neighborNode, totalDistance);
            if(outDistanceProperty) neighbor.setProperty(outDistanceProperty, totalDistance);
            if(outLastVertexProperty) neighbor.setProperty(outLastVertexProperty, vertex.id);
          }
        }
      }
    });
  }
};