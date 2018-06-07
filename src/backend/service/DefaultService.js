'use strict';

var moment = require('moment');
var request = require('request');
/**
 *
 * agree Agree The pet JSON you want to post (optional)
 * no response value expected for this operation
 **/
exports.parse = function (agree) {
  return new Promise(function (resolve, reject) {
    // date
    var dateFrom = moment(agree.terms.guarantees[0].of[0].window.initial);
    console.log("from: " + dateFrom.toISOString());

    // metric
    var map = new Map;
    var metrics = [];
    var metricsNames = Object.keys(agree.terms.metrics);
    console.log("metric: " + metricsNames);
    metricsNames.forEach(metric => {
      var url = agree.terms.metrics[metric].computer;
      map.set(metric, url);
      let metricJson = {
        name: metric,
        id: 1,
        url: url
      }
      metrics.push(metricJson);
    });
    getConditions(agree, metrics).then(rules => {
      var json = {
        from: dateFrom.format('YYYY-MM-DD'),
        rules: rules,
        metrics: metrics,
        to: dateFrom.add(1, 'M').format('YYYY-MM-DD')
      };
      console.log("json: " + JSON.stringify(json));

      apiRequest(json).then(result => {
        resolve(result);
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
      console.log("rewards: " + rewards);
    }
    var penalties = [];
    if (agree.terms.guarantees[0].of[0].penalties) {
      penalties = agree.terms.guarantees[0].of[0].penalties[0].of;
      console.log("penalties: " + penalties);
    }
    getConditionsBy(rewards, "reward").then(rulesRewards => {
      getConditionsBy(penalties, "penalties").then(rulesPenalties => {
        var rules = rulesRewards.concat(rulesPenalties);
        resolve(rules);
      });
    });
  });
}

function getConditionsBy(array, name) {
  return new Promise(function (resolve, reject) {
    var rules = [];
    if (array.length < 0) {
      resolve([]);
    } else {
      array.forEach(element => {

        let ele = (element.condition).split("&&");
        let condition = [];
        ele.forEach(rul => {
          let con;
          if (rul.split(" ")[0] === "") {
            rul = rul.slice(1);
          }
          let value = rul.split(" ")[2];
          switch (rul.split(" ")[1]) {
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
            fact: rul.split(" ")[0],
            value: value.toString(),
            operator: con
          };
          condition.push(conditionJSON);
        });
        let event = {
          fact: name,
          value: element.value,
          message: name + " of " + element.value + "%"
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

function apiRequest(json) {
  return new Promise(function (resolve, reject) {
    var metrics = json.metrics;
    var url = "http://localhost:5000/api/v1/billings";
    var headers = {
      'Cache-Control': 'no-cache',
      'Content-Type': 'application/json'
    }
    var promises = [];
    // metrics.forEach(metric => {
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
              console.log(err);
              reject(err);
            }
            // console.log(res.statusCode);
            resolve(body);
          });
      })
    );
    // });
    Promise.all(promises).then(value => {
      console.log(value);
      resolve(value);
    });
  });
}