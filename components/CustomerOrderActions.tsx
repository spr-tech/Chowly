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

  const [ratingScore, setRatingScore] = useState(5);
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
        <div className="border rounded p-3 bg-yellow-50">
          <p className="font-semibold">SIMULATED PAYMENT — not a real transaction</p>
          <p className="text-sm">
            Paid {formatNaira(payment.amountKobo)} on {new Date(payment.paidAt).toLocaleString()}
          </p>
        </div>
      ) : (
        status === "SERVED" && (
          <div className="border rounded p-3 space-y-2">
            <p>Total due: {formatNaira(totalKobo)}</p>
            {payError && <p className="text-red-600 text-sm">{payError}</p>}
            <button
              type="button"
              onClick={handlePay}
              disabled={isPending}
              className="bg-black text-white rounded px-3 py-1 disabled:opacity-50"
            >
              {isPending ? "Paying…" : `Pretend to Pay ${formatNaira(totalKobo)} (Simulated)`}
            </button>
          </div>
        )
      )}

      <div className="border rounded p-3 space-y-2">
        <h2 className="font-medium">Complaint</h2>
        {complaintSent ? (
          <p className="text-sm text-gray-600">Complaint submitted.</p>
        ) : (
          <>
            <textarea
              value={complaintMessage}
              onChange={(e) => setComplaintMessage(e.target.value)}
              className="border rounded p-1 w-full"
              placeholder="What went wrong?"
            />
            <button
              type="button"
              onClick={handleComplaint}
              disabled={isPending || !complaintMessage.trim()}
              className="border rounded px-3 py-1 disabled:opacity-50"
            >
              Submit Complaint
            </button>
          </>
        )}
      </div>

      <div className="border rounded p-3 space-y-2">
        <h2 className="font-medium">Rate your experience</h2>
        {ratingSent ? (
          <p className="text-sm text-gray-600">Thanks for your rating.</p>
        ) : (
          <>
            <select
              value={ratingScore}
              onChange={(e) => setRatingScore(Number(e.target.value))}
              className="border rounded p-1"
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <textarea
              value={ratingComment}
              onChange={(e) => setRatingComment(e.target.value)}
              className="border rounded p-1 w-full"
              placeholder="Optional comment"
            />
            <button
              type="button"
              onClick={handleRating}
              disabled={isPending}
              className="border rounded px-3 py-1 disabled:opacity-50"
            >
              Submit Rating
            </button>
          </>
        )}
      </div>
    </div>
  );
}
