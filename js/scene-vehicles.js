// 現場畫面：車輛、警示燈光暈、雲梯、救護車裝載
// 由 drawScene() 依序呼叫；參數皆為 drawScene 內算好的區域變數
'use strict';
function scVehicles(inc,g,d,crew,nf,c,X,Y,cx,cy,wx){
 // 車輛
 for(const u of crew){
  if(u.st==='idle'||u.st==='oos'||u.st==='back')continue;
  const ux=X(u.x+(u.ox||0))+c/2,uy=Y(u.y+(u.oy||0))+c/2;
  g.save();g.translate(ux,uy);g.rotate(u.hd||0);
  const L=c*.66,W2=c*.34,rd=Math.max(1,c*.06);
   g.fillStyle='rgba(0,0,0,.3)';scRR(g,-L/2+c*.03,-W2/2+c*.05,L,W2,rd*1.5);g.fill();
   if(u.code!=='艇'){const mvg=u.st==='go'||u.st==='dgo';g.fillStyle='#0d0d0c';
    for(const wx of[-L*.3,L*.3]){g.fillRect(wx-c*.08,-W2/2-c*.03,c*.16,c*.05);g.fillRect(wx-c*.08,W2/2-c*.02,c*.16,c*.05)}
    if(mvg){g.fillStyle='#4a4a46';const to=(S.t*c*3)%(c*.08);
     for(const wx of[-L*.3,L*.3])for(let k6=0;k6<2;k6++){const tx=wx-c*.08+to+k6*c*.08;
      g.fillRect(tx,-W2/2-c*.03,c*.02,c*.05);g.fillRect(tx,W2/2-c*.02,c*.02,c*.05)}}}
  if(u.code==='91'){
   g.fillStyle='#f2f2ee';scRR(g,-L/2,-W2/2,L,W2,rd);g.fill();
   const nb=6,bw=L/nb,bh=W2*.34;
   for(let i2=0;i2<nb;i2++){g.fillStyle=i2%2?'#d8362f':'#f3c43b';
    g.fillRect(-L/2+i2*bw,-bh/2,bw,bh)}
   g.fillStyle='rgba(30,44,70,.55)';g.fillRect(L*.24,-W2/2,L*.12,W2);
   g.fillStyle='#d8362f';g.fillRect(-L*.06,-W2*.1,L*.12,W2*.2);
   g.fillRect(-L*.02,-W2*.22,L*.04,W2*.44)}
  else if(u.code==='艇'){
   g.fillStyle='#c8332c';
   g.beginPath();g.moveTo(-L*.48,-W2*.42);g.lineTo(L*.22,-W2*.42);
   g.lineTo(L*.5,0);g.lineTo(L*.22,W2*.42);g.lineTo(-L*.48,W2*.42);g.closePath();g.fill();
   g.fillStyle='#f3c43b';g.fillRect(-L*.48,-W2*.08,L*.8,W2*.16)}
  else{
   g.fillStyle='#c8332c';scRR(g,-L/2,-W2/2,L,W2,rd);g.fill();
   g.fillStyle='#f3c43b';g.fillRect(-L/2,-W2*.1,L,W2*.16);
   for(let i2=0;i2<3;i2++)g.fillRect(-L/2+i2*c*.055,-W2/2,c*.028,W2);
   g.fillStyle='rgba(30,44,70,.5)';g.fillRect(L*.26,-W2/2,L*.1,W2);
   if(u.code==='21'||u.code==='31'){g.fillStyle='#b9b5ac';g.fillRect(-L*.36,-W2*.12,L*.6,W2*.24)}
   if(u.code==='61'){g.fillStyle='#8fb8d0';scRR(g,-L*.3,-W2*.32,L*.5,W2*.64,rd);g.fill()}
   if(u.code==='搜'){g.fillStyle='#e9e7e0';g.fillRect(-L*.3,-W2*.3,L*.24,W2*.6)}}
  const working=u.st==='work',since=S.t-(u.at||0);
   // 頭燈（行進中夜間有光束）／危險警示燈、救護車後門、幫浦出水指示
   g.fillStyle='rgba(255,246,200,.9)';g.fillRect(L/2-c*.02,-W2*.4,c*.04,c*.07);g.fillRect(L/2-c*.02,W2*.33,c*.04,c*.07);
   if(u.code!=='艇'){g.fillStyle='rgba(255,255,255,.13)';g.fillRect(-L/2+rd,-W2/2+c*.01,L-rd*2,W2*.1);g.fillStyle='rgba(0,0,0,.16)';g.fillRect(-L/2+rd,W2*.4,L-rd*2,W2*.1)}
   if(!working){g.fillStyle='rgba(220,40,35,.8)';g.fillRect(-L/2-c*.01,-W2*.4,c*.035,c*.06);g.fillRect(-L/2-c*.01,W2*.34,c*.035,c*.06)}
   if(!working&&nf>.15){const hb=g.createLinearGradient(L/2,0,L/2+c*1.2,0);
    hb.addColorStop(0,'rgba(255,248,210,'+(.35*nf).toFixed(2)+')');hb.addColorStop(1,'rgba(255,248,210,0)');
    g.fillStyle=hb;g.beginPath();g.moveTo(L/2,-W2*.36);g.lineTo(L/2+c*1.2,-W2*1.2);g.lineTo(L/2+c*1.2,W2*1.2);g.lineTo(L/2,W2*.36);g.closePath();g.fill()}
   if(working){g.fillStyle=(S.t*3|0)%2?'#ffb02e':'rgba(120,80,20,.6)';
    g.fillRect(-L/2-c*.03,-W2*.46,c*.05,c*.06);g.fillRect(-L/2-c*.03,W2*.4,c*.05,c*.06);
     if(CODE[u.code].cap&&u.code!=='61'&&since<4.5){const ra=since*8;
      g.strokeStyle='#d6d2c6';g.lineWidth=Math.max(1,c*.025);g.beginPath();g.arc(-L*.3,0,c*.07,0,TAU);
      g.moveTo(-L*.3,0);g.lineTo(-L*.3+Math.cos(ra)*c*.07,Math.sin(ra)*c*.07);
      g.moveTo(-L*.3,0);g.lineTo(-L*.3+Math.cos(ra+2.1)*c*.07,Math.sin(ra+2.1)*c*.07);g.stroke()}
     if(u.code==='21'||u.code==='31'){const ex2=Math.min(1,since/1.2);
      g.strokeStyle='#44464a';g.lineWidth=Math.max(1.2,c*.035);g.fillStyle='#6a6d72';
      for(const sg of[-1,1])for(const lx of[-L*.2,L*.28]){const ey2=sg*(W2/2+c*.2*ex2);
       g.beginPath();g.moveTo(lx,sg*W2/2);g.lineTo(lx,ey2);g.stroke();g.fillRect(lx-c*.05,ey2-c*.03,c*.1,c*.06)}}
     if(u.code==='71'&&since>.8){g.globalAlpha=Math.min(1,(since-.8)/1);
      g.fillStyle='#2b2d30';g.fillRect(-L*.25,W2/2+c*.04,L*.5,c*.14);
      g.fillStyle='#e9a13b';g.fillRect(-L*.2,W2/2+c*.07,c*.1,c*.03);
      g.fillStyle='#d8362f';g.fillRect(-L*.02,W2/2+c*.07,c*.08,c*.03);
      g.fillStyle='#9ac95d';g.fillRect(L*.14,W2/2+c*.07,c*.07,c*.03);g.globalAlpha=1}
    if(u.code==='91'&&since>1){const op=Math.min(1,(since-1)/1.2);
     g.strokeStyle='#e8e8e4';g.lineWidth=Math.max(1,c*.05);g.lineCap='round';
     g.beginPath();g.moveTo(-L/2,-W2*.4);g.lineTo(-L/2-L*.2*op,-W2*.4-W2*.5*op);
     g.moveTo(-L/2,W2*.4);g.lineTo(-L/2-L*.2*op,W2*.4+W2*.5*op);g.stroke();g.lineCap='butt';
     g.fillStyle='rgba(255,255,230,'+(.55*op).toFixed(2)+')';g.fillRect(-L/2-c*.06,-W2*.3,c*.06,W2*.6)}
    if(d.w&&CODE[u.code].cap&&u.code!=='61'&&inc.work<inc.dur){
     g.fillStyle='rgba(125,200,255,'+(.4+.3*Math.sin(S.t*8+u.id)).toFixed(2)+')';
     g.beginPath();g.arc(-L*.08,W2*.52,c*.045,0,TAU);g.fill()}}
   // 車頂燈條（俯視）
  const blo=(S.t*11|0)%2;
  g.fillStyle='rgba(22,22,22,.85)';
  g.fillRect(L*.02,-W2*.52,c*.07,W2*1.04);
  g.fillStyle=blo?'#ff4d4d':'rgba(120,40,40,.6)';
  g.fillRect(L*.02,-W2*.52,c*.07,W2*.5);
  g.fillStyle=blo?'rgba(40,70,120,.6)':'#4da3ff';
  g.fillRect(L*.02,W2*.02,c*.07,W2*.5);
  // 後視鏡與車頂細節
  g.fillStyle='rgba(30,30,30,.7)';
  g.fillRect(L*.2,-W2*.62,c*.05,W2*.12);
  g.fillRect(L*.2,W2*.5,c*.05,W2*.12);
  g.fillStyle='rgba(255,255,255,.08)';
  g.fillRect(-L*.42,-W2*.4,L*.3,W2*.8);
  g.restore();
  if(u.st==='work'&&CODE[u.code].cap&&u.code!=='61'&&d.w&&inc.work<inc.dur){const hd3=u.hd||0;
    for(let k8=0;k8<2;k8++){const p8=(S.t*.8+k8*.5)%1;
     g.fillStyle='rgba(190,190,190,'+(.2*(1-p8)).toFixed(2)+')';
     g.beginPath();g.arc(ux-Math.cos(hd3)*c*.36+Math.sin(k8*3+S.t)*c*.03,uy-Math.sin(hd3)*c*.36-p8*c*.5,c*(.04+.07*p8),0,TAU);g.fill()}}
   if(u.st==='work'&&u.code==='41'){const pr2=(S.t*.7)%1;
    g.strokeStyle='rgba(233,161,59,'+(.5*(1-pr2)).toFixed(2)+')';g.lineWidth=1.2;
    g.beginPath();g.arc(ux,uy,c*(.2+pr2*.7),0,TAU);g.stroke()}
   if(u.st==='go'||u.st==='dgo'){const hd=u.hd||0;
    const gl=g.createRadialGradient(ux,uy,c*.1,ux,uy,c*1.1);
    gl.addColorStop(0,((S.t*5|0)%2?'rgba(255,60,50,':'rgba(70,130,255,')+'.2)');gl.addColorStop(1,'rgba(0,0,0,0)');
    g.fillStyle=gl;g.fillRect(ux-c*1.1,uy-c*1.1,c*2.2,c*2.2);
    for(let k7=0;k7<3;k7++){const dd=c*(.4+k7*.32),ph7=(S.t*2+k7*.33)%1;
     g.fillStyle='rgba(150,140,125,'+(.22*(1-ph7)*(1-k7*.25)).toFixed(2)+')';
     g.beginPath();g.arc(ux-Math.cos(hd)*dd,uy-Math.sin(hd)*dd,c*(.08+.1*ph7+k7*.03),0,TAU);g.fill()}}
   if(u.st==='work'&&(u.code==='21'||u.code==='31')){
    const ext=Math.max(0,Math.min(1,(S.t-(u.at||0)-1)/2.5)),an=Math.atan2(cy-uy,cx-ux),
     len=Math.min(Math.hypot(cx-ux,cy-uy),c*2.2)*ext;
    if(len>c*.2){g.save();g.translate(ux,uy);g.rotate(an);
     g.strokeStyle='#cfcac0';g.lineWidth=Math.max(1,c*.035);
     g.beginPath();g.moveTo(0,-c*.05);g.lineTo(len,-c*.05);g.moveTo(0,c*.05);g.lineTo(len,c*.05);g.stroke();
     g.lineWidth=Math.max(.8,c*.02);g.beginPath();
     for(let q=c*.14;q<len;q+=c*.14){g.moveTo(q,-c*.05);g.lineTo(q,c*.05)}
     if(ext>=1){g.fillStyle='#8a867c';g.fillRect(len-c*.02,-c*.1,c*.15,c*.2);g.fillStyle='#d6d2c6';g.fillRect(len,-c*.08,c*.11,c*.16)}
     g.stroke();g.restore()}}
   if(nf>.15&&u.st==='work'){
    const an2=Math.atan2(cy-uy,cx-ux),dd=Math.min(Math.hypot(cx-ux,cy-uy),c*3),pa=an2+Math.PI/2,
     ex=ux+Math.cos(an2)*dd,ey=uy+Math.sin(an2)*dd;
    const fg=g.createLinearGradient(ux,uy,ex,ey);
    fg.addColorStop(0,'rgba(255,250,225,'+(.3*nf).toFixed(2)+')');fg.addColorStop(1,'rgba(255,250,225,0)');
    g.fillStyle=fg;g.beginPath();g.moveTo(ux,uy);
    g.lineTo(ex+Math.cos(pa)*c*.9,ey+Math.sin(pa)*c*.9);g.lineTo(ex-Math.cos(pa)*c*.9,ey-Math.sin(pa)*c*.9);
    g.closePath();g.fill()}
   const bl=blo;
  g.fillStyle=bl?'rgba(255,77,77,.14)':'rgba(77,163,255,.14)';
  g.beginPath();g.arc(ux,uy,c*.5,0,TAU);g.fill();
  if(c>=17){g.font='500 '+Math.max(8,c*.28)+'px '+FONT;
   const tw=g.measureText(u.cs).width+5;
   g.fillStyle='rgba(0,0,0,.78)';scRR(g,ux-tw/2,uy+c*.2,tw,c*.3,2);g.fill();
   g.fillStyle='#e6e3db';g.textBaseline='middle';g.fillText(u.cs,ux,uy+c*.36)}}}
function scBeaconGlow(g,crew,nf,c,X,Y){
// 車輛警示燈地面光暈
 for(const u of crew){
  if(u.st!=='work')continue;
  const vx=X(u.x+(u.ox||0))+c/2,vy=Y(u.y+(u.oy||0))+c/2;
  const bl=(S.t*9|0)%2;
  g.fillStyle=bl?'rgba(226,86,79,'+(.12+nf*.22).toFixed(2)+')':'rgba(90,168,255,'+(.12+nf*.22).toFixed(2)+')';
  g.beginPath();g.ellipse(vx,vy,c*.75,c*.42,u.hd||0,0,TAU);g.fill()}}
function scLadder(g,crew,c,X,Y,cx,cy){
 // 雲梯架設
 for(const u of crew){
  if(u.st!=='work'||(u.code!=='21'&&u.code!=='31'))continue;
  const vx=X(u.x+(u.ox||0))+c/2,vy=Y(u.y+(u.oy||0))+c/2;
  const ext=Math.min(1,Math.max(0,(S.t-((u.at||0)+2))/6));
  if(ext<=0)continue;
  const ang=Math.atan2(cy-vy,cx-vx);
  const len=Math.hypot(cx-vx,cy-vy)*.85*ext;
  g.strokeStyle='#d8d4c8';g.lineWidth=Math.max(1.6,c*.09);
  g.beginPath();g.moveTo(vx,vy);g.lineTo(vx+Math.cos(ang)*len,vy+Math.sin(ang)*len);g.stroke();
  g.strokeStyle='rgba(216,212,200,.6)';g.lineWidth=Math.max(1,c*.04);
  for(let r2=c*.25;r2<len;r2+=c*.22){
   const px=vx+Math.cos(ang)*r2,py=vy+Math.sin(ang)*r2;
   g.beginPath();g.moveTo(px-Math.sin(ang)*c*.07,py+Math.cos(ang)*c*.07);
   g.lineTo(px+Math.sin(ang)*c*.07,py-Math.cos(ang)*c*.07);g.stroke()}
  if(ext>.9&&c>=14)figure(g,vx+Math.cos(ang)*len,vy+Math.sin(ang)*len,Math.max(1.5,c*.1),'fire',{})}}
function scAmbLoading(inc,g,crew,c,X,Y){
 // 救護車尾門與擔架裝載
 if(inc.rev&&inc.ph>=0&&/搬運|後送|轉交|上車/.test(inc.phs[inc.ph])){
  for(const u of crew){
   if(u.code!=='91'||u.st!=='work')continue;
   const vx=X(u.x+(u.ox||0))+c/2,vy=Y(u.y+(u.oy||0))+c/2;
   const a=(u.hd||0)+Math.PI;
   g.fillStyle='rgba(236,234,227,.55)';
   g.fillRect(vx+Math.cos(a)*c*.32-c*.06,vy+Math.sin(a)*c*.32-c*.12,c*.12,c*.24)}}}
