const {Eyebrow,Button,Icon,Badge,Card,Alert}=window.SSSSODelhiNCRDesignSystem_9ec6b9;
const BODIES={
 'unity-run':[
  ['p','At 5:30 AM on Sunday 5 July, the lawns of the Sri Sathya Sai International Centre were already full. Runners in white, cyclists checking their tyres, grandparents with flasks of tea, and Bal Vikas children holding a banner they had painted the week before.'],
  ['h','A route through the city'],
  ['p','The 5 km run and 15 km ride followed Lodhi Road, India Gate and Shanti Path before returning to the centre. Water points were run by the youth wing, and a medical team from the Preet Vihar samithi rode behind the last cyclist.'],
  ['fig','The start line on Lodhi Road, just after first light'],
  ['p','The event is one of many held across India for the centenary, under the banner “Spirit of Unity”. It carries the Fit India message alongside a simpler one: that health, like seva, is something we look after together.'],
  ['quote','Health is wealth. A healthy body is needed for a healthy mind.','Bhagawan Sri Sathya Sai Baba'],
  ['video','Highlights from the Unity Run and Ride — 3 min'],
  ['h','Who took part'],
  ['p','Over 1,100 people registered — the youngest seven, the oldest seventy-eight. Nothing was charged for registration, and every participant left with a sapling to plant at home.'],
  ['gallery','Moments from the morning'],
  ['p','The next Unity Run will be held in Gurugram in December. Registration opens on the calendar a month before.']
 ]
};
function genericBody(a){
 const c=window.SITE.CATS[a.cat];
 return [
  ['p',a.excerpt+' Sevadals from the '+a.district+' district planned the work over several weeks, with help from neighbouring centres.'],
  ['h','How it came together'],
  ['p','Each activity begins with a small group asking what is needed nearby, and who could give a few hours. From there, the work is shared out — some cook, some carry, some sit with people and listen. Nothing is collected from those we serve.'],
  ['fig','Sevadals at work, '+a.district],
  ['quote','Hands that help are holier than lips that pray.','Bhagawan Sri Sathya Sai Baba'],
  ['p','The '+c.label.toLowerCase()+' archive holds earlier reports like this one. If you would like to join the next round, the calendar lists dates by district.'],
  ['video','Video from the day'],
  ['gallery','Photographs']
 ];
}
function Block({b,i,id}){
 const t=b[0];
 if(t==='p')return <p className={i===0?'lede':''}>{b[1]}</p>;
 if(t==='h')return <h2>{b[1]}</h2>;
 if(t==='fig')return <figure><div className="fig-img"><image-slot id={'artfig-'+id+'-'+i} shape="rounded" radius="16" placeholder="Inline photograph"></image-slot></div><figcaption>{b[1]}</figcaption></figure>;
 if(t==='quote')return <blockquote className="pull">“{b[1]}”<cite>{b[2]}</cite></blockquote>;
 if(t==='video')return <figure><div className="video" role="button" aria-label={'Play video: '+b[1]}>
   <div className="vslot"><image-slot id={'artvid-'+id} shape="rect" placeholder="Video poster"></image-slot></div>
   <span className="play"><Icon name="play" size={24}/></span><span className="vlabel vlabel-top">{b[1]}</span></div>
  <figcaption>Video embed — paste a YouTube link or upload an MP4 in the CMS.</figcaption></figure>;
 if(t==='gallery')return <figure><div className="gallery">{[0,1,2,3,4].map(k=><div key={k}><image-slot id={'artgal-'+id+'-'+k} shape="rounded" radius="10" placeholder={k===0?'Gallery photo':'Photo'}></image-slot></div>)}</div><figcaption>{b[1]} — tap any photograph to open the gallery.</figcaption></figure>;
 return null;
}
function ArticlePage(){
 const S=window.SITE;
 const a=S.ARTICLES.find(x=>x.id===qs('id'))||S.ARTICLES.find(x=>x.id==='unity-run');
 const cat=S.CATS[a.cat];
 const same=S.ARTICLES.filter(x=>x.cat===a.cat);// newest first
 const ix=same.findIndex(x=>x.id===a.id);
 const newer=same[ix-1],older=same[ix+1];
 const related=same.filter(x=>x.id!==a.id).slice(0,3);
 const body=BODIES[a.id]||genericBody(a);
 const [copied,setCopied]=React.useState(false);
 return <React.Fragment>
  <SiteNav active="News"/>
  <SRule height={2}/>
  <header className="art-hero" data-screen-label="Article header"><div className="wrap">
   <div className="art-head">
    <Crumb items={[['Home','Home v2.html'],['News and articles','Articles.html?c=all'],[cat.title,'Articles.html?c='+a.cat]]}/>
    <Badge tone={CAT_TONE[a.cat]} icon={cat.icon}>{cat.label}</Badge>
    <h1>{a.title}</h1>
    <div className="art-meta"><span><Icon name="calendar-days" size={16}/>{S.fmtDate(a.date)}</span><span><Icon name="map-pin" size={16}/>{a.district}</span><span><Icon name="clock" size={16}/>{a.read} min read</span></div>
   </div>
   <div className="art-cover"><image-slot id={'art-'+a.id} shape="rounded" radius="24" placeholder="Cover photograph"></image-slot></div>
  </div></header>
  <section data-screen-label="Article body"><div className="wrap art-layout">
   <article className="prose">{body.map((b,i)=><Block key={i} b={b} i={i} id={a.id}/>)}</article>
   <aside className="aside">
    <Card tone="calm" padding="24px">
     <h4>At a glance</h4>
     <ul className="facts-l">
      <li><span><Icon name="calendar-days" size={16}/></span><span>{S.fmtDate(a.date)}</span></li>
      <li><span><Icon name="map-pin" size={16}/></span><span>{a.district}</span></li>
      <li><span><Icon name={cat.icon} size={16}/></span><span>{cat.label}</span></li>
     </ul>
    </Card>
    <div><h4>Share</h4><div className="share">
     {[['facebook','Share on Facebook'],['youtube','YouTube channel'],['message-circle','Share on WhatsApp'],['mail','Share by email']].map(s=><button key={s[0]} className="iconbtn" type="button" aria-label={s[1]}><Icon name={s[0]} size={18}/></button>)}
     <button className="iconbtn" type="button" aria-label="Copy link" onClick={()=>{navigator.clipboard&&navigator.clipboard.writeText(location.href).catch(()=>{});setCopied(true);setTimeout(()=>setCopied(false),1600)}}><Icon name={copied?'check':'link'} size={18}/></button>
    </div></div>
    <Button variant="secondary" icon="calendar-days" href="Calendar.html">See the calendar</Button>
   </aside>
  </div></section>
  <section className="pt0" data-screen-label="Previous / next"><div className="wrap">
   <nav className="prevnext" aria-label="More articles">
    {older?<a className="pn" href={'Article.html?id='+older.id}><span className="lbl"><Icon name="arrow-left" size={16}/>Previous</span><span className="t">{older.title}</span></a>:<span></span>}
    {newer?<a className="pn next" href={'Article.html?id='+newer.id}><span className="lbl">Next<Icon name="arrow-right" size={16}/></span><span className="t">{newer.title}</span></a>:<span></span>}
   </nav>
  </div></section>
  <section className="sec" data-screen-label="Related articles"><div className="wrap">
   <div className="rel-h"><div><Eyebrow>Keep reading</Eyebrow><h2 style={{fontSize:'var(--text-h2)',marginTop:'6px'}}>{'More from '+cat.title.toLowerCase()}</h2></div>
    <Button variant="outline" iconAfter="arrow-right" href={'Articles.html?c='+a.cat}>See all</Button></div>
   <div className="agrid">{related.map(r=><ArticleCard key={r.id} a={r}/>)}</div>
  </div></section>
  <SiteFooter/>
 </React.Fragment>;
}
ReactDOM.createRoot(document.getElementById('root')).render(<ArticlePage/>);
