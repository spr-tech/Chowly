"use client";

import { useRef, useState, useTransition } from "react";
import { assignStaffAndServe } from "@/app/actions/orders";

interface StaffOption {
  id: number;
  name: string;
  role: "WAITER" | "CHEF" | "BARTENDER";
}

export function StaffOrderActions({
  orderId,
  staff,
}: {
  orderId: string;
  staff: StaffOption[];
}) {
  const waiters = staff.filter((s) => s.role === "WAITER");
  const chefs = staff.filter((s) => s.role === "CHEF");
  const bartenders = staff.filter((s) => s.role === "BARTENDER");

  const [waiterId, setWaiterId] = useState("");
  const [chefId, setChefId] = useState("");
  const [bartenderId, setBartenderId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  // Synchronous guard against a double-fired click landing before React has
  // re-rendered the disabled button.
  const hasSubmittedRef = useRef(false);

  function handleSubmit() {
    if (hasSubmittedRef.current) return;
    setError(null);
    hasSubmittedRef.current = true;
    startTransition(async () => {
      const result = await assignStaffAndServe(orderId, {
        waiterId: Number(waiterId),
        chefId: Number(chefId),
        bartenderId: Number(bartenderId),
      });
      if (result?.error) {
        setError(result.error);
        hasSubmittedRef.current = false;
      }
    });
  }

  return (
    <div className="space-y-3 rounded-2xl border border-line bg-paper p-5 shadow-sm">
      <h2 className="font-serif text-lg font-semibold">
        Assign staff and mark served
      </h2>

      <StaffSelect
        label="Waiter"
        value={waiterId}
        onChange={setWaiterId}
        options={waiters}
      />
      <StaffSelect
        label="Chef"
        value={chefId}
        onChange={setChefId}
        options={chefs}
      />
      <StaffSelect
        label="Bartender"
        value={bartenderId}
        onChange={setBartenderId}
        options={bartenders}
      />

      {error && <p className="text-sm font-medium text-ink">{error}</p>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isPending || !waiterId || !chefId || !bartenderId}
        className="bg-terracotta text-white rounded-full border px-4 py-2.5 text-sm font-medium transition-transform duration-150 hover:cursor-pointer hover:bg-amber-600 active:scale-[.91] disabled:cursor-not-allowed disabled:opacity-50 shadow-[0_4px_0_0_#B8401E]"
      >
        {isPending ? "Saving…" : "Mark Served"}
      </button>
    </div>
  );
}

function StaffSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: StaffOption[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-line bg-cream p-3 text-base"
    >
      <option value="">{label}…</option>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.name}
        </option>
      ))}
    </select>
  );
}
