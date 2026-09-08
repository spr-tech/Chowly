import { prisma } from "@/lib/prisma";
import {
  StaffDashboardTabs,
  type FeedbackOrderView,
  type QueueOrderView,
} from "@/components/StaffDashboardTabs";

export default async function StaffDashboard() {
  // One round trip for both tabs: PLACED/SERVED orders for the queue, plus
  // PAID orders that carry a complaint or rating for the feedback list.
  // Splitting happens in JS after the fetch, and again client-side by tab.
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

  const queueOrders: QueueOrderView[] = orders
    .filter((order) => order.status !== "PAID")
    .map((order) => ({
      id: order.id,
      tableNumber: order.table.number,
      customerName: order.customer.name,
      status: order.status,
      itemCount: order.items.length,
      totalKobo: order.items.reduce((sum, item) => sum + item.unitPriceKobo * item.quantity, 0),
    }));

  const feedbackOrders: FeedbackOrderView[] = orders
    .filter((order) => order.status === "PAID" && (order.complaint || order.rating))
    .sort((a, b) => b.payment!.paidAt.getTime() - a.payment!.paidAt.getTime())
    .slice(0, 10)
    .map((order) => ({
      id: order.id,
      tableNumber: order.table.number,
      customerName: order.customer.name,
      paidAt: order.payment!.paidAt,
      ratingScore: order.rating?.score ?? null,
      complaintMessage: order.complaint?.message ?? null,
    }));

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4 pb-10">
      <h1 className="font-serif text-2xl font-semibold">Staff Dashboard</h1>
      <StaffDashboardTabs queueOrders={queueOrders} feedbackOrders={feedbackOrders} />
    </main>
  );
}
