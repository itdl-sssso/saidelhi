// Outgoing email (login codes, invites, monthly reports).

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  /** Optional HTML part (src/server/email/templates.ts); `text` is always sent too. */
  html?: string;
}

export interface EmailProvider {
  readonly name: "console" | "smtp";
  /** Throws ApiError PROVIDER_UNAVAILABLE on failure. */
  send(msg: EmailMessage): Promise<{ id: string }>;
}
