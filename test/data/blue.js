require('../..')(require, module, function(require, module, exports) {

  var red = require('./red')

  module.exports = function() { return red; }
});
