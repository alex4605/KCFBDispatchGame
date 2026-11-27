// 大地圖繪製
'use strict';
function rr(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);
 ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}
function clamp(){
 const c=cell(),mx=c*N-cw,my=c*N-ch;
 cam.x=mx<0?mx/2:Math.max(0,Math.min(mx,cam.x));
 cam.y=my<0?my/2:Math.max(0,Math.min(my,cam.y))}
function fit(){fly=null;zoomT=performance.now();zoom=Math.max(.12,Math.min(cw,ch)/(N*base));cam.x=(cell()*N-cw)/2;cam.y=(cell()*N-ch)/2;clamp()}
const bgc=document.createElement('canvas'),bgx=bgc.getContext('2d');
let bgScale=0,zoomT=0; // zoomT：最後一次縮放時間，縮放中先拉伸舊底圖，停止後才重烤
function ctxSwap(n){ctx=n}
// 地形之上的線狀物：道路（依等級）與高壓電塔線；底圖烘焙與即時繪製共用
function gridLines(c,x0,x1,y0,y1){
 roadPass(c,Math.max(0,x0-1),Math.min(N-1,x1+1),Math.max(0,y0-1),Math.min(N-1,y1+1));
 if(c>=10&&PYLON.length)drawPylons(c,x0,x1,y0,y1)}
function drawTerrain(c,x0,x1,y0,y1){
 for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++){
  const k=K(x,y),t=TR[k],px=x*c,py=y*c,s=SH[k];
  if(t===1)ctx.fillStyle=s<.5?'#0d2130':'#0e2436';
  else if(t===2)ctx.fillStyle=s<.5?'#15251a':'#18291d';
  else if(t===3)ctx.fillStyle=s<.5?'#1c2430':'#202836';
  else if(t===4)ctx.fillStyle=RUN[k]?'#34343a':CROP[k]===10?'#4a4e56':CROP[k]===11?'#3a3b3e':(s<.5?'#1f2a21':'#212d23');
  else if(t===5){const cp=CROP[k];ctx.fillStyle=cp===2?(s<.5?'#1e3019':'#21341b'):cp===3?(s<.5?'#1b2b1d':'#1d2e1f'):cp===4?'#34362f':cp===5?(s<.5?'#22301b':'#25331d'):cp===6?(s<.5?'#2e2b1d':'#322e1f'):(s<.5?'#262f1b':'#29321d')}
  else if(t===6)ctx.fillStyle=CROP[k]===7?'#1d2633':s<.5?'#12282f':'#142c33';
  else if(t===7)ctx.fillStyle=s<.5?'#262a2f':'#2a2e33';
  else if(!inCity(x,y)||isSub(x,y))ctx.fillStyle=CROP[k]===9?'#262a2e':s<.5?'#1d1c19':'#211f1b';
  else ctx.fillStyle=s<.33?'#171716':s<.66?'#1b1b19':'#1f1f1c';
  ctx.fillRect(px,py,c+.6,c+.6);
  if(RUN[k]&&!RD[k]&&c>=6){ctx.fillStyle='rgba(235,235,225,.7)';ctx.fillRect(px+c*.2,py+c*.47,c*.45,Math.max(1,c*.06))}
  if(t===3&&c>11&&s>.7){ctx.fillStyle='#2c3a4a';ctx.fillRect(px+c*.2,py+c*.2,c*.6,c*.6)}
  if(t===2&&c>11&&s>.74){ctx.fillStyle='#1f3a25';ctx.beginPath();
   ctx.arc(px+c*.5,py+c*.5,c*.16,0,TAU);ctx.fill()}
  if(t===1&&c>11&&s>.62){ctx.fillStyle='rgba(125,179,232,.13)';
   ctx.fillRect(px+c*.18,py+c*.42,c*.34,Math.max(1,c*.07));
   ctx.fillRect(px+c*.58,py+c*.66,c*.24,Math.max(1,c*.07))}
  const r=RD[k];
  if(r&&c<4){ctx.fillStyle=r===1&&!inCity(x,y)?'#4a4433':RCOL[r];ctx.fillRect(px,py,c+.6,c+.6)}
  if(CANAL[k]&&c>=8)drawCanal(x,y,px,py,c,r);
  if(c>=34)terrainDetail(x,y,k,t,r,s,px,py,c)}}
// 放大後的街廓細節：建物量體、道路標線、港區貨櫃、綠地樹冠（以格子雜湊決定，畫面穩定不閃動）
function hsh(k,i){let h=(k*2654435761+i*40503)>>>0;h^=h>>>15;h=Math.imul(h,2246822519)>>>0;h^=h>>>13;return(h>>>0)/4294967296}
function terrainDetail(x,y,k,t,r,s,px,py,c){
 const rd=(a,b)=>a>=0&&b>=0&&a<N&&b<N&&RD[K(a,b)];
 if(r){// 道路本身由 roadPass 依等級繪製；市區道路格底下鋪人行道色
  if(inCity(x,y)&&!isSub(x,y)&&t===0){ctx.fillStyle='rgba(120,118,110,.13)';ctx.fillRect(px,py,c+.6,c+.6)}
  return}
 if(t===0&&CROP[k]>=13&&CROP[k]<=17)schoolDetail(k,CROP[k],px,py,c);
 else if(t===0&&inCity(x,y)&&!isSub(x,y)){const g=c*.07,n=s<.4?3:2,q=(c-g*2)/n;
  for(let i=0;i<n;i++)for(let j=0;j<n;j++){const a=hsh(k,i*3+j);if(a<.18)continue;
   const bx=px+g+i*q+q*.08,by=py+g+j*q+q*.08,bw=q*(.62+.3*hsh(k,i+j*5+9)),bh=q*(.62+.3*hsh(k,i*7+j+4));
   const lv=16+(a*22|0);ctx.fillStyle='rgb('+(lv+12)+','+(lv+11)+','+(lv+8)+')';ctx.fillRect(bx,by,bw,bh);
   ctx.fillStyle='rgba(255,255,255,.06)';ctx.fillRect(bx,by,bw,Math.max(1,bh*.12));
   if(a>.8&&c>=60){ctx.fillStyle='rgba(255,214,140,.12)';ctx.fillRect(bx+bw*.25,by+bh*.35,bw*.15,bh*.12);ctx.fillRect(bx+bw*.6,by+bh*.6,bw*.15,bh*.12)}}}
 else if(t===5&&CROP[k]>=2&&CROP[k]<=6){cropDetail(k,CROP[k],px,py,c);levee(x,y,px,py,c)}
 else if(t===5){// 農田：田埂分格，部分有作物行
  levee(x,y,px,py,c);const v=hsh(k,7);ctx.strokeStyle='rgba(150,150,90,.16)';ctx.lineWidth=Math.max(1,c*.03);
  ctx.strokeRect(px+c*.04,py+c*.04,c*.92,c*.92);
  if(v<.5){ctx.beginPath();ctx.moveTo(px+c*.5,py+c*.04);ctx.lineTo(px+c*.5,py+c*.96);ctx.stroke()}
  if(v>.35){ctx.strokeStyle=v>.7?'rgba(120,160,70,.22)':'rgba(170,160,80,.18)';
   for(let i=1;i<6;i++){ctx.beginPath();ctx.moveTo(px+c*.1,py+c*i/6);ctx.lineTo(px+c*.9,py+c*i/6);ctx.stroke()}}
  if(hsh(k,8)>.93){ctx.fillStyle='#3a3226';ctx.fillRect(px+c*.62,py+c*.6,c*.22,c*.2);ctx.fillStyle='#57493a';ctx.fillRect(px+c*.62,py+c*.6,c*.22,c*.05)}}
 else if(t===6){// 魚塭：堤岸、水面、打氣水車；部分為漁電共生（水面上的光電板）
  ctx.fillStyle='#2b2c22';ctx.fillRect(px,py,c+.6,c+.6);
  ctx.fillStyle='#163a46';ctx.fillRect(px+c*.1,py+c*.1,c*.8,c*.8);
  if(CROP[k]===7){ctx.fillStyle='#24344a';for(let i=0;i<4;i++)ctx.fillRect(px+c*.14,py+c*(.14+i*.19),c*.72,c*.13);
   ctx.fillStyle='rgba(160,190,230,.18)';for(let i=0;i<4;i++)ctx.fillRect(px+c*.14,py+c*(.14+i*.19),c*.72,c*.025);return}
  if(hsh(k,3)>.45){const ax=px+c*(.3+.4*hsh(k,4)),ay=py+c*(.3+.4*hsh(k,5)),sp=S?S.t*4:0;
   ctx.strokeStyle='rgba(220,235,240,.55)';ctx.lineWidth=Math.max(1,c*.03);ctx.beginPath();ctx.arc(ax,ay,c*.09,0,TAU);ctx.stroke();
   ctx.fillStyle='rgba(220,235,240,.25)';ctx.beginPath();ctx.arc(ax,ay,c*.16,0,TAU);ctx.fill()}}
 else if(t===0&&CROP[k]>=13&&CROP[k]<=17)schoolDetail(k,CROP[k],px,py,c);
 else if(t===0){// 郊區與鄉鎮：低矮透天與三合院，偶有廟宇、學校、鐵皮工廠
  const a=hsh(k,1);
  if(CROP[k]===9){const cols=['#3e4a56','#4a4f55','#56504a','#3f4d4a'],cl=cols[hsh(k,6)*4|0];
   ctx.fillStyle=cl;ctx.fillRect(px+c*.06,py+c*.1,c*.88,c*.74);
   ctx.strokeStyle='rgba(255,255,255,.1)';ctx.lineWidth=Math.max(1,c*.015);
   for(let i=1;i<8;i++){ctx.beginPath();ctx.moveTo(px+c*.06+i*c*.11,py+c*.1);ctx.lineTo(px+c*.06+i*c*.11,py+c*.84);ctx.stroke()}
   ctx.fillStyle='rgba(255,255,255,.08)';ctx.fillRect(px+c*.06,py+c*.44,c*.88,c*.04);
   ctx.fillStyle='#2c2b27';ctx.fillRect(px+c*.1,py+c*.86,c*.5,c*.1);return}
  if(CROP[k]===8){ctx.fillStyle='#3d4a2e';ctx.fillRect(px+c*.04,py+c*.04,c*.92,c*.92);
   ctx.strokeStyle='#8a4a3a';ctx.lineWidth=Math.max(2,c*.07);ctx.beginPath();ctx.ellipse(px+c*.5,py+c*.55,c*.36,c*.24,0,0,TAU);ctx.stroke();
   ctx.fillStyle='#4a4540';ctx.fillRect(px+c*.08,py+c*.06,c*.84,c*.16);
   ctx.fillStyle='rgba(255,255,255,.7)';ctx.fillRect(px+c*.47,py+c*.02,Math.max(1,c*.02),c*.1);return}
  if(a<.05){ctx.fillStyle='#5a2a22';ctx.fillRect(px+c*.12,py+c*.18,c*.76,c*.6);
   ctx.fillStyle='#b8862e';ctx.fillRect(px+c*.12,py+c*.44,c*.76,c*.06);ctx.fillStyle='#d8b050';ctx.fillRect(px+c*.08,py+c*.16,c*.08,c*.08);ctx.fillRect(px+c*.84,py+c*.16,c*.08,c*.08);return}
  const roof=['#4a3a30','#3a3a38','#56402f','#40362c'];
  if(a<.22){ctx.fillStyle=roof[hsh(k,2)*4|0];ctx.fillRect(px+c*.12,py+c*.12,c*.76,c*.22);ctx.fillRect(px+c*.12,py+c*.12,c*.22,c*.7);ctx.fillRect(px+c*.66,py+c*.12,c*.22,c*.7);return}
  for(let i=0;i<2;i++)for(let j=0;j<2;j++){if(hsh(k,i*2+j+20)<.3)continue;
   ctx.fillStyle=roof[hsh(k,i+j*2+30)*4|0];ctx.fillRect(px+c*(.1+i*.46),py+c*(.1+j*.46),c*.36,c*.34);
   ctx.fillStyle='rgba(255,255,255,.05)';ctx.fillRect(px+c*(.1+i*.46),py+c*(.1+j*.46),c*.36,c*.06)}}
 else if(t===2){ctx.fillStyle='rgba(40,74,46,.7)';
  for(let i=0;i<5;i++){const a=hsh(k,i),b=hsh(k,i+11);ctx.beginPath();ctx.arc(px+c*(.15+a*.7),py+c*(.15+b*.7),c*(.07+.06*hsh(k,i+23)),0,TAU);ctx.fill()}}
 else if(t===3){const cols=['#6b3b2a','#2f4f6b','#5a5a3a','#3d5a48'];
  for(let j=0;j<4;j++)for(let i=0;i<2;i++){if(hsh(k,i*4+j)<.3)continue;
   ctx.fillStyle=cols[hsh(k,i*4+j+50)*4|0];ctx.fillRect(px+c*(.1+i*.42),py+c*(.1+j*.21),c*.36,c*.16)}}
 else if(t===4)airportDetail(x,y,k,px,py,c);
 else if(t===7)industryDetail(k,px,py,c)}
// 石化工業區：儲槽（圓頂、浮頂）、管架、廠房、燃燒塔
function industryDetail(k,px,py,c){
 const a=hsh(k,1);
 if(a<.45){const n=a<.2?1:4,r=n===1?c*.38:c*.18;
  for(let i=0;i<n;i++){const cx=px+(n===1?c/2:c*(.27+(i%2)*.46)),cy=py+(n===1?c/2:c*(.27+(i>>1)*.46));
   ctx.fillStyle='#5f646b';ctx.beginPath();ctx.arc(cx,cy,r,0,TAU);ctx.fill();
   ctx.strokeStyle='rgba(230,230,225,.35)';ctx.lineWidth=Math.max(1,c*.02);ctx.beginPath();ctx.arc(cx,cy,r*.72,0,TAU);ctx.stroke();
   ctx.fillStyle='rgba(255,255,255,.12)';ctx.beginPath();ctx.arc(cx-r*.25,cy-r*.25,r*.35,0,TAU);ctx.fill()}}
 else if(a<.7){ctx.fillStyle='#454a52';ctx.fillRect(px+c*.08,py+c*.12,c*.84,c*.7);
  ctx.strokeStyle='rgba(255,255,255,.1)';ctx.lineWidth=1;for(let i=1;i<6;i++){ctx.beginPath();ctx.moveTo(px+c*.08+i*c*.14,py+c*.12);ctx.lineTo(px+c*.08+i*c*.14,py+c*.82);ctx.stroke()}}
 else if(a<.92){ctx.strokeStyle='#8a8470';ctx.lineWidth=Math.max(1.5,c*.05);
  for(const o of[.35,.5,.65]){ctx.beginPath();ctx.moveTo(px,py+c*o);ctx.lineTo(px+c,py+c*o);ctx.stroke()}
  ctx.fillStyle='#5a564a';for(let i=0;i<3;i++)ctx.fillRect(px+c*(.15+i*.33),py+c*.28,c*.05,c*.44)}
 else{ctx.fillStyle='#6a6e74';ctx.fillRect(px+c*.45,py+c*.2,c*.1,c*.6);
  const f=.6+.4*Math.sin((S?S.t:0)*6+k);ctx.fillStyle='rgba(255,150,60,'+(.6*f).toFixed(2)+')';ctx.beginPath();ctx.ellipse(px+c*.5,py+c*.14,c*.08,c*.14*f,0,0,TAU);ctx.fill()}}
// 機場：跑道標線與跑道頭、滑行道黃線、停機坪與飛機、航廈、圍籬
function airportDetail(x,y,k,px,py,c){
 const A=AP;if(!A)return;
 if(RUN[k]){const end=x===A.x0+1||!RUN[K(x+1,y)]||!RUN[K(x-1,y)];
  if(end){ctx.fillStyle='rgba(240,240,232,.75)';for(let i=0;i<6;i++)ctx.fillRect(px+c*.3,py+c*(.12+i*.13),c*.4,c*.07)}
  ctx.fillStyle='rgba(255,220,120,.6)';for(const yy of[.08,.88])for(let i=0;i<3;i++)ctx.fillRect(px+c*(.15+i*.33),py+c*yy,c*.05,c*.05);return}
 const cp=CROP[k];
 if(cp===10){ctx.fillStyle='#5a5f68';ctx.fillRect(px+c*.08,py,c*.84,c+.6);ctx.fillStyle='rgba(160,200,240,.35)';ctx.fillRect(px+c*.78,py,c*.08,c+.6);
  ctx.fillStyle='rgba(255,255,255,.08)';for(let i=0;i<3;i++)ctx.fillRect(px+c*(.2+i*.2),py+c*.1,c*.08,c*.8);return}
 if(cp===11){ctx.strokeStyle='rgba(240,200,80,.55)';ctx.lineWidth=Math.max(1,c*.025);ctx.beginPath();ctx.moveTo(px,py+c/2);ctx.lineTo(px+c,py+c/2);ctx.stroke();
  return}
 // 跑道之間的草地；滑行道（跑道中間一列）與圍籬
 const mid=Math.round((A.y0+A.y1)/2);
 if(y===mid&&x>A.x0+4){ctx.fillStyle='#2e2f33';ctx.fillRect(px,py+c*.25,c+.6,c*.5);ctx.fillStyle='rgba(240,200,80,.55)';ctx.fillRect(px,py+c*.49,c+.6,Math.max(1,c*.025))}
 if(x===A.x0||x===A.x1||y===A.y0||y===A.y1){ctx.strokeStyle='rgba(200,200,190,.4)';ctx.lineWidth=1;ctx.setLineDash([3,3]);ctx.beginPath();
  if(x===A.x0){ctx.moveTo(px+1,py);ctx.lineTo(px+1,py+c)}if(x===A.x1){ctx.moveTo(px+c-1,py);ctx.lineTo(px+c-1,py+c)}
  if(y===A.y0){ctx.moveTo(px,py+1);ctx.lineTo(px+c,py+1)}if(y===A.y1){ctx.moveTo(px,py+c-1);ctx.lineTo(px+c,py+c-1)}ctx.stroke();ctx.setLineDash([])}}
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
 routeShields(c,x0,x1,y0,y1);
 if(c<40)mapLabels(c);
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
 // 消防學校（楠梓）
 if(SCHOOL){schoolLive(c);if(c<34)mk(SCHOOL.p,'#6a4fb0','校','訓練中心');
  if(sel===SCHOOL_ID){const x=(SCHOOL.p[0]+.5)*c,y=(SCHOOL.p[1]+.5)*c;ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.setLineDash([4,4]);ctx.beginPath();ctx.arc(x,y,Math.max(9,m*.9),0,TAU);ctx.stroke();ctx.setLineDash([])}}
 // 放大後：分隊、醫院、機場改畫俯視圖（map-sites.js），否則畫標記
 if(c>=34)siteOverlay(c,x0,x1,y0,y1);
 HOSP.forEach(h=>{
  if(c>=34)return;
  const w=h.w||1,h2=h.h||1,x=h.p[0]*c,y=h.p[1]*c;
  ctx.fillStyle='#1a6bb8';rr(x+2,y+2,c*w-4,c*h2-4,Math.max(3,m*.2));ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,.28)';ctx.lineWidth=1;ctx.stroke();
  const s2=Math.min(c*w,c*h2);
  ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.font='500 '+Math.min(s2*.42,m*.8)+'px '+FONT;ctx.fillText('醫',x+c*w/2,y+c*h2/2-(c>=22?s2*.1:0));
  if(c>=22){ctx.fillStyle='#d6e6f6';ctx.font='400 '+Math.max(10,m*.3)+'px '+FONT;
   ctx.fillText(h.n,x+c*w/2,y+c*h2/2+s2*.3)}});
 if(c<34)for(let i=0;i<S.nst;i++)
  mk(SPOT[i].p,SPOT[i].n==='機場'?'#b8902a':'#a8431f',SPOT[i].n,'待 '+(S.ix?S.ix.idle[i]:0));
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
 // 門檻前 SC_FADE 像素開始淡入，到門檻時完全取代一般標記
 const fa=Math.max(0,Math.min(1,(c-SC_MAP+SC_FADE)/SC_FADE));
 if(fa>0){const X=v=>v*c,nf=dayNF()*fa;
  if(nf>.01)mapNight(c,x0,x1,y0,y1,nf);
  const g=fontCap(ctx,15);
  for(const inc of S.inc){
   if(inc.wf||inc.x<x0-3||inc.x>x1+3||inc.y<y0-3||inc.y>y1+3)continue;
   live.add(inc.id);
   for(const u of onScene(inc))if(u.st!=='idle'&&u.st!=='oos'&&u.st!=='back')liveU.add(u.id);
   ctx.save();ctx.globalAlpha=fa;
   try{sceneLayers(inc,g,c,X,X,x0,x1,y0,y1,nf,true)}catch(e){console.error(e)}
   ctx.restore();ctx.textAlign='center';ctx.textBaseline='middle'}}
 for(const inc of S.inc){
  const d=KIND[inc.k];
  if(live.has(inc.id)&&fa>=1){mapIncTag(inc,d,c,m);continue}
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
  if(u.st==='idle'||u.st==='oos'||u.st==='away'||(fa>=1&&liveU.has(u.id)))continue;
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
 // 地圖現場模式：選取中的車輛外框
 if(fa>=1&&selU&&liveU.has(selU)){const u=S.units.find(x=>x.id===selU);
  if(u){const ux=(u.x+.5+(u.ox||0))*c,uy=(u.y+.5+(u.oy||0))*c;
   ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.setLineDash([4,3]);ctx.beginPath();ctx.arc(ux,uy,c*.48,0,TAU);ctx.stroke();ctx.setLineDash([])}}
 ctx.restore();
 EDGE.length=0;
 if(fa>=1){mapEdgeTags(c,x0,x1,y0,y1);miniMap(c)}
 const lg=$('legend');if(lg){const v=fa>=1?'none':'';if(lg.style.display!==v)lg.style.display=v}}
// 地圖現場模式的門檻（每格像素）
const SC_MAP=56,SC_FADE=14;
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
// 選取案件時鏡頭飛到現場：縮放以對數內插、中心點以緩動內插，約 0.7 秒
let fly=null;
const FLY_C=84; // 飛到現場時的每格像素（高於 SC_MAP，進入地圖現場模式）
function flyTo(o){
 const c0=cell(),z1=Math.max(zoom,Math.min(6,FLY_C/base));
 fly={t0:-1,dur:.7,z0:zoom,z1,x0:(cam.x+cw/2)/c0,y0:(cam.y+ch/2)/c0,x1:o.x+.5,y1:o.y+.5}}
function flyStep(ts){
 if(!fly)return;
 if(fly.t0<0)fly.t0=ts;
 const k=Math.min(1,(ts-fly.t0)/1000/fly.dur),e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;
 zoom=fly.z0*Math.pow(fly.z1/fly.z0,e);zoomT=performance.now();
 const c=cell(),wx=fly.x0+(fly.x1-fly.x0)*e,wy=fly.y0+(fly.y1-fly.y0)*e;
 cam.x=wx*c-cw/2;cam.y=wy*c-ch/2;clamp();
 if(k>=1)fly=null}
// 畫面外案件的邊緣指標（地圖現場模式）：貼在畫面邊緣指向案件，點按飛過去
const EDGE=[];
function mapEdgeTags(c,x0,x1,y0,y1){
 const mx=cw/2,my=ch/2,pad=22;
 ctx.textAlign='center';ctx.textBaseline='middle';
 for(const inc of S.inc){
  const sx=(inc.x+.5)*c-cam.x,sy=(inc.y+.5)*c-cam.y;
  if(sx>-c*.5&&sx<cw+c*.5&&sy>-c*.5&&sy<ch+c*.5)continue;
  const dx=sx-mx,dy=sy-my,k=Math.min((mx-pad)/Math.max(1e-6,Math.abs(dx)),(my-pad)/Math.max(1e-6,Math.abs(dy)));
  const ex=mx+dx*k,ey=my+dy*k,d=KIND[inc.k],col=inc.rev?d.col:C.unk,a=Math.atan2(dy,dx);
  ctx.save();ctx.translate(ex,ey);ctx.rotate(a);ctx.fillStyle=col;
  ctx.beginPath();ctx.moveTo(18,0);ctx.lineTo(9,-6);ctx.lineTo(9,6);ctx.closePath();ctx.fill();ctx.restore();
  ctx.fillStyle='rgba(10,10,9,.85)';ctx.beginPath();ctx.arc(ex,ey,12,0,TAU);ctx.fill();
  ctx.strokeStyle=sel===inc.id?'#fff':col;ctx.lineWidth=2;ctx.stroke();
  ctx.fillStyle='#eceae3';ctx.font='600 12px '+FONT;ctx.fillText(inc.rev?d.ch:'？',ex,ey+.5);
  ctx.font='500 10px '+FONT;const lb=inc.rev?d.n:'未到場',tw=ctx.measureText(lb).width+6,ly=ey+(ey>ch-40?-22:22);
  ctx.fillStyle='rgba(10,10,9,.8)';rr(ex-tw/2,ly-7,tw,14,3);ctx.fill();ctx.fillStyle='#b9b5ac';ctx.fillText(lb,ex,ly);
  EDGE.push({x:ex,y:ey,id:inc.id})}}
// 全市縮圖（地圖現場模式右下角）：顯示目前視野與各案件，點按移動視野
const MINI={cv:null,key:'',x:0,y:0,s:0};
function miniMap(c){
 const s=Math.min(150,Math.max(96,Math.min(cw,ch)*.22)),x=cw-s-12,y=ch-s-12;
 MINI.x=x;MINI.y=y;MINI.s=s;
 const key=s+','+dpr+','+S.mapV;
 if(MINI.key!==key){MINI.key=key;const mc=MINI.cv||(MINI.cv=document.createElement('canvas'));
  mc.width=Math.round(s*dpr);mc.height=Math.round(s*dpr);const g=mc.getContext('2d'),q=s*dpr/N;
  for(let i=0;i<N;i++)for(let j=0;j<N;j++){const k=K(i,j),tt=TR[k];
   g.fillStyle=RD[k]?(RD[k]===4?'#6a6050':'#3a3a35'):tt===1?'#14324a':tt===2?'#1c3322':tt===3?'#263040':tt===4?'#26282c':tt===5?'#242d1c':tt===6?'#173540':tt===7?'#33373d':'#1c1c1a';
   g.fillRect(i*q,j*q,q+.5,q+.5)}}
 ctx.fillStyle='rgba(10,10,9,.85)';rr(x-4,y-4,s+8,s+8,6);ctx.fill();
 ctx.drawImage(MINI.cv,x,y,s,s);
 const q=s/N;
 for(const inc of S.inc){const d=KIND[inc.k];ctx.fillStyle=inc.rev?d.col:C.unk;
  ctx.beginPath();ctx.arc(x+(inc.x+.5)*q,y+(inc.y+.5)*q,sel===inc.id?4:2.6,0,TAU);ctx.fill();
  if(sel===inc.id){ctx.strokeStyle='#fff';ctx.lineWidth=1;ctx.stroke()}}
 ctx.strokeStyle='#fff';ctx.lineWidth=1.2;
 ctx.strokeRect(x+cam.x/c*q,y+cam.y/c*q,Math.max(3,cw/c*q),Math.max(3,ch/c*q));
 ctx.strokeStyle='rgba(255,255,255,.18)';ctx.lineWidth=1;ctx.strokeRect(x-.5,y-.5,s+1,s+1)}
// 地圖現場模式的點按判定：縮圖（回傳 true 表示已處理）與邊緣指標
function mapOverlayHit(sx,sy){
 if(cell()<SC_MAP)return false;
 if(MINI.s&&sx>=MINI.x-4&&sx<=MINI.x+MINI.s+4&&sy>=MINI.y-4&&sy<=MINI.y+MINI.s+4){
  const c=cell(),q=MINI.s/N,wx=Math.max(0,Math.min(N,(sx-MINI.x)/q)),wy=Math.max(0,Math.min(N,(sy-MINI.y)/q));
  fly=null;cam.x=wx*c-cw/2;cam.y=wy*c-ch/2;clamp();return true}
 for(const e of EDGE)if(Math.hypot(sx-e.x,sy-e.y)<16){selInc(e.id);return true}
 return false}
// 地圖現場模式點選車輛：回傳最近的現場車輛 id
function mapUnitHit(x,y){
 let best=null,bd=.5;
 for(const u of S.units){if(u.st==='idle'||u.st==='oos'||u.st==='away')continue;
  const d=Math.hypot(u.x+.5+(u.ox||0)-x,u.y+.5+(u.oy||0)-y);if(d<bd){bd=d;best=u.id}}
 return best}
// 地圖現場模式的夜間：整體壓暗、住家窗光、路燈；窗光位置與街廓細節的建物量體一致
function mapNight(c,x0,x1,y0,y1,nf){
 ctx.fillStyle='rgba(8,12,28,'+(.55*nf).toFixed(3)+')';ctx.fillRect(x0*c,y0*c,(x1-x0+1)*c,(y1-y0+1)*c);
 if(c<34)return;
 const fl=.75+.25*Math.sin(S.t*.7);
 for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++){const k=K(x,y),t=TR[k],r=RD[k],px=x*c,py=y*c,s=SH[k];
  if(r){if(r<=3&&hsh(k,50)>(inCity(x,y)?.55:.85)){const gx=px+c*.08,gy=py+c*.08;
    const gr=ctx.createRadialGradient(gx,gy,0,gx,gy,c*.6);gr.addColorStop(0,'rgba(255,210,140,'+(.32*nf).toFixed(3)+')');gr.addColorStop(1,'rgba(255,210,140,0)');
    ctx.fillStyle=gr;ctx.fillRect(gx-c*.6,gy-c*.6,c*1.2,c*1.2);ctx.fillStyle='rgba(255,230,180,'+(.9*nf).toFixed(2)+')';ctx.fillRect(gx-1.5,gy-1.5,3,3)}
   continue}
  if(t!==0)continue;
  ctx.fillStyle='rgba(255,206,130,'+(.75*nf*fl).toFixed(3)+')';
  if(inCity(x,y)){const g=c*.07,n=s<.4?3:2,q=(c-g*2)/n;
   for(let i=0;i<n;i++)for(let j=0;j<n;j++){if(hsh(k,i*3+j)<.18||hsh(k,i*3+j+60)<.45)continue;
    const bx=px+g+i*q+q*.08,by=py+g+j*q+q*.08,bw=q*(.62+.3*hsh(k,i+j*5+9)),bh=q*(.62+.3*hsh(k,i*7+j+4));
    for(let w=0;w<3;w++)if(hsh(k,i*9+j*3+w+70)>.4)ctx.fillRect(bx+bw*(.15+w*.27),by+bh*(.3+.3*hsh(k,w+80)),Math.max(1.5,bw*.12),Math.max(1.5,bh*.1))}}
  else if(hsh(k,40)>.35){ctx.fillRect(px+c*(.2+.5*hsh(k,41)),py+c*(.25+.4*hsh(k,42)),Math.max(2,c*.07),Math.max(2,c*.06))}}}
// 灌溉水圳：沿相鄰水圳格連線，遇道路畫成涵洞（短暗格）
function drawCanal(x,y,px,py,c,r){
 const w=Math.max(1,c*.09),cx=px+c/2,cy=py+c/2;
 ctx.strokeStyle=r?'rgba(20,40,52,.9)':'rgba(70,130,160,.75)';ctx.lineWidth=w;ctx.lineCap='round';
 let any=false;
 for(let i=0;i<4;i++){const a=x+DIR[i][0],b=y+DIR[i][1];
  if(a<0||b<0||a>=N||b>=N)continue;const kk=K(a,b);
  if(CANAL[kk]||TR[kk]===1){any=true;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+DIR[i][0]*c/2,cy+DIR[i][1]*c/2);ctx.stroke()}}
 if(!any){ctx.beginPath();ctx.moveTo(px+c*.2,cy);ctx.lineTo(px+c*.8,cy);ctx.stroke()}
 ctx.lineCap='butt'}
// 堤防：鄰接高屏溪的田邊畫一道堤
function levee(x,y,px,py,c){
 for(let i=0;i<4;i++){const a=x+DIR[i][0],b=y+DIR[i][1];
  if(a<0||b<0||a>=N||b>=N||TR[K(a,b)]!==1||inCity(a,b))continue;
  ctx.fillStyle='#4a4638';const w=c*.16;
  if(DIR[i][0])ctx.fillRect(DIR[i][0]>0?px+c-w:px,py,w,c+.6);else ctx.fillRect(px,DIR[i][1]>0?py+c-w:py,c+.6,w);
  ctx.fillStyle='rgba(200,190,150,.25)';
  if(DIR[i][0])ctx.fillRect(DIR[i][0]>0?px+c-w*.55:px+w*.35,py,Math.max(1,w*.2),c+.6);else ctx.fillRect(px,DIR[i][1]>0?py+c-w*.55:py+w*.35,c+.6,Math.max(1,w*.2))}}
// 作物細節（放大時）：香蕉園、檳榔園、溫室、果園、旱作
function cropDetail(k,cp,px,py,c){
 if(cp===2){// 香蕉：大葉叢，成行
  for(let i=0;i<3;i++)for(let j=0;j<3;j++){const ox=px+c*(.2+i*.3)+(j%2)*c*.06,oy=py+c*(.2+j*.3);
   ctx.fillStyle='rgba(90,150,60,.55)';ctx.beginPath();
   for(let a=0;a<5;a++){const an=a*1.257+hsh(k,i*3+j);ctx.ellipse(ox+Math.cos(an)*c*.05,oy+Math.sin(an)*c*.05,c*.075,c*.03,an,0,TAU)}
   ctx.fill()}}
 else if(cp===3){// 檳榔：細高樹幹的小樹冠，稀疏成排
  for(let i=0;i<4;i++)for(let j=0;j<4;j++){if(hsh(k,i*4+j)<.25)continue;const ox=px+c*(.14+i*.24),oy=py+c*(.14+j*.24);
   ctx.fillStyle='rgba(0,0,0,.25)';ctx.fillRect(ox+c*.02,oy+c*.03,c*.05,c*.02);
   ctx.fillStyle='rgba(110,160,80,.7)';ctx.beginPath();ctx.arc(ox,oy,c*.045,0,TAU);ctx.fill()}}
 else if(cp===4){// 溫室：白色網室，一排排屋脊
  ctx.fillStyle='rgba(210,214,206,.55)';ctx.fillRect(px+c*.06,py+c*.08,c*.88,c*.84);
  ctx.strokeStyle='rgba(120,124,118,.6)';ctx.lineWidth=Math.max(1,c*.02);
  for(let i=1;i<5;i++){ctx.beginPath();ctx.moveTo(px+c*.06+i*c*.176,py+c*.08);ctx.lineTo(px+c*.06+i*c*.176,py+c*.92);ctx.stroke()}}
 else if(cp===5){// 果園：圓樹冠格狀種植
  for(let i=0;i<3;i++)for(let j=0;j<3;j++){ctx.fillStyle=hsh(k,i+j*3)>.5?'rgba(80,130,60,.7)':'rgba(70,115,55,.7)';
   ctx.beginPath();ctx.arc(px+c*(.2+i*.3),py+c*(.2+j*.3),c*.1,0,TAU);ctx.fill()}}
 else if(cp===6){// 旱作：土色畦溝
  ctx.strokeStyle='rgba(120,100,70,.4)';ctx.lineWidth=Math.max(1,c*.04);
  for(let i=1;i<7;i++){ctx.beginPath();ctx.moveTo(px+c*i/7,py+c*.08);ctx.lineTo(px+c*i/7,py+c*.92);ctx.stroke()}}}
// 高壓電塔與電線
function drawPylons(c,x0,x1,y0,y1){
 ctx.strokeStyle='rgba(190,190,180,.35)';ctx.lineWidth=1;
 for(const o of[-.12,.12]){ctx.beginPath();PYLON.forEach((p,i)=>{const x=p[0]*c,y=(p[1]+o)*c;i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.stroke()}
 for(const p of PYLON){if(p[0]<x0-1||p[0]>x1+2||p[1]<y0-1||p[1]>y1+2)continue;
  const x=p[0]*c,y=p[1]*c,s=Math.max(3,c*.18);
  ctx.strokeStyle='rgba(210,210,200,.7)';ctx.lineWidth=Math.max(1,c*.03);
  ctx.beginPath();ctx.moveTo(x-s,y-s);ctx.lineTo(x+s,y+s);ctx.moveTo(x+s,y-s);ctx.lineTo(x-s,y+s);ctx.stroke();
  ctx.strokeRect(x-s,y-s,s*2,s*2)}}
// 地名：鄉鎮、高屏溪、台灣海峽（中低倍率時顯示，放大後隱藏）
function mapLabels(c){
 const al=Math.min(1,(40-c)/12);
 ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';
 const lb=(s,x,y,sz,col,rot)=>{ctx.save();ctx.translate(x*c,y*c);if(rot)ctx.rotate(rot);ctx.font='600 '+sz+'px '+FONT;
  ctx.lineWidth=3;ctx.strokeStyle='rgba(8,8,7,'+(.7*al).toFixed(2)+')';ctx.strokeText(s,0,0);ctx.fillStyle=col.replace('A',(al*.85).toFixed(2));ctx.fillText(s,0,0);ctx.restore()};
 for(const t of RTOWN)lb(t.n+'區',t.c[0]+.5,t.c[1]-t.r-1.2,13,'rgba(236,230,210,A)');
 lb('高 屏 溪',riverX(84)+.5,84,13,'rgba(125,179,232,A)',Math.PI/2);
 lb('台 灣 海 峽',5,OY+62,13,'rgba(125,179,232,A)',Math.PI/2);
 lb('台 灣 海 峽',OX+12,OY+128,13,'rgba(125,179,232,A)');
 lb('山　區',OX+128,OY+14,13,'rgba(140,190,140,A)');
 lb('二 仁 溪',OX+40,3.5,12,'rgba(125,179,232,A)');
 lb('林園工業區',OX+93,OY+131,12,'rgba(200,205,215,A)');
 if(SCHOOL)lb('消防訓練中心',SCHOOL.p[0]+.5,SCHOOL.y0-.6,12,'rgba(190,170,240,A)');
 ctx.restore()}
// ===== 道路分級繪製 =====
// 地面道路樣式（依 RG）：w 路寬（格寬比例）、col 路面、cl 中線（yy 雙黃、y 單黃、w 白虛線）、ed 路緣
const RSTY={};
RSTY[RGK.PROV]={w:.8,col:'#5d594e',cl:'yy',ed:'rgba(235,230,215,.35)'};
RSTY[RGK.CNTY]={w:.66,col:'#545045',cl:'y',ed:'rgba(235,230,215,.25)'};
RSTY[RGK.CITY]={w:.6,col:'#43423c',cl:'',ed:''};
RSTY[RGK.TWN]={w:.48,col:'#4b473d',cl:'',ed:''};
RSTY[RGK.IND]={w:.32,col:'#5e5442',cl:'',ed:''};
RSTY[RGK.PATH]={w:.24,col:'#3f3d37',cl:'',ed:''};
RSTY[RGK.UND]={w:.56,col:'#2b2a25',cl:'',ed:''};
RSTY[RGK.RAMP]={w:.46,col:'#676050',cl:'',ed:''};
const CITY_MAIN={w:.78,col:'#4a4943',cl:'w',ed:''};
const isHW=k=>RD[k]===4||HWL[k]||RD[k]===7&&HG[k];
const surf=k=>RD[k]&&RD[k]!==4;
function sty(k){const g=RG[k];if(g===RGK.CITY&&RD[k]===3)return CITY_MAIN;return RSTY[g]||RSTY[RGK.CITY]}
// 一格的連線：兩向垂直（樓梯狀斜路或轉角）畫成斜切直線，其餘從中心連到各邊中點
// fill：是否補中心方塊（路面用；標線不補）
function roadSeg(px,py,c,ds,fill){
 const cx=px+c/2,cy=py+c/2,em=d=>[cx+DIR[d][0]*c/2,cy+DIR[d][1]*c/2];
 ctx.beginPath();
 if(ds.length===2&&!ds.nc&&DIR[ds[0]][0]!==-DIR[ds[1]][0]&&DIR[ds[0]][1]!==-DIR[ds[1]][1]){
  // 斜切：從一邊中點直接連到另一邊中點，略為延伸到格外，與相鄰格的直段接合不留縫
  const a=em(ds[0]),b=em(ds[1]),ex=(b[0]-a[0])*.08,ey=(b[1]-a[1])*.08;
  ctx.moveTo(a[0]-ex,a[1]-ey);ctx.lineTo(b[0]+ex,b[1]+ey);ctx.stroke();return}
 for(const d of ds){const e=em(d);ctx.moveTo(cx,cy);ctx.lineTo(e[0],e[1])}
 ctx.stroke();
 if(fill){const w=ctx.lineWidth;ctx.fillStyle=ctx.strokeStyle;ctx.fillRect(cx-w/2,cy-w/2,w,w)}}
function roadPass(c,x0,x1,y0,y1){
 const sd=[],hd=[];       // 每格的地面連線方向、高速公路連線方向
 const buck={};
 for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++){const k=K(x,y);
  if(surf(k)){const ds=[];
   for(let i=0;i<4;i++){const a=x+DIR[i][0],b=y+DIR[i][1];if(a<0||b<0||a>=N||b>=N)continue;const nk=K(a,b);
    if(surf(nk)&&linkOK(RD[k],RD[nk]))ds.push(i)}
   // 轉角的對角格也是道路時（兩條平行路相鄰）不斜切
   if(ds.length===2){const a=x+DIR[ds[0]][0]+DIR[ds[1]][0],b=y+DIR[ds[0]][1]+DIR[ds[1]][1];if(a>=0&&b>=0&&a<N&&b<N&&surf(K(a,b)))ds.nc=1}
   const g=RD[k]===7?RGK.RAMP:RG[k]||RGK.CITY;(buck[g]=buck[g]||[]).push([x,y,k,ds])}
  if(isHW(k)){const ds=[];
   for(let i=0;i<4;i++){const a=x+DIR[i][0],b=y+DIR[i][1];if(a<0||b<0||a>=N||b>=N)continue;const nk=K(a,b);
    const fam=g=>g===RGK.EXP?2:g?1:0;                   // 國道（高架、平面）同一族，快速道路另一族
    if(isHW(nk)&&(fam(HG[nk])===fam(HG[k])||RD[k]===7||RD[nk]===7))ds.push(i)}
   hd.push([x,y,k,ds])}}
 ctx.lineCap='butt';ctx.lineJoin='round';
 const order=[RGK.PATH,RGK.IND,RGK.TWN,RGK.CITY,RGK.UND,RGK.CNTY,RGK.PROV,RGK.RAMP];
 // 路面
 for(const g of order){const L=buck[g];if(!L)continue;
  for(const [x,y,k,ds] of L){const s=sty(k);ctx.strokeStyle=s.col;ctx.lineWidth=Math.max(c<6?1:1.2,c*s.w);roadSeg(x*c,y*c,c,ds,1)}}
 // 橋：欄杆
 if(c>=14)for(const g of order){const L=buck[g];if(!L)continue;
  for(const [x,y,k,ds] of L){if(RD[k]!==6||HWL[k])continue;const s=sty(k),w=c*s.w/2+c*.04;ctx.fillStyle='rgba(200,196,184,.55)';
   const hz=ds.some(d=>DIR[d][0]);if(hz){ctx.fillRect(x*c,y*c+c/2-w-1,c+.6,1.5);ctx.fillRect(x*c,y*c+c/2+w,c+.6,1.5)}else{ctx.fillRect(x*c+c/2-w-1,y*c,1.5,c+.6);ctx.fillRect(x*c+c/2+w,y*c,1.5,c+.6)}}}
 // 標線
 if(c>=20){ctx.lineCap='butt';
  for(const g of[RGK.CITY,RGK.CNTY,RGK.PROV]){const L=buck[g];if(!L)continue;
   for(const [x,y,k,ds] of L){const s=sty(k);if(!s.cl||ds.length>2)continue;
    if(s.cl==='w'){ctx.strokeStyle='rgba(230,228,220,.45)';ctx.lineWidth=Math.max(1,c*.025);ctx.setLineDash([c*.18,c*.16]);roadSeg(x*c,y*c,c,ds)}
    else if(s.cl==='y'){ctx.strokeStyle='rgba(225,190,90,.6)';ctx.lineWidth=Math.max(1,c*.025);ctx.setLineDash([c*.22,c*.12]);roadSeg(x*c,y*c,c,ds)}
    else{ctx.setLineDash([]);ctx.strokeStyle='rgba(225,190,90,.7)';ctx.lineWidth=Math.max(1,c*.05);roadSeg(x*c,y*c,c,ds);
     ctx.strokeStyle=s.col;ctx.lineWidth=Math.max(.6,c*.018);roadSeg(x*c,y*c,c,ds)}}}
  ctx.setLineDash([])}
 // 斑馬線：只在市區與鄉鎮真正的路口（三向以上），畫在各個路口臂上
 if(c>=34){ctx.fillStyle='rgba(230,228,220,.32)';
  for(const g of[RGK.CITY,RGK.TWN,RGK.CNTY,RGK.PROV]){const L=buck[g];if(!L)continue;
   for(const [x,y,k,ds] of L){if(ds.length<3)continue;if(!(inCity(x,y)||RTOWN.some(t=>Math.hypot(x-t.c[0],y-t.c[1])<=t.r+1)))continue;
    // 兩條路並排（相鄰兩向之間的對角格也是路）不是真正的路口
    let wide=false;for(const d1 of ds)for(const d2 of ds){if(d1>=d2||DIR[d1][0]===-DIR[d2][0]&&DIR[d1][1]===-DIR[d2][1])continue;
     const a=x+DIR[d1][0]+DIR[d2][0],b=y+DIR[d1][1]+DIR[d2][1];if(a>=0&&b>=0&&a<N&&b<N&&surf(K(a,b)))wide=true}
    if(wide)continue;
    const s=sty(k),hw=c*s.w/2,cx=x*c+c/2,cy=y*c+c/2;
    for(const d of ds){const along=c*.36;
     for(let i=-2;i<=2;i++){const o=i*hw/2.6;
      if(DIR[d][0])ctx.fillRect(cx+DIR[d][0]*along-c*.05,cy+o-hw*.12,c*.1,hw*.24);
      else ctx.fillRect(cx+o-hw*.12,cy+DIR[d][1]*along-c*.05,hw*.24,c*.1)}}}}}
 // 高速公路：先畫平面段，再畫高架（含陰影）
 ctx.lineCap='butt';
 const hsty=g=>g===RGK.EXP?{w:.74,col:'#5d5a66'}:g===RGK.HWG?{w:.86,col:'#615a4b'}:{w:.88,col:'#6b6454'};
 for(const pass of[0,1]){
  for(const [x,y,k,ds] of hd){const g=HG[k]||RGK.HWE,el=g!==RGK.HWG;if((pass===1)!==el)continue;
   const s=hsty(g);
   if(el&&c>=6){ctx.strokeStyle='rgba(0,0,0,.35)';ctx.lineWidth=c*s.w;ctx.save();ctx.translate(c*.14,c*.16);roadSeg(x*c,y*c,c,ds,1);ctx.restore()}
   ctx.strokeStyle=s.col;ctx.lineWidth=Math.max(1.6,c*s.w);roadSeg(x*c,y*c,c,ds,1)}
  if(c>=16)for(const [x,y,k,ds] of hd){const g=HG[k]||RGK.HWE,el=g!==RGK.HWG;if((pass===1)!==el||ds.length>2)continue;
   const s=hsty(g);
   ctx.strokeStyle='rgba(235,232,220,.45)';ctx.lineWidth=Math.max(1,c*.02);ctx.setLineDash([c*.2,c*.14]);
   for(const o of[-.17,.17]){ctx.save();const hz=ds.some(d=>DIR[d][0]);ctx.translate(hz?0:o*c*s.w,hz?o*c*s.w:0);roadSeg(x*c,y*c,c,ds);ctx.restore()}
   ctx.setLineDash([]);ctx.strokeStyle=el?'rgba(210,206,190,.5)':'rgba(140,170,110,.55)';ctx.lineWidth=Math.max(1,c*.03);
   for(const o of[-.46,.46]){ctx.save();const hz=ds.some(d=>DIR[d][0]);ctx.translate(hz?0:o*c*s.w,hz?o*c*s.w:0);roadSeg(x*c,y*c,c,ds);ctx.restore()}}}
 // 地下道：畫在平面國道之上，道路進入國道路面處的出入口（暗色洞口與擋土牆）
 if(c>=12){const L=buck[RGK.UND]||[];
  for(const [x,y,k,ds] of L)for(const d of ds){const s=sty(k),hw=c*s.w/2,cx=x*c+c/2,cy=y*c+c/2,e=c*.43;
   ctx.fillStyle='rgba(0,0,0,.7)';
   if(DIR[d][0])ctx.fillRect(cx+DIR[d][0]*e-c*.03,cy-hw,c*.06,hw*2);else ctx.fillRect(cx-hw,cy+DIR[d][1]*e-c*.03,hw*2,c*.06);
   ctx.fillStyle='rgba(190,186,170,.55)';
   if(DIR[d][0]){ctx.fillRect(cx+DIR[d][0]*e-c*.03,cy-hw-2,c*.06,2);ctx.fillRect(cx+DIR[d][0]*e-c*.03,cy+hw,c*.06,2)}
   else{ctx.fillRect(cx-hw-2,cy+DIR[d][1]*e-c*.03,2,c*.06);ctx.fillRect(cx+hw,cy+DIR[d][1]*e-c*.03,2,c*.06)}}}
 ctx.lineCap='butt';ctx.setLineDash([])}
// 路線標誌：國道（綠底）、快速道路與省道（白底）、縣道（黃底）、鄉道（灰底），中低倍率顯示
function routeShields(c,x0,x1,y0,y1){
 if(c<7||c>70)return;
 ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='700 10px '+FONT;
 const gap=Math.max(14,Math.round(220/c));
 for(const r of ROUTES){const n=r.cells.length;if(n<6)continue;
  for(let i=Math.floor(gap/2);i<n;i+=gap){const [x,y]=r.cells[i];if(x<x0||x>x1||y<y0||y>y1)continue;
   const sx=(x+.5)*c,sy=(y+.5)*c,tw=ctx.measureText(r.n).width+8;
   const hw=r.g===RGK.HWE||r.g===RGK.HWG,bg=hw?'#2f6a3c':r.g===RGK.EXP||r.g===RGK.PROV?'#e6e2d6':r.g===RGK.CNTY?'#d9bf63':'#9aa0a6',fg=hw?'#fff':'#1a1a18';
   ctx.fillStyle='rgba(0,0,0,.5)';rr(sx-tw/2+1,sy-7,tw,15,3);ctx.fill();
   ctx.fillStyle=bg;rr(sx-tw/2,sy-8,tw,15,3);ctx.fill();ctx.fillStyle=fg;ctx.fillText(r.n,sx,sy)}}
 ctx.restore()}
