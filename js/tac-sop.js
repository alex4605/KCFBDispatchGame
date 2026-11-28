// 戰術指揮：到場標準作業（SOP）、新到場提醒與建議任務、收尾協助
// SOP：玩家指揮時，沒被玩家下過令的小組依標準作業自動行動（第一車攻擊、佔水、救助組搜索、編 RIT…）；
// 玩家一下令，該組就歸玩家指揮；玩家指揮的組待命超過 30 秒，交回 SOP
'use strict';
let tacAIRun=0; // 模擬步進中（AI、任務自動銜接）下的命令不算玩家的
const tacSopOn=(inc,B)=>{if(B.sop===undefined)B.sop=inc.train?0:1;return!!B.sop};
// 玩家指揮時要交給戰術 AI 的模組：已指派的職務＋ SOP（只用沒被玩家指揮的小組）
function tacPlayMods(inc,B){
 const M={safety:B.role.safety,water:B.role.water,search:B.role.search,ems:B.role.ems};
 // SOP 全部（1）：攻擊、搜索、水源、救護、RIT；安全後勤（2）：只管水源、救護、RIT，攻擊與搜索由你指揮
 if(tacSopOn(inc,B))Object.assign(M,B.sop===2?{water:1,ems:1,rit:1,only:q=>!q.pc}:{attack:1,search:1,water:1,ems:1,rit:1,only:q=>!q.pc});
 return M}
// 每幀：記錄到場時間、玩家指揮的組待命 30 秒後交回 SOP
function tacSopStep(inc,B,dt){
 for(const q of B.sq){if(q.seen===undefined)q.seen=S.t;
  if(!q.pc)continue;
  if(q.task==='idle'&&!q.prev&&!q.down&&!tacIn(q)){q.pcI=(q.pcI||0)+dt;
   if(q.pcI>30&&B.sop===1){q.pc=0;q.pcI=0;radio(inc,'指揮官',q.cs+' 待命逾 30 秒，依標準作業（SOP）接手。')}}
  else q.pcI=0}}
// 建議任務：[指令, 樓層, 空間, 說明]；沒有合適的回傳 null
function tacSuggest(inc,B,q){
 if(q.down||q.tmv||q.task==='station')return null;
 const ok=(k,f,c)=>!(tacCan(B,q,k,f,c)||tacRefuse(B,q,k,f,c));
 const burning=B.cells.filter(x=>x.ty!=='stair'&&x.h>.05).sort((a,b)=>a.f-b.f||b.h-a.h);
 const atk=x=>B.sq.filter(y=>y.task==='attack'&&y.tf===x.f&&y.tc===x.c).length;
 const vic=B.cells.filter(x=>x.vic>0&&(x.rep||x.srch>=1)&&x.h<.45);
 const rit=B.sq.some(y=>y.task==='rit'||y.task==='ritgo'),inside=B.sq.some(y=>tacIn(y));
 if(q.ty==='pump'||q.ty==='robot'){
  for(const x of burning)if(atk(x)<2&&ok('attack',x.f,x.c))return['attack',x.f,x.c,tacTN(B,'attack')+' '+tacNm(B,x.f,x.c)];
  const e=B.cells.find(x=>x.emb);if(e&&q.ty!=='robot'&&ok('overhaul',e.f,e.c))return['overhaul',e.f,e.c,'殘火處理 '+tacNm(B,e.f,e.c)]}
 if(q.ty==='ladder'){
  for(const x of B.cells)if(x.vic>0&&B.L.N[x.c].wins&&ok('ladder',x.f,x.c))return['ladder',x.f,x.c,'雲梯救援 '+tacNm(B,x.f,x.c)];
  for(const x of burning)if(B.L.N[x.c].wins&&ok('master',x.f,x.c))return['master',x.f,x.c,tacTN(B,'master')+' '+tacNm(B,x.f,x.c)];
  return null}
 if(!rit&&inside&&q.ty!=='robot'&&ok('rit'))return['rit',-1,0,'編成 RIT'];
 for(const x of vic)if(ok('search',x.f,x.c))return['search',x.f,x.c,tacTN(B,'search')+' '+tacNm(B,x.f,x.c)+'（有受困者）'];
 const un=B.cells.filter(x=>x.ty==='room'&&x.sl<1&&x.h<.45).sort((a,b)=>Math.abs(a.f-B.of)-Math.abs(b.f-B.of));
 for(const x of un.slice(0,12))if(ok('search',x.f,x.c))return['search',x.f,x.c,tacTN(B,'search')+' '+tacNm(B,x.f,x.c)];
 const e=B.cells.find(x=>x.emb);if(e&&q.ty!=='robot'&&ok('overhaul',e.f,e.c))return['overhaul',e.f,e.c,'殘火處理 '+tacNm(B,e.f,e.c)];
 return null}
function tacDoSuggest(inc,B,q){const s=tacSuggest(inc,B,q);if(!s)return false;return tacOrder(inc,q,s[0],s[1],s[2])}
// 待分派：玩家指揮（或 SOP 關閉）而在屋外待命的組
const tacIdleQ=(inc,B)=>B.sq.filter(q=>q.task==='idle'&&!q.prev&&!q.down&&!tacIn(q)&&q.ty!=='robot'&&(q.pc||!tacSopOn(inc,B)||B.sop===2)&&!q.sdb);
// 收尾：結案前還差什麼（餘燼、受困者、傷患、洩漏），以及一鍵派閒置小組處理
function tacFinish(inc,B){
 if(B.hoax||!B.peak||B.cells.some(x=>x.h>=.04))return null;
 const emb=B.cells.filter(x=>x.emb).length,un=B.cells.filter(x=>x.ty==='room'&&x.sl<1).length;
 let left=B.roofV;for(const x of B.cells)left+=x.vic+x.hid;
 return{emb,un,left,pts:B.pts.length,leak:tacLeakOn(B)}}
function tacFinishGo(inc,B,k){
 const idle=B.sq.filter(q=>q.task==='idle'&&!q.prev&&!q.down&&q.ty!=='robot'&&q.ty!=='ladder'&&!q.sdb&&tacReady(q)&&q.air>.5);let n=0;
 for(const q of idle){const used=new Set(B.sq.filter(y=>y.task===k).map(y=>y.tf*B.W+y.tc));
  // 搜索：先初搜還沒搜的；都搜過但還有人沒找到，改次級搜索（浴室、儲藏室、臥室優先）
  const k2=k==='search'&&!B.cells.some(x=>x.ty==='room'&&x.sl<1&&x.h<.45)?'search2':k;
  const u2=new Set(B.sq.filter(y=>y.task===k2).map(y=>y.tf*B.W+y.tc));
  const t=B.cells.filter(x=>(k2==='overhaul'?x.emb:(x.ty==='room'&&x.sl<(k2==='search2'?2:1)&&x.h<.45))&&!u2.has(x.f*B.W+x.c))
   .sort((a,b)=>Math.abs(a.f-B.of)-Math.abs(b.f-B.of)-((TAC_HIDE[tacK(B,a.f,a.c)]||0)-(TAC_HIDE[tacK(B,b.f,b.c)]||0))*20)[0];
  if(t&&tacOrder(inc,q,k2,t.f,t.c,n>0))n++}
 msg=n?'已派 '+n+' 組'+(k==='overhaul'?'殘火處理':'搜索'):'沒有可派的閒置小組（要在屋外待命、氣量足夠）';return n}
// 搜索、殘火處理做完本層：往最近、還有目標的樓層續做（由任務自動銜接，不算玩家指揮）
function tacNextFloor(inc,B,q,k){
 const pick=x=>k==='overhaul'?x.emb:(x.ty==='room'&&x.sl<(k==='search2'?2:1)&&x.h<tacHotLim(q));
 for(let d=1;d<B.F;d++)for(const f of[q.f+d,q.f-d]){if(f<0||f>=B.F)continue;
  const t=B.cells.find(x=>x.f===f&&pick(x)&&!B.sq.some(y=>y!==q&&y.task===k&&y.tf===f&&y.tc===x.c));
  if(t&&q.air>.45&&tacOrder(inc,q,k,f,t.c,1)){radio(inc,q.cs,tacFlr(B,q.f)+'完成，往'+tacFlr(B,f)+'續行'+tacTN(B,k)+'。');return true}}
 return false}
// 側欄：火勢撲滅後，列出結案前還差什麼，並可一鍵派閒置小組處理
function tacFinishHTML(inc,B){
 const F=tacFinish(inc,B);if(!F)return'';const u=B.out?'區':'室';
 const it=[];if(F.emb)it.push('餘燼 '+F.emb+' 處（殘火處理）');if(F.left)it.push(F.un?'還有受困者未救出（搜索）':'人數對不上，可能有人躲在浴室、儲藏室、床下（次級搜索）');if(F.pts)it.push('傷患 '+F.pts+' 名待後送');if(F.leak)it.push('洩漏未止');
 if(!it.length&&!F.un)return'';
 let h='<div class="note fin"><b>🧯 火勢已撲滅</b>　'+(it.length?'結案前還需要：'+it.join('、'):'可以結案')+(F.un?'；尚有 '+F.un+' '+u+'未搜索（可能有人躲藏）':'')+'<div class="finb">';
 if(F.emb)h+='<button data-tfin="overhaul">🧯 派閒置小組殘火處理</button>';
 if(F.un||F.left)h+='<button data-tfin="search">🔦 派閒置小組'+(F.un?'搜索':'次級搜索')+'</button>';
 if(!B.role.search&&(F.un||F.left))h+='<button data-trole="search" title="搜救組長會自動派員把各層搜完（需開設指揮站、有幕僚名額）">指派搜救組長（自動搜索）</button>';
 return h+'</div>'+(tacSopOn(inc,B)?'<div class="sub">SOP 開啟中：沒被你指揮的小組會自動接手搜索與殘火處理。</div>':'')+'</div>'}
