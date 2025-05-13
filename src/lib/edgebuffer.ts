import {
  BufferAttribute,
  InstancedBufferGeometry,
} from "three";

export class EdgeBuffer {
  public geometry = new InstancedBufferGeometry();

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

  constructor() {
    this.geometry.instanceCount = 0;

    this.geometry.setAttribute(
      "position",
      new BufferAttribute(this.position, 3)
    );

    this.geometry.setIndex(new BufferAttribute(this.indices, 1));
  }
}
