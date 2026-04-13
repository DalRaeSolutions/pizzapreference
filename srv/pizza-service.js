const cds = require("@sap/cds");

module.exports = cds.service.impl(function () {

    this.before(["CREATE", "UPDATE"], "EmployeePizza", (req) => {
        req.data.employeeId = req.user.id;
    });

    this.on("currentUser", (req) => ({
        id: req.user.id,
        isEater: req.user.is("pizzaeater"),
        isOrderer: req.user.is("pizzaorderer")
    }));

});
