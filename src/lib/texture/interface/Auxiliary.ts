import type { Compute } from "../compute/Compute";
import type { ComputeBuffer } from "../compute/ComputeBuffer";
import { DynamicArray } from "../DynamicArray";
import { Ids } from "../Ids";
import { Operation } from "./Operation";

type State = {
  undoStack: DynamicArray;
  redoStack: DynamicArray;
  changed: boolean;
  opCount: number;
}

export class Auxiliary {
  public whereProperty = new Ids<number>();
  private arrays: DynamicArray[] = [];
  public buffers: ComputeBuffer[] = [];

  private objectCount = 0;
  private propertyCount = 0;

  public changed = false;

  constructor(private compute: Compute, public isEdge: boolean, public state: State) {

  }

  pushObject() {
    this.changed = true;
    this.objectCount++;

    this.arrays.forEach((array) => array.pushFloat32(0));
  }

  popObject() {
    this.changed = true;
    this.objectCount--;

    this.arrays.forEach((array) => array.popFloat32());
  }

  swapObjects(i: number, j: number) {
    // return;
    this.changed = true;

    const iChannel = i % 4;
    const jChannel = j % 4;

    this.arrays.forEach((array) => {
      const temp = array.getFloat32(i * 16 + iChannel * 4);
      array.setFloat32(
        i * 16 + iChannel * 4,
        array.getFloat32(j * 16 + jChannel * 4)
      );
      array.setFloat32(j * 16 + jChannel * 4, temp);
    });
  }

  swapObjectsLast(i: number) {
    this.swapObjects(i, this.objectCount - 1);
  }

  setProperty(property: AuxiliaryProperty, i: number, value: number) {
    this.changed = true;

    const array = this.arrays[Math.floor(property.index! / 4)];
    const channel = property.index! % 4;

    console.log(array.length);

    array.setFloat32(i * 16 + channel * 4, value);
  }

  pushObjectFromArray(src: DynamicArray) {
    // return;
    this.arrays.forEach((array) => {
      for (let i = 0; i < 4; i++) {
        array.pushFloat32(src.popFloat32());
      }
    });
  }

  popObjectToArray(dest: DynamicArray) {
    // return;
    this.arrays.forEach((array) => {
      for (let i = 0; i < 4; i++) {
        dest.pushFloat32(array.popFloat32());
      }
    });
  }

  createProperty() {
    this.changed = true;
    this.propertyCount++;

    if (this.propertyCount > 4 * this.arrays.length) {
      const array = new DynamicArray(16 * this.objectCount);
      array.length = 16 * this.objectCount;
      // console.log(array.length);

      this.arrays.push(array);
      this.buffers.push(this.compute.createBuffer(this.objectCount));
    }

    // console.log(this.arrays[0].length);

    this.state.undoStack.pushUint8(this.isEdge ? Operation.ADD_EDGE_AUXILIARY : Operation.ADD_VERTEX_AUXILIARY);

    const id = this.whereProperty.create(this.propertyCount - 1);
    return new AuxiliaryProperty(this, id);
  }

  deleteProperty(property: AuxiliaryProperty) {
    this.changed = true;

    const channel = property.index! % 4;
    const array = this.arrays[Math.floor(property.index! / 4)];
    for (let i = this.objectCount - 1; i >= 0; i++) {
      this.state.undoStack.pushFloat32(array.getFloat32(i * 16 + channel * 4));
    }

    this.state.undoStack.pushUint8(this.isEdge ? Operation.DELETE_EDGE_AUXILIARY : Operation.DELETE_VERTEX_AUXILIARY);
    this.state.undoStack.pushUint8(property.index!);


    this.swapProperties(property.index!, this.propertyCount - 1);

    this.whereProperty.delete(property.id);
    this.propertyCount--;

    if (this.propertyCount < 4 * this.arrays.length - 1) {
      this.arrays.pop();
      this.buffers.pop()?.dispose();
    }
  }

  private undoAddProperty() {
    this.propertyCount--;

    const channel = this.propertyCount % 4;
    const array = this.arrays[Math.floor(this.propertyCount / 4)];
    for (let i = this.objectCount - 1; i >= 0; i++) {
      this.state.redoStack.pushFloat32(array.getFloat32(i * 16 + channel * 4));
    }

    this.state.redoStack.pushUint8(this.isEdge ? Operation.ADD_EDGE_AUXILIARY : Operation.ADD_VERTEX_AUXILIARY);

    this.whereProperty.delete(this.propertyCount);


    if (this.propertyCount < 4 * this.arrays.length - 1) {
      this.arrays.pop();
      this.buffers.pop()?.dispose();
    }
  }

  private undoDeleteProperty() {
    this.propertyCount++;

    if (this.propertyCount > 4 * this.arrays.length) {
      this.arrays.push(new DynamicArray(this.objectCount));
      this.buffers.push(this.compute.createBuffer(this.objectCount));
    }

    const index = this.state.redoStack.popUint8();

    const channel = index % 4;
    const array = this.arrays[Math.floor(index / 4)];

    for (let i = 0; i < this.objectCount; i++) {
      array.setFloat32(i * 16 + channel * 4, this.state.redoStack.popFloat32());
    }

    this.swapProperties(index, this.propertyCount - 1);
    this.whereProperty.create(this.propertyCount - 1);
  }

  private redoAddProperty() {
    this.changed = true;
    this.propertyCount++;

    if (this.propertyCount > 4 * this.arrays.length) {
      this.arrays.push(new DynamicArray(this.objectCount));
      this.buffers.push(this.compute.createBuffer(this.objectCount));
    }

    for (let i = 0; i < this.objectCount; i++) {
      this.arrays[this.arrays.length - 1].pushFloat32(this.state.redoStack.popFloat32());
    }

    this.state.undoStack.pushUint8(this.isEdge ? Operation.ADD_EDGE_AUXILIARY : Operation.ADD_VERTEX_AUXILIARY);
    this.whereProperty.create(this.propertyCount - 1);
  }

  private redoDeleteProperty() {
    this.changed = true;

    const index = this.state.redoStack.popUint8();

    const channel = index % 4;
    const array = this.arrays[Math.floor(index / 4)];

    for (let i = this.objectCount - 1; i >= 0; i++) {
      this.state.undoStack.pushFloat32(array.getFloat32(i * 16 + channel * 4));
    }

    this.state.undoStack.pushUint8(this.isEdge ? Operation.DELETE_EDGE_AUXILIARY : Operation.DELETE_VERTEX_AUXILIARY);
    this.state.undoStack.pushUint8(index);

    this.swapProperties(index, this.propertyCount - 1);
    this.whereProperty.delete(this.propertyCount);
    this.propertyCount--;
  }

  undo(operation: Operation) {
    const addOperation = this.isEdge ? Operation.ADD_EDGE_AUXILIARY : Operation.ADD_VERTEX_AUXILIARY;
    const deleteOperation = this.isEdge ? Operation.DELETE_EDGE_AUXILIARY : Operation.DELETE_VERTEX_AUXILIARY;

    switch (operation) {
      case addOperation:
        this.undoAddProperty();
        return true;
      case deleteOperation:
        this.undoDeleteProperty();
        return true;
      default:
        return false;
    }
  }

  redo(operation: number) {
    const addOperation = this.isEdge ? Operation.ADD_EDGE_AUXILIARY : Operation.ADD_VERTEX_AUXILIARY;
    const deleteOperation = this.isEdge ? Operation.DELETE_EDGE_AUXILIARY : Operation.DELETE_VERTEX_AUXILIARY;

    switch (operation) {
      case addOperation:
        this.redoAddProperty();
        return true;
      case deleteOperation:
        this.redoDeleteProperty();
        return true;
      default:
        return false;
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
      const temp = iArray.getFloat32(k * 16 + iChannel * 4);
      iArray.setFloat32(
        k * 16 + iChannel * 4,
        jArray.getFloat32(k * 16 + jChannel * 4)
      );
      jArray.setFloat32(k * 16 + jChannel * 4, temp);
    }
  }

  async download() {
    const arrays = await Promise.all(
      this.buffers.map((buffer) => buffer.read())
    );

    arrays.forEach((array, i) => (this.arrays[i].buffer = array.buffer));
  }

  async upload() {
    if (!this.changed || this.buffers.length === 0 || this.objectCount === 0)
      return;

    if (this.objectCount !== this.buffers[0].size)
      this.buffers.forEach((buffer) => buffer.resizeErase(this.objectCount));

    await Promise.all(
      this.buffers.map((buffer, i) =>
        buffer.write(this.arrays[i].asFloat32Array(), 0, this.objectCount)
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
  ) { }

  get index() {
    return this.auxiliary.whereProperty.get(this.id);
  }

  get ref() {
    return {
      buffer: () => this.auxiliary.buffers[Math.floor(this.index! / 4)],
      channel: () => this.index! % 4
    }
  }

  set(index: number, value: number) {
    this.auxiliary.setProperty(this, index, value);
  }
}
