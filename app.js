/*
Name:         toonapp.js
Description:  Node.js module to interact with Eneco Toon thermostat
Author:       Franklin van de Meent (https://frankl.in)
Source:       https://github.com/fvdm/nodejs-toonapp
Feedback:     https://github.com/fvdm/nodejs-toonapp/issues
License:      Unlicense (Public Domain) - see LICENSE file
*/

var http = require ('httpreq');
var sessionStart;
var cache = {};

var config = {
  username: null,
  password: null,
  timeout: 5000,
  endpoint: 'https://toonopafstand.eneco.nl'
};


/**
 * Build &random= string
 *
 * @returns {string} - GUID hash
 */

function guidGenerator () {
  function S4 (times, prefix) {
    var str = '';
    var i = times || 1;

    for (i; i > 0; i--) {
      str += String (prefix);
      str += parseInt (((Math.random () + 1) * 0x10000), 10)
        .toString (16)
        .substring (1);
    }

    return str;
  }

  return (S4 (2) + S4 (4, '-') + S4 (2));
}


function haveCache () {
  return Object.keys (cache).length;
}


/**
 * Process response
 *
 * @callback callback
 * @param err {Error, null} - Request error
 * @param res {object} - Response details
 * @param callback {function} - `function (err, data) {}`
 * @returns {void}
 */

function processResponse (err, res, callback) {
  var data = res && res.body || '';
  var error = null;

  if (err) {
    error = new Error ('request failed');
    error.reason = err;
    callback (error);
    return;
  }

  data = data.replace (/<!--.*-->/, '');

  try {
    data = JSON.parse (data);
  } catch (e) {
    error = new Error ('invalid response');
    error.reason = e;
    error.data = data;
    error.code = res.statusCode;
    callback (error);
    return;
  }

  if ((data.success && data.success === true) || res.statusCode === 200) {
    callback (null, data);
    return;
  }

  if (data.errorCode || data.reason) {
    error = new Error ('api error');
    error.errorCode = data.errorCode;
    error.reason = data.reason;
  }

  error.data = data;
  error.code = res && res.statusCode;
  callback (error);
}


/**
 * Communicate with device
 *
 * 1. Check clientId
 * 2. No clientId -> start () (-> login ())
 * 3a. on success -> talk ()
 * 3b. on error -> log
 *
 * @callback props.complete
 * @param props {object} - Request options
 * @param [props.method] {string=GET} - HTTP method
 * @param [props.query] {object} - Request parameters
 * @param [props.headers] {object} - Request headers
 * @param [props.complete] {function} - Callback `function (err, data) {}`
 * @param [props.noLogin] {boolean=true} - Skip auto login
 * @Param [props.timeout] {number=5000} - Request timeout in ms
 * @returns {void}
 */

function talk (props) {
  var options = {
    method: props.method || 'GET',
    url: config.endpoint + props.path,
    parameters: props.query || {},
    headers: props.headers || {},
    timeout: props.timeout || config.timeout || 5000
  };

  function callback (err, res) {
    if (typeof props.complete === 'function') {
      props.complete (err, res);
    }
  }

  if (!haveCache () && !props.noLogin) {
    sessionStart (function (err) {
      if (err) {
        callback (err);
        return;
      }

      talk (props);
    });
    return;
  }

  options.parameters._ = Date.now ();
  options.headers.Referer = 'https://toonopafstand.eneco.nl/index.html';

  if (haveCache ()) {
    options.parameters.clientId = cache.clientId;
    options.parameters.clientIdChecksum = cache.clientIdChecksum;
  }

  function httpResponse (err, res) {
    processResponse (err, res, callback);
  }

  http.doRequest (options, httpResponse);
}


/**
 * Get login session
 * Trades username/password for clientId
 *
 * @callback callback
 * @param callback {function} - `function (err, data) {}`
 * @returns {void}
 */

function sessionLogin (callback) {
  talk ({
    method: 'POST',
    path: '/toonMobileBackendWeb/client/login',
    noLogin: true,
    query: {
      username: config.username,
      password: config.password
    },
    complete: function (err, data) {
      if (err) {
        callback && callback (err);
        return;
      }

      cache = data;
      callback && callback (null, data);
    }
  });
}


/**
 * Start remote session
 * max 4 simultaneous sessions per account!
 * i.e. app + nodejs = 2
 *
 * @callback callback
 * @param callback {function} - `function (err, data) {}`
 * @returns {void}
 */

sessionStart = function (callback) {
  var agreement = cache.agreements && cache.agreements [0];

  if (!haveCache ()) {
    sessionLogin (function (err) {
      if (err) {
        callback && callback (err);
        return;
      }

      sessionStart (callback);
    });
    return;
  }

  talk ({
    path: '/toonMobileBackendWeb/client/auth/start',
    noLogin: true,
    query: {
      clientId: cache.clientId,
      clientIdChecksum: cache.clientIdChecksum,
      agreementId: agreement && agreement.agreementId,
      agreementIdChecksum: agreement && agreement.agreementIdChecksum,
      random: guidGenerator ()
    },
    complete: callback
  });
};


/**
 * Get version data
 *
 * @callback cb
 * @param cb {function} - `function (err, data) {}`
 * @returns {void}
 */

function methodVersion (cb) {
  talk ({
    path: '/javascript/version.json',
    noLogin: true,
    complete: cb
  });
}


/**
 * Set temperature preset
 *
 * @callback cb
 * @param preset {number} - Preset ID
 * @param cb {function} - `function (err, data) {}`
 * @returns {void}
 */

function methodSetPreset (preset, cb) {
  talk ({
    path: '/toonMobileBackendWeb/client/auth/schemeState',
    query: {
      state: 2,
      temperatureState: preset,
      random: guidGenerator ()
    },
    complete: cb
  });
}


/**
 * Set manual temp
 * i.e. 1847 = 18.47C = 18.5 display
 *
 * @callback cb
 * @param value {number} - Degrees Celcius * 100
 * @param cb {function} - `function (err, data) {}`
 * @returns {void}
 */

function methodSetTemperature (value, cb) {
  talk ({
    path: '/toonMobileBackendWeb/client/auth/setPoint',
    query: {
      value: value,
      random: guidGenerator ()
    },
    complete: cb
  });
}


/**
 * Get everything
 *
 * @callback cb
 * @param cb {function} - `function (err, data) {}`
 * @returns {void}
 */

function methodGetState (cb) {
  talk ({
    path: '/toonMobileBackendWeb/client/auth/retrieveToonState',
    query: {
      random: guidGenerator ()
    },
    complete: cb
  });
}


/**
 * Module
 *
 * @param setup {object} - Configuration
 * @param setup.username {string} - Eneco account username
 * @param setup.password {string} - Eneco account password
 * @param [setup.timeout = 5000] {number} - Request timeout in ms
 * @param [setup.endpoint] {string} - API endpoint to use
 * @returns app {object}
 */

module.exports = function (setup) {
  config.username = setup.username;
  config.password = setup.password;
  config.timeout = setup.timeout || config.timeout;
  config.endpoint = setup.endpoint || 'https://toonopafstand.eneco.nl';

  return {
    version: methodVersion,
    setPreset: methodSetPreset,
    setTemperature: methodSetTemperature,
    getState: methodGetState
  };
};
