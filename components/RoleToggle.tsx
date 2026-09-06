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
    <div className="flex gap-1 rounded-full border border-line bg-paper p-1 text-sm">
      <button
        type="button"
        onClick={() => handleClick("customer")}
        className={`rounded-full px-3 py-1.5 transition-colors ${
          role === "customer" ? "bg-ink text-paper" : "text-muted"
        }`}
      >
        Customer
      </button>
      <button
        type="button"
        onClick={() => handleClick("staff")}
        className={`rounded-full px-3 py-1.5 transition-colors ${
          role === "staff" ? "bg-ink text-paper" : "text-muted"
        }`}
      >
        Staff
      </button>
    </div>
  );
}
