(() => {
const { Icon, Button, Input, Select, Checkbox, Alert } = window.SSSSODelhiNCRDesignSystem_9ec6b9;
const { PDesk, PPhone, PageHead, StatusPill, RowMenu, Field, PickerField, Panel } = window;

/* ---------- G · /admin/approvals ---------- */
const PLANS = [
  { id: 1, t: 'Medical camp', ic: 'stethoscope', s: 'Shakarpur', d: 'Sun 25 Oct, 9:00 AM', by: 'Samithi coordinator · sent 17 Oct', nums: [['Sevadals needed', '15'], ['Partner', 'District hospital'], ['Expected', '~150 people']], esc: 'Escalates to state in 1 day', urgent: true },
  { id: 2, t: 'Tree planting', ic: 'sprout', s: 'Patparganj', d: 'Thu 29 Oct, 7:30 AM', by: 'Samithi coordinator · sent 18 Oct', nums: [['Sevadals needed', '20'], ['Saplings', '200'], ['Partner', 'None']], esc: 'Escalates to state in 2 days' },
  { id: 3, t: 'Bal Vikas camp', ic: 'graduation-cap', s: 'Laxmi Nagar', d: 'Sat 7 Nov, 10:00 AM', by: 'Samithi coordinator · sent 19 Oct', nums: [['Sevadals needed', '8'], ['Children expected', '40'], ['Partner', 'None']], esc: 'Escalates to state in 3 days' },
];
const REPORTS = [
  { id: 4, t: 'Eye camp', ic: 'stethoscope', s: 'Mayur Vihar', d: 'Sat 17 Oct', by: 'Report by form · sent 18 Oct, 8:47 PM', nums: [['Screened', '115'], ['Spectacles', '63'], ['Cataract found', '13']], flag: '0 surgeries yet — follow-up open', esc: 'Escalates to state in 1 day', urgent: true },
  { id: 5, t: 'Narayana Seva', ic: 'hand-heart', s: 'Laxmi Nagar', d: 'Fri 16 Oct', by: 'Report by WhatsApp · sent 17 Oct', nums: [['Meals served', '420'], ['Sevadals', '24'], ['Hours', '96']], esc: 'Escalates to state in 2 days' },
];
const ESC = [{ id: 6, t: 'Food seva', ic: 'hand-heart', s: 'Preet Vihar', d: 'Thu 15 Oct', by: 'Report waiting 3 days with district', nums: [['Meals served', '310'], ['Sevadals', '18'], ['Hours', '72']], esc: 'Now with the state team', alert: true }];

function ACard({ a, sel, onSel, kind }) {
  return (
    <article className={'b3-ac' + (sel ? ' is-sel' : '')}>
      <header className="b3-ac__hd">
        {kind === 'plan' ? <Checkbox checked={sel} onChange={onSel} aria-label={'Select ' + a.t} /> : null}
        <span className="pt-need__ic sx-t-blue" style={{ width: 40, height: 40 }}><Icon name={a.ic} size={20} /></span>
        <div className="sx-col" style={{ gap: 2, minWidth: 0, flex: 1 }}>
          <span className="b3-ac__t">{a.t} · {a.s}</span>
          <span className="sx-cap">{a.d} · {a.by}</span>
        </div>
        {a.alert ? <StatusPill status="escalated" /> : <StatusPill status={kind === 'plan' ? 'awaiting_approval' : 'report_submitted'} />}
      </header>
      <dl className="b3-ac__n">{a.nums.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
      {a.flag ? <span className="sx-cap" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><Icon name="info" size={16} />{a.flag}</span> : null}
      <footer className="b3-ac__ft">
        <span className={'b3-next-s' + (a.urgent || a.alert ? ' b3-late' : '')}><Icon name="clock" size={16} />{a.esc}</span>
        <span style={{ flex: 1 }}></span>
        <Button variant="ghost" size="sm" iconAfter="arrow-right">Open</Button>
        <Button variant="outline" size="sm" icon="message-square">Request changes</Button>
        <Button variant="primary" size="sm" icon="check">Approve</Button>
      </footer>
    </article>
  );
}
const ATabs = ({ on, full }) => <div className={'pt-tabs' + (full ? ' pt-tabs--full' : '')}>{[['Plans', 3], ['Reports', 2], ['Escalated', 1]].map(([n, c], i) => <button key={n} aria-pressed={i === on}>{n}<span className={i === 2 ? 'sx-count' : 'sx-cap'}>{c}</span></button>)}</div>;

function ApprovalsDesk() {
  const [sel, setSel] = React.useState([1, 2]);
  const tog = id => setSel(sel.includes(id) ? sel.filter(x => x !== id) : [...sel, id]);
  return (
    <PDesk current="approvals">
      <PageHead title="Approvals" sub="Plans and reports from East district samithis. Anything you don’t act on within 3 days goes to the state team." />
      <div className="sx-row" style={{ justifyContent: 'space-between' }}><ATabs on={0} /><span className="sx-cap">Oldest first</span></div>
      {sel.length ? <div className="sx-bulk" style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-calm)' }}><span>{sel.length} plans selected</span><span style={{ flex: 1 }}></span><Button variant="primary" size="sm" icon="check-check">Approve {sel.length} plans</Button><Button variant="ghost" size="sm" onClick={() => setSel([])}>Clear</Button></div> : null}
      <div className="sx-col" style={{ gap: 12 }}>{PLANS.map(a => <ACard key={a.id} a={a} kind="plan" sel={sel.includes(a.id)} onSel={() => tog(a.id)} />)}</div>
      <span className="sx-cap">Bulk approve works for plans only. Reports are approved one at a time, after you’ve checked the numbers.</span>
    </PDesk>
  );
}
function ApprovalsPhone({ tab = 1 }) {
  const list = tab === 1 ? REPORTS : ESC;
  return (
    <PPhone tab="approvals">
      <PageHead title="Approvals" sub="East district" />
      <ATabs on={tab} full />
      {list.map(a => <ACard key={a.id} a={a} kind={tab === 1 ? 'report' : 'esc'} />)}
      {tab === 2 ? <span className="sx-cap">The state team can see this now. You can still approve it yourself.</span> : null}
    </PPhone>
  );
}

/* ---------- H · /admin/org ---------- */
const TREE = [
  { n: 'Central', c: 'DL-C', s: 6, e: 41 }, { n: 'East', c: 'DL-E', s: 7, e: 88, open: true, kids: [
    ['Mayur Vihar', 'DL-E-MAYURVIHAR', 23, true], ['Laxmi Nagar', 'DL-E-LAXMINAGAR', 17], ['Patparganj', 'DL-E-PATPARGANJ', 14], ['Shakarpur', 'DL-E-SHAKARPUR', 12], ['Preet Vihar', 'DL-E-PREETVIHAR', 11], ['Mayur Vihar Ph-2', 'DL-E-MAYURVIHAR2', 6], ['Trilokpuri', 'DL-E-TRILOKPURI', 5, false, true]] },
  { n: 'New Delhi', c: 'DL-ND', s: 5, e: 52 }, { n: 'North', c: 'DL-N', s: 8, e: 63 }, { n: 'South', c: 'DL-S', s: 9, e: 71 }, { n: 'West', c: 'DL-W', s: 7, e: 49 },
  { n: 'Gurugram', c: 'HR-GGN', s: 4, e: 33 }, { n: 'Noida–Ghaziabad', c: 'UP-NG', s: 6, e: 38 }, { n: 'Faridabad', c: 'HR-FBD', s: 3, e: 19 },
];
function Tree({ phone }) {
  return (
    <div className="b3-tree" role="tree" aria-label="Organisation">
      <div className="b3-tree__r b3-tree__root" role="treeitem" aria-expanded="true"><Icon name="globe" size={18} /><span className="b3-tree__n">Delhi NCR</span><span className="sx-cap">9 districts · 55 samithis</span></div>
      {TREE.map(d => <React.Fragment key={d.c}>
        <div className="b3-tree__r b3-tree__d" role="treeitem" aria-expanded={!!d.open}><Icon name={d.open ? 'chevron-down' : 'chevron-right'} size={16} /><Icon name="map" size={18} /><span className="b3-tree__n">{d.n}</span><span className="sx-cap">{d.s} samithis{phone ? '' : ` · ${d.e} events this year`}</span></div>
        {d.open ? d.kids.map(k => <div key={k[1]} className={'b3-tree__r b3-tree__s' + (k[3] ? ' is-on' : '') + (k[4] ? ' is-off' : '')} role="treeitem" aria-selected={!!k[3]}><Icon name="home" size={16} /><span className="b3-tree__n">{k[0]}</span>{k[4] ? <span className="sx-pill sx-t-slate" style={{ padding: '1px 8px' }}>Inactive</span> : <span className="sx-cap">{k[2]} events</span>}</div>) : null}
      </React.Fragment>)}
    </div>
  );
}
function EditPanel() {
  return (
    <Panel title="Samithi Mayur Vihar" badge={<span className="sx-pill sx-t-green"><Icon name="circle-check" size={16} />Active</span>} action={<RowMenu items={[{ icon: 'git-merge', label: 'Merge into another samithi' }, { icon: 'arrow-right-left', label: 'Move to another district' }, '-', { icon: 'circle-off', label: 'Deactivate', danger: true }]} />}>
      <div className="pt-grid pt-g2">
        <Input label="Name (EN)" defaultValue="Mayur Vihar" />
        <Input label="नाम (हिंदी)" lang="hi" defaultValue="मयूर विहार" />
      </div>
      <Field label="Stable code" help="Never changes, even if the name does. Used in links, reports and exports."><span className="sx-ctl sx-ctl--ro"><span style={{ fontFamily: 'ui-monospace,monospace', fontSize: 14, flex: 1 }}>DL-E-MAYURVIHAR</span><Icon name="lock" size={16} /></span></Field>
      <Select label="Parent district" options={['East', 'Central', 'New Delhi', 'North', 'South', 'West', 'Gurugram', 'Noida–Ghaziabad', 'Faridabad']} defaultValue="East" />
      <div className="pt-grid pt-g2">
        <Field label="Active from"><PickerField icon="calendar-days" value="1 Apr 2019" /></Field>
        <Field label="Active until" optional><PickerField icon="calendar-days" placeholder="Still active" /></Field>
      </div>
      <div className="sx-row" style={{ justifyContent: 'flex-end', gap: 8 }}><Button variant="ghost">Discard</Button><Button variant="primary">Save changes</Button></div>
      <div className="sx-col" style={{ gap: 8, borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
        <span className="sx-field__lbl">History</span>
        <ul className="pt-log" style={{ margin: 0, padding: 0 }}>
          <li><time>12 Jan 2024</time><span>Renamed from “Mayur Vihar Ph-1” by state admin</span></li>
          <li><time>3 Jun 2021</time><span>Merged in “Mayur Vihar Extension” — 9 events moved, old code kept as an alias</span></li>
          <li><time>1 Apr 2019</time><span>Created under East district</span></li>
        </ul>
      </div>
    </Panel>
  );
}
function OrgDesk() {
  return (
    <PDesk current="org" role="a" scope="ncr">
      <PageHead title="Districts and samithis" sub="Each samithi’s public centre page comes from here. Nothing is ever deleted; history is kept." actions={<><Button variant="outline" icon="plus">Add district</Button><Button variant="primary" icon="plus">Add samithi</Button></>} />
      <div className="pt-grid" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.1fr)', alignItems: 'start' }}>
        <Panel title="Delhi NCR" flush action={<label className="sx-search" style={{ margin: 0, maxWidth: 220 }}><Icon name="search" size={18} /><input placeholder="Find a samithi" /></label>}><Tree /></Panel>
        <EditPanel />
      </div>
    </PDesk>
  );
}
function OrgPhone() {
  return <PPhone role="a" scope="ncr"><PageHead title="Districts and samithis" actions={<Button variant="primary" size="sm" icon="plus">Add</Button>} /><Panel flush><Tree phone /></Panel></PPhone>;
}
function MergeDialog() {
  return (
    <window.ModalStage>
      <div className="pt-modal" role="dialog" aria-label="Merge samithi">
        <div className="pt-modal__cap"></div>
        <div className="pt-modal__bd">
          <h2 className="sx-h3">Merge Mayur Vihar Ph-2 into another samithi</h2>
          <Field label="Merge into"><PickerField icon="home" value="Samithi Mayur Vihar · DL-E-MAYURVIHAR" /></Field>
          <ul className="pb-ul" style={{ fontSize: 'var(--text-portal-body)' }}>
            <li><Icon name="arrow-right-left" size={18} /><span>6 events and their reports move to Mayur Vihar.</span></li>
            <li><Icon name="users" size={18} /><span>2 coordinators get access to Mayur Vihar instead. They’ll be told on WhatsApp.</span></li>
            <li><Icon name="history" size={18} /><span>The old code DL-E-MAYURVIHAR2 keeps working as an alias and is never reused.</span></li>
            <li><Icon name="globe" size={18} /><span>The old centre page redirects to the Mayur Vihar page.</span></li>
          </ul>
          <Input label="Type MERGE to confirm" placeholder="MERGE" />
        </div>
        <div className="pt-modal__ft"><Button variant="ghost">Cancel</Button><Button variant="primary" icon="git-merge">Merge samithis</Button></div>
      </div>
    </window.ModalStage>
  );
}
function DeactivateDialog() {
  return (
    <window.ModalStage>
      <div className="pt-modal" role="dialog" aria-label="Deactivate samithi">
        <div className="pt-modal__cap"></div>
        <div className="pt-modal__bd">
          <h2 className="sx-h3">Deactivate Samithi Trilokpuri?</h2>
          <p className="pt-sub">Its 5 past events and their numbers stay in reports and on the impact page. The centre page shows “This centre no longer meets” with a link to the nearest one.</p>
          <Field label="Last active day"><PickerField icon="calendar-days" value="31 Oct 2026" /></Field>
          <Alert tone="attention" title="1 event is still planned">Tree planting on 8 Nov must be moved or cancelled first.</Alert>
        </div>
        <div className="pt-modal__ft"><Button variant="ghost">Cancel</Button><Button variant="primary" disabled>Deactivate</Button></div>
      </div>
    </window.ModalStage>
  );
}

/* ---------- I · /admin/people ---------- */
const PEOPLE = [
  { id: 1, n: 'Meera S.', p: '+91 98•••••52', r: 'District coordinator', sc: 'East district', last: 'Today, 9:12 AM', st: 'active' },
  { id: 2, n: 'Arjun P.', p: '+91 99•••••07', r: 'Samithi coordinator', sc: 'Mayur Vihar', last: '18 Oct 2026', st: 'active' },
  { id: 3, n: 'Kavita R.', p: '+91 97•••••31', r: 'Samithi coordinator', sc: 'Laxmi Nagar', last: '2 Jul 2026', st: 'review' },
  { id: 4, n: 'Rahul M.', p: '+91 98•••••90', r: 'Samithi coordinator', sc: 'Shakarpur', last: '—', st: 'invited' },
  { id: 5, n: 'Sunita D.', p: '+91 96•••••18', r: 'Translator', sc: 'Delhi NCR', last: '16 Oct 2026', st: 'active' },
  { id: 6, n: 'Vikram T.', p: '+91 95•••••44', r: 'PII officer', sc: 'Delhi NCR', last: '12 Oct 2026', st: 'active' },
  { id: 7, n: 'Anil G.', p: '+91 93•••••62', r: 'Samithi coordinator', sc: 'Trilokpuri', last: '4 Mar 2026', st: 'off' },
];
const PST = { active: ['sx-t-green', 'circle-check', 'Active'], review: ['sx-t-yellow', 'hourglass', 'Review due'], invited: ['sx-t-blue', 'send', 'Invited'], off: ['sx-t-slate', 'circle-off', 'Deactivated'] };
const PS = ({ s }) => <span className={'sx-pill ' + PST[s][0]}><Icon name={PST[s][1]} size={16} />{PST[s][2]}</span>;
const pmenu = p => <RowMenu items={[{ icon: 'user-cog', label: 'Change role or scope' }, { icon: 'send', label: p.st === 'invited' ? 'Resend invite' : 'Send sign-in help' }, { icon: 'scroll-text', label: 'View activity' }, '-', { icon: 'user-x', label: 'Deactivate', danger: true }]} />;
const Review = () => <div className="b3-review"><Icon name="shield-check" size={20} /><div className="sx-col" style={{ gap: 2, flex: 1, minWidth: 0 }}><b>90-day access review due by 31 Oct 2026</b><span>Confirm that 14 people in East district still need their access. Anyone not confirmed is paused, not deleted.</span></div><Button variant="primary" size="sm">Start review</Button></div>;

function PeopleDesk() {
  const cols = [
    { key: 'n', label: 'Name', sortable: true, render: p => <span className="sx-row" style={{ gap: 10 }}><span className="sx-av">{p.n.split(' ').map(x => x[0]).join('')}</span><span className="sx-tbl__t">{p.n}</span></span> },
    { key: 'p', label: 'Phone', render: p => <span style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{p.p}</span> },
    { key: 'r', label: 'Role' }, { key: 'sc', label: 'Scope' },
    { key: 'last', label: 'Last sign-in', sortable: true, render: p => <span style={{ whiteSpace: 'nowrap', color: p.st === 'review' ? 'var(--pink-700)' : undefined }}>{p.last}</span> },
    { key: 'st', label: 'Status', render: p => <PS s={p.st} /> },
  ];
  return (
    <PDesk current="people">
      {l => <>
        <PageHead title="People and access" sub="Who can sign in to the portal, and what they can see." actions={<Button variant="primary" icon="message-circle">Invite on WhatsApp</Button>} />
        <Review />
        <window.DataTable lang="en" columns={cols} rows={PEOPLE} sort={{ key: 'n', dir: 'asc' }} onSort={() => {}} rowMenu={pmenu}
          toolbar={<div className="pt-filters" style={{ width: '100%' }}><button className="pt-sel">Role: <b>All</b><Icon name="chevron-down" size={16} /></button><button className="pt-sel">Status: <b>All</b><Icon name="chevron-down" size={16} /></button><span style={{ flex: 1 }}></span><span className="sx-cap" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><Icon name="lock" size={16} />Full numbers are visible only to the PII officer</span></div>} />
      </>}
    </PDesk>
  );
}
function PeoplePhone() {
  return (
    <PPhone>
      <PageHead title="People and access" actions={<Button variant="primary" size="sm" icon="message-circle">Invite</Button>} />
      <Review />
      {PEOPLE.slice(0, 5).map(p => <div className="pt-lcard" key={p.id}>
        <div className="sx-row" style={{ justifyContent: 'space-between' }}><span className="sx-row" style={{ gap: 10 }}><span className="sx-av">{p.n.split(' ').map(x => x[0]).join('')}</span><span className="sx-col" style={{ gap: 0 }}><span className="sx-tbl__t">{p.n}</span><span className="sx-cap">{p.p}</span></span></span>{pmenu(p)}</div>
        <dl><dt>Role</dt><dd>{p.r}</dd><dt>Scope</dt><dd>{p.sc}</dd><dt>Last in</dt><dd>{p.last}</dd></dl>
        <div><PS s={p.st} /></div>
      </div>)}
    </PPhone>
  );
}
function InviteSheet() {
  const roles = [['s', 'Samithi coordinator', 'One samithi'], ['d', 'District coordinator', 'One district'], ['c', 'Content editor', 'Public pages'], ['t', 'Translator', 'Hindi text only']];
  return (
    <window.ModalStage>
      <div className="pt-modal" role="dialog" aria-label="Invite on WhatsApp">
        <div className="pt-modal__cap"></div>
        <div className="pt-modal__bd">
          <h2 className="sx-h3">Invite someone on WhatsApp</h2>
          <div className="pt-grid pt-g2"><Input label="Name" defaultValue="Rahul M." /><Field label="WhatsApp number"><span className="sx-ctl"><span className="sx-cap">+91</span><input defaultValue="98765 43290" aria-label="Phone" /></span></Field></div>
          <span className="sx-field__lbl">Role</span>
          <div className="b3-roles">{roles.map(([id, n, s], i) => <label key={id} className={'b3-role' + (i === 0 ? ' is-on' : '')}><span className="sx-radio" data-on={i === 0}></span><span className="sx-col" style={{ gap: 0 }}><b>{n}</b><span className="sx-cap">{s}</span></span></label>)}</div>
          <Field label="Scope" help="You can only give access inside East district."><PickerField icon="home" value="Samithi Shakarpur" /></Field>
          <div className="b3-msgprev"><span className="sx-tmpl"><Icon name="badge-check" size={16} />Meta template</span><p>Sai Ram, Rahul. You’ve been invited to the SSSSO Delhi NCR coordinator portal as samithi coordinator for Shakarpur. Tap to sign in — no password needed.</p></div>
        </div>
        <div className="pt-modal__ft"><Button variant="ghost">Cancel</Button><Button variant="primary" icon="send">Send invite</Button></div>
      </div>
    </window.ModalStage>
  );
}

Object.assign(window, { ApprovalsDesk, ApprovalsPhone, OrgDesk, OrgPhone, MergeDialog, DeactivateDialog, PeopleDesk, PeoplePhone, InviteSheet });
})();
