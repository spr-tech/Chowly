"use client";

import { useState, useTransition } from "react";
import { assignStaffAndServe } from "@/app/actions/orders";

interface StaffOption {
  id: number;
  name: string;
  role: "WAITER" | "CHEF" | "BARTENDER";
}

export function StaffOrderActions({ orderId, staff }: { orderId: string; staff: StaffOption[] }) {
  const waiters = staff.filter((s) => s.role === "WAITER");
  const chefs = staff.filter((s) => s.role === "CHEF");
  const bartenders = staff.filter((s) => s.role === "BARTENDER");

  const [waiterId, setWaiterId] = useState("");
  const [chefId, setChefId] = useState("");
  const [bartenderId, setBartenderId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await assignStaffAndServe(orderId, {
        waiterId: Number(waiterId),
        chefId: Number(chefId),
        bartenderId: Number(bartenderId),
      });
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="border rounded p-3 space-y-2">
      <h2 className="font-medium">Assign staff and mark served</h2>

      <StaffSelect label="Waiter" value={waiterId} onChange={setWaiterId} options={waiters} />
      <StaffSelect label="Chef" value={chefId} onChange={setChefId} options={chefs} />
      <StaffSelect label="Bartender" value={bartenderId} onChange={setBartenderId} options={bartenders} />

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isPending || !waiterId || !chefId || !bartenderId}
        className="bg-black text-white rounded px-3 py-1 disabled:opacity-50"
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
    <select value={value} onChange={(e) => onChange(e.target.value)} className="border rounded p-1 w-full">
      <option value="">{label}…</option>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.name}
        </option>
      ))}
    </select>
  );
}
