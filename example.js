// Set your Eneco account details
var toon = require ('toonapp') ({
  username: 'your@email.tld',
  password: 'account password'
});

// Set preset to Home
toon.setPreset (1, function (err, data) {
  if (err) {
    console.log (err);
    return;
  }

  // OK, now get full status
  toon.getState (console.log);
});

