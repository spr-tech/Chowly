import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatNaira } from "@/lib/money";

export default async function StaffDashboard() {
  const orders = await prisma.order.findMany({
    where: { status: { in: ["PLACED", "SERVED"] } },
    orderBy: { placedAt: "asc" },
    include: { table: true, customer: true, items: true },
  });

  return (
    <main className="p-4 max-w-3xl mx-auto space-y-4">
      <h1 className="text-xl font-semibold">Active Orders</h1>

      {orders.length === 0 ? (
        <p className="text-gray-500">No active orders.</p>
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => {
            const totalKobo = order.items.reduce(
              (sum, item) => sum + item.unitPriceKobo * item.quantity,
              0,
            );
            return (
              <li key={order.id} className="border rounded p-3">
                <Link href={`/orders/${order.id}`} className="font-medium underline">
                  Table {order.table.number} — {order.customer.name}
                </Link>
                <div className="text-sm text-gray-600">
                  Status: {order.status} · {order.items.length} item(s) · {formatNaira(totalKobo)}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
