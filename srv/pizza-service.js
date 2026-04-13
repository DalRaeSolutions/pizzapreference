const cds = require("@sap/cds");

module.exports = cds.service.impl(function () {
    this.before(["CREATE", "UPDATE"], "EmployeePizza", (req) => {
        req.data.employeeId = req.user.id;
    });
});
