/* Shared site navigation — option C: minimal pill + grouped menu panel. Used on every public page. */
(() => {
const { Icon, Button } = window.SSSSODelhiNCRDesignSystem_9ec6b9;
const tx = (l, en, hi) => (l === 'hi' ? hi : en);
const EXT = { donate: 'https://saidelhi.org/', saiconnect: 'https://saiconnect.org/' };
const GROUPS = [
  ['Learn', 'जानें', [['about', 'info', 'About us', 'हमारे बारे में', 'Page.html?p=about'], ['bhajans', 'music', 'Bhajans', 'भजन', 'Value Shanti.html'], ['discourses', 'book-open', 'Discourses', 'प्रवचन', 'Page.html?p=discourses', 'flag'], ['news', 'newspaper', 'News', 'समाचार', 'Articles.html?c=news']]],
  ['Visit', 'आइए', [['calendar', 'calendar-days', 'Calendar', 'कैलेंडर', 'Calendar.html'], ['map', 'map-pin', 'Centres', 'केंद्र', 'Map.html'], ['impact', 'chart-column', 'Impact', 'प्रभाव', 'Page.html?p=impact']]],
  ['Serve', 'सेवा', [['programs', 'hand-heart', 'Programs', 'कार्यक्रम', 'Page.html?p=programs'], ['join', 'heart-handshake', 'Join a seva', 'सेवा से जुड़ें', 'Page.html?p=join'], ['donate', 'heart', 'Donate', 'दान', EXT.donate, 'ext']]],
];
const CSS = `
.mn{position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:60;font-family:var(--font-sans-body)}
.mn--inline{position:relative;top:auto;left:auto;transform:none;display:flex;justify-content:center;z-index:20}
.mn-pill{display:flex;align-items:center;gap:4px;padding:7px 8px;border-radius:var(--radius-pill,999px);background:rgba(255,255,255,.88);backdrop-filter:saturate(1.1) blur(12px);-webkit-backdrop-filter:saturate(1.1) blur(12px);border:1px solid var(--border-subtle);box-shadow:var(--shadow-sm);transition:background var(--duration-normal,240ms) var(--ease-serene),border-color var(--duration-normal,240ms) var(--ease-serene)}
.mn--dark .mn-pill{background:rgba(20,22,28,.42);border-color:rgba(255,255,255,.22)}
.mn-mark{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;flex:none;background:var(--white,#fff);border:1px solid var(--border-subtle);margin:0 4px 0 0;overflow:hidden;transition:box-shadow var(--duration-normal,240ms) var(--ease-serene)}
.mn-mark img{width:38px;height:38px;object-fit:contain;display:block}
.mn-mark:hover,.mn-mark:focus-visible{box-shadow:var(--shadow-glow-calm,var(--shadow-sm));outline:none}
.foot-emblem{display:block;width:56px;height:56px;border-radius:50%;background:#fff;padding:4px;object-fit:contain;margin-bottom:14px}
.mn--dark .mn-mark{border-color:rgba(255,255,255,.4)}
.mn-b{display:inline-flex;align-items:center;gap:8px;height:44px;min-width:44px;padding:0 14px;justify-content:center;border:0;background:transparent;border-radius:var(--radius-pill,999px);color:var(--slate-700);font:inherit;font-size:var(--text-small,15px);cursor:pointer;white-space:nowrap;text-decoration:none;transition:background var(--duration-fast,160ms) var(--ease-serene),color var(--duration-fast,160ms) var(--ease-serene)}
.mn-b:hover,.mn-b:focus-visible,.mn-b.on{background:var(--pink-100);color:var(--pink-700);outline:none}
.mn-b:focus-visible{box-shadow:var(--focus-ring,0 0 0 3px rgba(91,118,163,.35))}
.mn--dark .mn-b{color:#EAF1F8}.mn--dark .mn-b:hover,.mn--dark .mn-b.on,.mn--dark .mn-b[aria-expanded="true"]{background:rgba(253,217,226,.25);color:#fff}
.mn-b[aria-expanded="true"]{background:var(--pink-100);color:var(--pink-700)}
.mn-sep{width:1px;height:24px;background:var(--border-subtle);margin:0 4px}
.mn--dark .mn-sep{background:rgba(255,255,255,.25)}
.mn-don{display:inline-flex;margin-left:2px}
.mn-panel{position:absolute;top:calc(100% + 10px);left:50%;transform:translateX(-50%);width:min(760px,calc(100vw - 24px));background:var(--white,#fff);border:1px solid var(--border-subtle);border-radius:var(--radius-xl,24px);box-shadow:var(--shadow-lg);padding:28px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px 28px;animation:mn-in var(--duration-slow,400ms) var(--ease-serene)}
@keyframes mn-in{from{opacity:0;transform:translate(-50%,-6px)}to{opacity:1;transform:translate(-50%,0)}}
.mn-panel h4{margin:0 0 8px;font-family:var(--font-sans-body);font-size:var(--text-eyebrow,12px);letter-spacing:var(--tracking-eyebrow,.16em);text-transform:uppercase;font-weight:600;color:var(--slate-500)}
.mn-panel ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:2px}
.mn-panel li a{display:flex;align-items:center;gap:10px;min-height:44px;padding:0 10px;margin:0 -10px;border-radius:var(--radius-md,10px);color:var(--slate-800);text-decoration:none;transition:background var(--duration-fast,160ms) var(--ease-serene)}
.mn-panel li a:hover,.mn-panel li a:focus-visible{background:var(--pink-50);color:var(--pink-700);outline:none}
.mn-panel li a.on{background:var(--pink-100);color:var(--pink-700)}
.mn-panel li a svg{color:var(--slate-500)}
.mn-flag{margin-left:auto;font-size:11px;font-weight:600;letter-spacing:.04em;padding:2px 8px;border-radius:999px;border:1px dashed var(--slate-400);color:var(--slate-600)}
.mn-ext{margin-left:auto;display:inline-flex;color:var(--slate-500)}
.mn-ft{grid-column:1/-1;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;border-top:1px solid var(--border-subtle);padding-top:16px}
.mn-lang{display:inline-flex;padding:3px;border-radius:999px;border:1px solid var(--border-subtle);background:var(--cream)}
.mn-lang button{height:36px;min-width:52px;padding:0 12px;border:0;border-radius:999px;background:transparent;font:inherit;font-size:14px;color:var(--slate-600);cursor:pointer}
.mn-lang button[aria-pressed="true"]{background:var(--white,#fff);color:var(--slate-900);font-weight:600;box-shadow:var(--shadow-sm)}
.mn-sc{display:inline-flex;align-items:center;gap:6px;min-height:44px;color:var(--text-link);font-size:var(--text-small,15px);text-decoration:none}
.mn-sc:hover{color:var(--text-link-hover)}
@media (max-width:720px){.mn:not(.mn--inline){left:12px;right:12px;transform:none}.mn:not(.mn--inline) .mn-pill{justify-content:space-between}}
@media (max-width:720px){.mn .mn-lbl{display:none}.mn .mn-b.mn-menu .mn-lbl{display:inline}.mn .mn-b{padding:0 12px}.mn-panel{grid-template-columns:1fr;padding:20px;gap:16px;max-height:calc(100vh - 100px);overflow:auto}.mn-sep{display:none}.mn-don a>span:last-child,.mn-don button>span:last-child{display:none}}
.mn--phone .mn-lbl{display:none}.mn--phone .mn-b.mn-menu .mn-lbl{display:inline}.mn--phone .mn-b{padding:0 12px}.mn--phone .mn-panel{grid-template-columns:1fr;padding:20px;gap:16px}.mn--phone .mn-sep{display:none}.mn--phone .mn-don a>span:last-child,.mn-don button>span:last-child{display:none}
@media (prefers-reduced-motion:reduce){.mn-panel{animation:none}}
`;
if (!document.getElementById('mn-css')) { const s = document.createElement('style'); s.id = 'mn-css'; s.textContent = CSS; document.head.appendChild(s); }

function MenuNav({ active, lang: l0, setLang: setL0, dark, inline, phone }) {
  const [lLocal, setLLocal] = React.useState(l0 || 'en');
  const lang = l0 || lLocal, setLang = setL0 || setLLocal;
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const k = e => { if (e.key === 'Escape') setOpen(false); };
    const c = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('keydown', k); document.addEventListener('mousedown', c);
    return () => { document.removeEventListener('keydown', k); document.removeEventListener('mousedown', c); };
  }, [open]);
  const ext = { target: '_blank', rel: 'noopener' };
  return (
    <div ref={ref} className={'mn' + (inline ? ' mn--inline' : '') + (dark && !open ? ' mn--dark' : '') + (phone ? ' mn--phone' : '')}>
      <nav className="mn-pill" aria-label={tx(lang, 'Primary', 'मुख्य')}>
        <a className="mn-mark" href="Home v2.html" aria-label={tx(lang, 'Home — Sri Sathya Sai Seva Organisation', 'होम — श्री सत्य साई सेवा संगठन')} title={tx(lang, 'Home', 'होम')}><img src="../assets/sarva-dharma-logo.jpg" alt="" /></a>
        <button type="button" className="mn-b mn-menu" aria-expanded={open} aria-controls="mn-panel" onClick={() => setOpen(v => !v)}><Icon name={open ? 'x' : 'menu'} size={18} /><span className="mn-lbl">{open ? tx(lang, 'Close', 'बंद करें') : tx(lang, 'Menu', 'मेनू')}</span></button>
        <a className={'mn-b' + (active === 'calendar' ? ' on' : '')} href="Calendar.html" aria-label={tx(lang, 'Calendar', 'कैलेंडर')}><Icon name="calendar-days" size={18} /><span className="mn-lbl">{tx(lang, 'Calendar', 'कैलेंडर')}</span></a>
        <a className={'mn-b' + (active === 'map' ? ' on' : '')} href="Map.html" aria-label={tx(lang, 'Find a centre', 'केंद्र खोजें')}><Icon name="map-pin" size={18} /><span className="mn-lbl">{tx(lang, 'Find a centre', 'केंद्र खोजें')}</span></a>
        <span className="mn-sep" aria-hidden="true"></span>
        <span className="mn-don"><Button variant="primary" size="sm" icon="heart" iconAfter="external-link" href={EXT.donate} target="_blank" rel="noopener" aria-label={tx(lang, 'Donate (opens saidelhi.org)', 'दान (saidelhi.org खुलेगा)')}>{tx(lang, 'Donate', 'दान')}</Button></span>
      </nav>
      {open ? <div className="mn-panel" id="mn-panel">
        {GROUPS.map(([en, hi, items]) => <div key={en}><h4>{tx(lang, en, hi)}</h4><ul>
          {items.map(([k, ic, ien, ihi, href, kind]) => <li key={k}><a href={href} className={active === k ? 'on' : ''} {...(kind === 'ext' ? ext : {})} aria-current={active === k ? 'page' : undefined}>
            <Icon name={ic} size={18} /><span>{tx(lang, ien, ihi)}</span>
            {kind === 'flag' ? <span className="mn-flag" title="Hidden until the Trust grants permission">Flag</span> : null}
            {kind === 'ext' ? <span className="mn-ext"><Icon name="external-link" size={16} /></span> : null}
          </a></li>)}
        </ul></div>)}
        <div className="mn-ft">
          <div className="mn-lang" role="group" aria-label={tx(lang, 'Language', 'भाषा')}><button type="button" aria-pressed={lang === 'hi'} onClick={() => setLang('hi')} lang="hi">हिंदी</button><button type="button" aria-pressed={lang !== 'hi'} onClick={() => setLang('en')}>EN</button></div>
          <a className="mn-sc" href={EXT.saiconnect} {...ext}><Icon name="log-in" size={16} />{tx(lang, 'Login to SaiConnect', 'SaiConnect में लॉगिन')}<Icon name="external-link" size={16} /></a>
        </div>
      </div> : null}
    </div>
  );
}
Object.assign(window, { MenuNav });
})();
