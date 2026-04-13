const cds = require("@sap/cds");
const log = require("cf-nodejs-logging-support");
const express = require("express");

log.setLoggingLevel("debug");

// Demo-grade logout. Basic auth is stateless and browsers won't let us clear the cached
// credential from JS, so we do it server-side: when a user clicks Logout we blacklist
// their credentials for a short window. The next /v2 or /odata request from that user
// gets a 401 + WWW-Authenticate, which forces the browser to re-prompt.
const LOGOUT_TTL_MS = 30_000;
const loggedOutUsers = new Map(); // userId -> expiry epoch ms (single-use: cleared on rejection)

function extractBasicUser(authHeader) {
    if (!authHeader || !authHeader.startsWith("Basic ")) return null;
    try {
        return Buffer.from(authHeader.slice(6), "base64").toString().split(":")[0];
    } catch (e) {
        return null;
    }
}

cds.on("bootstrap", (app) => {

    app.use(express.json());

    // Logout: record the user who's signing out, then send the browser to the goodbye page.
    // The page is static so it can display with the old cached credentials — the rejection
    // happens on the next API call.
    app.get("/api/logout", (req, res) => {
        const user = extractBasicUser(req.headers.authorization);
        if (user) {
            loggedOutUsers.set(user, Date.now() + LOGOUT_TTL_MS);
            console.log("[logout] blacklisting", user, "for", LOGOUT_TTL_MS / 1000, "seconds");
        }
        res.redirect("/pizzapreference/webapp/logout.html");
    });

    // Pre-auth middleware for API paths only. Static files (the goodbye page, index.html,
    // css/js/images) pass through untouched so they can render without triggering a prompt.
    app.use((req, res, next) => {
        if (!req.path.startsWith("/v2") && !req.path.startsWith("/odata")) return next();

        const user = extractBasicUser(req.headers.authorization);
        if (!user || !loggedOutUsers.has(user)) return next();

        const expiry = loggedOutUsers.get(user);
        if (Date.now() >= expiry) {
            loggedOutUsers.delete(user);
            return next();
        }

        // Single-use: clear the entry so the very next retry (with either the same or a
        // different credential) is accepted by CAP's normal auth.
        loggedOutUsers.delete(user);
        console.log("[logout] rejecting logged-out user", user, "on", req.path);
        res.setHeader("WWW-Authenticate", 'Basic realm="Users"');
        res.status(401).send("You have been logged out. Please sign in again.");
    });

});

module.exports = cds.server;
