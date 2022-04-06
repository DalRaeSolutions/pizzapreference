/* eslint-disable no-unused-vars */
const cds = require("@sap/cds");
const proxy = require('@sap/cds-odata-v2-adapter-proxy');
const log = require("cf-nodejs-logging-support");
const express = require("express");
const passport = require("passport");
const xsenv = require("@sap/xsenv");

// Set the minimum logging level (Levels: off, error, warn, info, verbose, debug, silly)
log.setLoggingLevel("debug");

cds.on("bootstrap", async (app) => {
    app.use(proxy());
    app.use(express.json());

});

module.exports = cds.server;