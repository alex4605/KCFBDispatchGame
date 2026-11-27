// 每幀模擬更新：單一案件的水源、外部單位、器材關卡、進度與結案
'use strict';
function stepIncident(i,dt){
  const inc=S.inc[i],Kd=KIND[inc.k];
  const w=fill(inc,1),got=w.reduce((a,b)=>a+b,0),tot=inc.need.reduce((a,g)=>a+g.n,0);
  let cmd=1,first=null;
  for(const u of onScene(inc))if(onDuty(u)){
   if(!first)first=u;if(u.code==='41')cmd=1.2}
  const bon=1+Math.min(.2,w.extra*.04),wo=waterOK(inc);
  if(Kd.w&&wo&&!inc.fl.w){inc.fl.w=1;radio(inc,first?first.cs:'現場','水線佈設完成，開始出水。')}
  if(Kd.w&&inc.tender&&first){
   let onTank=0;for(const u of onScene(inc))if(u.st==='work'&&u.code==='61')onTank++;
   if(!onTank&&inc.hooked&&!inc.fl.gap){inc.fl.gap=1;
    radio(inc,first.cs,'水庫車返回補水中，現場無供水車，請求另一輛水庫車接替。')}
   if(onTank&&inc.fl.gap)inc.fl.gap=0}
  const flow=stepWater(inc,dt,first);
  stepAgencies(inc,Kd,dt,first);
  // 已進入戰術指揮的建物火災：進度由 tactics.js 的樓層平面模型決定
  // 山林火警：到場後由山火作戰圖（wildfire.js）決定進度；建物防護戰術場景同時進行
  if(inc.k==='forest'&&inc.rev){wfIncident(inc,dt,first);if(inc.tac)tacIncident(inc,dt,first,flow)}
  else if(inc.tac)tacIncident(inc,dt,first,flow);
  else{
  const waitPol=Kd.pol&&inc.pol<2&&inc.ph>=1,waitPow=Kd.pow&&inc.pow<2&&inc.ph>=1;
  const tacHold=Kd.tac&&inc.clr>0&&inc.ph>=(Kd.clrPh!==undefined?Kd.clrPh:3);
  const gm=inc.ph>=0?phaseMiss(inc):null;
  stepGate(inc,dt,first,gm);
  if(inc.phs[inc.ph]==='到院交接'&&!onScene(inc).some(u=>u.st==='work'||u.st==='tx'||u.st==='give'||u.st==='clean'))inc.work=inc.dur;
  const held=(inc.req&&inc.req.t==='call')||waitPol||waitPow||!!gm||tacHold;
  if(inc.req){inc.reqT-=dt;if(inc.reqT<=0)answer(inc,false,true)}
  let atH=false;for(const u of onScene(inc))if(u.st==='give'||u.st==='clean'){atH=true;break}
  if(atH&&inc.ph>=inc.phs.length-2){
   const floorW=inc.dur*(inc.phs.length-1)/inc.phs.length;
   if(inc.work<floorW)inc.work=floorW;
   inc.work=Math.min(inc.dur,inc.work+dt*inc.dur/inc.phs.length/9);
   if(inc.ph<inc.phs.length-1){inc.ph=inc.phs.length-1;radio(inc,first?first.cs:'現場','進入「'+inc.phs[inc.ph]+'」階段。')}}
  stepProgress(inc,dt,first,got,tot,cmd,bon,flow,wo,held,atH);
  stepChatter(inc,Kd,dt,first);
  const blsGo=got===0&&inc.pm.cc!==undefined&&onScene(inc).some(u=>u.code==='91'&&(u.st==='work'||u.st==='tx'));
  if(!((got>0||blsGo)&&wo&&!held&&flow>0))inc.left-=dt*(first?(gm?.35:held?.75:.5):1);
  }
  if(inc.work>=inc.dur&&!inc.wrap&&first&&inc.phs[inc.phs.length-1]!=='到院交接'){
   inc.wrap=6+tot*1.6;
   radio(inc,first.cs,'任務目標達成，開始收整裝備與人員清點，預計 '+Math.round(inc.wrap)+' 秒。')}
  if(inc.wrap>0){inc.wrap-=dt;if(inc.wrap>0)return}
  if(inc.work>=inc.dur){closeIncident(inc,i);return}
  if(inc.left<=0){
   S.rep-=inc.pen;msg='逾時：'+(inc.nm||Kd.n)+' '+inc.addr+'（評鑑 -'+inc.pen+'）';
   release(inc,0);S.inc.splice(i,1);if(sel===inc.id)sel=null;
   if(S.rep<=0){S.rep=0;S.over=true}}}
// 水源：佔水、佈線增減、爆管、水箱收支、水庫車補水；回傳出水效率（0 表示沒水可打）
function stepWater(inc,dt,first){
 const Kd=KIND[inc.k];
  let flow=1;
  if(Kd.w){
   if(!inc.lines&&first)inc.lines=recLines(inc);
   let tend=0,pmp=0;
   for(const u of onScene(inc))if(u.st==='work'){
    if(u.code==='61')tend++;
    if(CODE[u.code].cap&&u.code!=='61')pmp++}
   const ready=inc.shuttle?false:inc.tender?(tend>=1&&pmp>=1):(pmp>=1+inc.relay);
   if(!inc.hooked&&ready&&first){
    if(!inc.hook){inc.hook=HOOKT;
     radio(inc,first.cs,inc.tender?'水庫車就位，開始接管供水，約需 '+HOOKT+' 秒。':
      '幫浦車開始佔水並接妥 4 吋硬管，約需 '+HOOKT+' 秒可以出水。')}
    else{inc.hook-=dt;
     if(inc.hook<=0){inc.hooked=1;inc.hook=0;
      radio(inc,first.cs,'已完成佔水，水線加壓完成，正常出水。')}}}
   if(!ready&&!inc.hooked)inc.hook=0;
   const share=inc.tender?1:hydShare(inc);
   const inflow=inflowOf(inc);
   if(share<1&&!inc.fl.shr){inc.fl.shr=1;
    if(first)radio(inc,first.cs,'同一消防栓另有案件使用，水量分流，出水壓力下降。')}
   if(first){
    const oc=onScene(inc).filter(u=>u.st==='work');
    const boss=oc.filter(u=>u.code==='41')[0]||oc.filter(u=>CODE[u.code].cap)[0]||first;
    const cap2=Math.max(1,pumpsOn(inc)*2);
    const tp1=tankPool(inc);
    const supCap=Math.max(1,Math.floor((inflow+(tp1[0]>tp1[1]*.3?LPS:0))/LPS));
    const want=Math.min(recLines(inc),cap2,supCap);
    const tp0=tankPool(inc),lowW=tp0[1]&&tp0[0]/tp0[1]<.25&&inflow<inc.lines*LPS;
    if(inc.tac){}
    else if(!inc.lines){inc.lines=want;
     radio(inc,boss.cs,'現場評估後佈設 '+inc.lines+' 線攻擊，水源由'+(inc.shuttle?'幫浦車輪流往返補水':inc.tender?'水庫車供應':'消防栓佔水')+'。')}
    else{inc.lineT=(inc.lineT||10)-dt;
     if(inc.lineT<=0){inc.lineT=12;
      if((inc.dry||lowW)&&inc.lines>1){inc.lines--;
       radio(inc,boss.cs,'水源不足，收線至 '+inc.lines+' 線，改以間歇射水。')}
      else if(want>inc.lines){inc.lines++;
       radio(inc,boss.cs,'人車到齊，增佈第 '+inc.lines+' 線。')}
      else if(want<inc.lines){inc.lines=want;
       radio(inc,boss.cs,'依現有人力調整為 '+inc.lines+' 線。')}}}}
   if(inc.burst>0){inc.burst-=dt;if(inc.burst<=0&&first)radio(inc,first.cs,'破損水帶已更換完成，恢復出水。')}
   else{inc.burstT-=dt;
    if(inc.burstT<=0){inc.burstT=45+Math.random()*40;
     if(inc.hooked&&effLines(inc)>=3&&Math.random()<.35&&first){
      inc.burst=10+Math.random()*6;
      radio(inc,first.cs,'第 '+effLines(inc)+' 線水帶爆管，該線暫停出水，更換中。')}}}
   const eff=Math.max(0,effLines(inc)-(inc.burst>0?1:0));
   const use=eff*LPS,net=(inflow-use)*dt;
   if(net<0){const got2=drawWater(inc,-net);
    if(got2<-net*.999){ // 水量不足
     if(!inc.dry){inc.dry=1;radio(inc,first?first.cs:'現場','現場水箱見底，射水中斷，請求供水。')}
    }else inc.dry=0}
   else{fillTanks(inc,net);inc.dry=0}
   const[pool]=tankPool(inc);
   if(eff===0)flow=0;
   else if(inc.dry&&pool<=1)flow=0;
   else flow=Math.min(1.5,eff/recLines(inc));
   if(inc.shuttle)shuttleRun(inc);
   else if(inc.tender)for(const u of onScene(inc))
    if(u.code==='61'&&u.st==='work'&&u.tank<=60&&!u.back)refillRun(u,inc);
  }
  return flow}
// 外部單位：警方到場、台電斷電、高危情境淨空的倒數與通報
function stepAgencies(inc,Kd,dt,first){
  if(inc.pol===1){inc.polT-=dt;if(inc.polT<=0){inc.pol=2;radio(inc,'110','警方已到場，現場由警方協助管制。')}}
  epaStep(inc,dt);
  if(inc.pow===1){inc.powT-=dt;if(inc.powT<=0){inc.pow=2;radio(inc,'台電','台電回報該區已停電，確認無電壓。')}}
  if(Kd.tac&&inc.clr>0&&first){
   inc.clr-=dt;
   if(!inc.fl.tc&&inc.clr<=0){inc.fl.tc=1;
    radio(inc,'110','現場已控制淨空，消防與救護可以進入。')}
   else if(!inc.fl.tw){inc.fl.tw=1;
    radio(inc,'110','嫌疑人尚未制伏，請消防救護維持在封鎖線外待命。')}}
}
// 器材關卡：目前階段缺件時暫停作業、請求支援，久候則權宜處置
function stepGate(inc,dt,first,gm){
  if(gm&&first){
   inc.gw=(inc.gw||0)+dt;
   if(inc.gw>42){inc.fl['w'+inc.ph]=1;inc.gw=0;inc.slow=Math.max(.6,(inc.slow||1)*.8);
    radio(inc,first.cs,'等不到'+gm[0]+'，改以現有裝備權宜處置，作業速度受限。')}}
  if(gm&&first){
   const key='g'+inc.ph;
   if(!inc.fl[key]){inc.fl[key]=1;
    radio(inc,first.cs,'「'+inc.phs[inc.ph]+'」階段缺少'+gm.join('、')+'，作業暫停，請求支援。');
    if(!inc.req){const cc=codesFor([gm[0]])[0];
     if(cc)inc.req={t:'need',s:'請求增派攜帶'+gm[0]+'的車輛支援。',c:cc,als:0,cs:first.cs,gate:1},inc.reqT=22}
    for(const it of gm){
     if(!inc.need.some(g=>g.item===it))
      inc.need.unshift({item:it,l:it,n:1,c:codesFor([it]),als:needsALS([it]),k:'stage',items:[it]})}}}
}
// 作業進度：累積進度、進入下一階段、階段回報與隨機現場請求
function stepProgress(inc,dt,first,got,tot,cmd,bon,flow,wo,held,atH){
  if((got>0||(inc.pm.cc!==undefined&&onScene(inc).some(u=>u.code==='91'&&(u.st==='work'||u.st==='tx'))))&&wo&&!held){
   let atHosp=false;
   if(inc.phs[inc.ph]==='到院交接')for(const u of onScene(inc))if(u.st==='give'||u.st==='clean'){atHosp=true;break}
   let ratio=atHosp?1:Math.pow(got/tot,1.35);
   if(!atHosp&&ratio<.3&&inc.pm.cc!==undefined&&onScene(inc).some(u=>u.code==='91'&&(u.st==='work'||u.st==='tx')))ratio=.3;
   inc.work+=dt*ratio*cmd*bon*flow*(inc.slow||1)*(inc.epa===3?1.25:1)*(inc.dai&&inc.dai!=='none'?1.18:1);
   let txing=false;for(const u of onScene(inc))if(u.st==='tx'){txing=true;break}
   if(txing&&!atH){
    const capW=inc.dur*(inc.phs.length-1)/inc.phs.length-0.001;
    if(inc.work>capW)inc.work=capW}
   const np=Math.min(inc.phs.length-1,Math.floor(inc.work/inc.dur*inc.phs.length));
   if(np>inc.ph){inc.ph=np;
    const nm=inc.phs[np];
    radio(inc,first?first.cs:'現場','進入「'+nm+'」階段。');
    if(first&&SC[nm]){const tx=pickFit(SC[nm],inc);if(tx)inc.log.push({w:'場',s:say(tx,first,inc),t:S.t-inc.t0})}
    medReports(inc,nm,first);
    if(Math.random()<.22)fireEvent(inc,first)}}}
// 救護案件進入各階段時的生命徵象回報與後送出發
function medReports(inc,nm,first){
    if(inc.pm&&inc.pm.cc!==undefined&&first){
     const M=MED[inc.pm.cc];
     if(nm==='初步評估'&&!inc.pm.vs1){
      inc.pm.vs1=vsOf(M,0,0);
      radio(inc,first.cs,'第一組生命徵象：BT '+inc.pm.vs1.bt+'、HR '+(inc.pm.vs1.hr||'觸摸不到')+
       '、BP '+inc.pm.vs1.bp+'、SpO2 '+(inc.pm.vs1.sp||'測不到')+'%、AVPU '+inc.pm.vs1.av+'。');
      radio(inc,first.cs,'主要發現：'+M.f+'，主懷疑 '+M.imp+'。')}
     if(nm==='次評處置'&&M.lv>=1){
      const alsOn=onScene(inc).some(u=>(u.st==='work'||u.st==='tx')&&u.code==='91'&&u.tp);
      radio(inc,first.cs,'危急個案，線上通報急診預告 '+M.imp+
       (alsOn?'，已執行高級處置。':'，現場無 EMT-P，僅基本處置。'))}
     if(nm==='車內照護'){
      inc.pm.vs2=vsOf(M,1,onScene(inc).some(u=>u.code==='91'&&u.tp));
      radio(inc,first.cs,'第二組生命徵象：HR '+(inc.pm.vs2.hr||'無')+'、BP '+inc.pm.vs2.bp+
       '、SpO2 '+(inc.pm.vs2.sp||'—')+'%，途中持續監測。');
      for(const u of onScene(inc).slice()){
       if(u.code!=='91'||u.st!=='work')continue;
       const th=toHosp(u),bp2=th.p,hb2=th.h;
       if(bp2){u.path=bp2;u.st='tx';u.txT=0;unpark(u);
        radio(inc,u.cs,'病患已上車，離開現場前往'+(hb2?hb2.n:'醫院')+'。')}}}}
}
// 現場與指揮官的例行無線電回報
function stepChatter(inc,Kd,dt,first){
  if(first){inc.ambT=(inc.ambT||20)-dt;
   if(inc.ambT<=0){inc.ambT=18+Math.random()*16;
    const crew=onScene(inc).filter(u=>u.st==='work'||u.st==='tx');
    if(crew.length&&Math.random()<.82){
     const boss=crew.filter(u=>u.code==='41');
     if(boss.length&&Math.random()<.4){const u2=pick(boss),tx=pickFit(CMD,inc);if(tx)radio(inc,u2.cs,say(tx,u2,inc))}
     else{const u2=pick(crew),tx=pickFit(AMB[Kd.cls]||AMB['其他'],inc);if(tx)radio(inc,u2.cs,say(tx,u2,inc))}}}}
}
// 結案：獎金、評鑑、訊息、解除車輛
function closeIncident(inc,i){
 const Kd=KIND[inc.k];
   let bonus=0,tail='';
   if(inc.pm.ohca){
    if(inc.dai==='cpr'){bonus+=500;S.money+=500;S.score+=80;repGain(2)}
    else{S.rep-=3;tail='；OHCA 未實施 DA-CPR，預後不佳（評鑑 -3）'}}
   if(Kd.hoax&&!inc.tac){const u0=onScene(inc)[0];radio(inc,u0?u0.cs:'現場','查證完畢，查無火煙與傷患，研判為'+(inc.pm.mal?'惡作劇謊報，建議轉報 110 究辦':'善意誤報')+'。')}
   if(Kd.hoax&&inc.pm.mal&&inc.pol===2){bonus+=600;S.money+=600;S.score+=60}
   S.money+=inc.pay;S.score+=Math.round(inc.pay/10);S.solved++;repGain(1+(KIND[inc.k].lv||0)*.5);
   msg='結案：'+(inc.nm||Kd.n)+' '+inc.addr+'（+$'+(inc.pay+bonus)+'）'+tail;
   release(inc,1);S.inc.splice(i,1);if(sel===inc.id)sel=null}
