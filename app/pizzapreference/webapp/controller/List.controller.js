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
                orders: [],
                currentUserId: null,
                currentUserDisplayName: "",
                showUserHeader: !sap.ushell,
                isEater: false,
                isOrderer: false
            }), "viewModel");

            this.oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            this.oRouter.getRoute("list").attachPatternMatched(this.onRoutePatternMatched, this);

        },

        onRoutePatternMatched: function () {

            const self = this;

            this.scrollToTop();
            this.loadPizzas();

            this.loadCurrentUser().then(function (info) {
                if (info && info.isEater) {
                    self.loadPreference();
                }
                if (info && info.isOrderer) {
                    self.loadOrders();
                }
            });

        },

        loadCurrentUser: function () {

            const self = this;
            const oModel = this.getOwnerComponent().getModel();

            return new Promise(function (resolve) {
                if (!oModel) {
                    resolve({ isEater: false, isOrderer: false });
                    return;
                }
                oModel.callFunction("/currentUser", {
                    method: "GET",
                    success: function (oData) {
                        const result = (oData && oData.currentUser) ? oData.currentUser : oData;
                        const info = {
                            id: result ? result.id : null,
                            displayName: result && result.displayName ? result.displayName : (result && result.id) || "",
                            isEater: !!(result && result.isEater),
                            isOrderer: !!(result && result.isOrderer)
                        };
                        const vm = self.getView().getModel("viewModel");
                        vm.setProperty("/currentUserId", info.id);
                        vm.setProperty("/currentUserDisplayName", info.displayName);
                        vm.setProperty("/isEater", info.isEater);
                        vm.setProperty("/isOrderer", info.isOrderer);
                        resolve(info);
                    },
                    error: function (oError) {
                        console.error("currentUser failed", oError);
                        resolve({ isEater: false, isOrderer: false });
                    }
                });
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

            const currentUserId = this.getView().getModel("viewModel").getProperty("/currentUserId");

            const urlParameters = {
                "$expand": "pizza",
                "$orderby": "modifiedAt desc",
                "$top": "1"
            };
            if (currentUserId) {
                urlParameters["$filter"] = "employeeId eq '" + currentUserId.replace(/'/g, "''") + "'";
            }

            oModel.read("/EmployeePizza", {
                urlParameters: urlParameters,
                success: function (oData) {
                    const record = (oData && oData.results && oData.results.length > 0) ? oData.results[0] : null;
                    self.getView().getModel("viewModel").setProperty("/preference", record);
                },
                error: function (oError) {
                    console.error("loadPreference failed", oError);
                }
            });

        },

        loadOrders: function () {

            const self = this;
            const oModel = this.getOwnerComponent().getModel();
            if (!oModel) {
                return;
            }

            oModel.read("/PizzaOrder", {
                urlParameters: {
                    "$expand": "participants",
                    "$orderby": "occurredAt desc,createdAt desc"
                },
                success: function (oData) {
                    const rows = (oData && oData.results) ? oData.results : [];
                    const orders = rows.map(function (o) {
                        const participants = (o.participants && o.participants.results) || o.participants || [];
                        let matched = 0;
                        let unmatched = 0;
                        participants.forEach(function (p) {
                            if (p.matched) matched += 1;
                            else unmatched += 1;
                        });
                        return {
                            ID: o.ID,
                            title: o.title,
                            occurredAt: o.occurredAt,
                            slicesPerPerson: o.slicesPerPerson,
                            participantCount: participants.length,
                            matchedCount: matched,
                            unmatchedCount: unmatched
                        };
                    });
                    self.getView().getModel("viewModel").setProperty("/orders", orders);
                },
                error: function (oError) {
                    console.error("loadOrders failed", oError);
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
                notes: data.notes || ""
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

        },

        onOpenCreateOrderDialog: function () {

            const self = this;

            this.setModelData({
                title: "",
                occurredAt: new Date().toISOString().slice(0, 10),
                paste: ""
            }, "createOrderModel");

            if (!this._pCreateOrderDialog) {
                this._pCreateOrderDialog = Fragment.load({
                    id: this.getView().getId(),
                    name: "com.dalraesolutions.pizzapreference.pizzapreference.view.CreateOrderDialog",
                    controller: this
                }).then(function (oDialog) {
                    self.getView().addDependent(oDialog);
                    return oDialog;
                });
            }

            this._pCreateOrderDialog.then(function (oDialog) {
                oDialog.open();
            });

        },

        onCancelCreateOrder: function () {

            if (!this._pCreateOrderDialog) {
                return;
            }
            this._pCreateOrderDialog.then(function (oDialog) {
                oDialog.close();
            });

        },

        onSaveCreateOrder: function () {

            const self = this;
            const data = this.getModelData("createOrderModel");

            const reasons = [];
            if (!data || !data.title || !data.title.trim()) {
                reasons.push("Title is required.");
            }
            if (!data || !data.occurredAt) {
                reasons.push("Date is required.");
            }
            if (!data || !data.paste || !data.paste.trim()) {
                reasons.push("Attendees paste is required.");
            }
            if (reasons.length > 0) {
                MessageBox.warning(reasons.join("\n"));
                return;
            }

            const oModel = this.getOwnerComponent().getModel();

            oModel.callFunction("/createOrderFromPaste", {
                method: "POST",
                urlParameters: {
                    title: data.title,
                    occurredAt: data.occurredAt,
                    paste: data.paste
                },
                success: function (oData) {
                    const result = (oData && oData.createOrderFromPaste) ? oData.createOrderFromPaste : oData;
                    self._pCreateOrderDialog.then(function (oDialog) { oDialog.close(); });
                    MessageBox.success("Order created.");
                    self.loadOrders();
                    if (result && result.ID) {
                        self.oRouter.navTo("orderDetails", { orderId: result.ID });
                    }
                },
                error: function (oError) {
                    console.error("createOrderFromPaste failed", oError);
                    MessageBox.error("Could not create order. Check that the pasted text contains attendees.");
                }
            });

        },

        onOrderPress: function (oEvent) {

            const oContext = oEvent.getSource().getBindingContext("viewModel");
            if (!oContext) {
                return;
            }
            const order = oContext.getObject();
            if (order && order.ID) {
                this.oRouter.navTo("orderDetails", { orderId: order.ID });
            }

        },

        onDeleteOrder: function (oEvent) {

            const self = this;
            const oContext = oEvent.getSource().getBindingContext("viewModel");
            if (!oContext) {
                return;
            }
            const order = oContext.getObject();
            if (!order || !order.ID) {
                return;
            }

            MessageBox.confirm("Delete order '" + order.title + "'?", {
                title: "Confirm",
                actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                emphasizedAction: MessageBox.Action.OK,
                onClose: function (sAction) {
                    if (sAction !== MessageBox.Action.OK) {
                        return;
                    }
                    const oModel = self.getOwnerComponent().getModel();
                    oModel.remove("/PizzaOrder(guid'" + order.ID + "')", {
                        success: function () {
                            MessageBox.success("Order deleted.");
                            self.loadOrders();
                        },
                        error: function (oError) {
                            console.error("deleteOrder failed", oError);
                            MessageBox.error("Delete failed.");
                        }
                    });
                }
            });

        }

    });
});
