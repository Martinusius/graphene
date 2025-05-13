export class ArrayQueue<T> {
  private positive: T[] = [];
  private negative: T[] = [];

  private start: number = 0;
  private end: number = 0;

  get length() {
    return this.end - this.start;
  }

  constructor(array: T[] = []) {
    for(let i = 0; i < array.length; i++) {
      this.push(array[i]);
    }
  }

  push(value: T) {
    if(this.end < -1) this.negative[-this.end - 1] = value;
    else this.positive.push(value);
    this.end++;

    return this.length;
  }  

  pop() {
    let value = undefined;

    if(this.end < 1) {
      value = this.negative[-this.end];
      this.negative[-this.end] = undefined as T;
    }
    else {
      value = this.positive.pop();
    }
    this.end--;

    this.compact();

    return value;
  }

  unshift(value: T) {
    if(this.start > 0) this.positive[this.start - 1] = value;
    else this.negative.push(value);
    this.start--;

    return this.length;
  }

  shift() {
    let value = undefined;

    if(this.start >= 0) {
      value = this.positive[this.start];
      this.positive[this.start] = undefined as T;
    }
    else {
      value = this.negative.pop();
    }
    this.start++;

    this.compact();

    return value;
  }

  at(index: number) {
    if(this.start + index >= 0) return this.positive[index + this.start];
    else return this.negative[-(this.start + index) - 1];
  }

  toArray() {
    const array = [];
    for(let i = 0; i < this.length; i++) {
      array.push(this.at(i));
    }
    return array;
  }

  private compact() {
    const waste = Math.max(0, Math.max(this.start, -this.end - 1));
    if(waste < this.length) return;

    const positive = [];
    for(let i = 0; i < this.length; i++) {
      positive.push(this.at(i));
    }

    this.positive = this.toArray();
    this.start = 0;
    this.end = this.positive.length;
  }  
};