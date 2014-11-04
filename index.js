//TODO: add tests for packaged names
//TODO: cleanup
//TODO: improve code comments

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
  function requireFactory(mode, mocks, requiredModules) {


    function makeModuleUniqueId(requiredPath) {

      // Get the base module name by removing the path
      var baseName = requiredPath.slice(requiredPath.lastIndexOf('/') + 1);

      // build it, remove anything that follows the base name
      var path = _require.resolve(requiredPath);
      var lastIndex = path.lastIndexOf('.');
      if (lastIndex !== -1) path = path.slice(0, lastIndex);

      return path.slice(0, (path+'/').lastIndexOf('/'+baseName+'/') + 1 + baseName.length);
    }


    function getProvidedMock(mockName, moduleUniqueId) {
      var mock = mocks[mockName];

      // A MOCK NAME must match at most one MODULE.
      // ex: mock 'zebra' will match both modules '/home/u/project/database/zebra' and '/home/u/project/models/zebra'

      // Ensure that the same mock name has not been used already for a different module:
      if(mock.uniqueId && mock.uniqueId !== moduleUniqueId)
        throw new Error('Mock name "'+mockName+'" could refer to either '+mock.uniqueId+
            ' or '+moduleUniqueId+', please use a more specific mock name');

      mock.uniqueId = moduleUniqueId;

      // Done
      return mocks[mockName].module;
    }


    // This is the require() function passed to the cloned module
    return function injectedRequire(requiredPath) {

      var moduleUniqueId = makeModuleUniqueId(requiredPath);

      // Check mocks that match the required module
      var matches = [];
      for (m in mocks) if (mocks[m].regExp.test(moduleUniqueId)) matches.push(m);

      switch(matches.length) {

        // No mock provided
        case 0: break;

        // Mock is already available
        case 1: return getProvidedMock(matches[0], moduleUniqueId);

        // A MODULE must be matched by at most ONE MOCK
        // ex: module '/home/user/project/mammal/possum' would be matched by both 'possum' and 'mammal/possum'
        default: throw new Error('Module ' +moduleUniqueId+ ' is matched by multiple mock names: "' +matches.join('", "')+ '"');
      }

      // isolate
      if (mode === 'isolate') return null;

      // prepare to override
      var dependency = _require(requiredPath);

      // override
      if (mode === 'override') return dependency;

      // not wrapped with Independence
      if (typeof dependency.independence !== "function") return dependency;

      // Check for circular dependencies
      if (requiredModules[moduleUniqueId] === 'circular dependency')
        throw new Error('Circular dependency on ' +moduleUniqueId);

      if (requiredModules[moduleUniqueId])
        return requiredModules[moduleUniqueId];

      // Set placeholder to detect circular dependencies
      requiredModules[moduleUniqueId] = 'circular dependency';

      // propagate mocks
      try {
        return requiredModules[moduleUniqueId] = dependency.independence('_recurse', mocks, requiredModules);
      } catch(e) {
        e.message += '\nfrom ' + moduleUniqueId;
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
        requiredModules = arguments[2];
        break;

      case 'isolate':
      case 'override':
      case 'rebuild':
        mocks = {};
        requiredModules = {};

        for (var index = start; index < arguments.length; index++) {
          var arg = arguments[index];
          for (var attribute in arg) mocks[attribute] = {module: arg[attribute]};
        }

        for (var m in mocks)
          mocks[m].regExp = new RegExp('(^|[/])'+m+'$');

        break;

      default:
        throw new Error('Invalid mode: ' + mode);
    }

    // Ensure that all provided mocks have been used
    var clone = makeModule(cloneModule(), requireFactory(mode, mocks, requiredModules));
    if(mode !== '_recurse') for (var m in mocks) if(!mocks[m].uniqueId) throw new Error('Unused mock: '+m);
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
