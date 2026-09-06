import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatNaira } from "@/lib/money";
import { StatusBadge } from "@/components/StatusBadge";

export default async function StaffDashboard() {
  const orders = await prisma.order.findMany({
    where: { status: { in: ["PLACED", "SERVED"] } },
    orderBy: { placedAt: "asc" },
    include: { table: true, customer: true, items: true },
  });

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4 pb-10">
      <h1 className="font-serif text-2xl font-semibold">Active Orders</h1>

      {orders.length === 0 ? (
        <p className="text-muted">No active orders.</p>
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => {
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
    </main>
  );
}
