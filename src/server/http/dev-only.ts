import "server-only";
import { env } from "../env";
import { notFound } from "./errors";

/** Dev simulator gate: 404 unless the console provider is active outside production. */
export function assertDevSimulator(): void {
  const e = env();
  if (e.NODE_ENV === "production" || e.WHATSAPP_PROVIDER !== "console") throw notFound();
}
