"use client";

import { useTransition } from "react";
import { setViewerRole } from "@/app/actions/role";
import type { ViewerRole } from "@/lib/role";
import { FOCUS_RING_CLASSES } from "@/lib/styles";

function ClocheIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 18h18" />
      <path d="M4 18a8 8 0 0 1 16 0" />
      <path d="M12 10V7" />
      <circle cx="12" cy="6" r="1" />
    </svg>
  );
}

function ChefHatIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 18h12v2a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-2Z" />
      <path d="M6 18V13a4 4 0 0 1-1-7.5A4 4 0 0 1 12 4a4 4 0 0 1 7 1.5A4 4 0 0 1 18 13v5" />
    </svg>
  );
}

export function RoleToggle({ role }: { role: ViewerRole }) {
  const [isPending, startTransition] = useTransition();

  function handleClick(next: ViewerRole) {
    if (next === role || isPending) return;
    startTransition(() => setViewerRole(next));
  }

  const base =
    "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors";
  const active = "bg-terracotta text-white shadow-sm";
  const inactive = "text-muted hover:text-ink cursor-pointer";

  return (
    <div className="flex gap-1 rounded-full border border-line bg-paper p-1 ">
      <button
        type="button"
        onClick={() => handleClick("customer")}
        aria-pressed={role === "customer"}
        className={`${base} ${role === "customer" ? active : inactive} ${FOCUS_RING_CLASSES} text-sm`}
      >
        <ClocheIcon className="h-3 w-3" />
        <span className="text-[0.8rem]">Customer</span>
      </button>
      <button
        type="button"
        onClick={() => handleClick("staff")}
        aria-pressed={role === "staff"}
        className={`${base} ${role === "staff" ? active : inactive} ${FOCUS_RING_CLASSES}`}
      >
        <ChefHatIcon className="h-3 w-3" />

        <span className="text-[0.8rem]">staff</span>
      </button>
    </div>
  );
}
