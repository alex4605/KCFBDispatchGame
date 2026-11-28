// 戰術指揮：室外場景（資源回收場、加油站）——場區格局、風向、飛火、油料外洩、場區繪製
// 室外沿用建物的節點模型：堆置區、加油島等是「空間」（room），場內車道是「走廊」（hall）；只有一層、沒有樓梯
'use strict';
const TAC_YFU={forest:1.3,home:1.5,grass:.5,reed:.65,shrub:1,shack:1.5,cars:1,plastic:2.4,paper:2.2,metal:.5,ewaste:1.6,drum:1.4,cylz:.6,yoff:1,island:1.2,tank:1.5,mart:1,wash:.3};
const TAC_WINDN={n:'北',e:'東',s:'南',w:'西',ne:'東北',nw:'西北',se:'東南',sw:'西南'};
// 風向（風從哪裡吹來）與吹往的單位向量
function tacWind(){const ks=Object.keys(TAC_WINDN),k=ks[Math.floor(Math.random()*ks.length)];
 const v={n:[0,1],s:[0,-1],e:[-1,0],w:[1,0],ne:[-.71,.71],nw:[.71,.71],se:[-.71,-.71],sw:[.71,-.71]}[k];
 const spd=Math.round(1+Math.random()*6);return{k,d:v,v:spd/7,ms:spd,nm:TAC_WINDN[k]+'風 '+spd+' m/s'}}
// 順風延燒加快、逆風變慢
function tacWF(B,a,b){const W=B.wind;if(!W)return 1;const x=B.L.N[a],y=B.L.N[b];
 let dx=y.gx+y.gw/2-x.gx-x.gw/2,dy=y.gy+y.gh/2-x.gy-x.gh/2;const l=Math.hypot(dx,dy)||1;
 return Math.max(.3,1+1.3*W.v*(dx*W.d[0]+dy*W.d[1])/l)}
// 場區格局：在 tacLayout 內呼叫，用它的 add／room／cuts 產生節點
function tacYardLay(T,K,L,add,room,cuts,R){
 if(TAC_SCY[T.yard])return tacScLay(T,K,L,add,room,cuts,R);
 const lane=(gx,gy,gw,gh)=>add({ty:'hall',gx,gy,gw,gh,lane:1});
 const wall=n=>{n.walled=1;return n};
 if(T.yard==='waste'){ // 資源回收場：中央車道兩側一區區堆置區，一角有辦公室
  L.GH=3;L.GW=3.8+K*.4;const y0=1.05+R()*.4,y1=y0+.5;
  const hs=cuts(0,L.GW,.9,1.4);for(let i=0;i<hs.length-1;i++)lane(hs[i],y0,hs[i+1]-hs[i],y1-y0);
  const pool=['plastic','plastic','paper','paper','metal','ewaste'];let drum=0,cyl=0,off=0;
  for(const[ya,yb]of[[0,y0],[y1,L.GH]]){const xs=cuts(0,L.GW,.75,1.25);
   for(let i=0;i<xs.length-1;i++){let k=pool[Math.floor(R()*pool.length)];
    if(!off&&ya===0&&i===0){k='yoff';off=1}else if(!drum&&R()<.35){k='drum';drum=1}else if(!cyl&&R()<.3){k='cylz';cyl=1}
    const n=room(xs[i],ya,xs[i+1]-xs[i],yb-ya,k);if(k==='yoff')wall(n)}}
  if(!drum){const n=L.N.filter(n=>n.ty==='room'&&n.kind!=='yoff').pop();n.kind='drum'}}
 else if(T.yard==='wui'){ // 建物防護：林地邊緣（山火來的方向）→ 雜草灌木的防禦空間 → 民宅聚落 → 道路
  L.GH=3;L.GW=4+K*.3;const yf=.85+R()*.2,yh=yf+.65+R()*.2,yr=L.GH-.45;
  for(const[ya,yb,kf]of[[0,yf,'forest'],[yf,yh,'gs']]){const xs=cuts(0,L.GW,.75,1.2);for(let i=0;i<xs.length-1;i++)room(xs[i],ya,xs[i+1]-xs[i],yb-ya,kf==='forest'?'forest':R()<.6?'grass':'shrub')}
  {const xs=cuts(0,L.GW,.8,1.2);let sh=0;for(let i=0;i<xs.length-1;i++){const k=!sh&&R()<.3?(sh=1,'shack'):R()<.15?'cars':'home';const n=room(xs[i],yh,xs[i+1]-xs[i],yr-yh,k);if(k!=='cars')wall(n)}}
  const hs=cuts(0,L.GW,1,1.6);for(let i=0;i<hs.length-1;i++)lane(hs[i],yr,hs[i+1]-hs[i],L.GH-yr)}
 else if(T.yard==='grass'){ // 雜草火：空地（草地、灌木，邊上有鐵皮屋與停放的汽車）或河堤（臨河芒草坡、堤頂道路、另一側草坡）
  L.GH=3;L.GW=3.8+K*.45;
  if(T.river){const y0=1.05+R()*.25,y1=y0+.42;
   for(const[ya,yb,riv]of[[0,y0,1],[y1,L.GH,0]]){const xs=cuts(0,L.GW,.7,1.1);for(let i=0;i<xs.length-1;i++){const n=room(xs[i],ya,xs[i+1]-xs[i],yb-ya,riv||R()<.5?'reed':'grass');n.riv=riv}}
   const hs=cuts(0,L.GW,1,1.6);for(let i=0;i<hs.length-1;i++){const n=lane(hs[i],y0,hs[i+1]-hs[i],y1-y0);n.levee=1}}
  else{const ys=cuts(0,L.GH,.8,1.1);let sh=0,car=0;
   for(let j=0;j<ys.length-1;j++){const xs=cuts(0,L.GW,.75,1.15);
    for(let i=0;i<xs.length-1;i++){let k=R()<.75?'grass':'shrub';
     if(!sh&&j===ys.length-2&&i===xs.length-2){k='shack';sh=1}else if(!car&&j===ys.length-2&&i===0){k='cars';car=1}
     const n=room(xs[i],ys[j],xs[i+1]-xs[i],ys[j+1]-ys[j],k);if(k==='shack')wall(n)}}}}
 else{ // 加油站：後排便利商店與地下油槽區，中段遮雨棚下一排加油島，前段車道臨街
  L.GH=3;L.GW=3.6+K*.35;const yb=.95+R()*.2,yi0=yb+.4,yi1=yi0+.75;
  const mw=1.3+R()*.4;wall(room(0,0,mw,yb,'mart'));
  const tw=.9+R()*.3;room(mw,0,tw,yb,'tank');
  if(L.GW-mw-tw>.6)room(mw+tw,0,L.GW-mw-tw,yb,'wash');
  lane(0,yb,L.GW,yi0-yb);
  const ni=2+Math.floor(R()*2),iw=.5,gap=(L.GW-ni*iw)/(ni+1);let x=0;
  for(let i=0;i<ni;i++){lane(x,yi0,gap,yi1-yi0);x+=gap;const n=room(x,yi0,iw,yi1-yi0,'island');n.isl=1;x+=iw}
  lane(x,yi0,L.GW-x,yi1-yi0);
  const hs=cuts(0,L.GW,1,1.6);for(let i=0;i<hs.length-1;i++)lane(hs[i],yi1,hs[i+1]-hs[i],L.GH-yi1);
  L.canopy=[0,yi0-.15,L.GW,yi1-yi0+.3]}}
// 場區初始化（tacInit 內）：燃料量、露天開口、風向、化學品與洩漏
function tacYardInit(inc,B,T){
 B.out=1;B.wind=T.wui&&inc.wf?Object.assign({},inc.wf.wind):tacWind();if(T.wild){B.wild=1;if(B.wind.v<.35){B.wind.v=.45;B.wind.ms=3;B.wind.nm=B.wind.nm.replace(/\d+ m/,'3 m')}}
 for(const x of B.cells){const n=B.L.N[x.c];
  if(n.ty==='hall'){x.fu=0;x.v=1;continue}
  x.fu=TAC_YFU[n.kind]||1;if(!n.walled)x.v=1;
  if(n.kind==='ewaste')x.li=1;if(n.kind==='plastic'||n.kind==='paper')x.deep=1;
  // 草地：燃料少、燒得快，不需搜索
  if(T.wild){if(n.kind==='grass'||n.kind==='reed'||n.kind==='shrub')x.gr=1;if(n.kind!=='home'){x.srch=1;x.sl=2}}}
 if(T.wild)return;
 const t=tacTxt(inc);
 if(T.yard==='waste'){
  // 化學桶區：約一半機率有廢液外洩；鋼瓶區有瓦斯鋼瓶
  const d=B.L.N.find(n=>n.kind==='drum');
  if(d&&Math.random()<.55){B.chem=TAC_WASTE[Math.floor(Math.random()*TAC_WASTE.length)];B.leak={f:0,c:d.c,on:1}}
  const cy=B.L.N.find(n=>n.kind==='cylz');if(cy||/鋼瓶/.test(t)){B.gas=(cy||B.L.N.find(n=>n.kind==='plastic')||d).c;B.gasF=0}
  // 悶燒好幾個小時：數區深層悶燒
  if(/悶燒/.test(t))for(const x of B.cells)if(x.deep&&Math.random()<.5){x.h=Math.max(x.h,.2);x.s=.6}}
 else if(T.yard==='gas'){
  const isl=B.L.N.filter(n=>n.isl),tk=B.L.N.find(n=>n.kind==='tank');
  B.chem=TAC_FUEL;
  for(const x of B.cells)if(B.L.N[x.c].isl||B.L.N[x.c].kind==='tank')x.fuel=1;
  // 依報案：已按緊急遮斷（不再外洩）、加油島車輛起火（外洩中）、油罐車卸油起火（油槽區外洩）
  if(/卸油/.test(t)&&tk)B.leak={f:0,c:tk.c,on:1};
  else if(!/遮斷/.test(t)&&isl.length)B.leak={f:0,c:B.oc,on:1}
  B.chemK=1}}
// 每幀：飛火（順風跳過車道）、油池沿車道擴大
function tacYardStep(inc,B,dt){
 if(!B.out)return;
 B.ymT=(B.ymT||0)-dt;if(B.ymT>0)return;B.ymT=1;const W=B.wind;
 for(const x of B.cells){if(x.h<.6||x.ty!=='room')continue;const a=B.L.N[x.c];
  for(const y of B.cells){if(y===x||y.ty!=='room'||y.fu<=0||y.h>.05)continue;
   const d=tacGd(B,x.c,y.c);if(d>1.8)continue;const b=B.L.N[y.c];
   let dx=b.gx+b.gw/2-a.gx-a.gw/2,dy=b.gy+b.gh/2-a.gy-a.gh/2;const l=Math.hypot(dx,dy)||1;
   const al=(dx*W.d[0]+dy*W.d[1])/l;if(al<.3)continue;
   if(Math.random()<.004*(x.h-.5)*W.v*al*(TAC_RK[b.kind]||{fk:1}).fk*8*(b.walled?.04:1)){y.h=.12;radio(inc,'安全官','飛火順'+W.nm.slice(0,W.nm.indexOf('風')+1)+'引燃'+tacNm(B,0,y.c)+'！');tacEvt(inc,B,'warn','飛火引燃'+tacNm(B,0,y.c))}}}
 // 油料外洩：油池擴散到相鄰車道，可被引燃
 if(B.leak&&B.leak.on&&B.chem&&B.chem.fuel)for(const cc of B.L.N[B.leak.c].nb){const y=tacCel(B,0,cc);if(B.L.N[cc].ty==='hall'&&y.fu<.4){y.fu=.4;y.fuel=1;y.pool=1}}}
// 場區空間名稱：塑膠堆 A、加油島 2、場內車道
function tacYardNm(B,c){const n=B.L.N[c];if(n.ty==='hall')return tacCel(B,0,c).pool?'車道（油池）':n.levee?'堤頂道路':'場內車道';
 const same=B.L.N.filter(m=>m.ty==='room'&&m.kind===n.kind);
 return TAC_RK[n.kind].n+(same.length>1?' '+(n.kind==='island'?same.indexOf(n)+1:String.fromCharCode(65+same.indexOf(n))):'')}
// 繪製：場區地面與圍籬
function tacYardBase(g,G,B){
 g.fillStyle='#24231f';g.fillRect(G.bx-5,G.by-5,G.bw+10,G.bh+10);
 g.save();g.strokeStyle='rgba(190,185,170,.55)';g.lineWidth=2;g.setLineDash([3,4]);g.strokeRect(G.bx-3,G.by-3,G.bw+6,G.bh+6);g.restore()}
// 繪製：各區（堆置物、化學桶、鋼瓶、辦公室、加油島、油槽、便利商店、車道）
function tacYardCell(g,G,B,n,x,r,T){
 const t=G.t,burnt=x.fu<.05&&n.ty==='room';
 if(n.ty==='hall'){g.fillStyle='#33322e';g.fillRect(r[0],r[1],r[2],r[3]);
  g.strokeStyle='rgba(233,200,90,.25)';g.setLineDash([8,8]);g.lineWidth=1.5;g.beginPath();
  if(r[2]>=r[3]){g.moveTo(r[0],r[1]+r[3]/2);g.lineTo(r[0]+r[2],r[1]+r[3]/2)}else{g.moveTo(r[0]+r[2]/2,r[1]);g.lineTo(r[0]+r[2]/2,r[1]+r[3])}g.stroke();g.setLineDash([]);
  if(x.pool){g.fillStyle='rgba(120,90,160,.28)';g.beginPath();g.ellipse(r[0]+r[2]/2,r[1]+r[3]/2,r[2]*.4,r[3]*.38,0,0,TAU);g.fill()}
  tacScDraw(g,G,B,n,x,r,undefined,false,()=>.5);
  return}
 g.fillStyle=burnt?'#141210':'#2a2823';g.fillRect(r[0],r[1],r[2],r[3]);
 let sd=n.c*9301+49297;const rnd=()=>((sd=(sd*9301+49297)%233280)/233280);
 const k=n.kind,dark=burnt||x.fu<.3;
 const heap=(cols,nb)=>{for(let i=0;i<nb;i++){const cx=r[0]+r[2]*(.15+.7*rnd()),cy=r[1]+r[3]*(.18+.64*rnd()),rx=r[2]*(.12+.12*rnd()),ry=r[3]*(.1+.1*rnd());
  g.fillStyle=dark?'#1e1c19':cols[i%cols.length];g.beginPath();g.ellipse(cx,cy,rx,ry,rnd()*3,0,TAU);g.fill()}};
 if(k==='plastic')heap(['#4a6a8a','#7a5a4a','#5a7a5a','#8a8a6a'],14);
 else if(k==='paper')heap(['#8a7a5a','#9a8a6a','#7a6a4a'],12);
 else if(k==='metal')heap(['#6a6e74','#55595e','#7a7e84'],12);
 else if(k==='ewaste')heap(['#3a3e44','#4a4e54','#2f6f4a'],12);
 else if(k==='drum'){const nx=Math.max(2,Math.floor(r[2]/(t*.2))),ny=Math.max(2,Math.floor(r[3]/(t*.2)));
  for(let i=0;i<nx;i++)for(let j=0;j<ny;j++){if(rnd()<.2)continue;g.fillStyle=dark?'#1e1c19':['#2f5f9a','#c9a03a','#3a3e44'][(i+j)%3];g.beginPath();g.arc(r[0]+r[2]*(i+.5)/nx,r[1]+r[3]*(j+.5)/ny,t*.07,0,TAU);g.fill()}}
 else if(k==='cylz'){for(let i=0;i<12;i++){g.fillStyle=dark?'#1e1c19':'#8a9096';g.beginPath();g.arc(r[0]+r[2]*(.15+.7*rnd()),r[1]+r[3]*(.2+.6*rnd()),t*.045,0,TAU);g.fill()}}
 else if(k==='yoff'||k==='mart'){g.fillStyle=dark?'#1a1816':'#3f3b35';g.fillRect(r[0]+4,r[1]+4,r[2]-8,r[3]-8);
  g.strokeStyle='#8a857a';g.lineWidth=3;g.strokeRect(r[0]+4,r[1]+4,r[2]-8,r[3]-8);
  if(k==='mart'){g.fillStyle=dark?'#1e1c19':'#4a443c';for(let i=0;i<3;i++)g.fillRect(r[0]+r[2]*.15,r[1]+r[3]*(.25+i*.2),r[2]*.6,t*.05)}}
 else if(k==='island'){g.fillStyle=dark?'#1e1c19':'#5a5650';g.fillRect(r[0]+r[2]*.2,r[1]+r[3]*.1,r[2]*.6,r[3]*.8);
  for(let i=0;i<2;i++){g.fillStyle=dark?'#1e1c19':'#c8332c';g.fillRect(r[0]+r[2]*.3,r[1]+r[3]*(.2+i*.4),r[2]*.4,r[3]*.18)}}
 else if(k==='tank'){for(let i=0;i<3;i++){g.strokeStyle=dark?'#1e1c19':'#9a958a';g.lineWidth=2;g.beginPath();g.arc(r[0]+r[2]*(.25+i*.25),r[1]+r[3]*.5,t*.08,0,TAU);g.stroke()}
  g.fillStyle='rgba(236,234,227,.45)';g.font='10px '+FONT;g.textAlign='center';g.textBaseline='bottom';g.fillText('地下油槽注油口',r[0]+r[2]/2,r[1]+r[3]-4)}
 else if(x.brk){g.fillStyle='#4a3a2a';g.fillRect(r[0]+2,r[1]+2,r[2]-4,r[3]-4);g.strokeStyle='rgba(160,130,90,.5)';g.lineWidth=1;for(let i=1;i<6;i++){g.beginPath();g.moveTo(r[0]+r[2]*i/6,r[1]+3);g.lineTo(r[0]+r[2]*i/6,r[1]+r[3]-3);g.stroke()}
  g.fillStyle='#e9c85a';g.font='600 10px '+FONT;g.textAlign='center';g.textBaseline='middle';g.fillText('防火線',r[0]+r[2]/2,r[1]+r[3]/2)}
 else if(k==='grass'||k==='reed'||k==='shrub'){if(burnt){g.fillStyle='#161412';g.fillRect(r[0],r[1],r[2],r[3]);for(let i=0;i<10;i++){g.fillStyle='rgba(120,115,105,.35)';g.fillRect(r[0]+r[2]*rnd(),r[1]+r[3]*rnd(),3,2)}}
  else{g.fillStyle=k==='reed'?'#4a4a2c':k==='shrub'?'#2e4028':'#3b4a2a';g.fillRect(r[0],r[1],r[2],r[3]);g.strokeStyle=k==='reed'?'#9a9a5a':k==='shrub'?'#4e6a3a':'#6a7a3a';g.lineWidth=1;
   const nn=k==='shrub'?10:28;for(let i=0;i<nn;i++){const tx=r[0]+r[2]*rnd(),ty=r[1]+r[3]*rnd();if(k==='shrub'){g.fillStyle='#3e5a32';g.beginPath();g.arc(tx,ty,t*.06,0,TAU);g.fill()}else{g.beginPath();g.moveTo(tx,ty);g.lineTo(tx-2,ty-(k==='reed'?9:5));g.moveTo(tx,ty);g.lineTo(tx+2,ty-(k==='reed'?8:4));g.stroke()}}}}
 else if(k==='forest'){if(burnt){g.fillStyle='#161412';g.fillRect(r[0],r[1],r[2],r[3]);for(let i=0;i<8;i++){g.fillStyle='#2a221c';g.beginPath();g.arc(r[0]+r[2]*rnd(),r[1]+r[3]*rnd(),t*.05,0,TAU);g.fill()}}
  else{g.fillStyle='#1a2e1e';g.fillRect(r[0],r[1],r[2],r[3]);for(let i=0;i<14;i++){g.fillStyle=['#24402a','#2c4c30','#1f3824'][i%3];g.beginPath();g.arc(r[0]+r[2]*(.1+.8*rnd()),r[1]+r[3]*(.1+.8*rnd()),t*(.09+.06*rnd()),0,TAU);g.fill()}}}
 else if(k==='home'){g.fillStyle=dark?'#1a1816':'#4a3530';g.fillRect(r[0]+6,r[1]+6,r[2]-12,r[3]-12);g.strokeStyle=dark?'#2a221c':'#8a5a4a';g.lineWidth=2;
  g.beginPath();g.moveTo(r[0]+6,r[1]+r[3]/2);g.lineTo(r[0]+r[2]-6,r[1]+r[3]/2);g.stroke();g.strokeStyle='#8a857a';g.lineWidth=3;g.strokeRect(r[0]+6,r[1]+6,r[2]-12,r[3]-12)}
 else if(k==='shack'){g.fillStyle=dark?'#1a1816':'#5a6268';g.fillRect(r[0]+6,r[1]+6,r[2]-12,r[3]-12);g.strokeStyle='rgba(200,205,210,.35)';g.lineWidth=1;for(let yy=r[1]+10;yy<r[1]+r[3]-8;yy+=5){g.beginPath();g.moveTo(r[0]+7,yy);g.lineTo(r[0]+r[2]-7,yy);g.stroke()}}
 else if(k==='cars')tacCarRow(g,r,dark,rnd);
 else if(k==='wash'){g.strokeStyle='rgba(125,179,232,.3)';g.lineWidth=1;for(let i=1;i<5;i++){g.beginPath();g.moveTo(r[0]+r[2]*i/5,r[1]+4);g.lineTo(r[0]+r[2]*i/5,r[1]+r[3]-4);g.stroke()}}
 tacScDraw(g,G,B,n,x,r,k,dark,rnd);
 g.strokeStyle='rgba(190,185,170,.18)';g.lineWidth=1;g.strokeRect(r[0]+1,r[1]+1,r[2]-2,r[3]-2)}
// 繪製：遮雨棚、化學品危害區、風向
function tacYardTop(g,G,B,T){
 const L=B.L,t=G.t;
 if(L.canopy){const c=L.canopy;g.fillStyle='rgba(200,200,195,.08)';g.fillRect(G.bx+c[0]*t,G.by+c[1]*t,c[2]*t,c[3]*t);
  g.strokeStyle='rgba(200,200,195,.3)';g.lineWidth=1;g.setLineDash([6,4]);g.strokeRect(G.bx+c[0]*t,G.by+c[1]*t,c[2]*t,c[3]*t);g.setLineDash([]);
  g.fillStyle='rgba(236,234,227,.4)';g.font='10px '+FONT;g.textAlign='left';g.textBaseline='top';g.fillText('遮雨棚',G.bx+c[0]*t+4,G.by+c[1]*t+2)}
 // 煙流：順風飄出場外
 if(B.wind)for(const n of L.N){const x=tacCel(B,0,n.c);if(x.h<.2)continue;const r=G.r(n.c);
  for(let k=0;k<4;k++){const ph=(T*.25+k/4+n.c*.17)%1,d=ph*t*2.2;
   g.fillStyle='rgba(70,70,74,'+((1-ph)*.45*x.h).toFixed(3)+')';g.beginPath();g.arc(r[0]+r[2]/2+B.wind.d[0]*d,r[1]+r[3]/2+B.wind.d[1]*d,t*(.12+ph*.3),0,TAU);g.fill()}}
 // 建物防護：外圍山火逼近的方向（林地那側）
 if(B.wui&&B.fside&&B.wh>.03){const s=B.fside,a=Math.min(1,B.wh),pl=.6+.4*Math.sin(T*3),hz=s==='n'||s==='s';
  const r=s==='n'?[G.bx,G.by-28,G.bw,22]:s==='s'?[G.bx,G.by+G.bh+6,G.bw,22]:s==='w'?[G.bx-28,G.by,22,G.bh]:[G.bx+G.bw+6,G.by,22,G.bh];
  const out=s==='n'||s==='w'?0:1,gr=hz?g.createLinearGradient(0,r[1],0,r[1]+r[3]):g.createLinearGradient(r[0],0,r[0]+r[2],0);
  gr.addColorStop(out,'rgba(255,90,30,'+(.6*a*pl).toFixed(2)+')');gr.addColorStop(1-out,'rgba(255,90,30,0)');
  g.fillStyle=gr;g.fillRect(r[0],r[1],r[2],r[3]);g.fillStyle='#ffb08a';g.font='600 11px '+FONT;g.textAlign='center';g.textBaseline='middle';
  const lb='外圍山火自'+TAC_SDN[s]+'側逼近 '+Math.round(a*100)+'%';
  if(hz)g.fillText(lb,r[0]+r[2]/2,r[1]+r[3]/2);else{g.save();g.translate(r[0]+r[2]/2,r[1]+r[3]/2);g.rotate(s==='w'?-Math.PI/2:Math.PI/2);g.fillText(lb,0,0);g.restore()}}
 // 風向標
 if(B.wind){const cx=G.bx+G.bw-28,cy=G.by-34,W=B.wind;g.save();g.translate(cx,cy);
  g.fillStyle='rgba(12,12,11,.8)';g.beginPath();g.arc(0,0,18,0,TAU);g.fill();
  g.strokeStyle='#7db3e8';g.lineWidth=2.5;g.beginPath();g.moveTo(-W.d[0]*12,-W.d[1]*12);g.lineTo(W.d[0]*12,W.d[1]*12);g.stroke();
  g.fillStyle='#7db3e8';g.beginPath();const a=Math.atan2(W.d[1],W.d[0]);g.moveTo(W.d[0]*14,W.d[1]*14);g.lineTo(W.d[0]*14-Math.cos(a-.5)*8,W.d[1]*14-Math.sin(a-.5)*8);g.lineTo(W.d[0]*14-Math.cos(a+.5)*8,W.d[1]*14-Math.sin(a+.5)*8);g.closePath();g.fill();
  g.restore();g.fillStyle='#cfe0f2';g.font='600 11px '+FONT;g.textAlign='right';g.textBaseline='middle';g.fillText(W.nm,cx-24,cy)}}
// 危害區（室內外共用）：辨識前為紫色「疑似化學品」，辨識後依等級標示熱區／暖區
function tacHazDraw(g,G,B,vf){
 if(!B.chem||vf>=B.F)return;
 for(const n of B.L.N){const x=tacCel(B,vf,n.c);if(!(x.hz>0))continue;const r=G.r(n.c);
  const col=!B.chemK?'160,110,220':x.hz>=3?'226,86,79':x.hz>=2?'233,161,59':'233,200,90';
  g.fillStyle='rgba('+col+','+(.1+.1*Math.min(1,x.cz||0)).toFixed(3)+')';g.fillRect(r[0],r[1],r[2],r[3]);
  g.save();g.beginPath();g.rect(r[0],r[1],r[2],r[3]);g.clip();g.strokeStyle='rgba('+col+',.35)';g.lineWidth=1;
  for(let k=-r[3];k<r[2];k+=12){g.beginPath();g.moveTo(r[0]+k,r[1]+r[3]);g.lineTo(r[0]+k+r[3],r[1]);g.stroke()}g.restore();
  g.fillStyle='rgba('+col+',.95)';g.font='600 10px '+FONT;g.textAlign='center';g.textBaseline='top';
  g.fillText(!B.chemK?'疑似化學品':B.chem.zone?B.chem.zone:x.hz>=B.chem.lv?'熱區（'+['','C','B','A'][B.chem.lv]+'級）':'暖區',r[0]+r[2]/2,r[1]+r[3]*.42)}
 if(B.leak&&B.leak.on&&B.leak.f===vf){const r=G.r(B.leak.c),pl=.5+.5*Math.sin(S.t*6);
  g.strokeStyle='rgba(160,110,220,'+(.5+.5*pl).toFixed(2)+')';g.lineWidth=2;g.beginPath();g.arc(r[0]+r[2]/2,r[1]+r[3]*.7,8+pl*6,0,TAU);g.stroke();
  g.fillStyle='#d8c4f6';g.font='600 10px '+FONT;g.textAlign='center';g.textBaseline='top';g.fillText(B.chem.srcN||(B.chem.fuel?'油料外洩':'洩漏源'),r[0]+r[2]/2,r[1]+r[3]*.7+14)}}
// 河堤：臨河那側改為水域（不能停車、沒有入口）
function tacYardPost(inc,B,T){
 if(T.wui){ // 建物防護：道路在聚落那側，林地那側不能停車，兩側是產業道路（大型車禁入）
  const rd=B.L.N.filter(n=>n.lane),fo=B.L.N.filter(n=>n.kind==='forest');
  // 林地那側：林地區塊重心相對場區中心的方向；道路在對側，另兩側是產業道路
  const cx=fo.reduce((a,n)=>a+n.gx+n.gw/2,0)/fo.length-B.L.GW/2,cy=fo.reduce((a,n)=>a+n.gy+n.gh/2,0)/fo.length-B.L.GH/2;
  const fs=tacDirOf(cx,cy),rs={n:'s',s:'n',e:'w',w:'e'}[fs];
  B.sd={};B.sd[rs]={road:2,big:true,nm:'道路'};B.sd[fs]={road:0,big:false,nm:'林地'};
  for(const s of TAC_SIDES)if(!B.sd[s])B.sd[s]={road:5,big:false,nm:'產業道路'};
  B.arr=rs;B.exp={};B.ents=TAC_SIDES.filter(s=>B.sd[s].road&&B.L.ent[s]!==undefined).map(s=>({side:s,c:B.L.ent[s]}));B.fside=fs;
  if(!inc.hy||inc.tender)B.hyd=null;else B.hyd=tacHydMk(inc,rs);
  return}
 if(!T.river)return;
 const rv=B.L.N.filter(n=>n.riv);if(!rv.length)return;
 const top=rv.reduce((a,n)=>a+n.gy+n.gh/2,0)/rv.length<B.L.GH/2,rs=top?'n':'s';
 B.sd[rs]={road:0,big:false,nm:'水域'};B.riv=rs;
 B.ents=B.ents.filter(e=>e.side!==rs);
 if(B.arr===rs){B.arr=B.ents.length?B.ents[0].side:tacOpp(rs,'n')?'n':'s'}
 if(!B.ents.length){if(!B.sd[B.arr].road)B.sd[B.arr]={road:2,big:true,nm:'道路'};B.ents=[{side:B.arr,c:B.L.ent[B.arr]}]}
 if(B.hyd&&B.hyd.side===rs)B.hyd.side=B.arr}
// 野火小組：撲打（打火拍、背負式水袋）、開設防火線
function tacWildCan(B,q,k,c){
 if(k!=='beat'&&k!=='brk')return'';
 if(!B.wild)return'只有野火現場使用';
 if(q.ty==='ladder'||q.ty==='robot')return'此組無法執行';
 const n=B.L.N[c];if(!n||n.ty!=='room'||n.walled)return'請點選草地';
 if(k==='brk'&&tacCel(B,0,c).h>.05)return'已在燃燒，無法開設防火線';
 return''}
function tacWildTask(inc,B,q,k,cl,dt,cmd){
 if(k==='beat'){
  if(cl.h<.02){const nx=tacNear(B,0,q.c,x=>x.gr&&x.h>.02&&x.h<.6&&!B.sq.some(y=>y!==q&&y.task==='beat'&&y.tc===x.c));
   if(nx!==null){q.tc=nx;return}q.task='idle';radio(inc,q.cs,'附近火線已撲滅。');return}
  if(cl.h>.6){q.hp-=dt*.02;if(!q.btW){q.btW=1;radio(inc,q.cs,tacNm(B,0,q.c)+'火勢太猛，無法撲打，後撤！')}q.task='idle';return}
  q.btW=0;cl.h=Math.max(0,cl.h-dt*.04*(q.n/3)*cmd);if(cl.h<.02){cl.h=0;cl.dw=1}return}
 if(k==='brk'){
  if(cl.h>.1){q.task='idle';radio(inc,q.cs,'火已燒到'+tacNm(B,0,q.c)+'，停止開設防火線撤離。');return}
  q.wk+=dt;if(q.wk>=(q.ty==='resc'?15:25)){q.wk=0;cl.fu=0;cl.brk=1;q.task='idle';radio(inc,q.cs,tacNm(B,0,q.c)+'防火線開設完成。');tacEvt(inc,B,'milestone','開設防火線：'+tacNm(B,0,q.c))}}}
// 野火 AI：撲打低矮火勢、在火頭下風處開設防火線、鐵皮屋周界防護
function tacWildAI(inc,B,free,take,spare){
 // 周界防護的建物已無威脅（周邊沒有火、外圍山火已過）：收線，讓水線給攻擊組
 for(const q of B.sq){if(q.task!=='guard'||q.tf<0)continue;const n=B.L.N[q.tc];if(!n.walled)continue;
  if(!n.nb.concat(n.wl).some(o=>tacCel(B,0,o).h>.05)&&tacCel(B,0,q.tc).h<.05&&(!B.wui||B.wh<.1)){q.task='idle';radio(inc,q.cs,tacNm(B,0,q.tc)+'周邊已無火勢，收線待命。')}}
 const fr=B.cells.filter(x=>x.gr&&x.h>.05);
 // 沒有水線可用的幫浦組也會拿打火拍撲打
 for(const q of free.slice()){if((q.ty==='pump'&&(spare>0||q.line))||q.ty==='ladder'||q.ty==='robot'||q.epa)continue;
  // 防火線開在火頭下風「隔一區」：太近會來不及完成
  const hot=new Set(fr.map(x=>x.c)),near=new Set();for(const x of fr)for(const o of B.L.N[x.c].nb)if(tacWF(B,x.c,o)>1.2)near.add(o);
  const ah=fr.length>=2?B.cells.find(y=>y.gr&&y.fu>0&&y.h<.02&&!y.brk&&!hot.has(y.c)&&!near.has(y.c)&&!B.L.N[y.c].nb.some(o=>hot.has(o))&&
   B.L.N[y.c].nb.some(o=>near.has(o)&&tacWF(B,o,y.c)>1.1)&&!B.sq.some(z=>z.task==='brk'&&z.tc===y.c)):null;
  if(ah&&tacOrder(inc,q,'brk',0,ah.c,1)){take(q);continue}
  const sm=fr.filter(x=>x.h<.5&&!B.sq.some(y=>y!==q&&y.task==='beat'&&y.tc===x.c)).sort((a,b)=>a.h-b.h)[0];
  if(sm&&tacOrder(inc,q,'beat',0,sm.c,1)){take(q);continue}}
 const sh=B.L.N.filter(n=>(n.kind==='shack'||n.kind==='home')&&!B.sq.some(q=>q.task==='guard'&&q.tc===n.c)&&tacCel(B,0,n.c).h<.3&&(n.nb.concat(n.wl).some(o=>tacCel(B,0,o).h>.2)||(B.wui&&B.wh>.3&&n.kind==='home')))
  .sort((a,b)=>(b.kind==='home')-(a.kind==='home')||(tacCel(B,0,b.c).pre||0)-(tacCel(B,0,a.c).pre||0))[0]; // 民宅優先、外牆預熱高的先守
 if(sh&&spare>0&&!(B.shT>S.t)){
  const p=free.find(q=>q.ty==='pump'&&!q.line);if(p&&tacOrder(inc,p,'guard',0,sh.c,1)){take(p);B.shT=S.t+(B.wui?8:30);radio(inc,p.cs,tacNm(B,0,sh.c)+'周界防護，阻止火勢延燒建物。')}}}
// 建物防護：外圍山火（作戰圖上受保護民宅周邊的火格）持續烤林地邊緣、飛火；民宅燒毀回饋作戰圖；山火過境且場內撲滅後結束
function tacWuiStep(inc,B,dt,first){
 const W=inc.wf;if(!W){inc.tac=null;return}
 const x=(B.wk/N)|0,y=B.wk%N;let heat=0;
 for(const v of WF_D8.concat([[2,0],[-2,0],[0,2],[0,-2]])){const c=W.F.get(K(x+v[0],y+v[1]));if(c)heat=Math.max(heat,c.h*(Math.abs(v[0])+Math.abs(v[1])>2?.6:1))}
 B.wh=heat;B.whMax=Math.max(B.whMax||0,heat);
 {let sh=0;for(const c of B.cells)sh+=c.h;B.peak=Math.max(B.peak||0,sh)}
 if(heat>.15)for(const c of B.cells){const n=B.L.N[c.c];if(c.fu<=0)continue;
  if(n.kind==='forest'&&Math.random()<dt*.06*heat)c.h=Math.max(c.h,.2+heat*.5);
  else if(n.ty==='room'&&n.kind!=='forest'&&!n.walled&&Math.random()<dt*.004*heat*B.wind.v)c.h=Math.max(c.h,.12)} // 飛火（建物有牆，不直接被飛火引燃）
 for(const c of B.cells){const n=B.L.N[c.c];if(n.kind==='home'&&c.h>.6&&!c.lostF){c.lostF=1;B.homeLost=(B.homeLost||0)+1;S.rep-=2;
  radio(inc,'受理',tacNm(B,0,c.c)+'遭山火延燒（評鑑 -2）。');tacEvt(inc,B,'danger',tacNm(B,0,c.c)+'燒毀',1);if(S.rep<=0){S.rep=0;S.over=true}}}
 // 林地殘火交回山火作戰圖處理，只看聚落與防禦空間
 const out=!B.cells.some(c=>(c.h>=.04||c.emb)&&B.L.N[c.c].kind!=='forest');let left=0;for(const c of B.cells)left+=c.vic+c.hid;for(const q of B.sq)left+=q.carry;
 const evac=B.pts.length+onScene(inc).filter(u=>u.load>0).length;
 if(heat<.05&&out&&!left&&!evac){B.doneT+=dt;if(B.doneT>=3){
  const hs=B.cells.filter(c=>B.L.N[c.c].kind==='home'),sv=hs.filter(c=>!c.lostF).length;
  radio(inc,first?first.cs:'現場','建物防護完成：保住民宅 '+sv+' / '+hs.length+' 棟'+(B.resc?'，救出 '+B.resc+' 名':'')+'。');
  W.prot.delete(B.wk);(W.wd||(W.wd=new Set())).add(B.wk);if(B.homeLost)W.hit.add(B.wk);
  W.svH=(W.svH||0)+sv;W.lsH=(W.lsH||0)+hs.length-sv;
  if(B.played&&sv&&B.whMax>.3){const g=repGain(sv*.8);radio(inc,'受理','建物防護成果：評鑑 +'+g.toFixed(1)+'。')}
  // 建物防護結案報告：財損以保住的民宅比例計
  {const r=tacReport(inc,B);r.nm='建物防護（'+((B.wk/N)|0)+','+(B.wk%N)+'）· '+r.nm;r.sc.loss=hs.length?sv/hs.length*100:100;
   r.avg=Math.round((r.sc.time+r.sc.resc+r.sc.safe+r.sc.loss)/4);r.grade=r.avg>=90?'S':r.avg>=80?'A':r.avg>=65?'B':r.avg>=50?'C':'D';
   r.sum=r.sum.filter(x=>x[0]!=='燒毀').concat([['保住民宅',sv+' / '+hs.length+' 棟'],['外圍山火最強',Math.round((B.whMax||0)*100)+'%']]);
   if(B.homeLost)r.notes=r.notes.filter(x=>x!=='無明顯缺失').concat(['民宅燒毀 '+B.homeLost+' 棟：山火逼近前應先對外牆周界防護']);
   B.report=r;W.lastRep=r;if(B.played)tacShowRep(r)}
  B.done=1;B.burnt=B.homeLost||0;inc.tac=null;
  // 還有其他受威脅的民宅：依序轉往下一處（指揮官在看就直接切換畫面）
  const nx=wfWuiTodo(W);
  if(nx.length&&B.played&&W.F.size){if(W.pri===nx[0])W.pri=null;
   tacInit(inc);const N2=inc.tac;N2.played=1;
   radio(inc,'受理','轉往下一處受威脅民宅（'+((N2.wk/N)|0)+','+(N2.wk%N)+'），火從'+TAC_SDN[N2.fside]+'側來，還有 '+(nx.length-1)+' 處待防護。');
   if(TAC.open&&TAC.id===inc.id){TAC.B=N2;TAC.vf=0;TAC.sq=null;TAC.ms=[];TAC.ord=null;tTopH=tSideH=tBotH=''}}}}
 else B.doneT=0}
// 作戰圖上仍待防護的民宅（受威脅、未燒毀、未完成防護）
// 受威脅民宅的處理順序：指揮官指定優先的排最前，其餘依周邊火勢由急到緩
function wfHeatAt(W,k){const x=(k/N)|0,y=k%N;let h=0;for(const v of WF_D8.concat([[2,0],[-2,0],[0,2],[0,-2]])){const c=W.F.get(K(x+v[0],y+v[1]));if(c)h=Math.max(h,c.h*(Math.abs(v[0])+Math.abs(v[1])>2?.6:1))}return h}
// 只列仍受火勢威脅的（周邊火格還在燒）；山火已過境的民宅不需再防護
const wfWuiTodo=W=>[...W.thr].filter(k=>!W.hit.has(k)&&!(W.wd&&W.wd.has(k))&&!(W.prot&&W.prot.has(k))&&wfHeatAt(W,k)>.05)
 .sort((a,b)=>(b===W.pri)-(a===W.pri)||wfHeatAt(W,b)-wfHeatAt(W,a));
