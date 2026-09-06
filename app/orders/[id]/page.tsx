import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatNaira } from "@/lib/money";
import { DEFAULT_VIEWER_ROLE, VIEWER_ROLE_COOKIE, isViewerRole } from "@/lib/role";
import { StaffOrderActions } from "@/components/StaffOrderActions";
import { CustomerOrderActions } from "@/components/CustomerOrderActions";

export default async function OrderPage(props: PageProps<"/orders/[id]">) {
  const { id } = await props.params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      table: true,
      customer: true,
      items: true,
      waiter: true,
      chef: true,
      bartender: true,
      complaint: true,
      rating: true,
      payment: true,
    },
  });

  if (!order) {
    notFound();
  }

  const cookieStore = await cookies();
  const roleCookie = cookieStore.get(VIEWER_ROLE_COOKIE)?.value;
  const role = isViewerRole(roleCookie) ? roleCookie : DEFAULT_VIEWER_ROLE;

  const totalKobo = order.items.reduce((sum, item) => sum + item.unitPriceKobo * item.quantity, 0);

  const staffOptions =
    role === "staff" && order.status === "PLACED"
      ? await prisma.staff.findMany({ orderBy: { name: "asc" } })
      : null;

  return (
    <main className="p-4 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Order for Table {order.table.number}</h1>
        <p className="text-sm text-gray-600">Customer: {order.customer.name}</p>
        <p className="text-sm text-gray-600">Status: {order.status}</p>
        {order.status === "PLACED" && (
          <p className="text-sm text-gray-600">Estimated wait: {order.estimatedWaitMinutes} minutes</p>
        )}
      </div>

      <ul className="divide-y border rounded">
        {order.items.map((item) => (
          <li key={item.id} className="flex justify-between p-2">
            <span>
              {item.quantity} x {item.nameSnapshot}
            </span>
            <span>{formatNaira(item.unitPriceKobo * item.quantity)}</span>
          </li>
        ))}
      </ul>
      <div className="text-right font-semibold">Total: {formatNaira(totalKobo)}</div>

      {(order.waiter || order.chef || order.bartender) && (
        <div className="text-sm text-gray-600 space-y-0.5">
          {order.waiter && <p>Waiter: {order.waiter.name}</p>}
          {order.chef && <p>Chef: {order.chef.name}</p>}
          {order.bartender && <p>Bartender: {order.bartender.name}</p>}
        </div>
      )}

      {role === "staff" && staffOptions && (
        <StaffOrderActions orderId={order.id} staff={staffOptions} />
      )}

      {role === "customer" && (
        <CustomerOrderActions
          orderId={order.id}
          status={order.status}
          totalKobo={totalKobo}
          hasComplaint={!!order.complaint}
          hasRating={!!order.rating}
          payment={order.payment}
        />
      )}
    </main>
  );
}
