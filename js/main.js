// 面板更新、事件處理、主迴圈
'use strict';
const $=id=>document.getElementById(id);
// 就地更新 DOM：只改動有變化的節點，避免整塊 innerHTML 重建造成的重排與點擊落空
const _tpl=document.createElement('template');
function sameKey(a,b){ // data-* 不同視為不同元件，整個換掉，避免點擊落到別的按鈕
 const x=a.dataset,y=b.dataset;
 for(const k in y)if(x[k]!==y[k])return false;
 for(const k in x)if(!(k in y))return false;
 return true}
function patchEl(a,b){
 const an=a.attributes,bn=b.attributes;
 for(let i=an.length-1;i>=0;i--)if(!b.hasAttribute(an[i].name))a.removeAttribute(an[i].name);
 for(let i=0;i<bn.length;i++){const t=bn[i];if(a.getAttribute(t.name)!==t.value)a.setAttribute(t.name,t.value)}
 if(a.tagName==='INPUT'&&!a.dataset.keep){const v=b.getAttribute('value')||'';if(a.value!==v)a.value=v} // data-keep：保留使用者正在輸入的內容
 patchKids(a,b)}
function patchKids(a,b){
 let x=a.firstChild,y=b.firstChild;
 while(y){
  const ny=y.nextSibling;
  if(!x)a.appendChild(y);
  else{const nx=x.nextSibling;
   if(x.nodeType!==y.nodeType||x.nodeName!==y.nodeName||(x.nodeType===1&&!sameKey(x,y)))a.replaceChild(y,x);
   else if(x.nodeType===1)patchEl(x,y);
   else if(x.nodeValue!==y.nodeValue)x.nodeValue=y.nodeValue;
   x=nx}
  y=ny}
 while(x){const nx=x.nextSibling;a.removeChild(x);x=nx}}
function morph(el,html){_tpl.innerHTML=html;patchKids(el,_tpl.content)}
let lh='',rh='',dh='',sh='',hud='';
let leftOpen=true;
function ui(){
 reindex();
 const hs=S.day+'|'+Math.floor(S.t)+'|'+S.money+'|'+Math.round(S.rep)+'|'+S.score;
 if(hs!==hud){hud=hs;
  $('hDay').textContent=S.day;$('hClock').textContent=fmt(S.t);
  $('hMoney').textContent='$'+S.money;$('hRep').textContent=Math.round(S.rep)+(S.repLast&&S.t-S.repLast.t<4?' +'+S.repLast.g.toFixed(1):'');
  $('hScore').textContent=S.score;
  let fr=0;for(let i=0;i<S.nst;i++)fr+=S.ix.idle[i];
  $('hIdle').textContent=fr+'/'+S.units.length}
 const a=leftHTML();if(a!==lh){lh=a;morph($('left'),a)}
 const b=callsHTML();if(b!==rh){rh=b;morph($('calls'),b)}
 if(!(document.activeElement&&document.activeElement.id==='note')){
  const c=detailHTML();
  if(c!==dh){
   const lb=$('logbox');
   const follow=!lb||lb.scrollTop+lb.clientHeight>=lb.scrollHeight-6;
   dh=c;morph($('detail'),c);
   const nb=$('logbox');
   if(nb&&follow)nb.scrollTop=nb.scrollHeight}}
 const sp=$('shop');
 if(shopOn){const e=shopHTML();if(e!==sh){sh=e;morph(sp,e)}sp.classList.add('open')}
 else if(sh){sp.classList.remove('open');sh=''}}
function center(o){cam.x=(o.x+.5)*cell()-cw/2;cam.y=(o.y+.5)*cell()-ch/2;clamp()}
function dirty(){lh=rh=dh=sh=''}
document.body.addEventListener('click',e=>{
 const f=e.target.closest('[data-fold]');
 if(f){const k=f.dataset.fold;FOLD[k]=!FOLD[k];dirty();ui();return}
 const up=e.target.closest('[data-up]');
 if(up){const inc=S.inc.find(x=>x.id===sel);
  if(inc){msg='';const al=inc.al|0;
   if(al<1)msg='請先派遣一級火警';else if(al>=3)msg='已是三級火警編組';
   else if(!sendLv(inc,al+1)&&!msg)msg='無法升級';
   dirty();ui()}
  return}
 if(!e.target.closest('[data-lc]'))return;
 leftOpen=!leftOpen;
 document.querySelector('main').classList.toggle('lc',!leftOpen);
 dirty();ui();size()});
// 進線列表在按下時就選取（列表每 0.28 秒重繪，等放開才算點擊容易落空）
function selInc(id){sel=id;selU=null;const o=S.inc.find(x=>x.id===sel)||S.duties.find(x=>x.id===sel);if(o){if(scMode==='map'&&S.inc.includes(o)&&!o.wf)flyTo(o);else center(o)}dirty();ui()}
$('calls').addEventListener('pointerdown',e=>{const b=e.target.closest('[data-sel]');if(!b||e.button!==0)return;msg='';selInc(+b.dataset.sel)});
$('calls').addEventListener('pointerenter',()=>{callsHover=true});
$('calls').addEventListener('pointerleave',()=>{callsHover=false});
// ↑／↓ 在進線案件間切換（輸入框內不作用）
document.addEventListener('keydown',e=>{
 if(TAC.open||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;
 if(e.key!=='ArrowUp'&&e.key!=='ArrowDown')return;
 const ids=[...document.querySelectorAll('#calls [data-sel]')].map(x=>+x.dataset.sel);if(!ids.length)return;
 e.preventDefault();const i=ids.indexOf(sel);
 selInc(ids[i<0?0:(i+(e.key==='ArrowDown'?1:ids.length-1))%ids.length])});
document.body.addEventListener('click',e=>{
 const b=e.target.closest('[data-mrsend],[data-mrno],[data-ma],[data-wfpri],[data-wfu],[data-wfauto],[data-wfheli],[data-wfcrew],[data-wfhs],[data-wfcs],[data-sel],[data-u],[data-uc],[data-oos],[data-ret],[data-duty],[data-pkg],[data-note],[data-auto],[data-rc],[data-send],[data-req],[data-ext],[data-dai],[data-defl],[data-stand],[data-tac],[data-buy],[data-hire],[data-newst],[data-shopclose],#rs');
 if(!b)return;
 msg='';
 const D=b.dataset;
 if(D.mrsend){const r=(S.mr||[]).find(x=>x.id===+D.mrsend);if(r)mrSend(r);dirty();return}
 if(D.mrno){S.mr=(S.mr||[]).filter(x=>x.id!==+D.mrno);sel=null;msg='已婉拒支援請求';dirty();return}
 {const wi=S.inc.find(x=>x.id===sel);if(wi&&wfClick(wi,D)){dirty();return}}
 if(b.id==='rs'){reset();bgScale=0;dirty();return}
 if(D.shopclose){shopOn=false;$('shop').classList.remove('open');sh='';return}
 if(D.hire){if(S.money>=2500){S.money-=2500;S.tp[shopSt]++}dirty();return}
 if(D.buy){const c=D.buy;if(S.money>=CODE[c].c){S.money-=CODE[c].c;addU(shopSt,c)}dirty();return}
 if(D.newst){if(S.money>=12000&&S.nst<SPOT.length){S.money-=12000;
  const i=S.nst++;addU(i,'11');addU(i,'11');addU(i,'11');addU(i,'91');addU(i,'41');
  // 鄉間分隊另配越野警備車；新設分隊的第一輛幫浦車為新式 CAFS
  if(SABS[SPOT[i].n]||SABSN[SPOT[i].n])addU(i,'43');
  const nu=S.units.find(u=>u.si===i&&u.code==='11');if(nu)nu.cafs=1}dirty();return}
 if(D.u){selU=+D.u;const u=S.units.find(x=>x.id===selU);if(u&&u.st!=='idle')center(u);dirty();return}
 if(D.uc){selU=null;dirty();return}
 if(D.oos){const u=S.units.find(x=>x.id===+D.oos);if(u&&u.st==='idle'){u.st='oos';u.oosT=60}dirty();return}
 if(D.ret){const u=S.units.find(x=>x.id===+D.ret);if(u&&u.st==='oos'){u.st='idle';u.oosT=0}dirty();return}
 if(D.sel){if(!b.closest('#calls'))selInc(+D.sel);return}
 // 消防學校
 if(D.gosch){sel=SCHOOL_ID;selU=null;if(SCHOOL)center({x:SCHOOL.p[0],y:SCHOOL.p[1]});dirty();return}
 if(D.train){trainStart(+D.train);return}
 if(D.trainstop){trainEnd('已放棄訓練。');return}
 if(D.duty){
  const u=S.units.find(x=>x.id===+D.duty),d=S.duties.find(x=>x.id===sel);
  if(u&&d&&!d.unit){const p=chase(getF(d,modeOf(u.code)),u);
   if(p){u.path=p;u.st='dgo';u.turn=5+Math.random()*4;u.duty=d.id;u.inc=null;d.unit=u.id}
   else msg=u.cs+' 無法抵達勤務地點'}
  dirty();return}
 const inc=S.inc.find(x=>x.id===sel);if(!inc)return;
 if(D.tac){if(tacUnlocked()||inc.train)tacOpen(inc);else msg='需先通過消防學校三關訓練，才能接管現場指揮權';dirty();return}
 if(D.note){
  const el=$('note'),er=$('nerr');
  if(!el.value.trim()){if(er)er.textContent='輸入內容後再儲存';return}
  inc.note=el.value.trim().slice(0,30);dirty();return}
 if(D.defl&&!inc.defl){
  const ag=KIND[inc.k].defl;
  if(inc.pm.special){
   inc.defl=1;S.rep-=4;
   msg=ag+'回覆：現場有人受傷或危及安全，仍應由消防處理（評鑑 -4）';
   radio(inc,'受理',ag+'回覆本案涉及人員受傷，不予受理，請消防隊續處。')}
  else{
   S.money+=Math.round(inc.pay*.45);S.score+=25;S.solved++;
   msg='已轉報'+ag+'受理：'+KIND[inc.k].n+' '+inc.addr;
   release(inc,0);S.inc.splice(S.inc.indexOf(inc),1);if(sel===inc.id)sel=null}
  dirty();return}
 if(D.dai&&!inc.dai){
  const m=D.dai,T=S.t-inc.t0;
  if(m==='dead'){inc.dai='none';
   const L2=[['台','我知道這很難受，我需要問你幾個問題，好嗎？'],['民','……好。'],
    ['台','請問他的身體摸起來是冰冷、僵硬的嗎？'],['民','是……已經冷掉了，手臂也彎不動。'],
    ['台','皮膚上有沒有出現暗紫色的斑塊？'],['民','有，背後那邊顏色很深。'],
    ['台','好，這樣的情況不需要進行心肺復甦術。請不要移動他，也不要碰觸現場其他東西。'],
    ['台','你先到屋外或門口等候，救護與警方都在路上，你不是一個人。']];
   L2.forEach((x,i)=>inc.log.push({w:x[0],s:x[1],t:T+i*2.2}))}
  else if(m==='cpr'){
   if(inc.pm.ohca){inc.dai='cpr';
    inc.log.push({w:'台',s:'請把他平放在硬的地面上，兩手掌重疊壓在胸口正中央，跟著我的節奏用力壓。',t:T});
    inc.log.push({w:'民',s:'好…我在壓了，一、二、三、四…',t:T+2});
    inc.log.push({w:'台',s:'很好，不要停，救護車快到了，到場前都要持續壓。',t:T+4})}
   else{inc.dai='none';inc.log.push({w:'台',s:'請確認一下他有沒有呼吸？',t:T});
    inc.log.push({w:'民',s:'有，他會喘也叫得動，只是很不舒服。',t:T+2});
    inc.log.push({w:'台',s:'那先不用壓胸，讓他採舒適姿勢，救護車馬上到。',t:T+4})}}
  else{inc.dai=m;
   const line=m==='birth'?'讓產婦側躺、深呼吸不要用力，準備乾淨毛巾，我在線上陪您到救護車抵達。':
    m==='bleed'?'拿乾淨的布直接壓住傷口，用力壓不要放開，不要綁緊肢體。':
    '請所有人往樓下或上風處疏散，低姿勢用濕毛巾摀住口鼻，不要搭電梯。';
   inc.log.push({w:'台',s:line,t:T});
   inc.log.push({w:'民',s:'好，我照做。',t:T+2})}
  dirty();return}
 if(D.ma){maCall(inc,D.ma);dirty();return}
 if(D.ext){
  if(D.ext==='pol')callPol(inc);
  if(D.ext==='epa')epaCall(inc);
  if(D.ext==='pow'&&inc.pow===0){inc.pow=1;inc.powT=30+Math.random()*30;
   radio(inc,'受理','已通報台電，預估 '+Math.ceil(inc.powT)+' 秒完成斷電。')}
  dirty();return}
 if(D.req){answer(inc,D.req==='1',false);dirty();return}
 if(D.stand){
  const keep=new Set();
  const cnt=inc.need.map(()=>0);
  for(const u of onScene(inc)){
   let used=0;
   for(let i2=0;i2<inc.need.length;i2++)
    if(cnt[i2]<inc.need[i2].n&&match(inc.need[i2],u)){cnt[i2]++;used=1}
   if(used)keep.add(u.id)}
  let n2=0;
  for(const u of onScene(inc).slice())if(!keep.has(u.id)){u.inc=null;crewDown(u);home(u);n2++}
  msg=n2?('已解除 '+n2+' 輛多餘車輛返隊'):'現場沒有多餘車輛';
  if(n2)radio(inc,'受理','現場多餘車輛 '+n2+' 輛解除任務返隊。');
  dirty();return}
 if(D.pkg){const pi=+D.pkg;
  if(pi<3){if(!sendLv(inc,pi+1)&&!msg)msg='已派遣'+LVN[inc.al|0]+'火警編組'}
  else sendPkg(inc,PKG[pi]);
  dirty();return}
 if(D.auto){auto(inc);dirty();return}
 if(D.rc){const u=S.units.find(x=>x.id===+D.rc);if(u){u.inc=null;crewDown(u);home(u)}dirty();return}
 if(D.send){const u=S.units.find(x=>x.id===+D.send);
  if(u&&u.st==='idle')send(inc,u,D.mode||null);dirty()}});
document.body.addEventListener('input',e=>{
 if(e.target.id==='note'){const er=$('nerr');if(er)er.textContent=''}});
document.body.addEventListener('change',e=>{if(e.target.id==='selSt'){shopSt=+e.target.value;sh=''}});
$('btnPause').onclick=e=>{paused=!paused;e.target.textContent=paused?'繼續':'暫停'};
$('btnShop').onclick=()=>{shopOn=!shopOn;sh=''};
$('btnFs').onclick=()=>{
 if(document.fullscreenElement)document.exitFullscreen();
 else document.documentElement.requestFullscreen().catch(()=>{})};
function setZoom(z){
 fly=null;
 const mx=cam.x+cw/2,my=cam.y+ch/2,old=cell();
 zoom=Math.max(.12,Math.min(6,z));zoomT=performance.now();
 cam.x=mx/old*cell()-cw/2;cam.y=my/old*cell()-ch/2;clamp()}
$('zIn').onclick=()=>setZoom(zoom*1.35);
$('zOut').onclick=()=>setZoom(zoom/1.35);
$('zFit').onclick=fit;
// 全市圖收合：只在現場畫面放大（地圖在右欄）時可用，把空間讓給案件詳情與 ARR 派遣
let mapMin=false;
function setMapMin(v){mapMin=v;document.querySelector('main').classList.toggle('mapc',v);size()}
$('zMin').onclick=()=>setMapMin(true);
$('zMax').onclick=()=>setMapMin(false);
// 現場顯示方式循環切換：地圖現場 → 現場面板放大 → 現場小窗
const SCM_LB={map:['◎','現場顯示：直接在大地圖放大（點按切換為現場面板放大）'],big:['⇄','現場顯示：現場面板放大到中央（點按切換為右欄小窗）'],small:['▭','現場顯示：右欄小窗（點按切換為大地圖放大）']};
function scModeBtn(){const b=$('zSwap');b.textContent=SCM_LB[scMode][0];b.title=SCM_LB[scMode][1];b.setAttribute('aria-label',SCM_LB[scMode][1]);b.style.background=scMode==='small'?'':'#2a4a6a'}
$('zSwap').onclick=()=>{scMode=scMode==='map'?'big':scMode==='big'?'small':'map';wantSwap=scMode==='big';
 try{localStorage.setItem('kcfb.scMode',scMode)}catch(e){}
 scModeBtn();drawScene();applySwap();size();
 const inc=S.inc.find(x=>x.id===sel);if(inc&&scMode==='map'&&!inc.wf)flyTo(inc);
 msg=SCM_LB[scMode][1].split('（')[0];dirty()};
scModeBtn();
function scSetZoom(z){scZoom=Math.max(.5,Math.min(3.5,z))}
$('sIn').onclick=()=>scSetZoom(scZoom*1.25);
$('sOut').onclick=()=>scSetZoom(scZoom/1.25);
$('sFit').onclick=()=>{scZoom=1};
scv.addEventListener('wheel',e=>{e.preventDefault();scSetZoom(scZoom*(e.deltaY<0?1.1:1/1.1))},{passive:false});
cv.addEventListener('wheel',e=>{e.preventDefault();setZoom(zoom*(e.deltaY<0?1.12:1/1.12))},{passive:false});
let dg=null;
cv.addEventListener('pointerdown',e=>{
 const rb=cv.getBoundingClientRect();
 if(mapOverlayHit((e.clientX-rb.left)/rb.width*cw,(e.clientY-rb.top)/rb.height*ch)){dg=null;dirty();return}
 fly=null;dg={x:e.clientX,y:e.clientY,cx:cam.x,cy:cam.y,m:0};
 cv.setPointerCapture(e.pointerId);cv.style.cursor='grabbing'});
cv.addEventListener('pointermove',e=>{
 if(!dg)return;
 const dx=e.clientX-dg.x,dy=e.clientY-dg.y;
 dg.m=Math.max(dg.m,Math.hypot(dx,dy));cam.x=dg.cx-dx;cam.y=dg.cy-dy;clamp()});
cv.addEventListener('pointerup',e=>{
 if(!dg)return;
 const mv=dg.m;dg=null;cv.style.cursor='grab';
 if(mv>6)return;
 const r=cv.getBoundingClientRect(),c=cell();
 const x=((e.clientX-r.left)/r.width*cw+cam.x)/c,y=((e.clientY-r.top)/r.height*ch+cam.y)/c;
 let best=null,bd=Math.max(1.4,22/c);
 for(const i of S.inc){const d=Math.hypot(i.x+.5-x,i.y+.5-y);if(d<bd){bd=d;best=i.id}}
 for(const i of S.duties){const d=Math.hypot(i.x+.5-x,i.y+.5-y);if(d<bd){bd=d;best=i.id}}
 // 地圖現場模式：點到車輛時選取車輛（案件選取不變）
 if(c>=SC_MAP){const uh=mapUnitHit(x,y);if(uh){selU=uh;dirty();return}}
 // 點到消防學校
 if(SCHOOL&&Math.hypot(SCHOOL.p[0]+.5-x,SCHOOL.p[1]+.5-y)<Math.max(1,18/c)&&best===null){sel=SCHOOL_ID;selU=null;dirty();return}
 sel=best;selU=null;
 const bi=S.inc.find(i=>i.id===best);if(bi&&scMode==='map'&&!bi.wf&&c<SC_MAP)flyTo(bi);
 dirty()});
// 地圖現場模式：雙擊放大中的案件進入戰術指揮
cv.addEventListener('dblclick',()=>{if(cell()<SC_MAP)return;const inc=S.inc.find(x=>x.id===sel);if(inc&&tacHas(inc)&&(tacUnlocked()||inc.train)){fly=null;tacOpen(inc);dirty()}});
function size(){
 const w=$('mapwrap');dpr=window.devicePixelRatio||1;bgScale=0;
 cw=w.clientWidth;ch=w.clientHeight;
 base=Math.max(13,Math.min(cw,ch)/25);
 cv.width=Math.round(cw*dpr);cv.height=Math.round(ch*dpr);
 ctxMain.setTransform(dpr,0,0,dpr,0,0);clamp();
 if(document.getElementById('scenewrap').style.display!=='none')sizeScene()}
window.addEventListener('resize',()=>{size();if(TAC.open)sizeTac()});
// 雙擊現場畫面進入戰術指揮
scv.addEventListener('dblclick',()=>{const inc=S.inc.find(x=>x.id===sel);if(inc&&tacHas(inc)&&(tacUnlocked()||inc.train)){tacOpen(inc);dirty()}});
size();reset();size();
let faults=0;
let frameN=0;
function loop(ts){
 const dt=Math.min(.05,(ts-last)/1000||0);last=ts;
 try{
  // 戰術畫面開著時整體時間放慢（戰略與戰術共用同一個時鐘）
  if(!paused)step(dt*(TAC.open?TAC.spd:1));
  trainStep();
  if(TAC.open)drawTac();
  else{flyStep(ts);draw();if((++frameN&1)===0)drawScene()}
  uiT+=dt;if(uiT>.28){uiT=0;ui();if(TAC.open)tacUI()}
  if(msg){mt+=dt;if(mt>5){msg='';mt=0;dh=''}}else mt=0;
 }catch(err){
  faults++;console.error(err);
  msg='系統異常已跳過一次更新（'+faults+'）';mt=0;dh='';
 }
 requestAnimationFrame(loop)}
requestAnimationFrame(loop);
