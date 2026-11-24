// 現場畫面：圍觀民眾、傷患、警戒、停車位、照明、抬頭資訊
// 由 drawScene() 依序呼叫；參數皆為 drawScene 內算好的區域變數
'use strict';
function scBystanders(inc,g,c,cx,cy){
 // 圍觀民眾
 if(inc.rev&&(inc.calls||1)>=2&&c>=13){
  const nb2=Math.min(16,3+Math.round((inc.calls||1)*1.3));
  for(let i=0;i<nb2;i++){
   const a=(i/nb2)*TAU+1.1+Math.sin(S.t*.25+i)*.06;
   const rr=c*(1.8+(i%3)*.22);
   figure(g,cx+Math.cos(a)*rr,cy+Math.sin(a)*rr,Math.max(1.4,c*.09),'civ',{ph:i})}}}
function scPatients(inc,g,c,cx,cy){
 // 傷患
 if(inc.rev&&inc.pm.trap>0){
  const left=Math.max(0,Math.round(inc.pm.trap*(1-Math.min(1,inc.work/inc.dur))));
  for(let i=0;i<left&&i<6;i++){
   const a=TAU*i/Math.max(1,left)+1.7;
   const px=cx+Math.cos(a)*c*.42,py=cy+Math.sin(a)*c*.42;
   g.save();g.translate(px,py);g.rotate(a);
   g.fillStyle='#d7b3a6';scRR(g,-c*.16,-c*.05,c*.32,c*.1,c*.04);g.fill();
   g.beginPath();g.arc(-c*.2,0,c*.06,0,TAU);g.fill();g.restore()}}}
function scCordonRing(g,d,c,cx,cy){
 // 警戒圈 / 擔架動線 / 後送方向

 if(d.cls==='救助'||d.tac){
  g.strokeStyle='rgba(233,161,59,.5)';g.lineWidth=Math.max(1,c*.05);
  g.setLineDash([c*.24,c*.24]);g.lineDashOffset=-(S.t*10)%(c*.48);
  g.beginPath();g.arc(cx,cy,c*1.5,0,TAU);g.stroke();g.setLineDash([])}
 }
function scTapeCones(inc,g,c,X,Y){
 // 警戒帶與三角錐
 if(inc.pk&&inc.pk.arms){
  for(const arm of inc.pk.arms){
   for(let i2=1;i2<=2;i2++){
    const q=arm.cells[Math.min(arm.cells.length-1,i2)];
    if(!q)continue;
    const px=X(q[0])+c/2,py=Y(q[1])+c/2;
    g.fillStyle='#e9a13b';
    g.beginPath();g.moveTo(px,py-c*.12);g.lineTo(px+c*.08,py+c*.08);g.lineTo(px-c*.08,py+c*.08);
    g.closePath();g.fill()}}}}
function scTrapped(inc,g,c,cx,cy,prog){
 // 受困人員標記
 if(inc.rev&&inc.pm.trap>0){
  const left=Math.max(0,Math.round(inc.pm.trap*(1-prog)));
  for(let i=0;i<left&&i<6;i++){
   const a=TAU*i/Math.max(1,left)+S.t*.2;
   const px=cx+Math.cos(a)*c*.28,py=cy+Math.sin(a)*c*.28;
   g.fillStyle=(S.t*2|0)%2?'#ffe08a':'#ffb347';
   g.beginPath();g.moveTo(px,py-c*.13);g.lineTo(px+c*.1,py+c*.09);g.lineTo(px-c*.1,py+c*.09);
   g.closePath();g.fill()}}}
function scParkingBays(inc,g,crew,wOK,x0,x1,y0,y1,showHyd,c,X,Y,cx,cy){
 // 停車位標線
 if(inc.pk&&inc.pk.arms&&c>=14){
  g.strokeStyle='rgba(255,255,255,.10)';g.lineWidth=1;
  for(const arm of inc.pk.arms)for(const q of arm.cells.slice(0,4)){
   if(q[0]<x0||q[0]>x1||q[1]<y0||q[1]>y1)continue;
   g.strokeRect(X(q[0])+c*.12,Y(q[1])+c*.2,c*.76,c*.6)}}
 if(inc.rev&&inc.ph>=0&&/集結|協調|待命/.test(inc.phs[inc.ph])&&crew.length){
  const u0=crew[0],sx=X(u0.x)+c/2,sy=Y(u0.y)+c/2;
  g.strokeStyle='rgba(233,161,59,.55)';g.lineWidth=Math.max(1,c*.05);
  g.setLineDash([c*.2,c*.16]);g.strokeRect(sx-c*.9,sy-c*.55,c*1.8,c*1.1);g.setLineDash([]);
  if(c>=17){g.fillStyle='#e9a13b';g.font='600 '+(c*.26)+'px '+FONT;g.textAlign='center';
   g.fillText('集結區',sx,sy-c*.66)}}
 // 佔水接管與供水期間，消防栓旁有一名操作人員
 if(showHyd&&(inc.hooked||inc.hook>0)&&c>=14)
  figure(g,X(inc.hy[0])+c/2+c*.34,Y(inc.hy[1])+c/2,Math.max(1.4,c*.09),'fire',{ph:2});
 for(const u of crew){
  if(u.st!=='work'||(u.code!=='71'&&u.code!=='搜'))continue;
  const a3=(u.hd||0)+Math.PI/2;
  const gx=X(u.x+(u.ox||0))+c/2+Math.cos(a3)*c*.6,gy=Y(u.y+(u.oy||0))+c/2+Math.sin(a3)*c*.6;
  g.fillStyle='rgba(60,58,52,.8)';scRR(g,gx-c*.24,gy-c*.16,c*.48,c*.32,c*.04);g.fill();
  g.fillStyle='#f0c53a';
  for(let i3=0;i3<3;i3++)g.fillRect(gx-c*.18+i3*c*.13,gy-c*.09,c*.08,c*.18)}
 if(inc.rev&&inc.pm.trap>=3&&c>=14){
  const tx=cx+c*1.2,ty=cy-c*.9;
  g.fillStyle='rgba(93,202,165,.22)';scRR(g,tx-c*.5,ty-c*.35,c*1.0,c*.7,c*.06);g.fill();
  g.strokeStyle='rgba(93,202,165,.6)';g.lineWidth=1;g.strokeRect(tx-c*.5,ty-c*.35,c*1.0,c*.7);
  if(c>=18){g.fillStyle='#5dcaa5';g.font='600 '+(c*.24)+'px '+FONT;g.textAlign='center';
   g.fillText('傷患集中',tx,ty-c*.44)}}}
function scLightTower(g,crew,nf,c,X,Y,cx,cy){
 // 照明燈塔
 for(const u of crew){
  if(u.st!=='work'||(u.code!=='75'&&u.code!=='41'&&u.code!=='搜'))continue;
  const a5=(u.hd||0)-Math.PI/2;
  const lx=X(u.x+(u.ox||0))+c/2+Math.cos(a5)*c*.4,ly=Y(u.y+(u.oy||0))+c/2+Math.sin(a5)*c*.4;
  g.strokeStyle='rgba(180,176,168,.8)';g.lineWidth=Math.max(1,c*.04);
  g.beginPath();g.moveTo(lx,ly);g.lineTo(lx,ly-c*.5);g.stroke();
  g.fillStyle='rgba(255,246,210,.9)';g.fillRect(lx-c*.07,ly-c*.58,c*.14,c*.08);
  g.fillStyle='rgba(255,246,210,'+(.10+nf*.22).toFixed(2)+')';
  g.beginPath();g.moveTo(lx,ly-c*.54);g.lineTo(cx-c*.6,cy+c*.4);g.lineTo(cx+c*.6,cy+c*.4);
  g.closePath();g.fill()}}
function scEdgePointers(inc,g,crew,x0,x1,y0,y1,c,cx,cy){
 // 視野外車輛的邊緣指標
 for(const u of crew){
  if(u.x>=x0-.5&&u.x<=x1+.5&&u.y>=y0-.5&&u.y<=y1+.5)continue;
  const an=Math.atan2(u.y-inc.y,u.x-inc.x);
  const ex=Math.max(6,Math.min(scW-6,cx+Math.cos(an)*scW*.46));
  const ey=Math.max(24,Math.min(scH-6,cy+Math.sin(an)*scH*.44));
  g.fillStyle=CODE[u.code].col;
  g.save();g.translate(ex,ey);g.rotate(an);
  g.beginPath();g.moveTo(6,0);g.lineTo(-4,4);g.lineTo(-4,-4);g.closePath();g.fill();g.restore();
  if(c>=14){g.fillStyle='rgba(0,0,0,.6)';g.font='500 9px '+FONT;g.textAlign='center';
   g.fillText(u.cs,ex,ey-7);g.fillStyle='#cfcbc2';g.fillText(u.cs,ex,ey-8)}}}
function scHeader(inc,g,d,crew,nf,eff){
 // 抬頭資訊
 g.fillStyle='rgba(10,10,9,.72)';g.fillRect(0,0,scW,20);
 g.fillStyle='#e9e7e0';g.font='500 12px '+FONT;g.textAlign='left';g.textBaseline='middle';
 const txN=crew.filter(u=>u.st==='tx').length;
 g.fillText((inc.nm||d.n)+(inc.rev&&inc.ph>=0?'　'+inc.phs[inc.ph]:'　受理中')+(txN?'　後送途中':''),8,10);
 g.textAlign='right';g.fillStyle='#9d9a92';
 if(!emsSafe(inc)&&crew.some(u=>u.code==='91')){g.fillStyle='#e9a13b';
  g.fillText('救護組待命中',scW-8,10);g.fillStyle='#9d9a92';g.textAlign='right'}
 else g.fillText((nf>.4?'夜間　':'')+crew.length+' 車在場'+(eff?'　出水 '+eff+' 線':'')+(inc.wrap>0?'　收整中':''),scW-8,10)}
