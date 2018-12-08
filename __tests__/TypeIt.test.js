import TypeIt from "../src/TypeIt.js";

let instance;

beforeEach(() => {
  document.body.innerHTML = `
    <div>
      <span id="element"></span>
    </div>
  `;

  instance = new TypeIt("#element");
});

test("Initial queue only contains startDelay pause.", () => {
  expect(instance.instances[0].queue).toMatchSnapshot();
});

test("Returns an object with expected properties.", () => {
  expect(Object.keys(instance).sort()).toEqual(["instances"]);
});

test("Defines hard-coded string correctly.", () => {
  jest.useFakeTimers();

  document.body.innerHTML = `
    <div>
      <span id="element">Hard-coded string.</span>
    </div>
  `;

  let instance = new TypeIt("#element", {
    strings: ["My string."]
  });

  expect(instance.instances[0].opts.strings).toEqual([
    "Hard-coded string.",
    "My string."
  ]);
});

test("Will not begin until explicitly called.", () => {
  jest.useFakeTimers();

  document.body.innerHTML = `<div>'
      <span id="element"></span>
    </div>`;

  const instance = new TypeIt("#element", {
    strings: "hello!"
  });

  jest.runAllTimers();

  expect(instance.is("started")).toBe(false);

  instance.go();

  expect(instance.is("started")).toBe(true);
});

test("Clears out remnants of previous instances correctly.", () => {
  jest.useFakeTimers();

  document.body.innerHTML = `
    <div>
      <span id="element">
        <span style="display:inline;position:relative;font:inherit;color:inherit;" class="ti-wrapper">Previous string.</span>
      </span>
    </div>
  `;

  let instance = new TypeIt("#element", {
    strings: "My string."
  });

  expect(
    !instance.instances[0].opts.strings[0].includes("ti-container")
  ).toEqual(true);
});

test("Typing doesn't end with a break tag.", () => {
  jest.useFakeTimers();

  document.body.innerHTML = `<div>'
    <span id="element"></span>
  </div>`;

  const instance = new TypeIt("#element", {
    strings: ["One string.", "Two string", "Three string."]
  }).go();

  jest.runAllTimers();

  expect(instance.instances[0].$eContainer.innerHTML.endsWith("<br>")).not.toBe(
    true
  );
});

describe("reset()", () => {
  test("Successfully resets when called.", () => {
    jest.useFakeTimers();

    document.body.innerHTML = `<div>'
        <span id="element"></span>
      </div>`;

    const instance = new TypeIt("#element", {
      strings: "This is my string!"
    }).go();

    jest.runAllTimers();

    instance.destroy();

    expect(instance.is("destroyed")).toBe(true);

    instance.reset();

    //-- Ensure the arguments that define these properties were passed.
    expect(instance.instances[0].$e).not.toBe(undefined);
    expect(instance.instances[0].id).not.toBe(undefined);
    expect(instance.instances[0].opts).not.toBe(undefined);
    expect(instance.instances[0].typeit).not.toBe(undefined);
    expect(instance.instances).toHaveLength(1);
    expect(instance.is("complete")).toBe(false);
    expect(instance.is("destroyed")).toBe(false);
  });
});

describe("destroy()", () => {
  test("Destroys instances successfully.", () => {
    jest.useFakeTimers();

    document.body.innerHTML = `<div>'
      <span id="element"></span>
    </div>`;

    const instance = new TypeIt("#element", {
      strings: "This is my string!"
    }).go();

    jest.runAllTimers();

    expect(instance.is("destroyed")).toBe(false);

    instance.destroy();

    expect(instance.instances[0].timeouts).toEqual([]);
    expect(document.body.querySelector(".ti-cursor")).toEqual(null);
  });
});

describe("queueUp()", () => {
  test("It should add function name by string w/ correct arguments.", () => {
    instance.queueUp("type", "someArg");
    expect(instance.instances[0].queue.waiting).toMatchSnapshot();
  });

  test("If invalid function name is passed, will save as undefined", () => {
    instance.queueUp("thisDoesNotExist", "someArg");
    expect(instance.instances[0].queue.waiting).toMatchSnapshot();
  });

  test("Correctly enqueues anonymous function.", () => {
    instance.queueUp(function() {
      return true;
    });

    let funcAsString = instance.instances[0].queue.waiting[1][0].toString();
    let argument = instance.instances[0].queue.waiting[1][1];

    expect(funcAsString).toMatchSnapshot();
    expect(argument).toBeInstanceOf(TypeIt);
  });

  test("It duplicates the action a certain number of times per instance, if specified.", () => {
    //-- Add 'type' to queue three times.
    instance.queueUp("type", 1, 3);

    expect(instance.instances[0].queue.waiting).toMatchSnapshot();

    instance.queueUp("delete", 1);

    expect(instance.instances[0].queue.waiting).toMatchSnapshot();
  });
});
