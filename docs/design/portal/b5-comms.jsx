(() => {
const { Icon, Button, Input, Select, Checkbox, Alert, Switch } = window.SSSSODelhiNCRDesignSystem_9ec6b9;
const { PDesk, PPhone, PageHead, Panel, Field, PickerField, RowMenu, B5T: T, B5Tabs: Tabs, B5Pill: Pill, B5Lang: Lang, B5Sel: Sel, B5Note: Note, B5Mono: Mono, B5Tog: Tog } = window;
const WTABS = ['Templates', 'Reminder rules', 'Broadcasts', 'Conversation log', 'Number status'];
const META = { ok: ['green', 'badge-check', 'Approved'], pend: ['yellow', 'hourglass', 'In review'], rej: ['error', 'circle-x', 'Rejected'] };
const MetaPill = ({ s }) => <Pill tone={META[s][0]} icon={META[s][1]}>{META[s][2]}</Pill>;
const WHead = ({ tab, actions }) => <><PageHead title="WhatsApp" sub="One business number for the whole of Delhi NCR. Business-initiated messages use templates approved by Meta." actions={actions} /><Tabs items={WTABS} on={tab} /></>;

function WaTemplates() {
  const rows = [['otp_login', 'Sign-in code', 'Authentication', 1, 1, 'ok'], ['report_link', 'Form link for a report', 'Utility', 1, 1, 'ok'], ['report_reminder', 'Report reminder (day +3)', 'Utility', 1, 1, 'ok'], ['plan_approved', 'Plan approved', 'Utility', 1, 1, 'ok'], ['invite_portal', 'Portal invite', 'Utility', 1, 1, 'pend'], ['event_week', 'This week near you', 'Marketing', 1, 0, 'rej']];
  return (
    <PDesk current="whatsapp" role="a" scope="ncr">
      <WHead tab={0} actions={<Button variant="primary" icon="plus">New template</Button>} />
      <div className="pt-grid pt-g-main">
        <T cols={['Name', 'Purpose', 'Category', 'Language', 'Meta status', '']} rows={rows.map(r => [<Mono>{r[0]}</Mono>, r[1], r[2], <Lang en={!!r[3]} hi={!!r[4]} />, <MetaPill s={r[5]} />, <RowMenu items={[{ icon: 'pencil', label: 'Edit and resubmit' }, { icon: 'copy', label: 'Duplicate' }]} />])} />
        <Panel title="report_reminder" badge={<MetaPill s="ok" />}>
          <div className="b5-miniChat"><span className="sx-tmpl" style={{ alignSelf: 'flex-start' }}><Icon name="badge-check" size={16} />Meta template</span><window.Bubble dir="in" time="6:00 PM">Sai Ram {'{{1}}'}. The report for {'{{2}}'} on {'{{3}}'} is still open. It takes about 3 minutes. Tap to fill it in.</window.Bubble><window.QuickReplies options={['Fill in report', 'Report by chat', 'Not done yet']} /></div>
          <Alert tone="attention" title="event_week was rejected">Meta said: “Promotional content in a utility template.” Move it to Marketing; it can then only go to people who opted in.</Alert>
        </Panel>
      </div>
    </PDesk>
  );
}
function WaRules() {
  const R = [['Report link', 'Event day, 2 hours after end', 'Samithi coordinator', true], ['Report reminder', 'Event + 3 days, if no report', 'Samithi coordinator', true], ['Final nudge', 'Event + 7 days, if no report', 'Samithi + district coordinator', true], ['Approval waiting', 'Plan or report waiting 2 days', 'District coordinator', true], ['Escalation', 'Waiting 3 days', 'State admin', true], ['Volunteer reminder', 'Day before the event', 'Volunteers who signed up', false], ['Follow-up call due', 'Referral + 7 days', 'PII officer', true]];
  return (
    <PDesk current="whatsapp" role="a" scope="ncr">
      <WHead tab={1} />
      <Panel title="Reminder rules" flush><T cols={['Message', 'When', 'Sent to', ['On', { w: 80 }]]} rows={R.map(r => [<span className="sx-tbl__t">{r[0]}</span>, r[1], r[2], <Switch label="" aria-label={r[0]} defaultOn={r[3]} />])} foot={<><Icon name="moon" size={16} />Nothing is sent between 9 PM and 7 AM. Messages wait until morning.</>} /></Panel>
    </PDesk>
  );
}
function WaBroadcast() {
  return (
    <PDesk current="whatsapp" role="a" scope="ncr">
      <WHead tab={2} actions={<Button variant="outline" icon="history">Past broadcasts</Button>} />
      <div className="pt-grid pt-g-main">
        <Panel title="New broadcast">
          <Select label="Template" options={['event_week · This week near you (Marketing)', 'announcement · General announcement']} />
          <div className="pt-grid pt-g2"><Field label="Who"><PickerField icon="users" value="Opted in · East district" /></Field><Field label="Send on"><PickerField icon="calendar-clock" value="Fri 23 Oct, 10:00 AM" /></Field></div>
          <Note icon="shield-check">Only people who chose to get updates. They can reply STOP at any time.</Note>
          <div className="b5-cost"><Icon name="indian-rupee" size={20} /><div className="sx-col" style={{ gap: 2, flex: 1 }}><b className="b5-big" style={{ fontSize: 20 }}>About 240 messages · about ₹190</b><span>Marketing rate ~₹0.78 each. 12 people opted out this month and are not included.</span></div></div>
          <div className="sx-row" style={{ justifyContent: 'flex-end', gap: 8 }}><Button variant="ghost">Save draft</Button><Button variant="primary" icon="send">Schedule 240 messages</Button></div>
        </Panel>
        <Panel title="Preview">
          <div className="b5-miniChat"><span className="sx-tmpl" style={{ alignSelf: 'flex-start' }}><Icon name="badge-check" size={16} />Meta template</span><window.Bubble dir="in" time="10:00 AM">Sai Ram. This week in East district: Medical camp in Shakarpur on Sunday 9 AM, tree planting in Patparganj on Thursday 7:30 AM. All free, everyone welcome.</window.Bubble><window.QuickReplies options={['Join a seva', 'Stop updates']} /></div>
        </Panel>
      </div>
    </PDesk>
  );
}
function WaLog() {
  const L = [['Today 9:14 AM', '+91 98•••••52', 'Coordinator', 'Report by chat', 'Completed'], ['Today 8:50 AM', '+91 99•••••07', 'Coordinator', 'Plan activity', 'Completed'], ['Yesterday 7:32 PM', '+91 97•••••41', 'Public', 'What’s on near me', 'Completed'], ['Yesterday 6:10 PM', '+91 96•••••23', 'Public', 'Asked for a person', 'Handed to human'], ['19 Oct 4:02 PM', '+91 95•••••88', 'Public', 'STOP', 'Opted out']];
  return (
    <PDesk current="whatsapp" role="a" scope="ncr">
      <WHead tab={3} />
      <T tools={<div className="pt-filters" style={{ width: '100%' }}><Sel k="Who" v="All" /><Sel k="Flow" v="All" /><Sel k="Outcome" v="All" /><span style={{ flex: 1 }}></span><Note icon="lock">Numbers are masked. Message text is kept 30 days.</Note></div>}
        cols={['When', 'Number', 'Who', 'Flow', 'Outcome', '']} rows={L.map(r => [<span style={{ whiteSpace: 'nowrap' }}>{r[0]}</span>, <span style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{r[1]}</span>, r[2], r[3], r[4] === 'Handed to human' ? <Pill tone="pink" icon="user">Handed to human</Pill> : r[4] === 'Opted out' ? <Pill icon="bell-off">Opted out</Pill> : <Pill tone="green" icon="circle-check">Completed</Pill>, <Button variant="ghost" size="sm">Open</Button>])} />
    </PDesk>
  );
}
function WaNumber() {
  return (
    <PDesk current="whatsapp" role="a" scope="ncr">
      <WHead tab={4} />
      <div className="pt-grid pt-g2" style={{ alignItems: 'start' }}>
        <Panel title="+91 11 4•••• ••21" badge={<Pill tone="green" icon="circle-check">Connected</Pill>}>
          <div className="b5-fc" style={{ border: 0, boxShadow: 'none', padding: 0 }}><dl><dt>Display name</dt><dd>SSSSO Delhi NCR · verified</dd><dt>Quality</dt><dd>High</dd><dt>Daily limit</dt><dd>1,000 business-initiated chats</dd><dt>Coexistence</dt><dd>On — the WhatsApp Business app on the office phone still works, and its chats show here</dd></dl></div>
        </Panel>
        <Panel title="October so far">
          <div className="sx-col" style={{ gap: 6 }}><div className="sx-row" style={{ justifyContent: 'space-between' }}><span>1,842 of ~2,500 expected</span><b className="b5-big" style={{ fontSize: 20 }}>₹1,120</b></div><span className="b5-meter"><i style={{ width: '74%' }}></i></span></div>
          <T dense cols={['Category', ['Messages', { num: 1 }], ['Cost', { num: 1 }]]} rows={[['Authentication (sign-in codes)', 410, '₹45'], ['Utility (links, reminders)', 1192, '₹155'], ['Marketing (broadcasts)', 240, '₹190'], ['Service (replies within 24 h)', '3,906', 'Free']]} />
          <Note>Estimates from Meta’s India rates. The invoice from the provider is the final figure.</Note>
        </Panel>
      </div>
    </PDesk>
  );
}

/* ---------- K · /admin/reports ---------- */
function ReportsDesk() {
  return (
    <PDesk current="reports" role="a" scope="ncr">
      <PageHead title="Reports and exports" sub="Every export is logged with who, when and why. Personal data is never exported." />
      <div className="pt-grid pt-g2" style={{ alignItems: 'start' }}>
        <Panel title="Monthly state report">
          <div className="sx-file"><span className="sx-file__th"><Icon name="file-text" size={20} /></span><div className="sx-col" style={{ gap: 0, flex: 1 }}><b style={{ fontWeight: 500 }}>September 2026 · Delhi NCR</b><span className="sx-cap">PDF · 14 pages · made 7 Oct, 6:00 AM</span></div><Button variant="outline" size="sm" icon="download">PDF</Button></div>
          <Tog label="Make it automatically on the 7th" desc="Covers approved reports only. Late ones go into next month’s." on />
          <Field label="Email it to"><div className="sx-row" style={{ gap: 6 }}>{['State president', 'State seva coordinator', '9 district presidents'].map(x => <span key={x} className="sx-chip sx-chip--rm">{x}<button aria-label={'Remove ' + x}><Icon name="x" size={16} /></button></span>)}<Button variant="ghost" size="sm" icon="plus">Add</Button></div></Field>
        </Panel>
        <Panel title="Custom export">
          <div className="pt-grid pt-g2"><Select label="What" options={['Event reports (numbers)', 'Events list', 'KPI totals by district']} /><Field label="Period"><PickerField icon="calendar-days" value="1 Apr – 30 Sep 2026" /></Field></div>
          <Field label="Districts"><PickerField icon="map" value="All 9 districts" /></Field>
          <Field label="Why do you need it?" help="Required. Saved in the audit log."><textarea className="b3-ta" style={{ minHeight: 72 }} defaultValue="Half-year numbers for the national office."></textarea></Field>
          <Note icon="lock">Names, phone numbers and follow-up lists are never included, whatever you choose.</Note>
          <div className="sx-row" style={{ justifyContent: 'flex-end' }}><Button variant="primary" icon="download">Export CSV</Button></div>
        </Panel>
      </div>
      <Panel title="Scheduled" flush><T cols={['Report', 'Schedule', 'Sent to', 'Last sent', '']} rows={[['Monthly state report', '7th of each month', '11 people', '7 Oct 2026', <RowMenu items={[{ icon: 'pencil', label: 'Edit' }, { icon: 'pause', label: 'Pause' }]} />], ['District summary · East', 'Every Monday', 'Meera S.', '19 Oct 2026', <RowMenu items={[{ icon: 'pencil', label: 'Edit' }, { icon: 'pause', label: 'Pause' }]} />]]} /></Panel>
    </PDesk>
  );
}

/* ---------- L · /admin/health ---------- */
const SAM = ['Mayur Vihar', 'Laxmi Nagar', 'Patparganj', 'Shakarpur', 'Preet Vihar', 'Mayur Vihar Ph-2', 'Trilokpuri'];
const MON = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
const HV = [[100, 100, 90, 100, 100, 80], [100, 80, 100, 75, 100, 60], [67, 100, 100, 100, 50, 50], [100, 100, 50, 67, 33, 0], [50, 0, 50, 100, 50, 25], [null, 100, 100, 50, 100, 100], [0, 0, null, 0, null, null]];
const hc = v => v == null ? 'b5-h0' : v < 50 ? 'b5-h1' : v < 75 ? 'b5-h2' : v < 100 ? 'b5-h3' : 'b5-h4';
function Heat({ phone }) {
  const m = phone ? MON.slice(3) : MON;
  return <div className="b5-heat" style={{ gridTemplateColumns: `${phone ? 110 : 150}px repeat(${m.length},minmax(0,1fr))` }}>
    <span></span>{m.map(x => <span key={x} className="b5-heat__h">{x}</span>)}
    {SAM.map((s, i) => <React.Fragment key={s}><a href="#" className="b5-heat__n">{s}</a>{(phone ? HV[i].slice(3) : HV[i]).map((v, j) => <span key={j} className={'b5-heat__c ' + hc(v)} title={v == null ? 'No events' : v + '% reported'}>{v == null ? '—' : v + '%'}</span>)}</React.Fragment>)}
  </div>;
}
const Legend = () => <div className="b5-legend"><span><i className="b5-h1"></i>Under 50%</span><span><i className="b5-h2"></i>50–74%</span><span><i className="b5-h3"></i>75–99%</span><span><i className="b5-h4"></i>All reported</span><span><i className="b5-h0"></i>No events</span></div>;
const Bar = ({ l, v, max, tone }) => <div className="b5-bar"><span>{l}</span><span className="b5-meter"><i style={{ width: (v / max * 100) + '%', background: tone }}></i></span><span>{v}</span></div>;
function HealthDesk() {
  return (
    <PDesk current="health">
      <PageHead title="Data health" sub="Where reports are late or stuck. Click any row to go and fix it." actions={<Sel k="Period" v="May – Oct 2026" />} />
      <div className="pt-grid pt-g4">
        <window.KpiTile compact label="Reports in on time" value="78%" delta="+6 pts" icon="clock" period="Oct" />
        <window.KpiTile compact label="Event to report" value="2.4 days" delta="−0.8" icon="timer" period="Median, Oct" />
        <window.KpiTile compact label="Waiting for approval" value="6" icon="hourglass" period="Oldest 3 days" />
        <window.KpiTile compact label="Share from estimates" value="4%" icon="hash" period="Of all-time totals" />
      </div>
      <div className="pt-grid" style={{ gridTemplateColumns: 'minmax(0,1.5fr) minmax(0,1fr)', alignItems: 'start' }}>
        <Panel title="Reporting rate · East district" action={<Legend />}><Heat /><Note>Share of finished events with a report sent within 7 days. Trilokpuri is inactive from 31 Oct.</Note></Panel>
        <div className="sx-col" style={{ gap: 16 }}>
          <Panel title="Waiting for approval" flush><T dense cols={['District', ['Waiting', { num: 1 }], 'Oldest', '']} rows={[['East', 3, <span className="b5-wait is-late">3 days</span>, <Button variant="ghost" size="sm" iconAfter="arrow-right">Open</Button>], ['South', 2, <span className="b5-wait">1 day</span>, <Button variant="ghost" size="sm" iconAfter="arrow-right">Open</Button>], ['Gurugram', 1, <span className="b5-wait">Today</span>, <Button variant="ghost" size="sm" iconAfter="arrow-right">Open</Button>]]} /></Panel>
          <Panel title="Upload rejects by reason"><div className="b5-bars"><Bar l="Number too high" v={14} max={14} /><Bar l="Date missing" v={9} max={14} /><Bar l="Unknown samithi" v={6} max={14} /><Bar l="Wrong template" v={3} max={14} /></div></Panel>
        </div>
      </div>
      <div className="pt-grid pt-g2" style={{ alignItems: 'start' }}>
        <Panel title="How reports arrive"><div className="b5-stack" aria-label="Channel mix"><i style={{ width: '46%', background: 'var(--blue-500)' }}></i><i style={{ width: '28%', background: 'var(--blue-300)' }}></i><i style={{ width: '16%', background: 'var(--pink-300)' }}></i><i style={{ width: '10%', background: 'var(--yellow-300)' }}></i></div><div className="b5-legend"><span><i style={{ background: 'var(--blue-500)' }}></i>Form link 46%</span><span><i style={{ background: 'var(--blue-300)' }}></i>WhatsApp chat 28%</span><span><i style={{ background: 'var(--pink-300)' }}></i>Upload 16%</span><span><i style={{ background: 'var(--yellow-300)' }}></i>Scan / inbox 10%</span></div></Panel>
        <Panel title="Event to report, days" flush><T dense cols={['Samithi', ['Median', { num: 1 }], ['Slowest', { num: 1 }], '']} rows={[['Preet Vihar', '6.5', '12', <Button variant="ghost" size="sm" iconAfter="arrow-right">Fix</Button>], ['Shakarpur', '4.0', '9', <Button variant="ghost" size="sm" iconAfter="arrow-right">Fix</Button>], ['Mayur Vihar', '1.0', '3', <Button variant="ghost" size="sm" iconAfter="arrow-right">Open</Button>]]} /></Panel>
      </div>
    </PDesk>
  );
}
function HealthPhone() {
  return (
    <PPhone>
      <PageHead title="Data health" sub="East district · last 3 months" />
      <div className="b5-tiles"><window.KpiTile compact label="On time" value="78%" icon="clock" period="Oct" /><window.KpiTile compact label="Waiting" value="6" icon="hourglass" period="Oldest 3 days" /></div>
      <Panel title="Reporting rate"><Heat phone /><Legend /></Panel>
      <Panel title="Upload rejects"><div className="b5-bars"><Bar l="Too high" v={14} max={14} /><Bar l="No date" v={9} max={14} /><Bar l="No samithi" v={6} max={14} /></div></Panel>
    </PPhone>
  );
}

Object.assign(window, { WaTemplates, WaRules, WaBroadcast, WaLog, WaNumber, ReportsDesk, HealthDesk, HealthPhone });
})();
