using dalrae.pizzapreference as db from '../db/schema';

service PizzaService @(_requires:'authenticated-user') {

    @readonly entity Pizza as projection on db.Pizza;
    entity EmployeePizza as projection on db.EmployeePizza;

}