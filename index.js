
var independence = module.exports = function(_require, _module, moduleInjector) {

  function makeModule(injectedModule, injectedRequire) {
    moduleInjector.call(injectedModule.exports, injectedRequire, injectedModule, injectedModule.exports)
    return injectedModule.exports
  }

  _exports = makeModule(_module, _require)

  function cloneModule() {
    var clone = {};
    for (var a in _module) clone[a] = _module[a];
    clone.exports = {};
    return clone
  }

  function defineMethod(name) {

    //TODO if _exports is not a object or function add a normal attribute

    // It's important that the added methods are non-enumerable
    Object.defineProperty(_exports, name, {
      enumerable: false,
      configurable: true,
      value: function() { return makeModule(cloneModule(), independence.requireFactory(arguments, _require, _module, name)) }
    });
  }

  defineMethod('isolate');
  defineMethod('override');
  defineMethod('rebuild');
  defineMethod('recurse');

  return _exports
}


var count = 0
function spaces() { return new Array(count).join('  ');}

independence.requireFactory = function(mockArguments, _require, _module, mode) {

  var mocks = {}
  if (mode === 'recurse')
    mocks = mockArguments[0]
  else
    for (var index = 0; index < mockArguments.length; index++) {
      var arg = mockArguments[index]
      for (var attribute in arg) mocks[attribute] = arg[attribute]
    }

  return injectedRequire = function(dependencyPath, options) {

    // mock name is the absolute path without the extension
    var mockKey = _require.resolve(dependencyPath).replace(/\.[^.]+$/, '').replace(/\/index$/, '')
    var matches = Object.keys(mocks).filter(function(key){return new RegExp('(^|[/])'+key+'$').test(mockKey)})
    switch(matches.length) {

      // Mock needs to be added
      case 0: break;

      // Mock is already available
      case 1:
        var mock = mocks[matches[0]];
        if (mock !== 'circular dependency') return mock;
        throw new Error('Independence: circular dependency on ' +matches[0]);

      // A mock name is not specific enough
      default: throw new Error('Independence: "' +mockKey+ 'matches multiple names: "' +matches.join('", "')+ '".');
    }

    // isolate
    if (mode === 'isolate') return null

    // prepare to override
    var dependency = _require(dependencyPath)

    // override
    if (mode === 'override') return dependency

    // not wrapped with independence
    if (typeof dependency.isolate !== "function" || typeof dependency.rebuild !== "function") return dependency

    // Set placeholder to detect circular dependencies
    mocks[mockKey] = 'circular dependency';

    // propagate mocks
    try {
      //count++;
      //console.log(spaces(), 'start', mockKey);
      //var start = new Date()
      mocks[mockKey] = dependency.recurse(mocks);
      //console.log(spaces(), 'end  ', mockKey, new Date()-start);
      //count--;
      return mocks[mockKey]
    } catch(e) {
      e.message += '\nfrom ' + mockKey
      throw e
    }
  }
}
