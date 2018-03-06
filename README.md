:no_entry: **Note: This module is deprecated and no longer supported.**

Independence
============
[![NPM version][npm-image]][npm-url] [![Dependency Status][daviddm-url]][daviddm-image]
[![Build Status](https://secure.travis-ci.org/Adslot/independence.png?branch=master)](http://travis-ci.org/Adslot/independence)

Node.js module dependency injection for easy and fast mocking.

Enables a module to quickly create clones of itself that have their dependencies mocked.

*Independence* works with plain JavaScript, but the examples are given in
[CoffeeScript](http://coffeescript.org/) for readability.


When writing the module
-----------------------
Your module's code needs to be wrapped with Independence:

```coffeescript
# monkey.coffee

require('independence') require, module, (require, module, exports) ->

  _ = require 'lodash'
  moment = require 'moment'
  myDatabase = require '../common/lib/myDatabase'

  # Output 'fling' and the formatted current date
  exports.flingTime = -> console.log 'fling', moment().format 'YYYY-MM-DD'

  # Output 'Yiiip!' and the database list of mammals
  exports.yellMammals = -> console.log 'Yiiip!', myDatabase.availableMammals

  # Same as above, bug removes duplicates
  exports.yellMammalsUnique = -> console.log 'Yaaap!', _.unique myDatabase.availableMammals
```

But if you are using CoffeeScript, this can be avoided by `require`ing the
[coffee-wrap](bin/coffee-wrap) script, which will automatically add the wrapper
when transpiling to JavaScript.

With [Mocha](http://mochajs.org/):
```bash
mocha --compilers coffee:independence/bin/coffee-wrap
```


When using the module
---------------------
This works normally:
```coffeescript
# someModule.coffee

monkey = require './monkey'

monkey.flingTime()         # Outputs `fling 2014-05-23`
monkey.yellMammals()       # Outputs `Yiiip! ['monkeys', 'hyenas', 'monkeys']`
monkey.yellMammalsUnique() # Outputs `Yaaap! ['monkeys', 'hyenas']`
```


When testing the module
-----------------------
```coffeescript
# tests/monkey.coffee

monkey = require '../lib/monkey'


# Mock the `moment` and `myDatabase` modules, but leave the original `lodash`
mocks =

  moment: ->
    return format: (fmt) ->
      return 'Yp yp!'

  myDatabase:
    availableMammals: ['squirrels', 'squirrels']


# Create a test clone of the `monkey` module that uses a mock of the `moment` module:
# ('override' is the default mode, so you can really omit it)
testMonkeyClone = monkey.independence 'override', mocks

testMonkeyClone.flingTime()         # Outputs "fling Yp yp!"
testMonkeyClone.yellMammals()       # Outputs "Yiiip! ['squirrels', 'squirrels']"
testMonkeyClone.yellMammalsUnique() # Outputs "Yaaap! ['squirrels']"
```

By default, Independence overrides only modules directly required by the cloned module.
This means that if in the above example the `myDatabase` or `myService` modules require
`moment` they will still get the original one rather than the mock.


Recursive dependencies
----------------------
To recursively inject mocks from a module down to all its nested dependencies you can specify
`'rebuild'` as first argument:
```coffeescript
# The `monkey` module depends on the `myDatabase` module: if in turn it requires
# the `moment` module, it will also be provided with the `moment` mock.
deepMonkeyClone = monkey.independence 'rebuild', mocks
```

Independence will traverse recursively only on those dependencies that are themselves
wrapped with Independence, which means that for third-party libraries the original
modules will always be provided.

This is especially useful with functional or integration testing.


Isolating a module
------------------
To guarantee that the code being tested does not inadvertently call anything outside of
the test scope Independence can create a clone where all dependencies that are not
explicitly mocked are replaced with an empty Object:

```coffeescript
# Provide only the `moment` module and replace all other dependencies with {}

pureMonkeyClone = monkey.independence 'isolate', mocks

# Will throw `TypeError: Object #<Object> has no method 'unique'` because
# `require 'lodash'` returns an empty Object:
pureMonkeyClone.yellMammalsUnique()
```


But what if two modules have the same name?
-------------------------------------------
```coffeescript
# controller.coffee

userModel = require '../lib/models/user'
userController = require './user'

…
```

```coffeescript
# tests/controller.coffee
controller = require '../controllers/controller'

…

controllerClone = controller.independence 'isolate',
  'models/user': userModelMock
  'controllers/user': userControllerMock

…
```

Internally, Independence uses a module's `require.resolve()` method to get the unique absolute
path of each dependency, and it will throw an error if a mock name can refer to more than one.


Patterns and Tricks
-------------------


### Clone locally ###
Creating clones is inexpensive: clones can be created for each test case without
significantly affecting test duration:

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

Still, remember that using `'rebuild'` to clone your whole app may require
cloning hundreds of modules.


### Combine Mocks ###
Independence accepts multiple mock objects as arguments, merging them together (the
next overrides the previous).

```coffeescript
sinon = require 'sinon'
patient = require 'a/COMPLEX/module/of/mine'


describe 'a/COMPLEX/module/of/mine', ->

  baseMocks =
    'utils/veryUtil': …
    'shared/happiness': …
    'tables/bananas': …
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


  describe 'blendBanana()', ->

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
    'utils/veryUtil': …
    'shared/happiness': …
    'integration/fruit':
      connect: (fruit, cb) -> cb null, connection: 'up'
      query: fruitApiResponse ? (args..., cb) -> cb null, []


  describe 'eatFruitDessert()', ->

    it 'should handle the fruit response', (done) ->
      clone = patient.independence baseMockFruitQuery (args..., cb) -> cb null, [fruit: 'banana']
      clone.eatDessert done

    it 'should handle fruit errors', (done) ->
      clone = patient.independence baseMockFruitQuery (args..., cb) -> cb new Error 'moldy'
      clone.eatDessert (err) ->
        expect(err).to.match /fruit is moldy/
        done()
```


[npm-url]: https://npmjs.org/package/independence
[npm-image]: https://badge.fury.io/js/independence.svg
[daviddm-url]: https://david-dm.org/adslot/independence.svg?theme=shields.io
[daviddm-image]: https://david-dm.org/adslot/independence
