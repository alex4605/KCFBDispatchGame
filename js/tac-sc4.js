// 戰術指揮：第二優先擴充勤務——鐵路事故、捷運／輕軌事故、路面坍陷、邊坡崩塌、高空受困、幼童受困陽台外、
// 航空器事故、客機迫降、變電箱起火、人潮推擠、大量傷病患。沿用 tac-sc3.js 的車輛穩固／破壞救援與大量傷病患加派救護車
'use strict';
Object.assign(TACK,{
 train:{f:[1,1],lay:'yard',yard:'rail',k:[3,4],b:0,out:1,nofire:1,sc:'rail'},
 transit:{f:[1,1],lay:'yard',yard:'rail',k:[3,4],b:0,out:1,nofire:1,sc:'rail',mrt:1},
 sinkhole:{f:[1,1],lay:'yard',yard:'sink',k:[3,3],b:0,out:1,nofire:1,sc:'sink'},
 slide:{f:[1,1],lay:'yard',yard:'sink',k:[3,3],b:0,out:1,nofire:1,sc:'sink',slide:1},
 height:{f:[6,11],lay:'corridor',k:[3,3],b:0,nofire:1,sc:'ledge'},
 balcony:{f:[4,9],lay:'corridor',k:[3,3],b:0,unit:1,nofire:1,sc:'ledge',kid:1},
 aircraft:{f:[1,1],lay:'yard',yard:'apron',k:[3,3],b:0,out:1,sc:'air'},
 airlanding:{f:[1,1],lay:'yard',yard:'apron',k:[3,4],b:0,out:1,sc:'air',big:1},
 elec:{f:[1,1],lay:'yard',yard:'road',k:[2,3],b:0,out:1,vic:[0,0],sc:'elec'},
 crowd:{f:[1,1],lay:'yard',yard:'plaza',k:[3,4],b:0,out:1,nofire:1,sc:'crowd'},
 mci:{f:[1,1],lay:'yard',yard:'plaza',k:[3,3],b:0,out:1,nofire:1,sc:'crowd',mci:1}});
Object.assign(TAC_CVW,{balcony:TAC_RES});
Object.assign(TAC_SCY,{rail:1,sink:1,apron:1,plaza:1});
Object.assign(TAC_RK,{rcar:{n:'車廂',fk:1,sr:1.2},loco:{n:'車頭',fk:.8,sr:.8},sink:{n:'坍陷坑',fk:0,sr:1.4},edge:{n:'坍陷邊緣',fk:0,sr:.6},slope:{n:'崩塌土石',fk:.2,sr:1.5},
 nose:{n:'駕駛艙',fk:1,sr:.8},fuse:{n:'客艙',fk:1.2,sr:1.3},wing:{n:'機翼油箱',fk:1.6,sr:.4},tail:{n:'機尾',fk:1,sr:.6},
 crowd:{n:'人群',fk:0,sr:1},stage:{n:'舞台',fk:.8,sr:.8},venue:{n:'活動區',fk:0,sr:.8},ebox:{n:'變電箱',fk:.6,sr:.3}});
Object.assign(TAC_RK,{gate:{n:'出口閘門',fk:0,sr:.8}});
Object.assign(TAC_YFU,{gate:0,rcar:1,loco:.8,sink:0,edge:0,slope:.2,nose:1,fuse:1.2,wing:1.5,tail:1,crowd:0,stage:.8,venue:0,ebox:.6});
Object.assign(TAC_TASK,{cush:'救生氣墊',rope:'繩索救援',extg:'滅火器',clear:'人潮疏導'});
// ===== 版面 =====
function tacSc4Lay(T,K,L,add,room,cuts,R){
 const{lanes,row}=tacLayKit(L,add,room,cuts,/home|shopf|lobby|fuse|nose|tail/);
 // 一列裡依序放置指定寬度的節點，其餘補成車道
 const seq=(y0,y1,x0,parts,o)=>{let x=x0;lanes(0,x0,y0,y1,o);const id=Math.random();for(const p of parts){const n=room(x,y0,p[1],y1-y0,p[0]);n.vid=id;if(/fuse|nose|tail/.test(p[0]))n.walled=1;x+=p[1]}lanes(x,L.GW,y0,y1,o);return x};
 if(T.yard==='rail'){ // 鐵道：上方邊坡（捷運為車站）、列車軌道、另一股軌道、平交道道路（捷運為月台）、邊坡或車站
  L.GW=4.6+K*.4;const mrt=T.mrt;L.var=mrt?'mrt':R()<.5?'cross':'derail';L.varN={mrt:'車站月台',cross:'市區平交道',derail:'郊區路段'}[L.var];
  const y1=.55,y2=y1+.7,y3=y2+.7,y4=y3+(mrt?.65:.6);L.GH=y4+.55;
  row(0,y1,()=>mrt?'lobby':'verge',.9,1.4);
  const nc=mrt?2:3,x0=.3+R()*.4;seq(y1,y2,x0,[['loco',.8]].concat(Array(nc).fill(0).map(()=>['rcar',1.15])),{trk:1});
  if(L.var==='derail'){const xd=x0+.8+1.15*(nc-1)-.3;seq(y2,y3,Math.max(.2,xd),[['rcar',1.15]],{trk:1});for(const n of L.N)if(n.kind==='rcar'&&Math.abs(n.gy-y2)<.01)n.drl=1}else lanes(0,L.GW,y2,y3,{trk:1});
  if(mrt)lanes(0,L.GW,y3,y4,{plat:1});else if(L.var==='cross'){const xc=x0+.8+R()*1.2;seq(y3,y4,xc,[['car',.9]])}else lanes(0,L.GW,y3,y4);
  row(y4,L.GH,()=>mrt?'lobby':'verge',.9,1.4);
  return true}
 if(T.yard==='sink'){ // 路面坍陷：道路中段塌出坑洞（車輛掉落），四周是坍陷邊緣；邊坡崩塌：土石沖上道路與邊坡旁的民宅
  L.GW=4+K*.4;const y1=.7,y2=y1+.6,y3=y2+.8,y4=y3+.6;L.GH=y4+.7;L.var=T.slide?'slide':'sink';L.varN=T.slide?'山區道路':'市區道路';
  if(T.slide){row(0,y1,(i,n)=>i===1?'home':'slope',.8,1.2);lanes(0,L.GW,y1,y2);const xs=.6+R()*.8;seq(y2,y3,xs,[['slope',1],['slope',1.1]]);lanes(0,L.GW,y3,y4);row(y4,L.GH,()=>'verge',.9,1.4)}
  else{row(0,y1,()=>'shopf',.9,1.3);lanes(0,L.GW,y1,y2);const xs=.8+R()*.8;seq(y2,y3,xs,[['edge',.5],['sink',.8],['edge',.5]]);lanes(0,L.GW,y3,y4);row(y4,L.GH,()=>'shopf',.9,1.3)}
  return true}
 if(T.yard==='apron'){ // 機場：滑行道、機翼、機身（駕駛艙、客艙、機尾）、機翼、滑行道、旅客集合的草坪
  L.GW=4.8+K*.4;const big=T.big,y1=.55,y2=y1+.5,y3=y2+.7,y4=y3+.5,y5=y4+.55;L.GH=y5+.6;L.var=big?'jet':'small';L.varN=big?'客機':'小型航空器';
  const nf=big?3:1,x0=.5+R()*.5,wx=x0+.5+(nf>1?.6:.1);
  const ov=big&&R()<.45;if(ov){L.var='over';L.varN='客機衝出跑道'}
  lanes(0,L.GW,0,y1);seq(y1,y2,wx,[['wing',big?1.6:1]]);
  seq(y2,y3,x0,[['nose',.5]].concat(Array(nf).fill(['fuse',1])).concat([['tail',.6]]));
  seq(y3,y4,wx,[['wing',big?1.6:1]]);if(ov)row(y4,y5,()=>'reed',.9,1.4);else lanes(0,L.GW,y4,y5);row(y5,L.GH,()=>ov?'reed':'grass',1,1.5);
  return true}
 if(T.yard==='plaza'){ // 活動廣場：道路、舞台與人群區、疏散通道、人群區與攤位、道路
  L.GW=4.2+K*.4;const y1=.6,y2=y1+.9,y3=y2+.45,y4=y3+.85;L.GH=y4+.6;L.var=T.mci?'mci':R()<.45?'stadium':'crowd';L.varN={mci:'活動會場',crowd:'跨年晚會廣場',stadium:'體育場散場出口'}[L.var];
  if(L.var==='stadium'){ // 體育場：看台區、狹窄的出口閘門（瓶頸）、場外廣場、道路
   lanes(0,L.GW,0,y1);row(y1,y2,()=>'crowd',.9,1.3);
   {const n=3,gw=.45,sp=(L.GW-n*gw)/(n+1);let x=0;for(let i=0;i<n;i++){lanes(x,x+sp,y2,y3);room(x+sp,y2,gw,y3-y2,'gate');x+=sp+gw}lanes(x,L.GW,y2,y3)}
   row(y3,y4,(i,n)=>i===n-1?'stall':'venue',.9,1.3);lanes(0,L.GW,y4,L.GH);return true}
  lanes(0,L.GW,0,y1);row(y1,y2,(i,n)=>i===0?'stage':T.mci?'venue':'crowd',.9,1.3);lanes(0,L.GW,y2,y3);row(y3,y4,(i,n)=>i===n-1?'stall':T.mci?'venue':'crowd',.9,1.3);lanes(0,L.GW,y4,L.GH);
  return true}
 return false}
// ===== 初始化 =====
function tacSc4Init(inc,B,T,put,seed){
 const sc=T.sc,t=tacTxt(inc),R=Math.random,N=B.L.N,rooms=N.filter(n=>n.ty==='room'&&!n.court),cel=(f,c)=>tacCel(B,f,c),pk=a=>a[Math.floor(R()*a.length)];
 const sides=m=>tacSc3Sides(B,m);
 if(sc==='rail'){B.lk.clear();B.cd.clear();const mrt=B.L.var==='mrt';
  sides({s:{road:2,big:true,nm:mrt?'車站出入口道路':'平交道旁道路'},n:{road:0,big:false,nm:mrt?'車站':'邊坡'},e:{road:0,big:false,nm:'軌道'},w:{road:0,big:false,nm:'軌道'}});
  B.pwScn=1;let pin=0,tot=0;
  for(const n of rooms.filter(n=>/rcar|loco|car/.test(n.kind))){const x=cel(0,n.c),k=n.kind==='rcar'?tacRint(mrt?4:3,mrt?9:7):n.kind==='car'?tacRint(1,2):1;
   put(0,n.c,k,.6+R()*.3,1);tot+=k;const p=B.L.var==='derail'||n.kind==='car'?(R()<.55?Math.min(k,tacRint(1,2)):0):R()<.2?1:0;if(p){x.pin=p;pin+=p}}
  if(mrt){const pl=N.filter(n=>n.plat);if(pl.length&&R()<.5){const tk=N.filter(n=>n.trk);put(0,pk(tk).c,1,.5,1);tot++}}
  B.of=0;B.oc=(rooms.find(n=>n.kind==='loco')||rooms[0]).c;
  B.sc.brief=(mrt?'捷運／輕軌事故':B.L.var==='cross'?'鐵路平交道事故':'列車出軌')+'：'+(B.L.var==='cross'?'列車撞上平交道上的汽車，':B.L.var==='derail'?'列車出軌，車廂傾斜擋住另一股軌道，':'列車緊急煞停、車廂受損，')+'傷患約 '+tot+' 名，其中 '+pin+' 名被夾住。'+
   (mrt?'第三軌（750 伏特）':'電車線（2.5 萬伏特）')+'還沒斷電前不能進入軌道：先通知斷電（側欄），再車輛穩固、破壞救援；開設檢傷站分類後送，大量傷病患要加派救護車。';
  return true}
 if(sc==='sink'){B.lk.clear();const sl=B.L.var==='slide';
  sides({e:{road:2,big:true,nm:sl?'山區道路':'道路'},w:{road:2,big:true,nm:sl?'山區道路':'道路'},n:{road:0,big:false,nm:sl?'邊坡':'騎樓店面'},s:{road:0,big:false,nm:sl?'溪谷':'騎樓店面'}});
  let pin=0,tot=0;
  for(const n of rooms.filter(n=>/sink|edge|slope/.test(n.kind))){const x=cel(0,n.c);x.rub=1;if(n.kind==='edge')x.edge=1}
  const tg=rooms.filter(n=>n.kind==='sink'||(n.kind==='slope'&&n.vid));
  for(const n of tg){const k=tacRint(1,2),x=cel(0,n.c);put(0,n.c,k,.55+R()*.3,1);x.pin=k;pin+=k;tot+=k}
  if(sl){const h=rooms.find(n=>n.kind==='home');if(h){const x=cel(0,h.c);x.rub=1;put(0,h.c,tacRint(1,2),.6,R()<.5?1:0);x.pin=1;pin++;tot++}}
  B.of=0;B.oc=(tg[0]||rooms[0]).c;
  B.sc.brief=(sl?'邊坡崩塌：土石沖上山區道路，車輛與民宅被埋':'路面坍陷：道路中段塌陷，車輛掉進坑洞')+'，約 '+tot+' 名受困。坍陷邊緣與土石隨時可能再崩：進入前先架設支撐，安排安全觀察；支撐後以氣墊頂升、破壞救援'+(sl?'；下雨中還可能二次崩塌':'；地下管線可能破裂')+'。';
  return true}
 if(sc==='ledge'){
  const f=Math.max(B.bf+2,B.F-1-tacRint(0,Math.min(3,B.F-B.bf-3))),kid=!!T.kid;
  const wr=rooms.filter(n=>n.wins&&n.wins.length&&n.wins.some(w=>B.sd[w]&&B.sd[w].road)&&!n.small);const o=pk(wr.length?wr:rooms.filter(n=>n.wins&&n.wins.length));
  const x=cel(f,o.c);put(f,o.c,1,kid?.85:.75,1);x.ledge=kid?1:2;if(!kid)x.pin=1;B.ledgeSc=1;B.kid=kid;B.of=f;B.oc=o.c;
  if(kid&&o.u!==undefined){const en=N.find(m=>m.u===o.u&&m.uent);if(en)for(const m of en.nb)if(N[m].ty!=='room'){B.lk.add(tacDK(B,f,en.c,m));B.cd.add(tacDK(B,f,en.c,m))}}
  for(const y of B.cells)if(y.ty==='room'&&!(y.f===f&&y.c===o.c)){y.sl=2;y.srch=1}
  B.sc.brief=kid?'幼童受困陽台外：'+tacNm(B,f,o.c)+'有幼童爬出陽台欄杆外，大人不在家、戶門反鎖。隨時可能墜落：立即在窗下架設救生氣墊，破門（門控）進屋把孩子抱回，或雲梯由窗外接近。':
   '高空受困：'+tacNm(B,f,o.c)+'窗外的外牆吊籠故障，工人懸在 '+tacFlr(B,f)+' 外牆，體力漸失、可能墜落。先架設救生氣墊，再以雲梯（可達高度內）或救助組由上一層窗口繩索垂降救援。';
  return true}
 if(sc==='air'){B.lk.clear();B.cd.clear();const big=B.L.var==='jet';
  sides({e:{road:4,big:true,nm:'滑行道'},w:{road:4,big:true,nm:'滑行道'},n:{road:4,big:true,nm:'跑道'},s:{road:0,big:false,nm:'草坪'}});B.hyd=null;
  const wg=rooms.filter(n=>n.kind==='wing'),fs=rooms.filter(n=>/fuse|nose/.test(n.kind)),gr=rooms.filter(n=>n.kind==='grass'||n.kind==='reed');let tot=0,pin=0;
  for(const n of wg)cel(0,n.c).fuel=1;
  const fire=R()<(big?.35:.6);if(fire){const w=pk(wg),x=cel(0,w.c);x.h=.55;x.s=.7}
  if(R()<.7){B.chem=Object.assign({},TAC_FUEL,{n:'航空燃油（Jet A-1）'});B.chemK=1;B.leak={f:0,c:pk(wg).c,on:1}}
  for(const n of fs){const k=n.kind==='nose'?tacRint(1,2):tacRint(big?2:1,big?5:3),x=cel(0,n.c);put(0,n.c,k,.55+R()*.35,1);tot+=k;if(R()<.35){x.pin=1;pin++}}
  if(big)for(const n of gr){const k=tacRint(3,7);put(0,n.c,k,.82+R()*.15,1);tot+=k}
  if(B.L.var==='over')for(const n of rooms)if(n.kind==='reed'){const x=cel(0,n.c);x.gr=1}
  B.of=0;B.oc=(fire?wg[0]:fs[0]).c;
  B.sc.brief=(B.L.var==='over'?'客機衝出跑道：客機降落時衝出跑道停在芒草地，乘客經滑梯撤到草地（油火會延燒芒草）':big?'客機迫降：客機迫降後衝出跑道，乘客經逃生滑梯撤到草坪':'航空器事故：小型航空器落地失事')+'，傷患約 '+tot+' 名，機艙內還有 '+pin+' 名受困。'+(fire?'機翼油箱起火，火焰燒向機身：機場消防車與泡沫車以泡沫壓制、保護逃生路線；':'')+(B.leak?'燃油外洩，禁止火源、泡沫覆蓋；':'')+'進入機艙搜救、破壞救援，大量傷病患開設檢傷站分類後送。';
  return true}
 if(sc==='elec'){B.lk.clear();
  sides({e:{road:2,big:true,nm:'道路'},w:{road:2,big:true,nm:'道路'},n:{road:0,big:false,nm:'騎樓店面'},s:{road:0,big:false,nm:'騎樓店面'}});
  for(const n of rooms)if(n.kind==='shopf'||n.kind==='shack')for(const m of n.nb)B.cd.add(tacDK(B,0,n.c,m));
  const cs=rooms.filter(n=>/car|scoot|bay/.test(n.kind)),o=pk(cs.length?cs:rooms);o.kind='ebox';o.walled=0;const x=cel(0,o.c);x.fu=.8;x.h=.5;x.s=.6;x.k='ebox';
  B.ebx=o.c;B.pwScn=1;B.of=0;B.oc=o.c;
  B.sc.brief='變電箱起火：路邊'+tacNm(B,0,o.c)+'冒火、有爆裂聲，旁邊停著車、騎樓店面。斷電前禁止射水（觸電危險）：先用 CO₂ 或乾粉滅火器壓制（「滅火器」），通知台電斷電（側欄），斷電後才能射水；保護旁邊的車輛與店面。';
  return true}
 if(sc==='crowd'){B.lk.clear();const mci=B.L.var==='mci';
  sides({e:{road:2,big:true,nm:'道路'},w:{road:2,big:true,nm:'道路'},n:{road:2,big:true,nm:'道路'},s:{road:2,big:true,nm:'道路'}});
  let tot=0;
  for(const n of rooms.filter(n=>/crowd|venue|gate/.test(n.kind))){const x=cel(0,n.c);if(n.kind==='crowd'||n.kind==='gate')x.crowd=n.kind==='gate'?.9:.7+R()*.25;const k=tacRint(mci?2:1,mci?5:4);put(0,n.c,k,mci?.65+R()*.3:.55+R()*.4,1);tot+=k}
  B.of=0;B.oc=rooms[0].c;
  B.sc.brief=B.L.var==='stadium'?'體育場散場推擠：比賽結束散場，人潮擠在出口閘門前推擠倒地，約 '+tot+' 名受傷，閘門與看台下方有人被壓在人群底下。先會同警方在閘門「人潮疏導」打開動線，再搜救、檢傷分類後送。':mci?'大量傷病患：活動會場多人同時不適（疑似食物中毒或熱傷害），傷患約 '+tot+' 名散在會場各區。開設檢傷站、醫療站，依紅黃綠分類後送，加派救護車；必要時請求鄰近分隊支援。':
   '人潮推擠：跨年晚會散場時人潮推擠倒地，約 '+tot+' 名受傷、有人被壓在人群底下。人群太擠進不去：先會同警方「人潮疏導」打開空間，再搜救、檢傷分類後送，大量傷病患要加派救護車。';
  return true}
 return false}
// ===== 每幀：電力、墜落、人群、二次崩塌、變電箱 =====
function tacSc4Step(inc,B,dt){
 const sc=B.sc&&B.sc.k;if(!sc)return;
 B.pwOn=!!B.pwScn&&inc.pow!==2;
 if(sc==='ledge')for(const x of B.cells){if(!x.ledge||!(x.vic>0))continue;if(x.pin)x.pin=Math.min(x.pin,x.vic);
  const sec=B.sq.some(q=>(tacIn(q)&&q.f===x.f&&q.c===x.c&&!q.down)||(q.ty==='ladder'&&q.lf===x.f&&q.lc===x.c&&q.ext>=1)||(q.task==='rope'&&q.rT&&q.rT.f===x.f&&q.rT.c===x.c&&q.f===q.tf&&q.c===q.tc));
  if(sec){if(!x.secW){x.secW=1;radio(inc,'現場','已接觸到受困者，安撫、繫上安全帶，暫時不會墜落。')}continue}
  if(Math.random()<dt*(B.kid?.0022:.0011)*(1+(S.t-B.t0)/300)){x.vic--;if(x.pin)x.pin--;
   if(B.cush&&x.f-B.bf<=7){tacPatient(inc,B,.45,'救生氣墊');radio(inc,'安全官','受困者墜落，落在救生氣墊上！受傷送醫。');tacEvt(inc,B,'warn','受困者墜落（救生氣墊接住）')}
   else{B.lost++;S.rep-=3;radio(inc,'安全官','受困者從'+tacFlr(B,x.f)+'墜落'+(B.cush?'（高度超過救生氣墊的安全範圍）':'，現場沒有救生氣墊')+'，傷重不治（評鑑 -3）。');tacEvt(inc,B,'danger','受困者墜落罹難',1);if(S.rep<=0){S.rep=0;S.over=true}}}}
 if(sc==='crowd')for(const x of B.cells)if(x.crowd>.3&&x.vic>0)x.vh-=dt*.0015*x.crowd;
 if(sc==='elec'&&B.ebx!==undefined){const x=tacCel(B,0,B.ebx);if(B.pwOn&&x.fu>0&&!(x.co2T>S.t))x.h=Math.max(x.h,.3)}
 if(sc==='sink'&&B.L.var==='slide'){B.slT=(B.slT||0)-dt;if(B.slT<=0){B.slT=1;
  if(Math.random()<.0012){const tg=B.cells.filter(x=>x.rub&&!x.shore);if(tg.length){radio(inc,'安全官','邊坡又滑落一波土石！');tacEvt(inc,B,'danger','二次崩塌',1);
   for(const q of B.sq)if(tacIn(q)&&!q.down&&tg.some(x=>x.f===q.f&&x.c===q.c)){q.hp-=.3;if(q.hp<.3)tacDown(inc,B,q,'二次崩塌')}}}}}}
// ===== 拒絕：帶電、人群 =====
function tacSc4Refuse(B,q,k,f,c,rt){
 const sc=B.sc&&B.sc.k;if(!sc||k==='exit')return'';
 if(sc==='rail'&&B.pwOn&&rt.some(p=>{const n=B.L.N[p[1]];return n.trk||/rcar|loco/.test(n.kind)}))return'拒絕：'+(B.L.var==='mrt'?'第三軌':'電車線')+'還沒斷電，進入軌道有觸電危險；先通知斷電（側欄）';
 if(sc==='elec'&&B.pwOn&&c===B.ebx&&/attack|sky|trans|confine|master|hydro|guard/.test(k))return'拒絕：變電箱帶電，禁止射水（觸電危險）；改用滅火器，或等台電斷電';
 if(sc==='crowd'&&k!=='clear'){const x=tacCel(B,f,c);if(x.crowd>.5)return'拒絕：'+tacNm(B,f,c)+'人潮太擠進不去，先人潮疏導'}
 return''}
// ===== 新任務：救生氣墊、繩索救援、滅火器、人潮疏導 =====
function tacSc4Can(B,q,k,f,c){
 if(!/^(cush|rope|extg|clear)$/.test(k))return null;
 if(q.ty==='robot'||q.ty==='ladder')return'此組無法執行';
 if(k==='cush'){if(!B.ledgeSc)return'沒有需要救生氣墊的情況';if(B.cush)return'救生氣墊已架設';if(tacIn(q))return'人員在室內';return''}
 if(f===undefined||f<0)return'請點選目標';const x=tacCel(B,f,c);
 if(k==='rope'){if(q.ty!=='resc'&&!q.usar)return'繩索救援需要救助組或特搜的繩索器材';if(!x.ledge||!(x.vic>0))return'請點選懸在外牆的受困者';return''}
 if(k==='extg'){if(!(x.h>.03))return'這裡沒有火';return''}
 if(k==='clear'){if(!(x.crowd>.3))return'這裡的人群已經疏散';return''}
 return''}
function tacSc4RopeOrder(inc,B,q,f,c,quiet){
 const why=tacSc4Can(B,q,'rope',f,c);if(why){if(!quiet)tacNo(inc,q,why);return false}
 const tf=Math.min(B.F-1,f+1);q.prev=null;q.wk=0;q.task='rope';q.tf=tf;q.tc=c;q.rT={f,c};q.lt=S.t;q.ent=tacBestEnt(B,q.side,tf,c,false);
 if(!quiet)radio(inc,q.cs,'收到，到'+tacFlr(B,tf)+'窗口架設繩索系統，垂降救援'+tacNm(B,f,c)+'外的受困者。');return true}
function tacSc4Task(inc,B,q,k,cl,dt){
 if(k==='rope'){const T=q.rT,x=T&&tacCel(B,T.f,T.c);if(!x||!(x.vic>0)){q.task='idle';return}
  q.wk+=dt;if(q.wk<(q.usar?14:20))return;q.wk=0;x.vic--;if(x.pin)x.pin=Math.min(x.pin,x.vic);q.carry=1;q.cvh=x.vh;q.cvc=0;q.task='carry';q.tf=-1;q.tc=0;
  radio(inc,q.cs,'繩索垂降救援成功，受困者已拉進'+tacFlr(B,q.f)+'窗內，搬運下樓。');tacEvt(inc,B,'victim','繩索救援（'+tacNm(B,T.f,T.c)+'）');return}
 if(k==='extg'){if(!(cl.h>.03)){q.task='idle';radio(inc,q.cs,tacNm(B,q.f,q.c)+'以滅火器撲滅。');return}
  cl.h=Math.max(0,cl.h-dt*.03*(cl.k==='ebox'?1.5:1));cl.co2T=S.t+6;if(Math.random()<dt*.05)tacSay(q,'attack');return}
 if(k==='clear'){cl.crowd=Math.max(0,cl.crowd-dt*.025*Math.min(1.3,q.n/3)*(inc.pol===2?1.6:1));
  if(cl.crowd<=.3){q.task='idle';radio(inc,q.cs,tacNm(B,q.f,q.c)+'人潮疏導完成，可以進入搜救。');tacEvt(inc,B,'milestone','人潮疏導：'+tacNm(B,q.f,q.c))}return}}
function tacSc4Cush(inc,B,q,dt){
 q.wk+=dt;if(q.wk<15)return;q.wk=0;B.cush=1;q.task='idle';
 radio(inc,q.cs,'救生氣墊架設完成（窗戶正下方），可承接約 7 層以下的墜落。');tacEvt(inc,B,'milestone','救生氣墊架設')}
// ===== 側欄：電力、救生氣墊、人群 =====
function tacSc4HTML(inc,B){
 const sc=B.sc&&B.sc.k;if(!sc)return'';let h='';const rw=(a,b)=>'<div class="row"><span>'+a+'</span><span>'+b+'</span></div>';
 if(B.pwScn)h+=rw(sc==='elec'?'變電箱電力':(B.L.var==='mrt'?'第三軌':'電車線'),inc.pow===2?'<b style="color:var(--grn)">已斷電</b>':inc.pow===1?'斷電中 '+Math.ceil(inc.powT)+' 秒':'<b style="color:var(--red)">帶電</b> <button data-tpow="1">通知斷電</button>');
 if(B.ledgeSc)h+=rw('救生氣墊',B.cush?'<b style="color:var(--grn)">已架設</b>':'<b style="color:var(--amb)">未架設</b>');
 if(sc==='crowd'){const m=Math.max(0,...B.cells.map(x=>x.crowd||0));h+=rw('人群密度',m>.5?'<b style="color:var(--red)">'+Math.round(m*100)+'%（進不去）</b>':Math.round(m*100)+'%')}
 return h?'<div class="hd mt">現場狀況</div><div class="twater">'+h+'</div>':''}
function tacPowReq(inc,B,quiet){if(inc.pow)return;inc.pow=1;inc.powT=30+Math.random()*30;radio(inc,'受理',(B.sc&&B.sc.k==='rail'?'通知'+(B.L.var==='mrt'?'捷運行控中心':'鐵路調度中心')+'斷電':'通知台電斷電')+'，預估 '+Math.ceil(inc.powT)+' 秒完成。')}
// ===== 戰術 AI =====
function tacSc4AI(inc,B,free,take){
 const sc=B.sc&&B.sc.k;if(!sc)return;
 if(B.pwScn&&!inc.pow)tacPowReq(inc,B,1);
 if(sc==='ledge'){
  if(!B.cush&&!B.sq.some(q=>q.task==='cush')){const r=free.find(q=>!tacIn(q)&&q.ty!=='ladder'&&q.ty!=='robot');if(r&&tacOrder(inc,r,'cush',-1,0,1)){take(r);radio(inc,r.cs,'於窗下架設救生氣墊。')}}
  for(const x of B.cells){if(!x.ledge||!(x.vic>0)||B.sq.some(q=>q.task==='rope'||(q.ty==='ladder'&&q.lf===x.f&&q.lc===x.c&&q.task==='ladder')))continue;
   const l=free.find(q=>q.ty==='ladder'&&!tacCan(B,q,'ladder',x.f,x.c));if(l&&tacOrder(inc,l,'ladder',x.f,x.c,1)){take(l);continue}
   if(x.ledge===2){const r=free.find(q=>(q.ty==='resc'||q.usar)&&q.air>.6);if(r&&tacSc4RopeOrder(inc,B,r,x.f,x.c,1))take(r)}}}
 if(sc==='crowd'){const cs=B.cells.filter(x=>x.crowd>.5&&!B.sq.some(q=>q.task==='clear'&&q.tf===x.f&&q.tc===x.c));
  for(const x of cs){const r=free.find(q=>q.ty!=='ladder'&&q.ty!=='robot'&&!q.line);if(r&&tacOrder(inc,r,'clear',x.f,x.c,1)){take(r);radio(inc,r.cs,'前往'+tacNm(B,x.f,x.c)+'疏導人潮。')}}
  if(B.pts.length>=3&&!B.st.triage&&tacAmbFree(inc,B)>=2)tacStnOpen(inc,B,'triage',1)}
 if(sc==='elec'&&B.pwOn&&B.ebx!==undefined){const x=tacCel(B,0,B.ebx);
  if(x.h>.03&&!B.sq.some(q=>q.task==='extg')){const r=free.find(q=>q.ty!=='ladder'&&q.ty!=='robot');if(r&&tacOrder(inc,r,'extg',0,B.ebx,1)){take(r);radio(inc,r.cs,'以 CO₂ 滅火器壓制變電箱火勢（斷電前禁止射水）。')}}}}
// ===== 現場民眾 =====
function tacSc4Civ(inc,B,k){
 const sc=B.sc&&B.sc.k;if(!/^(rail|sink|ledge|air|elec|crowd)$/.test(sc||''))return undefined;
 const C={rail:{who:'車廂裡還有人出不來，有人被卡住！',fire:'沒有起火。',gas:'沒有聞到怪味。',lock:'車門變形打不開。',layout:'列車停在軌道上，'+(B.L.var==='mrt'?'月台在旁邊。':'旁邊是平交道。')},
  sink:{who:'有'+(B.L.var==='slide'?'車子跟房子被土埋了！':'車子掉進坑裡了！'),fire:'沒有起火。',gas:'好像有水管破掉在噴水。',lock:'—',layout:'洞的邊緣還一直在掉。'},
  ledge:{who:B.kid?'是我鄰居的小孩，大人好像不在家！':'是洗窗戶的工人，吊籠卡住了！',fire:'沒有起火。',gas:'沒有。',lock:B.kid?'門鎖著，我們進不去！':'大樓管理員有鑰匙。',layout:'在 '+tacFlr(B,B.of)+' 外面，靠馬路這邊。'},
  air:{who:'機艙裡還有人沒出來！',fire:B.cells.some(x=>x.h>.05)?'機翼在燒！':'沒有起火，但一直在漏油。',gas:'很濃的燃油味。',lock:'有幾個逃生門打不開。',layout:'大家都從滑梯下來跑到草坪。'},
  elec:{who:'旁邊沒有人受傷。',fire:'變電箱一直冒火花，還有爆炸聲！',gas:'有燒焦味。',lock:'—',layout:'變電箱就在路邊，旁邊停滿車。'},
  crowd:{who:'下面還壓著好幾個人！',fire:'沒有起火。',gas:'沒有。',lock:'—',layout:'人都擠在舞台前面，出口那邊比較空。'}};
 return(C[sc]||{})[k]}
const tacSc4Done=B=>({rail:'受困乘客都已救出、傷患後送完畢',sink:'受困者都已救出',ledge:'受困者已救下',air:'火勢撲滅、乘客都已救出後送',elec:'變電箱火勢撲滅',crowd:'傷患都已救出、後送完畢'})[B.sc&&B.sc.k]||'';
// ===== 繪製 =====
function tacSc4Draw(g,G,B,n,x,r,k,dark){
 const t=G.t;
 if(n.trk){g.strokeStyle='#8a857a';g.lineWidth=2;for(const yy of[.35,.65]){g.beginPath();g.moveTo(r[0],r[1]+r[3]*yy);g.lineTo(r[0]+r[2],r[1]+r[3]*yy);g.stroke()}
  g.strokeStyle='rgba(138,133,122,.5)';g.lineWidth=2;for(let xx=r[0]+4;xx<r[0]+r[2];xx+=9){g.beginPath();g.moveTo(xx,r[1]+r[3]*.28);g.lineTo(xx,r[1]+r[3]*.72);g.stroke()}
  if(B.pwOn){g.strokeStyle='rgba(233,193,59,.55)';g.setLineDash([3,5]);g.beginPath();g.moveTo(r[0],r[1]+r[3]*.15);g.lineTo(r[0]+r[2],r[1]+r[3]*.15);g.stroke();g.setLineDash([])}}
 if(n.plat){g.fillStyle='rgba(233,193,59,.7)';g.fillRect(r[0],r[1]+2,r[2],3)}
 if(k==='rcar'||k==='loco'){tacTrainDraw(g,B,n,r,k,dark);return true}
 if(k==='sink'){g.fillStyle='#0d0b09';g.beginPath();g.ellipse(r[0]+r[2]/2,r[1]+r[3]/2,r[2]*.45,r[3]*.42,0,0,TAU);g.fill();g.strokeStyle='#5a4a3a';g.lineWidth=2;g.stroke();
  if(x.vic>0)tacCarDraw(g,r[0]+r[2]*.3,r[1]+r[3]*.35,r[2]*.4,r[3]*.3,'#6a7a8a',false,dark);return true}
 if(k==='edge'){g.strokeStyle='rgba(160,130,90,.7)';g.lineWidth=1.2;for(let i=0;i<5;i++){g.beginPath();g.moveTo(r[0]+r[2]*(.1+.2*i),r[1]+4);g.lineTo(r[0]+r[2]*(.2+.18*i),r[1]+r[3]*.5);g.lineTo(r[0]+r[2]*(.12+.2*i),r[1]+r[3]-4);g.stroke()}return true}
 if(k==='slope'){g.fillStyle='#4a3a2a';g.fillRect(r[0],r[1],r[2],r[3]);for(let i=0;i<12;i++){const a=(n.c*17+i*31)%97/97,b=(n.c*7+i*13)%89/89;g.fillStyle=i%2?'#6a5a48':'#5a4a38';g.beginPath();g.arc(r[0]+r[2]*a,r[1]+r[3]*b,t*.05+(i%3)*2,0,TAU);g.fill()}return true}
 if(k==='nose'||k==='fuse'||k==='tail'){g.fillStyle=dark?'#1a1816':'#d8dce2';const rr=k==='nose'?[r[0]+r[2]*.2,r[1]+r[3]*.2,r[2]*.8,r[3]*.6]:[r[0],r[1]+r[3]*.2,r[2],r[3]*.6];g.fillRect(rr[0],rr[1],rr[2],rr[3]);
  if(k!=='tail'){g.fillStyle='rgba(60,90,130,.7)';for(let xx=rr[0]+6;xx<rr[0]+rr[2]-4;xx+=8)g.fillRect(xx,rr[1]+3,4,4)}
  if(k==='tail'){g.fillStyle=dark?'#1a1816':'#c8332c';g.fillRect(r[0]+r[2]*.5,r[1],r[2]*.3,r[3])}return true}
 if(k==='wing'){g.fillStyle=dark?'#1a1816':'#b8bcc4';g.beginPath();g.moveTo(r[0],r[1]+r[3]*.8);g.lineTo(r[0]+r[2],r[1]+r[3]*.35);g.lineTo(r[0]+r[2],r[1]+r[3]*.6);g.lineTo(r[0],r[1]+r[3]);g.closePath();g.fill();return true}
 if(k==='crowd'||k==='venue'||k==='gate'){if(k==='gate'){g.fillStyle='#3a3833';g.fillRect(r[0],r[1],3,r[3]);g.fillRect(r[0]+r[2]-3,r[1],3,r[3])}const d=x.crowd||0,nn=Math.round(6+d*40);for(let i=0;i<nn;i++){const a=(n.c*31+i*17)%101/101,b=(n.c*13+i*29)%97/97;g.fillStyle=['#c8b48a','#8aa0c8','#c88a8a','#9ac88a'][i%4];g.beginPath();g.arc(r[0]+r[2]*(.05+.9*a),r[1]+r[3]*(.08+.84*b),2.2,0,TAU);g.fill()}
  if(d>.3){g.fillStyle=d>.5?'rgba(226,86,79,.9)':'rgba(233,161,59,.9)';g.font='600 10px '+FONT;g.textAlign='center';g.textBaseline='top';g.fillText('人群 '+Math.round(d*100)+'%',r[0]+r[2]/2,r[1]+14)}return true}
 if(k==='stage'){g.fillStyle=dark?'#1a1816':'#3a2a4a';g.fillRect(r[0]+4,r[1]+4,r[2]-8,r[3]-8);g.fillStyle='rgba(233,193,59,.6)';for(let i=0;i<4;i++)g.fillRect(r[0]+r[2]*(.15+i*.2),r[1]+6,4,4);return true}
 if(k==='ebox'){g.fillStyle=dark?'#1a1816':'#6a6e74';g.fillRect(r[0]+r[2]*.3,r[1]+r[3]*.25,r[2]*.4,r[3]*.5);g.fillStyle=B.pwOn?'#e9c13b':'#5a5e64';g.font='700 '+Math.round(t*.2)+'px '+FONT;g.textAlign='center';g.textBaseline='middle';g.fillText('⚡',r[0]+r[2]/2,r[1]+r[3]/2);return true}
 return false}
// 繪製：懸在窗外（外牆吊籠、陽台欄杆外）的受困者
function tacSc4LedgeDraw(g,G,B,vf,T){
 if(!B.ledgeSc||vf>=B.F)return;
 for(const n of B.L.N){const x=tacCel(B,vf,n.c);if(!x.ledge||!(x.vic>0)||!n.wins||!n.wins.length)continue;
  const sd=n.wins.find(w=>B.sd[w]&&B.sd[w].road)||n.wins[0],w=tacWinPt(G,n.c,sd),dv=TAC_SDV[sd],px=w[0]+dv[0]*14,py=w[1]+dv[1]*14,sw=Math.sin(T*3)*2;
  if(x.ledge===2){g.strokeStyle='#9a958a';g.lineWidth=1.5;g.strokeRect(px-9+dv[1]*4,py-6+dv[0]*4,18,12)}
  tacMan(g,px+sw*dv[1],py+sw*dv[0],5,'#ff8a6a',Math.atan2(-dv[1],-dv[0]),{});
  g.fillStyle='#ff8a6a';g.font='600 10px '+FONT;g.textAlign='center';g.textBaseline='middle';g.fillText(x.ledge===2?'外牆受困':'陽台外',px+dv[0]*26,py+dv[1]*18+(dv[1]?0:-12))}}
// 俯視火車：車頂（集電弓、冷氣機、車頂走道）、兩側色帶、車廂間連結通道；車頭在列車外側那端（斜削的車鼻與擋風玻璃）；
// 捷運沒有機車頭，第一節是同色系的駕駛車廂；出軌車廂歪斜
function tacTrainDraw(g,B,n,r,k,dark){
 const VS=TAC.vs||8,mates=B.L.N.filter(m=>m.vid&&m.vid===n.vid&&!!m.drl===!!n.drl).sort((a,b)=>a.gx-b.gx),i=mates.indexOf(n),first=i===0,last=i===mates.length-1;
 const mrt=B.L.var==='mrt',cab=k==='loco'&&(first||last),nL=cab&&first,nR=cab&&last&&!first;
 const wid=Math.min(r[3]*.62,3.2*VS),x0=r[0]+(first?4:1),len=r[2]-(first?4:1)-(last?4:1),y0=r[1]+(r[3]-wid)/2,nose=len*.16;
 g.save();
 if(n.drl){g.translate(r[0]+r[2]/2,r[1]+r[3]/2);g.rotate(-.22);g.translate(-(r[0]+r[2]/2),-(r[1]+r[3]/2))}
 const shape=()=>{g.beginPath();g.moveTo(x0+(nL?nose:0),y0);g.lineTo(x0+len-(nR?nose:0),y0);if(nR){g.lineTo(x0+len,y0+wid*.28);g.lineTo(x0+len,y0+wid*.72)}g.lineTo(x0+len-(nR?nose:0),y0+wid);g.lineTo(x0+(nL?nose:0),y0+wid);if(nL){g.lineTo(x0,y0+wid*.72);g.lineTo(x0,y0+wid*.28)}g.closePath()};
 g.save();g.translate(2,2);shape();g.fillStyle='rgba(0,0,0,.35)';g.fill();g.restore();
 shape();g.fillStyle=dark?'#1e1c19':k==='loco'&&!mrt?'#c8732c':mrt?'#b8c0c8':'#a8adb4';g.fill();
 if(dark){g.restore();return}
 // 兩側色帶（台鐵電聯車藍色、捷運綠色、機車頭白色）
 const sx=x0+(nL?nose:0),sl=len-(nL||nR?nose:0),sw=Math.max(1.5,wid*.09);
 g.fillStyle=k==='loco'&&!mrt?'#f0ece4':mrt?'#3a9a6a':'#2f5fb0';g.fillRect(sx,y0,sl,sw);g.fillRect(sx,y0+wid-sw,sl,sw);
 // 車頂中央走道與分段線
 g.strokeStyle='rgba(40,40,44,.35)';g.lineWidth=1;g.beginPath();g.moveTo(x0+6,y0+wid/2);g.lineTo(x0+len-6,y0+wid/2);g.stroke();
 for(let s=1;s<4;s++){g.beginPath();g.moveTo(x0+len*s/4,y0+wid*.15);g.lineTo(x0+len*s/4,y0+wid*.85);g.stroke()}
 // 冷氣機（車廂兩具；捷運駕駛車廂也有）
 if(k==='rcar'||mrt){g.fillStyle='#d8dce2';for(const u of[.3,.7])g.fillRect(x0+len*u-len*.08,y0+wid*.28,len*.16,wid*.44)}
 // 擋風玻璃
 g.fillStyle='rgba(30,40,55,.85)';if(nL)g.fillRect(x0+len*.08,y0+wid*.22,len*.07,wid*.56);if(nR)g.fillRect(x0+len*.85,y0+wid*.22,len*.07,wid*.56);
 // 集電弓（台鐵機車頭與第二節；捷運走第三軌沒有）
 if(!mrt&&(k==='loco'||i===1||i===mates.length-2)){const px=x0+len*(nL?.6:nR?.4:.5),py=y0+wid/2,pw=wid*.34;g.strokeStyle=B.pwOn?'#e9c13b':'#4a4a4a';g.lineWidth=1.5;
  g.beginPath();g.moveTo(px-pw,py);g.lineTo(px,py-pw*.8);g.lineTo(px+pw,py);g.lineTo(px,py+pw*.8);g.closePath();g.stroke();g.beginPath();g.moveTo(px-pw*1.2,py);g.lineTo(px+pw*1.2,py);g.stroke()}
 // 連結通道
 g.fillStyle='#3a3a3e';if(!last)g.fillRect(x0+len-1,y0+wid*.3,3,wid*.4);if(!first)g.fillRect(x0-2,y0+wid*.3,3,wid*.4);
 g.restore()}
