/**
 * Build a Venmo deep link that opens the Venmo app (or venmo.com on web)
 * pre-filled with a charge (payment request) for the given recipient.
 *
 * txn=charge  → you are requesting money FROM the recipient
 * txn=pay     → you are sending money TO the recipient
 */
export function buildVenmoRequestUrl({
  handle,
  amountCents,
  note,
}: {
  handle: string;
  amountCents: number;
  note?: string;
}): string {
  const username = handle.startsWith("@") ? handle.slice(1) : handle;
  const amount = (amountCents / 100).toFixed(2);
  const encodedNote = encodeURIComponent(note ?? "Payment request from Tally");

  // venmo:// opens the native app; falls back gracefully on web
  return `venmo://paycharge?txn=charge&recipients=${username}&amount=${amount}&note=${encodedNote}`;
}

/** Web fallback if the app isn't installed */
export function buildVenmoWebUrl({
  handle,
  amountCents,
  note,
}: {
  handle: string;
  amountCents: number;
  note?: string;
}): string {
  const username = handle.startsWith("@") ? handle.slice(1) : handle;
  const amount = (amountCents / 100).toFixed(2);
  const encodedNote = encodeURIComponent(note ?? "Payment request from Tally");

  return `https://venmo.com/?txn=charge&recipients=${username}&amount=${amount}&note=${encodedNote}`;
}
