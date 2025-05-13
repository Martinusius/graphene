import { FibonacciHeap, type INode } from "@tyriar/fibonacci-heap";
import { ArrayQueue } from "../ArrayQueue";
import type { DirectedEdge, DirectedVertex } from "./interface/directed/DirectedGraph";
import type { Edge, Graph, Vertex } from "./interface/Graph";
import type { UndirectedVertex } from "./interface/undirected/UndirectedGraph";
import { INTEGER_POSITIVE_INIFNITY, NULL, VERTEX_NULL } from "../../Properties";
import { alertError } from "../error";

export class GraphAlgorithms {
  constructor(public graph: Graph) {}

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

  dijkstra(root: Vertex, edgeDistanceProperty: string, pathDistanceProperty?: string, previousVertexProperty?: string) {
    return this.graph.transaction(() => {
      if (pathDistanceProperty) {
        this.graph.vertices.forEach((vertex) => {
          vertex.setProperty(pathDistanceProperty, INTEGER_POSITIVE_INIFNITY);
        });
      }

      if (previousVertexProperty) {
        this.graph.vertices.forEach((vertex) => {
          vertex.setProperty(previousVertexProperty, VERTEX_NULL);
        });
      }

      const heap = new FibonacciHeap<number, Vertex>();
      const nodes = new Array<INode<number, Vertex> | null>(this.graph.vertexCount).fill(null);

      nodes[root.index] = heap.insert(0, root);
      if (pathDistanceProperty) root.setProperty(pathDistanceProperty, 0);

      while (!heap.isEmpty()) {
        const closest = heap.extractMinimum();
        const { key: distance, value: vertex } = closest!;

        if (!vertex) continue;

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

          const edgeDistance = edge.getProperty(edgeDistanceProperty);
          if(edgeDistance === NULL) alertError("Edge distance is NULL");
          if(edgeDistance < 0) alertError("Edge distance is negative")

          const totalDistance = distance + edgeDistance;

          if (!neighborNode) {
            nodes[neighbor.index] = heap.insert(totalDistance, neighbor);
            if (pathDistanceProperty) neighbor.setProperty(pathDistanceProperty, totalDistance);
            if (previousVertexProperty) neighbor.setProperty(previousVertexProperty, vertex.id);
          }
          else if (totalDistance < neighborNode.key) {
            heap.decreaseKey(neighborNode, totalDistance);
            if (pathDistanceProperty) neighbor.setProperty(pathDistanceProperty, totalDistance);
            if (previousVertexProperty) neighbor.setProperty(previousVertexProperty, vertex.id);
          }
        }
      }
    });
  }
};