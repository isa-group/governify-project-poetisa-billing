'use strict';

var utils = require('../../utils/writer.js');
var Default = require('../../service/DefaultService');

module.exports.parse = function parse(req, res, next) {
  var moth = req.swagger.params['moth'].value;
  var agree = req.swagger.params['agree'].value;
  Default.parse(agree, moth)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};