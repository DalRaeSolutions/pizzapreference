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

		return Controller.extend("com.dalraesolutions.pizzapreference.pizzapreference.controller.Create", {
    
            onInit: function () {
                this.oRouter = sap.ui.core.UIComponent.getRouterFor(this);
                this.oRouter.getRoute("create").attachPatternMatched(this.onRoutePatternMatched, this);
			},

            onRoutePatternMatched: function(oEvent) {
                const self = this;

                self.scrollToTop();

                this._employee_ID = self.getUserEmail() || "info@dalraesolutions.com.au";

                this.onLoadPizzaModel();

                this.onNewModel();
                
            },

            onLoadPizzaModel: function() {
                
                var oModel = this.getOwnerComponent().getModel();
                if(oModel)
                {
                    oModel.read(`/Pizza`, {
                        success: function (oData) {
                            
                            this.setModelData(oData, "pizzaModel");

                        }.bind(this),
                        error: function (oError) {
                            
                            console.error('Equipment not found.');

                        }.bind(this)
                    });
                }
                
                
            },

            onNewModel: function() {
                
               this.setModelData({ employeeId: this._employee_ID, pizza_ID: null, notes: "" }, "employeePizzaRecord");

            },

            onValidate: function()
            {
                const self = this;

                var isValid = true;
                var reasons = [];
                const data = self.getModelData("employeePizzaRecord");
                if(data)
                {
                    if(!data.pizza_ID || data.pizza_ID === null || data.pizza_ID === '')
                    {
                        isValid = false;
                        reasons.push("Pizza is a required field.");
                    }

                    if(!data.notes || data.notes === null || data.notes === '')
                    {
                        isValid = false;
                        reasons.push("Notes is a required field.");
                    }

                }
                else
                {
                    isValid = false;
                    reasons.push("model error.");
                }
                return { isValid: isValid, reasons: reasons };
            },

            onCancel: function() {

                this.oRouter.navTo("list");

            },

            onCreateOk: function(){

                this.oRouter.navTo("list");

            },


            onCreateEmployeePizzaRequest: function() {

                const self = this;
                const validationResponse = this.onValidate();
                if(validationResponse && validationResponse.isValid)
                {
                    const employeePizzaRecord = this.getModelData("employeePizzaRecord");
                    const oModel = this.getOwnerComponent().getModel();
                    if(oModel)
                    {
                        const path = `/EmployeePizza`;
                        oModel.create(path,
                            employeePizzaRecord, 
                            {
                                success: function(data) { 
                                    MessageBox.success("Record created", { onClose: function(){ self.oRouter.navTo("list"); } }); 
                                },
                                error: function(error) { 
                                    console.error(error);
                                    MessageBox.error("Error: " + error);
                                },
                            });
                    }
                    else
                    {
                        MessageBox.error("Error.");
                    }
                    
                }
                else
                {
                    if(validationResponse)
                    {
                        const message = validationResponse.reasons.join('\r\n');
                        MessageBox.warning(message);
                    }
                    else
                    {
                        MessageBox.error("Error.");
                    }
                }

            },

            

		});
	});
