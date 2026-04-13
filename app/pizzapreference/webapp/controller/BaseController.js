/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "com/dalraesolutions/pizzapreference/pizzapreference/model/formatter"
],
    function (Controller, JSONModel, formatter) {
        "use strict";

        const ODATA_BASE = "/odata/v4/pizza";

        function buildQuery(params) {
            if (!params) return "";
            const parts = [];
            Object.keys(params).forEach(function (k) {
                if (params[k] === undefined || params[k] === null) return;
                parts.push(k + "=" + encodeURIComponent(params[k]));
            });
            return parts.length ? "?" + parts.join("&") : "";
        }

        function handleResponse(response) {
            if (response.status === 204) return null;
            if (!response.ok) {
                return response.text().then(function (body) {
                    const err = new Error("HTTP " + response.status + " " + response.statusText);
                    err.status = response.status;
                    err.body = body;
                    throw err;
                });
            }
            return response.json();
        }

        return Controller.extend("com.dalraesolutions.pizzapreference.pizzapreference.controller.BaseController", {

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

            odataGet: function (path, queryParams) {
                return fetch(ODATA_BASE + path + buildQuery(queryParams), {
                    headers: { "Accept": "application/json" }
                }).then(handleResponse);
            },

            odataFunction: function (name, queryParams) {
                return this.odataGet("/" + name + "()", queryParams);
            },

            odataCollection: function (entitySet, queryParams) {
                return this.odataGet("/" + entitySet, queryParams).then(function (data) {
                    return (data && data.value) ? data.value : [];
                });
            },

            odataEntity: function (entitySet, key, queryParams) {
                return this.odataGet("/" + entitySet + "(" + key + ")", queryParams);
            },

            odataCreate: function (entitySet, payload) {
                return fetch(ODATA_BASE + "/" + entitySet, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    },
                    body: JSON.stringify(payload || {})
                }).then(handleResponse);
            },

            odataPatch: function (entitySet, key, payload) {
                return fetch(ODATA_BASE + "/" + entitySet + "(" + key + ")", {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    },
                    body: JSON.stringify(payload || {})
                }).then(handleResponse);
            },

            odataDelete: function (entitySet, key) {
                return fetch(ODATA_BASE + "/" + entitySet + "(" + key + ")", {
                    method: "DELETE"
                }).then(handleResponse);
            },

            odataAction: function (path, payload) {
                return fetch(ODATA_BASE + path, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    },
                    body: JSON.stringify(payload || {})
                }).then(handleResponse);
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
                try { window.localStorage.clear(); } catch (e) { /* ignored */ }
                try { window.sessionStorage.clear(); } catch (e) { /* ignored */ }
                document.cookie.split(";").forEach(function (c) {
                    const name = c.split("=")[0].trim();
                    if (!name) return;
                    document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
                    document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=" + window.location.hostname;
                });
                window.location.assign("/api/logout");
            }

        });
    });
