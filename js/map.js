// 大地圖繪製
'use strict';
function rr(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);
 ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}
function clamp(){
 const c=cell(),mx=c*N-cw,my=c*N-ch;
 cam.x=mx<0?mx/2:Math.max(0,Math.min(mx,cam.x));
 cam.y=my<0?my/2:Math.max(0,Math.min(my,cam.y))}
function fit(){zoomT=performance.now();zoom=Math.max(.5,Math.min(cw,ch)/(N*base));cam.x=(cell()*N-cw)/2;cam.y=(cell()*N-ch)/2;clamp()}
const bgc=document.createElement('canvas'),bgx=bgc.getContext('2d');
let bgScale=0,zoomT=0; // zoomT：最後一次縮放時間，縮放中先拉伸舊底圖，停止後才重烤
function ctxSwap(n){ctx=n}
function gridLines(c,x0,x1,y0,y1){
 if(c>8){ctx.strokeStyle='rgba(255,255,255,.05)';ctx.lineWidth=1;
  for(const x of RC){ctx.beginPath();ctx.moveTo(x*c+c/2,y0*c);ctx.lineTo(x*c+c/2,(y1+1)*c);ctx.stroke()}
  for(const y of RR){ctx.beginPath();ctx.moveTo(x0*c,y*c+c/2);ctx.lineTo((x1+1)*c,y*c+c/2);ctx.stroke()}}
 ctx.strokeStyle='#7f6f3c';ctx.lineWidth=Math.max(1,c*.06);ctx.setLineDash([c*.35,c*.3]);
 ctx.beginPath();ctx.moveTo(FX*c+c/2,y0*c);ctx.lineTo(FX*c+c/2,(y1+1)*c);ctx.stroke();
 ctx.beginPath();ctx.moveTo(x0*c,FY*c+c/2);ctx.lineTo((x1+1)*c,FY*c+c/2);ctx.stroke();
 ctx.setLineDash([])}
function drawTerrain(c,x0,x1,y0,y1){
 for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++){
  const k=K(x,y),t=TR[k],px=x*c,py=y*c,s=SH[k];
  if(t===1)ctx.fillStyle=s<.5?'#0d2130':'#0e2436';
  else if(t===2)ctx.fillStyle=s<.5?'#15251a':'#18291d';
  else if(t===3)ctx.fillStyle=s<.5?'#1c2430':'#202836';
  else if(t===4)ctx.fillStyle=s<.5?'#1d1f22':'#212327';
  else ctx.fillStyle=s<.33?'#171716':s<.66?'#1b1b19':'#1f1f1c';
  ctx.fillRect(px,py,c+.6,c+.6);
  if(RUN[k]&&!RD[k]){ctx.fillStyle='#3b3b39';ctx.fillRect(px,py,c+.6,c+.6);
   ctx.fillStyle='#8a8a84';ctx.fillRect(px+c*.3,py+c*.45,c*.4,Math.max(1,c*.08))}
  if(t===3&&c>11&&s>.7){ctx.fillStyle='#2c3a4a';ctx.fillRect(px+c*.2,py+c*.2,c*.6,c*.6)}
  if(t===2&&c>11&&s>.74){ctx.fillStyle='#1f3a25';ctx.beginPath();
   ctx.arc(px+c*.5,py+c*.5,c*.16,0,TAU);ctx.fill()}
  if(t===1&&c>11&&s>.62){ctx.fillStyle='rgba(125,179,232,.13)';
   ctx.fillRect(px+c*.18,py+c*.42,c*.34,Math.max(1,c*.07));
   ctx.fillRect(px+c*.58,py+c*.66,c*.24,Math.max(1,c*.07))}
  const r=RD[k];
  if(r){ctx.fillStyle=RCOL[r];ctx.fillRect(px,py,c+.6,c+.6)}}}
function bakeBG(){
 const c=cell(),px=Math.ceil(N*c);
 if(px*dpr>3600){bgScale=0;return false}
 bgc.width=Math.round(px*dpr);bgc.height=Math.round(px*dpr);
 bgx.setTransform(dpr,0,0,dpr,0,0);
 const g=ctx;ctxSwap(bgx);drawTerrain(c,0,N-1,0,N-1);gridLines(c,0,N-1,0,N-1);ctxSwap(g);
 bgScale=c;return true}
function draw(){
 const c=cell();
 ctx.fillStyle='#0b0b0a';ctx.fillRect(0,0,cw,ch);
 ctx.save();ctx.translate(-cam.x,-cam.y);
 const x0=Math.max(0,Math.floor(cam.x/c)),x1=Math.min(N-1,Math.ceil((cam.x+cw)/c));
 const y0=Math.max(0,Math.floor(cam.y/c)),y1=Math.min(N-1,Math.ceil((cam.y+ch)/c));
 if(bgScale!==c&&(!bgScale||performance.now()-zoomT>140)&&!bakeBG())bgScale=0;
 if(bgScale)ctx.drawImage(bgc,0,0,N*c,N*c);
 else{drawTerrain(c,x0,x1,y0,y1);gridLines(c,x0,x1,y0,y1)}
 ctx.fillStyle=C.hyd;
 for(const h of S.hyd){
  if(h[0]<x0-1||h[0]>x1+1||h[1]<y0-1||h[1]>y1+1)continue;
  ctx.beginPath();ctx.arc((h[0]+.5)*c,(h[1]+.5)*c,Math.max(1.2,c*.11),0,TAU);ctx.fill()}
 ctx.textAlign='center';ctx.textBaseline='middle';
 const mk=(p,col,t,sub)=>{
  const x=(p[0]+.5)*c,y=(p[1]+.5)*c,s=Math.max(9,c*1.05);
  ctx.fillStyle=col;rr(x-s/2,y-s/2,s,s,Math.max(2,c*.16));ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,.25)';ctx.lineWidth=1;ctx.stroke();
  if(c>=13){ctx.fillStyle='#fff';ctx.font='500 '+(s*.4)+'px '+FONT;ctx.fillText(t,x,y)}
  if(sub&&c>=26){ctx.fillStyle='#b9b5ac';ctx.font='400 '+(c*.28)+'px '+FONT;ctx.fillText(sub,x,y+s*.8)}};
 HOSP.forEach(h=>{
  const w=h.w||1,h2=h.h||1,x=h.p[0]*c,y=h.p[1]*c;
  ctx.fillStyle='#1a6bb8';rr(x+2,y+2,c*w-4,c*h2-4,Math.max(3,c*.2));ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,.28)';ctx.lineWidth=1;ctx.stroke();
  const s2=Math.min(c*w,c*h2);
  ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.font='500 '+(s2*.42)+'px '+FONT;ctx.fillText('醫',x+c*w/2,y+c*h2/2-(c>=22?s2*.1:0));
  if(c>=22){ctx.fillStyle='#d6e6f6';ctx.font='400 '+Math.max(10,c*.3)+'px '+FONT;
   ctx.fillText(h.n,x+c*w/2,y+c*h2/2+s2*.3)}});
 for(let i=0;i<S.nst;i++)
  mk(SPOT[i].p,'#a8431f',SPOT[i].n,'待 '+(S.ix?S.ix.idle[i]:0));
 for(const d of S.duties){
  const x=(d.x+.5)*c,y=(d.y+.5)*c;
  ctx.fillStyle=d.unit?'#7f77dd':'#46443f';
  ctx.beginPath();ctx.arc(x,y,Math.max(4,c*.33),0,TAU);ctx.fill();
  if(c>=13){ctx.fillStyle='#eceae3';ctx.font='500 '+(c*.3)+'px '+FONT;ctx.fillText('公',x,y)}
  if(sel===d.id){ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.setLineDash([3,3]);
   ctx.beginPath();ctx.arc(x,y,c*.66,0,TAU);ctx.stroke();ctx.setLineDash([])}}
 for(const inc of S.inc){
  const d=KIND[inc.k];
  if(inc.rev&&d.w&&inc.hp&&inc.hy&&inc.hooked&&!inc.tender){
   ctx.strokeStyle='rgba(93,202,165,.85)';ctx.lineWidth=Math.max(1.5,c*.12);
   ctx.lineCap='round';ctx.lineJoin='round';
   // 由消防栓沿道路接到進場口（hp 已依序由栓往進場口排列）
   ctx.beginPath();ctx.moveTo((inc.hy[0]+.5)*c,(inc.hy[1]+.5)*c);
   for(const p of inc.hp)ctx.lineTo((p[0]+.5)*c,(p[1]+.5)*c);
   ctx.stroke();ctx.lineCap='butt'}
  const cx=(inc.x+.5)*c,cy=(inc.y+.5)*c,pl=.5+.5*Math.sin(S.t*4.5);
  const col=inc.rev?d.col:C.unk;
  const sz=inc.rev&&d.fire?Math.min(1.8,.85+inc.pm.area/420):.85;
  ctx.fillStyle=col;ctx.globalAlpha=.16+.14*pl;
  ctx.beginPath();ctx.arc(cx,cy,c*sz,0,TAU);ctx.fill();
  ctx.globalAlpha=1;
  ctx.beginPath();ctx.arc(cx,cy,Math.max(4,c*.38),0,TAU);ctx.fill();
  if(c>=12){ctx.fillStyle='#100f0e';ctx.font='500 '+(c*.42)+'px '+FONT;
   ctx.fillText(inc.rev?d.ch:'？',cx,cy)}
  const rad=Math.max(6,c*.55);
  ctx.strokeStyle='rgba(255,255,255,.12)';ctx.lineWidth=Math.max(1.5,c*.09);
  ctx.beginPath();ctx.arc(cx,cy,rad,0,TAU);ctx.stroke();
  const fr=Math.max(0,Math.min(1,inc.work>0?inc.work/inc.dur:inc.left/inc.max));
  ctx.strokeStyle=col;
  ctx.beginPath();ctx.arc(cx,cy,rad,-Math.PI/2,-Math.PI/2+TAU*fr);ctx.stroke();
  if(inc.rev&&c>=16&&(inc.pm.trap>0||inc.pm.lvl>1)){
   const lb=(inc.pm.lvl>1?'第'+inc.pm.lvl+'報 ':'')+(inc.pm.trap>0?'困'+inc.pm.trap:'');
   ctx.font='500 '+(c*.28)+'px '+FONT;
   const tw=ctx.measureText(lb).width+7;
   ctx.fillStyle='rgba(0,0,0,.8)';rr(cx-tw/2,cy-c*1.02,tw,c*.34,3);ctx.fill();
   ctx.fillStyle='#f0dcdc';ctx.fillText(lb,cx,cy-c*.85)}
  if(sel===inc.id){ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.setLineDash([4,4]);
   ctx.beginPath();ctx.arc(cx,cy,rad*1.6,0,TAU);ctx.stroke();ctx.setLineDash([])}}
 for(const u of S.units){
  if(u.st==='idle'||u.st==='oos')continue;
  const cx=(u.x+.5+(u.ox||0))*c,cy=(u.y+.5+(u.oy||0))*c;
  const wk=K(Math.round(u.x),Math.round(u.y)),afloat=!RD[wk]&&TR[wk]===1;
  ctx.save();ctx.translate(cx,cy);ctx.rotate(u.hd||0);
  ctx.fillStyle=CODE[u.code].col;
  if(afloat){
   ctx.beginPath();
   ctx.moveTo(-c*.3,-c*.16);ctx.lineTo(c*.16,-c*.16);
   ctx.lineTo(c*.32,0);ctx.lineTo(c*.16,c*.16);
   ctx.lineTo(-c*.3,c*.16);ctx.closePath();ctx.fill();
   ctx.fillStyle='rgba(255,255,255,.5)';
   ctx.fillRect(-c*.46,-c*.03,c*.14,Math.max(1,c*.06));
   ctx.fillRect(-c*.62,c*.07,c*.1,Math.max(1,c*.05))}
  else{rr(-c*.3,-c*.17,c*.6,c*.34,Math.max(1,c*.06));ctx.fill();
   ctx.fillStyle='rgba(255,255,255,.22)';ctx.fillRect(c*.12,-c*.17,c*.06,c*.34)}
  ctx.restore();
  if((u.st==='go'||u.st==='dgo'||u.st==='work')&&c>=10){
   ctx.fillStyle=(S.t*6|0)%2?'#ffffff':'#3a6fd8';
   ctx.beginPath();ctx.arc(cx,cy-c*.3,Math.max(1.2,c*.07),0,TAU);ctx.fill()}
  if(selU===u.id){ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.stroke()}
  if(c>=12){ctx.fillStyle='#120f0e';ctx.font='500 '+(c*.26)+'px '+FONT;ctx.fillText(u.code,cx,cy)}
  if(c>=26){
   const lb=u.cs+(u.mode?' '+u.mode:'');
   ctx.font='500 '+(c*.25)+'px '+FONT;
   const tw=ctx.measureText(lb).width+6;
   ctx.fillStyle='rgba(0,0,0,.8)';rr(cx-tw/2,cy+c*.21,tw,c*.31,3);ctx.fill();
   ctx.fillStyle='#e6e3db';ctx.fillText(lb,cx,cy+c*.37)}}
  epaDraw(ctx,c);
 ctx.restore()}
