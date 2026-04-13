sap.ui.define([], function () {
    "use strict";

    const SLICES_PER_PIZZA = 8;

    return {

        date: function (dateValue) {
            if (!dateValue) return "";
            const d = new Date(dateValue);
            const month = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            const year = d.getFullYear();
            return [day, month, year].join("-");
        },

        pizzasNeeded: function (peopleCount, slicesPerPerson) {
            const n = Number(peopleCount) || 0;
            const s = Number(slicesPerPerson) || 3;
            if (n === 0) return 0;
            return Math.ceil((n * s) / SLICES_PER_PIZZA);
        },

        sliceLine: function (peopleCount, slicesPerPerson) {
            const n = Number(peopleCount) || 0;
            const s = Number(slicesPerPerson) || 3;
            const pizzas = this.pizzasNeeded(n, s);
            return n + " × " + s + " slices = " + pizzas + " pizza" + (pizzas === 1 ? "" : "s");
        },

        orderSubtitle: function (matchedCount, unmatchedCount) {
            const m = Number(matchedCount) || 0;
            const u = Number(unmatchedCount) || 0;
            return m + " matched · " + u + " unknown";
        }

    };
});
