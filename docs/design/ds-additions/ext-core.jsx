(() => {
const { Icon } = window.SSSSODelhiNCRDesignSystem_9ec6b9;
const tx = (lang, en, hi) => (lang === 'hi' && hi ? hi : en);
const fmtIN = n => (typeof n === 'number' ? n.toLocaleString('en-IN') : n);

const STATUS = {
  draft: { en: 'Draft', hi: 'ड्राफ़्ट', tone: 'slate', icon: 'file-pen-line' },
  awaiting_approval: { en: 'Awaiting approval', hi: 'स्वीकृति की प्रतीक्षा', tone: 'yellow', icon: 'hourglass' },
  planned: { en: 'Planned', hi: 'नियोजित', tone: 'blue', icon: 'calendar-check' },
  awaiting_report: { en: 'Awaiting report', hi: 'रिपोर्ट की प्रतीक्षा', tone: 'pink', icon: 'clipboard-list' },
  report_submitted: { en: 'Report submitted', hi: 'रिपोर्ट जमा', tone: 'yellow', icon: 'send' },
  approved: { en: 'Approved', hi: 'स्वीकृत', tone: 'green', icon: 'check-circle-2' },
  cancelled: { en: 'Cancelled', hi: 'रद्द', tone: 'slate', icon: 'x-circle' },
  postponed: { en: 'Postponed', hi: 'स्थगित', tone: 'slate', icon: 'calendar-clock' },
  escalated: { en: 'Escalated', hi: 'राज्य को भेजा गया', tone: 'alert', icon: 'alert-triangle' },
};

function StatusPill({ status, lang = 'en', size = 'md' }) {
  const s = STATUS[status];
  return <span className={`sx-pill sx-t-${s.tone}${size === 'lg' ? ' sx-pill--lg' : ''}`}><Icon name={s.icon} size={16} />{tx(lang, s.en, s.hi)}</span>;
}

function Tip({ tip, children }) {
  return <span className="sx-tip"><button type="button" aria-label={tip}>{children}</button><span className="sx-tip__body" role="tooltip">{tip}</span></span>;
}

function EstimateBadge({ lang = 'en', tooltip }) {
  const tip = tooltip || tx(lang, 'Rough figure supplied by the district for years before the platform.', 'प्लैटफ़ॉर्म से पहले के वर्षों के लिए ज़िले द्वारा दिया गया अनुमानित आँकड़ा।');
  return <Tip tip={tip}><span className="sx-pill sx-t-blue" style={{ background: 'var(--white)', borderStyle: 'dashed' }}><Icon name="hash" size={16} />{tx(lang, 'Estimate', 'अनुमान')}</span></Tip>;
}
function PersonalDataBadge({ lang = 'en' }) {
  return <span className="sx-pill sx-t-alert"><Icon name="lock" size={16} />{tx(lang, 'Personal data', 'व्यक्तिगत जानकारी')}</span>;
}
function FlagBadge({ flag = 'discourses', lang = 'en' }) {
  return <span className="sx-pill sx-t-flag"><Icon name="flag" size={16} />{tx(lang, 'Flag', 'फ़्लैग')}: {flag}</span>;
}

function LangToggle({ value, onChange }) {
  return (
    <div className="sx-lang" role="group" aria-label="Language / भाषा">
      <button lang="hi" aria-pressed={value === 'hi'} onClick={() => onChange && onChange('hi')}>हिंदी</button>
      <button lang="en" aria-pressed={value === 'en'} onClick={() => onChange && onChange('en')}>EN</button>
    </div>
  );
}

function Sparkline({ data, width = 96, height = 32, estimateUntil = -1 }) {
  const max = Math.max(...data), min = Math.min(...data), r = max - min || 1;
  const pts = data.map((v, i) => [i * (width / (data.length - 1)), height - 3 - ((v - min) / r) * (height - 6)]);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const last = pts[pts.length - 1];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" style={{ overflow: 'visible', flex: 'none' }}>
      <path d={d} fill="none" stroke="var(--blue-500)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="3" fill="var(--blue-500)" />
    </svg>
  );
}

function KpiTile({ label, value, period, delta, deltaDir = 'up', icon, spark, estimate, note, lang = 'en', compact }) {
  const dash = value === null || value === undefined;
  return (
    <div className="sx-kpi">
      <div className="sx-kpi__top"><span className="sx-kpi__label">{label}</span>{icon ? <span className="sx-kpi__icon"><Icon name={icon} size={20} /></span> : null}</div>
      <div className={'sx-kpi__val' + (dash ? ' sx-kpi__val--dash' : '')} style={compact ? { fontSize: 'var(--text-kpi-sm)' } : null}>{dash ? '—' : fmtIN(value)}</div>
      <div className="sx-kpi__foot">
        <div className="sx-col" style={{ gap: 4 }}>
          <span className="sx-cap">{period}</span>
          {delta ? <span className={'sx-delta sx-delta--' + deltaDir}><Icon name={deltaDir === 'up' ? 'arrow-up-right' : deltaDir === 'down' ? 'arrow-down-right' : 'arrow-right'} size={16} />{delta}</span> : null}
          {estimate ? <EstimateBadge lang={lang} /> : null}
        </div>
        {spark ? <Sparkline data={spark} /> : null}
      </div>
      {note ? <span className="sx-cap" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 8, marginTop: 4 }}>{note}</span> : null}
    </div>
  );
}

function BarChart({ data, unitLabel, height = 180 }) {
  const max = Math.max(...data.map(d => d.value));
  return (
    <figure style={{ margin: 0 }} aria-label={unitLabel}>
      <div className="sx-bars" style={{ height }}>
        {data.map(d => (
          <div className="sx-bar" key={d.label}>
            <span className="sx-bar__v">{fmtIN(d.value)}</span>
            <div className={'sx-bar__fill' + (d.estimate ? ' sx-bar__fill--est' : '')} style={{ height: `${(d.value / max) * 100}%` }}></div>
          </div>
        ))}
      </div>
      <div className="sx-bars__x">{data.map(d => <span key={d.label}>{d.label}</span>)}</div>
    </figure>
  );
}

function LineChart({ data, height = 200, lang = 'en' }) {
  const W = 420, H = height, pl = 30, pr = 18, pt = 12, pb = 26;
  const max = Math.ceil(Math.max(...data.map(d => d.value)) / 10) * 10;
  const x = i => pl + i * ((W - pl - pr) / (data.length - 1));
  const y = v => pt + (1 - v / max) * (H - pt - pb);
  const firstReal = data.findIndex(d => !d.estimate);
  const seg = (a, b) => data.slice(a, b + 1).map((d, i) => (i ? 'L' : 'M') + x(a + i).toFixed(1) + ' ' + y(d.value).toFixed(1)).join(' ');
  const bw = (W - pl - pr) / (data.length - 1);
  return (
    <figure style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={tx(lang, 'Activities per month', 'प्रति माह गतिविधियाँ')} style={{ display: 'block' }}>
        <defs><pattern id="sx-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="var(--blue-50)" /><rect width="2" height="6" fill="var(--blue-300)" /></pattern></defs>
        {firstReal > 0 ? <rect x={pl} y={pt} width={x(firstReal) - bw / 2 - pl} height={H - pt - pb} fill="url(#sx-hatch)" opacity=".7" /> : null}
        {[0, .5, 1].map(f => <g key={f}><line x1={pl} x2={W - pr} y1={y(max * f)} y2={y(max * f)} stroke="var(--slate-200)" /><text x={pl - 8} y={y(max * f) + 4} textAnchor="end" fontSize="13" fill="var(--slate-500)" fontFamily="var(--font-sans-body)">{max * f}</text></g>)}
        {firstReal > 0 ? <path d={seg(0, firstReal)} fill="none" stroke="var(--blue-400)" strokeWidth="1.75" strokeDasharray="4 4" /> : null}
        <path d={seg(Math.max(firstReal, 0), data.length - 1)} fill="none" stroke="var(--blue-600)" strokeWidth="2" strokeLinejoin="round" />
        {data.map((d, i) => <circle key={i} cx={x(i)} cy={y(d.value)} r="3.5" fill={d.estimate ? 'var(--white)' : 'var(--blue-600)'} stroke="var(--blue-600)" strokeWidth="1.5" />)}
        {data.map((d, i) => <text key={'l' + i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="13" fill="var(--slate-600)" fontFamily="var(--font-sans-body)">{d.label}</text>)}
      </svg>
      <figcaption className="sx-legend" style={{ marginTop: 8 }}>
        <span><i className="sx-sw" style={{ background: 'var(--blue-600)', borderColor: 'var(--blue-600)' }}></i>{tx(lang, 'Approved', 'स्वीकृत')}</span>
        <span><i className="sx-sw" style={{ background: 'var(--pattern-estimate)' }}></i>{tx(lang, 'Estimate (dashed line, hatched months)', 'अनुमान (टूटी रेखा, धारीदार महीने)')}</span>
      </figcaption>
    </figure>
  );
}

/* Schematic tile map: approximate relative positions, not geography. */
const DISTRICT_TILES = [
  { id: 'north', en: 'North', hi: 'उत्तर', c: 2, r: 1 },
  { id: 'west', en: 'West', hi: 'पश्चिम', c: 1, r: 2 }, { id: 'central', en: 'Central', hi: 'मध्य', c: 2, r: 2 }, { id: 'east', en: 'East', hi: 'पूर्व', c: 3, r: 2 }, { id: 'noida', en: 'Noida–Ghaziabad', hi: 'नोएडा–ग़ाज़ियाबाद', c: 4, r: 2 },
  { id: 'newdelhi', en: 'New Delhi', hi: 'नई दिल्ली', c: 2, r: 3 }, { id: 'south', en: 'South', hi: 'दक्षिण', c: 3, r: 3 },
  { id: 'gurugram', en: 'Gurugram', hi: 'गुरुग्राम', c: 1, r: 4 }, { id: 'faridabad', en: 'Faridabad', hi: 'फ़रीदाबाद', c: 3, r: 4 },
];
const vizStep = (v, max) => (!v ? 0 : v / max > .75 ? 5 : v / max > .5 ? 4 : v / max > .25 ? 3 : 2);

function DistrictTileMap({ values, lang = 'en', onPick }) {
  const max = Math.max(...Object.values(values));
  return (
    <div>
      <div className="sx-tmap" role="list">
        {DISTRICT_TILES.map(d => {
          const v = values[d.id] || 0, s = vizStep(v, max);
          const dark = s >= 4;
          return (
            <button key={d.id} role="listitem" className={'sx-tile' + (v ? '' : ' sx-tile--empty')} onClick={() => onPick && onPick(d.id)}
              style={{ gridColumn: d.c, gridRow: d.r, background: v ? `var(--viz-${s})` : undefined, color: dark ? 'var(--white)' : 'var(--slate-800)' }}>
              <span className="sx-tile__n">{tx(lang, d.en, d.hi)}</span>
              <span className="sx-tile__v" style={v ? null : { fontFamily: 'var(--font-sans-body)', fontSize: 12, lineHeight: 1.3 }}>{v ? fmtIN(v) : tx(lang, 'No approved activity yet', 'अभी कोई स्वीकृत गतिविधि नहीं')}</span>
            </button>
          );
        })}
      </div>
      <div className="sx-legend" style={{ marginTop: 12 }}>
        <span>{tx(lang, 'Fewer', 'कम')}{[2, 3, 4, 5].map(s => <i key={s} className="sx-sw" style={{ background: `var(--viz-${s})`, borderColor: 'var(--blue-300)' }}></i>)}{tx(lang, 'More', 'अधिक')}</span>
        <span><i className="sx-sw" style={{ background: 'var(--white)', borderStyle: 'dashed', borderColor: 'var(--slate-400)' }}></i>{tx(lang, 'No data', 'कोई डेटा नहीं')}</span>
        <span className="sx-cap">{tx(lang, 'Schematic — positions are approximate', 'योजनाबद्ध — स्थितियाँ अनुमानित हैं')}</span>
      </div>
    </div>
  );
}

function RankedList({ values, lang = 'en' }) {
  const rows = DISTRICT_TILES.map(d => ({ ...d, v: values[d.id] || 0 })).sort((a, b) => b.v - a.v);
  const max = rows[0].v || 1;
  return (
    <ol className="sx-hbar" style={{ margin: 0, padding: 0, listStyle: 'none' }}>
      {rows.map((d, i) => (
        <React.Fragment key={d.id}>
          <span style={{ fontSize: 'var(--text-small)', color: 'var(--slate-800)' }}><span className="sx-cap" style={{ display: 'inline-block', width: 22 }}>{i + 1}</span>{tx(lang, d.en, d.hi)}</span>
          <span className="sx-hbar__track"><span className="sx-hbar__fill" style={{ display: 'block', width: `${(d.v / max) * 100}%` }}></span></span>
          <span style={{ fontSize: 'var(--text-small)', fontWeight: 600, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: d.v ? 'var(--slate-900)' : 'var(--slate-500)' }}>{d.v ? fmtIN(d.v) : tx(lang, 'None yet', 'अभी नहीं')}</span>
        </React.Fragment>
      ))}
    </ol>
  );
}

function Funnel({ steps, lang = 'en' }) {
  const max = Math.max(...steps.map(s => s.value || 0)) || 1;
  return (
    <div className="sx-fun">
      {steps.map(s => {
        const none = s.value === null || s.value === undefined;
        return (
          <div className="sx-fun__row" key={s.label}>
            <span style={{ fontSize: 'var(--text-small)', color: 'var(--slate-800)' }}>{s.label}</span>
            <div className={'sx-fun__bar' + (none ? ' sx-fun__bar--none' : '')} style={{ width: none ? '100%' : `${Math.max((s.value / max) * 100, 4)}%`, display: 'flex', alignItems: 'center', paddingLeft: 10 }}>
              {none ? <span className="sx-cap">{tx(lang, 'Not yet reported', 'अभी रिपोर्ट नहीं हुआ')}</span> : null}
            </div>
            <span className="sx-fun__v" style={none ? { color: 'var(--slate-400)' } : null}>{none ? '—' : fmtIN(s.value)}</span>
          </div>
        );
      })}
    </div>
  );
}

Object.assign(window, { SX_STATUS: STATUS, sxTx: tx, fmtIN, StatusPill, Tip, EstimateBadge, PersonalDataBadge, FlagBadge, LangToggle, Sparkline, KpiTile, BarChart, LineChart, DistrictTileMap, RankedList, Funnel, DISTRICT_TILES });
})();
