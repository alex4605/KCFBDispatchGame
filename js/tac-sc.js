// 戰術指揮：擴充勤務——車輛火災（汽機車、國道火燒車）、油罐／化槽車翻覆、瓦斯外洩、一氧化碳中毒、
// 侷限空間（下水道硫化氫、侷限空間救援）、游泳池氯氣外洩。沿用建物／場區節點模型、化學品濃度與氣體偵測
'use strict';
Object.assign(TACK,{
 carfire:{f:[1,1],lay:'yard',yard:'road',k:[2,3],b:0,out:1,vic:[0,0],sc:'car'},
 truckfire:{f:[1,1],lay:'yard',yard:'road',k:[3,3],b:0,out:1,vic:[0,0],sc:'truck'},
 tanker:{f:[1,1],lay:'yard',yard:'road',k:[3,3],b:0,out:1,vic:[0,0],sc:'tanker'},
 gas:{f:[3,6],lay:'corridor',k:[3,3],b:0,unit:1,nofire:1,sc:'gas'},
 co:{f:[2,4],lay:'house',k:[1,1],b:0,nofire:1,sc:'co'},
 sewer:{f:[1,1],lay:'yard',yard:'pit',k:[2,3],b:0,out:1,nofire:1,sc:'pit'},
 confined:{f:[1,1],lay:'yard',yard:'pit',k:[2,3],b:0,out:1,nofire:1,sc:'pit'},
 poolgas:{f:[1,1],lay:'open',k:[3,3],st:1,b:0,nofire:1,sc:'pool',kinds:['pool','pool','pool','lobby']}});
TAC_CVW.gas=TAC_RES;
Object.assign(TAC_RK,{car:{n:'汽車',fk:1.1,sr:.6},scoot:{n:'機車列',fk:.9,sr:.5},shopf:{n:'騎樓店面',fk:1.2,sr:1},cab:{n:'車頭',fk:.9,sr:2.2},cargo:{n:'貨斗',fk:1.5,sr:1},
 tankr:{n:'槽體',fk:.6,sr:1},verge:{n:'邊坡',fk:1.2,sr:.5},site:{n:'工區',fk:.4,sr:.6},hole:{n:'人孔',fk:.1,sr:.5},pipe:{n:'地下管道',fk:.1,sr:1.6},pool:{n:'泳池區',fk:.2,sr:1.2}});
Object.assign(TAC_RK,{bay:{n:'空車格',fk:.1,sr:.3},basin:{n:'污水池',fk:.1,sr:1.8}});
Object.assign(TAC_YFU,{bay:0,basin:0,car:1,scoot:.7,shopf:1.2,cab:.9,cargo:1.4,tankr:.8,verge:.5,site:.3,hole:0,pipe:0});
// 現場氣體：lelk 濃度換算 LEL 的倍率；tox 受困者中毒速度倍率；util 一般小組就能止漏（關閉開關）；vap 結案前要通風到濃度降下來
const TAC_SCCHEM={
 gas:{n:'天然氣',zone:'可燃氣體',ppeN:'消防衣＋空氣呼吸器，禁止火源',lv:1,fl:1,lelk:140,vap:1,util:1,tox:.4,plug:'已關閉瓦斯開關與表前總閥，停止外洩。'},
 lpg:{n:'桶裝瓦斯（液化石油氣）',zone:'可燃氣體',ppeN:'消防衣＋空氣呼吸器，禁止火源',lv:1,fl:1,lelk:160,vap:1,util:1,tox:.4,plug:'已關閉桶裝瓦斯開關，鋼瓶移到屋外。'},
 co:{n:'一氧化碳',zone:'CO 危害區',ppeN:'空氣呼吸器（C 級無效）',lv:1,co:1,vap:1,util:1,tox:2,noC:1,plug:'已關閉熱水器並關斷瓦斯，一氧化碳來源停止。'},
 h2s:{n:'硫化氫（缺氧）',zone:'缺氧・H₂S',ppeN:'空氣呼吸器（C 級無效）',lv:1,h2s:1,fl:1,lelk:25,util:1,tox:1.6}};
// 可燃氣體環境中可以進行的任務（不產生火花、以救人與排除氣源為主）
const TAC_SCOK={snatch:1,zone:1,dike:1,neut:1,search:1,search2:1,plug:1,gas:1,vent:1,npv:1,hydro:1,dctrl:1,exit:1,rit:1,ident:1};
// 版面：場區節點之間的門牆規則（同一輛車的車頭與貨斗相通；人孔只通道路與地下管道）
function tacScAdj(a,b,door,wall,L){
 if(a.court||b.court){wall(a,b);return true} // 天井、露天作業區：四面是牆
 if((a.xp&&b.ty==='hall')||(b.xp&&a.ty==='hall')){door(a,b);return true}
 if(a.vid&&a.vid===b.vid&&a.kind!=='tankr'&&b.kind!=='tankr'){door(a,b);L.op.add(Math.min(a.c,b.c)*1000+Math.max(a.c,b.c));return true}
 if(a.pipe||b.pipe||a.hole||b.hole){const ab=[a,b];
  if(ab.every(n=>n.pipe||n.hole)||(ab.some(n=>n.hole)&&ab.some(n=>n.ty==='hall')))door(a,b);else wall(a,b);return true}
 return false}
function tacScLay(T,K,L,add,room,cuts,R){
 if(tacSc4Lay(T,K,L,add,room,cuts,R)||tacSc3Lay(T,K,L,add,room,cuts,R)||tacSc2Lay(T,K,L,add,room,cuts,R))return;
 const lane=(gx,gy,gw,gh,o)=>add(Object.assign({ty:'hall',gx,gy,gw,gh,lane:1},o||{}));
 const lanes=(x0,x1,y0,y1,o)=>{if(x1-x0<.05)return;const hs=cuts(x0,x1,1,1.6);for(let i=0;i<hs.length-1;i++)lane(hs[i],y0,hs[i+1]-hs[i],y1-y0,o)};
 const pk=a=>a[Math.floor(R()*a.length)];
 if(T.yard==='pit'){ // 侷限空間：工區旁人孔／路中人孔／化糞池（污水池），下方只能經人孔進出
  const v=L.var=/化糞池|污水池|清淤/.test(T.txt||'')?'tank':T.sc==='pit'&&/人孔|下水道/.test(T.txt||'')?pk(['site','road']):pk(['site','road','tank']);
  L.varN={site:'工區人孔',road:'路中人孔',tank:'污水池'}[v];
  L.GW=3.6+K*.35;L.GH=3;const y1=.6,y2=1.35;
  lanes(0,L.GW,0,y1);
  const xs=cuts(0,L.GW,.8,1.2),hi=Math.floor((xs.length-1)/2);
  for(let i=0;i<xs.length-1;i++){const mid=v==='road'?(x0,x1)=>lanes(x0,x1,y1,y2):(x0,x1)=>room(x0,y1,x1-x0,y2-y1,'site');
   if(i!==hi){mid(xs[i],xs[i+1]);continue}
   const w=xs[i+1]-xs[i],hx=xs[i]+(w-.5)/2;
   if(hx-xs[i]>.05)mid(xs[i],hx);
   room(hx,y1,.5,y2-y1,'hole').hole=1;
   if(xs[i+1]-hx-.5>.05)mid(hx+.5,xs[i+1])}
  const ps=v==='tank'?cuts(0,L.GW,1.6,2.3):cuts(0,L.GW,.9,1.3);for(let i=0;i<ps.length-1;i++)room(ps[i],y2,ps[i+1]-ps[i],L.GH-y2,v==='tank'?'basin':'pipe').pipe=1;
  return}
 L.GW=3.8+K*.4;
 const veh=(x0,y0,parts)=>{let x=x0;const id=Math.random();for(const p of parts){const n=room(x,y0[0],p[1],y0[1]-y0[0],p[0]);n.vid=id;x+=p[1]}return x};
 if(T.sc==='truck'){ // 國道：路肩、外側車道（火燒車）、內側車道（受阻車輛）、可能有第三車道；平面路段外側是邊坡，高架路段兩側懸空
  const n3=R()<.4,via=R()<.35;L.var=(n3?'3':'2')+(via?'v':'');L.varN=(n3?'三車道':'雙車道')+(via?'高架路段':'平面路段');
  const y1=.5,y2=y1+.8,y3=y2+.8,y4=n3?y3+.8:y3;L.GH=y4+(via?.5:.7);
  lanes(0,L.GW,0,y1,{shd:1});
  const x0=L.GW*(.28+R()*.12);lanes(0,x0,y1,y2);const xe=veh(x0,[y1,y2],[['cab',.55],['cargo',1.5]]);lanes(xe,L.GW,y1,y2);
  const xc=Math.max(.2,x0-1.2-R()*.3);lanes(0,xc,y2,y3);room(xc,y2,.9,y3-y2,'car');lanes(xc+.9,L.GW,y2,y3);
  if(n3){const xd=Math.min(L.GW-1.2,xe+.4+R()*.8);lanes(0,xd,y3,y4);room(xd,y3,.9,y4-y3,'car');lanes(xd+.9,L.GW,y3,y4)}
  if(via)lanes(0,L.GW,y4,L.GH,{shd:1});
  else{const vs=cuts(0,L.GW,.9,1.4);for(let i=0;i<vs.length-1;i++)room(vs[i],y4,vs[i+1]-vs[i],L.GH-y4,'verge')}
  return}
 const moto=/機車/.test(T.txt||''),v=L.var=T.sc==='car'?(moto?pk(['street','alley']):pk(['street','street','lot','alley'])):pk(['street','ind']);
 L.varN={street:'市區道路',lot:'平面停車場',alley:'巷弄',ind:'工業區道路'}[v];
 if(v==='lot'){ // 平面停車場：兩排直停車格、中間車道，外側出入車道
  L.GH=3.2;const rows=[[0,.5,0],[.5,1.3,1],[1.3,1.9,0],[1.9,2.7,1],[2.7,3.2,0]];
  for(const[a,b,c]of rows){if(!c){lanes(0,L.GW,a,b);continue}const xs=cuts(0,L.GW,.42,.5);for(let i=0;i<xs.length-1;i++)room(xs[i],a,xs[i+1]-xs[i],b-a,R()<.85?'car':'bay')}
  return}
 if(v==='alley'){ // 巷弄：兩側透天民宅，騎樓停滿機車，單線窄巷
  L.GH=3;const y1=1,y2=y1+.5,y3=y2+.55,y4=y3+.45;
  const homes=(ya,yb)=>{const xs=cuts(0,L.GW,.8,1.1);for(let i=0;i<xs.length-1;i++)room(xs[i],ya,xs[i+1]-xs[i],yb-ya,'home').walled=1};
  homes(0,y1);{const xs=cuts(0,L.GW,.55,.85);for(let i=0;i<xs.length-1;i++)room(xs[i],y1,xs[i+1]-xs[i],y2-y1,'scoot')}
  lanes(0,L.GW,y2,y3);{const xs=cuts(0,L.GW,.55,.85);for(let i=0;i<xs.length-1;i++)room(xs[i],y3,xs[i+1]-xs[i],y4-y3,R()<.7?'scoot':'car')}
  homes(y4,L.GH);return}
 // 市區道路／工業區道路：兩側騎樓店面（或鐵皮廠房）、路邊停車、雙向車道
 const y1=.7,y2=y1+.62,y3=y2+.8,y4=y3+.62;L.GH=y4+.7;
 const shops=(ya,yb)=>{const xs=cuts(0,L.GW,v==='ind'?1.2:.9,v==='ind'?1.7:1.3);for(let i=0;i<xs.length-1;i++)room(xs[i],ya,xs[i+1]-xs[i],yb-ya,v==='ind'?'shack':'shopf').walled=1};
 const curb=(ya,yb,mk)=>{const xs=cuts(0,L.GW,.55,.85);for(let i=0;i<xs.length-1;i++)room(xs[i],ya,xs[i+1]-xs[i],yb-ya,mk())};
 shops(0,y1);
 curb(y1,y2,()=>v==='ind'?(R()<.5?'car':'bay'):moto||R()<.35?'scoot':'car');
 if(T.sc==='tanker'){const x0=L.GW*(.3+R()*.15);lanes(0,x0,y2,y3);const xe=veh(x0,[y2,y3],[['cab',.55],['tankr',1.6]]);lanes(xe,L.GW,y2,y3)}
 else lanes(0,L.GW,y2,y3);
 curb(y3,y4,()=>v==='ind'?(R()<.6?'car':'bay'):R()<.75?'car':'scoot');
 shops(y4,L.GH)}
// 初始化（tacInit 最後）：起火點、氣源、受困者、周邊道路
function tacScInit(inc,B,T){
 const sc=T.sc,t=tacTxt(inc),R=Math.random,N=B.L.N,rooms=N.filter(n=>n.ty==='room'&&!n.court);
 const cel=(f,c)=>tacCel(B,f,c),pk=a=>a[Math.floor(R()*a.length)];
 B.sc={k:sc};
 for(const x of B.cells){x.vic=0;x.hid=0}
 // 事先模擬氣體擴散（受困者狀態不受影響，報案時的狀態另外設定）
 const seed=(n,air)=>{const vh=B.cells.map(x=>x.vh);for(let i=0;i<n;i++){tacChemStep(inc,B,1);if(air)tacScAir(B);if(sc==='tanker')tacYardStep(inc,B,1)}B.cells.forEach((x,i)=>x.vh=vh[i])};
 let vt=0;const put=(f,c,n,vh,rep)=>{const x=cel(f,c);x.vic+=n;x.vh=vh;if(rep)x.rep=1;x.sl=0;x.srch=0;vt+=n};
 if(B.out){ // 場區：只有受困者所在需要搜索；入口都沒上鎖
  for(const x of B.cells)if(x.ty==='room'){x.srch=1;x.sl=2}
  for(const x of B.cells){x.h=0;x.s=0}}
 const road=()=>{ // 周邊：車道兩端是道路；另兩側是騎樓店面（市區）或護欄、邊坡（國道）；坑道則只有道路那一側
  const hw=sc==='truck',sd={};
  if(sc==='pit'){const ln=N.filter(n=>n.lane),cy=ln.reduce((a,n)=>a+n.gy+n.gh/2,0)/ln.length,ls=cy<B.L.GH/2?'n':'s';
   for(const s of TAC_SIDES)sd[s]=s===ls?{road:2,big:true,nm:B.sd[ls]&&B.sd[ls].road?B.sd[ls].nm:'道路'}:{road:0,big:false,nm:'工區圍籬'}}
  else for(const s of TAC_SIDES)sd[s]=s==='e'||s==='w'?{road:hw?4:2,big:true,nm:hw?'國道車道':(B.sd[s]&&B.sd[s].road?B.sd[s].nm:'道路')}:hw?{road:0,big:false,nm:'護欄外'}:{road:0,big:false,nm:'騎樓店面'};
  B.sd=sd;B.exp={};B.sp=null;
  B.ents=TAC_SIDES.filter(s=>sd[s].road&&B.L.ent[s]!==undefined).map(s=>({side:s,c:B.L.ent[s],lock:0}));
  if(!sd[B.arr]||!sd[B.arr].road)B.arr=B.ents[0].side;
  // 變化：高架路段兩側懸空；停車場、巷弄、工業區的兩側；巷弄只有巷口能進大型車
  const V=B.L.var;
  if(hw&&/v/.test(V||''))for(const s of['n','s'])sd[s].nm='高架護欄外';
  if(!hw&&sc!=='pit'&&V&&V!=='street')for(const s of['n','s'])sd[s].nm={lot:'停車場邊界',alley:'民宅',ind:'廠區'}[V];
  if(V==='alley'){const o={e:'w',w:'e'}[B.arr]||'w';sd[o]={road:1,big:false,nm:'巷弄'};sd[B.arr]={road:2,big:true,nm:'巷口道路'}}
  if(hw)B.hyd=null;else if(B.hyd&&!sd[B.hyd.side].road)B.hyd.side=B.arr};
 if(sc==='car'||sc==='truck'||sc==='tanker'){road();
  let o;
  if(sc==='car'){const cs=rooms.filter(n=>n.kind==='car'||n.kind==='scoot');o=pk(/機車/.test(t)?cs.filter(n=>n.kind==='scoot').concat(cs).slice(0,9):cs);
   const x=cel(0,o.c);x.h=.4+R()*.2;x.s=.6;if(/電動/.test(t))x.li=1;
   // 店面鐵捲門關著：火要燒穿才會進店
   for(const n of rooms)if(n.kind==='shopf'||n.kind==='home'||n.kind==='shack')for(const m of n.nb)B.cd.add(tacDK(B,0,n.c,m));
   B.sc.brief='汽機車火警：'+tacNm(B,0,o.c)+'起火，'+({lot:'停車格裡的車一輛挨著一輛，火會沿車列延燒，車道要留給消防車進出。',alley:'巷子窄、只有巷口能停大型車，騎樓停滿機車，火會沿機車列燒進兩側民宅。'}[B.L.var]||'兩側騎樓店面與路邊停放車輛有延燒風險；路邊停車是一格格分開的，火會沿車列延燒。')}
  else if(sc==='truck'){const cab=rooms.find(n=>n.kind==='cab'),cg=rooms.find(n=>n.kind==='cargo');o=/車頭/.test(t)||R()<.5?cab:cg;
   const x=cel(0,o.c);x.h=.5+R()*.15;x.s=.7;cel(0,cg.c).deep=1;
   B.traf={up:R()<.5?B.arr:{e:'w',w:'e'}[B.arr]||'w'};
   B.sc.cargo=/紙箱/.test(t)?'紙箱':pk(['紙箱','塑膠原料','輪胎']);if(B.sc.cargo!=='紙箱')cel(0,cg.c).fk=1.4;
   B.sc.brief='國道火燒車：聯結車'+(o===cab?'車頭':'貨斗')+'起火（載運'+B.sc.cargo+'），內側車道有受阻車輛；國道沒有消防栓，用水靠車上水箱與水庫車。貨物深層悶燒，要殘火處理翻開。'}
  else{const cab=rooms.find(n=>n.kind==='cab'),tk=rooms.find(n=>n.kind==='tankr');o=tk;
   const chem=/化學|白煙|菱形/.test(t),lpg=!chem&&(/液化|LPG|瓦斯槽/.test(t)||R()<.35);
   if(lpg){B.chem={n:'液化石油氣（LPG）',zone:'可燃氣體',ppeN:'消防衣＋空氣呼吸器，禁止火源',lv:1,fl:1,lelk:160,util:1,plug:'已關閉槽車緊急遮斷閥，LPG 停止外洩。'};B.chemK=1;
    const fire=R()<.5;if(fire){const x=cel(0,tk.c);x.h=.5;x.s=.5}B.bv={c:tk.c,f:0,p:fire?.15:.05,k:1,n:'LPG 槽體',r:2.6,big:1}}
   else if(chem){B.chem=Object.assign({},pk(TAC_CHEM.filter(c=>!c.h2s&&tacCP(c).ph!=='s')));B.chemK=0}else{B.chem=Object.assign({},TAC_FUEL);B.chemK=1;cel(0,tk.c).fuel=1}
   B.leak={f:0,c:tk.c,on:1};
   if(!chem&&!lpg&&R()<.3){const x=cel(0,tk.c);x.h=.45;x.s=.6}
   put(0,cab.c,1,.75+R()*.15,1);
   seed(40);
   B.sc.brief=lpg?'LPG 槽車翻覆：液化石油氣自閥件外洩'+(B.bv.p>.2?'並已起火，火焰燒烤槽體':'')+'，駕駛受困車頭。槽體受熱會升壓、安全閥起跳，冷卻不足會發生 BLEVE（火球）：至少兩線以上大量射水冷卻槽體，壓力過高就全員撤離。':(chem?'化槽車翻覆：槽體破損洩漏不明化學品，駕駛受困車頭。先劃設危害區、化物辨識，著適當防護再救人止漏。':
    '油罐車翻覆：汽油外洩形成油池，駕駛受困車頭。油池遇火源會引燃：以泡沫覆蓋（泡沫車、CAFS 車對油池防護射水），再關閉緊急遮斷止漏。')}
  B.of=0;B.oc=o.c}
 else if(sc==='gas'){
  const ks=rooms.filter(n=>n.u!==undefined&&n.kind==='kitchen'),o=ks.length?pk(ks):pk(rooms),f=B.of;B.oc=o.c;
  const lpg=/桶裝/.test(t);B.chem=Object.assign({},TAC_SCCHEM[lpg?'lpg':'gas']);B.chemK=1;B.leak={f,c:o.c,on:1};
  // 外洩戶沒人在、戶門上鎖關著
  const en=o.u!==undefined?N.find(n=>n.u===o.u&&n.uent):o;
  if(en)for(const m of en.nb)if(N[m].ty!=='room'){B.lk.add(tacDK(B,f,en.c,m));B.cd.add(tacDK(B,f,en.c,m))}
  // 同層與上一層還沒撤離的住戶
  const oth=rooms.filter(n=>n.u!==o.u&&n.kind!=='bath');
  for(let i=0,n=tacRint(0,2);i<n&&oth.length;i++){const ff=Math.min(B.F-1,f+tacRint(0,1));put(ff,pk(oth).c,1,.9,0)}
  seed(150);
  B.sc.brief='瓦斯外洩：'+tacNm(B,f,o.c)+'（'+B.chem.n+'）外洩，該戶無人、戶門上鎖。可燃氣體濃度達爆炸範圍時，任何火花都可能引發氣爆：禁止破壞器材與開關電器，改用門控進入，先關斷氣源、開窗通風，並疏散住戶。'}
 else if(sc==='co'){
  const f=B.of,bt=rooms.filter(n=>tacK(B,f,n.c)==='bath'),o=bt.length?pk(bt):rooms.find(n=>tacK(B,f,n.c)==='kitchen')||pk(rooms);B.oc=o.c;
  B.chem=Object.assign({},TAC_SCCHEM.co);B.chemK=1;B.leak={f,c:o.c,on:1};
  const bd=[];for(let ff=f;ff<Math.min(B.F,f+2);ff++)for(const n of rooms)if(/bed|living/.test(tacK(B,ff,n.c)))bd.push([ff,n.c]);
  for(let i=0,n=tacRint(2,3);i<n&&bd.length;i++){const p=bd.splice(Math.floor(R()*bd.length),1)[0];put(p[0],p[1],1,.8+R()*.12,0)}
  seed(180);
  B.sc.brief='一氧化碳中毒：'+tacNm(B,f,o.c)+'熱水器燃燒不完全，屋內一氧化碳濃度高，有人意識不清。全程著空氣呼吸器（C 級濾毒罐擋不住 CO），搜救、關閉熱水器、開窗通風。'}
 else if(sc==='pit'){road();
  const hole=rooms.find(n=>n.hole),pipes=rooms.filter(n=>n.pipe).sort((a,b)=>tacGd(B,hole.c,b.c)-tacGd(B,hole.c,a.c));B.oc=hole.c;B.of=0;
  B.chem=Object.assign({},TAC_SCCHEM.h2s);B.chemK=1;B.leak={f:0,c:pipes[0].c,on:1,np:1};
  for(const n of pipes.concat([hole])){const x=cel(0,n.c);x.v=0;x.fu=0}
  const two=/兩個|第二個/.test(t)||R()<.3;put(0,pipes[0].c,1,.75,1);if(two)put(0,(pipes[1]||pipes[0]).c,1,.8,1);
  seed(200,1);for(const x of B.cells){const n=N[x.c];if(!n.pipe&&!n.hole)x.cz=0}
  B.sc.brief=(inc.k==='sewer'?'下水道硫化氫':'侷限空間救援')+'：人孔下方管道有 '+vt+' 名作業人員倒地，管道內缺氧並有硫化氫。依侷限空間程序：先對人孔氣體偵測、往人孔送風（正壓排煙），再由救助組著空氣呼吸器進入救援；不可貿然下去救人。'}
 else if(sc!=='pool'&&tacSc2Init(inc,B,T,put,seed)){}
 else if(sc==='pool'){
  const sm=rooms.filter(n=>n.small),o=sm.length?pk(sm):rooms[rooms.length-1];B.oc=o.c;B.of=0;
  for(let f=0;f<B.F;f++){const x=cel(f,o.c);x.k='mech';x.fk=TAC_RK.mech.fk}
  B.chem=Object.assign({},TAC_CHEM.find(c=>c.n==='氯氣'),{tox:1.3,vap:1});B.chemK=0;B.leak={f:0,c:o.c,on:1};
  for(const m of o.nb)B.cd.add(tacDK(B,0,o.c,m)); // 機房門關著：氯氣從門縫慢慢漏到泳池區
  const pr=rooms.filter(n=>n!==o&&tacK(B,0,n.c)==='pool');
  for(let i=0,n=tacRint(4,7);i<n;i++)put(0,pk(pr.length?pr:rooms).c,1,.75+R()*.2,0);
  seed(120);
  B.sc.brief='游泳池氯氣外洩：'+tacNm(B,0,o.c)+'加氯設備洩漏，泳池區多人咳嗽、倒地。先化物辨識、劃設熱區（氯氣需 A 級），開窗通風降低濃度；救人的小組要著足夠的防護，受污染人員須除污。'}
 tacSc3Post(inc,B);vt+=tacSc5Post(inc,B,T);
 if(B.L.varN&&B.sc.brief)B.sc.brief=B.sc.brief.replace('：','（'+B.L.varN+'）：');
 vt+=tacRescInit(B);B.vtot=vt;if(vt){let h=-1;for(const x of B.cells)if(x.vic){h=x.f;break}B.hint=h}}
// 侷限空間的空氣：管道內缺氧（濃度越高含氧越低）；送風機運轉時快速稀釋
function tacScAir(B){
 for(const x of B.cells){const n=B.L.N[x.c];if(!n.pipe&&!n.hole)continue;
  x.o2=Math.min(x.o2,20.9-(n.hole?1.5:6)*Math.min(1,(x.cz||0)*1.3))}}
// 每幀：氣體引燃與氣爆、油池泡沫覆蓋與引燃、侷限空間送風與偵測
// 小案件：案類等級 0（車禍受困、兒童受困車內等），漏油、起火機率與引燃速度都較低
const tacSmall=B=>!!(B.T&&B.T.small)||(KIND[B.k]&&(KIND[B.k].lv||0)===0);
function tacScStep(inc,B,dt){
 if(!B.sc)return;const sc=B.sc.k;
 tacSc4Step(inc,B,dt);tacRescStep(inc,B,dt);tacSc5Step(inc,B,dt);
 tacSc2Step(inc,B,dt);
 if(sc==='pit'){
  if(B.ppv)for(const x of B.cells){const n=B.L.N[x.c];if(n.pipe||n.hole)x.cz=Math.max(0,(x.cz||0)-dt*.03)}
  tacScAir(B);
  for(const x of B.cells)if(x.vic>0&&x.o2<16)x.vh-=dt*.003*(16-x.o2)/4;
  const h=B.cells.find(x=>B.L.N[x.c].hole);
  if(h.gm&&!B.pitGm){B.pitGm=1;const ps=B.cells.filter(x=>B.L.N[x.c].pipe);let o2=21,hs=0;
   for(const x of ps){x.gm=Object.assign({t:S.t},tacGasRead(B,x));o2=Math.min(o2,x.gm.o2);hs=Math.max(hs,x.gm.h2s)}
   radio(inc,'安全官','人孔垂放探管測得管道內 O₂ 最低 '+o2+'%、H₂S 最高 '+hs+' ppm'+(o2<19.5||hs>=10?'，屬危險環境：持續送風，救助組著空氣呼吸器、繫救援繩進入。':'，可進入，仍須持續監測。'));
   tacEvt(inc,B,'milestone','侷限空間氣體偵測完成')}}
 B.scT=(B.scT||0)-dt;if(B.scT>0)return;B.scT=1;
 // 可燃氣體：濃度到爆炸範圍（≥100% LEL）時，破壞器材的火花或住戶開關電器可能引燃
 if(B.chem&&B.chem.lelk&&!B.blasted&&sc!=='pit'){
  const lel=x=>(x.cz||0)>.12?tacGasRead(B,x).lel:0;let hot=0,spark=null;
  for(const x of B.cells)if(lel(x)>=100)hot++;
  for(const q of B.sq){if(!(q.frc>0)||tacEntryMode(B,q)!=='force'||q.ty==='robot')continue;
   const cs=[q.f>=0?tacCel(B,q.f,q.c):null,q.nf>=0?tacCel(B,q.nf,q.nc):null].filter(Boolean);
   const c=cs.find(x=>lel(x)>=60);if(c&&Math.random()<.12){spark={x:c,q};break}}
  const src=hot&&S.t-B.t0>60&&!B.cells.some(x=>x.h>.05)&&Math.random()<.0025*Math.sqrt(hot)?B.cells.filter(x=>lel(x)>=100).sort((a,b)=>b.cz-a.cz)[0]:null;
  if(spark)tacScBlast(inc,B,spark.x,spark.q.cs+' 破壞門鎖的火花');else if(src)tacScBlast(inc,B,src,B.out?'不明火源（車輛引擎、靜電）':'不明火源（電器開關、門鈴）')}
 // 油池：沒有泡沫覆蓋時可能被引燃（引擎熱、靜電、路過車輛）；泡沫車或 CAFS 車防護射水覆蓋
 if(B.chem&&B.chem.fuel){
  for(const q of B.sq)if(q.task==='guard'&&q.line&&q.pf>0&&tacIn(q)&&q.f===q.tf&&q.c===q.tc&&(q.code==='57'||q.code==='01'||q.cafs)){
   for(const c of[q.c].concat(B.L.N[q.c].nb)){const y=tacCel(B,0,c);if((y.pool||y.fuel)&&!(y.foam>S.t)){y.foam=S.t+150;if(!B.foamM){B.foamM=1;radio(inc,q.cs,'泡沫覆蓋油池完成，隔絕油氣。')}}}}
  const fire=B.cells.some(x=>x.h>.05);
  const ig=tacSmall(B)?.004:.03; // 每秒引燃機率：小案件（車禍受困等）低很多
  for(const x of B.cells)if((x.pool||x.fuel)&&x.fu>0&&x.h<.02&&!(x.foam>S.t)&&!fire&&Math.random()<dt*ig){x.h=.3;x.s=.5;
   radio(inc,'安全官',tacNm(B,0,x.c)+'油池被引燃！應先以泡沫覆蓋油池。');tacEvt(inc,B,'danger','油池引燃（'+tacNm(B,0,x.c)+'）',1);tacDecPool(inc,B,x);break}}
 // 氣爆後，瓦斯持續外洩的地方一直有火（止漏才會熄）
 if(B.blasted&&B.leak&&B.leak.on){const x=tacCel(B,B.leak.f,B.leak.c);if(x.fu>0)x.h=Math.max(x.h,.35)}}
// 氣爆：起火、窗戶炸破、附近人員與受困者受傷，可燃氣體燒掉；之後轉為火災搶救
function tacScBlast(inc,B,x,why){
 B.blasted=1;B.chem.vap=0;const f=x.f,near=[x.c].concat(B.L.N[x.c].nb,B.L.N[x.c].wl);
 radio(inc,'安全官',tacNm(B,f,x.c)+'可燃氣體遭'+why+'引燃，發生氣爆！');tacEvt(inc,B,'danger','氣爆：'+tacNm(B,f,x.c)+'（'+why+'）',1);
 S.rep-=4;B.viol.blast=1;if(S.rep<=0){S.rep=0;S.over=true}
 for(const c of near){const y=tacCel(B,f,c);if(y.fu>0)y.h=Math.max(y.h,c===x.c?.7:.3);y.s=Math.max(y.s,.7);
  if(B.L.N[c].win&&f>=B.bf){y.v=1;y.wcr=1}if(y.vic)y.vh-=.45}
 for(const y of B.cells)if(y.f===f)y.cz*=.1;
 for(const q of B.sq)if(tacIn(q)&&q.f===f&&near.includes(q.c)&&q.ty!=='robot'&&!q.down){q.hp-=q.c===x.c?.6:.35;if(q.hp<.3)tacDown(inc,B,q,'氣爆')}
 B.dmg=Math.max(B.dmg,.35)}
// 能力限制：機器人不能下人孔；坑道的氣源無法止漏
function tacScCan(B,q,k,f,c){
 if(!B.sc||f===undefined||f<0)return'';
 if(B.sc.k==='pit'&&q.ty==='robot'&&(B.L.N[c].pipe||B.L.N[c].hole))return'機器人無法進入人孔';
 return''}
// 拒絕命令：侷限空間程序、可燃氣體環境
function tacScRefuse(B,q,k,f,c){
 if(!B.sc||f===undefined||f<0)return'';
 const rt=tacRoute(B,q,f,c).concat([[f,c]]);
 {const w=tacSc2Refuse(B,q,k,f,c,rt)||tacSc4Refuse(B,q,k,f,c,rt);if(w)return w}
 if(B.sc.k==='pit'&&k!=='exit'&&k!=='gas'&&rt.some(p=>B.L.N[p[1]].pipe)){
  if(q.ty!=='resc'&&!q.usar)return'拒絕：侷限空間要由救助組（三腳架、救援繩索與供氣設備）進入';
  if(!B.pitGm)return'拒絕：侷限空間還沒做氣體偵測，依規定不得進入（先對人孔做氣體偵測）';
  if((q.ppe||'F')==='C')return'拒絕：C 級濾毒罐不能進入缺氧的侷限空間'}
 if(B.chem&&B.chem.lelk&&!B.blasted&&B.sc.k!=='pit'){
  const lel=p=>{const x=tacCel(B,p[0],p[1]);return(x.cz||0)>.05?tacGasRead(B,x).lel:0};
  if(k==='force'){const m=Math.max(...[c].concat(B.L.N[c].nb).map(o=>lel([f,o])));
   if(m>=20)return'拒絕：附近可燃氣體約 '+m+'% LEL，破壞器材可能產生火花，請改用門控進入（手動器材）'}
  if(!TAC_SCOK[k]){const hot=rt.find(p=>lel(p)>=50);if(hot)return'拒絕：'+tacNm(B,hot[0],hot[1])+'可燃氣體約 '+lel(hot)+'% LEL，有爆炸危險，先關斷氣源、開窗通風'}}
 return''}
// 戰術 AI：可燃氣體改門控、侷限空間送風、通風排除氣體、油池泡沫覆蓋、毒氣中救人換裝
function tacScAI(inc,B,free,take,M){
 if(!B.sc)return;const sc=B.sc.k;
 if(M.safety&&B.chem&&B.chem.lelk&&!B.blasted&&sc!=='pit'&&(B.roe||'force')==='force'&&!B.roeSet){B.roeSet=1;B.roe='dctrl';
  radio(inc,'安全官','可燃氣體外洩，禁用會產生火花的破壞器材與電器，各組改採門控進入（手動器材）！')}
 if(!M.attack)return;
 tacSc2AI(inc,B,free,take);tacSc3AI(inc,B,free,take);tacSc4AI(inc,B,free,take);tacRescAI(inc,B,free,take);
 // 侷限空間只能由救助組進入：現場沒有救助組（或特搜）時請求增援，在途的不重複請求
 if(sc==='pit'&&!B.reqR&&!B.sq.some(q=>q.ty==='resc'||q.usar)&&!onScene(inc).concat(S.units.filter(u=>u.inc===inc.id)).some(u=>u.code==='71')){B.reqR=1;tacReinf(inc,B,'resc')}
 if(sc==='pit'&&!B.ppv&&!B.sq.some(q=>q.task==='ppv')){const r=free.find(q=>!tacIn(q)&&!tacCan(B,q,'ppv'));
  if(r&&tacOrder(inc,r,'ppv',-1,0,1)){take(r);radio(inc,r.cs,'送風機架設於人孔，往管道內送風。')}}
 if(B.chem&&B.chem.vap&&!B.sq.some(q=>q.task==='vent')){
  const w=B.cells.filter(x=>x.ty==='room'&&x.cz>.2&&!x.v&&B.L.N[x.c].win&&x.f>=B.bf).sort((a,b)=>b.cz-a.cz)[0];
  const r=w&&free.find(q=>(q.ty==='vent'||q.ty==='resc'||q.ty==='pump')&&!q.line&&(q.ppe||'F')!=='C'&&TAC_PPE[q.ppe||'F'].p>=(w.hz||0));
  if(r&&tacOrder(inc,r,'vent',w.f,w.c,1)){take(r);radio(inc,r.cs,'前往'+tacNm(B,w.f,w.c)+'開窗通風。')}}
 if(B.chem&&B.chem.fuel&&B.leak&&!B.cells.some(x=>x.h>.05)&&B.cells.some(x=>(x.pool||x.fuel)&&x.fu>0&&!(x.foam>S.t))&&!B.sq.some(q=>q.task==='guard')){
  const r=free.find(q=>(q.code==='57'||q.code==='01'||q.cafs)&&!q.line)||null;
  if(r&&tacOrder(inc,r,'guard',0,B.leak.c,1)){take(r);radio(inc,r.cs,'以泡沫覆蓋油池，防止引燃。')}}
 if(sc==='pool'&&B.chemK&&B.cells.some(x=>x.vic>0&&(x.hz||0)>=2)){
  const r=free.find(q=>(q.ty==='resc'||q.ty==='pump')&&!tacIn(q)&&(q.ppe||'F')==='F'&&!q.line);if(r&&tacPPE(inc,B,r,'B',1))take(r)}}
// 現場民眾的說法（非火災情境）
function tacScCiv(inc,B,k){
 {const a4=tacSc4Civ(inc,B,k);if(a4!==undefined)return a4}
 {const a3=tacSc3Civ(inc,B,k);if(a3!==undefined)return a3}
 {const a2=tacSc2Civ(inc,B,k);if(a2!==undefined)return a2}
 const sc=B.sc.k,vr=B.cells.filter(x=>x.vic>0),nm=x=>tacNm(B,x.f,x.c);
 if(k==='open')return sc==='car'?['是'+tacNm(B,0,B.oc)+'先燒起來的，人都離開了。','旁邊還停了一排車，騎樓裡面是店面。']:
  sc==='truck'?['我是駕駛，'+(B.oc===B.L.N.find(n=>n.kind==='cab').c?'車頭先冒煙':'後面貨斗先冒煙')+'，我就停在外側車道跑下來了。','後面載的是'+B.sc.cargo+'，大概十幾噸。']:
  sc==='tanker'?[B.chem.fuel?'油罐車翻在路口，汽油一直流出來！':'槽車翻倒，一直冒白煙，味道很刺鼻！','司機還卡在駕駛座裡面，叫他有回應。']:
  sc==='gas'?[tacNm(B,B.leak.f,B.leak.c)+'那戶味道最重，門鎖著，裡面好像沒人。','我們都沒有開燈、沒按電鈴，大家先下樓了。']:
  sc==='co'?['洗完澡就開始頭暈想吐，熱水器在'+tacNm(B,B.leak.f,B.leak.c)+'旁邊。','家裡還有人叫不醒！']:
  sc==='pit'?['工人下去'+(B.vtot>1?'，第二個下去救的也倒了':'就沒上來了')+'，叫都沒有回應。','下面有一股臭雞蛋味，我們沒人敢再下去。']:
  ['機房的加氯機好像漏了，泳池那邊很多人在咳嗽。','有人倒在池邊，更衣室那邊也有人。'];
 if(k==='who'){for(const x of vr)if(Math.random()<.8)x.rep=1;const r=vr.filter(x=>x.rep);
  return r.length?'還有人在'+[...new Set(r.map(nm))].join('、')+'！':sc==='gas'?'這層的人應該都下來了，那戶沒人在。':'人應該都出來了。'}
 if(k==='fire'){B.ocKnown=1;return sc==='car'||sc==='truck'?'是從'+tacNm(B,0,B.oc)+'燒起來的。':sc==='pit'?'他們是從那個人孔下去的。':
  (sc==='gas'?'味道是從':sc==='co'?'熱水器在':'漏的是')+tacNm(B,B.leak.f,B.leak.c)+(sc==='gas'?'那戶傳出來的。':sc==='co'?'。':'的加氯設備。')}
 if(k==='gas')return sc==='car'?(tacCel(B,0,B.oc).li?'那台是電動車，電池在底盤。':'是汽油車，油箱在後面。'):sc==='truck'?'油箱在車頭下面兩側，大概還有半桶。':
  sc==='tanker'?(B.chem.fuel?'載的是汽油，滿載。':'槽車上面有菱形的危險標示，我看不懂。'):sc==='gas'?(B.chem.lpg||/桶裝/.test(B.chem.n)?'他家用桶裝瓦斯，放在廚房。':'這棟是天然氣，瓦斯表在門外。'):
  sc==='pool'?'機房裡面有氯錠跟加氯機，還有鹽酸桶。':'沒有，就是那個味道。';
 if(k==='lock')return sc==='gas'?'那戶鎖著，房東有鑰匙但還沒到。':B.out?'沒有門，直接過去就可以。':'大門沒鎖，可以直接進去。';
 if(k==='layout')return sc==='pit'?'人孔下面是污水管，往兩邊大概各二三十公尺。':B.out?'這段路兩邊都可以進來。':'這棟'+(B.F-B.bf)+'層，樓梯在旁邊。';
 return''}
// 結案時的現場回報
const tacScDone=B=>B.sc.done||tacSc4Done(B)||tacSc3Done(B)||tacSc2Done(B)||(B.sc.k==='pit'?'受困人員都已救出，侷限空間作業結束':B.sc.k==='car'||B.sc.k==='truck'?'車輛火勢撲滅、殘火處理完成':B.chem&&B.chem.fuel?'止漏完成、油池已處理':'氣源已關斷、現場通風後氣體偵測正常');
// 俯視車輛（長方形）：中心 x,y、車長 len、車寬 wid；vert 車頭朝下（停車格）；moto 機車
function tacCarDraw(g,x,y,len,wid,col,vert,dark,moto){
 g.save();g.translate(x,y);if(vert)g.rotate(Math.PI/2);
 g.fillStyle='rgba(0,0,0,.35)';g.fillRect(-len/2+1.5,-wid/2+1.5,len,wid);
 g.fillStyle=dark?'#1e1c19':col;g.fillRect(-len/2,-wid/2,len,wid);
 if(!dark){if(moto){g.fillStyle='#2a2a2a';g.fillRect(-len/2,-wid*.2,len*.14,wid*.4);g.fillRect(len/2-len*.14,-wid*.2,len*.14,wid*.4)}
  else{g.fillStyle='rgba(20,24,30,.65)';g.fillRect(len*.14,-wid*.38,len*.13,wid*.76);g.fillRect(-len*.36,-wid*.36,len*.09,wid*.72);
   g.fillStyle='rgba(255,255,255,.1)';g.fillRect(-len*.24,-wid*.4,len*.36,wid*.8)}}
 g.restore()}
// 一格內的一排汽車：格子寬就橫停（沿車道），格子高就直停（停車格）
function tacCarRow(g,r,dark,rnd){
 const VS=TAC.vs||8,vert=r[3]>r[2]*1.15,L2=vert?r[3]:r[2],W2=vert?r[2]:r[3],wid=Math.min(W2*.8,1.8*VS),len=Math.min(L2*.92,4.5*VS),n2=Math.max(1,Math.floor(L2/(len*1.25)));
 for(let i=0;i<n2;i++){const c=['#6a7a8a','#8a6a5a','#5a5a5a','#7a7a6a','#3a4a6a'][Math.floor(rnd()*5)],o=(i+.5)*L2/n2;
  tacCarDraw(g,vert?r[0]+r[2]/2:r[0]+o,vert?r[1]+o:r[1]+r[3]/2,len,wid,c,vert,dark)}}
// 長車（貨車車頭、貨斗、遊覽車、槽車）：依比例尺畫，貼齊同一輛車的另一節（vid）
function tacLongVeh(g,B,n,r,realL,col,dark,draw){
 const VS=TAC.vs||8,len=Math.min(r[2]-4,realL*VS),wid=Math.min(r[3]*.85,2.5*VS),pt=n.vid?B.L.N.find(m=>m!==n&&m.vid===n.vid):null;
 const x0=pt?(pt.gx>n.gx?r[0]+r[2]-len:r[0]):r[0]+(r[2]-len)/2,y0=r[1]+(r[3]-wid)/2;
 g.fillStyle='rgba(0,0,0,.35)';g.fillRect(x0+2,y0+2,len,wid);g.fillStyle=dark?'#1e1c19':col;g.fillRect(x0,y0,len,wid);
 if(!dark&&draw)draw(x0,y0,len,wid,pt&&pt.gx>n.gx)}
// 繪製：場區的車輛、騎樓店面、人孔、地下管道、邊坡
function tacScDraw(g,G,B,n,x,r,k,dark,rnd){
 if(tacSc5Draw(g,G,B,n,x,r,k,dark)||tacSc4Draw(g,G,B,n,x,r,k,dark)||tacSc3Draw(g,G,B,n,x,r,k,dark))return;
 const t=G.t,col=c=>dark?'#1e1c19':c;
 tacSc2Draw(g,G,B,n,x,r,k,dark,rnd);
 if(k==='car')tacCarRow(g,r,dark,rnd);
 else if(k==='scoot'){const VS=TAC.vs||8,wid=Math.min(r[2]*.12,.8*VS),len=Math.min(r[3]*.85,2*VS),n2=Math.max(2,Math.floor((r[2]-6)/(wid*1.6)));for(let i=0;i<n2;i++)tacCarDraw(g,r[0]+3+wid+i*(r[2]-6-wid*2)/Math.max(1,n2-1),r[1]+r[3]/2,len,wid,['#8a8a8a','#6a7a9a','#9a6a5a','#4a4a4a'][i%4],1,dark,1)}
 else if(k==='shopf'){g.fillStyle=col('#3a3630');g.fillRect(r[0]+3,r[1]+3,r[2]-6,r[3]-6);g.strokeStyle=dark?'#2a221c':'#8a857a';g.lineWidth=2;g.strokeRect(r[0]+3,r[1]+3,r[2]-6,r[3]-6);
  g.strokeStyle='rgba(200,200,190,.25)';g.lineWidth=1;for(let yy=r[1]+8;yy<r[1]+r[3]-4;yy+=4){g.beginPath();g.moveTo(r[0]+6,yy);g.lineTo(r[0]+r[2]-6,yy);g.stroke()}}
 else if(k==='cab')tacLongVeh(g,B,n,r,2.6,'#3a5a8a',dark,(x,y,l,w,toR)=>{g.fillStyle='rgba(20,24,30,.7)';g.fillRect(toR?x+2:x+l-l*.22,y+w*.1,l*.2,w*.8)});
 else if(k==='cargo')tacLongVeh(g,B,n,r,10,'#7a7468',dark,(x,y,l,w)=>{g.strokeStyle='rgba(30,28,25,.5)';g.lineWidth=1;for(let i=1;i<8;i++){g.beginPath();g.moveTo(x+l*i/8,y);g.lineTo(x+l*i/8,y+w);g.stroke()}});
 else if(k==='tankr'){tacLongVeh(g,B,n,r,10,'#b8b4aa',dark,(x,y,l,w)=>{g.fillStyle='#8a8680';g.fillRect(x,y+w*.42,l,w*.16);g.save();g.translate(x+l/2,y+w/2);g.rotate(Math.PI/4);g.fillStyle='#e9a13b';g.fillRect(-w*.18,-w*.18,w*.36,w*.36);g.restore()});

  g.fillStyle='rgba(236,234,227,.6)';g.font='10px '+FONT;g.textAlign='center';g.textBaseline='bottom';g.fillText('翻覆',r[0]+r[2]/2,r[1]+r[3]-2)}
 else if(k==='verge'){g.fillStyle=dark?'#161412':'#2e3a24';g.fillRect(r[0],r[1],r[2],r[3]);g.strokeStyle='rgba(200,200,190,.5)';g.lineWidth=2;g.beginPath();g.moveTo(r[0],r[1]+2);g.lineTo(r[0]+r[2],r[1]+2);g.stroke()}
 else if(k==='site'){for(let i=0;i<3;i++){g.fillStyle=col(['#c8a03a','#5a5650','#8a6a3a'][i]);g.fillRect(r[0]+r[2]*(.15+i*.27),r[1]+r[3]*(.3+.2*rnd()),r[2]*.16,r[3]*.25)}
  g.strokeStyle='rgba(233,161,59,.55)';g.setLineDash([5,4]);g.lineWidth=1.5;g.strokeRect(r[0]+3,r[1]+3,r[2]-6,r[3]-6);g.setLineDash([])}
 else if(k==='hole'){const cx=r[0]+r[2]/2,cy=r[1]+r[3]/2,rr=Math.min(r[2],r[3])*.3;g.fillStyle='#0a0a09';g.beginPath();g.arc(cx,cy,rr,0,TAU);g.fill();
  g.strokeStyle='#8a857a';g.lineWidth=3;g.stroke();g.strokeStyle='#c8a03a';g.lineWidth=2;g.beginPath();g.moveTo(cx-rr*1.3,cy+rr*1.4);g.lineTo(cx,cy-rr*1.5);g.lineTo(cx+rr*1.3,cy+rr*1.4);g.stroke();
  g.fillStyle='rgba(236,234,227,.7)';g.font='600 10px '+FONT;g.textAlign='center';g.textBaseline='bottom';g.fillText(B.ppv?'人孔（送風中）':'人孔',cx,r[1]+r[3]-2)}
 else if(k==='bay'){g.strokeStyle='rgba(233,231,224,.35)';g.lineWidth=1.5;g.beginPath();g.moveTo(r[0]+2,r[1]+3);g.lineTo(r[0]+2,r[1]+r[3]-3);g.moveTo(r[0]+r[2]-2,r[1]+3);g.lineTo(r[0]+r[2]-2,r[1]+r[3]-3);g.stroke()}
 else if(k==='basin'){g.fillStyle='#14130f';g.fillRect(r[0],r[1],r[2],r[3]);g.fillStyle='rgba(70,80,50,.7)';g.fillRect(r[0]+6,r[1]+r[3]*.35,r[2]-12,r[3]*.58);g.strokeStyle='rgba(160,170,120,.3)';g.lineWidth=1;for(let i=0;i<3;i++){g.beginPath();g.moveTo(r[0]+10,r[1]+r[3]*(.5+i*.12));g.lineTo(r[0]+r[2]-10,r[1]+r[3]*(.5+i*.12));g.stroke()}
  g.strokeStyle='rgba(125,179,232,.35)';g.lineWidth=2;g.setLineDash([8,5]);g.strokeRect(r[0]+4,r[1]+4,r[2]-8,r[3]-8);g.setLineDash([]);g.fillStyle='rgba(236,234,227,.45)';g.font='10px '+FONT;g.textAlign='center';g.textBaseline='middle';g.fillText('污水池（只能經人孔進出）',r[0]+r[2]/2,r[1]+r[3]*.2)}
 else if(k==='pipe'){g.fillStyle='#14130f';g.fillRect(r[0],r[1],r[2],r[3]);g.strokeStyle='rgba(125,179,232,.35)';g.lineWidth=2;g.setLineDash([8,5]);g.strokeRect(r[0]+4,r[1]+4,r[2]-8,r[3]-8);g.setLineDash([]);
  g.fillStyle='rgba(60,80,70,.5)';g.fillRect(r[0]+6,r[1]+r[3]*.62,r[2]-12,r[3]*.3);
  g.fillStyle='rgba(236,234,227,.45)';g.font='10px '+FONT;g.textAlign='center';g.textBaseline='middle';g.fillText('地下（只能經人孔進出）',r[0]+r[2]/2,r[1]+r[3]*.28)}
 if(x.foam>S.t){g.fillStyle='rgba(240,240,235,.35)';for(let i=0;i<14;i++){g.beginPath();g.arc(r[0]+r[2]*rnd(),r[1]+r[3]*rnd(),t*.05,0,TAU);g.fill()}}}
