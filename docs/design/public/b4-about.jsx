(() => {
const { Icon, Button, Badge } = window.SSSSODelhiNCRDesignSystem_9ec6b9;
const { Pub, Crumb, SecHd, PbSel } = window;
const t = window.b3t;
const Eb = ({ children, l }) => <span className="b4-eb" lang={l}>{children}</span>;

const WINGS = [
  { id: 'service', i: 'hand-heart', n: ['Service', 'सेवा'], d: ['Medical camps, Narayana Seva, blood donation and village seva.', 'चिकित्सा कैंप, नारायण सेवा, रक्तदान और ग्राम सेवा।'], tone: 'warm' },
  { id: 'edu', i: 'graduation-cap', n: ['Educational', 'शिक्षा'], d: ['Bal Vikas classes for children and values education in schools.', 'बच्चों के लिए बाल विकास कक्षाएँ और स्कूलों में मूल्य शिक्षा।'], tone: 'truth' },
  { id: 'spirit', i: 'music', n: ['Spiritual', 'आध्यात्मिक'], d: ['Bhajans (devotional singing), study circles and Nagar Sankirtan.', 'भजन, स्टडी सर्कल और नगर संकीर्तन।'], tone: 'calm' },
  { id: 'mahila', i: 'flower-2', n: ['Mahila', 'महिला'], d: ['Seva and study led by the women of each centre.', 'हर केंद्र की महिलाओं द्वारा चलाई जाने वाली सेवा और अध्ययन।'], tone: 'warm' },
  { id: 'youth', i: 'heart-handshake', n: ['Youth', 'युवा'], d: ['Seva, study and leadership for 18 to 40 year olds.', '18 से 40 वर्ष के लोगों के लिए सेवा, अध्ययन और नेतृत्व।'], tone: 'calm' },
];
const DISTS = [['Central', 'मध्य', 6], ['East', 'पूर्व', 7], ['New Delhi', 'नई दिल्ली', 5], ['North', 'उत्तर', 8], ['South', 'दक्षिण', 9], ['West', 'पश्चिम', 7], ['Gurugram', 'गुरुग्राम', 4], ['Noida–Ghaziabad', 'नोएडा–ग़ाज़ियाबाद', 6], ['Faridabad', 'फ़रीदाबाद', 3]];

function FindBand({ l, phone }) {
  return <section className="pb-sec pb-sec--calm"><div className="pb-wrap">
    <div className="b4-find">
      <div className="pb-col" style={{ gap: 6 }}><h2 className="pb-h2">{t(l, 'Find a centre near you', 'अपने पास का केंद्र खोजें')}</h2><p className="pb-small">{t(l, 'Every samithi (local centre) meets weekly. Walk in; no one will ask why you came.', 'हर समिति (स्थानीय केंद्र) हर हफ़्ते मिलती है। सीधे आइए; कोई नहीं पूछेगा कि आप क्यों आए।')}</p></div>
      <form className="b4-search" onSubmit={e => e.preventDefault()}><span className="sx-ctl" style={{ flex: 1 }}><span className="sx-ctl__ic"><Icon name="search" size={18} /></span><input placeholder={t(l, 'Pincode or locality', 'पिनकोड या इलाक़ा')} aria-label={t(l, 'Pincode or locality', 'पिनकोड या इलाक़ा')} /></span><Button variant="primary">{t(l, 'Find', 'खोजें')}</Button></form>
    </div>
  </div></section>;
}

/* ---------- B · /about ---------- */
function About({ phone, l: l0 }) {
  return <Pub phone={phone} active="About" lang={l0}>{l => {
    const i = l === 'hi' ? 1 : 0;
    return <>
      <section className="pb-hero"><div className="pb-wrap">
        <Crumb items={[t(l, 'Home', 'होम'), t(l, 'About', 'परिचय')]} />
        <div className="pb-col" style={{ gap: 14 }}><Eb l={l}>{t(l, 'About us', 'हमारे बारे में')}</Eb><h1 className="pb-h1">{t(l, 'Neighbours who serve', 'सेवा करने वाले पड़ोसी')}</h1>
          <p className="pb-lead">{t(l, 'The Sri Sathya Sai Seva Organisation in Delhi NCR is a group of volunteers who meet to sing, study and serve. Everything we do is free and open to people of every faith.', 'दिल्ली एनसीआर में श्री सत्य साई सेवा संगठन स्वयंसेवकों का समूह है जो साथ मिलकर भजन, अध्ययन और सेवा करते हैं। हमारा हर काम निःशुल्क है और हर धर्म के लोगों के लिए खुला है।')}</p></div>
      </div></section>
      <section className="pb-sec"><div className="pb-wrap">
        <div className={'pb-g ' + (phone ? '' : 'pb-g2')} style={{ gap: phone ? 20 : 48, alignItems: 'center' }}>
          <div className="b4-portrait"><window.PbPhoto label={t(l, 'Portrait of Bhagawan Sri Sathya Sai Baba — to be supplied', 'भगवान श्री सत्य साई बाबा का चित्र — उपलब्ध कराया जाएगा')} /></div>
          <div className="pb-col" style={{ gap: 14 }}>
            <Eb l={l}>{t(l, 'Our founder', 'हमारे संस्थापक')}</Eb>
            <h2 className="pb-h2">{t(l, 'Bhagawan Sri Sathya Sai Baba', 'भगवान श्री सत्य साई बाबा')}</h2>
            <p className="pb-cap">1926 – 2011</p>
            <div className="pb-prose"><p>{t(l, 'Bhagawan taught that service to people is service to God, and that all faiths lead to the same truth. He asked that nothing be collected from those we serve.', 'भगवान ने सिखाया कि मनुष्य की सेवा ही ईश्वर की सेवा है, और सभी धर्म एक ही सत्य की ओर ले जाते हैं। उन्होंने कहा कि जिनकी हम सेवा करें, उनसे कुछ भी न लिया जाए।')}</p>
              <p>{t(l, 'The organisation he founded now works in more than 100 countries. In Delhi NCR, it began with a handful of bhajan groups in the 1960s.', 'उनके द्वारा स्थापित संगठन आज 100 से अधिक देशों में काम करता है। दिल्ली एनसीआर में इसकी शुरुआत 1960 के दशक में कुछ भजन मंडलियों से हुई।')}</p></div>
            <blockquote className="b4-q">“{t(l, 'Love all, serve all. Help ever, hurt never.', 'सबसे प्रेम करो, सबकी सेवा करो। सदा सहायता करो, कभी चोट न पहुँचाओ।')}”</blockquote>
          </div>
        </div>
      </div></section>
      <section className="pb-sec pb-sec--calm"><div className="pb-wrap">
        <SecHd title={t(l, 'Five wings, one organisation', 'पाँच विंग, एक संगठन')} sub={t(l, 'Every activity sits in one wing. Open one to see its programmes.', 'हर गतिविधि किसी एक विंग में आती है। उसके कार्यक्रम देखने के लिए खोलें।')} />
        <div className="pb-g" style={{ gridTemplateColumns: phone ? '1fr' : 'repeat(5,minmax(0,1fr))', gap: 12 }}>
          {WINGS.map(w => <a key={w.id} href="#" className="pb-card pb-card--link b4-wing" style={{ padding: phone ? 16 : 20 }}>
            <span className="pb-prg__ic"><Icon name={w.i} size={20} /></span><h3 className="pb-h3">{w.n[i]}</h3><p className="pb-small">{w.d[i]}</p><span className="pb-more">{t(l, 'Programmes', 'कार्यक्रम')}<Icon name="arrow-right" size={16} /></span>
          </a>)}
        </div>
      </div></section>
      <section className="pb-sec"><div className="pb-wrap">
        <SecHd title={t(l, 'How we are organised', 'हमारा ढाँचा')} sub={t(l, 'A samithi is a local centre. Each one belongs to a district.', 'समिति एक स्थानीय केंद्र है। हर समिति किसी ज़िले का हिस्सा है।')} />
        <div className="b4-org">
          <div className="b4-org__top"><Icon name="globe" size={20} /><b>{t(l, 'Delhi NCR', 'दिल्ली एनसीआर')}</b><span className="pb-cap">{t(l, 'State team', 'राज्य टीम')}</span></div>
          <div className="b4-org__line" aria-hidden="true"></div>
          <div className="b4-org__d">{DISTS.map(d => <a href="#" key={d[0]}><b>{d[i]}</b><span>{t(l, `${d[2]} samithis`, `${d[2]} समितियाँ`)}</span></a>)}</div>
          <div className="b4-org__line" aria-hidden="true"></div>
          <div className="b4-org__s"><Icon name="home" size={18} />{t(l, '55 samithis — each with its own centre page', '55 समितियाँ — हर एक का अपना केंद्र पेज')}</div>
        </div>
      </div></section>
      <section className="pb-sec" style={{ paddingTop: 0 }}><div className="pb-wrap">
        <SecHd title={t(l, 'What we hold to', 'हमारे सिद्धांत')} />
        <div className={'pb-g ' + (phone ? '' : 'pb-g3')}>
          {[['gift', ['Free, always', 'हमेशा निःशुल्क'], ['No fees for any class, camp or bhajan. Ever.', 'किसी कक्षा, कैंप या भजन की कोई फ़ीस नहीं। कभी नहीं।']], ['users', ['Every faith welcome', 'हर धर्म का स्वागत'], ['Songs and readings come from many traditions. No one is asked to convert.', 'भजन और पाठ कई परंपराओं से आते हैं। किसी से धर्म बदलने को नहीं कहा जाता।']], ['hand', ['Nothing collected', 'कुछ भी नहीं लिया जाता'], ['We never ask the public for money. Donations go only through the official page.', 'हम जनता से कभी पैसे नहीं माँगते। दान केवल आधिकारिक पेज से होता है।']]].map(p => <div key={p[0]} className="pb-card"><span className="pb-prg__ic"><Icon name={p[0]} size={20} /></span><h3 className="pb-h3">{p[1][i]}</h3><p className="pb-small">{p[2][i]}</p></div>)}
        </div>
      </div></section>
      <FindBand l={l} phone={phone} />
    </>;
  }}</Pub>;
}

/* ---------- C · /programs ---------- */
const PROGS = [
  { w: 'service', i: 'eye', n: ['Eye camps', 'नेत्र कैंप'], d: ['Free eye check-ups, spectacles and cataract referrals.', 'निःशुल्क आँखों की जाँच, चश्मे और मोतियाबिंद रेफ़रल।'], nx: ['26 Oct · Noida', '26 अक्टू · नोएडा'], yr: ['2,615 spectacles', '2,615 चश्मे'] },
  { w: 'service', i: 'hand-heart', n: ['Narayana Seva', 'नारायण सेवा'], d: ['Cooked meals served by hand, every week.', 'हर हफ़्ते हाथ से परोसा गया पका भोजन।'], nx: ['24 Oct · Connaught Place', '24 अक्टू · कनॉट प्लेस'], yr: ['1,12,400 meals', '1,12,400 भोजन'] },
  { w: 'service', i: 'droplets', n: ['Blood donation', 'रक्तदान'], d: ['Camps with district hospitals and blood banks.', 'ज़िला अस्पतालों और ब्लड बैंकों के साथ कैंप।'], nx: ['1 Nov · Gurugram', '1 नवं · गुरुग्राम'], yr: ['1,246 units', '1,246 यूनिट'] },
  { w: 'service', i: 'stethoscope', n: ['Medical camps', 'चिकित्सा कैंप'], d: ['General check-ups and medicines, free.', 'सामान्य जाँच और दवाइयाँ, निःशुल्क।'], nx: ['25 Oct · Shakarpur', '25 अक्टू · शकरपुर'], yr: ['9,480 patients', '9,480 मरीज़'] },
  { w: 'edu', i: 'graduation-cap', n: ['Bal Vikas', 'बाल विकास'], d: ['Sunday values classes for children aged 5 to 15.', '5 से 15 वर्ष के बच्चों के लिए रविवार की मूल्य कक्षाएँ।'], nx: ['26 Oct · every centre', '26 अक्टू · हर केंद्र'], yr: ['1,140 children', '1,140 बच्चे'] },
  { w: 'spirit', i: 'music', n: ['Bhajans', 'भजन'], d: ['Devotional singing, Thursday and Sunday evenings.', 'भक्ति गायन, गुरुवार और रविवार शाम।'], nx: ['23 Oct · every centre', '23 अक्टू · हर केंद्र'], yr: ['2 evenings a week', 'हफ़्ते में 2 शाम'] },
  { w: 'spirit', i: 'book-open', n: ['Study circles', 'स्टडी सर्कल'], d: ['Small groups that read and discuss one teaching.', 'छोटे समूह जो एक शिक्षा पढ़ते और चर्चा करते हैं।'], nx: ['22 Oct · Lodhi Road', '22 अक्टू · लोधी रोड'], yr: ['62 circles', '62 सर्कल'] },
  { w: 'service', i: 'sprout', n: ['Environmental seva', 'पर्यावरण सेवा'], d: ['Planting, clean-ups and water-saving drives.', 'पौधारोपण, सफ़ाई और जल-बचत अभियान।'], nx: ['29 Oct · Patparganj', '29 अक्टू · पटपड़गंज'], yr: ['4,200 saplings', '4,200 पौधे'] },
  { w: 'youth', i: 'heart-handshake', n: ['Youth seva', 'युवा सेवा'], d: ['Weekend seva and study for 18 to 40 year olds.', '18 से 40 वर्ष के लिए सप्ताहांत सेवा और अध्ययन।'], nx: ['1 Nov · Rohini', '1 नवं · रोहिणी'], yr: ['380 youth', '380 युवा'] },
];
function Programs({ phone, l: l0 }) {
  return <Pub phone={phone} active="Programs" lang={l0}>{l => {
    const i = l === 'hi' ? 1 : 0;
    return <>
      <section className="pb-hero"><div className="pb-wrap">
        <Crumb items={[t(l, 'Home', 'होम'), t(l, 'Programmes', 'कार्यक्रम')]} />
        <div className="pb-col" style={{ gap: 14 }}><h1 className="pb-h1">{t(l, 'Programmes', 'कार्यक्रम')}</h1><p className="pb-lead">{t(l, 'Every seva (service), class and gathering we run, by wing. All free, all open.', 'हमारी हर सेवा, कक्षा और सत्संग, विंग के अनुसार। सब निःशुल्क, सबके लिए।')}</p></div>
        <div className="b4-tabs" role="tablist" style={{ marginTop: 20 }}>{[['All', 'सभी'], ...WINGS.map(w => w.n)].map((w, k) => <button key={w[0]} role="tab" aria-selected={k === 0}>{w[i]}</button>)}</div>
      </div></section>
      <section className="pb-sec" style={{ paddingTop: 8 }}><div className="pb-wrap">
        <div className={'pb-g ' + (phone ? '' : 'pb-g3')}>
          {PROGS.map(p => <a key={p.n[0]} href="#" className="pb-card pb-card--link b4-prog">
            <div className="pb-prg__hd"><span className="pb-prg__ic"><Icon name={p.i} size={20} /></span><div className="pb-col" style={{ gap: 0 }}><h3 className="pb-h3">{p.n[i]}</h3><span className="pb-cap">{WINGS.find(w => w.id === p.w).n[i]}</span></div></div>
            <p className="pb-small">{p.d[i]}</p>
            <dl className="b4-prog__f"><dt>{t(l, 'Next', 'अगला')}</dt><dd>{p.nx[i]}</dd><dt>{t(l, 'This year', 'इस वर्ष')}</dt><dd>{p.yr[i]}</dd></dl>
          </a>)}
        </div>
      </div></section>
      <section className="pb-sec" style={{ paddingTop: 0 }}><div className="pb-wrap"><JoinBand l={l} /></div></section>
    </>;
  }}</Pub>;
}
function JoinBand({ l }) {
  return <div className="b4-band"><div className="pb-col" style={{ gap: 6 }}><h2 className="pb-h2">{t(l, 'Offer your hands', 'अपना हाथ बढ़ाइए')}</h2><p className="pb-small">{t(l, 'Pick a seva that needs volunteers and tell us you’re coming. No experience needed.', 'ऐसी सेवा चुनें जिसमें स्वयंसेवक चाहिए और बताएँ कि आप आ रहे हैं। कोई अनुभव ज़रूरी नहीं।')}</p></div><Button variant="primary" size="lg" icon="hand-heart">{t(l, 'Join a seva', 'सेवा से जुड़ें')}</Button></div>;
}

Object.assign(window, { B4About: About, B4Programs: Programs, B4JoinBand: JoinBand, B4FindBand: FindBand, B4Eb: Eb });
})();
