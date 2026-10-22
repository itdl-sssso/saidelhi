(() => {
const { Icon } = window.SSSSODelhiNCRDesignSystem_9ec6b9;
const t = (l, en, hi) => (l === 'hi' ? hi : en);
const Status = () => <div className="sx-phone__status"><span>9:41</span><span style={{ display: 'inline-flex', gap: 6 }}><Icon name="signal" size={16} /><Icon name="battery-medium" size={16} /></span></div>;

function PDesk({ children, current, role = 'd', scope: s0 = 'east', lang: l0 = 'en' }) {
  const [lang, setLang] = React.useState(l0);
  const [scope, setScope] = React.useState(s0);
  return (
    <div className="sx pt-desk" lang={lang}>
      <div className="sx-shell">
        <window.SideNav role={role} current={current} lang={lang} />
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <window.TopBar lang={lang} setLang={setLang} scope={scope} setScope={setScope} role={role} />
          <main className="pt-main">{typeof children === 'function' ? children(lang) : children}</main>
        </div>
      </div>
    </div>
  );
}

function PPhone({ children, tab, role = 'd', scope: s0 = 'east', lang: l0 = 'en', overlay }) {
  const [lang, setLang] = React.useState(l0);
  const [scope, setScope] = React.useState(s0);
  return (
    <div className="sx sx-phone pt-phone" lang={lang} style={{ position: 'relative' }}>
      <Status />
      <window.TopBar phone lang={lang} setLang={setLang} scope={scope} setScope={setScope} role={role} />
      <div className="pt-pbody">{typeof children === 'function' ? children(lang) : children}</div>
      {tab ? <window.BottomTabBar current={tab} role={role} lang={lang} /> : null}
      {overlay}
    </div>
  );
}

// Minimal page for /f/[token] and /admin/login
function VShell({ lang: l0 = 'en', children, title, wide }) {
  const [l, setL] = React.useState(l0);
  return (
    <div className={'sx b3-v' + (wide ? ' b3-v--wide' : ' sx-phone pt-phone')} lang={l}>
      {wide ? null : <Status />}
      <header className="b3-v__hd">
        <span className="sx-ring" aria-label="Emblem placeholder" style={{ width: 32, height: 32 }}></span>
        <span className="b3-v__t">{title || 'SSSSO Delhi NCR'}</span>
        <window.LangToggle value={l} onChange={setL} />
      </header>
      <div className="b3-v__bd">{typeof children === 'function' ? children(l) : children}</div>
      <footer className="b3-v__ft"><span>{t(l, 'Free and open to people of every faith.', 'हर धर्म के लोगों के लिए निःशुल्क और खुला।')}</span><a href="#">{t(l, 'Privacy', 'गोपनीयता')}</a></footer>
    </div>
  );
}

function EvCard({ l, purpose, icon = 'clipboard-list', date = ['17', 'Oct', 'अक्टू'], title = ['Eye camp', 'नेत्र कैंप'], sub = ['Mayur Vihar · East district', 'मयूर विहार · पूर्व ज़िला'], venue = ['Dr. Ambedkar Bhawan, Mayur Vihar Ph-1', 'डॉ. अंबेडकर भवन, मयूर विहार फ़ेज़-1'], time = '9:00 AM – 2:00 PM' }) {
  const i = l === 'hi' ? 1 : 0;
  return (
    <div className="b3-evc">
      {purpose ? <span className="b3-evc__p"><Icon name={icon} size={16} />{purpose}</span> : null}
      <div className="b3-evc__r">
        <span className="sx-dchip"><b>{date[0]}</b><span>{l === 'hi' ? date[2] : date[1]}</span></span>
        <div className="sx-col" style={{ gap: 2, minWidth: 0 }}>
          <span className="b3-evc__t">{title[i]}</span>
          <span className="sx-cap">{sub[i]}</span>
          <span className="sx-cap">{venue[i]} · {time}</span>
        </div>
      </div>
    </div>
  );
}

function Otp({ v = '', error, lang = 'en' }) {
  const d = v.padEnd(6, ' ').split('');
  return <div className={'sx-otp' + (error ? ' sx-otp--error' : '')} role="group" aria-label={t(lang, '6-digit code', '6 अंकों का कोड')}>{d.map((c, i) => <input key={i} readOnly value={c.trim()} inputMode="numeric" aria-label={t(lang, 'Digit', 'अंक') + ' ' + (i + 1)} />)}</div>;
}

function Ic({ tone = 'blue', icon, size = 48 }) { return <span className={'pt-need__ic sx-t-' + tone} style={{ width: size, height: size }}><Icon name={icon} size={20} /></span>; }

function Fit({ id, set, children, min = 0 }) {
  const r = React.useRef(null);
  React.useLayoutEffect(() => {
    const el = r.current; if (!el) return;
    const m = () => set(id, Math.ceil(el.offsetHeight));
    m(); const ro = new ResizeObserver(m); ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return <div ref={r} className="b3-fit" style={{ '--b3-min': min + 'px' }}>{children}</div>;
}

function HomeLinkCard() {
  const { Button } = window.SSSSODelhiNCRDesignSystem_9ec6b9;
  const items = ['Nav: About, Programs, Bhajans, Get involved, Impact, News, Calendar, Discourses (flag, dashed), हिंदी/EN, SaiConnect, Donate, quiet coordinator login', 'Thought for the Day replaces the message block; unapproved stats removed', 'Upcoming seva strip, 6 cards, swipes on phone', 'Impact snapshot, 4 tiles — hidden when there is no approved data', 'Find a centre: pincode search + map preview', 'Get involved: Join a seva + WhatsApp opt-in', 'Shared footer, same as every public page'];
  return <div className="sx" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 14, background: 'var(--white)' }}>
    <span className="pt-eb">wireframes/Home v2.html</span>
    <h2 className="b3-h">Hero and the five petals are unchanged</h2>
    <ul className="b3-next" style={{ fontSize: 'var(--text-small)' }}>{items.map(i => <li key={i}>{i}</li>)}</ul>
    <div><Button variant="primary" iconAfter="external-link" onClick={() => window.open('../wireframes/Home v2.html', '_blank')}>Open Home v2</Button></div>
  </div>;
}

Object.assign(window, { HomeLinkCard, b3t: t, PDesk, PPhone, VShell, EvCard, B3Otp: Otp, B3Ic: Ic, B3Fit: Fit, B3Status: Status });
})();
