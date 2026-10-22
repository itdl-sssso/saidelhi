(() => {
const { DesignCanvas, DCSection, DCArtboard } = window;
const P = 375, W = 1280;
const H = window.PT_H = {
  ovD: 1440, ovP: 2455, ovE: 830,
  evD: 2005, evP: 3630, evL: 445, evQ: 1050, elP: 1305, elD: 1115,
  ibD: 950, ibI: 1350, ibP: 812, ibS: 1240, ibR: 1475,
  lkD: 955, lkP: 1350, lkR: 410,
  fmP: 3235, fmH: 3235, fmD: 3110, fmO: 812, fmX: 812, fmS: 812,
};
function App() {
  return (
    <DesignCanvas>
      <DCSection id="a" title="A · /admin Overview" subtitle="District coordinator, East district. “Needs you” leads on phone.">
        <DCArtboard id="ovP" label="Phone 375" width={P} height={H.ovP}><window.OverviewPhone /></DCArtboard>
        <DCArtboard id="ovD" label="Desktop 1280" width={W} height={H.ovD}><window.OverviewDesk /></DCArtboard>
        <DCArtboard id="ovE" label="Empty · all caught up" width={P} height={H.ovE}><window.OverviewEmptyPhone /></DCArtboard>
      </DCSection>
      <DCSection id="b0" title="B0 · /admin/events Events list" subtitle="All events in scope. Opens the event detail below.">
        <DCArtboard id="elP" label="Phone 375" width={P} height={H.elP}><window.EventsPhone /></DCArtboard>
        <DCArtboard id="elD" label="Desktop 1280" width={W} height={H.elD}><window.EventsDesk /></DCArtboard>
      </DCSection>
      <DCSection id="b" title="B · /admin/events/[id] Event detail" subtitle="Sample eye camp, 17 Oct 2026 — status Report submitted">
        <DCArtboard id="evP" label="Phone 375" width={P} height={H.evP}><window.EventPhone /></DCArtboard>
        <DCArtboard id="evD" label="Desktop 1280" width={W} height={H.evD}><window.EventDesk /></DCArtboard>
        <DCArtboard id="evL" label="Form links · before plan approval" width={760} height={H.evL}><window.EventLinksLocked /></DCArtboard>
        <DCArtboard id="evQ" label="QR dialog · public link" width={760} height={H.evQ}><window.QrDialog /></DCArtboard>
      </DCSection>
      <DCSection id="c" title="C · /admin/inbox Review inbox" subtitle="AI drafts from WhatsApp, sheets and scans. A person approves.">
        <DCArtboard id="ibP" label="Phone · list" width={P} height={H.ibP}><window.InboxListPhone /></DCArtboard>
        <DCArtboard id="ibS" label="Phone · item, Source tab" width={P} height={H.ibS}><window.InboxItemPhone tab="source" /></DCArtboard>
        <DCArtboard id="ibR" label="Phone · item, Draft tab" width={P} height={H.ibR}><window.InboxItemPhone tab="draft" /></DCArtboard>
        <DCArtboard id="ibD" label="Desktop · list" width={W} height={H.ibD}><window.InboxListDesk /></DCArtboard>
        <DCArtboard id="ibI" label="Desktop · item split view" width={W} height={H.ibI}><window.InboxItemDesk /></DCArtboard>
      </DCSection>
      <DCSection id="d" title="D · /admin/links Form links" subtitle="Tokens are never shown. Revoke asks first.">
        <DCArtboard id="lkP" label="Phone 375" width={P} height={H.lkP}><window.LinksPhone /></DCArtboard>
        <DCArtboard id="lkD" label="Desktop 1280" width={W} height={H.lkD}><window.LinksDesk /></DCArtboard>
        <DCArtboard id="lkR" label="Revoke confirm" width={760} height={H.lkR}><window.RevokeDialog /></DCArtboard>
      </DCSection>
      <DCSection id="e" title="E · /f/[token]/form Form fill" subtitle="Eye camp report. One-handed at 375, on step 3 of 8.">
        <DCArtboard id="fmP" label="Phone · EN" width={P} height={H.fmP}><window.FormPhone /></DCArtboard>
        <DCArtboard id="fmH" label="Phone · हिंदी" width={P} height={H.fmH}><window.FormPhone lang="hi" /></DCArtboard>
        <DCArtboard id="fmO" label="State · offline queue" width={P} height={H.fmO}><window.FormOffline /></DCArtboard>
        <DCArtboard id="fmX" label="State · session expired" width={P} height={H.fmX}><window.FormExpired /></DCArtboard>
        <DCArtboard id="fmS" label="State · already sent" width={P} height={H.fmS}><window.FormSent /></DCArtboard>
        <DCArtboard id="fmD" label="Desktop 1280" width={W} height={H.fmD}><window.FormDesk /></DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
})();
