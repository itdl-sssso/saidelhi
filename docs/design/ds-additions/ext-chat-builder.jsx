(() => {
const { Icon, Button, Input, Select, Switch, Alert } = window.SSSSODelhiNCRDesignSystem_9ec6b9;
const tx = window.sxTx;

/* ---------- Chat kit (WhatsApp mocks, brand palette — not a clone of the WhatsApp UI) ---------- */
function ChatFrame({ title = 'SSSSO Delhi NCR', subtitle, children, lang = 'en', overlay }) {
  return (
    <div className="sx-chat" style={{ position: 'relative' }}>
      <div className="sx-chat__hd">
        <span className="sx-ring" style={{ width: 36, height: 36 }}></span>
        <div className="sx-col" style={{ gap: 0, flex: 1 }}><span style={{ fontSize: 'var(--text-small)', fontWeight: 600 }}>{title}</span><span className="sx-cap" style={{ lineHeight: 1.3 }}>{subtitle || tx(lang, 'Official organisation number', 'संगठन का आधिकारिक नंबर')}</span></div>
      </div>
      <div className="sx-chat__bd">{children}</div>
      <div className="sx-chat__ft"><span className="sx-chat__in">{tx(lang, 'Message', 'संदेश')}</span><span className="sx-icbtn" style={{ background: 'var(--blue-100)', color: 'var(--blue-700)' }}><Icon name="send-horizontal" size={20} /></span></div>
      {overlay}
    </div>
  );
}

function Bubble({ dir = 'in', time, template, read, children, lang = 'en' }) {
  return (
    <div className={'sx-bub sx-bub--' + dir}>
      {template ? <span className="sx-tmpl" title="Needs Meta approval before use"><Icon name="badge-check" size={16} />{tx(lang, 'Meta template', 'मेटा टेम्पलेट')}</span> : null}
      <div>{children}</div>
      <div className="sx-bub__meta">{time}{dir === 'out' ? <Icon name={read ? 'check-check' : 'check'} size={16} /> : null}</div>
    </div>
  );
}

function QuickReplies({ options, onPick, row }) {
  return <div className={'sx-qr' + (row ? ' sx-qr--row' : '')}>{options.map(o => <button key={o} onClick={() => onPick && onPick(o)}>{o}</button>)}</div>;
}

function ListMessage({ body, button, time, lang = 'en', onOpen }) {
  return (
    <div className="sx-bub sx-bub--in" style={{ paddingBottom: 6 }}>
      <div>{body}</div>
      <div className="sx-bub__meta">{time}</div>
      <div className="sx-list"><button onClick={onOpen}><Icon name="list" size={16} />{button}</button></div>
    </div>
  );
}

function ListSheet({ title, options, value, onPick, onClose, lang = 'en' }) {
  return (
    <>
      <div className="sx-scrim" onClick={onClose}></div>
      <div className="sx-bsheet" role="dialog" aria-label={title}>
        <div className="sx-bsheet__grab"></div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px 8px 20px' }}><h3 className="sx-h3" style={{ fontSize: 18 }}>{title}</h3><button className="sx-icbtn" aria-label={tx(lang, 'Close', 'बंद करें')} onClick={onClose}><Icon name="x" size={20} /></button></div>
        <div style={{ overflow: 'auto' }}>
          {options.map(o => (
            <div key={o.id} className="sx-lrow" role="radio" aria-checked={value === o.id} tabIndex={0} onClick={() => onPick(o.id)}>
              <span style={{ color: 'var(--blue-600)' }}><Icon name={o.icon} size={20} /></span>
              <div className="sx-col" style={{ gap: 0, flex: 1 }}><span style={{ fontSize: 'var(--text-small)', fontWeight: 500 }}>{o.label}</span>{o.sub ? <span className="sx-cap">{o.sub}</span> : null}</div>
              <span className="sx-radio" data-on={value === o.id}></span>
            </div>
          ))}
        </div>
        <div style={{ padding: 16 }}><Button fullWidth onClick={onClose}>{tx(lang, 'Send', 'भेजें')}</Button></div>
      </div>
    </>
  );
}

function SummaryCard({ title, rows, actions, time, template, lang = 'en', onAction }) {
  return (
    <div className="sx-bub sx-bub--in" style={{ width: '82%', paddingBottom: 6 }}>
      {template ? <span className="sx-tmpl"><Icon name="badge-check" size={16} />{tx(lang, 'Meta template', 'मेटा टेम्पलेट')}</span> : null}
      <strong style={{ display: 'block', fontWeight: 600, color: 'var(--slate-900)' }}>{title}</strong>
      <dl className="sx-sum">{rows.map(([k, v]) => <React.Fragment key={k}><dt>{k}</dt><dd>{v}</dd></React.Fragment>)}</dl>
      <div className="sx-bub__meta">{time}</div>
      <div className="sx-list" style={{ flexDirection: 'column' }}>
        {actions.map((a, i) => <button key={a} onClick={() => onAction && onAction(a)} style={i ? { borderTop: '1px solid var(--border-subtle)' } : null}>{a}</button>)}
      </div>
    </div>
  );
}

/* ---------- Form builder pieces ---------- */
const FIELD_TYPES = [
  { id: 'number', icon: 'hash', en: 'Number', hi: 'संख्या' }, { id: 'text', icon: 'type', en: 'Text', hi: 'टेक्स्ट' },
  { id: 'date', icon: 'calendar', en: 'Date', hi: 'तारीख़' }, { id: 'time', icon: 'clock', en: 'Time', hi: 'समय' },
  { id: 'select', icon: 'chevron-down-square', en: 'Dropdown', hi: 'ड्रॉपडाउन' }, { id: 'multi', icon: 'list-checks', en: 'Multi-select', hi: 'बहु-चयन' },
  { id: 'yesno', icon: 'toggle-left', en: 'Yes / No', hi: 'हाँ / नहीं' }, { id: 'repeater', icon: 'rows-3', en: 'Repeater group', hi: 'दोहराव समूह' },
  { id: 'file', icon: 'image-plus', en: 'Photo / file', hi: 'फ़ोटो / फ़ाइल' }, { id: 'section', icon: 'heading', en: 'Section heading', hi: 'खंड शीर्षक' },
  { id: 'help', icon: 'message-square-text', en: 'Help text', hi: 'सहायता पाठ' },
];

function PaletteItem({ type, lang = 'en', onAdd }) {
  return (
    <button className="sx-pal" draggable onClick={onAdd} aria-label={tx(lang, 'Add field', 'फ़ील्ड जोड़ें') + ': ' + tx(lang, type.en, type.hi)}>
      <span className="sx-pal__grip"><Icon name="grip-vertical" size={16} /></span>
      <span style={{ color: 'var(--blue-600)', display: 'inline-flex' }}><Icon name={type.icon} size={18} /></span>
      {tx(lang, type.en, type.hi)}
    </button>
  );
}

function CanvasField({ field, selected, onSelect, lang = 'en' }) {
  const t = FIELD_TYPES.find(f => f.id === field.type);
  return (
    <div className={'sx-cf' + (field.locked ? ' sx-cf--locked' : '')} role="option" aria-selected={selected} tabIndex={0} onClick={onSelect}>
      <span style={{ color: field.locked ? 'var(--slate-400)' : 'var(--slate-500)', display: 'inline-flex', justifyContent: 'center', cursor: field.locked ? 'default' : 'grab' }}><Icon name={field.locked ? 'lock' : 'grip-vertical'} size={16} /></span>
      <div className="sx-col" style={{ gap: 4, minWidth: 0 }}>
        <span className="sx-cf__t">{tx(lang, field.en, field.hi || field.en)}{field.required ? <span style={{ color: 'var(--pink-600)' }}> *</span> : null}</span>
        <span className="sx-cf__m">
          <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}><Icon name={t.icon} size={16} />{tx(lang, t.en, t.hi)}</span>
          {field.locked ? <span>{tx(lang, 'Core field · can’t be removed', 'मुख्य फ़ील्ड · हटाया नहीं जा सकता')}</span> : null}
          {field.kpi ? <span className="sx-pill sx-t-blue" style={{ padding: '1px 8px' }}>KPI: {field.kpi}</span> : null}
          {field.personal ? <window.PersonalDataBadge lang={lang} /> : null}
          {!field.hi ? <span className="sx-pill sx-t-yellow" style={{ padding: '1px 8px' }}>{tx(lang, 'HI missing', 'हिंदी बाक़ी')}</span> : null}
        </span>
      </div>
      {field.locked ? null : <button className="sx-icbtn" aria-label={tx(lang, 'More', 'और')} onClick={e => e.stopPropagation()}><Icon name="ellipsis-vertical" size={18} /></button>}
    </div>
  );
}

function SettingsPanel({ field, onChange, lang = 'en' }) {
  const set = (k, v) => onChange({ ...field, [k]: v });
  return (
    <section className="sx-panel" aria-label={tx(lang, 'Field settings', 'फ़ील्ड सेटिंग्स')}>
      <div className="sx-panel__hd"><h3 className="sx-h3" style={{ fontSize: 18 }}>{tx(lang, 'Field settings', 'फ़ील्ड सेटिंग्स')}</h3>{field.locked ? <span className="sx-pill sx-t-slate"><Icon name="lock" size={16} />{tx(lang, 'Locked', 'लॉक')}</span> : null}</div>
      <div className="sx-panel__bd">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12 }}>
          <Input label="Label (EN)" value={field.en} onChange={e => set('en', e.target.value)} />
          <Input label="लेबल (हिंदी)" lang="hi" value={field.hi || ''} placeholder="अनुवाद जोड़ें" onChange={e => set('hi', e.target.value)} error={!field.hi ? tx(lang, 'Needed before publish', 'प्रकाशन से पहले ज़रूरी') : null} />
        </div>
        <Input label={tx(lang, 'Help text (EN)', 'सहायता पाठ (EN)')} value={field.help || ''} onChange={e => set('help', e.target.value)} />
        <div className="sx-panel__sec">
          <Switch label={tx(lang, 'Required', 'ज़रूरी')} key={field.id + 'r'} defaultOn={!!field.required} onChange={v => set('required', v)} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <Input label="Min" defaultValue="0" inputMode="numeric" />
            <Input label="Max" defaultValue="500" inputMode="numeric" />
            <Input label={tx(lang, 'Warn above', 'इससे ऊपर चेतावनी')} defaultValue="200" inputMode="numeric" />
          </div>
        </div>
        <div className="sx-panel__sec">
          <span className="sx-lbl">{tx(lang, 'Show only if', 'तभी दिखाएँ जब')}</span>
          <div className="sx-rule-ln"><span className="sx-tok">{tx(lang, 'Spectacles given', 'दिए गए चश्मे')}</span><span>&gt;</span><span className="sx-tok">0</span></div>
          <span className="sx-lbl">{tx(lang, 'Must be', 'होना चाहिए')}</span>
          <div className="sx-rule-ln"><span className="sx-tok">{tx(lang, 'this field', 'यह फ़ील्ड')}</span><span>≤</span><span className="sx-tok">{tx(lang, 'Cataract found', 'मोतियाबिंद मिले')}</span><button className="sx-icbtn" style={{ width: 36, height: 36, marginLeft: 'auto' }} aria-label="Remove rule"><Icon name="x" size={16} /></button></div>
          <div><Button variant="ghost" size="sm" icon="plus">{tx(lang, 'Add rule', 'नियम जोड़ें')}</Button></div>
        </div>
        <div className="sx-panel__sec">
          <Select label={tx(lang, 'Maps to KPI', 'KPI से जुड़ा')} options={['cataract_referred', 'spectacles_distributed', 'people_served', 'Custom, not in KPIs']} value={field.kpi || 'Custom, not in KPIs'} onChange={e => set('kpi', e.target.value === 'Custom, not in KPIs' ? null : e.target.value)} />
          <Switch label={tx(lang, 'Personal data', 'व्यक्तिगत जानकारी')} key={field.id + 'p'} defaultOn={!!field.personal} onChange={v => set('personal', v)} />
          {field.personal ? <Alert tone="attention" title={tx(lang, 'Excluded from dashboards and exports', 'डैशबोर्ड और निर्यात से बाहर')}>{tx(lang, 'A consent question is added to this section and can’t be removed.', 'इस खंड में सहमति का प्रश्न जुड़ जाता है, जिसे हटाया नहीं जा सकता।')}</Alert> : null}
          <Select label={tx(lang, 'Keep for', 'कितने समय रखें')} options={['Until event + 30 days', '1 year after last contact', 'Keep (aggregate only)']} />
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { ChatFrame, Bubble, QuickReplies, ListMessage, ListSheet, SummaryCard, FIELD_TYPES, PaletteItem, CanvasField, SettingsPanel });
})();
