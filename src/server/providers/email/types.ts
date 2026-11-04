// Outgoing email (login codes, monthly reports).

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

export interface EmailProvider {
  readonly name: "console" | "smtp";
  /** Throws ApiError PROVIDER_UNAVAILABLE on failure. */
  send(msg: EmailMessage): Promise<{ id: string }>;
}
