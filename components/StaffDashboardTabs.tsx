"use client";

import { useState } from "react";
import Link from "next/link";
import { formatNaira } from "@/lib/money";
import { StatusBadge } from "@/components/StatusBadge";

export interface QueueOrderView {
  id: string;
  tableNumber: number;
  customerName: string;
  status: "PLACED" | "SERVED" | "PAID";
  itemCount: number;
  totalKobo: number;
}

export interface FeedbackOrderView {
  id: string;
  tableNumber: number;
  customerName: string;
  paidAt: Date;
  ratingScore: number | null;
  complaintMessage: string | null;
}

// A read-only, at-a-glance component: no interactivity, unlike the
// clickable picker in CustomerOrderActions.
function StarDisplay({ score }: { score: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${score} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg
          key={n}
          viewBox="0 0 24 24"
          className={`h-4 w-4 ${
            n <= score ? "fill-saffron stroke-saffron" : "fill-none stroke-line"
          }`}
          strokeWidth={1.5}
        >
          <path d="M12 2.5l2.9 6.4 6.9.7-5.2 4.7 1.5 6.9L12 17.6 5.9 21.2l1.5-6.9-5.2-4.7 6.9-.7L12 2.5z" />
        </svg>
      ))}
    </div>
  );
}

type Tab = "queue" | "feedback";

export function StaffDashboardTabs({
  queueOrders,
  feedbackOrders,
}: {
  queueOrders: QueueOrderView[];
  feedbackOrders: FeedbackOrderView[];
}) {
  const [tab, setTab] = useState<Tab>("queue");

  return (
    <div className="space-y-4">
      {/* Own border + fill per pill (not a shared segmented-control bg), and
          bg-ink rather than the header toggle's bg-terracotta, so this reads
          as a different control from the Customer/Staff switch above it. */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab("queue")}
          className={`cursor-pointer rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
            tab === "queue"
              ? "border-ink bg-ink text-paper"
              : "border-line bg-paper text-muted hover:border-ink hover:text-ink"
          }`}
        >
          Active orders · {queueOrders.length}
        </button>
        <button
          type="button"
          onClick={() => setTab("feedback")}
          className={`cursor-pointer rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
            tab === "feedback"
              ? "border-ink bg-ink text-paper"
              : "border-line bg-paper text-muted hover:border-ink hover:text-ink"
          }`}
        >
          Feedback · {feedbackOrders.length}
        </button>
      </div>

      {tab === "queue" &&
        (queueOrders.length === 0 ? (
          <p className="text-muted">No active orders.</p>
        ) : (
          <ul className="space-y-3">
            {queueOrders.map((order) => (
              <li
                key={order.id}
                className="rounded-2xl border border-line bg-paper p-4 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <Link href={`/orders/${order.id}`} className="font-medium underline">
                    Table {order.tableNumber} — {order.customerName}
                  </Link>
                  <StatusBadge status={order.status} />
                </div>
                <div className="mt-1 text-sm text-muted">
                  {order.itemCount} item(s) · {formatNaira(order.totalKobo)}
                </div>
              </li>
            ))}
          </ul>
        ))}

      {tab === "feedback" &&
        (feedbackOrders.length === 0 ? (
          <p className="text-muted">No feedback yet.</p>
        ) : (
          <ul className="space-y-2">
            {feedbackOrders.map((order) => (
              <li
                key={order.id}
                className={`rounded-2xl border p-4 ${
                  order.complaintMessage
                    ? "border-terracotta/40 bg-terracotta/5"
                    : "border-line bg-cream"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">
                    Table {order.tableNumber} — {order.customerName}
                  </span>
                  <span className="text-xs text-muted">
                    {order.paidAt.toLocaleString()}
                  </span>
                </div>
                {order.ratingScore != null && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <StarDisplay score={order.ratingScore} />
                    {order.ratingScore <= 2 && (
                      <span className="text-xs font-semibold text-terracotta">
                        Low score
                      </span>
                    )}
                  </div>
                )}
                {order.complaintMessage && (
                  <p className="mt-2 text-sm text-ink">{order.complaintMessage}</p>
                )}
              </li>
            ))}
          </ul>
        ))}
    </div>
  );
}
