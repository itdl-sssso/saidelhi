const {Eyebrow,Button,Icon,Badge,Card,Tabs,Select}=window.SSSSODelhiNCRDesignSystem_9ec6b9;
const WD=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
function CalendarPage(){
 const S=window.SITE,[ty,tm,td]=S.TODAY.split('-').map(Number);
 const [ym,setYm]=React.useState([ty,tm-1]);
 const [sel,setSel]=React.useState(S.TODAY);
 const [view,setView]=React.useState('Month');
 const [cats,setCats]=React.useState(Object.keys(S.ECATS));
 const [dist,setDist]=React.useState('All districts');
 const [y,m]=ym;
 const all=S.eventsForMonth(y,m).filter(e=>cats.includes(e.cat)&&(dist==='All districts'||e.district===dist||e.district==='Delhi NCR'));
 const byDay={};all.forEach(e=>{(byDay[e.date]=byDay[e.date]||[]).push(e)});
 const first=new Date(y,m,1).getDay(),days=new Date(y,m+1,0).getDate();
 const cells=[];for(let i=0;i<first;i++)cells.push(null);for(let d=1;d<=days;d++)cells.push(d);while(cells.length%7)cells.push(null);
 const iso=d=>y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
 const shift=n=>{const dt=new Date(y,m+n,1);setYm([dt.getFullYear(),dt.getMonth()]);setSel(dt.getFullYear()===ty&&dt.getMonth()===tm-1?S.TODAY:dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-01')};
 const toggle=k=>setCats(c=>c.includes(k)?(c.length>1?c.filter(x=>x!==k):c):c.concat(k));
 const selEvents=byDay[sel]||[];
 const selDate=new Date(...sel.split('-').map((v,i)=>i===1?v-1:+v));
 const grouped=Object.keys(byDay).sort();
 return <React.Fragment>
  <SiteNav active="Calendar"/>
  <SRule height={2}/>
  <header className="phero" data-screen-label="Calendar hero"><div className="wrap">
   <Crumb items={[['Home','Home v2.html'],['Event calendar']]}/>
   <div className="cal-head">
    <div><Eyebrow>What’s on</Eyebrow><h1>Event calendar</h1>
     <p className="lead">Bhajans, study circles, Bal Vikas and seva across Delhi NCR. Every gathering is free and open to all.</p></div>
    <div className="cal-sub"><Button variant="outline" icon="calendar-plus">Add to Google Calendar</Button></div>
   </div>
  </div></header>
  <section className="sec pt0" data-screen-label="Calendar"><div className="wrap">
   <div className="cal-bar">
    <div className="cal-nav">
     <button className="iconbtn" type="button" aria-label="Previous month" onClick={()=>shift(-1)}><Icon name="chevron-left" size={18}/></button>
     <button className="iconbtn" type="button" aria-label="Next month" onClick={()=>shift(1)}><Icon name="chevron-right" size={18}/></button>
     <h2>{S.MONTHS[m]+' '+y}</h2>
     <Button variant="ghost" size="sm" onClick={()=>{setYm([ty,tm-1]);setSel(S.TODAY)}}>Today</Button>
    </div>
    <div className="cal-ctl">
     <Select aria-label="District" value={dist} onChange={e=>setDist(e.target.value)} options={['All districts'].concat(S.DISTRICTS)}/>
     <Tabs tabs={['Month','List']} value={view} onChange={setView}/>
    </div>
   </div>
   <div className="chips cal-chips" role="group" aria-label="Show event types">
    {Object.entries(S.ECATS).map(([k,c])=><button key={k} type="button" className={'chip tone-'+c.tone+(cats.includes(k)?' on':'')} aria-pressed={cats.includes(k)} onClick={()=>toggle(k)}><Icon name={c.icon} size={16}/>{c.label}</button>)}
   </div>
   {view==='Month'?<div className="cal-layout">
    <div className="cal-grid" role="grid" aria-label={S.MONTHS[m]+' '+y}>
     {WD.map(w=><div key={w} className="cal-wd" role="columnheader">{w}</div>)}
     {cells.map((d,i)=>{if(!d)return <div key={i} className="cal-cell blank"></div>;
      const k=iso(d),ev=byDay[k]||[];
      return <button key={i} type="button" role="gridcell" className={'cal-cell'+(k===sel?' sel':'')+(k===S.TODAY?' today':'')} onClick={()=>setSel(k)} aria-label={d+' '+S.MONTHS[m]+', '+ev.length+' events'}>
       <span className="cal-d">{d}</span>
       <span className="cal-evs">{ev.slice(0,3).map((e,j)=><span key={j} className={'pill tone-'+S.ECATS[e.cat].tone}>{e.name}</span>)}{ev.length>3&&<span className="more">{'+'+(ev.length-3)+' more'}</span>}</span>
       <span className="cal-dots">{ev.slice(0,4).map((e,j)=><i key={j} className={'tone-'+S.ECATS[e.cat].tone}></i>)}</span>
      </button>})}
    </div>
    <aside className="cal-side">
     <Card tone="plain" capped padding="24px">
      <div className="side-date"><span className="dn">{selDate.getDate()}</span><span><b>{WD[selDate.getDay()]}</b><br/>{S.MONTHS[selDate.getMonth()]+' '+selDate.getFullYear()}</span></div>
      {selEvents.length?<ul className="day-list">{selEvents.map((e,i)=><EvRow key={i} e={e}/>)}</ul>
       :<p className="body">Nothing scheduled for this day with the current filters.</p>}
     </Card>
    </aside>
   </div>
   :<div className="cal-list">{grouped.length?grouped.map(k=>{const dt=new Date(...k.split('-').map((v,i)=>i===1?v-1:+v));
     return <div key={k} className={'lgroup'+(k===S.TODAY?' today':'')}><div className="lg-date"><span className="dn">{dt.getDate()}</span><span>{WD[dt.getDay()]}</span></div><ul className="day-list">{byDay[k].map((e,i)=><EvRow key={i} e={e}/>)}</ul></div>})
    :<p className="body">No events this month with the current filters.</p>}</div>}
   <p className="cal-note"><Icon name="clock" size={16}/>All times are India Standard Time (GMT+05:30). Timings can change on festival days — check with your centre.</p>
  </div></section>
  <SiteFooter/>
 </React.Fragment>;
}
function EvRow({e}){
 const c=window.SITE.ECATS[e.cat];
 return <li className="ev">
  <span className={'ev-ico tone-'+c.tone}><Icon name={c.icon} size={18}/></span>
  <span className="ev-main"><a href="Page.html?p=event"><b>{e.name}</b></a><span>{e.time+' · '+e.venue}</span><a className="ev-d" href="Map.html"><Icon name="map-pin" size={16}/>{e.district}</a></span>
  <Badge tone={c.tone}>{c.label}</Badge>
 </li>;
}
ReactDOM.createRoot(document.getElementById('root')).render(<CalendarPage/>);
