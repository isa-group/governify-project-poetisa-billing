'use strict';

var utils = require('../../utils/writer.js');
var Default = require('../../service/DefaultService');

module.exports.parse = function parse(req, res, next) {
  var date = req.swagger.params['date'].value;
  var agree = req.swagger.params['agree'].value;
  Default.parse(agree, date)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};