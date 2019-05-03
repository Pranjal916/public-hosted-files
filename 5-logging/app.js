'use strict';

// [START debug]
// Activate Google Cloud Trace and Debug when in production
if (process.env.NODE_ENV === 'production') {
  require('@google-cloud/trace-agent').start();
  require('@google-cloud/debug-agent').start();
}
// [END debug]

const path = require('path');
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const config = require('./config');
const logging = require('./lib/logging');
const {Datastore} = require('@google-cloud/datastore');
const DatastoreStore = require('@google-cloud/connect-datastore')(session);

const app = express();

app.disable('etag');
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.set('trust proxy', true);

app.use(logging.requestLogger);
// [END requests]

// Configure the session and session storage.
const sessionConfig = {
  resave: false,
  saveUninitialized: false,
  secret: config.get('SECRET'),
  signed: true,
  store: new DatastoreStore({
    dataset: new Datastore({kind: 'express-sessions'}),
  }),
};

app.use(session(sessionConfig));

// OAuth2
app.use(passport.initialize());
app.use(passport.session());
app.use(require('./lib/oauth2').router);

// Books
app.use('/items', require('./items/crud'));
app.use('/api/items', require('./items/api'));

// Redirect root to /books
app.get('/', (req, res) => {
  res.redirect('/items');
});

app.use(logging.errorLogger);

// Basic 404 handler
app.use((req, res) => {
  res.status(404).send('Not Found');
});

// Basic error handler
app.use((err, req, res) => {
  res.status(500).send(err.response || 'Something broke!');
});
// [END errors]

if (module === require.main) {
  // Start the server
  const server = app.listen(config.get('PORT'), () => {
    const port = server.address().port;
    console.log(`App listening on port ${port}`);
  });
}

module.exports = app;
