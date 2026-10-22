(function(){
const CATS={
 news:{key:'news',label:'News and events',title:'News and events',eb:'From the centres',desc:'Notices, reports and upcoming gatherings from across Delhi NCR.',icon:'newspaper'},
 centenary:{key:'centenary',label:'Centenary celebrations',title:'Centenary celebrations',eb:'100 years of pure love',desc:'Spiritual, educational, cultural and service initiatives marking the centenary of Bhagawan Sri Sathya Sai Baba.',icon:'sun'},
 activities:{key:'activities',label:'District activities',title:'Activities of the districts',eb:'Seva in the field',desc:'What each district has been doing — told by the sevadals who were there.',icon:'hand-heart'}
};
const A=[
 ['unity-run','news','Sri Sathya Sai Unity Run and Ride in Delhi','2026-07-05','Central Delhi','Runners and cyclists of every age set off from Lodhi Road at first light, as part of the centenary and the Fit India movement.',4],
 ['mega-medical-east','activities','Annual mega medical camp, East District','2026-09-14','East Delhi','General check-up, eye and dental screening and free medicines for over 1,400 people in a single day.',5],
 ['badshahpur-centre','activities','A new seva centre opens in Badshahpur','2026-08-30','Gurugram','After three years of meeting in homes, the Badshahpur samithi now has a centre of its own.',3],
 ['narayana-seva-homes','activities','Narayana Seva, home to home','2026-09-08','South Delhi','Every second Sunday, rations and cooked meals are carried to homes in the urban villages of South Delhi.',4],
 ['centenary-overview','centenary','Celebrating 100 glorious years of pure love','2026-01-10','Delhi NCR','An overview of the initiatives under way across Delhi NCR to mark the centenary of Bhagawan Sri Sathya Sai Baba.',6],
 ['akhanda-bhajan','news','Akhanda bhajan on 8 and 9 November','2026-10-12','Delhi NCR','Twenty-four hours of continuous devotional singing, held in every centre. Anyone may sit in for any hour.',2],
 ['ladies-day','news','Ladies Day, 19 November','2026-10-10','Central Delhi','A morning of bhajans, talks and seva led by the Mahila wing, at the International Centre.',2],
 ['centenary-saplings','centenary','100,000 saplings for the centenary','2026-07-21','Gurugram','Youth across ten districts have pledged a sapling for every year of Bhagawan’s life — and a thousand more.',4],
 ['centenary-water','centenary','Drinking water for 100 schools','2026-06-02','Faridabad','RO plants installed in government schools, maintained by sevadals for five years after handover.',3],
 ['blood-camp-faridabad','activities','Blood donation camp, Sector 15','2026-08-17','Faridabad','312 units collected with the district hospital blood bank, from first-time and regular donors alike.',3],
 ['bal-vikas-annual','news','Bal Vikas annual day','2026-09-28','Noida','Children from five groups presented plays, songs and a silent sitting for parents and grandparents.',3],
 ['centenary-cultural','centenary','A festival of music from many faiths','2026-05-17','Central Delhi','Bhajans, qawwali, kirtan and choir singing in one evening, in the spirit of Sarva Dharma.',4],
 ['winter-blankets','activities','Winter blanket rounds begin','2026-10-05','North Delhi','Night rounds to shelters and flyovers start this month and run until the end of February.',2],
 ['study-circle-guide','news','Starting a study circle in your colony','2026-08-11','Delhi NCR','A short guide for anyone who wants to host a weekly study circle in their own home.',5],
 ['centenary-medical','centenary','100 medical camps in 100 villages','2026-04-04','Sonipat','Mobile medical camps reach villages along the Delhi–Haryana border, one every week of the centenary year.',4],
 ['grama-seva-sonipat','activities','Grama Seva in Sonipat villages','2026-07-12','Sonipat','Sevadals visited 18 villages with rations, clothes and a short programme of bhajans in each.',3],
 ['youth-meet','news','Delhi NCR youth meet','2026-07-26','West Delhi','Two hundred young adults met for a day of talks, workshops and planning for the coming year’s seva.',3],
 ['centenary-vidya','centenary','Vidya Jyoti: a teacher for every child','2026-03-15','Noida','Evening tuition for the children of construction workers, now in twelve sites across Noida and Ghaziabad.',4],
 ['eye-camp-ghaziabad','activities','Eye camp and free spectacles','2026-06-21','Ghaziabad','Screening for 600 people, with spectacles fitted on the spot and 40 referred for cataract surgery.',3],
 ['guru-purnima','news','Guru Purnima at the International Centre','2026-07-10','Central Delhi','Morning bhajans, a talk on the guru within, and Narayana Seva for 2,000 people.',3],
 ['centenary-run','centenary','The torch of unity reaches Delhi','2026-02-08','Central Delhi','The national centenary torch relay passed through all ten districts of Delhi NCR in a single week.',3],
 ['ghat-cleanup','activities','Yamuna ghat clean-up','2026-05-31','South Delhi','Volunteers cleared 2.4 tonnes of waste from Kalindi Kunj ghat over two weekend mornings.',2],
 ['auditorium-booking','news','Booking the International Centre auditorium','2026-04-20','Central Delhi','The 520-seat auditorium is available for cultural and educational programmes. Here is how to book it.',2],
 ['centenary-letters','centenary','Letters to Swami: children write','2026-01-26','Delhi NCR','Bal Vikas children from every district wrote what “Love all, serve all” means in their own homes.',3]
].map(r=>({id:r[0],cat:r[1],title:r[2],date:r[3],district:r[4],excerpt:r[5],read:r[6]}));

const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
const MS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function fmtDate(iso,short){const [y,m,d]=iso.split('-').map(Number);return short?d+' '+MS[m-1]:d+' '+MONTHS[m-1]+' '+y;}

const CENTRES=[
 {id:'ssic',name:'Sri Sathya Sai International Centre',district:'Central Delhi',addr:'Pragati Vihar, Lodhi Road, New Delhi 110003',lat:28.5893,lng:77.2290,bhajans:'Thu & Sun, 6:30 PM',phone:'011-2436 3221',hq:true,offers:['Bhajans','Study circle','Bal Vikas','Narayana Seva','Auditorium']},
 {id:'hauz-khas',name:'Hauz Khas Samithi',district:'South Delhi',addr:'Block B, Hauz Khas, New Delhi 110016',lat:28.5494,lng:77.2001,bhajans:'Sun, 6:30 PM',phone:'98100 00101',offers:['Bhajans','Bal Vikas','Narayana Seva']},
 {id:'rajouri',name:'Rajouri Garden Samithi',district:'West Delhi',addr:'J Block, Rajouri Garden, New Delhi 110027',lat:28.6415,lng:77.1209,bhajans:'Thu, 6:30 PM',phone:'98100 00102',offers:['Bhajans','Study circle','Youth']},
 {id:'preet-vihar',name:'Preet Vihar Samithi',district:'East Delhi',addr:'Preet Vihar, Delhi 110092',lat:28.6417,lng:77.2950,bhajans:'Sun, 6:00 PM',phone:'98100 00103',offers:['Bhajans','Medical camp','Bal Vikas']},
 {id:'model-town',name:'Model Town Samithi',district:'North Delhi',addr:'Model Town III, Delhi 110009',lat:28.7158,lng:77.1910,bhajans:'Thu & Sun, 6:30 PM',phone:'98100 00104',offers:['Bhajans','Blanket rounds']},
 {id:'dlf2',name:'DLF Phase 2 Samithi',district:'Gurugram',addr:'DLF Phase 2, Gurugram 122002',lat:28.4880,lng:77.0890,bhajans:'Sun, 6:30 PM',phone:'98100 00105',offers:['Bhajans','Study circle','Environmental seva']},
 {id:'badshahpur',name:'Badshahpur Seva Centre',district:'Gurugram',addr:'Badshahpur, Sector 66, Gurugram 122101',lat:28.3990,lng:77.0490,bhajans:'Sat, 6:30 PM',phone:'98100 00106',offers:['Bhajans','Grama Seva']},
 {id:'faridabad',name:'Sector 15 Samithi',district:'Faridabad',addr:'Sector 15, Faridabad 121007',lat:28.3960,lng:77.3260,bhajans:'Thu, 6:30 PM',phone:'98100 00107',offers:['Bhajans','Blood donation','Medical camp']},
 {id:'noida50',name:'Sector 50 Samithi',district:'Noida',addr:'Sector 50, Noida 201301',lat:28.5710,lng:77.3640,bhajans:'Sun, 6:30 PM',phone:'98100 00108',offers:['Bhajans','Bal Vikas','Vidya Jyoti']},
 {id:'indirapuram',name:'Indirapuram Samithi',district:'Ghaziabad',addr:'Niti Khand, Indirapuram, Ghaziabad 201014',lat:28.6460,lng:77.3690,bhajans:'Thu & Sun, 7:00 PM',phone:'98100 00109',offers:['Bhajans','Bal Vikas','Eye camp']},
 {id:'sonipat',name:'Sonipat Samithi',district:'Sonipat',addr:'Model Town, Sonipat 131001',lat:28.9931,lng:77.0151,bhajans:'Sun, 6:00 PM',phone:'98100 00110',offers:['Bhajans','Grama Seva','Medical camp']}
];

const ECATS={
 bhajan:{label:'Bhajans',tone:'shanti',icon:'music'},
 study:{label:'Study circle',tone:'shanti',icon:'book-open'},
 balvikas:{label:'Bal Vikas',tone:'sathya',icon:'graduation-cap'},
 seva:{label:'Seva',tone:'prem',icon:'hand-heart'},
 festival:{label:'Festival',tone:'sathya',icon:'sun'}
};
const ONE_OFF=[
 ['2026-10-18','07:30 AM','Sapling plantation drive','seva','Aravalli Biodiversity Park','Gurugram'],
 ['2026-10-23','05:00 AM','Nagar Sankirtan','festival','From Hauz Khas centre','South Delhi'],
 ['2026-10-25','09:00 AM','Blood donation camp','seva','Sector 15 centre','Faridabad'],
 ['2026-10-20','10:00 AM','Sri Sathya Sai Avatar Declaration Day','festival','International Centre, Lodhi Road','Central Delhi'],
 ['2026-11-01','10:00 AM','Water-saving drive in schools','seva','Sector 21 centre','Noida'],
 ['2026-11-08','06:00 AM','Akhanda bhajan begins','festival','All centres','Delhi NCR'],
 ['2026-11-19','09:30 AM','Ladies Day','festival','International Centre, Lodhi Road','Central Delhi'],
 ['2026-11-23','05:00 AM','Bhagawan’s Birthday celebrations','festival','International Centre, Lodhi Road','Central Delhi'],
 ['2026-11-14','09:00 AM','Annual mega medical camp','seva','Preet Vihar centre','East Delhi'],
 ['2026-12-25','06:00 PM','Christmas carols and bhajans','festival','International Centre, Lodhi Road','Central Delhi']
];
function pad(n){return String(n).padStart(2,'0')}
function eventsForMonth(y,m){// m 0-based
 const out=[],days=new Date(y,m+1,0).getDate();let sun=0,sat=0;
 for(let d=1;d<=days;d++){
  const wd=new Date(y,m,d).getDay(),iso=y+'-'+pad(m+1)+'-'+pad(d);
  if(wd===4)out.push({date:iso,time:'6:30 PM',name:'Thursday bhajans',cat:'bhajan',venue:'International Centre, Lodhi Road',district:'Central Delhi'});
  if(wd===3)out.push({date:iso,time:'7:00 PM',name:'Study circle',cat:'study',venue:'DLF Phase 2 centre',district:'Gurugram'});
  if(wd===0){sun++;
   out.push({date:iso,time:'10:00 AM',name:'Bal Vikas classes',cat:'balvikas',venue:'All centres',district:'Delhi NCR'});
   out.push({date:iso,time:'6:30 PM',name:'Sunday bhajans',cat:'bhajan',venue:'Sector 50 centre',district:'Noida'});
   if(sun===2)out.push({date:iso,time:'11:00 AM',name:'Narayana Seva — meal service',cat:'seva',venue:'Ring Road shelter',district:'Central Delhi'});}
  if(wd===6){sat++;if(sat===2)out.push({date:iso,time:'9:00 AM',name:'Medical camp',cat:'seva',venue:'Sector 15 centre',district:'Faridabad'});}
 }
 ONE_OFF.forEach(e=>{const [yy,mm]=e[0].split('-').map(Number);if(yy===y&&mm===m+1)out.push({date:e[0],time:e[1].replace(/^0/,''),name:e[2],cat:e[3],venue:e[4],district:e[5]})});
 const tm=t=>{const [hm,ap]=t.split(' ');let [h,mi]=hm.split(':').map(Number);if(ap==='PM'&&h!==12)h+=12;if(ap==='AM'&&h===12)h=0;return h*60+mi};
 return out.sort((a,b)=>a.date.localeCompare(b.date)||tm(a.time)-tm(b.time));
}
const DISTRICTS=['Central Delhi','South Delhi','West Delhi','East Delhi','North Delhi','Gurugram','Faridabad','Noida','Ghaziabad','Sonipat'];
window.SITE={CATS,ARTICLES:A.sort((a,b)=>b.date.localeCompare(a.date)),CENTRES,ECATS,eventsForMonth,fmtDate,MONTHS,MS,DISTRICTS,TODAY:'2026-10-17'};
})();
