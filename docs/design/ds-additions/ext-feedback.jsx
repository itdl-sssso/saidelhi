(() => {
const { Icon, Button } = window.SSSSODelhiNCRDesignSystem_9ec6b9;
const tx = window.sxTx;

// steps: [{label, meta, state:'done'|'current'|'upcoming'}], branch: {after:index, label, meta}
function Timeline({ steps, branch, orientation = 'horizontal' }) {
  const dotIcon = s => (s.state === 'done' ? 'check' : s.state === 'current' ? 'circle-dot' : 'circle');
  if (orientation === 'vertical') {
    const items = [];
    steps.forEach((s, i) => {
      items.push(
        <li key={i} className={`sx-vtl__step sx-tl__step--${s.state}`}>
          <span className="sx-tl__dot"><Icon name={dotIcon(s)} size={16} /></span>
          <div className="sx-col" style={{ gap: 2, paddingTop: 5 }}><span className="sx-tl__t">{s.label}</span>{s.meta ? <span className="sx-tl__m">{s.meta}</span> : null}</div>
        </li>
      );
      if (branch && branch.after === i) items.push(
        <li key={'b' + i} className="sx-vtl__step sx-vtl__step--branch sx-tl__step--branch">
          <span className="sx-tl__dot"><Icon name="corner-down-right" size={16} /></span>
          <div className="sx-col" style={{ gap: 2, paddingTop: 5 }}><span className="sx-tl__t" style={{ color: 'var(--signal-alert-text)' }}>{branch.label}</span><span className="sx-tl__m">{branch.meta}</span></div>
        </li>
      );
    });
    return <ol className="sx-vtl" style={{ margin: 0, padding: 0, listStyle: 'none' }}>{items}</ol>;
  }
  return (
    <ol className="sx-tl" style={{ margin: 0, padding: 0, listStyle: 'none' }}>
      {steps.map((s, i) => (
        <li key={i} className={`sx-tl__step sx-tl__step--${s.state}`}>
          <span className="sx-tl__dot"><Icon name={dotIcon(s)} size={16} /></span>
          <span className="sx-tl__t">{s.label}</span>
          {s.meta ? <span className="sx-tl__m">{s.meta}</span> : null}
          {branch && branch.after === i ? (
            <div className="sx-tl__br sx-tl__step--branch">
              <span className="sx-tl__dot" style={{ width: 28, height: 28, marginLeft: -31, marginTop: -4 }}><Icon name="corner-down-right" size={16} /></span>
              <div className="sx-col" style={{ gap: 2 }}><span className="sx-tl__t" style={{ color: 'var(--signal-alert-text)' }}>{branch.label}</span><span className="sx-tl__m">{branch.meta}</span></div>
            </div>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

function NumberedStepper({ steps, current }) {
  return (
    <ol className="sx-nstep" style={{ margin: 0, padding: 0 }}>
      {steps.map((s, i) => (
        <li key={s} data-s={i < current ? 'done' : i === current ? 'current' : 'upcoming'} aria-current={i === current ? 'step' : undefined}>
          <b>{i < current ? <Icon name="check" size={16} /> : i + 1}</b>{s}
        </li>
      ))}
    </ol>
  );
}

const TOAST = {
  success: { cls: 'sx-t-green', icon: 'check' },
  info: { cls: 'sx-t-blue', icon: 'info' },
  error: { cls: 'sx-t-error', icon: 'x' },
  offline: { cls: 'sx-t-yellow', icon: 'wifi-off' },
};
function Toast({ tone = 'success', children, action, onAction, onClose, lang = 'en' }) {
  const t = TOAST[tone];
  return (
    <div className="sx-toast" role="status" aria-live="polite">
      <span className={'sx-toast__ic ' + t.cls}><Icon name={t.icon} size={16} /></span>
      <span style={{ flex: 1, paddingTop: 3, color: 'var(--slate-800)' }}>{children}</span>
      {action ? <button className="sx-toast__act" onClick={onAction}>{action}</button> : null}
      {onClose ? <button className="sx-icbtn" style={{ margin: '-10px 0' }} aria-label={tx(lang, 'Dismiss', 'हटाएँ')} onClick={onClose}><Icon name="x" size={18} /></button> : null}
    </div>
  );
}

function EmptyState({ icon = 'sun', title, body, action }) {
  return (
    <div className="sx-empty">
      <span className="sx-empty__ic"><Icon name={icon} size={24} /></span>
      <h3 className="sx-h3">{title}</h3>
      {body ? <p>{body}</p> : null}
      {action ? <div style={{ marginTop: 6 }}>{action}</div> : null}
    </div>
  );
}

// Static: the system has no autoplaying motion, so skeletons do not shimmer.
function Skeleton({ w = '100%', h = 14, r = 6, style }) {
  return <span className="sx-sk" aria-hidden="true" style={{ display: 'block', width: w, height: h, borderRadius: r, ...style }}></span>;
}
function SkeletonKpi() {
  return (
    <div className="sx-kpi" aria-busy="true" aria-label="Loading">
      <Skeleton w="60%" /><Skeleton w="45%" h={34} r={8} /><div className="sx-kpi__foot"><Skeleton w="35%" h={12} /><Skeleton w={96} h={28} /></div>
    </div>
  );
}
function SkeletonRows({ n = 4 }) {
  return (
    <div className="sx-tbl-wrap" aria-busy="true" aria-label="Loading">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '64px 1fr 120px 110px', gap: 16, alignItems: 'center', padding: '14px 16px', borderBottom: i < n - 1 ? '1px solid var(--border-subtle)' : 0 }}>
          <Skeleton h={12} /><div className="sx-col" style={{ gap: 6 }}><Skeleton w={`${70 - i * 8}%`} /><Skeleton w="40%" h={10} /></div><Skeleton h={12} /><Skeleton h={26} r={999} />
        </div>
      ))}
    </div>
  );
}

function SideSheet({ open, title, onClose, children, footer, lang = 'en', bottom }) {
  if (!open) return null;
  return (
    <>
      <div className="sx-scrim" onClick={onClose}></div>
      <aside className={bottom ? 'sx-bsheet' : 'sx-sheet'} role="dialog" aria-modal="true" aria-label={title}>
        {bottom ? <div className="sx-bsheet__grab"></div> : null}
        <div className="sx-sheet__hd" style={bottom ? { borderBottom: 0, paddingTop: 0 } : null}><h3 className="sx-h3">{title}</h3><button className="sx-icbtn" aria-label={tx(lang, 'Close', 'बंद करें')} onClick={onClose}><Icon name="x" size={20} /></button></div>
        <div className="sx-sheet__bd">{children}</div>
        {footer ? <div className="sx-sheet__ft">{footer}</div> : null}
      </aside>
    </>
  );
}

// Printable A4 QR poster. Always bilingual: it hangs at a desk where both languages are read.
function QrPoster({ event, purpose, centrePhone }) {
  return (
    <div className="sx-a4" lang="en">
      <div className="sx-a4__rule"></div>
      <div className="sx-a4__in">
        <div style={{ display: 'flex', alignItems: 'center', gap: '3cqw' }}>
          <span className="sx-ring" style={{ width: '10cqw', height: '10cqw' }}></span>
          <span style={{ fontFamily: 'var(--font-serif-display)', fontSize: '4cqw', color: 'var(--text-heading)' }}>SSSSO Delhi NCR</span>
        </div>
        <div><h2>{purpose.en}</h2><h2 lang="hi" style={{ fontSize: '6cqw', color: 'var(--slate-700)' }}>{purpose.hi}</h2></div>
        <div className="sx-a4__qr">QR code<br />generated at print</div>
        <div className="sx-a4__ev"><strong style={{ display: 'block', fontWeight: 600 }}>{event.title}</strong>{event.date} · {event.venue}<br />{event.samithi}</div>
        <p>1. Scan with your phone camera. 2. Enter your WhatsApp number. 3. Fill the form — it saves on your phone if signal drops.</p>
        <p lang="hi">1. फ़ोन कैमरे से स्कैन करें। 2. अपना व्हाट्सऐप नंबर डालें। 3. फ़ॉर्म भरें — सिग्नल जाने पर भी फ़ोन में सहेजा रहता है।</p>
        <span style={{ flex: 1 }}></span>
        <p style={{ fontSize: '2.8cqw', color: 'var(--slate-500)', borderTop: '1px solid var(--border-subtle)', paddingTop: '2.4cqw' }}>Centre contact / केंद्र संपर्क: {centrePhone} · All activities are free and open to people of every faith.</p>
      </div>
    </div>
  );
}

Object.assign(window, { Timeline, NumberedStepper, Toast, EmptyState, Skeleton, SkeletonKpi, SkeletonRows, SideSheet, QrPoster });
})();
