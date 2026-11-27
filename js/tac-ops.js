// 戰術指揮的現場後勤：站點開設（需對應車輛或人員量能）、救護分流（檢傷、等待、後送）、職務指派
'use strict';
// 站點：需要的車種（u 為擔任的單位；media 可由到場警方擔任）、名稱、效果說明
const TAC_STN=[
 {k:'icp',n:'指揮站',need:'指揮車',codes:['41'],fx:'作業效率 +15%；每輛指揮車提供 2 名幕僚可指派職務'},
 {k:'stage',n:'待命集結區',need:'指揮車或一組幫浦組',codes:['41','11','16','57'],fx:'新到小組在集結區整裝即可派用；幫浦組不足時自動請求增援'},
 {k:'air',n:'氣瓶充填區',need:'救助器材車（氣瓶灌充機）',codes:['71'],fx:'換瓶 3 秒、不限數量；未開設時每組只有 2 支備用瓶，用完換瓶要 25 秒'},
 {k:'rehab',n:'後勤照護區',need:'救護車一輛',codes:['91'],fx:'隊員休息、補水與生命徵象監測，疲勞恢復快 5 倍'},
 {k:'triage',n:'救護檢傷站',need:'救護車一輛',codes:['91'],fx:'依傷勢優先後送；裝載較快；紅色傷患惡化減緩'},
 {k:'treat',n:'救護醫療站',need:'有 EMT-P 的救護車',codes:['91'],tp:1,fx:'等待後送的傷患惡化減為三成'},
 {k:'fwd',n:'前進指揮所',need:'指揮站已開設，五層以上建物，且一組屋外待命的幫浦或救助組',codes:['11','16','57','71','搜'],fx:'設在起火層下兩層、備用氣瓶 8 支：低壓的小組就近換瓶休息，不必下到一樓'},
 {k:'decon',n:'除污站',need:'化災車或環保署化災應變隊',codes:['51','01'],fx:'受化學污染的小組除污 25 秒後才能再派；化災應變隊到場可代為設置'},
 {k:'media',n:'聯訪處',need:'指揮站已開設，且警方到場或另一輛指揮車',codes:['41','警'],fx:'統一對媒體與家屬發布，避免扣評鑑；結案評鑑 +2'}];
const TAC_ROLE=[
 {k:'safety',n:'安全官',fx:'在入口設置人員管制板（之後才看得到各組氣量）；自動編成 RIT、MAYDAY 時派員救援、閃燃前兆時撤出小組'},
 {k:'water',n:'水源組長',fx:'自動佔水、送水口加壓、鄰棟周界防護'},
 {k:'search',n:'搜救組長',fx:'自動派閒置的救助組搜索、雲梯救援窗口與屋頂受困者'},
 {k:'ems',n:'救護組長',fx:'自動請求救護車、開設檢傷站與醫療站'}];
const tacStnDef=k=>TAC_STN.find(x=>x.k===k);
// 某單位是否已被站點佔用
const tacStnBusy=(B,uid)=>Object.values(B.st).some(s=>s&&s.u===uid);
// 可擔任站點的單位：小組須在屋外閒置；救護車不能正在裝載後送
function tacStnPick(inc,B,k){
 const d=tacStnDef(k);
 if(k==='media'&&!B.st.icp)return{why:'需先開設指揮站'};
 if(k==='media'&&inc.pol===2)return{u:null};
 if(k==='fwd'&&(!B.st.icp||B.F-B.bf<5))return{why:!B.st.icp?'需先開設指揮站':'五層以上建物才需要'};
 if(k==='decon'){const e=B.sq.find(q=>q.epa&&!tacIn(q)&&q.task==='idle');if(e)return{u:e.u}}
 for(const code of d.codes)for(const u of onScene(inc)){
  if(u.code!==code||u.st!=='work'||tacStnBusy(B,u.id)||u.load)continue;
  if(d.tp&&!u.tp)continue;
  const q=B.sq.find(x=>x.u===u.id);
  if(q&&(tacIn(q)||q.down||(q.task!=='idle'&&q.task!=='rit')||q.tmv))continue;
  return{u:u.id}}
 return{why:'需要'+d.need}}
function tacStnOpen(inc,B,k,quiet){
 if(B.st[k])return true;
 const r=tacStnPick(inc,B,k);
 if(r.why){if(!quiet)msg=tacStnDef(k).n+'：'+r.why;return false}
 B.st[k]={u:r.u,side:B.arr,t:S.t};
 const q=B.sq.find(x=>x.u===r.u);if(q){q.task='station';q.stn=k;q.prev=null}
 tacEvt(inc,B,'milestone','開設'+tacStnDef(k).n);
 if(k==='fwd'&&q){B.fwd={f:B.fwdF,stock:8};q.task='fwdgo';q.tf=B.fwd.f;q.tc=0;q.ent=null;
  radio(inc,q.cs,'攜帶備用氣瓶前往'+tacFlr(B,B.fwd.f)+'設置前進指揮所。');return true}
 const u=S.units.find(x=>x.id===r.u);
 radio(inc,u?u.cs:q?q.cs:'110',tacStnDef(k).n+'開設完成'+(u||q?'，由本車人員負責':'，由到場警方協助')+'。');
 return true}
function tacStnClose(inc,B,k,why){
 const s=B.st[k];if(!s)return;
 delete B.st[k];
 const q=B.sq.find(x=>x.u===s.u);if(q&&(q.task==='station'||q.task==='fwdgo')){q.task='idle';q.stn=null}
 if(k==='fwd')B.fwd=null;
 radio(inc,'受理',tacStnDef(k).n+(why||'撤除')+'。');
 if(k==='icp')for(const r in B.role)B.role[r]=0}
// 職務名額：指揮站開設後，每輛在場指揮車 2 名
function tacRoleSlots(inc,B){
 if(!B.st.icp)return 0;
 return onScene(inc).filter(u=>u.code==='41'&&u.st==='work').length*2}
function tacRoleSet(inc,B,k,on){
 if(on&&!B.role[k]){const used=Object.values(B.role).filter(Boolean).length;
  if(used>=tacRoleSlots(inc,B)){msg=B.st.icp?'幕僚不足：每輛指揮車只能提供 2 名幕僚':'需先開設指揮站';return}
  B.role[k]=1;radio(inc,'受理','指派'+TAC_ROLE.find(x=>x.k===k).n+'。')}
 else if(!on&&B.role[k]){B.role[k]=0;radio(inc,'受理','解除'+TAC_ROLE.find(x=>x.k===k).n+'。')}}
// 人員管制板：安全官就位約 10 秒後在入口設好，才能掌握各組入室時間與氣量
const tacAcc=B=>!!(B.role.safety&&B.accT>=10);
// 每幀：站點人員仍在場、聯訪處、集結區增援、人員管制板
function tacStnStep(inc,B,dt){
 if(B.role.safety){const was=B.accT||0;B.accT=was+dt;
  if(was<10&&B.accT>=10){const e=B.ents.find(x=>x.side===B.arr)||B.ents[0];
   radio(inc,'安全官','已於'+(e?TAC_SDN[e.side]+'側':'')+'入口設置人員管制板，開始登錄各組入室時間與氣量。');tacEvt(inc,B,'milestone','設置人員管制板')}}
 else B.accT=0;
 for(const k of Object.keys(B.st)){const s=B.st[k];if(!s)continue;
  if(s.u!==null&&!B.sq.some(q=>q.epa&&q.u===s.u)){const u=S.units.find(x=>x.id===s.u);if(!u||u.inc!==inc.id||u.st!=='work')tacStnClose(inc,B,k,'人員離場，站點關閉')}
  else if(k==='media'&&inc.pol!==2)tacStnClose(inc,B,k,'警方離場，關閉')}
 // 沒有聯訪處：有受困者的案件，媒體與家屬聚集，每 90 秒扣評鑑（最多 4 次）
 if(B.vtot&&!B.st.media&&!B.done){B.mediaT=(B.mediaT||60)-dt;
  if(B.mediaT<=0){B.mediaT=90;if((B.mediaN||0)<4){B.mediaN=(B.mediaN||0)+1;S.rep-=1;
   radio(inc,'受理','媒體與家屬在封鎖線外聚集詢問，現場沒有聯訪處統一發布（評鑑 -1）。')}}}
 // 集結區：沒有屋外待命的幫浦組又還有火點，請求增派一輛幫浦車
 if(B.st.stage){B.stgT=(B.stgT||20)-dt;
  if(B.stgT<=0){B.stgT=60;
   const burning=B.cells.some(x=>x.h>.1),spare=B.sq.some(q=>q.ty==='pump'&&!tacIn(q)&&q.task==='idle'&&!q.tmv);
   if(burning&&!spare&&!inc.req){inc.req={t:'need',s:'集結區已無待命幫浦組，請求增派幫浦車一輛。',c:'11',als:0,cs:'集結區'};inc.reqT=22;
    radio(inc,'集結區','集結區已無待命幫浦組，請求增派幫浦車一輛。')}}}}
// 救出的受困者：依受困時的狀況檢傷（紅、黃、綠），在傷患集結處等待救護車後送
function tacPatient(inc,B,vh,who){
 const sev=vh<.45?'red':vh<.8?'yellow':'green';
 B.pts.push({id:B.pid=(B.pid||0)+1,sev,hp:Math.min(1,vh+.15),t:S.t});B.resc++;
 tacEvt(inc,B,'victim','救出受困者 1 名（'+{red:'紅',yellow:'黃',green:'綠'}[sev]+'）');
 radio(inc,who||'現場','救出受困者 1 名（'+{red:'紅色・危急',yellow:'黃色・嚴重',green:'綠色・輕傷'}[sev]+'），送至傷患集結處。')}
const TAC_SEVN={red:'紅',yellow:'黃',green:'綠'},TAC_SEVP={red:0,yellow:1,green:2};
function tacEMS(inc,B,dt){
 // 等待中惡化：醫療站處置可大幅減緩，檢傷站也能減緩紅色
 for(const p of B.pts.slice()){
  let r=p.sev==='red'?.006:p.sev==='yellow'?.0018:0;
  if(B.st.treat)r*=.3;else if(B.st.triage&&p.sev==='red')r*=.75;
  p.hp-=dt*r;
  if(p.sev==='yellow'&&p.hp<.4){p.sev='red';radio(inc,'救護組','一名黃色傷患惡化為紅色。')}
  if(p.hp<=0){B.pts.splice(B.pts.indexOf(p),1);B.lost++;B.dws=(B.dws||0)+1;S.rep-=3;
   radio(inc,'救護組','一名傷患在現場等待後送期間死亡（評鑑 -3）。');tacEvt(inc,B,'danger','傷患等待後送期間死亡');if(S.rep<=0){S.rep=0;S.over=true}}}
 // 救護車裝載與後送
 for(const u of onScene(inc)){
  if(u.code!=='91'||u.st!=='work'||tacStnBusy(B,u.id))continue;
  if(u.load>0){u.load-=dt;
   if(u.load<=0){u.load=0;const th=toHosp(u);
    if(th.p){const n=u.carryP.length,red=u.carryP.some(p=>p.sev==='red');
     u.path=th.p;u.st='tx';u.txT=0;unpark(u);u.inc=null;B.tx=(B.tx||0)+n;
     tacEvt(inc,B,'victim',u.cs+' 載運傷患 '+n+' 名送醫');
     radio(inc,u.cs,'載運傷患 '+n+' 名'+(red?'（紅色）':'')+'離開現場，前往'+(th.h?th.h.n:'醫院')+'。')}
    else{B.pts.push(...u.carryP)}
    u.carryP=null}
   continue}
  if(!B.pts.length)continue;
  // 有檢傷站才依傷勢排序，否則照救出先後
  const q=B.st.triage?B.pts.slice().sort((a,b)=>TAC_SEVP[a.sev]-TAC_SEVP[b.sev]||a.t-b.t):B.pts.slice();
  const take=[q[0]];
  if(q[0].sev!=='red'&&q[1]&&q[1].sev!=='red')take.push(q[1]);
  for(const p of take)B.pts.splice(B.pts.indexOf(p),1);
  u.carryP=take;u.load=B.st.triage?4:7}
 B.ambT=(B.ambT||0)-dt}
// 請求救護車（玩家按鈕或救護組長自動）
function tacAmbReq(inc,B,quiet){
 if(inc.req){if(!quiet)msg='已有一則現場請求等待回覆';return false}
 const red=B.pts.some(p=>p.sev==='red');
 inc.req={t:'need',s:'現場傷患 '+B.pts.length+' 名待送醫，請求增派救護車'+(red?'（含 EMT-P）':'')+'。',c:'91',als:red?1:0,cs:'救護組'};inc.reqT=22;
 radio(inc,'救護組',inc.req.s);B.ambT=40;return true}
const tacAmbFree=(inc,B)=>onScene(inc).filter(u=>u.code==='91'&&u.st==='work'&&!tacStnBusy(B,u.id)&&!u.load).length;
// 現場民眾：剛到場時有避難出來的住戶或管理員可詢問屋內資訊（答案可能不完全正確）
const TAC_ASK=[
 {k:'who',q:'裡面還有人嗎？在哪裡？'},{k:'fire',q:'火是從哪裡燒起來的？'},{k:'gas',q:'裡面有瓦斯桶或危險物品嗎？'},
 {k:'lock',q:'門有沒有鎖？有鑰匙嗎？'},{k:'layout',q:'樓上住幾戶？樓梯在哪？'}];
function tacCivInit(inc,B){B.civ={n:1+(Math.random()<.5?1:0),asked:{},until:S.t+240}}
const tacCivOn=B=>B.civ&&S.t<B.civ.until&&Object.keys(B.civ.asked).length<TAC_ASK.length;
function tacAsk(inc,B,k){
 if(!tacCivOn(B)||B.civ.asked[k])return;B.civ.asked[k]=1;
 const say=s=>inc.log.push({w:'民',s:'（現場民眾）'+s,t:S.t-inc.t0}),Q=TAC_ASK.find(x=>x.k===k).q;
 inc.log.push({w:'場',s:'（現場指揮官）'+Q,t:S.t-inc.t0});
 if(k==='who'){
  const rs=B.cells.filter(x=>x.ty==='room'&&x.vic+x.hid>0),told=[];
  for(const x of rs)if(Math.random()<.75){x.rep=1;told.push(tacNm(B,x.f,x.c))}
  if(Math.random()<.15){const x=pick(B.cells.filter(y=>y.ty==='room'&&!y.vic&&!y.hid));if(x){x.rep=1;told.push(tacNm(B,x.f,x.c))}}
  if(B.roofV)told.push('頂樓屋頂（有人往上跑）');
  say(told.length?'我知道還有人在'+told.join('、')+'，拜託快去救！':B.hoax?'應該沒有人，我們都出來了，我也沒看到火。':'我們這戶都出來了，其他人我不確定。')}
 else if(k==='fire'){
  if(B.hoax){say('我沒看到火，只是聞到怪味道，有人說那層在冒煙。');return}
  const oc=Math.random()<.85?B.oc:(B.L.N[B.oc].nb.find(o=>B.L.N[o].ty==='room')||B.oc);B.ocKnown=1;
  const nm=tacNm(B,B.of,oc);say('是從'+nm+(tacK(B,B.of,oc)==='kitchen'&&!nm.includes('廚房')?'（廚房）':'')+'那邊燒起來的，煙很大。')}
 else if(k==='gas'){
  if(B.gas!==undefined){B.gasK=1;say('有！'+tacNm(B,B.gasF,B.gas)+'有一桶瓦斯，你們要小心。')}
  else say('應該沒有，這棟都是天然氣管線。')}
 else if(k==='lock'){
  for(const e of B.ents)e.known=1;
  const lk=B.ents.filter(e=>e.lock);
  if(!lk.length){say('門都沒鎖，可以直接進去。');return}
  if(Math.random()<.5){const e=lk[0];e.lock=0;say(TAC_SDN[e.side]+'側的鐵捲門我有遙控器，我幫你們打開。'+(lk.length>1?'其他門是鎖著的。':''))}
  else say(lk.map(e=>TAC_SDN[e.side]+'側').join('、')+'的門是鎖著的，我沒有鑰匙。')}
 else if(k==='layout'){
  say('這棟'+(B.F-B.bf)+'層'+(B.bf?'、還有地下室':'')+'，每層大概 '+Math.max(1,Math.round(B.R/2))+' 戶，樓梯在'+TAC_SDN.w+'邊'+(B.sp?'，一樓外面有送水口':'')+'。')}}
// 瓦斯桶：火燒到時爆炸，波及本室與相鄰空間
function tacGas(inc,B){
 if(B.gas===undefined||B.gasX)return;
 const x=tacCel(B,B.gasF,B.gas);if(x.h<.75||x.wet)return;
 B.gasX=1;x.h=1;x.fl=1;
 for(const o of B.L.N[B.gas].nb){const y=tacCel(B,B.gasF,o);y.h=Math.min(1,Math.max(y.h,.4)+.3)}
 radio(inc,'安全官',tacNm(B,B.gasF,B.gas)+'桶裝瓦斯爆炸！');tacEvt(inc,B,'danger',tacNm(B,B.gasF,B.gas)+'瓦斯桶爆炸',1);
 for(const q of B.sq)if(tacIn(q)&&q.f===B.gasF&&(q.c===B.gas||B.L.N[B.gas].nb.includes(q.c))&&q.ty!=='robot'&&!q.down){q.hp=Math.max(.1,q.hp-.45);if(q.hp<.3)tacDown(inc,B,q,'瓦斯爆炸')}}
