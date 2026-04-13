/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
sap.ui.define([
    "com/dalraesolutions/pizzapreference/pizzapreference/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/Fragment",
    "sap/m/MessageBox"
], function (Controller, JSONModel, Fragment, MessageBox) {
    "use strict";

    return Controller.extend("com.dalraesolutions.pizzapreference.pizzapreference.controller.List", {

        onInit: function () {

            this.getView().setModel(new JSONModel({
                preference: null,
                isEater: false,
                isOrderer: false
            }), "viewModel");

            this.oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            this.oRouter.getRoute("list").attachPatternMatched(this.onRoutePatternMatched, this);

        },

        onRoutePatternMatched: function () {

            this.scrollToTop();
            this.loadCurrentUser();
            this.loadPizzas();
            this.loadPreference();

        },

        loadCurrentUser: function () {

            const self = this;
            const oModel = this.getOwnerComponent().getModel();
            if (!oModel) {
                return;
            }

            oModel.callFunction("/currentUser", {
                method: "GET",
                success: function (oData) {
                    const result = (oData && oData.currentUser) ? oData.currentUser : oData;
                    const vm = self.getView().getModel("viewModel");
                    vm.setProperty("/isEater", !!(result && result.isEater));
                    vm.setProperty("/isOrderer", !!(result && result.isOrderer));
                },
                error: function (oError) {
                    console.error("currentUser failed", oError);
                }
            });

        },

        loadPizzas: function () {

            const self = this;
            const oModel = this.getOwnerComponent().getModel();
            if (!oModel) {
                return;
            }

            oModel.read("/Pizza", {
                success: function (oData) {
                    self.setModelData(oData, "pizzaModel");
                },
                error: function (oError) {
                    console.error("loadPizzas failed", oError);
                }
            });

        },

        loadPreference: function () {

            const self = this;
            const oModel = this.getOwnerComponent().getModel();
            if (!oModel) {
                return;
            }

            oModel.read("/EmployeePizza", {
                urlParameters: {
                    "$expand": "pizza",
                    "$orderby": "modifiedAt desc",
                    "$top": "1"
                },
                success: function (oData) {
                    const record = (oData && oData.results && oData.results.length > 0) ? oData.results[0] : null;
                    self.getView().getModel("viewModel").setProperty("/preference", record);
                },
                error: function (oError) {
                    console.error("loadPreference failed", oError);
                }
            });

        },

        onOpenPreferenceDialog: function () {

            const self = this;
            const existing = this.getView().getModel("viewModel").getProperty("/preference");

            this.setModelData({
                ID: existing ? existing.ID : null,
                pizza_ID: existing ? existing.pizza_ID : null,
                notes: existing ? existing.notes : ""
            }, "dialogModel");

            if (!this._pDialog) {
                this._pDialog = Fragment.load({
                    id: this.getView().getId(),
                    name: "com.dalraesolutions.pizzapreference.pizzapreference.view.PreferenceDialog",
                    controller: this
                }).then(function (oDialog) {
                    self.getView().addDependent(oDialog);
                    return oDialog;
                });
            }

            this._pDialog.then(function (oDialog) {
                oDialog.open();
            });

        },

        onCancelPreference: function () {

            if (!this._pDialog) {
                return;
            }
            this._pDialog.then(function (oDialog) {
                oDialog.close();
            });

        },

        onSavePreference: function () {

            const self = this;
            const data = this.getModelData("dialogModel");

            if (!data || !data.pizza_ID) {
                MessageBox.warning("Pizza is required.");
                return;
            }

            const oModel = this.getOwnerComponent().getModel();
            const payload = {
                pizza_ID: data.pizza_ID,
                notes: data.notes
            };

            const onSuccess = function () {
                self._pDialog.then(function (oDialog) { oDialog.close(); });
                MessageBox.success("Preference saved.");
                self.loadPreference();
            };

            const onError = function (oError) {
                console.error("savePreference failed", oError);
                MessageBox.error("Save failed.");
            };

            if (data.ID) {
                oModel.update("/EmployeePizza(guid'" + data.ID + "')", payload, {
                    success: onSuccess,
                    error: onError
                });
            } else {
                oModel.create("/EmployeePizza", payload, {
                    success: onSuccess,
                    error: onError
                });
            }

        },

        onDeletePreference: function () {

            const self = this;
            const pref = this.getView().getModel("viewModel").getProperty("/preference");
            if (!pref) {
                return;
            }

            MessageBox.confirm("Delete your pizza preference?", {
                title: "Confirm",
                actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                emphasizedAction: MessageBox.Action.OK,
                onClose: function (sAction) {
                    if (sAction !== MessageBox.Action.OK) {
                        return;
                    }
                    const oModel = self.getOwnerComponent().getModel();
                    oModel.remove("/EmployeePizza(guid'" + pref.ID + "')", {
                        success: function () {
                            MessageBox.success("Preference deleted.");
                            self.loadPreference();
                        },
                        error: function (oError) {
                            console.error("deletePreference failed", oError);
                            MessageBox.error("Delete failed.");
                        }
                    });
                }
            });

        }

    });
});
