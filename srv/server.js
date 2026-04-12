const cds = require("@sap/cds");
const log = require("cf-nodejs-logging-support");
const express = require("express");

log.setLoggingLevel("debug");

cds.on("bootstrap", (app) => {
    app.use(express.json());
});

module.exports = cds.server;
