"use strict";

const moment = require("moment");
const request = require("request");

const logger = require("../logger");
const config = require("../configurations");

/**
 *
 * agree Agree The pet JSON you want to post (optional)
 * no response value expected for this operation
 **/
exports.parse = function (agree, date) {
  return new Promise(function (resolve, reject) {
    // date
    var dateFrom = moment(date);
    logger.info("from: " + dateFrom.toISOString());

    // metrics
    var metrics = [];
    var metricsNames = Object.keys(agree.terms.metrics);
    logger.info("metric: " + metricsNames);

    // all metrics are added in an array
    metricsNames.forEach(metric => {
      var url = agree.terms.metrics[metric].computer;
      let metricJson = {
        name: metric,
        id: 1,
        url: url
      };
      metrics.push(metricJson);
    });

    // the guarantees are added like a metrics
    getMetricsGuarantees(agree).then(newMetric => {
      metrics = metrics.concat(newMetric);
      getConditions(agree, metrics).then(rules => {
        var json = {
          from: dateFrom.format("YYYY-MM-DD"),
          rules: rules,
          metrics: metrics,
          to: dateFrom.add(1, "M").format("YYYY-MM-DD")
        };
        logger.info("json: " + JSON.stringify(json));
        // when I have the complete json I make a request to the API.
        apiRequest(json).then(result => {
          resolve(result);
        });
      });
    });
  });
};

function getConditions(agree) {
  return new Promise(function (resolve, reject) {
    // the rewards
    var rewards = [];
    if (agree.terms.guarantees[0].of[0].rewards) {
      rewards = agree.terms.guarantees[0].of[0].rewards[0].of;
      logger.info("rewards: " + rewards);
    }
    if (agree.terms.pricing.billing.rewards[0].of) {
      rewards = rewards.concat(agree.terms.pricing.billing.rewards[0].of);
      logger.info("rewards: " + rewards);
    }
    // the penalties
    var penalties = [];
    if (agree.terms.guarantees[0].of[0].penalties) {
      penalties = agree.terms.guarantees[0].of[0].penalties[0].of;
      logger.info("penalties: " + penalties);
    }
    // the guarantees
    var guarantees = [];
    if (agree.terms.guarantees[0].of) {
      // Here are all the objectives of the type of guarantee that the system should be satisfied.
      let objectives = agree.terms.guarantees[0].of;
      objectives.forEach(object => {
        // object.objective = object.objective.replace(/\s/g, "");
        let nodes = object.scope.node.split(/[\s,]+/);
        // in this case are differentiated by nodes
        nodes.forEach(node => {
          let name = (object.objective.split(/(>=|<=|<|>|==)/)[0] + "+" + node).replace(/\s/g, "") + " ";
          let reg = new RegExp(object.objective.split(/(>=|<=|<|>|==)/)[0], "g");
          let condition = object.objective.replace(reg, name);
          let obj = {
            condition: condition
          };
          guarantees.push(obj);
        });
      });
      logger.info("guarantees: " + rewards);
    }

    // get all the rules
    buildRules(rewards, "reward").then(rulesRewards => {
      buildRules(penalties, "penalties").then(rulesPenalties => {
        buildRulesGarantees(guarantees, "guarantees").then(rulesGuarantees => {
          var rules = rulesRewards.concat(rulesPenalties);
          rules = rules.concat(rulesGuarantees);
          resolve(rules);
        });
      });
    });
  });
}

/**
 * A method by which rules are built to be added to an array
 * @param {*} array
 * @param {*} name
 */
function buildRules(array, name) {
  return new Promise(function (resolve, reject) {
    var rules = [];
    if (array.length == 0) {
      resolve([]);
    } else {
      array.forEach(element => {
        let ele = element.condition.split("&&");
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
          logger.info(conditionJSON);
          condition.push(conditionJSON);
        });
        var message;
        if (element.value) {
          message = name + ": " + element.value + "% because ->" + element.condition;
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

/**
 * Obtain the metrics of the guarantees
 * @param {*} agree
 */
function getMetricsGuarantees(agree) {
  return new Promise(function (resolve, reject) {
    var metricsGuarantees = [];
    agree.terms.guarantees[0].of.forEach(element => {
      var nodes = element.scope.node.split(/[\s,]+/);
      var name = element.objective.split(/(>=|<=|<|>|==)/)[0].replace(/\s/g, "");
      nodes.forEach(node => {
        let metricJson = {
          name: name + "+" + node,
          id: 1,
          // node o pod_name o namespace
          url: agree.terms.metrics[name].computer + "&pod_name=" + node
        };
        metricsGuarantees.push(metricJson);
      });
    });
    resolve(metricsGuarantees);
  });
}

/**
 * Request to the api to get the invoice discount
 * @param {*} json
 */
function apiRequest(json) {
  return new Promise(function (resolve, reject) {
    var url = config.data.apiBilling;
    var headers = {
      "Cache-Control": "no-cache",
      "Content-Type": "application/json"
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
              logger.info("POST " + url + ": " + err);
              reject(err);
            }
            // logger.info(res.statusCode);
            resolve(body);
          }
        );
      })
    );
    // });
    Promise.all(promises).then(value => {
      logger.info(value);
      resolve(value);
    });
  });
}

/**
 * A method by which rules are built to be added to an array
 * because they are guarantees we change the sign of the operation to check that they work
 * @param {*} array
 * @param {*} name
 */
function buildRulesGarantees(array, name) {
  return new Promise(function (resolve, reject) {
    var rules = [];
    if (array.length == 0) {
      resolve([]);
    } else {
      array.forEach(element => {
        let ele = element.condition.split("&&");
        let condition = [];
        ele.forEach(rul => {
          let con;
          rul = rul.replace(/\s/g, "");
          let value = rul.split(/(>=|<=|<|>|==)/)[2];
          switch (rul.split(/(>=|<=|<|>|==)/)[1]) {
            case ">":
              con = "lessThan";
              break;
            case ">=":
              con = "lessThanInclusive";
              break;
            case "<":
              con = "greaterThan";
              break;
            case "<=":
              con = "greaterThanInclusive";
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
          message = name + ": " + element.value + "% because " + element.condition;
        } else {
          message = "not " + name + " ->" + element.condition;
        }
        let event = {
          fact: name,
          value: "0",
          message: message
        };
        let rule = {
          conditions: {
            all: condition
          },
          event: {
            params: event,
            type: "garantee-fact"
          }
        };
        rules.push(rule);
      });
      resolve(rules);
    }
  });
}