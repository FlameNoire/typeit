import createNodeString from "../../src/helpers/createNodeString";

test("Creates a given tag by string.", () => {
  let result = createNodeString({
    tag: "SPAN"
  });

  expect(result).toEqual("<span></span>");
});

test("Creates a self-closing tag correctly.", () => {
  let result = createNodeString({
    tag: "BR"
  });

  expect(result).toEqual("<br>");
});
