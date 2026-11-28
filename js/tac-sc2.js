// 戰術指揮：優先二級擴充勤務——隧道火警、船舶火警、貨櫃場火警、建物倒塌、破門救援、異味破門、電梯受困
'use strict';
Object.assign(TACK,{
 tunnel:{f:[1,1],lay:'yard',yard:'tunnel',k:[3,3],b:0,out:1,sc:'tunnel'},
 ship:{f:[3,4],lay:'corridor',k:[2,3],b:1,bfN:1,ofB:0,cv:'single',sc:'ship'},
 cargo:{f:[1,1],lay:'yard',yard:'cargo',k:[3,3],b:0,out:1,sc:'cargo'},
 collapse:{f:[2,4],lay:'corridor',k:[2,3],b:0,nofire:1,sc:'collapse'},
 forced:{f:[3,7],lay:'corridor',k:[3,3],b:0,unit:1,nofire:1,sc:'forced'},
 odor:{f:[3,7],lay:'corridor',k:[3,3],b:0,unit:1,nofire:1,sc:'odor'},
 lift:{f:[5,9],lay:'corridor',k:[3,3],b:0,unit:1,nofire:1,sc:'lift',cv:'center'}});
Object.assign(TAC_CVW,{forced:TAC_RES,odor:TAC_RES});
Object.assign(TAC_RK,{court:{n:'天井',fk:0,sr:.1},bus:{n:'遊覽車',fk:1.3,sr:1.2},cfs:{n:'集散倉庫',fk:1.5,sr:1.4},cont:{n:'貨櫃',fk:1.3,sr:.8},xp:{n:'避難連絡通道',fk:.1,sr:.5},engine:{n:'機艙',fk:1.4,sr:1.3},lift:{n:'電梯車廂',fk:.2,sr:.6}});
Object.assign(TAC_YFU,{bus:1.2,cfs:1.5,cont:1.3,xp:0});
const TAC_SCY={road:1,pit:1,tunnel:1,cargo:1};
Object.assign(TAC_TASK,{shore:'架設支撐'});
// 版面：隧道（上方避難坑道、兩處避難連絡通道、主隧道兩車道）、貨櫃場（車道與貨櫃排）
function tacSc2Lay(T,K,L,add,room,cuts,R){
 const lane=(gx,gy,gw,gh,o)=>add(Object.assign({ty:'hall',gx,gy,gw,gh,lane:1},o||{}));
 const lanes=(x0,x1,y0,y1,o)=>{if(x1-x0<.05)return;const hs=cuts(x0,x1,1,1.6);for(let i=0;i<hs.length-1;i++)lane(hs[i],y0,hs[i+1]-hs[i],y1-y0,o)};
 const pk=a=>a[Math.floor(R()*a.length)];
 if(T.yard==='tunnel'){L.GW=6.4+K*.3;L.GH=3; // 隧道：上方避難坑道或對向隧道、2～3 處連絡通道、起火車輛（貨車、遊覽車或小客車）
  const twin=R()<.5,veh=/遊覽車|巴士|客運/.test(T.txt||'')?'bus':pk(['truck','truck','bus','car']);L.var=veh+(twin?'2':'');
  L.varN=(twin?'雙孔隧道':'設有避難坑道')+'・'+{truck:'貨車',bus:'遊覽車',car:'小客車'}[veh]+'起火';
  lanes(0,L.GW,0,.6,{safe:1,twin:twin?1:0});
  for(const fx of R()<.5?[.27,.73]:[.18,.5,.82]){const x=L.GW*fx-.4;room(x,.6,.8,.4,'xp').xp=1}
  const x0=L.GW*(.4+R()*.12),y1=1,y2=2,cw=1.1;
  lanes(0,x0-cw-.9,y1,y2,{tube:1});room(x0-cw-.9,y1,cw,y2-y1,'car').tube=1;lanes(x0-.9,x0,y1,y2,{tube:1});
  let xe=x0;
  if(veh==='truck'){for(const p of[['cab',.55],['cargo',1.4]]){const n=room(xe,y1,p[1],y2-y1,p[0]);n.vid=1;n.tube=1;xe+=p[1]}}
  else if(veh==='bus'){room(xe,y1,1.6,y2-y1,'bus').tube=1;xe+=1.6}
  else{room(xe,y1,cw,y2-y1,'car').tube=1;xe+=cw}
  lanes(xe,xe+.8,y1,y2,{tube:1});room(xe+.8,y1,cw,y2-y1,'car').tube=1;lanes(xe+.8+cw,L.GW,y1,y2,{tube:1});
  const xc=x0+R()*.6;lanes(0,xc,y2,L.GH,{tube:1});room(xc,y2,cw,L.GH-y2,'car').tube=1;lanes(xc+cw,L.GW,y2,L.GH,{tube:1});
  return true}
 if(T.yard==='cargo'){L.GW=4.2+K*.4; // 貨櫃場：兩排或三排貨櫃，有時一側是 CFS 集散倉庫
  const n3=R()<.45,cfs=R()<.4;L.var=(n3?'3':'2')+(cfs?'c':'');L.varN=(n3?'三排':'兩排')+'貨櫃'+(cfs?'・旁有集散倉庫':'');
  const rows=n3?[[0,.45,0],[.45,1.05,1],[1.05,1.5,0],[1.5,2.1,1],[2.1,2.55,0],[2.55,3.15,cfs?2:1],[3.15,3.6,0]]:[[0,.5,0],[.5,1.3,1],[1.3,1.8,0],[1.8,2.55,cfs?2:1],[2.55,3,0]];
  L.GH=rows[rows.length-1][1];
  for(const[a,b,c]of rows){if(!c){lanes(0,L.GW,a,b);continue}
   if(c===2){const xs=cuts(0,L.GW,1.3,1.9);for(let i=0;i<xs.length-1;i++)room(xs[i],a,xs[i+1]-xs[i],b-a,'cfs').walled=1;continue}
   const xs=cuts(0,L.GW,.55,.75);for(let i=0;i<xs.length-1;i++)room(xs[i],a,xs[i+1]-xs[i],b-a,'cont').walled=1}
  return true}
 return false}
// 初始化：回傳 true 表示已處理
function tacSc2Init(inc,B,T,put,seed){
 const sc=T.sc,t=tacTxt(inc),R=Math.random,N=B.L.N,rooms=N.filter(n=>n.ty==='room'&&!n.court),cel=(f,c)=>tacCel(B,f,c),pk=a=>a[Math.floor(R()*a.length)];
 const sides=(m)=>{const sd={};for(const s of TAC_SIDES)sd[s]=m[s];B.sd=sd;B.exp={};B.sp=null;
  B.ents=TAC_SIDES.filter(s=>sd[s].road&&B.L.ent[s]!==undefined).map(s=>({side:s,c:B.L.ent[s],lock:0}));
  if(!sd[B.arr]||!sd[B.arr].road)B.arr=B.ents[0].side;if(B.hyd&&!sd[B.hyd.side].road)B.hyd.side=B.arr};
 const unitOf=n=>n.u!==undefined?N.filter(m=>m.u===n.u):[n];
 const lockUnit=(f,n)=>{const en=n.u!==undefined?N.find(m=>m.u===n.u&&m.uent):n;if(en)for(const o of en.nb)if(N[o].ty!=='room'){B.lk.add(tacDK(B,f,en.c,o));B.cd.add(tacDK(B,f,en.c,o))}};
 const only=(cs)=>{for(const x of B.cells)if(x.ty==='room'&&!cs.some(p=>p[0]===x.f&&p[1]===x.c)){x.sl=2;x.srch=1}};
 if(sc==='tunnel'){const up=R()<.5?'w':'e';B.arr=up;
  sides({e:{road:4,big:true,nm:up==='e'?'隧道口（上游）':'隧道口（下游）'},w:{road:4,big:true,nm:up==='w'?'隧道口（上游）':'隧道口（下游）'},n:{road:0,big:false,nm:'山體'},s:{road:0,big:false,nm:'山體'}});
  B.arr=up;if(B.hyd)B.hyd.side=up;
  for(const n of N){const x=cel(0,n.c);if(n.tube||n.xp)x.v=0;if(n.ty==='hall'){x.v=0;n.portal=n.gx<.05?'w':n.gx+n.gw>B.L.GW-.05?'e':null;if(n.portal)x.v=1}if(n.xp)x.v=0}
  // 逃生通道是防火區劃：兩端是自動關閉的防火門（人員通過後自動關回，水帶通過時會被卡住）
  for(const n of rooms)if(n.xp)for(const o of n.nb){const key=tacDK(B,0,n.c,o);B.cd.add(key);B.fd.set(key,{t:'auto',f:0,s:n.c,o})}
  const veh=rooms.filter(n=>n.kind==='cab'||n.kind==='bus'||(n.kind==='car'&&!n.xp));const o=rooms.find(n=>n.kind==='cab')||rooms.find(n=>n.kind==='bus')||pk(rooms.filter(n=>n.kind==='car'));
  const x=cel(0,o.c);x.h=.55;x.s=.8;B.of=0;B.oc=o.c;
  const dn=veh.filter(n=>n!==o&&n.vid!==o.vid&&(up==='w'?n.gx>N[o.c].gx:n.gx<N[o.c].gx));
  for(const n of dn)if(R()<.7)put(0,n.c,1,.85,0);
  const xp=rooms.filter(n=>n.xp);if(xp.length&&(R()<.5||!dn.length||o.kind==='bus'))put(0,pk(xp).c,o.kind==='bus'?tacRint(4,8):tacRint(2,5),1,1);
  B.sc.brief='隧道火警：主隧道'+tacNm(B,0,o.c)+'起火，煙在隧道內蓄積。上游（'+TAC_SDN[up]+'側）是攻擊路線；下游車內可能還有人，也有人躲在避難連絡通道。可由上方避難坑道經連絡通道接近；射流風機會把煙推往下游。';
  return true}
 if(sc==='cargo'){sides({n:{road:2,big:true,nm:'場內道路'},s:{road:2,big:true,nm:'場內道路'},e:{road:2,big:true,nm:'場內道路'},w:{road:2,big:true,nm:'場內道路'}});
  const cs=rooms.filter(n=>n.kind==='cont');for(const n of cs)for(const o of n.nb){B.cd.add(tacDK(B,0,n.c,o));B.lk.add(tacDK(B,0,n.c,o))}
  const o=pk(cs),x=cel(0,o.c);x.h=.3;x.s=.92;x.o2=12.5;B.of=0;B.oc=o.c;
  const nb=cs.filter(n=>n!==o).sort((a,b)=>tacGd(B,o.c,a.c)-tacGd(B,o.c,b.c));
  if(R()<.5&&nb.length){const d=nb[tacRint(0,Math.min(2,nb.length-1))];B.dg={c:d.c,chem:pk(TAC_CHEM.filter(c=>!c.h2s))}}
  B.sc.brief='貨櫃場火警：'+tacNm(B,0,o.c)+'櫃內悶燒（門封著、缺氧），開櫃門會爆燃：門控慢慢開、開門前先射水。火會經櫃壁燒到相鄰貨櫃'+(B.dg?'；附近有危險品貨櫃，受熱會洩漏':'')+'。';
  return true}
 if(sc==='ship'){B.L.varN=/漁船/.test(t)?'漁船':/貨船|貨輪/.test(t)?'貨輪':'';const m={};for(const sd of TAC_SIDES)m[sd]=sd===B.arr?{road:2,big:true,nm:'碼頭'}:{road:0,big:false,nm:'海面'};sides(m);B.ramp=null;
  for(const x of B.cells)if(x.f<B.bf&&x.ty==='room'){x.k='engine';x.fk=TAC_RK.engine.fk}
  const cab=rooms.filter(n=>!n.small);if(/下面|艙間|還有人/.test(t)||R()<.4)for(let i=0,n=tacRint(1,2);i<n;i++)put(B.bf,pk(cab).c,1,.9,0);
  B.sc.brief='船舶火警：機艙（B1）起火，船體是鋼板：熱會經甲板往上層傳，艙間沒有對外窗、煙排不出去，只能從碼頭側舷梯上船。機艙有 CO₂ 全區放射系統：機艙人員撤出後可放射窒息滅火。';
  return true}
 if(sc==='collapse'){const f=B.bf,rb=rooms.slice().sort(()=>R()-.5).slice(0,tacRint(3,4));B.rub=rb.map(n=>n.c);
  for(const n of rb){const x=cel(f,n.c);x.rub=1;x.fu=Math.min(x.fu,.4);x.s=.25}
  if(B.F-B.bf>1)for(const n of rb.slice(0,2)){const x=cel(f+1,n.c);x.rub=1}
  for(let i=0,n=/聲音|阿伯|有人/.test(t)?tacRint(1,3):tacRint(0,2);i<n;i++){const c=pk(rb).c;put(f,c,1,.7+R()*.2,R()<.6)}
  only(B.cells.filter(x=>x.rub).map(x=>[x.f,x.c]));B.dmg=.55;B.of=f;B.oc=rb[0].c;
  B.sc.brief='建物倒塌：'+tacFlr(B,f)+'有 '+rb.length+' 處瓦礫，結構不穩、可能二次崩塌。先由救助組或特搜「架設支撐」再搜救，瓦礫中搜索很慢。';
  return true}
 if(sc==='forced'||sc==='odor'){const f=B.of,us=rooms.filter(n=>n.uent),en=pk(us.length?us:rooms),un=unitOf(en);lockUnit(f,en);
  const bd=un.find(n=>n.kind==='bed')||en;only(un.map(n=>[f,n.c]));
  if(sc==='forced')put(f,bd.c,1,.6+R()*.15,0);else B.chk={f,c:bd.c};
  B.sc.brief=(sc==='forced'?'破門救援：'+tacNm(B,f,en.c)+'獨居住戶聯絡不上，戶門反鎖，研判人倒在屋內。破門（或門控開鎖）進入搜索、救出送醫；也可由雲梯從窗戶進入。':
   '異味破門：'+tacNm(B,f,en.c)+'傳出異味、多日無人應門，戶門反鎖。破門進入確認住戶狀況；若已明顯死亡，現場保留交警方。');
  return true}
 if(sc==='lift'){const f=Math.min(B.F-1,B.bf+tacRint(2,B.F-B.bf-2)),cs=rooms.filter(n=>n.small&&n.nb.some(o=>N[o].ty==='hall'))
   ,car=pk(cs.length?cs:rooms.filter(n=>n.nb.some(o=>N[o].ty==='hall')));
  B.lift={f,c:car.c};for(let ff=0;ff<B.F;ff++){const x=cel(ff,car.c);x.k='lift';x.fk=TAC_RK.lift.fk;x.fu=0}
  for(const o of car.nb)if(N[o].ty==='hall'){B.lk.add(tacDK(B,f,car.c,o));B.cd.add(tacDK(B,f,car.c,o))}
  const mc=rooms.find(n=>n.small&&n!==car)||rooms.find(n=>n!==car);const mx=cel(B.F-1,mc.c);mx.k='mech';
  B.chem={n:'電梯動力電源',lv:0,util:1,nochem:1,srcN:'電梯機房（斷電）',plug:'已切斷電梯主電源、鎖定機械煞車，可以開門救援。'};B.chemK=1;B.leak={f:B.F-1,c:mc.c,on:1};
  for(let i=0,n=tacRint(1,3);i<n;i++)put(f,car.c,1,.92,1);only([[f,car.c]]);B.of=f;B.oc=car.c;
  B.sc.brief='電梯受困：車廂停在'+tacFlr(B,f)+'附近，裡面有人。先到頂樓'+tacNm(B,B.F-1,mc.c)+'切斷電梯電源、鎖定煞車（「止漏」），再用電梯鑰匙開門救出；沒斷電就開門可能被夾或墜落。';
  return true}
 return false}
// 每幀：船體熱傳導、二次崩塌、危險品貨櫃、電梯內不適
function tacSc2Step(inc,B,dt){
 const sc=B.sc.k;
 if(sc==='ship')for(const x of B.cells){if(x.f>=B.F-1||x.h<.5)continue;const y=B.cells[(x.f+1)*B.W+x.c];if(y&&y.fu>0&&y.ty==='room')y.h=Math.min(1,Math.max(y.h,.01)+dt*.004*(x.h-.5))}
 if(sc==='lift'&&B.lift){const x=tacCel(B,B.lift.f,B.lift.c);if(x.vic>0)x.vh-=dt*.0004}
 B.sc2T=(B.sc2T||0)-dt;if(B.sc2T>0)return;B.sc2T=1;
 if(sc==='collapse')for(const q of B.sq){if(!tacIn(q)||q.down||q.ty==='robot')continue;const x=tacCel(B,q.f,q.c);
  if(x.rub&&!x.shore&&Math.random()<.004){q.hp-=.35;radio(inc,'安全官',tacNm(B,q.f,q.c)+'二次崩塌，'+q.cs+' 遭落下物擊中！先架設支撐再進入。');tacEvt(inc,B,'danger','二次崩塌（'+q.cs+'）',1);if(x.vic)x.vh-=.1;if(q.hp<.3)tacDown(inc,B,q,'二次崩塌')}}
 if(B.dg&&!B.dg.on){const x=tacCel(B,0,B.dg.c);if(x.h>.35){B.dg.on=1;B.chem=Object.assign({},B.dg.chem);B.chemK=0;B.leak={f:0,c:B.dg.c,on:1};
  radio(inc,'安全官',tacNm(B,0,B.dg.c)+'是危險品貨櫃，受熱破裂洩漏不明化學品！劃設危害區、化物辨識。');tacEvt(inc,B,'danger','危險品貨櫃洩漏',1)}}}
// 拒絕命令：機艙 CO₂ 放射後、電梯未斷電
function tacSc2Refuse(B,q,k,f,c,rt){
 const sc=B.sc.k;
 if(sc==='ship'&&B.sys&&B.sys.co2&&B.sys.co2.on&&S.t-B.sys.co2.t0<120&&k!=='exit'&&rt.some(p=>p[0]<B.bf))return'拒絕：機艙剛放射 CO₂，要等溫度下降、量測含氧後才能進入（約 2 分鐘）';
 if(sc==='lift'&&B.lift&&B.leak&&B.leak.on&&k!=='exit'&&(rt.some(p=>p[0]===B.lift.f&&p[1]===B.lift.c)||((k==='force'||k==='dctrl')&&f===B.lift.f&&B.L.N[c].nb.includes(B.lift.c))))
  return'拒絕：電梯還沒斷電，強行開門可能被夾或墜落，先到頂樓機房切斷電源（止漏）';
 return''}
// 能力：支撐
function tacShoreCan(B,q,f,c){if(q.ty!=='resc'&&!q.usar)return'架設支撐需要救助組或特搜的支撐器材';if(!tacCel(B,f,c).rub)return'只有瓦礫空間需要架設支撐';return''}
// 戰術 AI：倒塌先支撐再搜救
function tacSc2AI(inc,B,free,take){
 if(B.sc.k==='collapse'){const tg=B.cells.filter(x=>x.rub&&!x.shore&&(x.vic>0||x.rep)&&!B.sq.some(q=>q.task==='shore'&&q.tf===x.f&&q.tc===x.c))[0];
  const r=tg&&free.find(q=>(q.ty==='resc'||q.usar)&&q.air>.6);if(r&&tacOrder(inc,r,'shore',tg.f,tg.c,1)){take(r);radio(inc,r.cs,'前往'+tacNm(B,tg.f,tg.c)+'架設支撐。')}}}
// 現場民眾（回傳 undefined 表示交給一般情境處理）
function tacSc2Civ(inc,B,k){
 const sc=B.sc.k,vr=B.cells.filter(x=>x.vic>0),nm=x=>tacNm(B,x.f,x.c);
 if(!['tunnel','cargo','ship','collapse','forced','odor','lift'].includes(sc))return undefined;
 if(k==='open')return sc==='tunnel'?['前面有車在燒，煙一下子就整個灌過來，我們倒車出來的。','後面還有車卡在裡面，有些人跑進避難通道了。']:
  sc==='cargo'?['那個櫃子門縫一直冒黑煙，櫃門很燙，我們不敢開。','旁邊的櫃子裝什麼不知道，要問船公司。']:
  sc==='ship'?['機艙先冒煙，接著就整個黑掉了，我們從舷梯跑上岸。',B.vtot?'還有人在下面艙間，沒有出來！':'人應該都上岸了。']:
  sc==='collapse'?['整面牆一下子垮下來，灰塵很大。',B.vtot?'裡面有人在喊救命，聲音從瓦礫下面傳出來！':'不確定裡面有沒有人。']:
  sc==='forced'?['我爸一個人住，兩天都聯絡不上，門反鎖。','從門縫看燈是開著的，叫他都沒回應。']:
  sc==='odor'?['這幾天走廊味道越來越重，那戶都沒人出來。','敲門都沒有回應，管理員也聯絡不到家屬。']:
  ['電梯卡在樓層中間，裡面的人按對講機沒人接。','他們說裡面有點悶。'];
 if(k==='who'){for(const x of vr)if(Math.random()<.85)x.rep=1;const r=vr.filter(x=>x.rep);return r.length?'還有人在'+[...new Set(r.map(nm))].join('、')+'！':sc==='odor'?'那戶是獨居的伯伯。':'其他人應該都出來了。'}
 if(k==='fire')return sc==='tunnel'||sc==='cargo'||sc==='ship'?'是從'+tacNm(B,B.of,B.oc)+'開始燒的。':sc==='lift'?'電梯停在'+tacFlr(B,B.lift.f)+'附近，機房在頂樓。':'就是那戶，'+tacNm(B,B.of,B.oc)+'。';
 if(k==='gas')return sc==='ship'?'機艙裡有柴油櫃跟潤滑油。':sc==='cargo'?(B.dg?'附近好像有貼危險品標示的櫃子。':'應該都是一般貨。'):sc==='tunnel'?'燒的那台車我不知道載什麼。':'應該沒有。';
 if(k==='lock')return sc==='forced'||sc==='odor'?'門反鎖，沒有備用鑰匙。':sc==='cargo'?'櫃門有封條，要剪開。':sc==='lift'?'電梯鑰匙在管理室。':'沒有門鎖的問題。';
 if(k==='layout')return sc==='tunnel'?'隧道上面有避難坑道，中間有連絡通道。':sc==='ship'?'機艙在最下面，往上是船員艙間，只有碼頭這邊的舷梯可以上下。':B.out?'場內道路都可以進來。':'這棟'+(B.F-B.bf)+'層，樓梯在旁邊。';
 return''}
const tacSc2Done=B=>({tunnel:'隧道內火勢撲滅、受困民眾都已救出',cargo:'貨櫃火勢撲滅、殘火處理完成',ship:'機艙火勢撲滅、殘火處理完成',collapse:'瓦礫中受困者都已救出',
 forced:'已破門救出住戶送醫',odor:'已破門進入，住戶已明顯死亡，現場保留交警方處理',lift:'已斷電開門，受困民眾全部救出'})[B.sc.k];
// 繪製：貨櫃、避難連絡通道
function tacSc2Draw(g,G,B,n,x,r,k,dark,rnd){
 const t=G.t;
 if(k==='cont'){const col=dark?'#1e1c19':['#9a4a3a','#3a6a9a','#4a7a4a','#a08a3a'][n.c%4];g.fillStyle=col;g.fillRect(r[0]+3,r[1]+4,r[2]-6,r[3]-8);
  g.strokeStyle='rgba(0,0,0,.35)';g.lineWidth=1;for(let i=1;i<6;i++){g.beginPath();g.moveTo(r[0]+3+(r[2]-6)*i/6,r[1]+4);g.lineTo(r[0]+3+(r[2]-6)*i/6,r[1]+r[3]-4);g.stroke()}
  if(B.dg&&B.dg.c===n.c){g.save();g.translate(r[0]+r[2]/2,r[1]+r[3]/2);g.rotate(Math.PI/4);g.fillStyle='#e9a13b';g.fillRect(-t*.07,-t*.07,t*.14,t*.14);g.restore()}}
 else if(k==='bus')tacLongVeh(g,B,n,r,12,'#d8a83a',dark,(x,y,l,w)=>{g.fillStyle='rgba(20,24,30,.6)';g.fillRect(x+l-8,y+w*.1,5,w*.8);g.fillStyle='rgba(255,255,255,.18)';g.fillRect(x+6,y+w*.15,l-18,w*.7)});

 else if(k==='cfs'){g.fillStyle=dark?'#1e1c19':'#3a3e44';g.fillRect(r[0]+3,r[1]+3,r[2]-6,r[3]-6);g.strokeStyle='rgba(255,255,255,.08)';g.lineWidth=1;for(let q=r[0]+6;q<r[0]+r[2]-4;q+=5){g.beginPath();g.moveTo(q,r[1]+4);g.lineTo(q,r[1]+r[3]-4);g.stroke()}g.strokeStyle='#8a857a';g.lineWidth=2;g.strokeRect(r[0]+3,r[1]+3,r[2]-6,r[3]-6)}
 else if(k==='xp'){g.fillStyle='#22332a';g.fillRect(r[0],r[1],r[2],r[3]);g.strokeStyle='rgba(226,86,79,.8)';g.lineWidth=3;g.setLineDash([7,4]);g.strokeRect(r[0]+2,r[1]+2,r[2]-4,r[3]-4);g.setLineDash([]);
  g.fillStyle='#5dcaa5';g.font='600 10px '+FONT;g.textAlign='center';g.textBaseline='middle';g.fillText('逃生通道',r[0]+r[2]/2,r[1]+r[3]*.42);g.fillStyle='#ff8a7a';g.font='9px '+FONT;g.fillText('防火區劃',r[0]+r[2]/2,r[1]+r[3]*.72)}
 if(n.ty==='hall'&&n.safe){g.fillStyle='rgba(93,202,165,.08)';g.fillRect(r[0],r[1],r[2],r[3]);g.fillStyle='rgba(93,202,165,.6)';g.font='10px '+FONT;g.textAlign='left';g.textBaseline='top';g.fillText(n.twin?'對向隧道（避難）':'避難坑道',r[0]+4,r[1]+3)}
 if(n.ty==='hall'&&n.tube&&!n.portal){g.fillStyle='rgba(0,0,0,.18)';g.fillRect(r[0],r[1],r[2],r[3])}}

// 格局後處理（所有建物）：天井、露天作業區不燃、不需搜索、露天；透天一樓有時是店面
function tacLayPost(inc,B){
 for(const x of B.cells)if(B.L.N[x.c].court){x.fu=0;x.v=1;x.srch=1;x.sl=2;x.fk=0}
 if(inc.k==='mfire'&&Math.random()<.35){const lv=B.L.N.find(n=>n.kind==='living'&&n.edge.length);if(lv){const x=tacCel(B,B.bf,lv.c);x.k='shop';x.fk=TAC_RK.shop.fk;B.L.shopF=1}}}
