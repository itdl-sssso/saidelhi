(() => {
const { Icon, Button } = window.SSSSODelhiNCRDesignSystem_9ec6b9;

function Phone({ children, tab, top = true, lang: lang0 = 'en', bodyStyle }) {
  const [lang, setLang] = React.useState(lang0);
  const [scope, setScope] = React.useState('east');
  return (
    <div className="sx sx-phone pt-phone" lang={lang}>
      <div className="sx-phone__status"><span>9:41</span><span style={{ display: 'inline-flex', gap: 6 }}><Icon name="signal" size={16} /><Icon name="battery-medium" size={16} /></span></div>
      {top ? <window.TopBar phone lang={lang} setLang={setLang} scope={scope} setScope={setScope} role="d" /> : null}
      <div className="pt-pbody" style={bodyStyle}>{typeof children === 'function' ? children(lang) : children}</div>
      {tab ? <window.BottomTabBar current={tab} role="d" lang={lang} /> : null}
    </div>
  );
}

function Desk({ children, current }) {
  const [lang, setLang] = React.useState('en');
  const [scope, setScope] = React.useState('east');
  return (
    <div className="sx pt-desk" lang={lang}>
      <div className="sx-shell">
        <window.SideNav role="d" current={current} lang={lang} />
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <window.TopBar lang={lang} setLang={setLang} scope={scope} setScope={setScope} role="d" />
          <main className="pt-main">{children}</main>
        </div>
      </div>
    </div>
  );
}

function PageHead({ eyebrow, title, sub, actions, back }) {
  return (
    <div className="pt-head">
      <div className="pt-head__t">
        {back ? <a href="#" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-small)', textDecoration: 'none', minHeight: 32 }}><Icon name="arrow-left" size={16} />{back}</a> : null}
        {eyebrow ? <span className="pt-eb">{eyebrow}</span> : null}
        <h1 className="pt-h1">{title}</h1>
        {sub ? <p className="pt-sub">{sub}</p> : null}
      </div>
      {actions ? <div className="sx-row">{actions}</div> : null}
    </div>
  );
}

function Panel({ title, action, children, flush, className = '', style, badge }) {
  return (
    <section className={'pt-card ' + className} style={style}>
      {title ? <header className="pt-card__hd"><span className="sx-row" style={{ gap: 10 }}><h2 className="sx-h3">{title}</h2>{badge}</span>{action}</header> : null}
      <div className={'pt-card__bd' + (flush ? ' pt-card__bd--flush' : '')}>{children}</div>
    </section>
  );
}

function Conf({ level }) {
  const m = { high: ['sx-t-green', 'circle-check', 'High'], check: ['sx-t-yellow', 'eye', 'Check'], low: ['sx-t-alert', 'triangle-alert', 'Low'] }[level];
  return <span className={'sx-pill ' + m[0]}><Icon name={m[1]} size={16} />{m[2]}</span>;
}

const SRC = { whatsapp: ['message-circle', 'WhatsApp'], sheet: ['sheet', 'Sheet'], scan: ['scan-line', 'Scan'], form: ['file-text', 'Form'], upload: ['upload', 'Upload'] };
function SourceBadge({ src }) { return <span className="pt-src"><Icon name={SRC[src][0]} size={16} />{SRC[src][1]}</span>; }

function ModalStage({ children, behind }) {
  return (
    <div className="sx pt-modal-stage">
      {behind}
      <div className="sx-scrim"></div>
      {children}
    </div>
  );
}

// Static stepper wrapper so each artboard holds its own value
function Step({ v, label }) { const [x, setX] = React.useState(v); return <window.NumberStepper value={x} onChange={setX} label={label} />; }

const EVENT = { title: 'Eye camp', place: 'Mayur Vihar', date: '17 Oct 2026', venue: 'Dr. Ambedkar Bhawan, Mayur Vihar Ph-1', samithi: 'Samithi Mayur Vihar', district: 'East district', partner: 'ICARE Eye Hospital' };

Object.assign(window, { Phone, Desk, PageHead, Panel, Conf, SourceBadge, ModalStage, Step, PT_EVENT: EVENT });
})();
