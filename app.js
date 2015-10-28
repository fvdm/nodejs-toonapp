/*
Name:         toonapp.js
Description:  Node.js module to interact with Eneco Toon thermostat
Author:       Franklin van de Meent (https://frankl.in)
Source:       https://github.com/fvdm/nodejs-toonapp
Feedback:     https://github.com/fvdm/nodejs-toonapp/issues
License:      Unlicense (Public Domain) - see LICENSE file
*/

var http = require ('httpreq');
var app = {};
var user = {};
var cache = null;


// Communicate
// 1. Check clientId
// 2. No clientId -> start () (-> login ())
// 3a. on success -> talk ()
// 3b. on error -> log
function talk (props) {
  var options = {
    method: props.method || 'GET',
    url: 'https://toonopafstand.eneco.nl'+ props.path,
    parameters: props.query || {},
    headers: props.headers || {}
  };

  function callback (err, res) {
    if (typeof props.complete === 'function') {
      props.complete (err, res);
    }
  }

  if (!cache && !props.noLogin) {
    sessionStart (function (err, res) {
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

  if (cache) {
    options.parameters.clientId = cache.clientId;
    options.parameters.clientIdChecksum = cache.clientIdChecksum;
  }

  http.doRequest (options, function (err, res) {
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
  });
}


// Build &random= string
function guidGenerator () {
  var S4 = function () {
    return parseInt (((Math.random () + 1) * 0x10000)) .toString (16) .substring (1);
  };
  return (S4() + S4() + '-' + S4() + '-' + S4() + '-' + S4() + '-' + S4() + S4() + S4());
}


// Get login session
// Trades username/password for clientId
function sessionLogin (callback) {
  talk ({
    method: 'POST',
    path: '/toonMobileBackendWeb/client/login',
    noLogin: true,
    query: {
      username: user.username,
      password: user.password
    },
    headers: {
      Referer: 'https://toonopafstand.eneco.nl/index.html'
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


// Start remote session
// max 4 simultaneous sessions per account!
// i.e. app + nodejs = 2
function sessionStart (callback) {
  if (!cache) {
    sessionLogin (function (err, res) {
      if (err) {
        callback && callback (err);
        return;
      }

      sessionStart (callback);
    });
    return;
  }

  talk ({
    method: 'GET',
    path: '/toonMobileBackendWeb/client/auth/start',
    noLogin: true,
    query: {
      clientId: cache.clientId,
      clientIdChecksum: cache.clientIdChecksum,
      agreementId: cache.agreements [0] .agreementId,
      agreementIdChecksum: cache.agreements [0] .agreementIdChecksum,
      random: guidGenerator ()
    },
    complete: callback
  });
}


// Get version data
app.version = function (cb) {
  talk ({
    path: '/javascript/version.json',
    noLogin: true,
    complete: cb
  });
};

// Set temperature preset
app.setPreset = function (preset, cb) {
  talk ({
    path: '/toonMobileBackendWeb/client/auth/schemeState',
    query: {
      state: 2,
      temperatureState: preset,
      random: guidGenerator ()
    },
    complete: cb
  });
};

// Set manual temp, value = Celcius * 100
// i.e. 1847 = 18.47C = 18.5 display
app.setTemperature = function (value, cb) {
  talk ({
    path: '/toonMobileBackendWeb/client/auth/setPoint',
    query: {
      value: value,
      random: guidGenerator ()
    },
    complete: cb
  });
};

// Get everything
app.getState = function (cb) {
  talk ({
    path: '/toonMobileBackendWeb/client/auth/retrieveToonState',
    query: {
      random: guidGenerator ()
    },
    complete: cb
  });
};


// Module
module.exports = function (setup) {
  user.username = setup.username;
  user.password = setup.password;
  return app;
};
