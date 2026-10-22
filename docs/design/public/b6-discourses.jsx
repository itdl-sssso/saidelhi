(() => {
const { Icon, Button, Badge, QuoteCard, DharmaRule } = window.SSSSODelhiNCRDesignSystem_9ec6b9;
const { Pub, Crumb, SecHd } = window;
const t = window.pbTx;
const CREDIT = ['Published with permission of Sri Sathya Sai Sadhana Trust, Publications Division.', 'श्री सत्य साई साधना ट्रस्ट, प्रकाशन प्रभाग की अनुमति से प्रकाशित।'];
const THEMES = [['Character', 'चरित्र'], ['Education and purpose', 'शिक्षा और उद्देश्य'], ['Discipline', 'अनुशासन'], ['Ceiling on desires', 'इच्छाओं पर सीमा'], ['Technology and distraction', 'तकनीक और भटकाव'], ['Addiction and habits', 'लत और आदतें'], ['Parents', 'माता-पिता'], ['Friendship', 'मित्रता'], ['Self-confidence', 'आत्मविश्वास'], ['Leadership', 'नेतृत्व'], ['Service', 'सेवा'], ['Time', 'समय'], ['Career and ethics', 'करियर और नैतिकता'], ['Mental peace', 'मन की शांति']];
const DISC = [
  { s: 'students-character', t: ['Character is the true wealth of a student', 'चरित्र ही विद्यार्थी का सच्चा धन है'], d: ['22 Nov 2006', '22 नवं 2006'], p: ['Prasanthi Nilayam', 'प्रशांति निलयम'], o: ['Convocation', 'दीक्षांत समारोह'], tags: [0, 1], why: ['On choosing what kind of person to become while you are still choosing a degree.', 'डिग्री चुनते समय यह भी चुनना कि कैसा इंसान बनना है।'] },
  { s: 'ceiling-on-desires', t: ['Put a ceiling on your desires', 'अपनी इच्छाओं पर सीमा लगाओ'], d: ['19 Jan 1983', '19 जन 1983'], p: ['Prasanthi Nilayam', 'प्रशांति निलयम'], o: ['Youth conference', 'युवा सम्मेलन'], tags: [3, 11], why: ['Money, food, time and energy — and why wasting less of each frees you.', 'पैसा, भोजन, समय और ऊर्जा — और इनकी बर्बादी कम करने से कैसे मुक्ति मिलती है।'] },
  { s: 'mind-and-senses', t: ['The mind is a bundle of desires', 'मन इच्छाओं की गठरी है'], d: ['14 Jan 1996', '14 जन 1996'], p: ['Brindavan', 'बृंदावन'], o: ['Summer course', 'ग्रीष्म पाठ्यक्रम'], tags: [4, 5, 13], why: ['Useful for anyone who picks up their phone without deciding to.', 'उनके लिए जो बिना सोचे फ़ोन उठा लेते हैं।'] },
  { s: 'mother-father', t: ['Revere your mother and father', 'माता-पिता का आदर करो'], d: ['6 May 1999', '6 मई 1999'], p: ['Brindavan', 'बृंदावन'], o: ['Easwaramma Day', 'ईश्वरम्मा दिवस'], tags: [6], why: ['On gratitude at home, before service outside it.', 'बाहर सेवा से पहले घर में कृतज्ञता।'] },
  { s: 'leaders-serve', t: ['A true leader is a servant first', 'सच्चा नेता पहले सेवक होता है'], d: ['21 Nov 2001', '21 नवं 2001'], p: ['Prasanthi Nilayam', 'प्रशांति निलयम'], o: ['Youth meet', 'युवा सम्मेलन'], tags: [9, 10], why: ['For team captains, class reps and anyone asked to run something.', 'टीम कप्तान, कक्षा प्रतिनिधि और हर उस व्यक्ति के लिए जिसे कुछ चलाने को कहा गया है।'] },
  { s: 'time-is-god', t: ['Time wasted is life wasted', 'समय की बर्बादी जीवन की बर्बादी है'], d: ['1 Jan 2004', '1 जन 2004'], p: ['Prasanthi Nilayam', 'प्रशांति निलयम'], o: ['New Year', 'नव वर्ष'], tags: [11, 2], why: ['A short talk to read at the start of an exam term.', 'परीक्षा सत्र की शुरुआत में पढ़ने योग्य छोटा प्रवचन।'] },
];
const ThemeChips = ({ l, on = -1, limit }) => <div className="pb-chips b6-chips" role="group" aria-label={t(l, 'Themes', 'विषय')}>{(limit ? THEMES.slice(0, limit) : THEMES).map((x, i) => <button key={x[0]} className="sx-chip" aria-pressed={i === on}>{t(l, x[0], x[1])}</button>)}{limit ? <button className="sx-chip">{t(l, `+${THEMES.length - limit} more`, `+${THEMES.length - limit} और`)}</button> : null}</div>;
function DCard({ d, l }) {
  const i = l === 'hi' ? 1 : 0;
  return <a href="#" className="pb-card pb-card--link b6-dcard">
    <span className="pb-cap">{d.d[i]} · {d.p[i]} · {d.o[i]}</span>
    <h3 className="pb-h3">{d.t[i]}</h3>
    <p className="b6-why"><b>{t(l, 'Why it matters', 'क्यों ज़रूरी है')}</b> {d.why[i]}</p>
    <div className="pb-row" style={{ gap: 6, marginTop: 'auto' }}>{d.tags.map(k => <Badge key={k} tone="shanti">{THEMES[k][i]}</Badge>)}</div>
  </a>;
}
const FEAT = ['Hands that serve are holier than lips that pray.', 'सेवा करने वाले हाथ प्रार्थना करने वाले होंठों से अधिक पवित्र हैं।'];
function Discourses({ phone, l: l0 }) {
  return <Pub phone={phone} active="Discourses" lang={l0}>{l => {
    const i = l === 'hi' ? 1 : 0;
    return <>
      <section className="pb-hero"><div className="pb-wrap">
        <Crumb items={[t(l, 'Home', 'होम'), t(l, 'Discourses', 'प्रवचन')]} />
        <div className={'pb-g ' + (phone ? '' : 'pb-gmain')} style={{ alignItems: 'end', gap: phone ? 24 : 48 }}>
          <div className="pb-col" style={{ gap: 14 }}>
            <span className="b6-eb">{t(l, 'For ages 16 to 30', '16 से 30 वर्ष के लिए')}</span>
            <h1 className="pb-h1">{t(l, 'Words for young people', 'युवाओं के लिए वचन')}</h1>
            <p className="pb-lead">{t(l, 'Talks by Bhagawan Sri Sathya Sai Baba on study, work, friendship and a steady mind — in English and Hindi.', 'पढ़ाई, काम, दोस्ती और स्थिर मन पर भगवान श्री सत्य साई बाबा के प्रवचन — अंग्रेज़ी और हिंदी में।')}</p>
            <span className="b6-credit"><Icon name="book-open" size={16} />{CREDIT[i]}</span>
          </div>
          <figure className="b6-feat">
            <QuoteCard label={t(l, 'Featured', 'विशेष')} quote={FEAT[i]} attribution={t(l, 'Bhagawan Sri Sathya Sai Baba', 'भगवान श्री सत्य साई बाबा')} />
            <Button variant="outline" size="sm" icon="share-2">{t(l, 'Share as image', 'चित्र के रूप में साझा करें')}</Button>
          </figure>
        </div>
      </div></section>
      <section className="pb-sec" style={{ paddingTop: 8 }}><div className="pb-wrap pb-col" style={{ gap: 20 }}>
        <label className="sx-search b6-search"><Icon name="search" size={18} /><input placeholder={t(l, 'Search by word or theme, e.g. exams, anger, phone', 'शब्द या विषय से खोजें, जैसे परीक्षा, क्रोध, फ़ोन')} /></label>
        <ThemeChips l={l} on={-1} limit={phone ? 6 : 0} />
        <div className="pb-row" style={{ justifyContent: 'space-between' }}><span className="pb-cap">{t(l, '24 discourses', '24 प्रवचन')}</span><window.PbSel l={t(l, 'Sort', 'क्रम')} v={t(l, 'Newest first', 'नवीनतम पहले')} /></div>
        <div className={'pb-g ' + (phone ? '' : 'pb-g3')}>{DISC.map(d => <DCard key={d.s} d={d} l={l} />)}</div>
        <div className="pb-row" style={{ justifyContent: 'center' }}><Button variant="outline">{t(l, 'Show more', 'और दिखाएँ')}</Button></div>
      </div></section>
    </>;
  }}</Pub>;
}

/* ---------- B · Reader ---------- */
const BODY = [
  { h: ['What is character?', 'चरित्र क्या है?'] },
  { p: ['Placeholder paragraph. The approved English text from the Trust goes here, set at 66 characters a line so it reads comfortably on a phone or a laptop.', 'प्लेसहोल्डर अनुच्छेद। ट्रस्ट से स्वीकृत हिंदी अनुवाद यहाँ आएगा, एक पंक्ति में लगभग 66 अक्षर, ताकि फ़ोन या लैपटॉप पर आराम से पढ़ा जा सके।'] },
  { p: ['Placeholder paragraph. Each paragraph keeps the same number in both languages, so a reader can switch language and land in the same place.', 'प्लेसहोल्डर अनुच्छेद। हर अनुच्छेद का नंबर दोनों भाषाओं में एक ही रहता है, ताकि भाषा बदलने पर पाठक उसी जगह पहुँचे।'] },
  { q: ['Character is the true wealth of a student.', 'चरित्र ही विद्यार्थी का सच्चा धन है।'] },
  { poem: true },
  { h: ['Education for life', 'जीवन के लिए शिक्षा'] },
  { p: ['Placeholder paragraph. Sanskrit terms are glossed the first time they appear — dharma (right conduct), buddhi (intellect) — and linked to the glossary.', 'प्लेसहोल्डर अनुच्छेद। संस्कृत शब्दों का अर्थ पहली बार आने पर दिया जाता है — धर्म (सही आचरण), बुद्धि (विवेक-शक्ति) — और शब्दावली से जोड़ा जाता है।'] },
];
const QUOTES = [['Character is the true wealth of a student.', 'चरित्र ही विद्यार्थी का सच्चा धन है।'], ['Put a ceiling on your desires.', 'अपनी इच्छाओं पर सीमा लगाओ।'], ['Hands that serve are holier than lips that pray.', 'सेवा करने वाले हाथ प्रार्थना करने वाले होंठों से अधिक पवित्र हैं।']];
function Prose({ l, num }) {
  const i = l === 'hi' ? 1 : 0; let n = 0;
  return <div className="b6-prose" lang={l}>{BODY.map((b, k) => {
    if (b.h) return <h2 key={k} className="b6-h">{b.h[i]}</h2>;
    if (b.q) return <blockquote key={k} className="b6-pull"><p>{b.q[i]}</p></blockquote>;
    if (b.poem) return <figure key={k} className="b6-poem"><p>[{t(l, 'Telugu poem — transliteration as in the source', 'तेलुगु पद्य — स्रोत के अनुसार लिप्यंतरण')}]</p><figcaption>{t(l, 'Meaning: placeholder for the approved rendering of the poem.', 'अर्थ: पद्य के स्वीकृत अनुवाद का प्लेसहोल्डर।')}</figcaption></figure>;
    n++; return <p key={k} className="b6-para">{num ? <span className="b6-pn" aria-hidden="true">{n}</span> : null}{b.p[i]}</p>;
  })}</div>;
}
function Reader({ phone, l: l0, side }) {
  return <Pub phone={phone} active="Discourses" lang={l0}>{l => {
    const i = l === 'hi' ? 1 : 0; const d = DISC[0];
    return <>
      <section className="pb-hero" style={{ paddingBottom: 24 }}><div className="pb-wrap">
        <Crumb items={[t(l, 'Home', 'होम'), t(l, 'Discourses', 'प्रवचन'), d.t[i]]} />
        <div className="b6-head">
          <span className="pb-cap">{d.d[i]} · {d.p[i]} · {d.o[i]}</span>
          <h1 className="pb-h1">{d.t[i]}</h1>
          <div className="pb-row" style={{ gap: 6 }}>{d.tags.map(k => <Badge key={k} tone="shanti">{THEMES[k][i]}</Badge>)}</div>
          <span className="b6-src"><Icon name="library" size={16} />{t(l, 'Source: Sathya Sai Speaks Vol 39, Ch 13', 'स्रोत: सत्य साई स्पीक्स खंड 39, अध्याय 13')}</span>
          <div className="pb-row" style={{ gap: 8, marginTop: 4 }}>
            <div className="pb-seg" role="group" aria-label={t(l, 'Reading language', 'पढ़ने की भाषा')}><button aria-pressed={!side && l === 'en'}>English</button><button aria-pressed={!side && l === 'hi'}>हिंदी</button>{phone ? null : <button aria-pressed={!!side}><Icon name="columns-2" size={16} />{t(l, 'Side by side', 'साथ-साथ')}</button>}</div>
            <span className="pb-cap">{t(l, '12 min read', '12 मिनट का पाठ')}</span>
          </div>
        </div>
      </div></section>
      <section className="pb-sec" style={{ paddingTop: 0 }}><div className="pb-wrap">
        {side ? <div className="b6-side"><div><span className="b6-eb">English</span><Prose l="en" num /></div><div><span className="b6-eb">हिंदी</span><Prose l="hi" num /></div></div> : <Prose l={l} />}
      </div></section>
      <section className="pb-sec pb-sec--calm"><div className="pb-wrap">
        <SecHd title={t(l, 'Words to share', 'साझा करने योग्य वचन')} sub={t(l, 'Each saves as a square image for WhatsApp or Instagram.', 'हर एक को व्हाट्सऐप या इंस्टाग्राम के लिए चौकोर चित्र के रूप में सहेजें।')} />
        <div className={'pb-g ' + (phone ? '' : 'pb-g3')}>{QUOTES.map(q => <div key={q[0]} className="pb-col" style={{ gap: 10 }}><QuoteCard label={t(l, 'From this discourse', 'इस प्रवचन से')} quote={q[i]} attribution={t(l, 'Bhagawan Sri Sathya Sai Baba', 'भगवान श्री सत्य साई बाबा')} /><div><Button variant="outline" size="sm" icon="image-down">{t(l, 'Share as image', 'चित्र के रूप में साझा करें')}</Button></div></div>)}</div>
      </div></section>
      <section className="pb-sec"><div className="pb-wrap pb-col" style={{ gap: 32 }}>
        <div className="b6-tnote">
          <Icon name="languages" size={20} />
          <div className="pb-col" style={{ gap: 6 }}>
            <b>{t(l, 'About this translation', 'इस अनुवाद के बारे में')}</b>
            <p className="pb-small">{t(l, 'The Hindi was prepared by volunteers and checked by two reviewers against the English published by the Trust. Where they differ, the Trust’s text is the authority.', 'हिंदी अनुवाद स्वयंसेवकों ने तैयार किया और दो समीक्षकों ने ट्रस्ट द्वारा प्रकाशित अंग्रेज़ी से मिलाकर जाँचा। जहाँ अंतर हो, ट्रस्ट का पाठ ही मान्य है।')}</p>
            <p className="pb-small">{CREDIT[i]}</p>
            <div><Button variant="ghost" size="sm" icon="flag">{t(l, 'Report a correction', 'सुधार सुझाएँ')}</Button></div>
          </div>
        </div>
        <div>
          <SecHd title={t(l, 'Read next', 'आगे पढ़ें')} />
          <div className={'pb-g ' + (phone ? '' : 'pb-g3')}>
            {DISC.slice(1, 3).map(x => <DCard key={x.s} d={x} l={l} />)}
            <a href="#" className="pb-card pb-card--link b6-vlink"><span className="b6-eb">{t(l, 'Human value', 'मानवीय मूल्य')}</span><h3 className="pb-h3">{t(l, 'Sathya · Truth', 'सत्य')}</h3><p className="pb-small">{t(l, 'How the value of truth shows up in seva across Delhi NCR.', 'दिल्ली एनसीआर की सेवा में सत्य का मूल्य कैसे दिखता है।')}</p><span className="pb-row" style={{ gap: 6, color: 'var(--blue-600)', marginTop: 'auto' }}>{t(l, 'Open value page', 'मूल्य पेज खोलें')}<Icon name="arrow-right" size={16} /></span></a>
          </div>
        </div>
      </div></section>
    </>;
  }}</Pub>;
}

function QuoteImage({ l = 'en' }) {
  const i = l === 'hi' ? 1 : 0;
  return <div className="sx b6-sq" lang={l}>
    <DharmaRule height={6} />
    <div className="b6-sq__bd">
      <Icon name="quote" size={24} />
      <p className="b6-sq__q">{QUOTES[0][i]}</p>
      <span className="b6-sq__a">{t(l, 'Bhagawan Sri Sathya Sai Baba', 'भगवान श्री सत्य साई बाबा')}</span>
      <span className="b6-sq__s">{t(l, 'Sathya Sai Speaks Vol 39, Ch 13 · 22 November 2006', 'सत्य साई स्पीक्स खंड 39, अध्याय 13 · 22 नवंबर 2006')}</span>
    </div>
    <div className="b6-sq__ft"><span className="sx-ring" style={{ width: 44, height: 44 }}></span><span>{t(l, 'SSSSO Delhi NCR · sssso-delhi.org/discourses', 'एसएसएसएसओ दिल्ली एनसीआर · sssso-delhi.org/discourses')}</span></div>
  </div>;
}
function CorrectionDialog() {
  const { Input, Select } = window.SSSSODelhiNCRDesignSystem_9ec6b9;
  return <window.ModalStage><div className="pt-modal" role="dialog" aria-label="Report a correction"><div className="pt-modal__cap"></div><div className="pt-modal__bd">
    <h2 className="sx-h3">Report a correction</h2>
    <p className="pt-sub">Tell us what looks wrong. A reviewer checks it against the Trust’s text. We reply only if you leave a number.</p>
    <Select label="Where" options={['Paragraph 2 (Hindi)', 'Paragraph 1', 'Title', 'A quote card']} />
    <window.Field label="What should it say?"><textarea className="b3-ta" defaultValue="“विवेक-शक्ति” सही है, “विवेक शक्ति” नहीं।"></textarea></window.Field>
    <Input label="WhatsApp number (optional)" placeholder="+91" />
  </div><div className="pt-modal__ft"><Button variant="ghost">Cancel</Button><Button variant="primary" icon="send">Send</Button></div></div></window.ModalStage>;
}

Object.assign(window, { Discourses, Reader, QuoteImage, CorrectionDialog, B6_THEMES: THEMES, B6_DISC: DISC, B6_BODY: BODY, B6_QUOTES: QUOTES });
})();
