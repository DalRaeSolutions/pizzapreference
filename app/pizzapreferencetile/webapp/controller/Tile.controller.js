/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
sap.ui.define([
	"com/dalraesolutions/pizzapreference/pizzapreferencetile/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox"
],
	/**
	 * @param {typeof sap.ui.core.mvc.Controller} Controller
	 */
	function (Controller, JSONModel, MessageBox, formatter) {
		"use strict";

		return Controller.extend("com.dalraesolutions.pizzapreference.pizzapreferencetile.controller.Tile", {
    
            onInit: function () {
                
                const self = this;

                var oComponentData = this.getOwnerComponent().getComponentData();
                this._oProperties = (oComponentData && oComponentData.properties) ? oComponentData.properties : {};

                var oTileModel = new JSONModel({
                    title: this._oProperties.title || "Notifications",
                    subTitle: this._oProperties.subtitle || "custom tile",
                    busyChart: false,
                    errors: 0,
                    notifications: 0,
                    pizzaType: "",
                    link: ""
                });

                //this.setModelData(oTileModel, "tileModel");
                this.getView().setModel(oTileModel);
                this.fetchTileData(oTileModel);
			},

            fetchTileData: function(oViewModel){

                const self = this;

                oViewModel.setProperty("/busyChart", true);

                
                this.getTileDataPromise().then(data => {

                    if(data && data.length > 0)
                    {
                        var item = data[0];
                        oViewModel.setProperty('/pizzaType', item.pizza.name);  
                        
                        var pizzaName = item.pizza.name;
                        if(pizzaName && pizzaName.split)
                        {
                            pizzaName = 'pizza+' + pizzaName.split(' ').join('+');
                        }
                        else
                        {
                            pizzaName = '';
                        }
                        var link = `https://www.google.com/search?q=${pizzaName}`;
                        oViewModel.setProperty('/link', link);  

                        oViewModel.setProperty("/busyChart", false);

                    }

                }).catch(oError => {
                    oViewModel.setProperty("/busyChart", false);
                    console.error(oError);
                });
            },

            getTileDataPromise: function()
            {
                const self = this;

                return new Promise((resolve,reject) => {
                    const oModel = self.getOwnerComponent().getModel();
                    if(oModel)
                    {
                        oModel.read("/EmployeePizza",
                            {
                                urlParameters:{
                                    "$expand": "pizza"
                                },
                                success: function(data){ 
                                    resolve(data.results); 
                                },
                                error: function(error){ 
                                    reject(error); 
                                },
                            });
                    }
                    else
                    {
                        reject("Model not found");
                    }
                });
            },

            onPress: function () {
                var sTargetUrl = this._oProperties.targetURL;
        
                if (sTargetUrl) {
                    if (sTargetUrl[0] === "#") {
                        hasher.setHash(sTargetUrl);
                    } else {
                        window.open(sTargetUrl, "_blank");
                    }
                }
            },

            handleLinkPress: function(oEvent) {

                //oEvent.preventDefault();

                const oModel = this.getView().getModel();
                const oModelData = oModel.getData();
                window.open(oModelData.link, "_blank");

            },

           
		});
	});
