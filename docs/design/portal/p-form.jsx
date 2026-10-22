(() => {
const { Icon, Button } = window.SSSSODelhiNCRDesignSystem_9ec6b9;
const { Step, Field, FieldMessage, PickerField, NumberInput, YesNo, Upload, PersonalDataBadge } = window;
const t = (l, en, hi) => (l === 'hi' ? hi : en);

const SECS = [
  ['About the camp', 'कैंप के बारे में'], ['People', 'लोग'], ['Spectacles', 'चश्मे'], ['Cataract', 'मोतियाबिंद'],
  ['Register photo', 'रजिस्टर की फ़ोटो'], ['Follow-up list', 'फ़ॉलो-अप सूची'], ['Notes', 'टिप्पणी'], ['Review and send', 'जाँचें और भेजें'],
];

function FormShell({ lang: l0 = 'en', wide, children, save, progress = 3, foot = true }) {
  const [l, setL] = React.useState(l0);
  const saveTxt = save || t(l, 'Saved on this phone · Not sent yet', 'इस फ़ोन में सहेजा · अभी भेजा नहीं');
  return (
    <div className={'sx' + (wide ? '' : ' sx-phone pt-phone')} lang={l} style={wide ? { background: 'var(--surface-page)', minHeight: '100%' } : null}>
      {wide ? null : <div className="sx-phone__status"><span>9:41</span><span style={{ display: 'inline-flex', gap: 6 }}><Icon name="signal" size={16} /><Icon name="battery-medium" size={16} /></span></div>}
      <div style={wide ? { maxWidth: 720, margin: '0 auto', borderLeft: '1px solid var(--border-subtle)', borderRight: '1px solid var(--border-subtle)', background: 'var(--surface-page)', minHeight: '100%', display: 'flex', flexDirection: 'column' } : { display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div className="pt-fhd">
          <div className="pt-fhd__row">
            <span className="sx-ring" aria-label="Emblem placeholder" style={{ width: 32, height: 32 }}></span>
            <span className="pt-fhd__t">{t(l, 'Eye camp report', 'नेत्र कैंप रिपोर्ट')}<span className="sx-cap" style={{ display: 'block', fontFamily: 'var(--font-sans-body)' }}>{t(l, 'Mayur Vihar · 17 Oct 2026', 'मयूर विहार · 17 अक्टूबर 2026')}</span></span>
            <window.LangToggle value={l} onChange={setL} />
          </div>
          <span className="pt-save"><Icon name="smartphone" size={16} />{saveTxt}</span>
        </div>
        {progress != null ? (
          <div className="pt-prog">
            <div className="pt-prog__lbl"><span>{t(l, `Step ${progress} of 8`, `चरण ${progress} / 8`)} · <b style={{ fontWeight: 600, color: 'var(--slate-900)' }}>{t(l, ...SECS[progress - 1])}</b></span><span>{Math.round(((progress - 1) / 8) * 100)}%</span></div>
            <div className="pt-prog__bar"><i style={{ width: `${((progress - 1) / 8) * 100}%` }}></i></div>
          </div>
        ) : null}
        <div className="pt-pbody" style={wide ? { padding: 24 } : null}>{typeof children === 'function' ? children(l) : children}</div>
        {foot ? (
          <div className="pt-fbar" style={wide ? { padding: '12px 24px' } : null}>
            <Button variant="outline" icon="chevron-left">{t(l, 'Back', 'पीछे')}</Button>
            <Button variant="primary" iconAfter="chevron-right" fullWidth>{t(l, 'Next: Cataract', 'आगे: मोतियाबिंद')}</Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Sec({ n, s, title, children, right }) {
  return (
    <section className="pt-fsec">
      <header className="pt-fsec__hd"><span className="pt-fsec__n" data-s={s}>{s === 'done' ? <Icon name="check" size={16} /> : n}</span><h2 className="pt-fsec__t" style={{ margin: 0 }}>{title}</h2>{right}</header>
      {children ? <div className="pt-fsec__bd">{children}</div> : null}
    </section>
  );
}

function Done({ l, n, i, summary }) {
  return <Sec n={n} s="done" title={t(l, ...SECS[i])} right={<button className="pt-why" style={{ minHeight: 44 }}>{t(l, 'Edit', 'बदलें')}</button>}>{summary ? <span className="sx-cap" style={{ marginTop: -6 }}>{summary}</span> : null}</Sec>;
}

function FormBody({ l }) {
  const POW = [['+1.0', 12], ['+1.5', 10], ['+2.0', 20], ['+2.5', 14], ['+3.0', 7]];
  return (
    <>
      <Sec n={1} s="done" title={t(l, ...SECS[0])}>
        <div className="pt-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <Field label={t(l, 'Samithi', 'समिति')} lang={l}><PickerField icon="home" value={t(l, 'Mayur Vihar', 'मयूर विहार')} readOnly /></Field>
          <Field label={t(l, 'Date', 'तारीख़')} lang={l}><PickerField icon="calendar-days" value={t(l, '17 Oct 2026', '17 अक्टू 2026')} readOnly /></Field>
        </div>
        <span className="sx-cap" style={{ marginTop: -8 }}>{t(l, 'Set by your coordinator when the plan was approved.', 'योजना स्वीकृत होने पर समन्वयक ने तय किया।')}</span>
        <Field label={t(l, 'Venue', 'स्थान')} lang={l}><PickerField icon="map-pin" value={t(l, 'Dr. Ambedkar Bhawan, Mayur Vihar Ph-1', 'डॉ. अंबेडकर भवन, मयूर विहार फ़ेज़-1')} /></Field>
        <Field label={t(l, 'Partner', 'साझेदार')} optional lang={l}><PickerField icon="handshake" value="ICARE Eye Hospital" /></Field>
        <div className="pt-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <Field label={t(l, 'Sevadals', 'सेवादल')} lang={l}><Step v={18} label="sevadals" /></Field>
          <Field label={t(l, 'Volunteer hours', 'सेवा घंटे')} lang={l}><Step v={126} label="hours" /></Field>
        </div>
      </Sec>
      <Done l={l} n={2} i={1} summary={t(l, '115 screened · 49 male · 66 female · 9 under 18', '115 जाँचे गए · 49 पुरुष · 66 महिला · 9 18 से कम')} />
      <Sec n={3} s="current" title={t(l, ...SECS[2])}>
        <Field label={t(l, 'Spectacles given in total', 'कुल दिए गए चश्मे')} lang={l}><Step v={63} label="spectacles" /></Field>
        <div className="sx-col" style={{ gap: 10 }}>
          <span className="sx-field__lbl">{t(l, 'By power', 'नंबर के अनुसार')}</span>
          {POW.map(([p, v]) => <div className="pt-pow" key={p}><span className="pt-pow__l">{p}</span><Step v={v} label={'power ' + p} /></div>)}
          <FieldMessage type="check">{t(l, '63 of 63 counted — matches the total.', '63 में से 63 गिने गए — कुल से मेल खाता है।')}</FieldMessage>
        </div>
      </Sec>
      <Sec n={4} title={t(l, ...SECS[3])}>
        <div className="pt-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <Field label={t(l, 'Found', 'पाए गए')} lang={l}><NumberInput value="13" /></Field>
          <Field label={t(l, 'Referred', 'रेफ़र किए')} lang={l}><NumberInput value="13" /></Field>
        </div>
        <span className="sx-cap" style={{ marginTop: -8 }}>{t(l, 'Referred can’t be more than found.', 'रेफ़र, पाए गए से ज़्यादा नहीं हो सकते।')}</span>
        <Field label={t(l, 'Surgeries done', 'हुई सर्जरी')} optional help={t(l, 'Fill when known — you can come back to this.', 'पता चलने पर भरें — बाद में लौट सकते हैं।')} lang={l}><NumberInput value="" /></Field>
      </Sec>
      <Sec n={5} title={t(l, ...SECS[4])}>
        <Upload lang={l} file="register-17oct-p1.jpg" />
        <span className="sx-cap" style={{ display: 'inline-flex', gap: 6, alignItems: 'flex-start' }}><Icon name="eye-off" size={16} />{t(l, 'ID numbers on the register are never read or stored.', 'रजिस्टर पर लिखे पहचान नंबर कभी पढ़े या रखे नहीं जाते।')}</span>
      </Sec>
      <Sec n={6} title={t(l, ...SECS[5])} right={<PersonalDataBadge lang={l} />}>
        <div className="pt-consent"><span className="pt-cbx"><Icon name="check" size={16} /></span><span>{t(l, 'Each person below agreed to be contacted for follow-up care.', 'नीचे दिए हर व्यक्ति ने फ़ॉलो-अप के लिए संपर्क की सहमति दी है।')}</span></div>
        <div className="sx-rep">
          <div className="sx-rep__hd"><span style={{ fontSize: 'var(--text-small)', fontWeight: 600 }}>{t(l, 'Person 1', 'व्यक्ति 1')}</span><button className="sx-icbtn" aria-label="Remove"><Icon name="trash-2" size={18} /></button></div>
          <div className="sx-rep__bd" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div style={{ gridColumn: '1/-1' }}><Field label={t(l, 'Name', 'नाम')} lang={l}><window.TextCtl value="Patient A" /></Field></div>
            <Field label={t(l, 'Age', 'उम्र')} lang={l}><NumberInput value="64" /></Field>
            <Field label={t(l, 'Gender', 'लिंग')} lang={l}><PickerField icon="user" value={t(l, 'Female', 'महिला')} /></Field>
            <div style={{ gridColumn: '1/-1' }}><Field label={t(l, 'Phone', 'फ़ोन')} lang={l}><window.TextCtl value="+91 98•••••19" /></Field></div>
            <div style={{ gridColumn: '1/-1' }}><Field label={t(l, 'Locality', 'इलाक़ा')} lang={l}><window.TextCtl value="Trilokpuri" /></Field></div>
          </div>
        </div>
        <Button variant="outline" icon="plus">{t(l, 'Add person', 'व्यक्ति जोड़ें')}</Button>
        <span className="sx-cap">{t(l, 'Only name, age, gender, phone and locality. Never ID numbers.', 'केवल नाम, उम्र, लिंग, फ़ोन और इलाक़ा। पहचान नंबर कभी नहीं।')}</span>
      </Sec>
      <Sec n={7} title={t(l, ...SECS[6])}><div className="pt-ta">{t(l, 'Anything the district should know', 'ज़िले को कुछ बताना हो तो')}</div></Sec>
      <Sec n={8} title={t(l, ...SECS[7])}>
        <span className="sx-cap" style={{ marginTop: -6 }}>{t(l, 'Check everything once, then send. You can edit until the district approves it.', 'एक बार सब जाँच लें, फिर भेजें। ज़िले की स्वीकृति तक बदल सकते हैं।')}</span>
        <Button variant="primary" icon="send" fullWidth disabled>{t(l, 'Send report', 'रिपोर्ट भेजें')}</Button>
      </Sec>
    </>
  );
}

const FormPhone = ({ lang = 'en' }) => <FormShell lang={lang}>{l => <FormBody l={l} />}</FormShell>;
const FormDesk = () => <FormShell wide>{l => <FormBody l={l} />}</FormShell>;

function FormOffline() {
  return (
    <FormShell save="Saved on this phone · Will send when online" progress={8} foot={false}>
      <window.Toast tone="offline">No signal. Your report is saved on this phone and will send by itself when you’re back online.</window.Toast>
      <section className="pt-fsec"><div className="pt-fsec__bd">
        <h2 className="pt-fsec__t" style={{ margin: 0 }}>Waiting to send</h2>
        <div className="sx-file"><span className="sx-file__th"><Icon name="cloud-off" size={20} /></span><div className="sx-col" style={{ gap: 2, flex: 1 }}><span style={{ fontSize: 'var(--text-small)', fontWeight: 500 }}>Eye camp report · 17 Oct</span><span className="sx-cap">Queued 18 Oct, 8:44 PM · 1 photo</span></div></div>
        <span className="sx-cap">Keep this page or the app open if you can. Closing it is fine too — it will try again next time you open the link.</span>
        <Button variant="outline" icon="refresh-cw" fullWidth>Try now</Button>
      </div></section>
    </FormShell>
  );
}

function FormExpired() {
  return (
    <FormShell save="Saved on this phone · Not sent yet" progress={null} foot={false}>
      <section className="pt-fsec"><div className="pt-fsec__bd">
        <span className="pt-need__ic sx-t-blue" style={{ width: 48, height: 48 }}><Icon name="shield-check" size={20} /></span>
        <h2 className="pt-fsec__t" style={{ margin: 0 }}>Confirm it’s you</h2>
        <p className="pt-sub">For safety, we ask again after 30 minutes. We sent a 6-digit code to WhatsApp on +91 98•••••52.</p>
        <window.OtpInput />
        <FieldMessage type="check">Your answers are kept on this phone. Nothing is lost.</FieldMessage>
        <Button variant="primary" fullWidth>Continue</Button>
        <Button variant="ghost" icon="send">Send the code again</Button>
      </div></section>
    </FormShell>
  );
}

function FormSent() {
  return (
    <FormShell save="Sent 18 Oct, 8:47 PM" progress={null} foot={false}>
      <section className="pt-fsec"><div className="pt-fsec__bd">
        <span className="pt-need__ic sx-t-green" style={{ width: 48, height: 48 }}><Icon name="circle-check" size={20} /></span>
        <h2 className="pt-fsec__t" style={{ margin: 0 }}>Report already sent</h2>
        <p className="pt-sub">Thank you. The East district coordinator will review it. You can still make changes until it is approved.</p>
        <window.StatusPill status="report_submitted" />
        <dl className="pt-dl"><dt>People screened</dt><dd>115</dd><dt>Spectacles given</dt><dd>63</dd><dt>Cataract referred</dt><dd>13</dd></dl>
        <Button variant="outline" icon="pencil" fullWidth>Edit report</Button>
      </div></section>
    </FormShell>
  );
}

Object.assign(window, { FormPhone, FormDesk, FormOffline, FormExpired, FormSent });
})();
