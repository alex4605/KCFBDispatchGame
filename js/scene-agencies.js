// 現場畫面：警方人員與台電工程車
// 由 drawScene() 依序呼叫；參數皆為 drawScene 內算好的區域變數
'use strict';
function scPowerCrew(inc,g,c,X,Y,cx,cy){
 // ===== 台電：斷電確認後，工程車停靠、人員作業 =====
 if(inc.pow===2&&c>=12){
  const pkS2=(inc.pk&&inc.pk.spots)||[];
  const used2=new Set();for(const u of onScene(inc))if(u.arm)used2.add(u.arm);
  const sp=pkS2.filter(q=>!used2.has(q.key))[Math.min(1,pkS2.length-1)]||null;
  let tx,ty,ta;
  if(sp){tx=X(sp.x)+c/2;ty=Y(sp.y)+c/2;ta=Math.atan2(sp.dir[1],sp.dir[0])}
  else{tx=cx+c*1.8;ty=cy-c*1.2;ta=0}
  g.save();g.translate(tx,ty);g.rotate(ta);
  const L=c*.7,W=c*.34;
  g.fillStyle='#f2c21b';scRR(g,-L/2,-W/2,L,W,c*.05);g.fill();
  g.fillStyle='#1d4fa3';g.fillRect(-L/2,-W*.12,L,W*.24);
  g.fillStyle='rgba(30,44,70,.6)';g.fillRect(L*.24,-W/2,L*.12,W);
  g.fillStyle='#8a939d';g.fillRect(-L*.4,-W*.34,L*.5,W*.14);
  g.fillStyle=(S.t*4|0)%2?'#ffb02e':'#8a5a00';g.fillRect(L*.05,-W*.5,c*.06,W);
  g.restore();
  if(c>=17){g.fillStyle='#1d4fa3';g.font='700 '+(c*.16)+'px '+FONT;g.textAlign='center';g.textBaseline='middle';
   g.fillText('台電',tx,ty)}
  const TPC={coat:'#2f5fb3',leg:'#161616',stripe:null,helmet:'#f2c21b',skin:'#e6c0a8',vest:'#d8362f'};
  const rT=Math.max(1.8,c*.12);
  figure(g,tx+Math.cos(ta+Math.PI/2)*c*.42,ty+Math.sin(ta+Math.PI/2)*c*.42,rT,TPC,{ph:2});
  const wa=S.t*.4;
  figure(g,cx+Math.cos(wa)*c*.5,cy+Math.sin(wa)*c*.45,rT,TPC,{ph:5});
  if(c>=17){const lx=tx+Math.cos(ta+Math.PI/2)*c*.42,ly=ty+Math.sin(ta+Math.PI/2)*c*.42;
   g.fillStyle='rgba(20,30,60,.85)';scRR(g,lx-c*.3,ly-c*.62,c*.6,c*.2,c*.03);g.fill();
   g.fillStyle='#ffd27a';g.font='600 '+(c*.15)+'px '+FONT;g.fillText('台電人員',lx,ly-c*.52)}}}
function scPowerArrive(inc,g,c,X,Y,cx,cy){
 // ===== 台電：斷電完成後工程車進駐 =====
 if(inc.pow===2&&c>=12){
  const spots=(inc.pk&&inc.pk.spots)||[];
  const used=new Set();for(const u of onScene(inc))if(u.arm)used.add(u.arm);
  const fr=spots.filter(sp=>!used.has(sp.key));
  const sp=fr[Math.min(fr.length-1,Math.floor(fr.length/2))];
  let tx,ty,ta;
  if(sp){tx=X(sp.x)+c/2;ty=Y(sp.y)+c/2;ta=Math.atan2(sp.dir[1],sp.dir[0])}
  else{tx=cx-c*2.2;ty=cy+c*1.2;ta=0}
  g.save();g.translate(tx,ty);g.rotate(ta);
  const L=c*.68,W=c*.34;
  g.fillStyle='#f2c21b';scRR(g,-L/2,-W/2,L,W,c*.05);g.fill();
  g.fillStyle='#e9e7e0';g.fillRect(-L*.42,-W*.34,L*.5,W*.68);
  g.fillStyle='#2f5fb3';g.fillRect(-L*.36,-W*.1,L*.38,W*.2);
  g.fillStyle='rgba(30,44,70,.6)';g.fillRect(L*.24,-W/2,L*.1,W);
  const ab=(S.t*3|0)%2;g.fillStyle=ab?'#ffb020':'#8a5a00';g.fillRect(L*.06,-W*.5,c*.06,W);
  g.restore();
  const TP={coat:'#2f5fb3',leg:'#161616',stripe:null,helmet:'#f2c21b',skin:'#e6c0a8',vest:'#d8362f'};
  const rr5=Math.max(1.8,c*.12);
  for(let i=0;i<2;i++){
   const a=ta+Math.PI/2+(i?.5:-.5);
   figure(g,tx+Math.cos(a)*c*.5,ty+Math.sin(a)*c*.5,rr5,TP,{ph:i*2,helmet:true})}
  if(c>=17){g.fillStyle='rgba(20,20,20,.8)';scRR(g,tx-c*.2,ty-c*.52,c*.4,c*.2,c*.03);g.fill();
   g.fillStyle='#f2c21b';g.font='600 '+(c*.15)+'px '+FONT;g.textAlign='center';g.textBaseline='middle';
   g.fillText('台電',tx,ty-c*.42)}}}
function scPolice(inc,g,d,c,X,Y,cx,cy){
 // ===== 警方人員：依案件性質分層 =====
 (function(){
  if(!(inc.pol===2||d.police)||c<12)return;
  const r4=Math.max(1.8,c*.12),skin='#e6c0a8';
  const PAT={coat:'#2b3550',leg:'#1d2439',stripe:'#c9d3e6',helmet:'#2b3550',skin};
  const VEST={coat:'#2b3550',leg:'#1d2439',stripe:null,helmet:'#2b3550',skin,vest:'#141414'};
  const TRAF={coat:'#2b3550',leg:'#1d2439',stripe:'#f2f2ee',helmet:'#f2f2ee',skin,vest:'#c8f04a'};
  const RIOT={coat:'#1f2638',leg:'#161b28',stripe:null,helmet:'#0f0f10',skin,vest:'#101010'};
  const SWAT={coat:'#151515',leg:'#0d0d0d',stripe:null,helmet:'#0b0b0b',skin:'#3a3a3a',vest:'#262626'};
  const gun=(x,y,a)=>{g.strokeStyle='#0a0a0a';g.lineWidth=Math.max(1,r4*.35);
   g.beginPath();g.moveTo(x,y-r4*.1);g.lineTo(x+Math.cos(a)*r4*1.6,y-r4*.1+Math.sin(a)*r4*1.6);g.stroke()};
  const shield=(x,y,a)=>{g.save();g.translate(x+Math.cos(a)*r4*.9,y+Math.sin(a)*r4*.9-r4*.2);g.rotate(a);
   g.fillStyle='rgba(185,205,235,.55)';scRR(g,-r4*.18,-r4*.85,r4*.36,r4*1.7,r4*.12);g.fill();
   g.strokeStyle='rgba(230,240,255,.8)';g.lineWidth=1;g.stroke();g.restore()};
  const PSY=['psych','crisis','suicall','selfharm','overdose','drunk'];
  // 警用車輛：停在消救車輛外側的停車點
  const pkS=(inc.pk&&inc.pk.spots)||[];
  const usedS=new Set();for(const u of onScene(inc))if(u.arm)usedS.add(u.arm);
  const freeS=pkS.filter(sp=>!usedS.has(sp.key)).slice().reverse();
  let vi=0;
  const polVeh=(type)=>{
   let px,py,ang;
   const sp=freeS[vi++];
   if(sp){px=X(sp.x)+c/2;py=Y(sp.y)+c/2;ang=Math.atan2(sp.dir[1],sp.dir[0]);
    const perp=[sp.dir[1],sp.dir[0]];px+=perp[0]*c*.26*(vi%2?1:-1);py+=perp[1]*c*.26*(vi%2?1:-1)}
   else{const a=vi*1.1+.5;px=cx+Math.cos(a)*c*2.4;py=cy+Math.sin(a)*c*2.2;ang=a+Math.PI/2}
   const bl=(S.t*9|0)%2;
   g.save();g.translate(px,py);g.rotate(ang);
   if(type==='moto'){
    g.fillStyle='#f2f2ee';scRR(g,-c*.16,-c*.06,c*.32,c*.12,c*.04);g.fill();
    g.fillStyle='#1d4fa3';g.fillRect(-c*.06,-c*.06,c*.12,c*.12);
    g.fillStyle='#111';g.beginPath();g.arc(-c*.14,0,c*.04,0,TAU);g.arc(c*.14,0,c*.04,0,TAU);g.fill();
    g.fillStyle=bl?'#ff4d4d':'#4da3ff';g.fillRect(c*.1,-c*.03,c*.04,c*.06)}
   else if(type==='van'){
    const L=c*.74,W=c*.36;
    g.fillStyle='#1d2c55';scRR(g,-L/2,-W/2,L,W,c*.05);g.fill();
    g.fillStyle='#e9e7e0';g.fillRect(-L/2,-W*.08,L,W*.16);
    g.fillStyle='rgba(30,44,70,.6)';g.fillRect(L*.26,-W/2,L*.1,W);
    g.fillStyle=bl?'#ff4d4d':'#4da3ff';g.fillRect(L*.04,-W*.5,c*.07,W*.5);
    g.fillStyle=bl?'#4da3ff':'#ff4d4d';g.fillRect(L*.04,0,c*.07,W*.5)}
   else{
    const L=c*.6,W=c*.3;
    g.fillStyle='#f2f2ee';scRR(g,-L/2,-W/2,L,W,c*.06);g.fill();
    g.fillStyle='#1d4fa3';g.fillRect(-L/2,-W*.1,L,W*.2);
    g.fillStyle='rgba(30,44,70,.6)';g.fillRect(L*.2,-W/2,L*.12,W);g.fillRect(-L*.32,-W/2,L*.1,W);
    g.fillStyle=bl?'#ff4d4d':'#4da3ff';g.fillRect(-c*.02,-W*.5,c*.07,W*.5);
    g.fillStyle=bl?'#4da3ff':'#ff4d4d';g.fillRect(-c*.02,0,c*.07,W*.5)}
   g.restore()};
  if(d.tac){
   if(['armedfight','tactical','lonewolf'].indexOf(inc.k)>=0){polVeh('car');polVeh('car');polVeh('car');polVeh('car');polVeh('van')}
   else{for(let v2=0;v2<4;v2++)polVeh('car');if(inc.id%2===0)for(let m2=0;m2<4+2*(inc.id%3);m2++)polVeh('moto')}}
  else if(PSY.indexOf(inc.k)>=0)polVeh('car');
  else{polVeh('moto');polVeh('moto')}
  if(d.tac){
   // 快打部隊：內圈半圓隊形，頭盔、盾牌、槍
   const n5=inc.k==='brawl'?8:12;
   for(let i=0;i<n5;i++){
    const a=Math.PI*.15+i*(Math.PI*.7/(n5-1))+Math.sin(S.t*.6+i)*.03;
    const rr=n5>8&&i%2?1.4:1,px=cx+Math.cos(a)*c*1.05*rr,py=cy+Math.sin(a)*c*.95*rr,face=a+Math.PI;
    figure(g,px,py,r4,RIOT,{ph:i});
    if(i%2===0)shield(px,py,face);else gun(px,py,face)}
   // SWAT 四人縱隊：淨空前朝建物推進，淨空後於側翼警戒
   if(['armedfight','tactical','lonewolf'].indexOf(inc.k)>=0){
    const cleared=!(inc.clr>0);
    const base=Math.atan2(Y(inc.ay)+c/2-cy,X(inc.ax)+c/2-cx)-Math.PI/2;
    const adv=cleared?1.6:(1.9-((S.t*.12)%1)*1.0);
    for(let i=0;i<4;i++){
     const dd=adv+i*.26;
     const px=cx+Math.cos(base)*c*dd,py=cy+Math.sin(base)*c*dd;
     figure(g,px,py,r4,SWAT,{ph:i*1.3,moving:cleared?0:1});
     gun(px,py,base+Math.PI)}
    if(c>=17){const lx=cx+Math.cos(base)*c*(adv+1.25),ly=cy+Math.sin(base)*c*(adv+1.25);
     g.fillStyle='rgba(12,12,12,.85)';scRR(g,lx-c*.22,ly-c*.12,c*.44,c*.22,c*.03);g.fill();
     g.fillStyle='#e6e3db';g.font='600 '+(c*.15)+'px '+FONT;g.textAlign='center';g.textBaseline='middle';
     g.fillText('SWAT',lx,ly)}}
   return}
  if(PSY.indexOf(inc.k)>=0){
   // 精神急症：警察進入內圈，著防彈背心
   for(let i=0;i<2;i++){
    const a=.8+i*1.4+Math.sin(S.t*.5+i)*.05;
    figure(g,cx+Math.cos(a)*c*.55,cy+Math.sin(a)*c*.5,r4,VEST,{ph:i*2})}
   return}
  if(d.road){
   // 交通事故：交通隊反光背心，指揮車流
   const ra=(RD[K(inc.x+1,inc.y)]||RD[K(inc.x-1,inc.y)])?0:Math.PI/2;
   for(let i=0;i<2;i++){
    const sgn=i?1:-1;
    const px=cx+Math.cos(ra)*c*1.9*sgn,py=cy+Math.sin(ra)*c*1.9*sgn;
    figure(g,px,py,r4,TRAF,{ph:i*3});
    const wv=Math.sin(S.t*5+i)*.7;
    g.strokeStyle='#ff9a3c';g.lineWidth=Math.max(1.2,r4*.35);
    g.beginPath();g.moveTo(px+r4*.4,py-r4*.3);g.lineTo(px+r4*.4+Math.cos(wv-1)*r4*1.4,py-r4*.3+Math.sin(wv-1)*r4*1.4);g.stroke()}
   return}
  // 一般案件：外圍警戒
  for(let i=0;i<2;i++){
   const a4=1.9+i*1.5+Math.sin(S.t*.3+i)*.05;
   figure(g,cx+Math.cos(a4)*c*1.6,cy+Math.sin(a4)*c*1.5,r4,PAT,{ph:i*3})}
 })();}
function scPowerTruck(inc,g,c,X,Y,cx,cy,wx,wy){
 // ===== 台電工程車與人員（斷電確認後到場） =====
 if(inc.pow===2&&c>=12){
  const spots=(inc.pk&&inc.pk.spots)||[],used=new Set();
  for(const u of onScene(inc))if(u.arm)used.add(u.arm);
  const free=spots.filter(sp=>!used.has(sp.key));
  const sp=free.length?free[Math.floor(free.length/2)]:null;
  let px,py,ang;
  if(sp){px=X(sp.x)+c/2;py=Y(sp.y)+c/2;ang=Math.atan2(sp.dir[1],sp.dir[0])}
  else{px=cx-c*2.2;py=cy+c*1.6;ang=0}
  g.save();g.translate(px,py);g.rotate(ang);
  const L=c*.72,W=c*.34;
  g.fillStyle='#f2c21b';scRR(g,-L/2,-W/2,L,W,c*.05);g.fill();
  g.fillStyle='#c79a10';g.fillRect(L*.18,-W/2,L*.32,W);
  g.fillStyle='rgba(30,44,70,.6)';g.fillRect(L*.36,-W/2,L*.1,W);
  g.strokeStyle='#8a939d';g.lineWidth=Math.max(1.5,c*.07);
  g.beginPath();g.moveTo(-L*.3,0);g.lineTo(L*.05,-W*.05);g.stroke();
  g.fillStyle='#d8d4c8';g.fillRect(-L*.46,-W*.2,c*.12,W*.4);
  const bl2=(S.t*5|0)%2;g.fillStyle=bl2?'#ff9a3c':'#8a5a1a';g.fillRect(L*.2,-W*.5,c*.07,W);
  g.restore();
  if(c>=17){g.fillStyle='rgba(20,20,20,.8)';scRR(g,px-c*.2,py-c*.5,c*.4,c*.18,c*.03);g.fill();
   g.fillStyle='#f2c21b';g.font='600 '+(c*.14)+'px '+FONT;g.textAlign='center';g.textBaseline='middle';
   g.fillText('台電',px,py-c*.41)}
  const TPC={coat:'#2c5fb5',leg:'#161616',stripe:null,helmet:'#f3c43b',skin:'#e6c0a8',vest:'#d8362f'};
  const rT=Math.max(1.8,c*.12),side=ang+Math.PI/2;
  for(let i=0;i<2;i++){
   const wx=px+Math.cos(side)*c*.42+Math.cos(ang)*(i?c*.2:-c*.2)+Math.sin(S.t*.8+i)*c*.02;
   const wy=py+Math.sin(side)*c*.42+Math.sin(ang)*(i?c*.2:-c*.2)+Math.cos(S.t*.7+i)*c*.02;
   figure(g,wx,wy,rT,TPC,{ph:i*2})}}}
