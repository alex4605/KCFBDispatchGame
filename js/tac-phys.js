// 戰術指揮：物理第二批——射水產汽、受困者躲藏與自行移動、臥床病患搬運、中繼送水
'use strict';
// ===== 射水產汽 =====
// 水打在高溫火點吸熱變成蒸汽；空間沒有排煙開口（窗、屋頂開孔、負壓排風、相鄰開口）時，蒸汽與熱氣被推回本室與相鄰空間：
// 能見度驟降、入室小組受熱。同步破窗或排煙時蒸汽排出，影響小很多
function tacSteam(inc,B,q,cl,pw,dt){
 if(cl.h<.35)return;
 const W=B.W,n=B.L.N[q.c],key=q.f*W+q.c;
 const vent=cl.v||cl.vv||(B.npvS&&B.npvS.has(key))||n.nb.some(o=>!tacShut(B,q.f,q.c,o)&&tacCel(B,q.f,o).v);
 const st=pw*cl.h*(vent?.25:1);
 cl.s=Math.min(1,cl.s+dt*st*1.5);
 for(const o of n.nb){if(tacShut(B,q.f,q.c,o))continue;const y=tacCel(B,q.f,o);y.s=Math.min(1,y.s+dt*st*.6);if(!vent&&y.h<cl.h*.8)y.h=Math.min(cl.h*.8,y.h+dt*st*.12)}
 if(vent||st<.03)return;
 for(const x of B.sq){if(!tacIn(x)||x.f!==q.f||x.down||x.ty==='robot')continue;if(x.c!==q.c&&!n.nb.includes(x.c))continue;
  x.hp-=dt*st*(x===q?.06:.12);if(x.hp<.3)tacDown(inc,B,x,'蒸汽燙傷')}
 const W2=B.stmW||(B.stmW={});
 if(!(W2[key]>S.t)){W2[key]=S.t+60;radio(inc,q.cs,tacNm(B,q.f,q.c)+'密閉高溫射水，蒸汽回推！能見度掉到零、熱氣很重，請求同步破窗或負壓排煙。');tacEvt(inc,B,'warn','蒸汽回推（'+tacNm(B,q.f,q.c)+'）')}}
// ===== 受困者躲藏 =====
// 初期搜索時，浴室、儲藏室、臥室（床下、衣櫃）、寢室的受困者較容易被漏掉，要次級搜索才找得到；臥床者不會躲
const TAC_HIDE={bath:.12,store:.12,bed:.1,bunk:.1,shop:.05,living:.03};
// ===== 受困者自行移動 =====
// 有意識的受困者（狀態尚可、不是臥床）在所在空間煙熱變重時，會往門沒關、煙熱較輕的相鄰空間移動；走到樓梯間的會自行逃出。
// 移動後原本通報的位置就不準了，搬進已搜索過的空間也要重新搜索
function tacVicMove(inc,B,dt){
 B.vmT=(B.vmT||0)-dt;if(B.vmT>0)return;B.vmT=5;
 const W=B.W,bad=x=>x.s+x.h*1.5;
 for(const x of B.cells){const mob=x.vic-(x.bedv||0);
  if(mob<=0||x.vh<.55||(x.s<.35&&x.h<.25)||Math.random()>.35)continue;
  if(B.sq.some(q=>q.f===x.f&&q.c===x.c&&tacIn(q)))continue;
  let best=null;
  for(const o of tacNb(B,x.f,x.c)){if(tacShut(B,x.f,x.c,o)||B.lk.has(tacDK(B,x.f,x.c,o)))continue;const y=B.cells[x.f*W+o];
   if(bad(y)<bad(x)-.2&&(!best||bad(y)<bad(best)))best=y}
  if(!best)continue;
  x.vic--;
  if(best.ty==='stair'){B.esc=(B.esc||0)+1;B.vtot=Math.max(0,B.vtot-1);if(!(B.escW>S.t)){B.escW=S.t+30;radio(inc,'受理','現場民眾回報：一名住戶從'+tacNm(B,x.f,x.c)+'經樓梯自行逃出。')}continue}
  best.vh=best.vic?Math.min(best.vh,x.vh):x.vh;best.vic++;
  if(best.sl>=1||best.srch>=1){best.sl=0;best.srch=0;best.s2=0}
  B.vmN=(B.vmN||0)+1}}
// ===== 臥床病患 =====
// 臥床者要 4 人以上抬（擔架、床單搬運）：3 人以下的小組搬得很慢、更耗氣耗體力
const tacBedSlow=q=>q.n>=4?2.2:3.2;
// ===== 中繼送水 =====
// 中繼車接在水源與前線車之間（或接連結送水管送水口）加壓：水帶上限 +8 條、長度與樓層造成的壓損減半、供水能力 +0.8
const TAC_RELAY_HOSE=8;
const tacRelayOK=(B,u)=>B.sq.some(r=>r.task==='relay'&&r.rel===u&&!r.tmv&&!r.down);
// 選要中繼的對象：有出水線、水壓最低（低於 85%）且還沒有中繼車的幫浦車或連結送水管
function tacRelayPick(B,q){
 let best=null,bp=.85;
 for(const p of B.sq){if(p===q||p.ty!=='pump'||tacRelayOK(B,p.u))continue;const ls=B.sq.filter(x=>x.line&&x.src==='pump'&&x.lu===p.u);if(!ls.length)continue;
  const m=Math.min(...ls.map(x=>x.pf/(x.fs||1)));if(m<bp){bp=m;best=p.u}}
 if(B.sp&&B.sp.on&&!tacRelayOK(B,'sp')){const ls=B.sq.filter(x=>x.line&&x.src==='sp');if(ls.length){const m=Math.min(...ls.map(x=>x.pf/(x.fs||1)));if(m<bp){bp=m;best='sp'}}}
 return best}
function tacRelayCan(B,q){
 if(q.ty!=='pump')return'只有幫浦車能中繼送水';if(tacIn(q))return'人員在室內';if(q.line)return'本車正在出水，不能同時中繼';
 return tacRelayPick(B,q)===null?'目前沒有水壓不足、需要中繼的水線':''}
function tacRelayOrder(inc,B,q,quiet){
 const why=tacRelayCan(B,q);if(why){if(!quiet)tacNo(inc,q,why);return false}
 const p=tacRelayPick(B,q),pu=p==='sp'?null:B.sq.find(x=>x.u===p),side=p==='sp'?B.sp.side:pu.tside;
 q.prev=null;q.task='relay';q.rel=p;q.tf=-1;q.tc=0;q.ws=null;
 if(side!==q.tside)tacTruck(inc,B,q,side,1);
 if(!quiet)radio(inc,q.cs,'收到，'+(side!==q.tside?'移車至'+TAC_SDN[side]+'側，':'')+'替'+(p==='sp'?'連結送水管':pu.cs)+'中繼送水加壓。');
 return true}
// 每秒：中繼對象不存在或已收線就解除
function tacRelayStep(inc,B){
 for(const r of B.sq){if(r.task!=='relay')continue;
  const ok=r.rel==='sp'?B.sp&&B.sp.on:B.sq.some(p=>p.u===r.rel&&!p.down);
  if(!ok){r.task='idle';r.rel=null;radio(inc,r.cs,'中繼對象已收線，中繼送水結束。')}}}
// 戰術 AI：有水線水壓低於 55% 時，派一輛沒出水的幫浦車中繼
function tacRelayAI(inc,B,free,take){
 if(!B.sq.some(q=>q.line&&q.pf<.55))return;
 const r=free.find(q=>q.ty==='pump'&&!tacIn(q)&&!q.line&&!tacRelayCan(B,q));
 if(r&&tacRelayOrder(inc,B,r,1)){take(r);radio(inc,r.cs,'水壓不足，'+(r.rel==='sp'?'接連結送水管':'接 '+(B.sq.find(x=>x.u===r.rel)||{}).cs)+' 中繼送水。')}}
// 繪製：中繼車與被中繼車之間的虛線
function tacRelayDraw(g){
 const inc=S.inc.find(i=>i.id===TAC.id);if(!inc||!inc.tac||!TAC.tp)return;const B=inc.tac;
 for(const r of B.sq){if(r.task!=='relay'||r.rel==='sp'||r.tmv)continue;const a=TAC.tp[r.u],b=TAC.tp[r.rel];if(!a||!b)continue;
  g.save();g.strokeStyle='rgba(125,179,232,.85)';g.lineWidth=3;g.setLineDash([6,4]);g.beginPath();g.moveTo(a[0],a[1]);g.lineTo(b[0],b[1]);g.stroke();g.restore();
  g.fillStyle='#7db3e8';g.font='600 10px '+FONT;g.textAlign='center';g.textBaseline='bottom';g.fillText('中繼',(a[0]+b[0])/2,(a[1]+b[1])/2-3)}}
