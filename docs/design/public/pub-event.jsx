(() => {
const { Icon, Button, Badge } = window.SSSSODelhiNCRDesignSystem_9ec6b9;
const { Pub, Crumb, SecHd, PbPhoto, StatusPill, BarChart } = window;
const t = window.pbTx;

function Meta({ l }) {
  return (
    <div className="pb-meta">
      <div><span className="pb-ic"><Icon name="calendar-days" size={18} /></span><span><b>{t(l, 'Saturday, 17 Oct 2026', 'शनिवार, 17 अक्टूबर 2026')}</b>9:00 AM – 2:00 PM</span></div>
      <div><span className="pb-ic"><Icon name="map-pin" size={18} /></span><span><b>{t(l, 'Dr. Ambedkar Bhawan', 'डॉ. अंबेडकर भवन')}</b>{t(l, 'Pocket 1, Mayur Vihar Ph-1, Delhi 110091', 'पॉकेट 1, मयूर विहार फ़ेज़-1, दिल्ली 110091')}
        <span className="pb-mlinks"><a href="#"><Icon name="navigation" size={16} />Google Maps ↗</a><a href="#"><Icon name="map" size={16} />{t(l, 'See on map', 'नक्शे पर देखें')}</a></span></span></div>
      <div><span className="pb-ic"><Icon name="home" size={18} /></span><span><b><a href="#">{t(l, 'Sai Centre, Mayur Vihar', 'साई केंद्र, मयूर विहार')}</a></b><a href="#">{t(l, 'East district', 'पूर्व ज़िला')}</a></span></div>
      <div><span className="pb-ic"><Icon name="phone" size={18} /></span><span><b>+91 11 2271 4540</b>{t(l, 'Centre phone — call or WhatsApp', 'केंद्र का फ़ोन — कॉल या व्हाट्सऐप')}</span></div>
    </div>
  );
}

function Head({ l, phone, status, title }) {
  return (
    <section className="pb-hero"><div className="pb-wrap">
      <Crumb items={[t(l, 'Calendar', 'कैलेंडर'), t(l, 'Eye camp', 'नेत्र कैंप')]} />
      <div className="pb-col" style={{ gap: 14 }}>
        <div className="pb-row"><Badge tone="shanti" icon="stethoscope">{t(l, 'Medical · eye camp', 'चिकित्सा · नेत्र कैंप')}</Badge>{status ? <StatusPill status={status} lang={l} /> : null}</div>
        <h1 className={'pb-h1' + (status === 'cancelled' ? ' pb-strike' : '')}>{title || t(l, 'Free eye camp in Mayur Vihar', 'मयूर विहार में निःशुल्क नेत्र कैंप')}</h1>
        <p className="pb-lead">{t(l, 'Saturday, 17 Oct 2026 · 9:00 AM – 2:00 PM', 'शनिवार, 17 अक्टूबर 2026 · सुबह 9:00 – दोपहर 2:00')}</p>
      </div>
    </div></section>
  );
}

function Join({ l }) {
  return (
    <div className="pb-vol">
      <span className="pb-vol__n">{t(l, '6 volunteers needed', '6 स्वयंसेवकों की ज़रूरत')}</span>
      <span className="pb-small">{t(l, 'Registration desk, queue help and spectacles fitting. No experience needed — we show you on the day.', 'पंजीकरण डेस्क, कतार में मदद और चश्मा लगाना। अनुभव ज़रूरी नहीं — उसी दिन सिखा देंगे।')}</span>
      <Button variant="primary" icon="hand-heart" fullWidth>{t(l, 'Join this seva', 'इस सेवा से जुड़ें')}</Button>
    </div>
  );
}

function Before({ l, phone }) {
  return <Pub phone={phone} active="Calendar" lang={l}>{lang => <BeforeBody l={lang} phone={phone} />}</Pub>;
}
function BeforeBody({ l, phone }) {
  const about = (
    <div className="pb-col" style={{ gap: 32 }}>
      <div className="pb-prose">
        <h2 className="pb-h3">{t(l, 'About this seva', 'इस सेवा के बारे में')}</h2>
        <p>{t(l, 'A free eye check-up for anyone who comes. Doctors from ICARE Eye Hospital will test vision, give spectacles on the spot where needed, and refer anyone who needs cataract surgery.', 'जो भी आए उसके लिए निःशुल्क आँखों की जाँच। ICARE आई हॉस्पिटल के डॉक्टर नज़र जाँचेंगे, ज़रूरत पर वहीं चश्मा देंगे, और मोतियाबिंद की सर्जरी के लिए रेफ़र करेंगे।')}</p>
        <p>{t(l, 'Elders are seen first. There is shade and drinking water. Seva (service) here is free, always.', 'बुज़ुर्गों को पहले देखा जाएगा। छाया और पीने के पानी की व्यवस्था है। यहाँ सेवा हमेशा निःशुल्क है।')}</p>
      </div>
      <div className="pb-col" style={{ gap: 14 }}>
        <h2 className="pb-h3">{t(l, 'What to bring', 'क्या लाएँ')}</h2>
        <ul className="pb-ul">
          {[['glasses', 'Any spectacles you use now', 'अभी जो चश्मा पहनते हैं'], ['pill', 'A list of medicines you take', 'आप जो दवाइयाँ लेते हैं उनकी सूची'], ['file-text', 'Old eye reports, if you have them', 'पुरानी आँखों की रिपोर्ट, अगर हों']].map(([i, a, b]) => <li key={a}><Icon name={i} size={18} />{t(l, a, b)}</li>)}
        </ul>
        <span className="pb-cap">{t(l, 'No ID or documents needed.', 'कोई पहचान पत्र या दस्तावेज़ ज़रूरी नहीं।')}</span>
      </div>
      <div className="pb-card" style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <span className="pb-prg__ic"><Icon name="handshake" size={20} /></span>
        <span className="pb-small"><b style={{ fontWeight: 600, color: 'var(--slate-900)' }}>{t(l, 'With ICARE Eye Hospital', 'ICARE आई हॉस्पिटल के साथ')}</b><br />{t(l, 'Doctors and equipment provided by our partner.', 'डॉक्टर और उपकरण हमारे साझेदार की ओर से।')}</span>
      </div>
    </div>
  );
  const side = <div className="pb-col" style={{ gap: 16 }}><div className="pb-card" style={{ paddingTop: 8, paddingBottom: 8 }}><Meta l={l} /></div><Join l={l} /></div>;
  return (
    <>
      <Head l={l} phone={phone} status="planned" />
      <section className="pb-sec" style={{ paddingTop: phone ? 8 : 24 }}><div className="pb-wrap">
        {phone ? <div className="pb-col" style={{ gap: 32 }}>{side}{about}</div> : <div className="pb-g pb-gmain">{about}{side}</div>}
      </div></section>
    </>
  );
}

const POW = [['+1.0', 12], ['+1.5', 10], ['+2.0', 20], ['+2.5', 14], ['+3.0', 7]];
function After({ l, phone }) {
  return (
    <Pub phone={phone} active="Calendar" lang={l}>
      {lang => <>
        <Head l={lang} phone={phone} status="approved" title={t(lang, '115 people had their eyes checked in Mayur Vihar', 'मयूर विहार में 115 लोगों की आँखों की जाँच हुई')} />
        <section className="pb-sec" style={{ paddingTop: phone ? 8 : 24 }}><div className="pb-wrap pb-col" style={{ gap: phone ? 28 : 40 }}>
          <div className="pb-g pb-g3" style={phone ? { gridTemplateColumns: '1fr 1fr' } : null}>
            {[[115, 'people screened', 'लोगों की जाँच हुई'], [63, 'spectacles given', 'चश्मे दिए गए'], [13, 'cataract cases found', 'मोतियाबिंद के मामले मिले']].map(([n, a, b], i) => <div className="pb-res" key={a} style={phone && i === 2 ? { gridColumn: '1/-1' } : null}><b>{n}</b><span>{t(lang, a, b)}</span></div>)}
          </div>
          <span className="pb-cap" style={{ marginTop: phone ? -16 : -28 }}>{t(lang, 'Approved by the East district coordinator on 20 Oct 2026. One person may attend more than once.', 'पूर्व ज़िला समन्वयक द्वारा 20 अक्टूबर 2026 को स्वीकृत। एक व्यक्ति एक से अधिक बार आ सकता है।')}</span>
          <div className="pb-g" style={{ gridTemplateColumns: phone ? '1fr' : 'minmax(0,1.3fr) minmax(0,1fr)', gap: phone ? 16 : 24 }}>
            <div className="pb-card"><h2 className="pb-h3">{t(lang, 'Spectacles by power', 'नंबर के अनुसार चश्मे')}</h2><BarChart data={POW.map(([label, value]) => ({ label, value }))} unitLabel="Spectacles by power" height={phone ? 160 : 200} /></div>
            <div className="pb-card">
              <h2 className="pb-h3">{t(lang, 'Cataract surgeries', 'मोतियाबिंद सर्जरी')}</h2>
              <span style={{ fontFamily: 'var(--font-serif-display)', fontSize: 32, color: 'var(--text-heading)', lineHeight: 1.2 }}>{t(lang, '0 of 13 so far', 'अब तक 13 में से 0')}</span>
              <div className="pb-prog" role="progressbar" aria-valuenow="0" aria-valuemax="13"><i style={{ width: '0%' }}></i></div>
              <span className="pb-small">{t(lang, 'All 13 were referred to ICARE Eye Hospital. We update this as surgeries happen.', 'सभी 13 को ICARE आई हॉस्पिटल रेफ़र किया गया। सर्जरी होने पर हम इसे अपडेट करते हैं।')}</span>
            </div>
          </div>
          <div className="pb-col" style={{ gap: 14 }}>
            <h2 className="pb-h3">{t(lang, 'Photos', 'तस्वीरें')}</h2>
            <div className="pb-g" style={{ gridTemplateColumns: phone ? '1fr 1fr' : 'repeat(4,minmax(0,1fr))', gap: 12 }}><PbPhoto label="Sevadals at the desk" /><PbPhoto label="Spectacles table" /><PbPhoto label="Doctors at work — no faces" /><PbPhoto label="Venue" /></div>
          </div>
          <div className="pb-card" style={{ flexDirection: phone ? 'column' : 'row', alignItems: phone ? 'stretch' : 'center', justifyContent: 'space-between' }}>
            <span className="pb-col" style={{ gap: 2 }}><span className="pt-eb" style={{ fontSize: 12, letterSpacing: '.16em', textTransform: 'uppercase', fontWeight: 600, color: 'var(--blue-600)' }}>{t(lang, 'Report', 'रिपोर्ट')}</span><span style={{ fontFamily: 'var(--font-serif-display)', fontSize: 20, color: 'var(--text-heading)' }}>{t(lang, 'A morning of eye care in Mayur Vihar', 'मयूर विहार में आँखों की देखभाल की एक सुबह')}</span></span>
            <Button variant="secondary" iconAfter="arrow-right">{t(lang, 'Read the report', 'रिपोर्ट पढ़ें')}</Button>
          </div>
          <div className="pb-card" style={{ paddingTop: 8, paddingBottom: 8 }}><Meta l={lang} /></div>
        </div></section>
      </>}
    </Pub>
  );
}

const BANNER = {
  awaiting: { tone: 'sx-t-yellow', icon: 'hourglass', status: 'report_submitted', en: ['Results coming soon', 'Results appear here once the East district coordinator approves the report.'], hi: ['परिणाम जल्द', 'पूर्व ज़िला समन्वयक के रिपोर्ट स्वीकृत करते ही परिणाम यहाँ दिखेंगे।'] },
  cancelled: { tone: 'sx-t-slate', icon: 'x-circle', status: 'cancelled', en: ['This seva was cancelled', 'We’re sorry for the change. See other seva coming up near you in the calendar.'], hi: ['यह सेवा रद्द हो गई', 'बदलाव के लिए क्षमा करें। अपने पास की अन्य सेवाएँ कैलेंडर में देखें।'] },
  postponed: { tone: 'sx-t-slate', icon: 'calendar-clock', status: 'postponed', en: ['Postponed', 'The new date will be shared here and on the centre’s WhatsApp updates.'], hi: ['स्थगित', 'नई तारीख़ यहाँ और केंद्र के व्हाट्सऐप अपडेट पर बताई जाएगी।'] },
};
function StateBanner({ kind, l = 'en' }) {
  const b = BANNER[kind], [h, p] = b[l];
  return (
    <Pub phone active="Calendar" lang={l}>
      {lang => <>
        <Head l={lang} phone status={b.status} />
        <section className="pb-sec" style={{ paddingTop: 8 }}><div className="pb-wrap pb-col" style={{ gap: 16 }}>
          <div className={'pb-banner ' + b.tone} role="status"><Icon name={b.icon} size={20} /><span><b>{h}</b>{p}</span></div>
          {kind === 'awaiting' ? <div className="pb-g pb-g2" style={{ gap: 12 }}>{['people screened', 'spectacles given'].map(x => <div className="pb-res" key={x} style={{ borderStyle: 'dashed', boxShadow: 'none' }}><b style={{ color: 'var(--slate-400)' }}>—</b><span>{x}</span></div>)}</div> : <Button variant="outline" iconAfter="arrow-right">See the calendar</Button>}
        </div></section>
      </>}
    </Pub>
  );
}

Object.assign(window, { PubEventBefore: Before, PubEventAfter: After, PubEventState: StateBanner });
})();
