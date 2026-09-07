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
  const [hoveredStar, setHoveredStar] = useState(0); // 0 = nothing hovered
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
            Paid {formatNaira(payment.amountKobo)} on{" "}
            {new Date(payment.paidAt).toLocaleString()}
          </p>
        </div>
      ) : (
        status === "SERVED" && (
          <div className="space-y-3 rounded-2xl border border-line bg-paper p-5 shadow-sm">
            <p className="text-base">Total due: {formatNaira(totalKobo)}</p>
            {payError && (
              <p className="text-sm font-medium text-ink">{payError}</p>
            )}
            <button
              type="button"
              onClick={handlePay}
              disabled={isPaying}
              className="w-full rounded-full border bg-terracotta px-4 py-2.5 text-sm font-medium text-white transition-all duration-150 not-disabled:hover:cursor-pointer not-disabled:hover:bg-terracotta/90 not-disabled:active:scale-[.97] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPaying
                ? "Paying…"
                : `Pretend to Pay ${formatNaira(totalKobo)} (Simulated)`}
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
              className="bg-terracotta text-white rounded-full border px-4 py-2.5 text-sm font-medium transition-transform duration-150 hover:cursor-pointer active:scale-[.91] disabled:cursor-not-allowed disabled:opacity-50 shadow-[0_4px_0_0_#B8401E]"
            >
              {isSubmittingComplaint ? "Submitting…" : "Submit Complaint"}
            </button>
          </>
        )}
      </div>

      <div className="space-y-3 rounded-2xl border border-line bg-paper p-5 shadow-sm">
        <h2 className="font-serif text-lg font-semibold">
          Rate your experience
        </h2>
        {ratingSent ? (
          <p className="text-sm text-muted">Thanks for your rating.</p>
        ) : (
          <>
            <div className="flex gap-1" onMouseLeave={() => setHoveredStar(0)}>
              {[1, 2, 3, 4, 5].map((n) => {
                // While hovering, the hover value wins so the preview lights
                // up; once the mouse leaves, hoveredStar resets to 0 and this
                // falls back to showing whatever was actually clicked.
                const filled = n <= (hoveredStar || ratingScore);
                return (
                  <button
                    key={n}
                    type="button"
                    onMouseEnter={() => setHoveredStar(n)}
                    onClick={() => setRatingScore(n)}
                    aria-label={`Rate ${n} star${n > 1 ? "s" : ""}`}
                    className="p-0.5"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className={`h-8 w-8 ${
                        filled
                          ? "fill-yellow-400 stroke-yellow-400"
                          : "fill-none stroke-line"
                      }`}
                      strokeWidth={1.5}
                    >
                      <path d="M12 2.5l2.9 6.4 6.9.7-5.2 4.7 1.5 6.9L12 17.6 5.9 21.2l1.5-6.9-5.2-4.7 6.9-.7L12 2.5z" />
                    </svg>
                  </button>
                );
              })}
            </div>
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
