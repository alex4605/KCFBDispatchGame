// 戰術指揮：第一優先擴充勤務——化學物質洩漏（化工廠區）、學校實驗室藥劑外洩、國道多車事故（連環車禍、國道事故、遊覽車車禍）、
// 吊車倒塌與大型工安意外、人孔掉落受困。化災部分沿用 CBRNE 核心（cbrne.js），倒塌沿用支撐（tac-sc2.js），人孔沿用侷限空間（tac-sc.js）
'use strict';
Object.assign(TACK,{
 chem:{f:[1,1],lay:'yard',yard:'plant',k:[3,4],b:0,out:1,nofire:1,sc:'chem'},
 schoollab:{f:[3,4],lay:'corridor',k:[3,3],b:0,nofire:1,sc:'lab'},
 pileup:{f:[1,1],lay:'yard',yard:'hwy',k:[3,4],b:0,out:1,nofire:1,sc:'mvc',nv:[5,8]},
 hiway:{f:[1,1],lay:'yard',yard:'hwy',k:[2,3],b:0,out:1,nofire:1,sc:'mvc',nv:[2,3]},
 buscrash:{f:[1,1],lay:'yard',yard:'hwy',k:[3,3],b:0,out:1,nofire:1,sc:'mvc',nv:[2,3],bus:1},
 crane:{f:[1,1],lay:'yard',yard:'csite',k:[3,3],b:0,out:1,nofire:1,sc:'crane'},
 majorind:{f:[1,1],lay:'yard',yard:'csite',k:[3,4],b:0,out:1,nofire:1,sc:'crane',ind:1},
 drainfall:{f:[1,1],lay:'yard',yard:'pit',k:[2,3],b:0,out:1,nofire:1,sc:'pit'}});
Object.assign(TAC_SCY,{plant:1,hwy:1,csite:1});
TAC_KINDS.schoollab=['class','class','lab','class'];
Object.assign(TAC_RK,{tankc:{n:'儲槽區',fk:.6,sr:.6},rackp:{n:'管架區',fk:.5,sr:.6},proc:{n:'製程廠房',fk:1.1,sr:1.2},
 class:{n:'教室',fk:.9,sr:1},lab:{n:'實驗室',fk:1,sr:1.1},prep:{n:'藥品室',fk:1.2,sr:1},
 crane:{n:'吊車',fk:.6,sr:1},debris:{n:'倒塌結構',fk:.4,sr:1.6},scaf:{n:'鷹架',fk:.3,sr:1}});
Object.assign(TAC_RK,{wharf:{n:'碼頭',fk:.1,sr:.5}});
Object.assign(TAC_YFU,{wharf:0,tankc:.3,rackp:.2,proc:1,crane:.3,debris:.3,scaf:.2});
Object.assign(TAC_TASK,{stab:'車輛穩固',extr:'破壞救援'});
EPA_KS.push('majorind');
// ===== 版面 =====
// 場區版面共用工具（tac-sc3、tac-sc4）：lane 一段車道、lanes 依長度切成多段車道、row 一整列空間（walled 為有牆的用途）
function tacLayKit(L,add,room,cuts,walled){
 const lane=(gx,gy,gw,gh,o)=>add(Object.assign({ty:'hall',gx,gy,gw,gh,lane:1},o||{}));
 const lanes=(x0,x1,y0,y1,o)=>{if(x1-x0<.05)return;const hs=cuts(x0,x1,1,1.6);for(let i=0;i<hs.length-1;i++)lane(hs[i],y0,hs[i+1]-hs[i],y1-y0,o)};
 const row=(y0,y1,mk,a,b)=>{const xs=cuts(0,L.GW,a||.75,b||1.2);for(let i=0;i<xs.length-1;i++){const n=room(xs[i],y0,xs[i+1]-xs[i],y1-y0,mk(i,xs.length-1));if(walled.test(n.kind))n.walled=1}};
 return{lane,lanes,row}}
// 大量傷病患：依待後送人數加派救護車（每 10 秒最多 n 輛；現場加途中最多 max 輛）
function tacMciAmb(inc,B,max,n,minP){
 B.ambX=(B.ambX||0)-1.5;if(B.ambX>0)return;B.ambX=10;
 let left=B.pts.length;for(const x of B.cells)left+=x.vic;if(left<(minP||1))return;
 const amb=onScene(inc).concat(S.units.filter(u=>u.inc===inc.id&&u.st==='go')).filter(u=>u.code==='91'&&!u.load).length;
 for(let i=0;i<n&&amb+i<Math.min(max,Math.ceil(left/2));i++)tacReinf(inc,B,'amb')}
function tacSc3Lay(T,K,L,add,room,cuts,R){
 const{lanes,row}=tacLayKit(L,add,room,cuts,/home|proc|yoff/);
 const sh=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
 if(T.yard==='plant'){ // 化工廠區：上排廠外民宅、廠內車道、儲槽與管架、車道、裝卸區與辦公室、製程廠房
  L.GW=3.8+K*.4;const y1=.7,y2=y1+.5,y3=y2+1.1,y4=y3+.5;L.GH=y4+1.05;L.var=R()<.38?'tank':R()<.6?'drum':'wharf';L.varN={tank:'儲槽區外洩',drum:'桶裝倉儲外洩',wharf:'碼頭儲槽區外洩'}[L.var];
  if(L.var==='wharf'){ // 臨港化學品儲槽：上排製程廠房與辦公室、儲槽區、碼頭（化學品船卸料）
   row(0,y1,(i,n)=>i===0?'yoff':'proc',.9,1.3);lanes(0,L.GW,y1,y2);{const pool=sh(['tankc','tankc','tankc','rackp']);row(y2,y3,i=>pool[i%pool.length])}
   lanes(0,L.GW,y3,y4);row(y4,L.GH,(i,n)=>i===1?'dock':'wharf',1,1.5);return true}
  row(0,y1,()=>'home',.8,1.1);lanes(0,L.GW,y1,y2);
  {const pool=sh(L.var==='tank'?['tankc','tankc','rackp','drum','proc']:['drum','drum','rackp','tankc','proc']);row(y2,y3,i=>pool[i%pool.length])}
  lanes(0,L.GW,y3,y4);
  {const pool=sh(['dock','yoff','proc','drum']);row(y4,L.GH,i=>pool[i%pool.length])}
  return true}
 if(T.yard==='hwy'){ // 國道：路肩、2～3 車道散落多輛事故車（汽車、聯結車、遊覽車）、邊坡或高架
  L.GW=4.2+K*.45;const rd=T.city?'city':T.bus?(R()<.4?'mtn':R()<.5?'city':'hwy'):'hwy'; // 遊覽車車禍可能在山區道路或市區道路，其餘是國道
  const n3=rd==='hwy'&&R()<.45,via=rd==='hwy'&&R()<.3;L.var=rd==='hwy'?(n3?'3':'2')+(via?'v':''):rd;L.varN=rd==='mtn'?'山區道路':rd==='city'?'市區道路':(n3?'三車道':'雙車道')+(via?'高架路段':'平面路段');
  const y1=rd==='city'?.7:.5,rows=[[y1,y1+.8],[y1+.8,y1+1.6]];if(n3)rows.push([y1+1.6,y1+2.4]);const yE=rows[rows.length-1][1];L.GH=yE+(via?.5:.7);
  if(rd==='city'){const xs=cuts(0,L.GW,.9,1.3);for(let i=0;i<xs.length-1;i++)room(xs[i],0,xs[i+1]-xs[i],y1,'shopf').walled=1}
  else if(rd==='mtn'){const xs=cuts(0,L.GW,.9,1.4);for(let i=0;i<xs.length-1;i++)room(xs[i],0,xs[i+1]-xs[i],y1,'slope')}
  else lanes(0,L.GW,0,y1,{shd:1});
  const nv=Math.round(T.nv[0]+R()*(T.nv[1]-T.nv[0])),occ=rows.map(()=>[]);
  const types=T.bus?['bus'].concat(Array(nv-1).fill(0).map(()=>R()<.8?'car':'truck')):Array(nv).fill(0).map(()=>R()<(T.small?.85:.72)?'car':T.small||R()<.6?'truck':'bus');
  const LEN={car:.9,truck:2.05,bus:1.9};
  for(const ty of types){for(let t=0;t<30;t++){const r=Math.floor(R()*rows.length),x=.25+R()*(L.GW-LEN[ty]-.5);
   if(occ[r].some(v=>x<v[0]+v[1]+.12&&v[0]<x+LEN[ty]+.12))continue;occ[r].push([x,LEN[ty],ty]);break}}
  rows.forEach((rw,i)=>{const vs=occ[i].sort((a,b)=>a[0]-b[0]);let x=0;
   for(const[x0,l,ty]of vs){lanes(x,x0,rw[0],rw[1]);const id=Math.random();
    if(ty==='truck'){room(x0,rw[0],.55,rw[1]-rw[0],'cab').vid=id;room(x0+.55,rw[0],1.5,rw[1]-rw[0],'cargo').vid=id}
    else room(x0,rw[0],l,rw[1]-rw[0],ty).vid=id;x=x0+l}
   lanes(x,L.GW,rw[0],rw[1])});
  if(via)lanes(0,L.GW,yE,L.GH,{shd:1});
  else if(rd==='city'){const xs=cuts(0,L.GW,.9,1.3);for(let i=0;i<xs.length-1;i++)room(xs[i],yE,xs[i+1]-xs[i],L.GH-yE,'shopf').walled=1}
  else{const vs=cuts(0,L.GW,.9,1.4),bi=rd==='mtn'&&T.bus&&R()<.5?Math.floor((vs.length-1)/2):-1; // 山區：遊覽車可能翻落路旁溪谷
   if(bi>=0){const b=L.N.find(n=>n.kind==='bus');if(b){b.kind='verge';b.vid=0}}
   for(let i=0;i<vs.length-1;i++)room(vs[i],yE,vs[i+1]-vs[i],L.GH-yE,i===bi?'bus':'verge')}
  return true}
 if(T.yard==='csite'){ // 工地／廠區：上排道路、施工區（吊車、倒塌結構、鷹架）、車道、工區與工務所
  L.GW=3.8+K*.4;const y1=.6,y2=y1+1.2,y3=y2+.5;L.GH=y3+.9;L.var=T.ind||T.mach?'struct':T.fall?'crane':R()<.45?'road':'crane';L.varN={struct:'廠區',crane:'施工工地',road:'工地旁道路'}[L.var];
  if(L.var==='road'){ // 吊臂倒向公共道路：壓到路上的車與騎樓店面
   {const xs=cuts(0,L.GW,.9,1.3);for(let i=0;i<xs.length-1;i++)room(xs[i],0,xs[i+1]-xs[i],y1,i===1?'debris':'shopf').walled=i!==1}
   {const x0=.5+R()*.8;let x=0;const parts=[['car',.9],['crane',1.3],['car',.9]];lanes(0,x0,y1,y2);x=x0;for(const p of parts){room(x,y1,p[1],y2-y1,p[0]);x+=p[1]}lanes(x,L.GW,y1,y2)}
   lanes(0,L.GW,y2,y3);{const pool=sh(['site','scaf','yoff','site']);row(y3,L.GH,i=>pool[i%pool.length])}return true}
  lanes(0,L.GW,0,y1);
  {const pool=T.mach?['proc','debris','proc','store','site']:sh(T.ind?['debris','debris','proc','scaf','site']:['crane','debris','debris','scaf','site']);row(y1,y2,i=>pool[i%pool.length],.8,1.2)}
  if(T.mach)L.varN='工廠';else if(T.fall)L.varN='施工工地';
  lanes(0,L.GW,y2,y3);
  {const pool=sh(['site','yoff','site','proc']);row(y3,L.GH,i=>pool[i%pool.length])}
  return true}
 return false}
// ===== 初始化 =====
function tacSc3Sides(B,m){const sd={};for(const s of TAC_SIDES)sd[s]=m[s];B.sd=sd;B.exp={};B.sp=null;
 B.ents=TAC_SIDES.filter(s=>sd[s].road&&B.L.ent[s]!==undefined).map(s=>({side:s,c:B.L.ent[s],lock:0}));
 if(!sd[B.arr]||!sd[B.arr].road)B.arr=B.ents[0].side;if(B.hyd&&!sd[B.hyd.side].road)B.hyd.side=B.arr}
const TAC_CHEMS3=['氨氣','氯氣','鹽酸','硫酸','氫氟酸','氫氧化鈉（液鹼）','甲苯','丙酮','甲醇','金屬鈉'];
function tacSc3Init(inc,B,T,put,seed){
 if(tacSc4Init(inc,B,T,put,seed))return true;
 const sc=T.sc,t=tacTxt(inc),R=Math.random,N=B.L.N,rooms=N.filter(n=>n.ty==='room'&&!n.court),cel=(f,c)=>tacCel(B,f,c),pk=a=>a[Math.floor(R()*a.length)];
 const chemOf=nm=>Object.assign({},TAC_CHEM.find(c=>c.n===nm)||{n:nm,lv:2},{vap:1});
 if(sc==='chem'){
  const wf=B.L.var==='wharf';if(wf)B.sea=1;
  tacSc3Sides(B,{e:{road:2,big:true,nm:'廠區道路'},w:{road:2,big:true,nm:'廠區道路'},n:{road:0,big:false,nm:wf?'工業區':'廠外民宅'},s:{road:0,big:false,nm:wf?'港區水域':'廠區圍牆'}});
  // 一半機率風往民宅那側吹（下風處民宅受影響）
  if(R()<.5)for(let i=0;i<12;i++){const w=tacWind();if(w.d[1]<-.5){B.wind=w;break}}
  const src=pk(rooms.filter(n=>n.kind===(B.L.var==='drum'?'drum':'tankc')).concat(rooms.filter(n=>n.kind==='dock')));
  const nm=/氨/.test(t)?'氨氣':/氯/.test(t)?'氯氣':/酸/.test(t)?pk(['鹽酸','硫酸','氫氟酸']):pk(TAC_CHEMS3);
  B.chem=chemOf(nm);B.chemK=0;B.leak={f:0,c:src.c,on:1};B.of=0;B.oc=src.c;
  const near=rooms.filter(n=>/proc|yoff|dock|drum|tankc/.test(n.kind)&&tacGd(B,n.c,src.c)<2.2);
  for(let i=0,n=tacRint(1,3);i<n;i++)put(0,pk(near.length?near:rooms).c,1,.6+R()*.3,i===0?1:0);
  for(const n of rooms)if(n.kind==='home'){const x=cel(0,n.c);x.sl=0;x.srch=0}
  {const hs=rooms.filter(n=>n.kind==='home');for(let i=0,n=tacRint(0,2);i<n&&hs.length;i++)put(0,pk(hs).c,1,.9,0)}
  seed(90);
  B.sc.brief='化學物質洩漏：'+tacNm(B,0,src.c)+'化學品外洩（報案說是'+(R()<.4?B.chem.n:'不明化學品')+'），有員工倒地；廠外民宅在'+(B.wind&&B.wind.d[1]<-.5?'下風處':'旁邊')+'。先劃設管制區、在上風處開設除污站，著 A 級化物辨識後止漏；液體要圍堵、廢水不能流進排水溝；下風處民眾疏散或就地避難，受污染的人除污後才能送醫。';
  return true}
 if(sc==='lab'){
  const lf=Math.min(B.F-1,Math.max(1,B.bf+1+Math.floor(R()*(B.F-B.bf-1)))),big=rooms.filter(n=>!n.small&&n.u===undefined),sm=rooms.filter(n=>n.small);
  const lab=pk(big.length?big:rooms),prep=sm.find(n=>n.nb.includes(lab.c))||pk(sm.length?sm:rooms);
  for(let f=0;f<B.F;f++){cel(f,lab.c).k=f===lf?'lab':'class';if(prep!==lab)cel(f,prep.c).k=f===lf?'prep':cel(f,prep.c).k}
  const mix=R()<.25,nm=mix?'氯氣':pk(['鹽酸','氨氣','硫酸','甲醇','金屬鈉','氫氧化鈉（液鹼）']);
  B.chem=chemOf(nm);if(mix)B.chem.srcN='漂白水與鹽酸誤混';B.chemK=R()<.5?1:0;B.leak={f:lf,c:(R()<.6?lab:prep).c,on:1};B.of=lf;B.oc=B.leak.c;
  // 學生：實驗室內與隔壁教室（還沒疏散完的）；蒸氣比空氣重時樓下也有人不適
  for(let i=0,n=tacRint(2,5);i<n;i++)put(lf,lab.c,1,.6+R()*.3,1);
  const adj=rooms.filter(n=>n!==lab&&tacGd(B,n.c,lab.c)<2.5);for(let i=0,n=tacRint(1,3);i<n&&adj.length;i++)put(lf,pk(adj).c,1,.75+R()*.2,0);
  if(tacCP(B.chem).vd>1.15&&lf>B.bf)for(let i=0,n=tacRint(0,2);i<n;i++)put(lf-1,pk(rooms).c,1,.85,0);
  seed(70);
  B.sc.brief='學校實驗室藥劑外洩：'+tacFlr(B,lf)+'化學實驗室'+(B.chem.srcN?B.chem.srcN+'產生氯氣':'藥劑外洩')+(B.chemK?'（老師說是'+B.chem.n+'）':'（不明藥劑）')+'，多名學生咳嗽、眼睛刺痛，老師已帶部分學生疏散到操場。'+
   (tacCP(B.chem).vd>1.15?'蒸氣比空氣重，會沿樓梯往下層沉。':'')+'著適當防護搜救、開窗通風，化物辨識後止漏與中和；受污染的學生要大量除污、檢傷後再送醫，家長與媒體在校門口。';
  return true}
 if(sc==='mvc'){B.lk.clear();B.cd.clear(); // 事故車與車道沒有門鎖（車門變形由破壞救援處理）
  const V=B.L.var||'',city=V==='city',mtn=V==='mtn';
  tacSc3Sides(B,{e:{road:city?2:4,big:true,nm:city?'市區道路':mtn?'山區道路':'國道車道'},w:{road:city?2:4,big:true,nm:city?'市區道路':mtn?'山區道路':'國道車道'},
   n:{road:0,big:false,nm:city?'騎樓店面':mtn?'邊坡':/v/.test(V)?'高架護欄外':'護欄外'},s:{road:0,big:false,nm:city?'騎樓店面':mtn?'溪谷':/v/.test(V)?'高架護欄外':'護欄外'}});
  if(!city)B.hyd=null;if(!city)B.traf={up:R()<.5?B.arr:{e:'w',w:'e'}[B.arr]||'w'};
  for(const n of rooms)if(n.kind==='shopf')for(const m of n.nb)B.cd.add(tacDK(B,0,n.c,m));
  const vs=rooms.filter(n=>/^(car|cab|bus)$/.test(n.kind));let pin=0,tot=0;
  for(const n of vs){const bus=n.kind==='bus',k=bus?tacRint(8,15):tacRint(1,3),x=cel(0,n.c);
   put(0,n.c,k,bus?.75+R()*.2:.55+R()*.35,1);tot+=k;
   const p=bus?tacRint(1,2):R()<(inc.k==='hiway'?.6:.45)?Math.min(k,tacRint(1,2)):0;if(p){x.pin=p;pin+=p}}
  const v0=pk(vs);B.of=0;B.oc=v0.c;
  if(R()<.4){B.chem=Object.assign({},TAC_FUEL);B.chemK=1;B.leak={f:0,c:pk(vs).c,on:1};cel(0,B.leak.c).fuel=1;if(R()<.25){const x=cel(0,B.leak.c);x.h=.4;x.s=.6}}
  B.sc.brief=(inc.k==='buscrash'?'遊覽車車禍':inc.k==='pileup'?'連環車禍':'國道事故')+'：'+vs.length+' 輛車'+(inc.k==='pileup'?'追撞':'碰撞')+'，傷患約 '+tot+' 名，其中 '+pin+' 名被車體夾住要破壞救援。'+
   '先在上游設置警戒（大型車阻擋後方來車），車輛穩固後再破壞救援（救助組、特搜最快）；開設檢傷站、醫療站分類後送'+(B.chem?'；有車輛油料外洩，禁止火源，先止漏、圍堵並泡沫覆蓋':'')+'。';
  return true}
 if(sc==='crane'){B.lk.clear();
  const rdv=B.L.var==='road';
  tacSc3Sides(B,rdv?{e:{road:2,big:true,nm:'道路'},w:{road:2,big:true,nm:'道路'},n:{road:0,big:false,nm:'騎樓店面'},s:{road:0,big:false,nm:'工區圍籬'}}:{e:{road:2,big:true,nm:'工區道路'},w:{road:2,big:true,nm:'工區道路'},n:{road:2,big:true,nm:'道路'},s:{road:0,big:false,nm:'工區圍籬'}});
  const db=rooms.filter(n=>n.kind==='debris'||n.kind==='crane'||n.kind==='scaf'||(rdv&&n.kind==='car'));let pin=0,tot=0;
  for(const n of db){const x=cel(0,n.c);if(n.kind!=='scaf')x.rub=1}
  for(const n of db.filter(n=>n.kind!=='scaf')){if(R()<.25)continue;const k=tacRint(1,2),x=cel(0,n.c);put(0,n.c,k,.5+R()*.35,R()<.6?1:0);x.pin=Math.min(k,R()<.7?1:k);pin+=x.pin;tot+=k}
  if(!tot){const n=pk(db.filter(n=>n.kind!=='scaf')),x=cel(0,n.c);put(0,n.c,1,.55,1);x.pin=1;pin=1;tot=1}
  for(const n of rooms.filter(n=>n.kind==='site'||n.kind==='scaf'))if(R()<.3){put(0,n.c,1,.8,1);tot++}
  B.of=0;B.oc=db[0].c;
  if(T.ind&&R()<.35){const s=pk(rooms.filter(n=>n.kind==='proc'||n.kind==='debris'));B.chem=chemOf(pk(['氨氣','鹽酸','甲苯','氯氣']));B.chemK=0;B.leak={f:0,c:s.c,on:1};seed(40)}
  B.sc.brief=(T.ind?'大型工安意外：廠區鋼構倒塌':'吊車倒塌：吊臂倒在工區')+'，約 '+tot+' 名工人受傷，其中 '+pin+' 名被壓在倒塌結構下。倒塌結構可能二次崩塌：先架設支撐（救助組、特搜），再以氣墊頂升、破壞救援（要先支撐）'+(B.chem?'；廠內管線破裂，有化學品外洩，劃設管制區':'')+'。';
  return true}
 return false}
// 人孔掉落（沿用侷限空間）：只有一人掉落，約六成管道內沒有有害氣體
function tacSc3Post(inc,B){
 if(inc.k!=='drainfall'||!B.sc||B.sc.k!=='pit')return;
 const vs=B.cells.filter(x=>x.vic>0);for(const x of vs.slice(1)){B.vtot-=x.vic;x.vic=0}
 const gas=Math.random()<.4;if(!gas){B.leak.on=0;for(const x of B.cells){x.cz=0;x.o2=20.9}}
 B.sc.brief='人孔掉落受困：一名民眾掉進'+(B.L.varN||'人孔')+'，人在底部受傷爬不出來。'+(gas?'管道內可能缺氧、有硫化氫：':'')+'依侷限空間程序先對人孔氣體偵測'+(gas?'、往人孔送風':'')+'，再由救助組架三腳架、繫救援繩下去救人。'}
// ===== 車輛穩固、破壞救援 =====
function tacSc3Can(B,q,k,f,c){
 if(k!=='stab'&&k!=='extr')return null;
 if(q.ty==='robot'||q.ty==='ladder')return'此組無法執行';if(q.sk==='vol')return'拒絕：義消（一般）不執行破壞救援';
 if(f===undefined||f<0)return'請點選有人受困的車輛或倒塌結構';
 const x=tacCel(B,f,c),n=B.L.N[c];if(!(x.pin>0))return'這裡沒有被夾住的受困者';if(x.ledge)return'懸在外牆的受困者請用雲梯救援或繩索救援';
 if(k==='stab'){if(x.rub)return'倒塌結構請用「支撐」';if(x.stab)return'已穩固';return''}
 if(x.rub&&!x.shore)return'要先架設支撐，才能頂升、破壞救援（避免二次崩塌）';
 if(q.ty!=='resc'&&!q.usar&&q.ty!=='pump')return'破壞救援需要救助組、特搜或幫浦組的破壞器材';
 return''}
function tacSc3Task(inc,B,q,k,cl,dt){
 if(!(cl.pin>0)){q.task='idle';return}
 q.wk+=dt;
 if(k==='stab'){if(q.wk<6)return;q.wk=0;cl.stab=1;q.task='idle';radio(inc,q.cs,tacNm(B,q.f,q.c)+'車輛穩固完成（墊木、支撐、拔鑰匙斷電），可以破壞救援。');return}
 q.wk=0;tacExtrStep(inc,B,q,cl,dt)}
// 搜索時被夾住的受困者不能直接搬運
const tacPinFree=x=>Math.max(0,x.vic-(x.pin||0));
// ===== 戰術 AI =====
function tacSc3AI(inc,B,free,take){
 const sc=B.sc.k;
 if(/^(mvc|crane|rail|sink|air|crowd|collapse)$/.test(sc)){
  if(!B.reqR3&&!onScene(inc).concat(S.units.filter(u=>u.inc===inc.id)).some(u=>u.code==='71'||u.code==='搜')){B.reqR3=1;tacReinf(inc,B,'resc')}
  for(const x of B.cells){if(!(x.pin>0))continue;
   if(B.sq.some(q=>q.tf===x.f&&q.tc===x.c&&/stab|extr|shore/.test(q.task)))continue;
   if(x.rub&&!x.shore){let r=free.find(q=>(q.ty==='resc'||q.usar)&&q.air>.5);
    // 救助組都被編成 RIT：由一組閒置的幫浦組接手 RIT，把救助組換出來架支撐
    if(!r){const rt=B.sq.find(q=>q.task==='rit'&&(q.ty==='resc'||q.usar)),p=free.find(q=>q.ty==='pump'&&!q.line&&!tacIn(q));if(rt&&p&&tacOrder(inc,p,'rit',-1,0,1)){take(p);r=rt;radio(inc,p.cs,'接替 RIT，讓'+rt.cs+'去架設支撐。')}}
    if(r&&tacOrder(inc,r,'shore',x.f,x.c,1)){take(r);radio(inc,r.cs,'前往'+tacNm(B,x.f,x.c)+'架設支撐。')}continue}
   if(!x.rub&&!x.stab){const r=free.find(q=>q.ty!=='robot'&&q.ty!=='ladder'&&!q.vol&&!q.line);if(r&&tacOrder(inc,r,'stab',x.f,x.c,1)){take(r);radio(inc,r.cs,'前往'+tacNm(B,x.f,x.c)+'車輛穩固。')}continue}
   const r=free.find(q=>q.usar)||free.find(q=>q.ty==='resc')||free.find(q=>q.ty==='pump'&&!q.line);if(r&&tacOrder(inc,r,'extr',x.f,x.c,1)){take(r);radio(inc,r.cs,'前往'+tacNm(B,x.f,x.c)+'破壞救援。')}}
  if(B.pts.length>=3&&!B.st.triage&&tacAmbFree(inc,B)>=2)tacStnOpen(inc,B,'triage',1);
  tacMciAmb(inc,B,8,2)}
 if(sc==='lab'||sc==='chem'){if(EPA_K(inc.k)&&!inc.epa)epaCall(inc,1);tacMciAmb(inc,B,6,1,3)}}
// ===== 現場民眾 =====
function tacSc3Civ(inc,B,k){
 const sc=B.sc&&B.sc.k;if(!/chem|lab|mvc|crane/.test(sc||''))return undefined;
 const P=B.chem?tacCP(B.chem):null;
 if(sc==='lab')return{who:'實驗課的學生大部分帶出來了，可是點名還少幾個，可能還在實驗室跟隔壁教室。',fire:'沒有起火，是'+tacFlr(B,B.of)+'實驗室'+(B.chem.srcN||'藥劑打翻')+'。',gas:B.chemK?'是'+B.chem.n+'，藥品櫃在實驗室旁邊的藥品室。':'我不確定是哪一瓶，味道很刺鼻。',lock:'教室門都沒鎖。',layout:'這棟 '+(B.F-B.bf)+' 層，樓梯在走廊兩頭。'}[k];
 if(sc==='chem')return{who:'還有同事在'+tacNm(B,0,B.oc)+'附近沒出來！',fire:'沒有起火，是'+tacNm(B,0,B.oc)+'在漏。',gas:Math.random()<.6?'那邊放的是'+B.chem.n+'，安全資料表在辦公室。':'我不確定是哪一槽，味道很嗆。',lock:'廠區大門開著。',layout:'儲槽在中間，辦公室和裝卸區在下面那排，外面就是民宅。'}[k];
 if(sc==='mvc')return{who:'有好幾台車撞在一起，'+(B.cells.some(x=>x.pin>0)?'有人被卡在車裡出不來！':'大家好像都有出來。'),fire:B.chem?'有車在漏油，地上一攤！':'沒有起火。',gas:B.chem?'油一直流出來。':'沒有聞到怪味。',lock:'車門變形打不開。',layout:'後面的車還一直開過來，很危險！'}[k];
 return{who:'還有人被壓在下面！',fire:'沒有起火。',gas:B.chem?'管線斷掉，有東西在漏。':'沒有聞到怪味。',lock:'工區門開著。',layout:'吊臂倒在工區中間，旁邊的鷹架也歪了。'}[k]}
const tacSc3Done=B=>({chem:'化學品止漏、受污染人員除污完畢',lab:'實驗室藥劑已處理、受污染學生都已除污送醫',mvc:'受困者都已救出、傷患後送完畢',crane:'受困工人都已救出、傷患後送完畢'})[B.sc&&B.sc.k]||'';
// ===== 繪製 =====
function tacSc3Draw(g,G,B,n,x,r,k,dark){
 const t=G.t;
 if(k==='wharf'){g.fillStyle=dark?'#1e1c19':'#5a5a58';g.fillRect(r[0],r[1],r[2],r[3]*.7);g.fillStyle='#16384e';g.fillRect(r[0],r[1]+r[3]*.7,r[2],r[3]*.3);
  g.fillStyle='#c8b48a';for(let xx=r[0]+8;xx<r[0]+r[2]-4;xx+=r[2]/4){g.beginPath();g.arc(xx,r[1]+r[3]*.66,3,0,TAU);g.fill()}return true}
 if(k==='tankc'){for(let i=0;i<2;i++){const cx=r[0]+r[2]*(.28+i*.44),cy=r[1]+r[3]*.5,R=Math.min(r[2]*.2,r[3]*.38);g.fillStyle=dark?'#1e1c19':'#8a8f96';g.beginPath();g.arc(cx,cy,R,0,TAU);g.fill();g.strokeStyle='#5a5e64';g.lineWidth=2;g.stroke()}return true}
 if(k==='rackp'){g.strokeStyle=dark?'#2a2622':'#8a7a5a';g.lineWidth=3;for(let i=0;i<4;i++){const y=r[1]+r[3]*(.2+i*.2);g.beginPath();g.moveTo(r[0]+4,y);g.lineTo(r[0]+r[2]-4,y);g.stroke()}return true}
 if(k==='proc'){g.fillStyle=dark?'#1a1816':'#4a4e54';g.fillRect(r[0]+4,r[1]+4,r[2]-8,r[3]-8);g.strokeStyle='#8a857a';g.lineWidth=3;g.strokeRect(r[0]+4,r[1]+4,r[2]-8,r[3]-8);return true}
 if(k==='crane'){g.strokeStyle='#e9a13b';g.lineWidth=Math.max(3,t*.06);g.beginPath();g.moveTo(r[0]+4,r[1]+r[3]*.8);g.lineTo(r[0]+r[2]-4,r[1]+r[3]*.25);g.stroke();
  g.strokeStyle='rgba(233,161,59,.5)';g.lineWidth=1;for(let i=1;i<8;i++){const u=i/8;g.beginPath();g.moveTo(r[0]+4+(r[2]-8)*u,r[1]+r[3]*(.8-.55*u)-5);g.lineTo(r[0]+4+(r[2]-8)*u,r[1]+r[3]*(.8-.55*u)+5);g.stroke()}}
 if(k==='debris'||k==='crane'){for(let i=0;i<10;i++){const a=(n.c*17+i*31)%97/97,b=(n.c*7+i*13)%89/89,sz=6+(i*7)%8;g.fillStyle=i%3?'#5a5048':'#6e6258';g.save();g.translate(r[0]+r[2]*(.1+.8*a),r[1]+r[3]*(.15+.7*b));g.rotate(i);g.fillRect(-sz/2,-sz/3,sz,sz*.66);g.restore()}}
 if(k==='scaf'){g.strokeStyle='#9a958a';g.lineWidth=1.5;for(let i=0;i<=4;i++){g.beginPath();g.moveTo(r[0]+r[2]*i/4,r[1]+4);g.lineTo(r[0]+r[2]*i/4+6,r[1]+r[3]-4);g.stroke()}for(let j=1;j<4;j++){g.beginPath();g.moveTo(r[0]+2,r[1]+r[3]*j/4);g.lineTo(r[0]+r[2]-2,r[1]+r[3]*j/4+4);g.stroke()}}
 return k==='tankc'||k==='rackp'||k==='proc'}
// 被夾住的受困者與穩固、支撐狀態（畫在車輛、瓦礫之上）
function tacSc3Pin(g,B,x,r){
 if(x.pin>0){g.fillStyle='rgba(226,86,79,.92)';g.font='600 10px '+FONT;g.textAlign='center';g.textBaseline='bottom';
  const tx='夾住 '+x.pin+(x.rub?(x.shore?'・已支撐':'・未支撐'):(x.stab?'・已穩固':'・未穩固')),w=g.measureText(tx).width+8,cx=r[0]+r[2]/2,cy=r[1]+16;
  g.fillStyle='rgba(20,18,16,.85)';g.fillRect(cx-w/2,cy,w,14);g.fillStyle=x.stab||x.shore?'#e9a13b':'#ff6a5a';g.textBaseline='top';g.fillText(tx,cx,cy+1)}}
