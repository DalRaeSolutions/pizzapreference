cf login -a  https://api.cf.eu10.hana.ondemand.com/
mbt build
cf deploy mta_archives/pizzapreference_1.0.0.mtar
