import { getUint32Fix, setUint32Fix } from "./polyfill.glsl";

const PHI = 1.6180339887;

export class DynamicArray {
  private array: Uint8Array;
  private view: DataView;

  private _length = 0;

  constructor(public readonly bytes: number) {
    this.array = new Uint8Array(bytes);
    this.view = new DataView(this.array.buffer);
  }

  private resize(sizeAtLeast: number) {
    const newArray = new Uint8Array(Math.ceil((sizeAtLeast * PHI) / 4) * 4);
    newArray.set(this.array);
    this.array = newArray;
    this.view = new DataView(this.array.buffer);
  }

  pushUint32(value: number) {
    if (this._length + 4 > this.array.length) this.resize(this._length + 4);

    this.view.setUint32(this._length, setUint32Fix(value), true);

    this._length += 4;
  }

  pushFloat32(value: number) {
    if (this._length + 4 > this.array.length) this.resize(this._length + 4);

    this.view.setFloat32(this._length, value, true);
    this._length += 4;
  }

  pushUint8(value: number) {
    if (this._length + 1 > this.array.length) this.resize(this._length + 1);

    this.view.setUint8(this._length, value);
    this._length += 1;
  }

  getUint32(index: number) {
    return getUint32Fix(this.view.getUint32(index, true));
  }

  getFloat32(index: number) {
    return this.view.getFloat32(index, true);
  }

  getUint8(index: number) {
    return this.view.getUint8(index);
  }

  setUint32(index: number, value: number) {
    this.view.setUint32(index, setUint32Fix(value), true);
  }

  setFloat32(index: number, value: number) {
    this.view.setFloat32(index, value, true);
  }

  setUint8(index: number, value: number) {
    this.view.setUint8(index, value);
  }

  popUint32() {
    this._length -= 4;
    return getUint32Fix(this.view.getUint32(this._length, true));
  }

  popFloat32() {
    this._length -= 4;
    return this.view.getFloat32(this._length, true);
  }

  popUint8() {
    this._length -= 1;
    return this.view.getUint8(this._length);
  }

  setFrom(
    array: DynamicArray,
    srcIndex: number,
    destIndex: number,
    length: number
  ) {
    this.array.set(
      array.array.subarray(srcIndex, srcIndex + length),
      destIndex
    );
  }

  pushFrom(array: DynamicArray, srcIndex: number, length: number) {
    if (this._length + length > this.array.length)
      this.resize(this._length + length);

    this.array.set(
      array.array.subarray(srcIndex, srcIndex + length),
      this._length
    );
    this._length += length;
  }

  popFrom(array: DynamicArray, destIndex: number, length: number) {
    array._length -= length;
    this.array.set(
      array.array.subarray(array._length, array._length + length),
      destIndex
    );
  }

  // uints(n: number) {
  //   const uints = [];
  //   for (let i = 0; i < n; i++) {
  //     uints.push(this.getUint32(i * 4));
  //   }
  //   return uints;
  // }

  asFloat32Array() {
    return new Float32Array(this.array.buffer);
  }

  get length() {
    return this._length;
  }

  set length(length: number) {
    if (length > this.array.length) this.resize(length);
    this._length = length;
  }

  get buffer() {
    return this.array.buffer;
  }

  set buffer(buffer: ArrayBufferLike) {
    this.array = new Uint8Array(buffer);
    this.view = new DataView(buffer);
  }

  clone() {
    const array = new DynamicArray(this.array.length);
    array.pushFrom(this, 0, this.length);
    return array;
  }
}
