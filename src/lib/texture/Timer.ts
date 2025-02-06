export class Timer {
  private last = 0;
  private current: string | undefined = undefined;
  private times: { [key: string]: number } = {};

  constructor() {
    this.last = performance.now();
  }

  start(name: string) {
    if (this.current) this.times[this.current] = performance.now() - this.last;
    this.last = performance.now();
    this.current = name;
  }

  finish() {
    if (this.current) this.times[this.current] = performance.now() - this.last;

    console.log(Object.entries(this.times).map(([key, value]) => `${key} = ${Math.round(value * 10) / 10}ms`).join(', '))
  }
}