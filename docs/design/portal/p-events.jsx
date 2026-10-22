(() => {
const { Icon, Button } = window.SSSSODelhiNCRDesignSystem_9ec6b9;
const { PageHead, StatusPill, RowMenu } = window;

const EVENTS = [
  { id: 1, d: '17', m: 'Oct', t: 'Eye camp', type: 'Medical', ic: 'stethoscope', s: 'Mayur Vihar', st: 'report_submitted', next: 'Approve report' },
  { id: 2, d: '12', m: 'Oct', t: 'Medical camp', type: 'Medical', ic: 'stethoscope', s: 'Shakarpur', st: 'awaiting_report', next: 'Report 7 days late', late: true },
  { id: 3, d: '14', m: 'Oct', t: 'Bal Vikas camp', type: 'Bal Vikas', ic: 'graduation-cap', s: 'Patparganj', st: 'awaiting_report', next: 'Report 5 days late', late: true },
  { id: 4, d: '16', m: 'Oct', t: 'Narayana Seva (food seva)', type: 'Narayana Seva', ic: 'hand-heart', s: 'Laxmi Nagar', st: 'report_submitted', next: 'Approve report' },
  { id: 5, d: '15', m: 'Oct', t: 'Food seva', type: 'Narayana Seva', ic: 'hand-heart', s: 'Preet Vihar', st: 'escalated', next: 'With state team' },
  { id: 6, d: '21', m: 'Oct', t: 'Bal Vikas class', type: 'Bal Vikas', ic: 'graduation-cap', s: 'Laxmi Nagar', st: 'planned', next: 'Form links sent' },
  { id: 7, d: '25', m: 'Oct', t: 'Medical camp', type: 'Medical', ic: 'stethoscope', s: 'Shakarpur', st: 'awaiting_approval', next: 'Approve plan' },
  { id: 8, d: '29', m: 'Oct', t: 'Tree planting', type: 'Environment', ic: 'sprout', s: 'Patparganj', st: 'draft', next: 'Samithi is drafting' },
  { id: 9, d: '10', m: 'Oct', t: 'Bhajan evening', type: 'Bhajan', ic: 'music', s: 'Mayur Vihar', st: 'approved', next: 'Published' },
  { id: 10, d: '8', m: 'Oct', t: 'Study circle', type: 'Study circle', ic: 'book-open', s: 'Preet Vihar', st: 'postponed', next: 'New date not set' },
];
const TABS = [['All', 42], ['Needs action', 6], ['Upcoming', 14], ['Awaiting report', 2], ['Approved', 19]];

function Tabs({ full }) {
  return <div className={'pt-tabs' + (full ? ' pt-tabs--full' : '')} style={full ? { overflowX: 'auto', justifyContent: 'flex-start' } : null}>{TABS.map(([t, n], i) => <button key={t} aria-pressed={i === 1} style={full ? { flex: 'none' } : null}>{t}<span className={i === 1 ? 'sx-count' : 'sx-cap'}>{n}</span></button>)}</div>;
}
const Next = ({ e }) => <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 'var(--text-small)', color: e.late ? 'var(--pink-700)' : 'var(--slate-700)', fontWeight: e.late ? 600 : 400 }}>{e.late ? <Icon name="clock" size={16} /> : null}{e.next}</span>;
const menu = () => <RowMenu items={[{ icon: 'eye', label: 'Open event' }, { icon: 'pencil', label: 'Edit' }, { icon: 'link', label: 'Form links' }, { icon: 'external-link', label: 'View public page' }, '-', { icon: 'calendar-clock', label: 'Postpone' }, { icon: 'x-circle', label: 'Cancel event', danger: true }]} />;
const Sel = ({ l, v }) => <button className="pt-sel">{l}: <b>{v}</b><Icon name="chevron-down" size={16} /></button>;

function EventsDesk() {
  const [sel, setSel] = React.useState([]);
  const cols = [
    { key: 'd', label: 'Date', sortable: true, render: e => <span style={{ whiteSpace: 'nowrap' }}>{e.d} {e.m}</span> },
    { key: 't', label: 'Event', sortable: true, render: e => <span className="sx-col" style={{ gap: 0 }}><span className="sx-tbl__t">{e.t}</span><span className="sx-tbl__sub" style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}><Icon name={e.ic} size={16} />{e.type}</span></span> },
    { key: 's', label: 'Samithi', sortable: true },
    { key: 'st', label: 'Status', render: e => <StatusPill status={e.st} /> },
    { key: 'next', label: 'Next step', render: e => <Next e={e} /> },
  ];
  return (
    <window.Desk current="events">
      <PageHead title="Events" sub="Every event in East district, from plan to approved report." actions={<><Button variant="outline" icon="download">Export</Button><Button variant="primary" icon="calendar-plus">Plan event</Button></>} />
      <window.DataTable lang="en" columns={cols} rows={EVENTS} selectable selected={sel} onSelect={setSel} sort={{ key: 'd', dir: 'desc' }} onSort={() => {}} rowMenu={menu}
        bulkActions={<><Button variant="outline" size="sm" icon="send">Resend report links</Button><Button variant="outline" size="sm" icon="download">Export</Button></>}
        toolbar={<div className="sx-col" style={{ width: '100%', gap: 12 }}><div className="pt-filters"><Tabs /><span style={{ flex: 1 }}></span><label className="sx-search" style={{ maxWidth: 260, margin: 0 }}><Icon name="search" size={18} /><input placeholder="Search events" /></label></div><div className="pt-filters"><Sel l="Month" v="October 2026" /><Sel l="Samithi" v="All" /><Sel l="Seva type" v="All" /></div></div>}
        footer={<window.Pagination page={1} pages={5} total={42} perPage={10} onPage={() => {}} />} />
    </window.Desk>
  );
}

function EventsPhone() {
  return (
    <window.Phone tab="events">
      <PageHead title="Events" sub="East district · October 2026" />
      <Tabs full />
      <div className="pt-filters"><Sel l="Samithi" v="All" /><Sel l="Type" v="All" /></div>
      {EVENTS.slice(0, 6).map(e => (
        <div className="sx-ecard" key={e.id}>
          <span className="sx-dchip"><b>{e.d}</b><span>{e.m}</span></span>
          <div className="sx-col" style={{ gap: 4, alignItems: 'flex-start', minWidth: 0 }}>
            <span className="sx-tbl__t" style={{ fontSize: 'var(--text-portal-body)' }}>{e.t}</span>
            <span className="sx-cap">{e.s} · {e.type}</span>
            <StatusPill status={e.st} />
            <Next e={e} />
          </div>
          {menu()}
        </div>
      ))}
      <Button variant="outline" fullWidth>Show 36 more</Button>
    </window.Phone>
  );
}

Object.assign(window, { EventsDesk, EventsPhone });
})();
