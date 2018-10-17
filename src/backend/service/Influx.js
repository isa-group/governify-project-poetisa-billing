"use strict";

require("colors");

const Promise = require("bluebird");
const Influx = require("influx");
const logger = require("../logger");
const config = require("../configurations");

var measurementBilling = "slo-evaluating";

exports.writeInflux = function (dataBilling) {
    logger.info(dataBilling);
    var data = {
        // value: dataBilling.percentage,
        // billTotal: dataBilling.bill.total,
        provider: agree.provider,
        consumer: agree.consumer,
        initialDate: dataBilling.from,
        endDate: dataBilling.to,
        billingDate: dataBilling.bill.dataBilling,
        totalWithout: dataBilling.bill.totalWithout,
        total: dataBilling.bill.total,
        concepts: {
            description: "discount",
            subtotal: dataBilling.bill.concepts.subtotal
        },
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
                if (!exist) {
                    logger.info("Exist measurement");
                    influx.writeMeasurement("slo-evaluating", [{
                        fields: {
                            executeTime: new Date().toISOString(),
                            provider: data.provider,
                            consumer: data.consumer,
                            initialDate: data.from,
                            endDate: data.to,
                            billingDate: data.bill.dataBilling,
                            totalWithout: data.bill.totalWithout,
                            total: data.bill.total,
                            concepts: {
                                description: "discount",
                                subtotal: data.bill.concepts.subtotal
                            },
                            state: "billed"
                        }
                    }]);
                } else {
                    functionInsertData(data);
                }
            });
        });
    });
}

function checkMeasurement() {
    return new Promise(function (resolve, reject) {
        var exist = false;
        influx.getMeasurements().then(names => {
            if (names === "Billing") {
                exist = true;
            }
            console.log("My database has this measurements and names are: " + names.join(", "));
        });
        return resolve(exist);
    });
};


function functionInsertData(data) {
    influx = new Influx.InfluxDB({
        host: config.data.hostInflux,
        port: config.data.portInflux,
        database: "k8s",
        schema: [{
            measurement: "slo-evaluating",
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
                concepts: {
                    description: Influx.FieldType.STRING,
                    subtotal: Influx.FieldType.INTEGER
                },
                state: Influx.FieldType.STRING
            }
        }]
    });
    influx
        .writePoints(
            [{
                measurement: "slo-evaluating",
                fields: {
                    fields: {
                        executeTime: new Date().toISOString(),
                        provider: data.provider,
                        consumer: data.consumer,
                        initialDate: data.from,
                        endDate: data.to,
                        billingDate: data.bill.dataBilling,
                        totalWithout: data.bill.totalWithout,
                        total: data.bill.total,
                        concepts: {
                            description: "discount",
                            subtotal: data.bill.concepts.subtotal
                        },
                        state: "billed"
                    }
                }
            }], {
                database: "k8s"
            }
        )
        .catch(error => {
            console.error(`Error saving data to InfluxDB! ${error.stack}`);
        });
}