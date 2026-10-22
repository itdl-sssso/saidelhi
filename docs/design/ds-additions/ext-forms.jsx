(() => {
const { Icon, Button, Select, Switch } = window.SSSSODelhiNCRDesignSystem_9ec6b9;
const tx = window.sxTx;

const MSG = {
  error: { cls: 'sx-t-error', icon: 'circle-x' },
  warning: { cls: 'sx-t-yellow', icon: 'triangle-alert' },
  check: { cls: 'sx-t-green', icon: 'circle-check' },
  info: { cls: 'sx-t-blue', icon: 'info' },
};
function FieldMessage({ type = 'error', children }) {
  const m = MSG[type];
  return <div className={'sx-msg ' + m.cls} role={type === 'error' ? 'alert' : 'status'}><span className="sx-ic"><Icon name={m.icon} size={16} /></span><span>{children}</span></div>;
}

function Field({ label, optional, help, message, children, lang = 'en', badge }) {
  return (
    <div className="sx-field">
      {label ? <span className="sx-field__lbl">{label}{optional ? <span className="sx-field__opt">{tx(lang, '(optional)', '(वैकल्पिक)')}</span> : null}{badge}</span> : null}
      {help ? <span className="sx-field__help">{help}</span> : null}
      {children}
      {message ? <FieldMessage type={message.type}>{message.text}</FieldMessage> : null}
    </div>
  );
}

function NumberStepper({ value, onChange, min = 0, max = 9999, label = 'count' }) {
  const set = v => onChange(Math.max(min, Math.min(max, isNaN(v) ? 0 : v)));
  return (
    <div className="sx-step">
      <button type="button" aria-label={'Decrease ' + label} disabled={value <= min} onClick={() => set(value - 1)}><Icon name="minus" size={20} /></button>
      <input inputMode="numeric" pattern="[0-9]*" aria-label={label} value={value} onChange={e => set(parseInt(e.target.value.replace(/\D/g, ''), 10))} />
      <button type="button" aria-label={'Increase ' + label} disabled={value >= max} onClick={() => set(value + 1)}><Icon name="plus" size={20} /></button>
    </div>
  );
}

function NumberInput({ value, onChange, state, suffix }) {
  return (
    <div className={'sx-ctl' + (state === 'error' ? ' sx-ctl--error' : state === 'warning' ? ' sx-ctl--warn' : '')} style={{ maxWidth: 200 }}>
      <input inputMode="numeric" pattern="[0-9]*" value={value} onChange={e => onChange && onChange(e.target.value.replace(/\D/g, ''))} style={{ fontVariantNumeric: 'tabular-nums' }} />
      {suffix ? <span className="sx-cap">{suffix}</span> : null}
    </div>
  );
}

function PickerField({ icon, value, readOnly, placeholder }) {
  return (
    <button type="button" className={'sx-ctl' + (readOnly ? ' sx-ctl--ro' : '')} disabled={readOnly} style={{ cursor: readOnly ? 'default' : 'pointer' }}>
      <span className="sx-ctl__ic"><Icon name={icon} size={18} /></span>
      <span style={{ flex: 1, color: value ? 'inherit' : 'var(--slate-500)' }}>{value || placeholder}</span>
      {readOnly ? <span className="sx-ctl__ic"><Icon name="lock" size={16} /></span> : <span className="sx-ctl__ic"><Icon name="chevron-down" size={16} /></span>}
    </button>
  );
}

function MultiSelect({ options, value, onChange }) {
  const toggle = o => onChange(value.includes(o) ? value.filter(v => v !== o) : [...value, o]);
  return (
    <div className="sx-chips" role="group">
      {options.map(o => (
        <button key={o} type="button" className="sx-chip" aria-pressed={value.includes(o)} onClick={() => toggle(o)}>
          {value.includes(o) ? <Icon name="check" size={16} /> : null}{o}
        </button>
      ))}
    </div>
  );
}

function YesNo({ value, onChange, lang = 'en' }) {
  return (
    <div className="sx-yn" role="radiogroup">
      <button type="button" role="radio" aria-checked={value === true} aria-pressed={value === true} onClick={() => onChange(true)}>{value === true ? <Icon name="check" size={18} /> : null}{tx(lang, 'Yes', 'हाँ')}</button>
      <button type="button" role="radio" aria-checked={value === false} aria-pressed={value === false} onClick={() => onChange(false)}>{value === false ? <Icon name="check" size={18} /> : null}{tx(lang, 'No', 'नहीं')}</button>
    </div>
  );
}

function TextCtl({ value, placeholder, onChange }) {
  return <div className="sx-ctl"><input value={value} placeholder={placeholder} onChange={e => onChange && onChange(e.target.value)} /></div>;
}

function Repeater({ rows, onAdd, onRemove, renderRow, itemLabel, addLabel, lang = 'en' }) {
  return (
    <div className="sx-col" style={{ gap: 12 }}>
      {rows.map((r, i) => (
        <div className="sx-rep" key={r.id}>
          <div className="sx-rep__hd">
            <span style={{ fontSize: 'var(--text-small)', fontWeight: 600, color: 'var(--slate-800)' }}>{itemLabel} {i + 1}</span>
            <button className="sx-icbtn" type="button" aria-label={tx(lang, 'Remove', 'हटाएँ') + ' ' + itemLabel + ' ' + (i + 1)} onClick={() => onRemove(r.id)}><Icon name="trash-2" size={18} /></button>
          </div>
          <div className="sx-rep__bd">{renderRow(r, i)}</div>
        </div>
      ))}
      <div><Button variant="outline" icon="plus" onClick={onAdd}>{addLabel}</Button></div>
    </div>
  );
}

function Upload({ lang = 'en', file, onPick, onRemove }) {
  if (file) return (
    <div className="sx-file">
      <span className="sx-file__th"><Icon name="image" size={20} /></span>
      <div className="sx-col" style={{ gap: 2, flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 'var(--text-small)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file}</span>
        <span className="sx-cap" style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}><Icon name="lock" size={16} />{tx(lang, 'Private · never published', 'निजी · कभी प्रकाशित नहीं')}</span>
      </div>
      <button className="sx-icbtn" type="button" aria-label={tx(lang, 'Remove photo', 'फ़ोटो हटाएँ')} onClick={onRemove}><Icon name="x" size={18} /></button>
    </div>
  );
  return (
    <button type="button" className="sx-drop" onClick={onPick}>
      <span style={{ color: 'var(--blue-600)' }}><Icon name="camera" size={24} /></span>
      <span style={{ fontSize: 'var(--text-small)', fontWeight: 600, color: 'var(--slate-800)' }}>{tx(lang, 'Take a photo or choose a file', 'फ़ोटो लें या फ़ाइल चुनें')}</span>
      <span className="sx-cap">{tx(lang, 'JPG, PNG or PDF, up to 10 MB', 'JPG, PNG या PDF, 10 MB तक')}</span>
    </button>
  );
}

function OtpInput({ length = 6, error, onComplete, lang = 'en' }) {
  const [v, setV] = React.useState(Array(length).fill(''));
  const refs = React.useRef([]);
  const put = (i, ch) => {
    const digits = ch.replace(/\D/g, '');
    if (!digits && ch !== '') return;
    const n = [...v];
    if (digits.length > 1) { digits.slice(0, length - i).split('').forEach((d, k) => { n[i + k] = d; }); }
    else n[i] = digits;
    setV(n);
    const next = Math.min(i + Math.max(digits.length, 1), length - 1);
    if (digits) refs.current[next] && refs.current[next].focus();
    if (n.every(Boolean) && onComplete) onComplete(n.join(''));
  };
  return (
    <div className={'sx-otp' + (error ? ' sx-otp--error' : '')} role="group" aria-label={tx(lang, '6-digit code', '6 अंकों का कोड')}>
      {v.map((d, i) => (
        <input key={i} ref={el => (refs.current[i] = el)} inputMode="numeric" autoComplete={i === 0 ? 'one-time-code' : 'off'} maxLength={length} value={d}
          aria-label={tx(lang, 'Digit', 'अंक') + ' ' + (i + 1)}
          onChange={e => put(i, e.target.value)}
          onKeyDown={e => { if (e.key === 'Backspace' && !v[i] && i > 0) refs.current[i - 1].focus(); }} />
      ))}
    </div>
  );
}

Object.assign(window, { FieldMessage, Field, NumberStepper, NumberInput, PickerField, MultiSelect, YesNo, TextCtl, Repeater, Upload, OtpInput });
})();
