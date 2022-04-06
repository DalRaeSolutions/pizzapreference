// eslint-disable-next-line no-undef
sap.ui.define([], function () {
	"use strict";
	return {

        date: function(dateValue){

            var d = new Date(dateValue),
            month = '' + (d.getMonth() + 1),
            day = '' + d.getDate(),
            year = d.getFullYear();

            if (month.length < 2) 
                month = '0' + month;
            if (day.length < 2) 
                day = '0' + day;

            return [day, month, year].join('-');
        
        },

    };
});