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
            const vm = this.getView().getModel("viewModel");

            return this.odataFunction("currentUser")
                .then(function (result) {
                    const info = {
                        id: result ? result.id : null,
                        displayName: result && result.displayName ? result.displayName : (result && result.id) || "",
                        isEater: !!(result && result.isEater),
                        isOrderer: !!(result && result.isOrderer)
                    };
                    vm.setProperty("/currentUserId", info.id);
                    vm.setProperty("/currentUserDisplayName", info.displayName);
                    vm.setProperty("/isEater", info.isEater);
                    vm.setProperty("/isOrderer", info.isOrderer);
                    return info;
                })
                .catch(function (err) {
                    console.error("currentUser failed", err);
                    return { isEater: false, isOrderer: false };
                });

        },

        loadPizzas: function () {

            const self = this;
            return this.odataCollection("Pizza")
                .then(function (rows) {
                    self.setModelData({ results: rows }, "pizzaModel");
                })
                .catch(function (err) {
                    console.error("loadPizzas failed", err);
                });

        },

        loadPreference: function () {

            const self = this;
            const vm = this.getView().getModel("viewModel");
            const currentUserId = vm.getProperty("/currentUserId");

            const params = {
                "$expand": "pizza",
                "$orderby": "modifiedAt desc",
                "$top": "1"
            };
            if (currentUserId) {
                params["$filter"] = "employeeId eq '" + currentUserId.replace(/'/g, "''") + "'";
            }

            return this.odataCollection("EmployeePizza", params)
                .then(function (rows) {
                    const record = rows.length > 0 ? rows[0] : null;
                    vm.setProperty("/preference", record);
                })
                .catch(function (err) {
                    console.error("loadPreference failed", err);
                });

        },

        loadOrders: function () {

            const self = this;
            const params = {
                "$expand": "participants",
                "$orderby": "occurredAt desc,createdAt desc"
            };

            return this.odataCollection("PizzaOrder", params)
                .then(function (rows) {
                    const orders = rows.map(function (o) {
                        const participants = o.participants || [];
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
                })
                .catch(function (err) {
                    console.error("loadOrders failed", err);
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

            const payload = {
                pizza_ID: data.pizza_ID,
                notes: data.notes || ""
            };

            const onSuccess = function () {
                self._pDialog.then(function (oDialog) { oDialog.close(); });
                MessageBox.success("Preference saved.");
                self.loadPreference();
            };

            const onError = function (err) {
                console.error("savePreference failed", err);
                MessageBox.error("Save failed.");
            };

            if (data.ID) {
                this.odataPatch("EmployeePizza", data.ID, payload).then(onSuccess).catch(onError);
            } else {
                this.odataCreate("EmployeePizza", payload).then(onSuccess).catch(onError);
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
                    self.odataDelete("EmployeePizza", pref.ID)
                        .then(function () {
                            MessageBox.success("Preference deleted.");
                            self.loadPreference();
                        })
                        .catch(function (err) {
                            console.error("deletePreference failed", err);
                            MessageBox.error("Delete failed.");
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

            this.odataAction("/createOrderFromPaste", {
                title: data.title,
                occurredAt: data.occurredAt,
                paste: data.paste
            })
                .then(function (result) {
                    self._pCreateOrderDialog.then(function (oDialog) { oDialog.close(); });
                    MessageBox.success("Order created.");
                    self.loadOrders();
                    if (result && result.ID) {
                        self.oRouter.navTo("orderDetails", { orderId: result.ID });
                    }
                })
                .catch(function (err) {
                    console.error("createOrderFromPaste failed", err);
                    MessageBox.error("Could not create order. Check that the pasted text contains attendees.");
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
                    self.odataDelete("PizzaOrder", order.ID)
                        .then(function () {
                            MessageBox.success("Order deleted.");
                            self.loadOrders();
                        })
                        .catch(function (err) {
                            console.error("deleteOrder failed", err);
                            MessageBox.error("Delete failed.");
                        });
                }
            });

        }

    });
});
