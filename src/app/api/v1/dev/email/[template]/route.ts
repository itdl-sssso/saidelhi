import { z } from "zod";
import { inviteEmail, loginCodeEmail, monthlyReportEmail } from "@/server/email/templates";
import { env } from "@/server/env";
import { assertDevSimulator } from "@/server/http/dev-only";
import { route } from "@/server/http/route";

const Params = z.object({ template: z.enum(["login-code", "invite", "monthly-report"]) });
const Query = z.object({ locale: z.enum(["en", "hi"]).default("en") });

/** Dev only: renders an email template as a page (`?locale=hi`) to check the HTML. */
export const GET = route({ params: Params, query: Query, guard: async () => assertDevSimulator() }, async ({ params, query }) => {
  const f = { to: "asha@example.org", locale: query.locale, appUrl: env().APP_URL };
  const hi = query.locale === "hi";
  const m =
    params.template === "login-code"
      ? loginCodeEmail({ ...f, code: "482913", minutes: 5 })
      : params.template === "invite"
        ? inviteEmail({ ...f, name: "Asha", roleLabel: hi ? "समिति समन्वयक (East 2)" : "Samithi coordinator (East 2)", invitedBy: "Ravi Kumar", loginUrl: `${f.appUrl}/admin/login?via=email` })
        : monthlyReportEmail({ ...f, month: hi ? "अक्टूबर 2026" : "October 2026", scopeName: "East", url: `${f.appUrl}/admin/reports` });
  return new Response(m.html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
});
