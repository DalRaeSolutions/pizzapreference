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
                
                const self = this;

                this.oRouter = sap.ui.core.UIComponent.getRouterFor(this);
                this.oRouter.getRoute("list").attachPatternMatched(this.onRoutePatternMatched, this);

                const oModel = self.getOwnerComponent().getModel();
                oModel.attachRequestCompleted(function(oEvent) {
                 
                    //console.log(oEvent);
                    self.onSetListCount();

                });

			},

            onRoutePatternMatched: function(oEvent) {

                const self = this;

                this._employee_ID = self.getUserEmail() || "info@dalraesolutions.com.au";

                self.scrollToTop();
                self.onLoadList();

            },

            onLoadList: function() {
                const self = this;

                const oTable = this.getView().byId("idEmployeePizzaRequestList");
                if(oTable)
                {
                    var oFilter = new sap.ui.model.Filter('employeeId', sap.ui.model.FilterOperator.EQ, this._employee_ID);
                    var oBinding = oTable.getBinding("items");
                    oBinding.filter([oFilter]);
                }
            },

            onSetListCount: function() {
                const self = this;

                let recordCount = 0;

                const oTable = this.getView().byId("idEmployeePizzaRequestList");
                if(oTable)
                {
                    var oBinding = oTable.getBinding("items");
                    recordCount = oBinding.getLength();
                    self.setModelData({ count: recordCount }, "listModel");
                }
            },

            onCreateonEmployeePizzaRequest: function() {

                this.oRouter.navTo("create");

            },

            onDeleteEmployeePizza: function(oEvent)
            {
                const self = this;
                const id = oEvent.getSource().data("id");
                const oModel = self.getOwnerComponent().getModel();
    
                MessageBox.confirm("Are you sure you wish to delete?",{
    
                    title: "Confirm",                                    // default
                    onClose: function (oAction){
                        if(oAction === sap.m.MessageBox.Action.OK)
                        {
                            self.getOdataDeletePromise(oModel, `/EmployeePizza(${id})`).then(response => {
                
                                MessageBox.success('Pizza Deleted');
                
                            }).catch(oError => {
                                //MessageBox.error(error);
                                console.log(oError);
                                MessageBox.error("Unable to delete Pizza.");
                            });
                        }
                    },                                       // default
                    styleClass: "",                                      // default
                    actions: [ sap.m.MessageBox.Action.OK,
                               sap.m.MessageBox.Action.CANCEL ],         // default
                    emphasizedAction: sap.m.MessageBox.Action.OK,        // default
                    initialFocus: null,                                  // default
                    textDirection: sap.ui.core.TextDirection.Inherit     // default
    
                });

            }

           
		});
	});
