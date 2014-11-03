Independence
============
[![NPM version][npm-image]][npm-url] [![Dependency Status][daviddm-url]][daviddm-image]
[![Build Status](https://secure.travis-ci.org/Adslot/independence.png?branch=master)](http://travis-ci.org/Adslot/independence)

Module dependency injection for easy and fast mocking.

Enables a module to quickly create clones of itself that have their dependencies mocked.


When writing the module
-----------------------
Wrap your module in
`"require('independence')(require, module, (function(require, module, exports) {" + yourCode + "}))"`.

```javascript
// monkey.js

require('independence')(require, module, function(require, module, exports){

  var moment = require('moment');
  var _ = require('lodash');
  var myService = require('../common/lib/services/myService');
  var myDatabase = require('../common/lib/myDatabase');

  exports.fling = function() {
    console.log('fling', moment().format 'YYYY-MM-DD');
  };

  exports.swing = function() {
    console.log('swing', _.find([1, 2, 3, 5, 7], (n) -> n % 2 is 0));
  };
});
```

With [CoffeeScript](http://coffeescript.org/), you can `require()` the provided
[coffee-wrap](bin/coffee-wrap) to automatically wrap all your `.coffee` modules
when transpiling them to JavaScript.


When using the module
---------------------
This works as normal:
```javascript
// someModule.js

var monkey = require('./monkey');

monkey.fling(); // Will output `fling 2014-05-23`
monkey.swing(); // Will output `swing 2`
```


When testing the module
-----------------------
```javascript
// tests/monkey.js

var monkey = require('./monkey');

function momentMock() {
  return {
    format: function() {
      return "Yaaap!";
    }
  };
}


// Provide only moment and leave all other dependencies undefined:
var pureMonkey = monkey.independence('isolate', {moment: momentMock});

pureMonkey.fling() // Outputs `fling Yaaap!`
pureMonkey.swing() // Fails because `_` is undefined


// Override moment, but leave all other dependencies nominal:
var testMonkey = monkey.independence('override', {moment: momentMock});

testMonkey.fling() // Outputs `fling Yaaap!`
testMonkey.swing() // Works as normal


// Override moment in the monkey module and in ALL its wrapped dependencies
// recursively (in this case, myService and myDatabase):
var testMonkey = monkey.independence('rebuild', {moment: momentMock});
```


But what if two modules have the same name?
---------------------------------------
```javascript
// controller.js
var userModel = require('../lib/models/user');
var userController = require('./user');

...
```

```javascript
// tests/controller.js
var controller = require('../controllers/controller');

var testController = controller.independence('isolate', {
    'models/user': userModelMock,
    'controllers/user': userControllerMock
  });

...
```


Other stuff you can do
----------------------

Chain dependency objects:
```javascript
var commonDependencies = {
  lodash: require('lodash'),
  myDatabase: {log: function(){}},
  myService: function(){ return 'serviced';}
};

var testMonkey = monkey.independence('isolate', commonDependencies, {
  moment: function(){ return {format: function(){ return 'Yip!';}};}
};
```


Clone & monkey-patch:
```javascript
var database = require('database');

var databaseTest = database.independence('override');
databaseTest.getBananas = function(callback) {
  callback(null, ['banana1', 'banana2']);
};
```


Coffee & Mocha
--------------

If you're using [CoffeeScript](http://coffeescript.org/) and
[Mocha](http://mochajs.org/) you can use [bin/coffee-wrap](bin/coffee-wrap) to
compiles and wraps `.coffee` modules with the Independence header:

`mocha --compilers coffee:independence/bin/coffee-wrap`

[npm-url]: https://npmjs.org/package/independence
[npm-image]: https://badge.fury.io/js/independence.svg
[daviddm-url]: https://david-dm.org/adslot/independence.svg?theme=shields.io
[daviddm-image]: https://david-dm.org/adslot/independence
