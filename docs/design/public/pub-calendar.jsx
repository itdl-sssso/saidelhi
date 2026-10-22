(() => {
const { Icon, Button } = window.SSSSODelhiNCRDesignSystem_9ec6b9;
const { Pub, SecHd, PbSel, EmptyState } = window;

const DAYS = [
  { d: '23', wd: 'Thursday', m: 'Oct', ev: [
    { time: '8:00 AM', t: 'Narayana Seva (food seva)', s: 'Mayur Vihar', dist: 'East', ic: 'hand-heart', vol: 4 },
    { time: '6:30 PM', t: 'Bhajans', s: 'Mayur Vihar', dist: 'East', ic: 'music', rec: true },
    { time: '6:30 PM', t: 'Bhajans', s: 'Rohini Sector 9', dist: 'North', ic: 'music', rec: true },
  ] },
  { d: '25', wd: 'Saturday', m: 'Oct', ev: [
    { time: '9:00 AM', t: 'Medical camp', s: 'Shakarpur', dist: 'East', ic: 'stethoscope', vol: 8 },
    { time: '10:00 AM', t: 'Blood donation camp', s: 'Dwarka', dist: 'West', ic: 'droplets', vol: 12 },
    { time: '5:00 PM', t: 'Study circle', s: 'Preet Vihar', dist: 'East', ic: 'book-open', x: true },
    { time: '5:00 PM', t: 'Study circle', s: 'Mayur Vihar', dist: 'East', ic: 'book-open', rec: true },
  ] },
  { d: '26', wd: 'Sunday', m: 'Oct', ev: [
    { time: '7:00 AM', t: 'Nagar Sankirtan (singing procession)', s: 'Preet Vihar', dist: 'East', ic: 'music' },
    { time: '10:00 AM', t: 'Bal Vikas classes', s: 'Mayur Vihar', dist: 'East', ic: 'graduation-cap', rec: true },
    { time: '11:00 AM', t: 'Tree planting', s: 'Sector 62', dist: 'Noida–Ghaziabad', ic: 'sprout', vol: 15 },
  ] },
];

function Row({ e, phone }) {
  const cls = 'pb-crow' + (e.rec ? ' pb-crow--rec' : '') + (e.x ? ' pb-crow--x' : '');
  const title = <span className={'pb-crow__t' + (e.x ? ' pb-strike' : '')}>{e.t}</span>;
  const meta = <span className="pb-crow__m">{e.s} · {e.dist} district{e.rec ? ' · every week' : ''}</span>;
  const badge = e.x ? <span className="sx-pill sx-t-slate"><Icon name="x-circle" size={16} />Cancelled</span> : e.vol ? <span className="pb-volb"><Icon name="hand-heart" size={16} />{e.vol} volunteers needed</span> : null;
  if (phone) return (
    <a href="#" className={cls}><span className="pb-crow__ic"><Icon name={e.ic} size={18} /></span>
      <span className="pb-col" style={{ gap: 3 }}><span className="pb-crow__time">{e.time}</span>{title}{meta}{badge ? <span>{badge}</span> : null}</span></a>
  );
  return <a href="#" className={cls}><span className="pb-crow__time">{e.time}</span><span className="pb-crow__ic"><Icon name={e.ic} size={18} /></span><span className="pb-col" style={{ gap: 2 }}>{title}{meta}</span>{badge || <span></span>}</a>;
}

function Toggle({ value }) {
  return <div className="pb-seg" role="group" aria-label="View">{[['list', 'List'], ['calendar', 'Month']].map(([i, l]) => <button key={l} aria-pressed={value === l}><Icon name={i} size={16} />{l}</button>)}</div>;
}
const Chip = ({ children, on }) => <button className="sx-chip" aria-pressed={!!on}>{on ? <Icon name="check" size={16} /> : null}{children}</button>;

function Head({ phone, view }) {
  return (
    <section className="pb-hero" style={{ paddingBottom: 24 }}><div className="pb-wrap pb-col" style={{ gap: 16 }}>
      <div className="pb-row" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div className="pb-col" style={{ gap: 8 }}><h1 className="pb-h1">Calendar</h1><p className="pb-lead">Bhajans, study circles and seva across Delhi NCR. All free, all welcome.</p></div>
        {phone ? null : <Toggle value={view} />}
      </div>
      {phone ? (
        <div className="pb-row" style={{ justifyContent: 'space-between' }}><Button variant="outline" size="sm" icon="sliders-horizontal">Filters · 1</Button><Toggle value={view} /></div>
      ) : (
        <div className="pb-chips"><PbSel l="District" v="All" /><PbSel l="Seva type" v="All" /><PbSel l="Samithi" v="All" /><Chip on>Volunteers needed</Chip></div>
      )}
      {phone ? <div className="pb-chips"><span className="sx-chip sx-chip--rm">Volunteers needed<button aria-label="Remove filter"><Icon name="x" size={16} /></button></span></div> : null}
    </div></section>
  );
}

function WaNote() {
  return (
    <div className="pb-wa"><span className="pb-prg__ic"><Icon name="message-circle" size={20} /></span><span className="pb-small" style={{ flex: 1, minWidth: 200 }}><b style={{ fontWeight: 600, color: 'var(--slate-900)' }}>Get updates on WhatsApp.</b> One message a week from your centre about seva near you. Reply STOP any time.</span><Button variant="secondary" size="sm">Send me updates</Button></div>
  );
}

function CalendarList({ phone }) {
  return (
    <Pub phone={phone} active="Calendar">
      <Head phone={phone} view="List" />
      <section className="pb-sec" style={{ paddingTop: 8 }}><div className="pb-wrap pb-col" style={{ gap: 0 }}>
        <span className="pb-cap" style={{ marginBottom: 8 }}>Showing 23 Oct – 26 Oct · filters are saved in the page address, so you can share this view.</span>
        {DAYS.map(d => (
          <div className="pb-day" key={d.d}>
            <div className="pb-day__d"><b>{d.d} {d.m}</b><span>{d.wd}</span></div>
            <div className="pb-col" style={{ gap: 8 }}>{d.ev.map((e, i) => <Row key={i} e={e} phone={phone} />)}</div>
          </div>
        ))}
        <div style={{ marginTop: 24 }}><WaNote /></div>
      </div></section>
    </Pub>
  );
}

function CalendarMonth() {
  const cells = [];
  for (let i = 0; i < 3; i++) cells.push({ n: 28 + i + (i ? 0 : 0), out: true, ev: [] });
  const E = { 2: [['Bhajans', 'rec']], 4: [['Bal Vikas', 'rec'], ['Food seva', 'vol']], 8: [['Study circle', 'x']], 10: [['Bhajan evening', '']], 11: [['Medical camp', ''], ['Blood camp', '']], 12: [['Medical camp', '']], 14: [['Bal Vikas camp', '']], 16: [['Narayana Seva', '']], 17: [['Eye camp', '']], 18: [['Bal Vikas', 'rec']], 21: [['Bal Vikas class', '']], 23: [['Food seva', 'vol'], ['Bhajans', 'rec']], 25: [['Medical camp', 'vol'], ['Blood camp', 'vol'], ['Study circle', 'x']], 26: [['Nagar Sankirtan', ''], ['Tree planting', 'vol'], ['Bal Vikas', 'rec']], 29: [['Tree planting', '']], 30: [['Bhajans', 'rec']] };
  for (let d = 1; d <= 31; d++) cells.push({ n: d, ev: E[d] || (d % 7 === 4 ? [['Bhajans', 'rec']] : []), today: d === 19 });
  while (cells.length % 7) cells.push({ n: cells.length - 33, out: true, ev: [] });
  cells[0].n = 28; cells[1].n = 29; cells[2].n = 30;
  return (
    <Pub active="Calendar">
      <Head view="Month" />
      <section className="pb-sec" style={{ paddingTop: 8 }}><div className="pb-wrap pb-col" style={{ gap: 16 }}>
        <div className="pb-row" style={{ justifyContent: 'space-between' }}>
          <div className="pb-row"><button className="sx-icbtn" aria-label="Previous month"><Icon name="chevron-left" size={20} /></button><h2 className="pb-h3" style={{ fontSize: 24 }}>October 2026</h2><button className="sx-icbtn" aria-label="Next month"><Icon name="chevron-right" size={20} /></button></div>
          <div className="sx-legend"><span><i className="sx-sw" style={{ background: 'var(--blue-50)', borderColor: 'var(--blue-200)' }}></i>Seva</span><span><i className="sx-sw" style={{ background: 'var(--pink-50)', borderColor: 'var(--pink-200)' }}></i>Volunteers needed</span><span><i className="sx-sw" style={{ background: 'transparent', borderStyle: 'dashed', borderColor: 'var(--slate-300)' }}></i>Weekly gathering</span><span><i className="sx-sw" style={{ background: 'var(--sand)', borderColor: 'var(--slate-200)' }}></i>Cancelled</span></div>
        </div>
        <div className="pb-month">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(h => <div key={h} className="pb-month__h">{h}</div>)}
          {cells.map((c, i) => (
            <div key={i} className={'pb-month__c' + (c.out ? ' pb-month__c--out' : '') + (c.today ? ' pb-month__c--today' : '')}>
              <span className="pb-month__n" style={c.out ? { color: 'var(--slate-400)' } : null}>{c.n}</span>
              {c.ev.slice(0, 3).map(([t, k], j) => <a href="#" key={j} className={'pb-mev' + (k ? ' pb-mev--' + k : '')}>{t}</a>)}
            </div>
          ))}
        </div>
        <WaNote />
      </div></section>
    </Pub>
  );
}

function FilterSheet() {
  return (
    <div className="sx pb pb--phone" style={{ position: 'relative' }}>
      <div className="sx-phone__status"><span>9:41</span><span></span></div>
      <div style={{ flex: 1, position: 'relative', minHeight: 760 }}>
        <div className="sx-scrim"></div>
        <aside className="sx-bsheet" style={{ maxHeight: '92%' }} role="dialog" aria-label="Filters">
          <div className="sx-bsheet__grab"></div>
          <div className="sx-sheet__hd" style={{ borderBottom: 0, paddingTop: 0 }}><h3 className="sx-h3">Filters</h3><button className="sx-icbtn" aria-label="Close"><Icon name="x" size={20} /></button></div>
          <div className="sx-sheet__bd" style={{ paddingTop: 4 }}>
            <div className="pb-col" style={{ gap: 10 }}><span className="sx-lbl">District</span><div className="sx-chips">{['Central', 'East', 'New Delhi', 'North', 'South', 'West', 'Gurugram', 'Noida–Ghaziabad', 'Faridabad'].map(d => <Chip key={d}>{d}</Chip>)}</div></div>
            <div className="pb-col" style={{ gap: 10 }}><span className="sx-lbl">Seva type</span><div className="sx-chips">{['Bhajans', 'Study circle', 'Bal Vikas', 'Medical', 'Food seva', 'Environment', 'Blood donation'].map(d => <Chip key={d}>{d}</Chip>)}</div></div>
            <div className="pb-col" style={{ gap: 10 }}><span className="sx-lbl">Samithi</span><window.PickerField icon="home" placeholder="Any samithi" /></div>
            <div className="pb-col" style={{ gap: 10 }}><span className="sx-lbl">Show only</span><div className="sx-chips"><Chip on>Volunteers needed</Chip></div></div>
          </div>
          <div className="sx-sheet__ft" style={{ justifyContent: 'space-between' }}><Button variant="ghost">Clear all</Button><Button variant="primary">Show 9 seva</Button></div>
        </aside>
      </div>
    </div>
  );
}

function CalendarEmpty() {
  return (
    <Pub phone active="Calendar">
      <Head phone view="List" />
      <section className="pb-sec" style={{ paddingTop: 8 }}><div className="pb-wrap">
        <div className="pb-card"><EmptyState icon="calendar-search" title="No seva matches these filters." body="Try another district or seva type, or clear the filters to see everything coming up." action={<Button variant="outline">Clear filters</Button>} /></div>
      </div></section>
    </Pub>
  );
}

Object.assign(window, { PubCalendarList: CalendarList, PubCalendarMonth: CalendarMonth, PubCalendarFilters: FilterSheet, PubCalendarEmpty: CalendarEmpty });
})();
