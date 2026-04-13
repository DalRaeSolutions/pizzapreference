const cds = require("@sap/cds");
const log = require("cf-nodejs-logging-support");
const express = require("express");

log.setLoggingLevel("debug");

// Cookie-based login for dev. We do NOT use browser native Basic auth at all because
// browsers cache it aggressively and there's no API to clear the cache from JS or to
// reliably force a re-prompt. Instead:
//
//   - The user signs in via a real HTML form at /api/login.
//   - We base64(username:password) and stash it in an httponly cookie.
//   - A pre-CAP middleware reads the cookie on every request and sets the Authorization
//     header so CAP's existing mocked auth keeps working unchanged.
//   - Logout = delete the cookie + redirect to the login form.
//
// Switching users at demo time is now a single click.

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

    // Bridge: the cookie is the single source of truth. If it's set, it OVERRIDES any
    // Basic auth header the browser may have sent from its native credential cache (which
    // is what kept silently logging the user back in as the wrong account). If there's no
    // cookie, strip any browser-supplied Basic auth so CAP returns 401 and the client
    // bounces to /api/login instead of silently re-using cached creds.
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

    // Login submit (POST). We don't pre-validate against the user list — CAP's auth will
    // reject bad credentials on the next /odata call, and the v4 fetch helpers redirect
    // back to /api/login on 401.
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

    // Logout: clear the cookie and send the user back to the login form.
    app.get("/api/logout", (_req, res) => {
        console.log("[logout] clearing auth cookie");
        res.setHeader("Set-Cookie", COOKIE_NAME + "=; Path=/; Max-Age=0; SameSite=Lax");
        res.redirect("/api/login");
    });

});

module.exports = cds.server;
