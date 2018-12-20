export default class {
  constructor(items = []) {
    this.executed = [];
    this.waiting = items;
  }

  add(step, toBeginning = false) {
    this.waiting[toBeginning ? "unshift" : "push"](step);
    return this;
  }

  delete(index) {
    this.waiting.splice(index, 1);
    return this;
  }

  reset() {
    this.waiting = [...this.executed, ...this.waiting];
    this.executed = [];
    return this;
  }
}
