(() => {
const { DesignCanvas, DCSection, DCArtboard } = window;
const P = 375, W = 1280, WW = 1440, M = 760;
const Frozen = React.memo(({ el }) => el, () => true);
const Lazy = ({ el }) => <Frozen el={el} />;
function App() {
  const [H, setHs] = React.useState({});
  const pend = React.useRef({}), tmr = React.useRef(0);
  const set = React.useCallback((id, h) => { pend.current[id] = h; clearTimeout(tmr.current); tmr.current = setTimeout(() => { const p = pend.current; pend.current = {}; setHs(s => { let ch = false; const n = { ...s }; for (const k in p) if (Math.abs((s[k] || 0) - p[k]) > 1) { n[k] = p[k]; ch = true; } return ch ? n : s; }); }, 120); }, []);
  const ph = 812;
  const only = new URLSearchParams(location.search).get('s') || window.B5_PART;
  const ab = new URLSearchParams(location.search).get('ab');
  const S = (id, el) => (!only || only.split(',').includes(id.replace('b5',''))) ? el : null;
  const B = (id, label, w, el, min = 0) => (ab && !ab.split(',').includes(id.replace('b5',''))) ? null : <DCArtboard key={id} id={id} label={label} width={w} height={Math.max(min, H[id] || 600)}><window.B3Fit id={id} set={set} min={min}><Lazy el={el} h={Math.max(min, 600)} /></window.B3Fit></DCArtboard>;
  return (
    <DesignCanvas>
      {S('b5a', <DCSection id="b5a" title="A · /admin/uploads" subtitle="Template with prefilled code, or own file to the inbox. Errors in EN + HI. Re-uploading the same file changes nothing.">
        {B('b5a1', 'Desktop · choose + history', W, <window.UploadsDesk />)}
        {B('b5a2', 'Desktop · check rows', W, <window.UploadsDesk step="preview" />)}
        {B('b5a3', 'Desktop · result', W, <window.UploadsDesk step="done" />)}
        {B('b5a4', 'Desktop · same file again', W, <window.UploadsDesk step="same" />)}
        {B('b5a5', 'Phone · choose', P, <window.UploadsPhone />, ph)}
        {B('b5a6', 'Phone · check rows', P, <window.UploadsPhone step="preview" />, ph)}
      </DCSection>)}
      {S('b5b', <DCSection id="b5b" title="B · /admin/forms" subtitle="District sees templates and requests changes; state sees requests and opens the builder.">
        {B('b5b1', 'Desktop · state admin', W, <window.FormsDesk state />)}
        {B('b5b2', 'Desktop · district', W, <window.FormsDesk />)}
        {B('b5b3', 'Phone · district', P, <window.FormsPhone />, ph)}
        {B('b5b4', 'Request a change', M, <window.RequestChange />)}
      </DCSection>)}
      {S('b5c', <DCSection id="b5c" title="C · /admin/forms/[id]/edit Form builder" subtitle="State only. Publish blocked until EN + HI complete. Locked core fields. Click canvas fields to edit.">
        {B('b5c1', 'Desktop 1440', WW, <window.Builder />)}
        {B('b5c2', 'Preview · EN / HI', 760, <window.BuilderPreview />)}
        {B('b5c3', 'Remove KPI field', M, <window.KpiRemoveDialog />)}
      </DCSection>)}
      {S('b5d', <DCSection id="b5d" title="D · /admin/centres edit" subtitle="Public profile with live preview. Centre number only, never personal.">
        {B('b5d1', 'Desktop 1280', W, <window.CentresDesk />)}
      </DCSection>)}
      {S('b5e', <DCSection id="b5e" title="E · /admin/partners" subtitle="Internal contact is a role or office, never shown publicly.">
        {B('b5e1', 'Desktop 1280', W, <window.PartnersDesk />)}
        {B('b5e2', 'Phone · cards', P, <window.PartnersPhone />, ph)}
        {B('b5e3', 'Add / edit dialog', M, <window.PartnerDialog />)}
      </DCSection>)}
      {S('b5f', <DCSection id="b5f" title="F · /admin/content" subtitle="Content editor role. Results card comes from the approved report.">
        {B('b5f1', 'List', W, <window.ContentList />)}
        {B('b5f2', 'Editor · created from event', W, <window.ContentEditor />)}
        {B('b5f3', 'Thought for the Day calendar', W, <window.TftdCalendar />)}
      </DCSection>)}
      {S('b5g', <DCSection id="b5g" title="G · /admin/impact" subtitle="Toggle public KPIs, estimates on/off, estimates table, tile preview.">
        {B('b5g1', 'Desktop 1280', W, <window.ImpactDesk />)}
      </DCSection>)}
      {S('b5h', <DCSection id="b5h" title="H · /admin/migration" subtitle="saidelhi.org export → map → preview → import → redirects → report.">
        {B('b5h1', 'Map types', W, <window.MigrationDesk />)}
        {B('b5h2', 'Report + redirects', W, <window.MigrationDesk step="report" />)}
      </DCSection>)}
      {S('b5i', <DCSection id="b5i" title="I · /admin/whatsapp" subtitle="Templates with Meta status, reminder rules, broadcasts to opted-in only with cost, masked log, number status.">
        {B('b5i1', 'Templates', W, <window.WaTemplates />)}
        {B('b5i2', 'Reminder rules', W, <window.WaRules />)}
        {B('b5i3', 'Broadcast · cost before send', W, <window.WaBroadcast />)}
        {B('b5i4', 'Conversation log', W, <window.WaLog />)}
        {B('b5i5', 'Number status', W, <window.WaNumber />)}
      </DCSection>)}
      {S('b5j', <DCSection id="b5j" title="J · /admin/volunteers" subtitle="Per event fill. First names + masked phones, deleted at event + 30 days.">
        {B('b5j1', 'Desktop 1280', W, <window.VolunteersDesk />)}
      </DCSection>)}
      {S('b5k', <DCSection id="b5k" title="K · /admin/reports" subtitle="Monthly report on the 7th; custom CSV needs a reason; never personal data.">
        {B('b5k1', 'Desktop 1280', W, <window.ReportsDesk />)}
      </DCSection>)}
      {S('b5l', <DCSection id="b5l" title="L · /admin/health" subtitle="District coordinator, East. Rows link to the fix.">
        {B('b5l1', 'Desktop 1280', W, <window.HealthDesk />)}
        {B('b5l2', 'Phone', P, <window.HealthPhone />, ph)}
      </DCSection>)}
      {S('b5m', <DCSection id="b5m" title="M · /admin/follow-up (restricted)" subtitle="PII officer only. Reveal on click, logged. No export.">
        {B('b5m1', 'Desktop 1280', W, <window.FollowUpDesk />)}
      </DCSection>)}
      {S('b5n', <DCSection id="b5n" title="N · /admin/privacy (restricted)" subtitle="Requests due in 30 days, retention jobs, breach log with 72-hour checklist. Consent records tab not drawn.">
        {B('b5n1', 'Requests', W, <window.PrivacyRequests />)}
        {B('b5n2', 'Retention jobs', W, <window.PrivacyRetention />)}
        {B('b5n3', 'Breach log', W, <window.PrivacyBreach />)}
      </DCSection>)}
      {S('b5o', <DCSection id="b5o" title="O · /admin/audit" subtitle="Append-only. Expandable before/after.">
        {B('b5o1', 'Desktop 1280', W, <window.AuditDesk />)}
      </DCSection>)}
      {S('b5p', <DCSection id="b5p" title="P · /admin/settings" subtitle="Seva types, KPI definitions, language strings, flags, link defaults, escalation, analytics.">
        {B('b5p1', 'Seva types', W, <window.SettingsSeva />)}
        {B('b5p2', 'KPI definitions', W, <window.SettingsKpi />)}
        {B('b5p3', 'Language strings · missing', W, <window.SettingsStrings />)}
        {B('b5p4', 'Flags, defaults, analytics', W, <window.SettingsFlags />)}
      </DCSection>)}
    </DesignCanvas>
  );
}
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
})();
