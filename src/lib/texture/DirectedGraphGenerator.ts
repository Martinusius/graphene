import { Vector2 } from "three";
import type { Graph } from "./interface/undirected/Graph";
import type { DirectedGraph } from "./interface/directed/DirectedGraph";

const random = (x: number) => (Math.random() - 0.5) * 2 * x;
export class DirectedGraphGenerator {
  constructor(public graph: DirectedGraph) { }

  public position = new Vector2();
  public spacing = 20;
  public randomness = 0;

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

            this.graph.addEdge(me!, vertex!);
            this.graph.addEdge(vertex!, me!);
          }
        }
      }
    });
  }

  async clique(size: number) {
    await this.graph.transaction(() => {
      const r = this.spacing / 2 / Math.sin(Math.PI / size);

      for (let i = 0; i < size; i++) {
        this.graph.addVertex(
          this.position.x + Math.cos((i / size) * Math.PI * 2) * r + random(this.randomness),
          this.position.y + Math.sin((i / size) * Math.PI * 2) * r + random(this.randomness)
        );
      }

      for (let i = 0; i < size; i++) {
        for (let j = i + 1; j < size; j++) {
          this.graph.addEdge(this.graph.getVertex(i + 1)!, this.graph.getVertex(j + 1)!);
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
          this.graph.addEdge(lastVertex, current);

        if (!firstVertex)
          firstVertex = current;

        lastVertex = current;

      }

      this.graph.addEdge(firstVertex!, lastVertex!);
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
}
