// localStorage key for the id of the order this browser most recently placed.
// Written by CustomerOrderFlow once placeOrder succeeds, read by
// ActiveOrderBanner on the landing page, cleared by CustomerOrderActions once
// that order reaches PAID. Not a session or auth mechanism — purely a
// convenience so a customer can find their way back to an order they placed.
export const ACTIVE_ORDER_STORAGE_KEY = "chowly_active_order";
