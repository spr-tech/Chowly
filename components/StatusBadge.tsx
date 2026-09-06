const STATUS_LABELS = {
  PLACED: "Placed",
  SERVED: "Served",
  PAID: "Paid",
} as const;

const STATUS_CLASSES = {
  PLACED: "bg-saffron/25 text-ink",
  SERVED: "bg-green/15 text-green",
  PAID: "bg-green/15 text-green",
} as const;

export function StatusBadge({ status }: { status: "PLACED" | "SERVED" | "PAID" }) {
  return (
    <span
      className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${STATUS_CLASSES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
