import { DynamicArray } from "./DynamicArray";
import { Ids } from "./Ids";

function clone(object: any): any {
  if (object instanceof DynamicArray) return DynamicArray.fromArray(clone(object.toArray()));
  if (object instanceof Uint8Array) return new Uint8Array(object);
  if (object instanceof Map) return new Map(object.entries().map(clone));
  if (object instanceof Set) return new Set(object.entries().map(clone));

  if (object instanceof Ids) {
    const ids = new Ids();
    ids.values = clone(object.values);
    ids.free = clone(object.free);
    return ids;
  }

  if (Array.isArray(object)) return object.map(clone);

  if(object && typeof object === 'object')
    return structuredClone(object);

  return object;
}

function hasChanged(from: any, to: any): boolean {
  if (from === to) return false;

  if (typeof from !== typeof to) return true;

  if (from === null || to === null) return from !== to;

  if (from instanceof DynamicArray || to instanceof DynamicArray) {
    if (!(from instanceof DynamicArray && to instanceof DynamicArray)) return true;
    return hasChanged(from.toArray(), to.toArray());
  }

  if (from instanceof Uint8Array || to instanceof Uint8Array) {
    if (!(from instanceof Uint8Array && to instanceof Uint8Array)) return true;
    if (from.length !== to.length) return true;

    for (let i = 0; i < from.length; i++) {
      if (from[i] !== to[i]) return true;
    }

    return false;
  }

  if (from instanceof Map || to instanceof Map) {
    if (!(from instanceof Map && to instanceof Map)) return true;
    if (from.size !== to.size) return true;

    const iterFrom = from.entries();
    const iterTo = to.entries();
    let itemFrom = iterFrom.next();
    let itemTo = iterTo.next();

    while (!itemFrom.done && !itemTo.done) {
      const [keyFrom, valueFrom] = itemFrom.value;
      const [keyTo, valueTo] = itemTo.value;
      if (hasChanged(keyFrom, keyTo)) return true;
      if (hasChanged(valueFrom, valueTo)) return true;
      itemFrom = iterFrom.next();
      itemTo = iterTo.next();
    }

    return false;
  }

  if (from instanceof Set || to instanceof Set) {
    if (!(from instanceof Set && to instanceof Set)) return true;
    if (from.size !== to.size) return true;

    for (const a of from) {
      let found = false;
      for (const b of to) {
        if (!hasChanged(a, b)) { found = true; break; }
      }
      if (!found) return true;
    }

    return false;
  }

  if (from instanceof Ids || to instanceof Ids) {
    if (!(from instanceof Ids && to instanceof Ids)) return true;

    if (hasChanged(from.values, to.values)) return true;
    if (hasChanged(from.free, to.free)) return true;

    return false;
  }

  if (Array.isArray(from) || Array.isArray(to)) {
    if (!(Array.isArray(from) && Array.isArray(to))) return true;

    if (from.length !== to.length) return true;
    for (let i = 0; i < from.length; i++) {
      if (hasChanged(from[i], to[i])) return true;
    }
    return false;
  }

  if (typeof from === 'object' && typeof to === 'object') {
    const keysFrom = Object.keys(from);
    const keysTo = Object.keys(to);

    if (keysFrom.length !== keysTo.length) return true;

    for (const key of keysFrom) {
      if (!to.hasOwnProperty(key)) return true;
      if (hasChanged(from[key], to[key])) return true;
    }
    
    return false;
  }

  return true;
}


type Key = string | number | symbol;

type TrackedObject = {
  object: any;
  property: Key;
  last: any;
  undo: any[];
  redo: any[];
  precommit: any;
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
        precommit: null
      });
    });
  }

  precommit() {
    this.tracked.forEach((tracked) => {
      tracked.precommit = clone(tracked.object[tracked.property]);
    });
  }

  commit() {
    if(!this.tracked.some((tracked) => hasChanged(tracked.precommit, tracked.object[tracked.property])))
      return;

    this.tracked.forEach((tracked) => {
      tracked.undo.push(tracked.precommit);
      tracked.precommit = null;
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
