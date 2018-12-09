export default (obj1, obj2) => {
  for (let key in obj2) {
    obj1[key] = obj2[key];
  }

  return obj1;
};
