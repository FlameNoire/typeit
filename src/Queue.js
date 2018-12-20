export default class {
  constructor(items = []) {
    this.executed = [];
    this.waiting = items;
  }

  add(step, toBeginning = false) {
    this.waiting[toBeginning ? "unshift" : "push"](step);
  }

  delete(index) {
    this.waiting.splice(index, 1);
  }

  reset() {
    this.waiting = [...this.executed, ...this.waiting];
    this.executed = [];
  }
}
