(() => {
const { Icon, Button, Select, Input, Badge } = window.SSSSODelhiNCRDesignSystem_9ec6b9;
const tx = window.sxTx;
const { Spec, Tile, Phone } = window;

/* 7 · Feedback */
function FeedbackSection({ lang }) {
  const [sheet, setSheet] = React.useState(false);
  const [toasts, setToasts] = React.useState(['sent', 'offline', 'error']);
  const steps = [
    [tx(lang, 'Draft', 'ड्राफ़्ट'), tx(lang, 'WhatsApp · 14 Oct 6:02 PM', 'व्हाट्सऐप · 14 अक्टू शाम 6:02')],
    [tx(lang, 'Awaiting approval', 'स्वीकृति की प्रतीक्षा'), tx(lang, 'Sent to East district · 14 Oct', 'पूर्व ज़िले को भेजा · 14 अक्टू')],
    [tx(lang, 'Planned', 'नियोजित'), tx(lang, 'Approved on WhatsApp by District coordinator, 17 Oct 9:12 AM', 'ज़िला समन्वयक ने व्हाट्सऐप पर स्वीकृत किया, 17 अक्टू सुबह 9:12')],
    [tx(lang, 'Event day', 'कार्यक्रम का दिन'), tx(lang, '17 Oct 2026', '17 अक्टू 2026')],
    [tx(lang, 'Awaiting report', 'रिपोर्ट की प्रतीक्षा'), tx(lang, '18 Oct', '18 अक्टू')],
    [tx(lang, 'Report submitted', 'रिपोर्ट जमा'), tx(lang, 'Form · 19 Oct 11:40 AM', 'फ़ॉर्म · 19 अक्टू सुबह 11:40')],
    [tx(lang, 'Approved', 'स्वीकृत'), null],
  ].map(([label, meta], i) => ({ label, meta, state: i < 5 ? 'done' : i === 5 ? 'current' : 'upcoming' }));
  const branch = { after: 1, label: tx(lang, 'Escalated to state', 'राज्य को भेजा गया'), meta: tx(lang, 'No reply in 3 days · 17 Oct', '3 दिन में जवाब नहीं · 17 अक्टू') };
  const T = {
    sent: { tone: 'success', text: tx(lang, 'Link sent on WhatsApp to +91 98•••••52.', 'लिंक +91 98•••••52 पर व्हाट्सऐप से भेजा गया।'), act: tx(lang, 'Undo', 'वापस लें') },
    offline: { tone: 'offline', text: tx(lang, 'Saved on this phone. We’ll send it when you’re back online.', 'इस फ़ोन में सहेजा गया। ऑनलाइन होते ही भेज देंगे।') },
    error: { tone: 'error', text: tx(lang, 'Couldn’t send. Check your signal and try again.', 'भेजा नहीं जा सका। सिग्नल जाँचकर दोबारा कोशिश करें।'), act: tx(lang, 'Retry', 'फिर से') },
  };
  return (
    <Spec id="s7" n="07" title="Timeline, stepper and feedback" desc="The lifecycle timeline is horizontal on desktop and vertical on phone, with Escalated as a dashed branch. Toasts sit bottom-centre and never auto-dismiss errors. Skeletons are static — the system has no autoplaying motion.">
      <Tile label="Lifecycle timeline · horizontal">
        <window.Timeline steps={steps} branch={branch} />
      </Tile>
      <div className="bd-grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', marginTop: 16 }}>
        <Tile label="Lifecycle timeline · vertical (phone)"><div style={{ maxWidth: 343 }}><window.Timeline steps={steps} branch={branch} orientation="vertical" /></div></Tile>
        <div className="sx-col" style={{ gap: 16 }}>
          <Tile label="Numbered stepper · upload flow">
            <window.NumberedStepper current={2} steps={[tx(lang, 'Seva type', 'सेवा प्रकार'), tx(lang, 'Drop file', 'फ़ाइल डालें'), tx(lang, 'Preview', 'पूर्वावलोकन'), tx(lang, 'Confirm', 'पुष्टि'), tx(lang, 'Result', 'परिणाम')]} />
          </Tile>
          <Tile label="Toasts">
            <div className="sx-col" style={{ gap: 10 }}>
              {toasts.map(k => <window.Toast key={k} lang={lang} tone={T[k].tone} action={T[k].act} onClose={() => setToasts(toasts.filter(x => x !== k))}>{T[k].text}</window.Toast>)}
              {toasts.length < 3 ? <div><Button variant="ghost" size="sm" onClick={() => setToasts(['sent', 'offline', 'error'])}>Show again</Button></div> : null}
            </div>
          </Tile>
        </div>
        <Tile label="Empty state">
          <window.EmptyState icon="sun" title={tx(lang, 'You’re all caught up.', 'सब काम पूरे हैं।')} body={tx(lang, 'Nothing needs you right now. New reports and messages will appear here.', 'अभी आपके लिए कुछ नहीं है। नई रिपोर्ट और संदेश यहाँ दिखेंगे।')} action={<Button variant="secondary" icon="calendar-plus">{tx(lang, 'Plan an event', 'कार्यक्रम योजना बनाएँ')}</Button>} />
        </Tile>
        <Tile label="Skeleton loaders">
          <div className="sx-col" style={{ gap: 12 }}>
            <div className="bd-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}><window.SkeletonKpi /><window.SkeletonKpi /></div>
            <window.SkeletonRows n={3} />
          </div>
        </Tile>
        <Tile label="Side sheet · desktop" note="Phone uses the bottom sheet (see 03)" pad={false}>
          <div style={{ position: 'relative', height: 520, overflow: 'hidden', background: 'var(--cream)' }}>
            <div style={{ padding: 20 }}><Button variant="outline" icon="sliders-horizontal" onClick={() => setSheet(true)}>{tx(lang, 'Filters', 'फ़िल्टर')}</Button></div>
            <window.SideSheet lang={lang} open={sheet} onClose={() => setSheet(false)} title={tx(lang, 'Filter events', 'कार्यक्रम फ़िल्टर करें')}
              footer={<><Button variant="outline" onClick={() => setSheet(false)}>{tx(lang, 'Clear', 'हटाएँ')}</Button><Button onClick={() => setSheet(false)}>{tx(lang, 'Show 12 events', '12 कार्यक्रम दिखाएँ')}</Button></>}>
              <Select label={tx(lang, 'District', 'ज़िला')} options={[tx(lang, 'East', 'पूर्व'), tx(lang, 'All districts', 'सभी ज़िले')]} />
              <Select label={tx(lang, 'Seva type', 'सेवा प्रकार')} options={[tx(lang, 'All types', 'सभी प्रकार'), tx(lang, 'Eye camp', 'नेत्र शिविर')]} />
              <window.Field lang={lang} label={tx(lang, 'Source', 'स्रोत')}><window.MultiSelect options={['WhatsApp', tx(lang, 'Portal', 'पोर्टल')]} value={['WhatsApp']} onChange={() => {}} /></window.Field>
            </window.SideSheet>
            {!sheet ? <div style={{ padding: '0 20px' }}><window.SkeletonRows n={4} /></div> : null}
          </div>
        </Tile>
        <Tile label="QR poster · A4" note="Bilingual on one sheet; prints at 210 × 297 mm">
          <window.QrPoster purpose={{ en: 'Desk 2 entry', hi: 'डेस्क 2 प्रविष्टि' }} centrePhone="+91 11 2275 0000" event={{ title: 'Eye camp at Mayur Vihar', date: '17 Oct 2026, 9:30 AM', venue: 'Dr. Ambedkar Bhawan, Mayur Vihar Phase-1', samithi: 'Samithi Mayur Vihar · East district' }} />
        </Tile>
      </div>
    </Spec>
  );
}

/* 8 · Chat */
const SEVA_OPTS = lang => [
  { id: 'eye', icon: 'eye', label: tx(lang, 'Eye camp', 'नेत्र शिविर') }, { id: 'blood', icon: 'droplets', label: tx(lang, 'Blood donation', 'रक्तदान') },
  { id: 'med', icon: 'stethoscope', label: tx(lang, 'Medical camp', 'चिकित्सा शिविर') }, { id: 'food', icon: 'utensils', label: tx(lang, 'Narayan Seva (food)', 'नारायण सेवा (भोजन)') },
  { id: 'bv', icon: 'graduation-cap', label: tx(lang, 'Bal Vikas', 'बाल विकास'), sub: tx(lang, 'Children’s values classes', 'बच्चों की मूल्य कक्षाएँ') },
];
function ChatSection({ lang }) {
  const [list, setList] = React.useState(false);
  const [seva, setSeva] = React.useState('eye');
  const sevaLabel = SEVA_OPTS(lang).find(o => o.id === seva).label;
  return (
    <Spec id="s8" n="08" title="Chat bubble kit" desc="For WhatsApp flow mockups, drawn in the brand palette rather than copying the app. Incoming is white, outgoing is calm blue. Messages that need Meta approval carry a gold Meta template tag.">
      <div className="sx-row" style={{ gap: 24, alignItems: 'flex-start' }}>
        <Phone label="Plan an activity">
          <window.ChatFrame lang={lang} overlay={list ? <window.ListSheet lang={lang} title={tx(lang, 'Seva type', 'सेवा प्रकार')} options={SEVA_OPTS(lang)} value={seva} onPick={setSeva} onClose={() => setList(false)} /> : null}>
            <span className="sx-day">{tx(lang, 'Today', 'आज')}</span>
            <window.Bubble dir="out" time="6:01 PM" read>{tx(lang, 'Plan an activity', 'गतिविधि की योजना')}</window.Bubble>
            <window.ListMessage lang={lang} time="6:01 PM" body={tx(lang, 'Which seva (service) are you planning?', 'आप कौन-सी सेवा की योजना बना रहे हैं?')} button={tx(lang, 'Choose seva type', 'सेवा प्रकार चुनें')} onOpen={() => setList(true)} />
            <window.Bubble dir="out" time="6:02 PM" read>{sevaLabel}</window.Bubble>
            <window.Bubble time="6:02 PM">{tx(lang, 'Which day?', 'कौन-सा दिन?')}</window.Bubble>
            <window.QuickReplies row options={[tx(lang, 'Today', 'आज'), tx(lang, 'Tomorrow', 'कल'), tx(lang, 'Pick a date', 'तारीख़ चुनें')]} />
            <window.SummaryCard lang={lang} time="6:04 PM" title={tx(lang, 'Please check', 'कृपया जाँचें')}
              rows={[[tx(lang, 'Seva', 'सेवा'), sevaLabel], [tx(lang, 'Date', 'तारीख़'), tx(lang, '17 Oct 2026, 9:30 AM', '17 अक्टू 2026, सुबह 9:30')], [tx(lang, 'Venue', 'स्थान'), 'Dr. Ambedkar Bhawan'], [tx(lang, 'Volunteers', 'स्वयंसेवक'), '6']]}
              actions={[tx(lang, 'Confirm', 'पुष्टि करें'), tx(lang, 'Edit', 'बदलें')]} />
            <window.Bubble time="6:04 PM">{tx(lang, 'Sent to East district for approval.', 'स्वीकृति के लिए पूर्व ज़िले को भेजा गया।')}</window.Bubble>
          </window.ChatFrame>
        </Phone>
        <Phone label="District approval · login code">
          <window.ChatFrame lang={lang}>
            <span className="sx-day">{tx(lang, 'Today', 'आज')}</span>
            <window.SummaryCard lang={lang} template time="9:10 AM" title={tx(lang, 'Report to approve · Eye camp, Mayur Vihar', 'स्वीकृति हेतु रिपोर्ट · नेत्र शिविर, मयूर विहार')}
              rows={[[tx(lang, 'Screened', 'जाँच'), '115'], [tx(lang, 'Spectacles', 'चश्मे'), '63'], [tx(lang, 'Cataract found', 'मोतियाबिंद'), '13'], [tx(lang, 'Sent by', 'भेजने वाले'), '+91 98•••••52']]}
              actions={[tx(lang, 'Approve', 'स्वीकृत करें'), tx(lang, 'Request changes', 'बदलाव माँगें'), tx(lang, 'Open in portal', 'पोर्टल में खोलें')]} />
            <window.Bubble dir="out" time="9:12 AM" read>{tx(lang, 'Approve', 'स्वीकृत करें')}</window.Bubble>
            <window.Bubble time="9:12 AM">{tx(lang, 'Approved. Results are now public on the event page.', 'स्वीकृत। परिणाम अब कार्यक्रम पेज पर सार्वजनिक हैं।')}</window.Bubble>
            <window.Bubble template time="9:30 AM" lang={lang}>{tx(lang, 'Your code is 482913. It expires in 5 minutes. Never share it.', 'आपका कोड 482913 है। यह 5 मिनट में समाप्त होगा। इसे किसी से साझा न करें।')}</window.Bubble>
            <window.Bubble dir="out" time="9:31 AM" read>{tx(lang, 'abc', 'abc')}</window.Bubble>
            <window.Bubble time="9:31 AM">{tx(lang, 'Sorry, I didn’t understand that. Reply with a number, or type Menu.', 'माफ़ कीजिए, समझ नहीं आया। संख्या भेजें, या मेन्यू लिखें।')}</window.Bubble>
          </window.ChatFrame>
        </Phone>
        <Tile label="Pieces" style={{ flex: '1 1 260px' }}>
          <ul className="bd-list">
            <li><b>Bubble</b> in / out, time, read ticks (Lucide check-check).</li>
            <li><b>Quick replies</b> — up to three, stacked or in a row. 44px.</li>
            <li><b>List message</b> — opens a bottom sheet with radio rows and a Send button. Tap it.</li>
            <li><b>Summary card</b> — key–value list with stacked action buttons.</li>
            <li><b>Meta template</b> tag marks messages sent outside a 24-hour session.</li>
            <li>Phones are always masked. The bot never asks for an ID.</li>
          </ul>
        </Tile>
      </div>
    </Spec>
  );
}

/* 9 · Builder */
const INIT_FIELDS = [
  { id: 'f1', sec: 0, type: 'select', en: 'Samithi', hi: 'समिति', locked: true, required: true },
  { id: 'f2', sec: 0, type: 'date', en: 'Date', hi: 'तारीख़', locked: true, required: true },
  { id: 'f3', sec: 0, type: 'number', en: 'Volunteers (sevadals)', hi: 'स्वयंसेवक (सेवादल)', locked: true, required: true, kpi: 'volunteers' },
  { id: 'f4', sec: 1, type: 'number', en: 'Cataract found', hi: 'मोतियाबिंद मिले', required: true, kpi: 'cataract_found' },
  { id: 'f5', sec: 1, type: 'number', en: 'Referred for surgery', hi: '', kpi: 'cataract_referred', help: 'Must not be more than cataract found.' },
  { id: 'f6', sec: 2, type: 'repeater', en: 'Follow-up list', hi: 'फ़ॉलो-अप सूची', personal: true },
];
function BuilderSection({ lang }) {
  const [fields, setFields] = React.useState(INIT_FIELDS);
  const [selId, setSelId] = React.useState('f5');
  const sel = fields.find(f => f.id === selId);
  const secs = [tx(lang, 'About the camp', 'शिविर के बारे में'), tx(lang, 'Cataract', 'मोतियाबिंद'), tx(lang, 'Follow-up', 'फ़ॉलो-अप')];
  const missing = fields.filter(f => !f.hi).length;
  return (
    <Spec id="s9" n="09" title="Form builder pieces" desc="Palette items, canvas fields and the settings panel. Locked core fields sit on sand with a lock and can't be removed. Click a canvas field to edit it.">
      <div className="bd-tile" style={{ overflow: 'visible' }}>
        <div className="sx-row" style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-subtle)', gap: 12 }}>
          <span className="sx-h3" style={{ fontSize: 18 }}>{tx(lang, 'Eye camp report', 'नेत्र शिविर रिपोर्ट')}</span>
          <Badge tone="sathya">{tx(lang, 'Draft of v4', 'v4 का ड्राफ़्ट')}</Badge>
          {missing ? <span className="sx-pill sx-t-yellow"><Icon name="languages" size={16} />{tx(lang, `HI: ${missing} field${missing > 1 ? 's' : ''} missing`, `हिंदी: ${missing} फ़ील्ड बाक़ी`)}</span> : <span className="sx-pill sx-t-green"><Icon name="languages" size={16} />EN · HI</span>}
          <span style={{ flex: 1 }}></span>
          <Button variant="outline" size="sm" icon="smartphone">{tx(lang, 'Preview', 'पूर्वावलोकन')}</Button>
          <Button size="sm" disabled={!!missing} title={missing ? 'Every field needs EN and HI' : ''}>{tx(lang, 'Publish', 'प्रकाशित करें')}</Button>
        </div>
        <div className="bd-builder">
          <div className="sx-col" style={{ gap: 6 }}>
            <span className="sx-nav__grp" style={{ padding: '0 4px 6px' }}>{tx(lang, 'Add a field', 'फ़ील्ड जोड़ें')}</span>
            {window.FIELD_TYPES.map(t => <window.PaletteItem key={t.id} type={t} lang={lang} onAdd={() => { const id = 'n' + Date.now(); setFields([...fields, { id, sec: 1, type: t.id, en: t.en + ' field', hi: '' }]); setSelId(id); }} />)}
            <span className="sx-cap" style={{ marginTop: 8 }}>{tx(lang, 'There is no field type for ID numbers.', 'पहचान संख्या के लिए कोई फ़ील्ड नहीं है।')}</span>
          </div>
          <div className="sx-col" role="listbox" aria-label="Form canvas" style={{ gap: 8, background: 'var(--cream)', borderRadius: 'var(--radius-lg)', padding: 16, border: '1px solid var(--border-subtle)' }}>
            {secs.map((s, i) => (
              <React.Fragment key={s}>
                <div className="sx-sec-hd" style={i ? { marginTop: 12 } : null}>{s}</div>
                {fields.filter(f => f.sec === i).map(f => <window.CanvasField key={f.id} field={f} lang={lang} selected={f.id === selId} onSelect={() => setSelId(f.id)} />)}
              </React.Fragment>
            ))}
          </div>
          {sel ? <window.SettingsPanel key={sel.id} field={sel} lang={lang} onChange={nf => setFields(fields.map(f => f.id === nf.id ? nf : f))} /> : null}
        </div>
      </div>
    </Spec>
  );
}

/* App */
const SECTIONS = [['s1', 'Type'], ['s2', 'Pills'], ['s3', 'Shell'], ['s4', 'Table'], ['s5', 'Charts'], ['s6', 'Fields'], ['s7', 'Feedback'], ['s8', 'Chat'], ['s9', 'Builder']];
function Board() {
  const [lang, setLangRaw] = React.useState(() => localStorage.getItem('sx-board-lang') || 'en');
  const setLang = l => { setLangRaw(l); localStorage.setItem('sx-board-lang', l); };
  return (
    <div className="sx bd" lang={lang}>
      <header className="bd-hd">
        <div className="bd-wrap bd-hd__in">
          <span className="sx-ring"></span>
          <div className="sx-col" style={{ gap: 0, flex: 1, minWidth: 200 }}>
            <span className="bd-eyebrow">SSSSO Delhi NCR design system</span>
            <span className="bd-title">Additions · v1 · 19 Oct 2026</span>
          </div>
          <nav className="bd-idx" aria-label="Sections">{SECTIONS.map(([id, l], i) => <a key={id} href={'#' + id}>{String(i + 1).padStart(2, '0')} {l}</a>)}</nav>
          <window.LangToggle value={lang} onChange={setLang} />
        </div>
        <div style={{ height: 2, background: 'var(--dharma-rule)' }}></div>
      </header>
      <main className="bd-wrap">
        <div className="bd-intro">
          <h1 className="bd-h1">New components and tokens for the platform</h1>
          <p className="bd-desc">Everything here extends the existing system — same palette, radii, shadows and motion. The toggle switches every specimen between English and Hindi so string length and leading can be checked together. Public body stays 17px; portal body is 15px.</p>
          <div className="sx-row" style={{ gap: 8 }}>
            {['tokens-additions.css', 'components.css', 'ext-core.jsx', 'ext-forms.jsx', 'ext-shell.jsx', 'ext-feedback.jsx', 'ext-chat-builder.jsx'].map(f => <code key={f} className="bd-code">{f}</code>)}
          </div>
        </div>
        <window.TypeSection />
        <window.PillsSection lang={lang} />
        <window.ShellSection lang={lang} setLang={setLang} />
        <TableSection lang={lang} />
        <VizSection lang={lang} />
        <FormsSection lang={lang} />
        <FeedbackSection lang={lang} />
        <ChatSection lang={lang} />
        <BuilderSection lang={lang} />
      </main>
    </div>
  );
}
const { TableSection, VizSection, FormsSection } = window;
ReactDOM.createRoot(document.getElementById('root')).render(<Board />);
})();
