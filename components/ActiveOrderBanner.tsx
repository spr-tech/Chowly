"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ACTIVE_ORDER_STORAGE_KEY } from "@/lib/storage";

export function ActiveOrderBanner() {
  // Starts null so the first client render matches the server's (which has
  // no access to localStorage at all) — read for real only after mount.
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  useEffect(() => {
    try {
      setActiveOrderId(localStorage.getItem(ACTIVE_ORDER_STORAGE_KEY));
    } catch {
      // localStorage unavailable — no banner, not an error
    }
  }, []);

  if (!activeOrderId) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-line bg-paper p-4 shadow-sm">
      <Link href={`/orders/${activeOrderId}`} className="font-medium text-ink underline">
        View your current order
      </Link>
    </div>
  );
}
