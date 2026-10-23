// Runs once before the DB integration project: clears the persisted OTP resend throttle so
// back-to-back runs do not hit RATE_LIMITED (30 s per phone). Best-effort; skipped when no DB.
import { createPool } from "@/server/db/client";

export default async function setup() {
  const pool = createPool(process.env.DATABASE_URL ?? "mysql://app:app@127.0.0.1:3307/saidelhi");
  try {
    await pool.query("DELETE FROM otp_challenge");
  } catch {
    // DB unreachable or unmigrated: the integration tests skip themselves.
  } finally {
    await pool.end().catch(() => {});
  }
}
