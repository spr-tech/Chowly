"use client";

import { useRef, useState, useTransition } from "react";
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
  // Three independent transitions, not one shared — a shared pending flag
  // meant clicking "Submit Complaint" would also show "Paying…" on the
  // payment button, since they'd all be reading the same isPending.
  const [isPaying, startPayTransition] = useTransition();
  const [isSubmittingComplaint, startComplaintTransition] = useTransition();
  const [isSubmittingRating, startRatingTransition] = useTransition();
  const [payError, setPayError] = useState<string | null>(null);

  // Synchronous guards: two clicks fired faster than React can re-render a
  // disabled button both run before `isPending` would stop them. A ref is
  // checked and set in the same tick, so the second click is rejected no
  // matter how fast it arrives — this is the one that matters most, since a
  // race here would attempt two Payment rows for the same order.
  const hasPaidRef = useRef(false);
  const hasSubmittedComplaintRef = useRef(false);
  const hasSubmittedRatingRef = useRef(false);

  const [complaintMessage, setComplaintMessage] = useState("");
  const [complaintSent, setComplaintSent] = useState(hasComplaint);

  const [ratingScore, setRatingScore] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingSent, setRatingSent] = useState(hasRating);

  function handlePay() {
    if (hasPaidRef.current) return;
    setPayError(null);
    hasPaidRef.current = true;
    startPayTransition(async () => {
      const result = await payOrder(orderId);
      if (result?.error) {
        setPayError(result.error);
        hasPaidRef.current = false;
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
    if (hasSubmittedComplaintRef.current) return;
    hasSubmittedComplaintRef.current = true;
    startComplaintTransition(async () => {
      const result = await fileComplaint(orderId, complaintMessage);
      if (!result?.error) {
        setComplaintSent(true);
      } else {
        hasSubmittedComplaintRef.current = false;
      }
    });
  }

  function handleRating() {
    if (hasSubmittedRatingRef.current) return;
    hasSubmittedRatingRef.current = true;
    startRatingTransition(async () => {
      const result = await submitRating(orderId, ratingScore, ratingComment);
      if (!result?.error) {
        setRatingSent(true);
      } else {
        hasSubmittedRatingRef.current = false;
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
              disabled={isPaying}
              className="w-full rounded-full bg-terracotta px-4 py-3 text-base font-semibold text-white shadow-sm disabled:opacity-50"
            >
              {isPaying ? "Paying…" : `Pretend to Pay ${formatNaira(totalKobo)} (Simulated)`}
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
              disabled={isSubmittingComplaint || !complaintMessage.trim()}
              className="w-full rounded-full border border-ink px-4 py-2.5 text-sm font-medium disabled:opacity-50"
            >
              {isSubmittingComplaint ? "Submitting…" : "Submit Complaint"}
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
              disabled={isSubmittingRating || ratingScore === 0}
              className="w-full rounded-full border border-ink px-4 py-2.5 text-sm font-medium disabled:opacity-50"
            >
              {isSubmittingRating ? "Submitting…" : "Submit Rating"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
