(() => {
const { DesignCanvas, DCSection, DCArtboard } = window;
const P = 375, W = 1280;
const H = {
  ebP: 2150, ebD: 1205, abP: 2665, abD: 1960, ebH: 2085, abH: 2680, sAw: 1150, sCa: 1090, sPo: 1090,
  cP: 3085, cD: 1980, cE: 1270,
  iP: 4270, iD: 3045,
  lP: 2605, lD: 1590, mD: 1390, fP: 790, eP: 1275,
};
function App() {
  return (
    <DesignCanvas>
      <DCSection id="a" title="A · /events/[id] Event" subtitle="Eye camp, Mayur Vihar. Before (Planned) and after (Approved), EN + हिंदी.">
        <DCArtboard id="ebP" label="Before · phone EN" width={P} height={H.ebP}><window.PubEventBefore phone /></DCArtboard>
        <DCArtboard id="ebH" label="Before · phone हिंदी" width={P} height={H.ebH}><window.PubEventBefore phone l="hi" /></DCArtboard>
        <DCArtboard id="ebD" label="Before · desktop" width={W} height={H.ebD}><window.PubEventBefore /></DCArtboard>
        <DCArtboard id="abP" label="After · phone EN" width={P} height={H.abP}><window.PubEventAfter phone /></DCArtboard>
        <DCArtboard id="abH" label="After · phone हिंदी" width={P} height={H.abH}><window.PubEventAfter phone l="hi" /></DCArtboard>
        <DCArtboard id="abD" label="After · desktop" width={W} height={H.abD}><window.PubEventAfter /></DCArtboard>
        <DCArtboard id="sAw" label="State · awaiting results" width={P} height={H.sAw}><window.PubEventState kind="awaiting" /></DCArtboard>
        <DCArtboard id="sCa" label="State · cancelled" width={P} height={H.sCa}><window.PubEventState kind="cancelled" /></DCArtboard>
        <DCArtboard id="sPo" label="State · postponed" width={P} height={H.sPo}><window.PubEventState kind="postponed" /></DCArtboard>
      </DCSection>
      <DCSection id="b" title="B · /centres/[slug] Centre" subtitle="Samithi’s public page. Centre number only, no demographics.">
        <DCArtboard id="cP" label="Phone 375" width={P} height={H.cP}><window.PubCentre phone /></DCArtboard>
        <DCArtboard id="cD" label="Desktop 1280" width={W} height={H.cD}><window.PubCentre /></DCArtboard>
        <DCArtboard id="cE" label="Empty centre" width={P} height={H.cE}><window.PubCentreEmpty /></DCArtboard>
      </DCSection>
      <DCSection id="c" title="C · /impact Impact" subtitle="Approved data only. Phone: 2×2 tiles, map becomes a ranked list.">
        <DCArtboard id="iP" label="Phone 375" width={P} height={H.iP}><window.PubImpact phone /></DCArtboard>
        <DCArtboard id="iD" label="Desktop 1280" width={W} height={H.iD}><window.PubImpact /></DCArtboard>
      </DCSection>
      <DCSection id="d" title="D · /calendar Calendar" subtitle="List is the phone default. Filters persist in the URL.">
        <DCArtboard id="lP" label="Phone · list" width={P} height={H.lP}><window.PubCalendarList phone /></DCArtboard>
        <DCArtboard id="fP" label="Phone · filter sheet" width={P} height={H.fP}><window.PubCalendarFilters /></DCArtboard>
        <DCArtboard id="eP" label="Phone · no results" width={P} height={H.eP}><window.PubCalendarEmpty /></DCArtboard>
        <DCArtboard id="lD" label="Desktop · list" width={W} height={H.lD}><window.PubCalendarList /></DCArtboard>
        <DCArtboard id="mD" label="Desktop · month" width={W} height={H.mD}><window.PubCalendarMonth /></DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
})();
