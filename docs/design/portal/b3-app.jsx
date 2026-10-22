(() => {
const { DesignCanvas, DCSection, DCArtboard } = window;
const P = 375, W = 1280, M = 760;
function App() {
  const [H, setHs] = React.useState({});
  const set = React.useCallback((id, h) => setHs(p => (p[id] === h ? p : { ...p, [id]: h })), []);
  const B = (id, label, w, el, min = 0) => <DCArtboard key={id} id={id} label={label} width={w} height={Math.max(min, H[id] || 600)}><window.B3Fit id={id} set={set} min={min}>{el}</window.B3Fit></DCArtboard>;
  const ph = 812;
  return (
    <DesignCanvas>
      <DCSection id="a" title="A · Home (lotus page, updated)" subtitle="Live page — open wireframes/Home v2.html. New: nav, Thought for the Day, upcoming seva strip, impact snapshot, find a centre, WhatsApp opt-in, shared footer.">
        {B('a1', 'Open the live page', 520, <window.HomeLinkCard />)}
      </DCSection>
      <DCSection id="b" title="B · /privacy" subtitle="Plain bullets first. Request form replies within 30 days.">
        {B('bP', 'Phone · EN', P, <window.Privacy phone />)}
        {B('bD', 'Desktop 1280', W, <window.Privacy />)}
        {B('bH', 'Phone · हिंदी', P, <window.Privacy phone l="hi" />)}
        {B('bS', 'Request sent', P, <window.PrivacySent />, ph)}
      </DCSection>
      <DCSection id="c" title="C · /f/[token] Form link verify" subtitle="Minimal page. Event card + purpose on top. Phone only.">
        {B('c1', 'Report · phone number', P, <window.VReport />, ph)}
        {B('c1h', 'Report · हिंदी', P, <window.VReport lang="hi" />, ph)}
        {B('c2', 'Report · enter code', P, <window.VOtp />, ph)}
        {B('c2h', 'Enter code · हिंदी', P, <window.VOtp lang="hi" />, ph)}
        {B('c3', 'Desk entry', P, <window.VDesk />, ph)}
        {B('c4', 'Public · join with bot check', P, <window.VJoin />, ph)}
        {B('c5', 'Error · wrong code', P, <window.VOtp state="wrong" />, ph)}
        {B('c6', 'Error · locked 10 min', P, <window.VLocked />, ph)}
        {B('c7', 'Error · not on event list', P, <window.VNotListed />, ph)}
        {B('c8', 'Error · offline', P, <window.VOtp state="offline" />, ph)}
      </DCSection>
      <DCSection id="c2" title="C · Done and invalid links" subtitle="Invalid: expired (with date), revoked, used up, not found (no event card).">
        {B('d1', 'Done · report sent', P, <window.VDone />, ph)}
        {B('d1h', 'Done · हिंदी', P, <window.VDone lang="hi" />, ph)}
        {B('d2', 'Done · public join', P, <window.VDone kind="join" />, ph)}
        {B('i1', 'Invalid · expired', P, <window.VInvalid kind="expired" />, ph)}
        {B('i2', 'Invalid · revoked', P, <window.VInvalid kind="revoked" />, ph)}
        {B('i3', 'Invalid · used up', P, <window.VInvalid kind="used" />, ph)}
        {B('i4', 'Invalid · not found', P, <window.VInvalid kind="missing" />, ph)}
      </DCSection>
      <DCSection id="d" title="D · /admin/login" subtitle="WhatsApp code, no password. Same neutral message whether or not the number is known.">
        {B('l1', 'Phone · number', P, <window.LoginPhone />, ph)}
        {B('l1h', 'Phone · हिंदी', P, <window.LoginPhone lang="hi" />, ph)}
        {B('l2', 'Phone · code (neutral)', P, <window.LoginPhone step="otp" />, ph)}
        {B('l3', 'Phone · email fallback', P, <window.LoginPhone step="email" />, ph)}
        {B('l4', 'Phone · email sent', P, <window.LoginPhone step="emailSent" />, ph)}
        {B('l5', 'Desktop 1280', W, <window.LoginDesk />, 720)}
      </DCSection>
      <DCSection id="e" title="E · /admin/events" subtitle="State admin view, all districts. Overdue in pink with text. Bulk resend and export.">
        {B('e1', 'Desktop 1280', W, <window.EventsDesk3 />)}
        {B('e2', 'Phone · cards', P, <window.EventsPhone3 />, ph)}
      </DCSection>
      <DCSection id="f" title="F · /admin/events/new Plan event" subtitle="Samithi coordinator, Mayur Vihar. Live public card preview.">
        {B('f1', 'Desktop 1280', W, <window.PlanDesk />)}
        {B('f2', 'Phone 375', P, <window.PlanPhone />, ph)}
      </DCSection>
      <DCSection id="g" title="G · /admin/approvals" subtitle="District coordinator, East. Bulk approve for plans only.">
        {B('g1', 'Desktop · Plans, 2 selected', W, <window.ApprovalsDesk />)}
        {B('g2', 'Phone · Reports', P, <window.ApprovalsPhone tab={1} />, ph)}
        {B('g3', 'Phone · Escalated', P, <window.ApprovalsPhone tab={2} />, ph)}
      </DCSection>
      <DCSection id="h" title="H · /admin/org" subtitle="Delhi NCR → district → samithi. Stable codes never change; history kept.">
        {B('h1', 'Desktop · tree + edit', W, <window.OrgDesk />)}
        {B('h2', 'Phone · tree', P, <window.OrgPhone />, ph)}
        {B('h3', 'Merge dialog', M, <window.MergeDialog />)}
        {B('h4', 'Deactivate dialog', M, <window.DeactivateDialog />)}
      </DCSection>
      <DCSection id="i" title="I · /admin/people" subtitle="Masked phones. Invite on WhatsApp with role + scope. 90-day review.">
        {B('p1', 'Desktop 1280', W, <window.PeopleDesk />)}
        {B('p2', 'Phone · cards', P, <window.PeoplePhone />, ph)}
        {B('p3', 'Invite dialog', M, <window.InviteSheet />)}
      </DCSection>
      <DCSection id="j" title="J · WhatsApp bot" subtitle="Brand chat kit. “Meta template” tag = needs Meta approval (business-initiated).">
        {B('w1', 'Menu · samithi coordinator', P, <window.MenuChat />)}
        {B('w1h', 'Menu · coordinator हिंदी', P, <window.MenuChat l="hi" />)}
        {B('w2', 'Menu · district', P, <window.MenuChat who="district" />)}
        {B('w3', 'Menu · public', P, <window.MenuChat who="public" />)}
        {B('w4', 'Plan activity', P, <window.PlanChat />)}
        {B('w4h', 'Plan activity · हिंदी', P, <window.PlanChat l="hi" />)}
        {B('w5', 'District approval + reminders', P, <window.ApprovalChat />)}
        {B('w6', 'Form link + checklist + nudge', P, <window.LinkChat />)}
        {B('w7', 'Report by chat', P, <window.ReportChat />)}
        {B('w7h', 'Report by chat · हिंदी', P, <window.ReportChat l="hi" />)}
        {B('w8', 'OTP message', P, <window.OtpChat />)}
        {B('w9', 'What’s on near me', P, <window.NearChat />)}
        {B('w10', 'Errors + human handoff', P, <window.ErrorChat />)}
      </DCSection>
    </DesignCanvas>
  );
}
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
})();
