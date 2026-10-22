(() => {
const { Icon, Button } = window.SSSSODelhiNCRDesignSystem_9ec6b9;
const { Panel, PageHead, RowMenu } = window;

const ROWS = [
  { id: 1, ev: 'Eye camp · Mayur Vihar', d: '17 Oct', p: 'Report', to: '+91 98•••••52', cr: '17 Oct', exp: '24 Oct', soon: false, uses: '1 / 1', last: '18 Oct, 8:31 PM', otp: true },
  { id: 2, ev: 'Eye camp · Mayur Vihar', d: '17 Oct', p: 'Public', to: 'QR poster', cr: '16 Oct', exp: '31 Oct', uses: '14 / ∞', last: '17 Oct, 1:10 PM', otp: false },
  { id: 3, ev: 'Medical camp · Shakarpur', d: '12 Oct', p: 'Report', to: '+91 99•••••07', cr: '12 Oct', exp: '20 Oct', soon: true, uses: '0 / 1', last: 'Not opened', otp: true },
  { id: 4, ev: 'Bal Vikas camp · Patparganj', d: '14 Oct', p: 'Report', to: '+91 88•••••31', cr: '14 Oct', exp: '21 Oct', soon: true, uses: '0 / 1', last: '15 Oct, 7:02 PM', otp: true },
  { id: 5, ev: 'Narayana Seva · Mayur Vihar', d: '23 Oct', p: 'Desk 1', to: '+91 97•••••18', cr: '19 Oct', exp: '23 Oct', soon: false, uses: '0 / 1', last: 'Not opened', otp: true },
  { id: 6, ev: 'Medical camp · Shakarpur', d: '25 Oct', p: 'Volunteer sign-up', to: 'QR poster', cr: '18 Oct', exp: '25 Oct', uses: '6 / ∞', last: '19 Oct, 8:15 AM', otp: false },
];

const menu = () => <RowMenu items={[{ icon: 'copy', label: 'Copy link' }, { icon: 'send', label: 'Resend on WhatsApp' }, { icon: 'qr-code', label: 'Show QR' }, { icon: 'calendar-plus', label: 'Extend expiry' }, '-', { icon: 'ban', label: 'Revoke link', danger: true }]} />;
const Exp = ({ r }) => <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: r.soon ? 'var(--pink-700)' : 'inherit', fontWeight: r.soon ? 600 : 400 }}>{r.soon ? <Icon name="clock" size={16} /> : null}{r.exp}</span>;
const Otp = ({ on }) => <span className="pt-otp" style={{ color: on ? 'var(--signal-success-text)' : 'var(--slate-600)' }}><Icon name={on ? 'shield-check' : 'minus'} size={16} />{on ? 'Yes' : 'No'}</span>;

function StatusTabs({ full }) {
  return <div className={'pt-tabs' + (full ? ' pt-tabs--full' : '')} style={full ? { overflowX: 'auto' } : null}>{[['Active', 18], ['Expiring 48h', 2], ['Expired', null], ['Revoked', null]].map(([t, n], i) => <button key={t} aria-pressed={i === 0}>{t}{n ? <span className="sx-count">{n}</span> : null}</button>)}</div>;
}
const Sel = ({ l, v }) => <button className="pt-sel">{l}: <b>{v}</b><Icon name="chevron-down" size={16} /></button>;

function LinksDesk() {
  const cols = [
    { key: 'ev', label: 'Event', sortable: true, render: r => <span className="sx-col" style={{ gap: 0 }}><span className="sx-tbl__t">{r.ev}</span><span className="sx-tbl__sub">{r.d}</span></span> },
    { key: 'p', label: 'Purpose' },
    { key: 'to', label: 'Sent to', render: r => r.to === 'QR poster' ? <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><Icon name="qr-code" size={16} />QR poster</span> : r.to },
    { key: 'cr', label: 'Created', sortable: true },
    { key: 'exp', label: 'Expires', sortable: true, render: r => <Exp r={r} /> },
    { key: 'uses', label: 'Uses', num: true },
    { key: 'last', label: 'Last opened', render: r => <span style={{ color: r.last === 'Not opened' ? 'var(--slate-500)' : 'inherit' }}>{r.last}</span> },
    { key: 'otp', label: 'OTP', render: r => <Otp on={r.otp} /> },
  ];
  return (
    <window.Desk current="links">
      <PageHead title="Form links" sub="Every link is single-purpose and expires. Report links ask for a WhatsApp code before opening." actions={<Button variant="primary" icon="plus">New link</Button>} />
      <window.DataTable lang="en" columns={cols} rows={ROWS} sort={{ key: 'exp', dir: 'asc' }} onSort={() => {}} rowMenu={menu}
        toolbar={<div className="pt-filters" style={{ width: '100%' }}><StatusTabs /><span style={{ flex: 1 }}></span><Sel l="Purpose" v="All" /><Sel l="District" v="East" /><Sel l="Event" v="All" /></div>}
        footer={<window.Pagination page={1} pages={3} total={18} perPage={6} onPage={() => {}} />} />
      <span className="sx-cap" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><Icon name="eye-off" size={16} />Link addresses are never shown here. Copy or resend to share one.</span>
    </window.Desk>
  );
}

function LinksPhone() {
  return (
    <window.Phone tab="more">
      <PageHead title="Form links" />
      <StatusTabs full />
      <div className="pt-filters"><Sel l="Purpose" v="All" /><Sel l="Event" v="All" /></div>
      {ROWS.slice(0, 4).map(r => (
        <div className="pt-lcard" key={r.id}>
          <div className="sx-row" style={{ justifyContent: 'space-between', flexWrap: 'nowrap', alignItems: 'flex-start' }}>
            <span className="sx-col" style={{ gap: 0 }}><span className="sx-tbl__t">{r.ev}</span><span className="sx-cap">{r.p} · {r.d}</span></span>{menu()}
          </div>
          <dl><dt>Sent to</dt><dd>{r.to}</dd><dt>Expires</dt><dd><Exp r={r} /></dd><dt>Uses</dt><dd>{r.uses}</dd><dt>Last opened</dt><dd>{r.last}</dd><dt>OTP</dt><dd><Otp on={r.otp} /></dd></dl>
          <div className="sx-row" style={{ gap: 4 }}><Button variant="ghost" size="sm" icon="copy">Copy</Button><Button variant="ghost" size="sm" icon="send">Resend</Button><Button variant="ghost" size="sm" icon="qr-code">QR</Button></div>
        </div>
      ))}
    </window.Phone>
  );
}

function RevokeDialog() {
  return (
    <window.ModalStage>
      <div className="pt-modal" role="alertdialog" aria-label="Revoke this link?">
        <div className="pt-modal__cap"></div>
        <div className="pt-modal__bd">
          <h3 className="sx-h3">Revoke this link?</h3>
          <div className="pt-lcard" style={{ padding: '12px 16px', boxShadow: 'none', background: 'var(--sand)' }}><span className="sx-tbl__t">Medical camp · Shakarpur · Report</span><span className="sx-cap">Sent to +91 99•••••07 · expires 20 Oct</span></div>
          <p className="pt-sub">Anyone with this link will see “This link is no longer active”. Anything already sent stays. You can create a new link at any time.</p>
        </div>
        <div className="pt-modal__ft"><Button variant="outline">Keep link</Button><Button variant="primary" icon="ban">Revoke link</Button></div>
      </div>
    </window.ModalStage>
  );
}

Object.assign(window, { LinksDesk, LinksPhone, RevokeDialog });
})();
