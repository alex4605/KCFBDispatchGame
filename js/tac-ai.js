// 戰術指揮：戰術 AI 的指揮模組
'use strict';
// 戰術 AI：分成可個別啟用的模組。AI 指揮時全部啟用；玩家指揮時只啟用已指派職務對應的模組
// M：{safety, water, search, ems, attack, ladder, stn}
function tacAI(inc,B,dt,M){
 B.aiT-=dt;if(B.aiT>0)return;B.aiT=1.5;
 const free=B.sq.filter(q=>!q.down&&!q.tmv&&!q.wd&&(q.task==='idle'||q.task==='hold')&&!q.prev&&(q.ty==='ladder'||q.ty==='robot'||q.air>(tacIn(q)?.45:.6))&&(!M.only||M.only(q)));
 const take=q=>{const i=free.indexOf(q);if(i>=0)free.splice(i,1)};
 // 已知遇水反應的化學品所在：AI 不射水（改由化災 AI 乾砂覆蓋）
 const wrX=B.chemK&&B.chem&&tacCP(B.chem).wr;
 const burning=B.cells.filter(x=>x.ty!=='stair'&&x.h>.05&&!(wrX&&(x.cz||0)>.03)).sort((a,b)=>a.f-b.f||b.h-a.h);
 // 站點（AI 指揮）：指揮站、氣瓶充填區、後勤照護區、聯訪處、集結區
 if(M.stn){
  if(!B.st.icp)tacStnOpen(inc,B,'icp',1);
  // 沒有救助器材車就無法開設氣瓶充填區：有人開始用備用瓶時請求一輛救助車（只請求一次）
  if(!B.st.air&&!B.req71&&!onScene(inc).some(u=>u.code==='71')&&B.sq.some(q=>q.cyl<2||q.refill==='none')){B.req71=1;tacReinf(inc,B,'resc')}
  if(!B.st.media&&B.vtot&&B.st.icp)tacStnOpen(inc,B,'media',1);
  if(!B.st.stage&&B.st.icp)tacStnOpen(inc,B,'stage',1);
  if(!B.st.rehab&&B.sq.length>=6&&tacAmbFree(inc,B)>=2)tacStnOpen(inc,B,'rehab',1);
  for(const q of free.slice())if(q.task==='station')take(q)}
 // 救護：檢傷站、醫療站、請求救護車
 if(M.ems){
  if(!B.st.triage&&B.pts.length>=2&&tacAmbFree(inc,B)>=2)tacStnOpen(inc,B,'triage',1);
  if(!B.st.treat&&B.pts.some(p=>p.sev==='red')&&B.pts.length>=2)tacStnOpen(inc,B,'treat',1);
  if(B.pts.length>tacAmbFree(inc,B)&&B.ambT<=0&&!inc.req)tacAmbReq(inc,B,1)}
 // 高樓（AI）：前進指揮所、消防專用升降機
 // 屋頂光電板起火：通報台電斷電（斷電前雲梯只能水霧遠距射水）
 if((M.stn||M.water)&&B.rf&&B.rf.h>0&&inc.pow===0){inc.pow=1;inc.powT=30+Math.random()*30;radio(inc,'受理','現場請求通報台電斷電，預估 '+Math.ceil(inc.powT)+' 秒完成。')}
 // 指揮站開設後指派安全官（入口設人員管制板）
 if(M.stn&&B.st.icp&&!B.role.safety&&Object.values(B.role).filter(Boolean).length<tacRoleSlots(inc,B))tacRoleSet(inc,B,'safety',1);
 // A 級化學品但 A 級防護衣不足 2 套：請求增派化災車
 if(M.stn&&B.chem&&B.chem.lv>=3&&!B.chem.fuel&&tacPPECap(inc).A<2&&!B.hzReq){B.hzReq=1;tacReinf(inc,B,'hazmat')}
 // 油料火或油料外洩（油池可能被引燃）：清水只能打散油火，現場（含途中）沒有泡沫車、特殊化學車或 CAFS 車時請求泡沫車
 if(M.stn&&B.chem&&B.chem.fuel&&!B.foamReq&&(B.cells.some(x=>x.fuel&&x.h>.1)||(B.leak&&B.leak.on&&B.sc))&&!onScene(inc).concat(S.units.filter(u=>u.inc===inc.id)).some(u=>u.code==='57'||u.code==='01'||u.code==='機'||u.cafs)){B.foamReq=1;tacReinf(inc,B,'foam')}
 // 高樓：起火層在 3F 以上，或火在低樓層但上方樓層還要搜索時，開設前進指揮所
 const upS=B.F-B.bf>=5&&B.cells.some(x=>x.f-B.bf>=3&&x.ty==='room'&&(x.sl<2||x.vic>0));
 if(M.stn&&B.F-B.bf>=5&&(B.of-B.bf>=3||B.of<B.bf||upS)){
  if(!B.st.fwd&&B.st.icp&&(B.of-B.bf>=3||upS))tacStnOpen(inc,B,'fwd',1);
  if(B.elev&&!B.elOn&&!(B.elT>0)){B.elT=10;radio(inc,'受理','消防專用升降機切換消防模式中。')}}
 // 安全：結構嚴重受損，撤出起火樓層以上的小組
 if(M.safety&&B.dmg>=.8&&!B.evacS){B.evacS=1;
  for(const q of B.sq)if(tacIn(q)&&!q.down&&q.task!=='carry'&&q.task!=='ritgo'&&q.task!=='station'){q.prev=null;q.task='exit';q.tf=-1;q.tc=0}
  radio(inc,'安全官','結構有坍塌危險，入室小組全部撤出，改採外部防禦！')}
 // SOP（沒有安全官時）：四組以上到場就以一組編成 RIT（2 進 2 出），救人優先時不等
 if(M.rit&&!M.safety&&B.sq.length>=4&&!B.sq.some(q=>q.task==='rit'||q.task==='ritgo')){
  const r=free.find(q=>q.ty!=='ladder'&&q.ty!=='robot'&&!q.vol&&!q.sdb&&!tacIn(q)&&q.ty!=='pump')||free.filter(q=>q.ty==='pump'&&!tacIn(q)&&!q.line).pop();
  if(r&&tacOrder(inc,r,'rit',-1,0,1)){take(r);radio(inc,r.cs,'依標準作業編成 RIT，於入口待命。')}}
 // 安全：RIT、MAYDAY、閃燃前兆撤出
 if(M.safety){
  // 發現悶燒缺氧（門縫冒黑煙、煙往內吸）的空間：ROE 改為門控進入
  if((B.roe||'force')==='force'&&!B.roeSet&&((B.T&&B.T.away)||B.cells.some(x=>tacVL(x)&&(x.dcw||x.srch>=1||x.rep)))){B.roeSet=1;B.roe='dctrl';radio(inc,'安全官','發現悶燒缺氧的空間，各組改採門控進入，開門前先射水降溫，避免爆燃！')}
  if(!B.sq.some(q=>q.task==='rit'||q.task==='ritgo')&&B.sq.length>=3){
   // 侷限空間：救助組要下人孔救人，RIT 改由其他小組編成
   const pit=B.sc&&B.sc.k==='pit',r=(pit?null:free.find(q=>q.ty==='resc'&&!tacIn(q)))||free.find(q=>q.ty==='pump'&&!tacIn(q)&&!q.line);
   if(r){tacOrder(inc,r,'rit',-1,0,1);radio(inc,r.cs,'奉安全官指派編成 RIT，於入口待命。');take(r)}}
  if(B.mayday&&!B.sq.some(q=>q.task==='ritgo')){
   const dn=B.sq.find(q=>q.down);
   const r=dn&&B.sq.filter(q=>!q.down&&q.ty!=='ladder'&&q.ty!=='robot'&&q.air>.45&&q.task!=='carry'&&q.task!=='station')
    .sort((a,b)=>(Math.abs(a.f-dn.f)+Math.abs(a.c-dn.c))-(Math.abs(b.f-dn.f)+Math.abs(b.c-dn.c)))[0];
   if(r){tacOrder(inc,r,'rit',-1,0,1);radio(inc,r.cs,'轉任 RIT，前往救援 '+dn.cs+'。');take(r)}}
  for(const q of B.sq){if(!tacIn(q)||q.down||q.ty==='robot'||q.task==='exit'||q.task==='carry'||q.task==='ritgo')continue;
   const x=tacCel(B,q.f,q.c),prot=q.task==='attack'&&q.line&&q.pf>.3&&q.f===q.tf&&q.c===q.tc;
   // 化學品濃度超過防護等級：撤出
   if((x.hz||0)>tacPPEx(q,q.task)&&q.task!=='exit'){q.prev=null;q.task='exit';q.tf=-1;q.tc=0;radio(inc,'安全官',tacNm(B,q.f,q.c)+'化學品濃度超過'+q.cs+'的防護等級，立即撤出！');continue}
   // 地下室熱煙排不出去，閃燃前兆的門檻較低
   const ub=q.f<B.bf?.12:0;
   if(!prot&&!x.fl&&((x.h>.7-ub&&x.s>.6-ub)||(tacLayV(x)<.15&&x.h>.65&&x.layD<0))){q.prev=null;q.task='exit';q.tf=-1;q.tc=0;radio(inc,'安全官',tacNm(B,q.f,q.c)+'出現閃燃前兆（煙層下降、溫度急升），'+q.cs+' 立即撤出！')}}}
 // 水源：佔水、送水口、鄰棟防護
 let spare=tacCapAll(inc,B)-B.sq.filter(q=>q.line).length;
 if(M.water){
  if(!tacHydOK(inc,B)&&!B.sq.some(q=>q.tmv&&q.tgt===B.hyd.side)){
   const p=free.find(q=>q.ty==='pump'&&!tacIn(q)&&!tacCanSide(B,q,B.hyd.side));
   if(p&&tacTruck(inc,B,p,B.hyd.side)){take(p);radio(inc,p.cs,'前往'+TAC_SDN[B.hyd.side]+'側'+tacHydN(B)+(B.hyd.draft?'吸水。':'佔水。'))}}
  if(B.sp&&!B.sp.on&&B.of-B.bf>=2&&!B.sq.some(q=>q.task==='stand')){
   const p=free.find(q=>q.ty==='pump'&&!tacIn(q)&&!tacCan(B,q,'stand',-1,0));
   if(p&&tacOrder(inc,p,'stand',-1,0,1)){take(p);radio(inc,p.cs,'前往'+TAC_SDN[B.sp.side]+'側送水口加壓。')}}
  for(const sd of Object.keys(B.exp)){
   if(B.exp[sd]<.35||B.expL[sd]||spare<=0||B.sq.some(q=>q.task==='cover'&&q.cside===sd))continue;
   const p=free.find(q=>q.ty==='pump'&&!tacIn(q)&&!q.line);
   if(p&&tacOrder(inc,p,'cover',-1,0,1,sd)){take(p);spare--}}}
 if(M.attack&&B.wild)tacWildAI(inc,B,free,take,spare);
 // 化災（AI）：開設除污站；化災應變隊或化災組換上足夠的防護後辨識、止漏；油料外洩由幫浦組關閉遮斷止漏
 if(M.attack&&B.chem){
  if(!B.chem.fuel&&(B.sq.some(q=>q.cont)||B.pts.some(p=>p.cont))&&!B.st.decon)tacStnOpen(inc,B,'decon',1);
  tacCbAI(inc,B,free,take);
  if(!B.chem.fuel&&!inc.epa&&EPA_K(inc.k))epaCall(inc,1);
  const lk=B.leak,rk={F:0,C:1,B:2,A:3};
  if(B.chem.fuel||B.chem.util){if(lk&&lk.on&&!lk.np&&!B.sq.some(y=>y.task==='plug')){const r=free.find(q=>(q.ty==='pump'||q.ty==='resc'||q.ty==='hazmat'||q.ty==='vent')&&!tacIn(q)&&!q.line);
    if(r&&tacOrder(inc,r,'plug',lk.f,lk.c,1)){take(r);radio(inc,r.cs,'前往'+tacNm(B,lk.f,lk.c)+(B.chem.fuel?'關閉緊急遮斷閥止漏。':'關斷氣源。'))}}}
  else{const who=free.find(q=>q.epa)||free.find(q=>q.ty==='hazmat'&&!tacIn(q));
   if(who&&lk&&(!B.chemK||lk.on)){const need=B.chemK?['','C','B','A'][B.chem.lv]:'A';
    if(rk[who.ppe||'F']<rk[need]){if(tacPPE(inc,B,who,need,1))take(who)}
    else if(tacOrder(inc,who,B.chemK?'plug':'ident',lk.f,lk.c,1))take(who)}}}
 // 氣體偵測（AI）：悶燒、鋰電池、瓦斯外洩、住警器等案件，先派一組到起火點量測
 tacScAI(inc,B,free,take,M);
 if(M.stn)tacSysAI(inc,B);
 if(M.water)tacRelayAI(inc,B,free,take);
 if(M.attack||M.safety)tacBvAI(inc,B,free,take);
 if(M.attack&&!B.aiGas&&(B.T.away||B.T.li||B.T.smk||B.T.elder||B.gasL||B.k==='chemfire'||(B.sc&&B.chem&&B.chem.util))){
  const r=free.find(q=>(q.ty==='resc'||q.ty==='vent')&&!tacIn(q))||free.find(q=>q.ty==='pump'&&!tacIn(q)&&!q.line);
  if(r&&tacOrder(inc,r,'gas',B.of,B.oc,1)){B.aiGas=1;take(r);radio(inc,r.cs,'攜五用氣體偵測器前往'+tacNm(B,B.of,B.oc)+'量測。')}}
 // 進入（AI）：入口都上鎖時先派救助組破壞；人手夠時派一組門控主入口
 if(M.attack){
  if(B.ents.length&&B.ents.every(e=>e.lock)&&!B.sq.some(y=>y.task==='force')){
   const r=free.find(q=>q.ty==='resc'&&!tacIn(q))||free.find(q=>q.ty!=='ladder'&&q.ty!=='robot'&&!tacIn(q)&&!q.line);
   const e=r&&B.ents.slice().sort((a,b)=>tacWalk(r.side,a.side)-tacWalk(r.side,b.side))[0];
   if(r&&e&&tacOrder(inc,r,'force',-1,0,1,e.side))take(r)}
 }
 // 進入建物前先編成 RIT（2 進 2 出）；人手不足時最多等 45 秒，已知有受困者時立即進入
 const entryOK=B.sq.some(q=>q.task==='rit'||q.task==='ritgo')||S.t-B.t0>45||B.cells.some(x=>x.vic>0&&(x.rep||x.rub||x.srch>=1))||!M.safety;
 // 兩座樓梯（AI）：離火點較遠的一座為避難梯，派員關上起火層與上一層避難梯的防火門
 if(M.attack&&B.fd&&B.of>=B.bf){const st=B.L.N.filter(n=>n.ty==='stair');
  if(st.length>1){if(B.evS===undefined)B.evS=st.slice().sort((a,b)=>tacGd(B,b.c,B.oc)-tacGd(B,a.c,B.oc))[0].c;
   for(const f of[B.of,B.of+1]){if(f>=B.F||(B.evC&&B.evC[f]))continue;
    const bad=[...B.fd.values()].some(d=>d.f===f&&d.s===B.evS&&d.t!=='auto'&&d.t!=='gone');if(!bad)continue;
    const r=free.find(q=>(q.ty==='resc'||q.ty==='vent'||q.ty==='hazmat')&&!q.line);
    if(r&&tacOrder(inc,r,'dctrl',f,B.evS,1)){(B.evC||(B.evC={}))[f]=1;take(r);radio(inc,r.cs,tacFlr(B,f)+'避難梯防火門關閉，確保避難路線無煙。')}}}}
 for(const q of free.slice()){
  // 殘火處理（AI）：同層沒有火點了，就翻搜有餘燼的房間
  if(M.attack&&q.ty!=='ladder'&&q.ty!=='robot'){
   const em=B.cells.filter(x=>x.emb&&x.h<.05&&!B.sq.some(y=>y!==q&&y.task==='overhaul'&&y.tf===x.f&&y.tc===x.c))
    .sort((a,b)=>Math.abs(a.f-(q.f<0?B.bf:q.f))-Math.abs(b.f-(q.f<0?B.bf:q.f)));
   const fireOnFloor=q.f>=0&&burning.some(x=>x.f===q.f);
   if(em.length&&!fireOnFloor&&(q.ty!=='pump'||!burning.length||q.task==='hold')&&tacOrder(inc,q,'overhaul',em[0].f,em[0].c,1))continue}
  // 救人優先（AI）：已知有受困者（民眾指稱、瓦礫、已發現）而搜救人手不足時，沒分到水線的幫浦組先去救人
  if(M.attack&&M.search&&q.ty==='pump'&&!q.line&&!tacIn(q)&&entryOK){
   const kv=B.cells.filter(x=>(tacPinFree(x)>0&&(x.srch>=1||x.rep||x.rub))&&x.h<.45&&!B.sq.some(y=>y!==q&&(y.task==='search'||y.task==='search2')&&y.tf===x.f&&y.tc===x.c));
   const nS=B.sq.filter(y=>y.task==='search'||y.task==='carry').length;
   const kt=kv.length&&nS<kv.length+1?kv.slice(0,4).find(t=>tacOrder(inc,q,'search',t.f,t.c,1)):null;
   if(kt){radio(inc,q.cs,'救人優先，前往'+tacNm(B,kt.f,kt.c)+'搜救。');continue}}
  // 攻擊（AI 指揮）
  if(M.attack&&(q.ty==='pump'||q.ty==='robot')&&(spare>0||q.line)&&(entryOK||tacIn(q))){
   // 有受困者的空間優先壓制（先救人：把通往受困者的火打掉）
   const nearV=x=>B.cells.some(y=>y.f===x.f&&y.vic>0&&(y.srch>=1||y.rep||y.rub)&&(y.c===x.c||B.L.N[x.c].nb.includes(y.c)))?0:1;
   const ts=burning.slice().sort((a,b)=>nearV(a)-nearV(b)).filter(x=>!B.sq.some(y=>y!==q&&y.task==='attack'&&y.tf===x.f&&y.tc===x.c)&&!((x.hz||0)>=2&&(q.ppe||'F')==='F'));
   if(q.ty==='pump'&&!tacIn(q)&&!q.line&&ts.length&&!(B.hyd&&q.tside===B.hyd.side&&B.sq.filter(x=>x.ty==='pump'&&x.tside===B.hyd.side).length<2)){
    const t=ts[0],bs=tacBestSide(B,q,t.f,t.c),cur=tacLineTo(B,q,t.f,t.c);
    if(bs&&bs.side!==q.tside&&(!cur||cur.len-bs.len>=3)&&!(cur&&cur.src==='sp')){tacTruck(inc,B,q,bs.side,1);radio(inc,q.cs,'移車至'+TAC_SDN[bs.side]+'側，縮短水帶佈線。');continue}}
   // 地面兩層的猛烈火點：先從窗外過渡射水再入室
   const t0=ts[0];
   // 1F～3F 已全面燃燒、室內沒有小組：先以車頂砲塔快速壓制（占兩條水線）
   if(q.ty==='pump'&&!tacIn(q)&&t0&&t0.h>.75&&spare>=2&&!B.sq.some(y=>y.task==='sky'||(tacIn(y)&&y.f===t0.f))&&!tacCan(B,q,'sky',t0.f,t0.c)&&tacOrder(inc,q,'sky',t0.f,t0.c,1)){
    radio(inc,q.cs,'火勢猛烈，以車頂砲塔對'+tacNm(B,t0.f,t0.c)+'快速壓制。');spare-=2;continue}
   if(q.ty==='pump'&&!tacIn(q)&&t0&&t0.h>.5&&!tacCan(B,q,'trans',t0.f,t0.c)&&!B.sq.some(y=>y.task==='trans')&&tacOrder(inc,q,'trans',t0.f,t0.c,1)){spare--;continue}
   let ok=false;for(const t of ts)if(tacOrder(inc,q,'attack',t.f,t.c,1)){ok=true;break}
   if(ok){if(!q.line)spare--;continue}}
  // 水霧排煙（AI）：守線組所在空間濃煙仍重，又有窗可開
  if(M.attack&&q.task==='hold'&&q.line&&tacIn(q)&&tacCel(B,q.f,q.c).s>.5&&!tacCan(B,q,'hydro',q.f,q.c)&&tacOrder(inc,q,'hydro',q.f,q.c,1))continue;
  // 門控（AI）：水線不夠打所有火點時，派非幫浦組到火點旁的走廊把門關上控住
  if(M.attack&&(q.ty==='resc'||q.ty==='vent')&&spare<=0&&burning.length>B.sq.filter(y=>y.line).length+1){
   const fl=burning[0].f;B.confF=B.confF||{};
   if(!B.confF[fl]){const hn=B.L.N.find(n=>n.ty==='hall'&&n.nb.some(o=>tacCel(B,fl,o).h>.1)&&tacCel(B,fl,n.c).h<.1);
    if(hn&&tacOrder(inc,q,'dctrl',fl,hn.c,1)){B.confF[fl]=1;continue}}}
  // 排煙（AI 指揮）：配合射水破窗、正壓排煙
  if(M.attack&&q.ty==='vent'){
   const atk=B.sq.find(y=>y.task==='attack'&&y.line&&y.f===y.tf&&y.c===y.tc&&tacIn(y)&&y.f>=B.bf);
   if(atk&&B.L.N[atk.c].wins&&!tacCel(B,atk.f,atk.c).v&&tacOrder(inc,q,'vent',atk.f,atk.c,1))continue;
   if(atk&&!B.ppv&&!tacIn(q)&&tacOrder(inc,q,'ppv',-1,0,1))continue;
   // 沒有火的空間濃煙仍重：在有窗的房間負壓排煙
   const sm=B.cells.filter(x=>x.ty==='room'&&x.f>=B.bf&&x.s>.6&&x.h<.1&&B.L.N[x.c].wins&&!B.npvS.has(x.f*B.W+x.c)).sort((a,b)=>b.s-a.s)[0];
   if(!atk&&sm&&tacOrder(inc,q,'npv',sm.f,sm.c,1))continue}
  // 搜索：救助組（AI 指揮時幫浦組與排煙組也會搜）
  if(M.search&&(entryOK||tacIn(q))&&(q.ty==='resc'||(M.attack&&(q.ty==='pump'||q.ty==='vent')))){
   // 屋頂避難民眾：救助組優先，現場沒有救助組時由其他小組上屋頂
   if(B.roofV&&!B.roofS&&!B.sq.some(y=>y.task==='roofres')&&(q.ty==='resc'||!B.sq.some(y=>y.ty==='resc'&&!y.down&&free.includes(y)))&&tacOrder(inc,q,'roofres',B.F-1,0,1))continue;
   if(B.roofS&&B.roofV>0&&!B.sq.some(y=>y.task==='roofres')&&tacOrder(inc,q,'roofres',B.F-1,0,1))continue;
   const un=B.cells.filter(x=>(x.ty==='room'&&x.sl<1||tacPinFree(x)>0)&&x.h<.45&&!((x.hz||0)>tacPPEx(q,'search'))&&!B.sq.some(y=>y!==q&&y.task==='search'&&y.tf===x.f&&y.tc===x.c));
   // 搜索順序：受困通報樓層 → 起火層 → 上一層 → 下一層，再往外擴（上方略優先）
   const pri=x=>(x.vic>0&&x.srch>=1?-30:0)+(x.rep?-15:0)+(x.rub?-12:0)+(x.f===B.hint?-20:0)+Math.abs(x.f-B.of)-(x.f>B.of?.5:0)+tacGd(B,0,x.c)*.1;
   un.sort((a,b)=>pri(a)-pri(b));
   if(un.slice(0,6).some(t=>tacOrder(inc,q,'search',t.f,t.c,1)))continue;
   // 初搜都做完但人數還對不上：次級搜索（起火層與上方優先）
   let found=B.resc+B.lost+B.roofV;for(const x of B.cells)found+=x.vic;for(const y of B.sq)found+=y.carry;
   if(!un.length&&found<B.vtot){
    const s2=B.cells.filter(x=>x.ty==='room'&&x.sl===1&&x.h<.45&&!B.sq.some(y=>y!==q&&y.task==='search2'&&y.tf===x.f&&y.tc===x.c)).sort((a,b)=>pri(a)-pri(b)-((a.ps||0)-(b.ps||0))*6);
    // 次級搜索：初搜時煙最濃的房間最可能漏人，優先複查
    if(s2.slice(0,6).some(t=>tacOrder(inc,q,'search2',t.f,t.c,1)))continue}}
  // 雲梯：窗口救援、屋頂救援（搜救組長或 AI）；屋頂排煙與外部射水（AI）
  if(q.ty==='ladder'&&(M.search||M.attack)){
   const reach=TAC_LADR[q.code]||7;
   if(B.roofV>0&&!B.sq.some(y=>y.task==='roofres'&&y.ty==='ladder')&&tacOrder(inc,q,'roofres',B.F-1,0,1))continue;
   const v=B.cells.find(x=>x.ty==='room'&&x.f>=B.bf&&x.f-B.bf<reach&&x.vic>0&&x.srch>=1);
   if(v&&tacOrder(inc,q,'ladder',v.f,v.c,1))continue;
   if(M.attack){
    const top=tacCel(B,B.F-1,0);
    if(!B.roof&&top.s>.5&&B.F-1-B.bf<reach&&tacOrder(inc,q,'roof',B.F-1,0,1))continue;
    // 屋頂光電板、外牆室外機：雲梯射水
    if(spare>0&&B.rf&&B.rf.h>0&&!B.sq.some(y=>y.task==='master'&&y.lf===B.F-1)){const tr=B.L.N.find(n=>n.ty==='room'&&n.wins&&!tacCan(B,q,'master',B.F-1,n.c));
     if(tr&&tacOrder(inc,q,'master',B.F-1,tr.c,1)){spare--;continue}}
    if(spare>0&&B.ext&&B.ext.h>0&&!B.sq.some(y=>y.task==='master'&&y.lf===B.ext.f)&&tacOrder(inc,q,'master',B.ext.f,B.ext.c,1)){spare--;continue}
    const ex=burning.find(x=>x.ty==='room'&&x.f>=B.bf&&x.f-B.bf<reach&&!B.sq.some(y=>tacIn(y)&&y.f===x.f));
    if(ex&&spare>0&&tacOrder(inc,q,'master',ex.f,ex.c,1)){spare--;continue}}}
  // 室內沒事做：退回屋外待命（AI 指揮）
  if(M.attack&&tacIn(q)&&q.task==='idle')tacOrder(inc,q,'exit',-1,0,1)}}
