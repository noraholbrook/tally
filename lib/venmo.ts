/**
 * Build a Venmo deep link that opens the Venmo app (or venmo.com on web)
 * pre-filled with a charge (payment request) for the given recipient.
 *
 * txn=charge  → you are requesting money FROM the recipient
 * txn=pay     → you are sending money TO the recipient
 */
/** Encode a Venmo note: spaces become +, special chars are percent-encoded */
function encodeVenmoNote(note: string): string {
  return encodeURIComponent(note).replace(/%20/g, "+");
}

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
  const encodedNote = encodeVenmoNote(note ?? "Payment request from Tally");
  return `venmo://paycharge?txn=charge&recipients=${username}&amount=${amount}&note=${encodedNote}`;
}

/** Pay someone (txn=pay — you send money to them) */
export function buildVenmoPayUrl({
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
  const encodedNote = encodeVenmoNote(note ?? "Payment via Tally");
  return `venmo://paycharge?txn=pay&recipients=${username}&amount=${amount}&note=${encodedNote}`;
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
  const encodedNote = encodeVenmoNote(note ?? "Payment request from Tally");
  return `https://venmo.com/?txn=charge&recipients=${username}&amount=${amount}&note=${encodedNote}`;
}
