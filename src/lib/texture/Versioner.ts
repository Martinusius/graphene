import { DynamicArray } from "./DynamicArray";
import { Ids } from "./Ids";

function clone(object: any): any {
  if (typeof object !== "object") return object;

  if (object instanceof DynamicArray) return object.clone();
  if (object instanceof Map) return new Map(object.entries().map(clone));
  if (object instanceof Set) return new Set(object.entries().map(clone));
  if (object instanceof Ids) {
    const ids = new Ids();
    ids.values = clone(object.values);
    object.free = clone(object.free);
    return ids;
  }

  if (Array.isArray(object)) return object.map(clone);

  // Default object behavior: Shallow copy
  return { ...object };
}

type Key = string | number | symbol;

type TrackedObject = {
  object: any;
  property: Key;
  last: any;
  undo: any[];
  redo: any[];
};

export class Versioner {
  private tracked: TrackedObject[] = [];

  isUndoable() {
    return this.tracked.some((tracked) => tracked.undo.length > 0);
  }

  isRedoable() {
    return this.tracked.some((tracked) => tracked.redo.length > 0);
  }

  track<T>(object: T, ...properties: (keyof T)[]) {
    properties.forEach((property) => {
      this.tracked.push({
        object,
        property,
        last: clone(object[property]),
        undo: [],
        redo: [],
      });
    });
  }

  commit() {
    this.tracked.forEach((tracked) => {
      tracked.undo.push(tracked.last);
      tracked.last = clone(tracked.object[tracked.property]);
    });
  }

  undo() {
    this.tracked.forEach((tracked) => {
      if (tracked.undo.length === 0) return;

      tracked.redo.push(clone(tracked.object[tracked.property]));
      tracked.object[tracked.property] = tracked.undo.pop();

      tracked.last = clone(tracked.object[tracked.property]);
    });
  }

  redo() {
    this.tracked.forEach((tracked) => {
      if (tracked.redo.length === 0) return;

      tracked.undo.push(clone(tracked.object[tracked.property]));
      tracked.object[tracked.property] = tracked.redo.pop();
      tracked.last = clone(tracked.object[tracked.property]);
    });
  }

  clearRedo() {
    this.tracked.forEach((tracked) => (tracked.redo.length = 0));
  }
}
