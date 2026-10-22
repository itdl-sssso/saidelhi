const {Button:SButton,Badge:SBadge,Card:SCard,Icon:SIcon,DharmaRule:SRule}=window.SSSSODelhiNCRDesignSystem_9ec6b9;
const SITE_NAV=[
 {i:'info',l:'About',h:'Page.html?p=about'},
 {i:'hand-heart',l:'Programs',h:'Page.html?p=programs'},
 {i:'music',l:'Bhajans',h:'Value Shanti.html'},
 {i:'heart-handshake',l:'Get involved',h:'Page.html?p=join'},
 {i:'chart-column',l:'Impact',h:'Page.html?p=impact'},
 {i:'map-pin',l:'Reach us',h:'Map.html'},
 {sep:true},
 {i:'newspaper',l:'News',h:'Articles.html?c=news'},
 {i:'calendar-days',l:'Calendar',h:'Calendar.html'}
];
function SiteNav({active}){
 const A={News:'news',Calendar:'calendar','Reach us':'map',About:'about',Programs:'programs','Get involved':'join',Impact:'impact',Bhajans:'bhajans'};
 return <window.MenuNav active={A[active]}/>;
}
function SiteFooter(){
 return <React.Fragment><SRule height={3}/>
 <footer className="site"><div className="wrap">
  <div className="fgrid">
   <div><img className="foot-emblem" src="../assets/sarva-dharma-logo.jpg" alt="Sarva Dharma emblem" /><h4>Sri Sathya Sai Seva Organisation</h4><p className="fmuted">Delhi NCR. Bhajans, study circles, Bal Vikas and seva — open to everyone, free always.</p></div>
   <div><h4>Visit</h4><p><a href="Calendar.html">Calendar</a><br/><a href="Map.html">Centres</a><br/><a href="Page.html?p=impact">Impact</a><br/><a href="Articles.html?c=news">News</a></p></div>
   <div><h4>Serve</h4><p><a href="Page.html?p=join">Join a seva</a><br/><a href="#">Donate</a><br/><a href="#">SaiConnect</a><br/><a href="Page.html?p=privacy">Privacy</a></p></div>
  </div>
  <p className="fine">All activities are free and open to people of every faith. Prototype — copy, dates and photography to be supplied by the organisation.</p>
 </div></footer></React.Fragment>;
}
function Crumb({items}){
 return <nav className="crumb" aria-label="Breadcrumb">{items.map((c,i)=><React.Fragment key={i}>{i>0&&<SIcon name="chevron-right" size={16}/>}{c[1]?<a href={c[1]}>{c[0]}</a>:<span>{c[0]}</span>}</React.Fragment>)}</nav>;
}
const CAT_TONE={news:'shanti',centenary:'sathya',activities:'prem'};
function ArticleCard({a,compact}){
 const S=window.SITE;
 return <a className="acard" href={'Article.html?id='+a.id}>
  <SCard tone="plain" interactive padding="0">
   <div className="acard-img"><image-slot id={'art-'+a.id} shape="rect" placeholder="Article photograph"></image-slot></div>
   <div className="acard-body">
    <div className="acard-meta"><SBadge tone={CAT_TONE[a.cat]}>{S.CATS[a.cat].label}</SBadge><span>{S.fmtDate(a.date)}</span></div>
    <h3>{a.title}</h3>
    {!compact&&<p>{a.excerpt}</p>}
    <div className="acard-foot"><span><SIcon name="map-pin" size={16}/>{a.district}</span><span className="acard-more">Read<SIcon name="arrow-right" size={16}/></span></div>
   </div>
  </SCard>
 </a>;
}
function qs(k){return new URLSearchParams(location.search).get(k)}
Object.assign(window,{SiteNav,SiteFooter,Crumb,ArticleCard,CAT_TONE,qs,SITE_NAV});
