using dalrae.pizzapreference as db from '../db/schema';

service PizzaService @(requires:'authenticated-user') {

    @readonly entity Pizza as projection on db.Pizza;
    entity EmployeePizza as projection on db.EmployeePizza;

    annotate EmployeePizza with @restrict: [
        { grant: 'READ', where: 'employeeId = $user.id' },
        { grant: 'WRITE', where: 'employeeId = $user.id' },
        { grant: 'UPDATE', where: 'employeeId = $user.id' }
    ];

}