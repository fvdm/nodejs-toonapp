/*
Name:         toonapp.js
Description:  node.js module to interact with Eneco Toon thermostat
Author:       Franklin van de Meent (https://frankl.in)
Source:       https://github.com/fvdm/nodejs-toonapp
Feedback:     https://github.com/fvdm/nodejs-toonapp/issues
License:      Unlicense (Public Domain) -- see LICENSE file
*/

var https = require('https')
var querystring = require('querystring')
var app = {}
var user = {}
var cache = null

// Get version data
app.version = function( cb ) {
  talk({
    method: 'GET',
    path: '/javascript/version.json',
    query: {
      _: Date.now()
    },
    complete: cb
  })
}

// Set temperature preset
app.setPreset = function( preset, cb ) {
  function run() {
    talk({
      method: 'GET',
      path: '/toonMobileBackendWeb/client/auth/schemeState',
      query: {
        clientId: cache.clientId,
        clientIdChecksum: cache.clientIdChecksum,
        state: 2,
        temperatureState: preset,
        random: guidGenerator(),
        _: Date.now()
      },
      complete: cb
    })
  }

  if( cache ) {
    run()
  } else {
    login( function( err, data ) {
      if( err ) { cb( err ) }
      run()
    })
  }
}

// Set manual temp, value = Celcius * 100, i.e. 1847 = 18.47C = 18.5 display
app.setTemperature = function( value, cb ) {
  function run() {
    talk({
      method: 'GET',
      path: '/toonMobileBackendWeb/client/auth/setPoint',
      query: {
        clientId: cache.clientId,
        clientIdChecksum: cache.clientIdChecksum,
        value: value,
        random: guidGenerator(),
        _: Date.now()
      },
      complete: cb
    })
  }

  if( cache ) {
    run()
  } else {
    login( function( err, data ) {
      if( err ) { cb( err ) }
      run()
    })
  }
}

// Get everything
app.getState = function( cb ) {
  function run() {
    talk({
      method: 'GET',
      path: '/toonMobileBackendWeb/client/auth/retrieveToonState',
      query: {
        clientId: cache.clientId,
        clientIdChecksum: cache.clientIdChecksum,
        random: guidGenerator(),
        _: Date.now()
      },
      complete: cb
    })
  }

  if( cache ) {
    run()
  } else {
    login( function( err, data ) {
      if( err ) { cb( err ) }
      run()
    })
  }
}

// Module
module.exports = function( setup ) {
  user.username = setup.username
  user.password = setup.password
  return app
}

// Communicate
function talk( props ) {
  var complete = false
  function callback( err, res, head ) {
    if( !complete ) {
      complete = true
      props.complete( err, res, head )
    }
  }

  var options = {
    host: 'toonopafstand.eneco.nl',
    path: props.path,
    method: props.method || 'GET',
    headers: props.headers || {}
  }

  options.headers.Referer = 'https://toonopafstand.eneco.nl/index.html'

  var body = null

  if( props.query ) {
    options.path += '?'+ querystring.stringify( props.query )
  }

  if( props.method === 'POST' ) {
    body = querystring.stringify( props.fields )
    options.headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8'
    options.headers['Content-Length'] = body.length
  }

  var request = https.request( options )

  request.on( 'response', function( response ) {
    var data = []
    var size = 0

    response.on( 'close', function() {
      callback( new Error('request dropped') )
    })

    response.on( 'data', function( ch ) {
      data.push( ch )
      size += ch.length
    })

    response.on( 'end', function() {
      var error = null
      data = new Buffer.concat( data, size ).toString().trim()

      try {
        data = JSON.parse( data )
        if( (data.success && data.success === true) || response.statusCode === 200 ) {
          callback( null, data )
          return
        } else {
          error = new Error('api error')
        }
      } catch(e) {
        error = new Error('invalid response')
        error.error = e
      }

      error.data = data
      error.code = response.statusCode
      callback( error, null )
    })
  })

  request.on( 'error', function(e) {
    var err = new Error('request failed')
    err.error = e
    callback( err )
  })

  request.end( body )
}

// Get login session
function login( cb ) {
  talk({
    method: 'POST',
    path: '/toonMobileBackendWeb/client/login',
    fields: {
      username: user.username,
      password: user.password
    },
    headers: {
      Referer: 'https://toonopafstand.eneco.nl/index.html'
    },
    complete: function( err, data ) {
      if( err ) { return cb( err ) }
      cache = data
      start( cb )
    }
  })
}

// Start login session
function start( cb ) {
  talk({
    method: 'GET',
    path: '/toonMobileBackendWeb/client/auth/start',
    query: {
      clientId: cache.clientId,
      clientIdChecksum: cache.clientIdChecksum,
      agreementId: cache.agreements[0].agreementId,
      agreementIdChecksum: cache.agreements[0].agreementIdChecksum,
      random: guidGenerator(),
      _: Date.now()
    },
    complete: cb
  })
}

// Build &random= string
function guidGenerator() {
  var S4 = function() {
    return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
  };
  return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
}
