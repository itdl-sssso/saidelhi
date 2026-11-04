// SMTP adapter and the by-email sign-in DTOs.
import type { Transporter } from "nodemailer";
import { describe, expect, it } from "vitest";
import { AuthOtpRequest, AuthVerifyRequest } from "@/contract";
import { ApiError } from "@/server/http/errors";
import { SmtpEmail } from "@/server/providers/email/smtp";

const cfg = { host: "smtp.test", port: 587, secure: false, from: "SSSSO Delhi NCR <no-reply@example.org>" };

describe("SmtpEmail", () => {
  it("sends from the configured sender", async () => {
    const sent: unknown[] = [];
    const transport = { sendMail: async (m: unknown) => (sent.push(m), { messageId: "<1@test>" }) } as unknown as Transporter;
    const r = await new SmtpEmail(cfg, transport).send({ to: "a@example.org", subject: "S", text: "T" });
    expect(r.id).toBe("<1@test>");
    expect(sent).toEqual([{ from: cfg.from, to: "a@example.org", subject: "S", text: "T" }]);
  });

  it("maps transport failures to PROVIDER_UNAVAILABLE", async () => {
    const transport = { sendMail: async () => Promise.reject(new Error("ECONNREFUSED")) } as unknown as Transporter;
    const err = await new SmtpEmail(cfg, transport).send({ to: "a@example.org", subject: "S", text: "T" }).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).code).toBe("PROVIDER_UNAVAILABLE");
  });
});

describe("auth DTOs", () => {
  it("takes exactly one of phone or email, and lower-cases email", () => {
    expect(AuthOtpRequest.parse({ email: " A@Example.ORG " })).toMatchObject({ email: "a@example.org" });
    expect(AuthOtpRequest.parse({ phone: "9000000001" }).channel).toBe("whatsapp");
    expect(AuthOtpRequest.safeParse({}).success).toBe(false);
    expect(AuthOtpRequest.safeParse({ phone: "9000000001", email: "a@example.org" }).success).toBe(false);
    expect(AuthOtpRequest.safeParse({ email: "nope" }).success).toBe(false);
    expect(AuthVerifyRequest.safeParse({ email: "a@example.org", code: "123456" }).success).toBe(true);
  });
});
