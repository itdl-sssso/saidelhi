import { z } from "zod";
import { ISODateTime, Id } from "./primitives";

export const FeatureFlags = z.object({
  discourses: z.boolean(),
  offline_mode: z.boolean(),
  ai_extraction: z.boolean(),
  /** v0.10: pull the official "Sai Message for the Day" daily (needs Sadhana Trust permission, like `discourses`). */
  thought_official: z.boolean(),
  /** v0.10.1: WhatsApp outreach (public bot menu near/join/contact, opt-in form + YES, Sevadal broadcasts). Off: the bot only collects plans, reports and photos from coordinators. */
  wa_outreach: z.boolean(),
  /** v0.10.1: automatic WhatsApp reminders and alerts (reminder rules, day-3 escalation notice, Sevadal sign-up alert, monthly report by WhatsApp). Off: only OTP, approval requests/decisions, report links and review questions are sent. */
  wa_reminders: z.boolean(),
});
export type FeatureFlags = z.infer<typeof FeatureFlags>;

export const Health = z.object({
  status: z.enum(["ok", "degraded"]),
  dataSource: z.enum(["mock", "db"]),
  db: z.enum(["ok", "down", "skipped"]),
  time: ISODateTime,
});
export type Health = z.infer<typeof Health>;

/** 201 body of POST /privacy/requests. */
export const PrivacyRequestCreated = z.object({ id: Id });
export type PrivacyRequestCreated = z.infer<typeof PrivacyRequestCreated>;
