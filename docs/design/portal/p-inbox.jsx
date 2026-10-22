(() => {
const { Icon, Button } = window.SSSSODelhiNCRDesignSystem_9ec6b9;
const { Panel, PageHead, Conf } = window;

const ITEMS = [
  { id: 1, src: 'whatsapp', from: '+91 99•••••07', ev: 'Medical camp · Shakarpur · 12 Oct', conf: 'check', age: '2 h' },
  { id: 2, src: 'scan', from: '+91 98•••••52', ev: 'Bal Vikas camp · Patparganj · 14 Oct', conf: 'high', age: '5 h' },
  { id: 3, src: 'sheet', from: '+91 88•••••31', ev: null, conf: 'low', age: '1 d' },
  { id: 4, src: 'whatsapp', from: '+91 70•••••64', ev: 'Narayana Seva · Laxmi Nagar · 16 Oct', conf: 'high', age: '1 d' },
];
const SIC = { whatsapp: 'message-circle', scan: 'scan-line', sheet: 'sheet' };
const SNAME = { whatsapp: 'WhatsApp', scan: 'Register scan', sheet: 'Sheet' };

function Tabs({ full, value = 'For me' }) {
  return <div className={'pt-tabs' + (full ? ' pt-tabs--full' : '')} role="group">{[['For me', 4], ['Escalated to state', 1], ['Done', null]].map(([t, n]) => <button key={t} aria-pressed={t === value}>{t}{n ? <span className="sx-count">{n}</span> : null}</button>)}</div>;
}

function InboxRow({ it, selected }) {
  return (
    <div className="pt-irow" aria-selected={selected}>
      <span className="pt-srcic" aria-label={SNAME[it.src]}><Icon name={SIC[it.src]} size={20} /></span>
      <span className="sx-col" style={{ gap: 0 }}><span className="sx-tbl__t">{it.from}</span><span className="sx-cap">{SNAME[it.src]}</span></span>
      <span style={{ fontSize: 'var(--text-small)', color: it.ev ? 'var(--slate-800)' : 'var(--signal-alert-text)', display: 'inline-flex', gap: 6, alignItems: 'center' }}>{it.ev ? <><Icon name="link-2" size={16} />{it.ev}</> : <><Icon name="circle-help" size={16} />No event matched</>}</span>
      <Conf level={it.conf} />
      <span className="sx-cap" style={{ textAlign: 'right' }}>{it.age}</span>
    </div>
  );
}

function InboxCard({ it }) {
  return (
    <div className="pt-lcard" style={{ paddingBottom: 12 }}>
      <div className="sx-row" style={{ justifyContent: 'space-between', paddingRight: 8 }}>
        <span className="sx-row" style={{ gap: 10 }}><span className="pt-srcic" style={{ width: 40, height: 40 }}><Icon name={SIC[it.src]} size={18} /></span><span className="sx-col" style={{ gap: 0 }}><span className="sx-tbl__t">{it.from}</span><span className="sx-cap">{SNAME[it.src]} · {it.age} ago</span></span></span>
        <Conf level={it.conf} />
      </div>
      <span style={{ fontSize: 'var(--text-small)', color: it.ev ? 'var(--slate-800)' : 'var(--signal-alert-text)', display: 'inline-flex', gap: 6, alignItems: 'center' }}>{it.ev ? <><Icon name="link-2" size={16} />{it.ev}</> : <><Icon name="circle-help" size={16} />No event matched</>}</span>
    </div>
  );
}

function SourcePane({ phone }) {
  return (
    <div className="sx-col" style={{ gap: 12 }}>
      <div className="sx-chat" style={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', flex: 'none' }}>
        <div className="sx-chat__bd" style={{ overflow: 'visible' }}>
          <span className="sx-day">12 Oct 2026</span>
          <div className="sx-bub sx-bub--in">{'Sai Ram. Shakarpur medical camp done today. 86 people came, 40 men 46 women, 11 children. Medicines given to 74. 6 sent to hospital. 12 sevadals, 6 hours each.'}<div className="sx-bub__meta">6:52 PM</div></div>
          <div className="sx-bub sx-bub--in" style={{ width: '82%' }}>
            <div className="pt-scan" style={{ aspectRatio: phone ? '3/4' : '4/3' }}>
              <div className="pt-scan__grid">{Array.from({ length: 36 }).map((_, i) => <span key={i}>{i < 6 ? ['#', 'Name', 'Age', 'M/F', 'ID no.', 'Seen'][i] : ''}</span>)}</div>
              <div className="pt-scan__blur" style={{ left: 'calc(14px + 66%)', width: '19%' }}><span>ID numbers are not read or stored</span></div>
              <div className="pt-zoom"><button className="sx-icbtn" aria-label="Zoom out"><Icon name="zoom-out" size={18} /></button><button className="sx-icbtn" aria-label="Zoom in"><Icon name="zoom-in" size={18} /></button></div>
            </div>
            <div className="sx-bub__meta">Register photo · 6:53 PM</div>
          </div>
        </div>
      </div>
      <span className="sx-cap" style={{ display: 'inline-flex', gap: 6, alignItems: 'flex-start' }}><Icon name="lock" size={16} />Photo is private and never published. Deleted after 12 months.</span>
    </div>
  );
}

function DF({ l, v, conf, why }) {
  return (
    <div className="pt-df">
      <span className="pt-df__l">{l}</span>
      <div className={'sx-ctl' + (conf === 'low' ? ' sx-ctl--warn' : '')}><input defaultValue={v} inputMode="numeric" style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }} /></div>
      {why ? <div className="pt-df__why"><div className="sx-msg sx-t-yellow" style={{ alignItems: 'center' }}><Icon name="triangle-alert" size={16} /><span style={{ flex: 1 }}>Low confidence — check this</span><button className="pt-why">Why?</button></div><span className="sx-cap" style={{ display: 'block', padding: '4px 10px 0' }}>{why}</span></div> : null}
    </div>
  );
}

function DraftPane() {
  return (
    <div className="sx-col" style={{ gap: 16 }}>
      <window.Field label="Matched event" help="Suggested from samithi, date and wording. Change if wrong.">
        <window.PickerField icon="link-2" value="Medical camp · Shakarpur · 12 Oct 2026" />
      </window.Field>
      <div>
        <span className="sx-lbl">AI-filled draft</span>
        <DF l="People screened" v="86" />
        <DF l="Male" v="40" />
        <DF l="Female" v="46" conf="low" why="Handwriting unclear on the register; the WhatsApp message says 46." />
        <DF l="Under 18" v="11" />
        <DF l="Medicines given" v="74" />
        <DF l="Referred to hospital" v="6" conf="low" why="Register shows 6 or 8 — the digit is smudged." />
        <DF l="Sevadals" v="12" />
        <DF l="Volunteer hours" v="72" />
      </div>
    </div>
  );
}

function Actions({ phone }) {
  return (
    <>
      <div className="pt-actbar" style={phone ? { padding: 12 } : null}>
        <Button variant="primary" icon="check" fullWidth={phone}>Approve into event</Button>
        <Button variant="outline" icon="save">Save edits</Button>
        <Button variant="outline" icon="message-circle-question">Ask sender</Button>
        {phone ? null : <span style={{ flex: 1 }}></span>}
        <Button variant="ghost" icon="arrow-up-right">Send to state team</Button>
        <Button variant="ghost" icon="x">Reject</Button>
      </div>
      <div className="pt-foot-note"><Icon name="user-check" size={16} />A person must approve before it counts. Rejecting sends the reason to the sender on WhatsApp.</div>
    </>
  );
}

function InboxListDesk() {
  return (
    <window.Desk current="inbox">
      <PageHead title="Review inbox" sub="Reports that came in by WhatsApp, sheet or scan. Check each draft, then approve it into its event." />
      <Tabs />
      <Panel flush>{ITEMS.map(it => <InboxRow key={it.id} it={it} />)}</Panel>
    </window.Desk>
  );
}

function InboxItemDesk() {
  return (
    <window.Desk current="inbox">
      <PageHead back="Review inbox" title="WhatsApp report from +91 99•••••07" sub="Received 12 Oct 2026, 6:52 PM · 2 messages · 1 photo" actions={<Conf level="check" />} />
      <div className="pt-split">
        <section><div className="pt-pane-hd"><span className="sx-lbl">Source</span><span className="sx-cap">WhatsApp thread</span></div><div style={{ padding: 20 }}><SourcePane /></div></section>
        <section><div className="pt-pane-hd"><span className="sx-lbl">Draft</span><span className="sx-cap">2 fields to check</span></div><div style={{ padding: 20 }}><DraftPane /></div></section>
      </div>
      <div className="pt-card" style={{ overflow: 'hidden' }}><Actions /></div>
    </window.Desk>
  );
}

function InboxListPhone() {
  return (
    <window.Phone tab="inbox">
      <PageHead title="Review inbox" />
      <Tabs full />
      {ITEMS.map(it => <InboxCard key={it.id} it={it} />)}
    </window.Phone>
  );
}

function InboxItemPhone({ tab }) {
  return (
    <window.Phone tab="inbox" bodyStyle={{ paddingBottom: 0 }}>
      <PageHead back="Inbox" title="+91 99•••••07" sub="WhatsApp · 12 Oct, 6:52 PM" />
      <div className="pt-tabs pt-tabs--full" role="tablist">
        <button aria-pressed={tab === 'source'}><Icon name="message-circle" size={16} />Source</button>
        <button aria-pressed={tab === 'draft'}><Icon name="file-pen-line" size={16} />Draft<span className="sx-count">2</span></button>
      </div>
      {tab === 'source' ? <SourcePane phone /> : <DraftPane />}
      <div className="pt-card" style={{ overflow: 'hidden', margin: '0 -16px', borderRadius: 0, borderLeft: 0, borderRight: 0 }}><Actions phone /></div>
    </window.Phone>
  );
}

Object.assign(window, { InboxListDesk, InboxItemDesk, InboxListPhone, InboxItemPhone });
})();
