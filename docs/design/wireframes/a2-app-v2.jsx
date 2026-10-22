const {Button,Badge,Card,Icon,Eyebrow,DharmaRule,SectionHeading,QuoteCard,SevaCard}=window.SSSSODelhiNCRDesignSystem_9ec6b9;
const {useState,useEffect,useRef}=React;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const smooth=t=>t*t*(3-2*t);

const VALUES=[
 {key:'sathya',name:'Sathya',gloss:'truth',quote:'Speak the truth. Speak it pleasantly.',
  body:'Study circles meet weekly in every centre. One teaching is read, questioned and sat with until it is plain. No fee, no registration.',
  cta:'Explore Sathya',icon:'book-open',meta:['62 study circles','Weekly'],emblem:'../assets/value-sathya.png',photo:'../assets/photo-sathya.jpg'},
 {key:'dharma',name:'Dharma',gloss:'right conduct',quote:'Duty is God. Work is worship.',
  body:'Bal Vikas classes give children an hour each Sunday to learn the human values through stories, songs and silent sitting.',
  cta:'Explore Dharma',icon:'graduation-cap',meta:['1,200 children','Sunday mornings'],emblem:'../assets/value-dharma.png',photo:'../assets/photo-dharma.jpg'},
 {key:'shanti',name:'Shanti',gloss:'peace',quote:'Silence is the first step to peace.',
  body:'Bhajans (devotional singing) on Thursday and Sunday evenings, and Nagar Sankirtan through the lanes at first light. Anyone may sing.',
  cta:'Explore Shanti',icon:'music',meta:['Thu & Sun, 6:30 PM','Every centre'],emblem:'../assets/value-shanti.png',photo:'../assets/photo-shanti.jpg'},
 {key:'prema',name:'Prema',gloss:'love',quote:'Love all, serve all.',
  body:'Narayana Seva serves cooked meals every week of the year. Beside it run blood donation camps, winter blanket rounds and hospital visits.',
  cta:'Explore Prema',icon:'hand-heart',meta:['12,500 meals a month','450 blood units'],emblem:'../assets/value-prema.png',photo:'../assets/photo-prema.jpg'},
 {key:'ahimsa',name:'Ahimsa',gloss:'non-violence',quote:'Help ever. Hurt never.',
  body:'Sapling drives through the monsoon, ghat and park clean-ups, and water-saving work in schools.',
  cta:'Explore Ahimsa',icon:'sprout',meta:['18,000 saplings','Weekend mornings'],emblem:'../assets/value-ahimsa.png',photo:'../assets/photo-ahimsa.jpg'}
];
const STOPS=[[0,[4,6,11]],[.3,[38,35,56]],[.55,[110,96,121]],[.78,[201,179,182]],[1,[255,253,243]]];
function bgAt(p){let a=STOPS[0],b=STOPS[STOPS.length-1];
 for(let i=0;i<STOPS.length-1;i++){if(p>=STOPS[i][0]&&p<=STOPS[i+1][0]){a=STOPS[i];b=STOPS[i+1];break}}
 const t=(p-a[0])/((b[0]-a[0])||1);
 return 'rgb('+a[1].map((v,i)=>Math.round(v+(b[1][i]-v)*t)).join(',')+')';}

const ACTS=[
 {eb:'Sri Sathya Sai Seva Organisation · Delhi NCR',h:'Love all, serve all.',p:'Bhajans, study circles and seva across Delhi NCR. Open to everyone, free always.'},
 {eb:'First light',h:'Each day begins with prayer.',p:'Nagar Sankirtan through the lanes at dawn, and meals cooked by morning for those who need them.'},
 {eb:'The bloom',h:'Five petals, five human values.',p:'Sathya, Dharma, Shanti, Prema and Ahimsa — the values behind every activity we run.'},
 {eb:'Blessing',h:'Come as you are.',p:'Every activity is free and open to people of every faith.'}
];
const NAV=[{i:'info',l:'About',hi:'परिचय',h:'Page.html?p=about'},{i:'hand-heart',l:'Programs',hi:'कार्यक्रम',h:'Page.html?p=programs'},{i:'music',l:'Bhajans',hi:'भजन',h:'Value Shanti.html'},{i:'heart-handshake',l:'Get involved',hi:'जुड़ें',h:'Page.html?p=join'},{i:'chart-column',l:'Impact',hi:'प्रभाव',h:'Page.html?p=impact'},{sep:true},{i:'newspaper',l:'News',hi:'समाचार',h:'Articles.html?c=news'},{i:'calendar-days',l:'Calendar',hi:'कैलेंडर',h:'Calendar.html'},{i:'book-open',l:'Discourses',hi:'प्रवचन',h:'Page.html?p=discourses',flag:true}];
const WINGS=[
 {t:'Spiritual Wing',g:'bhajans, study circles, sadhana',d:'Devotional singing, study circles and silent sitting in every centre, every week.',i:'music',tone:'calm',h:'Value Shanti.html'},
 {t:'Service Wing',g:'seva for those in need',d:'Narayana Seva, medical camps, blood donation and Grama Seva in villages.',i:'hand-heart',tone:'warm',h:'Value Prema.html'},
 {t:'Education Wing',g:'Bal Vikas and human values',d:'Sunday Bal Vikas classes for children and value education for schools.',i:'graduation-cap',tone:'truth',h:'Value Dharma.html'}
];
const goHref=h=>()=>{location.href=h};
function useTheme(){const [t,setT]=useState(window.SiteTheme?window.SiteTheme.get():'light');useEffect(()=>window.SiteTheme?window.SiteTheme.on(setT):undefined,[]);return t;}

const DISTRICTS=['Central Delhi','South Delhi','West Delhi','East Delhi','North Delhi','Gurugram','Faridabad','Noida','Ghaziabad','Sonipat'];

function FloatingNav({dark}){
 const theme=useTheme();const lang=window.HV.useLang();
 return <window.MenuNav dark={dark||theme==='dark'} lang={lang} setLang={window.HV.setLang}/>;
}

function Rail({focus,dark}){
 const go=k=>{const el=document.getElementById('petal-'+k);if(el)window.scrollTo({top:el.offsetTop,behavior:'smooth'})};
 return <div className={'rail'+(dark?' dark':'')} aria-label="Value sections">
  {VALUES.map((v,i)=><button key={v.key} type="button" className={focus===i?'on':''} onClick={()=>go(v.key)} aria-label={v.name}>
   <span className="rl">{v.name}</span><span className="dot"></span></button>)}
 </div>;
}

function ActOne({p1,idx}){
 return <section id="act1"><div className="pin"><div className="acts">
  {ACTS.map((a,i)=><div key={i} className={'act-state '+(p1<.62?'on-dark':'on-light')}
    style={{opacity:idx===i?1:0,transform:idx===i?'none':'translateY(14px)'}} aria-hidden={idx!==i}>
    <div className="eb">{a.eb}</div><h1>{a.h}</h1><p>{a.p}</p></div>)}
  <div className="hint" style={{opacity:p1<.05?.75:0,color:'#FFF9EF'}}>Scroll</div>
 </div></div></section>;
}

function Petal({v,i,focus}){
 const near=Math.abs(focus-i)<.55;
 return <section className="petal-sec" id={'petal-'+v.key} data-screen-label={'Petal '+(i+1)+' · '+v.name}>
  <div className={'panel'+(near?' in':'')}>
   <Card tone="plain" capped padding="28px">
    <div className="crest"><img src={v.emblem} alt="" aria-hidden="true"/></div>
    <Eyebrow>{'Value '+(i+1)+' of 5'}</Eyebrow>
    <h2>{v.name}</h2><p className="gloss">{v.gloss}</p>
    <blockquote className="quote">“{v.quote}”</blockquote>
    <p className="attrib">Bhagawan Sri Sathya Sai Baba</p>
    <p className="body">{v.body}</p>
    <div className="shot"><image-slot id={'petal-shot-'+v.key} shape="rounded" radius="10" placeholder={'Photograph — '+v.name.toLowerCase()+' seva'}></image-slot></div>
    <div className="foot">
     <Button variant="primary" size="md" icon={v.icon} iconAfter="arrow-right" onClick={()=>{location.href='Value '+v.name+'.html'}}>{v.cta}</Button>
     {v.meta.map(m=><Badge key={m} tone="shanti">{m}</Badge>)}
    </div>
   </Card>
  </div>
 </section>;
}

function Flow(){
 const {ThoughtSection,UpcomingStrip,ImpactSnapshot,FindCentre,GetInvolved,SiteFooter}=window.HV;
 return <div className="flow">
  <ThoughtSection/>
  <UpcomingStrip/>
  <ImpactSnapshot/>
  <FindCentre/>
  <section className="sec" data-screen-label="Wings of the organisation"><div className="wrap">
   <div className="sec-h">
    <SectionHeading eyebrow="Wings of the organisation" title="One organisation, three wings" description="Everything we do sits under one of three wings. Each is open to anyone who wants to join."/>
    <div className="wing-acts">
     <Button variant="outline" icon="log-in">Login to SaiConnect</Button>
     <a className="iconbtn" href="#" aria-label="Facebook"><Icon name="facebook" size={18}/></a>
     <a className="iconbtn" href="#" aria-label="YouTube"><Icon name="youtube" size={18}/></a>
    </div>
   </div>
   <div className="grid3" style={{marginTop:'32px'}}>
    {WINGS.map(w=><a key={w.t} className="acard" href={w.h}><Card tone={w.tone} interactive padding="28px">
     <span className="wing-ico"><Icon name={w.i} size={20}/></span>
     <h3 style={{fontSize:'var(--text-h3)',marginTop:'18px'}}>{w.t}</h3>
     <p className="stat-l wing-gloss" style={{marginTop:'2px'}}>{w.g}</p>
     <p className="body" style={{fontSize:'var(--text-small)'}}>{w.d}</p>
     <span className="acard-more wing-more">Explore<Icon name="arrow-right" size={16}/></span>
    </Card></a>)}
   </div>
  </div></section>

  <section className="sec" id="activities" style={{background:'var(--surface-warm)'}} data-screen-label="Activities of the districts"><div className="wrap">
   <div className="sec-h">
    <SectionHeading eyebrow="Activities of the districts" title="Told by the people who were there" description="Recent seva from across the ten districts of Delhi NCR."/>
    <Button variant="outline" iconAfter="arrow-right" href="Articles.html?c=activities">See all</Button>
   </div>
   <div className="agrid" style={{marginTop:'32px'}}>{window.SITE.ARTICLES.filter(a=>a.cat==='activities').slice(0,3).map(a=><ArticleCard key={a.id} a={a}/>)}</div>
  </div></section>

  <section className="sec" data-screen-label="Centenary celebrations"><div className="wrap">
   <Card tone="plain" capped padding="0">
    <div className="cent-grid">
     <div className="cent-img"><image-slot id="centenary-feature" shape="rect" placeholder="Centenary artwork — 100 glorious years of pure love"></image-slot></div>
     <div className="cent-copy">
      <Eyebrow>Centenary celebrations</Eyebrow>
      <h2 style={{fontSize:'var(--text-h2)',marginTop:'8px'}}>100 glorious years of pure love</h2>
      <p className="body">The Sri Sathya Sai Seva Organisations in Delhi NCR are marking the centenary of Bhagawan Sri Sathya Sai Baba with spiritual, educational, cultural and service initiatives — each one a way to live his teachings “Love all, serve all” and “Help ever, hurt never”.</p>
      <div className="chips" style={{marginTop:'18px'}}>{window.SITE.ARTICLES.filter(a=>a.cat==='centenary').slice(0,3).map(a=><a key={a.id} className="chip" href={'Article.html?id='+a.id}>{a.title}</a>)}</div>
      <div style={{marginTop:'24px'}}><Button variant="primary" iconAfter="arrow-right" href="Articles.html?c=centenary">View all centenary initiatives</Button></div>
     </div>
    </div>
   </Card>
  </div></section>

  <section className="sec pt0" id="news" data-screen-label="News and events"><div className="wrap">
   <div className="sec-h">
    <SectionHeading eyebrow="News and events" title="What’s happening this month"/>
    <div className="wing-acts">
     <Button variant="ghost" icon="calendar-days" href="Calendar.html">Full calendar</Button>
     <Button variant="outline" iconAfter="arrow-right" href="Articles.html?c=news">See all</Button>
    </div>
   </div>
   <div className="news-grid" style={{marginTop:'32px'}}>
    {window.SITE.ARTICLES.filter(a=>a.cat==='news').slice(0,3).map((a,i)=><div key={a.id} className={i===0?'news-lead':''}><ArticleCard a={a} compact={i>0}/></div>)}
   </div>
  </div></section>

  <section className="sec" style={{background:'var(--surface-calm)'}} data-screen-label="Sri Sathya Sai Answers"><div className="wrap">
   <div className="grid2">
    <div>
     <SectionHeading eyebrow="Sri Sathya Sai Answers" title="Questions answered from his discourses" description="Throughout his life, Bhagawan gave nearly 5,000 discourses. This channel draws on them to answer the questions people ask most — about duty, devotion, suffering and peace."/>
     <div style={{marginTop:'24px',display:'flex',gap:'12px',flexWrap:'wrap'}}><Button variant="secondary" icon="youtube" iconAfter="arrow-right">View more on YouTube</Button></div>
    </div>
    <div className="video" role="button" aria-label="Play: What is the purpose of rituals and devotion?">
     <div className="vslot"><image-slot id="answers-video" shape="rect" placeholder="Video poster"></image-slot></div>
     <span className="play"><Icon name="play" size={24}/></span><span className="vlabel vlabel-top">What is the purpose of rituals and devotion?</span>
    </div>
   </div>
  </div></section>

  <section className="sec pt0" data-screen-label="Auditorium reservation"><div className="wrap">
   <div className="grid2">
    <div className="aud-img"><image-slot id="auditorium" shape="rounded" radius="24" placeholder="Sri Sathya Sai International Centre, Lodhi Road"></image-slot></div>
    <div>
     <SectionHeading eyebrow="Auditorium reservation" title="Sri Sathya Sai International Centre" description="A domed landmark on Lodhi Road with a meditation hall, conference rooms and a 520-seat auditorium, available for cultural and educational programmes."/>
     <dl className="aud-facts">{[['520','seats in all'],['371','lower level'],['149','upper level']].map(f=><div key={f[1]}><dt>{f[0]}</dt><dd>{f[1]}</dd></div>)}</dl>
     <ul className="facts-l" style={{marginTop:'20px'}}>
      <li><span><Icon name="phone" size={16}/></span><span>011-2436 3221 · 011-2436 0190</span></li>
      <li><span><Icon name="clock" size={16}/></span><span>All days, 10:00 AM to 6:00 PM</span></li>
      <li><span><Icon name="mail" size={16}/></span><span>bookings.sssic@gmail.com</span></li>
     </ul>
     <div style={{marginTop:'24px'}}><Button variant="outline" iconAfter="arrow-right" href="Article.html?id=auditorium-booking">Know more</Button></div>
    </div>
   </div>
  </div></section>

  <GetInvolved/>
  <SiteFooter/>
 </div>;
}

// the focused value's emblem rides over the heart of the model, tracking its projected centre
function HeartEmblem({focus}){
 const box=useRef(null);
 useEffect(()=>{
  let raf;const tick=()=>{
   const el=box.current,S=window.LotusStage;
   if(el&&S&&S.isReady&&S.isReady()&&S.heart){
    const h=S.heart;
    el.style.transform='translate('+(h.x-h.size/2).toFixed(1)+'px,'+(h.y-h.size/2).toFixed(1)+'px)';
    el.style.width=h.size.toFixed(1)+'px';el.style.height=h.size.toFixed(1)+'px';
   }
   raf=requestAnimationFrame(tick);
  };tick();return()=>cancelAnimationFrame(raf);
 },[]);
 return <div className="heart-emblem" ref={box} aria-hidden="true">
  {VALUES.map((v,i)=><img key={v.key} src={v.photo} alt=""
    style={{opacity:Math.max(0,1-Math.abs(focus-i)*1.6)}}/>)}
 </div>;
}

function App(){
 const [ui,setUi]=useState({p1:0,idx:0,focus:-1,dark:true});
 const last=useRef('');
 useEffect(()=>{
  const reduce=window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  const bg=document.getElementById('stage-bg'),glow=document.getElementById('stage-glow');

  let raf;
  const tick=()=>{
   const vh=window.innerHeight,y=window.scrollY;
   const a1=document.getElementById('act1'),a2=document.getElementById('act2');
   if(a1&&a2){
    const p1=reduce?1:clamp((y-a1.offsetTop)/Math.max(1,a1.offsetHeight-vh),0,1);
    const f=clamp((y-a2.offsetTop)/vh,-1,4);
    const exposure=reduce?1:smooth(clamp((p1-.13)/.77,0,1));
    const wide=window.innerWidth>900;
    const shift=wide?.86*clamp(f+1,0,1):0;
    const bloom=reduce?1:.30+.70*smooth(clamp((p1-.18)/.62,0,1));
    if(window.LotusStage&&window.LotusStage.isReady())window.LotusStage.set({bloom,exposure,focus:f,shift,spin:p1*.5});
    bg.style.background=bgAt(p1);
    glow.style.opacity=(bloom*exposure*.55).toFixed(3);
    if(window.Skyfield)window.Skyfield.set({dawn:smooth(clamp((p1-.06)/.42,0,1)),petals:smooth(clamp((p1-.46)/.30,0,1))});
    const idx=p1<.28?0:p1<.58?1:p1<.84?2:3;
    const focus=f>-.55?Math.round(f):-1;
    const dark=p1<.62;
    const key=[idx,focus,dark].join('|');
    if(key!==last.current){last.current=key;setUi({p1,idx,focus,dark})}
   }
   raf=requestAnimationFrame(tick);
  };
  tick();return()=>cancelAnimationFrame(raf);
 },[]);
 const navActive=ui.focus>=0?ui.focus:-1;
 return <React.Fragment>
  <FloatingNav dark={ui.dark} active={navActive}/>
  <Rail focus={ui.focus} dark={ui.dark}/>
  <div className="stateline" style={{color:ui.dark?'rgba(255,249,239,.6)':'var(--slate-500)',opacity:ui.focus>=0?0:1}}>
   {['Night','First light','Opening','Blessing'][ui.idx]}
  </div>
  <ActOne p1={ui.p1} idx={ui.idx}/>
  <HeartEmblem focus={ui.focus>=0?ui.focus:-9}/>
  <div id="act2">{VALUES.map((v,i)=><Petal key={v.key} v={v} i={i} focus={ui.focus>=0?ui.focus:-9}/>)}</div>
  <Flow/>
 </React.Fragment>;
}
ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
