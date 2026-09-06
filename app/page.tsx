import { prisma } from "@/lib/prisma";
import { CustomerOrderFlow } from "@/components/CustomerOrderFlow";

export default async function Home() {
  const [tables, menuItems] = await Promise.all([
    prisma.diningTable.findMany({
      orderBy: { number: "asc" },
      include: {
        orders: {
          where: { status: { in: ["PLACED", "SERVED"] } },
          select: { id: true },
        },
      },
    }),
    prisma.menuItem.findMany({
      where: { isAvailable: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const tableOptions = tables.map((table) => ({
    id: table.id,
    number: table.number,
    occupied: table.orders.length > 0,
  }));

  return <CustomerOrderFlow tables={tableOptions} menuItems={menuItems} />;
}
