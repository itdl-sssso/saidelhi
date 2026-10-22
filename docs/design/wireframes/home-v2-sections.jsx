(() => {
const { Button, Card, Eyebrow, SectionHeading, QuoteCard, Icon, DharmaRule } = window.SSSSODelhiNCRDesignSystem_9ec6b9;
const t = (l, en, hi) => (l === 'hi' ? hi : en);

// shared language state across nav + sections
let LANG = 'en'; const subs = new Set();
const setLang = v => { LANG = v; document.documentElement.lang = v; subs.forEach(f => f(v)); };
function useLang() { const [l, s] = React.useState(LANG); React.useEffect(() => { subs.add(s); return () => subs.delete(s); }, []); return l; }

function ThoughtSection() {
  const l = useLang();
  return <section className="sec" data-screen-label="Thought for the Day"><div className="wrap">
    <div className="grid2 msg-grid">
      <div className="hv-thought">
        <QuoteCard label={t(l, 'Thought for the Day', 'आज का विचार')} date={t(l, '19 October 2026', '19 अक्टूबर 2026')}
          quote={t(l, 'Whether your desires are fulfilled or not, think that all that happens is for your good. When you encounter difficulties, always think that better days are ahead.', 'आपकी इच्छाएँ पूरी हों या न हों, यही सोचिए कि जो कुछ होता है वह आपके भले के लिए है। जब कठिनाइयाँ आएँ, तो हमेशा सोचिए कि आगे अच्छे दिन हैं।')}
          attribution={t(l, 'Bhagawan Sri Sathya Sai Baba', 'भगवान श्री सत्य साई बाबा')} />
        <a href="#" className="hv-more">{t(l, 'Earlier thoughts', 'पिछले विचार')}<Icon name="arrow-right" size={16} /></a>
      </div>
      <div className="msg-photo"><image-slot id="swami-message" shape="rounded" radius="24" placeholder="Photograph of Swami for today’s thought"></image-slot></div>
    </div>
  </div></section>;
}

const UP = [
  { d: '21', m: ['Oct', 'अक्टू'], t: ['Bal Vikas class', 'बाल विकास कक्षा'], g: ['Bal Vikas (values classes for children)', 'बाल विकास (बच्चों के लिए मूल्य कक्षा)'], ic: 'graduation-cap', time: '10:00 AM', c: ['Laxmi Nagar · East', 'लक्ष्मी नगर · पूर्व'] },
  { d: '24', m: ['Oct', 'अक्टू'], t: ['Narayana Seva', 'नारायण सेवा'], g: ['food seva (serving meals)', 'भोजन सेवा'], ic: 'hand-heart', time: '12:30 PM', c: ['Connaught Place · New Delhi', 'कनॉट प्लेस · नई दिल्ली'], v: 8 },
  { d: '25', m: ['Oct', 'अक्टू'], t: ['Medical camp', 'चिकित्सा कैंप'], g: ['general check-up and medicines', 'सामान्य जाँच और दवाइयाँ'], ic: 'stethoscope', time: '9:00 AM', c: ['Shakarpur · East', 'शकरपुर · पूर्व'], v: 15 },
  { d: '26', m: ['Oct', 'अक्टू'], t: ['Nagar Sankirtan', 'नगर संकीर्तन'], g: ['devotional singing through the lanes', 'गलियों में भजन'], ic: 'music', time: '5:30 AM', c: ['Rohini · North', 'रोहिणी · उत्तर'] },
  { d: '29', m: ['Oct', 'अक्टू'], t: ['Tree planting', 'वृक्षारोपण'], g: ['environment seva', 'पर्यावरण सेवा'], ic: 'sprout', time: '7:30 AM', c: ['Patparganj · East', 'पटपड़गंज · पूर्व'], v: 20 },
  { d: '1', m: ['Nov', 'नवं'], t: ['Blood donation camp', 'रक्तदान शिविर'], g: ['with the district hospital', 'ज़िला अस्पताल के साथ'], ic: 'droplets', time: '10:00 AM', c: ['Sector 31 · Gurugram', 'सेक्टर 31 · गुरुग्राम'], v: 12 },
];
function UpcomingStrip() {
  const l = useLang(), i = l === 'hi' ? 1 : 0;
  return <section className="sec" id="seva" style={{ background: 'var(--surface-calm)' }} data-screen-label="Upcoming seva"><div className="wrap">
    <div className="sec-h">
      <SectionHeading eyebrow={t(l, 'Upcoming seva', 'आने वाली सेवा')} title={t(l, 'Service is worship in action', 'सेवा ही पूजा है')} description={t(l, 'The next few sevas (service) and gatherings across Delhi NCR. Every one is free to join.', 'दिल्ली एनसीआर में अगली कुछ सेवाएँ और सत्संग। हर एक में शामिल होना निःशुल्क है।')} />
      <Button variant="outline" icon="calendar-days" iconAfter="arrow-right" href="Calendar.html">{t(l, 'Full calendar', 'पूरा कैलेंडर')}</Button>
    </div>
    <div className="hv-strip" role="list" aria-label={t(l, 'Upcoming events', 'आने वाले कार्यक्रम')}>
      {UP.map(e => <a role="listitem" key={e.d + e.t[0]} className="hv-ev" href="#">
        <div className="hv-ev__top"><span className="sx-dchip"><b>{e.d}</b><span>{e.m[i]}</span></span><span className="hv-ev__ic"><Icon name={e.ic} size={20} /></span></div>
        <h3 className="hv-ev__t">{e.t[i]}</h3>
        <p className="hv-ev__g">{e.g[i]}</p>
        <div className="hv-ev__m"><span><Icon name="clock" size={16} />{e.time}</span><span><Icon name="map-pin" size={16} />{e.c[i]}</span></div>
        {e.v ? <span className="hv-vol"><Icon name="hand-heart" size={16} />{t(l, `${e.v} sevadals needed`, `${e.v} सेवादल चाहिए`)}</span> : <span className="hv-open">{t(l, 'Open to everyone', 'सबके लिए खुला')}</span>}
      </a>)}
    </div>
    <p className="hv-swipe">{t(l, 'Swipe for more', 'और देखने के लिए स्वाइप करें')}</p>
  </div></section>;
}

// Hidden entirely when there is no approved data for the period.
const IMPACT = [
  { v: '18,420', l: ['People served', 'लोगों तक सेवा'], ic: 'users', note: true },
  { v: '1,284', l: ['Seva activities', 'सेवा गतिविधियाँ'], ic: 'hand-heart' },
  { v: '42,600', l: ['Sevadal hours', 'सेवादल घंटे'], ic: 'clock' },
  { v: '3,150', l: ['Spectacles given', 'चश्मे दिए गए'], ic: 'glasses' },
];
function ImpactSnapshot({ data = IMPACT }) {
  const l = useLang(), i = l === 'hi' ? 1 : 0;
  if (!data || !data.length) return null;
  return <section className="sec" data-screen-label="Impact snapshot"><div className="wrap">
    <div className="sec-h">
      <SectionHeading eyebrow={t(l, 'Impact', 'प्रभाव')} title={t(l, 'This year so far', 'इस वर्ष अब तक')} description={t(l, 'From approved reports only, 1 April to 17 October 2026.', 'केवल स्वीकृत रिपोर्टों से, 1 अप्रैल से 17 अक्टूबर 2026 तक।')} />
      <Button variant="outline" iconAfter="arrow-right" href="#">{t(l, 'See all impact', 'पूरा प्रभाव देखें')}</Button>
    </div>
    <div className="hv-imp">
      {data.map(k => <div key={k.v} className="hv-imp__t">
        <span className="hv-imp__ic"><Icon name={k.ic} size={20} /></span>
        <b>{k.v}</b><span>{k.l[i]}</span>
        {k.note ? <span className="hv-imp__n">{t(l, 'One person may attend more than once.', 'एक व्यक्ति एक से अधिक बार आ सकता है।')}</span> : null}
      </div>)}
    </div>
  </div></section>;
}

function FindCentre() {
  const l = useLang();
  const [pin, setPin] = React.useState('110091');
  return <section className="sec" id="where" style={{ background: 'var(--white)' }} data-screen-label="Find a centre"><div className="wrap">
    <div className="grid2">
      <div>
        <SectionHeading eyebrow={t(l, 'Find a centre', 'केंद्र खोजें')} title={t(l, 'There is a centre near you', 'आपके पास एक केंद्र है')} description={t(l, 'Enter your pincode to see the nearest centres, their bhajan (devotional singing) timings and the centre phone number.', 'अपना पिनकोड डालें और नज़दीकी केंद्र, उनके भजन का समय और केंद्र का फ़ोन नंबर देखें।')} />
        <form className="hv-pin" onSubmit={e => e.preventDefault()}>
          <label className="hv-pin__f"><span className="sx-field__lbl">{t(l, 'Pincode', 'पिनकोड')}</span>
            <span className="sx-ctl"><span className="sx-ctl__ic"><Icon name="map-pin" size={18} /></span><input inputMode="numeric" maxLength={6} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} aria-label={t(l, 'Pincode', 'पिनकोड')} /></span></label>
          <Button variant="primary" icon="search" type="submit">{t(l, 'Find', 'खोजें')}</Button>
        </form>
        <ul className="hv-near">
          <li><span><b>{t(l, 'Samithi Mayur Vihar', 'समिति मयूर विहार')}</b><span>{t(l, 'Bhajans Thursday 6:30 PM · 1.2 km', 'भजन गुरुवार शाम 6:30 · 1.2 किमी')}</span></span><a href="#">{t(l, 'Open', 'खोलें')}<Icon name="arrow-right" size={16} /></a></li>
          <li><span><b>{t(l, 'Samithi Patparganj', 'समिति पटपड़गंज')}</b><span>{t(l, 'Bhajans Sunday 5:30 PM · 2.8 km', 'भजन रविवार शाम 5:30 · 2.8 किमी')}</span></span><a href="#">{t(l, 'Open', 'खोलें')}<Icon name="arrow-right" size={16} /></a></li>
        </ul>
        <div style={{ marginTop: 18 }}><Button variant="secondary" icon="map" iconAfter="arrow-right" href="Map.html">{t(l, 'All centres on the map', 'सभी केंद्र नक्शे पर')}</Button></div>
      </div>
      <div className="hv-map"><image-slot id="home-map-preview" shape="rounded" radius="16" placeholder="Map preview — centre pins near the pincode"></image-slot></div>
    </div>
  </div></section>;
}

function GetInvolved() {
  const l = useLang();
  const [wl, setWl] = React.useState(l);
  React.useEffect(() => setWl(l), [l]);
  return <section className="sec" id="involve" data-screen-label="Get involved"><div className="wrap">
    <div className="hv-inv">
      <Card tone="warm" capped padding="36px" className="cta-card">
        <Eyebrow>{t(l, 'Get involved', 'जुड़ें')}</Eyebrow>
        <h2 style={{ fontSize: 'var(--text-h2)', marginTop: 8 }}>{t(l, 'Offer your hands', 'अपना हाथ बढ़ाइए')}</h2>
        <p className="body">{t(l, 'Pick a seva from the calendar and tell us you’re coming. The centre coordinator will remind you the day before. No experience needed.', 'कैलेंडर से कोई सेवा चुनें और बताएँ कि आप आ रहे हैं। केंद्र समन्वयक एक दिन पहले याद दिलाएँगे। कोई अनुभव ज़रूरी नहीं।')}</p>
        <div className="cta-acts" style={{ justifyContent: 'flex-start', marginTop: 20 }}><Button variant="primary" size="lg" icon="hand-heart">{t(l, 'Join a seva', 'सेवा से जुड़ें')}</Button></div>
      </Card>
      <Card tone="calm" padding="36px">
        <span className="wing-ico"><Icon name="message-circle" size={20} /></span>
        <h3 style={{ fontSize: 'var(--text-h3)', marginTop: 14 }}>{t(l, 'Seva updates on WhatsApp', 'व्हाट्सऐप पर सेवा की जानकारी')}</h3>
        <p className="body" style={{ fontSize: 'var(--text-small)' }}>{t(l, 'One message a week with sevas near you. Reply STOP at any time.', 'हफ़्ते में एक संदेश, आपके पास की सेवाओं के साथ। कभी भी STOP लिखकर बंद करें।')}</p>
        <form className="hv-wa" onSubmit={e => e.preventDefault()}>
          <label><span className="sx-field__lbl">{t(l, 'WhatsApp number', 'व्हाट्सऐप नंबर')}</span><span className="sx-ctl"><span className="sx-cap">+91</span><input inputMode="tel" placeholder="98765 43210" aria-label={t(l, 'WhatsApp number', 'व्हाट्सऐप नंबर')} /></span></label>
          <div className="sx-lang" role="group" aria-label={t(l, 'Message language', 'संदेश की भाषा')}><button type="button" lang="hi" aria-pressed={wl === 'hi'} onClick={() => setWl('hi')}>हिंदी</button><button type="button" lang="en" aria-pressed={wl === 'en'} onClick={() => setWl('en')}>English</button></div>
          <Button variant="secondary" icon="send" type="submit">{t(l, 'Send me updates', 'मुझे जानकारी भेजें')}</Button>
        </form>
        <p className="hv-fine">{t(l, 'We use your number only for these updates and never share it.', 'आपका नंबर केवल इन संदेशों के लिए है, कभी साझा नहीं किया जाता।')} <a href="#">{t(l, 'Privacy', 'गोपनीयता')}</a></p>
      </Card>
    </div>
  </div></section>;
}

function SiteFooter() {
  const l = useLang();
  return <>
    <DharmaRule height={3} />
    <footer className="site"><div className="wrap">
      <div className="fgrid">
        <div><img className="foot-emblem" src="../assets/sarva-dharma-logo.jpg" alt="Sarva Dharma emblem" /><h4>{t(l, 'Sri Sathya Sai Seva Organisation', 'श्री सत्य साई सेवा संगठन')}</h4><p style={{ color: 'rgba(255,255,255,.72)', maxWidth: '34ch' }}>{t(l, 'Delhi NCR. Bhajans, study circles, Bal Vikas and seva — open to everyone, free always.', 'दिल्ली एनसीआर। भजन, स्टडी सर्कल, बाल विकास और सेवा — सबके लिए, हमेशा निःशुल्क।')}</p></div>
        <div><h4>{t(l, 'Visit', 'आइए')}</h4><p className="hv-fl"><a href="Calendar.html">{t(l, 'Calendar', 'कैलेंडर')}</a><a href="Map.html">{t(l, 'Centres', 'केंद्र')}</a><a href="#">{t(l, 'Impact', 'प्रभाव')}</a></p></div>
        <div><h4>{t(l, 'Serve', 'सेवा')}</h4><p className="hv-fl"><a href="#">{t(l, 'Join a seva', 'सेवा से जुड़ें')}</a><a href="#">{t(l, 'Donate', 'दान')}<Icon name="external-link" size={16} /></a><a href="#">SaiConnect<Icon name="external-link" size={16} /></a></p></div>
      </div>
      <div className="hv-fine2"><span>{t(l, 'All activities are free and open to people of every faith. Nothing is ever collected from the public.', 'सभी गतिविधियाँ निःशुल्क हैं और हर धर्म के लोगों के लिए खुली हैं। जनता से कभी कुछ नहीं लिया जाता।')}</span><span className="hv-fx"><a href="#">{t(l, 'Privacy', 'गोपनीयता')}</a><a href="#">{t(l, 'Coordinator login', 'समन्वयक लॉगिन')}</a></span></div>
    </div></footer>
  </>;
}

Object.assign(window, { HV: { useLang, setLang, t, ThoughtSection, UpcomingStrip, ImpactSnapshot, FindCentre, GetInvolved, SiteFooter } });
})();
