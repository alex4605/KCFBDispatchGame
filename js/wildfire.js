// 山火戰略作戰圖：火場在大地圖格子上擴展（每格約 1 公頃），受風向、坡度（地形起伏）、晝夜影響；
// 依風向把火線分成火頭、左翼、右翼、火尾四個分區，把到場車輛與外部支援派到分區執行地面水線、防火線、直升機灑水
'use strict';
const WF_SEC={head:'火頭',left:'左翼',right:'右翼',tail:'火尾'};
const WF_SECK=['head','left','right','tail'];
const WF_SCOL={head:'#e2564f',left:'#e9a13b',right:'#d8c45a',tail:'#7db3e8'};
const WF_TASK={water:'地面水線',brk:'防火線'};
const WF_D8=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
// 燃料：林地 1、草地與農地 .5、市區街廓（房舍）.7、產業道路 .25（窄路擋不太住）、其他道路與水域 0
function wfFu(x,y){if(x<0||y<0||x>=N||y>=N)return 0;const k=K(x,y),t=TR[k],r=RD[k];
 if(t===1)return 0;if(r)return r===5?.25:0;if(t===2)return 1;if(t===3||t===4)return .4;return .35}
const wfUrban=(x,y)=>x>=0&&y>=0&&x<N&&y<N&&!RD[K(x,y)]&&(TR[K(x,y)]===0||TR[K(x,y)]===3);
// 夜間：直升機停飛；濕度升高，延燒趨緩（與現場畫面的晝夜循環一致）
const wfNight=()=>{const d=(S.t%200)/200;return d>.62&&d<.95};
const wfPump=u=>!!CODE[u.code].cap&&u.code!=='61';
function wfInit(inc){
 // 起火點：離報案地點最近的林地（不是道路）
 let o=null,bd=1e9;
 // 偏好成片林地：距離減去周圍林地密度
 for(let x=0;x<N;x++)for(let y=0;y<N;y++){if(TR[K(x,y)]!==2||RD[K(x,y)])continue;let fd=0;for(let a=-2;a<=2;a++)for(let b=-2;b<=2;b++)if(ter(x+a,y+b)===2)fd++;
  const d=Math.hypot(x-inc.x,y-inc.y)-fd*.4;if(d<bd){bd=d;o=[x,y]}}
 if(!o)o=[inc.x,inc.y];
 const W=inc.wf={F:new Map(),B:new Set(),BK:new Set(),bp:{},o,wind:tacWind(),peak:1,as:{},auto:1,heli:{st:0,t:0,n:0,sec:'head',cd:0,fx:[]},
  crew:{st:0,t:0,n:0,sec:'head'},thr:new Set(),hit:new Set(),lost:0,mop:0,done:0,t0:S.t};
 if(W.wind.v<.3){W.wind.v=.4;W.wind.ms=3;W.wind.nm=W.wind.nm.replace(/\d+ m/,'3 m')}
 wfIgn(W,o[0],o[1],.6);
 // 到場前已燒了一段時間：依通報面積先擴展
 const n=10+Math.round((inc.pm.area||80)/20);
 for(let i=0;i<n*3&&W.F.size<n;i++){const ks=[...W.F.keys()],k=ks[Math.floor(Math.random()*ks.length)],x=(k/N)|0,y=k%N,d=pick(WF_D8);wfIgn(W,x+d[0],y+d[1],.3+Math.random()*.4)}
 radio(inc,'受理','山林火警啟動山火作戰圖：起火點在'+inc.addr+'附近林地，'+W.wind.nm+'，火頭往'+wfDirN(W.wind.d)+'延燒。')}
function wfDirN(d){const a=Math.atan2(d[1],d[0])*180/Math.PI;return['東','東南','南','西南','西','西北','北','東北'][((Math.round(a/45)%8)+8)%8]}
function wfIgn(W,x,y,h){const k=K(x,y);if(W.prot&&W.prot.has(k))return false;if(x<0||y<0||x>=N||y>=N||W.F.has(k)||W.B.has(k)||W.BK.has(k))return false;const fu=wfFu(x,y);if(fu<=0)return false;
 W.F.set(k,{x,y,h,fu,f0:fu,wet:0});return true}
// 火線（仍有可燃鄰格的燃燒格）與分區：以火場重心為中心，順風方向為火頭、逆風為火尾，左右為兩翼
function wfEdges(W){
 let cx=0,cy=0,n=0;for(const c of W.F.values()){cx+=c.x;cy+=c.y;n++}
 if(!n)return{cx:W.o[0],cy:W.o[1],E:[]};cx/=n;cy/=n;
 const E=[],d=W.wind.d;
 for(const c of W.F.values()){if(c.h<.05)continue;
  if(!WF_D8.some(v=>{const x=c.x+v[0],y=c.y+v[1],k=K(x,y);return wfFu(x,y)>0&&!W.F.has(k)&&!W.B.has(k)&&!W.BK.has(k)}))continue;
  let vx=c.x-cx,vy=c.y-cy;const l=Math.hypot(vx,vy);if(l<.5){vx=d[0];vy=d[1]}else{vx/=l;vy/=l}
  const dot=vx*d[0]+vy*d[1],cr=vx*d[1]-vy*d[0];
  c.sec=dot>.55?'head':dot<-.55?'tail':cr>0?'left':'right';E.push(c)}
 return{cx,cy,E}}
// 是否在地面水線可及範圍：2 格內有車輛可到的道路
function wfReach(x,y){for(let dx=-2;dx<=2;dx++)for(let dy=-2;dy<=2;dy++){const a=x+dx,b=y+dy;if(a>=0&&b>=0&&a<N&&b<N&&RD[K(a,b)])return true}return false}
// 每秒：燃燒、延燒、壓制、防火線、直升機、外部人力、威脅民宅
function wfStep(inc,dt){
 const W=inc.wf;W.acc=(W.acc||0)+dt;if(W.acc<1)return;const s=W.acc;W.acc=0;
 const night=wfNight(),wd=W.wind,wOK=waterOK(inc)||onScene(inc).some(u=>u.code==='61'&&u.st==='work');
 // 燃燒與延燒
 const ign=[];
 for(const[k,c]of W.F){
  if(c.wet>0)c.wet-=s;
  if(c.h<=.01){W.F.delete(k);W.B.add(k);continue} // 已被壓制撲滅
  if(c.fu>0){c.h=Math.min(1,c.h+s*.035*(1-c.h)*(night?.6:1)*(c.wet>0?.2:1));c.fu=Math.max(0,c.fu-s*.004*c.h)}
  else c.h-=s*.03;
  if(c.h<=0){W.F.delete(k);W.B.add(k);continue}
  if(c.h<.35||c.wet>0)continue;
  for(const v of WF_D8){const x=c.x+v[0],y=c.y+v[1],nk=K(x,y);if(W.F.has(nk)||W.B.has(nk)||W.BK.has(nk))continue;const f=wfFu(x,y);if(!f)continue;
   const l=Math.hypot(v[0],v[1]),dot=(v[0]*wd.d[0]+v[1]*wd.d[1])/l,wf=Math.max(.15,1+1.7*wd.v*dot);
   const sl=1+Math.max(-.5,Math.min(1.2,(SH[nk]-SH[k])*3)); // 往上坡燒得快
   if(Math.random()<s*.015*c.h*f*wf*sl*(night?.5:1)*(l>1?.7:1))ign.push([x,y])}
  // 民宅威脅
  if(c.h>.4)for(const v of WF_D8){const x=c.x+v[0],y=c.y+v[1],nk=K(x,y);if(wfUrban(x,y)&&!W.thr.has(nk)){W.thr.add(nk);
   if(!(W.thrT>S.t)){W.thrT=S.t+30;radio(inc,'現場','火線逼近（'+x+','+y+'）附近民宅與工寮，請派員周界防護、疏散住戶！')}}}
  if(wfUrban(c.x,c.y)&&c.h>.5&&!W.hit.has(k)){W.hit.add(k);W.lost++;S.rep-=1;radio(inc,'受理','火勢延燒至（'+c.x+','+c.y+'）民宅工寮（評鑑 -1），請加強周界防護。');if(S.rep<=0){S.rep=0;S.over=true}}}
 for(const p of ign)wfIgn(W,p[0],p[1],.15);
 // 分區與派遣
 const{E}=wfEdges(W);W.E=E;W.peak=Math.max(W.peak,E.length);
 const bySec={};for(const k of WF_SECK)bySec[k]=E.filter(c=>c.sec===k).sort((a,b)=>b.h-a.h);
 if(W.auto)wfAuto(inc,W,bySec);
 for(const u of onScene(inc)){if(u.st!=='work')continue;const a=W.as[u.id];if(!a)continue;
  if(inc.tac&&inc.tac.sq.some(q=>q.u===u.id&&q.task!=='idle'))continue; // 正在建物防護戰術場景作業
  const L=bySec[a.sec];if(!L||!L.length)continue;
  // 地面水線：先打逼近民宅的火線（建物防護），再打最猛的
  if(a.task==='water'&&wfPump(u)){const thr=c=>WF_D8.some(v=>wfUrban(c.x+v[0],c.y+v[1]))?1:0,rc=L.filter(c=>wfReach(c.x,c.y)).sort((a,b)=>thr(b)-thr(a)||b.h-a.h).slice(0,1);
   for(const c of rc){c.h=Math.max(0,c.h-s*.02*(wOK?1:.4)*(u.code==='57'?1.2:1));c.wet=Math.max(c.wet,4)}}
  else if(a.task==='brk')wfBreak(W,L,s/30)}
 // 外部人力（林務署、國軍）：開設防火線
 if(W.crew.st===2)for(let i=0;i<W.crew.n;i++)wfBreak(W,bySec[W.crew.sec]||[],s/22);
 // 直升機（白天才能飛）：每 40 秒一趟，灑在分區最猛的火線
 const H=W.heli;
 if(H.st===1){H.t-=s;if(H.t<=0){H.st=2;H.n=2;radio(inc,'空勤','空勤總隊 2 架直升機抵達，開始吊桶灑水（夜間停飛）。')}}
 if(H.st===2&&!night){H.cd-=s;if(H.cd<=0){H.cd=40/H.n;const L=bySec[H.sec]&&bySec[H.sec].length?bySec[H.sec]:E.slice().sort((a,b)=>b.h-a.h);const c=L[0];
   if(c){for(const v of[[0,0]].concat(WF_D8)){const g=W.F.get(K(c.x+v[0],c.y+v[1]));if(g){g.h=Math.max(0,g.h-.35);g.wet=20}}H.fx.push({x:c.x,y:c.y,t:S.t})}}}
 if(H.st===2&&night&&!H.nw){H.nw=1;radio(inc,'空勤','天色已暗，直升機返航待命，天亮後再出勤。')}if(!night)H.nw=0;
 const C=W.crew;if(C.st===1){C.t-=s;if(C.t<=0){C.st=2;C.n=3;radio(inc,'林務署','林務署與國軍 3 個地面班抵達，開始開設防火線。')}}}
// 防火線：在分區火線外側隔一格的可燃格清除植被
function wfBreak(W,L,rate){
 if(!L.length)return;
 let tgt=null,bd=1e9;
 for(const c of L.slice(0,6))for(const v of WF_D8){const x=c.x+v[0]*2,y=c.y+v[1]*2,k=K(x,y);
  if(wfFu(x,y)<=0||W.F.has(k)||W.B.has(k)||W.BK.has(k))continue;const d=-(W.bp[k]||0);if(d<bd){bd=d;tgt=k}}
 if(tgt===null)return;W.bp[tgt]=(W.bp[tgt]||0)+rate;if(W.bp[tgt]>=1){W.BK.add(tgt);delete W.bp[tgt]}}
// 自動分派：幫浦車打可及的火線（火頭與威脅民宅優先），其他車組開防火線；火大時請求直升機與林務署
function wfAuto(inc,W,bySec){
 const reach=k=>bySec[k].filter(c=>wfReach(c.x,c.y)).length;
 for(const u of onScene(inc)){if(u.st!=='work'||u.code==='91'||u.code==='41'||u.code==='61')continue;
  // 已手動指定的不動；自動派的分區沒有火線了就改派
  const a=W.as[u.id];if(a&&(a.man||bySec[a.sec].length))continue;
  if(wfPump(u)){const best=WF_SECK.filter(k=>reach(k)>0).sort((a,b)=>reach(b)*(b==='head'?2:1)-reach(a)*(a==='head'?2:1))[0];W.as[u.id]={sec:best||'head',task:'water'}}
  else W.as[u.id]={sec:bySec.head.length?'head':WF_SECK.filter(k=>bySec[k].length).sort((a,b)=>bySec[b].length-bySec[a].length)[0]||'head',task:'brk'}}
 if(W.F.size>=10&&!W.heli.st)wfHeli(inc,1);
 if(W.F.size>=16&&!W.crew.st)wfCrew(inc,1)}
function wfHeli(inc,ai){const H=inc.wf.heli;if(H.st)return;H.st=1;H.t=280+Math.random()*120;
 radio(inc,'受理',(ai?'（自動）':'')+'已向空勤總隊申請直升機吊桶灑水，預估 '+Math.ceil(H.t/60)+' 分鐘後抵達。')}
function wfCrew(inc,ai){const C=inc.wf.crew;if(C.st)return;C.st=1;C.t=360+Math.random()*150;
 radio(inc,'受理',(ai?'（自動）':'')+'已請林務署與國軍支援地面人力，集結約 '+Math.ceil(C.t/60)+' 分鐘。')}
// 由 stepIncident 呼叫：取代原本的抽象進度
function wfIncident(inc,dt,first){
 if(!inc.wf)wfInit(inc);
 const W=inc.wf;
 if(inc.req){inc.reqT-=dt;if(inc.reqT<=0)answer(inc,false,true)}
 if(first)wfStep(inc,dt);
 const act=W.F.size,ctl=W.E&&W.peak>1?Math.max(0,1-W.E.length/W.peak):0;
 // 建物防護場景還在進行時不結案
 if(!act&&!W.done&&!inc.tac){W.mop+=dt;if(W.mop>=15){W.done=1;
  radio(inc,first?first.cs:'現場','山火撲滅、殘火處理完成，燒毀約 '+W.B.size+' 公頃'+(W.lost?'、延燒民宅工寮 '+W.lost+' 處':'')+'。')}}
 const w=inc.dur*(W.done?1:Math.min(.96,act?ctl*.9:.95));
 if(w>inc.work)inc.work=w;
 const np=Math.min(inc.phs.length-1,Math.floor(inc.work/inc.dur*inc.phs.length));
 if(np>inc.ph){inc.ph=np;radio(inc,first?first.cs:'現場','進入「'+inc.phs[np]+'」階段。')}
 if(!W.done)inc.left-=dt*(first?.15:1)}
// ===== 繪製：大地圖疊加 =====
function wfDrawMap(ctx,c){
 for(const inc of S.inc){const W=inc.wf;if(!W)continue;
  ctx.fillStyle='rgba(10,8,6,.55)';for(const k of W.B){const x=(k/N)|0,y=k%N;ctx.fillRect(x*c,y*c,c+.6,c+.6)}
  ctx.fillStyle='rgba(160,120,70,.55)';for(const k of W.BK){const x=(k/N)|0,y=k%N;ctx.fillRect(x*c+c*.2,y*c+c*.2,c*.6,c*.6)}
  for(const f of W.F.values()){ctx.fillStyle='rgba(255,'+(140-f.h*90|0)+',40,'+(.35+.5*f.h).toFixed(2)+')';ctx.fillRect(f.x*c,f.y*c,c+.6,c+.6)}}}
// ===== 繪製：現場畫面改為山火作戰圖 =====
function wfScene(inc,g){
 const W=inc.wf;if(!W){g.fillStyle='#0b0b0a';g.fillRect(0,0,scW,scH);return}
 let x0=W.o[0],x1=W.o[0],y0=W.o[1],y1=W.o[1];
 for(const k of [...W.F.keys(),...W.B]){const x=(k/N)|0,y=k%N;x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y)}
 x0-=4;x1+=4;y0-=4;y1+=4;
 // 指揮站（報案地點）離火場不遠才一起框進來
 const near=Math.hypot(inc.x-W.o[0],inc.y-W.o[1])<10;if(near){x0=Math.min(x0,inc.x-2);x1=Math.max(x1,inc.x+2);y0=Math.min(y0,inc.y-2);y1=Math.max(y1,inc.y+2)}
 // 至少 18×12 格，維持比例
 while(x1-x0<17){x0--;x1++}while(y1-y0<11){y0--;y1++}
 const c=Math.max(8,Math.min((scW-20)/(x1-x0+1),(scH-60)/(y1-y0+1))),ox=(scW-c*(x1-x0+1))/2,oy=40+(scH-40-c*(y1-y0+1))/2;
 const X=v=>ox+(v-x0)*c,Y=v=>oy+(v-y0)*c,T=S.t;
 g.fillStyle='#0b0b0a';g.fillRect(0,0,scW,scH);
 for(let x=Math.max(0,x0);x<=Math.min(N-1,x1);x++)for(let y=Math.max(0,y0);y<=Math.min(N-1,y1);y++){const k=K(x,y),t=TR[k],r=RD[k],sh=SH[k];
  g.fillStyle=t===1?'#0e2436':t===2?(sh<.5?'#18291d':'#1d3322'):t===3?'#202836':(sh<.5?'#1c1c1a':'#21211e');g.fillRect(X(x),Y(y),c+.6,c+.6);
  if(t===2&&c>14){g.fillStyle='#24402a';g.beginPath();g.arc(X(x)+c*.5,Y(y)+c*.5,c*.18,0,TAU);g.fill()}
  // 等高（以地形起伏著色的細線）
  if(t===2&&sh>.6){g.strokeStyle='rgba(120,160,110,.12)';g.lineWidth=1;g.strokeRect(X(x)+2,Y(y)+2,c-4,c-4)}
  if(wfUrban(x,y)&&c>12){g.fillStyle='#3a3a40';g.fillRect(X(x)+c*.25,Y(y)+c*.25,c*.5,c*.4)}
  if(r){g.fillStyle=RCOL[r];g.fillRect(X(x),Y(y),c+.6,c+.6)}}
 for(const k of W.B){const x=(k/N)|0,y=k%N;g.fillStyle='rgba(8,6,5,.75)';g.fillRect(X(x),Y(y),c+.6,c+.6)}
 for(const k in W.bp){const x=(k/N)|0,y=k%N;g.fillStyle='rgba(200,160,90,'+(.15+.4*W.bp[k]).toFixed(2)+')';g.fillRect(X(x)+c*.15,Y(y)+c*.15,c*.7*W.bp[k],c*.7)}
 for(const k of W.BK){const x=(k/N)|0,y=k%N;g.fillStyle='#5a4530';g.fillRect(X(x)+1,Y(y)+1,c-2,c-2);g.strokeStyle='#c9a060';g.lineWidth=1;
  for(let i=1;i<4;i++){g.beginPath();g.moveTo(X(x)+c*i/4,Y(y)+2);g.lineTo(X(x)+c*i/4,Y(y)+c-2);g.stroke()}}
 for(const f of W.F.values()){const px=X(f.x),py=Y(f.y);g.fillStyle='rgba(255,'+(120-f.h*70|0)+',30,'+(.3+.4*f.h).toFixed(2)+')';g.fillRect(px,py,c+.6,c+.6);
  for(let i=0;i<Math.ceil(f.h*3);i++){const fx=px+c*(.2+.6*((f.x*7+i*13)%11/11)),fy=py+c*(.2+.6*((f.y*5+i*7)%9/9)),fr=c*(.12+.18*f.h)*(.8+.3*Math.sin(T*8+i+f.x));
   const gr=g.createRadialGradient(fx,fy,0,fx,fy,fr);gr.addColorStop(0,'rgba(255,230,120,.95)');gr.addColorStop(1,'rgba(255,80,20,0)');g.fillStyle=gr;g.beginPath();g.arc(fx,fy,fr,0,TAU);g.fill()}
  if(f.wet>0){g.fillStyle='rgba(125,179,232,.25)';g.fillRect(px,py,c+.6,c+.6)}}
 // 煙流
 for(const f of W.F.values()){if(f.h<.5||((f.x+f.y)&1))continue;for(let i=0;i<3;i++){const ph=(T*.2+i/3+f.x*.1)%1,d=ph*c*3;
  g.fillStyle='rgba(80,80,84,'+((1-ph)*.35).toFixed(2)+')';g.beginPath();g.arc(X(f.x)+c/2+W.wind.d[0]*d,Y(f.y)+c/2+W.wind.d[1]*d,c*(.3+ph*.6),0,TAU);g.fill()}}
 // 火線分區
 for(const e of W.E||[]){g.strokeStyle=WF_SCOL[e.sec];g.lineWidth=2.5;g.strokeRect(X(e.x)+1.5,Y(e.y)+1.5,c-3,c-3)}
 // 分區標籤與派遣資源
 const res={};for(const k of WF_SECK)res[k]=[];
 for(const u of onScene(inc)){const a=W.as[u.id];if(a&&u.st==='work')res[a.sec].push(u.cs+(a.task==='water'?'💧':'⛏'))}
 if(W.crew.st===2)res[W.crew.sec].push('地面班×'+W.crew.n+'⛏');
 if(W.heli.st===2)res[W.heli.sec].push('直升機×'+W.heli.n+(wfNight()?'（夜停）':''));
 for(const k of WF_SECK){const L=(W.E||[]).filter(e=>e.sec===k);if(!L.length)continue;
  const ax=L.reduce((a,e)=>a+e.x,0)/L.length,ay=L.reduce((a,e)=>a+e.y,0)/L.length,px=X(ax)+c/2,py=Y(ay)+c/2;
  const lines=[WF_SEC[k]+' '+L.length+' 格'].concat(res[k].slice(0,4)),w=Math.max(...lines.map(s=>s.length))*11+12;
  g.fillStyle='rgba(12,12,11,.85)';g.fillRect(px-w/2,py-8,w,lines.length*14+6);g.strokeStyle=WF_SCOL[k];g.lineWidth=1.5;g.strokeRect(px-w/2,py-8,w,lines.length*14+6);
  g.font='600 11px '+FONT;g.textAlign='center';g.textBaseline='top';lines.forEach((s,i)=>{g.fillStyle=i?'#eceae3':WF_SCOL[k];g.fillText(s,px,py-5+i*14)})}
 // 民宅威脅
 for(const k of W.thr){const x=(k/N)|0,y=k%N;g.strokeStyle=W.hit.has(k)?'#ff4a3a':'#e9a13b';g.lineWidth=2;g.beginPath();g.moveTo(X(x)+c/2,Y(y)+3);g.lineTo(X(x)+c-3,Y(y)+c-3);g.lineTo(X(x)+3,Y(y)+c-3);g.closePath();g.stroke()}
 // 直升機灑水動畫
 W.heli.fx=W.heli.fx.filter(f=>T-f.t<4);
 for(const f of W.heli.fx){const k=(T-f.t)/4;g.fillStyle='rgba(125,179,232,'+(.5*(1-k)).toFixed(2)+')';g.beginPath();g.arc(X(f.x)+c/2,Y(f.y)+c/2,c*(.6+k*1.2),0,TAU);g.fill()}
 if(W.heli.st===2&&!wfNight())for(let i=0;i<W.heli.n;i++){const a=T*.6+i*Math.PI,hx=X(W.o[0])+Math.cos(a)*c*3,hy=Y(W.o[1])+Math.sin(a)*c*2;
  g.fillStyle='#d8d4c8';g.beginPath();g.ellipse(hx,hy,7,4,a,0,TAU);g.fill();g.strokeStyle='rgba(220,220,220,.6)';g.lineWidth=1;g.beginPath();g.moveTo(hx-10,hy);g.lineTo(hx+10,hy);g.stroke()}
 // 起火點、案件位置
 g.fillStyle='#ff8a6a';g.font='600 11px '+FONT;g.textAlign='center';g.textBaseline='bottom';g.fillText('起火點',X(W.o[0])+c/2,Y(W.o[1]));
 if(near){g.fillStyle='#e9a13b';g.beginPath();g.arc(X(inc.x)+c/2,Y(inc.y)+c/2,5,0,TAU);g.fill();g.fillText('指揮站',X(inc.x)+c/2,Y(inc.y)+c/2-6)}
 // 標題列：面積、控制率、風、晝夜
 const ctl=Math.round(Math.max(0,1-(W.E?W.E.length:0)/W.peak)*100);
 g.fillStyle='rgba(12,12,11,.85)';g.fillRect(0,0,scW,34);
 g.fillStyle='#eceae3';g.font='600 13px '+FONT;g.textAlign='left';g.textBaseline='middle';
 g.fillText('山火作戰圖　燃燒中 '+W.F.size+' 公頃　已燒毀 '+W.B.size+' 公頃　控制 '+ctl+'%　'+W.wind.nm+'（火頭往'+wfDirN(W.wind.d)+'）　'+(wfNight()?'夜間：直升機停飛、延燒趨緩':'白天'),10,17);
 // 風向標
 const wx=scW-30,wy=60,d=W.wind.d;g.fillStyle='rgba(12,12,11,.8)';g.beginPath();g.arc(wx,wy,18,0,TAU);g.fill();
 g.strokeStyle='#7db3e8';g.lineWidth=2.5;g.beginPath();g.moveTo(wx-d[0]*12,wy-d[1]*12);g.lineTo(wx+d[0]*12,wy+d[1]*12);g.stroke();
 g.fillStyle='#7db3e8';g.beginPath();g.arc(wx+d[0]*12,wy+d[1]*12,4,0,TAU);g.fill()}
// ===== 案件詳情面板：分區派遣、外部支援 =====
function wfPanel(inc){
 const W=inc.wf;if(!W)return'';
 const ctl=Math.round(Math.max(0,1-(W.E?W.E.length:0)/W.peak)*100);
 let h='<div class="hd mt">山火作戰圖</div><div class="kv"><div><b>燃燒中</b>'+W.F.size+' 公頃</div><div><b>已燒毀</b>'+W.B.size+' 公頃</div><div><b>控制</b>'+ctl+'%</div><div><b>風</b>'+W.wind.nm+'</div><div><b>防火線</b>'+W.BK.size+' 格</div><div><b>民宅</b>'+(W.lost?'<span style="color:var(--red)">延燒 '+W.lost+' 處</span>':W.thr.size?'<span style="color:var(--amb)">受威脅 '+W.thr.size+' 處</span>':'安全')+'</div></div>';
 const td=wfWuiTodo(W);
 if(td.length||inc.tac||W.wd){h+='<div class="note" style="display:block">'+(inc.tac?'建物防護戰術進行中（'+((inc.tac.wk/N)|0)+','+(inc.tac.wk%N)+'），完成後依序轉往下一處。':td.length?'火線逼近民宅 '+td.length+' 處：點上方「⚔ 建物防護戰術」依序親自指揮。':'受威脅民宅都已處置。')+
  (W.wd?'　已防護 '+W.wd.size+' 處，保住 '+(W.svH||0)+' 棟、燒毀 '+(W.lsH||0)+' 棟。':'')+'</div>';
  if(td.length)h+='<div class="row" style="flex-wrap:wrap;gap:4px"><span class="sub">處理順序</span>'+td.slice(0,6).map((k,i)=>'<button data-wfpri="'+k+'" style="padding:1px 6px'+(i===0?';background:var(--amb);color:#111':'')+'" title="設為下一處">'+(i+1)+'.（'+((k/N)|0)+','+(k%N)+'）火勢 '+Math.round(wfHeatAt(W,k)*100)+'%</button>').join('')+'</div>'}
 const E=W.E||[];
 h+='<div class="row" style="flex-wrap:wrap;gap:4px">'+WF_SECK.map(k=>'<span class="tag" style="background:'+WF_SCOL[k]+';color:#111">'+WF_SEC[k]+' '+E.filter(e=>e.sec===k).length+'</span>').join('')+
  '<button data-wfauto="1"'+(W.auto?' class="on"':'')+' title="新到車輛自動分派到分區">自動分派'+(W.auto?'：開':'：關')+'</button></div>';
 h+='<div class="sub" style="margin:2px 0 4px">點分區把該車派過去；點任務切換地面水線（幫浦車，需道路 2 格內）與防火線。</div>';
 for(const u of onScene(inc)){if(u.st!=='work'||u.code==='91'||u.code==='41'||u.code==='61')continue;const a=W.as[u.id]||{};
  h+='<div class="row" style="gap:4px"><span class="mono" style="min-width:56px">'+u.cs+'</span><span>'+
   WF_SECK.map(k=>'<button data-wfu="'+u.id+'" data-wfs="'+k+'" style="padding:1px 6px'+(a.sec===k?';background:'+WF_SCOL[k]+';color:#111':'')+'">'+WF_SEC[k]+'</button>').join('')+
   '<button data-wfu="'+u.id+'" data-wft="1" style="padding:1px 6px"'+(wfPump(u)?'':' disabled')+'>'+(a.task?WF_TASK[a.task]:'未派')+'</button></span></div>'}
 const st=(o,a,b,c)=>o.st===0?a:o.st===1?b:c;
 h+='<div class="row" style="gap:6px;flex-wrap:wrap;margin-top:6px"><span>空勤直升機</span>'+st(W.heli,'<button data-wfheli="1">申請</button>','<span class="tag" style="background:var(--amb)">前來中 '+fmt(W.heli.t)+'</span>',
  WF_SECK.map(k=>'<button data-wfhs="'+k+'" style="padding:1px 6px'+(W.heli.sec===k?';background:'+WF_SCOL[k]+';color:#111':'')+'">'+WF_SEC[k]+'</button>').join('')+(wfNight()?'<span class="sub">夜間停飛</span>':''))+'</div>';
 h+='<div class="row" style="gap:6px;flex-wrap:wrap"><span>林務署／國軍地面班</span>'+st(W.crew,'<button data-wfcrew="1">請求</button>','<span class="tag" style="background:var(--amb)">集結中 '+fmt(W.crew.t)+'</span>',
  WF_SECK.map(k=>'<button data-wfcs="'+k+'" style="padding:1px 6px'+(W.crew.sec===k?';background:'+WF_SCOL[k]+';color:#111':'')+'">'+WF_SEC[k]+'</button>').join(''))+'</div>';
 return h}
// 面板按鈕
function wfClick(inc,D){
 const W=inc.wf;if(!W)return false;
 if(D.wfauto){W.auto=W.auto?0:1;return true}
 if(D.wfpri){W.pri=+D.wfpri;return true}
 if(D.wfheli){wfHeli(inc);return true}
 if(D.wfcrew){wfCrew(inc);return true}
 if(D.wfhs){W.heli.sec=D.wfhs;return true}
 if(D.wfcs){W.crew.sec=D.wfcs;return true}
 if(D.wfu){const id=+D.wfu,a=W.as[id]||(W.as[id]={sec:'head',task:'brk'});a.man=1;const u=S.units.find(x=>x.id===id);
  if(D.wfs)a.sec=D.wfs;
  if(D.wft&&u&&wfPump(u))a.task=a.task==='water'?'brk':'water';
  if(!a.task)a.task=u&&wfPump(u)?'water':'brk';
  return true}
 return false}
// 建物防護場景的林地方向：從受威脅的民宅格看，附近燃燒中的火格（越猛、越近權重越大）在哪一側
function wfFireDir(inc){
 const W=inc.wf;if(!W)return null;const k=wfWuiTodo(W)[0];if(k===undefined)return null;
 const hx=(k/N)|0,hy=k%N;let sx=0,sy=0,sw=0;
 for(const c of W.F.values()){const d=Math.hypot(c.x-hx,c.y-hy);if(d>5||d<.5)continue;const w=(c.h+.1)/d;sx+=(c.x-hx)*w;sy+=(c.y-hy)*w;sw+=w}
 if(!sw){for(const c of W.F.values()){sx+=c.x-hx;sy+=c.y-hy;sw++}}
 if(!sw){sx=W.o[0]-hx;sy=W.o[1]-hy}
 return tacDirOf(sx,sy)}
