// 戰術指揮：建物火災的樓層剖面模型、火煙動態、小組指令與現場戰術 AI
// 剖面格：每層 W=R+1 格，第 0 格是樓梯間（不燃、只走煙與人），1..R 是房間；f=-1 代表建物外
'use strict';
// 可進入戰術指揮的案類：樓層數與每層房間數範圍
const TACK={mfire:{f:[2,4],r:[3,4]},hifire:{f:[7,10],r:[4,5]},fact:{f:[1,2],r:[5,6]},
 deptfire:{f:[5,7],r:[5,6]},skyscraper:{f:[11,14],r:[4,5]},hospfire:{f:[4,6],r:[5,6]}};
// 玩家戰術畫面的介面狀態
const TAC={open:false,id:null,sq:null,ord:null,hits:[]};
const TAC_AIR=110; // 滿瓶可在室內作業的秒數
const TAC_LADR={'21':10,'31':7}; // 雲梯可達樓層數
// 車種 → 小組類型；水庫車、指揮車、救護車不編成入室小組
const TAC_SQ={'11':'pump','16':'pump','57':'pump','21':'ladder','31':'ladder','71':'resc','搜':'resc','75':'vent','履':'robot'};
const TAC_TYN={pump:'幫浦組',ladder:'雲梯組',resc:'救助組',vent:'排煙組',robot:'機器人'};
const TAC_TASK={idle:'待命',hold:'守線',attack:'射水攻擊',search:'搜索',carry:'搬運受困者',vent:'破窗排煙',roof:'屋頂排煙',
 ppv:'正壓送風',ladder:'雲梯救援',master:'雲梯外部射水',rit:'RIT 待命',ritgo:'RIT 救援',exit:'撤出'};
const tacRint=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
const tacCel=(B,f,c)=>B.cells[f*B.W+c];
const tacFlr=f=>f<0?'屋外':(f+1)+'F';
function tacOK(inc){return !!TACK[inc.k]&&!!inc.rev&&!inc.wrap}
// 建立建物模型；若案件已依原本的抽象進度推進，火勢依進度縮小
function tacInit(inc){
 const T=TACK[inc.k],F=tacRint(T.f[0],T.f[1]),R=tacRint(T.r[0],T.r[1]),W=R+1;
 const cells=[];
 for(let f=0;f<F;f++)for(let c=0;c<W;c++)cells.push({f,c,h:0,fu:c?1:0,s:0,v:0,vic:0,vh:1,srch:c?0:1,fl:0,wet:0});
 const load={'低':.8,'中':1,'高':1.2,'極高':1.4}[inc.pm.load]||1;
 const B={F,R,W,cells,roof:0,ppv:0,ppvW:0,sq:[],resc:0,lost:0,vtot:0,peak:0,p:0,done:0,doneT:0,paid:0,
  mayday:0,lodd:0,hint:-1,aiT:0,fk:load,of:0,noRit:0};
 const of=(inc.k==='mfire'||inc.k==='fact')?tacRint(0,Math.min(1,F-1)):tacRint(Math.floor(F*.25),Math.floor(F*.6));
 const oc=tacRint(1,R);B.of=of;
 const prog=Math.min(.8,inc.work/inc.dur);
 const nIgn=Math.max(1,Math.min(R*2,Math.round((inc.pm.area||60)/55)));
 const cand=[];
 for(let f=of;f<Math.min(F,of+2);f++)for(let c=1;c<=R;c++)cand.push([Math.abs(c-oc)+(f-of)*1.6,f,c]);
 cand.sort((a,b)=>a[0]-b[0]);
 for(let i=0;i<Math.min(nIgn,cand.length);i++){
  const x=tacCel(B,cand[i][1],cand[i][2]);
  x.h=Math.max(.12,(.62-i*.08)*(.75+.25*load)*(1-prog)+Math.random()*.1);x.s=Math.min(1,x.h*.9)}
 // 受困者：起火層與以上樓層
 const trap=inc.pm.trap||0;
 for(let i=0;i<trap;i++){
  const f=Math.min(F-1,of+tacRint(0,Math.min(2,F-1-of))),c=tacRint(1,R);
  tacCel(B,f,c).vic++;if(B.hint<0)B.hint=f}
 B.vtot=trap;
 inc.tac=B;tacSync(inc);
 radio(inc,'受理','指揮中心接管現場戰術指揮：'+F+' 層建物，起火層 '+(of+1)+'F'+
  (trap?'，報案人表示 '+(B.hint+1)+'F 有人受困':'')+'。')}
// 在場作業的車輛 → 戰術小組（新到場加入，離場移除）
function tacSync(inc){
 const B=inc.tac;
 for(const u of onScene(inc)){
  if(u.st!=='work'||!TAC_SQ[u.code])continue;
  if(B.sq.some(q=>q.u===u.id))continue;
  const ty=TAC_SQ[u.code];
  B.sq.push({u:u.id,cs:u.cs,code:u.code,ty,n:ty==='robot'?1:crewOf(u),f:-1,c:0,nf:-1,nc:0,mt:0,tf:-1,tc:0,
   task:'idle',air:1,hp:1,down:0,carry:0,line:0,lt:0,prev:null,resc:null,low:0,ext:0,wk:0})}
 B.sq=B.sq.filter(q=>{const u=S.units.find(x=>x.id===q.u);
  if(u&&u.inc===inc.id&&u.st==='work')return true;
  if(q.down)B.mayday=Math.max(0,B.mayday-1);
  return false})}
const tacIn=q=>q.f>=0;
// 下一格：先回樓梯間，再上下樓，最後沿樓層水平移動
function tacNext(q){
 if(q.f===q.tf&&q.c===q.tc)return null;
 if(q.f<0)return[0,0];
 if(q.tf<0){if(q.c>0)return[q.f,q.c-1];if(q.f>0)return[q.f-1,0];return[-1,0]}
 if(q.f!==q.tf){if(q.c>0)return[q.f,q.c-1];return[q.f+(q.tf>q.f?1:-1),0]}
 return[q.f,q.c+(q.tc>q.c?1:-1)]}
function tacStepTime(B,q,ns){
 let t=q.f<0||ns[0]<0?1.5:ns[0]!==q.f?2.6:1.8;
 const cl=ns[0]>=0?tacCel(B,ns[0],ns[1]):null;
 if(cl)t*=1+cl.s*.8;
 if(q.task==='attack'&&q.line)t*=1.4;
 if(q.carry)t*=1.5;
 if(q.ty==='robot')t*=1.6;
 if(q.task==='ritgo')t*=.8;
 return t}
// 能力：回傳 '' 表示可以，否則為不可執行的原因
function tacCan(B,q,k,f,c){
 if(q.down)return'該組已倒地，等待 RIT 救援';
 const lad=q.ty==='ladder';
 if(k==='exit')return lad?'雲梯組在建物外作業':'';
 if(k==='ppv')return q.ty==='vent'?'':'只有排煙組有正壓送風機';
 if(k==='rit')return(lad||q.ty==='robot')?'此組無法編為 RIT':'';
 if(q.air<.3&&!lad&&q.ty!=='robot'&&k!=='exit')return'空氣瓶不足，需先撤出換瓶';
 if(f===undefined||f<0)return'請點選建物內的位置';
 if(lad){
  if(f>=(TAC_LADR[q.code]||7))return'超出雲梯可達高度（'+(TAC_LADR[q.code]||7)+'F 以下）';
  if(k==='ladder'||k==='master'||k==='vent'||k==='roof')return c===0&&k!=='roof'?'雲梯須靠窗作業':'';
  return'雲梯組只能雲梯救援、外部射水或破窗排煙'}
 if(k==='master'||k==='ladder')return'需要雲梯車';
 if(k==='attack')return(q.ty==='pump'||q.ty==='robot')?'':'此組沒有水線';
 if(k==='search')return q.ty==='robot'?'機器人無法搜索搬運':c===0?'樓梯間不需搜索':'';
 if(k==='vent')return q.ty==='robot'?'機器人無法破窗':c===0?'樓梯間沒有窗戶，屋頂排煙請點頂樓樓梯間':'';
 if(k==='roof')return q.ty==='robot'?'機器人無法上屋頂':'';
 return''}
// 下達指令
function tacOrder(inc,q,k,f,c,quiet){
 const B=inc.tac;
 if(k==='vent'&&c===0&&f===B.F-1)k='roof';
 const why=tacCan(B,q,k,f,c);
 if(why){if(!quiet)msg=q.cs+'：'+why;return false}
 q.prev=null;q.wk=0;q.ext=0;
 if(k==='exit'){q.task='exit';q.tf=-1;q.tc=0}
 else if(k==='rit'){q.task='rit';q.tf=-1;q.tc=0;
  const dn=B.sq.find(x=>x.down&&!B.sq.some(y=>y.task==='ritgo'&&y.resc===x.u));
  if(dn){q.task='ritgo';q.resc=dn.u;q.tf=dn.f;q.tc=dn.c}}
 else if(k==='ppv'){
  if(B.ppv&&q.task==='ppv'){B.ppv=0;q.task='idle';if(!quiet)radio(inc,q.cs,'正壓送風機關閉。');return true}
  q.task='ppv';q.tf=-1;q.tc=0}
 else if(k==='roof'){q.task='roof';q.tf=q.ty==='ladder'?-1:B.F-1;q.tc=0;q.lf=B.F-1;q.lc=0}
 else if(q.ty==='ladder'){q.task=k;q.tf=-1;q.tc=0;q.lf=f;q.lc=c}
 else{q.task=k;q.tf=f;q.tc=c}
 if(k==='attack'||k==='master')q.lt=S.t;
 if(!quiet)radio(inc,q.cs,'收到，'+TAC_TASK[q.task]+(f>=0&&k!=='rit'&&k!=='exit'&&k!=='ppv'?'，目標 '+tacFlr(k==='roof'?B.F-1:f)+(c>0?'-'+c+' 室':' 樓梯間'):'')+'。');
 return true}
function tacDown(inc,B,q,why){
 if(q.down)return;
 if(q.carry&&q.f>=0){tacCel(B,q.f,q.c).vic+=q.carry}
 q.down=1;q.carry=0;B.mayday++;
 radio(inc,q.cs,'MAYDAY！MAYDAY！MAYDAY！'+why+'，位置 '+tacFlr(q.f)+(q.c?'-'+q.c+' 室':' 樓梯間')+'，'+q.n+' 名隊員。');
 const r=B.sq.find(x=>x.task==='rit'&&!x.down);
 if(r){r.task='ritgo';r.resc=q.u;r.tf=q.f;r.tc=q.c;radio(inc,r.cs,'RIT 收到，立即入室救援 '+q.cs+'。')}
 else{B.noRit++;radio(inc,'受理','現場未編成 RIT！請立即指派小組救援 '+q.cs+'。')}}
// 小組每幀更新：空氣、受傷、移動、任務執行
function tacSquad(inc,B,q,dt,eff){
 const inside=tacIn(q),cl=inside?tacCel(B,q.f,q.c):null,cmd=onScene(inc).some(u=>u.code==='41'&&u.st==='work')?1.15:1;
 if(q.down){
  q.hp-=dt*.004*(1+(cl?cl.h*2:0));
  if(q.hp<=0){
   B.lodd++;B.mayday=Math.max(0,B.mayday-1);S.rep-=12;S.score-=200;
   msg='消防人員殉職：'+q.cs+'（評鑑 -12）';
   radio(inc,'受理',q.cs+' 隊員搶救無效，現場全員默哀，請各組確實人員清點。');
   const u=S.units.find(x=>x.id===q.u);if(u){u.inc=null;crewDown(u);home(u)}
   q.gone=1;if(S.rep<=0){S.rep=0;S.over=true}}
  return}
 if(inside&&q.ty!=='robot'){
  q.air-=dt/TAC_AIR*((q.task==='attack'||q.task==='search'||q.task==='ritgo')?1.15:1)*(q.carry?1.3:1);
  if(q.air<=0){q.air=0;tacDown(inc,B,q,'空氣瓶耗盡');return}
  // 低壓：除了搬運受困者與 RIT 救援，一律撤出換瓶（換瓶後回原任務）
  if(q.air<.33&&q.task!=='exit'&&q.task!=='carry'&&q.task!=='ritgo'){
   if(!q.low)radio(inc,q.cs,'空氣瓶低壓警報，撤出換瓶。');
   q.low=1;q.prev=(q.task==='idle'||q.task==='rit')?null:{task:q.task,tf:q.tf,tc:q.tc};q.task='exit';q.tf=-1;q.tc=0}
  else if(q.air<.33&&!q.low){q.low=1;radio(inc,q.cs,'空氣瓶低壓警報，完成手上任務後撤出。')}
  const prot=q.task==='attack'&&q.line&&eff>0&&q.f===q.tf&&q.c===q.tc;
  if(cl.h>.68)q.hp-=dt*(cl.h-.62)*(prot?.015:.07);
  if(q.hp<.3){tacDown(inc,B,q,'高溫受困');return}}
 // 移動
 const ns=tacNext(q);
 if(ns){q.nf=ns[0];q.nc=ns[1];q.mt+=dt;
  if(q.mt>=tacStepTime(B,q,ns)){q.mt=0;q.f=ns[0];q.c=ns[1];if(q.f<0)tacOutside(inc,B,q)}
  return}
 q.mt=0;q.nf=q.f;q.nc=q.c;
 const k=q.task;
 if(!inside){
  // 屋外：換瓶、雲梯作業、正壓送風
  if(q.hp<1)q.hp=Math.min(1,q.hp+dt*.03);
  if(q.air<1&&q.ty!=='robot'&&q.ty!=='ladder'){q.air=Math.min(1,q.air+dt/7);
   if(q.air>=1){q.low=0;if(q.prev){const p=q.prev;q.prev=null;q.task=p.task;q.tf=p.tf;q.tc=p.tc;
     radio(inc,q.cs,'換瓶完成，返回'+tacFlr(p.tf)+'續行'+TAC_TASK[p.task]+'。')}}
   return}
  if(k==='ppv'){if(!B.ppv){B.ppv=1;radio(inc,q.cs,'正壓送風機於一樓入口架設完成，開始送風。')}return}
  if(q.ty==='ladder'&&(k==='ladder'||k==='master'||k==='vent'||k==='roof')){
   if(q.ext<1){q.ext=Math.min(1,q.ext+dt/7);return}
   const lc=tacCel(B,q.lf,q.lc);
   if(k==='roof'){if(!B.roof){B.roof=1;radio(inc,q.cs,'雲梯就位，已開啟頂樓樓梯間屋頂排煙口。')}q.task='idle';return}
   if(k==='vent'){if(!lc.v){lc.v=1;radio(inc,q.cs,'由雲梯破窗，'+tacFlr(q.lf)+'-'+q.lc+' 室開口完成。')}q.task='idle';return}
   if(k==='master'){
    if(lc.h<=0){q.task='idle';radio(inc,q.cs,tacFlr(q.lf)+'-'+q.lc+' 室火勢已熄，停止外部射水。');return}
    if(q.line&&eff>0){lc.h=Math.max(0,lc.h-dt*.06*eff);lc.wet=1;lc.v=1;if(lc.h<.03){lc.h=0;lc.dw=1}
     // 內外夾攻：同層、射水房間附近的入室小組會被推回的熱煙燙傷
     const hit=B.sq.filter(x=>tacIn(x)&&x.f===q.lf&&x.c>0&&Math.abs(x.c-q.lc)<=1&&x.ty!=='robot'&&!x.down);
     if(hit.length&&!q.warn){q.warn=1;radio(inc,'安全官','警告：'+tacFlr(q.lf)+' 有入室小組，外部射水會把熱煙推回室內！')}
     if(!hit.length)q.warn=0;
     for(const x of hit)x.hp-=dt*.015}
    return}
   // 雲梯救援：先由窗口搜索，再逐一救下
   if(lc.srch<1){lc.srch=Math.min(1,lc.srch+dt/9);
    if(lc.srch>=1)radio(inc,q.cs,tacFlr(q.lf)+'-'+q.lc+' 室窗口搜索完成，'+(lc.vic?'發現 '+lc.vic+' 名受困者。':'未發現受困者。'));return}
   if(lc.vic>0){q.wk+=dt;
    if(q.wk>=6){q.wk=0;lc.vic--;B.resc++;radio(inc,q.cs,'雲梯救出受困者 1 名，交由救護組。')}
    return}
   q.task='idle'}
  return}
 // 室內任務
 if(k==='attack'){
  if(q.line&&eff>0){
   const fo=q.code==='57'?1.3:1,pw=.085*eff*fo*(q.n/3)*cmd;
   cl.h=Math.max(0,cl.h-dt*pw);cl.wet=1;if(cl.h<.03){cl.h=0;cl.dw=1}
   for(const d of[-1,1]){const cc=q.c+d;if(cc>=1&&cc<=B.R){const nb=tacCel(B,q.f,cc);nb.h=Math.max(0,nb.h-dt*pw*.2);if(nb.h<.02)nb.h=0}}
   if(cl.h<.03){ // 本室已撲滅：沿同層推進到最近的火點
    let best=null,bd=99;
    for(let c=1;c<=B.R;c++){const x=tacCel(B,q.f,c);if(x.h>.05&&Math.abs(c-q.c)<bd&&
     !B.sq.some(y=>y!==q&&y.task==='attack'&&y.tf===q.f&&y.tc===c)){bd=Math.abs(c-q.c);best=c}}
    if(best!==null)q.tc=best;else{q.task='hold';q.tf=q.f;q.tc=q.c;radio(inc,q.cs,tacFlr(q.f)+' 火勢已撲滅，守線待命。')}}}
  return}
 if(k==='hold'){ // 守線：同層復燃立即再攻擊
  for(let c=1;c<=B.R;c++)if(tacCel(B,q.f,c).h>.05){q.task='attack';q.tc=c;q.lt=S.t;break}
  return}
 if(k==='search'){
  if(cl.srch<1){cl.srch=Math.min(1,cl.srch+dt/(q.ty==='resc'?5:8)/(1+cl.s)*(q.n/3)*cmd);return}
  if(cl.vic>0){const take=Math.min(cl.vic,q.n>=4?2:1);cl.vic-=take;q.carry=take;q.task='carry';q.tf=-1;q.tc=0;
   radio(inc,q.cs,tacFlr(q.f)+'-'+q.c+' 室發現受困者 '+take+' 名，搬運下樓。');return}
  // 本室無人：往同層下一個未搜索的房間
  let best=null,bd=99;
  for(let c=1;c<=B.R;c++){const x=tacCel(B,q.f,c);if(x.srch<1&&Math.abs(c-q.c)<bd&&
   !B.sq.some(y=>y!==q&&y.task==='search'&&y.tf===q.f&&y.tc===c)){bd=Math.abs(c-q.c);best=c}}
  if(best!==null)q.tc=best;else{q.task='idle';radio(inc,q.cs,tacFlr(q.f)+' 搜索完畢，未再發現受困者。')}
  return}
 if(k==='vent'){q.wk+=dt;if(q.wk>=(q.ty==='vent'?2:4)){q.wk=0;cl.v=1;q.task='idle';
  radio(inc,q.cs,tacFlr(q.f)+'-'+q.c+' 室破窗完成，開口建立。')}return}
 if(k==='roof'){q.wk+=dt;if(q.wk>=4){q.wk=0;B.roof=1;q.task='idle';radio(inc,q.cs,'頂樓屋頂排煙口已開啟。')}return}
 if(k==='ritgo'){
  const dn=B.sq.find(x=>x.u===q.resc);
  if(!dn||!dn.down||dn.gone){q.task='rit';q.tf=-1;q.tc=0;return}
  if(dn.f!==q.f||dn.c!==q.c){q.tf=dn.f;q.tc=dn.c;return}
  q.wk+=dt;
  if(q.wk>=4){q.wk=0;dn.down=0;dn.hp=Math.max(dn.hp,.5);dn.air=Math.max(dn.air,.3);dn.low=1;
   B.mayday=Math.max(0,B.mayday-1);dn.task='exit';dn.tf=-1;dn.tc=0;dn.prev=null;
   q.task='exit';q.tf=-1;q.tc=0;q.prev={task:'rit',tf:-1,tc:0};
   radio(inc,q.cs,'RIT 已接觸 '+dn.cs+'，更換備用氣瓶，協同撤出。')}
  return}}
function tacOutside(inc,B,q){
 if(q.carry){B.resc+=q.carry;
  const ems=onScene(inc).some(u=>u.code==='91'&&u.st==='work');
  radio(inc,q.cs,'受困者 '+q.carry+' 名救出，'+(ems?'交由救護組處置。':'現場無救護車，請求救護支援！'));
  q.carry=0;q.task='idle';
  if(!q.low){q.prev=null}}
 else if(q.task==='exit'){q.task=q.prev&&q.prev.task==='rit'?'rit':'idle';if(q.task==='rit')q.prev=null}}
// 火煙動態：成長、延燒、閃燃、煙層流動、排煙、受困者存活
function tacFire(inc,B,dt){
 const W=B.W,F=B.F,R=B.R,dh=new Float32Array(B.cells.length);
 let openings=B.roof;for(const x of B.cells)if(x.v)openings++;
 if(B.ppv&&!openings&&!B.ppvW){B.ppvW=1;radio(inc,'安全官','正壓送風中但建物沒有排煙開口，煙無處可去！')}
 for(const x of B.cells){
  if(!x.c)continue;
  if(x.fu>0&&x.h>.02){
   const ox=.45+.55*x.v+(x.v&&B.ppv?.6:0)-(x.s>.85&&!x.v?.2:0);
   if(!x.wet)x.h=Math.min(1,x.h+dt*(.006+.03*x.h*(1-x.h*.5))*ox*B.fk*(x.dw?.35:1));
   x.fu=Math.max(0,x.fu-dt*x.h*.0028)}
  else if(x.fu<=0)x.h=Math.max(0,x.h-dt*.02);
  x.s=Math.min(1,x.s+dt*x.h*.09);
  if(!x.fl&&x.h>.82&&x.s>.7&&!x.wet){x.fl=1;x.h=1;
   radio(inc,'安全官',tacFlr(x.f)+'-'+x.c+' 室發生閃燃！');
   for(const q of B.sq)if(q.f===x.f&&q.c===x.c&&q.ty!=='robot'&&!q.down){q.hp-=.45;if(q.hp<.3)tacDown(inc,B,q,'遭遇閃燃')}}
  if(x.fl&&x.h<.25)x.fl=0;
  if(x.h>.45&&!x.wet){
   for(const d of[-1,1]){const cc=x.c+d;if(cc<1||cc>R)continue;const nb=B.cells[x.f*W+cc];
    if(nb.fu>0)dh[x.f*W+cc]+=dt*.011*(x.h-.4)*(nb.wet?.2:1)}
   if(x.f+1<F){const up=B.cells[(x.f+1)*W+x.c];if(up.fu>0)dh[(x.f+1)*W+x.c]+=dt*.008*(x.h-.45)*(1+x.v*1.6)}}}
 for(let i=0;i<dh.length;i++)if(dh[i]>0){const x=B.cells[i];x.h=Math.min(1,Math.max(x.h,.02)+dh[i])}
 // 煙：同層水平交換（含樓梯間），樓梯間往上竄
 for(let f=0;f<F;f++)for(let c=0;c<R;c++){
  const a=B.cells[f*W+c],b=B.cells[f*W+c+1],m=(a.s-b.s)*dt*.25;a.s-=m;b.s+=m}
 for(let f=0;f<F-1;f++){const a=B.cells[f*W],b=B.cells[(f+1)*W],m=a.s*dt*.2*(1-b.s);a.s-=m;b.s+=m}
 const press=B.ppv&&openings>0;
 for(const x of B.cells){
  let out=.004;
  if(x.v)out+=.1+(B.ppv?.18:0);
  if(press)out+=.05;
  if(!x.c&&x.f===F-1&&B.roof)out+=.25;
  x.s=Math.max(0,Math.min(1,x.s-dt*out*Math.max(.3,x.s)*2));
  if(x.vic>0){x.vh-=dt*(x.s*.005+Math.max(0,x.h-.35)*.03);
   if(x.vh<=0){B.lost+=x.vic;S.rep-=3*x.vic;radio(inc,'受理',tacFlr(x.f)+'-'+x.c+' 室受困者 '+x.vic+' 名罹難（評鑑 -'+(3*x.vic)+'）。');
    x.vic=0;if(S.rep<=0){S.rep=0;S.over=true}}}}}
// 水線分配：依下令先後，最多 effLines 條
function tacCap(inc){
 if(!waterOK(inc))return 0;
 const tp=tankPool(inc);
 return Math.max(0,Math.min(pumpsOn(inc)*2,Math.max(1,Math.floor((inflowOf(inc)+(tp[0]>tp[1]*.3?LPS:0))/LPS)))-(inc.burst>0?1:0))}
function tacLines(inc,B){
 const L=tacCap(inc);
 const want=B.sq.filter(q=>(q.task==='attack'||q.task==='master'||q.task==='hold')&&!q.down).sort((a,b)=>a.lt-b.lt);
 for(const q of B.sq)q.line=0;
 let n=0;for(let i=0;i<want.length&&i<L;i++){want[i].line=1;n++}
 inc.lines=Math.max(1,n); // 用水量依實際出水線數計算
 return L}
// 戰術 AI：玩家未親自指揮時的現場指揮官
function tacAI(inc,B,dt){
 B.aiT-=dt;if(B.aiT>0)return;B.aiT=1.5;
 const free=B.sq.filter(q=>!q.down&&(q.task==='idle'||q.task==='hold')&&!q.prev&&(q.ty==='ladder'||q.ty==='robot'||q.air>(tacIn(q)?.45:.6)));
 const burning=B.cells.filter(x=>x.c&&x.h>.05).sort((a,b)=>a.f-b.f||b.h-a.h);
 if(!B.sq.some(q=>q.task==='rit'||q.task==='ritgo')&&B.sq.length>=3){
  const r=free.find(q=>q.ty==='resc'&&!tacIn(q))||(B.sq.length>=4?free.find(q=>q.ty==='pump'&&!tacIn(q)):null);
  if(r){tacOrder(inc,r,'rit',-1,0,1);radio(inc,r.cs,'編為 RIT，於一樓入口待命。');free.splice(free.indexOf(r),1)}}
 if(B.mayday&&!B.sq.some(q=>q.task==='ritgo')){
  const dn=B.sq.find(q=>q.down);
  const r=dn&&B.sq.filter(q=>!q.down&&q.ty!=='ladder'&&q.ty!=='robot'&&q.air>.45&&q.task!=='carry')
   .sort((a,b)=>(Math.abs(a.f-dn.f)+Math.abs(a.c-dn.c))-(Math.abs(b.f-dn.f)+Math.abs(b.c-dn.c)))[0];
  if(r){tacOrder(inc,r,'rit',-1,0,1);radio(inc,r.cs,'轉任 RIT，前往救援 '+dn.cs+'。');const i=free.indexOf(r);if(i>=0)free.splice(i,1)}}
 let spare=tacCap(inc)-B.sq.filter(q=>q.line).length;
 for(const q of free){
  if((q.ty==='pump'||q.ty==='robot')&&(spare>0||q.line)){
   const t=burning.find(x=>!B.sq.some(y=>y!==q&&y.task==='attack'&&y.tf===x.f&&y.tc===x.c));
   if(t&&tacOrder(inc,q,'attack',t.f,t.c,1)){if(!q.line)spare--;continue}
   if(q.task==='hold'&&burning.length===0&&q.ty==='pump'){/* 守線即可 */}}
  if(q.ty==='resc'||q.ty==='pump'||q.ty==='vent'){
   const un=B.cells.filter(x=>x.c&&(x.srch<1||x.vic>0)&&x.h<.45&&!B.sq.some(y=>y!==q&&y.task==='search'&&y.tf===x.f&&y.tc===x.c));
   const pri=x=>(x.f===B.hint?-20:0)+(x.f>=B.of?-5:0)+Math.abs(x.f-B.of)+x.c*.1;
   un.sort((a,b)=>pri(a)-pri(b));
   if(q.ty==='vent'){
    const atk=B.sq.find(y=>y.task==='attack'&&y.line&&y.f===y.tf&&y.c===y.tc&&tacIn(y));
    if(atk&&!tacCel(B,atk.f,atk.c).v&&tacOrder(inc,q,'vent',atk.f,atk.c,1))continue;
    if(atk&&!B.ppv&&!tacIn(q)&&tacOrder(inc,q,'ppv',-1,0,1))continue}
   if(un.length&&q.ty!=='vent'&&tacOrder(inc,q,'search',un[0].f,un[0].c,1))continue}
  if(q.ty==='ladder'){
   const reach=TAC_LADR[q.code]||7;
   const v=B.cells.find(x=>x.c&&x.f<reach&&x.vic>0&&x.srch>=1);
   if(v&&tacOrder(inc,q,'ladder',v.f,v.c,1))continue;
   const top=tacCel(B,B.F-1,0);
   if(!B.roof&&top.s>.5&&B.F-1<reach&&tacOrder(inc,q,'roof',B.F-1,0,1))continue;
   const ex=burning.find(x=>x.f<reach&&!B.sq.some(y=>tacIn(y)&&y.f===x.f));
   if(ex&&spare>0&&tacOrder(inc,q,'master',ex.f,ex.c,1)){spare--;continue}}}}
// 由 stepIncident 呼叫：取代原本的抽象進度
function tacIncident(inc,dt,first,flow){
 const B=inc.tac;
 if(inc.req){inc.reqT-=dt;if(inc.reqT<=0)answer(inc,false,true)}
 tacSync(inc);
 const eff=waterOK(inc)?flow:0;
 tacLines(inc,B);
 for(const x of B.cells)x.wet=0;
 for(const q of B.sq)tacSquad(inc,B,q,dt,eff);
 B.sq=B.sq.filter(q=>!q.gone);
 tacFire(inc,B,dt);
 if(!(TAC.open&&TAC.id===inc.id))tacAI(inc,B,dt);
 // 進度：控火 60%、受困者處置 40%；完全撲滅且受困者都已處置後殘火處理 8 秒
 let sumH=0,out=true;for(const x of B.cells){sumH+=x.h;if(x.h>=.04)out=false}
 B.peak=Math.max(B.peak,sumH);
 let left=0;for(const x of B.cells)left+=x.vic;for(const q of B.sq)left+=q.carry;
 const vd=B.vtot?(B.vtot-left)/B.vtot:1;
 B.p=.6*(1-sumH/Math.max(.001,B.peak))+.4*vd;
 if(out&&!left){B.doneT+=dt;
  if(B.doneT>=8&&!B.done){B.done=1;
   B.burnt=B.cells.filter(x=>x.c&&x.fu<.3).length;
   const half=B.burnt>B.R*B.F*.5;
   if(half){S.rep-=5;if(S.rep<=0){S.rep=0;S.over=true}}
   radio(inc,first?first.cs:'現場',(half?'建物大部分燒毀，火勢因燃料耗盡熄滅（評鑑 -5）':'火勢完全撲滅、殘火處理完成')+'，救出 '+B.resc+' 名'+(B.lost?'、罹難 '+B.lost+' 名':'')+(B.burnt?'，燒毀 '+B.burnt+' 室':'')+'。');
   if(!B.paid){B.paid=1;S.money+=B.resc*400;S.score+=B.resc*50+(B.lodd?0:60)}}}
 else B.doneT=0;
 const w=inc.dur*(B.done?1:Math.min(.96,B.p));
 if(w>inc.work)inc.work=w;
 const np=Math.min(inc.phs.length-1,Math.floor(inc.work/inc.dur*inc.phs.length));
 if(np>inc.ph){inc.ph=np;radio(inc,first?first.cs:'現場','進入「'+inc.phs[np]+'」階段。')}
 if(!B.done)inc.left-=dt*(first?.22:1)}
