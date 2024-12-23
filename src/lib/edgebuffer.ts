import {
  BufferAttribute,
  BufferGeometry,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
} from "three";

export class EdgeBuffer {
  public geometry = new InstancedBufferGeometry();

  // instanced attribute, 2 uv coordinates of the vertices the edge connects
  // also specifies direction arrows
  private vertices: Float32Array;

  // defines which part of the edge the specific vertex is (processed in the shader)
  private position = new Float32Array(
    [
      [0, 0, 0],
      [0, 0.5, 0],
      [0, 1, 0],

      [0.25, 0, 0],
      [0.25, 1, 0],

      [0.75, 0, 0],
      [0.75, 1, 0],

      [1, 0, 0],
      [1, 0.5, 0],
      [1, 1, 0],
    ].flat()
  );

  // ordinary index array that defines triangles
  private indices = new Uint16Array(
    [
      [3, 1, 0],
      [4, 2, 1],
      [3, 4, 1],

      [5, 4, 3],
      [5, 6, 4],

      [5, 8, 6],
      [8, 9, 6],
      [7, 8, 5],
    ].flat()
  );

  constructor(edgeCount: number, private textureSize: number) {
    this.vertices = new Float32Array(edgeCount * 4);
    this.geometry.instanceCount = 0;

    this.geometry.setAttribute(
      "vertices",
      new InstancedBufferAttribute(this.vertices, 4)
    );

    this.geometry.setAttribute(
      "position",
      new BufferAttribute(this.position, 3)
    );

    this.geometry.setIndex(new BufferAttribute(this.indices, 1));
  }

  public swapEdges(fromIndex: number, toIndex: number) {
    const from = this.vertices.slice(fromIndex * 4, fromIndex * 4 + 4);
    const to = this.vertices.slice(toIndex * 4, toIndex * 4 + 4);

    this.vertices.set(to, fromIndex * 4);
    this.vertices.set(from, toIndex * 4);
  }

  public addEdge(u: number, v: number, uvArrow: boolean, vuArrow: boolean) {
    this.setEdge(this.geometry.instanceCount++, u, v, uvArrow, vuArrow);
  }

  private setEdge(
    index: number,
    u: number,
    v: number,
    uvArrow: boolean,
    vuArrow: boolean
  ) {
    const o = 0.5 / this.textureSize;

    const [ux, uy] = [
      (u % this.textureSize) / this.textureSize + o,
      Math.floor(u / this.textureSize) / this.textureSize + o,
    ];
    const [vx, vy] = [
      (v % this.textureSize) / this.textureSize + o,
      Math.floor(v / this.textureSize) / this.textureSize + o,
    ];

    this.vertices.set(
      [ux + Number(vuArrow), uy, vx + Number(uvArrow), vy],
      index * 4
    );
  }
}
