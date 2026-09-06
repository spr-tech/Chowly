// Queue penalty per unpaid order already ahead of this one, in minutes.
export const QUEUE_MINUTES_PER_ORDER = 3;

interface WaitTimeItem {
  prepTimeMinutes: number;
}

// estimatedWaitMinutes = max(prepTimeMinutes across items in the order)
//                        + QUEUE_MINUTES_PER_ORDER * (unpaid orders placed before this one)
//
// Kitchen and bar work on an order's items in parallel, so the slowest single
// item — not their sum — sets the floor; the queue term accounts for orders
// already ahead in the restaurant's one kitchen/bar.
export function calculateEstimatedWaitMinutes(
  items: WaitTimeItem[],
  unpaidOrdersAheadCount: number,
): number {
  if (items.length === 0) {
    throw new Error("Cannot estimate wait time for an order with no items");
  }

  const maxPrepTimeMinutes = Math.max(...items.map((item) => item.prepTimeMinutes));
  return maxPrepTimeMinutes + QUEUE_MINUTES_PER_ORDER * unpaidOrdersAheadCount;
}
