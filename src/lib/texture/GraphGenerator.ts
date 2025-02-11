import { Vector2 } from "three";
import type { Graph } from "./interface/Graph";

const random = (x: number) => (Math.random() - 0.5) * 2 * x;

export class GraphGenerator {
  constructor(public graph: Graph) { }

  public position = new Vector2();
  public spacing = 20;
  public randomness = 0;

  grid(width: number, height: number, diagonalEdges: boolean = false) {
    const centerX = (width - 1) / 2;
    const centerY = (height - 1) / 2;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const px = this.position.x + (x - centerX) * this.spacing + random(this.randomness);
        const py = this.position.y + (y - centerY) * this.spacing + random(this.randomness);

        this.graph.addVertex(px, py);
      }
    }


    const xy2i = (x: number, y: number) => y * width + x;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const me = this.graph.getVertex(xy2i(x, y) + 1);
        const neighbors = [[0, -1], [-1, 0]];

        if (diagonalEdges)
          neighbors.push(...[[-1, -1], [-1, 1]]);

        for (const [dx, dy] of neighbors) {
          const nx = x + dx;
          const ny = y + dy;

          const vertex = this.graph.getVertex(xy2i(nx, ny) + 1);

          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;

          this.graph.addEdge(me!, vertex!);
        }
      }
    }
  }

  clique(size: number) {
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
  }
}
