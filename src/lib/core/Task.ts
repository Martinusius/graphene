export class Task {
  private static active = 0;

  static idle() {
    return this.active === 0;
  }

  static running() {
    return this.active;
  }

  static begin() {
    this.active += 1;
  }

  static end() {
    this.active -= 1;
  }
}