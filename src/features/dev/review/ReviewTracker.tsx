"use client";

// Dev-only page-by-page review tracker. Talks to /api/dev/review (404 in production). English only.
import { useCallback, useEffect, useMemo, useRef, useState, type ClipboardEvent } from "react";
import type { ReviewDoc, ReviewItem, ReviewStatus } from "@/server/dev/review-schema";
import { Badge, type BadgeTone } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { Checkbox } from "@/ui/Checkbox";
import { Input, Textarea } from "@/ui/Input";
import { ProgressBar } from "@/ui/ProgressBar";
import { SaveStatus, type SaveState } from "@/ui/SaveStatus";
import { Select } from "@/ui/Select";
import { cx } from "@/ui/cx";
import { GROUP_LABEL, hindiPath, PORTAL_AREAS, ROLES, specFile, type ReviewEntry, type ReviewGroup } from "./catalog";
import s from "./ReviewTracker.module.css";

const STATUS_OPTIONS: Array<{ value: ReviewStatus; label: string; tone: BadgeTone }> = [
  { value: "not_tested", label: "Not tested", tone: "neutral" },
  { value: "works", label: "Works", tone: "sathya" },
  { value: "minor", label: "Minor issues", tone: "shanti" },
  { value: "broken", label: "Broken", tone: "prem" },
  { value: "mismatch", label: "Doesn't match design", tone: "prem" },
];
const STATUS_BY = Object.fromEntries(STATUS_OPTIONS.map((o) => [o.value, o])) as Record<ReviewStatus, (typeof STATUS_OPTIONS)[number]>;

const blank = (): ReviewItem => ({ status: "not_tested", devices: { desktop: false, mobile: false, hindi: false }, notes: "", shots: [], updatedAt: "" });
const designUrl = (p: string) => `/api/dev/design/${p.split("/").map(encodeURIComponent).join("/")}`;
const shotUrl = (f: string) => `/api/dev/review/shots?file=${encodeURIComponent(f)}`;
const MAX_ROUNDS = 99;

type Filters = { status: "all" | ReviewStatus; group: "all" | ReviewGroup; q: string };

async function uploadShot(id: string, file: Blob): Promise<string> {
  const fd = new FormData();
  fd.set("id", id);
  fd.set("file", file, "shot");
  const r = await fetch("/api/dev/review/shots", { method: "POST", body: fd });
  const body = (await r.json().catch(() => ({}))) as { name?: string; error?: string };
  if (!r.ok || !body.name) throw new Error(body.error ?? `upload failed (${r.status})`);
  return body.name;
}

function Shots({ id, shots, onChange }: { id: string; shots: string[]; onChange: (next: string[]) => void }) {
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const add = async (files: File[]) => {
    setErr(null);
    setBusy(true);
    try {
      let next = shots;
      for (const f of files) {
        next = [...next, await uploadShot(id, f)];
        onChange(next);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "upload failed");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className={s.shots}>
      <div className={s.shotRow}>
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          className="sr-only"
          aria-label="Add screenshot files"
          onChange={(e) => {
            const f = [...(e.target.files ?? [])];
            e.target.value = "";
            if (f.length) void add(f);
          }}
        />
        <Button variant="outline" size="sm" icon="camera" pending={busy} onClick={() => input.current?.click()}>
          Add screenshot
        </Button>
        <span className={s.hint}>or paste an image into the notes box (png, jpg, webp, up to 5 MB)</span>
      </div>
      {err ? (
        <p role="alert" className={s.err}>
          {err}
        </p>
      ) : null}
      {shots.length ? (
        <ul className={s.thumbs}>
          {shots.map((f) => (
            <li key={f} className={s.thumb}>
              <a href={shotUrl(f)} target="_blank" rel="noopener noreferrer" aria-label={`Open screenshot ${f}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={shotUrl(f)} alt={`Screenshot ${f}`} loading="lazy" />
              </a>
              <button type="button" className={s.thumbX} aria-label={`Remove ${f} from this item`} onClick={() => onChange(shots.filter((x) => x !== f))}>
                x
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function pasteHandler(add: (f: File[]) => void) {
  return (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const files = [...e.clipboardData.files].filter((f) => f.type.startsWith("image/"));
    if (files.length) {
      e.preventDefault();
      add(files);
    }
  };
}

function ItemCard({ entry, item, onChange }: { entry: ReviewEntry; item: ReviewItem; onChange: (patch: Partial<ReviewItem>) => void }) {
  const st = STATUS_BY[item.status];
  const role = entry.role ? ROLES[entry.role] : null;
  const open = (path: string) => `${window.location.origin}${path}`;
  const pasteAdd = async (files: File[]) => {
    let next = item.shots;
    try {
      for (const f of files) {
        next = [...next, await uploadShot(entry.id, f)];
        onChange({ shots: next });
      }
    } catch {
      /* upload errors show on the Add screenshot control */
    }
  };
  return (
    <Card as="li" className={cx(s.item, item.status !== "not_tested" && s[`st_${item.status}`])} id={`item-${entry.id}`}>
      <div className={s.itemHead}>
        <div className={s.itemTitle}>
          <h3>{entry.title}</h3>
          <code className={s.path}>{entry.path}</code>
        </div>
        <Badge tone={st.tone}>{st.label}</Badge>
      </div>
      <div className={s.meta}>
        <Badge>{entry.area ? `${GROUP_LABEL[entry.group]} · ${entry.area}` : GROUP_LABEL[entry.group]}</Badge>
        {entry.spec ? (
          <span title={specFile(entry.spec.n)}>
            Spec {entry.spec.n} · {entry.spec.name}
          </span>
        ) : null}
        {entry.design?.map((d) => (
          <a key={d.path} href={designUrl(d.path)} target="_blank" rel="noopener noreferrer" className={s.link}>
            Design: {d.label}
          </a>
        ))}
      </div>
      {role ? (
        <p className={s.role}>
          Log in as <strong>{role.label}</strong> <code>{role.phone}</code> at /admin/login (OTP in the review server log).
        </p>
      ) : null}
      {entry.note ? <p className={s.note}>{entry.note}</p> : null}
      <div className={s.actions}>
        <Button href={entry.path} external size="sm" iconAfter="external-link">
          Open
        </Button>
        <Button
          variant="outline"
          size="sm"
          icon="smartphone"
          onClick={() => window.open(open(entry.path), `review-${entry.id}`, "popup,width=390,height=800,noopener")}
        >
          Open 375px
        </Button>
        {!entry.path.startsWith("/hi") && !entry.path.startsWith("/dev") ? (
          <Button href={hindiPath(entry.path)} external variant="ghost" size="sm" icon="languages">
            Open in Hindi
          </Button>
        ) : null}
      </div>
      <div className={s.form}>
        <Select
          label="Status"
          value={item.status}
          onChange={(e) => onChange({ status: e.target.value as ReviewStatus })}
          options={STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
        />
        <fieldset className={s.devices}>
          <legend>Checked on</legend>
          {(["desktop", "mobile", "hindi"] as const).map((d) => (
            <Checkbox
              key={d}
              label={d === "hindi" ? "Hindi" : d === "mobile" ? "Mobile" : "Desktop"}
              checked={item.devices[d]}
              onChange={(e) => onChange({ devices: { ...item.devices, [d]: e.target.checked } })}
            />
          ))}
        </fieldset>
      </div>
      <Textarea
        label="Notes"
        rows={3}
        value={item.notes}
        placeholder="What you saw, what you expected. Paste a screenshot here."
        onChange={(e) => onChange({ notes: e.target.value })}
        onPaste={pasteHandler((f) => void pasteAdd(f))}
      />
      <div>
        <Shots id={entry.id} shots={item.shots} onChange={(shots) => onChange({ shots })} />
      </div>
    </Card>
  );
}

function GeneralCard({ note: g, onPatch, onRemove }: { note: ReviewDoc["general"][number]; onPatch: (patch: Partial<ReviewDoc["general"][number]>) => void; onRemove: () => void }) {
  const pasteAdd = async (files: File[]) => {
    let next = g.shots;
    for (const f of files) {
      try {
        next = [...next, await uploadShot(g.id, f)];
        onPatch({ shots: next });
      } catch {
        /* the Add screenshot button shows the error */
      }
    }
  };
  return (
    <Card as="li" className={s.item}>
      <Input label="Title" value={g.title} onChange={(e) => onPatch({ title: e.target.value })} placeholder="What is this about?" />
      <Textarea label="Note" rows={3} value={g.notes} onChange={(e) => onPatch({ notes: e.target.value })} onPaste={pasteHandler((files) => void pasteAdd(files))} />
      <Shots id={g.id} shots={g.shots} onChange={(shots) => onPatch({ shots })} />
      <div>
        <Button variant="ghost" size="sm" icon="trash-2" onClick={onRemove}>
          Remove note
        </Button>
      </div>
    </Card>
  );
}

export function ReviewTracker({ catalog, initialRounds }: { catalog: ReviewEntry[]; initialRounds: string[] }) {
  const [round, setRound] = useState(initialRounds[0] ?? "round-1");
  const [rounds, setRounds] = useState(initialRounds);
  const [doc, setDoc] = useState<ReviewDoc | null>(null);
  const [save, setSave] = useState<SaveState>("sent");
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({ status: "all", group: "all", q: "" });
  const docRef = useRef<ReviewDoc | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const seq = useRef(0);

  const titles = useMemo(() => Object.fromEntries(catalog.map((e) => [e.id, { title: e.title, path: e.path, group: e.area ? `${GROUP_LABEL[e.group]} / ${e.area}` : GROUP_LABEL[e.group] }])), [catalog]);

  useEffect(() => {
    let live = true;
    fetch(`/api/dev/review?round=${round}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`load failed (${r.status})`))))
      .then((b: { doc: ReviewDoc; rounds: string[] }) => {
        if (!live) return;
        docRef.current = b.doc;
        setDoc(b.doc);
        setRounds((cur) => [...new Set([...cur, ...b.rounds])].sort((a, c) => Number(a.slice(6)) - Number(c.slice(6))));
        setSave("sent");
      })
      .catch((e: unknown) => live && setLoadErr(e instanceof Error ? e.message : "load failed"));
    return () => {
      live = false;
    };
  }, [round]);

  const flush = useCallback(async () => {
    const d = docRef.current;
    if (!d) return;
    const mine = ++seq.current;
    setSave("sending");
    try {
      const r = await fetch(`/api/dev/review?round=${d.round}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ doc: d, titles }) });
      if (!r.ok) throw new Error(String(r.status));
      if (mine === seq.current && !timer.current) setSave("sent");
    } catch {
      setSave("error");
    }
  }, [titles]);

  const mutate = useCallback(
    (fn: (d: ReviewDoc) => ReviewDoc) => {
      const cur = docRef.current;
      if (!cur) return;
      const next = fn(cur);
      docRef.current = next;
      setDoc(next);
      setSave("local");
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        timer.current = undefined;
        void flush();
      }, 700);
    },
    [flush],
  );

  // Save pending edits when leaving the tab.
  useEffect(() => {
    const onHide = () => {
      if (!timer.current || !docRef.current) return;
      clearTimeout(timer.current);
      timer.current = undefined;
      void fetch(`/api/dev/review?round=${docRef.current.round}`, { method: "PUT", keepalive: true, headers: { "content-type": "application/json" }, body: JSON.stringify({ doc: docRef.current, titles }) });
    };
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, [titles]);

  const switchRound = (id: string) => {
    if (id === round) return;
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = undefined;
      void flush();
    }
    docRef.current = null;
    setDoc(null);
    setLoadErr(null);
    setRound(id);
  };

  const patchItem = (id: string, patch: Partial<ReviewItem>) =>
    mutate((d) => ({ ...d, items: { ...d.items, [id]: { ...(d.items[id] ?? blank()), ...patch, updatedAt: new Date().toISOString() } } }));

  const patchGeneral = (id: string, patch: Partial<ReviewDoc["general"][number]>) =>
    mutate((d) => ({ ...d, general: d.general.map((g) => (g.id === id ? { ...g, ...patch, updatedAt: new Date().toISOString() } : g)) }));

  const addGeneral = () =>
    mutate((d) => ({ ...d, general: [...d.general, { id: `note-${Date.now().toString(36)}`, title: "", notes: "", shots: [], updatedAt: new Date().toISOString() }] }));

  const removeGeneral = (id: string) => mutate((d) => ({ ...d, general: d.general.filter((g) => g.id !== id) }));

  const startNextRound = () => {
    const n = Math.max(...rounds.map((r) => Number(r.slice(6)))) + 1;
    if (n > MAX_ROUNDS) return;
    const id = `round-${n}`;
    setRounds((r) => [...r, id]);
    switchRound(id);
  };

  const statusOf = (id: string): ReviewStatus => doc?.items[id]?.status ?? "not_tested";
  const counts = useMemo(() => {
    const c: Record<ReviewStatus, number> = { not_tested: 0, works: 0, minor: 0, broken: 0, mismatch: 0 };
    for (const e of catalog) c[statusOf(e.id)]++;
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog, doc]);
  const total = catalog.length;
  const tested = total - counts.not_tested;

  const visible = catalog.filter((e) => {
    if (filters.group !== "all" && e.group !== filters.group) return false;
    if (filters.status !== "all" && statusOf(e.id) !== filters.status) return false;
    const q = filters.q.trim().toLowerCase();
    return !q || `${e.title} ${e.path} ${e.id} ${e.spec?.name ?? ""} ${e.area ?? ""}`.toLowerCase().includes(q);
  });

  const groups = (Object.keys(GROUP_LABEL) as ReviewGroup[]).filter((g) => filters.group === "all" || filters.group === g);
  const showGeneral = filters.group === "all" && filters.status === "all" && !filters.q.trim();

  return (
    <div className={s.page}>
      <header className={s.top}>
        <div>
          <h1>Review tracker</h1>
          <p className={s.lead}>Test the app page by page and leave feedback. Claude reads it from <code>docs/feedback/{round}.md</code>.</p>
        </div>
        <div className={s.roundBox}>
          <Select label="Round" value={round} onChange={(e) => switchRound(e.target.value)} options={rounds.map((r) => ({ value: r, label: r }))} />
          <Button variant="outline" size="sm" icon="plus" onClick={startNextRound}>
            Start next round
          </Button>
        </div>
      </header>

      <details className={s.howto} open>
        <summary>How to test</summary>
        <ol>
          <li>
            Public and form-link pages: press <strong>Open</strong> (new tab) or <strong>Open 375px</strong> (phone-width window). Check Hindi with <strong>Open in Hindi</strong>.
          </li>
          <li>
            Portal pages: go to <a href="/admin/login" target="_blank" rel="noopener noreferrer">/admin/login</a>, enter the dev phone shown on the item (for example +91 90000 00003 for state admin).
            The 6-digit code is printed in the terminal or log of this review server, in a line starting <code>[whatsapp:console]</code>.
          </li>
          <li>Set a status, tick what you checked, add notes. A screenshot can be pasted into the notes box. Everything saves by itself.</li>
        </ol>
        <p className={s.roleList}>
          Dev logins:{" "}
          {Object.values(ROLES).map((r) => (
            <span key={r.phone}>
              <code>{r.phone}</code> {r.label};{" "}
            </span>
          ))}
        </p>
      </details>

      <section className={s.sticky} aria-label="Progress and filters">
        <ProgressBar
          value={total ? (tested / total) * 100 : 0}
          label="Pages tested"
          caption={`${tested} of ${total} tested`}
          trailing={
            <SaveStatus state={save}>
              {save === "local" ? "Unsaved changes" : save === "sending" ? "Saving" : save === "error" ? "Save failed, retrying on next edit" : "Saved"}
            </SaveStatus>
          }
        />
        <ul className={s.counts} aria-label="Counts by status">
          {STATUS_OPTIONS.map((o) => (
            <li key={o.value}>
              <Badge tone={o.tone}>
                {o.label} {counts[o.value]}
              </Badge>
            </li>
          ))}
        </ul>
        <div className={s.filters}>
          <Input label="Search" type="search" value={filters.q} placeholder="Title, path, spec" onChange={(e) => setFilters({ ...filters, q: e.target.value })} />
          <Select
            label="Status"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value as Filters["status"] })}
            options={[{ value: "all", label: "All statuses" }, ...STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))]}
          />
          <Select
            label="Group"
            value={filters.group}
            onChange={(e) => setFilters({ ...filters, group: e.target.value as Filters["group"] })}
            options={[{ value: "all", label: "All groups" }, ...(Object.keys(GROUP_LABEL) as ReviewGroup[]).map((g) => ({ value: g, label: GROUP_LABEL[g] }))]}
          />
        </div>
      </section>

      {loadErr ? (
        <p role="alert" className={s.err}>
          {loadErr}
        </p>
      ) : !doc ? (
        <p className={s.hint} role="status">
          Loading {round}
        </p>
      ) : (
        <>
          {groups.map((g) => {
            const list = visible.filter((e) => e.group === g);
            if (!list.length) return null;
            const areas = g === "portal" ? PORTAL_AREAS.filter((a) => list.some((e) => e.area === a)) : [null];
            return (
              <section key={g} aria-labelledby={`g-${g}`} className={s.group}>
                <h2 id={`g-${g}`}>
                  {GROUP_LABEL[g]} <span className={s.count}>{list.length}</span>
                </h2>
                {areas.map((a) => (
                  <div key={a ?? "all"}>
                    {a ? <h3 className={s.area}>{a}</h3> : null}
                    <ul className={s.list}>
                      {list
                        .filter((e) => !a || e.area === a)
                        .map((e) => (
                          <ItemCard key={e.id} entry={e} item={doc.items[e.id] ?? blank()} onChange={(p) => patchItem(e.id, p)} />
                        ))}
                    </ul>
                  </div>
                ))}
              </section>
            );
          })}
          {!visible.length && !showGeneral ? <p className={s.hint}>No pages match these filters.</p> : null}

          {showGeneral ? (
            <section aria-labelledby="g-general" className={s.group}>
              <h2 id="g-general">
                General notes <span className={s.count}>{doc.general.length}</span>
              </h2>
              <ul className={s.list}>
                {doc.general.map((g) => (
                  <GeneralCard key={g.id} note={g} onPatch={(patch) => patchGeneral(g.id, patch)} onRemove={() => removeGeneral(g.id)} />
                ))}
              </ul>
              <Button variant="outline" icon="plus" onClick={addGeneral}>
                Add general note
              </Button>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
