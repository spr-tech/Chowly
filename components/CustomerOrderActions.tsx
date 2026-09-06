"use client";

import { useState, useTransition } from "react";
import { payOrder, fileComplaint, submitRating } from "@/app/actions/orders";
import { formatNaira } from "@/lib/money";
import { ACTIVE_ORDER_STORAGE_KEY } from "@/lib/storage";

interface PaymentInfo {
  amountKobo: number;
  paidAt: Date;
}

export function CustomerOrderActions({
  orderId,
  status,
  totalKobo,
  hasComplaint,
  hasRating,
  payment,
}: {
  orderId: string;
  status: "PLACED" | "SERVED" | "PAID";
  totalKobo: number;
  hasComplaint: boolean;
  hasRating: boolean;
  payment: PaymentInfo | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [payError, setPayError] = useState<string | null>(null);

  const [complaintMessage, setComplaintMessage] = useState("");
  const [complaintSent, setComplaintSent] = useState(hasComplaint);

  const [ratingScore, setRatingScore] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingSent, setRatingSent] = useState(hasRating);

  function handlePay() {
    setPayError(null);
    startTransition(async () => {
      const result = await payOrder(orderId);
      if (result?.error) {
        setPayError(result.error);
        return;
      }
      try {
        if (localStorage.getItem(ACTIVE_ORDER_STORAGE_KEY) === orderId) {
          localStorage.removeItem(ACTIVE_ORDER_STORAGE_KEY);
        }
      } catch {
        // localStorage unavailable — payment still succeeded either way
      }
    });
  }

  function handleComplaint() {
    startTransition(async () => {
      const result = await fileComplaint(orderId, complaintMessage);
      if (!result?.error) {
        setComplaintSent(true);
      }
    });
  }

  function handleRating() {
    startTransition(async () => {
      const result = await submitRating(orderId, ratingScore, ratingComment);
      if (!result?.error) {
        setRatingSent(true);
      }
    });
  }

  return (
    <div className="space-y-4">
      {payment ? (
        <div className="rounded-2xl border-2 border-saffron bg-saffron/25 p-5 shadow-sm">
          <p className="font-serif text-lg font-bold text-ink">
            SIMULATED PAYMENT — not a real transaction
          </p>
          <p className="text-sm text-ink">
            Paid {formatNaira(payment.amountKobo)} on {new Date(payment.paidAt).toLocaleString()}
          </p>
        </div>
      ) : (
        status === "SERVED" && (
          <div className="space-y-3 rounded-2xl border border-line bg-paper p-5 shadow-sm">
            <p className="text-base">Total due: {formatNaira(totalKobo)}</p>
            {payError && <p className="text-sm font-medium text-ink">{payError}</p>}
            <button
              type="button"
              onClick={handlePay}
              disabled={isPending}
              className="w-full rounded-full bg-terracotta px-4 py-3 text-base font-semibold text-white shadow-sm disabled:opacity-50"
            >
              {isPending ? "Paying…" : `Pretend to Pay ${formatNaira(totalKobo)} (Simulated)`}
            </button>
          </div>
        )
      )}

      <div className="space-y-3 rounded-2xl border border-line bg-paper p-5 shadow-sm">
        <h2 className="font-serif text-lg font-semibold">Complaint</h2>
        {complaintSent ? (
          <p className="text-sm text-muted">Complaint submitted.</p>
        ) : (
          <>
            <textarea
              value={complaintMessage}
              onChange={(e) => setComplaintMessage(e.target.value)}
              className="w-full rounded-lg border border-line bg-cream p-3 text-base"
              placeholder="What went wrong?"
            />
            <button
              type="button"
              onClick={handleComplaint}
              disabled={isPending || !complaintMessage.trim()}
              className="w-full rounded-full border border-ink px-4 py-2.5 text-sm font-medium disabled:opacity-50"
            >
              Submit Complaint
            </button>
          </>
        )}
      </div>

      <div className="space-y-3 rounded-2xl border border-line bg-paper p-5 shadow-sm">
        <h2 className="font-serif text-lg font-semibold">Rate your experience</h2>
        {ratingSent ? (
          <p className="text-sm text-muted">Thanks for your rating.</p>
        ) : (
          <>
            <select
              value={ratingScore}
              onChange={(e) => setRatingScore(Number(e.target.value))}
              className="rounded-lg border border-line bg-cream p-3 text-base"
            >
              <option value={0}>Select a rating…</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <textarea
              value={ratingComment}
              onChange={(e) => setRatingComment(e.target.value)}
              className="w-full rounded-lg border border-line bg-cream p-3 text-base"
              placeholder="Optional comment"
            />
            <button
              type="button"
              onClick={handleRating}
              disabled={isPending || ratingScore === 0}
              className="w-full rounded-full border border-ink px-4 py-2.5 text-sm font-medium disabled:opacity-50"
            >
              Submit Rating
            </button>
          </>
        )}
      </div>
    </div>
  );
}
