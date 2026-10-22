(() => {
const { Icon, Button } = window.SSSSODelhiNCRDesignSystem_9ec6b9;
const { Pub, SecHd, PbSel, KpiTile, DistrictTileMap, RankedList, LineChart } = window;

const PROGRAMS = [
  ['droplets', 'Blood donation', [['Camps', '18'], ['Units collected', '1,246'], ['Donors', '1,302']]],
  ['eye', 'Eye care', [['People screened', '4,870'], ['Spectacles given', '2,615'], ['Cataract surgeries', '212']]],
  ['stethoscope', 'Medical camps', [['Camps', '74'], ['Patients seen', '9,480']]],
  ['hand-heart', 'Narayana Seva (food seva)', [['Meals served', '1,12,400'], ['Ration kits', '3,860']]],
  ['graduation-cap', 'Bal Vikas (values education)', [['Classes held', '1,920'], ['Children enrolled', '1,140']]],
];
const DIST = { central: 128, east: 312, newdelhi: 96, north: 184, south: 241, west: 205, gurugram: 118, noida: 167, faridabad: 0 };
const TREND = [['Nov', 88, 1], ['Dec', 92, 1], ['Jan', 101, 1], ['Feb', 97], ['Mar', 118], ['Apr', 124], ['May', 109], ['Jun', 96], ['Jul', 131], ['Aug', 142], ['Sep', 138], ['Oct', 151]].map(([label, value, e]) => ({ label, value, estimate: !!e }));
const RECENT = [['17 Oct', 'Eye camp · Mayur Vihar', 'East', '115 people screened'], ['16 Oct', 'Narayana Seva · Laxmi Nagar', 'East', '380 meals served'], ['12 Oct', 'Blood donation camp · Dwarka', 'West', '86 units collected'], ['11 Oct', 'Medical camp · Rohini', 'North', '214 patients seen']];

function Filters({ phone }) {
  return (
    <div className="pb-row" style={{ gap: 10 }}>
      <div className="pb-seg" role="group" aria-label="Period" style={phone ? { width: '100%' } : null}>{['This year', 'Last year', 'All time'].map((p, i) => <button key={p} aria-pressed={i === 0} style={phone ? { flex: 1, padding: '0 8px' } : null}>{p}</button>)}</div>
      <PbSel l="District" v="All of Delhi NCR" />
    </div>
  );
}

function ImpactPage({ phone }) {
  return (
    <Pub phone={phone} active="Impact">
      <section className="pb-hero" style={{ paddingTop: phone ? 32 : 56 }}><div className="pb-wrap pb-col" style={{ gap: 16 }}>
        <span style={{ fontSize: 12, letterSpacing: '.16em', textTransform: 'uppercase', fontWeight: 600, color: 'var(--blue-600)' }}>Impact · 2026 so far</span>
        <h1 className="pb-h1">Seva across Delhi NCR</h1>
        <p className="pb-lead">What sevadals in nine districts have done this year — counted from approved reports, never estimated unless marked.</p>
        <Filters phone={phone} />
        <span className="pb-cap" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><Icon name="badge-check" size={16} />Approved by district coordinators. Updated nightly.</span>
      </div></section>
      <section className="pb-sec" style={{ paddingTop: phone ? 8 : 16 }}><div className="pb-wrap pb-col" style={{ gap: phone ? 40 : 64 }}>
        <div className="pb-g" style={{ gridTemplateColumns: phone ? '1fr 1fr' : 'repeat(4,minmax(0,1fr))', gap: phone ? 10 : 16 }}>
          <KpiTile label="Activities" value={1451} period="Jan–Oct 2026" icon="calendar-days" compact={phone} />
          <KpiTile label="People served" value={48620} period="Jan–Oct 2026" icon="users" note={phone ? null : 'One person may attend more than once.'} compact={phone} />
          <KpiTile label="Volunteer hours" value={36240} period="Jan–Oct 2026" icon="hand-heart" compact={phone} />
          <KpiTile label="Active" value="8 / 9" period="districts · 61 samithis" icon="map" compact={phone} />
        </div>
        {phone ? <span className="pb-cap" style={{ marginTop: -28 }}>People served counts visits — one person may attend more than once.</span> : null}
        <div>
          <SecHd title="By seva type" sub="Open a program to see how it works and where it runs." />
          <div className="pb-g" style={{ gridTemplateColumns: phone ? '1fr' : 'repeat(3,minmax(0,1fr))' }}>
            {PROGRAMS.map(([ic, n, rows]) => (
              <a href="#" key={n} className="pb-card pb-card--link pb-prg">
                <div className="pb-prg__hd"><span className="pb-prg__ic"><Icon name={ic} size={20} /></span><h3 className="pb-h3">{n}</h3></div>
                <dl>{rows.map(([k, v]) => <React.Fragment key={k}><dt>{k}</dt><dd>{v}</dd></React.Fragment>)}</dl>
                <span className="pb-more">About this program<Icon name="arrow-right" size={16} /></span>
              </a>
            ))}
          </div>
        </div>
        <div>
          <SecHd title="By district" sub="Activities this year. Open a district for its centres and results." />
          {phone ? <div className="pb-card"><RankedList values={DIST} /></div> : (
            <div className="pb-g" style={{ gridTemplateColumns: 'minmax(0,1.2fr) minmax(0,1fr)', gap: 24, alignItems: 'start' }}>
              <div className="pb-card"><DistrictTileMap values={DIST} /></div>
              <div className="pb-card"><span className="pb-cap" style={{ fontWeight: 600, color: 'var(--slate-700)' }}>Same data as a list</span><RankedList values={DIST} /></div>
            </div>
          )}
        </div>
        <div className="pb-g" style={{ gridTemplateColumns: phone ? '1fr' : 'minmax(0,1.2fr) minmax(0,1fr)', gap: 24, alignItems: 'start' }}>
          <div>
            <SecHd title="Last 12 months" />
            <div className="pb-card"><LineChart data={TREND} height={phone ? 220 : 240} /><span className="pb-cap">Nov–Jan are district estimates from before reporting moved online.</span></div>
          </div>
          <div>
            <SecHd title="Recently completed" action={<a href="#" className="pb-more">Calendar<Icon name="arrow-right" size={16} /></a>} />
            <div className="pb-card" style={{ paddingTop: 0, paddingBottom: 0 }}>
              {RECENT.map(r => <a href="#" key={r[1]} className="pb-ev" style={{ gridTemplateColumns: '56px minmax(0,1fr) auto' }}><span className="pb-small" style={{ paddingTop: 2 }}>{r[0]}</span><span className="pb-col" style={{ gap: 2 }}><span className="pb-ev__t" style={{ fontSize: 17 }}>{r[1]}</span><span className="pb-small">{r[3]} · {r[2]}</span></span><Icon name="chevron-right" size={18} /></a>)}
            </div>
          </div>
        </div>
        <details className="pb-details" open={!phone}>
          <summary><span style={{ display: 'inline-flex', gap: 10, alignItems: 'center' }}><Icon name="info" size={18} />How we count</span><Icon name="chevron-down" size={18} /></summary>
          <div className="pb-details__bd">
            <p>Every number comes from a report filed after the seva and approved by a district coordinator. Unapproved reports are not counted.</p>
            <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <li>People served counts visits. Someone who comes to three camps is counted three times.</li>
              <li>Figures marked Estimate were supplied by districts for months before online reporting.</li>
              <li>Age and gender appear only at district level or above, and counts under 5 show as “fewer than 5”.</li>
              <li>No names, phone numbers or ID numbers are ever published.</li>
            </ul>
          </div>
        </details>
      </div></section>
    </Pub>
  );
}

Object.assign(window, { PubImpact: ImpactPage });
})();
