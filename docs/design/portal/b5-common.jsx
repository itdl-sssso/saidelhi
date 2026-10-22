(() => {
const { Icon, Switch } = window.SSSSODelhiNCRDesignSystem_9ec6b9;

// Static table. cols: [label, {num, w}] ; rows: arrays of cells
function T({ cols, rows, tools, foot, dense }) {
  return (
    <div className="sx-tbl-wrap">
      {tools ? <div className="sx-tbl-tools">{tools}</div> : null}
      <div className="sx-tbl-scroll">
        <table className={'sx-tbl' + (dense ? ' b5-dense' : '')}>
          <thead><tr>{cols.map((c, i) => { const [l, o = {}] = Array.isArray(c) ? c : [c]; return <th key={i} className={o.num ? 'sx-num' : ''} style={o.w ? { width: o.w } : null}>{l}</th>; })}</tr></thead>
          <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => { const o = (Array.isArray(cols[j]) && cols[j][1]) || {}; return <td key={j} className={o.num ? 'sx-num' : ''}>{c}</td>; })}</tr>)}</tbody>
        </table>
      </div>
      {foot ? <div className="b5-tfoot">{foot}</div> : null}
    </div>
  );
}
const Tabs = ({ items, on = 0, full }) => <div className={'pt-tabs b3-tabs-scroll' + (full ? ' pt-tabs--full' : '')} role="tablist">{items.map((n, i) => { const [l, c] = Array.isArray(n) ? n : [n]; return <button key={l} role="tab" aria-pressed={i === on}>{l}{c != null ? <span className="sx-cap">{c}</span> : null}</button>; })}</div>;
const Pill = ({ tone = 'slate', icon, children }) => <span className={'sx-pill sx-t-' + tone}>{icon ? <Icon name={icon} size={16} /> : null}{children}</span>;
const Lang = ({ en = true, hi = true }) => <span className="b5-lang"><span className={en ? 'is-ok' : 'is-no'}>EN{en ? <Icon name="check" size={16} /> : '—'}</span><span className={hi ? 'is-ok' : 'is-no'}>HI{hi ? <Icon name="check" size={16} /> : '—'}</span></span>;
const Sel = ({ k, v }) => <button className="pt-sel">{k}: <b>{v}</b><Icon name="chevron-down" size={16} /></button>;
const Note = ({ icon = 'info', children, tone }) => <span className={'b5-note' + (tone ? ' b5-note--' + tone : '')}><Icon name={icon} size={16} />{children}</span>;
const Mono = ({ children }) => <span className="b5-mono">{children}</span>;
function TogRow({ label, desc, on, children, locked }) {
  return <div className="b5-tog"><div className="sx-col" style={{ gap: 2, minWidth: 0, flex: 1 }}><b>{label}</b>{desc ? <span className="sx-cap">{desc}</span> : null}{children}</div>{locked ? <Pill icon="lock">{locked}</Pill> : <Switch label="" aria-label={label} defaultOn={on} />}</div>;
}
const Restricted = ({ children }) => <div className="b5-restr" role="note"><Icon name="lock" size={20} /><div className="sx-col" style={{ gap: 2 }}><b>Personal data. Every view is logged.</b><span>{children}</span></div></div>;

Object.assign(window, { B5T: T, B5Tabs: Tabs, B5Pill: Pill, B5Lang: Lang, B5Sel: Sel, B5Note: Note, B5Mono: Mono, B5Tog: TogRow, B5Restricted: Restricted });
})();
