using dalrae.pizzapreference as db from '../db/schema';

service PizzaService @(requires: ['pizzaeater', 'pizzaorderer']) {

    @readonly
    entity Pizza             as projection on db.Pizza;

    entity EmployeePizza     as projection on db.EmployeePizza;

    entity PizzaOrder        as projection on db.PizzaOrder actions {
        action rematch() returns PizzaOrder;
    };

    entity OrderParticipant  as projection on db.OrderParticipant;

    annotate EmployeePizza with @restrict: [
        { grant: ['READ', 'WRITE'], to: 'pizzaeater', where: 'employeeId = $user.id' }
    ];

    annotate PizzaOrder with @restrict: [
        { grant: ['READ', 'WRITE', 'rematch'], to: 'pizzaorderer' }
    ];

    annotate OrderParticipant with @restrict: [
        { grant: ['READ', 'WRITE'], to: 'pizzaorderer' }
    ];

    type UserInfo {
        id          : String;
        displayName : String;
        isEater     : Boolean;
        isOrderer   : Boolean;
    };

    function currentUser() returns UserInfo;

    action createOrderFromPaste(
        title      : String,
        occurredAt : Date,
        paste      : String
    ) returns PizzaOrder;

}
