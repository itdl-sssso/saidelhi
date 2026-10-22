(() => {
const { Icon, Button, Input, Select, Checkbox, Alert, Switch, Badge } = window.SSSSODelhiNCRDesignSystem_9ec6b9;
const { PDesk, PPhone, PageHead, Panel, Field, PickerField, RowMenu, ModalStage, B5T: T, B5Tabs: Tabs, B5Pill: Pill, B5Lang: Lang, B5Sel: Sel, B5Note: Note, B5Mono: Mono, B5Tog: Tog } = window;

/* ---------- D · /admin/centres edit ---------- */
const SCHED = [['Thursday', 'Bhajans', '7:00 – 8:00 PM'], ['Sunday', 'Bal Vikas classes', '10:00 – 11:30 AM'], ['Sunday', 'Study circle', '11:30 AM – 12:30 PM'], ['Every 2nd Sat', 'Narayana Seva', '12:00 – 2:00 PM']];
function CentresDesk() {
  return (
    <PDesk current="centres">
      <PageHead back="Centres" title="Mayur Vihar centre" sub="Everything here appears on the public centre page and the centre finder." actions={<><Button variant="ghost" icon="external-link">View public page</Button><Button variant="primary">Publish changes</Button></>} />
      <div className="pt-grid" style={{ gridTemplateColumns: 'minmax(0,1.25fr) minmax(0,1fr)', alignItems: 'start' }}>
        <div className="sx-col" style={{ gap: 16 }}>
          <Panel title="Public profile">
            <div className="pt-grid pt-g2"><Input label="Centre name (EN)" defaultValue="Sri Sathya Sai Centre, Mayur Vihar" /><Input label="केंद्र का नाम (हिंदी)" lang="hi" defaultValue="श्री सत्य साई केंद्र, मयूर विहार" /></div>
            <Input label="Address" defaultValue="Dr. Ambedkar Bhawan, Pocket 1, Mayur Vihar Ph-1, Delhi 110091" />
            <Field label="Map pin" help="Drag the pin to the gate people should use."><button className="b3-pin"><Icon name="map-pin" size={20} /><span><b>28.6045° N, 77.2943° E</b><span className="sx-cap">Set 12 Jan 2024 · tap to move</span></span></button></Field>
            <Field label="Centre phone number" help="Shown publicly. Use the centre’s number, never a personal number."><span className="sx-ctl"><span className="sx-cap">+91</span><input defaultValue="11 2275 ••••" aria-label="Centre phone" /><Icon name="globe" size={16} /></span></Field>
          </Panel>
          <Panel title="Weekly schedule" action={<Button variant="ghost" size="sm" icon="plus">Add a slot</Button>}>
            <div className="b5-sched">{SCHED.map((s, i) => <div key={i} className="b5-sched__r"><Select label="" aria-label="Day" options={['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'Every 2nd Sat']} defaultValue={s[0]} /><Select label="" aria-label="Activity" options={['Bhajans', 'Bal Vikas classes', 'Study circle', 'Narayana Seva']} defaultValue={s[1]} /><PickerField icon="clock" value={s[2]} /><button className="sx-icbtn" aria-label="Remove slot"><Icon name="x" size={18} /></button></div>)}</div>
          </Panel>
          <Panel title="Photos">
            <Alert tone="note" title="Photo rules">Show the place and activities. No faces of children or patients, no one who hasn’t agreed. Daylight, unposed.</Alert>
            <div className="b5-ph"><div><Icon name="image" size={20} /> Hall entrance</div><div><Icon name="image" size={20} /> Bhajan hall</div><div style={{ background: 'var(--white)' }}><Icon name="plus" size={20} /> Add photo</div></div>
          </Panel>
        </div>
        <Panel title="Public preview" badge={<Pill tone="blue" icon="eye">Live</Pill>}>
          <div className="b5-pubprev">
            <div className="b5-map"><span><Icon name="map-pin" size={18} /> Map tile placeholder</span></div>
            <div className="b5-pubcard">
              <span className="pt-eb">East district</span>
              <h4>Sri Sathya Sai Centre, Mayur Vihar</h4>
              <ul><li><Icon name="map-pin" size={16} />Dr. Ambedkar Bhawan, Pocket 1, Mayur Vihar Ph-1</li><li><Icon name="phone" size={16} />+91 11 2275 •••• (centre)</li></ul>
              <ul>{SCHED.map((s, i) => <li key={i}><Icon name="calendar-days" size={16} /><span><b style={{ fontWeight: 500 }}>{s[0]}</b> · {s[1]} · {s[2]}</span></li>)}</ul>
              <div className="sx-row" style={{ gap: 8 }}><Button variant="primary" size="sm" icon="navigation">Directions</Button><Button variant="outline" size="sm" icon="calendar-days">Upcoming events</Button></div>
            </div>
          </div>
        </Panel>
      </div>
    </PDesk>
  );
}

/* ---------- E · /admin/partners ---------- */
const PARTNERS = [
  ['ICARE Eye Hospital', 'Hospital', 'Noida', 14, 'Dr. Sharma (via centre)'],
  ['District Hospital, Shahdara', 'Government', 'Delhi', 9, 'Medical superintendent office'],
  ['Green Delhi Trust', 'NGO', 'Delhi', 6, 'Programme desk'],
  ['Rotary Blood Bank', 'Blood bank', 'Delhi', 5, 'Camp coordinator'],
  ['Kendriya Vidyalaya, Mayur Vihar', 'School', 'Delhi', 4, 'Principal’s office'],
  ['Akshaya Patra', 'NGO', 'Gurugram', 3, 'Kitchen manager'],
];
const pMenu = <RowMenu items={[{ icon: 'pencil', label: 'Edit' }, { icon: 'calendar-days', label: 'See events' }, '-', { icon: 'archive', label: 'Archive', danger: true }]} />;
function PartnersDesk() {
  return (
    <PDesk current="partners">
      <PageHead title="Partners" sub="Hospitals, schools and groups we run seva with. Partner names can appear on public event pages; contacts never do." actions={<Button variant="primary" icon="plus">Add partner</Button>} />
      <T tools={<div className="pt-filters" style={{ width: '100%' }}><label className="sx-search" style={{ margin: 0, maxWidth: 260 }}><Icon name="search" size={18} /><input placeholder="Find a partner" /></label><Sel k="Kind" v="All" /><Sel k="City" v="All" /></div>}
        cols={['Name', 'Kind', 'City', ['Events this year', { num: 1 }], 'Internal contact', '']}
        rows={PARTNERS.map(p => [<span className="sx-tbl__t">{p[0]}</span>, <Pill tone="blue">{p[1]}</Pill>, p[2], p[3], <span className="sx-row" style={{ gap: 6, flexWrap: 'nowrap' }}><Icon name="lock" size={16} />{p[4]}</span>, pMenu])}
        foot={<><Icon name="lock" size={16} />Internal contacts are visible to coordinators only.</>} />
    </PDesk>
  );
}
function PartnersPhone() {
  return <PPhone><PageHead title="Partners" actions={<Button variant="primary" size="sm" icon="plus">Add</Button>} />
    {PARTNERS.slice(0, 4).map(p => <div className="pt-lcard" key={p[0]}><div className="sx-row" style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}><span className="sx-tbl__t">{p[0]}</span>{pMenu}</div><dl><dt>Kind</dt><dd>{p[1]}</dd><dt>City</dt><dd>{p[2]}</dd><dt>Events</dt><dd>{p[3]} this year</dd><dt>Contact</dt><dd>{p[4]}</dd></dl></div>)}
  </PPhone>;
}
function PartnerDialog() {
  return (
    <ModalStage>
      <div className="pt-modal" role="dialog" aria-label="Add partner">
        <div className="pt-modal__cap"></div>
        <div className="pt-modal__bd">
          <h2 className="sx-h3">Add a partner</h2>
          <div className="pt-grid pt-g2"><Input label="Name (EN)" defaultValue="ICARE Eye Hospital" /><Input label="नाम (हिंदी)" lang="hi" defaultValue="आईकेयर नेत्र अस्पताल" /></div>
          <div className="pt-grid pt-g2"><Select label="Kind" options={['Hospital', 'Government', 'NGO', 'School', 'Blood bank', 'Other']} /><Input label="City" defaultValue="Noida" /></div>
          <Input label="Internal contact" defaultValue="Dr. Sharma (via centre)" />
          <Note icon="lock">Write a role or office, not a personal phone number. This is never shown publicly.</Note>
          <Tog label="Show name on public event pages" desc="“With ICARE Eye Hospital” under the event title." on />
        </div>
        <div className="pt-modal__ft"><Button variant="ghost">Cancel</Button><Button variant="primary">Save partner</Button></div>
      </div>
    </ModalStage>
  );
}

/* ---------- F · /admin/content ---------- */
const CONTENT = [
  ['Eye camp at Mayur Vihar: 115 screened', 'News', 'East', 1, 0, 'review', '18 Oct'],
  ['Centenary: 100 seva projects across NCR', 'Centenary', 'All', 1, 1, 'scheduled', 'Publishes 23 Nov'],
  ['Thought for the Day · 20 Oct', 'Thought for the Day', 'All', 1, 1, 'published', '20 Oct'],
  ['Why we serve: a sevadal’s story', 'Article', 'South', 1, 0, 'draft', '14 Oct'],
  ['Home · Upcoming seva strip intro', 'Home section', 'All', 1, 1, 'published', '2 Oct'],
  ['Diwali Narayana Seva timings', 'Announcement', 'All', 1, 1, 'published', '15 Oct'],
];
const CST = { review: ['yellow', 'hourglass', 'In review'], scheduled: ['blue', 'calendar-clock', 'Scheduled'], published: ['green', 'circle-check', 'Published'], draft: ['slate', 'file-pen-line', 'Draft'] };
function ContentList() {
  return (
    <PDesk current="content" role="c" scope="ncr">
      <PageHead title="Content" sub="News, articles and the small pieces of text across the public site." actions={<><Button variant="outline" icon="calendar-days">Create from event</Button><Button variant="primary" icon="plus">New</Button></>} />
      <Tabs items={[['All', 48], ['Articles', 12], ['News', 19], ['Centenary', 4], ['Home sections', 6], ['Thought for the Day', 365], ['Announcements', 3]]} />
      <T tools={<div className="pt-filters" style={{ width: '100%' }}><label className="sx-search" style={{ margin: 0, maxWidth: 260 }}><Icon name="search" size={18} /><input placeholder="Search titles" /></label><Sel k="Status" v="All" /><Sel k="Language" v="Hindi missing" /><Sel k="District" v="All" /></div>}
        cols={['Title', 'Type', 'District', 'Language', 'Status', 'Date', '']}
        rows={CONTENT.map(c => [<span className="sx-tbl__t">{c[0]}</span>, c[1], c[2], <Lang en={!!c[3]} hi={!!c[4]} />, <Pill tone={CST[c[5]][0]} icon={CST[c[5]][1]}>{CST[c[5]][2]}</Pill>, <span style={{ whiteSpace: 'nowrap' }}>{c[6]}</span>, <RowMenu items={[{ icon: 'pencil', label: 'Edit' }, { icon: 'languages', label: 'Send to translator' }, { icon: 'copy', label: 'Duplicate' }, '-', { icon: 'archive', label: 'Unpublish', danger: true }]} />])} />
    </PDesk>
  );
}
function ContentEditor() {
  return (
    <PDesk current="content" role="c" scope="ncr">
      <PageHead back="Content" title="Eye camp at Mayur Vihar: 115 screened" sub="News · created from event “Eye camp, 17 Oct” · saved 1 min ago" actions={<><Button variant="ghost" icon="eye">Preview</Button><Button variant="outline" icon="calendar-clock">Schedule</Button><Button variant="primary">Publish</Button></>} />
      <div className="pt-grid pt-g-main">
        <div className="sx-col" style={{ gap: 12 }}>
          <Tabs items={['English', 'हिंदी · missing']} />
          <Input label="Title" defaultValue="Eye camp at Mayur Vihar: 115 screened" />
          <div className="b5-rte">
            <div className="b5-rte__bar">{['heading-2', 'bold', 'italic', 'list', 'list-ordered', 'quote', 'link', 'image'].map(i => <button key={i} className="sx-icbtn" aria-label={i}><Icon name={i} size={18} /></button>)}<span style={{ flex: 1 }}></span><Button variant="ghost" size="sm" icon="chart-column">Insert results card</Button></div>
            <div className="b5-rte__bd">
              <p>On Saturday 17 October, sevadals from Samithi Mayur Vihar held a free eye camp at Dr. Ambedkar Bhawan with ICARE Eye Hospital.</p>
              <div className="b5-embed"><Icon name="chart-column" size={20} /><span><b style={{ fontWeight: 500 }}>Results card</b><br /><span className="sx-cap">From the approved report · updates if the report changes</span></span><dl><div><dt>Screened</dt><dd>115</dd></div><div><dt>Spectacles</dt><dd>63</dd></div><div><dt>Referred</dt><dd>13</dd></div></dl></div>
              <h3>Thirteen people referred for surgery</h3>
              <p>Those found with cataract were referred to the partner hospital. Sevadals will call each of them over the next two weeks.</p>
            </div>
          </div>
        </div>
        <div className="sx-col" style={{ gap: 16 }}>
          <Panel title="Details">
            <Select label="Type" options={['News', 'Article', 'Centenary', 'Announcement']} />
            <Select label="Category" options={['Medical seva', 'Food seva', 'Bal Vikas', 'Environment', 'Bhajans']} />
            <Select label="District" options={['East', 'All districts']} />
            <Field label="Linked event"><PickerField icon="link" value="Eye camp · Mayur Vihar · 17 Oct" /></Field>
            <Field label="Cover photo"><div className="b5-cover"><span><Icon name="image" size={18} /> Drop a photo · no faces of patients</span></div></Field>
            <Field label="Publish on" optional><PickerField icon="calendar-clock" placeholder="Now" /></Field>
          </Panel>
          <Alert tone="note" title="Hindi is missing">You can publish in English now. The Hindi page shows “Available in English” until a translator adds it.</Alert>
        </div>
      </div>
    </PDesk>
  );
}
const TFTD = [['', 1], ['', 1], ['Love all, serve all.', 0], ['Help ever, hurt never.', 0], ['Service to man is service to God.', 0], ['', 0], ['Be good, do good, see good.', 0], ['Hands that serve are holier than lips that pray.', 0], ['Duty without love is deplorable.', 0], ['', 0], ['Start the day with love.', 0], ['Truth is God. Live in truth.', 0], ['Where there is faith, there is love.', 0], ['', 0]];
function TftdCalendar() {
  return (
    <PDesk current="content" role="c" scope="ncr">
      <PageHead back="Content" title="Thought for the Day" sub="One quotation each day on the home page and in WhatsApp updates. Empty days repeat the last thought." actions={<><Button variant="outline" icon="upload">Import a month</Button><Button variant="primary" icon="plus">Add thought</Button></>} />
      <div className="sx-row" style={{ justifyContent: 'space-between' }}><div className="sx-row" style={{ gap: 4 }}><button className="sx-icbtn" aria-label="Previous"><Icon name="chevron-left" size={18} /></button><span className="sx-h3">19 Oct – 1 Nov 2026</span><button className="sx-icbtn" aria-label="Next"><Icon name="chevron-right" size={18} /></button></div><Pill tone="yellow" icon="calendar-x">4 empty days</Pill></div>
      <div className="b5-cal">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => <span key={d} className="b5-cal__h">{d}</span>)}
        {TFTD.map((x, i) => { const day = 19 + i; const n = day > 31 ? day - 31 : day; const past = i < 1; const cls = x[0] ? '' : ' is-empty'; return <div key={i} className={'b5-cal__d' + (i === 1 ? ' is-today' : '') + (past ? ' is-out' : cls)}><b>{n}{i === 1 ? ' · Today' : ''}</b>{past ? <span>Love all, serve all.</span> : i === 1 ? <span>Love is selflessness. Self is lovelessness.</span> : x[0] ? <span>{x[0]}</span> : <span>Empty</span>}{!past && x[0] || i === 1 ? <Lang hi={i % 3 !== 0} /> : null}</div>; })}
      </div>
    </PDesk>
  );
}

/* ---------- G · /admin/impact ---------- */
const KPIS = [['People served', 'users', true, '48,210'], ['Spectacles distributed', 'glasses', true, '3,412'], ['Meals served', 'utensils', true, '1,26,500'], ['Saplings planted', 'sprout', true, '8,940'], ['Volunteer hours', 'clock', true, '61,300'], ['Blood units', 'droplets', false, '612'], ['Cataract surgeries', 'eye', false, '184']];
const EST = [['East', '2023', 'Narayana Seva', '18,000', 'District register', 'Meera S.'], ['East', '2023', 'Medical camps', '2,400', 'Camp files', 'Meera S.'], ['South', '2022', 'Bal Vikas', '1,150 children', 'Guru records', 'State admin'], ['Gurugram', '2023', 'Tree planting', '3,000 saplings', 'Partner letter', 'State admin']];
function ImpactDesk() {
  return (
    <PDesk current="impact" role="a" scope="ncr">
      <PageHead title="Public impact" sub="What the public impact page shows. Only approved reports count; estimates are always labelled." actions={<><Button variant="ghost" icon="external-link">View impact page</Button><Button variant="primary">Publish changes</Button></>} />
      <div className="pt-grid" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.3fr)', alignItems: 'start' }}>
        <Panel title="KPIs on the public page">
          <div className="sx-col" style={{ gap: 0 }}>{KPIS.map(k => <Tog key={k[0]} label={k[0]} desc={k[2] ? 'Shown' : k[0] === 'Cataract surgeries' ? 'Hidden — follow-up data still coming in' : 'Hidden'} on={k[2]} />)}</div>
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 4 }}><Tog label="Include estimates" desc="Adds pre-platform district estimates, each marked “Estimate”." on /></div>
        </Panel>
        <Panel title="Tile preview" badge={<Pill tone="blue" icon="eye">Public</Pill>}>
          <div className="b5-tiles">{KPIS.filter(k => k[2]).slice(0, 4).map((k, i) => <window.KpiTile key={k[0]} compact label={k[0]} value={k[3]} icon={k[1]} period="Since 2023" estimate={i === 0 || i === 2} note={i === 0 ? 'Counts services given; one person may attend more than once.' : null} />)}</div>
        </Panel>
      </div>
      <Panel title="Estimates" action={<Button variant="outline" size="sm" icon="plus">Add estimate</Button>} flush>
        <T cols={['District', 'Year', 'Seva type', ['Figure', { num: 1 }], 'Source', 'Entered by', '']} rows={EST.map(e => [...e.slice(0, 3), e[3], e[4], e[5], <RowMenu items={[{ icon: 'pencil', label: 'Edit' }, { icon: 'trash-2', label: 'Remove', danger: true }]} />])} foot={<><Icon name="info" size={16} />Estimates cover years before the platform. They never mix into monthly reports.</>} />
      </Panel>
    </PDesk>
  );
}

/* ---------- H · /admin/migration ---------- */
const MSTEPS = ['Upload export', 'Map types', 'Preview', 'Import', 'Redirects', 'Report'];
function MigrationDesk({ step = 'map' }) {
  const c = { map: 1, report: 5 }[step];
  return (
    <PDesk current="migration" role="a" scope="ncr">
      <PageHead title="Import from saidelhi.org" sub="A one-time move of old pages and posts. Nothing on the old site changes until redirects are switched on." />
      <window.NumberedStepper steps={MSTEPS} current={c} />
      {step === 'map' ? <>
        <div className="sx-file"><span className="sx-file__th"><Icon name="file-archive" size={20} /></span><div className="sx-col" style={{ gap: 0, flex: 1 }}><b style={{ fontWeight: 500 }}>saidelhi-export-2026-10-12.xml</b><span className="sx-cap">WordPress export · 1,284 items</span></div><Button variant="ghost" size="sm">Change</Button></div>
        <Panel title="Map old types to new ones" flush>
          <T cols={['Old type', ['Items', { num: 1 }], 'Becomes', 'Note']} rows={[
            ['post · category “News”', 612, <Select label="" aria-label="Becomes" options={['News', 'Article', 'Skip']} />, ''],
            ['post · category “Articles”', 148, <Select label="" aria-label="Becomes" options={['Article', 'News', 'Skip']} />, ''],
            ['page', 86, <Select label="" aria-label="Becomes" options={['Static page', 'Skip']} />, <span className="sx-cap">Review each — many are outdated</span>],
            ['event', 402, <Select label="" aria-label="Becomes" options={['Past event (no report)', 'Skip']} />, <span className="sx-cap">Imported as history; no numbers</span>],
            ['attachment', 36, <Select label="" aria-label="Becomes" options={['Skip', 'Media']} defaultValue="Skip" />, <span className="b5-note b5-note--warn"><Icon name="triangle-alert" size={16} />May contain identifiable photos</span>],
          ]} />
        </Panel>
        <div className="sx-row" style={{ justifyContent: 'flex-end', gap: 8 }}><Button variant="ghost">Back</Button><Button variant="primary" iconAfter="arrow-right">Preview 1,248 items</Button></div>
      </> : <>
        <div className="b5-res"><div><span>Imported</span><b className="b5-big">1,192</b></div><div><span>Skipped</span><b className="b5-big">56</b></div><div><span>Need fixing</span><b className="b5-big" style={{ color: 'var(--pink-700)' }}>36</b></div></div>
        <div className="pt-grid pt-g2" style={{ alignItems: 'start' }}>
          <Panel title="Need fixing" flush><T dense cols={['Item', 'Problem', '']} rows={[
            ['Guru Purnima 2019', 'Broken image links (4)', <Button variant="ghost" size="sm">Fix</Button>],
            ['Medical camp, Rohini', 'No date found', <Button variant="ghost" size="sm">Fix</Button>],
            ['बाल विकास वार्षिकोत्सव', 'Hindi only — no English title', <Button variant="ghost" size="sm">Fix</Button>],
            ['Contact us', 'Contains personal phone numbers', <Button variant="ghost" size="sm">Fix</Button>]]} foot="Showing 4 of 36" /></Panel>
          <Panel title="Redirects" badge={<Pill tone="yellow" icon="pause">Not live yet</Pill>} flush><T dense cols={['Old URL', 'New URL', ['Hits / 30d', { num: 1 }]]} rows={[
            [<Mono>/news/eye-camp-2019</Mono>, <Mono>/news/eye-camp-2019</Mono>, 42], [<Mono>/centres.php</Mono>, <Mono>/centres</Mono>, 310], [<Mono>/bal-vikas</Mono>, <Mono>/programs#bal-vikas</Mono>, 128], [<Mono>/donate.html</Mono>, <span className="sx-row" style={{ gap: 4 }}>saidelhi.org donation page<Icon name="external-link" size={16} /></span>, 95]]}
            foot={<><span style={{ flex: 1 }}>1,214 redirects ready</span><Button variant="primary" size="sm">Switch redirects on</Button></>} /></Panel>
        </div>
        <div><Button variant="outline" icon="download">Download full report (CSV)</Button></div>
      </>}
    </PDesk>
  );
}

Object.assign(window, { CentresDesk, PartnersDesk, PartnersPhone, PartnerDialog, ContentList, ContentEditor, TftdCalendar, ImpactDesk, MigrationDesk });
})();
