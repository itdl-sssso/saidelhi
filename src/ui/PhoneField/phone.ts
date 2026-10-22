// Indian mobile number helpers for the +91 field. Pure, so they are unit-tested.

/** The 10 national digits typed or pasted, dropping a leading +91 / 91 / 0. */
export function phoneDigits(raw: string): string {
  let d = raw.replace(/\D/g, "");
  if (d.length > 10 && d.startsWith("91")) d = d.slice(2);
  else if (d.length > 10 && d.startsWith("0")) d = d.slice(1);
  return d.slice(0, 10);
}

/** "98765 43210" while typing (5 + 5). */
export function formatPhoneMask(digits: string): string {
  const d = digits.slice(0, 10);
  return d.length > 5 ? `${d.slice(0, 5)} ${d.slice(5)}` : d;
}

/** A complete Indian mobile: 10 digits starting 6–9. */
export const isIndianMobile = (digits: string) => /^[6-9]\d{9}$/.test(digits);

export const toE164 = (digits: string) => `+91${digits}`;

/** "+91 90•••••01" for showing back which number a code went to. */
export function maskPhoneDigits(digits: string): string {
  if (digits.length < 4) return `+91 ${digits}`;
  return `+91 ${digits.slice(0, 2)}${"•".repeat(Math.max(0, digits.length - 4))}${digits.slice(-2)}`;
}
