var fs = require('fs'),
  exec = require('child_process').exec,
  should = require('should');


describe('wrapper', function() {

  var bin = __dirname + '/../bin/wrapper',
    file = __dirname + '/data/coffeeFile.coffee',
    jsFile = __dirname + '/data/coffeeFile.js';

  var cleanup = function() {
    if (fs.existsSync(jsFile))
      fs.unlinkSync(jsFile)
  }

  before(cleanup)
  after(cleanup)


  it('should wrap coffee file with a header', function(done) {
    exec(bin + ' ' + file, function(err, stdout, stderr) {
      if (err) return done(err);

      var result = fs.readFileSync(jsFile, 'utf8');
      result.should.be.exactly(
        "require('independence')(require, module, (function (require, module, exports) {(function() {\n" +
        "  var foo;\n" +
        "\n" +
        "  foo = 'bar';\n" +
        "\n" +
        "}).call(this);\n" +
        "}))"
      )
      done()
    })
  })

})
