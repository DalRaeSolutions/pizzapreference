/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
sap.ui.define([
    "com/dalraesolutions/pizzapreference/pizzapreference/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox"
], function (Controller, JSONModel, MessageBox) {
    "use strict";

    const SLICES_PER_PIZZA = 8;

    return Controller.extend("com.dalraesolutions.pizzapreference.pizzapreference.controller.OrderDetails", {

        onInit: function () {

            this.getView().setModel(new JSONModel({
                order: null,
                slicesPerPerson: 3,
                participants: [],
                sharedPizzas: [],
                customPizzas: [],
                unknownCount: 0,
                unknownPizzas: 0,
                unknownSliceLine: "",
                totalPizzas: 0
            }), "detailsModel");

            this.oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            this.oRouter.getRoute("orderDetails").attachPatternMatched(this.onRoutePatternMatched, this);

        },

        onRoutePatternMatched: function (oEvent) {

            const self = this;
            const orderId = oEvent.getParameter("arguments").orderId;
            this._orderId = orderId;

            const oModel = this.getOwnerComponent().getModel();
            if (!oModel) {
                return;
            }

            const path = "/PizzaOrder(guid'" + orderId + "')";
            oModel.read(path, {
                urlParameters: {
                    "$expand": "participants"
                },
                success: function (oData) {
                    self._applyOrder(oData);
                },
                error: function (oError) {
                    console.error("Order load failed", oError);
                    MessageBox.error("Could not load order. Returning to list.", {
                        onClose: function () {
                            self.oRouter.navTo("list");
                        }
                    });
                }
            });

        },

        _applyOrder: function (order) {

            const dm = this.getView().getModel("detailsModel");

            dm.setProperty("/order", order);
            dm.setProperty("/slicesPerPerson", order.slicesPerPerson || 3);

            const rawParticipants = (order.participants && order.participants.results) || order.participants || [];

            const participants = rawParticipants.map(function (p) {
                return {
                    ID: p.ID,
                    email: p.email,
                    displayName: p.displayName,
                    matched: !!p.matched,
                    pizzaId: p.pizza_ID || null,
                    pizzaName: p.pizzaName || "",
                    pizzaDescription: p.pizzaDescription || "",
                    notes: p.notes || ""
                };
            });

            dm.setProperty("/participants", participants);
            this._recompute();

        },

        _recompute: function () {

            const dm = this.getView().getModel("detailsModel");
            const participants = dm.getProperty("/participants") || [];
            const s = dm.getProperty("/slicesPerPerson") || 3;

            // Shared: matched + no notes → grouped by pizza
            const shared = new Map();
            const custom = [];
            let unknownCount = 0;

            participants.forEach(function (p) {
                if (!p.pizzaId) {
                    unknownCount += 1;
                    return;
                }
                if (p.notes) {
                    custom.push({
                        displayName: p.displayName,
                        pizzaName: p.pizzaName,
                        pizzaDescription: p.pizzaDescription,
                        notes: p.notes
                    });
                    return;
                }
                if (!shared.has(p.pizzaId)) {
                    shared.set(p.pizzaId, {
                        pizzaName: p.pizzaName,
                        pizzaDescription: p.pizzaDescription,
                        people: 0
                    });
                }
                shared.get(p.pizzaId).people += 1;
            });

            const sharedPizzas = Array.from(shared.values()).map(function (row) {
                const pizzaCount = Math.ceil((row.people * s) / SLICES_PER_PIZZA);
                return {
                    pizzaName: row.pizzaName,
                    pizzaDescription: row.pizzaDescription,
                    people: row.people,
                    pizzaCount: pizzaCount,
                    sliceLine: row.people + " × " + s + " slices = " + pizzaCount + " pizza" + (pizzaCount === 1 ? "" : "s")
                };
            }).sort(function (a, b) {
                return b.pizzaCount - a.pizzaCount;
            });

            const unknownPizzas = unknownCount === 0 ? 0 : Math.ceil((unknownCount * s) / SLICES_PER_PIZZA);
            const unknownSliceLine = unknownCount === 0
                ? ""
                : unknownCount + " × " + s + " slices = " + unknownPizzas + " pizza" + (unknownPizzas === 1 ? "" : "s") + " suggested";

            const totalPizzas = sharedPizzas.reduce(function (sum, row) { return sum + row.pizzaCount; }, 0)
                + custom.length
                + unknownPizzas;

            dm.setProperty("/sharedPizzas", sharedPizzas);
            dm.setProperty("/customPizzas", custom);
            dm.setProperty("/unknownCount", unknownCount);
            dm.setProperty("/unknownPizzas", unknownPizzas);
            dm.setProperty("/unknownSliceLine", unknownSliceLine);
            dm.setProperty("/totalPizzas", totalPizzas);

        },

        onSlicesPerPersonChange: function (oEvent) {

            const self = this;
            const newKey = oEvent.getParameter("item").getKey();
            const newValue = parseInt(newKey, 10);

            const dm = this.getView().getModel("detailsModel");
            dm.setProperty("/slicesPerPerson", newValue);
            this._recompute();

            if (!this._orderId) {
                return;
            }

            const oModel = this.getOwnerComponent().getModel();
            const path = "/PizzaOrder(guid'" + this._orderId + "')";
            oModel.update(path, { slicesPerPerson: newValue }, {
                error: function (oError) {
                    console.error("slicesPerPerson update failed", oError);
                    MessageBox.error("Could not save slices per person.");
                }
            });

        },

        onBack: function () {

            if (window.history.length > 1) {
                window.history.back();
            } else {
                this.oRouter.navTo("list");
            }

        },

        onRegenerateOrder: function () {

            const self = this;
            if (!this._orderId) {
                return;
            }

            MessageBox.confirm(
                "Re-match all attendees against current preferences? Snapshot values will be overwritten.",
                {
                    title: "Regenerate order",
                    actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                    emphasizedAction: MessageBox.Action.OK,
                    onClose: function (sAction) {
                        if (sAction !== MessageBox.Action.OK) {
                            return;
                        }

                        const oModel = self.getOwnerComponent().getModel();
                        const path = "/PizzaOrder(guid'" + self._orderId + "')/rematch";

                        oModel.callFunction(path, {
                            method: "POST",
                            success: function () {
                                MessageBox.success("Order regenerated from current preferences.");
                                self._reloadOrder();
                            },
                            error: function (oError) {
                                console.error("rematch failed", oError);
                                MessageBox.error("Regenerate failed.");
                            }
                        });
                    }
                }
            );

        },

        _reloadOrder: function () {

            const self = this;
            const orderId = this._orderId;
            if (!orderId) {
                return;
            }

            const oModel = this.getOwnerComponent().getModel();
            const path = "/PizzaOrder(guid'" + orderId + "')";
            oModel.read(path, {
                urlParameters: {
                    "$expand": "participants"
                },
                success: function (oData) {
                    self._applyOrder(oData);
                },
                error: function (oError) {
                    console.error("Order reload failed", oError);
                }
            });

        }

    });
});
