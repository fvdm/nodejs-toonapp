var dotest = require ('dotest');
var app = require ('./');

var config = {
  username: process.env.TOONAPP_USERNAME,
  password: process.env.TOONAPP_PASSWORD,
  timeout: process.env.TOONAPP_TIMEOUT,
  endpoint: process.env.TOONAPP_ENDPOINT
};

var toon = app (config);


// Tests
dotest.add ('Module', function (test) {
  test ()
    .isFunction ('fail', 'exports', app)
    .isObject ('fail', 'interface', toon)
    .isNotEmpty ('fail', 'interface', toon)
    .isFunction ('fail', '.version', toon && toon.version)
    .isFunction ('fail', '.setPreset', toon && toon.setPreset)
    .isFunction ('fail', '.setTemperature', toon && toon.setTemperature)
    .isFunction ('fail', '.getState', toon && toon.getState)
    .done ();
});


dotest.add ('API access', function (test) {
  if (!config.username || !config.password) {
    config.endpoint = 'https://frankl.in/u/ci_test.php?a=toonapp&b=';
    config.username = 'johndoe';
    config.password = 'janesmith';
    toon = app (config);

    dotest.log ('warn', 'TOONAPP_USERNAME and/or TOONAPP_PASSWORD not set');
    dotest.log ('info', 'Using test endpoint with fake data');
    test () .done ();
  } else {
    dotest.log ('good', 'API credentials are set');
    test () .done ();
  }
});


dotest.add ('Method .version', function (test) {
  toon.version (function (err, data) {
    test (err)
      .isObject ('fail', 'data', data)
      .isString ('warn', 'data.appVersion', data && data.appVersion)
      .done ();
  });
});


dotest.add ('Method .setPreset', function (test) {
  toon.setPreset (1, function (err, data) {
    test (err)
      .isObject ('fail', 'data', data)
      .isExactly ('fail', 'data.success', data && data.success, true)
      .done ();
  });
});


dotest.add ('Method .setTemperature', function (test) {
  toon.setTemperature (1800, function (err, data) {
    test (err)
      .isObject ('fail', 'data', data)
      .isExactly ('fail', 'data.success', data && data.success, true)
      .done ();
  });
});


dotest.add ('Method .getState', function (test) {
  toon.getState (function (err, data) {
    var tState = data && data.thermostatStates;
    var tItem = tState && tState.state && tState.state [0];

    test (err)
      .isObject ('fail', 'data', data)
      .isObject ('fail', 'data.thermostatInfo', data && data.thermostatInfo)
      .isObject ('fail', 'data.thermostatStates', tState)
      .isArray ('fail', 'data.thermostatStates.state', tState && tState.state)
      .isObject ('fail', 'data.thermostatStates.state[0]', tItem)
      .done ();
  });
});


dotest.run ();
