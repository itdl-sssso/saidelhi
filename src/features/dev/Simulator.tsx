"use client";

// Dev-only WhatsApp bot simulator (English only). Talks to /api/v1/dev/whatsapp/* (404 unless
// WHATSAPP_PROVIDER=console and not production).
import { useCallback, useEffect, useRef, useState } from "react";
import { type SimInboundBody, type SimMessage, type WaOutbound, devWhatsappEndpoints } from "@/contract";
import { type ApiResult, apiRequest } from "@/lib/api";
import { Icon } from "@/ui/Icon";
import { Button } from "@/ui/Button";
import { SideSheet } from "@/ui/SideSheet";
import { cx } from "@/ui/cx";
import s from "./Simulator.module.css";

const PHONES: Array<{ phone: string; label: string }> = [
  { phone: "+919000000001", label: "+91 90000 00001 · Samithi coordinator A" },
  { phone: "+919000000002", label: "+91 90000 00002 · District coordinator B" },
  { phone: "+919000000003", label: "+91 90000 00003 · State admin C" },
  { phone: "+919000000004", label: "+91 90000 00004 · Content editor D" },
  { phone: "+919000000005", label: "+91 90000 00005 · Translator E" },
  { phone: "+919000000006", label: "+91 90000 00006 · PII officer F" },
  { phone: "+919000000007", label: "+91 90000 00007 · District coordinator G" },
  { phone: "+919000000008", label: "+91 90000 00008 · Samithi coordinator H" },
  { phone: "+919000000009", label: "+91 90000 00009 · Invited coordinator I" },
  { phone: "+919876543210", label: "+91 98765 43210 · Public (not registered)" },
];

const time = (at: string) => new Date(at).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
export function Simulator() {
  const [phone, setPhone] = useState(PHONES[0].phone);
  const [messages, setMessages] = useState<SimMessage[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [list, setList] = useState<WaOutbound | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const apply = useCallback((res: ApiResult<SimMessage[]>) => {
    if (res.ok) {
      setNote(null);
      setMessages(res.data);
    } else setNote(`Could not load messages (${res.status}).`);
  }, []);
  const load = useCallback(async (p: string) => apply(await apiRequest<SimMessage[]>(devWhatsappEndpoints.messages(p))), [apply]);

  useEffect(() => {
    let live = true;
    void apiRequest<SimMessage[]>(devWhatsappEndpoints.messages(phone)).then((res) => live && apply(res));
    return () => {
      live = false;
    };
  }, [phone, apply]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const send = async (body: Omit<SimInboundBody, "from">) => {
    setBusy(true);
    const full: SimInboundBody = { from: phone, ...body };
    const res = await apiRequest<WaOutbound[]>(devWhatsappEndpoints.inbound(), { method: "POST", body: full });
    if (!res.ok) setNote(`Send failed (${res.status}): ${res.error.message}`);
    await load(phone);
    setBusy(false);
  };

  const submit = () => {
    const v = text.trim();
    if (!v) return;
    setText("");
    void send({ text: v, replyId: null, media: null });
  };

  const fileRef = useRef<HTMLInputElement>(null);
  /** Real photo: base64 bytes; the typed text rides along as the caption. */
  const attach = async (file: File | null, input: HTMLInputElement) => {
    input.value = "";
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return setNote("File is larger than 10 MB (the bot refuses it too).");
    const bytes = new Uint8Array(await file.arrayBuffer());
    let bin = "";
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    const caption = text.trim() || null;
    setText("");
    await send({ text: caption, replyId: null, media: { kind: "image", name: file.name, mime: file.type || undefined, data: btoa(bin) } });
  };

  const reset = async () => {
    await apiRequest(devWhatsappEndpoints.reset(), { method: "POST", body: { phone } });
    setMessages([]);
    setNote(null);
    await load(phone);
  };

  return (
    <div className={s.wrap}>
      <header className={s.head}>
        <h1 className={s.h1}>WhatsApp bot simulator</h1>
        <p className={s.sub}>Development only. This route is not available in production.</p>
      </header>
      <div className={s.bar}>
        <label className={s.pick}>
          <span>Phone</span>
          <select value={phone} onChange={(e) => setPhone(e.target.value)}>
            {PHONES.map((p) => (
              <option key={p.phone} value={p.phone}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <Button variant="outline" size="sm" icon="undo-2" onClick={reset}>
          Reset conversations
        </Button>
      </div>
      {note ? <p className={s.note}>{note}</p> : null}

      <div className={s.phone}>
        <div className={s.chatHd}>
          <span className={s.avatar}>
            <Icon name="message-circle" size={20} />
          </span>
          <span>
            <b>SSSSO Delhi NCR</b>
            <small>Business account</small>
          </span>
        </div>
        <div className={s.chat} role="log" aria-label="Conversation">
          {messages.length === 0 ? <p className={s.empty}>No messages yet. Type “Hi” to start.</p> : null}
          {messages.map((m, i) => {
            const o = m.out;
            return (
              <div key={i} className={cx(s.bub, m.dir === "in" ? s.in : s.out)}>
                {o?.kind === "template" ? (
                  <span className={s.tmpl}>
                    <Icon name="badge-check" size={16} />
                    Template{o.template ? `: ${o.template}` : ""}
                  </span>
                ) : null}
                <span className={s.body}>{m.text ?? <em>(photo)</em>}</span>
                {o?.buttons?.length ? (
                  <span className={s.btns}>
                    {o.buttons.map((b) => (
                      <button key={b.id} type="button" className={s.qr} disabled={busy} onClick={() => void send({ text: b.title, replyId: b.id, media: null })}>
                        {b.title}
                      </button>
                    ))}
                  </span>
                ) : null}
                {o?.list ? (
                  <button type="button" className={s.qr} disabled={busy} onClick={() => setList(o)}>
                    <Icon name="list" size={16} />
                    {o.list.button}
                  </button>
                ) : null}
                <span className={s.meta}>{time(m.at)}</span>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>
        <form
          className={s.compose}
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => void attach(e.target.files?.[0] ?? null, e.target)} />
          <button type="button" className={s.round} aria-label="Attach a photo from disk (the message text becomes its caption)" disabled={busy} onClick={() => fileRef.current?.click()}>
            <Icon name="paperclip" size={20} />
          </button>
          <button type="button" className={s.round} aria-label="Attach a fake photo (no bytes)" disabled={busy} onClick={() => void send({ text: null, replyId: null, media: { kind: "image", name: "register-photo.jpg" } })}>
            <Icon name="camera" size={20} />
          </button>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message" aria-label="Message" />
          <button type="submit" className={cx(s.round, s.go)} aria-label="Send" disabled={busy || !text.trim()}>
            <Icon name="send" size={20} />
          </button>
        </form>
      </div>

      <SideSheet open={list !== null} onClose={() => setList(null)} title={list?.list?.button ?? ""} side="bottom">
        {list?.list?.sections.map((sec) => (
          <div key={sec.title}>
            <p className={s.secT}>{sec.title}</p>
            {sec.rows.map((r) => (
              <button
                key={r.id}
                type="button"
                className={s.row}
                onClick={() => {
                  setList(null);
                  void send({ text: r.title, replyId: r.id, media: null });
                }}
              >
                <b>{r.title}</b>
                {r.description ? <small>{r.description}</small> : null}
              </button>
            ))}
          </div>
        ))}
      </SideSheet>
    </div>
  );
}
