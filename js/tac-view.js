// 戰術畫面：樓層平面（俯視）繪製、樓層選擇列、小組卡片、指令列、鍵盤與滑鼠輸入
'use strict';
const tcv=document.getElementById('tcv'),tctx=tcv.getContext('2d');
let tW=800,tH=500,tTopH='',tSideH='',tBotH='';
const TAC_KEYS={g:'move',a:'attack',s:'search',v:'vent',o:'roof',p:'ppv',l:'ladder',m:'master',r:'rit',x:'exit'};
const TAC_ORD=[['move','移動','G'],['attack','攻擊','A'],['search','搜索','S'],['vent','破窗排煙','V'],['roof','屋頂排煙','O'],['ppv','正壓送風','P'],
 ['ladder','雲梯救援','L'],['master','外部射水','M'],['rit','RIT','R'],['exit','撤出','X']];
const TAC_NEEDT={move:1,attack:1,search:1,vent:1,ladder:1,master:1};
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
 TAC.open=true;TAC.id=inc.id;TAC.B=inc.tac;TAC.vf=inc.tac.of;TAC.sq=null;TAC.ord=null;stratT=0;
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
// 版面：左側樓層選擇列、上方後巷、建物平面、下方街道
function tacGeo(B){
 const L=B.L,sx=8,sw=58,top=30,lane=32,street=110;
 const px=sx+sw+24,aw=tW-px-14,ah=tH-top-lane-street-8;
 const t=Math.max(40,Math.min(170,aw/L.GW,ah/L.GH));
 const bw=t*L.GW,bh=t*L.GH,bx=px+(aw-bw)/2,by=top+lane+Math.max(0,(ah-bh)/2);
 const sh=Math.max(16,Math.min(46,(tH-top-30)/(B.F+1)));
 return{t,bx,by,bw,bh,laneY:by-lane,stY:by+bh+8,sx,sw,sh,stripTop:top+18,
  r:c=>{const n=L.N[c];return[bx+n.gx*t,by+n.gy*t,n.gw*t,n.gh*t]},
  ctr:c=>{const n=L.N[c];return[bx+(n.gx+n.gw/2)*t,by+(n.ty==='stair'?1.5:n.gy+n.gh/2)*t]},
  fy:f=>top+(B.F-f)*sh}}
// 入口在樓梯間南側（面向街道）
const tacEnt=G=>[G.bx+G.t*.5,G.by+G.bh];
// 小組在畫面上的位置；不在目前樓層者回傳 null
function tacSqPos(B,G,q,i){
 const vf=TAC.vf;
 const at=(f,c)=>{
  if(f<0){if(q.ty==='ladder')return null;const e=tacEnt(G);return[e[0]-40-(i%6)*46,G.stY+18+Math.floor(i/6)*24]}
  if(f!==vf)return null;
  const p=G.ctr(c),n=B.L.N[c],o=G.t*.2;
  return[p[0]+((i%3)-1)*o,p[1]+(Math.floor(i/3)%2?o:-o*.3)+(n.ty==='stair'?-G.t*.2:0)]};
 const p=at(q.f,q.c);
 if(!q.mt||(q.nf===q.f&&q.nc===q.c))return p;
 const n=at(q.nf,q.nc),k=Math.min(1,q.mt/tacStepTime(B,q,[q.nf,q.nc]));
 if(p&&n)return[p[0]+(n[0]-p[0])*k,p[1]+(n[1]-p[1])*k];
 return p||n}
// 俯視人員：頭盔、空氣瓶、肩膀
function tacMan(g,x,y,r,col,a,opt){
 g.save();g.translate(x,y);g.rotate(a);
 g.fillStyle='rgba(0,0,0,.35)';g.beginPath();g.ellipse(1,1.5,r*1.25,r*.95,0,0,TAU);g.fill();
 g.fillStyle=opt.coat||'#1e2c52';g.beginPath();g.ellipse(0,0,r*.85,r*1.2,0,0,TAU);g.fill();
 if(opt.scba){g.fillStyle='#c9d0d8';scRR(g,-r*1.05,-r*.45,r*.5,r*.9,r*.15);g.fill()}
 g.fillStyle=col;g.beginPath();g.arc(r*.1,0,r*.62,0,TAU);g.fill();
 g.fillStyle='rgba(0,0,0,.35)';g.fillRect(r*.35,-r*.25,r*.3,r*.5);
 g.restore()}
function drawTac(){
 const inc=S.inc.find(i=>i.id===TAC.id);
 if(!inc||!inc.tac){const b=TAC.B;
  tacClose(b&&b.done?(b.burnt>b.R*b.F*.5?'建物燒毀':'戰術指揮完成')+'：救出 '+b.resc+' 名'+(b.burnt?'、燒毀 '+b.burnt+' 室':'')+(b.lost?'、罹難 '+b.lost+' 名':'')+(b.lodd?'、殉職 '+b.lodd+' 組':''):'戰術指揮失敗：案件逾時，火勢未能控制');return}
 const B=inc.tac,g=tctx,G=tacGeo(B),T=S.t,L=B.L,t=G.t;
 if(TAC.vf===undefined||TAC.vf>=B.F)TAC.vf=Math.min(B.F-1,B.of);
 const vf=TAC.vf;
 TAC.hits=[];
 g.fillStyle='#0d1015';g.fillRect(0,0,tW,tH);
 // 後巷（北）與街道（南）
 g.fillStyle='#151a14';g.fillRect(G.sx+G.sw+12,G.laneY,tW,G.by-G.laneY);
 g.fillStyle='#1b1b19';g.fillRect(G.sx+G.sw+12,G.stY,tW,tH-G.stY);
 g.fillStyle='#3a3833';g.fillRect(G.sx+G.sw+12,G.stY,tW,3);
 g.strokeStyle='rgba(233,231,224,.18)';g.setLineDash([14,12]);g.beginPath();g.moveTo(G.sx+G.sw+12,tH-50);g.lineTo(tW,tH-50);g.stroke();g.setLineDash([]);
 g.font='10px '+FONT;g.textAlign='left';g.textBaseline='top';g.fillStyle='#6b6960';
 g.fillText('後巷（北側）',G.bx,G.laneY+3);g.fillText('街道（南側，入口）',G.bx+G.t*1.2,G.stY+4);
 // 車輛：街道上一字排開，雲梯車停在目標房間外側
 const TP={},crew=onScene(inc).filter(u=>u.st==='work');
 const lad=B.sq.filter(q=>q.ty==='ladder');
 let lx=G.sx+G.sw+18;
 const truck=(u,x,y)=>{TP[u.id]=[x,y];
  g.fillStyle=CODE[u.code].col;scRR(g,x,y,50,20,3);g.fill();
  g.fillStyle='rgba(0,0,0,.35)';g.fillRect(x+38,y+3,9,14);
  g.fillStyle=(T*3+u.id)%1<.5?'#ff4a3a':'#4a8aff';g.fillRect(x+39,y-2,7,2);
  g.fillStyle='#eceae3';g.font='10px '+FONT;g.textAlign='center';g.textBaseline='top';g.fillText(u.cs,x+25,y+22)};
 for(const u of crew){
  const q=lad.find(x=>x.u===u.id);
  if(q&&q.lf!==undefined&&q.task!=='idle'&&q.lf===vf){const n=L.N[q.lc];const r=G.r(q.lc);
   truck(u,r[0]+r[2]/2-25,n.win==='n'?G.laneY+4:G.stY+12);continue}
  if(lx>tW-60)continue;truck(u,lx,tH-40);lx+=58}
 // 建物外牆底
 g.fillStyle='#4a463f';g.fillRect(G.bx-5,G.by-5,G.bw+10,G.bh+10);
 const burnt=x=>x.ty!=='stair'&&x.fu<.05;
 for(const n of L.N){
  const x=tacCel(B,vf,n.c),r=G.r(n.c);
  TAC.hits.push({t:'cell',f:vf,c:n.c,x:r[0],y:r[1],w:r[2],h:r[3]});
  g.fillStyle=burnt(x)?'#141210':n.ty==='room'?'#2b2722':n.ty==='hall'?'#38352f':'#23262c';g.fillRect(r[0],r[1],r[2],r[3]);
  if(n.ty==='hall'){g.strokeStyle='rgba(255,255,255,.05)';g.lineWidth=1;for(let k=1;k<4;k++){g.beginPath();g.moveTo(r[0]+r[2]*k/4,r[1]);g.lineTo(r[0]+r[2]*k/4,r[1]+r[3]);g.stroke()}}
  if(n.ty==='stair'){ // 樓梯踏階與上下箭頭
   g.strokeStyle='rgba(200,200,190,.25)';g.lineWidth=1;
   for(let k=1;k<10;k++){const yy=r[1]+r[3]*k/10;g.beginPath();g.moveTo(r[0]+r[2]*.12,yy);g.lineTo(r[0]+r[2]*.88,yy);g.stroke()}
   g.fillStyle='rgba(236,234,227,.55)';g.font='600 11px '+FONT;g.textAlign='center';g.textBaseline='middle';
   g.fillText(vf<B.F-1?'▲ '+(vf+2)+'F':(B.roof?'屋頂 開':'屋頂'),r[0]+r[2]/2,r[1]+14);
   if(vf>0)g.fillText('▼ '+vf+'F',r[0]+r[2]/2,r[1]+r[3]-14);else g.fillText('▼ 出口',r[0]+r[2]/2,r[1]+r[3]-14)}
  if(x.h>.02){g.fillStyle='rgba(255,'+(110-x.h*60|0)+',30,'+(x.h*.45).toFixed(3)+')';g.fillRect(r[0],r[1],r[2],r[3])}
  // 火焰：俯視為閃動的火團
  if(x.h>.15){const nF=Math.ceil(x.h*6);
   for(let k=0;k<nF;k++){const sd=(n.c*7+k*13)%17/17,sd2=(n.c*3+k*29)%19/19;
    const fx=r[0]+r[2]*(.15+.7*sd),fy=r[1]+r[3]*(.15+.7*sd2),fr=t*(.06+.1*x.h)*(.8+.25*Math.sin(T*9+k*2));
    const gr=g.createRadialGradient(fx,fy,0,fx,fy,fr*1.6);gr.addColorStop(0,'rgba(255,230,120,.95)');gr.addColorStop(.45,'rgba(255,140,40,.85)');gr.addColorStop(1,'rgba(255,80,20,0)');
    g.fillStyle=gr;g.beginPath();g.arc(fx,fy,fr*1.6,0,TAU);g.fill()}}
  // 受困者、搜索狀態
  if(n.ty==='room'){
   if(x.srch>=1){
    for(let k=0;k<x.vic;k++){const vx=r[0]+r[2]*.25+k*t*.16,vy=r[1]+r[3]*.72;
     g.fillStyle='#7a4a9a';g.beginPath();g.ellipse(vx,vy,t*.07,t*.03,0,0,TAU);g.fill();
     g.fillStyle='#d9bfae';g.beginPath();g.arc(vx+t*.08,vy,t*.025,0,TAU);g.fill()}
    if(x.vic&&(T*2)%1<.6){g.fillStyle='#ff5a4a';g.font='600 10px '+FONT;g.textAlign='left';g.textBaseline='bottom';g.fillText('受困 '+x.vic,r[0]+r[2]*.18,r[1]+r[3]*.64)}
    if(!x.vic){g.fillStyle='rgba(93,202,165,.6)';g.font='11px '+FONT;g.textAlign='left';g.textBaseline='top';g.fillText('✓',r[0]+5,r[1]+4)}}
   else{
    if(x.srch>0){g.fillStyle='rgba(125,179,232,.85)';g.fillRect(r[0]+4,r[1]+r[3]-6,(r[2]-8)*x.srch,3)}
    g.fillStyle='rgba(236,234,227,.2)';g.font='600 '+Math.max(12,t*.22|0)+'px '+FONT;g.textAlign='center';g.textBaseline='middle';
    g.fillText('?',r[0]+r[2]/2,r[1]+r[3]/2)}
   g.fillStyle='rgba(236,234,227,.45)';g.font='10px '+FONT;g.textAlign='right';g.textBaseline='top';
   g.fillText((vf+1)*100+n.no,r[0]+r[2]-5,r[1]+4)}
  // 煙：由淡到濃的霧，濃煙時遮住地板
  if(x.s>.03){g.fillStyle='rgba(66,68,74,'+(.12+.68*x.s).toFixed(3)+')';g.fillRect(r[0],r[1],r[2],r[3]);
   for(let k=0;k<3;k++){const ph=(T*.15+k/3+n.c*.13)%1;g.fillStyle='rgba(120,122,128,'+(x.s*.18).toFixed(3)+')';
    g.beginPath();g.arc(r[0]+r[2]*(.2+.6*ph),r[1]+r[3]*(.3+.4*((k*.37+n.c*.21)%1)),t*.18,0,TAU);g.fill()}}}
 // 牆：每個空間描邊，門處挖出缺口
 g.strokeStyle='#8a857a';g.lineWidth=3;
 for(const n of L.N){const r=G.r(n.c);g.strokeRect(r[0],r[1],r[2],r[3])}
 const flr=c=>{const x=tacCel(B,vf,c),n=L.N[c];return burnt(x)?'#141210':n.ty==='room'?'#2b2722':n.ty==='hall'?'#38352f':'#23262c'};
 for(const a of L.N)for(const bc of a.nb){if(bc<a.c)continue;const b=L.N[bc],ra=G.r(a.c),rb=G.r(bc);let s;
  if(Math.abs(ra[1]+ra[3]-rb[1])<1||Math.abs(rb[1]+rb[3]-ra[1])<1){const y=Math.abs(ra[1]+ra[3]-rb[1])<1?rb[1]:ra[1];
   const x0=Math.max(ra[0],rb[0]),x1=Math.min(ra[0]+ra[2],rb[0]+rb[2]);s=[(x0+x1)/2-t*.14,y-3,t*.28,6]}
  else{const x=Math.abs(ra[0]+ra[2]-rb[0])<1?rb[0]:ra[0];const y0=Math.max(ra[1],rb[1]),y1=Math.min(ra[1]+ra[3],rb[1]+rb[3]);s=[x-3,(y0+y1)/2-t*.14,6,t*.28]}
  g.fillStyle=flr(a.ty==='room'?bc:a.c);g.fillRect(s[0],s[1],s[2],s[3]);
  g.fillStyle='rgba(180,150,100,.6)';if(s[2]>s[3])g.fillRect(s[0],s[1]+2,2,2);else g.fillRect(s[0]+2,s[1],2,2)}
 // 對外窗：完好為藍色玻璃，破窗為黑色缺口並冒煙
 for(const n of L.N){if(!n.win)continue;const x=tacCel(B,vf,n.c),r=G.r(n.c),wy=n.win==='n'?r[1]-3:r[1]+r[3]-3,wx=r[0]+r[2]*.3,ww=r[2]*.4;
  TAC.hits.push({t:'cell',f:vf,c:n.c,x:wx,y:wy-6,w:ww,h:18});
  if(x.v){g.fillStyle='#07080a';g.fillRect(wx,wy,ww,6);g.strokeStyle='#c9d0d8';g.lineWidth=1;g.beginPath();
   for(let k=0;k<4;k++){g.moveTo(wx+ww*k/4,wy);g.lineTo(wx+ww*(k+.5)/4,wy+6)}g.stroke();
   if(x.s>.05||x.h>.2)for(let k=0;k<3;k++){const ph=(T*.6+k/3)%1,dir=n.win==='n'?-1:1;
    g.fillStyle=x.h>.5&&k===0?'rgba(255,120,40,'+(.6*(1-ph)).toFixed(2)+')':'rgba(120,122,128,'+((x.s*.6+.1)*(1-ph)).toFixed(3)+')';
    g.beginPath();g.arc(wx+ww/2+(k-1)*ww*.3,wy+3+dir*ph*30,4+ph*9,0,TAU);g.fill()}}
  else{g.fillStyle=x.h>.3?'rgba(255,160,70,.9)':'#5d86a8';g.fillRect(wx,wy,ww,6)}}
 // 入口（1F 樓梯間南側）與正壓送風機
 const e=tacEnt(G);
 if(vf===0){g.fillStyle='#23262c';g.fillRect(e[0]-t*.16,e[1]-3,t*.32,7);g.fillStyle='#e9a13b';g.font='10px '+FONT;g.textAlign='center';g.textBaseline='top';g.fillText('入口',e[0],e[1]+6)}
 if(B.ppv&&vf===0){const fx=e[0],fy=e[1]+26;g.fillStyle='#3a3d44';g.beginPath();g.arc(fx,fy,10,0,TAU);g.fill();
  g.strokeStyle='#c9d0d8';g.lineWidth=2;g.beginPath();for(let k=0;k<3;k++){const a=T*14+k*TAU/3;g.moveTo(fx,fy);g.lineTo(fx+Math.cos(a)*9,fy+Math.sin(a)*9)}g.stroke();
  g.strokeStyle='rgba(200,230,255,.55)';g.lineWidth=1.4;for(let k=0;k<3;k++){const ph=(T*1.4+k/3)%1;g.beginPath();g.moveTo(fx-5+k*5,fy-14-ph*22);g.lineTo(fx-5+k*5,fy-20-ph*22);g.stroke()}}
 // 水線：幫浦車 → 入口 → 樓梯間 →（本層）走廊與房間 → 射水組
 let li=0;
 for(const q of B.sq){
  if(!q.line)continue;li++;
  const tp=TP[q.u],off=(li-2)*4;
  g.strokeStyle='rgba(125,179,232,.9)';g.lineWidth=2.4;g.setLineDash([8,5]);g.lineDashOffset=-T*30;
  if(q.ty==='ladder'){
   if(q.lf===vf&&tp&&q.ext>0){const r=G.r(q.lc),n=L.N[q.lc],wx=r[0]+r[2]/2,wy=n.win==='n'?r[1]:r[1]+r[3];
    g.beginPath();g.moveTo(tp[0]+25,tp[1]+10);g.lineTo(tp[0]+25+(wx-tp[0]-25)*q.ext,tp[1]+10+(wy-tp[1]-10)*q.ext);g.stroke()}
   g.setLineDash([]);continue}
  g.beginPath();
  if(vf===0&&tp){g.moveTo(tp[0]+25,tp[1]);g.lineTo(e[0]+off,e[1]+8)}
  const sc=G.ctr(0);
  if(q.f>=vf&&vf>=0){
   if(vf===0)g.lineTo(sc[0]+off,sc[1]);else g.moveTo(sc[0]+off,sc[1]+t*.3);
   if(q.f===vf){const p=tacSqPos(B,G,q,0);let pc=0;
    for(const st of tacPath(B,vf,0,vf,q.c)){const c=G.ctr(st[1]);g.lineTo(c[0]+off,c[1]+off);pc=st[1]}
    if(p)g.lineTo(p[0],p[1])}
   else g.lineTo(sc[0]+off,sc[1]-t*.4)}
  g.stroke();g.setLineDash([])}
 // 雲梯：只畫在目標樓層
 for(const q of lad){
  if(q.lf!==vf||q.task==='idle'&&!q.ext||!TP[q.u])continue;
  const tp=TP[q.u],n=L.N[q.lc],r=G.r(q.lc),wx=r[0]+r[2]/2,wy=n.win==='n'?r[1]:r[1]+r[3];
  const bx=tp[0]+25,by=tp[1]+10,ex=bx+(wx-bx)*q.ext,ey=by+(wy-by)*q.ext,a=Math.atan2(ey-by,ex-bx),nx=-Math.sin(a)*5,ny=Math.cos(a)*5;
  g.strokeStyle='#d8d4c8';g.lineWidth=2;g.beginPath();g.moveTo(bx+nx,by+ny);g.lineTo(ex+nx,ey+ny);g.moveTo(bx-nx,by-ny);g.lineTo(ex-nx,ey-ny);
  const len=Math.hypot(ex-bx,ey-by);for(let k=7;k<len;k+=7){const u=k/len;g.moveTo(bx+(ex-bx)*u+nx,by+(ey-by)*u+ny);g.lineTo(bx+(ex-bx)*u-nx,by+(ey-by)*u-ny)}g.stroke();
  if(q.ext>=1){tacMan(g,ex,ey,5,'#f3c43b',a,{scba:1});
   if(q.task==='master'&&q.line){g.fillStyle='rgba(170,210,245,.5)';for(let k=0;k<6;k++){const ph=(T*2+k/6)%1;
    g.beginPath();g.arc(ex+(r[0]+r[2]/2-ex)*ph,ey+(r[1]+r[3]/2-ey)*ph,3+ph*7,0,TAU);g.fill()}}}}
 // 小組
 const fr=Math.max(3,Math.min(8,t*.055)),slot={};
 for(const q of B.sq){
  if(q.ty==='ladder')continue;
  const key=q.f<0?'out':q.f+','+q.c,k=slot[key]=(slot[key]||0)+1;
  const p=tacSqPos(B,G,q,k-1);if(!p)continue;
  const n=Math.min(4,q.n),sel=TAC.sq===q.u,moving=q.mt>0;
  const tgt=q.f===q.tf&&q.c===q.tc&&q.f>=0?G.ctr(q.c):null;
  let a=-Math.PI/2;
  if(moving&&q.nf===q.f){const c2=G.ctr(q.nc),c1=G.ctr(q.c);a=Math.atan2(c2[1]-c1[1],c2[0]-c1[0])}
  if(q.task==='attack'&&q.line&&tgt){const hot=tacCel(B,q.f,q.c);a=-Math.PI/2+Math.sin(T*.7+q.u)*.9}
  if(sel){g.strokeStyle='#e9a13b';g.lineWidth=2;g.beginPath();g.arc(p[0],p[1],fr*3.2,0,TAU);g.stroke()}
  if(q.down){const pul=.5+.5*Math.sin(T*8);g.fillStyle='rgba(226,86,79,'+(.3+.35*pul).toFixed(2)+')';g.beginPath();g.arc(p[0],p[1],fr*4,0,TAU);g.fill()}
  if(q.ty==='robot'){g.save();g.translate(p[0],p[1]);g.rotate(a);g.fillStyle='#6b7f96';scRR(g,-fr*1.6,-fr*1.1,fr*3.2,fr*2.2,2);g.fill();
   g.fillStyle='#222';g.fillRect(-fr*1.6,-fr*1.4,fr*3.2,fr*.4);g.fillRect(-fr*1.6,fr*1,fr*3.2,fr*.4);g.fillStyle='#c9d3e0';g.fillRect(fr*.8,-fr*.25,fr*1.4,fr*.5);g.restore()}
  else for(let i=0;i<n;i++){
   const ox=Math.cos(a)*(-i*fr*1.9)+Math.cos(a+Math.PI/2)*((i%2)-.5)*fr*1.2,oy=Math.sin(a)*(-i*fr*1.9)+Math.sin(a+Math.PI/2)*((i%2)-.5)*fr*1.2;
   const col=q.ty==='resc'?'#f6f6f2':'#f3c43b',coat=q.ty==='resc'?'#c8332c':'#1e2c52';
   const lie=q.down;
   tacMan(g,p[0]+ox,p[1]+oy,fr,col,lie?a+Math.PI/2:a+(moving?Math.sin(T*8+i)*.15:0),{scba:q.f>=0||q.task==='rit',coat})}
  if(q.task==='attack'&&q.line&&tgt&&!q.down){ // 射水
   g.fillStyle='rgba(170,210,245,.5)';for(let k=0;k<7;k++){const ph=(T*2.2+k/7)%1,sp=(k%3-1)*.25;
    g.beginPath();g.arc(p[0]+Math.cos(a+sp)*(fr*2+ph*t*.4),p[1]+Math.sin(a+sp)*(fr*2+ph*t*.4),fr*(.3+ph*.7),0,TAU);g.fill()}}
  if(q.carry){g.fillStyle='rgba(236,234,227,.95)';g.save();g.translate(p[0],p[1]);g.rotate(a);g.fillRect(-fr*3,-fr*.6,fr*2.4,fr*1.2);
   g.fillStyle='#7a4a9a';g.fillRect(-fr*2.8,-fr*.4,fr*1.6,fr*.8);g.restore()}
  g.font='10px '+FONT;g.textAlign='left';g.textBaseline='bottom';
  const lx=p[0]-fr*2,ly=p[1]-fr*3;
  g.fillStyle=q.down?'#ff5a4a':sel?'#e9a13b':'rgba(236,234,227,.9)';
  g.fillText((q.down?'MAYDAY ':'')+(q.task==='rit'||q.task==='ritgo'?'RIT ':'')+q.cs,lx,ly);
  if(q.ty!=='robot'){g.fillStyle='rgba(0,0,0,.6)';g.fillRect(lx,ly+1,26,3);
   g.fillStyle=q.air<.25?'#e2564f':q.air<.5?'#e9a13b':'#5dcaa5';g.fillRect(lx,ly+1,26*q.air,3)}
  TAC.hits.unshift({t:'sq',id:q.u,x:p[0]-fr*3.5,y:p[1]-fr*4,w:fr*7,h:fr*7})}
 // 樓層選擇列：每層一格，顯示火勢、煙、小組數、受困通報與 MAYDAY
 g.fillStyle='#161615';g.fillRect(0,0,G.sx+G.sw+10,tH);
 g.fillStyle='#9d9a92';g.font='10px '+FONT;g.textAlign='center';g.textBaseline='top';g.fillText('樓層',G.sx+G.sw/2,8);
 const ry=G.fy(B.F);
 g.fillStyle=B.roof?'#07080a':'#3a3833';g.fillRect(G.sx,ry+G.sh*.35,G.sw,G.sh*.55);
 g.fillStyle='#9d9a92';g.textBaseline='middle';g.fillText(B.roof?'屋頂 開':'屋頂',G.sx+G.sw/2,ry+G.sh*.62);
 for(let f=0;f<B.F;f++){
  const y=G.fy(f),h=G.sh-3;let mh=0,ms=0,vic=0;
  for(let c=0;c<B.W;c++){const x=tacCel(B,f,c);mh=Math.max(mh,x.h);ms=Math.max(ms,x.s);if(x.srch>=1)vic+=x.vic}
  g.fillStyle='#24211d';g.fillRect(G.sx,y,G.sw,h);
  if(ms>.05){g.fillStyle='rgba(90,92,98,'+(ms*.8).toFixed(2)+')';g.fillRect(G.sx,y,G.sw,h)}
  if(mh>.05){g.fillStyle='rgba(255,'+(120-mh*70|0)+',40,'+(.25+mh*.7).toFixed(2)+')';g.fillRect(G.sx,y+h*.5,G.sw*Math.min(1,mh*1.2),h*.5)}
  if(f===vf){g.strokeStyle='#e9a13b';g.lineWidth=2;g.strokeRect(G.sx-1,y-1,G.sw+2,h+2)}
  g.fillStyle=f===B.of?'#ff8a6a':'#eceae3';g.font='600 11px '+FONT;g.textAlign='left';g.textBaseline='middle';g.fillText((f+1)+'F',G.sx+3,y+h/2);
  const ns=B.sq.filter(q=>q.f===f).length,dn=B.sq.some(q=>q.f===f&&q.down);
  if(ns){g.fillStyle=dn&&(T*3)%1<.5?'#ff5a4a':'#f3c43b';g.textAlign='right';g.fillText('●'+ns,G.sx+G.sw-3,y+h/2)}
  if(vic||(f===B.hint&&B.cells.some(x=>x.f===f&&x.vic>0&&x.srch<1))){g.fillStyle='#e9a13b';g.font='9px '+FONT;g.textAlign='center';g.fillText(vic?'受困':'通報',G.sx+G.sw*.55,y+h/2)}
  TAC.hits.push({t:'flr',f,x:G.sx,y,w:G.sw,h})}
 // 提示列
 g.font='12px '+FONT;g.textAlign='left';g.textBaseline='top';g.fillStyle='rgba(236,234,227,.85)';
 const sq=B.sq.find(q=>q.u===TAC.sq);
 g.fillText((vf+1)+'F 平面　'+(sq?(TAC.ord?'【'+sq.cs+'】'+TAC_TASK[TAC.ord]+'：點選目標（Esc 取消）':'【'+sq.cs+'】點空間＝預設指令，或從下方選擇指令'):'點選小組（或按 1–9），再點房間或走廊下達指令；左側／滾輪／[ ] 切換樓層'),G.sx+G.sw+18,8);
 if(B.mayday){g.fillStyle='rgba(226,86,79,'+(.6+.4*Math.sin(T*8)).toFixed(2)+')';g.font='700 14px '+FONT;g.textAlign='right';g.fillText('MAYDAY × '+B.mayday+'　'+B.sq.filter(q=>q.down).map(q=>q.cs+' '+tacFlr(q.f)).join('、'),tW-10,8)}}
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
   '<div class="sub">'+(q.down?'<span style="color:var(--red)">倒地待救</span>':TAC_TASK[q.task]+(q.prev?'（換瓶後續行）':''))+' · '+(q.ty==='ladder'&&q.lf!==undefined&&q.task!=='idle'?'雲梯→'+tacNm(inc.tac,q.lf,q.lc):tacNm(inc.tac,q.f,q.c))+(q.line?' · 💧':'')+'</div>'+
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
// 點空間時的預設指令：依小組類型與該空間狀態
function tacDefault(B,q,f,c){
 if(f<0)return q.ty==='vent'?'ppv':'exit';
 const x=tacCel(B,f,c),n=B.L.N[c];
 if(q.ty==='ladder')return c===0?'roof':(x.h>.05&&x.srch>=1&&!x.vic)?'master':'ladder';
 if(n.ty!=='room')return(x.h>.05&&(q.ty==='pump'||q.ty==='robot'))?'attack':(c===0&&f===B.F-1&&q.ty!=='pump')?'roof':'move';
 if(q.ty==='pump'||q.ty==='robot')return(x.h>.05||q.ty==='robot')?'attack':'search';
 if(q.ty==='vent')return'vent';
 return'search'}
function tacSel(B,id){TAC.sq=id;TAC.ord=null;const q=B.sq.find(x=>x.u===id);
 if(q){const f=q.ty==='ladder'?(q.task!=='idle'&&q.lf!==undefined?q.lf:-1):q.f;if(f>=0)TAC.vf=f}}
function tacFloor(B,d){TAC.vf=Math.max(0,Math.min(B.F-1,TAC.vf+d))}
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
tcv.addEventListener('wheel',e=>{const inc=S.inc.find(i=>i.id===TAC.id);if(!inc||!inc.tac)return;
 e.preventDefault();tacFloor(inc.tac,e.deltaY<0?1:-1)},{passive:false});
tcv.addEventListener('pointerdown',e=>{
 const inc=S.inc.find(i=>i.id===TAC.id);if(!inc||!inc.tac)return;
 const B=inc.tac,r=tcv.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;
 const hit=TAC.hits.find(h=>x>=h.x&&x<=h.x+h.w&&y>=h.y&&y<=h.y+h.h);
 if(hit&&hit.t==='flr'){TAC.vf=hit.f;return}
 if(hit&&hit.t==='sq'&&e.button!==2){tacSel(B,hit.id);tBotH='';tacUI();return}
 const q=B.sq.find(s=>s.u===TAC.sq);
 if(!q)return;
 let f=-1,c=0;
 if(hit&&hit.t==='cell'){f=hit.f;c=hit.c}
 else if(y<tacGeo(B).stY)return;
 const k=(e.button===2||!TAC.ord)?tacDefault(B,q,f,c):TAC.ord;
 if(TAC_NEEDT[k]&&f<0){msg='請點選建物內的房間';return}
 tacOrder(inc,q,k,f,c);TAC.ord=null;tBotH='';tacUI()});
document.getElementById('tac').addEventListener('click',e=>{
 const b=e.target.closest('[data-tsq],[data-tord],[data-tpause],[data-texit]');if(!b)return;
 const D=b.dataset;msg='';
 if(D.texit){tacClose();return}
 if(D.tpause){paused=!paused;$('btnPause').textContent=paused?'繼續':'暫停'}
 if(D.tsq){const inc=S.inc.find(i=>i.id===TAC.id);if(inc)tacSel(inc.tac,+D.tsq)}
 if(D.tord)tacCmd(D.tord);
 tTopH=tBotH='';tacUI()});
document.addEventListener('keydown',e=>{
 if(!TAC.open||e.target.tagName==='INPUT')return;
 const inc=S.inc.find(i=>i.id===TAC.id);if(!inc)return;
 const k=e.key.toLowerCase();
 if(k==='escape'){if(TAC.ord)TAC.ord=null;else tacClose();}
 else if(k===' '){e.preventDefault();paused=!paused;$('btnPause').textContent=paused?'繼續':'暫停'}
 else if(/^[1-9]$/.test(k)){const q=inc.tac.sq[+k-1];if(q)tacSel(inc.tac,q.u)}
 else if(k==='['||k==='pagedown'){e.preventDefault();tacFloor(inc.tac,-1)}
 else if(k===']'||k==='pageup'){e.preventDefault();tacFloor(inc.tac,1)}
 else if(TAC_KEYS[k]){msg='';tacCmd(TAC_KEYS[k])}
 else return;
 tTopH=tBotH='';tacUI()});
