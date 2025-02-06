export class IndexedSet<T> {
  private map: Map<T, number>;
  private array: T[];

  constructor(iterable: Iterable<T> = []) {
    this.map = new Map();
    this.array = Array.from(iterable);

    for (let i = 0; i < this.array.length; i++) {
      this.map.set(this.array[i], i);
    }
  }

  add(value: T) {
    if (this.map.has(value)) return this;
    this.array.push(value);
    this.map.set(value, this.array.length - 1);
    return this;
  }

  delete(value: T) {
    const index = this.map.get(value);
    if (index === undefined) return false;

    this.array[index] = this.array[this.array.length - 1];
    this.array.pop();
    this.map.delete(value);
    return true;
  }

  has(value: T) {
    return this.map.has(value);
  }

  at(index: number) {
    return this.array[index];
  }

  get size() {
    return this.array.length;
  }
}