const Instance = ({ element, id, options, typeit = null, queue = [] } = {}) => {
  const ID = id;

  const STATUS = {
    started: false,
    complete: false,
    frozen: false,
    destroyed: false
  };

  const TIMEOUTS = [];
};
