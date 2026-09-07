import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatNaira } from "@/lib/money";
import { StatusBadge } from "@/components/StatusBadge";

// A read-only, at-a-glance component: no "use client", so it's plain JSX
// with no interactivity, unlike the clickable picker in CustomerOrderActions.
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

export default async function StaffDashboard() {
  // One round trip for both sections: PLACED/SERVED orders for the queue,
  // plus PAID orders that carry a complaint or rating for the feedback list
  // below. Splitting happens in JS after the fetch.
  const orders = await prisma.order.findMany({
    where: {
      OR: [
        { status: { in: ["PLACED", "SERVED"] } },
        { status: "PAID", OR: [{ complaint: { isNot: null } }, { rating: { isNot: null } }] },
      ],
    },
    orderBy: { placedAt: "asc" },
    include: { table: true, customer: true, items: true, complaint: true, rating: true, payment: true },
  });

  const queueOrders = orders.filter((order) => order.status !== "PAID");

  const feedbackOrders = orders
    .filter((order) => order.status === "PAID" && (order.complaint || order.rating))
    .sort((a, b) => b.payment!.paidAt.getTime() - a.payment!.paidAt.getTime())
    .slice(0, 10);

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4 pb-10">
      <h1 className="font-serif text-2xl font-semibold">Active Orders</h1>

      {queueOrders.length === 0 ? (
        <p className="text-muted">No active orders.</p>
      ) : (
        <ul className="space-y-3">
          {queueOrders.map((order) => {
            const totalKobo = order.items.reduce(
              (sum, item) => sum + item.unitPriceKobo * item.quantity,
              0,
            );
            return (
              <li
                key={order.id}
                className="rounded-2xl border border-line bg-paper p-4 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <Link href={`/orders/${order.id}`} className="font-medium underline">
                    Table {order.table.number} — {order.customer.name}
                  </Link>
                  <StatusBadge status={order.status} />
                </div>
                <div className="mt-1 text-sm text-muted">
                  {order.items.length} item(s) · {formatNaira(totalKobo)}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <h2 className="pt-4 font-serif text-xl font-semibold">Recent feedback</h2>

      {feedbackOrders.length === 0 ? (
        <p className="text-muted">No feedback yet.</p>
      ) : (
        <ul className="space-y-2">
          {feedbackOrders.map((order) => (
            <li
              key={order.id}
              className={`rounded-2xl border p-4 ${
                order.complaint
                  ? "border-terracotta/40 bg-terracotta/5"
                  : "border-line bg-cream"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">
                  Table {order.table.number} — {order.customer.name}
                </span>
                <span className="text-xs text-muted">
                  {order.payment!.paidAt.toLocaleString()}
                </span>
              </div>
              {order.rating && (
                <div className="mt-1.5 flex items-center gap-2">
                  <StarDisplay score={order.rating.score} />
                  {order.rating.score <= 2 && (
                    <span className="text-xs font-semibold text-terracotta">
                      Low score
                    </span>
                  )}
                </div>
              )}
              {order.complaint && (
                <p className="mt-2 text-sm text-ink">{order.complaint.message}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
