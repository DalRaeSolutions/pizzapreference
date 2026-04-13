using dalrae.pizzapreference as db from '../db/schema';

service PizzaService @(requires: ['pizzaeater', 'pizzaorderer']) {

    @readonly entity Pizza as projection on db.Pizza;
    entity EmployeePizza as projection on db.EmployeePizza;

    annotate EmployeePizza with @restrict: [
        { grant: ['READ'], to: 'pizzaorderer' },
        { grant: ['READ', 'WRITE'], to: 'pizzaeater', where: 'employeeId = $user.id' }
    ];

}
