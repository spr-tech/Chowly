"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { placeOrder } from "@/app/actions/orders";
import { formatNaira } from "@/lib/money";
import { ACTIVE_ORDER_STORAGE_KEY } from "@/lib/storage";
import { ActiveOrderBanner } from "@/components/ActiveOrderBanner";

// Draft-cart keys: mirror the unsubmitted cart so a role-toggle navigation
// or a refresh doesn't lose it. Cleared (cart only — name/table are kept for
// convenience) once an order is actually placed.
const DRAFT_CUSTOMER_NAME_KEY = "chowly_draft_customer_name";
const DRAFT_TABLE_ID_KEY = "chowly_draft_table_id";
const DRAFT_CART_KEY = "chowly_draft_cart";

interface TableOption {
  id: number;
  number: number;
  occupied: boolean;
}

interface MenuItemOption {
  id: number;
  name: string;
  description: string | null;
  category: "FOOD" | "DRINK";
  priceKobo: number;
  prepTimeMinutes: number;
}

export function CustomerOrderFlow({
  tables,
  menuItems,
}: {
  tables: TableOption[];
  menuItems: MenuItemOption[];
}) {
  const router = useRouter();
  const [tableId, setTableId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [cart, setCart] = useState<Record<number, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Server and first client render must match (both start blank) or React
  // throws a hydration error, so the draft is only read back after mount.
  const [hasHydratedDraft, setHasHydratedDraft] = useState(false);

  useEffect(() => {
    try {
      const storedName = localStorage.getItem(DRAFT_CUSTOMER_NAME_KEY);
      const storedTableId = localStorage.getItem(DRAFT_TABLE_ID_KEY);
      const storedCart = localStorage.getItem(DRAFT_CART_KEY);
      if (storedName) setCustomerName(storedName);
      if (storedTableId) setTableId(storedTableId);
      if (storedCart) setCart(JSON.parse(storedCart));
    } catch {
      // localStorage unavailable (private mode, etc.) — start with a blank draft
    }
    setHasHydratedDraft(true);
  }, []);

  // Mirror every change back to localStorage, but only once the restore
  // above has run — otherwise this fires first, with the initial blank
  // state, and overwrites the very draft we're about to restore.
  useEffect(() => {
    if (!hasHydratedDraft) return;
    try {
      localStorage.setItem(DRAFT_CUSTOMER_NAME_KEY, customerName);
      if (tableId) {
        localStorage.setItem(DRAFT_TABLE_ID_KEY, tableId);
      } else {
        localStorage.removeItem(DRAFT_TABLE_ID_KEY);
      }
      localStorage.setItem(DRAFT_CART_KEY, JSON.stringify(cart));
    } catch {
      // localStorage unavailable — the draft just won't survive a refresh
    }
  }, [customerName, tableId, cart, hasHydratedDraft]);

  const foodItems = menuItems.filter((item) => item.category === "FOOD");
  const drinkItems = menuItems.filter((item) => item.category === "DRINK");

  const cartLines = useMemo(
    () =>
      menuItems
        .filter((item) => (cart[item.id] ?? 0) > 0)
        .map((item) => ({ ...item, quantity: cart[item.id] })),
    [cart, menuItems],
  );

  const totalKobo = cartLines.reduce((sum, line) => sum + line.priceKobo * line.quantity, 0);

  function setQuantity(menuItemId: number, quantity: number) {
    setCart((prev) => ({ ...prev, [menuItemId]: Math.max(0, quantity) }));
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await placeOrder({
        tableId: Number(tableId),
        customerName,
        items: cartLines.map((line) => ({ menuItemId: line.id, quantity: line.quantity })),
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }

      try {
        localStorage.setItem(ACTIVE_ORDER_STORAGE_KEY, result.orderId);
        localStorage.removeItem(DRAFT_CART_KEY);
      } catch {
        // localStorage unavailable — the order still went through, the
        // customer just won't see the "view your current order" link later
      }
      router.push(`/orders/${result.orderId}`);
    });
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4 pb-10">
      <ActiveOrderBanner />

      <div>
        <h1 className="font-serif text-2xl font-semibold">The Juniper Room</h1>
        <p className="text-sm text-muted">14 Palm Avenue, Lagos</p>
      </div>

      <div className="space-y-4 rounded-2xl border border-line bg-paper p-5 shadow-sm">
        <div className="space-y-2">
          <label className="block text-sm font-medium" htmlFor="customerName">
            Your name
          </label>
          <input
            id="customerName"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full rounded-lg border border-line bg-cream p-3 text-base"
            placeholder="e.g. Ada"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium" htmlFor="table">
            Table
          </label>
          <select
            id="table"
            value={tableId}
            onChange={(e) => setTableId(e.target.value)}
            className="w-full rounded-lg border border-line bg-cream p-3 text-base"
          >
            <option value="">Select a table…</option>
            {tables.map((table) => (
              <option key={table.id} value={table.id} disabled={table.occupied}>
                Table {table.number}
                {table.occupied ? " (occupied)" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      <MenuSection title="Food" items={foodItems} cart={cart} setQuantity={setQuantity} />
      <MenuSection title="Drinks" items={drinkItems} cart={cart} setQuantity={setQuantity} />

      <div className="space-y-3 rounded-2xl border border-line bg-paper p-5 shadow-sm">
        <h2 className="font-serif text-lg font-semibold">Your order</h2>
        {cartLines.length === 0 ? (
          <p className="text-sm text-muted">No items yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {cartLines.map((line) => (
              <li key={line.id} className="flex justify-between py-2">
                <span>
                  {line.quantity} x {line.name}
                </span>
                <span>{formatNaira(line.priceKobo * line.quantity)}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="text-right font-semibold">Total: {formatNaira(totalKobo)}</div>
      </div>

      {error && <p className="text-sm font-medium text-ink">{error}</p>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isPending || !tableId || !customerName.trim() || cartLines.length === 0}
        className="w-full rounded-full bg-terracotta px-4 py-3 text-base font-semibold text-white shadow-sm disabled:opacity-50"
      >
        {isPending ? "Placing order…" : "Place Order"}
      </button>
    </main>
  );
}

function MenuSection({
  title,
  items,
  cart,
  setQuantity,
}: {
  title: string;
  items: MenuItemOption[];
  cart: Record<number, number>;
  setQuantity: (menuItemId: number, quantity: number) => void;
}) {
  return (
    <div>
      <h2 className="mb-2 font-serif text-lg font-semibold">{title}</h2>
      <ul className="divide-y divide-line rounded-2xl border border-line bg-paper shadow-sm">
        {items.map((item) => {
          const quantity = cart[item.id] ?? 0;
          return (
            <li key={item.id} className="flex items-center justify-between gap-4 p-4">
              <div className="space-y-1">
                <p className="font-medium">{item.name}</p>
                {item.description && <p className="text-sm text-muted">{item.description}</p>}
                <p className="text-sm text-muted">
                  {formatNaira(item.priceKobo)} · ~{item.prepTimeMinutes} min
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => setQuantity(item.id, quantity - 1)}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-line text-lg leading-none"
                  aria-label={`Remove one ${item.name}`}
                >
                  −
                </button>
                <span className="w-4 text-center text-base">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity(item.id, quantity + 1)}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-line text-lg leading-none"
                  aria-label={`Add one ${item.name}`}
                >
                  +
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
