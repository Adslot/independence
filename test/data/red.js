require('../..')(require, module, function(require, module, exports) {

  var green = require('../../test/data/green')

  module.exports = function() { return green; }
});
