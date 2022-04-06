using { managed, sap } from '@sap/cds/common';

namespace dalrae.pizzapreference;

entity Pizza: managed
{
    key ID: UUID;
    name: String(50);
    description: String(200);
}

entity EmployeePizza: managed
{
    key ID: UUID;
    employeeId: String(100);    //this is the cf username / email
    pizza: Association to one Pizza;
    notes: String(100);
}