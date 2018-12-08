import Instance from "../src/Instance.js";

let instance;
let args;

beforeEach(() => {
  document.body.innerHTML = `
    <div>
      <span id="element"></span>
    </div>
  `;

  args = {
    element: document.getElementById("element"),
    id: "arbitrary-id",
    options: {},
    typeit: null,
    queue: []
  };

  instance = new Instance(args);
});

describe("queueDeletions()", () => {
  test("Queues string length when simple string is passed.", () => {
    instance.queueDeletions("hello");
    expect(instance.queue.waiting).toHaveLength(6);
    expect(instance.queue.waiting).toMatchSnapshot();
  });

  test("Queues number when number is passed.", () => {
    instance.queueDeletions(6);
    expect(instance.queue.waiting).toHaveLength(7);
    expect(instance.queue.waiting).toMatchSnapshot();
  });

  test("Queues correct length when HTML is passed.", () => {
    instance.queueDeletions("Some <strong>HTML</strong>.");
    expect(instance.queue.waiting).toHaveLength(11);
    expect(instance.queue.waiting).toMatchSnapshot();
  });

  test("Queues correct length when multiple HTML tags are passed.", () => {
    instance.queueDeletions("Some <strong>HTML</strong>. And <i>more</i>.");
    expect(instance.queue.waiting).toHaveLength(21);
    expect(instance.queue.waiting).toMatchSnapshot();
  });
});

describe("insertSplitPause()", () => {
  test("Inserts split pause around one item.", () => {
    instance = new Instance(
      Object.assign(args, {
        queue: ["a", "b", "c", "d", "e"]
      })
    );

    instance.insertSplitPause(2);

    expect(instance.queue.waiting).toMatchSnapshot();
  });

  test("Inserts split pause around one item.", () => {
    instance = new Instance(
      Object.assign(args, {
        queue: ["a", "b", "c", "d", "e"]
      })
    );

    instance.insertSplitPause(2, 2);

    expect(instance.queue.waiting).toMatchSnapshot();
  });

  test("Inserts split pause around first item.", () => {
    instance = new Instance(
      Object.assign(args, {
        queue: ["a", "b", "c", "d", "e"]
      })
    );

    instance.insertSplitPause(0);

    expect(instance.queue.waiting).toMatchSnapshot();
  });

  test("Inserts split pause around last item.", () => {
    instance = new Instance(
      Object.assign(args, {
        queue: ["a", "b", "c", "d", "e"]
      })
    );

    instance.insertSplitPause(4);

    expect(instance.queue.waiting).toMatchSnapshot();
  });
});
