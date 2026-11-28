// 戰術指揮：畫面繪製（版面幾何、車輛停放、人員、水帶、建物與場景）
'use strict';
// 版面：左側樓層選擇列；建物平面置中，四周依現場地圖畫出道路、鄰棟或水域
function tacGeo(B){
 const L=B.L,sx=8,sw=146,top=28,ax=sx+sw+16,ay=top,aw=tW-ax-8,ah=tH-ay-6,m={};
 for(const s of TAC_SIDES)m[s]=B.sd[s].road?(B.sd[s].big?116:72):30; // 道路：外側兩排車位（窄路一排）、內側一條人員待命通道
 const t=Math.max(34,Math.min(170,(aw-m.w-m.e-20)/L.GW,(ah-m.n-m.s-20)/L.GH));
 const bw=t*L.GW,bh=t*L.GH;
 const bx=ax+m.w+10+Math.max(0,(aw-m.w-m.e-20-bw)/2),by=ay+m.n+10+Math.max(0,(ah-m.n-m.s-20-bh)/2);
 const band={n:[ax,by-10-m.n,aw,m.n],s:[ax,by+bh+10,aw,m.s],w:[bx-10-m.w,ay,m.w,ah],e:[bx+bw+10,ay,m.e,ah]};
 const sh=Math.max(16,Math.min(50,(tH-top-30)/(B.F+1)));
 // 車輛比例尺（px／公尺）：消防車與現場車輛共用，依每格代表的公尺數與各側可停長度取最小，上限 16
 const mpu=(B.park&&B.park.mpu)||4.5,vs=Math.max(4,Math.min(16,(bw+20)/(L.GW*mpu+16),(bh+20)/(L.GH*mpu+16)));TAC.vs=vs;
 return{t,bx,by,bw,bh,band,sx,sw,sh,L,vs,
  r:c=>{const n=L.N[c];return[bx+n.gx*t,by+n.gy*t,n.gw*t,n.gh*t]},
  ctr:c=>{const n=L.N[c];return[bx+(n.gx+n.gw/2)*t,by+(n.cy!==undefined?n.cy:n.gy+n.gh/2)*t]},
  fy:f=>top+(B.F-f)*sh}}
// 入口門的位置（依格局）
function tacDoor(G,s){const d=G.L.door[s]||[0,0];return[G.bx+d[0]*G.t,G.by+d[1]*G.t]}
// 某個入口的位置（店面鐵捲門、車道入口有自己的位置）
function tacEDoor(G,e){if(!e.pt)return tacDoor(G,e.side);return[G.bx+e.pt[0]*G.t,G.by+e.pt[1]*G.t]}
// 屋外人員在某側的站位（沿外牆排開）
function tacStage(G,s,i){
 const d=tacDoor(G,s),a=34+(i%8)*36,b=0;
 return s==='n'?[d[0]+a,G.by-22-b]:s==='s'?[d[0]+a,G.by+G.bh+22+b]:s==='w'?[G.bx-22-b,d[1]+a-G.t*.9]:[G.bx+G.bw+22+b,d[1]+a-G.t*.9]}
// ===== 車輛停放（繪製） =====
// 依模擬端的停放模型（tacParkModel，以公尺計）換算到畫面：每側道路段的長度對應該側可停長度
function tacParkPlan(inc,B,G){
 const P=B.park||(B.park=tacParkModel(inc,B)),bd=G.band,cars=[],off=[],edge={};
 const seg={n:[bd.w[0]+bd.w[2],bd.e[0]],s:[bd.w[0]+bd.w[2],bd.e[0]],w:[bd.n[1]+bd.n[3],bd.s[1]],e:[bd.n[1]+bd.n[3],bd.s[1]]};
 const VS=G.vs,o0=2.5*VS/2+4,dr=2.5*VS+6,rowC=(s,r)=>{const b=bd[s];return s==='n'?b[1]+o0+r*dr:s==='s'?b[1]+b[3]-o0-r*dr:s==='w'?b[0]+o0+r*dr:b[0]+b[2]-o0-r*dr};
 for(const s of TAC_SIDES)edge[s]=s==='n'?[seg.n[1]-30,rowC('n',0)]:s==='s'?[seg.s[1]-30,rowC('s',0)]:s==='w'?[rowC('w',0),seg.w[1]-14]:[rowC('e',0),seg.e[1]-14];
 for(const u of onScene(inc)){if(u.st!=='work')continue;const sl=P.slots[u.id];if(!sl)continue;
  if(sl.off){off.push({u,s:sl.s});continue}
  const s=sl.s,[A,Z]=seg[s],ppm=(Z-A)/P.front[s],hz=s==='n'||s==='s',m=(A+Z)/2+sl.o*ppm,cc=rowC(s,sl.row);
  cars.push({u,s,ghost:sl.ghost,len:sl.len*VS,wid:(TAC_VWID[u.code]||2.5)*VS,vert:!hz,x:hz?m:cc,y:hz?cc:m,hp:hz?[m,cc]:[cc,m]})}
 return{cars,off,edge}}
// 建物四角的路口：放站點帳篷（車輛不會停在那裡）；抵達側兩角優先
function tacCorners(G,side){
 const B4=G.band,rc=(v,h)=>[B4[v][0],B4[h][1],B4[v][2],B4[h][3]];
 const all={nw:rc('w','n'),ne:rc('e','n'),sw:rc('w','s'),se:rc('e','s')};
 const ord={n:['nw','ne','sw','se'],s:['sw','se','nw','ne'],e:['ne','se','nw','sw'],w:['nw','sw','ne','se']}[side];
 return ord.map(k=>all[k])}
// 家具：依房間用途畫，固定種子讓每次畫的位置一樣
// 挑空與電扶梯：中央開口（看得到下層）＋兩道交錯的電扶梯
function tacAtr(g,r,top){
 const[x,y,w,h]=r,p=Math.min(w,h)*.14;
 g.fillStyle='rgba(0,0,0,.45)';g.fillRect(x+p,y+p,w-2*p,h-2*p);
 g.strokeStyle='rgba(200,200,190,.5)';g.lineWidth=1.5;g.setLineDash([4,3]);g.strokeRect(x+p,y+p,w-2*p,h-2*p);g.setLineDash([]);
 for(let k=0;k<2;k++){const ex=x+w*(.32+k*.22),ew=w*.12;g.fillStyle='#3d3a35';g.fillRect(ex,y+h*.22,ew,h*.56);
  g.strokeStyle='rgba(220,215,200,.35)';g.lineWidth=1;for(let yy=y+h*.25;yy<y+h*.76;yy+=5){g.beginPath();g.moveTo(ex+1,yy);g.lineTo(ex+ew-1,yy);g.stroke()}
  g.fillStyle='rgba(236,234,227,.6)';g.font='10px '+FONT;g.textAlign='center';g.textBaseline='middle';g.fillText(k?'▼':'▲',ex+ew/2,y+h*.17)}
 g.fillStyle='rgba(236,234,227,.55)';g.font='600 10px '+FONT;g.textAlign='center';g.textBaseline='bottom';g.fillText(top?'挑空（頂層）':'挑空・電扶梯',x+w/2,y+h-3)}
function tacFurn(g,r,kind,seed,dark){
 let sd=seed*9301+49297;const rnd=()=>((sd=(sd*9301+49297)%233280)/233280);
 const[x,y,w,h]=r,u=Math.min(w,h),p=u*.1;
 const fc=dark?'#1e1b18':'#4a443c',lc=dark?'#26221e':'#5e574d';
 const box=(a,b,c,d,col)=>{g.fillStyle=col||fc;g.fillRect(a,b,c,d);g.strokeStyle=lc;g.lineWidth=1;g.strokeRect(a,b,c,d)};
 if(kind==='bed'){const bw=u*.36,bh=u*.52,bx=rnd()<.5?x+p:x+w-p-bw;box(bx,y+p,bw,bh);g.fillStyle=dark?fc:'#7b7468';g.fillRect(bx+bw*.1,y+p+bh*.05,bw*.8,bh*.16);box(bx+(bx<x+w/2?bw+p*.5:-p*1.8),y+p,p*1.3,p*1.3);
  if(w>u*1.3)box(x+w-p-u*.5,y+h-p-u*.18,u*.5,u*.18)}
 else if(kind==='living'){box(x+p,y+h-p-u*.2,w*.5,u*.2);box(x+p,y+h-p-u*.55,u*.2,u*.35);box(x+w*.3,y+h*.45,w*.22,h*.15);box(x+w-p-u*.08,y+h*.3,u*.08,h*.35)}
 else if(kind==='kitchen'){box(x+p,y+p,w-2*p,u*.16);box(x+p,y+p,u*.16,h*.6);g.fillStyle=fc;g.beginPath();g.arc(x+w*.6,y+h*.62,u*.14,0,TAU);g.fill();
  for(let k=0;k<3;k++){const a=k*2.1+.4;g.beginPath();g.arc(x+w*.6+Math.cos(a)*u*.22,y+h*.62+Math.sin(a)*u*.22,u*.04,0,TAU);g.fill()}}
 else if(kind==='bath'){box(x+p,y+p,w*.55,h*.3,dark?fc:'#55606a');g.fillStyle=dark?fc:'#6b7680';g.beginPath();g.ellipse(x+w-p-u*.1,y+h-p-u*.13,u*.08,u*.12,0,0,TAU);g.fill()}
 else if(kind==='store'||kind==='ware'||kind==='dock'){for(let k=0;k<(kind==='ware'?14:6);k++){const s2=u*(.12+rnd()*.1);box(x+p+rnd()*(w-2*p-s2),y+p+rnd()*(h-2*p-s2),s2,s2)}}
 else if(kind==='office'){const nx=Math.max(1,Math.floor(w/(u*.45))),ny=Math.max(1,Math.floor(h/(u*.45)));
  for(let i=0;i<nx;i++)for(let j=0;j<ny;j++){const dx=x+p+i*(w-2*p)/nx,dy=y+p+j*(h-2*p)/ny;box(dx,dy,(w-2*p)/nx*.6,(h-2*p)/ny*.35);
   g.fillStyle=fc;g.beginPath();g.arc(dx+(w-2*p)/nx*.3,dy+(h-2*p)/ny*.55,u*.04,0,TAU);g.fill()}}
 else if(kind==='ward'){const n2=Math.max(2,Math.min(4,Math.floor(w/(u*.3))));
  for(let i=0;i<n2;i++){const bx=x+p+i*(w-2*p)/n2;box(bx,y+p,(w-2*p)/n2*.6,h*.32);g.fillStyle=dark?fc:'#7b7468';g.fillRect(bx+2,y+p+2,(w-2*p)/n2*.6-4,h*.06)}
  g.strokeStyle=lc;g.setLineDash([3,3]);g.beginPath();g.moveTo(x+p,y+h*.45);g.lineTo(x+w-p,y+h*.45);g.stroke();g.setLineDash([])}
 else if(kind==='shelf'){const n2=Math.max(2,Math.floor(h/(u*.28)));for(let i=0;i<n2;i++)box(x+w*.12,y+p+i*(h-2*p)/n2,w*.76,u*.07)}
 else if(kind==='care')tacFurn(g,r,'ward',seed,dark);
 else if(kind==='clinic'||kind==='act')tacFurn(g,r,'office',seed,dark);
 else if(kind==='food')tacFurn(g,r,'stall',seed,dark);
 else if(kind==='shrine'){box(x+w*.15,y+p,w*.7,u*.2,dark?fc:'#6a3a2a');g.fillStyle=dark?fc:'#c9a040';g.fillRect(x+w*.45,y+p+u*.03,w*.1,u*.12);box(x+w*.3,y+h*.45,w*.4,u*.16);box(x+p,y+h-p-u*.18,w*.35,u*.18)}
 else if(kind==='rack')tacFurn(g,r,'shelf',seed,dark);
 else if(kind==='bunk'){const n2=Math.max(2,Math.floor(w/(u*.32)));for(let i=0;i<n2;i++){const bx=x+p+i*(w-2*p)/n2,bw=(w-2*p)/n2*.7;
  box(bx,y+p,bw,h*.36);box(bx,y+h-p-h*.36,bw,h*.36);g.strokeStyle=lc;g.beginPath();g.moveTo(bx,y+p+h*.18);g.lineTo(bx+bw,y+p+h*.18);g.stroke()}}
 else if(kind==='stall'){const nx=Math.max(2,Math.floor(w/(u*.35))),ny=Math.max(1,Math.floor(h/(u*.55)));
  for(let i=0;i<nx;i++)for(let j=0;j<ny;j++){const sx=x+p+i*(w-2*p)/nx,sy=y+p+j*(h-2*p)/ny;box(sx,sy,(w-2*p)/nx*.8,(h-2*p)/ny*.45,dark?fc:['#5a4a3c','#4a5a46','#5a4048'][(i+j)%3])}}
 else if(kind==='park'){ // 停車格與車輛
  const VS=TAC.vs||8,n2=Math.max(2,Math.floor(w/(2.6*VS)));g.strokeStyle=dark?lc:'rgba(233,200,90,.35)';g.lineWidth=1;
  for(let i=0;i<=n2;i++){const px=x+p+i*(w-2*p)/n2;g.beginPath();g.moveTo(px,y+p);g.lineTo(px,y+p+Math.min(h*.48,5*VS));g.stroke()}
  for(let i=0;i<n2;i++)if(rnd()<.75){const px=x+p+i*(w-2*p)/n2,cw=(w-2*p)/n2,cwid=Math.min(cw*.8,1.8*VS),clen=Math.min(h*.45,4.5*VS);tacCarDraw(g,px+cw/2,y+p+2+clen/2,clen,cwid,['#5a6470','#6e5a4a','#4a5a50','#707070'][Math.floor(rnd()*4)],1,dark)}}
 else if(kind==='mech'){box(x+p,y+p,w*.4,h*.45,dark?fc:'#4f555c');box(x+w*.55,y+p,w*.3,h*.3,dark?fc:'#4f555c');g.strokeStyle=lc;g.lineWidth=2;g.beginPath();g.moveTo(x+p,y+h*.75);g.lineTo(x+w-p,y+h*.75);g.stroke()}
 else if(kind==='shop'){box(x+p,y+h*.62,w*.55,u*.12);const n2=Math.max(1,Math.floor(w/(u*.5)));for(let i=0;i<n2;i++)box(x+p+i*(w-2*p)/n2,y+p,(w-2*p)/n2*.7,u*.1)}
 else if(kind==='lobby'){box(x+w*.35,y+h*.4,w*.3,u*.14);for(let k=0;k<2;k++)box(x+p+k*w*.6,y+h-p-u*.18,w*.25,u*.14)}
 else if(kind==='nurse'){box(x+p,y+h*.45,w-2*p,u*.14);box(x+p,y+p,u*.18,h*.3)}
 else if(kind==='court'){g.fillStyle=dark?fc:'#3a4034';g.fillRect(x,y,w,h);g.strokeStyle='rgba(255,255,255,.07)';g.lineWidth=1;for(let q=x+8;q<x+w;q+=12){g.beginPath();g.moveTo(q,y);g.lineTo(q,y+h);g.stroke()}
  for(let k2=0;k2<4;k2++){g.fillStyle='#3e5a32';g.beginPath();g.arc(x+w*(.2+.2*k2),y+h*(k2%2?.3:.7),u*.08,0,TAU);g.fill()}
  g.fillStyle='rgba(236,234,227,.55)';g.font='10px '+FONT;g.textAlign='center';g.textBaseline='middle';g.fillText('天井（露天）',x+w/2,y+h/2)}
 else if(kind==='engine'){tacFurn(g,r,'machine',seed,dark);g.fillStyle=dark?fc:'#5a4a3a';g.fillRect(x+w*.62,y+h*.2,w*.25,h*.6)}
 else if(kind==='lift'){box(x+p,y+p,w-2*p,h-2*p,dark?fc:'#5a6068');g.fillStyle='rgba(236,234,227,.7)';g.font='600 10px '+FONT;g.textAlign='center';g.textBaseline='middle';g.fillText('▲▼',x+w/2,y+h/2)}
 else if(kind==='pool'){g.fillStyle=dark?fc:'#2f6a8a';g.fillRect(x+p,y+p,w-2*p,h-2*p);g.strokeStyle=dark?lc:'#9ad0e8';g.lineWidth=1;for(let i=1;i<5;i++){g.beginPath();g.moveTo(x+p+(w-2*p)*i/5,y+p);g.lineTo(x+p+(w-2*p)*i/5,y+h-p);g.stroke()}}
 else if(kind==='machine'){box(x+w*.12,y+h*.2,w*.45,h*.4,dark?fc:'#4f555c');g.strokeStyle=lc;g.lineWidth=2;
  for(let k=0;k<2;k++){g.beginPath();g.arc(x+w*.25+k*w*.2,y+h*.4,u*.07,0,TAU);g.stroke()}
  g.lineWidth=1;g.beginPath();g.moveTo(x+w*.1,y+h*.78);g.lineTo(x+w*.9,y+h*.78);g.moveTo(x+w*.1,y+h*.84);g.lineTo(x+w*.9,y+h*.84);g.stroke()}}
// 窗戶在某側的外牆位置
function tacWinPt(G,c,s){const r=G.r(c);
 return s==='n'?[r[0]+r[2]/2,r[1]]:s==='s'?[r[0]+r[2]/2,r[1]+r[3]]:s==='e'?[r[0]+r[2],r[1]+r[3]/2]:[r[0],r[1]+r[3]/2]}
function tacSqPos(B,G,q,i){
 const vf=TAC.vf;
 const at=(f,c)=>{
  if(f<0){if(q.ty==='ladder')return null;
   if(q.task==='trans'&&q.side===q.ws&&q.lf===vf&&q.lc!==undefined){const w=tacWinPt(G,q.lc,q.ws),dv=TAC_SDV[q.ws];
    return[w[0]+dv[0]*26+(dv[1]?(i-1)*16:0),w[1]+dv[1]*26+(dv[0]?(i-1)*16:0)]}
   // 屋外待命：站在自己的車旁（面向建物）；車在畫面外就站在該側道路末端
   const tp=TAC.tp&&TAC.tp[q.u];
   if(tp&&(q.task==='idle'||q.task==='hold'||q.task==='sky')&&!q.prev&&!q.refill){const s=q.tside||q.side,hz=s==='n'||s==='s';
    const lane=s==='n'?G.by-22:s==='s'?G.by+G.bh+22:s==='w'?G.bx-22:G.bx+G.bw+22,o=((i%3)-1)*12;
    return hz?[tp[0]+o,lane]:[lane,tp[1]+o]}
   return tacStage(G,q.side,i)}
  if(f!==vf)return null;
  const p=G.ctr(c),n=B.L.N[c],o=G.t*.2;
  return[p[0]+((i%3)-1)*o,p[1]+(Math.floor(i/3)%2?o:-o*.3)+(n.ty==='stair'?-G.t*.2:0)]};
 const p=at(q.f,q.c);
 if(!q.mt||(q.nf===q.f&&q.nc===q.c))return p;
 const n=at(q.nf,q.nc),k0=Math.min(1,q.mt/tacStepTime(B,q,[q.nf,q.nc])),k=k0*k0*(3-2*k0);   // 緩起緩停
 if(p&&n)return[p[0]+(n[0]-p[0])*k,p[1]+(n[1]-p[1])*k];
 return p||n}
// 地板材質：木地板（臥室、客廳、辦公、病房）、磁磚（廚房、浴室）、水泥（倉庫、廠區、走廊、賣場）
function tacFloorPat(g,r,n,kd){
 const k=n.ty==='hall'?'hall':n.ty==='stair'?'':kd||n.kind;if(!k)return;
 g.save();g.beginPath();g.rect(r[0],r[1],r[2],r[3]);g.clip();g.lineWidth=1;
 if(k==='bed'||k==='living'||k==='office'||k==='ward'||k==='shop'||k==='care'||k==='bunk'||k==='shrine'||k==='clinic'||k==='act'){g.strokeStyle='rgba(120,90,60,.22)';const hz=r[2]>=r[3];
  for(let a=7;a<(hz?r[3]:r[2]);a+=7){g.beginPath();if(hz){g.moveTo(r[0],r[1]+a);g.lineTo(r[0]+r[2],r[1]+a)}else{g.moveTo(r[0]+a,r[1]);g.lineTo(r[0]+a,r[1]+r[3])}g.stroke()}}
 else if(k==='kitchen'||k==='bath'||k==='lobby'||k==='nurse'){g.strokeStyle='rgba(200,210,220,.12)';
  for(let a=10;a<r[2];a+=10){g.beginPath();g.moveTo(r[0]+a,r[1]);g.lineTo(r[0]+a,r[1]+r[3]);g.stroke()}
  for(let a=10;a<r[3];a+=10){g.beginPath();g.moveTo(r[0],r[1]+a);g.lineTo(r[0]+r[2],r[1]+a);g.stroke()}}
 else{g.fillStyle='rgba(255,255,255,.04)';for(let k2=0;k2<18;k2++){const a=(n.c*31+k2*17)%97/97,b=(n.c*13+k2*29)%89/89;g.fillRect(r[0]+a*r[2],r[1]+b*r[3],2,2)}}
 g.restore()}
// 俯視車輛：50×20、車頭朝右；依車種畫車頂設備
function tacVeh(g,u,T){
 const c=u.code;
 g.fillStyle='rgba(0,0,0,.35)';g.fillRect(1.5,2,50,20); // 陰影
 // 消防車一律消防紅，救護車白色、警車白色；車種靠車頂設備區分
 const body=u.trainee?(c==='91'?'#d8d6cc':'#9a4a40'):c==='91'||c==='警'?'#f2f2ee':'#c8332c';   // 訓練中心的除役車：褪色
 g.fillStyle=body;g.fillRect(0,0,50,20);g.strokeStyle='rgba(0,0,0,.35)';g.lineWidth=1;g.strokeRect(.5,.5,49,19);
 // 駕駛艙與擋風玻璃
 g.fillStyle=c==='91'||c==='警'?'#d8d8d2':'rgba(0,0,0,.18)';g.fillRect(38,1,11,18);
 g.fillStyle='#22303c';g.fillRect(45,3,3,14);
 // 警示燈條（閃爍）
 const on=(T*3+u.id)%1<.5;g.fillStyle=on?'#ff4a3a':'#4a8aff';g.fillRect(39,2,3,7);g.fillStyle=on?'#4a8aff':'#ff4a3a';g.fillRect(39,11,3,7);
 if(c==='21'||c==='31'){ // 雲梯：梯架與後方轉台
  g.strokeStyle='#d8d4c8';g.lineWidth=1.2;g.beginPath();g.moveTo(4,6);g.lineTo(37,6);g.moveTo(4,14);g.lineTo(37,14);
  for(let x=6;x<37;x+=4){g.moveTo(x,6);g.lineTo(x,14)}g.stroke();
  g.fillStyle='#5a5f66';g.beginPath();g.arc(6,10,4.5,0,TAU);g.fill()}
 else if(c==='61'){g.fillStyle='rgba(255,255,255,.25)';scRR(g,3,3,33,14,7);g.fill();g.strokeStyle='rgba(0,0,0,.25)';g.lineWidth=1;
  for(let x=10;x<36;x+=8){g.beginPath();g.moveTo(x,3);g.lineTo(x,17);g.stroke()}}
 else if(c==='91'){g.fillStyle='#2f8f6a';g.fillRect(0,8.5,38,3);g.fillStyle='#d8362f';g.fillRect(17,4,4,12);g.fillRect(13,8,12,4)}
 else if(c==='41'){g.fillStyle='rgba(0,0,0,.22)';g.fillRect(6,3,28,14);g.fillStyle='#f3c43b';g.fillRect(8,9,24,2);g.fillStyle='#eceae3';g.font='600 7px '+FONT;g.textAlign='center';g.textBaseline='middle';g.fillText('指揮',20,6)}
 else if(c==='75'){g.fillStyle='#3a3d44';g.beginPath();g.arc(18,10,6.5,0,TAU);g.fill();g.strokeStyle='#c9d0d8';g.lineWidth=1.2;g.beginPath();
  for(let k=0;k<3;k++){const a=k*TAU/3+T*6;g.moveTo(18,10);g.lineTo(18+Math.cos(a)*5.5,10+Math.sin(a)*5.5)}g.stroke()}
 else if(c==='71'||c==='搜'){g.strokeStyle='rgba(0,0,0,.3)';g.lineWidth=1;for(let x=5;x<36;x+=8){g.strokeRect(x,3,6,14)}}
 else if(c==='警'){g.fillStyle='#2f6fd0';g.fillRect(0,8,38,4);g.fillStyle='#22303c';g.fillRect(26,3,8,14)}
 else if(c==='機'){g.fillStyle='#d8b83a';g.fillRect(0,0,50,20);g.fillStyle='#c8332c';g.fillRect(0,8,38,4);g.fillStyle='#3a3d44';g.beginPath();g.arc(30,10,4,0,TAU);g.fill();g.fillStyle='#eceae3';g.fillRect(30,9,14,2)}
 else if(c==='43'){g.fillStyle='#3b2a24';g.fillRect(2,3,22,14);g.strokeStyle='#d8d4c8';g.lineWidth=1;g.strokeRect(4,5,18,10);g.fillStyle='#1a1a1a';g.fillRect(0,0,3,20)}
 else if(c==='履'){g.fillStyle='#222';g.fillRect(2,0,34,4);g.fillRect(2,16,34,4)}
 else{ // 幫浦車：水帶床、白色腰線
  g.fillStyle='rgba(0,0,0,.25)';g.fillRect(3,3,14,14);g.strokeStyle='rgba(255,255,255,.35)';g.lineWidth=1;
  for(let y=5;y<16;y+=3){g.beginPath();g.moveTo(4,y);g.lineTo(16,y);g.stroke()}
  g.fillStyle='rgba(255,255,255,.75)';g.fillRect(18,9,19,2);g.fillStyle='rgba(0,0,0,.22)';g.fillRect(20,3,15,5)}}
// 俯視人員：頭盔、空氣瓶、肩膀
function tacMan(g,x,y,r,col,a,opt){
 g.save();g.translate(x,y);g.rotate(a);
 g.fillStyle='rgba(0,0,0,.35)';g.beginPath();g.ellipse(1,1.5,r*1.25,r*.95,0,0,TAU);g.fill();
 // 行走時兩腳交替（步伐）
 if(opt.step){const s=opt.step*r*.45;g.fillStyle='#14141a';g.beginPath();g.ellipse(s,-r*.45,r*.32,r*.22,0,0,TAU);g.ellipse(-s,r*.45,r*.32,r*.22,0,0,TAU);g.fill()}
 g.fillStyle=opt.coat||'#1e2c52';g.beginPath();g.ellipse(0,0,r*.85,r*1.2,0,0,TAU);g.fill();
 if(opt.scba){g.fillStyle='#c9d0d8';scRR(g,-r*1.05,-r*.45,r*.5,r*.9,r*.15);g.fill()}
 g.fillStyle=col;g.beginPath();g.arc(r*.1,0,r*.62,0,TAU);g.fill();
 g.fillStyle='rgba(0,0,0,.35)';g.fillRect(r*.35,-r*.25,r*.3,r*.5);
 g.restore()}
// 兩個相鄰空間之間的門（共用邊的中點）
function tacDoorMid(G,a,b){const ra=G.r(a),rb=G.r(b);return[(Math.max(ra[0],rb[0])+Math.min(ra[0]+ra[2],rb[0]+rb[2]))/2,(Math.max(ra[1],rb[1])+Math.min(ra[1]+ra[3],rb[1]+rb[3]))/2]}
// 屋外水帶：車 → 垂直拉到牆外通道 → 沿通道（轉角處轉彎）→ 入口門外 → 門口；o 為並排錯開量
function tacHoseOut(B,G,ts,tp,es,d,o){
 const lane=s=>s==='n'?G.by-16-o:s==='s'?G.by+G.bh+16+o:s==='w'?G.bx-16-o:G.bx+G.bw+16+o;
 const hz=s=>s==='n'||s==='s',pts=[[tp[0],tp[1]]];
 const onLane=(s,p)=>hz(s)?[p[0],lane(s)]:[lane(s),p[1]];
 pts.push(onLane(ts,tp));
 let cur=ts;
 const turn=to=>{const c=hz(cur)?[lane(to),lane(cur)]:[lane(cur),lane(to)];pts.push(c);cur=to};
 if(ts!==es){if(tacOpp(ts,es)){const via=hz(ts)?(B.sd.e.road||!B.sd.w.road?'e':'w'):(B.sd.s.road||!B.sd.n.road?'s':'n');turn(via)}turn(es)}
 const dd=hz(es)?[d[0]+o*.6,d[1]]:[d[0],d[1]+o*.6];
 pts.push(onLane(es,dd));pts.push(dd);
 return pts}
const tacPfCol=(pf,a)=>(pf>=.7?'rgba(125,179,232,':pf>=.4?'rgba(233,161,59,':'rgba(226,86,79,')+a+')';
function drawTac(){
 const inc=S.inc.find(i=>i.id===TAC.id);
 if(!inc||!inc.tac){const b=TAC.B;
  tacClose(b&&b.done?(b.burnt>b.R*b.F*.5?'建物燒毀':'戰術指揮完成')+'：救出 '+b.resc+' 名'+(b.burnt?'、燒毀 '+b.burnt+' 室':'')+(b.lost?'、罹難 '+b.lost+' 名':'')+(b.lodd?'、殉職 '+b.lodd+' 組':''):'戰術指揮失敗：案件逾時，火勢未能控制');return}
 const B=inc.tac,g=tctx,G=tacGeo(B),T=S.t,L=B.L,t=G.t;
 if(TAC.vf===undefined||TAC.vf>B.F)TAC.vf=Math.min(B.F-1,B.of);
 if(B.out)TAC.vf=0;
 const vf=TAC.vf;
 TAC.hits=[];
 g.fillStyle='#0d1015';g.fillRect(0,0,tW,tH);
 // 四周：道路（含名稱與大型車限制）、鄰棟、水域
 for(const s of ['w','e','n','s']){const b=G.band[s],d=B.sd[s];
  if(d.road){g.fillStyle=d.big?'#2a2a27':'#232320';g.fillRect(b[0],b[1],b[2],b[3]);
   g.strokeStyle='rgba(233,231,224,.16)';g.setLineDash([12,10]);g.beginPath();
   if(s==='n'||s==='s'){g.moveTo(b[0],b[1]+b[3]/2);g.lineTo(b[0]+b[2],b[1]+b[3]/2)}else{g.moveTo(b[0]+b[2]/2,b[1]);g.lineTo(b[0]+b[2]/2,b[1]+b[3])}
   g.stroke();g.setLineDash([]);tacRoadDeco(g,b,d,s);
   TAC.hits.push({t:'side',s,x:b[0],y:b[1],w:b[2],h:b[3]})}
  else{tacBandBg(g,b,d,s,T);
   if(B.exp[s]!==undefined){const ex=B.exp[s];
    if(ex>.02){g.fillStyle=B.expL[s]?'rgba(255,90,30,'+(.35+.15*Math.sin(T*6)).toFixed(2)+')':'rgba(255,110,40,'+(ex*.5).toFixed(2)+')';g.fillRect(b[0],b[1],b[2],b[3])}
    TAC.hits.push({t:'side',s,x:b[0],y:b[1],w:b[2],h:b[3]})}
   if(!TAC_BANDT[d.nm]){g.strokeStyle='rgba(255,255,255,.05)';g.lineWidth=1;g.beginPath();
    for(let k=-b[3];k<b[2];k+=10){g.moveTo(b[0]+k,b[1]+b[3]);g.lineTo(b[0]+k+b[3],b[1])}g.save();g.rect(b[0],b[1],b[2],b[3]);g.clip();g.stroke();g.restore()}}}
 for(const s of TAC_SIDES){const b=G.band[s],d=B.sd[s];
  g.font='11px '+FONT;g.fillStyle=d.road?(d.big?'#9d9a92':'#e9a13b'):'#6b6960';g.textBaseline='middle';
  const lb=TAC_SDN[s]+'側 '+d.nm+(d.road&&!d.big?'（大型車禁入）':'')+(B.exp[s]!==undefined?(B.expL[s]?' 已延燒！':' 受熱 '+Math.round(B.exp[s]*100)+'%'):'');
  if(B.exp[s]>.5)g.fillStyle='#ff8a6a';
  if(s==='n'||s==='s'){g.textAlign='left';g.fillText(lb,b[0]+6,b[1]+b[3]/2)}
  else{g.save();g.translate(b[0]+b[2]/2,b[1]+b[3]-8);g.rotate(-Math.PI/2);g.textAlign='left';g.fillText(lb,0,0);g.restore()}}
 // 車輛：依真實車長與間距停在建物各側道路上（見 tacParkPlan）；停不下的列為「已抵達（畫面外）」
 const TP={},PL=tacParkPlan(inc,B,G);TAC.off=PL.off;TAC.tp=TP;
 for(const v of PL.cars){const u=v.u;TP[u.id]=v.hp;
  g.save();if(v.ghost)g.globalAlpha=.45;
  g.translate(v.x,v.y);if(v.vert)g.rotate(Math.PI/2);
  // 車寬依車長等比例（約 1:2.6），不會被壓成方塊
  g.scale(v.len/50,v.wid/20);g.translate(-25,-10);tacVeh(g,u,T);g.restore();
  g.fillStyle='rgba(236,234,227,.55)';g.font='9px '+FONT;g.textAlign='center';
  if(v.vert){g.save();g.translate(v.x+(v.s==='w'?18:-18),v.y);g.rotate(-Math.PI/2);g.textBaseline='middle';g.fillText(u.cs,0,0);g.restore()}
  else{g.textBaseline=v.s==='n'?'bottom':'top';g.fillText(u.cs,v.x,v.s==='n'?v.y-11:v.y+11)}}
 // 畫面外的車：在各側道路末端標示數量
 for(const s of TAC_SIDES){const n=PL.off.filter(o=>o.s===s).length;if(!n)continue;const e=PL.edge[s];TP.off=TP.off||{};
  g.fillStyle='rgba(10,10,9,.8)';const lb='畫面外 '+n+' 輛 '+(s==='n'||s==='s'?'→':'↓');g.font='600 10px '+FONT;const tw=g.measureText(lb).width+10;
  scRR(g,e[0]-tw/2,e[1]-8,tw,16,4);g.fill();g.fillStyle='#e9a13b';g.textAlign='center';g.textBaseline='middle';g.fillText(lb,e[0],e[1])}
 for(const o of PL.off)TP[o.u.id]=PL.edge[o.s];
 // 消防栓與供水管
 if(B.hyd){const b=G.band[B.hyd.side],s=B.hyd.side;
  const hp=s==='n'||s==='s'?[Math.min(b[0]+b[2]-20,G.bx+G.bw+40),b[1]+b[3]/2]:[b[0]+b[2]/2,Math.min(b[1]+b[3]-20,G.by+G.bh+40)];
  const sup=B.sq.find(q=>q.ty==='pump'&&q.tside===s&&!q.tmv);
  if(sup&&TP[sup.u]){g.strokeStyle='rgba(125,179,232,.85)';g.lineWidth=4;g.beginPath();g.moveTo(hp[0],hp[1]);g.lineTo(TP[sup.u][0],TP[sup.u][1]);g.stroke()}
  g.fillStyle='#c8332c';g.beginPath();g.arc(hp[0],hp[1],8,0,TAU);g.fill();g.fillStyle='#fff';g.font='600 9px '+FONT;g.textAlign='center';g.textBaseline='middle';g.fillText('栓',hp[0],hp[1]);
  g.fillStyle=sup?'#7db3e8':'#e2564f';g.font='10px '+FONT;g.fillText(tacHydN(B)+' '+B.hyd.d+'m'+(sup?'':B.hyd.draft?'（未吸水）':'（未佔水）'),hp[0],hp[1]+(s==='n'||s==='s'?16:-16))}
 if(vf>=B.F){ // 屋頂俯視：樓梯間出入口、屋頂排煙口、避難民眾
  g.fillStyle='#3a3833';g.fillRect(G.bx-5,G.by-5,G.bw+10,G.bh+10);
  g.strokeStyle='rgba(255,255,255,.06)';g.lineWidth=1;for(let k=10;k<G.bw;k+=16){g.beginPath();g.moveTo(G.bx+k,G.by);g.lineTo(G.bx+k,G.by+G.bh);g.stroke()}
  TAC.hits.push({t:'roof',x:G.bx,y:G.by,w:G.bw,h:G.bh});
  for(const n of L.N){if(n.ty!=='stair')continue;const r=G.r(n.c),x=tacCel(B,B.F-1,n.c);
   g.fillStyle=B.roof?'#07080a':'#55514a';g.fillRect(r[0]+r[2]*.15,r[1]+r[3]*.35,r[2]*.7,r[3]*.3);
   if(B.roof&&x.s>.05)for(let k=0;k<3;k++){const ph=(T*.5+k/3)%1;g.fillStyle='rgba(120,122,128,'+(x.s*.6*(1-ph)+.05).toFixed(3)+')';
    g.beginPath();g.arc(r[0]+r[2]/2+(k-1)*8,r[1]+r[3]/2-ph*40,5+ph*10,0,TAU);g.fill()}
   g.fillStyle='#eceae3';g.font='10px '+FONT;g.textAlign='center';g.textBaseline='middle';g.fillText(B.roof?'排煙口 開':'屋頂出入口',r[0]+r[2]/2,r[1]+r[3]*.25)}
  for(const n of L.N){const x=tacCel(B,B.F-1,n.c);if(!x.vv)continue;const r=G.r(n.c);
   g.fillStyle='#07080a';g.fillRect(r[0]+r[2]*.35,r[1]+r[3]*.35,r[2]*.3,r[3]*.3);
   for(let k=0;k<3;k++){const ph=(T*.6+k/3)%1;g.fillStyle='rgba(140,142,148,'+((1-ph)*.6).toFixed(2)+')';g.beginPath();g.arc(r[0]+r[2]/2,r[1]+r[3]/2-ph*30,5+ph*10,0,TAU);g.fill()}
   g.fillStyle='#eceae3';g.font='10px '+FONT;g.textAlign='center';g.textBaseline='top';g.fillText('垂直排煙口',r[0]+r[2]/2,r[1]+r[3]*.68)}
  // 屋頂光電板：板陣列與火勢
  if(B.rf){for(const n of L.N){if(n.ty!=='room'||n.c%2)continue;const r=G.r(n.c);
    g.fillStyle=B.rf.h>0?'#2a3550':'#1f2738';g.fillRect(r[0]+6,r[1]+6,r[2]-12,r[3]-12);g.strokeStyle='rgba(140,170,220,.35)';g.lineWidth=1;
    for(let k=r[0]+6;k<r[0]+r[2]-6;k+=12){g.beginPath();g.moveTo(k,r[1]+6);g.lineTo(k,r[1]+r[3]-6);g.stroke()}
    if(B.rf.h>0)for(let k=0;k<Math.ceil(B.rf.h*4);k++){const fx=r[0]+r[2]*(.2+.6*((n.c*7+k*13)%11/11)),fy=r[1]+r[3]*(.2+.6*((n.c*3+k*5)%7/7)),fr=t*.12*(.8+.3*Math.sin(T*8+k));
     tacFlameGlow(g,fx,fy,fr*1.6)}}
   g.fillStyle=B.rf.h>0?'#ff8a6a':'#5dcaa5';g.font='600 12px '+FONT;g.textAlign='center';g.textBaseline='bottom';
   g.fillText(B.rf.h>0?'光電板燃燒 '+Math.round(B.rf.h*100)+'%　'+(inc.pow>=2?'台電已斷電':'帶電中：僅能水霧遠距射水'):'光電板火勢已撲滅',G.bx+G.bw/2,G.by+G.bh-8)}
  const vc=[G.bx+G.bw*.62,G.by+G.bh*.5];
  if(B.roofV>0){
   if(B.roofS){for(let k=0;k<B.roofV;k++){const a=k*1.3;tacMan(g,vc[0]+Math.cos(a)*t*.25,vc[1]+Math.sin(a)*t*.25,6,'#d9bfae',a,{coat:'#7a4a9a'})}
    g.fillStyle='#ff5a4a';g.font='600 12px '+FONT;g.textAlign='center';g.fillText('屋頂避難 '+B.roofV+' 名',vc[0],vc[1]-t*.45)}
   else{g.fillStyle='#e9a13b';g.font='600 12px '+FONT;g.textAlign='center';g.fillText('通報：有民眾逃往屋頂（尚未確認人數）',vc[0],vc[1])}}
  else{g.fillStyle='rgba(236,234,227,.4)';g.font='12px '+FONT;g.textAlign='center';g.fillText(B.roofS?'屋頂已確認無人':'屋頂（點選可派員或雲梯登頂）',vc[0],vc[1])}}
 else{
 // 現場站點（帳篷）：排在各自那側道路的末端
 {// 每個路口依大小排成格子（每格 56×44），大的路口先用
  const slots=[];
  tacCorners(G,B.arr).map((cr,o)=>({cr,o,cap:Math.max(1,Math.floor(cr[2]/56))*Math.max(1,Math.floor(cr[3]/44))}))
   .sort((a,b)=>b.cap-a.cap||a.o-b.o).forEach(({cr})=>{const cl=Math.max(1,Math.floor(cr[2]/56)),rw=Math.max(1,Math.floor(cr[3]/44));
    for(let j=0;j<rw;j++)for(let i=0;i<cl;i++)slots.push([cr[0]+cr[2]*(i+.5)/cl,cr[1]+cr[3]*(j+.5)/rw-8])});
  let i=0;
  for(const d of TAC_STN){const o=B.st[d.k];if(!o)continue;
   const sp=slots[i++%slots.length],x=sp[0],y=sp[1];
   g.fillStyle=d.k==='icp'?'#e9a13b':d.k==='triage'||d.k==='treat'?'#5dcaa5':d.k==='air'?'#7db3e8':d.k==='rehab'?'#afa9ec':'#9d9a92';
   g.beginPath();g.moveTo(x-12,y+8);g.lineTo(x,y-9);g.lineTo(x+12,y+8);g.closePath();g.fill();
   g.fillStyle='#eceae3';g.font='10px '+FONT;g.textAlign='center';g.textBaseline='top';g.fillText(d.n,x,y+10)}}
 // 傷患集結處：在抵達側入口旁，依檢傷顏色排列
 if(B.pts.length||onScene(inc).some(u=>u.load>0)){const e=B.ents.find(x=>x.side===B.arr)||B.ents[0],d=tacDoor(G,e.side),dv=TAC_SDV[e.side];
  const bx=d[0]+dv[0]*34+(dv[0]?0:G.t*.6),by=d[1]+dv[1]*34+(dv[1]?0:G.t*.6);
  g.fillStyle='rgba(236,234,227,.12)';g.fillRect(bx-36,by-16,90,32);
  B.pts.forEach((p,i)=>{g.fillStyle=p.sev==='red'?'#e2564f':p.sev==='yellow'?'#e9a13b':'#5dcaa5';g.beginPath();g.arc(bx-28+(i%8)*10,by-6+Math.floor(i/8)*10,4,0,TAU);g.fill()});
  g.fillStyle='#eceae3';g.font='10px '+FONT;g.textAlign='left';g.textBaseline='top';g.fillText('傷患集結 '+B.pts.length,bx-34,by+6)}
 // 建物外牆底
 if(B.out)tacYardBase(g,G,B);else{g.fillStyle='#4a463f';g.fillRect(G.bx-5,G.by-5,G.bw+10,G.bh+10)}
 const burnt=x=>x.ty!=='stair'&&x.fu<.05;
 for(const n of L.N){
  const x=tacCel(B,vf,n.c),r=G.r(n.c);
  TAC.hits.push({t:'cell',f:vf,c:n.c,x:r[0],y:r[1],w:r[2],h:r[3]});
  const kd=vf<B.F?tacK(B,vf,n.c):n.kind;
  if(B.out)tacYardCell(g,G,B,n,x,r,T);else{
  g.fillStyle=burnt(x)?'#141210':n.ty==='room'?'#2b2722':n.ty==='hall'?'#38352f':'#23262c';g.fillRect(r[0],r[1],r[2],r[3]);
  if(!burnt(x))tacFloorPat(g,r,n,kd);
  if(n.ty==='room')tacFurn(g,r,kd,n.c*7+vf*3+1,burnt(x)||x.fu<.3);
  if(n.atr)tacAtr(g,r,vf===B.F-1);
  if(n.ty==='hall'){g.strokeStyle='rgba(255,255,255,.05)';g.lineWidth=1;for(let k=1;k<4;k++){g.beginPath();g.moveTo(r[0]+r[2]*k/4,r[1]);g.lineTo(r[0]+r[2]*k/4,r[1]+r[3]);g.stroke()}}}
  if(n.ty==='stair'){
   g.strokeStyle='rgba(200,200,190,.25)';g.lineWidth=1;
   for(let k=1;k<10;k++){const yy=r[1]+r[3]*k/10;g.beginPath();g.moveTo(r[0]+r[2]*.12,yy);g.lineTo(r[0]+r[2]*.88,yy);g.stroke()}
   g.fillStyle='rgba(236,234,227,.55)';g.font='600 11px '+FONT;g.textAlign='center';g.textBaseline='middle';
   g.fillText('▲ '+(vf<B.F-1?tacFlr(B,vf+1):(B.roof?'屋頂 開':'屋頂')),r[0]+r[2]/2,r[1]+14);
   g.fillText(vf===B.bf?'▼ 出口'+(B.bf?'／B1':''):vf>0?'▼ '+tacFlr(B,vf-1):'',r[0]+r[2]/2,r[1]+r[3]-14);
   if(B.sp){g.fillStyle=B.sp.on?'#7db3e8':'#6b6960';g.font='10px '+FONT;g.fillText(B.sp.on?'出水口 ●':'出水口',r[0]+r[2]/2,r[1]+r[3]*.32)}
   // 多座樓梯：編號與攻擊梯／避難梯
   const sts=L.N.filter(m=>m.ty==='stair');
   if(sts.length>1){const no=sts.indexOf(n)+1,ev=B.evS!==undefined?n.c===B.evS:!!(B.atkS&&B.atkS.size&&!B.atkS.has(n.c)),atk=!ev&&(B.evS!==undefined||(B.atkS&&B.atkS.has(n.c)));
    g.font='600 10px '+FONT;g.fillStyle=atk?'#e9a13b':ev?'#5dcaa5':'rgba(236,234,227,.45)';g.fillText(no+'號梯'+(atk?'・攻擊':ev?'・避難':''),r[0]+r[2]/2,r[1]+r[3]*.68)}}
  if(x.h>.02){g.fillStyle='rgba(255,'+(110-x.h*60|0)+',30,'+(x.h*.45).toFixed(3)+')';g.fillRect(r[0],r[1],r[2],r[3])}
  if(x.h>.15){const nF=Math.ceil(x.h*6);
   for(let k=0;k<nF;k++){const sd=(n.c*7+k*13)%17/17,sd2=(n.c*3+k*29)%19/19;
    const fx=r[0]+r[2]*(.15+.7*sd),fy=r[1]+r[3]*(.15+.7*sd2),fr=t*(.06+.1*x.h)*(.8+.25*Math.sin(T*9+k*2));
    tacFlameGlow(g,fx,fy,fr*1.6)}}
  if(n.ty==='room'){
   if(x.srch>=1){
    for(let k=0;k<x.vic;k++){const vx=r[0]+r[2]*.25+k*t*.16,vy=r[1]+r[3]*.72;
     g.fillStyle='#7a4a9a';g.beginPath();g.ellipse(vx,vy,t*.07,t*.03,0,0,TAU);g.fill();
     g.fillStyle='#d9bfae';g.beginPath();g.arc(vx+t*.08,vy,t*.025,0,TAU);g.fill()}
    if(x.vic&&(T*2)%1<.6){g.fillStyle='#ff5a4a';g.font='600 10px '+FONT;g.textAlign='left';g.textBaseline='bottom';g.fillText('受困 '+x.vic+(x.bedv?'（臥床 '+x.bedv+'）':''),r[0]+r[2]*.18,r[1]+r[3]*.64)}
    if(!x.vic&&!B.wild&&!(B.sc&&B.out)&&!n.court){g.fillStyle=x.sl>=2?'rgba(93,202,165,.75)':'rgba(233,161,59,.75)';g.font='600 10px '+FONT;g.textAlign='left';g.textBaseline='top';g.fillText(x.sl>=2?'次搜✓':'初搜',r[0]+4,r[1]+4)}
    if(x.sl===1&&x.s2>0&&x.s2<1){g.fillStyle='rgba(93,202,165,.85)';g.fillRect(r[0]+4,r[1]+r[3]-6,(r[2]-8)*x.s2,3)}}
   else{
    if(x.srch>0){g.fillStyle='rgba(125,179,232,.85)';g.fillRect(r[0]+4,r[1]+r[3]-6,(r[2]-8)*x.srch,3)}
    g.fillStyle='rgba(236,234,227,.2)';g.font='600 '+Math.max(12,t*.22|0)+'px '+FONT;g.textAlign='center';g.textBaseline='middle';
    g.fillText('?',r[0]+r[2]/2,r[1]+r[3]/2)}
   g.fillStyle='rgba(236,234,227,.45)';g.font='10px '+FONT;g.textAlign='right';g.textBaseline='top';
   if(B.out){g.textAlign='left';g.fillStyle='rgba(236,234,227,.6)';g.fillText(tacYardNm(B,n.c),r[0]+(x.srch>=1&&!x.vic?36:5),r[1]+4)}else{
   g.fillText(tacRm(B,vf,vf<B.bf?n.bi:n.no),r[0]+r[2]-5,r[1]+4);
   g.textAlign='left';g.fillStyle='rgba(236,234,227,.4)';g.fillText(TAC_RK[kd].n,r[0]+(x.srch>=1&&!x.vic?36:5),r[1]+4)}}
  if(x.s>.03){g.fillStyle='rgba(66,68,74,'+(.12+.68*x.s).toFixed(3)+')';g.fillRect(r[0],r[1],r[2],r[3]);
   for(let k=0;k<3;k++){const ph=(T*.15+k/3+n.c*.13)%1;g.fillStyle='rgba(120,122,128,'+(x.s*.18).toFixed(3)+')';
    g.beginPath();g.arc(r[0]+r[2]*(.2+.6*ph),r[1]+r[3]*(.3+.4*((k*.37+n.c*.21)%1)),t*.18,0,TAU);g.fill()}}}
 // 牆與門
 g.strokeStyle='#8a857a';g.lineWidth=3;
 const opn=vf<B.bf; // 地下停車場：開放空間，只畫柱列與停車區標線
 for(const n of L.N){const r=G.r(n.c);if(B.out)continue;
  if(opn&&n.nbO){g.save();g.strokeStyle='rgba(233,200,90,.18)';g.lineWidth=1;g.setLineDash([6,5]);g.strokeRect(r[0]+2,r[1]+2,r[2]-4,r[3]-4);g.restore();
   g.fillStyle='#8a857a';for(const p of[[r[0],r[1]],[r[0]+r[2],r[1]],[r[0],r[1]+r[3]],[r[0]+r[2],r[1]+r[3]]])g.fillRect(p[0]-4,p[1]-4,8,8)}
  else g.strokeRect(r[0],r[1],r[2],r[3])}
 if(opn&&B.ramp&&B.ramp.f===vf){const r=G.r(B.ramp.c),s2=B.ramp.side;g.save();g.fillStyle='rgba(233,200,90,.12)';
  const rw=s2==='n'||s2==='s'?[r[0]+r[2]*.3,s2==='n'?r[1]:r[1]+r[3]*.55,r[2]*.4,r[3]*.45]:[s2==='w'?r[0]:r[0]+r[2]*.55,r[1]+r[3]*.3,r[2]*.45,r[3]*.4];
  g.fillRect(rw[0],rw[1],rw[2],rw[3]);g.strokeStyle='rgba(233,200,90,.4)';g.lineWidth=1;for(let k=1;k<6;k++){g.beginPath();
   if(s2==='n'||s2==='s'){const yy=rw[1]+rw[3]*k/6;g.moveTo(rw[0],yy);g.lineTo(rw[0]+rw[2],yy)}else{const xx=rw[0]+rw[2]*k/6;g.moveTo(xx,rw[1]);g.lineTo(xx,rw[1]+rw[3])}g.stroke()}
  g.fillStyle='#e9c85a';g.font='600 10px '+FONT;g.textAlign='center';g.textBaseline='middle';g.fillText('車道坡道',rw[0]+rw[2]/2,rw[1]+rw[3]/2);g.restore()}
 // 分戶：每戶外圍以較粗的分戶牆框起
 if(L.nu&&vf>=B.bf){g.strokeStyle='#a69f90';g.lineWidth=5;
  for(let u=0;u<L.nu;u++){const rs=L.N.filter(n=>n.u===u).map(n=>G.r(n.c));if(!rs.length)continue;
   const x0=Math.min(...rs.map(r=>r[0])),y0=Math.min(...rs.map(r=>r[1])),x1=Math.max(...rs.map(r=>r[0]+r[2])),y1=Math.max(...rs.map(r=>r[1]+r[3]));g.strokeRect(x0,y0,x1-x0,y1-y0)}}
 if(!B.out){g.strokeStyle='#bdb6a8';g.lineWidth=7;g.strokeRect(G.bx-1,G.by-1,G.bw+2,G.bh+2);
 g.strokeStyle='#5c574f';g.lineWidth=1.5;g.strokeRect(G.bx+2.5,G.by+2.5,G.bw-5,G.bh-5)}
 const flr=c=>{const x=tacCel(B,vf,c),n=L.N[c];return burnt(x)?'#141210':n.ty==='room'?'#2b2722':n.ty==='hall'?'#38352f':'#23262c'};
 for(const a of L.N)for(const bc of a.nb){if(bc<a.c||(opn&&a.nbO&&L.N[bc].nbO)||(B.out&&!a.walled&&!L.N[bc].walled))continue;const ra=G.r(a.c),rb=G.r(bc);let s;
  if(Math.abs(ra[1]+ra[3]-rb[1])<1||Math.abs(rb[1]+rb[3]-ra[1])<1){const y=Math.abs(ra[1]+ra[3]-rb[1])<1?rb[1]:ra[1];
   const x0=Math.max(ra[0],rb[0]),x1=Math.min(ra[0]+ra[2],rb[0]+rb[2]);s=[(x0+x1)/2-t*.14,y-3,t*.28,6]}
  else{const x=Math.abs(ra[0]+ra[2]-rb[0])<1?rb[0]:ra[0];const y0=Math.max(ra[1],rb[1]),y1=Math.min(ra[1]+ra[3],rb[1]+rb[3]);s=[x-3,(y0+y1)/2-t*.14,6,t*.28]}
  const opg=tacOpn(B,a.c,bc);if(opg){if(s[2]>s[3]){s[0]-=t*.16;s[2]+=t*.32}else{s[1]-=t*.16;s[3]+=t*.32}}   // 沒有門的開口：畫成較寬的缺口
  g.fillStyle=flr(a.ty==='room'?bc:a.c);g.fillRect(s[0],s[1],s[2],s[3]);
  if(!opg&&!(vf<B.F&&tacShut(B,vf,a.c,bc))){const rm=a.ty==='room'?a:L.N[bc],rr=G.r(rm.c),dw=t*.17;
   g.strokeStyle='rgba(200,190,170,.55)';g.lineWidth=1;g.beginPath();
   if(s[2]>s[3]){const hx=s[0],hy=s[1]+3,dir=rr[1]>hy-3?1:-1;g.moveTo(hx,hy);g.lineTo(hx,hy+dir*dw);g.arc(hx,hy,dw,dir>0?Math.PI/2:-Math.PI/2,0,dir<0)}
   else{const hx=s[0]+3,hy=s[1],dir=rr[0]>hx-3?1:-1;g.moveTo(hx,hy);g.lineTo(hx+dir*dw,hy);g.arc(hx,hy,dw,dir>0?0:Math.PI,Math.PI/2,dir<0)}
   g.stroke()}
  if(vf<B.F&&tacShut(B,vf,a.c,bc)){g.fillStyle='#b5853f';if(s[2]>s[3])g.fillRect(s[0],s[1]+1.5,s[2],3);else g.fillRect(s[0]+1.5,s[1],3,s[3])}
  else if(vf<B.F&&tacLeakC(B,vf,a.c,bc)){g.fillStyle='#8a7860';const nn=4;for(let k=0;k<nn;k++){if(s[2]>s[3])g.fillRect(s[0]+s[2]*k/nn,s[1]+1.5,s[2]/nn-1.5,3);else g.fillRect(s[0]+1.5,s[1]+s[3]*k/nn,3,s[3]/nn-1.5)}}}
 // 化學品危害區、場區遮雨棚與風向
 tacHazDraw(g,G,B,vf);tacZoneDraw(g,G,B,vf);if(B.out)tacYardTop(g,G,B,T);tacSysDraw(g,G,B,vf);tacDPulseDraw(g,G,B,vf,T);tacVeisDraw(g,G,B,vf);tacSc4LedgeDraw(g,G,B,vf,T);tacSmokeArrows(g,G,B,vf,T);tacOutSmokeDraw(g,G,B,T);tacTgtDraw(g,G,B,vf,T,B.sq.filter(q=>TAC.ms.indexOf(q.u)>=0||q.u===TAC.sq));
 // 撒水頭動作的空間：藍色水滴
 if(B.spk&&B.spk.ok&&vf<B.F)for(const n of L.N){const x=tacCel(B,vf,n.c);if(!x.spkOn)continue;const r=G.r(n.c);
  for(let k=0;k<5;k++){const ph=(T*1.5+k/5)%1;g.fillStyle='rgba(125,179,232,'+(.7*(1-ph)).toFixed(2)+')';g.beginPath();g.arc(r[0]+r[2]*(.15+.7*((k*37+n.c*11)%17/17)),r[1]+r[3]*(.15+ph*.7),2.2,0,TAU);g.fill()}}
 // 氣體偵測標記：量過的空間角落顯示「偵」，超標為紅色
 if(vf<B.F)for(const n of L.N){const x=tacCel(B,vf,n.c);if(!x.gm)continue;const r=G.r(n.c),bad=tacGasBad(x.gm).length;
  g.fillStyle=bad?'#a8362f':'#2f5f8a';g.fillRect(r[0]+4,r[1]+r[3]-20,20,16);g.fillStyle='#eceae3';g.font='600 10px '+FONT;g.textAlign='center';g.textBaseline='middle';g.fillText('偵',r[0]+14,r[1]+r[3]-12)}
 // 氣爆瓦礫
 if(vf<B.F)for(const n of L.N){const x=tacCel(B,vf,n.c);if(!x.rub)continue;const r=G.r(n.c);
  for(let k=0;k<14;k++){const a=(n.c*17+k*31)%97/97,b=(n.c*7+k*13)%89/89,sz=6+(k*7)%9;g.fillStyle=k%3?'#5a5048':'#6e6258';
   g.save();g.translate(r[0]+r[2]*(.1+.8*a),r[1]+r[3]*(.1+.8*b));g.rotate(k);g.fillRect(-sz/2,-sz/3,sz,sz*.66);g.restore()}
  g.fillStyle='rgba(233,161,59,.9)';g.font='600 10px '+FONT;g.textAlign='center';g.textBaseline='bottom';g.fillText('瓦礫',r[0]+r[2]/2,r[1]+r[3]-4)}
 // 外牆室外機火
 if(B.ext&&B.ext.h>0&&(vf===B.ext.f||vf===B.ext.f+1)){const w=tacWinPt(G,B.ext.c,B.ext.side),dv=TAC_SDV[B.ext.side],up=vf===B.ext.f+1;
  const fx=w[0]+dv[0]*14,fy=w[1]+dv[1]*14,fr=t*(up?.12:.2)*B.ext.h*(.85+.2*Math.sin(T*9));
  tacFlameGlow(g,fx,fy,fr*1.8,up?.55:1);
  g.fillStyle='#ff8a6a';g.font='600 10px '+FONT;g.textAlign='center';g.textBaseline='middle';g.fillText(up?'下層外牆火往上竄':'室外機火 '+Math.round(B.ext.h*100)+'%',fx+dv[0]*30+(dv[0]?0:0),fy+dv[1]*22+(dv[1]?0:-18))}
 // 防火門（樓梯間）：已知樓層才顯示狀態
 if(vf<B.F&&B.fd){g.font='600 9px '+FONT;g.textAlign='center';g.textBaseline='middle';
  for(const[key,d]of B.fd){if(d.f!==vf)continue;
   const co=G.ctr(d.o),[m0,m1]=tacDoorMid(G,d.s,d.o);
   // 標籤往走廊那側偏一點，避免蓋住樓梯間的文字
   const dl=Math.hypot(co[0]-m0,co[1]-m1)||1,mx=m0+(co[0]-m0)/dl*12,my=m1+(co[1]-m1)/dl*12;
   const kn=B.fdK.has(vf),shut=B.cd.has(key),held=B.fdO.has(key)&&B.fdO.get(key).w;
   const lb=!kn?'防?':d.t==='gone'?'拆除':d.t==='wedge'?'卡住':held?'水帶卡':shut?'防火門':d.t==='mag'?'常開':'開';
   const col=!kn?'#9d9a92':d.t==='gone'||d.t==='wedge'||held?'#e2564f':shut?'#d0a050':'#7db3e8';
   g.fillStyle='rgba(20,18,16,.85)';g.fillRect(mx-16,my-7,32,14);g.strokeStyle=col;g.lineWidth=1.2;g.strokeRect(mx-16,my-7,32,14);
   if(kn&&d.t==='gone'){g.setLineDash([2,2]);g.strokeRect(mx-16,my-7,32,14);g.setLineDash([])}
   g.fillStyle=col;g.fillText(lb,mx,my+.5)}}
 // 上鎖的房門（紅叉）、門控位置
 if(vf<B.F){
  for(const a of L.N)for(const bc of a.nb){if(bc<a.c)continue;
   const lk=B.lk.has(tacDK(B,vf,a.c,bc))&&!!B.lkK&&B.lkK.has(tacDK(B,vf,a.c,bc)),dcx=B.dcN&&(B.dcN.has(vf*B.W+a.c)||B.dcN.has(vf*B.W+bc));
   if(!lk&&!dcx)continue;const [mx,my]=tacDoorMid(G,a.c,bc);
   if(lk){g.strokeStyle='#e2564f';g.lineWidth=2;g.beginPath();g.moveTo(mx-5,my-5);g.lineTo(mx+5,my+5);g.moveTo(mx+5,my-5);g.lineTo(mx-5,my+5);g.stroke()}}
  for(const x of B.cells){if(x.f!==vf)continue;const r=G.r(x.c),key=vf*B.W+x.c;
   // 民眾提供的資訊：指稱有人、瓦斯桶、起火點
   if(x.rep&&x.srch<1){g.fillStyle='rgba(233,161,59,.9)';g.font='600 10px '+FONT;g.textAlign='center';g.textBaseline='bottom';g.fillText('民眾指稱有人',r[0]+r[2]/2,r[1]+r[3]-6)}
   if(B.gasK&&!B.gasX&&vf===B.gasF&&x.c===B.gas){const cx2=r[0]+r[2]-16,cy2=r[1]+r[3]-18;g.fillStyle='#e9a13b';g.beginPath();g.moveTo(cx2,cy2-8);g.lineTo(cx2+8,cy2+6);g.lineTo(cx2-8,cy2+6);g.closePath();g.fill();
    g.fillStyle='#111';g.font='700 10px '+FONT;g.textAlign='center';g.textBaseline='middle';g.fillText('!',cx2,cy2+1);g.fillStyle='#e9a13b';g.font='10px '+FONT;g.textBaseline='top';g.fillText('瓦斯桶',cx2,cy2+8)}
   if(B.ocKnown&&vf===B.of&&x.c===B.oc){g.fillStyle='rgba(255,120,80,.95)';g.font='600 10px '+FONT;g.textAlign='left';g.textBaseline='top';g.fillText('🔥起火點',r[0]+4,r[1]+18)}
   if(B.dcN&&B.dcN.has(key)){g.fillStyle='#e9a13b';g.font='600 10px '+FONT;g.textAlign='center';g.textBaseline='bottom';g.fillText('門控',r[0]+r[2]/2,r[1]+r[3]-4)}
   // 餘燼：閃爍的紅點（熱顯像可見）
   if(x.emb&&x.h<.05){for(let k=0;k<4;k++){const a=(x.c*7+k*13)%17/17,b2=(x.c*5+k*11)%13/13,pu=.5+.5*Math.sin(T*6+k*2);
     g.fillStyle='rgba(255,'+(70+pu*60|0)+',30,'+(.5+.4*pu).toFixed(2)+')';g.beginPath();g.arc(r[0]+r[2]*(.2+.6*a),r[1]+r[3]*(.25+.55*b2),2.5+pu*1.5,0,TAU);g.fill()}
    g.fillStyle='rgba(255,140,60,.85)';g.font='600 10px '+FONT;g.textAlign='right';g.textBaseline='bottom';g.fillText('餘燼',r[0]+r[2]-4,r[1]+r[3]-4)}
   // 垂直排煙：頂樓房間天花板開孔
   if(x.vv){g.fillStyle='rgba(7,8,10,.8)';g.fillRect(r[0]+r[2]*.4,r[1]+r[3]*.4,r[2]*.2,r[3]*.2);
    for(let k=0;k<3;k++){const ph=(T*.7+k/3)%1;g.fillStyle='rgba(140,142,148,'+((1-ph)*.5).toFixed(2)+')';g.beginPath();g.arc(r[0]+r[2]/2,r[1]+r[3]/2-ph*r[3]*.3,4+ph*8,0,TAU);g.fill()}}
   // 負壓排煙：窗口的排風機
   if(B.npvS&&B.npvS.has(key)&&B.L.N[x.c].wins){const w=tacWinPt(G,x.c,B.L.N[x.c].wins[0]),dv=TAC_SDV[B.L.N[x.c].wins[0]];
    const fx=w[0]-dv[0]*10,fy=w[1]-dv[1]*10;g.fillStyle='#3a3d44';g.beginPath();g.arc(fx,fy,8,0,TAU);g.fill();
    g.strokeStyle='#c9d0d8';g.lineWidth=1.6;g.beginPath();for(let k=0;k<3;k++){const a2=-T*14+k*TAU/3;g.moveTo(fx,fy);g.lineTo(fx+Math.cos(a2)*7,fy+Math.sin(a2)*7)}g.stroke()}}}
 // 對外窗（各方向）
 for(const n of L.N){if(!n.wins||vf<B.bf||B.out)continue;const x=tacCel(B,vf,n.c);
  for(const w of n.wins){const p=tacWinPt(G,n.c,w),hz=w==='n'||w==='s',ww=(hz?G.r(n.c)[2]:G.r(n.c)[3])*.4;
   const rx=hz?p[0]-ww/2:p[0]-3,ry=hz?p[1]-3:p[1]-ww/2,rw=hz?ww:6,rh=hz?6:ww;
   TAC.hits.push({t:'cell',f:vf,c:n.c,x:rx-4,y:ry-4,w:rw+8,h:rh+8});
   if(x.v){g.fillStyle='#07080a';g.fillRect(rx,ry,rw,rh);
    if(x.s>.05||x.h>.2)for(let k=0;k<3;k++){const ph=(T*.6+k/3)%1,dv=TAC_SDV[w];
     g.fillStyle=x.h>.5&&k===0?'rgba(255,120,40,'+(.6*(1-ph)).toFixed(2)+')':'rgba(120,122,128,'+((x.s*.6+.1)*(1-ph)).toFixed(3)+')';
     g.beginPath();g.arc(p[0]+dv[0]*ph*30+(hz?(k-1)*ww*.3:0),p[1]+dv[1]*ph*30+(hz?0:(k-1)*ww*.3),4+ph*9,0,TAU);g.fill()}}
   else{g.fillStyle=x.h>.3?'rgba(255,160,70,.9)':'#5d86a8';g.fillRect(rx,ry,rw,rh)}}}
 }
 // 出入口（1F）、送水口、正壓排煙送風機
 for(const e of B.ents){const d=tacEDoor(G,e),hz=e.side==='n'||e.side==='s',ef=tacEF(B,e);
  if(e.shop||e.ramp){if(vf===ef){g.fillStyle=e.lock&&e.known?'#8a2f2a':'#6b6960';if(hz)g.fillRect(d[0]-t*.22,d[1]-3,t*.44,6);else g.fillRect(d[0]-3,d[1]-t*.22,6,t*.44);
   g.fillStyle='#cfc9bb';g.font='9px '+FONT;g.textAlign='center';g.textBaseline='middle';g.fillText((e.ramp?'車道':'鐵捲門')+(e.lock&&e.known?'（鎖）':''),d[0]+TAC_SDV[e.side][0]*22,d[1]+TAC_SDV[e.side][1]*12)}continue}
  if(e.lock&&e.known&&vf===B.bf){g.fillStyle='#8a2f2a';if(hz)g.fillRect(d[0]-t*.18,d[1]-4,t*.36,8);else g.fillRect(d[0]-4,d[1]-t*.18,8,t*.36);
   g.fillStyle='#ff8a6a';g.font='600 10px '+FONT;g.textAlign='center';g.textBaseline='middle';g.fillText('上鎖',d[0]-TAC_SDV[e.side][0]*16,d[1]-TAC_SDV[e.side][1]*14)}
  if(tacAcc(B)&&vf===B.bf&&e===(B.ents.find(x=>x.side===B.arr)||B.ents[0])){const dv=TAC_SDV[e.side],bx2=d[0]+dv[0]*40+(dv[0]?0:-34),by2=d[1]+dv[1]*40+(dv[1]?0:-34);
   g.fillStyle='#e9e7e0';g.fillRect(bx2-9,by2-7,18,14);g.fillStyle='#2a2a27';for(let k=0;k<3;k++)g.fillRect(bx2-7,by2-5+k*4,14,2);
   g.fillStyle='#e9a13b';g.font='600 10px '+FONT;g.textAlign='center';g.textBaseline='top';g.fillText('管制板',bx2,by2+8)}
  if(B.dcS&&B.dcS.has(e.side)&&vf===B.bf){g.fillStyle='#e9a13b';g.font='600 10px '+FONT;g.textAlign='center';g.textBaseline='middle';g.fillText('門控',d[0]+TAC_SDV[e.side][0]*30,d[1]+TAC_SDV[e.side][1]*28)}
  g.fillStyle=vf===B.bf?'#e9a13b':'rgba(233,161,59,.35)';
  if(hz)g.fillRect(d[0]-t*.16,d[1]-3,t*.32,6);else g.fillRect(d[0]-3,d[1]-t*.16,6,t*.32);
  if(vf===B.bf){g.font='10px '+FONT;g.textAlign='center';g.textBaseline='middle';g.fillText('入口',d[0]+TAC_SDV[e.side][0]*14,d[1]+TAC_SDV[e.side][1]*12)}}
 if(B.sp){const d=tacDoor(G,B.sp.side),dv=TAC_SDV[B.sp.side],hz=B.sp.side==='n'||B.sp.side==='s';
  const p=[d[0]+(hz?t*.45:0)+dv[0]*6,d[1]+(hz?0:t*.45)+dv[1]*6];
  const su=B.sq.find(q=>q.u===B.sp.u);
  if(B.sp.on&&su&&TP[su.u]){g.strokeStyle='rgba(125,179,232,.9)';g.lineWidth=3.5;g.beginPath();g.moveTo(TP[su.u][0],TP[su.u][1]);g.lineTo(p[0],p[1]);g.stroke()}
  g.fillStyle=B.sp.on?'#7db3e8':'#8d8a81';g.beginPath();g.arc(p[0],p[1],6,0,TAU);g.fill();
  g.fillStyle='#eceae3';g.font='10px '+FONT;g.textAlign='center';g.textBaseline='middle';g.fillText(B.sp.on?'送水口 加壓中':'送水口',p[0]+dv[0]*30+(hz?0:0),p[1]+dv[1]*14+(hz?0:-14))}
 if(B.ppv&&B.ppvSide){const d=tacDoor(G,B.ppvSide),dv=TAC_SDV[B.ppvSide],fx=d[0]+dv[0]*22,fy=d[1]+dv[1]*22;
  g.fillStyle='#3a3d44';g.beginPath();g.arc(fx,fy,10,0,TAU);g.fill();
  g.strokeStyle='#c9d0d8';g.lineWidth=2;g.beginPath();for(let k=0;k<3;k++){const a=T*14+k*TAU/3;g.moveTo(fx,fy);g.lineTo(fx+Math.cos(a)*9,fy+Math.sin(a)*9)}g.stroke()}
 // 預計路線與指定空間：小組往目標走的路線（虛點線），目標空間外框閃動；選取中的小組最明顯
 const TCOL={attack:'125,179,232',trans:'125,179,232',guard:'125,179,232',hydro:'125,179,232',hold:'125,179,232',
  search:'93,202,165',search2:'93,202,165',roofres:'226,86,79',ritgo:'226,86,79',carry:'226,86,79',
  confine:'233,161,59',force:'233,161,59',dctrl:'233,161,59',overhaul:'240,120,60',vent:'175,169,236',npv:'175,169,236',vvent:'175,169,236',move:'236,234,227'};
 if(vf<B.F)for(const q of B.sq){
  const cc=TCOL[q.task];if(!cc||q.down)continue;
  const sel=TAC.sq===q.u,al=sel?.85:.35;
  // 路線
  if(q.tf>=0&&(q.f!==q.tf||q.c!==q.tc)){
   let pts=[];
   if(q.f>=0)pts=[[q.f,q.c]].concat(tacPath(B,q.f,q.c,q.tf,q.tc));
   else{const e=q.ent||tacBestEnt(B,q.side,q.tf,q.tc,false);if(e)pts=[[tacEF(B,e),e.c]].concat(tacPath(B,tacEF(B,e),e.c,q.tf,q.tc))}
   const on=pts.filter(p=>p[0]===vf);
   if(on.length){g.strokeStyle='rgba('+cc+','+al+')';g.lineWidth=sel?2:1.4;g.setLineDash([2,5]);g.lineDashOffset=-T*12;g.beginPath();
    if(q.f===vf){const pp=tacSqPos(B,G,q,0);if(pp)g.moveTo(pp[0],pp[1])}
    else if(q.f<0&&vf===tacEF(B,q.ent||{})&&q.ent){const d=tacEDoor(G,q.ent);g.moveTo(d[0],d[1])}
    on.forEach((p,k)=>{const c=G.ctr(p[1]);if(k===0&&q.f!==vf&&!(q.f<0&&q.ent&&vf===tacEF(B,q.ent)))g.moveTo(c[0],c[1]);else g.lineTo(c[0],c[1])});
    g.stroke();g.setLineDash([])}}
  // 指定空間
  const ex=q.task==='trans'||q.task==='sky'||q.ty==='ladder';
  const tf=ex?q.lf:q.task==='vvent'?B.F-1:q.tf,tc=ex?q.lc:q.task==='vvent'?q.vc:q.tc;
  if(tf===vf&&tc!==undefined&&tf>=0&&q.task!=='idle'&&q.task!=='rit'&&q.task!=='exit'){const r=G.r(tc),pu=.5+.5*Math.sin(T*5+tacUidN(q.u));
   g.strokeStyle='rgba('+cc+','+(al*(.5+.5*pu)).toFixed(2)+')';g.lineWidth=sel?3:2;g.setLineDash([6,4]);g.lineDashOffset=T*20;
   g.strokeRect(r[0]+4+pu*2,r[1]+4+pu*2,r[2]-8-pu*4,r[3]-8-pu*4);g.setLineDash([])}
  if((q.task==='force'||q.task==='dctrl')&&q.dside&&vf===B.bf){const d=tacDoor(G,q.dside),pu=.5+.5*Math.sin(T*5);
   g.strokeStyle='rgba('+cc+','+(al*(.6+.4*pu)).toFixed(2)+')';g.lineWidth=2;g.beginPath();g.arc(d[0],d[1],10+pu*4,0,TAU);g.stroke()}}
 // 水線：從供水車沿道路拉到入口，再沿入室路線拉到人員身上。
 // 充水時飽滿鮮明（線越粗水壓越高）；未出水（沒水、燒破、壓力不足、尚未分到水）就扁掉變淡
 let li=0;const entN={};
 for(const q of B.sq){
  if(!(q.line||(TAC_WET[q.task]&&q.task!=='master')))continue;li++;
  const eK=((q.line&&q.lent)||q.inEnt||q.ent||{side:q.ws||'x'}).side,eI=entN[eK]=(entN[eK]||0)+1,eo=(eI-1)*5;
  const off=(li%4-1.5)*3,charged=q.line&&q.pf>0&&!(q.burst>0)&&waterOK(inc);
  const col=q.burst>0?((T*4)%1<.5?'rgba(226,86,79,.9)':'rgba(226,86,79,.25)'):charged?tacPfCol(q.pf,.95):'rgba(150,170,190,.3)';
  const lw=charged?2+2.2*q.pf:1.1;
  const pen=c2=>{g.strokeStyle=c2;g.lineWidth=lw;if(charged){g.setLineDash([10,4]);g.lineDashOffset=-T*30*Math.max(.2,q.pf)}else g.setLineDash([])};
  pen(col);
  if(q.ty==='ladder'){
   if(q.lf===vf&&TP[q.u]&&q.ext>0&&q.lside){const w=tacWinPt(G,q.lc,q.lside),tp=TP[q.u];
    g.beginPath();g.moveTo(tp[0],tp[1]);g.lineTo(tp[0]+(w[0]-tp[0])*q.ext,tp[1]+(w[1]-tp[1])*q.ext);g.stroke()}
   g.setLineDash([]);continue}
  const sp=q.line&&q.src==='sp',tp=TP[q.line?q.lu:q.u];
  if(q.task==='cover'){const b=G.band[q.cside];if(tp&&b){const cx=Math.max(b[0],Math.min(b[0]+b[2],tp[0])),cy=Math.max(b[1],Math.min(b[1]+b[3],tp[1]));
   g.beginPath();g.moveTo(tp[0],tp[1]);g.lineTo(cx,cy);g.stroke();g.setLineDash([]);
   if(charged){g.fillStyle='rgba(170,210,245,.5)';for(let k=0;k<6;k++){const ph=(T*2+k/6)%1;g.beginPath();g.arc(tp[0]+(cx-tp[0])*ph,tp[1]+(cy-tp[1])*ph,3+ph*8,0,TAU);g.fill()}}}
   g.setLineDash([]);continue}
  const ts=(B.sq.find(x=>x.u===(q.line?q.lu:q.u))||q).tside;
  // 過渡射水：車 → 沿道路 → 窗外的射水手
  if(q.task==='sky'){g.setLineDash([]);continue} // 車頂砲塔：不拉水帶
  if(q.task==='trans'){const pp=tacSqPos(B,G,q,0);if(tp&&pp){g.beginPath();g.moveTo(tp[0],tp[1]);
    const ps=tacHoseOut(B,G,ts,tp,q.ws||q.side,pp,eo);for(let k=1;k<ps.length;k++)g.lineTo(ps[k][0],ps[k][1]);g.stroke()}
   g.setLineDash([]);continue}
  const ent=(q.line&&q.lent)||q.inEnt||q.ent;
  g.beginPath();
  const ef=ent?tacEF(B,ent):B.bf;
  if(!sp&&ent&&tp){const d=tacEDoor(G,ent);
   if(vf!==ef){g.stroke();pen(charged?tacPfCol(q.pf,.35):'rgba(150,170,190,.15)');g.beginPath()} // 地面段在其他樓層畫淡
   const ps=tacHoseOut(B,G,ts,tp,ent.side,d,eo);g.moveTo(ps[0][0],ps[0][1]);for(let k=1;k<ps.length;k++)g.lineTo(ps[k][0],ps[k][1]);
   if(q.f<0){const pp=tacSqPos(B,G,q,0);if(pp&&vf===ef)g.lineTo(pp[0],pp[1])}
   if(vf!==ef){g.stroke();pen(col);g.beginPath()}}
  // 本層經過的節點：從入口（或送水口出水的樓梯間）沿入室路線到人員
  const f0=sp?q.f:ef,c0=sp?tacNearStair(B,q.f,q.c):ent?ent.c:0;
  if(q.f>=0&&vf<B.F){const pts=[[f0,c0]].concat(tacPath(B,f0,c0,q.f,q.c)).filter(p=>p[0]===vf);
   let first=!(vf===ef&&!sp&&ent&&tp);
   for(const p of pts){const c=G.ctr(p[1]);if(first){g.moveTo(c[0]+off,c[1]+off);first=false}else g.lineTo(c[0]+off,c[1]+off)}
   if(q.f===vf){const pp=tacSqPos(B,G,q,0);if(pp&&pts.length)g.lineTo(pp[0],pp[1])}
   else if(pts.length===1&&vf!==B.bf){const c=G.ctr(pts[0][1]);g.lineTo(c[0]+off,c[1]-t*.5)}}
  g.stroke();g.setLineDash([])}
 // 雲梯：只畫在目標樓層
 for(const q of B.sq){
  if(q.ty!=='ladder'||q.lf!==vf||!q.lside||q.task==='idle'||!TP[q.u]||q.tmv)continue;
  const mid={n:[G.bx+G.bw/2,G.by],s:[G.bx+G.bw/2,G.by+G.bh],w:[G.bx,G.by+G.bh/2],e:[G.bx+G.bw,G.by+G.bh/2]};
  const tp=TP[q.u],w=q.task==='roofres'?mid[q.lside]:q.task==='roof'?tacDoor(G,q.lside):tacWinPt(G,q.lc,q.lside);
  const bx=tp[0],by=tp[1],ex=bx+(w[0]-bx)*q.ext,ey=by+(w[1]-by)*q.ext,a=Math.atan2(ey-by,ex-bx),nx=-Math.sin(a)*5,ny=Math.cos(a)*5;
  g.strokeStyle='#d8d4c8';g.lineWidth=2;g.beginPath();g.moveTo(bx+nx,by+ny);g.lineTo(ex+nx,ey+ny);g.moveTo(bx-nx,by-ny);g.lineTo(ex-nx,ey-ny);
  const len=Math.hypot(ex-bx,ey-by);for(let k=7;k<len;k+=7){const u=k/len;g.moveTo(bx+(ex-bx)*u+nx,by+(ey-by)*u+ny);g.lineTo(bx+(ex-bx)*u-nx,by+(ey-by)*u-ny)}g.stroke();
  if(q.ext>=1){tacMan(g,ex,ey,5,'#f3c43b',a,{scba:1});
   if(q.task==='master'&&q.line&&q.pf>0){const c=G.ctr(q.lc);g.fillStyle='rgba(170,210,245,.5)';for(let k=0;k<6;k++){const ph=(T*2+k/6)%1;
    g.beginPath();g.arc(ex+(c[0]-ex)*ph,ey+(c[1]-ey)*ph,3+ph*7,0,TAU);g.fill()}}}}
 // 小組
 const fr=Math.max(3,Math.min(8,t*.055)),slot={};TAC.sqp={};const LBL=[];   // LBL：這一幀已畫的名牌框（避免屋外小組名牌疊在一起）
 // 顯示位置平滑追隨目標位置（換位、換樓層時不瞬移），朝向依實際移動方向平滑轉動
 const now=performance.now(),fdt=Math.min(.1,(now-(TAC.vt||now))/1000);TAC.vt=now;TAC.vis=TAC.vis||{};
 for(const q of B.sq){
  if(q.ty==='ladder')continue;
  const key=q.f<0?'out'+q.side:q.f+','+q.c,k=slot[key]=(slot[key]||0)+1;
  const p0=tacSqPos(B,G,q,k-1);if(!p0){delete TAC.vis[q.u];continue}
  let v=TAC.vis[q.u];
  if(!v||v.vf!==TAC.vf||Math.hypot(p0[0]-v.x,p0[1]-v.y)>t*3)v=TAC.vis[q.u]={x:p0[0],y:p0[1],a:-Math.PI/2,sp:0,vf:TAC.vf};
  const kk=1-Math.exp(-fdt*(TAC.spd>=1?14:9)),nx=v.x+(p0[0]-v.x)*kk,ny=v.y+(p0[1]-v.y)*kk,sp=fdt>0?Math.hypot(nx-v.x,ny-v.y)/fdt:0;
  if(sp>6){const ta=Math.atan2(ny-v.y,nx-v.x);let da=ta-v.a;while(da>Math.PI)da-=TAU;while(da<-Math.PI)da+=TAU;v.a+=da*Math.min(1,fdt*10)}
  v.x=nx;v.y=ny;v.sp=v.sp+(sp-v.sp)*Math.min(1,fdt*8);
  const p=[v.x,v.y];
  const n=Math.min(4,q.n),sel=TAC.sq===q.u||TAC.ms.indexOf(q.u)>=0,moving=q.mt>0||q.wkS>0||v.sp>6;TAC.sqp[q.u]=p;
  const tgt=q.f===q.tf&&q.c===q.tc&&q.f>=0?G.ctr(q.c):null;
  let a=moving?v.a:(q.f>=0?v.a:-Math.PI/2);
  const qun=tacUidN(q.u);
  if(q.task==='attack'&&q.line&&tgt)a=-Math.PI/2+Math.sin(T*.7+qun)*.9;
  if(sel){g.strokeStyle='#e9a13b';g.lineWidth=2;g.beginPath();g.arc(p[0],p[1],fr*3.2,0,TAU);g.stroke()}
  if(q.down){const pul=.5+.5*Math.sin(T*8);g.fillStyle='rgba(226,86,79,'+(.3+.35*pul).toFixed(2)+')';g.beginPath();g.arc(p[0],p[1],fr*4,0,TAU);g.fill()}
  if(q.ty==='robot'){g.save();g.translate(p[0],p[1]);g.rotate(a);g.fillStyle='#6b7f96';scRR(g,-fr*1.6,-fr*1.1,fr*3.2,fr*2.2,2);g.fill();
   g.fillStyle='#222';g.fillRect(-fr*1.6,-fr*1.4,fr*3.2,fr*.4);g.fillRect(-fr*1.6,fr*1,fr*3.2,fr*.4);g.fillStyle='#c9d3e0';g.fillRect(fr*.8,-fr*.25,fr*1.4,fr*.5);g.restore()}
  else for(let i=0;i<n;i++){
   // 行進時成縱隊、步伐擺動；靜止時散開成小圈
   const gait=moving?Math.sin(T*11+i*1.7):0,sp2=moving?1.9:1.5,lat=moving?((i%2)-.5)*fr*1.1:Math.sin(i*2.1+qun)*fr*1.3;
   const ox=Math.cos(a)*(-i*fr*sp2)+Math.cos(a+Math.PI/2)*lat+Math.cos(a)*gait*fr*.15,oy=Math.sin(a)*(-i*fr*sp2)+Math.sin(a+Math.PI/2)*lat+Math.sin(a)*gait*fr*.15;
   const col=q.ty==='resc'?'#f6f6f2':'#f3c43b',coat=q.ty==='resc'?'#c8332c':'#1e2c52';
   tacMan(g,p[0]+ox,p[1]+oy,fr,col,q.down?a+Math.PI/2:a+gait*.18,{scba:q.f>=0||q.task==='rit',coat,step:gait})}
  if(q.task==='sky'&&q.line&&q.pf>0&&q.lf===vf){const tp2=TAC.tp&&TAC.tp[q.u],c2=G.ctr(q.lc);
   if(tp2){g.fillStyle='rgba(170,210,245,.6)';for(let k=0;k<12;k++){const ph=(T*2.8+k/12)%1,sp=(k%3-1)*.1;
    const ex=tp2[0]+(c2[0]-tp2[0])*ph,ey=tp2[1]+(c2[1]-tp2[1])*ph-Math.sin(ph*Math.PI)*22;g.beginPath();g.arc(ex+sp*24,ey,2.5+ph*7,0,TAU);g.fill()}}}
  if(q.task==='trans'&&q.line&&q.pf>0&&q.lf===vf&&q.side===q.ws){const c2=G.ctr(q.lc);
   g.fillStyle='rgba(170,210,245,.55)';for(let k=0;k<8;k++){const ph=(T*2.4+k/8)%1,sp=(k%3-1)*.12;
    const ex=p[0]+(c2[0]-p[0])*ph,ey=p[1]+(c2[1]-p[1])*ph-Math.sin(ph*Math.PI)*12;g.beginPath();g.arc(ex+sp*20,ey,2+ph*6,0,TAU);g.fill()}}
  // 接上肺力閥中：青色進度條；已接上：人員外圈青色細環（面罩）
  if(q.mkT>0){g.fillStyle='rgba(0,0,0,.6)';g.fillRect(p[0]-14,p[1]+fr*2.2,28,4);g.fillStyle='#7dd3e8';g.fillRect(p[0]-14,p[1]+fr*2.2,28*Math.min(1,q.mkT/6),4)}
  if(q.mk&&tacIn(q)&&!q.down){g.strokeStyle='rgba(125,211,232,.75)';g.lineWidth=1.2;g.beginPath();g.arc(p[0],p[1],fr*1.9,0,TAU);g.stroke()}
  if(q.frc>0){g.fillStyle='rgba(0,0,0,.6)';g.fillRect(p[0]-14,p[1]+fr*2.2,28,4);g.fillStyle='#e9a13b';g.fillRect(p[0]-14,p[1]+fr*2.2,28*Math.min(1,q.frc/(q.ty==='resc'?4:9)),4)}
  if(q.task==='attack'&&q.line&&q.pf>0&&!q.burst&&tgt&&!q.down){
   g.fillStyle='rgba(170,210,245,.5)';const rch=t*.4*Math.max(.25,q.pf);
   for(let k=0;k<7;k++){const ph=(T*2.2+k/7)%1,sp=(k%3-1)*.25;
    g.beginPath();g.arc(p[0]+Math.cos(a+sp)*(fr*2+ph*rch),p[1]+Math.sin(a+sp)*(fr*2+ph*rch),fr*(.3+ph*.7),0,TAU);g.fill()}}
  if(q.carry){g.fillStyle='rgba(236,234,227,.95)';g.save();g.translate(p[0],p[1]);g.rotate(a);g.fillRect(-fr*3,-fr*.6,fr*2.4,fr*1.2);
   g.fillStyle='#7a4a9a';g.fillRect(-fr*2.8,-fr*.4,fr*1.6,fr*.8);g.restore()}
  g.font='10px '+FONT;g.textAlign='left';g.textBaseline='bottom';
  const lt=(q.down?'MAYDAY ':'')+(q.task==='rit'||q.task==='ritgo'?'RIT ':'')+q.cs+(q.line&&q.f>=0?' '+Math.round(q.pf*100)+'%':''),lw=g.measureText(lt).width;
  let lx=p[0]-fr*2,ly=p[1]-fr*3,shown=true;
  const hitL=y=>LBL.some(r=>lx<r[0]+r[2]&&lx+lw>r[0]&&y-11<r[1]+r[3]&&y>r[1]);
  if(hitL(ly)&&!sel&&!q.down){if(!hitL(ly-11))ly-=11;else if(!hitL(ly+fr*6+11))ly+=fr*6+11;else shown=q.f>=0}   // 屋外擠在一起時往上下讓位，仍重疊就不寫名字（選取或倒地一定顯示）
  if(shown){LBL.push([lx,ly-11,lw,11]);
  g.fillStyle=q.down?'#ff5a4a':sel?'#e9a13b':'rgba(236,234,227,.9)';
  g.fillText(lt,lx,ly);
  if(q.ty!=='robot'&&tacAcc(B)){g.fillStyle='rgba(0,0,0,.6)';g.fillRect(lx,ly+1,26,3);
   g.fillStyle=tacIn(q)&&!q.mk&&!B.wild?'#7a7870':q.air<.25?'#e2564f':q.air<.5?'#e9a13b':'#5dcaa5';g.fillRect(lx,ly+1,26*q.air,3)}}
  TAC.hits.unshift({t:'sq',id:q.u,x:p[0]-fr*3.5,y:p[1]-fr*4,w:fr*7,h:fr*7})}
 // 對話泡泡：入室小組喊話（約 3 秒）
 {const now=performance.now(),BB=[];for(const q of B.sq){if(!q.say||now-q.say.t>3000)continue;const p=TAC.sqp[q.u];if(!p||(tacIn(q)?q.f!==vf:(vf!==B.bf&&!B.out)))continue;
  g.font='600 11px '+FONT;const w=g.measureText(q.say.s).width+12,bx=p[0]-w/2;let by=p[1]-fr*4-24;
  while(BB.some(r=>bx<r[0]+r[2]&&bx+w>r[0]&&by<r[1]+20&&by+20>r[1]))by-=22;BB.push([bx,by,w]);   // 泡泡重疊就往上疊
  const a=Math.min(1,(3000-(now-q.say.t))/400);
  g.globalAlpha=a;g.fillStyle='rgba(250,248,240,.95)';scRR(g,bx,by,w,18,6);g.fill();g.beginPath();g.moveTo(p[0]-4,by+18);g.lineTo(p[0]+4,by+18);g.lineTo(p[0],by+24);g.fill();
  g.fillStyle='#1a1a18';g.textAlign='center';g.textBaseline='middle';g.fillText(q.say.s,p[0],by+9.5);g.globalAlpha=1}}
 // 雲梯組與幫浦組也可以點車輛選取
 for(const q of B.sq){const p=TP[q.u];if(p&&(q.ty==='ladder'||q.ty==='pump'))TAC.hits.push({t:'sq',id:q.u,x:p[0]-14,y:p[1]-14,w:28,h:28});
  if(p&&(q.ty==='ladder'||q.ty==='pump')&&!TAC.sqp[q.u])TAC.sqp[q.u]=p;
  if(p&&(TAC.sq===q.u||TAC.ms.indexOf(q.u)>=0)){g.strokeStyle='#e9a13b';g.lineWidth=2;g.strokeRect(p[0]-28,p[1]-14,56,28)}}
 // 樓層概況：每層一列，寫出起火與溫度、煙、在場組數、受困、未搜索、餘燼；點選切換樓層
 g.fillStyle='#161615';g.fillRect(0,0,G.sx+G.sw+10,tH);
 g.fillStyle='#9d9a92';g.font='11px '+FONT;g.textAlign='left';g.textBaseline='top';g.fillText('樓層概況',G.sx,8);
 const ry=G.fy(B.F),rh=G.sh-3;
 if(!B.out){
 g.fillStyle=B.roof?'#2a2d33':'#24211d';g.fillRect(G.sx,ry,G.sw,rh);
 if(vf>=B.F){g.strokeStyle='#e9a13b';g.lineWidth=2;g.strokeRect(G.sx-1,ry-1,G.sw+2,rh+2)}
 g.fillStyle='#eceae3';g.font='600 11px '+FONT;g.textBaseline='middle';g.fillText('屋頂',G.sx+4,ry+rh/2);
 g.font='10px '+FONT;g.fillStyle=B.roofV&&(T*2)%1<.6?'#ff8a6a':'#9d9a92';
 g.fillText((B.rf&&B.rf.h>0?'光電板火 ':'')+(B.roof?'排煙口開 ':'')+(B.roofV?(B.roofS?'避難 '+B.roofV+' 人':'通報有人'):''),G.sx+34,ry+rh/2);
 TAC.hits.push({t:'flr',f:B.F,x:G.sx,y:ry,w:G.sw,h:rh})}
 const smk=v=>v>.7?'濃煙':v>.4?'中煙':v>.15?'薄煙':'';
 for(let f=0;f<B.F;f++){
  const y=G.fy(f),h=G.sh-3;let mh=0,ms=0,vic=0,un=0,emb=0,tmax=25;
  for(let c=0;c<B.W;c++){const x=tacCel(B,f,c);mh=Math.max(mh,x.h);ms=Math.max(ms,x.s);if(x.srch>=1)vic+=x.vic;
   if(x.ty==='room'&&x.sl<1)un++;if(x.emb)emb++;tmax=Math.max(tmax,tacParam(B,x).temp)}
  g.fillStyle=f<B.bf?'#1d1c1a':'#24211d';g.fillRect(G.sx,y,G.sw,h);
  if(ms>.05){g.fillStyle='rgba(90,92,98,'+(ms*.6).toFixed(2)+')';g.fillRect(G.sx,y,G.sw,h)}
  if(mh>.05){g.fillStyle='rgba(255,'+(120-mh*70|0)+',40,'+(.35+mh*.6).toFixed(2)+')';g.fillRect(G.sx,y+h-4,G.sw*Math.min(1,mh*1.2),4)}
  if(f===vf){g.strokeStyle='#e9a13b';g.lineWidth=2;g.strokeRect(G.sx-1,y-1,G.sw+2,h+2)}
  if(f===B.bf&&B.bf){g.strokeStyle='#5dcaa5';g.lineWidth=1;g.beginPath();g.moveTo(G.sx-2,y+h+1.5);g.lineTo(G.sx+G.sw+2,y+h+1.5);g.stroke()}
  const ns=B.sq.filter(q=>q.f===f).length,dn=B.sq.some(q=>q.f===f&&q.down);
  const big=h>=30,ty=big?y+11:y+h/2;
  g.fillStyle=f===B.of&&!B.hoax?'#ff8a6a':'#eceae3';g.font='600 11px '+FONT;g.textAlign='left';g.textBaseline='middle';g.fillText(tacFlr(B,f),G.sx+4,ty);
  if(ns){g.fillStyle=dn&&(T*3)%1<.5?'#ff5a4a':'#f3c43b';g.textAlign='right';g.fillText((dn?'MAYDAY ':'')+'●'+ns+' 組',G.sx+G.sw-4,ty)}
  // 摘要：火勢與溫度、煙、受困、未搜索、餘燼
  const parts=[];
  if(mh>.05)parts.push(['火 '+tmax+'°C','#ff8a5a']);else if(ms>.15)parts.push([smk(ms),'#b5b2aa']);
  if(vic)parts.push(['受困 '+vic,'#ff6a5a']);else if(f===B.hint&&B.cells.some(x=>x.f===f&&(x.vic||x.hid)&&x.srch<1))parts.push(['通報有人','#e9a13b']);
  if(B.cells.some(x=>x.f===f&&x.rep&&x.srch<1))parts.push(['民眾指稱','#e9a13b']);
  if(un&&(mh>.05||f===B.hint||ns))parts.push(['未搜 '+un,'#7db3e8']);
  if(emb)parts.push(['餘燼 '+emb,'#f08a3c']);
  if(B.cz&&B.cz.has(f))parts.unshift(['坍塌','#ff5a4a']);
  g.font='10px '+FONT;g.textAlign='left';
  let px=big?G.sx+4:G.sx+30;const py=big?y+h-12:y+h/2;
  for(const pr of parts){const w=g.measureText(pr[0]).width;if(px+w>G.sx+G.sw-(big?2:44))break;g.fillStyle=pr[1];g.fillText(pr[0],px,py);px+=w+6}
  TAC.hits.push({t:'flr',f,x:G.sx,y,w:G.sw,h})}
 // 提示列
 g.font='12px '+FONT;g.textAlign='left';g.textBaseline='top';g.fillStyle='rgba(236,234,227,.85)';
 const sq=B.sq.find(q=>q.u===TAC.sq);
 g.fillText((B.out?'場區平面（'+(B.wind?B.wind.nm:'')+'）':vf>=B.F?'屋頂':tacFlr(B,vf)+' 平面'+(vf<B.bf?'（地下室：無對外窗）':''))+'　'+(sq?(TAC.ord?'【'+sq.cs+'】'+(tacTN(B,TAC.ord)||TAC.ord)+'：'+((TAC_ORD.find(o=>o[0]===TAC.ord)||[])[3]||'').split('｜')[1]+'（Esc 取消）':'【'+sq.cs+'】點空間＝預設指令；點道路＝移車'):'點選小組或車輛（或按 1–9），再點房間、走廊或道路；左側／滾輪／[ ] 切換樓層'),G.sx+G.sw+18,8);
 // 坍塌樓層：整層斜線遮罩
 if(B.cz&&B.cz.has(vf)){g.save();g.beginPath();g.rect(G.bx,G.by,G.bw,G.bh);g.clip();g.fillStyle='rgba(60,20,15,.55)';g.fillRect(G.bx,G.by,G.bw,G.bh);
  g.strokeStyle='rgba(255,90,60,.35)';g.lineWidth=3;for(let k=-G.bh;k<G.bw;k+=22){g.beginPath();g.moveTo(G.bx+k,G.by+G.bh);g.lineTo(G.bx+k+G.bh,G.by);g.stroke()}g.restore();
  g.fillStyle='#ff8a6a';g.font='700 18px '+FONT;g.textAlign='center';g.textBaseline='middle';g.fillText('樓板坍塌・禁止進入',G.bx+G.bw/2,G.by+G.bh/2)}
 // 樓梯間：前進指揮所、消防專用升降機
 if(vf<B.F){const r0=G.r(0);g.font='600 10px '+FONT;g.textAlign='center';g.textBaseline='bottom';
  if(B.fwd&&vf===B.fwd.f){g.fillStyle=tacFwdOK(B)?'#5dcaa5':'#9d9a92';g.fillText('前進指揮所',r0[0]+r0[2]/2,r0[1]-2)}
  if(B.elev&&vf>=B.bf){g.fillStyle=B.elOn&&vf<=tacElevTop(B)?'#7db3e8':'#6b6960';g.textBaseline='top';g.fillText(B.elOn&&vf<=tacElevTop(B)?'升降機 ●':'升降機',r0[0]+r0[2]/2,r0[1]+r0[3]+2)}}
 // 框選框
 if(TAC.drag&&Math.hypot(TAC.drag.x1-TAC.drag.x0,TAC.drag.y1-TAC.drag.y0)>8){const d=TAC.drag;
  g.strokeStyle='#e9a13b';g.lineWidth=1.5;g.setLineDash([5,4]);g.strokeRect(Math.min(d.x0,d.x1),Math.min(d.y0,d.y1),Math.abs(d.x1-d.x0),Math.abs(d.y1-d.y0));g.setLineDash([]);
  g.fillStyle='rgba(233,161,59,.08)';g.fillRect(Math.min(d.x0,d.x1),Math.min(d.y0,d.y1),Math.abs(d.x1-d.x0),Math.abs(d.y1-d.y0))}
 // 事件暫停橫幅
 if(paused&&TAC.pmsg){g.font='600 12px '+FONT;const tx='⏸ '+TAC.pmsg+'　（空白鍵繼續）',tw=Math.min(tW-240,g.measureText(tx).width+24),bx=G.sx?Math.max(G.sx+150,(tW-tw)/2):(tW-tw)/2,by=tH-30;
  g.fillStyle='rgba(120,24,20,.9)';g.fillRect(bx,by,tw,22);g.fillStyle='#fff';g.textAlign='center';g.textBaseline='middle';
  g.fillText(tx,bx+tw/2,by+11)}
 // 空間參數提示框（滑鼠停留的空間）
 const hv=TAC.hov;
 if(hv&&vf<B.F){const h0=TAC.hits.find(h=>h.t==='cell'&&hv.x>=h.x&&hv.x<=h.x+h.w&&hv.y>=h.y&&hv.y<=h.y+h.h);
  if(h0){const x=tacCel(B,h0.f,h0.c),P=tacParam(B,x),n=L.N[h0.c];
   const nm0=tacNm(B,h0.f,h0.c),kn=n.ty==='room'?TAC_RK[tacK(B,h0.f,h0.c)].n:'';const rows=[[nm0+(kn&&!nm0.includes(kn)?'　'+kn:''),'#eceae3'],
    ['溫度　'+P.temp+' °C',P.temp>500?'#ff6a5a':P.temp>150?'#e9a13b':'#9d9a92'],
    ['能見度　'+P.vis+' m',P.vis<1?'#ff6a5a':P.vis<5?'#e9a13b':'#9d9a92'],
    ['燃燒面積　'+P.burn+' / '+P.area+' ㎡',P.burn?'#ff8a5a':'#9d9a92'],
    ['含氧量　'+P.o2+' %',P.o2<14?'#ff6a5a':P.o2<18?'#e9a13b':'#9d9a92'],
    ['煙層下緣　約 '+tacLayM(x)+' m'+(tacLayV(x)<.45?'（低姿）':''),tacLayV(x)<.25?'#ff6a5a':tacLayV(x)<.45?'#e9a13b':'#9d9a92']];
   const oa=tacOpenAir(B,x);
   if(oa)rows.splice(rows.length-1,1,['露天：煙順'+(B.wind?B.wind.nm.slice(0,B.wind.nm.indexOf('風')+1):'風')+'往下風處飄散','#9d9a92']);
   else{const ws=tacWinSt(B,x,n);rows.push(['對外窗戶　'+ws[0],ws[1]])}
   {let dn=0;for(const o of n.nb){if(tacOpn(B,h0.c,o))continue;const dt2=tacDoorTxt(B,h0.f,h0.c,o);if(!dt2)continue;if(++dn>5)break;rows.push(['往'+tacNm(B,h0.f,o)+'：'+dt2[0],dt2[1]])}}
   if(x.gm){const a=Math.round((S.t-x.gm.t)/60);rows.push(['氣體偵測（'+(a?a+' 分鐘前':'剛剛')+'）','#7db3e8']);
    for(const gk of TAC_GAS)rows.push(['　'+gk[1]+'　'+x.gm[gk[0]]+' '+gk[2],tacGasCol(gk[0],x.gm[gk[0]])])}
   if(x.emb)rows.push(['餘燼未處理（可能復燃）','#ff8a5a']);
   for(const rr of tacRescRows(B,x))rows.push(rr);
   if(n.ty==='room')rows.push([x.sl>=2?'已次級搜索':x.sl===1?'已初期搜索':'未搜索','#7db3e8']);
   if(x.o2<13&&x.h>.35&&!x.v)rows.push(['⚠ 缺氧悶燒：開口可能爆燃','#ff6a5a']);
   if(oa){if(x.h>.5)rows.push(['⚠ 輻射熱強：下風處與鄰近區域易延燒、飛火','#ff6a5a'])}
   else if(x.h>.7&&x.s>.6&&!x.fl&&!x.vv)rows.push(['⚠ 閃燃前兆','#ff6a5a']);
   else if(tacLayV(x)<.25&&x.h>.55&&!x.fl)rows.push(['⚠ 煙層下降（滾燃風險）','#ff6a5a']);
   g.font='12px '+FONT;const bw=Math.max(170,...rows.map(r=>g.measureText(r[0]).width))+16+38,bh=Math.max(rows.length*16+10,96);
   let bx=hv.x+16,by=hv.y+12;if(bx+bw>tW-4)bx=hv.x-bw-12;if(by+bh>tH-4)by=tH-bh-4;
   g.fillStyle='rgba(12,12,11,.92)';g.fillRect(bx,by,bw,bh);g.strokeStyle='rgba(255,255,255,.18)';g.lineWidth=1;g.strokeRect(bx,by,bw,bh);
   g.font='12px '+FONT;g.textAlign='left';g.textBaseline='top';
   rows.forEach((r,k)=>{g.fillStyle=r[1];g.fillText(r[0],bx+8,by+6+k*16)});
   if(!oa)tacLayBar(g,bx+bw-30,by+18,Math.min(bh-26,110),x)}}
 if(B.mayday){g.fillStyle='rgba(226,86,79,'+(.6+.4*Math.sin(T*8)).toFixed(2)+')';g.font='700 14px '+FONT;g.textAlign='right';g.fillText('MAYDAY × '+B.mayday+'　'+B.sq.filter(q=>q.down).map(q=>q.cs+' '+tacFlr(B,q.f)).join('、'),tW-10,8)}}
