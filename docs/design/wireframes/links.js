/* Prototype link router: gives every placeholder link ("#" or no href) a real destination.
   Loaded by every page in wireframes/. Edit ROUTES / TEXT / CLS to change where things go. */
(function(){
const EXT={
 donate:'https://saidelhi.org/', // TODO: exact saidelhi.org donation page URL
 saiconnect:'https://saiconnect.org/', // TODO: confirm SaiConnect URL
 gmaps:'https://www.google.com/maps/search/?api=1&query=Dr.+Ambedkar+Bhawan+Mayur+Vihar+Phase+1+Delhi'
};
const R={
 home:'Home v2.html',about:'Page.html?p=about',programs:'Page.html?p=programs',program:'Page.html?p=program',
 impact:'Page.html?p=impact',join:'Page.html?p=join',event:'Page.html?p=event',centre:'Page.html?p=centre',
 district:'Page.html?p=district',privacy:'Page.html?p=privacy',discourses:'Page.html?p=discourses',discourse:'Page.html?p=discourse',
 news:'Articles.html?c=news',articles:'Articles.html?c=all',calendar:'Calendar.html',map:'Map.html',
 bhajans:'Value Shanti.html',sathya:'Value Sathya.html',portal:'../portal/Batch 3 P0 Rest.html',
 donate:EXT.donate,saiconnect:EXT.saiconnect,gmaps:EXT.gmaps
};
const TEXT=[
 [/^(home|होम|go home|होम पर जाएँ)$/,'home'],
 [/^(about|परिचय|about us)$/,'about'],
 [/^(programs|programmes|कार्यक्रम|all programmes|सभी कार्यक्रम)$/,'programs'],
 [/^(bhajans|भजन|bhajan timings)$/,'bhajans'],
 [/^(get involved|जुड़ें|join a seva|सेवा से जुड़ें|volunteer|whatsapp seva bot|offer your hands)$/,'join'],
 [/^(impact|प्रभाव|see all impact|पूरा प्रभाव देखें|all results|all districts on the impact page|प्रभाव पेज पर सभी ज़िले)$/,'impact'],
 [/^(news|समाचार|news and events)$/,'news'],
 [/^(news and articles|earlier thoughts|पिछले विचार)$/,'articles'],
 [/^(calendar|कैलेंडर|full calendar|event calendar|see the calendar)$/,'calendar'],
 [/^(discourses|प्रवचन)/,'discourses'],
 [/^(centres|केंद्र|centre locator|map|नक्शा|see on map|नक्शे पर देखें|find a centre|plan a visit|all centres on the map)$/,'map'],
 [/^(centre)$/,'centre'],[/sai centre|samithi /,'centre'],
 [/^(privacy|गोपनीयता)$/,'privacy'],
 [/coordinator login|समन्वयक लॉगिन/,'portal'],
 [/saiconnect/,'saiconnect'],
 [/^(donate|दान)|donations/,'donate'],
 [/^(directions|रास्ता)$|google maps/,'gmaps']
];
const CLS=[
 ['.pb-mark,.mark','home'],
 ['.b6-dcard,.disc-c','discourse'],['.b6-vlink','sathya'],
 ['.b4-wing','programs'],['.b4-prog,.pb-prg,.b4-mini a,.lived','program'],
 ['.b4-org__d a','district'],
 ['.b4-cl,.b4-crow a,.hv-near a','centre'],
 ['.pb-ev,.pb-crow,.pb-mev,.b4-need,.hv-ev,.b4-tbl a','event']
];
function label(el){return ((el.getAttribute('aria-label')||el.textContent||'').replace(/\(.*?\)/g,'').replace(/[↗→]/g,'').trim().toLowerCase())}
function resolve(el){
 const t=label(el);
 for(const [sel,k] of CLS){if(el.matches(sel)&&!(k==='home'&&t&&t!=='home'&&t!=='होम'&&t!=='title'))return k}
 for(const [re,k] of TEXT){if(re.test(t))return k}
 return null;
}
function apply(a,k){a.setAttribute('href',R[k]);a.dataset.route=k;if(/^https?:/.test(R[k])){a.target='_blank';a.rel='noopener'}}
function scan(){
 document.querySelectorAll('a:not([data-route])').forEach(a=>{const h=a.getAttribute('href');if(h!==null&&h!=='#'&&h!=='')return;const k=resolve(a);if(k)apply(a,k)});
}
let q=0;new MutationObserver(()=>{if(!q)q=requestAnimationFrame(()=>{q=0;scan()})}).observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener('DOMContentLoaded',scan);
document.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b||b.closest('a')||b.type==='submit'||b.getAttribute('aria-expanded')!==null)return;
 const k=resolve(b);if(!k||!['donate','saiconnect','home'].includes(k))return;
 if(/^https?:/.test(R[k]))window.open(R[k],'_blank','noopener');else location.href=R[k];
});
window.SITE_ROUTES=R;
})();
