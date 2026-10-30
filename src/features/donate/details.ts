/** Trust bank account and contact details. Facts from the legacy getinvolved page; do not reword. */
export const BANK = {
  accountName: "Sri Sathya Sai Trust, Delhi & Punjab",
  bank: "Indian Bank",
  branch: "Ground Floor, 17 Parliament Street, New Delhi 110001",
  branchCode: "P582",
  accountNo: "20032036995",
  ifsc: "IDIB000P582",
  micr: "110019145",
} as const;

export const CONTACT = {
  email: "sp.dl@ssssoindia.org",
  phoneDisplay: "+91 99719 99991",
  phoneTel: "+919971999991",
  whatsapp: "https://wa.me/919971999991",
} as const;

export const RECEIPT_FIELDS = ["name", "address", "pan", "mobile", "amount", "bank", "date", "txn"] as const;
export type ReceiptField = (typeof RECEIPT_FIELDS)[number];
