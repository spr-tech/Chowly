import { prisma } from "@/lib/prisma";
import { LandingHero } from "@/components/LandingHero";

export default async function Home() {
  const tables = await prisma.diningTable.findMany({
    orderBy: { number: "asc" },
    include: {
      orders: {
        where: { status: { in: ["PLACED", "SERVED"] } },
        select: { id: true },
      },
    },
  });

  const tableOptions = tables.map((table) => ({
    id: table.id,
    number: table.number,
    occupied: table.orders.length > 0,
  }));

  return <LandingHero tables={tableOptions} />;
}
