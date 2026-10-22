(() => {
const { DesignCanvas, DCSection, DCArtboard } = window;
const P = 375, W = 1280;
function Frame({ id, src, set }) {
  const r = React.useRef(null);
  const onLoad = () => {
    let n = 0;
    const tick = () => { try { const d = r.current.contentDocument; const h = Math.max(d.documentElement.scrollHeight, d.body.scrollHeight); r.current.style.height = h + 'px'; set(id, h); } catch (e) {} if (++n < 12) setTimeout(tick, 500); };
    tick();
  };
  return <iframe ref={r} className="b4-iframe" src={src} onLoad={onLoad} title={id} style={{ height: 1400 }}></iframe>;
}
function App() {
  const [H, setHs] = React.useState({});
  const set = React.useCallback((id, h) => setHs(p => (p[id] === h ? p : { ...p, [id]: h })), []);
  const B = (id, label, w, el, min = 0) => <DCArtboard key={id} id={id} label={label} width={w} height={Math.max(min, H[id] || 600)}><window.B3Fit id={id} set={set} min={min}>{el}</window.B3Fit></DCArtboard>;
  const F = (id, label, w, src) => <DCArtboard key={id} id={id} label={label} width={w} height={H[id] || 1400}><Frame id={id} src={src} set={set} /></DCArtboard>;
  const ph = 812;
  return (
    <DesignCanvas>
      <DCSection id="a" title="A · Value pages (5, updated)" subtitle="Live pages in wireframes/. Sanskrit name, “Lived through” card, discourses behind a flag, prev/next, shared footer. हिंदी shows “Available in English only”.">
        {F('vP', 'Prema · phone', P, '../wireframes/Value Prema.html')}
        {F('vD', 'Prema · desktop', W, '../wireframes/Value Prema.html')}
        {F('vS', 'Shanti · phone · discourses flag on', P, '../wireframes/Value Shanti.html?discourses=1')}
      </DCSection>
      <DCSection id="b" title="B · /about">
        {B('bP', 'Phone · EN', P, <window.B4About phone />)}
        {B('bH', 'Phone · हिंदी', P, <window.B4About phone l="hi" />)}
        {B('bD', 'Desktop 1280', W, <window.B4About />)}
      </DCSection>
      <DCSection id="c" title="C · /programs" subtitle="Wing tabs. Each card → /programs/[type].">
        {B('cP', 'Phone · EN', P, <window.B4Programs phone />)}
        {B('cH', 'Phone · हिंदी', P, <window.B4Programs phone l="hi" />)}
        {B('cD', 'Desktop 1280', W, <window.B4Programs />)}
      </DCSection>
      <DCSection id="d" title="D · /programs/[type] — eye camp" subtitle="Unknown values show “—”, never 0.">
        {B('dP', 'Phone · EN', P, <window.B4Program phone />)}
        {B('dD', 'Desktop 1280', W, <window.B4Program />)}
        {B('dV', 'What changes by type', 560, <window.B4ProgramVariants />)}
      </DCSection>
      <DCSection id="e" title="E · /join" subtitle="WhatsApp number as text, copy and QR — no form on this page.">
        {B('eP', 'Phone · EN', P, <window.B4Join phone />)}
        {B('eH', 'Phone · हिंदी', P, <window.B4Join phone l="hi" />)}
        {B('eD', 'Desktop 1280', W, <window.B4Join />)}
      </DCSection>
      <DCSection id="f" title="F · /centres/map" subtitle="Pincode or locality + district. No geolocation. Phone: list first.">
        {B('fP', 'Phone · list', P, <window.B4CentreMap phone />, ph)}
        {B('fM', 'Phone · map', P, <window.B4CentreMap phone showMap />, ph)}
        {B('fD', 'Desktop 1280', W, <window.B4CentreMap />)}
      </DCSection>
      <DCSection id="g" title="G · /districts/[slug] — East" subtitle="Age and gender allowed at district level. Under 5 → “fewer than 5”.">
        {B('gP', 'Phone · EN', P, <window.B4District phone />)}
        {B('gD', 'Desktop 1280', W, <window.B4District />)}
      </DCSection>
      <DCSection id="h" title="H · /news and /news/[slug]" subtitle="Migrated articles (2018, 2019) use the same card. Missing Hindi → “Available in English only”.">
        {B('nP', 'List · phone', P, <window.B4News phone />)}
        {B('nH', 'List · phone हिंदी', P, <window.B4News phone l="hi" />)}
        {B('nD', 'List · desktop', W, <window.B4News />)}
        {B('aP', 'Article · phone', P, <window.B4Article phone />)}
        {B('aH', 'Article · हिंदी (EN only)', P, <window.B4Article phone l="hi" />)}
        {B('aD', 'Article · desktop', W, <window.B4Article />)}
      </DCSection>
      <DCSection id="i" title="I · Error pages">
        {B('xM', 'Moved from old site · phone', P, <window.B4Error kind="moved" phone />, ph)}
        {B('xMh', 'Moved · हिंदी', P, <window.B4Error kind="moved" phone l="hi" />, ph)}
        {B('xMd', 'Moved · desktop', W, <window.B4Error kind="moved" />)}
        {B('x4', '404 · phone', P, <window.B4Error kind="404" phone />, ph)}
        {B('x5', '500 · phone', P, <window.B4Error kind="500" phone />, ph)}
      </DCSection>
    </DesignCanvas>
  );
}
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
})();
