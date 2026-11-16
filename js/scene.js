// 現場畫面主流程 drawScene()：算出共用變數後依序呼叫各 scene-*.js 的繪製函式
'use strict';
function applySwap(){
 const sw=document.getElementById('scenewrap'),mw=$('mapwrap'),m=document.querySelector('main'),r=$('right');
 const want=wantSwap&&sw.style.display!=='none'&&!shopOn;
 if(want===isSwapped)return;
 isSwapped=want;
 if(want){m.insertBefore(sw,r);r.insertBefore(mw,$('detail'))}
 else{m.insertBefore(mw,r);r.insertBefore(sw,$('detail'))}
 m.classList.toggle('sw',want);
 size();if(want)fit()}
const SCACHE={key:'',cv:null};
function drawScene(){
 const wrap=document.getElementById('scenewrap');
 const inc=S.inc.find(i=>i.id===sel);
 if(!inc){if(wrap.style.display!=='none')wrap.style.display='none';applySwap();return}
 if(wrap.style.display==='none'){wrap.style.display='block';sizeScene()}
 applySwap();
 const g=sctx,d=KIND[inc.k],crew=onScene(inc);
 const dayT=(S.t%200)/200;
 const nf=Math.max(0,Math.min(1,(dayT-.55)/.15)-Math.min(1,Math.max(0,(dayT-.9)/.08)));
 const work=[],pumpsV=[],ambV=[],rescV=[],cmdV=[];
 for(const u of crew){
  if(u.st!=='work')continue;
  work.push(u);
  const cd=u.code;
  if(CODE[cd].cap&&cd!=='61')pumpsV.push(u);
  if(cd==='91')ambV.push(u);
  if(cd==='71'||cd==='搜')rescV.push(u);
  if(cd==='41')cmdV.push(u)}
 const safeNow=emsSafe(inc),effNow=d.w?Math.max(0,effLines(inc)-(inc.burst>0?1:0)):0,wOK=waterOK(inc);
 const ct=Math.max(12,(isSwapped?46:Math.min(scW/11,scH/7))*scZoom);
 const HW=Math.max(2,Math.ceil(scW/ct/2)),HH=Math.max(1,Math.ceil(scH/ct/2));
 const txU=crew.filter(u=>u.st==='tx'||u.st==='give'||u.st==='clean')[0];
 const fx=txU?txU.x:inc.x,fy=txU?txU.y:inc.y;
 let x0=Math.round(fx)-HW,x1=Math.round(fx)+HW;
 let y0=Math.round(fy)-HH,y1=Math.round(fy)+HH;
 const showHyd=d.w&&inc.hy&&inc.hy[0]>=x0&&inc.hy[0]<=x1&&inc.hy[1]>=y0&&inc.hy[1]<=y1;
 const cols=x1-x0+1,rows=y1-y0+1;
 const c=ct;
 const ox=(scW-c*cols)/2,oy=(scH-c*rows)/2;
 const X=v=>ox+(v-x0)*c,Y=v=>oy+(v-y0)*c;
 const tkey=x0+','+y0+','+cols+','+rows+','+c.toFixed(2)+','+scW+','+scH+','+S.mapV;
 if(SCACHE.key!==tkey){
  SCACHE.key=tkey;
  const cv=SCACHE.cv||(SCACHE.cv=document.createElement('canvas'));
  cv.width=Math.round(scW*dpr);cv.height=Math.round(scH*dpr);
  const tg=cv.getContext('2d');tg.setTransform(dpr,0,0,dpr,0,0);
  tg.fillStyle='#0b0b0a';tg.fillRect(0,0,scW,scH);
  for(let x=Math.max(0,x0);x<=Math.min(N-1,x1);x++)
   for(let y=Math.max(0,y0);y<=Math.min(N-1,y1);y++){
    const k=K(x,y),t=TR[k],r=RD[k],sh=SH[k],px=X(x),py=Y(y);
    tg.fillStyle=t===1?'#0e2436':t===2?'#18291d':t===3?'#202836':t===4?'#212327':
     (sh<.33?'#1a1a18':sh<.66?'#1f1f1c':'#232320');
    tg.fillRect(px,py,c+.6,c+.6);
    if(!r&&!t&&c>9){tg.fillStyle='rgba(0,0,0,.35)';tg.fillRect(px+c*.78,py,c*.22,c+.6)}
    if(r){tg.fillStyle=RCOL[r];tg.fillRect(px,py,c+.6,c+.6);
     if(r>=2&&r<=3&&c>13){tg.strokeStyle='rgba(255,255,255,.07)';tg.lineWidth=1;
      tg.beginPath();tg.moveTo(px,py+c/2);tg.lineTo(px+c,py+c/2);tg.stroke()}}}}
 g.drawImage(SCACHE.cv,0,0,scW,scH);
 // 建物窗光隨晝夜變化，另外疊畫（量少）
 if(c>16)for(let x=Math.max(0,x0);x<=Math.min(N-1,x1);x++)
  for(let y=Math.max(0,y0);y<=Math.min(N-1,y1);y++){
   const k=K(x,y);if(RD[k]||TR[k]||SH[k]<=.5)continue;
   g.fillStyle='rgba(255,220,150,'+(.1+nf*.25).toFixed(2)+')';
   g.fillRect(X(x)+c*.18,Y(y)+c*.2,c*.16,c*.16);g.fillRect(X(x)+c*.5,Y(y)+c*.45,c*.16,c*.16)}
 const cx=X(inc.x)+c/2,cy=Y(inc.y)+c/2;
 if(nf>0){g.fillStyle='rgba(10,16,34,'+(.5*nf).toFixed(3)+')';g.fillRect(0,0,scW,scH)}
 // 災點建物與景物
 (function(){
  const bx=X(inc.x),by=Y(inc.y),k0=K(inc.x,inc.y),t0=TR[k0];
  if(!RD[k0]&&t0!==1){
   const burnt=d.fire?Math.min(1,inc.work/inc.dur):0;
   g.fillStyle=d.fire?(burnt>.75?'#191512':'#2a221e'):'#24241f';
   g.fillRect(bx+c*.04,by+c*.04,c*.92,c*.92);
   if(burnt>.75){g.fillStyle='rgba(10,8,7,'+((burnt-.75)*1.6).toFixed(2)+')';
    g.fillRect(bx+c*.04,by+c*.04,c*.92,c*.92)}
   g.fillStyle='rgba(0,0,0,.45)';g.fillRect(bx+c*.72,by+c*.04,c*.24,c*.92);
   g.strokeStyle='rgba(255,255,255,.12)';g.lineWidth=1;
   g.strokeRect(bx+c*.04,by+c*.04,c*.92,c*.92);
   if(c>=16){
    const lit=d.fire?Math.max(.2,1-inc.work/inc.dur):0;
    for(let wx=0;wx<3;wx++)for(let wy=0;wy<3;wy++){
     const fl=d.fire?(Math.sin(S.t*7+wx*2+wy*3)*.5+.5)*lit:0;
     g.fillStyle=d.fire?'rgba(255,'+(140+fl*80|0)+',60,'+(.25+fl*.6).toFixed(2)+')':'rgba(220,214,170,'+(.12+nf*.35).toFixed(2)+')';
     g.fillRect(bx+c*(.16+wx*.26),by+c*(.16+wy*.26),c*.16,c*.16)}}}
  const K2=inc.k;
  if(KIND[K2]&&KIND[K2].road){
   const ra=(RD[K(inc.x+1,inc.y)]||RD[K(inc.x-1,inc.y)])?0:Math.PI/2;
   g.strokeStyle='rgba(20,20,20,.55)';g.lineWidth=Math.max(1.5,c*.07);
   for(let i8=-1;i8<=1;i8+=2){
    g.beginPath();
    g.moveTo(cx-Math.cos(ra)*c*1.3+Math.sin(ra)*i8*c*.14,cy-Math.sin(ra)*c*1.3-Math.cos(ra)*i8*c*.14);
    g.lineTo(cx-Math.cos(ra)*c*.25+Math.sin(ra)*i8*c*.12,cy-Math.sin(ra)*c*.25-Math.cos(ra)*i8*c*.12);
    g.stroke()}
   g.fillStyle='#e9a13b';
   for(let i8=0;i8<4;i8++){
    const px=cx-Math.cos(ra)*c*(1.5+i8*.45),py=cy-Math.sin(ra)*c*(1.5+i8*.45);
    const off=(i8+1)*c*.08;
    g.beginPath();
    g.moveTo(px+Math.sin(ra)*off,py-Math.cos(ra)*off-c*.1);
    g.lineTo(px+Math.sin(ra)*off+c*.08,py-Math.cos(ra)*off+c*.08);
    g.lineTo(px+Math.sin(ra)*off-c*.08,py-Math.cos(ra)*off+c*.08);
    g.closePath();g.fill()}
   if(inc.pol===2){
    g.strokeStyle='rgba(233,161,59,.75)';g.lineWidth=Math.max(1.4,c*.06);
    g.setLineDash([c*.18,c*.12]);
    g.beginPath();
    g.moveTo(cx+Math.cos(ra)*c*1.1+Math.sin(ra)*c*.7,cy+Math.sin(ra)*c*1.1-Math.cos(ra)*c*.7);
    g.lineTo(cx+Math.cos(ra)*c*1.1-Math.sin(ra)*c*.7,cy+Math.sin(ra)*c*1.1+Math.cos(ra)*c*.7);
    g.stroke();g.setLineDash([])}}
  if(K2==='rtc'||K2==='hiway'||K2==='polrtc'||K2==='truckfire'||K2==='carfire'){
   for(let i=0;i<2;i++){
    const a=i?0.6:-0.9;
    g.save();g.translate(cx+(i?c*.3:-c*.28),cy+(i?c*.22:-c*.18));g.rotate(a);
    g.fillStyle=i?'#5b5f66':'#6d5a52';scRR(g,-c*.22,-c*.13,c*.44,c*.26,c*.05);g.fill();
    g.fillStyle='rgba(20,20,20,.5)';g.fillRect(-c*.04,-c*.13,c*.08,c*.26);g.restore()}
   g.fillStyle='rgba(180,180,180,.5)';
   for(let i=0;i<6;i++)g.fillRect(cx+Math.sin(i*2.3)*c*.5,cy+Math.cos(i*1.7)*c*.4,c*.05,c*.05)}
  if(K2==='collapse'||K2==='slide'||K2==='crane'){
   g.fillStyle='#4a453f';
   for(let i=0;i<7;i++){
    const a=i*.9,rr=c*(.2+(i%3)*.18);
    g.beginPath();g.moveTo(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr-c*.06);
    g.lineTo(cx+Math.cos(a)*rr+c*.16,cy+Math.sin(a)*rr+c*.1);
    g.lineTo(cx+Math.cos(a)*rr-c*.14,cy+Math.sin(a)*rr+c*.12);
    g.closePath();g.fill()}}
  if(K2==='drown'||K2==='flood'||K2==='ship'){
   g.strokeStyle='rgba(125,179,232,.5)';g.lineWidth=Math.max(1,c*.05);
   for(let i=0;i<3;i++){const rr=c*(.3+i*.28)+((S.t*.4)%.3)*c;
    g.beginPath();g.arc(cx,cy,rr,0,TAU);g.stroke()}}
  if(K2==='tree'){
   g.strokeStyle='#5a4a33';g.lineWidth=Math.max(2,c*.12);
   g.beginPath();g.moveTo(cx-c*.5,cy+c*.2);g.lineTo(cx+c*.45,cy-c*.1);g.stroke();
   g.fillStyle='rgba(90,130,70,.7)';
   for(let i=0;i<4;i++){g.beginPath();g.arc(cx+c*(.1+i*.12),cy-c*(.05+ (i%2)*.12),c*.13,0,TAU);g.fill()}}
  if(K2==='elec'){
   g.fillStyle='#4b4740';scRR(g,cx-c*.16,cy-c*.2,c*.32,c*.4,c*.04);g.fill();
   if((S.t*8|0)%2){g.strokeStyle='#bfe3ff';g.lineWidth=Math.max(1,c*.04);
    g.beginPath();g.moveTo(cx-c*.1,cy-c*.1);g.lineTo(cx+c*.05,cy);g.lineTo(cx-c*.03,cy+c*.06);
    g.lineTo(cx+c*.12,cy+c*.16);g.stroke()}}
  if(K2==='aircraft'){
   g.fillStyle='#8e939b';
   g.save();g.translate(cx,cy);g.rotate(.6);
   scRR(g,-c*.7,-c*.09,c*1.4,c*.18,c*.06);g.fill();
   scRR(g,-c*.12,-c*.5,c*.2,c*1.0,c*.05);g.fill();g.restore()}
  if(K2==='lift'){
   g.strokeStyle='rgba(200,200,200,.5)';g.lineWidth=Math.max(1,c*.05);
   g.strokeRect(cx-c*.18,cy-c*.3,c*.36,c*.6);
   g.fillStyle='rgba(143,184,208,.6)';g.fillRect(cx-c*.14,cy-c*.05+Math.sin(S.t)*c*.04,c*.28,c*.22)}
 })();
 // 圍觀民眾
 scBystanders(inc,g,c,cx,cy);
 // 傷患
 scPatients(inc,g,c,cx,cy);
 // 警戒圈 / 擔架動線 / 後送方向
 scCordonRing(g,d,c,cx,cy);
 // 供水水帶（流動）
 scSupplyHose(inc,g,d,wOK,showHyd,c,X,Y);
 // 出水線與噴射
 const atk=pumpsV,eff=effNow;
 for(let li=0;li<eff&&atk.length;li++){
  const a=atk[li%atk.length];
  const foam=a.code==='57'||a.code==='01';
  const ax=X(a.x+(a.ox||0))+c/2,ay=Y(a.y+(a.oy||0))+c/2;
  const mx=ax+(cx-ax)*.5+(li-eff/2)*c*.2,my=ay+(cy-ay)*.5+(li-eff/2)*c*.2,
   tgx=cx+(li-(eff-1)/2)*c*.3,tgy=cy+c*.22,st3=S.t-(a.at||0)-li*.4,lay=Math.max(0,Math.min(1,(st3-1.2)/3)),bst=inc.burst>0&&li===0,flow=lay>=1&&wOK&&!bst,
   sw3=Math.sin(S.t*4+li*1.9)*c*.05*(1+(flow?2*Math.max(0,1-(st3-4.2)/1.5):0)),qx=mx+sw3,qy=my-sw3;
  g.lineCap='round';g.setLineDash([]);
  g.beginPath();g.moveTo(ax,ay);
  for(let s3=1;s3<=16;s3++){const t3=lay*s3/16,u3=1-t3;
   g.lineTo(u3*u3*ax+2*u3*t3*qx+t3*t3*tgx,u3*u3*ay+2*u3*t3*qy+t3*t3*tgy)}
  g.shadowColor='rgba(0,0,0,.45)';g.shadowOffsetX=c*.03;g.shadowOffsetY=c*.05;g.shadowBlur=c*.05;
  g.strokeStyle='rgba(8,14,20,.55)';g.lineWidth=Math.max(2.5,c*.15);g.stroke();g.shadowColor='transparent';
  g.strokeStyle=!flow?'rgba(95,100,106,.75)':foam?'rgba(190,120,30,.7)':'rgba(70,130,190,.7)';g.lineWidth=Math.max(1.8,c*(flow?.06+.03*Math.min(1,Math.max(0,(st3-4.2)/1.2)):.06));g.stroke();
  g.strokeStyle=foam?'rgba(255,210,120,.95)':'rgba(200,230,255,.95)';g.lineWidth=Math.max(1,c*.04);
  if(flow){g.setLineDash([c*.32,c*.2]);g.lineDashOffset=-(S.t*40+li*7)%(c*.52);g.stroke();g.setLineDash([])}
  const nt=.86*lay,nx=(1-nt)*(1-nt)*ax+2*(1-nt)*nt*qx+nt*nt*tgx,ny=(1-nt)*(1-nt)*ay+2*(1-nt)*nt*qy+nt*nt*tgy;
  g.fillStyle='#d6ae4a';g.beginPath();g.arc(nx,ny,Math.max(1.6,c*.07),0,TAU);g.fill();
  if(bst){const bt=.45,bx=(1-bt)*(1-bt)*ax+2*(1-bt)*bt*qx+bt*bt*tgx,by=(1-bt)*(1-bt)*ay+2*(1-bt)*bt*qy+bt*bt*tgy;
   g.fillStyle='rgba(40,75,110,.3)';g.beginPath();g.ellipse(bx,by+c*.06,c*.45,c*.2,0,0,TAU);g.fill();
   g.fillStyle='rgba(200,228,255,.8)';
   for(let k5=0;k5<9;k5++){const p5=(S.t*1.6+k5/9)%1,an5=-Math.PI/2+(k5%3-1)*.45;
    g.beginPath();g.arc(bx+Math.cos(an5)*c*.5*p5,by+Math.sin(an5)*c*.5*p5+p5*p5*c*.55,Math.max(1,c*.04),0,TAU);g.fill()}
   g.strokeStyle='rgba(226,86,79,'+(.5+.4*Math.sin(S.t*8)).toFixed(2)+')';g.lineWidth=1.5;g.beginPath();g.arc(bx,by,c*.3,0,TAU);g.stroke()}
  if(flow){g.strokeStyle=foam?'rgba(255,225,160,.5)':'rgba(215,238,255,.5)';g.lineWidth=Math.max(1,c*.03);g.beginPath();
   for(let k4=0;k4<3;k4++){g.moveTo(nx,ny);g.lineTo(cx+Math.sin(S.t*20+k4*2+li)*c*.14,cy+Math.cos(S.t*17+k4*1.3)*c*.1)}
   g.stroke()}
  g.lineCap='butt'}
 // 射水衝擊處的水花與蒸汽
 scSplash(inc,g,d,effNow,wOK,c,cx,cy);
 // 災點：火焰與濃煙
 const sev=d.fire?Math.min(1.7,.7+(inc.pm.area||60)/300):.8;
 const prog=Math.min(1,inc.work/inc.dur);
 const wind=((inc.id*0.83)%TAU);
 const wx=Math.cos(wind),wy=Math.sin(wind);
 if(d.fire){
  const heat=Math.max(.2,1-prog*.9);
  const dark=(inc.pm.load==='極高'||inc.pm.load==='高')?1:0;
  g.fillStyle='rgba(30,16,10,'+(.22*sev*heat).toFixed(3)+')';
  g.beginPath();g.arc(cx,cy,c*1.15*sev,0,TAU);g.fill();
  for(let i=0;i<12;i++){
   const ph=(S.t*.42+i*.083)%1;
   const sp=c*(2.6*sev);
   const px=cx+wx*sp*ph+Math.sin(i*1.9+S.t*.7)*c*.25*ph;
   const py=cy+wy*sp*ph-c*.5*ph*sev;
   const rr2=c*(.2+ph*1.0)*sev;
   const al=(dark?.34:.26)*(1-ph)*heat;
   g.fillStyle=(dark?'rgba(46,44,42,':'rgba(140,138,134,')+al.toFixed(3)+')';
   g.beginPath();g.arc(px,py,rr2,0,TAU);g.fill()}
  for(let i=0;i<6;i++){
   const f=Math.sin(S.t*8.5+i*1.7)*.5+.5;
   const hgt=c*(.16+f*.3)*sev*heat;
   g.fillStyle='rgba(226,86,79,'+(.55*heat).toFixed(2)+')';
   g.beginPath();
   g.moveTo(cx+(i-2.5)*c*.15*sev-c*.09*sev,cy+c*.1*sev);
   g.lineTo(cx+(i-2.5)*c*.15*sev,cy-hgt);
   g.lineTo(cx+(i-2.5)*c*.15*sev+c*.09*sev,cy+c*.1*sev);
   g.closePath();g.fill();
   g.fillStyle='rgba(243,178,58,'+(.75*heat).toFixed(2)+')';
   g.beginPath();g.arc(cx+(i-2.5)*c*.15*sev,cy-hgt*.35,c*.07*sev*(.6+f*.5),0,TAU);g.fill()}
  spark(g,cx,cy,c*sev,'rgba(255,190,90,A)',7,S.t*1.4,c*.5);}
 else{
  const pl=.5+.5*Math.sin(S.t*4.5);
  g.fillStyle=d.col;g.globalAlpha=.16+.14*pl;
  g.beginPath();g.arc(cx,cy,c*.9,0,TAU);g.fill();g.globalAlpha=1}
 g.fillStyle=d.col;g.beginPath();g.arc(cx,cy,Math.max(5,c*.32),0,TAU);g.fill();
 g.fillStyle='#111110';g.font='600 '+Math.max(8,c*.36)+'px '+FONT;
 g.textAlign='center';g.textBaseline='middle';g.fillText(inc.rev?d.ch:'？',cx,cy);
 // 車輛
 scVehicles(inc,g,d,crew,nf,c,X,Y,cx,cy,wx);
// 車輛警示燈地面光暈
 scBeaconGlow(g,crew,nf,c,X,Y);
 // 階段專屬作業特效
 scPhaseFx(inc,g,d,pumpsV,effNow,cols,c,X,Y,cx,cy);
 // 雲梯架設
 scLadder(g,crew,c,X,Y,cx,cy);
 // 救護車尾門與擔架裝載
 scAmbLoading(inc,g,crew,c,X,Y);
 // 警戒帶與三角錐
 scTapeCones(inc,g,c,X,Y);
 // 受困人員標記
 scTrapped(inc,g,c,cx,cy,prog);
// 後送路線
 scTxRoute(g,crew,c,X,Y);
 // 醫院與交接動畫
 scHospital(g,crew,nf,x0,x1,y0,y1,c,X,Y);
 // Rehab 人員復原區
 scRehab(inc,g,d,crew,work,cmdV,c,X,Y);
 // 火場出入口管制
 scEntryControl(inc,g,d,crew,work,c,X,Y,cx,cy);
 // 空氣瓶更換站
 scAirStation(g,crew,c,X,Y);
 // 救護待命區
 scEmsStaging(inc,g,ambV,cmdV,c,X,Y);
 // 水源區標示與流量
 scWaterSource(inc,g,showHyd,c,X,Y);
 // 中繼水帶（佔水車→攻擊車）
 scRelayHose(inc,g,d,pumpsV,c,X,Y);
 // 後送動線
 scTxPath(inc,g,ambV,c,X,Y,cx,cy);
 // 停車位標線
 scParkingBays(inc,g,crew,wOK,x0,x1,y0,y1,showHyd,c,X,Y,cx,cy);
 // 救護處置動畫
 scEmsCare(inc,g,ambV,safeNow,c,cx,cy);
 // 救助作業動畫
 scRescueOps(inc,g,rescV,c,cx,cy);
 // 分水器
 scManifold(g,d,pumpsV,effNow,wOK,c,X,Y,cx,cy);
 // ===== 台電：斷電確認後，工程車停靠、人員作業 =====
 scPowerCrew(inc,g,c,X,Y,cx,cy);
 // ===== 台電：斷電完成後工程車進駐 =====
 scPowerArrive(inc,g,c,X,Y,cx,cy);
 // ===== 警方人員：依案件性質分層 =====
 scPolice(inc,g,d,c,X,Y,cx,cy);
 // ===== 台電工程車與人員（斷電確認後到場） =====
 scPowerTruck(inc,g,c,X,Y,cx,cy,wx,wy);
 // 照明燈塔
 scLightTower(g,crew,nf,c,X,Y,cx,cy);
 // 視野外車輛的邊緣指標
 scEdgePointers(inc,g,crew,x0,x1,y0,y1,c,cx,cy);
 // ===== 大量傷病患：檢傷帆布、檢傷組、醫療指揮官 =====
 scMci(inc,g,d,c,X,Y,cx,cy,sev,prog);
 // ===== 化災：區劃、插旗、除污走廊、A/B/C 級防護 =====
 scHazmat(inc,g,d,crew,fx,fy,c,X,Y,cx,cy);
 // 抬頭資訊
 scHeader(inc,g,d,crew,nf,eff);
}
