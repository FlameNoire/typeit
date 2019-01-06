import noderize, { placeholderize } from "../../src/helpers/noderize";

test("Parses normal string correctly.", () => {
  let result = noderize("Hello, this is my string.");

  expect(result).toMatchSnapshot();
});

test("Parses single HTML tag.", () => {
  let result = noderize("Hello, this is some <strong>bold</strong> text.");

  expect(result).toMatchSnapshot();
});

test("Parses multiple HTML tags.", () => {
  let result = noderize(
    "Hello, this is some <strong>bold</strong> text, and some <i>italicized</i> text."
  );

  expect(result).toMatchSnapshot();
});

test("Parses HTML tag at beginning of string.", () => {
  let result = noderize(
    "<strong>Hello!</strong> This is some text with HTML at the beginning."
  );

  expect(result).toMatchSnapshot();
});

test("Parses HTML tag at end of string.", () => {
  let result = noderize(
    "This is some text with HTML at the <em>beginning.</em>"
  );

  expect(result).toMatchSnapshot();
});

test("Parses HTML tag with attributes.", () => {
  let result = noderize(
    'This string has an <strong class="strong-class" id="strong-id" data-whatever="data-att">element</strong> with attributes.'
  );

  expect(result).toMatchSnapshot();
});

describe("placeholderize()", () => {
  test("Sets placeholder for single regular HTML tag.", () => {
    let result = placeholderize(
      "This is a string with some <strong>bold text</strong>."
    );

    expect(result).toMatchSnapshot();
  });

  test("Sets placeholder for a self-closing tag.", () => {
    let result = placeholderize("This is a string with a <br/> break in it.");

    expect(result).toMatchSnapshot();
  });

  test("Sets placeholder for a self-closing tag with no closing slash.", () => {
    let result = placeholderize("This is a string with a <br> break in it.");

    expect(result).toMatchSnapshot();
  });

  test("Sets placeholder for strings with both standard tags and self-closing.", () => {
    let result = placeholderize(
      "This is a string with a <br> break in it, as well as some <em>italized</em> text."
    );

    expect(result).toMatchSnapshot();
  });
});
