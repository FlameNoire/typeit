export default element => {
  [].slice.call(element.childNodes).forEach(node => {
    if (node.classList === undefined) return;

    if (node.classList.contains("ti-wrapper")) {
      element.innerHTML = "";
    }
  });
};
