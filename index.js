
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

    // It's important that the added methods are non-enumerable
    Object.defineProperty(_exports, name, {
      enumerable: false,
      configurable: true,
      value: function() { return makeModule(cloneModule(), independence.requireFactory(arguments, _require, name)) }
    });
  }

  defineMethod('isolate');
  defineMethod('override');
  defineMethod('rebuild');

  return _exports
}


independence.requireFactory = function(mockArguments, _require, mode) {
  var mocks = {}
  for (var index = 0; index < mockArguments.length; index++) {
    var arg = mockArguments[index]
    for (var attribute in arg) mocks[attribute] = arg[attribute]
  }

  return injectedRequire = function(dependencyPath, options) {

    var name = (options && options.alias) || dependencyPath.split('/').pop().split('.')[0];
    if (mocks[name]) return mocks[name];

/*
    // mock name is the absolute path without the extension
    var name = _require.resolve(dependencyPath).replace(/\.[^.]+$/, '').replace(/\/index$/, '')
    var matches = Object.keys(mocks).filter(function(mockName){return new RegExp('[^a-zA-Z]'+mockName+'$').test(name)})
    //console.log('switch', name)
    switch(matches.length) {

      // Mock needs to be added
      case 0: break;

      // Mock is already available
      case 1: return mocks[matches[0]];

      // A mock name is not specific enough
      default: throw new Error('Independence: "' +name+ 'matches multiple names: "' +matches.join('", "')+ '".');
    }
*/

    // isolate
    if (mode === 'isolate') return

    // prepare to override
    var dependency = _require(dependencyPath)

    // override
    if (mode === 'override') return dependency

    // not wrapped with independence
    if (typeof dependency.isolate !== "function" || typeof dependency.rebuild !== "function") return dependency

    // this is used to detect circular references
    placeholder = {}
    Object.defineProperty(placeholder, 'rebuild', {enumerable: false, value: function() {
      throw new Error('Circular dependency detected for mock "'+name+'"')
    }})

    // propagate mocks
    mocks[name] = placeholder
    var mock = mocks[name] = dependency.rebuild(mocks);
    return mock
  }
}
