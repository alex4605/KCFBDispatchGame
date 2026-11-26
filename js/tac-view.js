// 戰術畫面：建物剖面繪製、小組卡片、指令列、鍵盤與滑鼠輸入
'use strict';
const tcv=document.getElementById('tcv'),tctx=tcv.getContext('2d');
let tW=800,tH=500,tTopH='',tSideH='',tBotH='';
const TAC_KEYS={a:'attack',s:'search',v:'vent',o:'roof',p:'ppv',l:'ladder',m:'master',r:'rit',x:'exit'};
const TAC_ORD=[['attack','攻擊','A'],['search','搜索','S'],['vent','破窗排煙','V'],['roof','屋頂排煙','O'],['ppv','正壓送風','P'],
 ['ladder','雲梯救援','L'],['master','外部射水','M'],['rit','RIT','R'],['exit','撤出','X']];
const TAC_NEEDT={attack:1,search:1,vent:1,ladder:1,master:1};
function sizeTac(){
 const mid=tcv.parentElement,r=mid.getBoundingClientRect(),sd=document.getElementById('tacSide');
 const col=getComputedStyle(mid).flexDirection==='column';
 tW=Math.max(300,Math.floor(r.width-(col?12:sd.offsetWidth+18)));tH=Math.max(240,Math.floor(r.height-(col?sd.offsetHeight+18:12)));
 tcv.style.width=tW+'px';tcv.style.height=tH+'px';
 tcv.width=Math.round(tW*dpr);tcv.height=Math.round(tH*dpr);tctx.setTransform(dpr,0,0,dpr,0,0)}
function tacOpen(inc){
 if(!TACK[inc.k]){msg='此案類沒有戰術指揮';return}
 if(!inc.rev){msg='首車到場回報後才能進入戰術指揮';return}
 if(inc.wrap){msg='現場已在收整，無法進入戰術指揮';return}
 if(!inc.tac)tacInit(inc);
 TAC.open=true;TAC.id=inc.id;TAC.B=inc.tac;TAC.sq=null;TAC.ord=null;stratT=0;
 document.getElementById('tac').hidden=false;tTopH=tSideH=tBotH='';
 tacUI();sizeTac()}
// 底部面板或視窗大小改變時，重算畫布大小
if(window.ResizeObserver)new ResizeObserver(()=>{if(TAC.open)sizeTac()}).observe(document.getElementById('tacMid'));
function tacClose(why){
 const inc=S.inc.find(i=>i.id===TAC.id);
 if(inc&&inc.tac&&!why)radio(inc,'受理','指揮中心退出戰術畫面，現場戰術交由 AI 指揮官。');
 TAC.open=false;TAC.id=null;TAC.sq=null;TAC.ord=null;
 document.getElementById('tac').hidden=true;
 if(why)msg=why;
 size();dirty()}
// 版面：剖面格的位置與大小
function tacGeo(B){
 const yG=tH-62,fh=Math.max(24,Math.min(120,(yG-40)/B.F));
 const cw=Math.max(46,Math.min(170,(tW-300)/(B.R+.6))),sw=cw*.6,bw=sw+B.R*cw;
 const bx=Math.max(150,150+((tW-280)-bw)/2);
 return{yG,fh,cw,sw,bw,bx,
  x:c=>c===0?bx:bx+sw+(c-1)*cw,w:c=>c?cw:sw,y:f=>yG-(f+1)*fh}}
function tacSqPos(B,G,q,i){
 const at=(f,c,k)=>{
  if(f<0){if(q.ty==='ladder')return[tW-60-k*44,G.yG-8];return[G.bx-30-(k%4)*44,G.yG-8-Math.floor(k/4)*30]}
  return[G.x(c)+G.w(c)*(c?.3:.5)+(k%3)*G.w(c)*.2,G.y(f)+G.fh-6]};
 const p=at(q.f,q.c,i);
 if(q.nf===q.f&&q.nc===q.c||!q.mt)return p;
 const n=at(q.nf,q.nc,i),t=Math.min(1,q.mt/tacStepTime(B,q,[q.nf,q.nc]));
 return[p[0]+(n[0]-p[0])*t,p[1]+(n[1]-p[1])*t]}
function drawTac(){
 const inc=S.inc.find(i=>i.id===TAC.id);
 if(!inc||!inc.tac){const b=TAC.B;
  tacClose(b&&b.done?(b.burnt>b.R*b.F*.5?'建物燒毀':'戰術指揮完成')+'：救出 '+b.resc+' 名'+(b.burnt?'、燒毀 '+b.burnt+' 室':'')+(b.lost?'、罹難 '+b.lost+' 名':'')+(b.lodd?'、殉職 '+b.lodd+' 組':''):'戰術指揮失敗：案件逾時，火勢未能控制');return}
 const B=inc.tac,g=tctx,G=tacGeo(B),T=S.t;
 TAC.hits=[];
 g.fillStyle='#0d1015';g.fillRect(0,0,tW,tH);
 // 地面與街道
 g.fillStyle='#1b1b19';g.fillRect(0,G.yG,tW,tH-G.yG);
 g.fillStyle='#3a3833';g.fillRect(0,G.yG,tW,3);
 g.strokeStyle='rgba(233,231,224,.18)';g.setLineDash([14,12]);g.beginPath();g.moveTo(0,G.yG+44);g.lineTo(tW,G.yG+44);g.stroke();g.setLineDash([]);
 // 車輛
 const TP={},crew=onScene(inc).filter(u=>u.st==='work');
 const L=crew.filter(u=>!/^(21|31|71|搜|75|履)$/.test(u.code)),R=crew.filter(u=>/^(21|31|71|搜|75|履)$/.test(u.code));
 const truck=(u,x)=>{const y=G.yG+12;TP[u.id]=[x,y];
  g.fillStyle=CODE[u.code].col;scRR(g,x,y,54,18,3);g.fill();
  g.fillStyle='rgba(0,0,0,.35)';g.fillRect(x+40,y+2,12,8);
  g.fillStyle='#111';g.beginPath();g.arc(x+12,y+19,4,0,TAU);g.arc(x+42,y+19,4,0,TAU);g.fill();
  if((T*3+u.id)%1<.5){g.fillStyle='#ff4a3a';g.fillRect(x+44,y-3,6,3)}else{g.fillStyle='#4a8aff';g.fillRect(x+44,y-3,6,3)}
  g.fillStyle='#eceae3';g.font='10px '+FONT;g.textAlign='center';g.textBaseline='top';g.fillText(u.cs,x+27,y+24)};
 L.forEach((u,i)=>truck(u,8+i*60));R.forEach((u,i)=>truck(u,tW-62-i*60));
 // 建物外框與屋頂
 g.fillStyle='#2b2925';g.fillRect(G.bx-4,G.y(B.F-1)-6,G.bw+8,B.F*G.fh+6);
 for(let f=0;f<B.F;f++)for(let c=0;c<B.W;c++){
  const x=tacCel(B,f,c),px=G.x(c),py=G.y(f),w=G.w(c),h=G.fh;
  TAC.hits.push({t:'cell',f,c,x:px,y:py,w,h});
  g.fillStyle=c?(x.fu<.05?'#141210':'#24211d'):'#1a1c20';g.fillRect(px+1,py+1,w-2,h-3);
  if(x.h>.02){g.fillStyle='rgba(255,'+(110-x.h*60|0)+',30,'+(x.h*.5).toFixed(3)+')';g.fillRect(px+1,py+1,w-2,h-3)}
  if(!c){ // 樓梯
   g.strokeStyle='rgba(200,200,190,.22)';g.lineWidth=1;g.beginPath();
   for(let k=0;k<5;k++){const sx=px+4+k*(w-8)/5,sy=py+h-3-k*(h-6)/5;g.moveTo(sx,sy);g.lineTo(sx+(w-8)/5,sy);g.lineTo(sx+(w-8)/5,sy-(h-6)/5)}
   g.stroke()}
  else{ // 窗戶
   const wx=px+w*.62,wy=py+h*.16,ww=w*.24,wh=h*.32;
   if(x.v){g.fillStyle='#07080a';g.fillRect(wx,wy,ww,wh);g.strokeStyle='#8a939d';g.beginPath();
    g.moveTo(wx,wy);g.lineTo(wx+ww*.3,wy+wh*.4);g.lineTo(wx+ww*.15,wy+wh);g.moveTo(wx+ww,wy);g.lineTo(wx+ww*.7,wy+wh*.5);g.stroke();
    if(x.s>.05)for(let k=0;k<3;k++){const ph=(T*.6+k/3)%1;g.fillStyle='rgba(120,122,128,'+(x.s*.6*(1-ph)).toFixed(3)+')';
     g.beginPath();g.arc(wx+ww*.5+ph*12,wy-ph*h*.5,3+ph*7,0,TAU);g.fill()}}
   else{g.fillStyle=x.h>.2?'rgba(255,150,60,'+(.3+x.h*.6).toFixed(2)+')':'#2f4152';g.fillRect(wx,wy,ww,wh);
    g.strokeStyle='#4a4842';g.strokeRect(wx,wy,ww,wh)}
   // 火焰
   if(x.h>.2)for(let k=0;k<4;k++){
    const fx=px+w*(.14+k*.2),fl=h*(.15+.6*x.h)*(.7+.3*Math.sin(T*9+k*2+f)),fw=w*.11;
    g.fillStyle='#ff7a22';g.beginPath();g.moveTo(fx-fw,py+h-3);g.quadraticCurveTo(fx-fw*.3,py+h-3-fl*.6,fx,py+h-3-fl);
    g.quadraticCurveTo(fx+fw*.3,py+h-3-fl*.6,fx+fw,py+h-3);g.fill();
    g.fillStyle='#ffd24a';g.beginPath();g.moveTo(fx-fw*.45,py+h-3);g.quadraticCurveTo(fx,py+h-3-fl*.7,fx+fw*.45,py+h-3);g.fill()}
   // 受困者／搜索狀態
   if(x.srch>=1){
    for(let k=0;k<x.vic;k++){const vx=px+6+k*14,vy=py+h-8;
     g.fillStyle='#7a4a9a';g.fillRect(vx,vy,11,4);g.fillStyle='#d9bfae';g.beginPath();g.arc(vx+13,vy+2,2.4,0,TAU);g.fill();
     if((T*2)%1<.6){g.fillStyle='#ff5a4a';g.font='600 9px '+FONT;g.textAlign='left';g.textBaseline='bottom';g.fillText('受困',vx,vy-1)}}
    if(!x.vic){g.fillStyle='rgba(93,202,165,.55)';g.font='10px '+FONT;g.textAlign='left';g.textBaseline='top';g.fillText('✓',px+4,py+3)}}
   else{
    if(x.srch>0){g.fillStyle='rgba(125,179,232,.8)';g.fillRect(px+4,py+h-6,(w-8)*x.srch,2)}
    g.fillStyle='rgba(236,234,227,.22)';g.font='600 '+Math.max(10,h*.24|0)+'px '+FONT;g.textAlign='center';g.textBaseline='middle';
    g.fillText('?',px+w*.32,py+h*.5)}}
  // 煙層由天花板往下
  if(x.s>.02){const sh=(h-3)*Math.min(1,x.s);
   g.fillStyle='rgba(62,64,70,'+(.25+.62*x.s).toFixed(3)+')';
   g.beginPath();g.moveTo(px+1,py+1);g.lineTo(px+w-1,py+1);
   for(let k=8;k>=0;k--)g.lineTo(px+1+(w-2)*k/8,py+1+sh+Math.sin(T*1.5+k+f*2)*2);
   g.closePath();g.fill()}
  // 樓板與隔間
  g.fillStyle='#55514a';g.fillRect(px,py+h-3,w,3);
  g.fillStyle='#3d3a35';g.fillRect(px+w-1,py,1.5,h)}
 // 屋頂與屋頂排煙口
 const ry=G.y(B.F-1);
 g.fillStyle='#55514a';g.fillRect(G.bx-6,ry-6,G.bw+12,5);
 g.fillStyle=B.roof?'#07080a':'#6b675e';g.fillRect(G.bx+G.sw*.2,ry-10,G.sw*.6,B.roof?4:5);
 if(B.roof){const st=tacCel(B,B.F-1,0);for(let k=0;k<3;k++){const ph=(T*.5+k/3)%1;
  g.fillStyle='rgba(120,122,128,'+(st.s*.7*(1-ph)+.05).toFixed(3)+')';g.beginPath();g.arc(G.bx+G.sw*.5+ph*6,ry-12-ph*26,4+ph*8,0,TAU);g.fill()}}
 // 樓層標示與受困通報
 g.font='11px '+FONT;g.textAlign='right';g.textBaseline='middle';
 for(let f=0;f<B.F;f++){g.fillStyle=f===B.of?'#e2564f':'#9d9a92';g.fillText((f+1)+'F',G.bx-8,G.y(f)+G.fh*.3);
  if(f===B.hint&&B.cells.some(x=>x.f===f&&x.vic>0&&x.srch<1)){g.fillStyle='#e9a13b';g.fillText('受困通報',G.bx-8,G.y(f)+G.fh*.62)}}
 // 入口與正壓送風機
 g.fillStyle='#0b0b0a';g.fillRect(G.bx-4,G.yG-G.fh*.55,5,G.fh*.55-3);
 if(B.ppv){const fx=G.bx-26,fy=G.yG-12;g.fillStyle='#3a3d44';g.beginPath();g.arc(fx,fy,9,0,TAU);g.fill();
  g.strokeStyle='#c9d0d8';g.lineWidth=2;g.beginPath();
  for(let k=0;k<3;k++){const a=T*14+k*TAU/3;g.moveTo(fx,fy);g.lineTo(fx+Math.cos(a)*8,fy+Math.sin(a)*8)}g.stroke();
  g.strokeStyle='rgba(200,230,255,.5)';g.lineWidth=1.2;
  for(let k=0;k<3;k++){const ph=(T*1.4+k/3)%1;g.beginPath();g.moveTo(fx+10+ph*20,fy-4+k*4);g.lineTo(fx+16+ph*20,fy-4+k*4);g.stroke()}}
 // 水線：幫浦車 → 入口 → 樓梯 → 小組
 for(const q of B.sq){
  if(!q.line)continue;
  const tp=TP[q.u];if(!tp)continue;
  g.strokeStyle='rgba(125,179,232,.9)';g.lineWidth=2.2;g.setLineDash([7,5]);g.lineDashOffset=-T*30;
  g.beginPath();g.moveTo(tp[0]+27,tp[1]);
  if(q.ty==='ladder'){
   const ex=G.x(q.lc)+G.w(q.lc)*.7,ey=G.y(q.lf)+G.fh*.35,lx=tp[0]+40+(ex-tp[0]-40)*q.ext,ly=tp[1]+(ey-tp[1])*q.ext;g.lineTo(lx,ly)}
  else{
   const p=tacSqPos(B,G,q,0);
   g.lineTo(G.bx-2,G.yG-6);
   if(q.f>=0){const sx=G.bx+G.sw*.5;g.lineTo(sx,G.yG-6);
    for(let f=0;f<=q.f;f++)g.lineTo(sx+(f%2?-1:1)*G.sw*.2,G.y(f)+G.fh-6)}
   g.lineTo(p[0],p[1]-4)}
  g.stroke();g.setLineDash([])}
 // 雲梯
 for(const q of B.sq){
  if(q.ty!=='ladder'||q.lf===undefined||!TP[q.u]||q.task==='idle'&&!q.ext)continue;
  const tp=TP[q.u],ex=G.x(q.lc)+G.w(q.lc)*.7,ey=(q.task==='roof'?ry-8:G.y(q.lf)+G.fh*.35);
  const bx=tp[0]+40,by=tp[1],lx=bx+(ex-bx)*q.ext,ly=by+(ey-by)*q.ext;
  const a=Math.atan2(ly-by,lx-bx),nx=-Math.sin(a)*3,ny=Math.cos(a)*3;
  g.strokeStyle='#d8d4c8';g.lineWidth=1.5;g.beginPath();g.moveTo(bx+nx,by+ny);g.lineTo(lx+nx,ly+ny);g.moveTo(bx-nx,by-ny);g.lineTo(lx-nx,ly-ny);
  const len=Math.hypot(lx-bx,ly-by);for(let k=8;k<len;k+=8){const t=k/len;g.moveTo(bx+(lx-bx)*t+nx,by+(ly-by)*t+ny);g.lineTo(bx+(lx-bx)*t-nx,by+(ly-by)*t-ny)}
  g.stroke();
  if(q.task==='master'&&q.line&&q.ext>=1){g.strokeStyle='rgba(160,205,245,.75)';g.lineWidth=3;g.beginPath();g.moveTo(lx,ly);
   g.quadraticCurveTo(lx-12,ly-14,ex-G.w(q.lc)*.3,ey+6);g.stroke()}
  if(q.ext>=1){figure(g,lx,ly-6,Math.max(2.4,Math.min(5,G.fh*.09)),'fire',{scba:1})}}
 // 小組
 const fr=Math.max(2.2,Math.min(7.5,G.fh*.12));
 const slot={};
 for(const q of B.sq){
  const key=q.f<0?'out'+(q.ty==='ladder'?'L':''):q.f+','+q.c,k=slot[key]=(slot[key]||0)+1;
  if(q.ty==='ladder'&&q.ext>=1)continue;
  const p=tacSqPos(B,G,q,k-1),moving=q.mt>0;
  const kit=q.ty==='resc'?'rescue':'fire',n=Math.min(4,q.n);
  const sel=TAC.sq===q.u;
  if(sel){g.strokeStyle='#e9a13b';g.lineWidth=2;g.beginPath();g.ellipse(p[0]+n*fr*.8,p[1]+fr*.6,n*fr*1.1+6,fr*1.4,0,0,TAU);g.stroke()}
  if(q.down){
   const pul=.5+.5*Math.sin(T*8);
   g.fillStyle='rgba(226,86,79,'+(.25+.35*pul).toFixed(2)+')';g.beginPath();g.arc(p[0]+fr*2,p[1],fr*4,0,TAU);g.fill();
   for(let i=0;i<n;i++){g.fillStyle='#1e2c52';g.fillRect(p[0]+i*fr*1.8-fr,p[1]-fr*.3,fr*2.2,fr*.8);g.fillStyle='#f3c43b';g.beginPath();g.arc(p[0]+i*fr*1.8+fr*1.4,p[1],fr*.5,0,TAU);g.fill()}
   g.fillStyle='#ff5a4a';g.font='700 10px '+FONT;g.textAlign='center';g.textBaseline='bottom';g.fillText('MAYDAY',p[0]+fr*2,p[1]-fr*2.5)}
  else if(q.ty==='robot'){
   g.fillStyle='#6b7f96';scRR(g,p[0]-fr,p[1]-fr*1.6,fr*3.2,fr*1.6,2);g.fill();g.fillStyle='#222';g.fillRect(p[0]-fr,p[1]-fr*.2,fr*3.2,fr*.6);
   if(q.line&&q.f===q.tf&&q.c===q.tc){g.strokeStyle='rgba(160,205,245,.8)';g.lineWidth=2;g.beginPath();g.moveTo(p[0]+fr*2.2,p[1]-fr);g.lineTo(p[0]+fr*6,p[1]-fr*2);g.stroke()}}
  else for(let i=0;i<n;i++){
   const fx=p[0]+i*fr*1.6;
   figure(g,fx,p[1]-fr*.9,fr,kit,{moving,ph:i*1.3+q.u,scba:q.f>=0||q.task==='rit',helmet:true,hose:q.task==='attack'&&i===0&&q.line});
   if(q.task==='attack'&&q.line&&i===0&&q.f===q.tf&&q.c===q.tc){
    g.fillStyle='rgba(170,210,245,.55)';for(let k=0;k<5;k++){const ph=(T*2+k/5)%1;
     g.beginPath();g.arc(fx+fr*1.6+ph*G.cw*.35,p[1]-fr*1.2-Math.sin(ph*Math.PI)*fr*2,fr*(.3+ph*.6),0,TAU);g.fill()}}}
  if(q.carry){g.fillStyle='rgba(236,234,227,.95)';g.fillRect(p[0]-fr,p[1]-fr*1.6,fr*4.4,fr*.7);g.fillStyle='#7a4a9a';g.fillRect(p[0],p[1]-fr*2,fr*2,fr*.5)}
  // 標籤：呼號、空氣量
  g.font='10px '+FONT;g.textAlign='left';g.textBaseline='bottom';
  const lx=p[0]-fr,ly=p[1]-fr*3.1;
  g.fillStyle=sel?'#e9a13b':'rgba(236,234,227,.85)';g.fillText((q.task==='rit'||q.task==='ritgo'?'RIT ':'')+q.cs,lx,ly);
  if(q.ty!=='robot'&&q.ty!=='ladder'){g.fillStyle='rgba(0,0,0,.6)';g.fillRect(lx,ly+1,24,3);
   g.fillStyle=q.air<.25?'#e2564f':q.air<.5?'#e9a13b':'#5dcaa5';g.fillRect(lx,ly+1,24*q.air,3)}
  TAC.hits.unshift({t:'sq',id:q.u,x:p[0]-fr*1.5,y:p[1]-fr*4,w:n*fr*1.6+fr*3,h:fr*5})}
 // 提示
 g.font='12px '+FONT;g.textAlign='left';g.textBaseline='top';g.fillStyle='rgba(236,234,227,.85)';
 const sq=B.sq.find(q=>q.u===TAC.sq);
 g.fillText(sq?(TAC.ord?'【'+sq.cs+'】'+TAC_TASK[TAC.ord]+'：點選目標房間（Esc 取消）':'【'+sq.cs+'】已選取：點房間＝預設指令，或從下方選擇指令'):'點選小組（或按 1–9）後，再點選房間下達指令；右鍵＝預設指令',10,8);
 if(B.mayday){g.fillStyle='rgba(226,86,79,'+(.6+.4*Math.sin(T*8)).toFixed(2)+')';g.font='700 15px '+FONT;g.fillText('MAYDAY × '+B.mayday,10,26)}}
// 面板 HTML
function tacTopHTML(inc){
 const B=inc.tac,others=S.inc.filter(i=>i!==inc),wait=others.filter(i=>!onScene(i).length).length;
 let idle=0;for(const u of S.units)if(u.st==='idle')idle++;
 return '<b class="tt">⚔ 戰術指揮</b><span>'+esc(inc.nm||KIND[inc.k].n)+' · '+esc(inc.addr)+'</span>'+
  '<span class="chip"><i>時</i><b>'+fmt(S.t)+'</b></span><span class="chip"><i>進度</i><b>'+Math.round(Math.min(1,inc.work/inc.dur)*100)+'%</b></span>'+
  '<span class="chip"><i>評鑑</i><b>'+Math.round(S.rep)+'</b></span>'+
  '<span class="strat">戰略 AI 代理中：其他案件 '+others.length+' 件'+(wait?'（待派 '+wait+'）':'')+' · 待命 '+idle+' 車</span>'+
  '<span class="sp"></span><span class="tmsg">'+esc(msg||'')+'</span>'+
  '<button data-tpause="1">'+(paused?'繼續':'暫停')+'</button><button data-texit="1">返回指揮中心（交由 AI 指揮）</button>'}
function tacSideHTML(inc){
 const B=inc.tac,L=tacCap(inc),used=B.sq.filter(q=>q.line).length;
 let left=0,unk=0;for(const x of B.cells){left+=x.vic}
 for(const x of B.cells)if(x.c&&x.srch<1)unk++;
 let sumH=0;for(const x of B.cells)sumH+=x.h;
 const rit=B.sq.filter(q=>q.task==='rit'||q.task==='ritgo').map(q=>q.cs);
 let h='<div class="hd">現場狀況</div><div class="kv">'+
  '<div><b>建物</b>'+B.F+' 層 · 每層 '+B.R+' 室</div><div><b>起火層</b>'+(B.of+1)+'F</div>'+
  '<div><b>火勢</b>'+Math.round(sumH/Math.max(.001,B.peak)*100)+'%</div><div><b>出水</b>'+(waterOK(inc)?'正常':'<span style="color:var(--red)">無水</span>')+'</div>'+
  '<div><b>水線</b>'+used+' / '+L+' 線</div><div><b>正壓送風</b>'+(B.ppv?'運轉中':'—')+'</div>'+
  '<div><b>受困</b>通報 '+B.vtot+' 人</div><div><b>救出</b>'+B.resc+(B.lost?' · <span style="color:var(--red)">罹難 '+B.lost+'</span>':'')+'</div>'+
  '<div><b>未搜索</b>'+unk+' 室</div><div><b>RIT</b>'+(rit.length?rit.join('、'):'<span style="color:var(--amb)">未編成</span>')+'</div></div>';
 if(B.mayday)h+='<div class="note" style="background:var(--red);color:#111">MAYDAY：'+B.sq.filter(q=>q.down).map(q=>q.cs+' '+tacFlr(q.f)).join('、')+'</div>';
 if(B.lodd)h+='<div class="note">殉職 '+B.lodd+' 組</div>';
 h+='<div class="hd mt">無線電</div><div class="tlog">';
 for(const l of inc.log.slice(-14).reverse())h+='<div class="'+(l.w==='台'?'lt':'lf')+'">'+esc(l.s)+'</div>';
 return h+'</div>'}
function tacBotHTML(inc){
 const B=inc.tac,sq=B.sq.find(q=>q.u===TAC.sq);
 let h='<div class="tsqs">';
 B.sq.forEach((q,i)=>{
  h+='<div class="tsq'+(q.u===TAC.sq?' sel':'')+(q.down?' dn':'')+'" data-tsq="'+q.u+'"><div class="row" style="padding:0"><b class="mono">'+(i<9?(i+1)+' ':'')+q.cs+'</b>'+
   '<span class="sub">'+TAC_TYN[q.ty]+' '+q.n+' 人</span></div>'+
   '<div class="sub">'+(q.down?'<span style="color:var(--red)">倒地待救</span>':TAC_TASK[q.task]+(q.prev?'（換瓶後續行）':''))+' · '+tacFlr(q.f)+(q.f>=0?(q.c?'-'+q.c+' 室':' 樓梯'):'')+(q.line?' · 💧':'')+'</div>'+
   (q.ty==='robot'||q.ty==='ladder'?'':'<div class="bar"><i style="width:'+Math.round(q.air*100)+'%;background:'+(q.air<.25?'var(--red)':q.air<.5?'var(--amb)':'var(--grn)')+'"></i></div>')+
   '<div class="bar hp"><i style="width:'+Math.round(Math.max(0,q.hp)*100)+'%"></i></div></div>'});
 if(!B.sq.length)h+='<div class="sub">尚無可編組的小組到場（幫浦、雲梯、救助、排煙、機器人）。</div>';
 h+='</div><div class="tords">';
 for(const o of TAC_ORD){
  const t=TAC_NEEDT[o[0]],dis=!sq||!!tacCan(B,sq,o[0],t?0:o[0]==='roof'?B.F-1:-1,t?1:0);
  h+='<button data-tord="'+o[0]+'"'+(TAC.ord===o[0]?' class="on"':'')+(dis?' disabled':'')+'>'+o[1]+' <span class="sub">'+o[2]+'</span></button>'}
 h+='<button data-tord="evac" style="border-color:var(--red)">全員撤出</button></div>';
 return h}
function tacUI(){
 const inc=S.inc.find(i=>i.id===TAC.id);if(!inc||!inc.tac)return;
 const a=tacTopHTML(inc),b=tacSideHTML(inc),c=tacBotHTML(inc);
 if(a!==tTopH){tTopH=a;morph($('tacTop'),a)}
 if(b!==tSideH){tSideH=b;morph($('tacSide'),b)}
 if(c!==tBotH){tBotH=c;morph($('tacBot'),c)}}
function tacDefault(B,q,f,c){
 if(f<0)return q.ty==='vent'?'ppv':'exit';
 const x=tacCel(B,f,c);
 if(q.ty==='ladder')return c===0?'roof':(x.h>.05&&x.srch>=1&&!x.vic)?'master':'ladder';
 if(q.ty==='pump'||q.ty==='robot')return(x.h>.05||q.ty==='robot')?'attack':'search';
 if(q.ty==='vent')return c===0?'roof':'vent';
 return(c===0&&f===B.F-1)?'roof':'search'}
function tacCmd(k){
 const inc=S.inc.find(i=>i.id===TAC.id);if(!inc)return;
 const B=inc.tac;
 if(k==='evac'){let n=0;for(const q of B.sq)if(tacIn(q)&&!q.down){q.task='exit';q.tf=-1;q.tc=0;q.prev=null;n++}
  radio(inc,'受理','緊急撤退！所有入室小組立即撤出建物，人員清點。');msg=n?'已下令 '+n+' 組撤出':'';TAC.ord=null;return}
 const q=B.sq.find(x=>x.u===TAC.sq);
 if(!q){msg='請先選擇小組';return}
 if(TAC_NEEDT[k]){TAC.ord=TAC.ord===k?null:k;return}
 tacOrder(inc,q,k,k==='roof'?B.F-1:-1,0);TAC.ord=null}
tcv.addEventListener('contextmenu',e=>e.preventDefault());
tcv.addEventListener('pointerdown',e=>{
 const inc=S.inc.find(i=>i.id===TAC.id);if(!inc||!inc.tac)return;
 const B=inc.tac,r=tcv.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;
 const hit=TAC.hits.find(h=>x>=h.x&&x<=h.x+h.w&&y>=h.y&&y<=h.y+h.h);
 if(hit&&hit.t==='sq'&&e.button!==2){TAC.sq=hit.id;TAC.ord=null;tBotH='';tacUI();return}
 const q=B.sq.find(s=>s.u===TAC.sq);
 if(!q)return;
 let f=-1,c=0;
 if(hit&&hit.t==='cell'){f=hit.f;c=hit.c}
 else if(y<tacGeo(B).yG)return;
 const k=(e.button===2||!TAC.ord)?tacDefault(B,q,f,c):TAC.ord;
 if(TAC_NEEDT[k]&&f<0){msg='請點選建物內的房間';return}
 tacOrder(inc,q,k,f,c);TAC.ord=null;tBotH='';tacUI()});
document.getElementById('tac').addEventListener('click',e=>{
 const b=e.target.closest('[data-tsq],[data-tord],[data-tpause],[data-texit]');if(!b)return;
 const D=b.dataset;msg='';
 if(D.texit){tacClose();return}
 if(D.tpause){paused=!paused;$('btnPause').textContent=paused?'繼續':'暫停'}
 if(D.tsq){TAC.sq=+D.tsq;TAC.ord=null}
 if(D.tord)tacCmd(D.tord);
 tTopH=tBotH='';tacUI()});
document.addEventListener('keydown',e=>{
 if(!TAC.open||e.target.tagName==='INPUT')return;
 const inc=S.inc.find(i=>i.id===TAC.id);if(!inc)return;
 const k=e.key.toLowerCase();
 if(k==='escape'){if(TAC.ord)TAC.ord=null;else tacClose();}
 else if(k===' '){e.preventDefault();paused=!paused;$('btnPause').textContent=paused?'繼續':'暫停'}
 else if(/^[1-9]$/.test(k)){const q=inc.tac.sq[+k-1];if(q){TAC.sq=q.u;TAC.ord=null}}
 else if(TAC_KEYS[k]){msg='';tacCmd(TAC_KEYS[k])}
 else return;
 tTopH=tBotH='';tacUI()});
