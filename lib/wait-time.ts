// Queue penalty per active order already ahead of this one, in minutes.
export const QUEUE_MINUTES_PER_ORDER = 3;

interface WaitTimeItem {
  prepTimeMinutes: number;
}

// estimatedWaitMinutes = max(prepTimeMinutes across items in the order)
//                        + QUEUE_MINUTES_PER_ORDER * (active orders placed before this one)
//
// Kitchen and bar work on an order's items in parallel, so the slowest single
// item — not their sum — sets the floor; the queue term accounts for orders
// still ahead in the restaurant's one kitchen/bar. "Active" means status =
// PLACED — a SERVED-but-unpaid order has already cleared the kitchen, so it
// doesn't hold up anyone else's estimate.
export function calculateEstimatedWaitMinutes(
  items: WaitTimeItem[],
  activeOrdersAheadCount: number,
): number {
  if (items.length === 0) {
    throw new Error("Cannot estimate wait time for an order with no items");
  }

  const maxPrepTimeMinutes = Math.max(...items.map((item) => item.prepTimeMinutes));
  return maxPrepTimeMinutes + QUEUE_MINUTES_PER_ORDER * activeOrdersAheadCount;
}
