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
        apiRequest(json).then(resultSLO => {
          getDataBilling(date, agree).then(bill => {
            var result = resultSLO;
            result[0].bill = eval(bill);
            result[0].billWithDiscount = (result[0].bill * resultSLO[0].percentage) / 100;
            logger.info("bill: " + result[0].bill);
            resolve(result);
          });
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
        buildRulesGuarantees(guarantees, "guarantees").then(rulesGuarantees => {
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
    var url = config.data.apiEvaluating;
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
      logger.info("evaluate response: " + JSON.stringify(value));
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
function buildRulesGuarantees(array, name) {
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

function getDataBilling(date, agree) {
  var dateTo = moment(date).add(1, "M").format("YYYY-MM-DD");
  var condition, metric, urlData, value, data;
  var find = false;
  metric = agree.terms.pricing.billing.cost.of[0].condition.split(/(>=|<=|<|>|==)/)[0].replace(/\s/g, "");
  urlData = agree.terms.metrics[metric].computer;
  return new Promise((resolve, reject) => {
    getMetric(urlData, date, dateTo, metric).then(valueMetric => {
      for (let i = 0; agree.terms.pricing.billing.cost.of.length > i && !find; i++) {
        logger.info("i: " + i);
        condition = agree.terms.pricing.billing.cost.of[i].condition;
        if (Number.isInteger(valueMetric.value)) {
          condition = condition.replace(metric, valueMetric.value);
        } else {
          condition = condition.replace(metric, 0);
        }
        if (eval(condition)) {
          find = true;
          value = agree.terms.pricing.billing.cost.of[i].value;
          value = value.replace(metric, valueMetric.value);
          data = agree.terms.pricing.billing.cost.of[i].with
        }
      }
      getValueMetrics(agree, data, date, dateTo, value).then(result => {
        return resolve(result)
      })
    });
  });
}

function getMetric(urlData, from, to, metric) {
  var url = urlData.split("&")[0];
  if (!!urlData.split("&")[1]) {
    url += "?from=" + from + "&" + urlData.split("&")[1];
  } else {
    url += "?from=" + from;
  }
  if (to) {
    url = url + "&to=" + to;
  }
  var res;
  return new Promise((resolve, reject) => {
    var headers = {
      "Cache-Control": "no-cache",
      "Content-Type": "application/json"
    };
    request({
        method: "GET",
        url: url,
        headers: headers,
        json: true
      },
      (err, res, body) => {
        if (err) {
          logger.info("GET " + url + ": " + err);
          return reject(err);
        }
        if (body.response.value) {
          logger.info("body " + body.response.value);
          res = {
            metric: metric,
            value: body.response.value
          }
          return resolve(res);
        } else {
          logger.info("body " + body.response);
          res = {
            metric: metric,
            value: body.response
          }
          return resolve(res);
        }
      }
    );
  });
}

function getValueMetrics(agree, data, from, to, value) {
  return new Promise((resolve, reject) => {
    var promises = [];
    data.forEach(element => {
      if (agree.terms.pricing.billing.cost.over.baseCost[element]) {
        value = value.replace(element, agree.terms.pricing.billing.cost.over.baseCost[element])
      } else if (agree.terms.metrics[element].computer) {
        promises.push(getMetric(agree.terms.metrics[element].computer, from, to, element))
      }
    })
    Promise.all(promises).then(infoMetrics => {
      infoMetrics.forEach(infoMetric => {
        value = value.replace(infoMetric.metric, infoMetric.value)
        logger.info(value)
        logger.info("evaluate response: " + JSON.stringify(infoMetric));
      })
      return resolve(value)
    })
  })
}