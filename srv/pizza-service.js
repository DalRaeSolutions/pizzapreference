const cds = require("@sap/cds");

const EMAIL_RE = /([A-Za-z0-9._%+-]+)@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/;
const EMAIL_RE_GLOBAL = /([A-Za-z0-9._%+-]+)@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;
const NAMED_EMAIL_RE = /([^<;,\n\r]+?)<([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})>/g;
const HEADER_PREFIX_RE = /^(to|cc|bcc|from|attendees?|required|optional)\s*:\s*/i;

function parseAttendees(paste) {

    if (!paste || typeof paste !== "string") {
        return [];
    }

    const attendees = [];
    const seenEmails = new Set();
    const seenNames = new Set();

    // Phase 1: "Display Name <email@domain>" pairs — Outlook To: line format
    let m;
    while ((m = NAMED_EMAIL_RE.exec(paste)) !== null) {
        let displayName = m[1].trim().replace(/^["']|["']$/g, "");
        displayName = displayName.replace(HEADER_PREFIX_RE, "").trim();
        const email = m[2].trim().toLowerCase();
        if (!seenEmails.has(email)) {
            seenEmails.add(email);
            if (displayName) {
                seenNames.add(displayName.toLowerCase());
            }
            attendees.push({ email, displayName: displayName || email.split("@")[0] });
        }
    }

    // Phase 2: bare emails not already captured
    const bareEmails = paste.match(EMAIL_RE_GLOBAL) || [];
    bareEmails.forEach((raw) => {
        const email = raw.trim().toLowerCase();
        if (!seenEmails.has(email)) {
            seenEmails.add(email);
            attendees.push({ email, displayName: email.split("@")[0] });
        }
    });

    // Phase 3: name-only lines (Teams meeting roster)
    paste.split(/\r?\n/).forEach((line) => {
        const cleaned = line.replace(/\(.*?\)/g, "").replace(/^[\s\-•*]+/, "").trim();
        if (!cleaned) return;
        if (EMAIL_RE.test(cleaned)) return;
        if (cleaned.length > 80) return;
        const nameKey = cleaned.toLowerCase();
        if (seenNames.has(nameKey)) return;
        seenNames.add(nameKey);
        attendees.push({ email: null, displayName: cleaned });
    });

    return attendees;

}

module.exports = cds.service.impl(function () {

    const { Pizza, EmployeePizza, PizzaOrder, OrderParticipant } = this.entities;

    this.before(["CREATE", "UPDATE"], "EmployeePizza", (req) => {
        req.data.employeeId = req.user.id;
        if (req.user.attr) {
            if (req.user.attr.email) {
                req.data.email = req.user.attr.email;
            }
            if (req.user.attr.displayName) {
                req.data.displayName = req.user.attr.displayName;
            }
        }
    });

    this.on("currentUser", (req) => ({
        id: req.user.id,
        isEater: req.user.is("pizzaeater"),
        isOrderer: req.user.is("pizzaorderer")
    }));

    this.on("createOrderFromPaste", async (req) => {

        const { title, occurredAt, paste } = req.data;

        const attendees = parseAttendees(paste);
        if (attendees.length === 0) {
            return req.reject(400, "Could not find any attendees in the pasted text.");
        }

        const [all, pizzas] = await Promise.all([
            SELECT.from(EmployeePizza),
            SELECT.from(Pizza)
        ]);
        const pizzasById = new Map(pizzas.map((p) => [p.ID, p]));
        const byEmail = new Map();
        const byName = new Map();
        all.forEach((p) => {
            if (p.email) byEmail.set(p.email.toLowerCase(), p);
            if (p.displayName) byName.set(p.displayName.toLowerCase(), p);
        });

        const orderId = cds.utils.uuid();
        const createdByName = (req.user.attr && req.user.attr.displayName) || req.user.id;

        await INSERT.into(PizzaOrder).entries({
            ID: orderId,
            title: title || "Untitled order",
            occurredAt: occurredAt || new Date().toISOString().slice(0, 10),
            createdByName,
            slicesPerPerson: 3
        });

        const participants = attendees.map((a) => {
            let match = null;
            if (a.email && byEmail.has(a.email)) {
                match = byEmail.get(a.email);
            } else if (a.displayName && byName.has(a.displayName.toLowerCase())) {
                match = byName.get(a.displayName.toLowerCase());
            }
            const pizza = match && match.pizza_ID ? pizzasById.get(match.pizza_ID) : null;
            return {
                ID: cds.utils.uuid(),
                order_ID: orderId,
                email: a.email,
                displayName: a.displayName,
                matched: !!match,
                pizza_ID: match ? match.pizza_ID : null,
                pizzaName: pizza ? pizza.name : null,
                pizzaDescription: pizza ? pizza.description : null,
                notes: match ? match.notes : null
            };
        });

        await INSERT.into(OrderParticipant).entries(participants);

        return SELECT.one.from(PizzaOrder).where({ ID: orderId });

    });

});
