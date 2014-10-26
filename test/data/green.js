require('../..')(require, module, function(require, module, exports) {

  var blue = require('../data/blue')

  module.exports = function() { return blue; }
});
