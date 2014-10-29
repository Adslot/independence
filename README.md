Independence
============
[![NPM version][npm-image]][npm-url] [![Dependency Status][daviddm-url]][daviddm-image]
[![Build Status](https://secure.travis-ci.org/Adslot/independence.png?branch=master)](http://travis-ci.org/Adslot/independence)

Module dependency injection for easy and ridiculously *fast* mocking.

Enables a module to quickly create clones of itself that have their dependencies mocked.


When writing the module
-----------------------
Wrap your module in `"require('independence')(require, module, (function(require, module, exports) {" + yourCode + "}))"`.

In CoffeeScript:
```coffee
# monkey.coffee

require('independence') require, module, (require, module, exports) ->

  moment = require 'moment'
  _ = require 'lodash', alias: '_'
  myService = require '../common/lib/services/myService'
  myDatabase = require '../common/lib/myDatabase', alias: 'database'

  exports.fling = ->
    console.log 'fling', moment().format 'YYYY-MM-DD'

  exports.swing = ->
    console.log 'swing', _.find [1, 2, 3, 5, 7], (n) -> n % 2 is 0
```


When using the module
---------------------
This works as normal:
```coffee
monkey = require './monkey'

monkey.fling() # Will output `fling 2014-05-23`
monkey.swing() # Will output `swing 2`
```


When testing the module
-----------------------
```coffee
monkey = require './monkey'

# Override moment, but leave all other dependencies nominal:
testMonkey = monkey.override
  moment: -> format: -> 'Yaaap!'

testMonkey.fling() # Will output `fling Yaaap!`
testMonkey.swing() # Will work as normal


# Provide only moment and leave all other dependencies undefined:
pureMonkey = monkey.isolate
  moment: -> format: -> 'Yip!'

pureMonkey.fling() # Will output `fling Yip!`
pureMonkey.swing() # Will fail because `_` is undefined
```


Other stuff you can do
----------------------

You can chain dependency objects:
```coffee
commonDependencies =
  _: require 'lodash'
  database: log: ->
  myService: -> 'serviced'

pureMonkey = monkey.isolate commonDependencies,
  moment: -> format: -> 'Yip!'
```


You can monkey-patch cleanly and nest <b>in</b>dependencies:
```coffee
database = require 'database'
fruitData = require 'fruitData' # depends on database
smootie = require 'smootie' # depends on fruitData

databaseTest = database.override()
databaseTest.getBananas = (callback) -> callback null, ['banana1', 'banana2']

smootieTest = smootie.override
  fruit: fruitData.override database: databaseTest
```


Using with mocha
----------------------

If you're using *mocha* module for running unit tests you can use a wrapper which compiles and wraps
coffee files with independence header. So that you can seemlessly use DI in your tests.

In package.json:

```
"scripts": {
  "test":  "mocha --compilers coffee:independence/bin/wrapper"
}
```

[npm-url]: https://npmjs.org/package/independence
[npm-image]: https://badge.fury.io/js/independence.svg
[daviddm-url]: https://david-dm.org/adslot/independence.svg?theme=shields.io
[daviddm-image]: https://david-dm.org/adslot/independence
