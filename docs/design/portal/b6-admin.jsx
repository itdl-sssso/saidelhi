(() => {
const { Icon, Button, Input, Select, Alert, Badge } = window.SSSSODelhiNCRDesignSystem_9ec6b9;
const { PDesk, PageHead, Panel, Field, PickerField, RowMenu, B5T: T, B5Tabs: Tabs, B5Pill: Pill, B5Sel: Sel, B5Note: Note, B5Mono: Mono } = window;
const ST = { ns: ['slate', 'circle-dashed', 'Not started'], ai: ['blue', 'sparkles', 'AI draft'], rv: ['yellow', 'hourglass', 'In review'], ap: ['green', 'circle-check', 'Approved'], pb: ['pink', 'globe', 'Published'] };
const S = ({ s }) => <Pill tone={ST[s][0]} icon={ST[s][1]}>{ST[s][2]}</Pill>;
const NOPUB = 'Publishing opens once permission is granted';
const FlagBar = () => <div className="b6-flag"><Icon name="flag" size={18} /><span><b>Flag: discourses is off.</b> Waiting for Sri Sathya Sai Sadhana Trust permission. You can prepare and approve translations; nothing goes public yet.</span></div>;

const LIST = [
  ['Character is the true wealth of a student', 'SSS Vol 39 Ch 13', 'Character, Education', 'ap', 'Sunita D.'],
  ['Put a ceiling on your desires', 'SSS Vol 16 Ch 3', 'Ceiling on desires, Time', 'rv', 'Sunita D.'],
  ['The mind is a bundle of desires', 'SSS Vol 29 Ch 2', 'Technology, Habits', 'rv', 'Ravi K.'],
  ['Revere your mother and father', 'SSS Vol 32 Ch 9', 'Parents', 'ai', '—'],
  ['A true leader is a servant first', 'SSS Vol 34 Ch 22', 'Leadership, Service', 'ai', '—'],
  ['Time wasted is life wasted', 'SSS Vol 37 Ch 1', 'Time, Discipline', 'ns', '—'],
  ['Friendship that lasts', 'SSS Vol 30 Ch 11', 'Friendship', 'ns', '—'],
];
function DiscList() {
  return (
    <PDesk current="discourses" role="a" scope="ncr">
      <FlagBar />
      <PageHead title="Discourses" sub="87 talks shortlisted for young people. Each needs a reviewed Hindi translation before it can go live." actions={<><Button variant="outline" icon="book-a">Glossary</Button><Button variant="primary" icon="plus">Add to shortlist</Button></>} />
      <div className="pt-grid pt-g4">{[['Not started', 41], ['AI draft', 22], ['In review', 15], ['Approved', 9]].map(k => <window.KpiTile key={k[0]} compact label={k[0]} value={k[1]} />)}</div>
      <T tools={<div className="pt-filters" style={{ width: '100%' }}><label className="sx-search" style={{ margin: 0, maxWidth: 240 }}><Icon name="search" size={18} /><input placeholder="Search titles" /></label><Sel k="Theme" v="All" /><Sel k="Status" v="All" /><Sel k="Reviewer" v="Anyone" /></div>}
        cols={['Title', 'Source', 'Themes', 'Status', 'Reviewer', '']}
        rows={LIST.map(r => [<span className="sx-tbl__t">{r[0]}</span>, <Mono>{r[1]}</Mono>, <span className="sx-cap">{r[2]}</span>, <S s={r[3]} />, r[4], <RowMenu items={[{ icon: 'pencil', label: 'Open editor' }, { icon: 'sparkles', label: 'Request AI draft' }, { icon: 'user-check', label: 'Assign reviewer' }]} />])}
        foot={<><span style={{ flex: 1 }}>Showing 7 of 87</span><span>Published: 0 · {NOPUB}</span></>} />
    </PDesk>
  );
}

const GLOSS = [['Atma', 'आत्मा', 'the true self'], ['Dharma', 'धर्म', 'right conduct'], ['Sathya', 'सत्य', 'truth'], ['Prema', 'प्रेम', 'love'], ['Shanti', 'शांति', 'peace'], ['Ahimsa', 'अहिंसा', 'non-violence'], ['seva', 'सेवा', 'service'], ['sadhana', 'साधना', 'spiritual practice'], ['buddhi', 'बुद्धि', 'intellect'], ['viveka', 'विवेक', 'discrimination']];
const PARAS = [
  ['Placeholder source paragraph 1. The English text from Sathya Sai Speaks, read-only, exactly as published.', 'प्लेसहोल्डर अनुच्छेद 1। स्वीकृत हिंदी अनुवाद।', 'ap'],
  ['Placeholder source paragraph 2. Mentions <g>dharma</g> and <g>buddhi</g> so the glossary highlights them.', 'प्लेसहोल्डर अनुच्छेद 2। इसमें <g>धर्म</g> और <g>बुद्धि</g> हैं, शब्दावली इन्हें चिह्नित करती है।', 'rv'],
  ['Placeholder source paragraph 3. A pull quote: “Character is the true wealth of a student.”', 'प्लेसहोल्डर अनुच्छेद 3। “चरित्र ही विद्यार्थी का सच्चा धन है।”', 'rv'],
  ['[Telugu poem — kept in transliteration, set apart in italics]', '[तेलुगु पद्य — लिप्यंतरण, अलग से तिरछे अक्षरों में]', 'ap'],
  ['Placeholder source paragraph 5. Uses <g>viveka</g>.', 'प्लेसहोल्डर अनुच्छेद 5। AI ड्राफ़्ट — <g>विवेक</g> की जगह “समझ” लिखा है।', 'ai', 'Glossary says विवेक, draft says “समझ”'],
];
const hl = s => s.split(/<g>|<\/g>/).map((x, i) => i % 2 ? <mark key={i} className="b6-gl">{x}</mark> : x);
function DiscEditor() {
  return (
    <PDesk current="discourses" role="a" scope="ncr">
      <FlagBar />
      <div className="pt-head">
        <div className="pt-head__t"><a href="#" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-small)', textDecoration: 'none', minHeight: 32 }}><Icon name="arrow-left" size={16} />Discourses</a>
          <h1 className="pt-h1">Character is the true wealth of a student</h1>
          <div className="sx-row" style={{ gap: 8 }}><S s="rv" /><span className="sx-cap">2 of 5 paragraphs approved · reviewer Sunita D.</span></div></div>
        <div className="sx-row"><Button variant="ghost" icon="sparkles">Request AI draft</Button><Button variant="outline" icon="send">Send for review</Button><Button variant="outline" icon="check" disabled title="All paragraphs must be approved">Approve</Button><Button variant="primary" icon="globe" disabled title={NOPUB}>Publish</Button></div>
      </div>
      <Note icon="lock">{NOPUB}.</Note>
      <div className="b6-ed">
        <div className="b6-align">
          <div className="b6-align__hd"><span>English source · read-only</span><span>हिंदी draft</span></div>
          {PARAS.map((p, i) => <div key={i} className={'b6-align__r' + (i === 1 ? ' is-on' : '')}>
            <span className="b6-pn">{i + 1}</span>
            <p className={'b6-src-p' + (i === 3 ? ' is-poem' : '')}>{hl(p[0])}</p>
            <div className="sx-col" style={{ gap: 6, minWidth: 0 }}>
              <div className={'b6-hi' + (i === 3 ? ' is-poem' : '')} lang="hi" contentEditable={i !== 3} suppressContentEditableWarning>{hl(p[1])}</div>
              <div className="sx-row" style={{ gap: 6 }}><S s={p[2]} />{p[3] ? <span className="b5-note b5-note--warn"><Icon name="triangle-alert" size={16} />{p[3]}</span> : null}<span style={{ flex: 1 }}></span>{p[2] !== 'ap' ? <Button variant="ghost" size="sm" icon="check">Approve paragraph</Button> : null}</div>
            </div>
          </div>)}
        </div>
        <div className="sx-col" style={{ gap: 16 }}>
          <Panel title="Glossary" badge={<Pill tone="yellow">1 mismatch</Pill>} flush>
            <ul className="b6-gloss">{GLOSS.map(g => <li key={g[0]} className={g[0] === 'viveka' ? 'is-warn' : ''}><b>{g[0]}</b><span lang="hi">{g[1]}</span><span className="sx-cap">{g[2]}</span></li>)}</ul>
          </Panel>
          <Panel title="Metadata">
            <div className="pt-grid pt-g2"><Input label="Chapter (print)" defaultValue="Vol 39, Ch 13" /><Input label="Chapter (online)" defaultValue="Vol 39, Ch 16" /></div>
            <div className="pt-grid pt-g2"><Field label="Date"><PickerField icon="calendar-days" value="22 Nov 2006" /></Field><Input label="Place" defaultValue="Prasanthi Nilayam" /></div>
            <Input label="Occasion" defaultValue="Convocation" />
            <Input label="Source URL" defaultValue="sathyasai.org/discourses/…/sss39-13" />
            <Field label="Retrieved"><PickerField icon="calendar-check" value="4 Oct 2026" /></Field>
          </Panel>
        </div>
      </div>
    </PDesk>
  );
}
function QuoteMaker() {
  return (
    <PDesk current="discourses" role="a" scope="ncr">
      <PageHead back="Character is the true wealth of a student" title="Quote cards" sub="Pick 2 to 4 lines from approved paragraphs. Each exports as a 1080 × 1080 image in both languages." actions={<Button variant="primary" icon="plus">Add quote</Button>} />
      <div className="pt-grid" style={{ gridTemplateColumns: 'minmax(0,1fr) 420px', alignItems: 'start' }}>
        <Panel title="Quote 1 of 3">
          <Field label="From paragraph"><PickerField icon="pilcrow" value="3 · “Character is the true wealth of a student.”" /></Field>
          <div className="pt-grid pt-g2"><Input label="English" defaultValue="Character is the true wealth of a student." /><Input label="हिंदी" lang="hi" defaultValue="चरित्र ही विद्यार्थी का सच्चा धन है।" /></div>
          <Note icon="info">Quotes must match the approved text word for word. Shortening is allowed only at a sentence break.</Note>
          <div className="sx-row" style={{ gap: 8, justifyContent: 'flex-end' }}><Button variant="outline" icon="image-down">Export EN</Button><Button variant="outline" icon="image-down">Export HI</Button></div>
        </Panel>
        <div className="b6-qprev"><div style={{ width: 1080, height: 1080, transform: 'scale(.3611)', transformOrigin: '0 0' }}><window.QuoteImage /></div></div>
      </div>
    </PDesk>
  );
}

Object.assign(window, { DiscList, DiscEditor, QuoteMaker });
})();
