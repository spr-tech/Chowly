"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { calculateEstimatedWaitMinutes } from "@/lib/wait-time";

class TableOccupiedError extends Error {}

interface PlaceOrderItem {
  menuItemId: number;
  quantity: number;
}

interface PlaceOrderInput {
  tableId: number;
  customerName: string;
  items: PlaceOrderItem[];
}

export async function placeOrder(input: PlaceOrderInput): Promise<{ error: string } | { orderId: string }> {
  const customerName = input.customerName.trim();
  if (!customerName) {
    return { error: "Enter your name." };
  }
  if (!Number.isInteger(input.tableId)) {
    return { error: "Select a table." };
  }

  const items = input.items.filter((item) => item.quantity > 0);
  if (items.length === 0) {
    return { error: "Add at least one item to your order." };
  }

  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: items.map((item) => item.menuItemId) } },
  });
  const menuItemById = new Map(menuItems.map((menuItem) => [menuItem.id, menuItem]));

  let orderId: string;
  try {
    orderId = await prisma.$transaction(
      async (tx) => {
        const occupied = await tx.order.findFirst({
          where: { tableId: input.tableId, status: { in: ["PLACED", "SERVED"] } },
        });
        if (occupied) {
          throw new TableOccupiedError();
        }

        const activeOrdersAheadCount = await tx.order.count({ where: { status: "PLACED" } });

        const orderItems = items.map((item) => {
          const menuItem = menuItemById.get(item.menuItemId);
          if (!menuItem) {
            throw new Error(`Menu item ${item.menuItemId} not found`);
          }
          return {
            menuItemId: menuItem.id,
            nameSnapshot: menuItem.name,
            unitPriceKobo: menuItem.priceKobo,
            quantity: item.quantity,
            prepTimeMinutes: menuItem.prepTimeMinutes,
          };
        });

        const estimatedWaitMinutes = calculateEstimatedWaitMinutes(orderItems, activeOrdersAheadCount);

        const customer = await tx.customer.create({ data: { name: customerName } });

        const order = await tx.order.create({
          data: {
            tableId: input.tableId,
            customerId: customer.id,
            estimatedWaitMinutes,
            items: {
              create: orderItems.map(({ menuItemId, nameSnapshot, unitPriceKobo, quantity }) => ({
                menuItemId,
                nameSnapshot,
                unitPriceKobo,
                quantity,
              })),
            },
          },
        });

        return order.id;
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    if (error instanceof TableOccupiedError) {
      return { error: "That table is already occupied. Pick another one." };
    }
    throw error;
  }

  // The caller (CustomerOrderFlow) does the navigation itself, client-side,
  // so it can write the order id to localStorage first. redirect() here
  // would short-circuit before that client code ever ran.
  return { orderId };
}

interface AssignStaffInput {
  waiterId: number;
  chefId: number;
  bartenderId: number;
}

export async function assignStaffAndServe(orderId: string, input: AssignStaffInput): Promise<{ error: string } | void> {
  if (!input.waiterId || !input.chefId || !input.bartenderId) {
    return { error: "Select a waiter, a chef, and a bartender." };
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    return { error: "Order not found." };
  }
  if (order.status !== "PLACED") {
    return { error: "Only a placed order can be marked served." };
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      waiterId: input.waiterId,
      chefId: input.chefId,
      bartenderId: input.bartenderId,
      status: "SERVED",
      servedAt: new Date(),
    },
  });

  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/staff");
}

export async function payOrder(orderId: string): Promise<{ error: string } | void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, payment: true },
  });
  if (!order) {
    return { error: "Order not found." };
  }
  if (order.payment) {
    return { error: "This order is already paid." };
  }
  if (order.status !== "SERVED") {
    return { error: "The order must be served before it can be paid." };
  }

  const amountKobo = order.items.reduce((sum, item) => sum + item.unitPriceKobo * item.quantity, 0);

  await prisma.$transaction([
    prisma.payment.create({ data: { orderId, amountKobo } }),
    prisma.order.update({ where: { id: orderId }, data: { status: "PAID" } }),
  ]);

  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/staff");
}

export async function fileComplaint(orderId: string, message: string): Promise<{ error: string } | void> {
  const trimmed = message.trim();
  if (!trimmed) {
    return { error: "Describe the issue." };
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    return { error: "Order not found." };
  }

  await prisma.complaint.upsert({
    where: { orderId },
    create: { orderId, message: trimmed },
    update: { message: trimmed },
  });

  revalidatePath(`/orders/${orderId}`);
}

export async function submitRating(orderId: string, score: number, comment: string): Promise<{ error: string } | void> {
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    return { error: "Rating must be between 1 and 5." };
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    return { error: "Order not found." };
  }

  const trimmedComment = comment.trim();

  await prisma.rating.upsert({
    where: { orderId },
    create: { orderId, score, comment: trimmedComment || null },
    update: { score, comment: trimmedComment || null },
  });

  revalidatePath(`/orders/${orderId}`);
}
