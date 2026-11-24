// 現場畫面：各階段作業特效、出入口管制、氣瓶站、救護與救助動畫
// 由 drawScene() 依序呼叫；參數皆為 drawScene 內算好的區域變數
'use strict';
function scPhaseFx(inc,g,c,X,Y,cx,cy){
 // 階段專屬作業特效
 const pn=inc.rev&&inc.ph>=0?inc.phs[inc.ph]:'';
 if(/破壞|脫困|切除|開挖|支撐|開門/.test(pn)){
  for(let i=0;i<6;i++){
   const ph2=(S.t*2.2+i*.17)%1,a2=i*1.05+S.t*.4;
   g.fillStyle='rgba(255,214,120,'+(.85*(1-ph2)).toFixed(2)+')';
   g.beginPath();g.arc(cx+Math.cos(a2)*(c*.3+ph2*c*.5),cy+Math.sin(a2)*(c*.3+ph2*c*.5)-ph2*c*.15,c*.035,0,TAU);g.fill()}}
 if(/排煙|通風|換氣/.test(pn)){
  const wa=((inc.id*0.83)%TAU);
  for(let i=0;i<7;i++){
   const ph2=(S.t*.85+i*.14)%1;
   g.fillStyle='rgba(200,206,214,'+(.3*(1-ph2)).toFixed(2)+')';
   g.beginPath();g.arc(cx+Math.cos(wa)*ph2*c*2.2+Math.sin(i*2)*c*.15,cy+Math.sin(wa)*ph2*c*2.2,c*(.1+ph2*.35),0,TAU);g.fill()}}
 if(/抽水|排水/.test(pn)){
  for(let i=0;i<8;i++){
   const ph2=(S.t*1.1+i*.125)%1;
   g.fillStyle='rgba(125,179,232,'+(.55*(1-ph2)).toFixed(2)+')';
   g.beginPath();g.arc(cx+(X(inc.ax)+c/2-cx)*ph2,cy+(Y(inc.ay)+c/2-cy)*ph2,c*.06,0,TAU);g.fill()}}
 if(/檢傷|分區救護|後送分流/.test(pn)){
  const cols=['#e2564f','#e9a13b','#5dcaa5'];
  for(let i=0;i<9;i++){
   const px=cx+((i%3)-1)*c*.34+c*1.15,py=cy+(Math.floor(i/3)-1)*c*.32;
   g.fillStyle=cols[Math.floor(i/3)];
   g.beginPath();g.moveTo(px,py-c*.1);g.lineTo(px+c*.09,py+c*.07);g.lineTo(px-c*.09,py+c*.07);
   g.closePath();g.fill()}}
 if(/除污|洗消/.test(pn)){
  const dx=cx-c*1.35,dy=cy+c*.2;
  g.fillStyle='rgba(175,169,236,.55)';scRR(g,dx-c*.3,dy-c*.3,c*.6,c*.6,c*.08);g.fill();
  for(let i=0;i<5;i++){
   const ph2=(S.t*1.6+i*.2)%1;
   g.fillStyle='rgba(215,235,255,'+(.5*(1-ph2)).toFixed(2)+')';
   g.beginPath();g.arc(dx+Math.sin(i*2)*c*.2,dy-ph2*c*.4,c*.05,0,TAU);g.fill()}}
 if(/搜索|探測/.test(pn)&&c>=14){
  const sw=(S.t*.6)%1;
  g.strokeStyle='rgba(207,176,245,.32)';g.lineWidth=Math.max(1,c*.05);
  g.beginPath();g.arc(cx,cy,c*(.5+sw*1.4),0,TAU);g.stroke()}}
function scEntryControl(inc,g,d,crew,work,c,X,Y,cx,cy){
 // 火場出入口管制
 if(d.fire&&inc.rev&&crew.length){
  const ea=Math.atan2(Y(inc.ay)+c/2-cy,X(inc.ax)+c/2-cx);
  const ex2=cx+Math.cos(ea)*c*.72,ey2=cy+Math.sin(ea)*c*.72;
  g.fillStyle='rgba(243,196,122,.85)';
  scRR(g,ex2-c*.1,ey2-c*.1,c*.2,c*.2,c*.03);g.fill();
  g.strokeStyle='rgba(243,196,122,.6)';g.lineWidth=1;
  g.setLineDash([c*.1,c*.1]);g.beginPath();g.arc(cx,cy,c*.72,ea-.5,ea+.5);g.stroke();g.setLineDash([]);
  g.textAlign='center';
  if(c>=20&&inc.ph>=0&&/入室|搜索|逐房|樓層/.test(inc.phs[inc.ph])){
   const inside=Math.min(4,work.filter(u=>u.code!=='91'&&u.code!=='41').length*2);
   g.fillStyle='rgba(20,18,14,.8)';scRR(g,ex2-c*.3,ey2+c*.12,c*.6,c*.2,c*.03);g.fill();
   g.fillStyle='#f3c47a';g.font='600 '+(c*.16)+'px '+FONT;
   g.fillText('入室 '+inside+' 人',ex2,ey2+c*.23)}}}
function scAirStation(g,crew,c,X,Y){
 // 空氣瓶更換站
 for(const u of crew){
  if(u.st!=='work'||(u.code!=='71'&&u.code!=='搜'))continue;
  const a7=(u.hd||0)-Math.PI/2;
  const bx2=X(u.x+(u.ox||0))+c/2+Math.cos(a7)*c*.55,by2=Y(u.y+(u.oy||0))+c/2+Math.sin(a7)*c*.55;
  for(let i5=0;i5<3;i5++){
   g.fillStyle=i5%2?'#d8d8d2':'#9fb6c8';
   g.fillRect(bx2-c*.12+i5*c*.09,by2-c*.1,c*.06,c*.2)}
  break}}
function scEmsCare(inc,g,ambV,safeNow,c,cx,cy){
 // 救護處置動畫
 if(ambV.length&&inc.rev&&safeNow){
  const pn2=inc.ph>=0?inc.phs[inc.ph]:'';
  if(inc.pm.ohca&&/處置|接觸|評估/.test(pn2)){
   const bob=Math.abs(Math.sin(S.t*5.2))*c*.1;
   figure(g,cx-c*.22,cy-bob,Math.max(1.6,c*.11),'medic',{ph:1});
   g.strokeStyle='rgba(143,227,196,.8)';g.lineWidth=Math.max(1,c*.05);
   g.beginPath();g.moveTo(cx-c*.14,cy-bob+c*.05);g.lineTo(cx-c*.02,cy);g.stroke();
   if(c>=17){g.fillStyle='#8fe3c4';g.font='600 '+(c*.2)+'px '+FONT;g.textAlign='center';
    g.fillText('CPR',cx-c*.22,cy-c*.46)}}
  if(/處置|管路|給藥|照護/.test(pn2)){
   g.fillStyle='rgba(236,234,227,.9)';g.fillRect(cx+c*.26,cy-c*.42,c*.1,c*.16);
   g.strokeStyle='rgba(236,234,227,.7)';g.lineWidth=Math.max(1,c*.03);
   g.beginPath();g.moveTo(cx+c*.31,cy-c*.26);g.lineTo(cx+c*.08,cy);g.stroke();
   const bp=(S.t*2|0)%2;
   g.fillStyle=bp?'#5dcaa5':'rgba(93,202,165,.35)';
   g.fillRect(cx+c*.3,cy+c*.1,c*.16,c*.12)}
  }}
function scRescueOps(inc,g,rescV,c,cx,cy){
 // 救助作業動畫
 if(rescV.length&&inc.rev){
  const pn3=inc.ph>=0?inc.phs[inc.ph]:'';
  if(/脫困|破壞|撐/.test(pn3)){
   const op=Math.abs(Math.sin(S.t*2.4))*c*.12;
   g.strokeStyle='#f0c53a';g.lineWidth=Math.max(1.4,c*.07);
   g.beginPath();g.moveTo(cx-c*.3,cy+c*.05);g.lineTo(cx-c*.05,cy-op);
   g.moveTo(cx-c*.3,cy+c*.05);g.lineTo(cx-c*.05,cy+op+c*.1);g.stroke()}
  if(/支撐|Shoring|固定/.test(pn3)){
   const bn=Math.min(4,1+Math.floor((S.t-(inc.t0||0))/8)%5);
   g.fillStyle='#b08a52';
   for(let i6=0;i6<bn;i6++)g.fillRect(cx-c*.36+i6*c*.19,cy-c*.05,c*.08,c*.42)}
  if(/探測|搜索/.test(pn3)){
   const sa=S.t*.9;
   g.fillStyle='rgba(207,176,245,.18)';
   g.beginPath();g.moveTo(cx,cy);
   g.arc(cx,cy,c*1.25,sa-.45,sa+.45);g.closePath();g.fill()}
  if(/確保|繩索|吊掛|下降/.test(pn3)){
   g.strokeStyle='rgba(216,212,200,.85)';g.lineWidth=Math.max(1,c*.05);
   g.beginPath();
   g.moveTo(cx-c*.3,cy+c*.35);g.lineTo(cx,cy-c*.4);g.lineTo(cx+c*.3,cy+c*.35);g.stroke();
   const dz=(S.t*.35)%1;
   g.fillStyle='#f0c53a';g.fillRect(cx-c*.05,cy-c*.35+dz*c*.6,c*.1,c*.1)}}}
