(() => {
const { Icon, Button, Badge, DharmaRule } = window.SSSSODelhiNCRDesignSystem_9ec6b9;
const tx = (l, en, hi) => (l === 'hi' ? hi : en);

const NAV = [
  ['info', 'About', 'परिचय'], ['hand-heart', 'Programs', 'कार्यक्रम'], ['music', 'Bhajans', 'भजन'], ['heart-handshake', 'Get involved', 'जुड़ें'], ['chart-column', 'Impact', 'प्रभाव'],
  null, ['newspaper', 'News', 'समाचार'], ['calendar-days', 'Calendar', 'कैलेंडर'], ['book-open', 'Discourses', 'प्रवचन', 'flag'],
];

const PUB_ACTIVE = { About: 'about', Programs: 'programs', Bhajans: 'bhajans', 'Get involved': 'join', Impact: 'impact', News: 'news', Calendar: 'calendar', Discourses: 'discourses' };
function PubNav({ phone, active, lang, setLang }) {
  return <div className="pb-navrow"><window.MenuNav inline phone={phone} active={PUB_ACTIVE[active]} lang={lang} setLang={setLang} /></div>;
}

function PubFoot({ lang }) {
  return (
    <>
      <DharmaRule height={3} />
      <footer className="pb-foot"><div className="pb-wrap">
        <div className="pb-foot__g">
          <div><img className="foot-emblem" src="../assets/sarva-dharma-logo.jpg" alt="Sarva Dharma emblem" /><h4>{tx(lang, 'Sri Sathya Sai Seva Organisation', 'श्री सत्य साई सेवा संगठन')}</h4><p>{tx(lang, 'Delhi NCR. Bhajans, study circles, Bal Vikas and seva — open to everyone, free always.', 'दिल्ली एनसीआर। भजन, स्टडी सर्कल, बाल विकास और सेवा — सबके लिए, हमेशा निःशुल्क।')}</p></div>
          <div><h4>{tx(lang, 'Visit', 'आइए')}</h4><p className="pb-foot__l"><a href="#">{tx(lang, 'Calendar', 'कैलेंडर')}</a><a href="#">{tx(lang, 'Centres', 'केंद्र')}</a><a href="#">{tx(lang, 'Impact', 'प्रभाव')}</a></p></div>
          <div><h4>{tx(lang, 'Serve', 'सेवा')}</h4><p className="pb-foot__l"><a href="#">{tx(lang, 'Join a seva', 'सेवा से जुड़ें')}</a><a href="#">{tx(lang, 'Donate', 'दान')}<Icon name="external-link" size={16} /></a><a href="#">SaiConnect<Icon name="external-link" size={16} /></a></p></div>
        </div>
        <div className="pb-foot__fine"><span>{tx(lang, 'All activities are free and open to people of every faith. Nothing is ever collected from the public.', 'सभी गतिविधियाँ निःशुल्क हैं और हर धर्म के लोगों के लिए खुली हैं। जनता से कभी कुछ नहीं लिया जाता।')}</span><span className="pb-foot__x"><a href="#">{tx(lang, 'Privacy', 'गोपनीयता')}</a><a href="#">{tx(lang, 'Coordinator login', 'समन्वयक लॉगिन')}</a></span></div>
      </div></footer>
    </>
  );
}

function Pub({ phone, active, lang: l0 = 'en', children }) {
  const [lang, setLang] = React.useState(l0);
  return (
    <div className={'sx pb' + (phone ? ' pb--phone' : '')} lang={lang}>
      {phone ? <div className="sx-phone__status"><span>9:41</span><span style={{ display: 'inline-flex', gap: 6 }}><Icon name="signal" size={16} /><Icon name="battery-medium" size={16} /></span></div> : null}
      <PubNav phone={phone} active={active} lang={lang} setLang={setLang} />
      {typeof children === 'function' ? children(lang) : children}
      <PubFoot lang={lang} />
    </div>
  );
}

function Crumb({ items }) {
  return <nav className="pb-crumb" aria-label="Breadcrumb">{items.map((c, i) => <React.Fragment key={i}>{i ? <Icon name="chevron-right" size={16} /> : null}{i < items.length - 1 ? <a href="#">{c}</a> : <span>{c}</span>}</React.Fragment>)}</nav>;
}

function SecHd({ title, sub, action }) {
  return <div className="pb-sechd"><div><h2 className="pb-h2">{title}</h2>{sub ? <p>{sub}</p> : null}</div>{action}</div>;
}

const Sel = ({ l, v }) => <button className="pb-sel">{l ? <>{l}: </> : null}<b>{v}</b><Icon name="chevron-down" size={16} /></button>;
const Photo = ({ label = 'Photo slot — no identifiable faces' }) => <div className="pb-photo"><span><Icon name="image" size={20} /><br />{label}</span></div>;

Object.assign(window, { pbTx: tx, Pub, Crumb, SecHd, PbSel: Sel, PbPhoto: Photo });
})();
