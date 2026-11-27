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
  if(r){ctx.fillStyle=RCOL[r];ctx.fillRect(px,py,c+.6,c+.6)}
  if(c>=34)terrainDetail(x,y,k,t,r,s,px,py,c)}}
// 放大後的街廓細節：建物量體、道路標線、港區貨櫃、綠地樹冠（以格子雜湊決定，畫面穩定不閃動）
function hsh(k,i){let h=(k*2654435761+i*40503)>>>0;h^=h>>>15;h=Math.imul(h,2246822519)>>>0;h^=h>>>13;return(h>>>0)/4294967296}
function terrainDetail(x,y,k,t,r,s,px,py,c){
 const rd=(a,b)=>a>=0&&b>=0&&a<N&&b<N&&RD[K(a,b)];
 if(r){const h=rd(x-1,y)||rd(x+1,y),v=rd(x,y-1)||rd(x,y+1),w=Math.max(1,c*.025);
  ctx.fillStyle='rgba(0,0,0,.18)';
  if(!v){ctx.fillRect(px,py,c+.6,c*.08);ctx.fillRect(px,py+c*.92,c+.6,c*.08)}
  if(!h){ctx.fillRect(px,py,c*.08,c+.6);ctx.fillRect(px+c*.92,py,c*.08,c+.6)}
  ctx.fillStyle=r>=3?'rgba(214,190,110,.45)':'rgba(230,228,220,.28)';
  if(h&&!v)for(let i=0;i<3;i++)ctx.fillRect(px+i*c/3+c*.05,py+c/2-w/2,c*.18,w);
  else if(v&&!h)for(let i=0;i<3;i++)ctx.fillRect(px+c/2-w/2,py+i*c/3+c*.05,w,c*.18);
  else if(h&&v){ctx.fillStyle='rgba(230,228,220,.16)';
   for(let i=0;i<5;i++){ctx.fillRect(px+c*.12+i*c*.16,py+c*.04,c*.08,c*.1);ctx.fillRect(px+c*.12+i*c*.16,py+c*.86,c*.08,c*.1)}}
  return}
 if(t===0){const g=c*.07,n=s<.4?3:2,q=(c-g*2)/n;
  for(let i=0;i<n;i++)for(let j=0;j<n;j++){const a=hsh(k,i*3+j);if(a<.18)continue;
   const bx=px+g+i*q+q*.08,by=py+g+j*q+q*.08,bw=q*(.62+.3*hsh(k,i+j*5+9)),bh=q*(.62+.3*hsh(k,i*7+j+4));
   const lv=16+(a*22|0);ctx.fillStyle='rgb('+(lv+12)+','+(lv+11)+','+(lv+8)+')';ctx.fillRect(bx,by,bw,bh);
   ctx.fillStyle='rgba(255,255,255,.06)';ctx.fillRect(bx,by,bw,Math.max(1,bh*.12));
   if(a>.8&&c>=60){ctx.fillStyle='rgba(255,214,140,.12)';ctx.fillRect(bx+bw*.25,by+bh*.35,bw*.15,bh*.12);ctx.fillRect(bx+bw*.6,by+bh*.6,bw*.15,bh*.12)}}}
 else if(t===2){ctx.fillStyle='rgba(40,74,46,.7)';
  for(let i=0;i<5;i++){const a=hsh(k,i),b=hsh(k,i+11);ctx.beginPath();ctx.arc(px+c*(.15+a*.7),py+c*(.15+b*.7),c*(.07+.06*hsh(k,i+23)),0,TAU);ctx.fill()}}
 else if(t===3){const cols=['#6b3b2a','#2f4f6b','#5a5a3a','#3d5a48'];
  for(let j=0;j<4;j++)for(let i=0;i<2;i++){if(hsh(k,i*4+j)<.3)continue;
   ctx.fillStyle=cols[hsh(k,i*4+j+50)*4|0];ctx.fillRect(px+c*(.1+i*.42),py+c*(.1+j*.21),c*.36,c*.16)}}
 else if(t===4&&s>.5){ctx.fillStyle='rgba(230,228,220,.2)';ctx.fillRect(px+c*.45,py+c*.1,c*.1,c*.3)}}
function bakeBG(){
 const c=cell(),px=Math.ceil(N*c);
 if(px*dpr>3600){bgScale=0;return false}
 bgc.width=Math.round(px*dpr);bgc.height=Math.round(px*dpr);
 bgx.setTransform(dpr,0,0,dpr,0,0);
 const g=ctx;ctxSwap(bgx);drawTerrain(c,0,N-1,0,N-1);gridLines(c,0,N-1,0,N-1);ctxSwap(g);
 bgScale=c;return true}
function draw(){
 const c=cell(),m=Math.min(c,44); // m：標記尺寸上限，放大時地圖細節變多但圖示不再無限放大
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
  ctx.beginPath();ctx.arc((h[0]+.5)*c,(h[1]+.5)*c,Math.max(1.2,m*.11),0,TAU);ctx.fill()}
 ctx.textAlign='center';ctx.textBaseline='middle';
 const mk=(p,col,t,sub)=>{
  const x=(p[0]+.5)*c,y=(p[1]+.5)*c,s=Math.max(9,m*1.05);
  ctx.fillStyle=col;rr(x-s/2,y-s/2,s,s,Math.max(2,m*.16));ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,.25)';ctx.lineWidth=1;ctx.stroke();
  if(c>=13){ctx.fillStyle='#fff';ctx.font='500 '+(s*.4)+'px '+FONT;ctx.fillText(t,x,y)}
  if(sub&&c>=26){ctx.fillStyle='#b9b5ac';ctx.font='400 '+(m*.28)+'px '+FONT;ctx.fillText(sub,x,y+s*.8)}};
 HOSP.forEach(h=>{
  const w=h.w||1,h2=h.h||1,x=h.p[0]*c,y=h.p[1]*c;
  ctx.fillStyle='#1a6bb8';rr(x+2,y+2,c*w-4,c*h2-4,Math.max(3,m*.2));ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,.28)';ctx.lineWidth=1;ctx.stroke();
  const s2=Math.min(c*w,c*h2);
  ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.font='500 '+Math.min(s2*.42,m*.8)+'px '+FONT;ctx.fillText('醫',x+c*w/2,y+c*h2/2-(c>=22?s2*.1:0));
  if(c>=22){ctx.fillStyle='#d6e6f6';ctx.font='400 '+Math.max(10,m*.3)+'px '+FONT;
   ctx.fillText(h.n,x+c*w/2,y+c*h2/2+s2*.3)}});
 for(let i=0;i<S.nst;i++)
  mk(SPOT[i].p,'#a8431f',SPOT[i].n,'待 '+(S.ix?S.ix.idle[i]:0));
 for(const d of S.duties){
  const x=(d.x+.5)*c,y=(d.y+.5)*c;
  ctx.fillStyle=d.unit?'#7f77dd':'#46443f';
  ctx.beginPath();ctx.arc(x,y,Math.max(4,m*.33),0,TAU);ctx.fill();
  if(c>=13){ctx.fillStyle='#eceae3';ctx.font='500 '+(m*.3)+'px '+FONT;ctx.fillText('公',x,y)}
  if(sel===d.id){ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.setLineDash([3,3]);
   ctx.beginPath();ctx.arc(x,y,m*.66,0,TAU);ctx.stroke();ctx.setLineDash([])}}
 wfDrawMap(ctx,c);
 // 放大到門檻以上：畫面內的案件直接在地圖上畫出現場圖層（車輛、水線、人員、火煙），與現場面板共用繪製
 const live=new Set(),liveU=new Set();
 if(c>=SC_MAP){const X=v=>v*c;
  const g=fontCap(ctx,15);
  for(const inc of S.inc){
   if(inc.wf||inc.x<x0-3||inc.x>x1+3||inc.y<y0-3||inc.y>y1+3)continue;
   live.add(inc.id);
   for(const u of onScene(inc))if(u.st!=='idle'&&u.st!=='oos'&&u.st!=='back')liveU.add(u.id);
   ctx.save();
   try{sceneLayers(inc,g,c,X,X,x0,x1,y0,y1,0,true)}catch(e){console.error(e)}
   ctx.restore();ctx.textAlign='center';ctx.textBaseline='middle'}}
 for(const inc of S.inc){
  const d=KIND[inc.k];
  if(live.has(inc.id)){mapIncTag(inc,d,c,m);continue}
  if(inc.rev&&d.w&&inc.hp&&inc.hy&&inc.hooked&&!inc.tender){
   ctx.strokeStyle='rgba(93,202,165,.85)';ctx.lineWidth=Math.max(1.5,m*.12);
   ctx.lineCap='round';ctx.lineJoin='round';
   // 由消防栓沿道路接到進場口（hp 已依序由栓往進場口排列）
   ctx.beginPath();ctx.moveTo((inc.hy[0]+.5)*c,(inc.hy[1]+.5)*c);
   for(const p of inc.hp)ctx.lineTo((p[0]+.5)*c,(p[1]+.5)*c);
   ctx.stroke();ctx.lineCap='butt'}
  const cx=(inc.x+.5)*c,cy=(inc.y+.5)*c,pl=.5+.5*Math.sin(S.t*4.5);
  const col=inc.rev?d.col:C.unk;
  const sz=inc.rev&&d.fire?Math.min(1.8,.85+inc.pm.area/420):.85;
  ctx.fillStyle=col;ctx.globalAlpha=.16+.14*pl;
  ctx.beginPath();ctx.arc(cx,cy,m*sz,0,TAU);ctx.fill();
  ctx.globalAlpha=1;
  ctx.beginPath();ctx.arc(cx,cy,Math.max(4,m*.38),0,TAU);ctx.fill();
  if(c>=12){ctx.fillStyle='#100f0e';ctx.font='500 '+(m*.42)+'px '+FONT;
   ctx.fillText(inc.rev?d.ch:'？',cx,cy)}
  const rad=Math.max(6,m*.55);
  ctx.strokeStyle='rgba(255,255,255,.12)';ctx.lineWidth=Math.max(1.5,m*.09);
  ctx.beginPath();ctx.arc(cx,cy,rad,0,TAU);ctx.stroke();
  const fr=Math.max(0,Math.min(1,inc.work>0?inc.work/inc.dur:inc.left/inc.max));
  ctx.strokeStyle=col;
  ctx.beginPath();ctx.arc(cx,cy,rad,-Math.PI/2,-Math.PI/2+TAU*fr);ctx.stroke();
  if(inc.rev&&c>=16&&(inc.pm.trap>0||inc.pm.lvl>1)){
   const lb=(inc.pm.lvl>1?'第'+inc.pm.lvl+'報 ':'')+(inc.pm.trap>0?'困'+inc.pm.trap:'');
   ctx.font='500 '+(m*.28)+'px '+FONT;
   const tw=ctx.measureText(lb).width+7;
   ctx.fillStyle='rgba(0,0,0,.8)';rr(cx-tw/2,cy-m*1.02,tw,m*.34,3);ctx.fill();
   ctx.fillStyle='#f0dcdc';ctx.fillText(lb,cx,cy-m*.85)}
  if(sel===inc.id){ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.setLineDash([4,4]);
   ctx.beginPath();ctx.arc(cx,cy,rad*1.6,0,TAU);ctx.stroke();ctx.setLineDash([])}}
 for(const u of S.units){
  if(u.st==='idle'||u.st==='oos'||u.st==='away'||liveU.has(u.id))continue;
  const cx=(u.x+.5+(u.ox||0))*c,cy=(u.y+.5+(u.oy||0))*c;
  const wk=K(Math.round(u.x),Math.round(u.y)),afloat=!RD[wk]&&TR[wk]===1;
  ctx.save();ctx.translate(cx,cy);ctx.rotate(u.hd||0);
  ctx.fillStyle=CODE[u.code].col;
  if(afloat){
   ctx.beginPath();
   ctx.moveTo(-m*.3,-m*.16);ctx.lineTo(m*.16,-m*.16);
   ctx.lineTo(m*.32,0);ctx.lineTo(m*.16,m*.16);
   ctx.lineTo(-m*.3,m*.16);ctx.closePath();ctx.fill();
   ctx.fillStyle='rgba(255,255,255,.5)';
   ctx.fillRect(-m*.46,-m*.03,m*.14,Math.max(1,m*.06));
   ctx.fillRect(-m*.62,m*.07,m*.1,Math.max(1,m*.05))}
  else{rr(-m*.3,-m*.17,m*.6,m*.34,Math.max(1,m*.06));ctx.fill();
   ctx.fillStyle='rgba(255,255,255,.22)';ctx.fillRect(m*.12,-m*.17,m*.06,m*.34)}
  ctx.restore();
  if((u.st==='go'||u.st==='dgo'||u.st==='work')&&c>=10){
   ctx.fillStyle=(S.t*6|0)%2?'#ffffff':'#3a6fd8';
   ctx.beginPath();ctx.arc(cx,cy-m*.3,Math.max(1.2,m*.07),0,TAU);ctx.fill()}
  if(selU===u.id){ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.stroke()}
  if(c>=12){ctx.fillStyle='#120f0e';ctx.font='500 '+(m*.26)+'px '+FONT;ctx.fillText(u.code,cx,cy)}
  if(c>=26){
   const lb=u.cs+(u.mode?' '+u.mode:'');
   ctx.font='500 '+(m*.25)+'px '+FONT;
   const tw=ctx.measureText(lb).width+6;
   ctx.fillStyle='rgba(0,0,0,.8)';rr(cx-tw/2,cy+m*.21,tw,m*.31,3);ctx.fill();
   ctx.fillStyle='#e6e3db';ctx.fillText(lb,cx,cy+m*.37)}}
  epaDraw(ctx,c);
 ctx.restore()}
// 地圖現場模式的門檻（每格像素）
const SC_MAP=56;
// 現場模式下的案件標籤：案類、報數與受困、作業進度，畫在災點上方
function mapIncTag(inc,d,c,m){
 const cx=(inc.x+.5)*c,cy=(inc.y+.5)*c-c*1.15;
 const lb=(inc.rev?d.n:'未到場 · 災情未明')+(inc.rev&&inc.pm.lvl>1?'　第'+inc.pm.lvl+'報':'')+(inc.rev&&inc.pm.trap>0?'　困'+inc.pm.trap:'');
 ctx.font='600 '+Math.max(11,m*.3)+'px '+FONT;
 const tw=ctx.measureText(lb).width+16,th=Math.max(18,m*.48),col=inc.rev?d.col:C.unk;
 ctx.fillStyle='rgba(10,10,9,.82)';rr(cx-tw/2,cy-th/2,tw,th,4);ctx.fill();
 ctx.fillStyle=col;ctx.fillRect(cx-tw/2,cy-th/2,4,th);
 const fr=Math.max(0,Math.min(1,inc.work>0?inc.work/inc.dur:inc.left/inc.max));
 ctx.fillStyle='rgba(255,255,255,.12)';ctx.fillRect(cx-tw/2+4,cy+th/2-3,tw-4,3);
 ctx.fillStyle=col;ctx.fillRect(cx-tw/2+4,cy+th/2-3,(tw-4)*fr,3);
 ctx.fillStyle='#eceae3';ctx.fillText(lb,cx+2,cy-1);
 if(sel===inc.id){ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.setLineDash([4,4]);
  rr(cx-tw/2-3,cy-th/2-3,tw+6,th+6,6);ctx.stroke();ctx.setLineDash([])}}
// 現場圖層的文字原本隨格子放大；地圖放大時格子很大，用代理把字級限制在 max 像素內
function fontCap(g,max){
 if(g._cap&&g._capMax===max)return g._cap;
 g._capMax=max;
 return g._cap=new Proxy(g,{
  get:(o,k)=>{const v=o[k];return typeof v==='function'?v.bind(o):v},
  set:(o,k,v)=>{if(k==='font')v=String(v).replace(/([\d.]+)px/,(a,n)=>Math.min(+n,max)+'px');o[k]=v;return true}})}
