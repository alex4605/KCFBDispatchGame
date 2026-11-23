// 現場畫面主流程 drawScene()：算出共用變數後依序呼叫各 scene-*.js 的繪製函式
'use strict';
function applySwap(){
 const sw=document.getElementById('scenewrap'),mw=$('mapwrap'),m=document.querySelector('main'),r=$('right');
 const want=wantSwap&&sw.style.display!=='none'&&!shopOn;
 if(want===isSwapped)return;
 isSwapped=want;
 if(want){m.insertBefore(sw,r);r.insertBefore(mw,$('detail'))}
 else{m.insertBefore(mw,r);r.insertBefore(sw,$('detail'))}
 m.classList.toggle('sw',want);
 size();if(want)fit()}
const SCACHE={key:'',cv:null};
function drawScene(){
 const wrap=document.getElementById('scenewrap');
 const inc=S.inc.find(i=>i.id===sel);
 if(!inc){if(wrap.style.display!=='none')wrap.style.display='none';applySwap();return}
 if(wrap.style.display==='none'){wrap.style.display='block';sizeScene()}
 applySwap();
 const g=sctx,d=KIND[inc.k],crew=onScene(inc);
 const dayT=(S.t%200)/200;
 const nf=Math.max(0,Math.min(1,(dayT-.55)/.15)-Math.min(1,Math.max(0,(dayT-.9)/.08)));
 const work=[],pumpsV=[],ambV=[],rescV=[],cmdV=[];
 for(const u of crew){
  if(u.st!=='work')continue;
  work.push(u);
  const cd=u.code;
  if(CODE[cd].cap&&cd!=='61')pumpsV.push(u);
  if(cd==='91')ambV.push(u);
  if(cd==='71'||cd==='搜')rescV.push(u);
  if(cd==='41')cmdV.push(u)}
 const safeNow=emsSafe(inc),effNow=d.w?Math.max(0,effLines(inc)-(inc.burst>0?1:0)):0,wOK=waterOK(inc);
 const ct=Math.max(12,(isSwapped?46:Math.min(scW/11,scH/7))*scZoom);
 const HW=Math.max(2,Math.ceil(scW/ct/2)),HH=Math.max(1,Math.ceil(scH/ct/2));
 const txU=crew.filter(u=>u.st==='tx'||u.st==='give'||u.st==='clean')[0];
 const fx=txU?txU.x:inc.x,fy=txU?txU.y:inc.y;
 let x0=Math.round(fx)-HW,x1=Math.round(fx)+HW;
 let y0=Math.round(fy)-HH,y1=Math.round(fy)+HH;
 const showHyd=d.w&&inc.hy&&inc.hy[0]>=x0&&inc.hy[0]<=x1&&inc.hy[1]>=y0&&inc.hy[1]<=y1;
 const cols=x1-x0+1,rows=y1-y0+1;
 const c=ct;
 const ox=(scW-c*cols)/2,oy=(scH-c*rows)/2;
 const X=v=>ox+(v-x0)*c,Y=v=>oy+(v-y0)*c;
 const tkey=x0+','+y0+','+cols+','+rows+','+c.toFixed(2)+','+scW+','+scH+','+S.mapV;
 if(SCACHE.key!==tkey){
  SCACHE.key=tkey;
  const cv=SCACHE.cv||(SCACHE.cv=document.createElement('canvas'));
  cv.width=Math.round(scW*dpr);cv.height=Math.round(scH*dpr);
  const tg=cv.getContext('2d');tg.setTransform(dpr,0,0,dpr,0,0);
  tg.fillStyle='#0b0b0a';tg.fillRect(0,0,scW,scH);
  for(let x=Math.max(0,x0);x<=Math.min(N-1,x1);x++)
   for(let y=Math.max(0,y0);y<=Math.min(N-1,y1);y++){
    const k=K(x,y),t=TR[k],r=RD[k],sh=SH[k],px=X(x),py=Y(y);
    tg.fillStyle=t===1?'#0e2436':t===2?'#18291d':t===3?'#202836':t===4?'#212327':
     (sh<.33?'#1a1a18':sh<.66?'#1f1f1c':'#232320');
    tg.fillRect(px,py,c+.6,c+.6);
    if(!r&&!t&&c>9){tg.fillStyle='rgba(0,0,0,.35)';tg.fillRect(px+c*.78,py,c*.22,c+.6)}
    if(r){tg.fillStyle=RCOL[r];tg.fillRect(px,py,c+.6,c+.6);
     if(r>=2&&r<=3&&c>13){tg.strokeStyle='rgba(255,255,255,.07)';tg.lineWidth=1;
      tg.beginPath();tg.moveTo(px,py+c/2);tg.lineTo(px+c,py+c/2);tg.stroke()}}}}
 g.drawImage(SCACHE.cv,0,0,scW,scH);
 // 建物窗光隨晝夜變化，另外疊畫（量少）
 scWindowLights(g,nf,x0,x1,y0,y1,c,X,Y);
 // 災點中心座標；夜間整體壓暗
 const cx=X(inc.x)+c/2,cy=Y(inc.y)+c/2;
 if(nf>0){g.fillStyle='rgba(10,16,34,'+(.5*nf).toFixed(3)+')';g.fillRect(0,0,scW,scH)}
 // 災點建物與景物
 scSite(inc,g,d,nf,c,X,Y,cx,cy);
 // 圍觀民眾
 scBystanders(inc,g,c,cx,cy);
 // 傷患
 scPatients(inc,g,c,cx,cy);
 // 警戒圈 / 擔架動線 / 後送方向
 scCordonRing(g,d,c,cx,cy);
 // 供水水帶（流動）
 scSupplyHose(inc,g,d,wOK,showHyd,c,X,Y);
 const atk=pumpsV,eff=effNow;
 // 出水線與噴射
 scWaterJets(inc,g,wOK,c,X,Y,cx,cy,atk,eff);
 // 射水衝擊處的水花與蒸汽
 scSplash(inc,g,d,effNow,wOK,c,cx,cy);
 // 火勢規模、作業進度與風向（後面多處共用）
 const sev=d.fire?Math.min(1.7,.7+(inc.pm.area||60)/300):.8;
 const prog=Math.min(1,inc.work/inc.dur);
 const wind=((inc.id*0.83)%TAU);
 const wx=Math.cos(wind),wy=Math.sin(wind);
 // 災點：火焰與濃煙
 scFireSmoke(inc,g,d,c,cx,cy,sev,prog,wx,wy);
 // 車輛
 scVehicles(inc,g,d,crew,nf,c,X,Y,cx,cy);
// 車輛警示燈地面光暈
 scBeaconGlow(g,crew,nf,c,X,Y);
 // 階段專屬作業特效
 scPhaseFx(inc,g,d,pumpsV,effNow,cols,c,X,Y,cx,cy);
 // 雲梯架設
 scLadder(g,crew,c,X,Y,cx,cy);
 // 救護車尾門與擔架裝載
 scAmbLoading(inc,g,crew,c,X,Y);
 // 警戒帶與三角錐
 scTapeCones(inc,g,c,X,Y);
 // 受困人員標記
 scTrapped(inc,g,c,cx,cy,prog);
// 後送路線
 scTxRoute(g,crew,c,X,Y);
 // 醫院與交接動畫
 scHospital(g,crew,nf,x0,x1,y0,y1,c,X,Y);
 // Rehab 人員復原區
 scRehab(inc,g,d,crew,work,cmdV,c,X,Y);
 // 火場出入口管制
 scEntryControl(inc,g,d,crew,work,c,X,Y,cx,cy);
 // 空氣瓶更換站
 scAirStation(g,crew,c,X,Y);
 // 救護待命區
 scEmsStaging(inc,g,ambV,cmdV,c,X,Y);
 // 水源區標示與流量
 scWaterSource(inc,g,showHyd,c,X,Y);
 // 中繼水帶（佔水車→攻擊車）
 scRelayHose(inc,g,d,pumpsV,c,X,Y);
 // 後送動線
 scTxPath(inc,g,ambV,c,X,Y,cx,cy);
 // 停車位標線
 scParkingBays(inc,g,crew,wOK,x0,x1,y0,y1,showHyd,c,X,Y,cx,cy);
 // 救護處置動畫
 scEmsCare(inc,g,ambV,safeNow,c,cx,cy);
 // 救助作業動畫
 scRescueOps(inc,g,rescV,c,cx,cy);
 // 分水器
 scManifold(g,d,pumpsV,effNow,wOK,c,X,Y,cx,cy);
 // ===== 台電：斷電確認後，工程車停靠、人員作業 =====
 scPowerCrew(inc,g,c,X,Y,cx,cy);
 // ===== 台電：斷電完成後工程車進駐 =====
 scPowerArrive(inc,g,c,X,Y,cx,cy);
 // ===== 警方人員：依案件性質分層 =====
 scPolice(inc,g,d,c,X,Y,cx,cy);
 // ===== 台電工程車與人員（斷電確認後到場） =====
 scPowerTruck(inc,g,c,X,Y,cx,cy);
 // 照明燈塔
 scLightTower(g,crew,nf,c,X,Y,cx,cy);
 // 視野外車輛的邊緣指標
 scEdgePointers(inc,g,crew,x0,x1,y0,y1,c,cx,cy);
 // ===== 大量傷病患：檢傷帆布、檢傷組、醫療指揮官 =====
 scMci(inc,g,d,c,X,Y,cx,cy);
 // ===== 化災：區劃、插旗、除污走廊、A/B/C 級防護 =====
 scHazmat(inc,g,d,crew,fx,fy,c,X,Y,cx,cy);
 // 抬頭資訊
 scHeader(inc,g,d,crew,nf,eff);
}
