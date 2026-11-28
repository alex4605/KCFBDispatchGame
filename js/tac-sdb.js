// 戰術指揮：自衛消防編組（工廠、倉庫、化工廠、機構、醫院）
// 訓練程度：良好／普通／不足。良好的會先關門侷限、初期滅火、清點人數並正確回報；不足的一問三不知、門也沒關。
// 消防隊到場後在場協助（沒有空氣呼吸器、能力比菜鳥差），陸續離開現場
'use strict';
// 各案類的訓練程度機率 [良好, 普通]（其餘為不足）
const TAC_SDBK={fact:[.2,.4],warehouse:[.2,.4],farmfire:[.1,.35],tinfire:[.1,.35],chemfire:[.35,.4],nursing:[.3,.4],hospfire:[.5,.35]};
const TAC_SDBN={good:'訓練良好',avg:'訓練普通',poor:'訓練不足'};
TAC_SKL.sdb={n:'自衛消防',t:1.45,w:.5,fat:1.5};
function tacSdbInit(inc,B){
 const p=TAC_SDBK[inc.k];if(!p||B.sc||inc.train)return;
 const r=Math.random(),lv=r<p[0]?'good':r<p[0]+p[1]?'avg':'poor';
 const S2=B.sdb={lv,n:lv==='good'?tacRint(4,6):lv==='avg'?tacRint(3,4):tacRint(2,3),acc:lv==='good'?1:lv==='avg'?.5:0,act:[]};
 const W=B.W,burn=B.cells.filter(x=>x.h>.05&&x.ty==='room');
 const doors=x=>B.L.N[x.c].nb.filter(o=>!tacOpn(B,x.c,o)).map(o=>tacDK(B,x.f,x.c,o));
 if(lv==='good'){
  for(const x of burn){for(const k of doors(x))B.cd.add(k);x.h*=.85}
  for(const[k,d]of B.fd)if(burn.some(x=>x.f===d.f)&&d.t!=='gone'){d.t='auto';B.cd.add(k)}
  if(burn.length)S2.act.push('起火房間的門已關上','用滅火器初期滅火','樓梯間防火門已確認關閉');
  if(/nursing|hospfire/.test(inc.k)&&!B.staff)B.staff={n:2,t:20};
  S2.act.push('人員清點完成')}
 else if(lv==='avg'){let c=0;for(const x of burn)for(const k of doors(x))if(Math.random()<.5){B.cd.add(k);c++}if(c)S2.act.push('部分房門有關上')}
 else{for(const x of burn)for(const k of doors(x))B.cd.delete(k);
  for(const[k,d]of B.fd)if(burn.some(x=>x.f===d.f)&&d.t!=='gone'&&Math.random()<.5){d.t='wedge';B.cd.delete(k)}}}
// 消防隊到場：自衛消防編組向指揮站報到，加入一組（沒有空氣呼吸器，以 C 級處理：不耗氣、不能進煙熱缺氧區）
function tacSdbSync(inc,B){
 const S2=B.sdb;if(!S2||S2.on)return;S2.on=1;S2.t0=S.t;S2.gap=S2.lv==='good'?90:S2.lv==='avg'?50:25;S2.nx=S.t+S2.gap;
 B.sq.push({u:'sdb',sdb:1,sk:'sdb',ppe:'C',cs:'自衛消防隊',code:'自',ty:'crew',n:S2.n,f:-1,c:0,nf:-1,nc:0,mt:0,tf:-1,tc:0,
  task:'idle',air:1,hp:1,down:0,carry:0,line:0,lt:0,prev:null,resc:null,low:0,ext:0,wk:0,
  tside:B.arr,side:B.arr,tmv:0,pf:0,len:0,src:null,burst:0,ent:null,ws:null,fat:0,cyl:0});
 radio(inc,'自衛消防隊',S2.lv==='good'?'自衛消防編組 '+S2.n+' 人向指揮站報到：'+S2.act.join('、')+'。可協助引導與關門侷限。':
  S2.lv==='avg'?'自衛消防編組 '+S2.n+' 人到指揮站，'+(S2.act.length?S2.act.join('、')+'，':'')+'其他狀況不太確定。':
  '幾名員工跑來說是自衛消防編組，但講不清楚哪裡在燒、還有誰在裡面。');
 tacEvt(inc,B,'milestone','自衛消防編組報到（'+TAC_SDBN[S2.lv]+'）')}
// 陸續離開：每隔一段時間少一人（良好約 90 秒、普通 50 秒、不足 25 秒），人走光就撤離
function tacSdbStep(inc,B){
 const S2=B.sdb;if(!S2||!S2.on||S2.gone||S.t<S2.nx)return;S2.nx=S.t+S2.gap;
 const q=B.sq.find(x=>x.sdb);if(!q){S2.gone=1;return}
 if(q.carry||q.down)return;
 q.n--;if(q.n>0){if(q.n===1||S2.lv==='poor')radio(inc,q.cs,'自衛消防編組陸續離開，現場剩 '+q.n+' 人。');return}
 if(tacIn(q)){q.n=1;q.task='exit';q.tf=-1;q.tc=0;q.prev=null;return}
 S2.gone=1;q.gone=1;radio(inc,q.cs,'自衛消防編組交接完畢，全數離開現場。');tacEvt(inc,B,'milestone','自衛消防編組離開')}
// 能做的事：關門侷限（門控）、引導（移動）、無煙區搜索、撤出
const TAC_SDBOK={move:1,exit:1,dctrl:1,search:1,search2:1};
function tacSdbCan(q,k){return q.sdb&&!TAC_SDBOK[k]?'自衛消防編組只做關門侷限、引導（移動）與無煙區搜索':''}
// 沒有空氣呼吸器：目標或路線經過不安全的空間就拒絕
function tacSdbRefuse(B,q,k,f,c){
 if(!q.sdb||k==='exit'||f===undefined||f<0)return'';
 const rt=tacRoute(B,q,f,c).concat([[f,c]]),bad=rt.find(p=>!tacSafe(tacCel(B,p[0],p[1])));
 return bad?'拒絕：自衛消防編組沒有空氣呼吸器，不進入有煙熱的'+tacNm(B,bad[0],bad[1]):''}
// 現場詢問：訓練不足的一問三不知；普通的一半答不出來；良好的照實回答（交給一般流程，且報出所有受困者）
function tacSdbAsk(inc,B,k){
 const S2=B.sdb;if(!S2)return null;
 if(S2.lv==='good'){if(k==='who'){for(const x of B.cells)if(x.vic+x.hid>0)x.rep=1}return null}
 if(S2.lv==='avg'&&Math.random()<.5)return null;
 return{who:'不知道……剛剛人很亂，沒有點名。',fire:'好像是那邊在燒，我也不確定是哪一間。',gas:'不清楚裡面放什麼。',lock:'鑰匙不在我這裡，要問管理的人。',layout:'我平常不在這棟，不太清楚。'}[k]||'不清楚。'}
function tacSdbOpen(B){
 const S2=B.sdb;if(!S2)return null;
 if(S2.lv==='good'){const vr=B.cells.filter(x=>x.vic+x.hid>0);for(const x of vr)x.rep=1;
  return['我是自衛消防隊長，起火點在'+tacNm(B,B.of,B.oc)+'。'+(S2.act.length?S2.act.join('、')+'。':''),vr.length?'清點後還有 '+vr.reduce((a,x)=>a+x.vic+x.hid,0)+' 人沒出來，在'+[...new Set(vr.map(x=>tacNm(B,x.f,x.c)))].join('、')+'。':'人員都清點到了，裡面沒有人。']}
 if(S2.lv==='avg')return['我是自衛消防編組的，'+tacFlr(B,B.of)+'在燒，'+(S2.act.length?S2.act[0]+'，':'')+'人數還在清點。'];
 return['我們是自衛消防編組……可是沒真的演練過，不知道從哪裡燒起來的。','裡面還有沒有人我不確定。']}
function tacSdbHTML(B){const S2=B.sdb;if(!S2)return'';const q=B.sq.find(x=>x.sdb);
 return'<div class="row"><span>自衛消防編組</span><span>'+'<b style="color:'+(S2.lv==='good'?'var(--grn)':S2.lv==='avg'?'var(--amb)':'var(--red)')+'">'+TAC_SDBN[S2.lv]+'</b>　'+(S2.gone?'已離開':!S2.on?'未報到':'現場 '+(q?q.n:0)+' 人')+'</span></div>'}
