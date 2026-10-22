(() => {
const { Icon, Button } = window.SSSSODelhiNCRDesignSystem_9ec6b9;
const { Panel, PageHead, StatusPill, KpiTile } = window;

const NEXT = [
  { d: '21', m: 'Oct', t: 'Bal Vikas class', s: 'Samithi Laxmi Nagar', st: 'planned' },
  { d: '23', m: 'Oct', t: 'Narayana Seva (food seva)', s: 'Samithi Mayur Vihar', st: 'planned' },
  { d: '25', m: 'Oct', t: 'Medical camp', s: 'Samithi Shakarpur', st: 'awaiting_approval' },
  { d: '26', m: 'Oct', t: 'Nagar Sankirtan', s: 'Samithi Preet Vihar', st: 'planned' },
  { d: '29', m: 'Oct', t: 'Tree planting', s: 'Samithi Patparganj', st: 'draft' },
  { d: '1', m: 'Nov', t: 'Study circle', s: 'Samithi Mayur Vihar', st: 'awaiting_approval' },
];
const TYPES = [['Medical', 14], ['Narayana Seva', 11], ['Bal Vikas', 9], ['Bhajans', 7], ['Environment', 4], ['Study circle', 3]];

function NeedsYou({ phone }) {
  const Row = ({ tone, icon, t, m, action, children }) => (
    <div className="pt-need">
      <span className={'pt-need__ic sx-t-' + tone}><Icon name={icon} size={18} /></span>
      <div className="sx-col" style={{ gap: 2, minWidth: 0 }}><span className="pt-need__t">{t}</span>{m ? <span className="pt-need__m">{m}</span> : null}</div>
      {action}
      {children}
    </div>
  );
  return (
    <Panel title="Needs you" flush action={<span className="sx-cap">4 items</span>}>
      <Row tone="yellow" icon="check-check" t="3 reports to approve" m="Eye camp, Mayur Vihar · Narayana Seva, Laxmi Nagar · 1 more" action={<Button variant="primary" size="sm" iconAfter="arrow-right">Approvals</Button>} />
      <Row tone="pink" icon="clipboard-list" t="2 camps without a report" m="Report links sent; no reply yet">
        <div className="pt-sub-rows">
          {[['Medical camp · Shakarpur', '12 Oct · 7 days'], ['Bal Vikas camp · Patparganj', '14 Oct · 5 days']].map(([a, b]) => (
            <div className="pt-subrow" key={a}><span className="sx-col" style={{ gap: 0 }}><b style={{ fontWeight: 500, color: 'var(--slate-900)' }}>{a}</b>{b}</span><Button variant="ghost" size="sm" icon="send">Resend</Button></div>
          ))}
        </div>
      </Row>
      <Row tone="blue" icon="inbox" t="4 inbox drafts to check" m="2 from WhatsApp · 1 sheet · 1 register scan" action={<Button variant="outline" size="sm" iconAfter="arrow-right">{phone ? 'Inbox' : 'Review inbox'}</Button>} />
      <Row tone="alert" icon="triangle-alert" t="1 report with the state team" m="Food seva, Preet Vihar · waiting on state team since 15 Oct" action={<StatusPill status="escalated" />} />
    </Panel>
  );
}

const KPIS = [
  { label: 'Activities', value: 48, delta: '+6 vs Sep', icon: 'calendar-days', spark: [31, 36, 34, 40, 42, 48] },
  { label: 'People served', value: 3412, delta: '+9% vs Sep', icon: 'users', spark: [2400, 2650, 2900, 2800, 3130, 3412], note: 'Counts visits — one person may attend more than once.' },
  { label: 'Volunteer hours', value: 1286, delta: '+112 vs Sep', icon: 'hand-heart', spark: [980, 1010, 1100, 1060, 1174, 1286] },
  { label: 'Reporting rate', value: '82%', delta: '−4 pts vs Sep', dir: 'down', icon: 'clipboard-check', spark: [78, 84, 88, 85, 86, 82] },
];
const Kpis = ({ compact }) => KPIS.map(k => <KpiTile key={k.label} label={k.label} value={k.value} period="October 2026 · East district" delta={k.delta} deltaDir={k.dir || 'up'} icon={k.icon} spark={k.spark} note={k.note} compact={compact} />);

function TypeBars() {
  const max = TYPES[0][1];
  return (
    <Panel title="By seva type" action={<span className="sx-cap">Activities, October</span>}>
      <div className="sx-hbar">
        {TYPES.map(([n, v]) => (
          <React.Fragment key={n}>
            <span style={{ fontSize: 'var(--text-small)', color: 'var(--slate-800)' }}>{n}</span>
            <span className="sx-hbar__track"><span className="sx-hbar__fill" style={{ display: 'block', width: `${(v / max) * 100}%` }}></span></span>
            <span style={{ fontSize: 'var(--text-small)', fontWeight: 600, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{v}</span>
          </React.Fragment>
        ))}
      </div>
    </Panel>
  );
}

function QuickActions() {
  return (
    <Panel title="Quick actions">
      <div className="pt-qa">
        {[['calendar-plus', 'Plan event'], ['upload', 'Upload file'], ['link', 'Copy form link']].map(([i, l]) => <button key={l}><span className="pt-qa__ic"><Icon name={i} size={20} /></span>{l}</button>)}
      </div>
    </Panel>
  );
}

function NextTable() {
  return (
    <Panel title="Next 14 days" flush action={<Button variant="ghost" size="sm" iconAfter="arrow-right">All events</Button>}>
      <table className="sx-tbl">
        <thead><tr><th>Date</th><th>Event</th><th>Samithi</th><th>Status</th></tr></thead>
        <tbody>{NEXT.map(e => (
          <tr key={e.t}><td style={{ whiteSpace: 'nowrap' }}>{e.d} {e.m}</td><td className="sx-tbl__t">{e.t}</td><td>{e.s.replace('Samithi ', '')}</td><td><StatusPill status={e.st} /></td></tr>
        ))}</tbody>
      </table>
    </Panel>
  );
}

function NextCards() {
  return (
    <Panel title="Next 14 days" flush action={<Button variant="ghost" size="sm">All</Button>}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {NEXT.slice(0, 4).map(e => (
          <div key={e.t} style={{ display: 'grid', gridTemplateColumns: '52px minmax(0,1fr)', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', alignItems: 'start' }}>
            <span className="sx-dchip"><b>{e.d}</b><span>{e.m}</span></span>
            <div className="sx-col" style={{ gap: 4, alignItems: 'flex-start' }}><span className="sx-tbl__t" style={{ fontSize: 'var(--text-portal-body)' }}>{e.t}</span><span className="sx-cap">{e.s}</span><StatusPill status={e.st} /></div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function OverviewDesk() {
  return (
    <window.Desk current="overview">
      <PageHead eyebrow="Monday, 19 Oct 2026" title="Good morning, Coordinator A" sub="East district · 14 samithis · showing October 2026" actions={<><Button variant="outline" icon="upload">Upload file</Button><Button variant="primary" icon="calendar-plus">Plan event</Button></>} />
      <div className="pt-grid pt-g-main">
        <NeedsYou />
        <QuickActions />
      </div>
      <div className="pt-grid pt-g4"><Kpis /></div>
      <div className="pt-grid pt-g-main"><NextTable /><TypeBars /></div>
    </window.Desk>
  );
}

function OverviewPhone() {
  return (
    <window.Phone tab="overview">
      <PageHead eyebrow="Monday, 19 Oct" title="Good morning, Coordinator A" sub="East district · 14 samithis" />
      <NeedsYou phone />
      <div className="pt-grid pt-g2"><Kpis compact /></div>
      <QuickActions />
      <NextCards />
      <TypeBars />
    </window.Phone>
  );
}

function OverviewEmptyPhone() {
  return (
    <window.Phone tab="overview">
      <PageHead eyebrow="Monday, 19 Oct" title="Good morning, Coordinator A" sub="East district · 14 samithis" />
      <Panel title="Needs you">
        <window.EmptyState icon="sun" title="You're all caught up." body="No reports, drafts or links need you right now. New ones show here first." />
      </Panel>
      <QuickActions />
    </window.Phone>
  );
}

Object.assign(window, { OverviewDesk, OverviewPhone, OverviewEmptyPhone });
})();
