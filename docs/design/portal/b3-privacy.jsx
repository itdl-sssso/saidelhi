(() => {
const { Icon, Button, Input, Select } = window.SSSSODelhiNCRDesignSystem_9ec6b9;
const t = window.b3t;

const SHORT = [
  ['Most of what we publish is counts — how many people came, never who.', 'हम जो प्रकाशित करते हैं वह ज़्यादातर गिनती है — कितने लोग आए, कौन आया यह कभी नहीं।'],
  ['We collect personal details only where care needs them, such as a cataract follow-up or a volunteer sign-up.', 'व्यक्तिगत जानकारी हम तभी लेते हैं जब देखभाल के लिए ज़रूरी हो, जैसे मोतियाबिंद फ़ॉलो-अप या स्वयंसेवक पंजीकरण।'],
  ['We never ask for Aadhaar or any other ID number.', 'हम कभी आधार या कोई अन्य पहचान नंबर नहीं माँगते।'],
  ['Only the few people who need your details can see them, and every view is recorded.', 'आपकी जानकारी केवल वही कुछ लोग देख सकते हैं जिन्हें ज़रूरत है, और हर बार देखना दर्ज होता है।'],
  ['You can ask to see, correct or delete your details at any time.', 'आप कभी भी अपनी जानकारी देखने, ठीक करने या हटाने के लिए कह सकते हैं।'],
];
const SIT = [
  { ic: 'stethoscope', h: ['At a camp', 'कैंप में'], k: ['Counts only: how many came, age group and gender. No names.', 'केवल गिनती: कितने आए, आयु वर्ग और लिंग। नाम नहीं।'], w: ['Coordinators see totals.', 'समन्वयक केवल कुल संख्या देखते हैं।'] },
  { ic: 'heart-pulse', h: ['Cataract follow-up', 'मोतियाबिंद फ़ॉलो-अप'], k: ['Name, age, gender, phone and locality — only if you agree, to arrange surgery.', 'नाम, उम्र, लिंग, फ़ोन और इलाक़ा — केवल आपकी सहमति से, सर्जरी की व्यवस्था के लिए।'], w: ['Our follow-up officer and the partner hospital.', 'हमारे फ़ॉलो-अप अधिकारी और साझेदार अस्पताल।'] },
  { ic: 'hand-heart', h: ['Volunteering', 'स्वयंसेवा'], k: ['Name, phone, district and the hours you can give.', 'नाम, फ़ोन, ज़िला और आप कितने घंटे दे सकते हैं।'], w: ['Your centre’s coordinator.', 'आपके केंद्र के समन्वयक।'] },
  { ic: 'message-circle', h: ['WhatsApp updates', 'व्हाट्सऐप संदेश'], k: ['Your phone number and language. Reply STOP any time.', 'आपका फ़ोन नंबर और भाषा। कभी भी STOP लिखें।'], w: ['No one reads it; messages are sent automatically.', 'कोई इसे पढ़ता नहीं; संदेश अपने-आप जाते हैं।'] },
  { ic: 'globe', h: ['This website', 'यह वेबसाइट'], k: ['No cookies, no tracking, no ads. We count visits without knowing who you are.', 'कोई कुकी नहीं, कोई ट्रैकिंग नहीं, कोई विज्ञापन नहीं। हम बिना जाने कि आप कौन हैं, विज़िट गिनते हैं।'], w: ['No one — there is nothing personal to see.', 'कोई नहीं — देखने को कुछ व्यक्तिगत नहीं है।'] },
];
const RET = [
  [['Camp counts', 'कैंप की गिनती'], ['Kept as totals', 'कुल संख्या के रूप में रखी जाती है'], ['Never personal', 'कभी व्यक्तिगत नहीं']],
  [['Cataract follow-up list', 'मोतियाबिंद फ़ॉलो-अप सूची'], ['Until surgery, plus 90 days', 'सर्जरी तक, फिर 90 दिन'], ['Deleted; the count is kept', 'हटा दी जाती है; गिनती रहती है']],
  [['Camp register photos', 'कैंप रजिस्टर की फ़ोटो'], ['30 days after the report is approved', 'रिपोर्ट स्वीकृत होने के 30 दिन बाद तक'], ['Deleted', 'हटा दी जाती हैं']],
  [['Volunteer sign-up', 'स्वयंसेवक पंजीकरण'], ['1 year after your last seva', 'आपकी आख़िरी सेवा के 1 साल बाद तक'], ['Deleted', 'हटा दिया जाता है']],
  [['WhatsApp opt-in', 'व्हाट्सऐप सहमति'], ['Until you reply STOP', 'जब तक आप STOP न लिखें'], ['Deleted within 7 days', '7 दिन में हटा दी जाती है']],
  [['Website visits', 'वेबसाइट विज़िट'], ['Counts only', 'केवल गिनती'], ['Nothing personal kept', 'कुछ व्यक्तिगत नहीं रखा जाता']],
];
const RIGHTS = [
  ['eye', ['See', 'देखें'], ['Ask what we hold about you.', 'पूछें कि आपके बारे में हमारे पास क्या है।']],
  ['pencil', ['Correct', 'ठीक करें'], ['Fix anything that is wrong.', 'जो ग़लत है उसे ठीक करवाएँ।']],
  ['trash-2', ['Delete', 'हटाएँ'], ['Ask us to remove your details.', 'अपनी जानकारी हटाने को कहें।']],
  ['undo-2', ['Withdraw consent', 'सहमति वापस लें'], ['Stop follow-up or messages at any time.', 'कभी भी फ़ॉलो-अप या संदेश बंद करें।']],
];

function Privacy({ phone, l: l0 = 'en' }) {
  return (
    <window.Pub phone={phone} lang={l0}>{l => {
      const i = l === 'hi' ? 1 : 0;
      return <>
        <section className="pb-hero"><div className="pb-wrap">
          <window.Crumb items={[t(l, 'Home', 'होम'), t(l, 'Privacy', 'गोपनीयता')]} />
          <div className="pb-col" style={{ gap: 14 }}>
            <span className="sx-pill sx-t-blue" style={{ alignSelf: 'flex-start' }}><Icon name="file-text" size={16} />{t(l, 'Notice v1.0 · effective 1 Nov 2026', 'सूचना v1.0 · 1 नवंबर 2026 से लागू')}</span>
            <h1 className="pb-h1">{t(l, 'Your privacy', 'आपकी गोपनीयता')}</h1>
            <p className="pb-lead">{t(l, 'We collect as little as we can, keep it only as long as we need it, and never sell it or share it for anyone’s marketing.', 'हम जितना हो सके कम जानकारी लेते हैं, उसे केवल ज़रूरत तक रखते हैं, और कभी बेचते या किसी के प्रचार के लिए साझा नहीं करते।')}</p>
          </div>
        </div></section>

        <section className="pb-sec" style={{ paddingTop: phone ? 8 : 16 }}><div className="pb-wrap">
          <div className="pb-card b3-short">
            <h2 className="pb-h3">{t(l, 'In short', 'संक्षेप में')}</h2>
            <ul className="pb-ul">{SHORT.map(s => <li key={s[0]}><Icon name="check" size={18} /><span>{s[i]}</span></li>)}</ul>
          </div>
        </div></section>

        <section className="pb-sec pb-sec--calm"><div className="pb-wrap">
          <window.SecHd title={t(l, 'What we collect, and when', 'हम क्या लेते हैं, और कब')} sub={t(l, 'Five situations cover everything.', 'पाँच स्थितियों में सब कुछ आ जाता है।')} />
          <div className={'pb-g ' + (phone ? '' : 'pb-g3')}>
            {SIT.map(s => <div className="pb-card" key={s.h[0]}>
              <div className="pb-prg__hd"><span className="pb-prg__ic"><Icon name={s.ic} size={20} /></span><h3 className="pb-h3">{s.h[i]}</h3></div>
              <div className="b3-kv"><span>{t(l, 'What we keep', 'हम क्या रखते हैं')}</span><p>{s.k[i]}</p></div>
              <div className="b3-kv"><span>{t(l, 'Who sees it', 'कौन देखता है')}</span><p>{s.w[i]}</p></div>
            </div>)}
          </div>
        </div></section>

        <section className="pb-sec"><div className="pb-wrap">
          <window.SecHd title={t(l, 'How long we keep it', 'हम कितने समय तक रखते हैं')} />
          {phone ? <div className="pb-col" style={{ gap: 10 }}>{RET.map(r => <div className="pb-card" key={r[0][0]} style={{ gap: 6, padding: 16 }}><b style={{ fontWeight: 500 }}>{r[0][i]}</b><span className="pb-small">{r[1][i]}</span><span className="pb-cap">{t(l, 'Then', 'फिर')}: {r[2][i]}</span></div>)}</div> :
            <table className="pb-tbl"><thead><tr><th>{t(l, 'What', 'क्या')}</th><th>{t(l, 'Kept for', 'कितने समय')}</th><th>{t(l, 'Then', 'फिर')}</th></tr></thead>
              <tbody>{RET.map(r => <tr key={r[0][0]}><td style={{ fontWeight: 500 }}>{r[0][i]}</td><td>{r[1][i]}</td><td>{r[2][i]}</td></tr>)}</tbody></table>}
        </div></section>

        <section className="pb-sec pb-sec--calm"><div className="pb-wrap">
          <div className={'pb-g ' + (phone ? '' : 'pb-gmain')}>
            <div className="pb-col" style={{ gap: 20 }}>
              <window.SecHd title={t(l, 'Your rights', 'आपके अधिकार')} sub={t(l, 'Under India’s Digital Personal Data Protection Act, 2023.', 'भारत के डिजिटल व्यक्तिगत डेटा संरक्षण अधिनियम, 2023 के तहत।')} />
              <div className={'pb-g ' + (phone ? '' : 'pb-g2')}>{RIGHTS.map(r => <div key={r[0]} className="b3-right"><span className="pb-prg__ic"><Icon name={r[0]} size={20} /></span><div><b>{r[1][i]}</b><p className="pb-small">{r[2][i]}</p></div></div>)}</div>
              <div className="pb-card" style={{ gap: 8 }}>
                <span className="pb-cap" style={{ textTransform: l === 'hi' ? 'none' : 'uppercase', letterSpacing: l === 'hi' ? 0 : '.12em', fontWeight: 600 }}>{t(l, 'Data protection lead', 'डेटा संरक्षण प्रमुख')}</span>
                <b style={{ fontFamily: 'var(--font-serif-display)', fontWeight: 400, fontSize: 22 }}>{t(l, 'To be appointed', 'नियुक्ति बाक़ी')}</b>
                <p className="pb-small">{t(l, 'Until then, the state privacy team answers every request sent with this form.', 'तब तक, इस फ़ॉर्म से भेजे गए हर अनुरोध का उत्तर राज्य गोपनीयता टीम देती है।')}</p>
                <p className="pb-small">{t(l, 'Not satisfied with our reply? You can complain to the Data Protection Board of India.', 'हमारे उत्तर से संतुष्ट नहीं? आप भारतीय डेटा संरक्षण बोर्ड से शिकायत कर सकते हैं।')}</p>
              </div>
            </div>
            <form className="pb-card" onSubmit={e => e.preventDefault()} style={{ gap: 16 }}>
              <h2 className="pb-h3" style={{ fontSize: 24 }}>{t(l, 'Make a request', 'अनुरोध भेजें')}</h2>
              <Input label={t(l, 'Your name', 'आपका नाम')} />
              <Input label={t(l, 'Phone', 'फ़ोन')} placeholder="+91" inputMode="tel" />
              <Select label={t(l, 'What would you like?', 'आप क्या चाहते हैं?')} options={[t(l, 'See my details', 'मेरी जानकारी देखना'), t(l, 'Correct my details', 'मेरी जानकारी ठीक करना'), t(l, 'Delete my details', 'मेरी जानकारी हटाना'), t(l, 'Withdraw consent', 'सहमति वापस लेना'), t(l, 'Something else', 'कुछ और')]} />
              <label className="sx-field"><span className="sx-field__lbl">{t(l, 'Details', 'विवरण')}</span><textarea className="b3-ta" rows={4} placeholder={t(l, 'For example, the camp you attended and the date', 'जैसे, आप किस कैंप में आए थे और तारीख़')}></textarea></label>
              <Button variant="primary" icon="send" type="submit">{t(l, 'Send request', 'अनुरोध भेजें')}</Button>
              <p className="pb-cap" style={{ display: 'flex', gap: 6 }}><Icon name="clock" size={16} />{t(l, 'We’ll reply within 30 days.', 'हम 30 दिनों में उत्तर देंगे।')}</p>
            </form>
          </div>
        </div></section>

        <section className="pb-sec" style={{ paddingTop: 24, paddingBottom: 32 }}><div className="pb-wrap">
          <p className="pb-cap">{t(l, 'Notice version 1.0 · published 1 Nov 2026 · ', 'सूचना संस्करण 1.0 · 1 नवंबर 2026 को प्रकाशित · ')}<a href="#">{t(l, 'Earlier versions', 'पिछले संस्करण')}</a></p>
        </div></section>
      </>;
    }}</window.Pub>
  );
}

function PrivacySent() {
  return (
    <window.Pub phone>{l => <section className="pb-sec"><div className="pb-wrap">
      <div className="pb-card" style={{ alignItems: 'flex-start' }}>
        <window.B3Ic tone="green" icon="circle-check" />
        <h1 className="pb-h2">{t(l, 'Request received', 'अनुरोध मिल गया')}</h1>
        <p className="pb-small">{t(l, 'Thank you. We’ll reply within 30 days, by 18 Nov 2026, on the phone number you gave.', 'धन्यवाद। हम 30 दिनों में, 18 नवंबर 2026 तक, आपके दिए फ़ोन नंबर पर उत्तर देंगे।')}</p>
        <dl className="pt-dl" style={{ width: '100%' }}><dt>{t(l, 'Request', 'अनुरोध')}</dt><dd>{t(l, 'Delete my details', 'मेरी जानकारी हटाना')}</dd><dt>{t(l, 'Reference', 'संदर्भ')}</dt><dd>PR-2026-0042</dd></dl>
        <Button variant="outline" icon="arrow-left">{t(l, 'Back to privacy', 'गोपनीयता पर लौटें')}</Button>
      </div>
    </div></section>}</window.Pub>
  );
}

Object.assign(window, { Privacy, PrivacySent });
})();
