import { prisma } from "@/lib/prisma";
import { MenuOrderFlow } from "@/components/MenuOrderFlow";

export default async function MenuPage() {
  const menuItems = await prisma.menuItem.findMany({
    where: { isAvailable: true },
    orderBy: { name: "asc" },
  });

  return <MenuOrderFlow menuItems={menuItems} />;
}
