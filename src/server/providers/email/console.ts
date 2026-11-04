import type { EmailMessage, EmailProvider } from "./types";

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
