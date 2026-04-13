const cds = require("@sap/cds");
const log = require("cf-nodejs-logging-support");
const express = require("express");

log.setLoggingLevel("debug");

// ---------------------------------------------------------------------------------------
// Dev-only cookie login
// ---------------------------------------------------------------------------------------
// When CAP is using mocked auth (i.e. local dev), browsers cache Basic credentials too
// aggressively to support a working "switch user" flow. We bypass browser native Basic auth
// entirely:
//   - The user signs in via a real HTML form at /api/login.
//   - We base64(username:password) and stash it in an httponly cookie.
//   - A pre-CAP middleware reads the cookie on every request and rewrites the Authorization
//     header so CAP's mocked auth keeps working unchanged.
//   - /logout clears the cookie and bounces back to the login form.
//
// In production the CAP auth profile flips to xsuaa, the approuter handles login and
// logout, and none of this code runs — the early `return` below skips registration.

const COOKIE_NAME = "appAuth";

function parseCookies(header) {
    const out = {};
    if (!header) return out;
    header.split(";").forEach((c) => {
        const idx = c.indexOf("=");
        if (idx < 0) return;
        const k = c.slice(0, idx).trim();
        const v = c.slice(idx + 1).trim();
        if (k) out[k] = v;
    });
    return out;
}

function loginForm(error) {
    const errBlock = error
        ? '<p class="error">Invalid credentials. Try again.</p>'
        : '';
    return [
        '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Sign in</title>',
        '<style>',
        'body{font-family:Segoe UI,system-ui,sans-serif;background:#f4f7fa;max-width:420px;margin:80px auto;padding:32px;}',
        'h1{font-weight:300;color:#32363a;margin:0 0 16px;}',
        'p.lead{color:#5a6872;margin:0 0 24px;}',
        'form{display:flex;flex-direction:column;gap:10px;background:#fff;padding:24px;border-radius:6px;box-shadow:0 1px 4px rgba(0,0,0,0.08);}',
        'input{padding:10px;font-size:14px;border:1px solid #c0c8d0;border-radius:4px;}',
        'input:focus{outline:none;border-color:#0070f0;}',
        'button{padding:11px;font-size:14px;background:#0070f0;color:#fff;border:0;border-radius:4px;cursor:pointer;font-weight:500;}',
        'button:hover{background:#005cc7;}',
        '.error{color:#bb0000;background:#ffe6e6;padding:8px 12px;border-radius:4px;}',
        '.users{margin-top:20px;font-size:12px;color:#5a6872;line-height:1.6;}',
        '.users code{background:#eef2f6;padding:1px 5px;border-radius:3px;}',
        '</style></head><body>',
        '<h1>Pizza Preference</h1>',
        '<p class="lead">Sign in to record your pizza preference or build a team order.</p>',
        errBlock,
        '<form method="POST" action="/api/login">',
        '<input name="username" placeholder="username" autocomplete="username" autofocus required>',
        '<input name="password" type="password" placeholder="password" autocomplete="current-password" required>',
        '<button type="submit">Sign in</button>',
        '</form>',
        '<div class="users">',
        '<strong>Demo users</strong> (password = username)<br>',
        'Eaters: <code>alice</code> <code>bob</code> <code>eater</code><br>',
        'Orderers: <code>carol</code> <code>dave</code> <code>orderer</code><br>',
        'Both: <code>both</code>',
        '</div>',
        '</body></html>'
    ].join('');
}

cds.on("bootstrap", (app) => {

    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));

    // Skip the entire dev-login subsystem unless CAP is using mocked auth.
    // In production the [production] profile flips this to xsuaa and the approuter takes over.
    const authCfg = cds.env.requires && cds.env.requires.auth;
    const isMocked = !!(authCfg && authCfg.kind === "mocked");
    if (!isMocked) {
        return;
    }

    // Bridge: cookie is the source of truth. Cached browser Basic creds are stripped if
    // there's no cookie so the client falls through to the login form instead of silently
    // re-authing as a stale user.
    app.use((req, _res, next) => {
        const cookies = parseCookies(req.headers.cookie);
        if (cookies[COOKIE_NAME]) {
            req.headers.authorization = "Basic " + cookies[COOKIE_NAME];
            return next();
        }
        if (req.headers.authorization && req.headers.authorization.startsWith("Basic ")) {
            delete req.headers.authorization;
        }
        next();
    });

    // Login form (GET)
    app.get("/api/login", (req, res) => {
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.send(loginForm(req.query.error));
    });

    // Login submit (POST). We don't pre-validate against the user list — CAP will reject
    // bad credentials on the next /odata call and the v4 fetch helper bounces here on 401.
    app.post("/api/login", (req, res) => {
        const username = (req.body && req.body.username) || "";
        const password = (req.body && req.body.password) || "";
        if (!username) {
            return res.redirect("/api/login?error=1");
        }
        const auth = Buffer.from(username + ":" + password).toString("base64");
        res.setHeader("Set-Cookie", COOKIE_NAME + "=" + auth + "; Path=/; HttpOnly; SameSite=Lax");
        res.redirect("/pizzapreference/webapp/index.html");
    });

    // /logout matches the approuter's built-in logout endpoint (declared in xs-app.json).
    // In dev we handle it ourselves: clear the cookie and send the user back to the login form.
    // In prod the approuter intercepts /logout before it ever reaches the backend, terminates
    // the xsuaa session, and redirects to xs-app.json's logoutPage.
    app.get("/logout", (_req, res) => {
        console.log("[logout] clearing auth cookie");
        res.setHeader("Set-Cookie", COOKIE_NAME + "=; Path=/; Max-Age=0; SameSite=Lax");
        res.redirect("/api/login");
    });

});

module.exports = cds.server;
