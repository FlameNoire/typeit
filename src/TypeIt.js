import Instance from "./Instance";
import allHaveStatus from "./helpers/allHaveStatus";
import { generateHash } from "./utilities";
import toArrayOfNodes from "./helpers/toArrayOfNodes";

export default class TypeIt {
  constructor(element, options) {
    this.instances = toArrayOfNodes(element).map(el => {
      return new Instance({
        element: el,
        id: generateHash(),
        options,
        typeit: this
      });
    });
  }

  /**
   * Push a specific action into the queue of each instance.
   * If an instance has already completed, trigger the queeu again.
   *
   * @param {string} function
   * @param {*} argument
   */
  queueUp(action, argument = null) {
    this.instances.forEach(instance => {
      let isIndependentFunction = typeof action !== "string";

      /**
       * If action is a string, bind it to instance.
       * Otherwise, leave it on its own.
       */
      let toFire = isIndependentFunction ? action : instance[action];

      let toPassAsArguments = isIndependentFunction ? this : argument;

      instance.queue.add([toFire, toPassAsArguments]);
    });
  }

  is(status) {
    return allHaveStatus(this.instances, status, true);
  }

  freeze() {
    this.instances.forEach(instance => {
      instance.status.frozen = true;
    });
  }

  unfreeze() {
    this.instances.forEach(instance => {
      if (!instance.status.frozen) return;
      instance.status.frozen = false;
      instance.fire();
    });
  }

  /**
   * If used after typing has started, will append strings to the end of the existing queue. If used when typing is paused, will restart it.
   *
   * @param  {string} string The string to be typed.
   * @return {object} TypeIt instance
   */
  type(string = "") {
    this.instances.forEach(instance => instance.queueString(string));
    return this;
  }

  /**
   * If null is passed, will delete whatever's currently in the element.
   *
   * @param  { number } numCharacters Number of characters to delete.
   * @return { TypeIt }
   */
  delete(numCharacters = 1) {
    for(let i = 0; i < numCharacters; i++) {
      this.queueUp("delete", numCharacters);
    }

    return this;
  }

  //-- works!
  pause(ms = null) {
    this.queueUp("pause", ms);
    return this;
  }

  break() {
    this.queueUp("insert", "<br>");
    return this;
  }

  options(options) {
    this.queueUp("setOptions", options);
    return this;
  }

  destroy(removeCursor = true) {
    this.instances.forEach(instance => {
      instance.timeouts.forEach(timeout => {
        clearTimeout(timeout);
      });

      instance.timeouts = [];

      if (removeCursor && instance.options.cursor) {
        instance.$eWrapper.removeChild(
          instance.$eWrapper.querySelector(".ti-cursor")
        );
      }

      instance.status.destroyed = true;
    });
  }

  hook(func) {
    this.queueUp(func);
    return this;
  }

  /**
   * Reset each instance like it's brand new.
   */
  reset() {
    this.instances = this.instances.map(instance => {
      return instance.reset();
    });
    return this;
  }

  go() {
    this.instances.forEach(instance => {
      instance.init();
    });
    return this;
  }
}
