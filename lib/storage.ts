// localStorage key for the id of the order this browser most recently placed.
// Written once placeOrder succeeds, read by ActiveOrderBanner on the landing
// page, cleared once that order reaches PAID. Not a session or auth
// mechanism — purely a convenience so a customer can find their way back to
// an order they placed.
export const ACTIVE_ORDER_STORAGE_KEY = "chowly_active_order";

// Session keys: written by the landing page's "Start ordering" button,
// read by /menu on mount. This is the entire mechanism carrying the
// customer's name and table choice across the route boundary — there is no
// server-side session, cookie, or auth behind it.
export const SESSION_CUSTOMER_NAME_KEY = "chowly_customer_name";
export const SESSION_TABLE_ID_KEY = "chowly_table_id";
export const SESSION_TABLE_NUMBER_KEY = "chowly_table_number";

// Draft-cart key: mirrors the unsubmitted cart on /menu so a refresh or a
// role-toggle round trip doesn't lose it. Cleared once an order is placed.
export const DRAFT_CART_KEY = "chowly_draft_cart";
