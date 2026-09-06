"use client";

import { useTransition } from "react";
import { setViewerRole } from "@/app/actions/role";
import type { ViewerRole } from "@/lib/role";

export function RoleToggle({ role }: { role: ViewerRole }) {
  const [isPending, startTransition] = useTransition();

  function handleClick(next: ViewerRole) {
    if (next === role || isPending) return;
    startTransition(() => setViewerRole(next));
  }

  return (
    <div className="flex gap-1 border rounded p-0.5 text-sm">
      <button
        type="button"
        onClick={() => handleClick("customer")}
        className={`px-3 py-1 rounded ${role === "customer" ? "bg-black text-white" : ""}`}
      >
        Customer
      </button>
      <button
        type="button"
        onClick={() => handleClick("staff")}
        className={`px-3 py-1 rounded ${role === "staff" ? "bg-black text-white" : ""}`}
      >
        Staff
      </button>
    </div>
  );
}
