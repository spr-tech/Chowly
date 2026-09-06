"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { placeOrder } from "@/app/actions/orders";
import { formatNaira } from "@/lib/money";
import { ACTIVE_ORDER_STORAGE_KEY } from "@/lib/storage";
import { ActiveOrderBanner } from "@/components/ActiveOrderBanner";

interface TableOption {
  id: number;
  number: number;
  occupied: boolean;
}

interface MenuItemOption {
  id: number;
  name: string;
  description: string | null;
  category: "FOOD" | "DRINK";
  priceKobo: number;
  prepTimeMinutes: number;
}

export function CustomerOrderFlow({
  tables,
  menuItems,
}: {
  tables: TableOption[];
  menuItems: MenuItemOption[];
}) {
  const router = useRouter();
  const [tableId, setTableId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [cart, setCart] = useState<Record<number, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const foodItems = menuItems.filter((item) => item.category === "FOOD");
  const drinkItems = menuItems.filter((item) => item.category === "DRINK");

  const cartLines = useMemo(
    () =>
      menuItems
        .filter((item) => (cart[item.id] ?? 0) > 0)
        .map((item) => ({ ...item, quantity: cart[item.id] })),
    [cart, menuItems],
  );

  const totalKobo = cartLines.reduce((sum, line) => sum + line.priceKobo * line.quantity, 0);

  function setQuantity(menuItemId: number, quantity: number) {
    setCart((prev) => ({ ...prev, [menuItemId]: Math.max(0, quantity) }));
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await placeOrder({
        tableId: Number(tableId),
        customerName,
        items: cartLines.map((line) => ({ menuItemId: line.id, quantity: line.quantity })),
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }

      try {
        localStorage.setItem(ACTIVE_ORDER_STORAGE_KEY, result.orderId);
      } catch {
        // localStorage unavailable — the order still went through, the
        // customer just won't see the "view your current order" link later
      }
      router.push(`/orders/${result.orderId}`);
    });
  }

  return (
    <main className="p-4 max-w-2xl mx-auto space-y-6">
      <ActiveOrderBanner />

      <div>
        <h1 className="text-xl font-semibold">The Juniper Room</h1>
        <p className="text-sm text-gray-600">14 Palm Avenue, Lagos</p>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium" htmlFor="customerName">
          Your name
        </label>
        <input
          id="customerName"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          className="border rounded p-2 w-full"
          placeholder="e.g. Ada"
        />

        <label className="block text-sm font-medium" htmlFor="table">
          Table
        </label>
        <select
          id="table"
          value={tableId}
          onChange={(e) => setTableId(e.target.value)}
          className="border rounded p-2 w-full"
        >
          <option value="">Select a table…</option>
          {tables.map((table) => (
            <option key={table.id} value={table.id} disabled={table.occupied}>
              Table {table.number}
              {table.occupied ? " (occupied)" : ""}
            </option>
          ))}
        </select>
      </div>

      <MenuSection title="Food" items={foodItems} cart={cart} setQuantity={setQuantity} />
      <MenuSection title="Drinks" items={drinkItems} cart={cart} setQuantity={setQuantity} />

      <div className="border rounded p-3 space-y-2">
        <h2 className="font-medium">Your order</h2>
        {cartLines.length === 0 ? (
          <p className="text-sm text-gray-500">No items yet.</p>
        ) : (
          <ul className="divide-y">
            {cartLines.map((line) => (
              <li key={line.id} className="flex justify-between py-1">
                <span>
                  {line.quantity} x {line.name}
                </span>
                <span>{formatNaira(line.priceKobo * line.quantity)}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="text-right font-semibold">Total: {formatNaira(totalKobo)}</div>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isPending || !tableId || !customerName.trim() || cartLines.length === 0}
        className="bg-black text-white rounded px-4 py-2 disabled:opacity-50"
      >
        {isPending ? "Placing order…" : "Place Order"}
      </button>
    </main>
  );
}

function MenuSection({
  title,
  items,
  cart,
  setQuantity,
}: {
  title: string;
  items: MenuItemOption[];
  cart: Record<number, number>;
  setQuantity: (menuItemId: number, quantity: number) => void;
}) {
  return (
    <div>
      <h2 className="font-medium mb-2">{title}</h2>
      <ul className="divide-y border rounded">
        {items.map((item) => {
          const quantity = cart[item.id] ?? 0;
          return (
            <li key={item.id} className="p-2 flex items-center justify-between gap-2">
              <div>
                <p className="font-medium">{item.name}</p>
                {item.description && <p className="text-sm text-gray-600">{item.description}</p>}
                <p className="text-sm text-gray-600">
                  {formatNaira(item.priceKobo)} · ~{item.prepTimeMinutes} min
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setQuantity(item.id, quantity - 1)}
                  className="border rounded w-7 h-7"
                  aria-label={`Remove one ${item.name}`}
                >
                  -
                </button>
                <span className="w-6 text-center">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity(item.id, quantity + 1)}
                  className="border rounded w-7 h-7"
                  aria-label={`Add one ${item.name}`}
                >
                  +
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
