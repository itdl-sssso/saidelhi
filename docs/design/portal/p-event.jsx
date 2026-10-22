(() => {
const { Icon, Button } = window.SSSSODelhiNCRDesignSystem_9ec6b9;
const { Panel, PageHead, StatusPill, SourceBadge, RowMenu, PT_EVENT: E } = window;

const STEPS = [
  { label: 'Draft', meta: 'Created by samithi coordinator · 2 Oct', state: 'done' },
  { label: 'Awaiting approval', meta: 'Plan sent · 2 Oct 6:40 PM', state: 'done' },
  { label: 'Planned', meta: 'Approved on WhatsApp by district coordinator · 3 Oct 9:12 AM', state: 'done' },
  { label: 'Event day', meta: '17 Oct · 9:00 AM–2:00 PM', state: 'done' },
  { label: 'Awaiting report', meta: 'Report link sent on WhatsApp · 17 Oct 5:02 PM', state: 'done' },
  { label: 'Report submitted', meta: 'Via form by samithi coordinator · 18 Oct 8:47 PM', state: 'current' },
  { label: 'Approved', meta: 'Waiting for you', state: 'upcoming' },
];
const BRANCH = { after: 5, label: 'Escalated', meta: 'Only if sent to the state team — not used here' };

const LINKS = [
  { p: 'Report', to: '+91 98•••••52', exp: '24 Oct, 11:59 PM', uses: '1 / 1', last: '18 Oct, 8:31 PM', st: ['sx-t-green', 'Used'] },
  { p: 'Desk 2', to: '+91 97•••••18', exp: '17 Oct, 11:59 PM', uses: '1 / 1', last: '17 Oct, 1:40 PM', st: ['sx-t-slate', 'Expired'] },
  { p: 'Public', to: 'QR poster', exp: '31 Oct, 11:59 PM', uses: '14 / ∞', last: '17 Oct, 1:10 PM', st: ['sx-t-blue', 'Active'] },
];
const linkMenu = () => <RowMenu items={[{ icon: 'qr-code', label: 'Show QR' }, { icon: 'calendar-plus', label: 'Extend expiry' }, '-', { icon: 'ban', label: 'Revoke link', danger: true }]} />;

function LinksPanel({ phone, locked }) {
  const body = phone ? (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {LINKS.map(l => (
        <div key={l.p} style={{ padding: '12px 8px 8px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="sx-row" style={{ justifyContent: 'space-between' }}><span className="sx-row"><b style={{ fontWeight: 600 }}>{l.p}</b><span className={'sx-pill ' + l.st[0]}>{l.st[1]}</span></span>{linkMenu()}</div>
          <span className="sx-cap">{l.to} · {l.uses} uses · expires {l.exp}</span>
          <span className="sx-cap">Last opened {l.last}</span>
          <div className="sx-row" style={{ gap: 4 }}><Button variant="ghost" size="sm" icon="copy">Copy</Button><Button variant="ghost" size="sm" icon="send">Resend</Button></div>
        </div>
      ))}
    </div>
  ) : (
    <div>
      <div className="pt-link" style={{ background: 'var(--sand)', paddingTop: 10, paddingBottom: 10 }}>{['Link · sent to', 'Expiry · uses', 'Last opened', ''].map(h => <span key={h} className="sx-cap" style={{ fontWeight: 600 }}>{h}</span>)}</div>
      {LINKS.map(l => (
        <div className="pt-link" key={l.p}>
          <span className="sx-col" style={{ gap: 2 }}><span className="sx-row"><b style={{ fontWeight: 600 }}>{l.p}</b><span className={'sx-pill ' + l.st[0]}>{l.st[1]}</span></span><span className="sx-cap">{l.to}</span></span>
          <span className="sx-col" style={{ gap: 2, fontSize: 'var(--text-small)' }}><span>{l.exp}</span><span className="sx-cap">{l.uses} uses</span></span>
          <span style={{ fontSize: 'var(--text-small)' }}>{l.last}</span>
          <span className="pt-acts">
            <button className="sx-icbtn" aria-label="Copy link"><Icon name="copy" size={18} /></button>
            <button className="sx-icbtn" aria-label="Resend on WhatsApp"><Icon name="send" size={18} /></button>
            {linkMenu()}
          </span>
        </div>
      ))}
    </div>
  );
  return (
    <section className={'pt-card' + (locked ? ' pt-disabled' : '')}>
      <header className="pt-card__hd"><h2 className="sx-h3">Form links</h2><Button variant="outline" size="sm" icon="plus" disabled={locked}>Add desk link</Button></header>
      {locked ? <div style={{ padding: '14px 20px 0' }}><window.FieldMessage type="info">Form links open once the plan is approved. Approve the plan first, then send them.</window.FieldMessage></div> : null}
      <div className="pt-card__bd pt-card__bd--flush">{body}</div>
    </section>
  );
}

function Submission() {
  return (
    <Panel title="Submitted report" badge={<SourceBadge src="form" />} action={<Button variant="ghost" size="sm" icon="pencil">Edit</Button>}>
      <dl className="pt-dl">
        <dt>People screened</dt><dd>115</dd>
        <dt className="pt-dl__sub">Male · female · under 18</dt><dd>49 · 66 · 9</dd>
        <dt>Spectacles given</dt><dd>63</dd>
        <dt className="pt-dl__sub">+1.0 · +1.5 · +2.0 · +2.5 · +3.0</dt><dd>12 · 10 · 20 · 14 · 7</dd>
        <dt>Cataract found · referred</dt><dd>13 · 13</dd>
        <dt>Surgeries</dt><dd style={{ color: 'var(--slate-500)', fontWeight: 400 }}>Not yet known</dd>
        <dt>Sevadals · volunteer hours</dt><dd>18 · 126</dd>
      </dl>
      <div className="sx-col" style={{ gap: 6 }}>
        <span className="sx-lbl">Edit history</span>
        <span className="sx-cap">19 Oct, 10:05 AM · District coordinator · Volunteer hours 120 → 126</span>
        <span className="sx-cap">18 Oct, 8:47 PM · Samithi coordinator · Submitted from form</span>
      </div>
    </Panel>
  );
}

function PublicPreview() {
  return (
    <Panel title="Public results preview" action={<span className="sx-cap">Shows after approval</span>}>
      <div className="pt-pub">
        <span className="pt-eb">Eye camp · East district</span>
        <h4>115 people screened in Mayur Vihar</h4>
        <div className="pt-pub__n"><div><b>115</b><span>people screened</span></div><div><b>63</b><span>spectacles given</span></div><div><b>13</b><span>referred for cataract surgery</span></div></div>
        <span className="sx-cap">17 Oct 2026 · with ICARE Eye Hospital · one person may attend more than once</span>
      </div>
    </Panel>
  );
}

function Attachment() {
  return (
    <Panel title="Attachments">
      <div className="sx-file">
        <span className="sx-file__th"><Icon name="image" size={20} /></span>
        <div className="sx-col" style={{ gap: 2, flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 'var(--text-small)', fontWeight: 500 }}>Register scan, page 1–3</span>
          <span className="sx-cap" style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}><Icon name="lock" size={16} />Private · never published · deleted 17 Oct 2027</span>
        </div>
        <Button variant="ghost" size="sm">View</Button>
      </div>
      <div className="pt-lock"><Icon name="lock" size={18} /><span><b style={{ fontWeight: 600 }}>13 people on the follow-up list.</b> Personal data — only the PII officer can open it.</span></div>
    </Panel>
  );
}

function ActivityLog() {
  const L = [['19 Oct 10:05', 'District coordinator edited volunteer hours'], ['18 Oct 20:47', 'Report submitted via form'], ['18 Oct 20:31', 'Report link opened (+91 98•••••52)'], ['17 Oct 17:02', 'Report link sent on WhatsApp'], ['17 Oct 13:10', 'Public link used 14 times so far'], ['3 Oct 09:12', 'Plan approved on WhatsApp']];
  return <Panel title="Activity log"><ol className="pt-log" style={{ margin: 0, padding: 0 }}>{L.map(([t, x]) => <li key={t}><time>{t}</time><span>{x}</span></li>)}</ol></Panel>;
}

function EventHeader({ phone }) {
  const meta = (
    <div className="pt-meta">
      <span><Icon name="stethoscope" size={16} />Medical · eye camp</span>
      <span><Icon name="calendar-days" size={16} />{E.date}</span>
      <span><Icon name="map-pin" size={16} />{E.venue}</span>
      <span><Icon name="home" size={16} />{E.samithi} · {E.district}</span>
    </div>
  );
  const over = <RowMenu label="More actions" items={[{ icon: 'pencil', label: 'Edit event' }, { icon: 'calendar-clock', label: 'Postpone' }, { icon: 'external-link', label: 'View public page' }, '-', { icon: 'x-circle', label: 'Cancel event', danger: true }]} />;
  return (
    <div className="pt-card" style={{ padding: phone ? 16 : 24, gap: 16 }}>
      <div className="pt-head" style={{ alignItems: 'flex-start' }}>
        <div className="pt-head__t">
          <a href="#" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-small)', textDecoration: 'none' }}><Icon name="arrow-left" size={16} />Events</a>
          <h1 className="pt-h1">Eye camp, Mayur Vihar</h1>
        </div>
        <StatusPill status="report_submitted" size="lg" />
      </div>
      {meta}
      <div className="sx-row" style={{ gap: 8, borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
        <Button variant="primary" icon="check" fullWidth={phone}>Approve report</Button>
        <Button variant="outline" icon="message-square">Request changes</Button>
        <span style={{ flex: 1 }}></span>
        {over}
      </div>
    </div>
  );
}

function EventDesk() {
  return (
    <window.Desk current="events">
      <EventHeader />
      <Panel title="Progress"><window.Timeline steps={STEPS} branch={BRANCH} /></Panel>
      <div className="pt-grid pt-g-main">
        <div className="sx-col" style={{ gap: 16 }}><Submission /><LinksPanel /><ActivityLog /></div>
        <div className="sx-col" style={{ gap: 16 }}><PublicPreview /><Attachment /></div>
      </div>
    </window.Desk>
  );
}

function EventPhone() {
  return (
    <window.Phone tab="events">
      <EventHeader phone />
      <Panel title="Progress"><window.Timeline orientation="vertical" steps={STEPS} branch={BRANCH} /></Panel>
      <Submission />
      <LinksPanel phone />
      <PublicPreview />
      <Attachment />
      <ActivityLog />
    </window.Phone>
  );
}

function EventLinksLocked() {
  return <div className="sx" style={{ padding: 24, background: 'var(--surface-page)', minHeight: '100%', boxSizing: 'border-box' }}><LinksPanel locked /></div>;
}

function QrDialog() {
  return (
    <window.ModalStage>
      <div className="pt-modal" style={{ width: 'min(560px,100%)' }}>
        <div className="pt-modal__cap"></div>
        <div className="sx-sheet__hd"><h3 className="sx-h3">Public link · QR poster</h3><button className="sx-icbtn" aria-label="Close"><Icon name="x" size={20} /></button></div>
        <div className="pt-modal__bd" style={{ alignItems: 'center' }}>
          <window.QrPoster event={{ title: 'Eye camp', date: '17 Oct 2026', venue: 'Dr. Ambedkar Bhawan, Mayur Vihar Ph-1', samithi: 'Samithi Mayur Vihar · East district' }} purpose={{ en: 'Register at the desk', hi: 'डेस्क पर पंजीकरण' }} centrePhone="+91 11 •••• ••40" />
        </div>
        <div className="pt-modal__ft"><Button variant="outline" icon="download">Download PNG</Button><Button variant="primary" icon="printer">Print A4</Button></div>
      </div>
    </window.ModalStage>
  );
}

Object.assign(window, { EventDesk, EventPhone, EventLinksLocked, QrDialog });
})();
