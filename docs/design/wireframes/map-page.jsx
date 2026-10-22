const {Eyebrow,Button,Icon,Badge,Card,Input,Select}=window.SSSSODelhiNCRDesignSystem_9ec6b9;
function MapPage(){
 const S=window.SITE;
 const [q,setQ]=React.useState('');
 const [dist,setDist]=React.useState('All districts');
 const [sel,setSel]=React.useState('ssic');
 const mapEl=React.useRef(null),mapRef=React.useRef(null),marks=React.useRef({});
 const ql=q.trim().toLowerCase();
 const list=S.CENTRES.filter(c=>(dist==='All districts'||c.district===dist)&&(!ql||(c.name+' '+c.addr+' '+c.district+' '+c.offers.join(' ')).toLowerCase().includes(ql)));
 React.useEffect(()=>{
  const map=L.map(mapEl.current,{scrollWheelZoom:false,zoomControl:true}).setView([28.62,77.2],10);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors',maxZoom:18}).addTo(map);
  S.CENTRES.forEach(c=>{
   const m=L.marker([c.lat,c.lng],{icon:L.divIcon({className:'pin'+(c.hq?' hq':''),html:'<span></span>',iconSize:[28,28],iconAnchor:[14,14]}),title:c.name,keyboard:true}).addTo(map);
   m.bindPopup('<b>'+c.name+'</b><br>'+c.district+'<br>Bhajans: '+c.bhajans,{closeButton:false,offset:[0,-8]});
   m.on('click',()=>setSel(c.id));marks.current[c.id]=m;
  });
  mapRef.current=map;
  return()=>map.remove();
 },[]);
 React.useEffect(()=>{
  const map=mapRef.current;if(!map)return;
  S.CENTRES.forEach(c=>{const m=marks.current[c.id],el=m.getElement();const vis=list.some(x=>x.id===c.id);if(el){el.style.display=vis?'':'none';el.classList.toggle('on',c.id===sel)}});
  if(list.length&&!list.some(x=>x.id===sel)&&dist!=='All districts')setSel(list[0].id);
  if(dist!=='All districts'&&list.length){map.fitBounds(L.latLngBounds(list.map(c=>[c.lat,c.lng])).pad(.4),{maxZoom:13})}
 },[q,dist,sel]);
 const pick=c=>{setSel(c.id);const map=mapRef.current;if(map){map.flyTo([c.lat,c.lng],13,{duration:.6});marks.current[c.id].openPopup()}};
 return <React.Fragment>
  <SiteNav active="Reach us"/>
  <SRule height={2}/>
  <header className="phero map-hero" data-screen-label="Map hero"><div className="wrap">
   <Crumb items={[['Home','Home v2.html'],['Find a centre']]}/>
   <Eyebrow>Reach us</Eyebrow><h1>Find a centre near you</h1>
   <p className="lead">Eleven centres across ten districts. Walk in at bhajan time — no appointment, no registration.</p>
  </div></header>
  <section className="sec pt0" data-screen-label="Centre map"><div className="wrap map-layout">
   <div className="map-side">
    <div className="map-filters">
     <Input label="Search" type="search" placeholder="Area, centre or activity" value={q} onChange={e=>setQ(e.target.value)}/>
     <Select label="District" value={dist} onChange={e=>setDist(e.target.value)} options={['All districts'].concat(S.DISTRICTS)}/>
    </div>
    <p className="map-count">{list.length+(list.length===1?' centre':' centres')}</p>
    <ul className="clist">
     {list.map(c=><li key={c.id}><div className={'citem'+(c.id===sel?' on':'')}>
      <button type="button" className="chead" onClick={()=>pick(c)} aria-expanded={c.id===sel}>
       <span className="cpin"><Icon name="map-pin" size={18}/></span>
       <span className="cname"><b>{c.name}</b><span>{c.district}</span></span>
       {c.hq&&<Badge tone="sathya">Regional HQ</Badge>}
      </button>
      {c.id===sel&&<div className="cbody">
       <p><Icon name="home" size={16}/>{c.addr}</p>
       <p><Icon name="music" size={16}/>Bhajans {c.bhajans}</p>
       <p><Icon name="phone" size={16}/>{c.phone}</p>
       <div className="coffers">{c.offers.map(o=><Badge key={o} tone="shanti">{o}</Badge>)}</div>
       <div className="cacts"><Button variant="primary" size="sm" icon="navigation" href={'https://www.google.com/maps/dir/?api=1&destination='+c.lat+','+c.lng} target="_blank" rel="noopener">Directions</Button><Button variant="outline" size="sm" iconAfter="arrow-right" href="Page.html?p=centre">Centre page</Button><Button variant="ghost" size="sm" iconAfter="arrow-right" href="Calendar.html">What’s on</Button></div>
      </div>}
     </div></li>)}
     {!list.length&&<li className="body">No centre matches that search.</li>}
    </ul>
   </div>
   <div className="map-wrap"><div ref={mapEl} className="map" role="region" aria-label="Map of centres in Delhi NCR"></div></div>
  </div></section>
  <SiteFooter/>
 </React.Fragment>;
}
ReactDOM.createRoot(document.getElementById('root')).render(<MapPage/>);
