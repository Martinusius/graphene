import type { Compute } from "../compute/Compute";
import type { ComputeBuffer } from "../compute/ComputeBuffer";
import { DynamicArray } from "../DynamicArray";
import { Ids } from "../Ids";

export class Auxiliary {
  whereProperty = new Ids<number>();
  propertyIds: number[] = [];

  arrays: DynamicArray[] = [];
  buffers: ComputeBuffer[] = [];

  objectCount = 0;
  propertyCount = 0;

  public changed = false;

  constructor(private compute: Compute) {}

  pushObject() {
    this.changed = true;
    this.objectCount++;

    this.arrays.forEach(array => {
      for(let i = 0; i < 4; i++)
        array.pushUint32(0);
    })

    // for (let i = 0; i < this.propertyCount; i++) {
    //   const array = this.arrays[Math.floor(i / 4)];
    //   array.pushUint32(0);
    // }
  }

  popObject() {
    this.changed = true;
    this.objectCount--;

    // for (let i = this.propertyCount - 1; i >= 0; i--) {
    //   const array = this.arrays[Math.floor(i / 4)];
    //   array.popUint32();
    // }
    this.arrays.forEach(array => {
      for(let i = 0; i < 4; i++)
        array.popUint32();
    })
  }

  swapObjects(i: number, j: number) {
    this.changed = true;

    this.arrays.forEach((array) => {
      const temp = [];

      for (let k = 0; k < 4; k++) {
        temp.push(array.getUint32(i * 16 + k * 4));
      }

      for (let k = 0; k < 4; k++) {
        array.setUint32(i * 16 + k * 4, array.getUint32(j * 16 + k * 4));
      }

      for (let k = 0; k < 4; k++) {
        array.setUint32(j * 16 + k * 4, temp[k]);
      }
    });
  }

  swapObjectWithLast(i: number) {
    this.swapObjects(i, this.objectCount - 1);
  }

  setProperty(property: AuxiliaryProperty, i: number, value: number) {
    this.changed = true;

    const array = this.arrays[Math.floor(property.index! / 4)];
    const channel = property.index! % 4;

    console.log(array.length);

    array.setUint32(i * 16 + channel * 4, value);
  }

  createProperty(defaultValue = 0) {
    this.changed = true;
    this.propertyCount++;

    if (this.propertyCount > 4 * this.arrays.length) {
      const array = new DynamicArray(16 * this.objectCount);
      array.length = 16 * this.objectCount;

      this.arrays.push(array);
      this.buffers.push(this.compute.createBuffer(this.objectCount));
    }

    const array = this.arrays[Math.floor((this.propertyCount - 1) / 4)];
    const channel = (this.propertyCount - 1) % 4;

    for (let i = 0; i < this.objectCount; i++) {
      array.setUint32(i * 16 + channel * 4, defaultValue);
    }

    const id = this.whereProperty.create(this.propertyCount - 1);
    this.propertyIds.push(id);

    return new AuxiliaryProperty(this, id);
  }

  deleteProperty(property: AuxiliaryProperty) {
    this.changed = true;
    this.swapProperties(property.index!, this.propertyCount - 1);

    this.whereProperty.delete(property.id);
    this.propertyCount--;

    if (this.propertyCount < 4 * this.arrays.length - 1) {
      this.arrays.pop();
      this.buffers.pop()?.dispose();
    }
  }

  private swapProperties(i: number, j: number) {
    if (i === j) return;

    this.changed = true;

    const iArray = this.arrays[Math.floor(i / 4)];
    const jArray = this.arrays[Math.floor(j / 4)];
    const iChannel = i % 4;
    const jChannel = j % 4;

    for (let k = 0; k < this.objectCount; k++) {
      const temp = iArray.getUint32(k * 16 + iChannel * 4);
      iArray.setUint32(
        k * 16 + iChannel * 4,
        jArray.getUint32(k * 16 + jChannel * 4)
      );
      jArray.setUint32(k * 16 + jChannel * 4, temp);
    }

    const iId = this.propertyIds[i];
    const jId = this.propertyIds[j];

    this.whereProperty.set(iId, j);
    this.whereProperty.set(jId, i);
  }

  async download() {
    const arrays = await Promise.all(
      this.buffers.map((buffer) => buffer.read())
    );

    arrays.forEach((array, i) => (this.arrays[i].buffer = array.buffer));
  }

  async upload() {
    // Cleanup after undo/redo
    while (this.buffers.length > this.arrays.length)
      this.buffers.pop()?.dispose();

    while (this.arrays.length > this.buffers.length)
      this.buffers.push(this.compute.createBuffer(this.objectCount));

    if (!this.changed || this.buffers.length === 0 || this.objectCount === 0)
      return;

    if (this.objectCount !== this.buffers[0].size)
      this.buffers.forEach((buffer) => buffer.resizeErase(this.objectCount));

    await Promise.all(
      this.arrays.map((array, i) =>
        this.buffers[i].write(array.asFloat32Array(), 0, this.objectCount)
      )
    );

    this.changed = false;
  }
}

export type AuxiliaryRef = {
  buffer(): ComputeBuffer;
  channel(): number;
};

export class AuxiliaryProperty {
  constructor(
    public readonly auxiliary: Auxiliary,
    public readonly id: number
  ) {}

  get index() {
    return this.auxiliary.whereProperty.get(this.id);
  }

  get ref() {
    return {
      buffer: () => this.auxiliary.buffers[Math.floor(this.index! / 4)],
      channel: () => this.index! % 4,
    };
  }

  set(index: number, value: number) {
    this.auxiliary.setProperty(this, index, value);
  }
}
