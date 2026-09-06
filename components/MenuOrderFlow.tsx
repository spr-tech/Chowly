"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { placeOrder } from "@/app/actions/orders";
import { formatNaira } from "@/lib/money";
import { FOCUS_RING_CLASSES } from "@/lib/styles";
import {
  ACTIVE_ORDER_STORAGE_KEY,
  DRAFT_CART_KEY,
  SESSION_CUSTOMER_NAME_KEY,
  SESSION_TABLE_ID_KEY,
  SESSION_TABLE_NUMBER_KEY,
} from "@/lib/storage";

interface MenuItemOption {
  id: number;
  name: string;
  description: string | null;
  category: "FOOD" | "DRINK";
  priceKobo: number;
  prepTimeMinutes: number;
}

type Category = "FOOD" | "DRINK";

export function MenuOrderFlow({ menuItems }: { menuItems: MenuItemOption[] }) {
  const router = useRouter();

  const [customerName, setCustomerName] = useState("");
  const [tableId, setTableId] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [cart, setCart] = useState<Record<number, number>>({});
  const [activeCategory, setActiveCategory] = useState<Category>("FOOD");
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Server and first client render must match (neither has access to
  // localStorage), so the session and draft cart are only read after mount —
  // never during render, or hydration throws.
  const [hasCheckedSession, setHasCheckedSession] = useState(false);

  useEffect(() => {
    let cancelled = false;
    try {
      const storedName = localStorage.getItem(SESSION_CUSTOMER_NAME_KEY);
      const storedTableId = localStorage.getItem(SESSION_TABLE_ID_KEY);
      const storedTableNumber = localStorage.getItem(SESSION_TABLE_NUMBER_KEY);
      const storedCart = localStorage.getItem(DRAFT_CART_KEY);
      setTimeout(() => {
        if (cancelled) return;
        if (storedName) setCustomerName(storedName);
        if (storedTableId) setTableId(storedTableId);
        if (storedTableNumber) setTableNumber(storedTableNumber);
        if (storedCart) setCart(JSON.parse(storedCart));
        setHasCheckedSession(true);
      }, 0);
    } catch {
      setTimeout(() => {
        if (!cancelled) setHasCheckedSession(true);
      }, 0);
    }
    return () => {
      cancelled = true;
    };
  }, []);

  // No session found once the check above has actually run — bounce back to
  // "/". Checking before hasCheckedSession is true would bounce every valid
  // session too, since the fields start blank on every render until restored.
  useEffect(() => {
    if (!hasCheckedSession) return;
    if (!customerName || !tableId) {
      router.push("/");
    }
  }, [hasCheckedSession, customerName, tableId, router]);

  // Mirror the cart back to localStorage so a refresh or a role-toggle round
  // trip doesn't lose it. Gated the same way as the restore above.
  useEffect(() => {
    if (!hasCheckedSession) return;
    try {
      localStorage.setItem(DRAFT_CART_KEY, JSON.stringify(cart));
    } catch {
      // localStorage unavailable — the draft just won't survive a refresh
    }
  }, [cart, hasCheckedSession]);

  const items = menuItems.filter((item) => item.category === activeCategory);

  const cartLines = useMemo(
    () =>
      menuItems
        .filter((item) => (cart[item.id] ?? 0) > 0)
        .map((item) => ({ ...item, quantity: cart[item.id] })),
    [cart, menuItems],
  );

  const totalKobo = cartLines.reduce((sum, line) => sum + line.priceKobo * line.quantity, 0);
  const totalQuantity = cartLines.reduce((sum, line) => sum + line.quantity, 0);

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

  // Nothing to show yet (still checking) or about to redirect (no session) —
  // render nothing rather than flashing the grid or a wrong session bar.
  if (!hasCheckedSession || !customerName || !tableId) {
    return null;
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 pb-24">
      <div className="flex items-center justify-between text-sm text-muted">
        <span>
          {customerName} · Table {tableNumber}
        </span>
        <Link href="/" className={`underline ${FOCUS_RING_CLASSES}`}>
          change
        </Link>
      </div>

      <div className="flex gap-1 rounded-full border border-line bg-paper p-1 text-sm">
        <button
          type="button"
          onClick={() => setActiveCategory("FOOD")}
          className={`rounded-full px-4 py-1.5 transition-colors ${
            activeCategory === "FOOD" ? "bg-ink text-paper" : "text-muted"
          }`}
        >
          Food
        </button>
        <button
          type="button"
          onClick={() => setActiveCategory("DRINK")}
          className={`rounded-full px-4 py-1.5 transition-colors ${
            activeCategory === "DRINK" ? "bg-ink text-paper" : "text-muted"
          }`}
        >
          Drinks
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex flex-col gap-2 rounded-2xl border border-line bg-paper p-4 shadow-sm"
          >
            <span className="text-xs font-semibold tracking-wide text-muted uppercase">
              {item.category}
            </span>
            <h3 className="font-serif text-lg font-semibold">{item.name}</h3>
            {item.description && <p className="text-sm text-muted">{item.description}</p>}
            <p className="text-sm text-muted">
              {formatNaira(item.priceKobo)} · ~{item.prepTimeMinutes} min
            </p>
            <button
              type="button"
              onClick={() => setQuantity(item.id, (cart[item.id] ?? 0) + 1)}
              className={`mt-auto rounded-full bg-terracotta px-4 py-2 text-sm font-semibold text-white ${FOCUS_RING_CLASSES}`}
            >
              Add
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setIsCartOpen(true)}
        className={`fixed right-4 bottom-4 z-20 rounded-full bg-terracotta px-5 py-3 text-base font-semibold text-white shadow-lg sm:right-8 sm:bottom-8 ${FOCUS_RING_CLASSES}`}
      >
        Your order · {totalQuantity}
      </button>

      {isCartOpen && (
        <div
          className="fixed inset-0 z-30 flex items-end justify-center bg-ink/40 sm:items-center"
          onClick={() => setIsCartOpen(false)}
        >
          <div
            className="w-full max-w-md space-y-3 rounded-t-2xl bg-paper p-5 shadow-lg sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-lg font-semibold">Your order</h2>
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                aria-label="Close"
                className={`rounded-full px-2 text-xl leading-none text-muted ${FOCUS_RING_CLASSES}`}
              >
                ×
              </button>
            </div>

            {cartLines.length === 0 ? (
              <p className="text-sm text-muted">No items yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {cartLines.map((line) => (
                  <li key={line.id} className="flex items-center justify-between gap-2 py-2">
                    <span className="flex-1">{line.name}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setQuantity(line.id, line.quantity - 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-line"
                        aria-label={`Remove one ${line.name}`}
                      >
                        −
                      </button>
                      <span className="w-4 text-center">{line.quantity}</span>
                      <button
                        type="button"
                        onClick={() => setQuantity(line.id, line.quantity + 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-line"
                        aria-label={`Add one ${line.name}`}
                      >
                        +
                      </button>
                    </div>
                    <span className="w-20 text-right">{formatNaira(line.priceKobo * line.quantity)}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="text-right font-semibold">Total: {formatNaira(totalKobo)}</div>

            {error && <p className="text-sm font-medium text-ink">{error}</p>}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPending || cartLines.length === 0}
              className={`w-full rounded-full bg-terracotta px-4 py-3 text-base font-semibold text-white shadow-sm disabled:opacity-50 ${FOCUS_RING_CLASSES}`}
            >
              {isPending ? "Placing order…" : "Place Order"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
