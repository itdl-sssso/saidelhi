// Outgoing email (login-code fallback, spec 23). Only a console adapter until
// SMTP credentials exist; add an `smtp` adapter behind the same interface.

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

export interface EmailProvider {
  readonly name: "console";
  /** Throws ApiError PROVIDER_UNAVAILABLE on failure. */
  send(msg: EmailMessage): Promise<{ id: string }>;
}

/** Dev provider: prints every email (login codes included) to the server log. */
export class ConsoleEmail implements EmailProvider {
  readonly name = "console" as const;
  private n = 0;

  constructor(private readonly log: (line: string) => void = (l) => console.info(l)) {}

  async send(msg: EmailMessage) {
    this.log(`[email:console] to=${msg.to} subject="${msg.subject}": ${msg.text}`);
    return { id: `console.email.${++this.n}` };
  }
}

let cached: EmailProvider | undefined;

export function email(): EmailProvider {
  cached ??= new ConsoleEmail();
  return cached;
}
