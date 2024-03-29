/*!
governify-project-poetisa-metrics 1.1.1, built on: 2018-05-21
Copyright (C) 2018 ISA group
http://www.isa.us.es/
https://github.com/isa-group/governify-project-poetisa-metrics

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>. */

'use strict';

/**
 * Module dependencies.
 * */

const winston = require('winston');
const config = require('../configurations');

/**
 * Configure here your custom levels.
 * */
const customLevels = {
  levels: {
    error: 7,
    warning: 8,
    info: 11,
    test: 12,
    debug: 13
  },
  colors: {
    error: 'red',
    warning: 'yellow',
    info: 'white',
    test: 'magenta',
    debug: 'black'
  }
};

winston.emitErrs = true;
const logger = new winston.Logger({
  levels: customLevels.levels,
  colors: customLevels.colors,
  transports: [
    new winston.transports.File({
      createTree: false,
      level: config.log.level,
      filename: config.log.file,
      handleExceptions: true,
      json: false,
      tailable: true,
      maxsize: config.log.maxSize,
      maxFiles: config.log.maxFiles
    }),
    new winston.transports.Console({
      level: config.loglevel,
      handleExceptions: true,
      json: false,
      colorize: true,
      timestamp: true
    })
  ],
  exitOnError: false
});

/*
 * Export functions and Objects
 */
module.exports = logger;