import defaults from "./defaults.js";
import {
  isVisible,
  randomInRange,
  removeComments,
  toArray,
  appendStyleBlock
} from "./utilities";
import noderize from "./helpers/noderize";
import clearPreviousMarkup from "./helpers/clearPreviousMarkup";
import createNodeString from "./helpers/createNodeString";

import Queue from "./Queue";

let baseInlineStyles =
  "display:inline;position:relative;font:inherit;color:inherit;line-height:inherit;";

export default class Instance {
  status = {
    started: false,
    complete: false,
    frozen: false,
    destroyed: false
  };

  timeouts = [];

  constructor({ element, id, options, typeit = null, queue = [] } = {}) {
    this.id = id;
    this.typeit = typeit;
    this.$e = element;
    this.queue = new Queue(queue);
    this.options = Object.assign({}, defaults, options);

    clearPreviousMarkup(element);

    this.prepareDelay("nextStringDelay");
    this.prepareDelay("loopDelay");

    let existingMarkup = this.checkForExistingMarkup();

    this.prepareDOM();

    if (this.options.startDelete && existingMarkup) {
      this.insert(existingMarkup);
      this.queue.add([this.delete]);
      this.insertSplitPause(1);
    }

    console.log(this.options.strings);

    this.options.strings = removeComments(toArray(this.options.strings));

    // console.log(this.options.strings);

    if (this.options.strings.length) {
      this.generateQueue();
    }
  }

  init() {
    if (this.status.started) return;

    this.cursor();

    if (!this.options.waitUntilVisible || isVisible(this.$e)) {
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

  async fire() {
    let queue = this.queue.waiting.slice();

    for (let key of queue) {
      let callbackArgs = [key, this.queue, this.typeit];

      try {
        await new Promise(async (resolve, reject) => {
          if (this.status.frozen) {
            return reject();
          }

          this.setPace();

          if (key[2] && key[2].isFirst && this.options.beforeString) {
            this.options.beforeString(...callbackArgs);
          }

          if (this.options.beforeStep) {
            this.options.beforeStep(...callbackArgs);
          }

          //-- Fire this step!
          await key[0].call(this, key[1], key[2]);

          if (key[2] && key[2].isLast && this.options.afterString) {
            this.options.afterString(...callbackArgs);
          }

          if (this.options.afterStep) {
            this.options.afterStep(...callbackArgs);
          }

          //-- Remove this item from the global queue. Needed for pausing.
          this.queue.executed.push(this.queue.waiting.shift());

          resolve();
        });
      } catch (e) {
        break;
      }
    }

    if (this.options.loop) {
      //-- Split the delay!
      let delay = this.options.loopDelay
        ? this.options.loopDelay
        : this.options.nextStringDelay;

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

    this.status.complete = true;

    if (this.options.afterComplete) {
      this.options.afterComplete(this.typeit);
    }

    return;
  }

  setOptions(options) {
    this.options = Object.assign(this.options, options);
    return;
  }

  /**
   * Performs DOM-related work to prepare for typing.
   */
  prepareDOM() {
    this.$e.innerHTML = `
      <span style="${baseInlineStyles}" class="ti-wrapper">
        <span style="${baseInlineStyles}" class="ti-container"></span>
      </span>
      `;
    this.$e.setAttribute("data-typeitid", this.id);
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
      options: this.options,
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
      if (this.$e instanceof HTMLInputElement) {
        return this.$e.value;
      }

      return this.options.html
        ? this.$eContainer.innerHTML
        : this.$eContainer.innerText;
    }

    this.$eContainer[this.options.html ? "innerHTML" : "innerText"] = content;

    return content;
  }

  prepareDelay(delayType) {
    let delay = this.options[delayType];

    if (!delay) return;

    let isArray = Array.isArray(delay);
    let halfDelay = !isArray ? delay / 2 : null;

    this.options[delayType] = {
      before: isArray ? delay[0] : halfDelay,
      after: isArray ? delay[1] : halfDelay,
      total: isArray ? delay[0] + delay[1] : delay
    };
  }

  generateQueue(initialStep = null) {
    initialStep =
      initialStep === null
        ? [this.pause, this.options.startDelay]
        : initialStep;

    this.queue.add(initialStep);

    this.options.strings.forEach((string, index) => {
      this.queueString(string);

      let queueLength = this.queue.waiting.length;

      //-- This is the last string. Get outta here.
      if (index + 1 === this.options.strings.length) return;

      if (this.options.breakLines) {
        this.queue.add([this.insert, "<br>"]);
        this.insertSplitPause(queueLength);
        return;
      }

      this.queueDeletions(string);
      this.insertSplitPause(queueLength, string.length);
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
        ? noderize(stringOrNumber).length
        : stringOrNumber;

    for (let i = 0; i < numberOfCharsToDelete; i++) {
      this.queue.add([this.delete]);
    }
  }

  /**
   * Add steps to the queue for each character in a given string.
   */
  queueString(string) {
    if (!string) return;

    //-- Get array of string with nodes where applicable.
    string = noderize(string);

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
  insertSplitPause(startPosition, numberOfActionsToWrap = 1) {
    this.queue.waiting.splice(startPosition, 0, [
      this.pause,
      this.options.nextStringDelay.before
    ]);

    this.queue.waiting.splice(startPosition + numberOfActionsToWrap + 1, 0, [
      this.pause,
      this.options.nextStringDelay.after
    ]);
  }

  cursor() {
    let visibilityStyle = "visibility: hidden;";

    if (this.options.cursor) {
      appendStyleBlock(
        `
        @keyframes blink-${this.id} {
          0% {opacity: 0}
          49% {opacity: 0}
          50% {opacity: 1}
        }

        [data-typeitid='${this.id}'] .ti-cursor {
          animation: blink-${this.id} ${this.options.cursorSpeed /
          1000}s infinite;
        }
      `,
        this.id
      );

      visibilityStyle = "";
    }

    this.$eWrapper.insertAdjacentHTML(
      "beforeend",
      `<span style="${baseInlineStyles}${visibilityStyle}left: -.25ch;" class="ti-cursor">${
        this.options.cursorChar
      }</span>`
    );
  }

  /**
   * Inserts string to element container.
   */
  insert(content, toChildNode = false) {
    //-- This is a form element!
    if (this.$e instanceof HTMLInputElement) {
      //@todo Make this focus() optional!
      this.$e.focus();

      this.$e.value = `${this.$e.value}${content}`;
      return;
    }

    let el = toChildNode ? this.$eContainer.lastChild : this.$eContainer;

    el.insertAdjacentHTML("beforeend", content);

    this.contents(
      this.contents()
        .split("")
        .join("")
    );
  }

  /**
   * Depending on if we're starting by deleting an existing string or typing
   * from nothing, set a specific variable to what's in the HTML.
   */
  checkForExistingMarkup() {
    let markup = this.$e.innerHTML;

    //-- Set the hard-coded string as the string(s) we'll type.
    if (markup.length > 0) {
      this.options.strings = [...toArray(markup.trim()), ...this.options.strings];
      return "";
    }

    return markup;
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
        time ? time : this.options.nextStringDelay.total
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
        if (typeof character === "object") {
          //-- Create element with first character.
          if (character.isFirstCharacter) {
            this.insert(
              createNodeString({
                tag: character.tag,
                attributes: character.attributes,
                content: character.content
              })
            );

            return;
          }

          this.insert(character.content, true);
          return resolve();
        }
      }, this.typePace);
    });
  }

  setPace() {
    let typeSpeed = this.options.speed;
    let deleteSpeed =
      this.options.deleteSpeed !== null
        ? this.options.deleteSpeed
        : this.options.speed / 3;
    let typeRange = typeSpeed / 2;
    let deleteRange = deleteSpeed / 2;

    this.typePace = this.options.lifeLike
      ? randomInRange(typeSpeed, typeRange)
      : typeSpeed;
    this.deletePace = this.options.lifeLike
      ? randomInRange(deleteSpeed, deleteRange)
      : deleteSpeed;
  }

  /**
   * Deletes a single printed character or ALL typed characters.
   */
  delete(keepGoingUntilAllIsGone = false) {

    return new Promise((resolve, reject) => {

      this.wait(() => {
        let contents = noderize(this.contents());

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
