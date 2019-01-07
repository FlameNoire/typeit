const PLACEHOLDER_PATTERN = "{%}";

/**
 * Replace nodes with string placeholders.
 *
 * @param string string
 */
export function placeholderize(string) {
  let parser = new DOMParser();
  let doc = parser.parseFromString(string, "text/html");
  let nodes = [].slice.call(doc.body.querySelectorAll("*"));

  nodes.forEach(item => {
    let chopped = item.outerHTML.slice(0, -1);
    string = string.replace(
      new RegExp(`${chopped}\/?>`, "i"),
      PLACEHOLDER_PATTERN
    );
  });

  return {
    string,
    nodes
  };
}

export default function(rawString) {
  let { string, nodes } = placeholderize(rawString);
  let stringArray = string.split("");

  //-- Replace placeholders w/ nodes.
  stringArray.forEach((item, index) => {
    //-- Check for a placeholder.
    if (stringArray.slice(index, index + 3).join("") === PLACEHOLDER_PATTERN) {
      //-- Remove placeholder.
      stringArray.splice(index, 3);

      //-- For each character inside this node, insert an object.
      let i = index;
      let node = nodes.shift();
      let nodeContents = node.innerHTML.split("");
      let nodeAttributes = [].slice.call(node.attributes).map(att => {
        return {
          name: att.name,
          value: att.nodeValue
        };
      });

      if (!nodeContents.length) {
        stringArray.splice(i, 0, {
          tag: node.tagName,
          attributes: nodeAttributes,
          content: null
        });
      } else {
        nodeContents.forEach(character => {
          stringArray.splice(i, 0, {
            tag: node.tagName,
            attributes: nodeAttributes,
            content: character,
            isFirstCharacter: i === index
          });

          i++;
        });
      }
    }
  });

  return stringArray;
}
