(() => {
const { Icon, Button, Card, Badge, Eyebrow, Tabs, Select } = window.SSSSODelhiNCRDesignSystem_9ec6b9;
const tx = window.sxTx;

function Spec({ id, n, title, desc, children }) {
  return (
    <section id={id} className="bd-sec" data-screen-label={n + ' ' + title}>
      <div className="bd-sec__hd">
        <span className="bd-n">{n}</span>
        <div className="sx-col" style={{ gap: 6 }}><h2 className="bd-h2">{title}</h2>{desc ? <p className="bd-desc">{desc}</p> : null}</div>
      </div>
      {children}
    </section>
  );
}
function Tile({ label, note, children, span, pad = true, style }) {
  return (
    <div className="bd-tile" style={{ gridColumn: span ? `span ${span}` : undefined, ...style }}>
      {label ? <div className="bd-tile__lbl"><span>{label}</span>{note ? <span className="sx-cap">{note}</span> : null}</div> : null}
      <div style={pad ? { padding: 20 } : null}>{children}</div>
    </div>
  );
}
function Phone({ children, label }) {
  return (
    <div className="sx-col" style={{ gap: 8, alignItems: 'flex-start' }}>
      {label ? <span className="sx-lbl">{label}</span> : null}
      <div className="sx-phone" style={{ height: 720 }}>
        <div className="sx-phone__status"><span>9:41</span><span style={{ display: 'inline-flex', gap: 4 }}><Icon name="signal" size={16} /><Icon name="battery-medium" size={16} /></span></div>
        <div className="sx-phone__body">{children}</div>
      </div>
    </div>
  );
}

/* 1 · Type */
const TYPE_ROWS = [
  { tok: '--text-h1', size: 44, serif: true, en: 'Love all, serve all.', hi: 'सबसे प्रेम करो, सबकी सेवा करो।' },
  { tok: '--text-h2', size: 32, serif: true, en: 'Service is worship in action', hi: 'सेवा, कर्म में उपासना है' },
  { tok: '--text-h3', size: 24, serif: true, en: 'Eye camp at Mayur Vihar', hi: 'मयूर विहार में नेत्र शिविर' },
  { tok: '--text-h4', size: 20, serif: true, en: 'Upcoming seva near you', hi: 'आपके पास आने वाली सेवा', w: 500 },
  { tok: '--text-lead', size: 19, en: 'Come as you are. Everything is free.', hi: 'जैसे हैं, वैसे ही आइए। सब कुछ निःशुल्क है।' },
  { tok: '--text-body-size', size: 17, en: 'Bhajans, study circles and Bal Vikas classes in nine districts — open to everyone.', hi: 'नौ ज़िलों में भजन, अध्ययन मंडल और बाल विकास कक्षाएँ — सबके लिए खुली।' },
  { tok: '--text-portal-body', size: 15, en: 'Figures are approved by district coordinators.', hi: 'आँकड़े ज़िला समन्वयकों द्वारा स्वीकृत हैं।', isNew: true },
  { tok: '--text-small', size: 15, en: 'Report due 19 Oct 2026, 5:30 PM', hi: 'रिपोर्ट की अंतिम तिथि 19 अक्टू 2026, शाम 5:30' },
  { tok: '--text-caption', size: 13, en: 'Counts services given; one person may attend more than once.', hi: 'दी गई सेवाओं की गिनती; एक व्यक्ति एक से अधिक बार आ सकता है।' },
  { tok: '--text-eyebrow', size: 12, eyebrow: true, en: 'Thought for the Day', hi: 'आज का विचार' },
];
function TypeSection() {
  const lh = r => (r.serif ? ['1.25', '1.45'] : r.eyebrow ? ['1.4', '1.6'] : ['1.65', '1.85']);
  const st = (r, hi) => ({ margin: 0, fontFamily: r.serif ? 'var(--font-serif-display)' : 'var(--font-sans-body)', fontSize: r.size, fontWeight: r.w || 400,
    lineHeight: r.serif ? 'var(--leading-heading)' : r.eyebrow ? (hi ? 1.6 : 1.4) : 'var(--leading-body)', color: r.serif ? 'var(--text-heading)' : 'var(--text-body)',
    letterSpacing: r.eyebrow ? 'var(--tracking-eyebrow)' : r.size >= 32 ? 'var(--tracking-display)' : 0, textTransform: r.eyebrow && !hi ? 'uppercase' : 'none',
    ...(r.eyebrow ? { fontWeight: 600, color: 'var(--blue-600)' } : null), textWrap: 'pretty' });
  return (
    <Spec id="s1" n="01" title="Devanagari type" desc="Noto Serif Devanagari pairs with Playfair for headings; Noto Sans Devanagari with Inter for body. Both are added as fallbacks in the existing font tokens, so mixed strings (हिंदी with 17 Oct 2026) render each script in its own face. Hindi opens the leading and drops Latin tracking.">
      <div className="bd-tile" style={{ overflow: 'hidden' }}>
        <div className="bd-type bd-type--hd"><span>Token</span><span>English · Playfair / Inter</span><span>हिंदी · Noto Serif / Sans Devanagari</span><span>Size / leading EN → HI</span></div>
        {TYPE_ROWS.map(r => (
          <div className="bd-type" key={r.tok}>
            <code className="bd-code">{r.tok}{r.isNew ? <Badge tone="prem" style={{ marginLeft: 6 }}>New</Badge> : null}</code>
            <p lang="en" style={st(r, false)}>{r.en}</p>
            <p lang="hi" style={st(r, true)}>{r.hi}</p>
            <span className="sx-cap" style={{ fontVariantNumeric: 'tabular-nums' }}>{r.size}px · {lh(r)[0]} → {lh(r)[1]}</span>
          </div>
        ))}
      </div>
      <div className="bd-grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', marginTop: 16 }}>
        <Tile label="Matra check · 17px body" note="Line boxes shaded; ascending ि ी े and descending ु ू ृ must stay inside">
          <div className="bd-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[['1.65', 'EN leading — marks crowd'], ['1.85', 'HI leading — clear']].map(([l, cap]) => (
              <div key={l} className="sx-col">
                <p lang="hi" style={{ margin: 0, fontSize: 17, lineHeight: l, backgroundImage: `repeating-linear-gradient(180deg,var(--blue-50) 0 calc(17px*${l}),var(--white) calc(17px*${l}) calc(34px*${l}))` }}>कृष्ण, ज्ञान, स्त्री, क्षेत्र, श्रृंखला, प्रवृत्ति, द्वितीय, पूर्णिमा, सूर्योदय, हृदय</p>
                <span className="sx-cap">{l} · {cap}</span>
              </div>
            ))}
          </div>
        </Tile>
        <Tile label="Rules">
          <ul className="bd-list">
            <li><b>Tracking 0</b> for all Devanagari. Letter-spacing breaks the shirorekha (headline bar).</li>
            <li><b>No uppercase.</b> Eyebrows in Hindi keep their colour and weight, lose the caps and wide tracking.</li>
            <li><b>Leading</b> heading 1.25 → 1.45, body 1.65 → 1.85, set automatically by <code className="bd-code">:lang(hi)</code>.</li>
            <li><b>Never fixed-width.</b> Hindi strings run 20–30% longer; every container wraps.</li>
            <li><b>Numerals</b> stay Latin (1,23,456) in both languages — Indian grouping via <code className="bd-code">en-IN</code>.</li>
            <li>User-entered text (venue names, notes) shows as entered, untranslated.</li>
          </ul>
        </Tile>
      </div>
    </Spec>
  );
}

/* 2 · Pills */
function PillsSection({ lang }) {
  const keys = Object.keys(window.SX_STATUS);
  return (
    <Spec id="s2" n="02" title="Status pills and data badges" desc="Exactly eight lifecycle states (Cancelled and Postponed share a slate pill). Every pill carries an icon and a text label — colour never carries meaning alone.">
      <div className="bd-grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))' }}>
        <Tile label="Event lifecycle" note="md · lg (event header)">
          <div className="bd-pilltbl">
            {keys.map(k => (
              <React.Fragment key={k}>
                <window.StatusPill status={k} lang="en" />
                <span lang="hi"><window.StatusPill status={k} lang="hi" /></span>
              </React.Fragment>
            ))}
          </div>
          <div className="sx-row" style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-subtle)', gap: 12 }}>
            <window.StatusPill status="report_submitted" size="lg" lang={lang} /><window.StatusPill status="escalated" size="lg" lang={lang} />
          </div>
        </Tile>
        <div className="sx-col" style={{ gap: 16 }}>
          <Tile label="Cancelled and postponed in a list">
            <div className="sx-col" style={{ gap: 12 }}>
              <div className="sx-row" style={{ gap: 12 }}><span className="sx-strike" style={{ fontSize: 'var(--text-small)' }}>{tx(lang, '24 Oct 2026', '24 अक्टू 2026')}</span><window.StatusPill status="cancelled" lang={lang} /></div>
              <div className="sx-row" style={{ gap: 12 }}><span style={{ fontSize: 'var(--text-small)' }}>{tx(lang, 'Moved to 31 Oct 2026', '31 अक्टू 2026 पर स्थानांतरित')}</span><window.StatusPill status="postponed" lang={lang} /></div>
            </div>
          </Tile>
          <Tile label="Data badges" note="Hover or focus Estimate for its tooltip">
            <div className="sx-row" style={{ gap: 10 }}>
              <window.EstimateBadge lang={lang} /><window.PersonalDataBadge lang={lang} /><window.FlagBadge lang={lang} />
            </div>
            <ul className="bd-list" style={{ marginTop: 14 }}>
              <li><b>Estimate</b> — pre-platform figures. Dashed outline matches the hatched chart fill.</li>
              <li><b>Personal data</b> — only on restricted screens and the follow-up section of a form.</li>
              <li><b>Flag</b> — sitemap and portal only; never shown to the public.</li>
            </ul>
          </Tile>
        </div>
      </div>
    </Spec>
  );
}

/* 3 · Shell */
const ROLE_TABS = [['s', 'Samithi coordinator'], ['d', 'District coordinator'], ['a', 'State admin'], ['c', 'Content editor'], ['p', 'PII officer']];
function ShellSection({ lang, setLang }) {
  const [role, setRole] = React.useState('d');
  const [cur, setCur] = React.useState('overview');
  const [scope, setScope] = React.useState('east');
  const [more, setMore] = React.useState(true);
  const roleLabel = ROLE_TABS.find(r => r[0] === role)[1];
  return (
    <Spec id="s3" n="03" title="Admin shell" desc="Role-filtered side navigation, a top bar that always shows the scope, and a phone layout with a bottom tab bar and More sheet. Items a role can't use are hidden, not disabled.">
      <div className="sx-row" style={{ marginBottom: 16, gap: 12 }}>
        <span className="sx-lbl">Preview as</span>
        <Tabs tabs={ROLE_TABS.map(r => r[1])} value={roleLabel} onChange={t => { const r = ROLE_TABS.find(x => x[1] === t)[0]; setRole(r); setCur(r === 'c' ? 'content' : r === 'p' ? 'followup' : 'overview'); }} />
      </div>
      <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
        <div className="sx-shell" style={{ minWidth: 1000 }}>
          <window.SideNav role={role} current={cur} onNav={setCur} lang={lang} />
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <window.TopBar lang={lang} setLang={setLang} role={role} scope={role === 's' ? 'mv' : scope} setScope={setScope} />
            <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="sx-col" style={{ gap: 4 }}>
                <span className="sx-cap">{tx(lang, 'East district · Monday 19 Oct', 'पूर्व ज़िला · सोमवार 19 अक्टू')}</span>
                <h3 className="sx-h3" style={{ fontSize: 'var(--text-h3)' }}>{tx(lang, 'What needs you today', 'आज आपके लिए क्या है')}</h3>
              </div>
              <div className="bd-grid" style={{ gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 12 }}>{[0, 1, 2, 3].map(i => <window.SkeletonKpi key={i} />)}</div>
              <window.SkeletonRows n={3} />
            </div>
          </div>
        </div>
      </div>
      <div className="sx-row" style={{ gap: 24, alignItems: 'flex-start', marginTop: 24 }}>
        {[false, true].map(open => (
          <Phone key={String(open)} label={open ? 'Phone · More sheet open' : 'Phone · 375'}>
            <window.TopBar phone lang={lang} setLang={setLang} role={role} scope={role === 's' ? 'mv' : scope} setScope={setScope} />
            <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden' }}>
              <span className="sx-cap">{tx(lang, 'East district · Monday 19 Oct', 'पूर्व ज़िला · सोमवार 19 अक्टू')}</span>
              <h3 className="sx-h3">{tx(lang, 'Needs you', 'आपके लिए')}</h3>
              {[['check-check', tx(lang, '3 reports to approve', '3 रिपोर्ट स्वीकृत करनी हैं')], ['clipboard-list', tx(lang, '2 camps without a report', '2 शिविरों की रिपोर्ट नहीं आई')], ['inbox', tx(lang, '4 WhatsApp messages to check', 'जाँचने के लिए 4 व्हाट्सऐप संदेश')]].map(([ic, t]) => (
                <div key={t} className="sx-file" style={{ minHeight: 56 }}><span className="sx-file__th" style={{ background: 'var(--pink-50)', color: 'var(--pink-700)' }}><Icon name={ic} size={20} /></span><span style={{ flex: 1, fontSize: 'var(--text-small)', fontWeight: 500 }}>{t}</span><Icon name="chevron-right" size={18} /></div>
              ))}
            </div>
            <window.BottomTabBar current={cur} onNav={setCur} onMore={() => setMore(true)} lang={lang} role={role} />
            {open ? <window.MoreSheet open={more} onClose={() => setMore(false)} role={role} lang={lang} onNav={setCur} /> : null}
          </Phone>
        ))}
        <Tile label="Shell rules" style={{ flex: '1 1 280px' }}>
          <ul className="bd-list">
            <li>Six groups: Operate, Collect, Organisation, Publish, Communicate, Govern. Empty groups disappear.</li>
            <li>Scope switcher is the first thing in the top bar. Samithi coordinators see it fixed (no menu).</li>
            <li>Restricted items (Follow-up, Privacy) carry a lock glyph.</li>
            <li>Phone: four tabs plus More. The tab set follows the role; a content editor's tabs collapse to More only.</li>
            <li>Top bar uses the header blur; it's the only translucent bar in the portal.</li>
          </ul>
          {!more ? <div style={{ marginTop: 12 }}><Button variant="secondary" size="sm" onClick={() => setMore(true)}>Reopen More sheet</Button></div> : null}
        </Tile>
      </div>
    </Spec>
  );
}

Object.assign(window, { Spec, Tile, Phone, TypeSection, PillsSection, ShellSection });
})();
