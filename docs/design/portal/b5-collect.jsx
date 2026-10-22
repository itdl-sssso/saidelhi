(() => {
const { Icon, Button, Input, Select, Checkbox, Alert, Switch, Badge } = window.SSSSODelhiNCRDesignSystem_9ec6b9;
const { PDesk, PPhone, PageHead, Panel, Field, PickerField, RowMenu, ModalStage, B5T: T, B5Tabs: Tabs, B5Pill: Pill, B5Lang: Lang, B5Sel: Sel, B5Note: Note, B5Mono: Mono } = window;
const STEPS = ['Seva type', 'Get the file', 'Drop file', 'Check rows', 'Done'];
const Steps = ({ c }) => <window.NumberedStepper steps={STEPS} current={c} />;

/* ---------- A · /admin/uploads ---------- */
function UpChoose({ phone }) {
  return <>
    <Panel title="1 · Which seva is this for?">
      <div className={'pt-grid' + (phone ? '' : ' pt-g2')}><Select label="Seva type" options={['Eye camp', 'Medical camp', 'Narayana Seva (food)', 'Bal Vikas class', 'Tree planting']} defaultValue="Eye camp" /><Field label="Samithi"><PickerField icon="home" value="Mayur Vihar · DL-E-MAYURVIHAR" /></Field></div>
    </Panel>
    <Panel title="2 · Get the right file">
      <div className="b5-choice">
        <div className="b5-opt is-on"><Icon name="file-spreadsheet" size={24} /><b>Download our template</b><span>Eye camp report v3. Your samithi code is already filled in, so rows go to the right place.</span><div><Button variant="primary" size="sm" icon="download">Download .xlsx</Button></div></div>
        <div className="b5-opt"><Icon name="inbox" size={24} /><b>Use your own file</b><span>Any sheet, scan or photo. It goes to the review inbox and someone reads it for you. Slower, but nothing is lost.</span><div><Button variant="outline" size="sm" icon="upload">Send to review inbox</Button></div></div>
      </div>
    </Panel>
    <Panel title="3 · Drop the filled template">
      <div className="sx-drop"><Icon name="upload" size={24} /><b>Drop the file here, or choose it</b><span className="sx-cap">.xlsx or .csv · up to 5 MB · one seva type per file</span></div>
    </Panel>
  </>;
}
const ROWS = [
  ['3', '17 Oct 2026', 'Mayur Vihar', '115', '63', '13', null],
  ['7', '17 Oct 2026', 'Mayur Vihar', '42', <span className="b5-cell-err"><Icon name="circle-x" size={16} />52</span>, '4', ['err', 'Spectacles (52) can’t be more than screened (42).', 'चश्मे (52) जाँचे गए (42) से ज़्यादा नहीं हो सकते।']],
  ['12', '31 Oct 2026', 'Mayur Vihar', '88', '40', '9', ['err', 'Date is in the future.', 'तारीख़ भविष्य की है।']],
  ['15', '18 Oct 2026', 'Mayur Vihar', <span className="b5-cell-warn"><Icon name="triangle-alert" size={16} />640</span>, '210', '31', ['warn', 'Screened is much higher than usual (above 500). Check it’s right.', 'जाँचे गए सामान्य से बहुत ज़्यादा हैं (500 से ऊपर)। जाँच लें।']],
  ['21', '', 'Mayur Vihar', '60', '22', '5', ['err', 'Date is missing.', 'तारीख़ नहीं भरी गई।']],
  ['22', '19 Oct 2026', 'Mayur Vihr', '30', '12', '2', ['err', 'Samithi “Mayur Vihr” not found. Did you mean Mayur Vihar?', 'समिति “Mayur Vihr” नहीं मिली। क्या आपका मतलब मयूर विहार है?']],
];
function UpPreview({ phone }) {
  const cols = [['Row', { w: 56 }], 'Date', 'Samithi', ['Screened', { num: 1 }], ['Spectacles', { num: 1 }], ['Cataract', { num: 1 }], 'Message'];
  return <>
    <div className="sx-file"><span className="sx-file__th"><Icon name="file-spreadsheet" size={20} /></span><div className="sx-col" style={{ gap: 0, flex: 1, minWidth: 0 }}><b style={{ fontWeight: 500 }}>eye-camp-oct-mayurvihar.xlsx</b><span className="sx-cap">Eye camp report v3 · 42 rows</span></div><Button variant="ghost" size="sm">Change file</Button></div>
    <div className="b5-sum"><span className="b5-big">38 OK · 4 need fixing</span><Pill tone="error" icon="circle-x">4 errors</Pill><Pill tone="yellow" icon="triangle-alert">1 warning</Pill></div>
    {phone ? <div className="sx-col" style={{ gap: 8 }}>{ROWS.filter(r => r[6]).map(r => <div key={r[0]} className="pt-lcard" style={{ paddingRight: 16 }}><div className="sx-row" style={{ justifyContent: 'space-between' }}><b style={{ fontWeight: 500 }}>Row {r[0]}</b>{r[6][0] === 'err' ? <Pill tone="error" icon="circle-x">Error</Pill> : <Pill tone="yellow" icon="triangle-alert">Check</Pill>}</div><div className="b5-msg"><span>{r[6][1]}</span><span lang="hi">{r[6][2]}</span></div></div>)}</div>
      : <T dense cols={cols} rows={ROWS.map(r => [r[0], r[1] || <span className="b5-cell-err">Missing</span>, r[2], r[3], r[4], r[5], r[6] ? <div className="b5-msg"><span>{r[6][1]}</span><span lang="hi">{r[6][2]}</span></div> : <span className="sx-cap">OK</span>])} foot={<><Icon name="info" size={16} />Showing rows that need attention, plus one OK row. Messages are in English and Hindi.</>} />}
    <div className="sx-row" style={{ gap: 8, justifyContent: phone ? 'stretch' : 'flex-end' }}>
      <Button variant="outline" icon="download">Download file with problems marked</Button>
      <Button variant="primary" icon="check">Load 38 rows</Button>
    </div>
    <Note>The 4 rows with errors are not loaded. Fix them in the marked file and upload it again — rows already loaded won’t be doubled.</Note>
  </>;
}
function UpResult({ same }) {
  if (same) return <Alert tone="info" title="No changes">This file matches what is already loaded (uploaded 18 Oct, 8:40 PM). Nothing was added or changed.</Alert>;
  return <>
    <Alert tone="success" title="Upload finished">42 rows read from eye-camp-oct-mayurvihar.xlsx.</Alert>
    <div className="b5-res"><div><span>New</span><b className="b5-big">30</b></div><div><span>Updated</span><b className="b5-big">8</b></div><div><span>Rejected</span><b className="b5-big" style={{ color: 'var(--signal-error-text)' }}>4</b></div></div>
    <div className="sx-row" style={{ gap: 8 }}><Button variant="outline" icon="download">Download 4 rejected rows</Button><Button variant="ghost" iconAfter="arrow-right">Go to approvals</Button></div>
  </>;
}
const HIST = [
  ['18 Oct, 8:40 PM', 'eye-camp-oct-mayurvihar.xlsx', 'Eye camp', 'Arjun P.', '30 new · 8 updated · 4 rejected'],
  ['18 Oct, 9:02 PM', 'eye-camp-oct-mayurvihar.xlsx', 'Eye camp', 'Arjun P.', 'No changes'],
  ['12 Oct, 7:15 PM', 'narayan-seva-sep.csv', 'Narayana Seva', 'Kavita R.', '22 new'],
  ['2 Oct, 6:30 PM', 'balvikas-q2.xlsx', 'Bal Vikas class', 'Arjun P.', '48 new · 2 rejected'],
];
const History = () => <Panel title="Upload history" flush><T cols={['When', 'File', 'Seva', 'By', 'Result', '']} rows={HIST.map(h => [<span style={{ whiteSpace: 'nowrap' }}>{h[0]}</span>, h[1], h[2], h[3], h[4] === 'No changes' ? <Pill icon="equal">No changes</Pill> : h[4], <RowMenu items={[{ icon: 'download', label: 'Download original' }, { icon: 'file-x', label: 'Download rejected rows' }, { icon: 'undo-2', label: 'Undo this upload' }]} />])} /></Panel>;

function UploadsDesk({ step = 'choose' }) {
  const c = { choose: 1, preview: 3, done: 4, same: 4 }[step];
  return (
    <PDesk current="uploads">
      <PageHead title="Upload a sheet" sub="For samithis that keep records in Excel. Each row is one event report." />
      <Steps c={c} />
      {step === 'choose' ? <UpChoose /> : step === 'preview' ? <Panel title="4 · Check rows"><UpPreview /></Panel> : <Panel title="Result"><UpResult same={step === 'same'} /></Panel>}
      {step === 'choose' || step === 'done' ? <History /> : null}
    </PDesk>
  );
}
function UploadsPhone({ step = 'choose' }) {
  return <PPhone>{step === 'choose' ? <><PageHead title="Upload a sheet" /><Steps c={1} /><UpChoose phone /></> : <><PageHead title="Check rows" back="Upload" /><UpPreview phone /></>}</PPhone>;
}

/* ---------- B · /admin/forms ---------- */
const FORMS = [
  { n: 'Eye camp report', v: 'v3 · published 2 Oct', f: 18, en: 1, hi: 1, ev: 12, ic: 'eye' },
  { n: 'Medical camp report', v: 'v2 · published 14 Aug', f: 15, en: 1, hi: 1, ev: 8, ic: 'stethoscope' },
  { n: 'Narayana Seva (food)', v: 'v4 · published 9 Sep', f: 9, en: 1, hi: 1, ev: 21, ic: 'utensils' },
  { n: 'Bal Vikas class', v: 'v1 · published 3 Jun', f: 11, en: 1, hi: 1, ev: 34, ic: 'graduation-cap' },
  { n: 'Tree planting', v: 'v2 · draft of v3', f: 10, en: 1, hi: 0, ev: 5, ic: 'sprout', draft: true },
  { n: 'Blood donation camp', v: 'v1 · published 1 Jul', f: 13, en: 1, hi: 1, ev: 3, ic: 'droplets' },
];
function FCard({ f, state }) {
  return (
    <article className="b5-fc">
      <div className="sx-row" style={{ gap: 10, flexWrap: 'nowrap' }}><span className="pt-need__ic sx-t-blue"><Icon name={f.ic} size={20} /></span><span className="b5-fc__t" style={{ flex: 1, minWidth: 0 }}>{f.n}</span>{f.draft ? <Badge tone="sathya">Draft</Badge> : null}</div>
      <dl><dt>Version</dt><dd>{f.v}</dd><dt>Fields</dt><dd>{f.f}</dd><dt>Language</dt><dd><Lang en={!!f.en} hi={!!f.hi} /></dd><dt>Used by</dt><dd>{f.ev} events this year</dd></dl>
      <div className="b5-fc__ft">
        {state ? <Button variant="outline" size="sm" icon="pencil-ruler">Open builder</Button> : <Button variant="outline" size="sm" icon="message-square">Request a change</Button>}
        <Button variant="ghost" size="sm" icon="smartphone">Preview</Button>
        <span style={{ flex: 1 }}></span>
        <RowMenu items={state ? [{ icon: 'copy', label: 'Duplicate' }, { icon: 'history', label: 'Versions' }, { icon: 'file-spreadsheet', label: 'Download Excel template' }] : [{ icon: 'history', label: 'Versions' }, { icon: 'file-spreadsheet', label: 'Download Excel template' }]} />
      </div>
    </article>
  );
}
function FormsDesk({ state }) {
  return (
    <PDesk current="forms" role={state ? 'a' : 'd'} scope={state ? 'ncr' : 'east'}>
      <PageHead title="Form templates" sub={state ? 'One template per seva type. Every report, sheet and WhatsApp question comes from here.' : 'Templates are set by the state team. Ask for a change if something is missing.'} actions={state ? <><Button variant="outline" icon="inbox">Change requests · 2</Button><Button variant="primary" icon="plus">New template</Button></> : null} />
      {state ? <Panel title="Change requests from districts" flush><T cols={['From', 'Template', 'Asked for', 'Sent', '']} rows={[
        ['East district', 'Eye camp report', 'Add “Referred to partner hospital” yes/no', '16 Oct', <div className="sx-row" style={{ gap: 4, justifyContent: 'flex-end', flexWrap: 'nowrap' }}><Button variant="ghost" size="sm">Decline</Button><Button variant="outline" size="sm" icon="pencil-ruler">Start draft</Button></div>],
        ['Gurugram', 'Narayana Seva (food)', 'Separate count for children', '11 Oct', <div className="sx-row" style={{ gap: 4, justifyContent: 'flex-end', flexWrap: 'nowrap' }}><Button variant="ghost" size="sm">Decline</Button><Button variant="outline" size="sm" icon="pencil-ruler">Start draft</Button></div>]]} /></Panel> : null}
      <div className="b5-fcards">{FORMS.map(f => <FCard key={f.n} f={f} state={state} />)}</div>
    </PDesk>
  );
}
function FormsPhone() {
  return <PPhone><PageHead title="Form templates" sub="Set by the state team." />{FORMS.slice(0, 4).map(f => <FCard key={f.n} f={f} />)}</PPhone>;
}
function RequestChange() {
  return (
    <ModalStage>
      <div className="pt-modal" role="dialog" aria-label="Request a change">
        <div className="pt-modal__cap"></div>
        <div className="pt-modal__bd">
          <h2 className="sx-h3">Request a change to Eye camp report</h2>
          <p className="pt-sub">The state team reviews requests weekly. If they agree, the change comes in the next version — reports already sent stay as they are.</p>
          <Field label="What should change?"><textarea className="b3-ta" defaultValue="Add a yes/no question: “Referred to partner hospital?” We need it for the cataract follow-up."></textarea></Field>
          <Select label="How soon is it needed?" options={['Before the next camp', 'Within a month', 'No rush']} />
        </div>
        <div className="pt-modal__ft"><Button variant="ghost">Cancel</Button><Button variant="primary" icon="send">Send request</Button></div>
      </div>
    </ModalStage>
  );
}

/* ---------- C · Form builder ---------- */
const BF = [
  { id: 'c1', sec: 0, type: 'select', en: 'Samithi', hi: 'समिति', locked: true, required: true },
  { id: 'c2', sec: 0, type: 'date', en: 'Date', hi: 'तारीख़', locked: true, required: true },
  { id: 'c3', sec: 0, type: 'text', en: 'Venue', hi: 'स्थान', locked: true, required: true },
  { id: 'c4', sec: 0, type: 'number', en: 'People served', hi: 'सेवा पाने वाले', locked: true, required: true, kpi: 'people_served' },
  { id: 'c5', sec: 0, type: 'number', en: 'Volunteers (sevadals)', hi: 'सेवादल', locked: true, required: true, kpi: 'volunteers' },
  { id: 'c6', sec: 0, type: 'number', en: 'Volunteer hours', hi: 'सेवा घंटे', locked: true, required: true, kpi: 'volunteer_hours' },
  { id: 'c7', sec: 1, type: 'number', en: 'Screened', hi: 'जाँचे गए', required: true, kpi: 'eye_screened' },
  { id: 'c8', sec: 1, type: 'number', en: 'Spectacles given', hi: 'दिए गए चश्मे', required: true, kpi: 'spectacles_distributed' },
  { id: 'c9', sec: 1, type: 'number', en: 'Cataract found', hi: 'मोतियाबिंद मिले', required: true, kpi: 'cataract_found' },
  { id: 'c10', sec: 1, type: 'number', en: 'Referred for surgery', hi: '', kpi: 'cataract_referred', help: 'Must not be more than cataract found.' },
  { id: 'c11', sec: 1, type: 'yesno', en: 'Referred to partner hospital?', hi: '' },
  { id: 'c12', sec: 2, type: 'repeater', en: 'Follow-up list', hi: '', personal: true },
  { id: 'c13', sec: 2, type: 'file', en: 'Photos (no faces of patients)', hi: 'फ़ोटो (मरीज़ों के चेहरे नहीं)' },
];
const HDRS = ['samithi_code', 'date', 'venue', 'people_served', 'volunteers', 'volunteer_hours', 'screened', 'spectacles_given', 'cataract_found', 'referred_surgery', 'referred_partner'];
function Builder() {
  const [fields, setFields] = React.useState(BF);
  const [selId, setSelId] = React.useState('c10');
  const sel = fields.find(f => f.id === selId);
  const missing = fields.filter(f => !f.hi).length;
  const secs = ['About the camp', 'Eye screening', 'Follow-up'];
  return (
    <PDesk current="forms" role="a" scope="ncr">
      <div className="pt-head">
        <div className="pt-head__t"><a href="#" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-small)', textDecoration: 'none', minHeight: 32 }}><Icon name="arrow-left" size={16} />Form templates</a>
          <h1 className="pt-h1">Eye camp report</h1>
          <div className="sx-row" style={{ gap: 8 }}><Badge tone="sathya">Draft of v4</Badge>{missing ? <Pill tone="yellow" icon="languages">HI: {missing} fields missing</Pill> : <Pill tone="green" icon="languages">EN · HI</Pill>}<span className="sx-cap">v3 stays live until you publish. Saved 2 min ago.</span></div></div>
        <div className="sx-row"><Button variant="ghost" icon="smartphone">Preview</Button><Button variant="outline" icon="flask-conical">Test submission</Button><Button variant="primary" icon="send" disabled title="Every field needs English and Hindi">Publish v4</Button></div>
      </div>
      <div className="b5-bld">
        <div className="sx-col" style={{ gap: 6 }}>
          <span className="sx-nav__grp" style={{ padding: '0 4px 6px' }}>Add a field</span>
          {window.FIELD_TYPES.map(t => <window.PaletteItem key={t.id} type={t} onAdd={() => { const id = 'n' + Date.now(); setFields([...fields, { id, sec: 1, type: t.id, en: t.en + ' field', hi: '' }]); setSelId(id); }} />)}
          <span className="sx-cap" style={{ marginTop: 8 }}>There is no field type for ID numbers.</span>
        </div>
        <div className="b5-canvas" role="listbox" aria-label="Form canvas">
          {secs.map((s, i) => <React.Fragment key={s}><div className="sx-sec-hd" style={i ? { marginTop: 12 } : null}>{s}</div>{fields.filter(f => f.sec === i).map(f => <window.CanvasField key={f.id} field={f} selected={f.id === selId} onSelect={() => setSelId(f.id)} />)}</React.Fragment>)}
          {fields.some(f => f.personal) ? <div className="sx-cf sx-cf--locked"><span style={{ color: 'var(--slate-400)', display: 'inline-flex', justifyContent: 'center' }}><Icon name="lock" size={16} /></span><div className="sx-col" style={{ gap: 4 }}><span className="sx-cf__t">Consent: “The patient agreed to be contacted for follow-up.” *</span><span className="sx-cf__m">Added because this section has personal data · can’t be removed</span></div></div> : null}
        </div>
        {sel ? <window.SettingsPanel key={sel.id} field={sel} onChange={nf => setFields(fields.map(f => f.id === nf.id ? nf : f))} /> : null}
      </div>
      <section className="b5-drawer" aria-label="Form outputs">
        <div className="b5-drawer__hd"><Tabs items={['All outputs', 'Excel headers', 'WhatsApp questions', 'Checks']} /><span style={{ flex: 1 }}></span><button className="sx-icbtn" aria-label="Collapse"><Icon name="chevron-down" size={18} /></button></div>
        <div className="b5-drawer__bd">
          <section><span className="sx-lbl">Excel template headers</span><div className="b5-hdrs">{HDRS.map((h, i) => <span key={h} className={i < 6 ? 'is-lock' : ''}>{h}</span>)}</div><span className="sx-cap">Grey = core columns. Follow-up list and photos are not in Excel.</span></section>
          <section><span className="sx-lbl">WhatsApp questions · live</span><div className="b5-miniChat"><window.Bubble dir="in" time="">Q 9 of 12 · How many had cataract?</window.Bubble><window.Bubble dir="out" time="">13</window.Bubble><window.Bubble dir="in" time="">Q 10 · How many were referred for surgery? (13 or fewer)</window.Bubble></div></section>
          <section><span className="sx-lbl">Checks before publish</span><ul className="b5-vsum">
            <li style={{ color: 'var(--signal-success-text)' }}><Icon name="circle-check" size={16} />All 6 core fields present</li>
            <li style={{ color: 'var(--signal-success-text)' }}><Icon name="circle-check" size={16} />Every KPI field mapped once</li>
            <li style={{ color: 'var(--yellow-500)' }}><Icon name="triangle-alert" size={16} />3 fields have no Hindi label</li>
            <li style={{ color: 'var(--signal-success-text)' }}><Icon name="circle-check" size={16} />Personal data has consent and a retention rule</li>
          </ul></section>
        </div>
      </section>
    </PDesk>
  );
}
function BuilderPreview() {
  const Ph = ({ l }) => (
    <div className="sx sx-phone pt-phone" lang={l} style={{ width: 340 }}>
      <window.B3Status />
      <div className="b3-v__hd"><span className="sx-ring" style={{ width: 28, height: 28 }}></span><span className="b3-v__t">{l === 'hi' ? 'नेत्र कैंप रिपोर्ट' : 'Eye camp report'}</span><Pill tone="yellow">{l === 'hi' ? 'पूर्वावलोकन' : 'Preview'}</Pill></div>
      <div className="pt-pbody">
        <div className="sx-sec-hd">{l === 'hi' ? 'आँखों की जाँच' : 'Eye screening'}</div>
        <window.Field label={l === 'hi' ? 'जाँचे गए' : 'Screened'}><window.Step v={115} /></window.Field>
        <window.Field label={l === 'hi' ? 'मोतियाबिंद मिले' : 'Cataract found'}><window.Step v={13} /></window.Field>
        <window.Field label={l === 'hi' ? 'सर्जरी के लिए भेजे गए' : 'Referred for surgery'} help={l === 'hi' ? 'हिंदी लेबल बाक़ी — अंग्रेज़ी दिख रही है' : 'Must not be more than cataract found.'}><window.Step v={14} /></window.Field>
        <window.FieldMessage type="error">{l === 'hi' ? 'मोतियाबिंद मिले (13) से ज़्यादा नहीं हो सकता।' : 'Can’t be more than cataract found (13).'}</window.FieldMessage>
      </div>
    </div>
  );
  return <div className="sx b5-pvph"><Ph l="en" /><Ph l="hi" /></div>;
}
function KpiRemoveDialog() {
  return (
    <ModalStage>
      <div className="pt-modal" role="dialog" aria-label="Remove KPI field">
        <div className="pt-modal__cap"></div>
        <div className="pt-modal__bd">
          <h2 className="sx-h3">Remove “Spectacles given”?</h2>
          <p className="pt-sub">This field feeds the public KPI <Mono>spectacles_distributed</Mono>.</p>
          <ul className="pb-ul" style={{ fontSize: 'var(--text-portal-body)' }}>
            <li><Icon name="chart-column" size={18} /><span>From v4, eye camps stop adding to “Spectacles distributed” on the impact page.</span></li>
            <li><Icon name="history" size={18} /><span>Numbers already reported under v1–v3 stay.</span></li>
            <li><Icon name="file-spreadsheet" size={18} /><span>The column leaves the Excel template. Old files with it still upload; the column is ignored.</span></li>
          </ul>
          <Alert tone="attention" title="Consider mapping another field instead">If spectacles are now counted elsewhere, map that field to the KPI first.</Alert>
        </div>
        <div className="pt-modal__ft"><Button variant="ghost">Keep the field</Button><Button variant="primary" icon="trash-2">Remove from v4</Button></div>
      </div>
    </ModalStage>
  );
}

/* ---------- J · /admin/volunteers ---------- */
const VOL = [
  { d: ['25', 'Oct'], t: 'Medical camp · Shakarpur', need: 6, got: 5, open: true, ppl: [['Ramesh', '+91 98•••••14', '19 Oct'], ['Anita', '+91 99•••••82', '19 Oct'], ['Deepak', '+91 97•••••30', '20 Oct'], ['Pooja', '+91 98•••••67', '20 Oct'], ['Suresh', '+91 93•••••05', '20 Oct']] },
  { d: ['29', 'Oct'], t: 'Tree planting · Patparganj', need: 20, got: 12 },
  { d: ['1', 'Nov'], t: 'Narayana Seva · Laxmi Nagar', need: 10, got: 10 },
  { d: ['7', 'Nov'], t: 'Bal Vikas camp · Laxmi Nagar', need: 8, got: 2 },
];
function VolCard({ v, phone }) {
  const pct = Math.min(100, Math.round(v.got / v.need * 100));
  return (
    <div className="b5-vol">
      <div className="b5-vol__hd" style={phone ? { gridTemplateColumns: '52px minmax(0,1fr) auto' } : null}>
        <span className="sx-dchip"><b>{v.d[0]}</b><span>{v.d[1]}</span></span>
        <div className="sx-col" style={{ gap: 2, minWidth: 0 }}><b style={{ fontWeight: 500 }}>{v.t}</b><span className="sx-cap">{v.got >= v.need ? 'Full — new sign-ups go to a wait list' : `${v.need - v.got} more needed`}</span></div>
        <span className="b5-fill"><b>{v.got} of {v.need}</b><span className="b5-meter"><i style={{ width: pct + '%', background: v.got >= v.need ? 'var(--signal-success)' : undefined }}></i></span></span>
        {phone ? null : <button className="sx-icbtn" aria-expanded={!!v.open} aria-label="Show sign-ups"><Icon name={v.open ? 'chevron-up' : 'chevron-down'} size={18} /></button>}
      </div>
      {v.open ? <div className="b5-vol__bd" style={phone ? { padding: '8px 16px 14px' } : null}>
        {v.ppl.map(p => <div key={p[0]} className="b5-vol__p"><span>{p[0]}</span><span className="sx-cap" style={{ fontVariantNumeric: 'tabular-nums' }}>{p[1]}</span>{phone ? null : <span className="sx-cap">Signed up {p[2]}</span>}</div>)}
        <Note icon="clock">First names and masked numbers only. Deleted on 24 Nov (event + 30 days). No profiles are kept.</Note>
      </div> : null}
    </div>
  );
}
function VolunteersDesk() {
  return (
    <PDesk current="volunteers">
      <PageHead title="Volunteer sign-ups" sub="People who offered to help through the public site or WhatsApp. Coordinators call the centre number to confirm." actions={<><Sel k="Samithi" v="All in East" /><Sel k="When" v="Next 30 days" /></>} />
      <div className="sx-col" style={{ gap: 10 }}>{VOL.map(v => <VolCard key={v.t} v={v} />)}</div>
    </PDesk>
  );
}

Object.assign(window, { UploadsDesk, UploadsPhone, FormsDesk, FormsPhone, RequestChange, Builder, BuilderPreview, KpiRemoveDialog, VolunteersDesk, B5VolCard: VolCard, B5VOL: VOL });
})();
