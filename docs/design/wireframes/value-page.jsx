const {Button,Badge,Card,Icon,Eyebrow,DharmaRule,SectionHeading,QuoteCard,EventScheduleCard}=window.SSSSODelhiNCRDesignSystem_9ec6b9;
const {useState,useEffect}=React;
function useTheme(){const [t,setT]=useState(window.SiteTheme?window.SiteTheme.get():'light');useEffect(()=>window.SiteTheme?window.SiteTheme.on(setT):undefined,[]);return t;}


const ALL=[
 {key:'sathya',name:'Sathya',gloss:'truth'},{key:'dharma',name:'Dharma',gloss:'right conduct'},
 {key:'shanti',name:'Shanti',gloss:'peace'},{key:'prema',name:'Prema',gloss:'love'},{key:'ahimsa',name:'Ahimsa',gloss:'non-violence'}
];
const CONTENT={
 sathya:{
  quote:'Speak the truth. Speak it pleasantly.',introTitle:'One person, all the way through',
  lead:'Sathya (truth) is the first of the five human values. It is not only saying what is so. It is when what we think, what we say and what we do are the same thing.',
  strands:[
   {i:'sun',t:'In thought',d:'Seeing a situation as it is, before deciding how we would like it to be.'},
   {i:'quote',t:'In word',d:'Saying what is true, gently, and keeping the promises we make — small ones first.'},
   {i:'hand-heart',t:'In deed',d:'Doing what we said we would do, the same way whether or not anyone is watching.'}
  ],
  practice:{eb:'Where it lives in our work',title:'Study circles',
   body:'A study circle is a small group that reads one teaching aloud, asks what it means for this week, and sits with it until it is plain. Nobody lectures. Anyone may speak, and anyone may simply listen.',
   facts:[['62','study circles across Delhi NCR'],['8–15','people in a circle'],['1 hr','once a week']],
   events:[
    {day:'16',month:'Oct',name:'Study circle — on truth in speech',time:'7:00 PM',venue:'Lodhi Road centre, Central Delhi',tag:'Open',tone:'shanti'},
    {day:'18',month:'Oct',name:'Youth study circle',time:'10:30 AM',venue:'Sector 50 centre, Noida',tag:'18–35',tone:'prem'},
    {day:'21',month:'Oct',name:'Study circle in Hindi',time:'6:30 PM',venue:'DLF Phase 2 centre, Gurugram',tag:'Open',tone:'shanti'}
   ]},
  teachings:[
   {q:'Truth is God. Live in truth.',l:'On truth'},
   {q:'Let your thoughts, words and deeds be in harmony.',l:'On integrity'},
   {q:'Sathyam vada, dharmam chara — speak the truth, walk in right conduct.',l:'Taittiriya Upanishad',a:'Taittiriya Upanishad'}
  ],
  sched:'Next study circles',all:'All study circles',shot:'a study circle in session',
  cta:{h:'Sit in on a study circle',p:'Come once and listen. No registration, no reading in advance, no fee. Tell us your district and we will send the nearest time and address.',b:'Find a study circle',i:'book-open'}
 },
 dharma:{
  quote:'Duty is God. Work is worship.',introTitle:'The duty in front of us',
  lead:'Dharma (right conduct) is truth put into practice. It is doing the duty in front of us — at home, at work, in the street — well, and without waiting to be asked.',
  strands:[
   {i:'home',t:'At home',d:'Care for parents and children, shared work in the kitchen, and patience at the end of a long day.'},
   {i:'briefcase',t:'At work',d:'Honest effort and fair dealing, whether the job is large or small, seen or unseen.'},
   {i:'users',t:'In society',d:'Giving a little time each week to people we will never be thanked by.'}
  ],
  practice:{eb:'Where it lives in our work',title:'Bal Vikas',
   body:'Bal Vikas (blossoming of the child) gives children an hour a week with the values their parents live by — through stories, songs, silent sitting and small group work. Classes are taught by trained gurus (teachers) and are free for every child, of every faith.',
   facts:[['1,200','children in Bal Vikas'],['5–15','years old'],['1 hr','Sunday mornings']],
   events:[
    {day:'19',month:'Oct',name:'Bal Vikas — Group I (ages 5–8)',time:'10:00 AM',venue:'Lodhi Road centre, Central Delhi',tag:'Open',tone:'sathya'},
    {day:'19',month:'Oct',name:'Bal Vikas — Group II (ages 9–11)',time:'10:00 AM',venue:'Sector 15 centre, Faridabad',tag:'Open',tone:'sathya'},
    {day:'26',month:'Oct',name:'Parents’ meeting',time:'11:30 AM',venue:'Indirapuram centre, Ghaziabad',tag:'Parents',tone:'shanti'}
   ]},
  teachings:[
   {q:'Duty without love is deplorable. Duty with love is desirable. Love without duty is divine.',l:'On duty'},
   {q:'Where there is righteousness in the heart, there is beauty in the character.',l:'On character'},
   {q:'Dharmo rakshati rakshitah — dharma protects those who protect it.',l:'Manusmriti',a:'Manusmriti'}
  ],
  sched:'Next Bal Vikas classes',all:'All Bal Vikas centres',shot:'a Bal Vikas class',
  cta:{h:'Enrol a child in Bal Vikas',p:'Classes run on Sunday mornings at every centre. Bring your child once to see. There is no fee, no uniform and no test.',b:'Find a Bal Vikas class',i:'graduation-cap'}
 },
 shanti:{
  quote:'Silence is the first step to peace.',introTitle:'A calm we carry with us',
  lead:'Shanti (peace) is what remains when truth and right conduct are steady. It is not the absence of noise around us, but a stillness we can carry into a crowded bus, a hard meeting or a sleepless night.',
  strands:[
   {i:'moon',t:'In silence',d:'A few minutes each morning without a screen, simply sitting and letting the mind settle.'},
   {i:'music',t:'In song',d:'Singing the divine name together, so that many voices become one breath.'},
   {i:'wind',t:'In the day',d:'Pausing before replying, and letting small irritations pass without passing them on.'}
  ],
  practice:{eb:'Where it lives in our work',title:'Bhajans',
   body:'Bhajans (devotional singing) are held on Thursday and Sunday evenings in every centre, with songs from many faiths and languages. One voice leads, everyone answers. Nagar Sankirtan (singing through the lanes at first light) runs on festival mornings. Anyone may sing, and anyone may simply listen.',
   facts:[['2','evenings a week'],['45 min','each session'],['Free','open to all']],
   events:[
    {day:'16',month:'Oct',name:'Thursday bhajans',time:'6:30 PM',venue:'Lodhi Road centre, Central Delhi',tag:'Open',tone:'shanti'},
    {day:'19',month:'Oct',name:'Sunday bhajans',time:'6:30 PM',venue:'Sector 50 centre, Noida',tag:'Open',tone:'shanti'},
    {day:'23',month:'Oct',name:'Nagar Sankirtan',time:'5:00 AM',venue:'From Hauz Khas centre, South Delhi',tag:'Festival',tone:'sathya'}
   ]},
  teachings:[
   {q:'Peace is the inner silence of the mind.',l:'On peace'},
   {q:'Bhajan is the best way to purify the mind.',l:'On bhajans'},
   {q:'Om shanti, shanti, shantih — peace within, peace around, peace everywhere.',l:'Vedic invocation',a:'Vedic invocation'}
  ],
  sched:'Next bhajans',all:'All bhajan timings',shot:'evening bhajans at a centre',
  cta:{h:'Come to an evening of bhajans',p:'Sit at the back if you like. Songbooks are on every mat, and nobody minds if you only listen. Thursdays and Sundays, 6:30 PM.',b:'See bhajan timings',i:'music'}
 },
 prema:{
  quote:'Love all, serve all.',introTitle:'Love that has hands',
  lead:'Prema (love) is the thread that runs through the other four values. It is not a feeling kept to ourselves. It shows up as a meal served warm, a hand held in a hospital ward, a stranger treated as family.',
  strands:[
   {i:'heart',t:'Love that sees',d:'Noticing who has gone without, before they have to ask.'},
   {i:'hand-heart',t:'Love that serves',d:'Turning up with hands, week after week, expecting nothing back.'},
   {i:'users',t:'Love that includes',d:'Serving every person the same way, whatever their faith, caste or circumstance.'}
  ],
  practice:{eb:'Where it lives in our work',title:'Narayana Seva',
   body:'Narayana Seva (serving the divine in every person) means cooked meals prepared at the centre and served by hand, every week of the year. Beside it run blood donation camps, winter blanket rounds and hospital visits. Nothing is ever collected from the people we serve.',
   facts:[['12,500','meals served a month'],['450','units of blood donated'],['52','weeks a year']],
   events:[
    {day:'19',month:'Oct',name:'Narayana Seva — meal service',time:'11:00 AM',venue:'Ring Road shelter, Central Delhi',tag:'Open',tone:'prem'},
    {day:'25',month:'Oct',name:'Blood donation camp',time:'9:00 AM',venue:'Sector 15 centre, Faridabad',tag:'18–60',tone:'prem'},
    {day:'26',month:'Oct',name:'Hospital visit',time:'4:00 PM',venue:'District hospital, Ghaziabad',tag:'Register',tone:'shanti'}
   ]},
  teachings:[
   {q:'Start the day with love. Fill the day with love. End the day with love.',l:'On love'},
   {q:'Hands that help are holier than lips that pray.',l:'On service'},
   {q:'There is only one religion, the religion of love.',l:'On unity'}
  ],
  sched:'Next sevas',all:'All seva activities',shot:'Narayana Seva meal service',
  cta:{h:'Offer your hands',p:'Tell us the district and the hours you can give. Someone from that centre calls you within a week. Nothing is ever collected from the public.',b:'Join a seva',i:'hand-heart'}
 },
 ahimsa:{
  quote:'Help ever. Hurt never.',introTitle:'Gentleness toward all that lives',
  lead:'Ahimsa (non-violence) grows naturally from the other four values. It asks us to cause no harm, not only to people, but to animals, to rivers, to the air and the soil we share.',
  strands:[
   {i:'message-circle',t:'In speech',d:'Choosing words that do not wound, even when we disagree.'},
   {i:'leaf',t:'In living',d:'Taking only what we need, and wasting less of water, food and power.'},
   {i:'sprout',t:'In care for the earth',d:'Planting, cleaning and restoring the places we live in.'}
  ],
  practice:{eb:'Where it lives in our work',title:'Environmental seva',
   body:'Environmental seva (service to the earth) gathers volunteers on weekend mornings to plant saplings, clean ghats and parks, and run water-saving drives in schools. Every drive is coordinated with the local resident welfare association.',
   facts:[['18,000','saplings planted'],['40','clean-up drives a year'],['Sat & Sun','mornings']],
   events:[
    {day:'18',month:'Oct',name:'Sapling plantation drive',time:'7:30 AM',venue:'Aravalli Biodiversity Park, Gurugram',tag:'Open',tone:'shanti'},
    {day:'25',month:'Oct',name:'Yamuna ghat clean-up',time:'7:00 AM',venue:'Kalindi Kunj ghat, South Delhi',tag:'Open',tone:'shanti'},
    {day:'01',month:'Nov',name:'Water-saving drive in schools',time:'10:00 AM',venue:'Sector 21 centre, Noida',tag:'Register',tone:'prem'}
   ]},
  teachings:[
   {q:'Do not hurt anyone by word or deed.',l:'On non-violence'},
   {q:'See God in every living being.',l:'On reverence'},
   {q:'Ahimsa paramo dharmah — non-violence is the highest duty.',l:'Mahabharata',a:'Mahabharata'}
  ],
  sched:'Next drives',all:'All environmental seva',shot:'a sapling plantation drive',
  cta:{h:'Plant with us this weekend',p:'Bring water and a cap. Tools and saplings are provided, and children are welcome with a parent.',b:'Join a drive',i:'sprout'}
 }
};

const SANS={sathya:'सत्य',dharma:'धर्म',shanti:'शान्ति',prema:'प्रेम',ahimsa:'अहिंसा'};
const LIVED={
 prema:{p:'Narayana Seva',w:'Service Wing',i:'hand-heart',d:'Cooked meals served by hand, blood donation and hospital visits, every week of the year.',b:'See the programme'},
 dharma:{p:'Bal Vikas',w:'Educational Wing',i:'graduation-cap',d:'Sunday values classes for children aged 5 to 15, free for every child.',b:'See the programme'},
 shanti:{p:'Bhajans',w:'Spiritual Wing',i:'music',d:'Devotional singing on Thursday and Sunday evenings in every centre.',b:'See the programme'},
 sathya:{p:'All our programmes',w:'Every wing',i:'layout-grid',d:'Truth runs through study circles, seva and Bal Vikas alike. See them all in one place.',b:'Browse programmes'},
 ahimsa:{p:'All our programmes',w:'Every wing',i:'layout-grid',d:'Environmental seva sits within the Service Wing, beside every other programme.',b:'Browse programmes'}
};
const DISC=[
 {t:'On the five human values',d:'Prasanthi Nilayam · 1983',len:'38 min'},
 {t:'Love as the basis of service',d:'Brindavan · 1991',len:'42 min'},
 {t:'The unity of all faiths',d:'Prasanthi Nilayam · 1975',len:'51 min'}
];
// flag: discourses — off until the Trust gives permission. ?discourses=1 previews it.
const FLAG_DISC=new URLSearchParams(location.search).get('discourses')==='1';
const NAV=[{i:'info',l:'About',h:'Page.html?p=about'},{i:'hand-heart',l:'Programs',h:'Page.html?p=programs'},{i:'music',l:'Bhajans',h:'Value Shanti.html'},{i:'heart-handshake',l:'Get involved',h:'Page.html?p=join'},{i:'chart-column',l:'Impact',h:'Page.html?p=impact'},{sep:true},{i:'newspaper',l:'News',h:'Articles.html?c=news'},{i:'calendar-days',l:'Calendar',h:'Calendar.html'},{i:'book-open',l:'Discourses',h:'Page.html?p=discourses',flag:true}];

function Nav({k,lang,setLang}){
 return <window.MenuNav active={k==='shanti'?'bhajans':null} lang={lang} setLang={setLang}/>;
}

function ValuePage({k}){
 const idx=ALL.findIndex(v=>v.key===k),v=ALL[idx],c=CONTENT[k],lv=LIVED[k];
 const [lang,setLang]=useState('en');
 const prev=ALL[(idx+4)%5],next=ALL[(idx+1)%5];
 return <React.Fragment>
  <Nav k={k} lang={lang} setLang={setLang}/>
  <DharmaRule height={2}/>
  {lang==='hi'?<div className="en-only" lang="hi" role="status"><Icon name="languages" size={18}/><span>यह पेज अभी केवल अंग्रेज़ी में उपलब्ध है। <span lang="en">Available in English only.</span></span></div>:null}
  <header className="hero" data-screen-label={'Hero · '+v.name}><div className="wrap hero-grid">
   <div>
    <nav className="crumb" aria-label="Breadcrumb"><a href="Home v2.html">Home</a><Icon name="chevron-right" size={16}/><a href="Home v2.html#act2">Five human values</a><Icon name="chevron-right" size={16}/><span>{v.name}</span></nav>
    <img className="emblem" src={'../assets/value-'+k+'.png'} alt=""/>
    <Eyebrow>{'Human value '+(idx+1)+' of 5'}</Eyebrow>
    <h1>{v.name} <span className="sk" lang="sa">{SANS[k]}</span></h1>
    <p className="gloss">{v.gloss}</p>
    <blockquote className="hq">“{c.quote}”<cite>Bhagawan Sri Sathya Sai Baba</cite></blockquote>
   </div>
   <figure className="portrait"><img src={'../assets/photo-'+k+'.jpg'} alt="Bhagawan Sri Sathya Sai Baba, hands raised in blessing"/></figure>
  </div></header>

  <section className="sec" data-screen-label="What it asks"><div className="wrap">
   <div className="intro">
    <SectionHeading eyebrow="What it asks of us" title={c.introTitle}/>
    <p className="lead">{c.lead}</p>
   </div>
   <div className="grid3 strands">
    {c.strands.map((s,i)=><Card key={s.t} tone="plain" padding="28px">
     <div className="strand-n"><span className="ico"><Icon name={s.i} size={20}/></span><span className="num">{'0'+(i+1)}</span></div>
     <h3>{s.t}</h3><p className="body">{s.d}</p>
    </Card>)}
   </div>
  </div></section>

  <section className="sec calm" data-screen-label={c.practice.title}><div className="wrap grid2 top">
   <div>
    <SectionHeading eyebrow="Lived through" title={c.practice.title}/>
    <p className="body">{c.practice.body}</p>
    <a className="lived" href="#"><Card tone="plain" interactive padding="20px">
     <div className="lived-r"><span className="ico"><Icon name={lv.i} size={20}/></span>
      <div className="lived-t"><Badge tone="shanti">{lv.w}</Badge><h3>{lv.p}</h3><p>{lv.d}</p></div>
      <span className="lived-go">{lv.b}<Icon name="arrow-right" size={16}/></span></div>
    </Card></a>
    <div className="shot"><image-slot id={'value-shot-'+k} shape="rounded" radius="16" placeholder={'Photograph — '+c.shot}></image-slot></div>
   </div>
   <EventScheduleCard title={c.sched} events={c.practice.events}
     footer={<Button variant="ghost" size="sm" iconAfter="arrow-right">{c.all}</Button>}/>
  </div></section>

  <section className="sec" data-screen-label="Teachings"><div className="wrap">
   <SectionHeading eyebrow="Teachings" title={'Words to carry on '+v.name} align="center"/>
   <div className="grid3 teach">{c.teachings.map(t=><QuoteCard key={t.q} label={t.l} quote={t.q} attribution={t.a||'Bhagawan Sri Sathya Sai Baba'}/>)}</div>
  </div></section>

  {FLAG_DISC?<section className="sec pt0" data-screen-label="Related discourses"><div className="wrap">
   <div className="disc-h"><SectionHeading eyebrow="Related discourses" title={'Bhagawan on '+v.name}/><window.FlagBadge/></div>
   <div className="grid3 disc">{DISC.map(d=><a key={d.t} href="#" className="disc-c"><span className="ico"><Icon name="book-open" size={20}/></span><span className="disc-t">{d.t}</span><span className="disc-m">{d.d} · {d.len}</span></a>)}</div>
  </div></section>:null}

  <section className="sec pt0"><div className="wrap">
   <Card tone="warm" capped padding="44px" className="cta-card">
    <div className="grid2 cta-grid">
     <div><Eyebrow>Begin here</Eyebrow><h2 className="cta-h">{c.cta.h}</h2><p className="body">{c.cta.p}</p></div>
     <div className="cta-acts"><Button variant="primary" size="lg" icon={c.cta.i}>{c.cta.b}</Button><Button variant="outline" size="lg" icon="map-pin">Find your centre</Button></div>
    </div>
   </Card>
  </div></section>

  <section className="values" aria-label="The five human values"><div className="wrap">
   <div className="vrow">{ALL.map(x=><a key={x.key} href={'Value '+x.name+'.html'} className={'vlink'+(x.key===k?' on':'')} aria-current={x.key===k?'page':undefined}><img src={'../assets/value-'+x.key+'.png'} alt=""/><span className="vn">{x.name}</span><span className="vg">{x.gloss}</span></a>)}</div>
   <div className="pager"><a href={'Value '+prev.name+'.html'}><Icon name="arrow-left" size={16}/>{prev.name} · {prev.gloss}</a><a href={'Value '+next.name+'.html'}>{next.name} · {next.gloss}<Icon name="arrow-right" size={16}/></a></div>
  </div></section>

  <DharmaRule height={3}/>
  <footer className="site"><div className="wrap">
   <div className="fgrid">
    <div><img className="foot-emblem" src="../assets/sarva-dharma-logo.jpg" alt="Sarva Dharma emblem" /><h4>Sri Sathya Sai Seva Organisation</h4><p className="fmuted">Delhi NCR. Bhajans, study circles, Bal Vikas and seva — open to everyone, free always.</p></div>
    <div><h4>Visit</h4><p className="fl"><a href="Calendar.html">Calendar</a><a href="Map.html">Centres</a><a href="#">Impact</a></p></div>
    <div><h4>Serve</h4><p className="fl"><a href="#">Join a seva</a><a href="#">Donate<Icon name="external-link" size={16}/></a><a href="#">SaiConnect<Icon name="external-link" size={16}/></a></p></div>
   </div>
   <div className="fine2"><span>All activities are free and open to people of every faith. Nothing is ever collected from the public.</span><span className="fx"><a href="#">Privacy</a><a href="../portal/Batch 3 P0 Rest.html">Coordinator login</a></span></div>
  </div></footer>
 </React.Fragment>;
}

ReactDOM.createRoot(document.getElementById('root')).render(<ValuePage k={window.VALUE_KEY||'sathya'}/>);
