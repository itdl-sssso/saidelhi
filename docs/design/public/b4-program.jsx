(() => {
const { Icon, Button, Badge } = window.SSSSODelhiNCRDesignSystem_9ec6b9;
const { Pub, Crumb, SecHd, KpiTile } = window;
const t = window.b3t;

const STEPS = [
  ['clipboard-list', ['Register at the desk', 'डेस्क पर पंजीकरण'], ['Name and age only. No ID needed.', 'केवल नाम और उम्र। कोई पहचान पत्र नहीं।']],
  ['eye', ['Eye check-up', 'आँखों की जाँच'], ['Optometrists from the partner hospital test each eye.', 'साझेदार अस्पताल के नेत्र विशेषज्ञ हर आँख जाँचते हैं।']],
  ['glasses', ['Spectacles on the spot', 'मौके पर चश्मे'], ['Reading glasses are given free where needed.', 'ज़रूरत होने पर पढ़ने के चश्मे निःशुल्क दिए जाते हैं।']],
  ['heart-pulse', ['Cataract referral', 'मोतियाबिंद रेफ़रल'], ['If surgery is needed, the hospital calls you with a free date.', 'सर्जरी ज़रूरी हो तो अस्पताल निःशुल्क तारीख़ के लिए फ़ोन करता है।']],
];
const CAMPS = [['17 Oct', 'Mayur Vihar', 115, 63, 13, 13, null], ['26 Sep', 'Dwarka', 142, 81, 17, 16, 9], ['30 Aug', 'Rohini', 128, 70, 11, 11, 11]];
const dash = v => (v === null || v === undefined ? '—' : v.toLocaleString('en-IN'));

function Program({ phone, l: l0 }) {
  return <Pub phone={phone} active="Programs" lang={l0}>{l => {
    const i = l === 'hi' ? 1 : 0;
    return <>
      <section className="pb-hero"><div className="pb-wrap">
        <Crumb items={[t(l, 'Home', 'होम'), t(l, 'Programmes', 'कार्यक्रम'), t(l, 'Eye camps', 'नेत्र कैंप')]} />
        <div className={'pb-g ' + (phone ? '' : 'pb-g2')} style={{ gap: phone ? 20 : 48, alignItems: 'center' }}>
          <div className="pb-col" style={{ gap: 14 }}>
            <div className="pb-row"><Badge tone="prem">{t(l, 'Service Wing', 'सेवा विंग')}</Badge><Badge tone="shanti">{t(l, 'Medical seva', 'चिकित्सा सेवा')}</Badge></div>
            <h1 className="pb-h1">{t(l, 'Eye camps', 'नेत्र कैंप')}</h1>
            <p className="pb-lead">{t(l, 'A free morning of eye check-ups, run with a partner hospital. Most people leave with reading glasses; some leave with a date for cataract surgery, also free.', 'साझेदार अस्पताल के साथ आँखों की निःशुल्क जाँच की सुबह। ज़्यादातर लोग पढ़ने के चश्मे लेकर जाते हैं; कुछ को मोतियाबिंद सर्जरी की तारीख़ मिलती है, वह भी निःशुल्क।')}</p>
          </div>
          <window.PbPhoto label={t(l, 'Photo slot — camp desk, no identifiable patients', 'फ़ोटो — कैंप डेस्क, कोई पहचाने जाने योग्य मरीज़ नहीं')} />
        </div>
      </div></section>
      <section className="pb-sec"><div className="pb-wrap">
        <SecHd title={t(l, 'What happens at a camp', 'कैंप में क्या होता है')} />
        <ol className={'b4-steps pb-g ' + (phone ? '' : 'pb-g4')}>{STEPS.map((s, k) => <li key={k} className="pb-card"><span className="b4-steps__n">{k + 1}</span><span className="pb-prg__ic"><Icon name={s[0]} size={20} /></span><h3 className="pb-h3">{s[1][i]}</h3><p className="pb-small">{s[2][i]}</p></li>)}</ol>
      </div></section>
      <section className="pb-sec pb-sec--calm"><div className="pb-wrap pb-col" style={{ gap: 20 }}>
        <SecHd title={t(l, 'Results this year', 'इस वर्ष के परिणाम')} sub={t(l, 'From approved reports, 1 Apr – 17 Oct 2026.', 'स्वीकृत रिपोर्टों से, 1 अप्रैल – 17 अक्टूबर 2026।')} />
        <div className="pb-g" style={{ gridTemplateColumns: phone ? '1fr 1fr' : 'repeat(3,minmax(0,1fr))', gap: phone ? 10 : 16 }}>
          <KpiTile label={t(l, 'Camps', 'कैंप')} value={38} period="2026" icon="calendar-days" compact={phone} />
          <KpiTile label={t(l, 'People screened', 'जाँचे गए लोग')} value={4870} period="2026" icon="users" compact={phone} />
          <KpiTile label={t(l, 'Spectacles given', 'दिए गए चश्मे')} value={2615} period="2026" icon="glasses" compact={phone} />
        </div>
        <div className={'pb-g ' + (phone ? '' : 'pb-g2')} style={{ gap: 16, alignItems: 'start' }}>
          <div className="pb-card"><h3 className="pb-h3">{t(l, 'Cataract care', 'मोतियाबिंद देखभाल')}</h3>
            <window.Funnel lang={l} steps={[{ label: t(l, 'Found', 'पाए गए'), value: 318 }, { label: t(l, 'Referred', 'रेफ़र किए'), value: 296 }, { label: t(l, 'Operated', 'सर्जरी हुई'), value: 212 }]} />
            <p className="pb-cap">{t(l, 'Surgeries happen weeks after a camp, so the latest camps catch up over time.', 'सर्जरी कैंप के कुछ हफ़्तों बाद होती है, इसलिए नए कैंप समय के साथ जुड़ते हैं।')}</p></div>
          <div className="pb-card" style={{ paddingLeft: 0, paddingRight: 0, paddingBottom: 8 }}><h3 className="pb-h3" style={{ padding: '0 20px' }}>{t(l, 'Recent camps', 'हाल के कैंप')}</h3>
            <div style={{ overflowX: 'auto' }}><table className="b4-tbl"><thead><tr><th>{t(l, 'Camp', 'कैंप')}</th><th>{t(l, 'Screened', 'जाँच')}</th><th>{t(l, 'Glasses', 'चश्मे')}</th><th>{t(l, 'Found', 'पाए')}</th><th>{t(l, 'Operated', 'सर्जरी')}</th></tr></thead>
              <tbody>{CAMPS.map(c => <tr key={c[0]}><td><a href="#">{c[1]}</a><span className="pb-cap" style={{ display: 'block' }}>{c[0]}</span></td><td>{dash(c[2])}</td><td>{dash(c[3])}</td><td>{dash(c[4])}</td><td className={c[6] === null ? 'b4-unk' : ''}>{dash(c[6])}</td></tr>)}</tbody></table></div>
            <p className="pb-cap" style={{ padding: '0 20px' }}>{t(l, '“—” means not reported yet. It is never counted as zero.', '“—” का अर्थ है अभी रिपोर्ट नहीं हुआ। इसे कभी शून्य नहीं गिना जाता।')}</p></div>
        </div>
      </div></section>
      <section className="pb-sec"><div className="pb-wrap">
        <div className={'pb-g ' + (phone ? '' : 'pb-gmain')} style={{ gap: phone ? 32 : 40 }}>
          <div className="pb-col" style={{ gap: 32 }}>
            <div><SecHd title={t(l, 'Upcoming eye camps', 'आने वाले नेत्र कैंप')} action={<a href="#" className="pb-more">{t(l, 'Calendar', 'कैलेंडर')}<Icon name="arrow-right" size={16} /></a>} />
              <div className="pb-col" style={{ gap: 8 }}>{[['26 Oct', 'Sector 50 centre, Noida', '9:00 AM', 12], ['14 Nov', 'Dr. Ambedkar Bhawan, Mayur Vihar', '9:00 AM', 20], ['6 Dec', 'Janakpuri centre, West', '9:30 AM', null]].map(e => <a key={e[0]} href="#" className="pb-crow" style={{ gridTemplateColumns: phone ? '60px minmax(0,1fr) auto' : '84px minmax(0,1fr) auto', alignItems: 'center' }}><span className="pb-crow__time">{e[0]}</span><span className="pb-col" style={{ gap: 2 }}><span className="pb-crow__t">{e[1]}</span><span className="pb-crow__m">{e[2]}</span></span>{e[3] ? <span className="pb-volb"><Icon name="hand-heart" size={16} />{t(l, `${e[3]} needed`, `${e[3]} चाहिए`)}</span> : null}</a>)}</div></div>
            <div><SecHd title={t(l, 'From the camps', 'कैंपों से')} />
              <div className={'pb-g ' + (phone ? '' : 'pb-g2')}>{[['A morning in Mayur Vihar', '18 Oct 2026'], ['Why we test both eyes, every time', '2 Sep 2026']].map(a => <a key={a[0]} href="#" className="pb-card pb-card--link" style={{ padding: 0, overflow: 'hidden', gap: 0 }}><window.PbPhoto label={t(l, 'Article photo', 'लेख की फ़ोटो')} /><div className="pb-col" style={{ padding: 16, gap: 4 }}><span className="pb-cap">{a[1]}</span><h3 className="pb-h3" style={{ fontSize: 19 }}>{a[0]}</h3></div></a>)}</div></div>
          </div>
          <div className="pb-col" style={{ gap: 16 }}>
            <div className="pb-card"><h3 className="pb-h3">{t(l, 'Our partners', 'हमारे साझेदार')}</h3><ul className="pb-ul">{['ICARE Eye Hospital, Noida', 'Partner eye hospital, South (to be confirmed)', 'District hospitals, East and North'].map(p => <li key={p}><Icon name="handshake" size={18} /><span>{p}</span></li>)}</ul></div>
            <div className="pb-vol"><span className="pb-vol__n">{t(l, 'Help at a camp', 'कैंप में मदद करें')}</span><p className="pb-small">{t(l, 'Sevadals run the desks, guide people and keep the queue calm. A morning, once a month.', 'सेवादल डेस्क संभालते हैं, लोगों को रास्ता बताते हैं और कतार शांत रखते हैं। महीने में एक सुबह।')}</p><Button variant="primary" icon="hand-heart">{t(l, 'Volunteer', 'स्वयंसेवा करें')}</Button></div>
          </div>
        </div>
      </div></section>
    </>;
  }}</Pub>;
}

const VAR = [
  ['eye', 'Eye camp (shown)', 'Steps: register → check-up → spectacles → referral. Tiles: camps, screened, spectacles. Funnel: found → referred → operated. Partners: eye hospitals.'],
  ['droplets', 'Blood donation', 'Steps: register → screening → donate → rest and refreshments. Tiles: camps, donors, units. No funnel. Partners: blood banks. Adds eligibility box (age 18–65, weight, last donation).'],
  ['stethoscope', 'Medical camp', 'Steps: register → doctor → medicines → referral. Tiles: camps, patients seen, referred. Funnel only if referrals are followed up. Partners: hospitals.'],
  ['hand-heart', 'Narayana Seva', 'Steps: cook → pack → serve → clean. Tiles: meals served, ration kits, weeks running. No funnel, no partners block unless a kitchen partner exists.'],
  ['graduation-cap', 'Bal Vikas', 'Steps: enrol → weekly class → festivals → parents’ meet. Tiles: classes held, children enrolled. Photos never show children’s faces. Age bands only at district level.'],
  ['layout-grid', 'Generic', 'Steps optional. Tiles: activities, people served, sevadal hours. Upcoming, articles and volunteer CTA always shown; empty blocks hide.'],
];
function ProgramVariants() {
  return <div className="sx b4-var"><span className="pt-eb">/programs/[type] — what changes</span><h2 className="b3-h">Same template, different blocks</h2>
    <ul>{VAR.map(v => <li key={v[1]}><span className="pt-need__ic sx-t-blue" style={{ width: 40, height: 40 }}><Icon name={v[0]} size={20} /></span><div><b>{v[1]}</b><p>{v[2]}</p></div></li>)}</ul>
    <p className="sx-cap">Always the same: breadcrumb, hero with wing badge, upcoming list, related articles, volunteer CTA, shared footer.</p></div>;
}

Object.assign(window, { B4Program: Program, B4ProgramVariants: ProgramVariants });
})();
