(() => {
const { Icon, Button, Badge } = window.SSSSODelhiNCRDesignSystem_9ec6b9;
const { Pub, Crumb, SecHd, StatusPill, EmptyState } = window;

const SCHED = [
  ['Thursday', '6:30 – 7:30 PM', 'Bhajans (devotional singing)', 'music', 'Main hall'],
  ['Saturday', '5:00 – 6:00 PM', 'Study circle', 'book-open', 'Library room'],
  ['Sunday', '10:00 – 11:30 AM', 'Bal Vikas classes, ages 5–15', 'graduation-cap', 'Classrooms 1–3'],
  ['Sunday', '6:30 – 7:30 PM', 'Bhajans', 'music', 'Main hall'],
];
const UP = [['23', 'Oct', 'Narayana Seva (food seva)', 'hand-heart', '8:00 AM · Trilokpuri', 4], ['1', 'Nov', 'Study circle on seva', 'book-open', '5:00 PM · Library room', 0], ['8', 'Nov', 'Blood donation camp', 'droplets', '9:00 AM · Main hall', 10]];
const PAST = [['17 Oct', 'Eye camp', '115 people screened · 63 spectacles given'], ['10 Oct', 'Bhajan evening', 'About 180 attended'], ['28 Sep', 'Narayana Seva', '420 meals served'], ['14 Sep', 'Tree planting', '60 saplings planted']];

function Head({ phone }) {
  return (
    <section className="pb-hero"><div className="pb-wrap">
      <Crumb items={['Centres', 'East district', 'Mayur Vihar']} />
      <div className={phone ? 'pb-col' : 'pb-g pb-gmain'} style={{ gap: phone ? 20 : 40 }}>
        <div className="pb-col" style={{ gap: 14 }}>
          <div className="pb-row"><Badge tone="shanti" icon="map">East district</Badge></div>
          <h1 className="pb-h1">Sai Centre, Mayur Vihar</h1>
          <p className="pb-lead">Bhajans, study circles and Bal Vikas every week, and seva across Mayur Vihar and Trilokpuri. Come as you are.</p>
          <span className="pb-small" style={{ display: 'inline-flex', gap: 8, alignItems: 'flex-start' }}><Icon name="map-pin" size={18} /><span>Dr. Ambedkar Bhawan, Pocket 1, Mayur Vihar Ph-1, Delhi 110091<br /><a href="#" style={{ fontWeight: 500 }}>Open in Google Maps ↗</a></span></span>
        </div>
        <div className="pb-col" style={{ gap: 10 }}>
          <span className="pb-cap" style={{ fontWeight: 600, color: 'var(--slate-700)' }}>Centre contact</span>
          <div className="pb-copy"><Icon name="phone" size={18} /><span className="pb-col" style={{ gap: 0, flex: 1 }}><b>+91 11 2271 4540</b><span className="pb-cap">Phone</span></span><button className="sx-icbtn" aria-label="Copy phone number"><Icon name="copy" size={18} /></button></div>
          <div className="pb-copy"><Icon name="message-circle" size={18} /><span className="pb-col" style={{ gap: 0, flex: 1 }}><b>+91 98100 45400</b><span className="pb-cap">WhatsApp</span></span><button className="sx-icbtn" aria-label="Copy WhatsApp number"><Icon name="copy" size={18} /></button></div>
          <span className="pb-cap">This is the centre’s number, answered by sevadals on duty.</span>
        </div>
      </div>
    </div></section>
  );
}

function Schedule({ phone }) {
  return (
    <div>
      <SecHd title="Every week" sub="Everyone is welcome. No registration needed." />
      {phone ? (
        <div className="pb-col" style={{ gap: 8 }}>{SCHED.map(s => <div key={s[0] + s[1]} className="pb-crow pb-crow--rec"><span className="pb-crow__ic"><Icon name={s[3]} size={18} /></span><span className="pb-col" style={{ gap: 2 }}><span className="pb-crow__t">{s[2]}</span><span className="pb-crow__m">{s[0]} · {s[1]} · {s[4]}</span></span></div>)}</div>
      ) : (
        <table className="pb-tbl"><thead><tr><th>Day</th><th>Time</th><th>Gathering</th><th>Where</th></tr></thead>
          <tbody>{SCHED.map(s => <tr key={s[0] + s[1]}><td style={{ fontWeight: 500 }}>{s[0]}</td><td style={{ whiteSpace: 'nowrap' }}>{s[1]}</td><td><span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}><Icon name={s[3]} size={18} />{s[2]}</span></td><td>{s[4]}</td></tr>)}</tbody></table>
      )}
    </div>
  );
}

function Upcoming() {
  return (
    <div>
      <SecHd title="Upcoming seva" action={<a href="#" className="pb-more">Full calendar<Icon name="arrow-right" size={16} /></a>} />
      <div className="pb-card" style={{ paddingTop: 0, paddingBottom: 0 }}>
        {UP.map(u => (
          <a href="#" className="pb-ev" key={u[2]}>
            <span className="sx-dchip"><b>{u[0]}</b><span>{u[1]}</span></span>
            <span className="pb-col" style={{ gap: 4 }}><span className="pb-ev__t">{u[2]}</span><span className="pb-cap">{u[4]}</span>{u[5] ? <span><span className="pb-volb"><Icon name="hand-heart" size={16} />{u[5]} volunteers needed</span></span> : null}</span>
            <Icon name="chevron-right" size={18} />
          </a>
        ))}
      </div>
    </div>
  );
}

function ThisYear({ phone }) {
  return (
    <div>
      <SecHd title="This year here" sub="Approved activity at this centre, January–October 2026." />
      <div className="pb-g" style={{ gridTemplateColumns: phone ? '1fr 1fr' : 'repeat(4,minmax(0,1fr))', gap: 12 }}>
        {[['64', 'activities'], ['2,180', 'people served'], ['1,540', 'volunteer hours'], ['38', 'sevadals active']].map(([n, l]) => <div className="pb-stat" key={l}><b>{n}</b><span>{l}</span></div>)}
      </div>
      <p className="pb-cap" style={{ marginTop: 10 }}>People served counts visits — one person may attend more than once. Breakdowns by age or gender are shown only at district level.</p>
    </div>
  );
}

function Past() {
  return (
    <div>
      <SecHd title="Past seva and results" action={<a href="#" className="pb-more">All results<Icon name="arrow-right" size={16} /></a>} />
      <div className="pb-card" style={{ paddingTop: 0, paddingBottom: 0 }}>
        {PAST.map(p => (
          <a href="#" className="pb-ev" key={p[1]} style={{ gridTemplateColumns: '64px minmax(0,1fr) auto' }}>
            <span className="pb-small" style={{ paddingTop: 2 }}>{p[0]}</span>
            <span className="pb-col" style={{ gap: 4 }}><span className="pb-ev__t">{p[1]}</span><span className="pb-small">{p[2]}</span></span>
            <Icon name="chevron-right" size={18} />
          </a>
        ))}
      </div>
    </div>
  );
}

function CentrePage({ phone }) {
  return (
    <Pub phone={phone} active="Reach us">
      <Head phone={phone} />
      <section className="pb-sec" style={{ paddingTop: phone ? 16 : 32 }}><div className="pb-wrap pb-col" style={{ gap: phone ? 40 : 56 }}>
        {phone ? <><Schedule phone /><Upcoming /></> : <div className="pb-g pb-g2" style={{ gap: 40, alignItems: 'start' }}><Schedule /><Upcoming /></div>}
        <ThisYear phone={phone} />
        <Past />
      </div></section>
    </Pub>
  );
}

function CentreEmpty() {
  return (
    <Pub phone active="Reach us">
      <section className="pb-hero"><div className="pb-wrap">
        <Crumb items={['Centres', 'East district', 'Patparganj']} />
        <div className="pb-col" style={{ gap: 14 }}>
          <div className="pb-row"><Badge tone="shanti" icon="map">East district</Badge></div>
          <h1 className="pb-h1">Sai Centre, Patparganj</h1>
          <span className="pb-small" style={{ display: 'inline-flex', gap: 8 }}><Icon name="map-pin" size={18} />Community hall, Patparganj, Delhi 110092</span>
        </div>
      </div></section>
      <section className="pb-sec" style={{ paddingTop: 8 }}><div className="pb-wrap">
        <div className="pb-card"><EmptyState icon="sprout" title="This centre’s seva will appear here." body="Weekly gatherings, upcoming seva and results show once the centre adds them. Until then, call the district team or browse the calendar." action={<Button variant="outline" iconAfter="arrow-right">See the calendar</Button>} /></div>
      </div></section>
    </Pub>
  );
}

Object.assign(window, { PubCentre: CentrePage, PubCentreEmpty: CentreEmpty });
})();
