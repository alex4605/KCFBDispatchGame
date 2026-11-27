// 每幀模擬更新 step()：時間、進線、車輛移動與狀態、公務勤務
'use strict';
function step(dt){
 if(S.over)return;
 reindex();
 S.t+=dt;if(S.t>200*S.day)S.day++;
 if(!TRAIN.inc)S.spawn-=dt;if(S.spawn<=0){spawn();S.spawn=(Math.max(19,42-S.day*3)+Math.random()*12)*(aiActive()?AI_SLOW:1)}
 S.dspawn-=dt;if(S.dspawn<=0){spawnDuty();S.dspawn=130+Math.random()*80}
 for(const u of S.units)stepUnit(u,dt);
 if(S.units.some(u=>u.gone)){S.units=S.units.filter(u=>!u.gone);if(selU&&!S.units.some(u=>u.id===selU))selU=null;reindex()}
 stepDuties(dt);
 mrStep(dt);
 // 玩家在戰術畫面時，由戰略 AI 代理指揮中心
 if(TAC.open)stratAI(dt);
 for(let i=S.inc.length-1;i>=0;i--)stepIncident(i,dt)}
// 單一車輛：報停計時、整裝、補水、公務、沿路徑移動與抵達後的狀態轉換
function stepUnit(u,dt){
  // 支援外縣市：派出期間不在轄區，時間到返回分隊待命
  if(u.st==='away'){u.awayT-=dt;if(u.awayT<=0){u.st='idle';u.awayTo=null;crewDown(u)}return}
  if(u.st==='oos'){u.oosT-=dt;if(u.oosT<=0){u.st='idle';u.oosT=0}return}
  if(u.st==='tx'){
   u.txT=(u.txT||0)+dt;
   if(!u.path.length||u.txT>150){u.wait=9;u.st='give';u.clean=1;u.txT=0;return}}
  if(u.turn>0){u.turn-=dt;return}
  if(u.wait>0){u.wait-=dt;
   if(u.wait<=0){
    if(u.clean){u.clean=0;u.st='clean';u.wait=14}
    else{
     if(u.st==='clean'&&u.inc!=null){const ic=S.inc.find(i=>i.id===u.inc);
      if(ic&&ic.ph>=ic.phs.length-2)ic.work=ic.dur;u.inc=null}
     home(u)}}
   return}
  if(u.st==='filling'){
   const cap=CODE[u.code].cap;
   u.tank=Math.min(cap,u.tank+FILLRATE*dt);
   if(u.tank>=cap){
    const inc2=S.inc.find(i=>i.id===u.back);
    if(inc2){const p=pathTo(u,inc2);
     if(p){u.path=p;u.st='go';u.inc=inc2.id;u.parked=0;u.back=null;
      radio(inc2,u.cs,'補水完成，滿載返回現場。')}
     else{u.back=null;home(u)}}
    else{u.back=null;home(u)}}
   return}
  if(u.st==='duty'){
   const d=S.duties.find(x=>x.id===u.duty);
   if(!d){home(u);u.duty=null}
   else{d.run-=dt;
    if(d.run<=0){S.money+=d.pay;S.score+=Math.round(d.pay/12);
     S.duties.splice(S.duties.indexOf(d),1);u.duty=null;home(u)}}
   return}
  if(u.path.length){
   const t=u.path[0],sp=CODE[u.code].s*MULT[kcls(K(t[0],t[1]),modeOf(u.code))]*dt;
   const dx=t[0]-u.x,dy=t[1]-u.y,d=Math.hypot(dx,dy);
   if(d<=sp){u.x=t[0];u.y=t[1];u.path.shift()}
   else{u.x+=dx/d*sp;u.y+=dy/d*sp}
   if(!u.path.length){
    if(u.st==='go'){
     if(!u.parked&&stagePark(u))u.parked=1;
     else{u.parked=1;arrive(u)}}
    else if(u.st==='fill')u.st='filling';
    else if(u.st==='dgo'){u.st='duty';const d2=S.duties.find(x=>x.id===u.duty);if(d2)d2.run=d2.dur}
    else if(u.st==='hosp'){u.wait=9;u.st='give'}
    else if(u.st==='tx'){u.wait=9;u.st='give';u.clean=1}
    else{u.st='idle';crewDown(u);u.tank=CODE[u.code].cap||0;
     // 戰術現場有隊員受傷或殉職：返隊後報停
     if(u.oosAfter){u.st='oos';u.oosT=u.oosAfter;u.oosAfter=0;return}
     if(Math.random()<.04){u.st='oos';u.oosT=45+Math.random()*45}}}}}
// 公務勤務：逾時未派遣扣評鑑
function stepDuties(dt){
 for(let i=S.duties.length-1;i>=0;i--){
  const d=S.duties[i];
  if(d.unit)continue;
  if(!TAC.open)d.left-=dt;            // 戰術畫面開著時公務時限暫停
  if(d.left<=0){S.rep-=3;msg='公務未派遣：'+d.n+'（評鑑 -3）';
   S.duties.splice(i,1);if(sel===d.id)sel=null;
   if(S.rep<=0){S.rep=0;S.over=true}}}
}
