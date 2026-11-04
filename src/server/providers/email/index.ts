import "server-only";
import { env } from "../../env";
import { ConsoleEmail } from "./console";
import { SmtpEmail } from "./smtp";
import type { EmailProvider } from "./types";

export type { EmailMessage, EmailProvider } from "./types";
export { ConsoleEmail } from "./console";

let cached: EmailProvider | undefined;

/** Provider selected by EMAIL_PROVIDER (env() already checked the SMTP_* vars for `smtp`). */
export function email(): EmailProvider {
  if (cached) return cached;
  const e = env();
  cached =
    e.EMAIL_PROVIDER === "smtp"
      ? new SmtpEmail({ host: e.SMTP_HOST!, port: e.SMTP_PORT, secure: e.SMTP_SECURE, user: e.SMTP_USER, pass: e.SMTP_PASS, from: e.SMTP_FROM! })
      : new ConsoleEmail();
  return cached;
}
