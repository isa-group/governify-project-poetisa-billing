"use strict";

require("colors");

const Promise = require("bluebird");
const Influx = require("influx");
const logger = require("../logger");
const config = require("../configurations");

var measurementBilling = "billing";

exports.writeInflux = function (dataBilling) {
    logger.info(dataBilling);
    var data = {
        // value: dataBilling.percentage,
        // billTotal: dataBilling.bill.total,
        provider: dataBilling.provider,
        consumer: dataBilling.consumer,
        initialDate: dataBilling.from,
        endDate: dataBilling.to,
        billingDate: dataBilling.bill.billingDate,
        totalWithout: dataBilling.bill.totalWithout,
        total: dataBilling.bill.total,
        state: "billed"
    };
    logger.info("data");
    connectAndCreateInfluxDB(data);
};

var influx;

function connectAndCreateInfluxDB(data) {
    return new Promise(function (resolve, reject) {
        console.log("Creating influxdb connection to %s", config.data.hostInflux);
        influx = new Influx.InfluxDB({
            host: config.data.hostInflux,
            port: config.data.portInflux,
            database: "k8s"
        });
        // Set up influx database

        influx;

        checkMeasurement().then(exist => {
            return new Promise(function (reject, resolve) {
                if (exist) {
                    logger.info("Exist measurement");
                    influx.writeMeasurement("billing", [{
                        fields: {
                            executeTime: new Date().toISOString(),
                            provider: data.provider,
                            consumer: data.consumer,
                            initialDate: data.from,
                            endDate: data.to,
                            billingDate: data.billingDate,
                            totalWithout: data.totalWithout,
                            total: data.total,
                            state: "billed"
                        }
                    }]);
                    return resolve(influx.writeMeasurement("billing", [{
                        fields: {
                            executeTime: new Date().toISOString(),
                            provider: data.provider,
                            consumer: data.consumer,
                            initialDate: data.from,
                            endDate: data.to,
                            billingDate: data.billingDate,
                            totalWithout: data.totalWithout,
                            total: data.total,
                            state: "billed"
                        }
                    }]));
                } else {
                    functionInsertData(data).then(solve =>
                        resolve(solve));
                }
            });
        });
    });
}

function checkMeasurement() {
    return new Promise(function (resolve, reject) {
        var exist = false;
        influx.getMeasurements().then(names => {
            if (names[0] === "Billing") {
                exist = true;
            }
            console.log("My database has this measurements and names are: " + names.join(", "));
        });
        return resolve(exist);
    });
}

function functionInsertData(data) {
    return new Promise(function (resolve, reject) {
        influx = new Influx.InfluxDB({
            host: config.data.hostInflux,
            port: config.data.portInflux,
            database: "k8s",
            schema: [{
                measurement: "billing",
                fields: {
                    executeTime: Influx.FieldType.STRING,
                    value: Influx.FieldType.INTEGER,
                    billTotal: Influx.FieldType.INTEGER,
                    provider: Influx.FieldType.STRING,
                    consumer: Influx.FieldType.STRING,
                    initialDate: Influx.FieldType.STRING,
                    endDate: Influx.FieldType.STRING,
                    billingDate: Influx.FieldType.STRING,
                    totalWithout: Influx.FieldType.INTEGER,
                    total: Influx.FieldType.INTEGER,
                    state: Influx.FieldType.STRING
                },
                tags: ['bill']
            }]
        });
        influx
            .writePoints(
                [{
                    measurement: "billing",
                    fields: {
                        executeTime: new Date().toISOString(),
                        provider: data.provider,
                        consumer: data.consumer,
                        initialDate: data.from,
                        endDate: data.to,
                        billingDate: data.billingDate,
                        totalWithout: data.totalWithout,
                        total: data.total,
                        state: "billed"
                    },
                    tags: {
                        bill: 'bill'
                    }
                }]
            )
            .catch(error => {
                console.error(`Error saving data to InfluxDB! ${error.stack}`);
                return reject(error);
            });
        return resolve(influx);
    });
}