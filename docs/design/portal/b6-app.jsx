(() => {
const { DesignCanvas, DCSection, DCArtboard } = window;
const P = 375, W = 1280, M = 760;
const Frozen = React.memo(({ el }) => el, () => true);
function App() {
  const [H, setHs] = React.useState({});
  const pend = React.useRef({}), tmr = React.useRef(0);
  const set = React.useCallback((id, h) => { pend.current[id] = h; clearTimeout(tmr.current); tmr.current = setTimeout(() => { const p = pend.current; pend.current = {}; setHs(s => { let ch = false; const n = { ...s }; for (const k in p) if (Math.abs((s[k] || 0) - p[k]) > 1) { n[k] = p[k]; ch = true; } return ch ? n : s; }); }, 120); }, []);
  const B = (id, label, w, el, min = 0, fixed) => <DCArtboard key={id} id={id} label={label} width={w} height={fixed || Math.max(min, H[id] || 600)}>{fixed ? el : <window.B3Fit id={id} set={set} min={min}><Frozen el={el} /></window.B3Fit>}</DCArtboard>;
  const part = window.B6_PART || '';
  const S = (id, el) => (!part || part.split(',').includes(id)) ? el : null;
  return (
    <DesignCanvas>
      {S('b6a', <DCSection id="b6a" title="A · /discourses" subtitle="Flag: discourses. Youth 16–30. 14 theme chips, search, cards with “why it matters”, featured shareable quote.">
        {B('b6a1', 'Desktop · EN', W, <window.Discourses />)}
        {B('b6a2', 'Desktop · हिंदी', W, <window.Discourses l="hi" />)}
        {B('b6a3', 'Phone · EN', P, <window.Discourses phone />)}
        {B('b6a4', 'Phone · हिंदी', P, <window.Discourses phone l="hi" />)}
      </DCSection>)}
      {S('b6b', <DCSection id="b6b" title="B · /discourses/[slug]" subtitle="66ch reading, pull quotes, Telugu poem set apart. Body text is placeholder until the Trust’s approved text is in.">
        {B('b6b1', 'Desktop · EN', W, <window.Reader />)}
        {B('b6b2', 'Desktop · side by side', W, <window.Reader side />)}
        {B('b6b3', 'Phone · हिंदी', P, <window.Reader phone l="hi" />)}
        {B('b6b4', 'Share image · 1080 EN', 1080, <window.QuoteImage />, 0, 1080)}
        {B('b6b5', 'Share image · 1080 HI', 1080, <window.QuoteImage l="hi" />, 0, 1080)}
        {B('b6b6', 'Report a correction', M, <window.CorrectionDialog />)}
      </DCSection>)}
      {S('b6c', <DCSection id="b6c" title="C · /admin/discourses" subtitle="State admin + translators. Publish disabled until permission is granted.">
        {B('b6c1', 'Shortlist', W, <window.DiscList />)}
        {B('b6c2', 'Editor · aligned paragraphs + glossary', 1440, <window.DiscEditor />)}
        {B('b6c3', 'Quote card maker', W, <window.QuoteMaker />)}
      </DCSection>)}
    </DesignCanvas>
  );
}
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
})();
