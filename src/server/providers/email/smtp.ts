// SMTP relay (EMAIL_PROVIDER=smtp): any provider that speaks SMTP (Workspace, Zoho, SES, Brevo…).
import nodemailer, { type Transporter } from "nodemailer";
import { ApiError } from "../../http/errors";
import type { EmailMessage, EmailProvider } from "./types";

export interface SmtpConfig {
  host: string;
  port: number;
  /** true = implicit TLS (465); false = STARTTLS when the server offers it. */
  secure: boolean;
  user?: string;
  pass?: string;
  /** e.g. `SSSSO Delhi NCR <noreply@saidelhi.org>`. */
  from: string;
}

export class SmtpEmail implements EmailProvider {
  readonly name = "smtp" as const;
  private readonly transport: Transporter;

  constructor(
    private readonly cfg: SmtpConfig,
    transport?: Transporter,
  ) {
    this.transport =
      transport ??
      nodemailer.createTransport({
        host: cfg.host,
        port: cfg.port,
        secure: cfg.secure,
        requireTLS: !cfg.secure && cfg.port !== 25,
        auth: cfg.user ? { user: cfg.user, pass: cfg.pass ?? "" } : undefined,
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 15_000,
      });
  }

  async send(msg: EmailMessage) {
    try {
      const info = await this.transport.sendMail({ from: this.cfg.from, to: msg.to, subject: msg.subject, text: msg.text, html: msg.html });
      return { id: String(info.messageId ?? "") };
    } catch (err) {
      // Never log the message body: it can hold a login code.
      console.error(`[email:smtp] send failed: ${err instanceof Error ? err.message : String(err)}`);
      throw new ApiError("PROVIDER_UNAVAILABLE", { cause: err });
    }
  }
}
