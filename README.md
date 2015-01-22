toonapp
=======

Unofficial node.js module to interact with Eneco Toon thermostat.

_Notice: this is not using the new official API, but instead the same endpoints as the iPhone app._


Example
-------

```js
var toon = require('toonapp')('your@email.tld', 'password')

// Set preset to Home
toon.setPreset( 1, function( err, data ) {
  if( err ) { return console.log(err) }
  // OK, now get full status
  toon.getState( console.log )
})
```


Installation
------------

`npm install toonapp`


Callback function
-----------------

Each method requires a `callback` function to process the response data.
This function receives two arguments: `err` and `data`.

* When something goes wrong `err` is an _Error_ and `data` is _null_.
* When all is good `err` is _null_ and `data` is the parsed response.

```js
function callback( err, data ) {
  if( err ) {
    console.log( err )
  } else {
    // process data
  }
}
```
 

Errors
------

message          | description
-----------------|---------------------------------------------------------
api error        | The API returned an error, see `err.code` and `err.data`
invalid response | The API response was bad, see `err.code` and `err.data`
request failed   | The request can not be made
request dropped  | The request was closed too soon


version ( callback )
-------

Get base version info.

param    | type     | required | description
---------|----------|----------|-----------------------
callback | function | yes      | Your callback function

```js
toon.version( console.log )
```

```js
{ hostUrl: 'https://toonopafstand.eneco.nl',
  appVersion: '1.5',
  minDisplayVersion: 'qb2/ene/2.2.0' }
```

setPreset ( preset, callback )
---------

Set Toon temperature to a preset.

param    | type     | required | description
---------|----------|----------|-----------------------
preset   | numeric  | yes      | Preset ID
callback | function | yes      | Your callback function

```js
toon.setPreset( 2, callback )
```

#### Presets

ID | label    | additional
---|----------|------------------
0  | Comfort  | See `getState() .thermostatStates`
1  | Thuis    | ""
2  | Slapen   | ""
3  | Weg      | ""
4  | Vacation | Disables schedule
5  | -        | unknown


setTemperature ( value, callback )
--------------

Set manual temperature, overriding scheduled preset until next program starts.

param    | type     | required | description
---------|----------|----------|-------------------------------------------
value    | numeric  | yes      | Celcius * 100, i.e. set `1845` for 18.45 C
callback | function | yes      | Your callback function

```js
// 19.48 C, displayed as 19.5 on Toon
toon.setTemperature( 1948, callback )
```


getState ( callback )
--------

Get current status information, statistics, readings, etc.

param    | type     | required | description
---------|----------|----------|-----------------------
callback | function | yes      | Your callback function

```js
toon.getState( function( err, data ) {
  if( err ) { return console.log( err ) }
  // Current Watt/h from smart meter
  if( data.powerUsage ) {
    console.log( data.powerUsage.value )
  }
})
```

#### Short example

Sometimes you get only a short response like below.
Most times the list is huge.

```js
{ success: true,
  thermostatInfo: 
   { currentTemp: 2010,
     currentSetpoint: 2050,
     currentDisplayTemp: 2050,
     programState: 2,
     activeState: 0,
     nextProgram: 1,
     nextState: 3,
     nextTime: 1421940600,
     nextSetpoint: 1600,
     randomConfigId: 1804289383,
     errorFound: 255,
     zwaveOthermConnected: 0,
     burnerInfo: '1',
     otCommError: '0',
     currentModulationLevel: 7,
     haveOTBoiler: 1 },
  thermostatStates: 
   { state: 
      [ { id: 0, tempValue: 2050, dhw: 1 },
        { id: 1, tempValue: 1950, dhw: 1 },
        { id: 2, tempValue: 1700, dhw: 1 },
        { id: 3, tempValue: 1600, dhw: 1 },
        { id: 4, tempValue: 600, dhw: 0 },
        { id: 5, tempValue: 600, dhw: 1 } ] } }
```


Unlicense
---------

This is free and unencumbered software released into the public domain.

Anyone is free to copy, modify, publish, use, compile, sell, or
distribute this software, either in source code form or as a compiled
binary, for any purpose, commercial or non-commercial, and by any
means.

In jurisdictions that recognize copyright laws, the author or authors
of this software dedicate any and all copyright interest in the
software to the public domain. We make this dedication for the benefit
of the public at large and to the detriment of our heirs and
successors. We intend this dedication to be an overt act of
relinquishment in perpetuity of all present and future rights to this
software under copyright law.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR
OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.

For more information, please refer to <http://unlicense.org>


Author
------

Franklin van de Meent
| [Website](https://frankl.in)
| [Github](https://github.com/fvdm)
