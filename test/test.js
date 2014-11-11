
var should = require('should');
var fs = require('fs');


describe('independence', function() {

  var deep = require('./data/deep');
  var green = require('./data/green');
  var packs = require('./data/packs');
  var aModule = require('./data/aModule');


  describe('normal require', function() {

    it('should allow to require the module as normal', function() {
      aModule.should.be.type('object');
    });

    it('should provide the original module by default', function() {
      aModule.getFs().should.be.exactly(fs);
    });

    it('should correctly load another module that uses independence', function() {
      aModule.getADep().should.be.exactly('*aDependency*');
    });

    it('should correctly inject the original module', function() {
      (aModule.module === aModule.originalModule).should.be.true;
    });

    it('should not break on modules that export non-objects', function() {
      var string = require('./data/string');
      (function() {
        Object.defineProperty(string, 'independence', {});
      }).should.throw(/called on non-object/);
    });
  });


  describe('rebuild', function() {

    it('should throw on circular dependencies', function() {
      (function(){
        green.independence('rebuild');
      }).should.throw(/circular dependency.+blue\n.+green\n.+red\n.+blue/i);
    });

    it('should allow deep dependency injection', function() {
      var g = green.independence('rebuild', {
        red: function() { return 'lol!'; }
      });
      g()()().should.be.exactly('lol!');
    });
  });


  describe('override', function() {

    it('should provide the overridden module', function() {
      aModule.independence('override', {
        fs: 'xxx'
      }).getFs().should.be.exactly('xxx');
    });

    it('should provide the original module when not overridden', function() {
      aModule.independence('override', {}).getFs().should.be.exactly(fs);
    });

    it('should be the default', function() {
      aModule.independence({}).getFs().should.be.exactly(fs);
    });

    it('should correctly clone the original module', function() {
      var test = aModule.independence('override');
      test.module.id.should.match(/aModule.js$/);
      (test.originalModule === aModule.module).should.be.true;
      (test.module !== aModule.module).should.be.true;
      (test.module.exports !== aModule.module.exports).should.be.true;
    });

  });


  describe('isolate', function() {

    it('should provide the isolated module', function() {
      aModule.independence('isolate', {
        fs: 'yyy'
      }).getFs().should.be.exactly('yyy');
    });

    it('should provide undefined when a module is not provided', function() {
      aModule.independence('isolate', {}).getFs().should.eql({});
    });
  });


  describe('general', function() {

    it('should throw when mode is invalid', function() {
      (function(){
        aModule.independence('overlate');
      }).should.throw(/overlate/);
    });

    for (var mode in {isolate: 1, override: 1, rebuild: 1}) (function(mode) { describe(mode, function() {

      it('should complain if two modules are reached by the same mock name', function() {
        (function() {
          deep.independence(mode, {sblorp: 'moock'});
        }).should.throw(/Mock name "sblorp" could refer to either ".+data\/sblorp" or ".+sub\/sblorp", please use a more specific mock name/);
      });

      it('should complain if two mock names reach the same module', function() {
        (function() {
          deep.independence(mode, {
            'data/sblorp': 'moock',
            'test/data/sblorp': 'moock'
          });
        }).should.throw(/Module ".*test\/data\/sblorp" is matched by multiple mock names: "data\/sblorp", "test\/data\/sblorp"/);
      });

      it('should work with multiple objetcs', function() {
        var obj1 = {
          fs: 'mock to be overridden'
        }
        var obj2 = {
          fs: 'overriding mock'
        }
        aModule.independence(mode, obj1, obj2).getFs().should.be.exactly('overriding mock');
      });

      it('should correctly match packages with unusual internal structure', function() {
        var clone = packs.independence(mode, {knox: 'hello', bcrypt: 'wuut'});
        clone.exportedKnox.should.be.exactly('hello');
        clone.exportedBcrypt.should.be.exactly('wuut');
      });

      it('should guess a relative dependency name', function() {
        aModule.independence(mode, {
          aDependency: 'mockDependency'
        }).getADep().should.be.exactly('mockDependency');
      });

      it('should throw if a mock has not been used', function() {
        (function(){
          aModule.independence(mode, {theUnused: {}});
        }).should.throw(/unused mock: theUnused/i);
      });

    }); })(mode);
  });
});
