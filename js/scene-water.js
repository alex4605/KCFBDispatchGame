// 現場畫面：水線部署（供水水帶、中繼水帶、攻擊水線與射水、分水器、消防栓、水花）
// 水帶依實際進度鋪設：佔水接管期間逐步展開（未充水為扁平灰帶），接管完成才充水流動
// 由 drawScene() 依序呼叫；參數皆為 drawScene 內算好的區域變數
'use strict';
const WCOL={dry:'rgba(120,116,104,.85)',wet:'rgba(60,150,125,.75)',flow:'#8fe3c4',foamWet:'rgba(190,120,30,.75)',foamFlow:'rgba(255,210,120,.95)',
 jetWet:'rgba(70,130,190,.75)',jetFlow:'rgba(200,230,255,.95)',edge:'rgba(8,16,20,.6)',coupling:'#d6ae4a'};
// 車輛在現場畫面上的中心座標（含停車偏移）
const scPos=(u,c,X,Y)=>[X(u.x+(u.ox||0))+c/2,Y(u.y+(u.oy||0))+c/2];
// 取折線前段（比例 f）
function polyCut(pts,f){
 if(f>=1||pts.length<2)return pts;
 let tot=0;const seg=[];
 for(let i=1;i<pts.length;i++){const l=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);seg.push(l);tot+=l}
 let rem=tot*Math.max(0,f);const out=[pts[0]];
 for(let i=1;i<pts.length&&rem>0;i++){
  if(seg[i-1]<=rem){out.push(pts[i]);rem-=seg[i-1]}
  else{const k=rem/seg[i-1],A=pts[i-1],B=pts[i];out.push([A[0]+(B[0]-A[0])*k,A[1]+(B[1]-A[1])*k]);rem=0}}
 return out}
// 畫一條水帶：dry 為未充水的扁平帶；充水後加粗並以虛線表現水流方向
function hoseLine(g,pts,c,wet,speed){
 if(pts.length<2)return;
 g.lineCap='round';g.lineJoin='round';g.setLineDash([]);
 g.beginPath();g.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)g.lineTo(pts[i][0],pts[i][1]);
 g.strokeStyle=WCOL.edge;g.lineWidth=Math.max(wet?3:2,c*(wet?.2:.12));g.stroke();
 g.strokeStyle=wet?WCOL.wet:WCOL.dry;g.lineWidth=Math.max(wet?2:1.2,c*(wet?.12:.06));g.stroke();
 if(wet){g.strokeStyle=WCOL.flow;g.lineWidth=Math.max(1,c*.045);
  g.setLineDash([c*.45,c*.3]);g.lineDashOffset=-(S.t*(speed||26))%(c*.75);g.stroke();g.setLineDash([])}
 g.lineCap='butt';g.lineJoin='miter'}
function coupling(g,p,c){g.fillStyle=WCOL.coupling;g.beginPath();g.arc(p[0],p[1],Math.max(1.5,c*.06),0,TAU);g.fill()}
// 佔水接管進度 0~1：接管完成為 1；倒數中依剩餘秒數；尚未開始為 0
const hookProg=inc=>inc.hooked?1:inc.hook>0?1-inc.hook/HOOKT:0;

function scSupplyHose(inc,g,d,wOK,showHyd,c,X,Y,sup,atk){
 // 供水：消防栓→佔水車（→中繼車）→攻擊車；水庫車→攻擊車
 if(!d.w||inc.shuttle)return;
 const prog=hookProg(inc),wet=!!inc.hooked;
 if(inc.tender){
  const tk=onScene(inc).filter(u=>u.st==='work'&&u.code==='61');
  if(!tk.length||!atk.length||prog<=0)return;
  tk.forEach((t,i)=>{const a=atk[i%atk.length],A=scPos(t,c,X,Y),B=scPos(a,c,X,Y);
   const mx=(A[0]+B[0])/2+(B[1]-A[1])*.15,my=(A[1]+B[1])/2-(B[0]-A[0])*.15;
   const pts=[];for(let s=0;s<=10;s++){const q=s/10,v=1-q;pts.push([v*v*A[0]+2*v*q*mx+q*q*B[0],v*v*A[1]+2*v*q*my+q*q*B[1]])}
   hoseLine(g,polyCut(pts,prog),c,wet&&t.tank>0);coupling(g,A,c);if(prog>=1)coupling(g,B,c)});
  return}
 if(!inc.hy||!sup.length)return;
 // 路徑：消防栓→道路→進場口→佔水車
 const pts=[[X(inc.hy[0])+c/2,Y(inc.hy[1])+c/2]];
 if(inc.hp)for(const q of inc.hp)pts.push([X(q[0])+c/2,Y(q[1])+c/2]);
 pts.push(scPos(sup[0],c,X,Y));
 const laid=polyCut(pts,prog);
 hoseLine(g,laid,c,wet,26);
 if(prog>0)coupling(g,pts[0],c);
 // 水壓脈衝：充水後由消防栓流向現場
 if(wet&&laid.length>1){
  let tot=0;const seg=[];
  for(let i=1;i<laid.length;i++){const l=Math.hypot(laid[i][0]-laid[i-1][0],laid[i][1]-laid[i-1][1]);seg.push(l);tot+=l}
  g.fillStyle='rgba(220,255,240,.85)';
  for(let k=0;k<4;k++){let dist=((S.t*.35+k/4)%1)*tot,i=0;
   while(i<seg.length-1&&dist>seg[i]){dist-=seg[i];i++}
   const f=seg[i]?dist/seg[i]:0,P0=laid[i],P1=laid[i+1]||P0;
   g.beginPath();g.arc(P0[0]+(P1[0]-P0[0])*f,P0[1]+(P1[1]-P0[1])*f,Math.max(1.5,c*.06),0,TAU);g.fill()}}
 // 中繼：佔水車→中繼車…→第一輛攻擊車（車輛不同時才畫）
 const chain=sup.slice();if(atk[0]&&chain.indexOf(atk[0])<0)chain.push(atk[0]);
 for(let i=0;i+1<chain.length;i++){
  const A=scPos(chain[i],c,X,Y),B=scPos(chain[i+1],c,X,Y),mx=(A[0]+B[0])/2+(B[1]-A[1])*.12,my=(A[1]+B[1])/2-(B[0]-A[0])*.12;
  const cp=[];for(let s=0;s<=8;s++){const q=s/8,v=1-q;cp.push([v*v*A[0]+2*v*q*mx+q*q*B[0],v*v*A[1]+2*v*q*my+q*q*B[1]])}
  hoseLine(g,polyCut(cp,prog),c,wet,22);coupling(g,A,c);if(prog>=1)coupling(g,B,c)}}

function scHydrant(inc,g,showHyd,c,X,Y){
 // 消防栓標示：接管完成時外圈脈動，並標出供水量
 if(!showHyd)return;
 const hx=X(inc.hy[0])+c/2,hy=Y(inc.hy[1])+c/2;
 if(inc.hooked){const pr=(S.t*.8)%1;g.strokeStyle='rgba(125,179,232,'+(.6*(1-pr)).toFixed(2)+')';g.lineWidth=1.5;
  g.beginPath();g.arc(hx,hy,c*(.26+pr*.5),0,TAU);g.stroke()}
 g.fillStyle='#7db3e8';g.beginPath();g.arc(hx,hy,Math.max(3,c*.26),0,TAU);g.fill();
 if(c>=15){g.fillStyle='#08131d';g.font='600 '+(c*.34)+'px '+FONT;g.textAlign='center';g.textBaseline='middle';
  g.fillText('栓',hx,hy);
  if(inc.hooked){g.fillStyle='#7db3e8';g.font='600 '+(c*.22)+'px '+FONT;g.fillText(inflowOf(inc)+' L/s',hx,hy-c*.6)}}}

function scWaterJets(inc,g,wOK,c,X,Y,cx,cy,atk,laid){
 // 攻擊水線：每條線依佈設時間由車輛拉向火點，充水後才射水；爆管的那一線停水
 // 第一次看這件案件時，已經在出水的水線視為早已鋪好，不重播鋪設動畫
 const first=!inc.jl,T=inc.jl||(inc.jl=[]),J=inc._jets=[];
 while(T.length<laid)T.push(first&&inc.fl.w?S.t-10:S.t);T.length=Math.min(T.length,laid);
 for(let li=0;li<laid&&atk.length;li++){
  const a=atk[li%atk.length],foam=a.code==='57'||a.code==='01';
  const [ax,ay]=scPos(a,c,X,Y);
  const off=li-(laid-1)/2,tgx=cx+off*c*.3,tgy=cy+c*.22;
  const mx=ax+(cx-ax)*.5+off*c*.2,my=ay+(cy-ay)*.5+off*c*.2;
  const st=S.t-Math.max(T[li],a.at||0),lay=Math.max(0,Math.min(1,st/2.5));
  const bst=inc.burst>0&&li===laid-1,flow=lay>=1&&wOK&&!bst&&!inc.dry;
  const sw=flow?Math.sin(S.t*4+li*1.9)*c*.05:0,qx=mx+sw,qy=my-sw;
  const full0=Math.hypot(tgx-ax,tgy-ay),end=(full0>0?Math.max(.55,1-c*1.3/full0):.55)*lay;
  const pts=[];for(let s=0;s<=16;s++){const q=end*s/16,v=1-q;pts.push([v*v*ax+2*v*q*qx+q*q*tgx,v*v*ay+2*v*q*qy+q*q*tgy])}
  g.lineCap='round';g.lineJoin='round';g.setLineDash([]);
  g.beginPath();g.moveTo(pts[0][0],pts[0][1]);for(let s=1;s<pts.length;s++)g.lineTo(pts[s][0],pts[s][1]);
  g.strokeStyle=WCOL.edge;g.lineWidth=Math.max(2.5,c*.15);g.stroke();
  g.strokeStyle=!flow?WCOL.dry:foam?WCOL.foamWet:WCOL.jetWet;g.lineWidth=Math.max(1.6,c*(flow?.08:.05));g.stroke();
  if(flow){g.strokeStyle=foam?WCOL.foamFlow:WCOL.jetFlow;g.lineWidth=Math.max(1,c*.04);
   g.setLineDash([c*.32,c*.2]);g.lineDashOffset=-(S.t*40+li*7)%(c*.52);g.stroke();g.setLineDash([])}
  // 瞄子位置：停在距火點約 1.3 格處（距離不足時取水線 55%），之後由水柱接到火點
  const nt=end,nv=1-nt,nx=nv*nv*ax+2*nv*nt*qx+nt*nt*tgx,ny=nv*nv*ay+2*nv*nt*qy+nt*nt*tgy;
  coupling(g,[nx,ny],c);
  if(flow)J.push([nx,ny,tgx,tgy-c*.22,foam,li,S.t-T[li]-2.5]);
  if(bst){const bt=.45,bv=1-bt,bx=bv*bv*ax+2*bv*bt*qx+bt*bt*tgx,by=bv*bv*ay+2*bv*bt*qy+bt*bt*tgy;
   g.fillStyle='rgba(40,75,110,.3)';g.beginPath();g.ellipse(bx,by+c*.06,c*.45,c*.2,0,0,TAU);g.fill();
   g.fillStyle='rgba(200,228,255,.8)';
   for(let k=0;k<9;k++){const p=(S.t*1.6+k/9)%1,an=-Math.PI/2+(k%3-1)*.45;
    g.beginPath();g.arc(bx+Math.cos(an)*c*.5*p,by+Math.sin(an)*c*.5*p+p*p*c*.55,Math.max(1,c*.04),0,TAU);g.fill()}
   g.strokeStyle='rgba(226,86,79,'+(.5+.4*Math.sin(S.t*8)).toFixed(2)+')';g.lineWidth=1.5;g.beginPath();g.arc(bx,by,c*.3,0,TAU);g.stroke()}
  g.lineCap='butt';g.lineJoin='miter'}
 // 分水器：同一輛車拉出兩條以上水線時，畫在車與火點之間
 if(laid>atk.length&&atk[0]){const [ax,ay]=scPos(atk[0],c,X,Y),mx=(ax+cx)/2,my=(ay+cy)/2;
  g.fillStyle='#f0c53a';scRR(g,mx-c*.08,my-c*.06,c*.16,c*.12,c*.02);g.fill()}}

function scWaterStream(inc,g,c){
 // 空中水柱：由瞄子拋向火點，開水後約 1 秒內射程逐漸拉長
 const J=inc._jets;if(!J||!J.length)return;
 g.lineCap='round';
 for(const [nx,ny,tx,ty,foam,li,age] of J){
  const reach=Math.max(0,Math.min(1,age/1)),ex=nx+(tx-nx)*reach,ey=ny+(ty-ny)*reach;
  const lift=Math.hypot(tx-nx,ty-ny)*.35,qx=(nx+ex)/2+Math.sin(S.t*3+li)*c*.04,qy=(ny+ey)/2-lift*reach;
  g.beginPath();g.moveTo(nx,ny);g.quadraticCurveTo(qx,qy,ex,ey);
  g.strokeStyle=foam?'rgba(255,214,140,.35)':'rgba(170,215,255,.35)';g.lineWidth=Math.max(2,c*.1);g.stroke();
  g.strokeStyle=foam?'rgba(255,236,190,.9)':'rgba(225,242,255,.9)';g.lineWidth=Math.max(1,c*.035);
  g.setLineDash([c*.22,c*.14]);g.lineDashOffset=-(S.t*60+li*9)%(c*.36);g.stroke();g.setLineDash([]);
  if(reach>=1){g.fillStyle=foam?'rgba(255,236,190,.7)':'rgba(225,242,255,.7)';
   for(let k=0;k<4;k++){const p=(S.t*2+k/4+li*.3)%1;
    g.beginPath();g.arc(ex+Math.cos(k*1.7+li)*c*.25*p,ey+Math.sin(k*1.7+li)*c*.12*p-c*.1*p,Math.max(1,c*.04*(1-p)),0,TAU);g.fill()}}}
 g.lineCap='butt'}
function scSplash(inc,g,d,effNow,wOK,c,cx,cy){
 // 射水衝擊處的水花與蒸汽
 if(d.w&&effNow>0&&wOK&&!inc.dry){
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
