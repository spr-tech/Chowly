"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ActiveOrderBanner, type ActiveOrderInfo } from "@/components/ActiveOrderBanner";
import { HeroIllustration } from "@/components/HeroIllustration";
import { FOCUS_RING_CLASSES } from "@/lib/styles";
import {
  SESSION_CUSTOMER_NAME_KEY,
  SESSION_TABLE_ID_KEY,
  SESSION_TABLE_NUMBER_KEY,
} from "@/lib/storage";

interface TableOption {
  id: number;
  number: number;
  occupied: boolean;
}

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

export function LandingHero({ tables }: { tables: TableOption[] }) {
  const router = useRouter();
  const [tableId, setTableId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  // A synchronous guard, not state: two clicks fired faster than React can
  // re-render a disabled button both run before `isPending` would stop
  // them. A ref is checked and set in the same tick, so the second click
  // is rejected no matter how fast it arrives.
  const hasStartedRef = useRef(false);

  // "checking": ActiveOrderBanner hasn't reported back yet. null: no active
  // order. Otherwise: the order to lead with. formExpanded lets a returning
  // customer reach the form anyway via "Start a new order".
  const [activeOrder, setActiveOrder] = useState<ActiveOrderInfo | null | "checking">("checking");
  const [formExpanded, setFormExpanded] = useState(false);

  const handleActiveOrderChange = useCallback((info: ActiveOrderInfo | null) => {
    setActiveOrder(info);
  }, []);

  const showForm = activeOrder === null || formExpanded;

  function handleStartOrdering() {
    if (hasStartedRef.current) return;

    const trimmedName = customerName.trim();
    if (!trimmedName) {
      setError("Enter your name.");
      return;
    }
    if (!tableId) {
      setError("Select a table.");
      return;
    }
    setError(null);
    hasStartedRef.current = true;

    const table = tables.find((t) => String(t.id) === tableId);
    startTransition(() => {
      try {
        localStorage.setItem(SESSION_CUSTOMER_NAME_KEY, trimmedName);
        localStorage.setItem(SESSION_TABLE_ID_KEY, tableId);
        if (table) {
          localStorage.setItem(SESSION_TABLE_NUMBER_KEY, String(table.number));
        }
      } catch {
        // localStorage unavailable — /menu will just bounce back to "/"
      }
      router.push("/menu");
    });
  }

  return (
    <main>
      <section className="bg-cream">
        <div className="mx-auto max-w-[1200px] px-4 py-12 md:py-20">
          <ActiveOrderBanner onChange={handleActiveOrderChange} />

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

              {showForm ? (
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

                  {error && <p className="text-sm font-medium text-ink">{error}</p>}

                  <button
                    type="button"
                    onClick={handleStartOrdering}
                    disabled={isPending}
                    className={`flex w-full items-center justify-center gap-2 rounded-full bg-terracotta px-4 py-3 text-base font-semibold text-white shadow-sm disabled:opacity-50 ${FOCUS_RING_CLASSES}`}
                  >
                    {isPending ? (
                      "Starting…"
                    ) : (
                      <>
                        Start ordering
                        <span aria-hidden="true">→</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                activeOrder !== "checking" && (
                  <button
                    type="button"
                    onClick={() => setFormExpanded(true)}
                    className={`w-full rounded-full border border-ink px-4 py-2.5 text-sm font-medium ${FOCUS_RING_CLASSES}`}
                  >
                    Start a new order
                  </button>
                )
              )}

              <p className="flex items-center gap-1.5 text-sm text-muted">
                <PinIcon />
                14 Palm Avenue, Lagos
              </p>
            </div>

            <HeroIllustration />
          </div>
        </div>
      </section>
    </main>
  );
}
