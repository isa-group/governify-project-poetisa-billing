/*!
governify-service-sabius-data-publications 1.0.0, built on: 2018-04-27
Copyright (C) 2018 ISA group
http://www.isa.us.es/
https://github.com/isa-group/governify-service-sabius-data-publications

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

"use strict";

/*
 * Put here your dependencies
 */

const http = require('http'); // Use http if your app will be behind a proxy.
const https = require('https'); // Use https if your app will not be behind a proxy.
const bodyParser = require('body-parser');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const fs = require('fs');
const path = require('path');
const jsyaml = require('js-yaml');
const swaggerTools = require('swagger-tools');

//Self dependencies
const config = require('./configurations');
const logger = require('./logger');
const swaggerUtils = require('./utils/swagger');

let server = null;
const app = express();

const frontendPath = path.join(__dirname, '../frontend');
const serverPort = process.env.PORT || config.server.port;
const CURRENT_API_VERSION = 'v1';

app.use(express.static(frontendPath));

// Default server options

app.use(compression());

logger.info("Using '%s' as HTTP body size", config.server.bodySize);
app.use(
  bodyParser.urlencoded({
    limit: config.server.bodySize,
    extended: 'true'
  })
);

app.use(
  bodyParser.json({
    limit: config.server.bodySize,
    type: 'application/json'
  })
);

// Configurable server options

if (config.server.bypassCORS) {
  logger.info("Adding 'Access-Control-Allow-Origin: *' header to every path.");
  app.use(cors());
}

if (config.server.useHelmet) {
  logger.info('Adding Helmet related headers.');
  app.use(helmet());
}

if (config.server.httpOptionsOK) {
  app.options('/*', function (req, res) {
    logger.info('Bypassing 405 status put by swagger when no request handler is defined');
    return res.sendStatus(200);
  });
}

if (config.server.servePackageInfo) {
  app.use('/api/info', function (req, res) {
    logger.debug("Serving package.json at '%s'", '/api/info');
    res.json(require('./../../package.json'));
  });
}

// latest documentation redirection
app.use('/api/latest/docs', function (req, res) {
  res.redirect('/api/' + CURRENT_API_VERSION + '/docs');
});

module.exports = {
  deploy: _deploy,
  undeploy: _undeploy
};

/**
 * statesAgreementGET.
 * @param {Object} configurations configuration object
 * @param {function} callback callback function
 * @alias module:app.deploy
 * */
function _deploy(configurations, callback) {
  if (configurations && configurations.loggerLevel) {
    logger.transports.console.level = configurations.loggerLevel;
  }
  logger.info('Trying to deploy server');
  if (configurations) {
    logger.info('Reading configuration...');
    for (var c in configurations) {
      var prop = configurations[c];
      logger.info('Setting property' + c + ' with value ' + prop);
      config.setProperty(c, prop);
    }
  }
  //list of swagger documents, one for each version of the api.
  var swaggerDocs = [swaggerUtils.getSwaggerDoc(1)];
  //fromize swagger middleware for each swagger documents.
  swaggerUtils.initializeMiddleware(app, swaggerDocs, function () {
    if (config.server.listenOnHttps) {
      https
        .createServer({
            key: fs.readFileSync('certs/privkey.pem'),
            cert: fs.readFileSync('certs/cert.pem')
          },
          app
        )
        .listen(serverPort, function () {
          logger.info('HTTPS_SERVER mode');
          logger.info('Your server is listening on port %d (https://localhost:%d)', serverPort, serverPort);
          logger.info('Swagger-ui is available on https://localhost:%d/api/%s/docs', serverPort, CURRENT_API_VERSION);
        });
    } else {
      http.createServer(app).listen(serverPort, function () {
        logger.info('Your server is listening on port %d (http://localhost:%d)', serverPort, serverPort);
        logger.info('Swagger-ui is available on http://localhost:%d/api/%s/docs', serverPort, CURRENT_API_VERSION);
        if (callback) {
          callback(server);
        }
      });
    }
  });
}

/**
 * _undeploy.
 * @param {function} callback callback function
 * @alias module:app.undeploy
 * */
function _undeploy(callback) {
  server.close(function () {
    logger.info('Server has been closed');
    callback();
  });
}