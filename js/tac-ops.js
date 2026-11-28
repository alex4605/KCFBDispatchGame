// 戰術指揮的現場後勤：站點開設（需對應車輛或人員量能）、救護分流（檢傷、等待、後送）、職務指派
'use strict';
// 站點：需要的車種（u 為擔任的單位；media 可由到場警方擔任）、名稱、效果說明
const TAC_STN=[
 {k:'icp',n:'指揮站',need:'指揮車或行動指揮車',codes:['指','41'],fx:'作業效率 +15%；每輛指揮車提供 2 名幕僚、行動指揮車（MCV）提供 4 名幕僚可指派職務'},
 {k:'stage',n:'待命集結區',need:'指揮站已開設，由一名幕僚開設（佔用一個幕僚名額）',codes:[],staff:1,fx:'新到小組直接在集結區整裝報到，約 3 秒即可派用；沒有集結區時，小組要先自行整裝、找入口交 passkey，約 20 秒後才能進入建物；幫浦組不足時自動請求增援'},
 {k:'air',n:'氣瓶充填區',need:'救助器材車（氣瓶灌充機）',codes:['71'],drv:1,fx:'任一輛救助器材車到場即由司機自動開設（不佔用救助組）；換瓶 3 秒、不限數量。未開設前每組只有車上 2 支備用瓶，用完就無法再換瓶'},
 {k:'rehab',n:'後勤照護區',need:'救護車一輛',codes:['91'],fx:'隊員休息、補水與生命徵象監測，疲勞恢復快 5 倍'},
 {k:'triage',n:'救護檢傷站',need:'救護車一輛',codes:['91'],fx:'依傷勢優先後送；裝載較快；紅色傷患惡化減緩'},
 {k:'treat',n:'救護醫療站',need:'有 EMT-P 的救護車',codes:['91'],tp:1,fx:'等待後送的傷患惡化減為三成'},
 {k:'fwd',n:'前進指揮所',need:'指揮站已開設，五層以上建物，且一組屋外待命的幫浦或救助組',codes:['11','16','57','71','搜'],fx:'設在起火層下兩層、備用氣瓶 8 支：低壓的小組就近換瓶休息，不必下到一樓'},
 {k:'decon',n:'除污站',need:'化災車或環保署化災應變隊',codes:['51','01'],fx:'設在上風處的暖區；可切換乾除污（快，蒸氣與粉末、遇水反應的化學品）或濕除污（液體、腐蝕性一定要）；一次一組，其餘排隊；受污染傷患要先除污才能送醫；化災應變隊到場可代為設置'},
 {k:'mdecon',n:'大量除污',need:'除污站已開設，且一輛屋外待命的幫浦車',codes:['11','16','57'],fx:'兩側消防車噴霧形成沖淋通道：受污染民眾與傷患每人約 4 秒、同時 3 人除污'},
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
 if(d.staff){if(!B.st.icp)return{why:'需先開設指揮站（由幕僚開設）'};if(tacStaffUsed(B)>=tacRoleSlots(inc,B))return{why:'幕僚不足（指揮車 2 名、行動指揮車 4 名）'};return{u:null,staff:1}}
 if(k==='decon'){const e=B.sq.find(q=>q.epa&&!tacIn(q)&&q.task==='idle');if(e)return{u:e.u}}
 if(k==='mdecon'&&!B.st.decon)return{why:'需先開設除污站'};
 for(const code of d.codes)for(const u of onScene(inc)){
  if(u.code!==code||u.st!=='work'||tacStnBusy(B,u.id)||u.load)continue;
  if(d.drv)return{u:u.id};                 // 由司機操作，不看小組狀態
  if(d.tp&&!u.tp)continue;
  const q=B.sq.find(x=>x.u===u.id);
  if(q&&(tacIn(q)||q.down||q.cont||(q.task!=='idle'&&q.task!=='rit')||q.tmv))continue; // 受污染的小組要先除污
  return{u:u.id}}
 return{why:'需要'+d.need}}
function tacStnOpen(inc,B,k,quiet){
 if(B.st[k])return true;
 const r=tacStnPick(inc,B,k);
 if(r.why){if(!quiet)msg=tacStnDef(k).n+'：'+r.why;return false}
 B.st[k]={u:r.u,side:B.arr,t:S.t,staff:r.staff||0};
 if(r.staff){tacEvt(inc,B,'milestone','開設'+tacStnDef(k).n);radio(inc,'指揮站',tacStnDef(k).n+'由幕僚於'+TAC_SDN[B.arr]+'側開設完成，後續到場小組至集結區報到。');return true}
 if(k==='air')B.airOff=0;
 if(tacStnDef(k).drv){const u=S.units.find(x=>x.id===r.u);tacEvt(inc,B,'milestone','開設'+tacStnDef(k).n);
  radio(inc,u?u.cs:'現場',(u?u.cs+'司機':'司機')+'開設氣瓶充填區，灌充機運轉，各組可前來換瓶。');
  for(const q of B.sq)if(q.refill==='none')q.refill=null;
  return true}
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
// 幕僚使用數：職務與由幕僚開設的站點（集結區）
const tacStaffUsed=B=>Object.values(B.role).filter(Boolean).length+TAC_STN.filter(d=>d.staff&&B.st[d.k]).length;
// 職務名額：指揮站開設後，每輛在場指揮車 2 名
function tacRoleSlots(inc,B){
 if(!B.st.icp)return 0;
 return onScene(inc).filter(u=>u.st==='work').reduce((a,u)=>a+(u.code==='41'?2:u.code==='指'?4:0),0)}
function tacRoleSet(inc,B,k,on){
 if(on&&!B.role[k]){
  if(tacStaffUsed(B)>=tacRoleSlots(inc,B)){msg=B.st.icp?'幕僚不足（指揮車 2 名、行動指揮車 4 名）':'需先開設指揮站';return}
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
 // 安全官無線電：偶爾詢問入室小組的入室時間與殘餘氣量（不影響遊戲，增加臨場感）
 if(tacAcc(B)&&!B.done){
  if(B.chat&&S.t>=B.chat.t){const q=B.sq.find(x=>x.u===B.chat.u);B.chat=null;
   if(q&&tacIn(q)&&!q.down){const p=Math.max(5,Math.round(q.air*100/5)*5),bar=Math.round(q.air*300/10)*10;
    radio(inc,q.cs,'收到，'+q.cs+' 在'+tacNm(B,q.f,q.c)+'，殘餘氣量約 '+bar+' bar（'+p+'%）'+(q.air<.5?'，準備撤出換瓶。':'，繼續作業。'))}}
  B.chatT=(B.chatT===undefined?45:B.chatT)-dt;
  if(B.chatT<=0&&!B.chat){B.chatT=50+Math.random()*50;
   const qs=B.sq.filter(q=>tacIn(q)&&!q.down&&q.inT&&S.t-q.inT>60&&q.ty!=='robot'&&(!q.chatAt||S.t-q.chatAt>120));
   if(qs.length){const q=qs[Math.floor(Math.random()*qs.length)],m=Math.floor((S.t-q.inT)/60),sec=Math.floor((S.t-q.inT)%60);q.chatAt=S.t;
    radio(inc,'安全官',q.cs+'，你們已入室 '+m+' 分'+(sec?' '+sec+' 秒':'')+'，請回報殘餘氣量。');B.chat={t:S.t+3+Math.random()*3,u:q.u}}}}
 // 氣瓶充填區：任一輛救助器材車到場即由司機自動開設（指揮官手動撤除後不再自動開設）
 if(!B.st.air&&!B.airOff&&onScene(inc).some(u=>u.code==='71'&&u.st==='work'))tacStnOpen(inc,B,'air',1);
 for(const k of Object.keys(B.st)){const s=B.st[k];if(!s)continue;
  if(s.staff){if(!B.st.icp)tacStnClose(inc,B,k,'指揮站撤除，幕僚撤離');continue}
  if(s.u!==null&&!B.sq.some(q=>(q.epa||q.vol||q.sdb)&&q.u===s.u)){const u=S.units.find(x=>x.id===s.u);if(!u||u.inc!==inc.id||u.st!=='work')tacStnClose(inc,B,k,'人員離場，站點關閉')}
  else if(k==='media'&&inc.pol!==2)tacStnClose(inc,B,k,'警方離場，關閉')}
 // 沒有聯訪處：有受困者的案件，媒體與家屬聚集，第 90 秒起每 90 秒扣評鑑（最多 4 次）
 // 警方到場：由警方協助自動開設聯訪處（不必先開設指揮站；結案評鑑只 +1，自己開設的 +2）
 if(inc.pol===2&&!B.st.media&&!B.done&&B.vtot){B.st.media={u:null,side:B.arr,t:S.t,staff:0,auto:1};tacEvt(inc,B,'milestone','警方協助開設聯訪處');
  radio(inc,'110','警方協助於'+TAC_SDN[B.arr]+'側封鎖線外開設聯訪處，統一對媒體與家屬發布。')}
 if(B.vtot&&!B.st.media&&!B.done){B.mediaT=(B.mediaT||90)-dt;
  if(B.mediaT<=0){B.mediaT=90;if((B.mediaN||0)<4){B.mediaN=(B.mediaN||0)+1;S.rep-=1;
   radio(inc,'受理','媒體與家屬在封鎖線外聚集詢問，現場沒有聯訪處統一發布（評鑑 -1）。')}}}
 // 集結區：沒有屋外待命的幫浦組又還有火點，請求增派一輛幫浦車
 if(B.st.stage){B.stgT=(B.stgT||20)-dt;
  if(B.stgT<=0){B.stgT=60;
   const burning=B.cells.filter(x=>x.ty==='room'&&x.h>.3).length>=3&&S.t-B.st.stage.t>60,spare=B.sq.some(q=>q.ty==='pump'&&!tacIn(q)&&q.task==='idle'&&!q.tmv);
   if(burning&&!spare&&!inc.req){inc.req={t:'need',s:'集結區已無待命幫浦組，請求增派幫浦車一輛。',c:'11',als:0,cs:'集結區'};inc.reqT=22;
    radio(inc,'集結區','集結區已無待命幫浦組，請求增派幫浦車一輛。')}}}}
// 救出的受困者：依受困時的狀況檢傷（紅、黃、綠），在傷患集結處等待救護車後送
function tacPatient(inc,B,vh,who,cont){
 const sev=vh<.45?'red':vh<.8?'yellow':'green';
 B.pts.push({id:B.pid=(B.pid||0)+1,sev,hp:Math.min(1,vh+.15),t:S.t,cont:cont||0});B.resc++;
 if(cont)radio(inc,'救護組','救出的受困者受化學品污染，要先除污才能後送。');
 tacEvt(inc,B,'victim','救出受困者 1 名（'+TAC_SEVN[sev]+'）');
 radio(inc,who||'現場','救出受困者 1 名（'+{red:'紅色・危急',yellow:'黃色・嚴重',green:'綠色・輕傷'}[sev]+'），送至傷患集結處。')}
const TAC_SEVN={red:'紅',yellow:'黃',green:'綠'},TAC_SEVP={red:0,yellow:1,green:2};
function tacEMS(inc,B,dt){
 // 等待中惡化：醫療站處置可大幅減緩，檢傷站也能減緩紅色
 for(const p of B.pts.slice()){
  let r=p.sev==='red'?.006:p.sev==='yellow'?.0018:0;
  if(B.st.treat)r*=.3;else if(B.st.triage&&p.sev==='red')r*=.75;
  if(B.sq.some(q=>q.ty==='med'&&!tacIn(q)))r*=.5; // 特搜醫療組在場：現場醫療處置
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
  const q=(B.st.triage?B.pts.slice().sort((a,b)=>TAC_SEVP[a.sev]-TAC_SEVP[b.sev]||a.t-b.t):B.pts.slice()).filter(p=>!(p.cont>0));
  // 沒有除污站：受污染傷患等 60 秒後由救護組就地粗除污（脫除外衣、清水沖洗）再後送
  if(!B.st.decon){let g=0;for(const p of B.pts)if(p.cont>0){p.ct=p.ct||S.t;if(S.t-p.ct>60){p.cont=0;g++}}
   if(g)radio(inc,u.cs,'沒有除污站，就地為 '+g+' 名受污染傷患粗除污（脫除外衣、清水沖洗）後後送。')}
  if(!q.length){if(B.pts.some(p=>p.cont>0)&&!B.st.decon&&S.t-(B.contW||-99)>60){B.contW=S.t;radio(inc,u.cs,'傷患集結處有受污染的傷患，要先除污才能上救護車：請開設除污站（化災車），否則約 1 分鐘後就地粗除污再後送。')}continue}
  const take=[q[0]];
  if(q[0].sev!=='red'&&q[1]&&q[1].sev!=='red')take.push(q[1]);
  for(const p of take)B.pts.splice(B.pts.indexOf(p),1);
  {const cn=take.filter(p=>p.cont>0).length;if(cn){B.ctx=(B.ctx||0)+cn;S.rep-=cn;tacEvt(inc,B,'warn','受污染傷患未除污即送醫（'+u.cs+'）');radio(inc,'受理',u.cs+'載運未除污的受污染傷患，救護車與急診受到污染（評鑑 -'+cn+'）！')}}
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
function tacCivInit(inc,B){B.civ={n:1+(Math.random()<.5?1:0),asked:{},until:S.t+240,log:null}}
// 現場民眾的身分（依建物用途）
function tacCivWho(inc){const k=inc.k;if(inc.tac&&inc.tac.sdb)return'自衛消防隊';
 return /nursing|hospfire/.test(k)?'護理人員':/fact|warehouse|chemfire|tinfire|wastefire|majorind|gasstn/.test(k)?'員工':/dept|market/.test(k)?'店員':/dorm/.test(k)?'移工':/hifire|skyscraper/.test(k)?'管理員':'住戶'}
// 進入戰術畫面時，民眾先主動描述火場基本狀況（像 119 報案通話）；之後的詢問也接在同一段對話
function tacCivOpen(inc,B){
 if(!B.civ||B.civ.log)return;
 const L=B.civ.log=[],who=tacCivWho(inc),say=s=>{L.push({w:'民',s});inc.log.push({w:'民',s:'（現場'+who+'）'+s,t:S.t-inc.t0})},
  me=s=>{L.push({w:'場',s});inc.log.push({w:'場',s:'（現場指揮官）'+s,t:S.t-inc.t0})};
 me('我是消防隊現場指揮官，裡面的狀況可以跟我說嗎？');
 if(B.sdb&&!B.sc){for(const s of tacSdbOpen(B))say(s);me('收到，請自衛消防編組到指揮站待命，協助引導。');B.civ.next=S.t+5;return}
 if(B.sc){for(const s of tacScCiv(inc,B,'open'))say(s);me('收到，請先退到安全的地方，有其他狀況再告訴我們。');B.civ.next=S.t+5;return}
 if(B.hoax){say('我只是聞到燒焦味，有人說'+tacFlr(B,B.hint>=0?B.hint:B.of)+'在冒煙，我自己沒看到火。');me('收到，我們會逐層查證，請先在外面等。');return}
 const f=Math.random()<.85?B.of:Math.max(B.bf,Math.min(B.F-1,B.of+(Math.random()<.5?-1:1)));
 const st=B.cells.filter(x=>x.ty==='stair'&&x.s>.3).length;
 let s=(f<B.bf?'地下室':tacFlr(B,f))+'在燒，'+(B.cells.some(x=>x.h>.5)?'看得到火光，':'')+(st?'樓梯間都是煙，':'煙很大，')+'我是從'+(f>B.bf?'樓梯':'門口')+'跑出來的。';
 say(s);
 say(B.vtot>0?(Math.random()<.65?'裡面好像還有人沒出來！拜託快一點！':'我不確定大家有沒有都出來。'):(Math.random()<.8?'我們這邊的人都出來了。':'不知道樓上還有沒有人。'));
 if(B.gas!==undefined&&Math.random()<.35)say('廚房好像有瓦斯桶，要小心。');
 me('收到，請先退到警戒線外，有其他狀況再告訴我們。');
 B.civ.next=S.t+5}
// 對談自動進行：指揮官每隔約 6 秒依序追問下一個問題（不需玩家按按鈕），民眾離開或問完為止
function tacCivStep(inc,B){
 if(!tacCivOn(B))return;
 if(!B.civ.log){tacCivOpen(inc,B);return}
 if(S.t<(B.civ.next||0))return;
 const a=TAC_ASK.find(x=>!B.civ.asked[x.k]);if(!a)return;
 tacAsk(inc,B,a.k);B.civ.next=S.t+6}
const tacCivOn=B=>B.civ&&S.t<B.civ.until&&Object.keys(B.civ.asked).length<TAC_ASK.length;
function tacAsk(inc,B,k){
 if(!tacCivOn(B)||B.civ.asked[k])return;B.civ.asked[k]=1;
 tacCivOpen(inc,B);
 const who=tacCivWho(inc),say=s=>{B.civ.log.push({w:'民',s});inc.log.push({w:'民',s:'（現場'+who+'）'+s,t:S.t-inc.t0})},Q=TAC_ASK.find(x=>x.k===k).q;
 B.civ.log.push({w:'場',s:Q});inc.log.push({w:'場',s:'（現場指揮官）'+Q,t:S.t-inc.t0});
 if(B.sc){const a=tacScCiv(inc,B,k);if(a)say(a);return}
 if(B.sdb){const a=tacSdbAsk(inc,B,k);if(a){say(a);return}}
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
