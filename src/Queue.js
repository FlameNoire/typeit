export default class {
  executed = [];

  constructor(items = []) {
    this.waiting = items;
  }

  add(step) {
    this.waiting.push(step);
  }

  reset() {
    this.waiting = [...this.executed, ...this.waiting];
    this.executed = [];
  }
}
