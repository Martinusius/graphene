import { BufferAttribute } from "three";

export class QuadArray extends Float32Array {
  constructor(quadCount: number, public readonly itemSize: number) {
    super(quadCount * 6 * itemSize);
  }

  public setQuad(index: number, array: ArrayLike<number>) {
    const _array = Array.from(array);


    // console.log(index * 4 * this.itemSize);

    this.set([
      ..._array.slice(0, this.itemSize),
      ..._array.slice(this.itemSize, this.itemSize * 2),
      ..._array.slice(this.itemSize * 2, this.itemSize * 3),
      ..._array.slice(0, this.itemSize),
      ..._array.slice(this.itemSize * 2, this.itemSize * 3),
      ..._array.slice(this.itemSize * 3, this.itemSize * 4)
    ], index * 6 * this.itemSize);
  }

  public toBufferAttribute() {
    return new BufferAttribute(this, this.itemSize);
  }
}