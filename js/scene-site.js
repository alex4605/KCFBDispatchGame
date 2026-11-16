// 現場畫面：建物窗光、災點建物與景物、火焰與濃煙
// 由 drawScene() 依序呼叫；參數皆為 drawScene 內算好的區域變數
'use strict';
function scWindowLights(g,nf,x0,x1,y0,y1,c,X,Y){
 // 建物窗光隨晝夜變化，另外疊畫（量少）
 if(c>16)for(let x=Math.max(0,x0);x<=Math.min(N-1,x1);x++)
  for(let y=Math.max(0,y0);y<=Math.min(N-1,y1);y++){
   const k=K(x,y);if(RD[k]||TR[k]||SH[k]<=.5)continue;
   g.fillStyle='rgba(255,220,150,'+(.1+nf*.25).toFixed(2)+')';
   g.fillRect(X(x)+c*.18,Y(y)+c*.2,c*.16,c*.16);g.fillRect(X(x)+c*.5,Y(y)+c*.45,c*.16,c*.16)}}
function scSite(inc,g,d,nf,c,X,Y,cx,cy){
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
 })();}
function scFireSmoke(inc,g,d,c,cx,cy,sev,prog,wx,wy){
 // 災點：火焰與濃煙
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
 g.textAlign='center';g.textBaseline='middle';g.fillText(inc.rev?d.ch:'？',cx,cy);}
