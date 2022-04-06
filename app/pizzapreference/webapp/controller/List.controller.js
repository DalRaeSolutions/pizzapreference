/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
sap.ui.define([
	"com/dalraesolutions/pizzapreference/pizzapreference/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox"
],
	/**
	 * @param {typeof sap.ui.core.mvc.Controller} Controller
	 */
	function (Controller, JSONModel, MessageBox, formatter) {
		"use strict";

		return Controller.extend("com.dalraesolutions.pizzapreference.pizzapreference.controller.List", {
    
            onInit: function () {

                this.oRouter = sap.ui.core.UIComponent.getRouterFor(this);
                this.oRouter.getRoute("list").attachPatternMatched(this.onRoutePatternMatched, this);
			},

            onRoutePatternMatched: function(oEvent) {

                this._employee_ID = oEvent.getParameter("arguments").id || "info@dalraesolutions.com.au";

                const self = this;
                self.scrollToTop();
                self.onLoadList();

            },

            onLoadList: function() {
                
                const oTable = this.getView().byId("idEmployeePizzaRequestList");
                if(oTable)
                {
                    var oFilter = new sap.ui.model.Filter('employeeId', sap.ui.model.FilterOperator.EQ, this._employee_ID);
                    var oBinding = oTable.getBinding("items");
                    oBinding.filter([oFilter]);

                }
            },

            onCreateonEmployeePizzaRequest: function() {

                this.oRouter.navTo("create");

            }

           
		});
	});
