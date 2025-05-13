import { Vector2 } from "three";
import { IndexedSet } from "$lib/IndexedSet";
import type { Graph, Vertex } from "./interface/Graph";

const random = (x: number) => (Math.random() - 0.5) * 2 * x + Math.random() * 0.0001;
export class GraphGenerator {
  constructor(public graph: Graph) { }

  public position = new Vector2();
  public spacing = 20;
  public randomness = 0;

  private addEdgeBidirectional(u: Vertex, v: Vertex) {
    this.graph.addEdge(u, v);
    if (this.graph.isDirected) this.graph.addEdge(v, u);
  }

  async grid(width: number, height: number = width, edges: 'none' | 'horizontal' | 'vertical' | 'straight' | 'straight-and-diagonal' = 'straight') {
    await this.graph.transaction(() => {
      const centerX = (width - 1) / 2;
      const centerY = (height - 1) / 2;

      const vertices = [];

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const px = this.position.x + (x - centerX) * this.spacing + random(this.randomness);
          const py = this.position.y + (y - centerY) * this.spacing + random(this.randomness);

          vertices.push(this.graph.addVertex(px, py));
        }

      }

      const patterns = {
        'none': [],
        'horizontal': [[1, 0]],
        'vertical': [[0, 1]],
        'straight': [[1, 0], [0, 1]],
        'straight-and-diagonal': [[1, 0], [0, 1], [1, 1], [-1, 1]],
      }

      const neighbors = patterns[edges];

      const xy2i = (x: number, y: number) => y * width + x;

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const me = vertices[xy2i(x, y)];

          for (const [dx, dy] of neighbors) {
            const nx = x + dx;
            const ny = y + dy;

            const vertex = vertices[xy2i(nx, ny)];

            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;

            this.addEdgeBidirectional(me, vertex);
          }
        }
      }
    });
  }

  async clique(size: number) {
    await this.graph.transaction(() => {
      const r = this.spacing / 2 / Math.sin(Math.PI / size);

      const vertices = [];

      for (let i = 0; i < size; i++) {
        vertices.push(this.graph.addVertex(
          this.position.x + Math.cos((i / size) * Math.PI * 2) * r + random(this.randomness),
          this.position.y + Math.sin((i / size) * Math.PI * 2) * r + random(this.randomness)
        ));
      }

      for (let i = 0; i < size; i++) {
        for (let j = i + 1; j < size; j++) {
          this.addEdgeBidirectional(vertices[i], vertices[j]);
        }
      }
    });
  }

  async cycle(size: number) {
    await this.graph.transaction(() => {
      const r = this.spacing / 2 / Math.sin(Math.PI / size);

      let firstVertex, lastVertex;

      for (let i = 0; i < size; i++) {
        const current = this.graph.addVertex(
          this.position.x + Math.cos((i / size) * Math.PI * 2) * r + random(this.randomness),
          this.position.y + Math.sin((i / size) * Math.PI * 2) * r + random(this.randomness)
        );

        if (lastVertex)
          this.addEdgeBidirectional(lastVertex, current);

        if (!firstVertex)
          firstVertex = current;

        lastVertex = current;

      }

      this.addEdgeBidirectional(firstVertex!, lastVertex!);
    });

  }

  async path(size: number) {
    await this.grid(size, 1);
  }

  async empty(size: number) {
    await this.graph.transaction(() => {
      const phi = (1 + Math.sqrt(5)) / 2;

      for (let i = 0; i < size; i++) {
        const angle = i * 2 * Math.PI / (phi * phi);
        const distance = Math.sqrt(i) * this.spacing;

        this.graph.addVertex(
          this.position.x + Math.cos(angle) * distance + random(this.randomness),
          this.position.y + Math.sin(angle) * distance + random(this.randomness)
        );
      }

    });
  }

  async tree(size: number, meanBrachingFactor: number, stdDevBranchingFactor: number, layout: 'horizontal' | 'circular' = 'horizontal') {
    await this.graph.transaction(() => {
      if (layout === 'circular') throw Error('Not implemented');

      function randomNormalDistribution(mean: number, stdDev: number) {
        return mean + stdDev * Math.sqrt(-2 * Math.log(Math.random())) * Math.cos(2 * Math.PI * Math.random());
      }

      const vertices = [this.graph.addVertex(this.position.x, this.position.y)];
      const children: number[][] = [[]];

      const leaves = new IndexedSet<number>([0]);

      while (vertices.length < size) {
        const leaf = Math.floor(Math.random() * leaves.size);
        const parent = vertices[leaves.at(leaf)];

        const desiredBranchingFactor = Math.round(randomNormalDistribution(meanBrachingFactor, stdDevBranchingFactor));
        const branchingFactor = Math.max(1, Math.min(desiredBranchingFactor, size - vertices.length));

        console.log(branchingFactor > 1);

        for (let i = 0; i < branchingFactor; i++) {
          const child = this.graph.addVertex(0, 0);
          this.addEdgeBidirectional(parent, child);

          vertices.push(child);
          children.push([]);

          leaves.add(vertices.length - 1);
          children[leaf].push(vertices.length - 1);
        }

        leaves.delete(leaf);
      }

      if (layout === 'horizontal') {
        const nodeWidths = new Array(size).fill(0);

        const that = this;


        function calculateNodeWidths(v: number) {
          let sum = 0;

          for (const child of children[v]) {
            sum += calculateNodeWidths(child);
          }

          return nodeWidths[v] = Math.max(1, sum);
        }

        calculateNodeWidths(0);

        function findHeight(v: number) {
          let max = 0;

          for (const child of children[v]) {
            max = Math.max(max, findHeight(child));
          }

          return max + 1;
        }

        const height = findHeight(0);

        const width = nodeWidths[0] * this.spacing;

        function positionNodes(v: number, minX: number, maxX: number, depth: number) {
          const x = (minX + maxX) / 2;
          const y = -depth * that.spacing;

          vertices[v].x = x;
          vertices[v].y = y;

          let offset = 0;

          for (const child of children[v]) {
            positionNodes(child, minX + offset, minX + offset + nodeWidths[child] * that.spacing, depth + 1);
            offset += nodeWidths[child] * that.spacing;
          }
        }


        positionNodes(0, -width / 2, width / 2, 0);
      }

    });

  }
}
