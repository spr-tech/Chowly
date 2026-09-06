import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, MenuCategory, StaffRole } from "../app/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const RESTAURANT_ID = 1;

const menuItems = [
  // Food — prep times span 10-30 min to give the wait-time formula real spread.
  { name: "Jollof Rice with Chicken", description: "Smoky party jollof with grilled chicken", category: MenuCategory.FOOD, priceKobo: 350000, prepTimeMinutes: 20 },
  { name: "Suya (Beef Skewers)", description: "Spiced grilled beef skewers, yaji pepper mix", category: MenuCategory.FOOD, priceKobo: 250000, prepTimeMinutes: 12 },
  { name: "Pounded Yam & Egusi Soup", description: "Melon-seed soup with assorted meat and pounded yam", category: MenuCategory.FOOD, priceKobo: 400000, prepTimeMinutes: 25 },
  { name: "Efo Riro with Assorted Meat", description: "Spinach stew with beef, tripe and stockfish", category: MenuCategory.FOOD, priceKobo: 450000, prepTimeMinutes: 30 },
  { name: "Moi Moi", description: "Steamed bean pudding with egg and fish", category: MenuCategory.FOOD, priceKobo: 150000, prepTimeMinutes: 15 },
  { name: "Peppered Snail", description: "Grilled snail in fresh pepper sauce", category: MenuCategory.FOOD, priceKobo: 600000, prepTimeMinutes: 18 },
  { name: "Fried Rice with Turkey", description: "Nigerian-style fried rice with grilled turkey", category: MenuCategory.FOOD, priceKobo: 380000, prepTimeMinutes: 22 },
  { name: "Small Chops Platter", description: "Spring rolls, puff-puff, gizzard and samosa", category: MenuCategory.FOOD, priceKobo: 500000, prepTimeMinutes: 10 },
  // Drinks — prep times span 1-6 min.
  { name: "Chapman", description: "Nigeria's classic bittersweet mocktail", category: MenuCategory.DRINK, priceKobo: 200000, prepTimeMinutes: 5 },
  { name: "Zobo", description: "Chilled hibiscus and ginger drink", category: MenuCategory.DRINK, priceKobo: 100000, prepTimeMinutes: 3 },
  { name: "Palm Wine", description: "Fresh, lightly fermented palm wine", category: MenuCategory.DRINK, priceKobo: 150000, prepTimeMinutes: 1 },
  { name: "Fresh Orange Juice", description: "Locally sourced, hand-pressed", category: MenuCategory.DRINK, priceKobo: 120000, prepTimeMinutes: 4 },
  { name: "Chilled Malt", description: "Malta Guinness, served ice cold", category: MenuCategory.DRINK, priceKobo: 80000, prepTimeMinutes: 1 },
  { name: "Lagos Sunset Cocktail", description: "House cocktail with citrus and grenadine", category: MenuCategory.DRINK, priceKobo: 250000, prepTimeMinutes: 6 },
];

const staff = [
  { name: "Ngozi Eze", role: StaffRole.WAITER },
  { name: "Tunde Bakare", role: StaffRole.WAITER },
  { name: "Amina Yusuf", role: StaffRole.WAITER },
  { name: "Bola Adeyemi", role: StaffRole.CHEF },
  { name: "Emeka Okafor", role: StaffRole.CHEF },
  { name: "Fatima Sani", role: StaffRole.CHEF },
  { name: "Kelechi Obi", role: StaffRole.BARTENDER },
  { name: "Sade Adeleke", role: StaffRole.BARTENDER },
];

const TABLE_COUNT = 12;

async function main() {
  const restaurant = await prisma.restaurant.upsert({
    where: { id: RESTAURANT_ID },
    update: { name: "The Juniper Room", address: "14 Palm Avenue, Lagos" },
    create: { id: RESTAURANT_ID, name: "The Juniper Room", address: "14 Palm Avenue, Lagos" },
  });

  // MenuItem has no unique constraint on name, so upsert isn't available — find then create/update.
  for (const item of menuItems) {
    const existing = await prisma.menuItem.findFirst({
      where: { restaurantId: restaurant.id, name: item.name },
    });
    if (existing) {
      await prisma.menuItem.update({ where: { id: existing.id }, data: item });
    } else {
      await prisma.menuItem.create({ data: { ...item, restaurantId: restaurant.id } });
    }
  }

  // Staff has no unique constraint on name either — same find-then-create/update pattern.
  for (const person of staff) {
    const existing = await prisma.staff.findFirst({
      where: { restaurantId: restaurant.id, name: person.name },
    });
    if (existing) {
      await prisma.staff.update({ where: { id: existing.id }, data: person });
    } else {
      await prisma.staff.create({ data: { ...person, restaurantId: restaurant.id } });
    }
  }

  // DiningTable has @@unique([restaurantId, number]), so upsert works directly.
  for (let number = 1; number <= TABLE_COUNT; number++) {
    await prisma.diningTable.upsert({
      where: { restaurantId_number: { restaurantId: restaurant.id, number } },
      update: {},
      create: { restaurantId: restaurant.id, number },
    });
  }

  const [menuItemCount, staffCount, tableCount] = await Promise.all([
    prisma.menuItem.count({ where: { restaurantId: restaurant.id } }),
    prisma.staff.count({ where: { restaurantId: restaurant.id } }),
    prisma.diningTable.count({ where: { restaurantId: restaurant.id } }),
  ]);

  console.log(`Seeded ${restaurant.name}: ${menuItemCount} menu items, ${staffCount} staff, ${tableCount} tables.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
