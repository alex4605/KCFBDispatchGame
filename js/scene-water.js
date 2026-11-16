// 現場畫面：供水水帶、水花、水源標示、中繼水帶、分水器
// 由 drawScene() 依序呼叫；參數皆為 drawScene 內算好的區域變數
'use strict';
function scSupplyHose(inc,g,d,wOK,showHyd,c,X,Y){
 // 供水水帶（流動）
 if(d.w&&showHyd&&inc.hp&&inc.hp.length&&wOK&&!inc.tender){
  if(inc.supT0===undefined)inc.supT0=S.t;
  const slay=Math.min(1,(S.t-inc.supT0)/3),fpts=[[X(inc.ax)+c/2,Y(inc.ay)+c/2]];
  for(const q of inc.hp)fpts.push([X(q[0])+c/2,Y(q[1])+c/2]);
  fpts.reverse();
  let flen=0;for(let i3=1;i3<fpts.length;i3++)flen+=Math.hypot(fpts[i3][0]-fpts[i3-1][0],fpts[i3][1]-fpts[i3-1][1]);
  const hpts=[fpts[0]];let rem=flen*slay;
  for(let i3=1;i3<fpts.length&&rem>0;i3++){const A=fpts[i3-1],B=fpts[i3],sl=Math.hypot(B[0]-A[0],B[1]-A[1]);
   if(sl<=rem){hpts.push(B);rem-=sl}else{const f=rem/sl;hpts.push([A[0]+(B[0]-A[0])*f,A[1]+(B[1]-A[1])*f]);rem=0}}
  g.setLineDash([]);g.lineCap='round';g.lineJoin='round';
  g.beginPath();hpts.forEach((p,i3)=>{if(i3)g.lineTo(p[0],p[1]);else g.moveTo(p[0],p[1])});
  g.strokeStyle='rgba(8,18,22,.6)';g.lineWidth=Math.max(3,c*.2);g.stroke();
  g.strokeStyle='rgba(60,150,125,.65)';g.lineWidth=Math.max(2,c*.12);g.stroke();
  g.strokeStyle='#8fe3c4';g.lineWidth=Math.max(1,c*.05);
  g.setLineDash([c*.5,c*.3]);g.lineDashOffset=-(S.t*26)%(c*.8);
  g.beginPath();hpts.forEach((p,i3)=>{if(i3)g.lineTo(p[0],p[1]);else g.moveTo(p[0],p[1])});
  g.stroke();g.setLineDash([]);g.lineCap='butt';
  // 水帶接頭與水壓脈衝（由消防栓流向現場）
  g.fillStyle='#d6ae4a';
  hpts.forEach((p,i3)=>{if(i3%2===0){g.beginPath();g.arc(p[0],p[1],Math.max(1.5,c*.06),0,TAU);g.fill()}});
  let tot=0;const seg=[];
  for(let i3=1;i3<hpts.length;i3++){const l3=Math.hypot(hpts[i3][0]-hpts[i3-1][0],hpts[i3][1]-hpts[i3-1][1]);seg.push(l3);tot+=l3}
  if(tot>1&&slay>=1)for(let k3=0;k3<4;k3++){
   let dist=((S.t*.35+k3/4)%1)*tot,i3=0;
   while(i3<seg.length-1&&dist>seg[i3]){dist-=seg[i3];i3++}
   const f=seg[i3]?dist/seg[i3]:0,P0=hpts[i3],P1=hpts[i3+1]||P0;
   g.fillStyle='rgba(220,255,240,.85)';g.beginPath();
   g.arc(P0[0]+(P1[0]-P0[0])*f,P0[1]+(P1[1]-P0[1])*f,Math.max(1.5,c*.06),0,TAU);g.fill()}}
 if(showHyd){
  if(wOK){const pr=(S.t*.8)%1;g.strokeStyle='rgba(125,179,232,'+(.6*(1-pr)).toFixed(2)+')';g.lineWidth=1.5;
   g.beginPath();g.arc(X(inc.hy[0])+c/2,Y(inc.hy[1])+c/2,c*(.26+pr*.5),0,TAU);g.stroke()}
  g.fillStyle='#7db3e8';g.beginPath();g.arc(X(inc.hy[0])+c/2,Y(inc.hy[1])+c/2,Math.max(3,c*.26),0,TAU);g.fill();
  if(c>=15){g.fillStyle='#08131d';g.font='600 '+(c*.34)+'px '+FONT;g.textAlign='center';g.textBaseline='middle';
   g.fillText('栓',X(inc.hy[0])+c/2,Y(inc.hy[1])+c/2)}}}
function scSplash(inc,g,d,effNow,wOK,c,cx,cy){
 // 射水衝擊處的水花與蒸汽
 if(d.w&&effNow>0&&wOK){
  g.fillStyle='rgba(40,75,110,.22)';g.beginPath();
  g.ellipse(cx,cy+c*.12,c*(.55+.5*Math.min(1,inc.work/inc.dur)),c*.3,0,0,TAU);g.fill();
  for(let i=0;i<5;i++){
   const ph=(S.t*1.3+i*.2)%1;
   g.fillStyle='rgba(215,235,255,'+(.4*(1-ph)).toFixed(2)+')';
   g.beginPath();g.arc(cx+Math.sin(i*2.3+S.t*3)*c*.3,cy-ph*c*.7,c*.07*(1-ph*.6),0,TAU);g.fill()}
  for(let i=0;i<4;i++){
   const ph=(S.t*.5+i*.25)%1;
   g.fillStyle='rgba(235,240,245,'+(.2*(1-ph)).toFixed(2)+')';
   g.beginPath();g.arc(cx+Math.cos(i*1.6)*c*.35,cy-ph*c*1.5,c*(.2+ph*.5),0,TAU);g.fill()}}}
function scWaterSource(inc,g,showHyd,c,X,Y){
 // 水源區標示與流量
 if(showHyd&&c>=15){
  const hx3=X(inc.hy[0])+c/2,hy3=Y(inc.hy[1])+c/2;
  g.strokeStyle='rgba(125,179,232,.45)';g.lineWidth=1;
  g.setLineDash([c*.14,c*.12]);g.beginPath();g.arc(hx3,hy3,c*.5,0,TAU);g.stroke();g.setLineDash([]);
  g.fillStyle='#7db3e8';g.font='600 '+(c*.22)+'px '+FONT;g.textAlign='center';
  g.fillText((inc.hin||480)+' L/s',hx3,hy3-c*.6)}}
function scRelayHose(inc,g,d,pumpsV,c,X,Y){
 // 中繼水帶（佔水車→攻擊車）
 if(d.w&&inc.relay>0){
  const ps=pumpsV;
  for(let i4=0;i4+1<ps.length&&i4<inc.relay;i4++){
   const a1=ps[i4],a2=ps[i4+1];
   const sx=X(a1.x+(a1.ox||0))+c/2,sy=Y(a1.y+(a1.oy||0))+c/2,ex=X(a2.x+(a2.ox||0))+c/2,ey=Y(a2.y+(a2.oy||0))+c/2,
     mx2=(sx+ex)/2+(ey-sy)*.12,my2=(sy+ey)/2-(ex-sx)*.12;
    g.lineCap='round';g.setLineDash([]);
    g.beginPath();g.moveTo(sx,sy);g.quadraticCurveTo(mx2,my2,ex,ey);
    g.strokeStyle='rgba(8,18,22,.6)';g.lineWidth=Math.max(3,c*.2);g.stroke();
    g.strokeStyle='rgba(60,150,125,.7)';g.lineWidth=Math.max(2,c*.12);g.stroke();
    g.strokeStyle='#8fe3c4';g.lineWidth=Math.max(1,c*.045);
    g.setLineDash([c*.4,c*.24]);g.lineDashOffset=-(S.t*22)%(c*.64);g.stroke();g.setLineDash([]);
    g.fillStyle='#d6ae4a';g.beginPath();g.arc(sx,sy,Math.max(1.5,c*.06),0,TAU);g.fill();
    g.beginPath();g.arc(ex,ey,Math.max(1.5,c*.06),0,TAU);g.fill();
   g.setLineDash([]);g.lineCap='butt'}}}
function scManifold(g,d,pumpsV,effNow,wOK,c,X,Y,cx,cy){
 // 分水器
 if(d.w&&effNow>0&&wOK){
  const atk1=pumpsV[0];
  if(atk1){
   const mx2=(X(atk1.x+(atk1.ox||0))+c/2+cx)/2,my2=(Y(atk1.y+(atk1.oy||0))+c/2+cy)/2;
   g.fillStyle='#f0c53a';scRR(g,mx2-c*.08,my2-c*.06,c*.16,c*.12,c*.02);g.fill();
   g.strokeStyle='rgba(240,197,58,.7)';g.lineWidth=1;g.strokeRect(mx2-c*.08,my2-c*.06,c*.16,c*.12)}}}
