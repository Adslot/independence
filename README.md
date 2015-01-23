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
pureMonkey.swing() // Fails because `_` is an empty Object


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


Coffee & Mocha
--------------

If you're using [CoffeeScript](http://coffeescript.org/) and
[Mocha](http://mochajs.org/) you can use [bin/coffee-wrap](bin/coffee-wrap) to
compiles and wraps `.coffee` modules with the Independence header:

`mocha --compilers coffee:independence/bin/coffee-wrap`


Patterns and Tricks
-------------------


### Clone locally ###
_Creating clones is inexpensive_

```coffeescript
patient = require 'a/module/of/mine'

describe 'a/module/of/mine', ->

  describe 'peelBanana()', ->

    it 'should correctly peel bananas', (done) ->
      clone = patient.independence 'tables/bananas': get: (id, cb) -> cb null, {id, banananess: true}
      clone.peelBanana 3, done

    it 'should handle table errors', (done) ->
      clone = patient.independence 'tables/bananas': get: (id, cb) -> cb new Error 'Banana not found'
      clone.peelBanana 3, (err) ->
        expect(err).to.match /not found/
        done()
```



### Combine Mocks ###
_Independence can use multiple mocks_

```coffeescript
patient = require 'a/COMPLEX/module/of/mine'

describe 'a/COMPLEX/module/of/mine', ->

  baseMocks =
    'utils/veryUtil': ...
    'shared/happiness': ...
    'tables/bananas': ...
    'tables/apricots': freeze: (args..., cb) -> cb null, []

  describe 'makeDessert()', ->

    it 'should correctly freeze apricots', (done) ->

      frozen = sinon.spy()
      clone = patient.independence baseMocks,
        'tables/apricots':
          freeze: (id, temperature, cb) ->
            expect(temperature).to.be '-5C'
            frozen()
            cb null, [-4, -5, -5, -5, -5]

      clone.makeDessert (err) ->
        expect(frozen.calledOnce).to.be true
        done()
```



### Throwaway Monkeys ###
_Monkey-patched clones don't need to be restored_

```coffeescript
patient = require 'a/module/of/mine'

describe 'a/module/of/mine', ->

  describe 'peelBanana()', ->

    it 'should correctly blend bananas', (done) ->
      clone = patient.independence()
      clone.peelBanana = (id, cb) -> cb null, {}
      clone.blendBanana 3, done
```



### Mocks as Functions ###
_We can reuse the same mock for different tests_

```coffeescript
patient = require 'ANOTHER/module/of/mine'


describe 'ANOTHER/module/of/mine', ->


  baseMockFruitQuery = (fruitApiResponse) ->
    'utils/veryUtil': ...
    'shared/happiness': ...
    'integration/fruit':
      connect: (fruit, cb) -> cb null, connection: 'up'
      query: fruitApiResponse ? (args..., cb) -> cb null, []


  describe 'syncFruitDessert()', ->

    it 'should handle the fruit response', (done) ->
      clone = patient.independence baseMockFruitQuery (args..., cb) -> cb null, [fruit: 'banana']
      clone.syncDessert done

    it 'should handle fruit errors', (done) ->
      clone = patient.independence baseMockFruitQuery (args..., cb) -> cb new Error 'moldy'
      clone.syncDessert (err) ->
        expect(err).to.match /fruit is moldy/
        done()
```


### Rebuild ###

* It is in beta
* It is slow

A <- B <- C

`A.independence 'C'` means `A.independence 'override', 'C'`: it does nothing

`A.independence 'rebuild', 'C'` instead injects C in ALL nested dependencies originating from A


[npm-url]: https://npmjs.org/package/independence
[npm-image]: https://badge.fury.io/js/independence.svg
[daviddm-url]: https://david-dm.org/adslot/independence.svg?theme=shields.io
[daviddm-image]: https://david-dm.org/adslot/independence
