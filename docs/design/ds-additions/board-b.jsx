(() => {
const { Icon, Button, Select, Alert } = window.SSSSODelhiNCRDesignSystem_9ec6b9;
const tx = window.sxTx;
const { Spec, Tile, Phone } = window;

const EVENTS = [
  { id: 1, d: 17, date: '2026-10-17', dl: ['17 Oct 2026', '17 अक्टू 2026'], t: ['Eye camp at Mayur Vihar', 'मयूर विहार में नेत्र शिविर'], ic: 'eye', sam: 'Samithi Mayur Vihar', st: 'report_submitted', src: 'message-circle', due: null, last: ['2 h ago', '2 घंटे पहले'] },
  { id: 2, d: 15, date: '2026-10-15', dl: ['15 Oct 2026', '15 अक्टू 2026'], t: ['Narayan Seva (food)', 'नारायण सेवा (भोजन)'], ic: 'utensils', sam: 'Samithi Preet Vihar', st: 'awaiting_report', src: 'monitor', due: 2, last: ['3 days ago', '3 दिन पहले'] },
  { id: 3, d: 24, date: '2026-10-24', dl: ['24 Oct 2026', '24 अक्टू 2026'], t: ['Blood donation camp', 'रक्तदान शिविर'], ic: 'droplets', sam: 'Samithi Laxmi Nagar', st: 'planned', src: 'message-circle', due: null, last: ['Yesterday', 'कल'] },
  { id: 4, d: 26, date: '2026-10-26', dl: ['26 Oct 2026', '26 अक्टू 2026'], t: ['Medical camp', 'चिकित्सा शिविर'], ic: 'stethoscope', sam: 'Samithi Shahdara', st: 'awaiting_approval', src: 'monitor', due: null, last: ['Today', 'आज'] },
  { id: 5, d: 20, date: '2026-10-20', dl: ['20 Oct 2026', '20 अक्टू 2026'], t: ['Cleanliness drive', 'स्वच्छता अभियान'], ic: 'sprout', sam: 'Samithi Mayur Vihar', st: 'escalated', src: 'message-circle', due: null, last: ['4 days ago', '4 दिन पहले'] },
  { id: 6, d: 12, date: '2026-10-12', dl: ['12 Oct 2026', '12 अक्टू 2026'], t: ['Bal Vikas annual day', 'बाल विकास वार्षिक दिवस'], ic: 'graduation-cap', sam: 'Samithi Patparganj', st: 'approved', src: 'monitor', due: null, last: ['1 week ago', '1 सप्ताह पहले'] },
];
const linkActions = lang => [
  { icon: 'copy', label: tx(lang, 'Copy link', 'लिंक कॉपी करें') }, { icon: 'message-circle', label: tx(lang, 'Resend on WhatsApp', 'व्हाट्सऐप पर दोबारा भेजें') },
  { icon: 'qr-code', label: tx(lang, 'Show QR', 'QR दिखाएँ') }, { icon: 'calendar-plus', label: tx(lang, 'Extend 7 days', '7 दिन बढ़ाएँ') }, '-',
  { icon: 'ban', label: tx(lang, 'Revoke link', 'लिंक रद्द करें'), danger: true },
];

function TableSection({ lang }) {
  const [sort, setSort] = React.useState({ key: 'date', dir: 'desc' });
  const [sel, setSel] = React.useState([2]);
  const [chips, setChips] = React.useState([tx(lang, 'East district', 'पूर्व ज़िला'), tx(lang, 'Last 30 days', 'पिछले 30 दिन')]);
  const [page, setPage] = React.useState(1);
  React.useEffect(() => setChips([tx(lang, 'East district', 'पूर्व ज़िला'), tx(lang, 'Last 30 days', 'पिछले 30 दिन')]), [lang]);
  const rows = [...EVENTS].sort((a, b) => {
    const k = sort.key === 'title' ? [a.t[0], b.t[0]] : sort.key === 'status' ? [a.st, b.st] : [a.date, b.date];
    return (k[0] > k[1] ? 1 : -1) * (sort.dir === 'asc' ? 1 : -1);
  });
  const cols = [
    { key: 'date', label: tx(lang, 'Date', 'तारीख़'), sortable: true, render: r => <span style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{tx(lang, ...r.dl)}</span> },
    { key: 'title', label: tx(lang, 'Event', 'कार्यक्रम'), sortable: true, render: r => <div className="sx-row" style={{ gap: 10, flexWrap: 'nowrap' }}><span style={{ color: 'var(--blue-600)', display: 'inline-flex' }}><Icon name={r.ic} size={18} /></span><div className="sx-col" style={{ gap: 0 }}><span className="sx-tbl__t">{tx(lang, ...r.t)}</span><span className="sx-tbl__sub">{r.sam} · {tx(lang, 'East', 'पूर्व')}</span></div></div> },
    { key: 'status', label: tx(lang, 'Status', 'स्थिति'), sortable: true, render: r => <window.StatusPill status={r.st} lang={lang} /> },
    { key: 'src', label: tx(lang, 'Source', 'स्रोत'), render: r => <span className="sx-row" style={{ gap: 6, color: 'var(--slate-600)', fontSize: 'var(--text-caption)', flexWrap: 'nowrap' }}><Icon name={r.src} size={16} />{r.src === 'monitor' ? tx(lang, 'Portal', 'पोर्टल') : 'WhatsApp'}</span> },
    { key: 'due', label: tx(lang, 'Report due', 'रिपोर्ट देय'), render: r => r.due ? <span className="sx-overdue"><Icon name="alarm-clock" size={16} />{tx(lang, `${r.due} days overdue`, `${r.due} दिन देर`)}</span> : <span className="sx-cap">—</span> },
    { key: 'last', label: tx(lang, 'Last activity', 'अंतिम गतिविधि'), render: r => <span className="sx-cap">{tx(lang, ...r.last)}</span> },
  ];
  return (
    <Spec id="s4" n="04" title="Data table" desc="Sortable headers, removable filter chips, bulk select with an action bar, a row actions menu and pagination. Under 768px each row becomes a card with the status pill and date up front.">
      <window.DataTable lang={lang} columns={cols} rows={rows} selectable sort={sort} onSort={setSort} selected={sel} onSelect={setSel}
        toolbar={<window.FilterChips lang={lang} chips={chips} onRemove={c => setChips(chips.filter(x => x !== c))} onClear={() => setChips([])} onAdd={() => {}} />}
        bulkActions={<><Button variant="secondary" size="sm" icon="message-circle">{tx(lang, 'Resend links', 'लिंक दोबारा भेजें')}</Button><Button variant="outline" size="sm" icon="download">{tx(lang, 'Export', 'निर्यात')}</Button></>}
        rowMenu={r => <window.RowMenu lang={lang} items={linkActions(lang)} />}
        footer={<window.Pagination lang={lang} page={page} pages={4} total={42} perPage={12} onPage={setPage} />} />
      <div className="sx-row" style={{ gap: 24, alignItems: 'flex-start', marginTop: 24 }}>
        <Phone label="Phone · card list">
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--white)', display: 'flex', gap: 8, overflowX: 'auto' }}>
            <span className="sx-chip sx-chip--rm" style={{ flex: 'none' }}>{tx(lang, 'East district', 'पूर्व ज़िला')}<button aria-label="Remove"><Icon name="x" size={16} /></button></span>
            <Button variant="outline" size="sm" icon="sliders-horizontal" style={{ flex: 'none' }}>{tx(lang, 'Filters', 'फ़िल्टर')}</Button>
          </div>
          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10, overflow: 'auto' }}>
            {EVENTS.slice(0, 4).map(r => (
              <div key={r.id} className="sx-ecard">
                <div className="sx-dchip"><b>{r.d}</b><span>{tx(lang, 'Oct', 'अक्टू')}</span></div>
                <div className="sx-col" style={{ gap: 6, minWidth: 0 }}>
                  <span className="sx-tbl__t" style={{ fontSize: 'var(--text-small)' }}>{tx(lang, ...r.t)}</span>
                  <span className="sx-tbl__sub">{r.sam}</span>
                  <div className="sx-row" style={{ gap: 8 }}><window.StatusPill status={r.st} lang={lang} />{r.due ? <span className="sx-overdue"><Icon name="alarm-clock" size={16} />{tx(lang, `${r.due} days overdue`, `${r.due} दिन देर`)}</span> : null}</div>
                </div>
                <window.RowMenu lang={lang} items={linkActions(lang)} />
              </div>
            ))}
          </div>
        </Phone>
        <Tile label="Table rules" style={{ flex: '1 1 280px' }}>
          <ul className="bd-list">
            <li>Rows are 56px minimum; whole row opens the item, checkbox and menu stop propagation.</li>
            <li>Overdue shows a clock glyph and "2 days overdue" in pink — text and colour together.</li>
            <li>Bulk actions appear only while something is selected. Reports are never bulk-approved.</li>
            <li>Sorted column shows an arrow; others show a faint two-way arrow. <code className="bd-code">aria-sort</code> is set.</li>
            <li>Tokens never appear in tables; links show as "Copy link".</li>
          </ul>
        </Tile>
      </div>
    </Spec>
  );
}

/* 5 · Viz */
const DIST_VALUES = { central: 34, east: 52, newdelhi: 21, north: 40, south: 46, west: 29, gurugram: 18, noida: 37, faridabad: 0 };
const MONTHS = [['Nov', 'नव'], ['Dec', 'दिस'], ['Jan', 'जन'], ['Feb', 'फ़र'], ['Mar', 'मार्च'], ['Apr', 'अप्रै'], ['May', 'मई'], ['Jun', 'जून'], ['Jul', 'जुला'], ['Aug', 'अग'], ['Sep', 'सित'], ['Oct', 'अक्टू']];
const TREND = [22, 25, 24, 28, 31, 35, 33, 38, 41, 39, 44, 48];
function VizSection({ lang }) {
  const period = tx(lang, 'This month · Oct 2026', 'इस माह · अक्टू 2026');
  return (
    <Spec id="s5" n="05" title="KPI tiles and charts" desc="Every number carries its period. Estimates are hatched and badged. Missing values show an em dash, never zero. The district map is schematic, with a ranked list as its accessible and phone fallback.">
      <div className="bd-grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
        <window.KpiTile lang={lang} icon="hand-heart" label={tx(lang, 'Activities', 'गतिविधियाँ')} value={48} period={period} delta={tx(lang, '+4 vs Sep', 'सित से +4')} spark={TREND} />
        <window.KpiTile lang={lang} icon="users" label={tx(lang, 'People served', 'सेवा प्राप्त लोग')} value={1240} period={period} delta={tx(lang, '+12% vs Sep', 'सित से +12%')} spark={[800, 860, 920, 900, 1010, 1105, 1240]} note={tx(lang, 'Counts services given; one person may attend more than once.', 'दी गई सेवाओं की गिनती; एक व्यक्ति एक से अधिक बार आ सकता है।')} />
        <window.KpiTile lang={lang} icon="clock" label={tx(lang, 'Volunteer hours', 'स्वयंसेवा घंटे')} value={3160} period={period} delta={tx(lang, '−3% vs Sep', 'सित से −3%')} deltaDir="down" spark={[3300, 3250, 3400, 3260, 3160]} />
        <window.KpiTile lang={lang} icon="chart-pie" label={tx(lang, 'Reporting rate', 'रिपोर्टिंग दर')} value="78%" period={tx(lang, '7 of 9 samithis · Oct 2026', '9 में से 7 समितियाँ · अक्टू 2026')} delta={tx(lang, 'No change', 'कोई बदलाव नहीं')} deltaDir="flat" />
        <window.KpiTile lang={lang} icon="droplets" label={tx(lang, 'Blood units collected', 'एकत्र रक्त यूनिट')} value={1820} period={tx(lang, '2019–2023', '2019–2023')} estimate />
        <window.KpiTile lang={lang} icon="stethoscope" label={tx(lang, 'Cataract surgeries', 'मोतियाबिंद ऑपरेशन')} value={null} period={tx(lang, 'Eye camp · 17 Oct 2026', 'नेत्र शिविर · 17 अक्टू 2026')} note={tx(lang, 'Not yet reported', 'अभी रिपोर्ट नहीं हुआ')} />
      </div>
      <div className="bd-grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))', marginTop: 16 }}>
        <Tile label={tx(lang, 'Bar · Spectacles by power', 'बार · पावर के अनुसार चश्मे')} note={tx(lang, 'Eye camp, 17 Oct 2026 · 63 given', 'नेत्र शिविर, 17 अक्टू 2026 · 63 दिए')}>
          <window.BarChart data={[['+1.0', 12], ['+1.5', 10], ['+2.0', 20], ['+2.5', 14], ['+3.0', 7]].map(([l, v]) => ({ label: l, value: v }))} unitLabel="Spectacles by power" />
        </Tile>
        <Tile label={tx(lang, 'Line · Activities per month', 'रेखा · प्रति माह गतिविधियाँ')} note={tx(lang, 'Nov 2025 – Oct 2026 · Delhi NCR', 'नव 2025 – अक्टू 2026 · दिल्ली एनसीआर')}>
          <window.LineChart lang={lang} data={TREND.map((v, i) => ({ label: tx(lang, ...MONTHS[i]), value: v, estimate: i < 4 }))} />
        </Tile>
        <Tile label={tx(lang, 'District map · activities this year', 'ज़िला मानचित्र · इस वर्ष गतिविधियाँ')} note={tx(lang, 'Jan–Oct 2026 · tap a district', 'जन–अक्टू 2026 · ज़िला चुनें')}>
          <window.DistrictTileMap lang={lang} values={DIST_VALUES} />
        </Tile>
        <Tile label={tx(lang, 'Ranked list · fallback and phone', 'क्रमबद्ध सूची · विकल्प और फ़ोन')} note={tx(lang, 'Jan–Oct 2026', 'जन–अक्टू 2026')}>
          <window.RankedList lang={lang} values={DIST_VALUES} />
        </Tile>
        <Tile label={tx(lang, 'Funnel · Cataract follow-up', 'फ़नल · मोतियाबिंद फ़ॉलो-अप')} note={tx(lang, 'Eye camp, 17 Oct 2026', 'नेत्र शिविर, 17 अक्टू 2026')}>
          <window.Funnel lang={lang} steps={[{ label: tx(lang, 'Screened', 'जाँच हुई'), value: 115 }, { label: tx(lang, 'Cataract found', 'मोतियाबिंद मिले'), value: 13 }, { label: tx(lang, 'Referred', 'रेफ़र किए'), value: null }, { label: tx(lang, 'Operated', 'ऑपरेशन हुए'), value: null }]} />
        </Tile>
      </div>
    </Spec>
  );
}

/* 6 · Forms */
const POWERS = ['+1.0', '+1.5', '+2.0', '+2.5', '+3.0', 'other'];
function FormsSection({ lang }) {
  const [vols, setVols] = React.useState(14);
  const [total, setTotal] = React.useState('63');
  const [pw, setPw] = React.useState({ '+1.0': '12', '+1.5': '10', '+2.0': '20', '+2.5': '14', '+3.0': '2', other: '0' });
  const [seva, setSeva] = React.useState([tx(lang, 'Eye camp', 'नेत्र शिविर')]);
  const [consent, setConsent] = React.useState(true);
  const [rows, setRows] = React.useState([{ id: 1 }]);
  const [file, setFile] = React.useState(null);
  const sum = POWERS.reduce((s, k) => s + (parseInt(pw[k], 10) || 0), 0), tot = parseInt(total, 10) || 0;
  const ok = sum === tot;
  return (
    <Spec id="s6" n="06" title="Form field kit" desc="Built for one thumb at 375px: 48px controls, numeric keypads, big steppers for small counts. Errors are red and block sending; warnings are yellow and don't; live checks turn green when they pass.">
      <div className="bd-grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))' }}>
        <Tile label="Number · big stepper">
          <window.Field lang={lang} label={tx(lang, 'Volunteers (sevadals)', 'स्वयंसेवक (सेवादल)')} help={tx(lang, 'Everyone who served, including the desk.', 'सेवा करने वाले सभी, डेस्क सहित।')}><window.NumberStepper value={vols} onChange={setVols} label="volunteers" /></window.Field>
        </Tile>
        <Tile label="Number · warning (doesn't block)">
          <window.Field lang={lang} label={tx(lang, 'Registered and screened', 'पंजीकृत और जाँचे गए')} message={{ type: 'warning', text: tx(lang, 'Much higher than usual for one camp. Check before sending.', 'एक शिविर के लिए सामान्य से बहुत अधिक। भेजने से पहले जाँच लें।') }}><window.NumberInput value="1150" state="warning" /></window.Field>
        </Tile>
        <Tile label="Number · error (blocks)">
          <window.Field lang={lang} label={tx(lang, 'Referred for surgery', 'ऑपरेशन के लिए रेफ़र')} message={{ type: 'error', text: tx(lang, 'Can’t be more than cataract found (13).', 'मिले मोतियाबिंद (13) से अधिक नहीं हो सकता।') }}><window.NumberInput value="15" state="error" /></window.Field>
        </Tile>
        <Tile label="Live check · cross-field" span={2} note="Edit +3.0 to 7 to pass">
          <div className="sx-col" style={{ gap: 14 }}>
            <window.Field lang={lang} label={tx(lang, 'Spectacles given (total)', 'दिए गए चश्मे (कुल)')}><window.NumberInput value={total} onChange={setTotal} /></window.Field>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(96px,1fr))', gap: 10 }}>
              {POWERS.map(k => <window.Field key={k} label={k === 'other' ? tx(lang, 'Other', 'अन्य') : k}><window.NumberInput value={pw[k]} onChange={v => setPw({ ...pw, [k]: v })} /></window.Field>)}
            </div>
            <window.FieldMessage type={ok ? 'check' : 'warning'}>{tx(lang, `Powers add up to ${sum} of ${tot}`, `पावर का जोड़ ${tot} में से ${sum}`)}</window.FieldMessage>
          </div>
        </Tile>
        <Tile label="Date · time · select">
          <div className="sx-col" style={{ gap: 14 }}>
            <window.Field lang={lang} label={tx(lang, 'Date', 'तारीख़')} help={tx(lang, 'Prefilled from the event', 'कार्यक्रम से पहले से भरा')}><window.PickerField icon="calendar-days" value={tx(lang, '17 Oct 2026', '17 अक्टू 2026')} readOnly /></window.Field>
            <window.Field lang={lang} label={tx(lang, 'Start time', 'आरंभ समय')}><window.PickerField icon="clock" value="9:30 AM" /></window.Field>
            <Select label={tx(lang, 'Partner hospital', 'साझेदार अस्पताल')} options={['ICARE Eye Hospital', tx(lang, 'Add a partner…', 'साझेदार जोड़ें…')]} />
          </div>
        </Tile>
        <Tile label="Multi-select · yes/no">
          <div className="sx-col" style={{ gap: 18 }}>
            <window.Field lang={lang} label={tx(lang, 'Seva given at this camp', 'इस शिविर में दी गई सेवा')}><window.MultiSelect options={[tx(lang, 'Eye camp', 'नेत्र शिविर'), tx(lang, 'Medical', 'चिकित्सा'), tx(lang, 'Narayan Seva', 'नारायण सेवा'), tx(lang, 'Blood', 'रक्तदान')]} value={seva} onChange={setSeva} /></window.Field>
            <window.Field lang={lang} label={tx(lang, 'Did the person agree to follow-up calls?', 'क्या व्यक्ति फ़ॉलो-अप कॉल के लिए सहमत है?')}><window.YesNo value={consent} onChange={setConsent} lang={lang} /></window.Field>
          </div>
        </Tile>
        <Tile label="Photo / file upload">
          <window.Field lang={lang} label={tx(lang, 'Photo of the hospital register', 'अस्पताल रजिस्टर की फ़ोटो')} optional help={tx(lang, 'Stored privately and never published. ID numbers are never read.', 'निजी रूप से रखी जाती है, कभी प्रकाशित नहीं। पहचान संख्या कभी पढ़ी नहीं जाती।')}>
            <window.Upload lang={lang} file={file} onPick={() => setFile('register-page-1.jpg')} onRemove={() => setFile(null)} />
          </window.Field>
        </Tile>
        <Tile label="Repeater rows · personal data" span={2}>
          <window.Field lang={lang} label={tx(lang, 'Follow-up list', 'फ़ॉलो-अप सूची')} optional badge={<window.PersonalDataBadge lang={lang} />} help={tx(lang, 'Only people who agreed. Locality is colony or village — not a full address.', 'केवल सहमत लोग। इलाक़ा केवल कॉलोनी या गाँव — पूरा पता नहीं।')}>
            <window.Repeater lang={lang} rows={rows} itemLabel={tx(lang, 'Person', 'व्यक्ति')} addLabel={tx(lang, 'Add person', 'व्यक्ति जोड़ें')}
              onAdd={() => setRows([...rows, { id: Date.now() }])} onRemove={id => setRows(rows.filter(r => r.id !== id))}
              renderRow={() => <>
                <window.Field label={tx(lang, 'Name', 'नाम')}><window.TextCtl placeholder={tx(lang, 'As they gave it', 'जैसा उन्होंने बताया')} /></window.Field>
                <window.Field label={tx(lang, 'Age', 'आयु')}><window.NumberInput value="" /></window.Field>
                <window.Field label={tx(lang, 'Phone', 'फ़ोन')}><div className="sx-ctl"><span className="sx-cap">+91</span><input inputMode="tel" placeholder="98765 43210" /></div></window.Field>
                <window.Field label={tx(lang, 'Locality', 'इलाक़ा')}><window.TextCtl placeholder={tx(lang, 'Colony or village', 'कॉलोनी या गाँव')} /></window.Field>
              </>} />
          </window.Field>
        </Tile>
        <Tile label="OTP · 6 boxes" note="Paste fills all boxes">
          <div className="sx-col" style={{ gap: 18 }}>
            <window.Field lang={lang} label={tx(lang, 'Enter the code we sent on WhatsApp', 'व्हाट्सऐप पर भेजा गया कोड डालें')} help="+91 98•••••52"><window.OtpInput lang={lang} /></window.Field>
            <span className="sx-cap" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><Icon name="timer" size={16} />{tx(lang, 'Resend in 30s', '30 सेकंड में दोबारा भेजें')}</span>
            <window.Field lang={lang} message={{ type: 'error', text: tx(lang, 'That code didn’t match. 2 tries left.', 'कोड मेल नहीं खाया। 2 प्रयास बाक़ी।') }}><window.OtpInput lang={lang} error /></window.Field>
          </div>
        </Tile>
      </div>
    </Spec>
  );
}

Object.assign(window, { TableSection, VizSection, FormsSection, EVENTS });
})();
