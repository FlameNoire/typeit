export default class {
  constructor(items = []) {
    this.executed = [];
    this.waiting = items;
  }

  add(step) {
    this.waiting.push(step);
  }

  empty() {
    this.waiting = [];
    this.executed = [];
  }

  reset() {
    this.waiting = [...this.executed, ...this.waiting];
    this.executed = [];
  }
}
