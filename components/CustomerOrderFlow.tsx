"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { placeOrder } from "@/app/actions/orders";
import { formatNaira } from "@/lib/money";
import { ACTIVE_ORDER_STORAGE_KEY } from "@/lib/storage";
import { ActiveOrderBanner } from "@/components/ActiveOrderBanner";
import { HeroIllustration } from "@/components/HeroIllustration";

const FOCUS_RING_CLASSES =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta focus-visible:ring-offset-2 focus-visible:ring-offset-cream";

function SparkleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor" aria-hidden="true">
      <path d="M12 0l2 10 10 2-10 2-2 10-2-10L0 12l10-2z" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M12 21s-7-6.5-7-11a7 7 0 1 1 14 0c0 4.5-7 11-7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

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
    let cancelled = false;
    try {
      const storedName = localStorage.getItem(DRAFT_CUSTOMER_NAME_KEY);
      const storedTableId = localStorage.getItem(DRAFT_TABLE_ID_KEY);
      const storedCart = localStorage.getItem(DRAFT_CART_KEY);
      setTimeout(() => {
        if (cancelled) return;
        if (storedName) setCustomerName(storedName);
        if (storedTableId) setTableId(storedTableId);
        if (storedCart) setCart(JSON.parse(storedCart));
        setHasHydratedDraft(true);
      }, 0);
    } catch {
      // localStorage unavailable (private mode, etc.) — start with a blank draft
      setTimeout(() => {
        if (!cancelled) setHasHydratedDraft(true);
      }, 0);
    }
    return () => {
      cancelled = true;
    };
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
    <main>
      <section className="bg-cream">
        <div className="mx-auto max-w-[1200px] px-4 py-12 md:py-20">
          <ActiveOrderBanner />

          <div className="mt-6 grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div className="space-y-6">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-saffron/30 px-3 py-1 text-xs font-semibold text-ink">
                <SparkleIcon />
                Your table, your space
              </span>

              <h1 className="font-serif text-4xl leading-[1.05] font-semibold sm:text-5xl md:text-6xl lg:text-7xl">
                <span className="block text-ink">Good food.</span>
                <span className="relative inline-block text-terracotta">
                  No fuss.
                  <svg
                    viewBox="0 0 220 24"
                    aria-hidden="true"
                    className="absolute -bottom-3 left-0 w-full -rotate-2 text-saffron"
                  >
                    <path
                      d="M4 14C40 6 90 4 140 9C165 11.5 185 14 214 18C214 20 214 21 213 22C185 17 160 14 130 13C90 12 45 15 6 21C3 19 3 16 4 14Z"
                      fill="currentColor"
                    />
                  </svg>
                </span>
              </h1>

              <p className="text-base text-muted">Good food. Easy moments.</p>

              <div className="space-y-4 rounded-2xl border border-line bg-paper p-5 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="flex-1 space-y-2">
                    <label className="block text-sm font-medium" htmlFor="customerName">
                      Your name
                    </label>
                    <input
                      id="customerName"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className={`w-full rounded-lg border border-line bg-cream p-3 text-base ${FOCUS_RING_CLASSES}`}
                      placeholder="e.g. Ada"
                    />
                  </div>

                  <div className="space-y-2 sm:w-40">
                    <label className="block text-sm font-medium" htmlFor="table">
                      Table
                    </label>
                    <select
                      id="table"
                      value={tableId}
                      onChange={(e) => setTableId(e.target.value)}
                      className={`w-full rounded-lg border border-line bg-cream p-3 text-base ${FOCUS_RING_CLASSES}`}
                    >
                      <option value="">Select…</option>
                      {tables.map((table) => (
                        <option key={table.id} value={table.id} disabled={table.occupied}>
                          Table {table.number}
                          {table.occupied ? " (occupied)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <a
                  href="#menu"
                  className={`flex w-full items-center justify-center gap-2 rounded-full bg-terracotta px-4 py-3 text-base font-semibold text-white shadow-sm ${FOCUS_RING_CLASSES}`}
                >
                  Start ordering
                  <span aria-hidden="true">→</span>
                </a>
              </div>

              <p className="flex items-center gap-1.5 text-sm text-muted">
                <PinIcon />
                14 Palm Avenue, Lagos
              </p>
            </div>

            <HeroIllustration />
          </div>
        </div>
      </section>

      <section id="menu" className="mx-auto max-w-2xl space-y-6 p-4 pb-10">
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
          className={`w-full rounded-full bg-terracotta px-4 py-3 text-base font-semibold text-white shadow-sm disabled:opacity-50 ${FOCUS_RING_CLASSES}`}
        >
          {isPending ? "Placing order…" : "Place Order"}
        </button>
      </section>
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
