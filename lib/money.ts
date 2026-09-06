// Money is always stored as an Int in kobo (1/100 of a naira). This is the
// one place that turns it back into something a customer or waiter reads.
export function formatNaira(kobo: number): string {
  const naira = kobo / 100;
  return `₦${naira.toLocaleString("en-NG")}`;
}
