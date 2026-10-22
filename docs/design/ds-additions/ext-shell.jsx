(() => {
const { Icon, Button, Checkbox } = window.SSSSODelhiNCRDesignSystem_9ec6b9;
const tx = window.sxTx;

// roles: s = samithi coord, d = district coord, a = state admin, c = content editor, t = translator, p = PII officer
const NAV = [
  { g: 'operate', en: 'Operate', hi: 'संचालन', items: [
    { id: 'overview', icon: 'layout-dashboard', en: 'Overview', hi: 'अवलोकन', r: 'sda' },
    { id: 'events', icon: 'calendar-days', en: 'Events', hi: 'कार्यक्रम', r: 'sda' },
    { id: 'inbox', icon: 'inbox', en: 'Review inbox', hi: 'समीक्षा इनबॉक्स', r: 'da', count: 4 },
    { id: 'approvals', icon: 'check-check', en: 'Approvals', hi: 'स्वीकृतियाँ', r: 'da', count: 3 } ] },
  { g: 'collect', en: 'Collect', hi: 'संग्रह', items: [
    { id: 'links', icon: 'link', en: 'Form links', hi: 'फ़ॉर्म लिंक', r: 'sda' },
    { id: 'forms', icon: 'file-text', en: 'Form templates', hi: 'फ़ॉर्म टेम्पलेट', r: 'da' },
    { id: 'uploads', icon: 'upload', en: 'Uploads', hi: 'अपलोड', r: 'sda' },
    { id: 'volunteers', icon: 'users', en: 'Volunteer sign-ups', hi: 'स्वयंसेवक पंजीकरण', r: 'sda' } ] },
  { g: 'org', en: 'Organisation', hi: 'संगठन', items: [
    { id: 'org', icon: 'network', en: 'Districts and samithis', hi: 'ज़िले और समितियाँ', r: 'da' },
    { id: 'centres', icon: 'map-pin', en: 'Centres', hi: 'केंद्र', r: 'sdac' },
    { id: 'partners', icon: 'handshake', en: 'Partners', hi: 'साझेदार', r: 'da' },
    { id: 'people', icon: 'user-cog', en: 'People and access', hi: 'लोग और पहुँच', r: 'da' } ] },
  { g: 'publish', en: 'Publish', hi: 'प्रकाशन', items: [
    { id: 'content', icon: 'newspaper', en: 'Content', hi: 'सामग्री', r: 'ac' },
    { id: 'impact', icon: 'chart-column', en: 'Public impact', hi: 'सार्वजनिक प्रभाव', r: 'ac' },
    { id: 'discourses', icon: 'book-open', en: 'Discourses', hi: 'प्रवचन', r: 'act', flag: true } ] },
  { g: 'comms', en: 'Communicate', hi: 'संवाद', items: [
    { id: 'whatsapp', icon: 'message-circle', en: 'WhatsApp', hi: 'व्हाट्सऐप', r: 'da' },
    { id: 'reports', icon: 'file-down', en: 'Reports and exports', hi: 'रिपोर्ट और निर्यात', r: 'da' } ] },
  { g: 'govern', en: 'Govern', hi: 'प्रशासन', items: [
    { id: 'health', icon: 'activity', en: 'Data health', hi: 'डेटा की स्थिति', r: 'da' },
    { id: 'followup', icon: 'heart-pulse', en: 'Follow-up', hi: 'फ़ॉलो-अप', r: 'p', restricted: true },
    { id: 'privacy', icon: 'shield', en: 'Privacy', hi: 'गोपनीयता', r: 'pa', restricted: true },
    { id: 'audit', icon: 'scroll-text', en: 'Audit log', hi: 'ऑडिट लॉग', r: 'ap' },
    { id: 'migration', icon: 'arrow-right-left', en: 'Migration import', hi: 'माइग्रेशन', r: 'a' },
    { id: 'settings', icon: 'settings', en: 'Settings', hi: 'सेटिंग्स', r: 'a' } ] },
];
const ROLES = {
  s: { en: 'Samithi coordinator', hi: 'समिति समन्वयक' }, d: { en: 'District coordinator', hi: 'ज़िला समन्वयक' },
  a: { en: 'State admin', hi: 'राज्य एडमिन' }, c: { en: 'Content editor', hi: 'सामग्री संपादक' },
  t: { en: 'Translator', hi: 'अनुवादक' }, p: { en: 'PII officer', hi: 'व्यक्तिगत डेटा अधिकारी' },
};
const navFor = (role, flags = {}) => NAV.map(g => ({ ...g, items: g.items.filter(i => i.r.includes(role) && (!i.flag || flags.discourses !== false)) })).filter(g => g.items.length);

function SideNav({ role = 'd', current = 'overview', onNav, lang = 'en', flags }) {
  return (
    <nav className="sx-nav" aria-label={tx(lang, 'Portal', 'पोर्टल')}>
      <div className="sx-nav__brand"><span className="sx-ring" aria-label="Emblem placeholder"></span><div className="sx-col" style={{ gap: 0 }}><span className="sx-nav__name">SSSSO Delhi NCR</span><span className="sx-cap">{tx(lang, 'Coordinator portal', 'समन्वयक पोर्टल')}</span></div></div>
      <div className="sx-nav__body">
        {navFor(role, flags).map(g => (
          <div key={g.g} role="group" aria-label={tx(lang, g.en, g.hi)}>
            <div className="sx-nav__grp">{tx(lang, g.en, g.hi)}</div>
            {g.items.map(i => (
              <button key={i.id} className="sx-nav__item" aria-current={current === i.id ? 'page' : undefined} onClick={() => onNav && onNav(i.id)}>
                <Icon name={i.icon} size={18} />{tx(lang, i.en, i.hi)}
                {i.count ? <span className="sx-count" aria-label={i.count + ' waiting'}>{i.count}</span> : null}
                {i.restricted && !i.count ? <span style={{ marginLeft: 'auto', color: 'var(--signal-alert-text)', display: 'inline-flex' }} title="Restricted"><Icon name="lock" size={16} /></span> : null}
              </button>
            ))}
          </div>
        ))}
      </div>
    </nav>
  );
}

function useOutside(open, setOpen) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const k = e => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', h); document.addEventListener('keydown', k);
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('keydown', k); };
  }, [open]);
  return ref;
}

const SCOPES = [
  { id: 'ncr', en: 'Delhi NCR (all)', hi: 'दिल्ली एनसीआर (सभी)', lvl: 0 },
  { id: 'east', en: 'East district', hi: 'पूर्व ज़िला', lvl: 1 },
  { id: 'mv', en: 'Samithi Mayur Vihar', hi: 'समिति मयूर विहार', lvl: 2 },
  { id: 'ln', en: 'Samithi Laxmi Nagar', hi: 'समिति लक्ष्मी नगर', lvl: 2 },
  { id: 'north', en: 'North district', hi: 'उत्तर ज़िला', lvl: 1 },
  { id: 'south', en: 'South district', hi: 'दक्षिण ज़िला', lvl: 1 },
];
function ScopeSwitcher({ value = 'east', onChange, lang = 'en', canChoose = true, compact }) {
  const [open, setOpen] = React.useState(false);
  const ref = useOutside(open, setOpen);
  const cur = SCOPES.find(s => s.id === value);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="sx-scope" aria-haspopup="listbox" aria-expanded={open} onClick={() => canChoose && setOpen(!open)} style={canChoose ? null : { cursor: 'default' }}>
        <Icon name="map-pin" size={16} /><span style={compact ? { maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' } : null}>{tx(lang, cur.en, cur.hi)}</span>{canChoose ? <Icon name="chevron-down" size={16} /> : null}
      </button>
      {open ? (
        <div className="sx-menu" role="listbox" style={{ left: 0 }}>
          <div className="sx-menu__hd">{tx(lang, 'Show data for', 'इसका डेटा दिखाएँ')}</div>
          {SCOPES.map(s => (
            <button key={s.id} role="option" aria-selected={s.id === value} onClick={() => { onChange && onChange(s.id); setOpen(false); }} style={{ paddingLeft: 12 + s.lvl * 16 }}>
              <Icon name={s.lvl === 0 ? 'globe' : s.lvl === 1 ? 'map' : 'home'} size={16} /><span style={{ flex: 1 }}>{tx(lang, s.en, s.hi)}</span>{s.id === value ? <Icon name="check" size={16} /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ProfileMenu({ role = 'd', lang = 'en', compact }) {
  const [open, setOpen] = React.useState(false);
  const ref = useOutside(open, setOpen);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="sx-prof" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)} style={compact ? { padding: 4 } : null} aria-label={tx(lang, 'Profile', 'प्रोफ़ाइल')}>
        <span className="sx-av">CA</span>
        {compact ? null : <span className="sx-col" style={{ gap: 0 }}><span style={{ fontSize: 'var(--text-small)', fontWeight: 500, lineHeight: 1.3 }}>Coordinator A</span><span className="sx-cap" style={{ lineHeight: 1.3 }}>{tx(lang, ROLES[role].en, ROLES[role].hi)}</span></span>}
      </button>
      {open ? (
        <div className="sx-menu" role="menu" style={{ right: 0 }}>
          <div className="sx-menu__hd">Coordinator A · +91 98•••••52<br />{tx(lang, ROLES[role].en, ROLES[role].hi)}</div>
          <hr />
          <button role="menuitem"><Icon name="user" size={16} />{tx(lang, 'My profile', 'मेरी प्रोफ़ाइल')}</button>
          <button role="menuitem"><Icon name="external-link" size={16} />{tx(lang, 'View public site', 'सार्वजनिक साइट देखें')}</button>
          <hr />
          <button role="menuitem" className="sx-danger"><Icon name="log-out" size={16} />{tx(lang, 'Sign out', 'साइन आउट')}</button>
        </div>
      ) : null}
    </div>
  );
}

function TopBar({ lang, setLang, role = 'd', scope, setScope, phone }) {
  if (phone) return (
    <header className="sx-top" style={{ padding: '0 12px', gap: 8 }}>
      <ScopeSwitcher value={scope} onChange={setScope} lang={lang} canChoose={role === 'a' || role === 'd'} compact />
      <span style={{ flex: 1 }}></span>
      <button className="sx-icbtn" aria-label={tx(lang, 'Search', 'खोजें')}><Icon name="search" size={20} /></button>
      <window.LangToggle value={lang} onChange={setLang} />
    </header>
  );
  return (
    <header className="sx-top">
      <ScopeSwitcher value={scope} onChange={setScope} lang={lang} canChoose={role === 'a' || role === 'd'} />
      <label className="sx-search"><Icon name="search" size={18} /><input placeholder={tx(lang, 'Search events, samithis, links', 'कार्यक्रम, समितियाँ, लिंक खोजें')} /></label>
      <window.LangToggle value={lang} onChange={setLang} />
      <ProfileMenu role={role} lang={lang} />
    </header>
  );
}

const TABS = ['overview', 'events', 'inbox', 'approvals'];
function BottomTabBar({ current = 'overview', onNav, onMore, lang = 'en', role = 'd' }) {
  const all = navFor(role).flatMap(g => g.items);
  const tabs = TABS.map(id => all.find(i => i.id === id)).filter(Boolean).slice(0, 4);
  const short = { overview: ['Home', 'होम'], events: ['Events', 'कार्यक्रम'], inbox: ['Inbox', 'इनबॉक्स'], approvals: ['Approve', 'स्वीकृति'] };
  return (
    <nav className="sx-tabbar" aria-label={tx(lang, 'Portal', 'पोर्टल')} style={{ gridTemplateColumns: `repeat(${tabs.length + 1},1fr)` }}>
      {tabs.map(t => (
        <button key={t.id} aria-current={current === t.id ? 'page' : undefined} onClick={() => onNav && onNav(t.id)}>
          <span className="sx-tabbar__ic"><Icon name={t.icon} size={20} />{t.count ? <span className="sx-count">{t.count}</span> : null}</span>{tx(lang, ...short[t.id])}
        </button>
      ))}
      <button onClick={onMore} aria-haspopup="dialog"><span className="sx-tabbar__ic"><Icon name="menu" size={20} /></span>{tx(lang, 'More', 'और')}</button>
    </nav>
  );
}

function MoreSheet({ open, onClose, role = 'd', lang = 'en', onNav }) {
  if (!open) return null;
  const groups = navFor(role).map(g => ({ ...g, items: g.items.filter(i => !TABS.includes(i.id)) })).filter(g => g.items.length);
  return (
    <>
      <div className="sx-scrim" onClick={onClose}></div>
      <div className="sx-bsheet" role="dialog" aria-label={tx(lang, 'More', 'और')}>
        <div className="sx-bsheet__grab"></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 8px 0 20px' }}>
          <h3 className="sx-h3">{tx(lang, 'More', 'और')}</h3>
          <button className="sx-icbtn" aria-label={tx(lang, 'Close', 'बंद करें')} onClick={onClose}><Icon name="x" size={20} /></button>
        </div>
        <div style={{ overflow: 'auto', padding: '0 12px 16px' }}>
          {groups.map(g => (
            <div key={g.g}>
              <div className="sx-nav__grp">{tx(lang, g.en, g.hi)}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                {g.items.map(i => <button key={i.id} className="sx-nav__item" onClick={() => { onNav && onNav(i.id); onClose(); }} style={{ fontSize: 'var(--text-small)' }}><Icon name={i.icon} size={18} />{tx(lang, i.en, i.hi)}</button>)}
              </div>
            </div>
          ))}
          <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: 12, paddingTop: 8 }}>
            <button className="sx-nav__item" style={{ color: 'var(--signal-error-text)' }}><Icon name="log-out" size={18} />{tx(lang, 'Sign out', 'साइन आउट')}</button>
          </div>
        </div>
      </div>
    </>
  );
}

function RowMenu({ items, lang = 'en', label }) {
  const [open, setOpen] = React.useState(false);
  const ref = useOutside(open, setOpen);
  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }} onClick={e => e.stopPropagation()}>
      <button className="sx-icbtn" aria-haspopup="menu" aria-expanded={open} aria-label={label || tx(lang, 'Actions', 'कार्य')} onClick={() => setOpen(!open)}><Icon name="ellipsis" size={20} /></button>
      {open ? (
        <div className="sx-menu" role="menu" style={{ right: 0, minWidth: 220 }}>
          {items.map((it, i) => it === '-' ? <hr key={i} /> : <button key={i} role="menuitem" className={it.danger ? 'sx-danger' : ''} onClick={() => { setOpen(false); it.onClick && it.onClick(); }}><Icon name={it.icon} size={16} />{it.label}</button>)}
        </div>
      ) : null}
    </div>
  );
}

function FilterChips({ chips, onRemove, onAdd, onClear, lang = 'en' }) {
  return (
    <div className="sx-row" style={{ gap: 8 }}>
      {chips.map(c => (
        <span key={c} className="sx-chip sx-chip--rm">{c}<button aria-label={tx(lang, 'Remove filter', 'फ़िल्टर हटाएँ') + ': ' + c} onClick={() => onRemove(c)}><Icon name="x" size={16} /></button></span>
      ))}
      <Button variant="outline" size="sm" icon="sliders-horizontal" onClick={onAdd}>{tx(lang, 'Add filter', 'फ़िल्टर जोड़ें')}</Button>
      {chips.length ? <Button variant="ghost" size="sm" onClick={onClear}>{tx(lang, 'Clear all', 'सब हटाएँ')}</Button> : null}
    </div>
  );
}

function Pagination({ page, pages, total, perPage, onPage, lang = 'en' }) {
  const from = (page - 1) * perPage + 1, to = Math.min(page * perPage, total);
  return (
    <div className="sx-pager">
      <span>{tx(lang, `${from}–${to} of ${total}`, `${total} में से ${from}–${to}`)}</span>
      <div className="sx-pager__pg">
        <button aria-label={tx(lang, 'Previous page', 'पिछला पेज')} disabled={page === 1} onClick={() => onPage(page - 1)}><Icon name="chevron-left" size={18} /></button>
        {Array.from({ length: pages }, (_, i) => i + 1).map(p => <button key={p} aria-current={p === page ? 'page' : undefined} onClick={() => onPage(p)}>{p}</button>)}
        <button aria-label={tx(lang, 'Next page', 'अगला पेज')} disabled={page === pages} onClick={() => onPage(page + 1)}><Icon name="chevron-right" size={18} /></button>
      </div>
    </div>
  );
}

function DataTable({ columns, rows, selectable, sort, onSort, selected = [], onSelect, bulkActions, toolbar, footer, rowMenu, lang = 'en' }) {
  const all = rows.length && rows.every(r => selected.includes(r.id));
  const toggle = id => onSelect(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id]);
  return (
    <div className="sx-tbl-wrap">
      {toolbar ? <div className="sx-tbl-tools">{toolbar}</div> : null}
      {selected.length ? <div className="sx-bulk" role="status"><span>{tx(lang, `${selected.length} selected`, `${selected.length} चुने गए`)}</span><span style={{ flex: 1 }}></span>{bulkActions}<Button variant="ghost" size="sm" onClick={() => onSelect([])}>{tx(lang, 'Clear', 'हटाएँ')}</Button></div> : null}
      <div className="sx-tbl-scroll">
        <table className="sx-tbl">
          <thead><tr>
            {selectable ? <th className="sx-cb"><Checkbox checked={!!all} onChange={() => onSelect(all ? [] : rows.map(r => r.id))} aria-label={tx(lang, 'Select all', 'सभी चुनें')} /></th> : null}
            {columns.map(c => (
              <th key={c.key} className={c.num ? 'sx-num' : ''} aria-sort={sort && sort.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
                {c.sortable ? <button onClick={() => onSort({ key: c.key, dir: sort && sort.key === c.key && sort.dir === 'asc' ? 'desc' : 'asc' })}>{c.label}<Icon name={sort && sort.key === c.key ? (sort.dir === 'asc' ? 'arrow-up' : 'arrow-down') : 'arrow-up-down'} size={16} style={{ color: sort && sort.key === c.key ? 'var(--blue-600)' : 'var(--slate-400)' }} /></button> : c.label}
              </th>
            ))}
            {rowMenu ? <th style={{ width: 56 }}><span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>{tx(lang, 'Actions', 'कार्य')}</span></th> : null}
          </tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} aria-selected={selected.includes(r.id)}>
                {selectable ? <td className="sx-cb" onClick={e => e.stopPropagation()}><Checkbox checked={selected.includes(r.id)} onChange={() => toggle(r.id)} aria-label={tx(lang, 'Select row', 'पंक्ति चुनें')} /></td> : null}
                {columns.map(c => <td key={c.key} className={c.num ? 'sx-num' : ''}>{c.render ? c.render(r) : r[c.key]}</td>)}
                {rowMenu ? <td style={{ padding: '0 6px' }}>{rowMenu(r)}</td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {footer}
    </div>
  );
}

Object.assign(window, { SX_NAV: NAV, SX_ROLES: ROLES, navFor, SideNav, ScopeSwitcher, ProfileMenu, TopBar, BottomTabBar, MoreSheet, RowMenu, FilterChips, Pagination, DataTable, useOutside });
})();
