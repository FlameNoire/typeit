import defaults from "./defaults.js";
import {
  isVisible,
  randomInRange,
  removeComments,
  appendStyleBlock
} from "./utilities";
import merge from "./helpers/merge";
import isInput from "./helpers/isInput";
import toArray from "./helpers/toArray";
import noderize from "./helpers/noderize";
import createNodeString from "./helpers/createNodeString";
import clearPreviousMarkup from "./helpers/clearPreviousMarkup";

import Queue from "./Queue";

let baseInlineStyles =
  "display:inline;position:relative;font:inherit;color:inherit;line-height:inherit;";

export default class Instance {
  constructor({ element, id, options, typeit = null, queue = [] } = {}) {
    this.status = {
      started: false,
      complete: false,
      frozen: false,
      destroyed: false
    };
    this.timeouts = [];
    this.id = id;
    this.typeit = typeit;
    this.$e = element;
    this.isInput = isInput(element);
    this.queue = new Queue(queue);
    this.opts = merge({}, defaults, options);
    this.opts.strings = removeComments(toArray(this.opts.strings));
    this.opts.html = this.isInput ? false : this.opts.html;
    this.queue.add([this.pause, this.opts.startDelay]);

    clearPreviousMarkup(element);

    this.prepareDelay("nextStringDelay");
    this.prepareDelay("loopDelay");

    let existingMarkup = this.$e.innerHTML;

    this.prepDOM();
    this.handleHardCoded(existingMarkup);

    if (this.opts.strings.length) {
      this.generateQueue();
    }
  }

  init() {
    if (this.status.started) return;

    this.cursor();

    if (!this.opts.waitUntilVisible || isVisible(this.$e)) {
      this.status.started = true;

      return this.fire();
    }

    const checkForStart = () => {
      if (isVisible(this.$e) && !this.status.started) {
        this.fire();
        window.removeEventListener("scroll", checkForStart);
      }
    };

    window.addEventListener("scroll", checkForStart);
  }

  fire() {
    let queue = this.queue.waiting.slice();
    let prom = Promise.resolve();

    for (let key of queue) {
      let callbackArgs = [key, this.queue, this.typeit];

      prom = prom
        .then(() => {
          return new Promise((resolve, reject) => {
            if (this.status.frozen) {
              return reject();
            }

            this.setPace();

            if (key[2] && key[2].isFirst && this.opts.beforeString) {
              this.opts.beforeString(...callbackArgs);
            }

            if (this.opts.beforeStep) {
              this.opts.beforeStep(...callbackArgs);
            }

            //-- Fire this step!
            key[0].call(this, key[1], key[2]).then(() => {
              if (key[2] && key[2].isLast && this.opts.afterString) {
                this.opts.afterString(...callbackArgs);
              }

              if (this.opts.afterStep) {
                this.opts.afterStep(...callbackArgs);
              }

              //-- Remove this item from the global queue. Needed for pausing.
              this.queue.executed.push(this.queue.waiting.shift());

              resolve();
            });
          });
        })
        .catch(() => {});
    }

    if (this.opts.loop) {
      //-- Split the delay!
      let delay = this.opts.loopDelay
        ? this.opts.loopDelay
        : this.opts.nextStringDelay;

      this.wait(() => {
        //-- Reset queue with initial loop pause.
        this.queue = [];

        //-- Queue deletions.
        this.queueDeletions(this.contents());

        //-- Regenerate queue.
        this.generateQueue([this.pause, delay.before]);

        //-- Kick it!
        this.fire();
      }, delay.after);
    }

    this.status.completed = true;

    if (this.opts.afterComplete) {
      this.opts.afterComplete(this.typeit);
    }

    return;
  }

  setOptions(options) {
    this.opts = merge({}, this.opts, options);
    return;
  }

  /**
   * Performs DOM-related work to prepare for typing.
   */
  prepDOM() {
    if (this.isInput) return;

    this.$e.innerHTML = `
      <span style="${baseInlineStyles}" class="ti-wrapper">
        <span style="${baseInlineStyles}" class="ti-container"></span>
      </span>
      `;
    this.$e.setAttribute("data-typeit-id", this.id);
    this.$eContainer = this.$e.querySelector(".ti-container");
    this.$eWrapper = this.$e.querySelector(".ti-wrapper");

    appendStyleBlock(
      `
        .${this.$eContainer.className}:before {
          content: '.';
          display: inline-block;
          width: 0;
          visibility: hidden;
        }
      `
    );
  }

  /**
   * Reset the instance to new status.
   */
  reset() {
    this.queue.reset();

    return new Instance({
      element: this.$e,
      id: this.id,
      options: this.opts,
      typeit: this.typeit,
      queue: this.queue.waiting
    });
  }

  /**
   * If argument is passed, set to content according to `html` option.
   * If not, just return the contents of the element, based on `html` option.
   * @param {string | null} content
   * @todo Test this!
   */
  contents(content = null) {
    if (content === null) {
      if (this.isInput) {
        return this.$e.value;
      }

      return this.opts.html
        ? this.$eContainer.innerHTML
        : this.$eContainer.innerText;
    }

    if (this.isInput) {
      this.$e.value = content;
    } else {
      this.$eContainer[this.opts.html ? "innerHTML" : "innerText"] = content;
    }

    return true;
  }

  prepareDelay(delayType) {
    let delay = this.opts[delayType];

    if (!delay) return;

    let isArray = Array.isArray(delay);
    let halfDelay = !isArray ? delay / 2 : null;

    this.opts[delayType] = {
      before: isArray ? delay[0] : halfDelay,
      after: isArray ? delay[1] : halfDelay,
      total: isArray ? delay[0] + delay[1] : delay
    };
  }

  generateQueue(initialStep = null) {
    if (initialStep) {
      this.queue.add(initialStep);
    }

    this.opts.strings.forEach((string, index) => {
      this.queueString(string);

      let queueLength = this.queue.waiting.length;

      //-- This is the last string. Get outta here.
      if (index + 1 === this.opts.strings.length) return;

      if (this.opts.breakLines) {
        this.queue.add([this.insert, "<br>"]);
        this.addSplitPause(queueLength);
        return;
      }

      this.queueDeletions(string);
      this.addSplitPause(queueLength, string.length);
    });
  }

  /**
   * Delete each character from a string.
   *
   * @todo Why am I accepting a string or number?
   */
  queueDeletions(stringOrNumber = null) {
    let numberOfCharsToDelete =
      typeof stringOrNumber === "string"
        ? this.maybeNoderize(stringOrNumber).length
        : stringOrNumber;

    for (let i = 0; i < numberOfCharsToDelete; i++) {
      this.queue.add([this.delete]);
    }
  }

  /**
   * Based on HTML options, noderize the string,
   * always ensuring its returned as split pieces.
   *
   * @param {array} stuff
   */
  maybeNoderize(stuff) {
    if (!this.opts.html) {
      return stuff.split("");
    }

    return noderize(stuff);
  }

  /**
   * Add steps to the queue for each character in a given string.
   */
  queueString(string) {
    //-- Get array of string with nodes where applicable.
    string = this.maybeNoderize(string);

    let strLength = string.length;

    //-- Push each array item to the queue.
    string.forEach((item, index) => {
      let queueItem = [this.type, item];

      //-- Tag as first character of string for callback usage.
      if (index === 0) {
        queueItem.push({
          isFirst: true
        });
      }

      if (index + 1 === strLength) {
        queueItem.push({
          isLast: true
        });
      }

      this.queue.add(queueItem);
    });
  }

  /**
   * Insert a split pause around a range of queue items.
   *
   * @param  {Number} startPosition The array position at which to start wrapping.
   * @param  {Number} numberOfActionsToWrap The number of actions in the queue to wrap.
   * @return {void}
   */
  addSplitPause(startPosition, numberOfActionsToWrap = 1) {
    this.queue.waiting.splice(startPosition, 0, [
      this.pause,
      this.opts.nextStringDelay.before
    ]);

    this.queue.waiting.splice(startPosition + numberOfActionsToWrap + 1, 0, [
      this.pause,
      this.opts.nextStringDelay.after
    ]);
  }

  cursor() {
    if (this.isInput) return;

    let visibilityStyle = "visibility: hidden;";

    if (this.opts.cursor) {
      appendStyleBlock(
        `
        @keyframes blink-${this.id} {
          0% {opacity: 0}
          49% {opacity: 0}
          50% {opacity: 1}
        }

        [data-typeit-id='${this.id}'] .ti-cursor {
          animation: blink-${this.id} ${this.opts.cursorSpeed / 1000}s infinite;
        }
      `,
        this.id
      );

      visibilityStyle = "";
    }

    this.$eWrapper.insertAdjacentHTML(
      "beforeend",
      `<span style="${baseInlineStyles}${visibilityStyle}left: -.25ch;" class="ti-cursor">${
        this.opts.cursorChar
      }</span>`
    );
  }

  /**
   * Inserts string to element container.
   */
  insert(content, toChildNode = false) {
    if (this.isInput) {
      this.$e.value = `${this.$e.value}${content}`;
      return;
    }

    let el = toChildNode ? this.$eContainer.lastChild : this.$eContainer;

    // console.log(el, toChildNode);

    el.insertAdjacentHTML("beforeend", content);

    this.contents(
      this.contents()
        .split("")
        .join("")
    );
  }

  handleHardCoded(existing) {
    if (!existing.length) return false;

    if (this.opts.startDelete) {
      this.insert(existing);
      this.queue.add([this.delete, true]);
      this.addSplitPause(1);
      return;
    }

    this.opts.strings = [...toArray(existing.trim()), ...this.opts.strings];
  }

  wait(callback, delay) {
    this.timeouts.push(setTimeout(callback, delay));
  }

  pause(time = false) {
    return new Promise((resolve, reject) => {
      this.wait(
        () => {
          return resolve();
        },
        time ? time : this.opts.nextStringDelay.total
      );
    });
  }

  /**
   * Type a SINGLE character.
   * @param {*} character
   */
  type(character) {
    return new Promise((resolve, reject) => {
      this.wait(() => {
        //-- We hit a standard string.
        if (typeof character === "string") {
          this.insert(character);
          return resolve();
        }

        //-- We hit a node.
        if (character.isFirstCharacter) {
          this.insert(
            createNodeString({
              tag: character.tag,
              attributes: character.attributes,
              content: character.content
            })
          );

          return resolve();
        }

        this.insert(character.content, true);
        return resolve();
      }, this.typePace);
    });
  }

  setPace() {
    let typeSpeed = this.opts.speed;
    let deleteSpeed =
      this.opts.deleteSpeed !== null
        ? this.opts.deleteSpeed
        : this.opts.speed / 3;
    let typeRange = typeSpeed / 2;
    let deleteRange = deleteSpeed / 2;

    this.typePace = this.opts.lifeLike
      ? randomInRange(typeSpeed, typeRange)
      : typeSpeed;
    this.deletePace = this.opts.lifeLike
      ? randomInRange(deleteSpeed, deleteRange)
      : deleteSpeed;
  }

  empty() {
    this.contents("");
  }

  /**
   * Deletes a single printed character or ALL typed characters.
   */
  delete(keepGoingUntilAllIsGone = false) {
    return new Promise((resolve, reject) => {
      this.wait(() => {
        let contents = this.maybeNoderize(this.contents());

        contents.splice(-1, 1);

        contents = contents.map(character => {
          if (typeof character === "object") {
            return createNodeString({
              tag: character.tag,
              attributes: character.attributes,
              content: character.content
            });
          }

          return character;
        });

        contents = contents.join("").replace(/<[^\/>][^>]*><\/[^>]+>/, "");

        this.contents(contents);

        /**
         * If it's specified, keep deleting until all characters are gone. This is
         * the only time when a SINGLE queue action (`delete()`) deals with multiple
         * characters at once. I don't like it, but need to implement like this right now.
         */
        if (keepGoingUntilAllIsGone && contents.length > 0) {
          this.delete(true);
        }

        return resolve();
      }, this.deletePace);
    });
  }
}
