'use strict';

var moment = require('moment');
var request = require('request');

const logger = require("../logger");
/**
 *
 * agree Agree The pet JSON you want to post (optional)
 * no response value expected for this operation
 **/
exports.parse = function (agree) {
  return new Promise(function (resolve, reject) {
    // date
    var dateFrom = moment(agree.terms.guarantees[0].of[0].window.initial);
    logger.info("from: " + dateFrom.toISOString());

    // metric
    var map = new Map;
    var metrics = [];
    var metricsNames = Object.keys(agree.terms.metrics);
    logger.info("metric: " + metricsNames);
    metricsNames.forEach(metric => {
      var url = agree.terms.metrics[metric].computer;
      map.set(metric, url);
      let metricJson = {
        name: metric,
        id: 1,
        url: url
      };
      metrics.push(metricJson);
    });
    getMetricsGuarantees(agree).then(newMetric => {
      metrics = metrics.concat(newMetric);
      getConditions(agree, metrics).then(rules => {
        var json = {
          from: dateFrom.format('YYYY-MM-DD'),
          rules: rules,
          metrics: metrics,
          to: dateFrom.add(1, 'M').format('YYYY-MM-DD')
        };
        logger.info("json: " + JSON.stringify(json));

        apiRequest(json).then(result => {
          resolve(result);
        });
      });
    });
  });
};

function getConditions(agree) {
  return new Promise(function (resolve, reject) {
    var rules = [];
    var rewards = [];
    if (agree.terms.guarantees[0].of[0].rewards) {
      rewards = agree.terms.guarantees[0].of[0].rewards[0].of;
      logger.info("rewards: " + rewards);
    }
    var penalties = [];
    if (agree.terms.guarantees[0].of[0].penalties) {
      penalties = agree.terms.guarantees[0].of[0].penalties[0].of;
      logger.info("penalties: " + penalties);
    }
    if (agree.terms.pricing.billing.rewards[0].of) {
      rewards = rewards.concat(agree.terms.pricing.billing.rewards[0].of);
      logger.info("rewards: " + rewards);
    }
    var guarantees = [];
    if (agree.terms.guarantees[0].of) {
      let objectives = agree.terms.guarantees[0].of;
      objectives.forEach(object => {
        object.objective = object.objective.replace(/\s/g, "");
        let nodes = object.scope.node.split(/[\s,]+/);
        nodes.forEach(node => {
          let name = object.objective.split(/(>=|<=|<|>|==)/)[0] + node;
          let reg = new RegExp(object.objective.split(/(>=|<=|<|>|==)/)[0], 'g');
          let condition = object.objective.replace(reg, name);
          let obj = {
            condition: condition,
          };
          guarantees.push(obj);
        });
      });
      logger.info("guarantees: " + rewards);
    }
    getConditionsBy(rewards, "reward").then(rulesRewards => {
      getConditionsBy(penalties, "penalties").then(rulesPenalties => {
        getConditionsBy(guarantees, "guarantees").then(rulesGuarantees => {
          var rules = rulesRewards.concat(rulesPenalties);
          rules = rules.concat(rulesGuarantees);
          resolve(rules);
        });
      });
    });
  });
}

function getConditionsBy(array, name) {
  return new Promise(function (resolve, reject) {
    var rules = [];
    if (array.length == 0) {
      resolve([]);
    } else {
      array.forEach(element => {
        let ele = (element.condition).split("&&");
        let condition = [];
        ele.forEach(rul => {
          let con;
          rul = rul.replace(/\s/g, "");
          let value = rul.split(/(>=|<=|<|>|==)/)[2];
          switch (rul.split(/(>=|<=|<|>|==)/)[1]) {
            case ">":
              con = "greaterThan";
              break;
            case ">=":
              con = "greaterThanInclusive";
              break;
            case "<":
              con = "lessThan";
              break;
            case "<=":
              con = "lessThanInclusive";
              break;
          }
          let conditionJSON = {
            fact: rul.split(/(>=|<=|<|>|==)/)[0],
            value: value.toString(),
            operator: con
          };
          condition.push(conditionJSON);
        });
        var message;
        if (element.value) {
          message = name + " of " + element.value + "%";
        } else {
          message = name;
        }
        let event = {
          fact: name,
          value: element.value,
          message: message
        };
        let rule = {
          conditions: {
            all: condition
          },
          event: {
            params: event,
            type: "increment-fact"
          }
        };
        rules.push(rule);
      });
      resolve(rules);
    }
  });
}

function getMetricsGuarantees(agree) {
  return new Promise(function (resolve, reject) {
    var metricsGuarantees = [];
    agree.terms.guarantees[0].of.forEach(element => {
      var nodes = element.scope.node.split(/[\s,]+/);
      var name = element.objective.split(/(>=|<=|<|>|==)/)[0].replace(/\s/g, "");
      nodes.forEach(node => {
        let metricJson = {
          name: name + node,
          id: 1,
          url: agree.terms.metrics[name].computer + "&node=" + node
        };
        metricsGuarantees.push(metricJson);
      });
    });
    resolve(metricsGuarantees);
  });
}

function apiRequest(json) {
  return new Promise(function (resolve, reject) {
    var url = "http://localhost:5000/api/v1/billings";
    var headers = {
      'Cache-Control': 'no-cache',
      'Content-Type': 'application/json'
    };
    var promises = [];
    promises.push(
      new Promise((resolve, reject) => {
        request({
            method: "POST",
            url: url,
            headers: headers,
            body: json,
            json: true
          },
          (err, res, body) => {
            if (err) {
              logger.info(err);
              reject(err);
            }
            // logger.info(res.statusCode);
            resolve(body);
          });
      })
    );
    // });
    Promise.all(promises).then(value => {
      logger.info(value);
      resolve(value);
    });
  });
}