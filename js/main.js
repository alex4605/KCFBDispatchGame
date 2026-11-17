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
  $('hMoney').textContent='$'+S.money;$('hRep').textContent=Math.round(S.rep);
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
document.body.addEventListener('click',e=>{
 const b=e.target.closest('[data-sel],[data-u],[data-uc],[data-oos],[data-ret],[data-duty],[data-pkg],[data-note],[data-auto],[data-rc],[data-send],[data-req],[data-ext],[data-dai],[data-defl],[data-stand],[data-buy],[data-hire],[data-newst],[data-shopclose],#rs');
 if(!b)return;
 msg='';
 const D=b.dataset;
 if(b.id==='rs'){reset();bgScale=0;dirty();return}
 if(D.shopclose){shopOn=false;$('shop').classList.remove('open');sh='';return}
 if(D.hire){if(S.money>=2500){S.money-=2500;S.tp[shopSt]++}dirty();return}
 if(D.buy){const c=D.buy;if(S.money>=CODE[c].c){S.money-=CODE[c].c;addU(shopSt,c)}dirty();return}
 if(D.newst){if(S.money>=12000&&S.nst<SPOT.length){S.money-=12000;
  const i=S.nst++;addU(i,'11');addU(i,'11');addU(i,'11');addU(i,'91');addU(i,'41')}dirty();return}
 if(D.u){selU=+D.u;const u=S.units.find(x=>x.id===selU);if(u&&u.st!=='idle')center(u);dirty();return}
 if(D.uc){selU=null;dirty();return}
 if(D.oos){const u=S.units.find(x=>x.id===+D.oos);if(u&&u.st==='idle'){u.st='oos';u.oosT=60}dirty();return}
 if(D.ret){const u=S.units.find(x=>x.id===+D.ret);if(u&&u.st==='oos'){u.st='idle';u.oosT=0}dirty();return}
 if(D.sel){sel=+D.sel;selU=null;
  const o=S.inc.find(x=>x.id===sel)||S.duties.find(x=>x.id===sel);if(o)center(o);dirty();return}
 if(D.duty){
  const u=S.units.find(x=>x.id===+D.duty),d=S.duties.find(x=>x.id===sel);
  if(u&&d&&!d.unit){const p=chase(getF(d,modeOf(u.code)),u);
   if(p){u.path=p;u.st='dgo';u.turn=5+Math.random()*4;u.duty=d.id;u.inc=null;d.unit=u.id}
   else msg=u.cs+' 無法抵達勤務地點'}
  dirty();return}
 const inc=S.inc.find(x=>x.id===sel);if(!inc)return;
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
 if(D.ext){
  if(D.ext==='pol')callPol(inc);
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
 const mx=cam.x+cw/2,my=cam.y+ch/2,old=cell();
 zoom=Math.max(.45,Math.min(6,z));zoomT=performance.now();
 cam.x=mx/old*cell()-cw/2;cam.y=my/old*cell()-ch/2;clamp()}
$('zIn').onclick=()=>setZoom(zoom*1.35);
$('zOut').onclick=()=>setZoom(zoom/1.35);
$('zFit').onclick=fit;
$('zSwap').onclick=e=>{wantSwap=!wantSwap;e.currentTarget.style.background=wantSwap?'#2a4a6a':'';applySwap()};
function scSetZoom(z){scZoom=Math.max(.5,Math.min(3.5,z))}
$('sIn').onclick=()=>scSetZoom(scZoom*1.25);
$('sOut').onclick=()=>scSetZoom(scZoom/1.25);
$('sFit').onclick=()=>{scZoom=1};
scv.addEventListener('wheel',e=>{e.preventDefault();scSetZoom(scZoom*(e.deltaY<0?1.1:1/1.1))},{passive:false});
cv.addEventListener('wheel',e=>{e.preventDefault();setZoom(zoom*(e.deltaY<0?1.12:1/1.12))},{passive:false});
let dg=null;
cv.addEventListener('pointerdown',e=>{
 dg={x:e.clientX,y:e.clientY,cx:cam.x,cy:cam.y,m:0};
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
 let best=null,bd=1.4;
 for(const i of S.inc){const d=Math.hypot(i.x+.5-x,i.y+.5-y);if(d<bd){bd=d;best=i.id}}
 for(const i of S.duties){const d=Math.hypot(i.x+.5-x,i.y+.5-y);if(d<bd){bd=d;best=i.id}}
 sel=best;selU=null;dirty()});
function size(){
 const w=$('mapwrap');dpr=window.devicePixelRatio||1;bgScale=0;
 cw=w.clientWidth;ch=w.clientHeight;
 base=Math.max(13,Math.min(cw,ch)/25);
 cv.width=Math.round(cw*dpr);cv.height=Math.round(ch*dpr);
 ctxMain.setTransform(dpr,0,0,dpr,0,0);clamp();
 if(document.getElementById('scenewrap').style.display!=='none')sizeScene()}
window.addEventListener('resize',()=>{size()});
size();reset();size();
let faults=0;
let frameN=0;
function loop(ts){
 const dt=Math.min(.05,(ts-last)/1000||0);last=ts;
 try{
  if(!paused)step(dt);
  draw();if((++frameN&1)===0)drawScene();
  uiT+=dt;if(uiT>.28){uiT=0;ui()}
  if(msg){mt+=dt;if(mt>5){msg='';mt=0;dh=''}}else mt=0;
 }catch(err){
  faults++;console.error(err);
  msg='系統異常已跳過一次更新（'+faults+'）';mt=0;dh='';
 }
 requestAnimationFrame(loop)}
requestAnimationFrame(loop);
