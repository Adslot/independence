/*
 * Independence
 * https://github.com/Adslot/independence
 *
 * Copyright 2010-2014 Adslot
 * Released under the MIT license
 */
module.exports = function independenceWrapper(_require, _module, moduleInjector) {


  // Module builder
  function makeModule(injectedModule, injectedRequire) {
    moduleInjector.call(injectedModule.exports, injectedRequire, injectedModule, injectedModule.exports);
    return injectedModule.exports;
  }


  // Helper to create a new blank clone
  function cloneModule() {
    var clone = {};
    for (var a in _module) clone[a] = _module[a];
    clone.exports = {};
    return clone;
  }


  // Builds the require() function to be injected in a clone module
  function requireFactory(mode, mocks, usedMocks) {

    // Keep track of names and paths to find ambiguous mock names
    var mockPathsByName = {};
    var mockRegExpByName = {};

    // Cache name RegExps
    function addMockRegExp(name) {
      mockRegExpByName[name] = new RegExp('(^|[/])'+name+'$');
    }

    for (name in mocks)
      addMockRegExp(name);

    // This is the `require` function passed to the cloned module
    return function injectedRequire(dependencyPath) {

      // Get the base module name by removing the path
      var base = dependencyPath.slice(dependencyPath.lastIndexOf('/') + 1);

      // The path will be used as unique identifier for the mock
      // to build it, remove anything that follows the base name
      var path = _require.resolve(dependencyPath);
      var lastIndex = path.lastIndexOf('.');
      if (lastIndex !== -1) path = path.slice(0, lastIndex);
      path = path.slice(0, (path+'/').lastIndexOf('/'+base+'/') + 1 + base.length);

      // This is o(nn) but it is the only way I can think of to catch multiple matches
      var matches = [];
      for (name in mocks) if (mockRegExpByName[name].test(path)) matches.push(name);

      switch(matches.length) {

        // Mock needs to be added
        case 0: break;

        // Mock is already available
        case 1:
          var name = matches[0];

          // Check for ambiguous mock names
          var p = mockPathsByName[name];
          if(p && p !== path)
            throw new Error('Mock name "'+name+'" could refer to either '+p+' or '+path+', please use a more specific mock name');

          mockPathsByName[name] = path;
          addMockRegExp(name);

          // Flag the mock as used
          usedMocks[name] = true;

          // Check for circular dependencies
          if (mocks[name] === 'circular dependency')
            throw new Error('Circular dependency on ' +name);

          // Done
          return mocks[name];

        // A module's path is matched by more than one mock name
        default: throw new Error('Module ' +path+ ' matches multiple names: "' +matches.join('", "')+ '"');
      }

      // isolate
      if (mode === 'isolate') return null;

      // prepare to override
      var dependency = _require(dependencyPath);

      // override
      if (mode === 'override') return dependency;

      // not wrapped with Independence
      if (typeof dependency.independence !== "function") return dependency;

      // Set placeholder to detect circular dependencies
      mocks[path] = 'circular dependency';

      // Flag the mock as used
      usedMocks[path] = true;

      // propagate mocks
      try {
        mocks[path] = dependency.independence('_recurse', mocks, usedMocks);
        return mocks[path];
      } catch(e) {
        e.message += '\nfrom ' + path;
        throw e;
      }
    }
  }


  // Main function
  function independence() {

    var mode = 'override';
    var start = 0;
    if (typeof arguments[0] === 'string') {
      mode = arguments[0];
      start = 1;
    }

    var mocks, usedMocks;
    switch(mode) {
      case '_recurse':
        mocks = arguments[1];
        usedMocks = arguments[2];
        break;

      case 'isolate':
      case 'override':
      case 'rebuild':
        usedMocks = {}
        mocks = {}

        for (var index = start; index < arguments.length; index++) {
          var arg = arguments[index];
          for (var attribute in arg) mocks[attribute] = arg[attribute];
        }
        break;

      default:
        throw new Error('Invalid mode: ' + mode);
    }

    // Ensure that all provided mocks have been used
    var clone = makeModule(cloneModule(), requireFactory(mode, mocks, usedMocks));
    for (var mock in mocks) if(!usedMocks[mock]) throw new Error('Unused mock: '+mock);
    return clone;
  }


  // Create the actual module with all its depedencies as normal
  var _exports = makeModule(_module, _require);


  // Add the independence command
  try {
    Object.defineProperty(_exports, 'independence', {
      enumerable: false,
      configurable: true,
      value: independence
    });
  } catch(e) {
    console.warn('independence: skipping `%s`: %s', _module.filename, e.message);
  }

  return _exports;
}
