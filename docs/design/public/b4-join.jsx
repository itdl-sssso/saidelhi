(() => {
const { Icon, Button, Badge } = window.SSSSODelhiNCRDesignSystem_9ec6b9;
const { Pub, Crumb, SecHd, PbSel, KpiTile } = window;
const t = window.b3t;

/* ---------- E · /join ---------- */
const NEED = [
  ['24 Oct', 'Narayana Seva', 'नारायण सेवा', 'Connaught Place · New Delhi', '12:30 PM', 8, 14, 'hand-heart'],
  ['25 Oct', 'Medical camp', 'चिकित्सा कैंप', 'Shakarpur · East', '9:00 AM', 15, 6, 'stethoscope'],
  ['26 Oct', 'Eye camp', 'नेत्र कैंप', 'Sector 50 · Noida', '9:00 AM', 12, 3, 'eye'],
  ['29 Oct', 'Tree planting', 'वृक्षारोपण', 'Patparganj · East', '7:30 AM', 20, 11, 'sprout'],
  ['1 Nov', 'Blood donation camp', 'रक्तदान शिविर', 'Sector 31 · Gurugram', '10:00 AM', 12, 4, 'droplets'],
];
function Join({ phone, l: l0 }) {
  return <Pub phone={phone} active="Get involved" lang={l0}>{l => <>
    <section className="pb-hero"><div className="pb-wrap">
      <Crumb items={[t(l, 'Home', 'होम'), t(l, 'Get involved', 'जुड़ें')]} />
      <div className="pb-col" style={{ gap: 14 }}><h1 className="pb-h1">{t(l, 'Offer your hands', 'अपना हाथ बढ़ाइए')}</h1><p className="pb-lead">{t(l, 'These sevas (service) still need sevadals (volunteers). Pick one, tell us you’re coming, and turn up. That’s all.', 'इन सेवाओं में अभी सेवादल चाहिए। एक चुनें, बताएँ कि आप आ रहे हैं, और पहुँच जाएँ। बस इतना ही।')}</p></div>
    </div></section>
    <section className="pb-sec" style={{ paddingTop: 8 }}><div className="pb-wrap">
      <div className={'pb-g ' + (phone ? '' : 'pb-gmain')} style={{ gap: phone ? 32 : 40 }}>
        <div className="pb-col" style={{ gap: 16 }}>
          <div className="pb-chips"><PbSel l={t(l, 'District', 'ज़िला')} v={t(l, 'All', 'सभी')} /><PbSel l={t(l, 'Type', 'प्रकार')} v={t(l, 'All', 'सभी')} />{phone ? null : <PbSel l={t(l, 'When', 'कब')} v={t(l, 'Next 2 weeks', 'अगले 2 हफ़्ते')} />}</div>
          <span className="pb-cap">{t(l, '5 sevas need volunteers', '5 सेवाओं में स्वयंसेवक चाहिए')}</span>
          {NEED.map(n => <a key={n[0] + n[1]} href="#" className="pb-card pb-card--link b4-need">
            <div className="b4-need__r"><span className="sx-dchip"><b>{n[0].split(' ')[0]}</b><span>{n[0].split(' ')[1]}</span></span>
              <div className="pb-col" style={{ gap: 2, minWidth: 0 }}><span className="pb-crow__t">{l === 'hi' ? n[2] : n[1]}</span><span className="pb-crow__m">{n[3]} · {n[4]}</span></div>
              {phone ? null : <Button variant="outline" size="sm" iconAfter="arrow-right">{t(l, 'I can come', 'मैं आ सकता हूँ')}</Button>}</div>
            <div className="b4-need__b"><div className="pb-prog" aria-hidden="true"><i style={{ width: `${(n[6] / (n[5] + n[6])) * 100}%` }}></i></div><span className="pb-volb"><Icon name="hand-heart" size={16} />{t(l, `${n[5]} more needed`, `${n[5]} और चाहिए`)}</span></div>
          </a>)}
        </div>
        <div className="pb-col" style={{ gap: 16 }}>
          <div className="pb-card b4-wa">
            <h2 className="pb-h3">{t(l, 'Or message us on WhatsApp', 'या व्हाट्सऐप पर संदेश भेजें')}</h2>
            <p className="pb-small">{t(l, 'Send “Hi” to our number. The bot shows sevas near you and remembers your language.', 'हमारे नंबर पर “Hi” भेजें। बॉट आपके पास की सेवाएँ दिखाता है और आपकी भाषा याद रखता है।')}</p>
            <div className="pb-copy"><Icon name="message-circle" size={20} /><b>+91 98100 00000</b><span style={{ flex: 1 }}></span><Button variant="ghost" size="sm" icon="copy">{t(l, 'Copy', 'कॉपी')}</Button></div>
            <div className="b4-qr"><div className="b4-qr__box" aria-label="QR code placeholder"><Icon name="qr-code" size={24} /><span>QR</span></div><span className="pb-cap">{t(l, 'Scan with your phone camera to open the chat.', 'चैट खोलने के लिए फ़ोन कैमरे से स्कैन करें।')}</span></div>
          </div>
          <div className="pb-card"><h2 className="pb-h3">{t(l, 'What to expect', 'क्या उम्मीद करें')}</h2>
            <ul className="pb-ul">{[['clock', ['Arrive 15 minutes early; a coordinator will greet you.', '15 मिनट पहले आएँ; एक समन्वयक आपका स्वागत करेंगे।']], ['shirt', ['Wear comfortable clothes. Bring water.', 'आरामदायक कपड़े पहनें। पानी साथ लाएँ।']], ['users', ['You’ll work with others; no experience needed.', 'आप दूसरों के साथ काम करेंगे; कोई अनुभव ज़रूरी नहीं।']], ['gift', ['Nothing to pay, nothing to buy.', 'कुछ भी चुकाना या ख़रीदना नहीं है।']]].map(x => <li key={x[0]}><Icon name={x[0]} size={18} /><span>{x[1][l === 'hi' ? 1 : 0]}</span></li>)}</ul></div>
        </div>
      </div>
    </div></section>
  </>}</Pub>;
}

/* ---------- F · /centres/map ---------- */
const CEN = [
  ['Samithi Mayur Vihar', 'East', 'Dr. Ambedkar Bhawan, Mayur Vihar Ph-1', 'Thu 6:30 PM', '1.2 km'],
  ['Samithi Patparganj', 'East', 'Community hall, Patparganj', 'Sun 5:30 PM', '2.8 km'],
  ['Samithi Laxmi Nagar', 'East', 'Vikas Marg centre, Laxmi Nagar', 'Thu 7:00 PM', '4.1 km'],
  ['Samithi Preet Vihar', 'East', 'Preet Vihar community centre', 'Sun 6:00 PM', '5.0 km'],
  ['Samithi Sector 50', 'Noida–Ghaziabad', 'Sector 50 centre, Noida', 'Sun 6:30 PM', '7.6 km'],
];
function CentreList({ l, phone }) {
  return <div className="b4-clist">{CEN.map((c, k) => <div key={c[0]} className={'b4-crow' + (k === 0 ? ' is-on' : '')}>
    <span className="b4-pin">{k + 1}</span>
    <a href="#" className="pb-col" style={{ gap: 2, minWidth: 0, color: 'inherit' }}><span className="pb-crow__t">{c[0]}</span><span className="pb-crow__m">{c[2]}</span><span className="pb-crow__m">{t(l, 'Bhajans', 'भजन')} {c[3]} · {c[1]} · {c[4]}</span></a>
    <div className="b4-crow__a"><a href="#" className="pb-more">{t(l, 'Centre', 'केंद्र')}<Icon name="arrow-right" size={16} /></a><a href="#" className="pb-more">{t(l, 'Directions', 'रास्ता')}<Icon name="external-link" size={16} /></a></div>
  </div>)}</div>;
}
function CentreMap({ phone, l: l0, showMap }) {
  return <Pub phone={phone} active="" lang={l0}>{l => <>
    <section className="pb-hero" style={{ paddingBottom: 24 }}><div className="pb-wrap">
      <Crumb items={[t(l, 'Home', 'होम'), t(l, 'Centres', 'केंद्र'), t(l, 'Map', 'नक्शा')]} />
      <h1 className="pb-h1">{t(l, 'Find a centre', 'केंद्र खोजें')}</h1>
      <form className="b4-search" style={{ marginTop: 16, maxWidth: 720 }} onSubmit={e => e.preventDefault()}>
        <span className="sx-ctl" style={{ flex: '2 1 220px' }}><span className="sx-ctl__ic"><Icon name="search" size={18} /></span><input defaultValue="110091" aria-label={t(l, 'Pincode or locality', 'पिनकोड या इलाक़ा')} /></span>
        <PbSel l={t(l, 'District', 'ज़िला')} v={t(l, 'All', 'सभी')} />
        <Button variant="primary">{t(l, 'Search', 'खोजें')}</Button>
      </form>
      <p className="pb-cap" style={{ marginTop: 8 }}>{t(l, 'We don’t ask for your location. Distances are from the pincode centre.', 'हम आपकी लोकेशन नहीं माँगते। दूरी पिनकोड के केंद्र से है।')}</p>
    </div></section>
    <section className="pb-sec" style={{ paddingTop: 0 }}><div className="pb-wrap">
      {phone ? <div className="pb-col" style={{ gap: 12 }}>
        <div className="pb-row" style={{ justifyContent: 'space-between' }}><span className="pb-small">{t(l, '5 centres near 110091', '110091 के पास 5 केंद्र')}</span><Button variant="outline" size="sm" icon={showMap ? 'list' : 'map'}>{showMap ? t(l, 'Show list', 'सूची दिखाएँ') : t(l, 'Show map', 'नक्शा दिखाएँ')}</Button></div>
        {showMap ? <div className="b4-map" style={{ height: 460 }}><MapPins /></div> : <CentreList l={l} phone />}
      </div> : <div className="b4-mapgrid">
        <div className="b4-map"><MapPins /></div>
        <div className="pb-col" style={{ gap: 10 }}><span className="pb-small">{t(l, '5 centres near 110091', '110091 के पास 5 केंद्र')}</span><CentreList l={l} /></div>
      </div>}
    </div></section>
  </>}</Pub>;
}
function MapPins() {
  const P = [[38, 42], [52, 30], [30, 60], [62, 55], [78, 70]];
  return <><span className="b4-map__lbl"><Icon name="map" size={18} />Map — tiles to be supplied</span>{P.map((p, k) => <span key={k} className={'b4-map__pin' + (k === 0 ? ' is-on' : '')} style={{ left: p[0] + '%', top: p[1] + '%' }}>{k + 1}</span>)}</>;
}

/* ---------- G · /districts/[slug] ---------- */
function District({ phone, l: l0 }) {
  return <Pub phone={phone} active="Impact" lang={l0}>{l => <>
    <section className="pb-hero"><div className="pb-wrap">
      <Crumb items={[t(l, 'Home', 'होम'), t(l, 'Impact', 'प्रभाव'), t(l, 'East district', 'पूर्व ज़िला')]} />
      <div className="pb-col" style={{ gap: 12 }}><h1 className="pb-h1">{t(l, 'East district', 'पूर्व ज़िला')}</h1><p className="pb-lead">{t(l, '7 samithis (local centres) from Mayur Vihar to Preet Vihar. Approved reports only, 1 Apr – 17 Oct 2026.', 'मयूर विहार से प्रीत विहार तक 7 समितियाँ। केवल स्वीकृत रिपोर्ट, 1 अप्रैल – 17 अक्टूबर 2026।')}</p></div>
    </div></section>
    <section className="pb-sec" style={{ paddingTop: 8 }}><div className="pb-wrap pb-col" style={{ gap: phone ? 36 : 56 }}>
      <div className="pb-g" style={{ gridTemplateColumns: phone ? '1fr 1fr' : 'repeat(4,minmax(0,1fr))', gap: phone ? 10 : 16 }}>
        <KpiTile label={t(l, 'Activities', 'गतिविधियाँ')} value={312} period="2026" icon="calendar-days" compact={phone} />
        <KpiTile label={t(l, 'People served', 'लोगों तक सेवा')} value={9840} period="2026" icon="users" compact={phone} note={phone ? null : t(l, 'One person may attend more than once.', 'एक व्यक्ति एक से अधिक बार आ सकता है।')} />
        <KpiTile label={t(l, 'Sevadal hours', 'सेवादल घंटे')} value={7420} period="2026" icon="hand-heart" compact={phone} />
        <KpiTile label={t(l, 'Samithis active', 'सक्रिय समितियाँ')} value="7 / 7" period="2026" icon="home" compact={phone} />
      </div>
      <div><SecHd title={t(l, 'By seva type', 'सेवा के प्रकार से')} sub={t(l, 'Age and gender are shown at district level only. Groups under 5 show as “fewer than 5”.', 'आयु और लिंग केवल ज़िला स्तर पर दिखाए जाते हैं। 5 से कम के समूह “5 से कम” दिखते हैं।')} />
        <div className={'pb-g ' + (phone ? '' : 'pb-g2')}>
          <div className="pb-card"><div className="pb-prg__hd"><span className="pb-prg__ic"><Icon name="eye" size={20} /></span><h3 className="pb-h3">{t(l, 'Eye camps', 'नेत्र कैंप')}</h3></div>
            <dl className="b4-dl"><dt>{t(l, 'People screened', 'जाँचे गए')}</dt><dd>1,210</dd><dt>{t(l, 'Spectacles given', 'चश्मे दिए')}</dt><dd>648</dd></dl>
            <Split l={l} title={t(l, 'By age', 'आयु के अनुसार')} rows={[[t(l, 'Under 18', '18 से कम'), 96], [t(l, '18–59', '18–59'), 610], [t(l, '60 and over', '60 और ऊपर'), 504]]} />
            <Split l={l} title={t(l, 'By gender', 'लिंग के अनुसार')} rows={[[t(l, 'Women', 'महिलाएँ'), 652], [t(l, 'Men', 'पुरुष'), 556], [t(l, 'Other', 'अन्य'), 'lt5']]} /></div>
          <div className="pb-card"><div className="pb-prg__hd"><span className="pb-prg__ic"><Icon name="graduation-cap" size={20} /></span><h3 className="pb-h3">{t(l, 'Bal Vikas', 'बाल विकास')}</h3></div>
            <dl className="b4-dl"><dt>{t(l, 'Classes held', 'कक्षाएँ')}</dt><dd>284</dd><dt>{t(l, 'Children enrolled', 'नामांकित बच्चे')}</dt><dd>212</dd></dl>
            <Split l={l} title={t(l, 'By age group', 'आयु वर्ग')} rows={[[t(l, 'Group I (5–8)', 'समूह I (5–8)'), 88], [t(l, 'Group II (9–11)', 'समूह II (9–11)'), 79], [t(l, 'Group III (12–15)', 'समूह III (12–15)'), 45]]} />
            <div className="b4-mini">{[['hand-heart', t(l, 'Narayana Seva', 'नारायण सेवा'), t(l, '18,240 meals', '18,240 भोजन')], ['droplets', t(l, 'Blood donation', 'रक्तदान'), t(l, '214 units', '214 यूनिट')], ['music', t(l, 'Bhajans', 'भजन'), t(l, '364 sessions', '364 सत्र')]].map(m => <a key={m[1]} href="#"><Icon name={m[0]} size={16} /><span>{m[1]}</span><b>{m[2]}</b></a>)}</div></div>
        </div></div>
      <div className={'pb-g ' + (phone ? '' : 'pb-g2')} style={{ gap: phone ? 32 : 40, alignItems: 'start' }}>
        <div><SecHd title={t(l, 'Coming up in East', 'पूर्व में आगे')} action={<a href="#" className="pb-more">{t(l, 'Calendar', 'कैलेंडर')}<Icon name="arrow-right" size={16} /></a>} />
          <div className="pb-col" style={{ gap: 8 }}>{[['21 Oct', 'Bal Vikas class · Laxmi Nagar'], ['25 Oct', 'Medical camp · Shakarpur'], ['29 Oct', 'Tree planting · Patparganj']].map(e => <a key={e[0]} href="#" className="pb-crow" style={{ gridTemplateColumns: phone ? '60px minmax(0,1fr) auto' : '84px minmax(0,1fr) auto', alignItems: 'center' }}><span className="pb-crow__time">{e[0]}</span><span className="pb-crow__t">{e[1]}</span><Icon name="chevron-right" size={18} /></a>)}</div></div>
        <div><SecHd title={t(l, 'Centres', 'केंद्र')} />
          <div className="pb-card" style={{ padding: 0, gap: 0 }}>{['Mayur Vihar', 'Laxmi Nagar', 'Patparganj', 'Shakarpur', 'Preet Vihar', 'Mayur Vihar Ph-2', 'Trilokpuri'].map(c => <a key={c} href="#" className="b4-cl">{t(l, 'Samithi ', 'समिति ')}{c}<Icon name="chevron-right" size={18} /></a>)}</div></div>
      </div>
      <a href="#" className="b4-back"><Icon name="arrow-left" size={18} />{t(l, 'All districts on the impact page', 'प्रभाव पेज पर सभी ज़िले')}</a>
    </div></section>
  </>}</Pub>;
}
function Split({ l, title, rows }) {
  const total = rows.reduce((s, r) => s + (typeof r[1] === 'number' ? r[1] : 0), 0);
  return <div className="b4-split"><span className="pb-cap" style={{ fontWeight: 600, color: 'var(--slate-700)' }}>{title}</span>{rows.map(r => <div key={r[0]} className="b4-split__r"><span>{r[0]}</span><span className="b4-split__t"><i style={{ width: typeof r[1] === 'number' ? `${(r[1] / total) * 100}%` : 0 }}></i></span><b>{r[1] === 'lt5' ? t(l, 'fewer than 5', '5 से कम') : r[1].toLocaleString('en-IN')}</b></div>)}</div>;
}

Object.assign(window, { B4Join: Join, B4CentreMap: CentreMap, B4District: District });
})();
