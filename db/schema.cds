using { managed } from '@sap/cds/common';

namespace dalrae.pizzapreference;

entity Pizza : managed
{
    key ID          : UUID;
        name        : String(50);
        description : String(200);
}

entity EmployeePizza : managed
{
    key ID          : UUID;
        employeeId  : String(100); //> the cf username / $user.id
        email       : String(100);
        displayName : String(100);
        pizza       : Association to one Pizza;
        notes       : String(100);
}

entity PizzaOrder : managed
{
    key ID              : UUID;
        title           : String(100);
        occurredAt      : Date;
        createdByName   : String(100);
        slicesPerPerson : Integer default 3;
        participants    : Composition of many OrderParticipant
                              on participants.order = $self;
}

entity OrderParticipant
{
    key ID               : UUID;
        order            : Association to PizzaOrder;
        email            : String(100);
        displayName      : String(100);
        matched          : Boolean default false;
        pizza_ID         : UUID;
        pizzaName        : String(50);
        pizzaDescription : String(200);
        notes            : String(100);
}
