"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
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
  photoUrl: string | null;
}

type Category = "FOOD" | "DRINK";
type IconProps = { className?: string };

function ForkKnifeIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 2v6a2 2 0 0 0 4 0V2" />
      <path d="M8 8v14" />
      <path d="M18 2c-2 0-3 2-3 5s1 5 3 5" />
      <path d="M18 12v10" />
    </svg>
  );
}

function ShoppingBagIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 8h12l-1 12a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1L6 8Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </svg>
  );
}

function ClockIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  );
}

function CheckIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

function PlusIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function TrashIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 7h16" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
      <path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

function CategoryIcon({
  category,
  className,
}: {
  category: Category;
  className?: string;
}) {
  return category === "FOOD" ? (
    <ForkKnifeIcon className={className} />
  ) : (
    <ShoppingBagIcon className={className} />
  );
}

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
  // Synchronous guard against a double-fired click landing before React has
  // re-rendered the disabled button — see the same pattern in LandingHero.
  const hasSubmittedRef = useRef(false);

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

  const totalKobo = cartLines.reduce(
    (sum, line) => sum + line.priceKobo * line.quantity,
    0,
  );
  const totalQuantity = cartLines.reduce((sum, line) => sum + line.quantity, 0);

  function setQuantity(menuItemId: number, quantity: number) {
    setCart((prev) => ({ ...prev, [menuItemId]: Math.max(0, quantity) }));
  }

  function handleSubmit() {
    if (hasSubmittedRef.current) return;
    setError(null);
    hasSubmittedRef.current = true;
    startTransition(async () => {
      const result = await placeOrder({
        tableId: Number(tableId),
        customerName,
        items: cartLines.map((line) => ({
          menuItemId: line.id,
          quantity: line.quantity,
        })),
      });
      if ("error" in result) {
        setError(result.error);
        hasSubmittedRef.current = false;
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

  if (isCartOpen) {
    return (
      <main className="mx-auto max-w-5xl space-y-6 p-4 py-8 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-wide text-terracotta uppercase">
              Table {tableNumber}
            </p>
            <h1 className="font-serif text-4xl font-bold sm:text-5xl">
              Your order.
            </h1>
            <p className="mt-1 text-sm text-muted">For {customerName}</p>
          </div>
          <button
            type="button"
            onClick={() => setIsCartOpen(false)}
            className={`flex items-center gap-2 rounded-full border border-line bg-paper px-4 py-2 text-sm font-semibold shadow-sm hover:cursor-pointer ${FOCUS_RING_CLASSES}`}
          >
            <span aria-hidden="true">←</span> Add more
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-2xl border border-line bg-paper p-5 shadow-sm">
            <h2 className="mb-3 font-serif text-xl font-semibold">
              At the table
            </h2>
            {cartLines.length === 0 ? (
              <p className="text-sm text-muted">No items yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {cartLines.map((line) => (
                  <li
                    key={line.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <div>
                      <p className="font-medium">{line.name}</p>
                      <p className="text-xs text-muted">
                        {formatNaira(line.priceKobo)} each
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setQuantity(line.id, line.quantity - 1)
                          }
                          className={`flex h-8 w-8 items-center justify-center rounded-full border border-line transition-all duration-100 ease-out hover:cursor-pointer active:scale-95 ${FOCUS_RING_CLASSES}`}
                          aria-label={`Remove one ${line.name}`}
                        >
                          −
                        </button>
                        <span className="w-4 text-center">{line.quantity}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setQuantity(line.id, line.quantity + 1)
                          }
                          className={`flex h-8 w-8 items-center justify-center rounded-full border border-line hover:cursor-pointer active:scale-[0.8] ${FOCUS_RING_CLASSES}`}
                          aria-label={`Add one ${line.name}`}
                        >
                          +
                        </button>
                      </div>
                      <span className="w-24 text-right font-bold text-terracotta">
                        {formatNaira(line.priceKobo * line.quantity)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuantity(line.id, 0)}
                        aria-label={`Remove ${line.name} from order`}
                        className={`text-muted hover:cursor-pointer  active:scale-90 hover:text-slate-900 ${FOCUS_RING_CLASSES}`}
                      >
                        <TrashIcon className="h-4 w-4 " />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-4 rounded-2xl bg-ink p-6 text-paper shadow-sm">
            <p className="text-xs font-semibold tracking-wide text-saffron uppercase">
              Almost there
            </p>
            <h2 className="font-serif text-2xl font-bold">
              Ready when you are.
            </h2>
            <p className="text-sm text-paper/70">
              We&apos;ll send this straight to the kitchen. You can watch your
              order&apos;s progress from the confirmation page next.
            </p>
            <div className="flex items-center justify-between border-t border-paper/20 pt-4">
              <span>Subtotal</span>
              <span className="text-lg font-bold text-saffron">
                {formatNaira(totalKobo)}
              </span>
            </div>
            {error && (
              <p className="text-sm font-medium text-saffron">{error}</p>
            )}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPending || cartLines.length === 0}
              className={`w-full rounded-full bg-saffron px-4 py-3 text-base font-semibold text-ink shadow-[0_4px_0_0_#C89224] transition-all duration-150 not-disabled:hover:-translate-y-0.5 not-disabled:hover:shadow-[0_6px_0_0_#C89224] not-disabled:hover:cursor-pointer not-disabled:active:translate-y-0.5 not-disabled:active:shadow-[0_2px_0_0_#C89224] disabled:opacity-50 disabled:cursor-not-allowed ${FOCUS_RING_CLASSES}`}
            >
              {isPending ? "Placing order…" : "Place Order →"}
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 pb-24">
      <div className="flex items-center justify-between text-sm text-muted">
        <span>
          {customerName} · Table {tableNumber}
        </span>
        <Link href="/" className={`underline ${FOCUS_RING_CLASSES}`}>
          change
        </Link>
      </div>
      {/* intro */}
      <div className="grid grid-cols-1 gap-4 pt-4 md:grid-cols-2 md:items-end">
        <div>
          <p className="text-xs font-semibold tracking-[0.15em] text-terracotta uppercase">
            From the kitchen
          </p>
          <h1 className="mt-2 font-serif text-4xl leading-[1.05] font-bold tracking-tight sm:text-5xl">
            What sounds good?
          </h1>
        </div>
        <p className="text-base text-muted md:pb-2">
          Everything is made to order. Take a look around, then send it our way
          when you&apos;re ready.
        </p>
      </div>
      <div className=" md:sticky top-16 z-10 flex gap-3  py-3 ">
        {" "}
        <button
          type="button"
          onClick={() => setActiveCategory("FOOD")}
          className={`cursor-pointer rounded-full border px-6 py-2.5 text-base font-medium transition-colors ${
            activeCategory === "FOOD"
              ? "border-terracotta bg-terracotta text-white"
              : "border-line bg-paper text-muted hover:border-terracotta hover:text-terracotta"
          }`}
        >
          Food
        </button>
        <button
          type="button"
          onClick={() => setActiveCategory("DRINK")}
          className={`cursor-pointer rounded-full border px-6 py-2.5 text-base font-medium transition-colors ${
            activeCategory === "DRINK"
              ? "border-terracotta bg-terracotta text-white"
              : "border-line bg-paper text-muted hover:border-terracotta hover:text-terracotta"
          }`}
        >
          Drinks
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-paper shadow-sm"
          >
            {item.photoUrl && (
              <div className="relative aspect-4/3 w-full shrink-0">
                <Image
                  src={item.photoUrl}
                  alt={item.name}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-linear-to-t from-black/45 to-transparent"
                />
              </div>
            )}

            <div className="flex flex-1 flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-semibold tracking-wide text-muted uppercase">
                  {item.category}
                </span>
                {!item.photoUrl && (
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-saffron text-ink">
                    <CategoryIcon
                      category={item.category}
                      className="h-4 w-4"
                    />
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <h3 className="font-serif text-lg font-semibold">
                  {item.name}
                </h3>
                {item.description && (
                  <p className="text-sm text-muted">{item.description}</p>
                )}
              </div>

              <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
                <span className="text-lg font-bold text-terracotta">
                  {formatNaira(item.priceKobo)}
                </span>
                <span className="flex items-center gap-1 text-xs text-muted">
                  <ClockIcon className="h-3.5 w-3.5" />
                  {item.prepTimeMinutes} MIN
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity(item.id, (cart[item.id] ?? 0) + 1)}
                  className={`flex items-center gap-1 rounded-full bg-ink px-3 py-1.5 text-sm font-semibold text-paper hover:cursor-pointer active:scale-[0.8] ${FOCUS_RING_CLASSES}`}
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                  Add
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {totalQuantity > 0 && (
        <button
          type="button"
          onClick={() => setIsCartOpen(true)}
          className={`fixed right-4 bottom-4 z-20 flex items-center gap-2 rounded-full bg-terracotta px-5 py-3 text-base font-semibold text-white shadow-lg sm:right-8 sm:bottom-8 hover:cursor-pointer hover:-translate-y-0.5 duration-100 ease-in ${FOCUS_RING_CLASSES}`}
        >
          <ShoppingBagIcon className="h-5 w-5" />
          Your order
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-paper text-sm font-bold text-terracotta">
            {totalQuantity}
          </span>
          <CheckIcon className="h-5 w-5" />
        </button>
      )}
    </main>
  );
}
