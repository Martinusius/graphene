export class Ids<V> {
  private values: (V | undefined)[] = [];
  private free: number[] = [];

  create(value: V) {
    if (this.free.length > 0) {
      this.values[this.free[this.free.length - 1] - 1] = value;
      return this.free.pop()!;
    }


    return this.values.push(value);
  }

  set(key: number, value: V) {
    this.values[key - 1] = value;
  }

  get(key: number) {
    return this.values[key - 1];
  }

  delete(key: number) {
    this.values[key - 1] = undefined;
    this.free.push(key);
  }

  has(key: number) {
    return this.values[key - 1] !== undefined;
  }
}
