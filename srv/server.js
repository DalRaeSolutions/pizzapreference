const cds = require("@sap/cds");
const log = require("cf-nodejs-logging-support");
const express = require("express");

log.setLoggingLevel("debug");

// /api/logout is a two-step flow.
// Step 1: the client hits /api/logout with the user's currently-cached Basic credentials.
//         The server replies 401 + WWW-Authenticate realm="Users" (same realm CAP uses),
//         which forces the native browser prompt to replace the cached credential under the
//         (origin, "Users") protection space — the same slot /odata and /v2 calls use.
// Step 2: the browser retries /api/logout with the *new* credentials. The server sees this
//         is the retry (tracked by a small in-memory challenge set) and 302s to the app,
//         which then reloads with the new user.
const REAUTH_REALM = 'Basic realm="Users"';
const pendingChallenges = new Set();

function hashAuth(header) {
    // Minimal stable identifier for an Authorization header — good enough for single-user dev.
    if (!header) return "none";
    return header.slice(0, 64);
}

cds.on("bootstrap", (app) => {

    app.use(express.json());

    app.get("/api/logout", (req, res) => {
        const authHash = hashAuth(req.headers.authorization);

        if (!pendingChallenges.has("armed")) {
            // Step 1: first click — challenge the browser. Record the incoming credential hash
            // so we can tell when the retry comes back with something different.
            console.log("[logout] step 1 — challenging with 401");
            pendingChallenges.add("armed");
            pendingChallenges.add("initial:" + authHash);
            // Auto-expire the challenge after 30s if the user cancels the prompt.
            setTimeout(() => {
                pendingChallenges.delete("armed");
                pendingChallenges.forEach((k) => { if (k.startsWith("initial:")) pendingChallenges.delete(k); });
            }, 30000);

            res.setHeader("WWW-Authenticate", REAUTH_REALM);
            res.status(401).send(
                "<!doctype html><html><body style=\"font-family:sans-serif;text-align:center;padding:60px\">" +
                "<h2>Please re-authenticate</h2>" +
                "<p>Enter credentials for a different user, or the same ones to cancel.</p>" +
                "</body></html>"
            );
            return;
        }

        // Step 2: retry after the prompt.
        console.log("[logout] step 2 — retry with new auth, redirecting home");
        pendingChallenges.delete("armed");
        pendingChallenges.forEach((k) => { if (k.startsWith("initial:")) pendingChallenges.delete(k); });
        res.redirect("/pizzapreference/webapp/index.html");
    });

});

module.exports = cds.server;
