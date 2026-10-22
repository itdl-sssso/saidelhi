(() => {
const { Icon, Button, Input, Select, Switch } = window.SSSSODelhiNCRDesignSystem_9ec6b9;
const { PDesk, PPhone, PageHead, StatusPill, RowMenu, Field, PickerField, FieldMessage, B3Otp: Otp, B3Ic: Ic, Panel } = window;
const t = window.b3t;

/* ---------- D · /admin/login ---------- */
function LoginCard({ l, step = 'phone' }) {
  return (
    <section className="pt-fsec b3-login"><div className="pt-fsec__bd">
      <span className="pt-eb">{t(l, 'Coordinator portal', 'समन्वयक पोर्टल')}</span>
      {step === 'phone' ? <>
        <h1 className="b3-h">{t(l, 'Sign in with your phone', 'अपने फ़ोन से साइन इन करें')}</h1>
        <p className="pt-sub">{t(l, 'No password. We send a code to the WhatsApp number your district added for you.', 'कोई पासवर्ड नहीं। आपके ज़िले ने जो व्हाट्सऐप नंबर जोड़ा है, उस पर हम कोड भेजते हैं।')}</p>
        <Field label={t(l, 'WhatsApp number', 'व्हाट्सऐप नंबर')} lang={l}><span className="sx-ctl"><span className="sx-cap" style={{ fontSize: 'var(--text-portal-body)' }}>+91</span><input inputMode="tel" defaultValue="98765 43252" aria-label="Phone" /></span></Field>
        <Button variant="primary" icon="message-circle" fullWidth>{t(l, 'Send code on WhatsApp', 'व्हाट्सऐप पर कोड भेजें')}</Button>
        <a href="#" className="b3-help"><Icon name="mail" size={16} />{t(l, 'No WhatsApp? Sign in by email', 'व्हाट्सऐप नहीं? ईमेल से साइन इन करें')}</a>
      </> : step === 'otp' ? <>
        <h1 className="b3-h">{t(l, 'Enter the code', 'कोड डालें')}</h1>
        <div className="b3-neutral"><Icon name="info" size={16} /><span>{t(l, 'If +91 98•••••52 is registered, a 6-digit code is on its way on WhatsApp.', 'अगर +91 98•••••52 पंजीकृत है, तो व्हाट्सऐप पर 6 अंकों का कोड आ रहा है।')}</span></div>
        <Otp v="52" lang={l} />
        <Button variant="primary" fullWidth disabled>{t(l, 'Sign in', 'साइन इन')}</Button>
        <div className="b3-resend"><Icon name="timer" size={16} />{t(l, 'Send again in 0:51', '0:51 में फिर भेजें')}</div>
        <div className="sx-row" style={{ justifyContent: 'space-between' }}><a href="#" className="b3-help">{t(l, 'Change number', 'नंबर बदलें')}</a><a href="#" className="b3-help"><Icon name="mail" size={16} />{t(l, 'Use email instead', 'ईमेल से करें')}</a></div>
      </> : step === 'email' ? <>
        <h1 className="b3-h">{t(l, 'Sign in by email', 'ईमेल से साइन इन')}</h1>
        <p className="pt-sub">{t(l, 'We’ll email a sign-in link to the address your district has on file. It works once, for 15 minutes.', 'हम आपके ज़िले के पास दर्ज पते पर साइन-इन लिंक ईमेल करेंगे। यह एक बार, 15 मिनट तक चलेगा।')}</p>
        <Input label={t(l, 'Email', 'ईमेल')} type="email" defaultValue="coordinator@example.org" />
        <Button variant="primary" icon="send" fullWidth>{t(l, 'Email me a link', 'मुझे लिंक ईमेल करें')}</Button>
        <a href="#" className="b3-help"><Icon name="arrow-left" size={16} />{t(l, 'Back to WhatsApp', 'व्हाट्सऐप पर लौटें')}</a>
      </> : <>
        <Ic tone="blue" icon="mail-check" />
        <h1 className="b3-h">{t(l, 'Check your email', 'अपना ईमेल देखें')}</h1>
        <p className="pt-sub">{t(l, 'If that address is registered, a sign-in link is on its way. You can close this page.', 'अगर यह पता पंजीकृत है, तो साइन-इन लिंक आ रहा है। आप यह पेज बंद कर सकते हैं।')}</p>
      </>}
    </div></section>
  );
}
const LoginPhone = ({ lang, step }) => <window.VShell lang={lang} title={'SSSSO Delhi NCR'}>{l => <><LoginCard l={l} step={step} /><span className="sx-cap" style={{ textAlign: 'center' }}>{t(l, 'Not a coordinator? This page is only for sevadals who manage events.', 'समन्वयक नहीं हैं? यह पेज केवल कार्यक्रम संभालने वाले सेवादलों के लिए है।')}</span></>}</window.VShell>;
const LoginDesk = () => <window.VShell wide>{l => <div className="b3-login-desk"><LoginCard l={l} /></div>}</window.VShell>;

/* ---------- E · /admin/events ---------- */
const EV = [
  { id: 1, d: '17 Oct', t: 'Eye camp', ic: 'stethoscope', type: 'Medical', dist: 'East', s: 'Mayur Vihar', src: 'form', st: 'report_submitted', next: 'Approve report' },
  { id: 2, d: '15 Oct', t: 'Medical camp', ic: 'stethoscope', type: 'Medical', dist: 'East', s: 'Shakarpur', src: 'whatsapp', st: 'awaiting_report', next: '2 days overdue', late: true },
  { id: 3, d: '14 Oct', t: 'Bal Vikas camp', ic: 'graduation-cap', type: 'Bal Vikas', dist: 'South', s: 'Saket', src: 'sheet', st: 'awaiting_report', next: '1 day overdue', late: true },
  { id: 4, d: '16 Oct', t: 'Narayana Seva', ic: 'hand-heart', type: 'Narayana Seva', dist: 'New Delhi', s: 'Connaught Place', src: 'whatsapp', st: 'escalated', next: 'With state team' },
  { id: 5, d: '21 Oct', t: 'Bal Vikas class', ic: 'graduation-cap', type: 'Bal Vikas', dist: 'East', s: 'Laxmi Nagar', src: 'form', st: 'planned', next: 'Form links sent' },
  { id: 6, d: '25 Oct', t: 'Medical camp', ic: 'stethoscope', type: 'Medical', dist: 'East', s: 'Shakarpur', src: 'whatsapp', st: 'awaiting_approval', next: 'Escalates in 1 day' },
  { id: 7, d: '26 Oct', t: 'Nagar Sankirtan', ic: 'music', type: 'Bhajan', dist: 'North', s: 'Rohini', src: 'form', st: 'planned', next: 'Form links sent' },
  { id: 8, d: '29 Oct', t: 'Tree planting', ic: 'sprout', type: 'Environment', dist: 'East', s: 'Patparganj', src: 'form', st: 'draft', next: 'Samithi is drafting' },
  { id: 9, d: '10 Oct', t: 'Bhajan evening', ic: 'music', type: 'Bhajan', dist: 'Gurugram', s: 'Sector 31', src: 'scan', st: 'approved', next: 'Published' },
  { id: 10, d: '8 Oct', t: 'Study circle', ic: 'book-open', type: 'Study circle', dist: 'West', s: 'Janakpuri', src: 'sheet', st: 'postponed', next: 'New date not set' },
];
const TABS = [['All', 128], ['Draft', 6], ['Awaiting approval', 9], ['Planned', 31], ['Awaiting report', 7], ['Report submitted', 5], ['Approved', 64], ['Cancelled or postponed', 4], ['Escalated', 2]];
const Tabs = ({ on = 4 }) => <div className="pt-tabs b3-tabs-scroll">{TABS.map(([n, c], i) => <button key={n} aria-pressed={i === on}>{n}<span className={i === 4 || i === 8 ? 'sx-count' : 'sx-cap'}>{c}</span></button>)}</div>;
const Sel = ({ l, v }) => <button className="pt-sel">{l}: <b>{v}</b><Icon name="chevron-down" size={16} /></button>;
const Next = ({ e }) => <span className={'b3-next-s' + (e.late ? ' b3-late' : '')}>{e.late ? <Icon name="clock" size={16} /> : null}{e.next}</span>;
const menu = () => <RowMenu items={[{ icon: 'eye', label: 'Open event' }, { icon: 'send', label: 'Resend report link' }, { icon: 'external-link', label: 'View public page' }, '-', { icon: 'calendar-clock', label: 'Postpone' }, { icon: 'x-circle', label: 'Cancel event', danger: true }]} />;

function EventsDesk3() {
  const [sel, setSel] = React.useState([2, 3]);
  const cols = [
    { key: 'd', label: 'Date', sortable: true, render: e => <span style={{ whiteSpace: 'nowrap' }}>{e.d}</span> },
    { key: 't', label: 'Event', sortable: true, render: e => <span className="sx-col" style={{ gap: 0 }}><span className="sx-tbl__t">{e.t}</span><span className="sx-tbl__sub" style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}><Icon name={e.ic} size={16} />{e.type}</span></span> },
    { key: 's', label: 'Samithi', render: e => <span className="sx-col" style={{ gap: 0 }}><span>{e.s}</span><span className="sx-tbl__sub">{e.dist}</span></span> },
    { key: 'src', label: 'Source', render: e => <window.SourceBadge src={e.src} /> },
    { key: 'st', label: 'Status', render: e => <StatusPill status={e.st} /> },
    { key: 'next', label: 'Next step', render: e => <Next e={e} /> },
  ];
  return (
    <PDesk current="events" role="a" scope="ncr">
      <PageHead title="Events" sub="Every event in Delhi NCR, from plan to approved report." actions={<><Button variant="outline" icon="download">Export</Button><Button variant="primary" icon="calendar-plus">Plan event</Button></>} />
      <window.DataTable lang="en" columns={cols} rows={EV.filter(e => true)} selectable selected={sel} onSelect={setSel} sort={{ key: 'd', dir: 'desc' }} onSort={() => {}} rowMenu={menu}
        bulkActions={<><Button variant="outline" size="sm" icon="send">Resend report links</Button><Button variant="outline" size="sm" icon="download">Export</Button></>}
        toolbar={<div className="sx-col" style={{ width: '100%', gap: 12 }}><Tabs on={0} /><div className="pt-filters"><Sel l="Date" v="Oct 2026" /><Sel l="Type" v="All" /><Sel l="District" v="All 9" /><Sel l="Samithi" v="All" /><Sel l="Source" v="All" /><span style={{ flex: 1 }}></span><label className="sx-search" style={{ maxWidth: 240, margin: 0 }}><Icon name="search" size={18} /><input placeholder="Search events" /></label></div></div>}
        footer={<window.Pagination page={1} pages={13} total={128} perPage={10} onPage={() => {}} />} />
    </PDesk>
  );
}

function EventsPhone3() {
  return (
    <PPhone tab="events" role="a" scope="ncr">
      <PageHead title="Events" sub="Delhi NCR · October 2026" actions={<Button variant="primary" size="sm" icon="calendar-plus">Plan</Button>} />
      <Tabs on={4} />
      <div className="pt-filters"><Sel l="District" v="All" /><Sel l="Type" v="All" /><button className="pt-sel" aria-label="More filters"><Icon name="sliders-horizontal" size={16} />3 more</button></div>
      <div className="sx-bulk" role="status" style={{ borderRadius: 'var(--radius-lg)' }}><span>2 selected</span><span style={{ flex: 1 }}></span><Button variant="outline" size="sm" icon="send">Resend</Button></div>
      {EV.filter(e => e.st === 'awaiting_report').concat(EV.slice(0, 1)).map((e, k) => (
        <div className="sx-ecard" key={e.id} style={k < 2 ? { borderColor: 'var(--blue-300)', background: 'var(--blue-50)' } : null}>
          <span className="sx-dchip"><b>{e.d.split(' ')[0]}</b><span>{e.d.split(' ')[1]}</span></span>
          <div className="sx-col" style={{ gap: 4, alignItems: 'flex-start', minWidth: 0 }}>
            <span className="sx-tbl__t" style={{ fontSize: 'var(--text-portal-body)' }}>{e.t}</span>
            <span className="sx-cap">{e.s} · {e.dist}</span>
            <span className="sx-row" style={{ gap: 6 }}><StatusPill status={e.st} /><window.SourceBadge src={e.src} /></span>
            <Next e={e} />
          </div>
          {menu()}
        </div>
      ))}
      <span className="sx-cap" style={{ textAlign: 'center' }}>Long-press a card to select</span>
    </PPhone>
  );
}

/* ---------- F · /admin/events/new ---------- */
const Ta = ({ v, lang, ph }) => <textarea className="b3-ta" lang={lang} rows={4} defaultValue={v} placeholder={ph}></textarea>;
function PlanForm({ phone }) {
  return <>
    <Panel title="What and when">
      <Field label="Seva type"><PickerField icon="stethoscope" value="Medical · Eye camp" /></Field>
      <Field label="Title" help="Suggested from type and samithi. You can change it."><span className="sx-ctl"><input defaultValue="Eye camp, Mayur Vihar" aria-label="Title" /><span className="sx-pill sx-t-blue" style={{ padding: '1px 8px' }}><Icon name="sparkles" size={16} />Suggested</span></span></Field>
      <div className="pt-grid" style={{ gridTemplateColumns: phone ? '1fr' : '1.3fr 1fr 1fr' }}>
        <Field label="Date"><PickerField icon="calendar-days" value="Sat 14 Nov 2026" /></Field>
        <div className="pt-grid" style={{ gridTemplateColumns: '1fr 1fr', gridColumn: phone ? 'auto' : 'span 2' }}>
          <Field label="Starts"><PickerField icon="clock" value="9:00 AM" /></Field>
          <Field label="Ends"><PickerField icon="clock" value="2:00 PM" /></Field>
        </div>
      </div>
    </Panel>
    <Panel title="Where and who">
      <Field label="Samithi" help="Only samithis in your scope are listed."><PickerField icon="home" value="Samithi Mayur Vihar · East district" /></Field>
      <Field label="Venue"><span className="sx-ctl"><span className="sx-ctl__ic"><Icon name="map-pin" size={18} /></span><input defaultValue="Dr. Ambedkar Bhawan, Mayur Vihar Ph-1" aria-label="Venue" /></span></Field>
      <button className="b3-pin"><Icon name="map-pinned" size={18} /><span><b>Drop a pin</b><span className="sx-cap">Optional · helps people find the gate</span></span></button>
      <Field label="Partner" optional><PickerField icon="handshake" value="ICARE Eye Hospital" /></Field>
      <div className="pt-grid" style={{ gridTemplateColumns: phone ? '1fr' : '200px 1fr', alignItems: 'start' }}>
        <Field label="Sevadals needed"><window.Step v={20} label="sevadals needed" /></Field>
        <Field label="What to bring" optional><span className="sx-ctl"><input defaultValue="Water bottle, comfortable shoes" aria-label="What to bring" /></span></Field>
      </div>
    </Panel>
    <Panel title="Description" action={<span className="sx-cap">Shown on the public event page</span>}>
      <Field label="English"><Ta v="Free eye check-up for everyone. Spectacles given on the spot where needed; cataract cases are referred to ICARE Eye Hospital at no cost." /></Field>
      <Field label="हिंदी" badge={<span className="sx-pill sx-t-yellow" style={{ padding: '1px 8px', marginLeft: 8 }}><Icon name="languages" size={16} />Draft translation — check before submitting</span>}><Ta lang="hi" v="सबके लिए निःशुल्क आँखों की जाँच। ज़रूरत होने पर मौके पर चश्मे दिए जाएँगे; मोतियाबिंद के मरीज़ों को आईकेयर नेत्र अस्पताल में निःशुल्क रेफ़र किया जाएगा।" /></Field>
      <div><Button variant="outline" size="sm" icon="languages">Translate from English again</Button></div>
    </Panel>
    <Panel>
      <Switch label="Show on the public calendar" defaultOn />
      <span className="sx-cap" style={{ marginTop: -8 }}>Appears only after the district approves the plan. Contact shown: the centre number, 011-4000 0000.</span>
    </Panel>
  </>;
}
function Preview() {
  return (
    <div className="b3-prev">
      <span className="pt-eb">Live preview · public calendar</span>
      <div className="b3-prev__c">
        <div className="sx-row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}><span className="sx-dchip"><b>14</b><span>Nov</span></span><span className="hv-ev__ic" style={{ width: 40, height: 40, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'var(--surface-calm)', border: '1px solid var(--border-calm)', color: 'var(--blue-600)' }}><Icon name="stethoscope" size={20} /></span></div>
        <h4 className="b3-prev__t">Eye camp, Mayur Vihar</h4>
        <p className="sx-cap" style={{ margin: 0 }}>Free eye check-up for everyone. Spectacles given on the spot where needed…</p>
        <div className="pt-meta" style={{ flexDirection: 'column', gap: 4 }}><span><Icon name="clock" size={16} />Sat 14 Nov · 9:00 AM – 2:00 PM</span><span><Icon name="map-pin" size={16} />Dr. Ambedkar Bhawan, Mayur Vihar Ph-1</span><span><Icon name="handshake" size={16} />With ICARE Eye Hospital</span><span><Icon name="phone" size={16} />Centre: 011-4000 0000</span></div>
        <span className="hv-vol" style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px 4px 10px', borderRadius: 999, background: 'var(--pink-50)', border: '1px solid var(--pink-200)', color: 'var(--pink-700)', fontSize: 'var(--text-caption)', fontWeight: 500 }}><Icon name="hand-heart" size={16} />20 sevadals needed</span>
      </div>
      <div className="sx-row" style={{ gap: 6 }}><window.LangToggle value="en" /><span className="sx-cap">Preview language</span></div>
    </div>
  );
}
function PlanDesk() {
  return (
    <PDesk current="events" role="s" scope="mv">
      <PageHead back="Events" title="Plan an event" sub="Your district coordinator approves the plan before it goes public or form links are sent." />
      <div className="pt-grid pt-g-main">
        <div className="sx-col" style={{ gap: 16 }}><PlanForm />
          <div className="pt-actbar" style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}><span className="pt-save"><Icon name="check" size={16} />Draft saved 9:41 AM</span><span style={{ flex: 1 }}></span><Button variant="outline">Save draft</Button><Button variant="primary" icon="send">Submit for district approval</Button></div>
        </div>
        <div style={{ position: 'sticky', top: 16 }}><Preview /></div>
      </div>
    </PDesk>
  );
}
function PlanPhone() {
  return (
    <PPhone role="s" scope="mv">
      <PageHead back="Events" title="Plan an event" />
      <PlanForm phone />
      <details className="b3-prev-d" open><summary><Icon name="eye" size={18} />Preview public card<Icon name="chevron-down" size={16} /></summary><Preview /></details>
      <div className="pt-fbar" style={{ margin: '0 -16px -16px', flexDirection: 'column' }}><Button variant="primary" icon="send" fullWidth>Submit for district approval</Button><Button variant="ghost" fullWidth>Save draft</Button></div>
    </PPhone>
  );
}

Object.assign(window, { LoginPhone, LoginDesk, EventsDesk3, EventsPhone3, PlanDesk, PlanPhone });
})();
