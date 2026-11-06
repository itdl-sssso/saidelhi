// Branded transactional emails (login code, coordinator invite, monthly report).
// One table-based layout with inline styles (what Gmail/Outlook render), a plain-text
// twin of every message, and EN/HI copy. Colours follow design-system/tokens/colors.css.
import type { Locale } from "@/contract";
import type { EmailMessage } from "../providers/email/types";

const C = {
  page: "#F5F3EF", // sand
  card: "#FFFFFF",
  border: "#E5E7EB", // slate-200
  heading: "#111827", // slate-900
  body: "#1F2937", // slate-800
  muted: "#656C79", // slate-500
  accent: "#D45580", // pink-500
  accentDeep: "#7A2C47", // pink-700
  accentSoft: "#FFF3F5", // pink-50
  accentLine: "#FDD9E2", // pink-100
  gold: "#E8B84E", // gold-300
  link: "#146582", // blue-600
} as const;

const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Noto Sans','Noto Sans Devanagari',Arial,sans-serif";
const SERIF = "Georgia,'Times New Roman','Noto Serif Devanagari',serif";

const ORG = { en: "Sri Sathya Sai Seva Organisations, Delhi NCR", hi: "श्री सत्य साई सेवा संगठन, दिल्ली एनसीआर" } as const;
const PORTAL = { en: "Coordinator portal", hi: "समन्वयक पोर्टल" } as const;
const SAIRAM = { en: "Sai Ram", hi: "साई राम" } as const;

export const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

interface Block {
  /** Short line shown by inboxes next to the subject; never visible in the body. */
  preheader: string;
  heading: string;
  /** Plain sentences; escaped. */
  paragraphs: string[];
  code?: string;
  button?: { label: string; href: string };
  /** Small print under the main content (why they got it, what to do if not them). */
  note: string;
}

interface Frame {
  appUrl: string;
  locale: Locale;
}

function html(f: Frame, b: Block): string {
  const base = f.appUrl.replace(/\/$/, "");
  const p = (t: string) => `<p style="margin:0 0 16px;font:16px/1.6 ${SANS};color:${C.body};">${esc(t)}</p>`;
  const code = b.code
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;"><tr><td style="background:${C.accentSoft};border:1px solid ${C.accentLine};border-radius:12px;padding:16px 28px;font:700 32px/1 'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;letter-spacing:8px;color:${C.accentDeep};">${esc(b.code)}</td></tr></table>`
    : "";
  const button = b.button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;"><tr><td style="border-radius:999px;background:${C.accent};"><a href="${esc(b.button.href)}" style="display:inline-block;padding:14px 28px;font:600 16px/1 ${SANS};color:#FFFFFF;text-decoration:none;border-radius:999px;">${esc(b.button.label)}</a></td></tr></table>
       <p style="margin:0 0 16px;font:13px/1.5 ${SANS};color:${C.muted};">${esc(f.locale === "hi" ? "बटन काम न करे तो यह लिंक खोलें:" : "If the button doesn't work, open this link:")}<br><a href="${esc(b.button.href)}" style="color:${C.link};word-break:break-all;">${esc(b.button.href)}</a></p>`
    : "";
  return `<!doctype html>
<html lang="${f.locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(b.heading)}</title>
</head>
<body style="margin:0;padding:0;background:${C.page};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(b.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.page};">
<tr><td align="center" style="padding:32px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
    <tr><td style="padding:0 4px 16px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="vertical-align:middle;padding-right:12px;"><img src="${base}/brand/emblem-512.png" width="44" height="44" alt="" style="display:block;border:0;border-radius:50%;"></td>
        <td style="vertical-align:middle;">
          <div style="font:600 17px/1.2 ${SERIF};color:${C.heading};">SSSSO Delhi NCR</div>
          <div style="font:600 11px/1.6 ${SANS};letter-spacing:1.2px;text-transform:uppercase;color:${C.accentDeep};">${esc(PORTAL[f.locale])}</div>
        </td>
      </tr></table>
    </td></tr>
    <tr><td style="background:${C.card};border:1px solid ${C.border};border-top:4px solid ${C.gold};border-radius:16px;padding:32px 32px 16px;">
      <h1 style="margin:0 0 16px;font:400 26px/1.25 ${SERIF};color:${C.heading};">${esc(b.heading)}</h1>
      ${b.paragraphs.map(p).join("\n      ")}
      ${code}${button}
      <p style="margin:0 0 16px;font:16px/1.6 ${SANS};color:${C.body};">${esc(SAIRAM[f.locale])} 🙏</p>
    </td></tr>
    <tr><td style="padding:20px 8px 0;font:13px/1.6 ${SANS};color:${C.muted};">
      <p style="margin:0 0 8px;">${esc(b.note)}</p>
      <p style="margin:0;">${esc(ORG[f.locale])} · <a href="${base}" style="color:${C.muted};">${esc(base.replace(/^https?:\/\//, ""))}</a></p>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;
}

function text(f: Frame, b: Block): string {
  const lines = [b.heading, "", ...b.paragraphs.flatMap((t) => [t, ""])];
  if (b.code) lines.push(b.code, "");
  if (b.button) lines.push(`${b.button.label}: ${b.button.href}`, "");
  lines.push(`${SAIRAM[f.locale]}`, "", "--", b.note, ORG[f.locale]);
  return lines.join("\n");
}

function render(to: string, subject: string, f: Frame, b: Block): EmailMessage {
  return { to, subject, text: text(f, b), html: html(f, b) };
}

/** 6-digit sign-in code (by-email sign-in and the WhatsApp fallback). */
export function loginCodeEmail(f: Frame & { to: string; code: string; minutes: number }): EmailMessage {
  const hi = f.locale === "hi";
  return render(f.to, hi ? `आपका साइन-इन कोड: ${f.code}` : `Your sign-in code: ${f.code}`, f, {
    preheader: hi ? `${f.minutes} मिनट में समाप्त होगा। किसी से साझा न करें।` : `Expires in ${f.minutes} minutes. Never share it.`,
    heading: hi ? "आपका साइन-इन कोड" : "Your sign-in code",
    paragraphs: [hi ? "समन्वयक पोर्टल में साइन इन करने के लिए यह कोड लिखें:" : "Enter this code to sign in to the coordinator portal:"],
    code: f.code,
    note: hi
      ? `यह कोड ${f.minutes} मिनट में समाप्त हो जाएगा। इसे किसी से साझा न करें, हमारी टीम का कोई सदस्य भी इसे कभी नहीं माँगेगा। अगर आपने कोड नहीं माँगा, तो यह ईमेल अनदेखा करें।`
      : `The code expires in ${f.minutes} minutes. Never share it; no one from our team will ever ask for it. If you didn't ask for a code, you can ignore this email.`,
  });
}

/** Invite to the portal; `roleLabel` already includes the unit, e.g. "Samithi coordinator (East 2)". */
export function inviteEmail(f: Frame & { to: string; name: string; roleLabel: string; invitedBy: string; loginUrl: string }): EmailMessage {
  const hi = f.locale === "hi";
  return render(f.to, hi ? "समन्वयक पोर्टल का निमंत्रण" : "You're invited to the coordinator portal", f, {
    preheader: hi ? `${f.invitedBy} ने आपको ${f.roleLabel} के रूप में जोड़ा है।` : `${f.invitedBy} added you as ${f.roleLabel}.`,
    heading: hi ? `साई राम, ${f.name}` : `Sai Ram, ${f.name}`,
    paragraphs: hi
      ? [
          `${f.invitedBy} ने आपको SSSSO Delhi NCR समन्वयक पोर्टल में ${f.roleLabel} के रूप में जोड़ा है।`,
          "पोर्टल में आप कार्यक्रम योजना, रिपोर्ट और फ़ॉर्म लिंक संभाल सकते हैं। पासवर्ड नहीं चाहिए: इसी ईमेल पते से साइन इन करें, हम आपको 6 अंकों का कोड भेजेंगे।",
        ]
      : [
          `${f.invitedBy} has added you to the SSSSO Delhi NCR coordinator portal as ${f.roleLabel}.`,
          "The portal is where you plan events, send form links and approve reports. There is no password: sign in with this email address and we'll send you a 6-digit code.",
        ],
    button: { label: hi ? "पोर्टल में साइन इन करें" : "Sign in to the portal", href: f.loginUrl },
    note: hi
      ? "आपको यह ईमेल इसलिए मिला क्योंकि किसी समन्वयक ने आपको पोर्टल में जोड़ा। अगर यह गलती से हुआ है, तो इसे अनदेखा करें।"
      : "You got this email because a coordinator added you to the portal. If this was a mistake, you can ignore it.",
  });
}

/** Monthly seva report is ready (cron `monthly-report`). */
export function monthlyReportEmail(f: Frame & { to: string; month: string; scopeName: string; url: string }): EmailMessage {
  const hi = f.locale === "hi";
  return render(f.to, hi ? `सेवा रिपोर्ट, ${f.month}` : `Seva report, ${f.month}`, f, {
    preheader: hi ? `${f.scopeName} की ${f.month} की रिपोर्ट तैयार है।` : `The ${f.month} report for ${f.scopeName} is ready.`,
    heading: hi ? `${f.month} की सेवा रिपोर्ट` : `Seva report for ${f.month}`,
    paragraphs: [
      hi
        ? `${f.scopeName} की ${f.month} की मासिक सेवा रिपोर्ट तैयार है। इसमें सभी स्वीकृत रिपोर्टें शामिल हैं।`
        : `The monthly seva report for ${f.scopeName}, ${f.month}, is ready. It covers every approved report for the month.`,
    ],
    button: { label: hi ? "रिपोर्ट देखें" : "Open the report", href: f.url },
    note: hi ? "आपको यह ईमेल इसलिए मिला क्योंकि आप इस मासिक रिपोर्ट के प्राप्तकर्ता हैं।" : "You get this email because you are on the recipient list for this monthly report.",
  });
}
