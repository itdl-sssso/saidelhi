(() => {
const { Icon } = window.SSSSODelhiNCRDesignSystem_9ec6b9;
const { ChatFrame, Bubble, QuickReplies, ListMessage, SummaryCard } = window;
const t = window.b3t;
const In = p => <Bubble dir="in" {...p} />;
const Out = ({ children, time }) => <Bubble dir="out" time={time} read>{children}</Bubble>;
const Day = ({ children }) => <span className="sx-day">{children}</span>;
const Note = ({ children }) => <span className="b3-cnote"><Icon name="info" size={16} />{children}</span>;
function Ph({ children, l = 'en', sub }) {
  return <div className="sx sx-phone pt-phone b3-chatph" lang={l}><window.B3Status /><ChatFrame lang={l} subtitle={sub}>{children}</ChatFrame></div>;
}

function MenuChat({ who = 'coord', l = 'en' }) {
  const M = {
    coord: { hi: ['Sai Ram. You’re signed in as samithi coordinator, Mayur Vihar. What would you like to do?', 'साई राम। आप समिति समन्वयक, मयूर विहार के रूप में जुड़े हैं। आप क्या करना चाहेंगे?'], b: [['Plan an activity', 'गतिविधि की योजना'], ['Send a report', 'रिपोर्ट भेजें'], ['My upcoming events', 'मेरे आने वाले कार्यक्रम'], ['Talk to a person', 'किसी व्यक्ति से बात करें']] },
    district: { hi: ['Sai Ram. You’re signed in as district coordinator, East. 3 plans and 2 reports are waiting for you.', 'साई राम। आप ज़िला समन्वयक, पूर्व के रूप में जुड़े हैं। 3 योजनाएँ और 2 रिपोर्ट आपकी प्रतीक्षा में हैं।'], b: [['Review waiting items', 'प्रतीक्षित आइटम देखें'], ['Plan an activity', 'गतिविधि की योजना'], ['This week in East', 'इस हफ़्ते पूर्व में'], ['Talk to a person', 'किसी व्यक्ति से बात करें']] },
    public: { hi: ['Sai Ram. This is the Sri Sathya Sai Seva Organisation, Delhi NCR. All our activities are free and open to everyone.', 'साई राम। यह श्री सत्य साई सेवा संगठन, दिल्ली एनसीआर है। हमारी सभी गतिविधियाँ निःशुल्क और सबके लिए खुली हैं।'], b: [['What’s on near me', 'मेरे पास क्या हो रहा है'], ['Join a seva', 'सेवा से जुड़ें'], ['Weekly updates', 'साप्ताहिक जानकारी'], ['Talk to a person', 'किसी व्यक्ति से बात करें']] },
  }[who];
  return <Ph l={l}>
    <Day>{t(l, 'Today', 'आज')}</Day>
    <Out time="9:40 AM">{t(l, 'Hi', 'नमस्ते')}</Out>
    <ListMessage lang={l} time="9:40 AM" body={t(l, ...M.hi)} button={t(l, 'Choose', 'चुनें')} />
    <div className="b3-listprev">{M.b.map(b => <span key={b[0]}><Icon name="circle" size={16} />{t(l, ...b)}</span>)}</div>
    <Note>{t(l, 'Menu changes by role. Only options the person can use are shown.', 'मेनू भूमिका के अनुसार बदलता है। केवल उपयोग योग्य विकल्प दिखते हैं।')}</Note>
  </Ph>;
}

function PlanChat({ l = 'en' }) {
  return <Ph l={l}>
    <Out time="9:41 AM">{t(l, 'Plan an activity', 'गतिविधि की योजना')}</Out>
    <In time="9:41 AM">{t(l, 'What kind of seva (service)?', 'किस तरह की सेवा?')}</In>
    <QuickReplies options={[t(l, 'Medical camp', 'चिकित्सा कैंप'), t(l, 'Narayana Seva', 'नारायण सेवा'), t(l, 'Bal Vikas', 'बाल विकास'), t(l, 'Other', 'अन्य')]} />
    <Out time="9:41 AM">{t(l, 'Medical camp', 'चिकित्सा कैंप')}</Out>
    <In time="9:41 AM">{t(l, 'Which date? For example, 14 Nov.', 'कौन सी तारीख़? जैसे, 14 नवंबर।')}</In>
    <Out time="9:42 AM">14 nov</Out>
    <In time="9:42 AM">{t(l, 'Saturday 14 Nov 2026. What time does it start?', 'शनिवार 14 नवंबर 2026। कितने बजे शुरू होगा?')}</In>
    <Out time="9:42 AM">9 am</Out>
    <In time="9:42 AM">{t(l, 'Where? Send the venue name, or share a location.', 'कहाँ? स्थान का नाम भेजें, या लोकेशन साझा करें।')}</In>
    <Out time="9:43 AM">{t(l, 'Ambedkar Bhawan Mayur Vihar 1', 'अंबेडकर भवन मयूर विहार 1')}</Out>
    <In time="9:43 AM">{t(l, 'How many sevadals do you need?', 'कितने सेवादल चाहिए?')}</In>
    <Out time="9:43 AM">20</Out>
    <In time="9:43 AM">{t(l, 'Any partner, like a hospital?', 'कोई साझेदार, जैसे अस्पताल?')}</In>
    <QuickReplies row options={['ICARE Eye Hospital', t(l, 'Other', 'अन्य'), t(l, 'None', 'कोई नहीं')]} />
    <Out time="9:44 AM">ICARE Eye Hospital</Out>
    <SummaryCard lang={l} time="9:44 AM" title={t(l, 'Check your plan', 'अपनी योजना जाँचें')} rows={[[t(l, 'Seva', 'सेवा'), t(l, 'Medical camp', 'चिकित्सा कैंप')], [t(l, 'When', 'कब'), t(l, 'Sat 14 Nov, 9:00 AM', 'शनि 14 नवं, सुबह 9:00')], [t(l, 'Where', 'कहाँ'), t(l, 'Dr. Ambedkar Bhawan, Mayur Vihar Ph-1', 'डॉ. अंबेडकर भवन, मयूर विहार फ़ेज़-1')], [t(l, 'Sevadals', 'सेवादल'), '20'], [t(l, 'Partner', 'साझेदार'), 'ICARE Eye Hospital']]} actions={[t(l, 'Confirm', 'पुष्टि करें'), t(l, 'Edit', 'बदलें')]} />
    <Out time="9:44 AM">{t(l, 'Confirm', 'पुष्टि करें')}</Out>
    <In time="9:44 AM">{t(l, 'Sent to East district for approval. We’ll message you when they reply, usually within 3 days.', 'स्वीकृति के लिए पूर्व ज़िले को भेजा गया। उनके उत्तर पर हम आपको संदेश भेजेंगे, आमतौर पर 3 दिन में।')}</In>
  </Ph>;
}

function ApprovalChat({ l = 'en' }) {
  return <Ph l={l}>
    <Day>{t(l, '19 Oct', '19 अक्टू')}</Day>
    <SummaryCard lang={l} template time="9:45 AM" title={t(l, 'New plan to approve', 'स्वीकृति के लिए नई योजना')} rows={[[t(l, 'Samithi', 'समिति'), t(l, 'Mayur Vihar', 'मयूर विहार')], [t(l, 'Seva', 'सेवा'), t(l, 'Medical camp', 'चिकित्सा कैंप')], [t(l, 'When', 'कब'), t(l, 'Sat 14 Nov, 9:00 AM', 'शनि 14 नवं, सुबह 9:00')], [t(l, 'Sevadals', 'सेवादल'), '20']]} actions={[t(l, 'Approve', 'स्वीकृत करें'), t(l, 'Reject', 'अस्वीकार करें'), t(l, 'Ask a question', 'प्रश्न पूछें')]} />
    <Day>{t(l, '21 Oct', '21 अक्टू')}</Day>
    <In template time="9:00 AM">{t(l, 'Reminder: the Mayur Vihar medical camp plan is still waiting. If there’s no reply by tomorrow, it goes to the state team.', 'याद दिलाना: मयूर विहार चिकित्सा कैंप की योजना अभी प्रतीक्षा में है। कल तक उत्तर न मिलने पर यह राज्य टीम को जाएगी।')}</In>
    <Day>{t(l, '22 Oct', '22 अक्टू')}</Day>
    <In template time="9:00 AM">{t(l, 'The Mayur Vihar medical camp plan has gone to the state team after 3 days. You can still approve it in the portal.', 'मयूर विहार चिकित्सा कैंप की योजना 3 दिन बाद राज्य टीम को भेज दी गई है। आप पोर्टल में अब भी इसे स्वीकृत कर सकते हैं।')}</In>
    <Note>{t(l, 'Day 3 escalation also goes to the state admin.', 'तीसरे दिन की सूचना राज्य एडमिन को भी जाती है।')}</Note>
  </Ph>;
}

function LinkChat({ l = 'en' }) {
  return <Ph l={l}>
    <Day>{t(l, '10 Oct', '10 अक्टू')}</Day>
    <In template time="10:02 AM">{t(l, 'Your eye camp on 17 Oct is approved. Use this link to send the report after the camp:\nsaidelhi.org/f/••••\nIt works only for your number.', 'आपका 17 अक्टूबर का नेत्र कैंप स्वीकृत है। कैंप के बाद रिपोर्ट भेजने के लिए यह लिंक:\nsaidelhi.org/f/••••\nयह केवल आपके नंबर पर चलेगा।')}</In>
    <Day>{t(l, '16 Oct', '16 अक्टू')}</Day>
    <In template time="6:00 PM">{t(l, 'Tomorrow: eye camp, Mayur Vihar, 9:00 AM.\nBefore you go:\n• Printed register, 3 pages\n• Spectacles stock counted\n• ICARE team confirmed\n• Camera phone for the register', 'कल: नेत्र कैंप, मयूर विहार, सुबह 9:00।\nजाने से पहले:\n• छपा रजिस्टर, 3 पेज\n• चश्मों का स्टॉक गिना हुआ\n• आईकेयर टीम की पुष्टि\n• रजिस्टर के लिए कैमरा फ़ोन')}</In>
    <QuickReplies row options={[t(l, 'All set', 'सब तैयार'), t(l, 'Need help', 'मदद चाहिए')]} />
    <Day>{t(l, '18 Oct', '18 अक्टू')}</Day>
    <In template time="10:00 AM">{t(l, 'How did the eye camp go? Send the report when you can — it takes about 10 minutes.', 'नेत्र कैंप कैसा रहा? जब हो सके रिपोर्ट भेजें — लगभग 10 मिनट लगते हैं।')}</In>
    <QuickReplies row options={[t(l, 'Open the form', 'फ़ॉर्म खोलें'), t(l, 'Report here in chat', 'यहीं चैट में')]} />
  </Ph>;
}

function ReportChat({ l = 'en' }) {
  return <Ph l={l}>
    <Out time="8:30 PM">{t(l, 'Report here in chat', 'यहीं चैट में')}</Out>
    <In time="8:30 PM">{t(l, 'One question at a time. How many people were screened?', 'एक बार में एक प्रश्न। कितने लोगों की जाँच हुई?')}</In>
    <Out time="8:31 PM">115</Out>
    <In time="8:31 PM">{t(l, 'How many spectacles were given?', 'कितने चश्मे दिए गए?')}</In>
    <Out time="8:31 PM">63</Out>
    <In time="8:31 PM">{t(l, 'How many cataract cases were found?', 'मोतियाबिंद के कितने मामले मिले?')}</In>
    <Out time="8:32 PM">13</Out>
    <In time="8:32 PM">{t(l, 'Please send a photo of the register. It’s kept private and never published.', 'कृपया रजिस्टर की फ़ोटो भेजें। यह निजी रहती है और कभी प्रकाशित नहीं होती।')}</In>
    <div className="sx-bub sx-bub--out b3-photo"><span className="b3-photo__i"><Icon name="image" size={24} /></span><span className="sx-cap">register-p1.jpg</span><div className="sx-bub__meta">8:33 PM<Icon name="check-check" size={16} /></div></div>
    <In time="8:33 PM"><span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><Icon name="lock" size={16} />{t(l, 'Photo received and kept private.', 'फ़ोटो मिली और निजी रखी गई।')}</span></In>
    <SummaryCard lang={l} time="8:33 PM" title={t(l, 'Your report', 'आपकी रिपोर्ट')} rows={[[t(l, 'Screened', 'जाँच'), '115'], [t(l, 'Spectacles', 'चश्मे'), '63'], [t(l, 'Cataract', 'मोतियाबिंद'), '13'], [t(l, 'Photo', 'फ़ोटो'), t(l, '1 page', '1 पेज')]]} actions={[t(l, 'Send report', 'रिपोर्ट भेजें'), t(l, 'Change a number', 'कोई संख्या बदलें')]} />
    <Out time="8:34 PM">{t(l, 'Send report', 'रिपोर्ट भेजें')}</Out>
    <In time="8:34 PM">{t(l, 'Sent to East district. Thank you for your seva.', 'पूर्व ज़िले को भेज दी गई। आपकी सेवा के लिए धन्यवाद।')}</In>
  </Ph>;
}

function OtpChat({ l = 'en' }) {
  return <Ph l={l}>
    <Day>{t(l, 'Today', 'आज')}</Day>
    <In template time="9:02 PM"><b style={{ fontWeight: 600 }}>418302</b>{t(l, ' is your SSSSO Delhi NCR code. It works for 10 minutes. Never share it — we will never ask for it.', ' आपका SSSSO दिल्ली एनसीआर कोड है। यह 10 मिनट तक चलेगा। इसे किसी से साझा न करें — हम कभी नहीं माँगेंगे।')}</In>
    <QuickReplies options={[t(l, 'Copy code', 'कोड कॉपी करें')]} />
    <Note>{t(l, 'Authentication template. Same text for portal sign-in and form links.', 'प्रमाणीकरण टेम्पलेट। पोर्टल साइन-इन और फ़ॉर्म लिंक दोनों के लिए।')}</Note>
  </Ph>;
}

function NearChat({ l = 'en' }) {
  return <Ph l={l}>
    <Out time="7:10 PM">{t(l, 'What’s on near me', 'मेरे पास क्या हो रहा है')}</Out>
    <In time="7:10 PM">{t(l, 'Send your pincode, or share your location.', 'अपना पिनकोड भेजें, या लोकेशन साझा करें।')}</In>
    <Out time="7:11 PM">110091</Out>
    <SummaryCard lang={l} time="7:11 PM" title={t(l, 'Near 110091 this week', 'इस हफ़्ते 110091 के पास')} rows={[['21 Oct', t(l, 'Bal Vikas class · Laxmi Nagar, 10:00 AM', 'बाल विकास कक्षा · लक्ष्मी नगर, सुबह 10:00')], ['25 Oct', t(l, 'Medical camp · Shakarpur, 9:00 AM', 'चिकित्सा कैंप · शकरपुर, सुबह 9:00')], ['29 Oct', t(l, 'Tree planting · Patparganj, 7:30 AM', 'वृक्षारोपण · पटपड़गंज, सुबह 7:30')]]} actions={[t(l, 'Join a seva', 'सेवा से जुड़ें'), t(l, 'See the full calendar', 'पूरा कैलेंडर देखें')]} />
    <Out time="7:12 PM">{t(l, 'Join a seva', 'सेवा से जुड़ें')}</Out>
    <In time="7:12 PM">{t(l, 'The tree planting needs 20 sevadals. Shall I put your name down? We’ll remind you the day before.', 'वृक्षारोपण के लिए 20 सेवादल चाहिए। क्या आपका नाम जोड़ दूँ? हम एक दिन पहले याद दिलाएँगे।')}</In>
    <QuickReplies row options={[t(l, 'Yes, count me in', 'हाँ, शामिल करें'), t(l, 'Not now', 'अभी नहीं')]} />
  </Ph>;
}

function ErrorChat({ l = 'en' }) {
  return <Ph l={l}>
    <Out time="8:02 PM">kal ka camp kab hai</Out>
    <In time="8:02 PM">{t(l, 'Sorry, I didn’t understand that. You can pick from these:', 'माफ़ कीजिए, मैं समझ नहीं पाया। आप इनमें से चुन सकते हैं:')}</In>
    <QuickReplies options={[t(l, 'My upcoming events', 'मेरे आने वाले कार्यक्रम'), t(l, 'What’s on near me', 'मेरे पास क्या हो रहा है'), t(l, 'Talk to a person', 'किसी व्यक्ति से बात करें')]} />
    <Out time="8:03 PM">{t(l, 'Talk to a person', 'किसी व्यक्ति से बात करें')}</Out>
    <In time="8:03 PM">{t(l, 'A coordinator from East district will reply here, between 9 AM and 8 PM. It’s past 8 PM, so expect a reply tomorrow morning.', 'पूर्व ज़िले के एक समन्वयक यहीं उत्तर देंगे, सुबह 9 से रात 8 बजे के बीच। अभी 8 बज चुके हैं, इसलिए कल सुबह उत्तर की उम्मीद करें।')}</In>
    <Day>{t(l, 'Tomorrow', 'कल')}</Day>
    <In time="9:20 AM"><span className="b3-human"><Icon name="user" size={16} />{t(l, 'East district coordinator', 'पूर्व ज़िला समन्वयक')}</span>{t(l, 'Sai Ram. Tomorrow’s camp is at Shakarpur community hall, 9 AM. See you there.', 'साई राम। कल का कैंप शकरपुर सामुदायिक भवन में सुबह 9 बजे है। वहाँ मिलते हैं।')}</In>
    <In time="9:21 AM">{t(l, 'Something went wrong on our side and your last answer wasn’t saved. Please send it again.', 'हमारी ओर से कुछ गड़बड़ हुई और आपका पिछला उत्तर सहेजा नहीं गया। कृपया फिर से भेजें।')}</In>
  </Ph>;
}

Object.assign(window, { MenuChat, PlanChat, ApprovalChat, LinkChat, ReportChat, OtpChat, NearChat, ErrorChat });
})();
