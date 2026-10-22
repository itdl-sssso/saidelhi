(() => {
const { Icon, Button } = window.SSSSODelhiNCRDesignSystem_9ec6b9;
const { VShell, EvCard, FieldMessage, B3Otp: Otp, B3Ic: Ic } = window;
const t = window.b3t;
const P = { report: ['Report for this camp', 'इस कैंप की रिपोर्ट'], desk: ['Desk 2 entry', 'डेस्क 2 एंट्री'], join: ['Join this seva', 'इस सेवा से जुड़ें'] };
const PI = { report: 'clipboard-list', desk: 'monitor-smartphone', join: 'hand-heart' };
const Card = ({ children }) => <section className="pt-fsec"><div className="pt-fsec__bd">{children}</div></section>;
const H = ({ children }) => <h1 className="b3-h">{children}</h1>;
const Help = ({ l }) => <a href="#" className="b3-help"><Icon name="life-buoy" size={16} />{t(l, 'Not getting the code? Get help', 'कोड नहीं मिल रहा? मदद लें')}</a>;
const Ev = ({ l, p }) => <EvCard l={l} purpose={t(l, ...P[p])} icon={PI[p]} {...(p === 'join' ? { title: ['Tree planting', 'वृक्षारोपण'], date: ['29', 'Oct', 'अक्टू'], sub: ['Patparganj · East district', 'पटपड़गंज · पूर्व ज़िला'], venue: ['Community park, Patparganj', 'सामुदायिक पार्क, पटपड़गंज'], time: '7:30 AM' } : {})} />;

function PhoneField({ l, v = '98765 43252', err }) {
  return <label className="sx-field"><span className="sx-field__lbl">{t(l, 'Your WhatsApp number', 'आपका व्हाट्सऐप नंबर')}</span>
    <span className="sx-field__help">{t(l, 'The number your coordinator added to this camp.', 'वही नंबर जो आपके समन्वयक ने इस कैंप में जोड़ा है।')}</span>
    <span className={'sx-ctl' + (err ? ' sx-ctl--error' : '')}><span className="sx-cap" style={{ fontSize: 'var(--text-portal-body)' }}>+91</span><input inputMode="tel" defaultValue={v} aria-label={t(l, 'Phone number', 'फ़ोन नंबर')} /></span></label>;
}

function VReport({ lang }) {
  return <VShell lang={lang}>{l => <>
    <Ev l={l} p="report" />
    <Card>
      <H>{t(l, 'Confirm it’s you', 'पुष्टि करें कि यह आप हैं')}</H>
      <p className="pt-sub">{t(l, 'We’ll send a 6-digit code on WhatsApp. Then you can fill in the report.', 'हम व्हाट्सऐप पर 6 अंकों का कोड भेजेंगे। फिर आप रिपोर्ट भर सकते हैं।')}</p>
      <PhoneField l={l} />
      <Button variant="primary" icon="message-circle" fullWidth>{t(l, 'Send code on WhatsApp', 'व्हाट्सऐप पर कोड भेजें')}</Button>
      <Help l={l} />
    </Card>
  </>}</VShell>;
}

function VOtp({ lang, state }) {
  return <VShell lang={lang}>{l => <>
    <Ev l={l} p="report" />
    {state === 'offline' ? <window.Toast tone="offline">{t(l, 'You’re offline. We’ll send the code as soon as you’re back online.', 'आप ऑफ़लाइन हैं। ऑनलाइन होते ही हम कोड भेज देंगे।')}</window.Toast> : null}
    <Card>
      <H>{t(l, 'Enter the code', 'कोड डालें')}</H>
      <p className="pt-sub">{t(l, 'Sent on WhatsApp to +91 98•••••52.', '+91 98•••••52 पर व्हाट्सऐप से भेजा गया।')} <a href="#">{t(l, 'Change number', 'नंबर बदलें')}</a></p>
      <Otp v={state === 'wrong' ? '418302' : state === 'offline' ? '' : '4183'} error={state === 'wrong'} lang={l} />
      {state === 'wrong' ? <FieldMessage type="error">{t(l, 'That code doesn’t match. 2 tries left.', 'यह कोड मेल नहीं खाता। 2 कोशिशें बाक़ी।')}</FieldMessage> : <span className="sx-cap">{t(l, 'The code works for 10 minutes.', 'कोड 10 मिनट तक चलेगा।')}</span>}
      <Button variant="primary" fullWidth disabled={state === 'offline'}>{t(l, 'Continue', 'आगे बढ़ें')}</Button>
      <div className="b3-resend"><Icon name="timer" size={16} />{t(l, 'Send again in 0:42', '0:42 में फिर भेजें')}</div>
      <Help l={l} />
    </Card>
  </>}</VShell>;
}

function VLocked() {
  return <VShell>{l => <>
    <Ev l={l} p="report" />
    <Card>
      <Ic tone="alert" icon="lock" />
      <H>{t(l, 'Too many tries', 'बहुत ज़्यादा कोशिशें')}</H>
      <p className="pt-sub">{t(l, 'For safety, this number is paused for 10 minutes. You can try again at 9:12 PM.', 'सुरक्षा के लिए यह नंबर 10 मिनट के लिए रुका है। आप रात 9:12 बजे फिर कोशिश कर सकते हैं।')}</p>
      <div className="b3-resend"><Icon name="timer" size={16} />9:46</div>
      <Button variant="outline" icon="phone" fullWidth>{t(l, 'Call the centre', 'केंद्र को फ़ोन करें')}</Button>
      <span className="sx-cap">{t(l, 'Samithi Mayur Vihar · 011-4000 0000', 'समिति मयूर विहार · 011-4000 0000')}</span>
    </Card>
  </>}</VShell>;
}

function VNotListed() {
  return <VShell>{l => <>
    <Ev l={l} p="report" />
    <Card>
      <H>{t(l, 'Confirm it’s you', 'पुष्टि करें कि यह आप हैं')}</H>
      <PhoneField l={l} v="91234 56780" err />
      <FieldMessage type="error">{t(l, 'This number isn’t on the list for this camp.', 'यह नंबर इस कैंप की सूची में नहीं है।')}</FieldMessage>
      <p className="pt-sub">{t(l, 'Try the number you gave your coordinator, or ask them to add this one. It takes a minute.', 'वह नंबर आज़माएँ जो आपने समन्वयक को दिया था, या उनसे यह नंबर जोड़ने को कहें। एक मिनट लगता है।')}</p>
      <Button variant="primary" fullWidth>{t(l, 'Try another number', 'दूसरा नंबर आज़माएँ')}</Button>
      <Button variant="outline" icon="phone" fullWidth>{t(l, 'Call the centre', 'केंद्र को फ़ोन करें')}</Button>
    </Card>
  </>}</VShell>;
}

function VDesk() {
  return <VShell>{l => <>
    <Ev l={l} p="desk" />
    <Card>
      <H>{t(l, 'Start desk entry', 'डेस्क एंट्री शुरू करें')}</H>
      <p className="pt-sub">{t(l, 'Counts from your desk are added to this camp’s report. No names are entered here.', 'आपकी डेस्क की गिनती इस कैंप की रिपोर्ट में जुड़ती है। यहाँ कोई नाम नहीं डाला जाता।')}</p>
      <window.Field label={t(l, 'Desk', 'डेस्क')} lang={l}><window.PickerField icon="monitor-smartphone" value={t(l, 'Desk 2 · Spectacles', 'डेस्क 2 · चश्मे')} readOnly /></window.Field>
      <window.Field label={t(l, 'Your first name', 'आपका पहला नाम')} optional help={t(l, 'Shown to the coordinator so they know who to thank.', 'समन्वयक को दिखता है ताकि वे जानें कि धन्यवाद किसे दें।')} lang={l}><window.TextCtl placeholder={t(l, 'For example, Meera', 'जैसे, मीरा')} /></window.Field>
      <Button variant="primary" iconAfter="arrow-right" fullWidth>{t(l, 'Start', 'शुरू करें')}</Button>
      <span className="sx-cap" style={{ display: 'flex', gap: 6 }}><Icon name="shield-check" size={16} />{t(l, 'This desk link doesn’t need a code. Your coordinator can turn one on.', 'इस डेस्क लिंक के लिए कोड ज़रूरी नहीं। समन्वयक इसे चालू कर सकते हैं।')}</span>
    </Card>
  </>}</VShell>;
}

function VJoin() {
  return <VShell>{l => <>
    <Ev l={l} p="join" />
    <Card>
      <H>{t(l, 'Join this seva', 'इस सेवा से जुड़ें')}</H>
      <p className="pt-sub">{t(l, 'Tell us you’re coming. We’ll remind you on WhatsApp the day before.', 'बताएँ कि आप आ रहे हैं। हम एक दिन पहले व्हाट्सऐप पर याद दिलाएँगे।')}</p>
      <window.Field label={t(l, 'Your name', 'आपका नाम')} lang={l}><window.TextCtl placeholder="" /></window.Field>
      <window.Field label={t(l, 'WhatsApp number', 'व्हाट्सऐप नंबर')} lang={l}><span className="sx-ctl"><span className="sx-cap">+91</span><input inputMode="tel" aria-label="Phone" /></span></window.Field>
      <div className="b3-bot"><span className="b3-bot__box"><Icon name="check" size={18} /></span><span>{t(l, 'Checking you’re a person', 'जाँच रहे हैं कि आप व्यक्ति हैं')}</span><span className="sx-cap" style={{ marginLeft: 'auto' }}>{t(l, 'Bot check', 'बॉट जाँच')}</span></div>
      <Button variant="primary" icon="hand-heart" fullWidth>{t(l, 'Count me in', 'मुझे शामिल करें')}</Button>
      <span className="sx-cap">{t(l, 'We use your number only for this seva’s reminders.', 'आपका नंबर केवल इस सेवा के रिमाइंडर के लिए है।')} <a href="#">{t(l, 'Privacy', 'गोपनीयता')}</a></span>
    </Card>
  </>}</VShell>;
}

function VDone({ kind = 'report', lang }) {
  return <VShell lang={lang}>{l => kind === 'report' ? <>
    <Card>
      <Ic tone="green" icon="circle-check" />
      <H>{t(l, 'Report sent', 'रिपोर्ट भेज दी गई')}</H>
      <p className="pt-sub">{t(l, 'Thank you. Eye camp, Mayur Vihar, 17 Oct 2026.', 'धन्यवाद। नेत्र कैंप, मयूर विहार, 17 अक्टूबर 2026।')}</p>
      <window.StatusPill status="report_submitted" lang={l} />
      <span className="sx-field__lbl">{t(l, 'What happens next', 'आगे क्या होगा')}</span>
      <ol className="b3-next">
        <li>{t(l, 'The East district coordinator reviews it, usually within 3 days.', 'पूर्व ज़िला समन्वयक इसकी समीक्षा करेंगे, आमतौर पर 3 दिन में।')}</li>
        <li>{t(l, 'You’ll get a WhatsApp message when it’s approved.', 'स्वीकृत होने पर आपको व्हाट्सऐप संदेश मिलेगा।')}</li>
        <li>{t(l, 'The results then appear on the camp’s public page.', 'फिर परिणाम कैंप के सार्वजनिक पेज पर दिखेंगे।')}</li>
      </ol>
      <Button variant="outline" icon="pencil" fullWidth>{t(l, 'Edit report', 'रिपोर्ट बदलें')}</Button>
      <span className="sx-cap">{t(l, 'You can edit until it’s approved.', 'स्वीकृति तक आप बदल सकते हैं।')}</span>
    </Card>
  </> : <>
    <Card>
      <Ic tone="green" icon="circle-check" />
      <H>{t(l, 'You’re in', 'आप शामिल हैं')}</H>
      <p className="pt-sub">{t(l, 'Thank you for offering your hands. We’ll remind you on WhatsApp the day before.', 'अपना हाथ बढ़ाने के लिए धन्यवाद। हम एक दिन पहले व्हाट्सऐप पर याद दिलाएँगे।')}</p>
      <dl className="pt-dl"><dt>{t(l, 'When', 'कब')}</dt><dd>{t(l, 'Thu 29 Oct, 7:30 AM', 'गुरु 29 अक्टू, सुबह 7:30')}</dd><dt>{t(l, 'Where', 'कहाँ')}</dt><dd>{t(l, 'Community park, Patparganj', 'सामुदायिक पार्क, पटपड़गंज')}</dd><dt>{t(l, 'Bring', 'साथ लाएँ')}</dt><dd>{t(l, 'Water bottle, cap', 'पानी की बोतल, टोपी')}</dd></dl>
      <Button variant="outline" icon="calendar-plus" fullWidth>{t(l, 'Add to my calendar', 'मेरे कैलेंडर में जोड़ें')}</Button>
      <Button variant="ghost" fullWidth>{t(l, 'I can’t come after all', 'मैं नहीं आ पाऊँगा')}</Button>
    </Card>
  </>}</VShell>;
}

const INV = {
  expired: ['calendar-x', 'slate', ['This link has expired', 'यह लिंक समाप्त हो गया है'], ['It worked until 20 Oct 2026. Ask your coordinator for a new one.', 'यह 20 अक्टूबर 2026 तक चालू था। अपने समन्वयक से नया लिंक माँगें।']],
  revoked: ['link-2-off', 'slate', ['This link was switched off', 'यह लिंक बंद कर दिया गया है'], ['Your coordinator turned it off on 18 Oct 2026. If you still need to send something, ask them for a new link.', 'आपके समन्वयक ने इसे 18 अक्टूबर 2026 को बंद किया। अगर अभी भी कुछ भेजना है, तो नया लिंक माँगें।']],
  used: ['circle-check-big', 'blue', ['This link has been used', 'इस लिंक का उपयोग हो चुका है'], ['A report was already sent with it, on 18 Oct 2026 at 8:47 PM. To make changes, open the link from the WhatsApp message you received.', 'इससे 18 अक्टूबर 2026 रात 8:47 पर रिपोर्ट भेजी जा चुकी है। बदलाव के लिए व्हाट्सऐप संदेश वाला लिंक खोलें।']],
  missing: ['search-x', 'slate', ['We couldn’t find this link', 'यह लिंक नहीं मिला'], ['Check that it was copied in full, or ask the person who sent it.', 'जाँचें कि पूरा लिंक कॉपी हुआ है, या भेजने वाले से पूछें।']],
};
function VInvalid({ kind, lang }) {
  const [ic, tone, h, b] = INV[kind];
  return <VShell lang={lang}>{l => <>
    {kind === 'missing' ? null : <Ev l={l} p="report" />}
    <Card>
      <Ic tone={tone} icon={ic} />
      <H>{t(l, ...h)}</H>
      <p className="pt-sub">{t(l, ...b)}</p>
      {kind === 'missing' ? <Button variant="outline" icon="home" fullWidth>{t(l, 'Go to the website', 'वेबसाइट पर जाएँ')}</Button> : <Button variant="outline" icon="phone" fullWidth>{t(l, 'Call the centre', 'केंद्र को फ़ोन करें')}</Button>}
    </Card>
  </>}</VShell>;
}

Object.assign(window, { VReport, VOtp, VLocked, VNotListed, VDesk, VJoin, VDone, VInvalid });
})();
