const {Input,Select,Tabs,Eyebrow,Button,Icon}=window.SSSSODelhiNCRDesignSystem_9ec6b9;
const PER=9;
const TABS=[['all','All'],['news','News and events'],['centenary','Centenary celebrations'],['activities','District activities']];
function Listing(){
 const S=window.SITE;
 const init=TABS.some(t=>t[0]===qs('c'))?qs('c'):'all';
 const [cat,setCat]=React.useState(init);
 const [q,setQ]=React.useState(qs('q')||'');
 const [dist,setDist]=React.useState('All districts');
 const [sort,setSort]=React.useState('Newest first');
 const [page,setPage]=React.useState(1);
 React.useEffect(()=>{setPage(1)},[cat,q,dist,sort]);
 React.useEffect(()=>{const u=new URL(location.href);u.searchParams.set('c',cat);if(q)u.searchParams.set('q',q);else u.searchParams.delete('q');history.replaceState(null,'',u)},[cat,q]);
 const ql=q.trim().toLowerCase();
 let list=S.ARTICLES.filter(a=>(cat==='all'||a.cat===cat)&&(dist==='All districts'||a.district===dist)&&(!ql||(a.title+' '+a.excerpt+' '+a.district).toLowerCase().includes(ql)));
 if(sort==='Oldest first')list=[...list].reverse();
 const pages=Math.max(1,Math.ceil(list.length/PER)),cur=Math.min(page,pages);
 const shown=list.slice((cur-1)*PER,cur*PER);
 const meta=cat==='all'?{eb:'From Delhi NCR',title:'News and articles',desc:'Reports, notices and stories from the centres, the districts and the centenary year.'}:S.CATS[cat];
 const go=n=>{setPage(n);window.scrollTo({top:document.getElementById('results').offsetTop-90,behavior:'smooth'})};
 const nums=[];for(let i=1;i<=pages;i++)if(i===1||i===pages||Math.abs(i-cur)<=1)nums.push(i);else if(nums[nums.length-1]!=='…')nums.push('…');
 return <React.Fragment>
  <SiteNav active="News"/>
  <SRule height={2}/>
  <header className="phero" data-screen-label="Listing hero"><div className="wrap">
   <Crumb items={[['Home','Home v2.html'],['News and articles',cat==='all'?null:'Articles.html?c=all']].concat(cat==='all'?[]:[[meta.title]])}/>
   <Eyebrow>{meta.eb}</Eyebrow>
   <h1>{meta.title}</h1>
   <p className="lead">{meta.desc}</p>
   <div className="tabs-row"><Tabs tabs={TABS.map(t=>t[1])} value={TABS.find(t=>t[0]===cat)[1]} onChange={l=>setCat(TABS.find(t=>t[1]===l)[0])}/></div>
   <div className="toolbar">
    <Input label="Search" placeholder="Search by title, place or seva" value={q} onChange={e=>setQ(e.target.value)} type="search"/>
    <Select label="District" value={dist} onChange={e=>setDist(e.target.value)} options={['All districts'].concat(S.DISTRICTS)}/>
    <Select label="Sort" value={sort} onChange={e=>setSort(e.target.value)} options={['Newest first','Oldest first']}/>
   </div>
  </div></header>
  <section className="sec pt0" id="results"><div className="wrap">
   <div className="results"><span>{list.length?('Showing '+((cur-1)*PER+1)+'–'+Math.min(cur*PER,list.length)+' of '+list.length+' articles'):'No articles'}</span>
    {(q||dist!=='All districts')&&<Button variant="ghost" size="sm" icon="x" onClick={()=>{setQ('');setDist('All districts')}}>Clear filters</Button>}</div>
   {shown.length?<div className="agrid">{shown.map(a=><ArticleCard key={a.id} a={a}/>)}</div>
    :<div className="empty"><h3>Nothing matches that search</h3><p>Try a different word, or look across all districts.</p></div>}
   {pages>1&&<nav className="pagin" aria-label="Pagination">
    <button className="pg" type="button" disabled={cur===1} onClick={()=>go(cur-1)} aria-label="Previous page"><Icon name="chevron-left" size={16}/>Previous</button>
    {nums.map((n,i)=>n==='…'?<span key={'e'+i} className="pg" style={{border:0,background:'none',cursor:'default'}}>…</span>:<button key={n} type="button" className={'pg'+(n===cur?' on':'')} aria-current={n===cur?'page':undefined} onClick={()=>go(n)}>{n}</button>)}
    <button className="pg" type="button" disabled={cur===pages} onClick={()=>go(cur+1)} aria-label="Next page">Next<Icon name="chevron-right" size={16}/></button>
   </nav>}
  </div></section>
  <SiteFooter/>
 </React.Fragment>;
}
ReactDOM.createRoot(document.getElementById('root')).render(<Listing/>);
