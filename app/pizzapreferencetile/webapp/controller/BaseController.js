/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
sap.ui.define([
	"sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "com/dalraesolutions/pizzapreference/pizzapreferencetile/model/formatter"
],
	/**
	 * @param {typeof sap.ui.core.mvc.Controller} Controller
	 */
	function (Controller, JSONModel, formatter) {
		"use strict";

		return Controller.extend("com.dalraesolutions.pizzapreference.pizzapreferencetile.controller.BaseController", {

            formatter: formatter,

            getUserId: function() {
                if(sap.ushell)
                {
                    const userInfo = sap.ushell.Container.getService("UserInfo");
                    if(userInfo && userInfo.getId)
                    {
                        return userInfo.getId();                    
                    }
                }
                return "";
            },

            getUserEmail: function() {
                if(sap.ushell)
                {
                    const userInfo = sap.ushell.Container.getService("UserInfo");
                    if(userInfo && userInfo.getEmail)
                    {
                        return userInfo.getEmail();                    
                    }
                }
                return "";
            },
            
            getModelData: function(modelName){
                const self = this;
                const model = self.getView().getModel(modelName);
                if(!model)
                {
                    return {};
                }
                const data = model.getData();
                return data;
            },

            setModelData: function(data, modelName)
            {
                const self = this;
                const model = new JSONModel();
                model.setData(data);
                self.getView().setModel(model, modelName);
                self.getView().getModel(modelName).refresh();
            },

            getOdataCreatePromise: function(model, path, payload)
            {
                return new Promise((resolve,reject) => {
                    if(model)
                    {
                        model.create(path,
                            payload, 
                            {
                                success: function(data){ 
                                    resolve(data); 
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

            getOdataUpdatePromise: function(model, path, payload)
            {
                return new Promise((resolve,reject) => {
                    if(model)
                    {
                        model.update(path,
                            payload, 
                            {
                                success: function(data){ 
                                    resolve(data); 
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

            getOdataDeletePromise: function(model, path)
            {
                return new Promise((resolve,reject) => {
                    if(model)
                    {
                        model.remove(path,
                            {
                                success: function(data){ 
                                    resolve(data); 
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


            grep: function(items, callback) {
                var filtered = [],
                    len = items ? items.length : 0,
                    i = 0;
                for (i; i < len; i++) {
                    var item = items[i];
                    var cond = callback(item);
                    if (cond) {
                        filtered.push(item);
                    }
                }
                return filtered;
            },

            dynamicSort: function(property) {
                var sortOrder = 1;
                if(property[0] === "-") {
                    sortOrder = -1;
                    property = property.substr(1);
                }
                return function (a,b) {
                    var result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
                    return result * sortOrder;
                }
            },

            scrollToTop: function(){
                const self = this;
                var oPage = this.getView().byId("idPage");
                if(oPage)
                {
                    oPage.scrollTo(0,0);
                }
            },

            clone: function(source){
                return Object.assign({}, source);
            },

            onLogout: function(){
                sap.m.URLHelper.redirect("./logout.html", false);
            }
            
        });
    });
