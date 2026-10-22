(() => {
const { Icon, Button, Badge } = window.SSSSODelhiNCRDesignSystem_9ec6b9;
const { Pub, Crumb, SecHd } = window;
const t = window.b3t;
const CATS = [['All', 'सभी'], ['News and events', 'समाचार और कार्यक्रम'], ['District activities', 'ज़िला गतिविधियाँ'], ['Centenary', 'शताब्दी'], ['Seva stories', 'सेवा कथाएँ']];
const ART = [
  ['A morning in Mayur Vihar', 'मयूर विहार में एक सुबह', 'District activities', 'prem', '18 Oct 2026', 'East', true],
  ['Bal Vikas annual day across nine districts', 'नौ ज़िलों में बाल विकास वार्षिक दिवस', 'News and events', 'shanti', '12 Oct 2026', 'Delhi NCR', true],
  ['Centenary seva: 100 villages, one year', 'शताब्दी सेवा: 100 गाँव, एक वर्ष', 'Centenary', 'sathya', '1 Oct 2026', 'Delhi NCR', false],
  ['Winter blanket rounds begin in North', 'उत्तर में सर्दियों की कंबल सेवा शुरू', 'Seva stories', 'prem', '24 Sep 2026', 'North', false],
  ['Blood donation camp at Dwarka', 'द्वारका में रक्तदान शिविर', 'District activities', 'prem', '14 Mar 2019', 'West', false],
  ['Akhanda bhajan, 24 hours', 'अखंड भजन, 24 घंटे', 'News and events', 'shanti', '9 Nov 2018', 'Central', false],
];
function NCard({ a, l, compact }) {
  return <a href="#" className="pb-card pb-card--link b4-ncard"><window.PbPhoto label={t(l, 'Article photo', 'लेख की फ़ोटो')} /><div className="pb-col" style={{ padding: compact ? 14 : 18, gap: 6 }}>
    <div className="pb-row" style={{ gap: 8 }}><Badge tone={a[3]}>{a[2]}</Badge><span className="pb-cap">{a[4]}</span></div>
    <h3 className="pb-h3" style={{ fontSize: compact ? 18 : 20 }}>{l === 'hi' && a[6] ? a[1] : a[0]}</h3>
    {l === 'hi' && !a[6] ? <span className="b4-eng"><Icon name="languages" size={16} />{t(l, 'Available in English only', 'केवल अंग्रेज़ी में उपलब्ध')}</span> : null}
    <span className="pb-cap" style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}><Icon name="map-pin" size={16} />{a[5]}</span></div></a>;
}
function News({ phone, l: l0 }) {
  return <Pub phone={phone} active="News" lang={l0}>{l => {
    const i = l === 'hi' ? 1 : 0;
    return <>
      <section className="pb-hero"><div className="pb-wrap">
        <Crumb items={[t(l, 'Home', 'होम'), t(l, 'News', 'समाचार')]} />
        <h1 className="pb-h1">{t(l, 'News and stories', 'समाचार और कथाएँ')}</h1>
        <div className="b4-tabs" role="tablist" style={{ marginTop: 20 }}>{CATS.map((c, k) => <button key={c[0]} role="tab" aria-selected={k === 0}>{c[i]}</button>)}</div>
      </div></section>
      <section className="pb-sec" style={{ paddingTop: 8 }}><div className="pb-wrap pb-col" style={{ gap: 24 }}>
        <div className={'pb-g ' + (phone ? '' : 'pb-g3')}>{ART.map(a => <NCard key={a[0]} a={a} l={l} compact={phone} />)}</div>
        <div className="pb-row" style={{ justifyContent: 'center' }}><Button variant="outline">{t(l, 'Show older stories', 'पुरानी कथाएँ दिखाएँ')}</Button></div>
      </div></section>
    </>;
  }}</Pub>;
}
function Article({ phone, l: l0 }) {
  return <Pub phone={phone} active="News" lang={l0}>{l => {
    const hi = l === 'hi';
    return <>
      {hi ? <div className="b4-enbar" role="status"><Icon name="languages" size={18} /><span>{'यह लेख केवल अंग्रेज़ी में उपलब्ध है।'} <span lang="en">Available in English only.</span></span></div> : null}
      <section className="pb-hero" style={{ paddingBottom: 24 }}><div className="pb-wrap" lang="en">
        <Crumb items={[t(l, 'Home', 'होम'), t(l, 'News', 'समाचार'), 'A morning in Mayur Vihar']} />
        <div className="b4-art pb-col" style={{ gap: 12 }}>
          <div className="pb-row" style={{ gap: 8 }}><Badge tone="prem">District activities</Badge><span className="pb-cap">18 Oct 2026 · East district</span></div>
          <h1 className="pb-h1">A morning in Mayur Vihar</h1>
          <p className="pb-lead">One hundred and fifteen people came for an eye check-up. Sixty-three went home with reading glasses.</p>
        </div>
      </div></section>
      <section className="pb-sec" style={{ paddingTop: 0 }}><div className="pb-wrap" lang="en">
        <div className={'pb-g ' + (phone ? '' : 'pb-gmain')} style={{ gap: phone ? 24 : 48 }}>
          <div className="pb-col" style={{ gap: 20 }}>
            <window.PbPhoto label="Photo slot — the registration desk, no identifiable patients" />
            <div className="pb-prose"><p>The queue began before eight. By the time the ICARE team had set up their charts in the main hall of Dr. Ambedkar Bhawan, sevadals had already served tea and found chairs for the older visitors.</p><p>Each person was seen by an optometrist, both eyes, every time. Where reading glasses would help, they were fitted on the spot from the stock the samithi had counted the night before.</p><p>Thirteen people were found to have cataracts. Each has been referred to the hospital, which will call with a date for free surgery.</p></div>
          </div>
          <aside className="pb-col" style={{ gap: 16 }}>
            <div className="b4-res">
              <span className="b4-eb">{t(l, 'From this event', 'इस कार्यक्रम से')}</span>
              <h2 className="pb-h3">Eye camp · 17 Oct 2026</h2>
              <div className="b4-res__n">{[['115', 'screened'], ['63', 'spectacles'], ['13', 'referred']].map(n => <div key={n[1]}><b>{n[0]}</b><span>{n[1]}</span></div>)}</div>
              <window.StatusPill status="approved" lang={l} />
              <a href="#" className="pb-more">{t(l, 'See the event page', 'कार्यक्रम पेज देखें')}<Icon name="arrow-right" size={16} /></a>
            </div>
            <div className="pb-card" style={{ gap: 8 }}><span className="pb-cap" style={{ fontWeight: 600 }}>{t(l, 'Share', 'साझा करें')}</span><div className="pb-row"><Button variant="outline" size="sm" icon="message-circle">WhatsApp</Button><Button variant="outline" size="sm" icon="link">{t(l, 'Copy link', 'लिंक कॉपी करें')}</Button></div></div>
          </aside>
        </div>
      </div></section>
    </>;
  }}</Pub>;
}

const ERR = {
  404: ['map-pin-off', ['We couldn’t find that page', 'वह पेज नहीं मिला'], ['The link may be mistyped, or the page has been removed.', 'लिंक ग़लत हो सकता है, या पेज हटा दिया गया है।']],
  500: ['cloud-off', ['Something went wrong on our side', 'हमारी ओर से कुछ गड़बड़ हुई'], ['Please try again in a minute. If it keeps happening, the centre number below can help.', 'कृपया एक मिनट बाद फिर कोशिश करें। बार-बार हो तो नीचे दिया केंद्र नंबर मदद करेगा।']],
  moved: ['arrow-right-left', ['This page moved when our site changed', 'साइट बदलने पर यह पेज कहीं और चला गया'], ['You followed a link to the old saidelhi.org. Most pages have a new home — search for it below, or try these.', 'आप पुरानी saidelhi.org का लिंक खोलकर आए हैं। ज़्यादातर पेजों का नया पता है — नीचे खोजें, या ये आज़माएँ।']],
};
function ErrorPage({ kind, phone, l: l0 }) {
  const [ic, h, b] = ERR[kind];
  return <Pub phone={phone} lang={l0}>{l => {
    const i = l === 'hi' ? 1 : 0;
    return <section className="pb-sec b4-err"><div className="pb-wrap pb-col" style={{ gap: 18, alignItems: 'flex-start', maxWidth: 760 }}>
      <span className="b4-err__ic"><Icon name={ic} size={24} /></span>
      {kind === 'moved' ? <span className="b4-old"><Icon name="link" size={16} />saidelhi.org/index.php?option=com_content&amp;view=article&amp;id=412</span> : <span className="pb-cap">{kind === '404' ? t(l, 'Error 404', 'त्रुटि 404') : t(l, 'Error 500', 'त्रुटि 500')}</span>}
      <h1 className="pb-h1" style={{ fontSize: phone ? 30 : 40 }}>{h[i]}</h1>
      <p className="pb-lead">{b[i]}</p>
      {kind === '500' ? <div className="pb-row"><Button variant="primary" icon="refresh-cw">{t(l, 'Try again', 'फिर कोशिश करें')}</Button><Button variant="outline" icon="home">{t(l, 'Home', 'होम')}</Button></div> :
        <form className="b4-search" style={{ width: '100%' }} onSubmit={e => e.preventDefault()}><span className="sx-ctl" style={{ flex: 1 }}><span className="sx-ctl__ic"><Icon name="search" size={18} /></span><input defaultValue={kind === 'moved' ? 'bal vikas' : ''} placeholder={t(l, 'Search the site', 'साइट में खोजें')} aria-label={t(l, 'Search the site', 'साइट में खोजें')} /></span><Button variant="primary">{t(l, 'Search', 'खोजें')}</Button></form>}
      {kind === 'moved' ? <div className="pb-col" style={{ gap: 8, width: '100%' }}><span className="pb-cap" style={{ fontWeight: 600 }}>{t(l, 'Closest matches', 'सबसे क़रीबी')}</span>{[['Bal Vikas', 'बाल विकास', '/programs/bal-vikas'], ['Bal Vikas annual day across nine districts', 'नौ ज़िलों में बाल विकास वार्षिक दिवस', '/news/bal-vikas-annual-day-2026'], ['Find a centre', 'केंद्र खोजें', '/centres/map']].map(m => <a key={m[2]} href="#" className="pb-crow" style={{ gridTemplateColumns: 'minmax(0,1fr) auto' }}><span className="pb-col" style={{ gap: 2 }}><span className="pb-crow__t">{m[i]}</span><span className="pb-crow__m">{m[2]}</span></span><Icon name="arrow-right" size={18} /></a>)}</div> : null}
      <div className="b4-quick">{[['calendar-days', ['Calendar', 'कैलेंडर']], ['map-pin', ['Centres', 'केंद्र']], ['hand-heart', ['Programmes', 'कार्यक्रम']], ['newspaper', ['News', 'समाचार']]].map(q => <a key={q[0]} href="#"><Icon name={q[0]} size={18} />{q[1][i]}</a>)}</div>
      {kind === '500' ? <p className="pb-cap">{t(l, 'State office: 011-4000 0000 · 9 AM to 6 PM', 'राज्य कार्यालय: 011-4000 0000 · सुबह 9 से शाम 6')}</p> : null}
    </div></section>;
  }}</Pub>;
}

Object.assign(window, { B4News: News, B4Article: Article, B4Error: ErrorPage });
})();
