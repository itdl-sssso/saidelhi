(() => {
const { Icon, Button, Input, Select, Alert, Switch } = window.SSSSODelhiNCRDesignSystem_9ec6b9;
const { PDesk, PageHead, Panel, Field, PickerField, RowMenu, ModalStage, B5T: T, B5Tabs: Tabs, B5Pill: Pill, B5Lang: Lang, B5Sel: Sel, B5Note: Note, B5Mono: Mono, B5Tog: Tog, B5Restricted: Restricted } = window;

/* ---------- M · /admin/follow-up ---------- */
const FU = [
  ['Ramvati D.', 64, 'F', 'Trilokpuri', '+91 98•••••14', 'Eye camp · Mayur Vihar', '17 Oct', 'referred', 3, '+91 98113 42214'],
  ['Mohd. Salim', 58, 'M', 'Khichripur', '+91 99•••••82', 'Eye camp · Mayur Vihar', '17 Oct', 'scheduled', 3],
  ['Kamla Devi', 71, 'F', 'Mayur Vihar Ph-1', '+91 97•••••30', 'Eye camp · Mayur Vihar', '17 Oct', 'unreachable', 3],
  ['Harish K.', 66, 'M', 'Kalyanpuri', '+91 93•••••05', 'Eye camp · Laxmi Nagar', '26 Sep', 'scheduled', 24],
  ['Shanti B.', 69, 'F', 'Pandav Nagar', '+91 98•••••67', 'Eye camp · Laxmi Nagar', '26 Sep', 'done', 24],
  ['Gopal S.', 74, 'M', 'Shakarpur', '+91 96•••••41', 'Medical camp · Shakarpur', '5 Sep', 'declined', 45],
];
const FST = { referred: ['blue', 'send', 'Referred'], scheduled: ['yellow', 'calendar-check', 'Scheduled'], done: ['green', 'circle-check', 'Done'], declined: ['slate', 'circle-off', 'Declined'], unreachable: ['pink', 'phone-off', 'Unreachable'] };
function FollowUpDesk() {
  return (
    <PDesk current="followup" role="p" scope="ncr">
      <PageHead title="Cataract follow-up" sub="People referred for surgery at camps. Call each one until they are seen or decline." actions={<Sel k="Status" v="Open" />} />
      <Restricted>You are signed in as PII officer. Revealing a phone number, adding a note and logging a call are all recorded. This list cannot be exported.</Restricted>
      <T tools={<div className="pt-filters" style={{ width: '100%' }}><label className="sx-search" style={{ margin: 0, maxWidth: 240 }}><Icon name="search" size={18} /><input placeholder="Find by name or locality" /></label><Sel k="Camp" v="All" /><Sel k="Waiting" v="Any" /></div>}
        cols={['Name', ['Age', { num: 1 }], 'Gender', 'Locality', 'Phone', 'Camp', 'Referred', 'Status', ['Waiting', { num: 1 }], 'Consent', '']}
        rows={FU.map((r, i) => [<span className="sx-tbl__t">{r[0]}</span>, r[1], r[2], r[3], i === 0 ? <span className="sx-row" style={{ gap: 4, flexWrap: 'nowrap' }}><span style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{r[9]}</span><Pill icon="eye">Logged</Pill></span> : <button className="b5-reveal"><Icon name="eye" size={16} />{r[4]}</button>, r[5], <span style={{ whiteSpace: 'nowrap' }}>{r[6]}</span>, <Pill tone={FST[r[7]][0]} icon={FST[r[7]][1]}>{FST[r[7]][2]}</Pill>, <span className={'b5-wait' + (r[8] > 14 && r[7] !== 'done' && r[7] !== 'declined' ? ' is-late' : '')}>{r[8]} days</span>, <span style={{ color: 'var(--signal-success-text)', display: 'inline-flex' }} aria-label="Consent given"><Icon name="circle-check" size={18} /></span>, <RowMenu items={[{ icon: 'phone', label: 'Log a call' }, { icon: 'refresh-cw', label: 'Update status' }, { icon: 'sticky-note', label: 'Add a note' }]} />])}
        foot={<><Icon name="clock" size={16} />Kept for 1 year after the last contact, then deleted automatically. No export button exists for this list.</>} />
      <div className="pt-grid pt-g2" style={{ alignItems: 'start' }}>
        <Panel title="Ramvati D. · update">
          <div className="pt-grid pt-g2"><Select label="Status" options={['Referred', 'Scheduled', 'Done', 'Declined', 'Unreachable']} defaultValue="Scheduled" /><Field label="Surgery date" optional><PickerField icon="calendar-days" value="28 Oct 2026" /></Field></div>
          <Field label="Note"><textarea className="b3-ta" style={{ minHeight: 72 }} defaultValue="Spoke to her son. Hospital visit fixed for 28 Oct; centre will arrange a ride."></textarea></Field>
          <div className="sx-row" style={{ justifyContent: 'flex-end', gap: 8 }}><Button variant="outline" icon="phone">Log a call</Button><Button variant="primary">Save</Button></div>
        </Panel>
        <Panel title="History">
          <ul className="pt-log" style={{ margin: 0, padding: 0 }}>
            <li><time>Today 10:12</time><span>Phone revealed by Vikram T. (PII officer)</span></li>
            <li><time>Today 10:14</time><span>Call logged · answered · 3 min</span></li>
            <li><time>17 Oct</time><span>Referred to ICARE Eye Hospital at the Mayur Vihar camp. Consent recorded.</span></li>
          </ul>
        </Panel>
      </div>
    </PDesk>
  );
}

/* ---------- N · /admin/privacy ---------- */
const PH = ({ tab, actions }) => <><PageHead title="Privacy" sub="Requests from the public, consent, retention and breaches. Follows the DPDP Act 2023." actions={actions} /><Tabs items={[['Requests', 3], 'Consent records', 'Retention jobs', 'Breach log']} on={tab} /></>;
function PrivacyRequests() {
  const R = [['PR-0142', 'Sunita M.', 'Delete my data', '12 Oct', 23, 'open'], ['PR-0141', 'Rakesh J.', 'What do you hold about me?', '8 Oct', 19, 'found'], ['PR-0139', 'A. Khan', 'Correct my phone number', '2 Oct', 13, 'open'], ['PR-0133', 'Neha V.', 'Delete my data', '14 Sep', 0, 'closed']];
  return (
    <PDesk current="privacy" role="p" scope="ncr">
      <PH tab={0} />
      <Restricted>Request details include personal data. Opening a request is recorded.</Restricted>
      <div className="pt-grid pt-g-main">
        <T cols={['Ref', 'From', 'Asks to', 'Received', 'Due', 'Status']} rows={R.map(r => [<Mono>{r[0]}</Mono>, r[1], r[2], r[3], r[5] === 'closed' ? <span className="sx-cap">Replied 20 Sep</span> : <span className={'b5-wait' + (r[4] < 15 ? ' is-late' : '')}>{r[4]} days left</span>, r[5] === 'closed' ? <Pill tone="green" icon="circle-check">Closed</Pill> : r[5] === 'found' ? <Pill tone="blue" icon="search-check">Data found</Pill> : <Pill tone="yellow" icon="hourglass">Open</Pill>])} />
        <Panel title="PR-0142 · Delete my data">
          <div className="b5-clock"><Icon name="timer" size={20} /><span className="sx-col" style={{ gap: 0 }}><b className="b5-big">23 days left</b><span>Reply by 11 Nov 2026 (30 days)</span></span></div>
          <ol className="b5-check">
            <li><span className="d"><Icon name="circle-check" size={18} /></span><span>Find data — 3 records: 1 volunteer sign-up, 1 WhatsApp opt-in, 1 follow-up entry</span><span></span></li>
            <li><span className="p"><Icon name="circle" size={18} /></span><span>Export a copy for the person</span><Button variant="ghost" size="sm" icon="download">Export</Button></li>
            <li><span className="p"><Icon name="circle" size={18} /></span><span>Delete the records</span><Button variant="outline" size="sm" icon="trash-2">Delete 3</Button></li>
            <li><span className="p"><Icon name="circle" size={18} /></span><span>Reply to the person</span><Button variant="primary" size="sm" icon="send">Reply</Button></li>
          </ol>
          <Note>Event numbers they were counted in stay — they hold no name.</Note>
        </Panel>
      </div>
    </PDesk>
  );
}
function PrivacyRetention() {
  return (
    <PDesk current="privacy" role="a" scope="ncr">
      <PH tab={2} />
      <Panel title="Retention jobs" flush><T cols={['Data', 'Kept for', 'Last run', ['Deleted', { num: 1 }], 'Next run', ['On', { w: 80 }]]} rows={[
        ['Volunteer sign-ups', 'Event + 30 days', '19 Oct, 2:00 AM', 41, 'Tonight', <Switch label="" aria-label="Volunteer sign-ups" defaultOn />],
        ['WhatsApp message text', '30 days', '19 Oct, 2:00 AM', '1,208', 'Tonight', <Switch label="" aria-label="WhatsApp" defaultOn />],
        ['Cataract follow-up', '1 year after last contact', '1 Oct', 6, '1 Nov', <Switch label="" aria-label="Follow-up" defaultOn />],
        ['Privacy request files', '1 year after closing', '1 Oct', 0, '1 Nov', <Switch label="" aria-label="Requests" defaultOn />],
        ['Sign-in codes', '10 minutes', 'Continuous', '—', '—', <Pill icon="lock">Always</Pill>]]} /></Panel>
    </PDesk>
  );
}
function PrivacyBreach() {
  return (
    <PDesk current="privacy" role="a" scope="ncr">
      <PH tab={3} actions={<Button variant="primary" icon="siren">Report a breach</Button>} />
      <div className="pt-grid pt-g-main">
        <Panel title="BR-003 · Follow-up sheet shared in a WhatsApp group" badge={<Pill tone="pink" icon="triangle-alert">Open</Pill>}>
          <div className="b5-clock"><Icon name="timer" size={20} /><span className="sx-col" style={{ gap: 0 }}><b className="b5-big">51 hours left</b><span>To tell the Data Protection Board (72 hours from 19 Oct, 2:10 PM)</span></span></div>
          <ol className="b5-check">
            <li><span className="d"><Icon name="circle-check" size={18} /></span><span>Contain — message deleted from the group, members asked to delete copies</span><span className="sx-cap">19 Oct</span></li>
            <li><span className="d"><Icon name="circle-check" size={18} /></span><span>Work out who is affected — 14 people, names and phone numbers</span><span className="sx-cap">19 Oct</span></li>
            <li><span className="p"><Icon name="circle" size={18} /></span><span>Tell the Data Protection Board</span><Button variant="outline" size="sm">Draft notice</Button></li>
            <li><span className="p"><Icon name="circle" size={18} /></span><span>Tell each affected person, in their language</span><Button variant="outline" size="sm">Draft message</Button></li>
            <li><span className="p"><Icon name="circle" size={18} /></span><span>Write down what changes so it doesn’t happen again</span><span></span></li>
          </ol>
        </Panel>
        <div className="sx-col" style={{ gap: 16 }}>
          <Panel title="Data protection lead"><div className="sx-row" style={{ gap: 10 }}><span className="sx-av" style={{ background: 'var(--slate-100)', color: 'var(--slate-500)' }}>?</span><span className="sx-col" style={{ gap: 0 }}><b style={{ fontWeight: 500 }}>To be appointed</b><span className="sx-cap">Until then, the state president and PII officer share this.</span></span></div></Panel>
          <Panel title="Past breaches" flush><T dense cols={['Ref', 'Date', 'Status']} rows={[['BR-002', '3 Jul 2026', <Pill tone="green" icon="circle-check">Closed</Pill>], ['BR-001', '18 Mar 2026', <Pill tone="green" icon="circle-check">Closed</Pill>]]} /></Panel>
        </div>
      </div>
    </PDesk>
  );
}

/* ---------- O · /admin/audit ---------- */
const AUD = [
  ['Today 10:12', 'Vikram T.', 'PII officer', 'Revealed phone', 'Follow-up · Ramvati D.'],
  ['Today 9:40', 'State admin', 'State admin', 'Changed', 'Form template · Eye camp report (draft v4)', 1],
  ['Today 9:02', 'Meera S.', 'District coordinator', 'Approved', 'Report · Narayana Seva, Laxmi Nagar'],
  ['Yesterday 6:15', 'State admin', 'State admin', 'Exported', 'KPI totals · Apr–Sep · reason: “Half-year numbers for the national office”'],
  ['Yesterday 4:30', 'Arjun P.', 'Samithi coordinator', 'Uploaded', 'eye-camp-oct-mayurvihar.xlsx · 38 rows'],
  ['18 Oct 11:20', 'System', '—', 'Deleted', 'Retention job · 41 volunteer sign-ups'],
];
function AuditDesk() {
  const rows = [];
  AUD.forEach((a, i) => {
    rows.push([<span style={{ whiteSpace: 'nowrap' }}>{a[0]}</span>, a[1], <span className="sx-cap">{a[2]}</span>, <Pill tone={a[3] === 'Revealed phone' || a[3] === 'Exported' ? 'pink' : a[3] === 'Deleted' ? 'slate' : 'blue'}>{a[3]}</Pill>, a[4], a[5] ? <button className="sx-icbtn" aria-expanded="true" aria-label="Hide changes"><Icon name="chevron-up" size={18} /></button> : <button className="sx-icbtn" aria-expanded="false" aria-label="Show details"><Icon name="chevron-down" size={18} /></button>]);
  });
  return (
    <PDesk current="audit" role="a" scope="ncr">
      <PageHead title="Audit log" sub="Every sign-in, change, approval, export and reveal. Entries can’t be edited or deleted — not even by the state admin." actions={<Button variant="outline" icon="download">Download this view</Button>} />
      <div className="sx-tbl-wrap">
        <div className="sx-tbl-tools"><div className="pt-filters" style={{ width: '100%' }}><label className="sx-search" style={{ margin: 0, maxWidth: 240 }}><Icon name="search" size={18} /><input placeholder="Search" /></label><Sel k="Who" v="Anyone" /><Sel k="Action" v="All" /><Sel k="What" v="All" /><Sel k="When" v="Last 7 days" /></div></div>
        <div className="sx-tbl-scroll"><table className="sx-tbl"><thead><tr><th>When</th><th>Who</th><th>Role</th><th>Action</th><th>What</th><th style={{ width: 56 }}></th></tr></thead><tbody>
          {rows.map((r, i) => <React.Fragment key={i}><tr>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>
            {AUD[i][5] ? <tr className="b5-exp"><td colSpan={6}><div className="b5-diff"><span className="h">Field</span><span className="h">Before</span><span className="h">After</span><span>Referred for surgery · max</span><span className="o">500</span><span className="n">Cataract found</span><span>Hindi label</span><span className="o">(empty)</span><span className="n">सर्जरी के लिए भेजे गए</span></div></td></tr> : null}</React.Fragment>)}
        </tbody></table></div>
        <div className="b5-tfoot"><Icon name="lock" size={16} />Append-only. Kept 7 years.</div>
      </div>
    </PDesk>
  );
}

/* ---------- P · /admin/settings ---------- */
const STABS = ['Seva types', 'KPI definitions', 'Language strings', 'Feature flags', 'Link defaults', 'Analytics'];
const SH = ({ tab }) => <><PageHead title="Settings" sub="State admin only. Changes are logged." /><Tabs items={STABS} on={tab} /></>;
function SettingsSeva() {
  const S = [['eye', 'Eye camp', 'नेत्र शिविर', 'Seva', 'Eye camp report v3', true], ['stethoscope', 'Medical camp', 'चिकित्सा शिविर', 'Seva', 'Medical camp report v2', true], ['utensils', 'Narayana Seva (food)', 'नारायण सेवा (भोजन)', 'Seva', 'Narayana Seva v4', true], ['graduation-cap', 'Bal Vikas class', 'बाल विकास कक्षा', 'Education', 'Bal Vikas class v1', true], ['music', 'Bhajan', 'भजन', 'Spiritual', '—', true], ['sprout', 'Tree planting', '', 'Seva', 'Tree planting v2', true], ['briefcase', 'Skills training', 'कौशल प्रशिक्षण', 'Youth', '—', false]];
  return (
    <PDesk current="settings" role="a" scope="ncr">
      <SH tab={0} />
      <T tools={<div className="sx-row" style={{ width: '100%', justifyContent: 'space-between' }}><span className="sx-cap">7 seva types · each has a stable code</span><Button variant="primary" size="sm" icon="plus">Add seva type</Button></div>}
        cols={[['', { w: 56 }], 'Name (EN)', 'नाम (हिंदी)', 'Wing', 'Form template', ['Public', { w: 80 }], '']}
        rows={S.map(s => [<span className="pt-need__ic sx-t-blue" style={{ width: 36, height: 36 }}><Icon name={s[0]} size={18} /></span>, <span className="sx-tbl__t">{s[1]}</span>, s[2] ? <span lang="hi">{s[2]}</span> : <Pill tone="yellow">Missing</Pill>, s[3], s[4], <Switch label="" aria-label={'Public: ' + s[1]} defaultOn={s[5]} />, <RowMenu items={[{ icon: 'pencil', label: 'Edit' }, { icon: 'circle-off', label: 'Retire' }]} />])} />
    </PDesk>
  );
}
function SettingsKpi() {
  const K = [['people_served', 'People served', 'Sum', 'All seva types', 'Counts services given; one person may attend more than once.'], ['spectacles_distributed', 'Spectacles distributed', 'Sum', 'Eye camp', ''], ['meals_served', 'Meals served', 'Sum', 'Narayana Seva', ''], ['volunteer_hours', 'Volunteer hours', 'Sum', 'All', 'Sevadals × hours each'], ['cataract_referred', 'Referred for surgery', 'Sum', 'Eye camp', 'Hidden until follow-up is complete']];
  return <PDesk current="settings" role="a" scope="ncr"><SH tab={1} /><T cols={['Code', 'Label', 'How', 'From', 'Public note', '']} rows={K.map(k => [<Mono>{k[0]}</Mono>, k[1], k[2], k[3], <span className="sx-cap">{k[4] || '—'}</span>, <RowMenu items={[{ icon: 'pencil', label: 'Edit' }]} />])} foot={<><Icon name="lock" size={16} />Codes never change. Renaming a label keeps every past number.</>} /></PDesk>;
}
function SettingsStrings() {
  const L = [['nav.get_involved', 'Get involved', 'जुड़ें'], ['event.report_due', 'Report due in {n} days', ''], ['form.people_served.help', 'Count each service given.', 'हर दी गई सेवा गिनें।'], ['impact.estimate.tip', 'Rough figure from the district for years before the platform.', ''], ['wa.stop_confirm', 'You won’t get updates any more. Reply START to rejoin.', '']];
  return <PDesk current="settings" role="a" scope="ncr"><SH tab={2} /><T tools={<div className="pt-filters" style={{ width: '100%' }}><label className="sx-search" style={{ margin: 0, maxWidth: 240 }}><Icon name="search" size={18} /><input placeholder="Search keys or text" /></label><button className="sx-chip" aria-pressed="true"><Icon name="filter" size={16} />Hindi missing · 3</button><span style={{ flex: 1 }}></span><Button variant="outline" size="sm" icon="languages">Send 3 to translator</Button></div>}
    cols={['Key', 'English', 'हिंदी']} rows={L.map(l => [<Mono>{l[0]}</Mono>, l[1], l[2] ? <span lang="hi">{l[2]}</span> : <span className="sx-ctl" style={{ minHeight: 40, borderColor: 'var(--yellow-300)', background: 'var(--yellow-50)' }}><input lang="hi" placeholder="अनुवाद जोड़ें" aria-label={'Hindi for ' + l[0]} style={{ height: 38 }} /></span>])} /></PDesk>;
}
function SettingsFlags() {
  return (
    <PDesk current="settings" role="a" scope="ncr">
      <SH tab={3} />
      <div className="pt-grid pt-g2" style={{ alignItems: 'start' }}>
        <Panel title="Feature flags">
          <div className="sx-col" style={{ gap: 0 }}>
            <Tog label="Discourses" desc="Waiting for Sadhana Trust permission. Hidden from the public site and the portal." on={false} />
            <Tog label="Offline form filling" desc="Form links work without signal and send when back online." on />
            <Tog label="AI extraction for scans" desc="Suggests numbers from photos in the review inbox. A person always confirms." on={false} />
            <Tog label="Public WhatsApp “What’s on near me”" on />
          </div>
        </Panel>
        <Panel title="Link defaults and escalation">
          <div className="pt-grid pt-g2"><Select label="Report link expires" options={['Event + 14 days', 'Event + 7 days', 'Event + 30 days']} /><Select label="Desk entry link" options={['Event day only', 'Event day + 1']} /></div>
          <div className="pt-grid pt-g2"><Select label="Lock after wrong codes" options={['5 tries · 10 minutes', '3 tries · 15 minutes']} /><Select label="Escalate to state after" options={['3 days', '2 days', '5 days']} /></div>
          <Note>Applies to new links. Links already sent keep their dates.</Note>
        </Panel>
      </div>
      <Panel title="Analytics" badge={<Pill tone="green" icon="circle-check">Cookieless · on</Pill>}><p className="pt-sub">Page views and referrers only. No cookies, no IP addresses kept, no tracking across sites. Last event 2 min ago.</p></Panel>
    </PDesk>
  );
}

Object.assign(window, { FollowUpDesk, PrivacyRequests, PrivacyRetention, PrivacyBreach, AuditDesk, SettingsSeva, SettingsKpi, SettingsStrings, SettingsFlags });
})();
