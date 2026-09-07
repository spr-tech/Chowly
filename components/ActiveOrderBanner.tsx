"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getActiveOrderSummary } from "@/app/actions/orders";
import { ACTIVE_ORDER_STORAGE_KEY } from "@/lib/storage";
import { StatusBadge } from "@/components/StatusBadge";

export interface ActiveOrderInfo {
  orderId: string;
  status: "PLACED" | "SERVED";
  tableNumber: number;
}

// Reports what it found to the parent (via onChange) so the landing page can
// decide whether to lead with this order or with the name/table form —
// clearing localStorage happens here regardless of whether anyone is
// listening, since a stale/paid id should never linger.
export function ActiveOrderBanner({
  onChange,
}: {
  onChange?: (activeOrder: ActiveOrderInfo | null) => void;
}) {
  const [activeOrder, setActiveOrder] = useState<ActiveOrderInfo | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      let storedOrderId: string | null = null;
      try {
        storedOrderId = localStorage.getItem(ACTIVE_ORDER_STORAGE_KEY);
      } catch {
        onChange?.(null);
        return;
      }

      if (!storedOrderId) {
        onChange?.(null);
        return;
      }

      // Verify against the database — a click on "Pretend to Pay" isn't the
      // only way this order could have reached PAID (another session, or a
      // click that never completed), so trusting the stored id blindly would
      // resurrect a banner for an order that's actually done.
      const summary = await getActiveOrderSummary(storedOrderId);
      if (cancelled) return;

      if (!summary || summary.status === "PAID") {
        try {
          localStorage.removeItem(ACTIVE_ORDER_STORAGE_KEY);
        } catch {
          // localStorage unavailable — nothing to clear
        }
        setActiveOrder(null);
        onChange?.(null);
        return;
      }

      const info: ActiveOrderInfo = {
        orderId: storedOrderId,
        status: summary.status,
        tableNumber: summary.tableNumber,
      };
      setActiveOrder(info);
      onChange?.(info);
    }

    check();
    return () => {
      cancelled = true;
    };
  }, [onChange]);

  if (!activeOrder) {
    return null;
  }

  return (
    <div className="rounded-2xl border-2 border-terracotta bg-paper p-5 shadow-sm">
      <p className="text-xs font-semibold tracking-wide text-terracotta uppercase">
        Order in progress
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <p className="font-serif text-xl font-semibold">
            Table {activeOrder.tableNumber}
          </p>
          <StatusBadge status={activeOrder.status} />
        </div>
        <Link
          href={`/orders/${activeOrder.orderId}`}
          className="bg-terracotta text-white rounded-full border px-4 py-2.5 text-sm font-medium transition-transform duration-150 hover:cursor-pointer active:scale-[.91] disabled:cursor-not-allowed disabled:opacity-50 shadow-[0_4px_0_0_#B8401E]"
        >
          View order →
        </Link>
      </div>
    </div>
  );
}
