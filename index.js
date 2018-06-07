'use strict';

const server = require('./src/backend');
const logger = require('./src/backend/logger');
const config = require('./src/backend/configurations');


server.deploy(null, function () {
  logger.info('Deploy successfully done');
});

// quit on ctrl-c when running docker in terminal
process.on('SIGINT', function onSigint() {
  logger.info('Got SIGINT (aka ctrl-c in docker). Graceful shutdown ', new Date().toISOString());
  shutdown();
});

// quit properly on docker stop
process.on('SIGTERM', function onSigterm() {
  logger.info('Got SIGTERM (docker container stop). Graceful shutdown ', new Date().toISOString());
  shutdown();
});

// shut down server
function shutdown() {
  process.exit();
  server.undeploy(function onServerClosed(err) {
    if (err) {
      logger.error(err);
      process.exitCode = 1;
    }
    process.exit();
  });
}