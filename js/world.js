// 全域狀態、地圖生成、路徑搜尋、車輛與開局
'use strict';
const RD=new Uint8Array(N*N),TR=new Uint8Array(N*N),SH=new Float32Array(N*N),RUN=new Uint8Array(N*N);
// 鄉間地貌細節（只影響繪製）：CROP 作物／設施種類、CANAL 灌溉水圳
const CROP=new Uint8Array(N*N),CANAL=new Uint8Array(N*N);
// 道路分層與分級
// HWL：此格有「高速公路層」從地面道路／水面上方（高架）或下方（地下道）交錯通過，兩層不互通
// HG：此格高速公路的等級（RGK.HWE 高架國道、RGK.HWG 平面國道、RGK.EXP 快速道路），RG：地面道路等級，RGF：生成時指定的等級
const HWL=new Uint8Array(N*N),HG=new Uint8Array(N*N),RG=new Uint8Array(N*N),RGF=new Uint8Array(N*N);
const RGK={HWE:1,HWG:2,RAMP:3,EXP:4,UND:5,PROV:6,CNTY:7,CITY:8,TWN:9,IND:10,PATH:11,AIRS:12,TWY:13};
const RGN=['','高速公路（高架）','高速公路（平面）','高速公路匝道','快速道路','地下道','省道','縣道','市道','鄉道','產業道路','小徑','機場聯絡道','滑行道'];
let ROUTES=[];   // 有編號的路線：{n:'台3', g, cells}
// 郊區：市區外圍（含機場一帶）與鄉間緊鄰市區的一圈，街廓較大、混有農地與工廠
const SUBX=74,SUBY=86;
// 北側（岡山、橋頭以北）的郊區帶較寬，約 12 格才過渡到鄉間
const isSub=(x,y)=>inCity(x,y)?(x-OX>=SUBX||y-OY>=SUBY):(Math.max(OX-x,(x-OX-CITY+1)*.8,(OY-y)*.75,(y-OY-CITY+1)*.8)<=9);
const K=(x,y)=>x*N+y;
const RC=[],RR=[];
let FX=0,FY=0,FYE=0,SPOT=[],HOSP=[],AP=null;   // AP：機場範圍
let S,cw=900,ch=700,base=14,zoom=2,cam={x:0,y:0},uid=1,sel=null,selU=null,paused=false,
 last=0,uiT=0,msg='',mt=0,shopSt=0,shopOn=false,rosterOn=false,rsh='',dpr=1;
const cell=()=>base*zoom;
const pick=a=>a[Math.floor(Math.random()*a.length)];
const wpick=o=>{const r=Math.random();let s=0;for(const k in o){s+=o[k];if(r<s)return k}return Object.keys(o)[0]};
const cls=(x,y)=>(x>=0&&y>=0&&x<N&&y<N)?RD[K(x,y)]:0;
const ter=(x,y)=>(x>=0&&y>=0&&x<N&&y<N)?TR[K(x,y)]:0;
const linkOK=(a,b)=>(!a||!b)?false:((a===4)!==(b===4)?(a===7||b===7):true);
const modeOf=code=>BOAT[code]?2:(BIG[code]?1:0);
const kcls=(k,mode)=>RD[k]||((mode===2&&TR[k]===1)?8:0);
const canEnter=(c,mode)=>!c?false:(c===8?mode===2:!(mode===1&&(c===1||c===5)));
const isBig=c=>!!BIG[c];
const isBoat=c=>!!BOAT[c];
const DIR=[[1,0],[-1,0],[0,1],[0,-1]];

function comps(){
 const lab=new Int32Array(N*N).fill(-1);let n=0,sizes=[];
 for(let k=0;k<N*N;k++){
  if((!RD[k]&&!HWL[k])||lab[k]>=0)continue;
  const q=[k];lab[k]=n;let sz=0;
  while(q.length){const c=q.pop();sz++;const x=(c/N)|0,y=c%N;
   for(let i=0;i<4;i++){const nx=x+DIR[i][0],ny=y+DIR[i][1];
    if(nx<0||ny<0||nx>=N||ny>=N)continue;
    const nk=K(nx,ny);
    if((!RD[nk]&&!HWL[nk])||lab[nk]>=0)continue;
    if(!HWL[c]&&!HWL[nk]&&!linkOK(RD[c],RD[nk]))continue;      // 有分層的格子在連通檢查時視為兩層都可通
    lab[nk]=n;q.push(nk)}}
  sizes.push(sz);n++}
 return{lab,sizes}}
function oneComponent(){const c=comps();return c.sizes.length<=1}
function pruneIslands(){
 const {lab,sizes}=comps();
 if(!sizes.length)return;
 let best=0;for(let i=1;i<sizes.length;i++)if(sizes[i]>sizes[best])best=i;
 for(let k=0;k<N*N;k++)if((RD[k]||HWL[k])&&lab[k]!==best){RD[k]=0;HWL[k]=0;HG[k]=0}}
function nbRoad(x,y){
 for(let i=0;i<4;i++){const c=cls(x+DIR[i][0],y+DIR[i][1]);if(c&&c!==4)return[x+DIR[i][0],y+DIR[i][1]]}
 const d2=[[1,1],[-1,-1],[1,-1],[-1,1]];
 for(let i=0;i<4;i++){const c=cls(x+d2[i][0],y+d2[i][1]);if(c&&c!==4)return[x+d2[i][0],y+d2[i][1]]}
 return null}
function grid(){
 RC.length=0;RR.length=0;
 const sc=[3,4,3,5,4,3,5,4],sr=[4,3,4,3,4,5,3,4,5,3];
 for(let x=0,i=0;x<CITY;x+=sc[i++%sc.length])RC.push(x);
 if(RC[RC.length-1]!==CITY-1)RC.push(CITY-1);
 for(let y=0,i=0;y<CITY;y+=sr[i++%sr.length])RR.push(y);
 if(RR[RR.length-1]!==CITY-1)RR.push(CITY-1)}
const inCity=(x,y)=>x>=OX&&y>=OY&&x<OX+CITY&&y<OY+CITY;
function inFacility(x,y){
 for(let i=0;i<SPOT.length;i++)if(SPOT[i].p&&SPOT[i].p[0]===x&&SPOT[i].p[1]===y)return true;
 for(const h of HOSP)for(const q of (h.cells||[h.p]))if(q[0]===x&&q[1]===y)return true;
 if(typeof SCHOOL!=='undefined'&&SCHOOL&&SCHOOL.set&&SCHOOL.set.has(K(x,y)))return true;
 if(typeof LMKC!=='undefined'&&LMKC.has(K(x,y)))return true;
 return false}
function build(){
 OX=0;OY=0;RTOWN.forEach((t,i)=>t.c=RTOWN0[i].slice());
 grid();RD.fill(0);TR.fill(0);RUN.fill(0);HWL.fill(0);HG.fill(0);RG.fill(0);RGF.fill(0);ROUTES=[];
 // 水域：蜿蜒河道 + 西南港灣
 for(let y=0;y<CITY;y++){const c=(9+4.5*Math.sin(y/7.5/MF)+1.5*Math.sin(y/3.1/MF))*MF;
  for(let x=0;x<CITY;x++)if(Math.abs(x-c)<1.8)TR[K(x,y)]=1}
 // 西南海面：市區以南沿海岸線往東南延伸（海岸線略有起伏）
 for(let y=Math.round(55*MF);y<N;y++){const cx=Math.round(17*MF)+(y>=CITY?3*Math.sin(y/7)+(y-CITY)*.18:0);for(let x=0;x<cx;x++)TR[K(x,y)]=1}
 // 市中心運河（愛河型）：由河道向東南蜿蜒
 for(let x=Math.round(14*MF);x<Math.round(40*MF);x++){
  const cy=Math.round(34*MF+3*Math.sin(x/5));
  for(let d=-1;d<=0;d++)if(cy+d>0&&cy+d<N)TR[K(x,cy+d)]=1}
 // 西側海岸線
 for(let y=0;y<Math.round(40*MF);y++)for(let x=0;x<2+Math.round(1.5*Math.sin(y/6)+1.5);x++)TR[K(x,y)]=1;
 // 山林：東北大片
 for(let x=Math.round(44*MF);x<CITY;x++)for(let y=0;y<CITY;y++)if((x-44*MF)+y<26*MF)TR[K(x,y)]=2;
 for(let x=Math.round(53*MF);x<CITY;x++)for(let y=0;y<Math.round(28*MF);y++)TR[K(x,y)]=2;
 ruralTerrain();
 // 南側丘陵
 for(let x=Math.round(20*MF);x<Math.round(32*MF);x++)for(let y=Math.round(58*MF);y<CITY-1;y++)if(Math.random()<.9)TR[K(x,y)]=2;
 // 港區：南側舊港與河岸貨櫃場
 for(let x=Math.round(3*MF);x<Math.round(18*MF);x++)for(let y=Math.round(50*MF);y<Math.round(55*MF);y++)if(TR[K(x,y)]!==1)TR[K(x,y)]=3;
 for(let x=Math.round(13*MF);x<Math.round(19*MF);x++)for(let y=Math.round(28*MF);y<Math.round(33*MF);y++)if(TR[K(x,y)]!==1)TR[K(x,y)]=3;
 // 機場：東南跑道與停機坪
 for(let x=Math.round(45*MF);x<Math.round(60*MF);x++)for(let y=Math.round(43*MF);y<Math.round(58*MF);y++)TR[K(x,y)]=4;
 // 郊區：市區外圍零星農地（以 4×4 區塊決定，成片）
 for(let x=0;x<CITY;x++)for(let y=0;y<CITY;y++){const k=K(x,y);if(!isSub(x,y)||TR[k])continue;
  const b=Math.sin((x>>2)*12.9898+(y>>2)*78.233)*43758.5453%1;if(Math.abs(b)<.3)TR[k]=5}
 const set=(x,y,c)=>{if(x<0||y<0||x>=N||y>=N)return;const k=K(x,y);
  if(TR[k]===1)return;                      // 水域不鋪路
  RD[k]=TR[k]===2?5:c};                     // 山林一律降為產業道路
 // 山林裡只保留少數棋盤道路（每 4 條留 1 條），其餘不鋪
 // 郊區街廓較大：次要道路只留每 4 條 1 條；山林裡不鋪棋盤道路（另以幾條蜿蜒道路進山）
 const keep=(i,x,y)=>TR[K(x,y)]!==2&&(!isSub(x,y)||i%2===1||i%4===0);
 for(let i=0;i<RC.length;i++)for(let y=0;y<CITY;y++)if(keep(i,RC[i],y))set(RC[i],y,i%2?3:2);
 for(let i=0;i<RR.length;i++)for(let x=0;x<CITY;x++)if(keep(i,x,RR[i]))set(x,RR[i],i%2?3:2);
 // 機場：場內不鋪路，外圍一圈環場道路，西側航廈有連外道路
 {const ax0=Math.round(45*MF),ax1=Math.round(60*MF)-1,ay0=Math.round(43*MF),ay1=Math.round(58*MF)-1;
  AP={x0:ax0,x1:ax1,y0:ay0,y1:ay1};
  for(let x=ax0;x<=ax1;x++)for(let y=ay0;y<=ay1;y++)RD[K(x,y)]=0;
  for(let x=ax0-1;x<=ax1+1;x++)for(const y of[ay0-1,ay1+1])if(TR[K(x,y)]!==1)RD[K(x,y)]=RD[K(x,y)]||2;
  for(let y=ay0-1;y<=ay1+1;y++)for(const x of[ax0-1,ax1+1])if(x<CITY&&TR[K(x,y)]!==1)RD[K(x,y)]=RD[K(x,y)]||2;
  airportLayout()}
 // 橋樑：部分幹道跨河；只跨窄水道（連續水面 5 格以內、兩岸都是陸地），不往海裡鋪
 const bridge=(cells)=>{let i=0;while(i<cells.length){if(TR[cells[i]]!==1){i++;continue}let j=i;while(j<cells.length&&TR[cells[j]]===1)j++;
   if(i>0&&j<cells.length&&j-i<=5)for(let q=i;q<j;q++)RD[cells[q]]=6;i=j}};
 for(let i2=1;i2<RR.length;i2+=2){const y=RR[i2],a=[];for(let x=0;x<CITY;x++)a.push(K(x,y));bridge(a)}
 for(let i2=2;i2<RC.length;i2+=3){const x=RC[i2],a=[];for(let y=0;y<CITY;y++)a.push(K(x,y));bridge(a)}
 // 國道：南北 + 東西，交會處互通
 FX=Math.round(41*MF);FY=RR[Math.round(9*MF)]+2;
 // 國道一號止於市區南緣；國道十號向東延伸到旗山。市區內高架（地面道路從橋下通過），郊區與鄉間為平面（交叉道路走地下道）
 const c1=[],c10=[];
 for(let y=0;y<CITY;y++){layHW(FX,y,RGK.HWE);c1.push([FX,y])}
 FYE=RTOWN[0].c[0]-3;
 for(let x=0;x<=FYE;x++){if(x===FX)continue;layHW(x,FY,inCity(x,FY)&&!isSub(x,FY)?RGK.HWE:RGK.HWG);c10.push([x,FY])}
 RD[K(FYE,FY)]=7;HWL[K(FYE,FY)]=0;
 ROUTES.push({n:'國1',g:RGK.HWE,cells:c1},{n:'國10',g:RGK.HWE,cells:c10});
 const rampY=[1,4,7,12,15,18].map(i=>RR[Math.min(RR.length-2,Math.round(i*MF))]),rampX=[2,5,9,13,16].map(i=>RC[Math.min(RC.length-2,Math.round(i*MF))]);
 const ramp=(x,y)=>{const k=K(x,y);RD[k]=7;HWL[k]=0};
 for(const y of rampY){ramp(FX,y);if(!RD[K(FX-1,y)])RD[K(FX-1,y)]=2;if(!RD[K(FX+1,y)])RD[K(FX+1,y)]=2}
 for(const x of rampX){if(TR[K(x,FY)]===1)continue;ramp(x,FY);
  if(!RD[K(x,FY-1)])RD[K(x,FY-1)]=2;if(!RD[K(x,FY+1)])RD[K(x,FY+1)]=2}
 ramp(FX,FY);                                   // 國一與國十系統交流道
 // 山區道路改在 ruralRoads() 以成本路徑鋪設（少數幾條，連到聚落或幹道，不留死路）
 // 巷弄
 for(let i=0;i<150;i++){
  const hz=Math.random()<.5,a=(hz?RC:RR)[Math.floor(Math.random()*(hz?RC:RR).length)],
   b=1+Math.floor(Math.random()*(CITY-2)),d=Math.random()<.5?1:-1,len=2+Math.floor(Math.random()*4);
  for(let k=1;k<=len;k++){const v=a+d*k;if(v<1||v>CITY-2)break;
   const x=hz?v:b,y=hz?b:v,kk=K(x,y);
   if(TR[kk]===1||RD[kk]===4||RD[kk]===7||HG[kk]||isSub(x,y)&&Math.random()<.75)break;
   if(!RD[kk])RD[kk]=TR[kk]===2?5:1}}
 for(let i=0;i<90;i++){
  const x=Math.round((18+Math.random()*16)*MF),y=Math.round((34+Math.random()*14)*MF);
  if(x<1||y<1||x>N-2||y>N-2)continue;
  const hz=Math.random()<.5,len=1+Math.floor(Math.random()*3);
  for(let k2=0;k2<len;k2++){const xx=hz?x+k2:x,yy=hz?y:y+k2;
   if(xx>N-2||yy>N-2)break;const kk=K(xx,yy);
   if(TR[kk]===1||RD[kk]===4||RD[kk]===7||HG[kk])break;if(!RD[kk])RD[kk]=1}}
 // 工業區：拆掉部分巷道形成大街廓
 for(let x=Math.round(30*MF);x<Math.round(42*MF);x++)for(let y=Math.round(50*MF);y<Math.round(58*MF);y++){
  const kk=K(x,y);if(RD[kk]===1||(RD[kk]===2&&Math.random()<.35))RD[kk]=0}
 ruralRoads();
 pruneIslands();
 // 分隊與醫院
 SPOT=SNAME.map((n,i)=>({n,tp:STP[i],p:SABSN[n]?null:n==='機場'&&AP?[AP.x0+AL.arff[0],AP.y0+AL.arff[1]]:SABS[n]?SABS[n].slice():[RC[SIDX[i][0]]+1,RR[SIDX[i][1]]+1]}));
 HOSP=HNAME.map((n,i)=>{
  const px=RC[HIDX[i][0]]+1,py=RR[HIDX[i][1]]+1,w=HSIZE[i][0],h2=HSIZE[i][1],cells=[];
  for(let a=0;a<w;a++)for(let b=0;b<h2;b++)if(px+a<N-1&&py+b<N-1)cells.push([px+a,py+b]);
  return{n,p:[px,py],w,h:h2,cells}});
 spreadStations();
 // 成功分隊（局本部）：廳舍較大，佔 2 格（分隊車庫＋局本部辦公大樓），第二格取相鄰、非道路的陸地
 {const hq=SPOT.find(s=>s.n==='成功');
  if(hq&&hq.p)for(const d of DIR){const x=hq.p[0]+d[0],y=hq.p[1]+d[1];if(x<1||y<1||x>N-2||y>N-2)continue;const k=K(x,y);
   if(RD[k]||HG[k]||TR[k]===1||SPOT.some(s=>s!==hq&&s.p&&s.p[0]===x&&s.p[1]===y)||HOSP.some(H=>H.cells.some(q=>q[0]===x&&q[1]===y)))continue;
   hq.cells=[hq.p.slice(),[x,y]];break}}
 const places=SPOT.filter(s=>s.p).concat(HOSP);
 const prot=new Uint8Array(N*N);
 for(const s of places){
  if(!s.cells&&TR[K(s.p[0],s.p[1])]===1)s.p[0]+=2;
  const list=s.cells||[s.p];
  for(const q of list){const k=K(q[0],q[1]);TR[k]=0;RD[k]=0}
  for(const q of list)for(let i=0;i<4;i++){
   const x=q[0]+DIR[i][0],y=q[1]+DIR[i][1];
   if(list.some(z=>z[0]===x&&z[1]===y))continue;
   if(cls(x,y))prot[K(x,y)]=1}}
 // 隨機拆除路段製造繞路，保持全網連通
 for(let i=0;i<Math.round(260*MF*MF);i++){
  const x=1+Math.floor(Math.random()*(CITY-2)),y=1+Math.floor(Math.random()*(CITY-2)),k=K(x,y),c=RD[k];
  if(!c||c>=4||prot[k]||HG[k]||TR[k]===4)continue;   // 機場內的滑行道與聯絡道不拆
  RD[k]=0;if(!oneComponent())RD[k]=c}
 for(let k=0;k<N*N;k++)SH[k]=Math.random();
 for(const s of places){
  let e=null;
  for(const q of (s.cells||[s.p])){e=nbRoad(q[0],q[1]);if(e)break}
  if(!e){                       // 保底：往東開一條連絡道
   for(let d=1;d<6&&!e;d++){const x=s.p[0]+d,y=s.p[1];
    if(x>=N)break;if(TR[K(x,y)]!==1&&!RD[K(x,y)])RD[K(x,y)]=2;e=nbRoad(s.p[0],s.p[1])}}
  s.x=e||s.p}
 pruneIslands();
 // 整體位移，補上北側郊區鄉間與西側海面，再設置北側分隊
 shiftWorld(SHX,SHY);
 extendNorth();
 pruneIslands();
 for(const s of SPOT)if(!s.x||!RD[K(s.x[0],s.x[1])]){const e=nbRoad(s.p[0],s.p[1]);s.x=e||s.p}   // 接線點被清掉時重找
 roadGrades();
 indexLayers();
 ruralDetail();
 placeSchool();
 placeLandmarks();
 spawnCands()}
// 鋪高速公路：遇地面道路或水面成分層交會（HWL），否則為高速公路格
function layHW(x,y,g){
 const k=K(x,y);HG[k]=g;
 if(RD[k]===7)return;
 if((RD[k]&&RD[k]!==4)||TR[k]===1){HWL[k]=1;return}
 RD[k]=4}

let _hpD=0,_hpK=0; // hpop 結果暫存，避免每次彈出都配置新陣列
function hpush(h,k,d){h.push(d,k);let i=(h.length>>1)-1;
 while(i>0){const p=(i-1)>>1;if(h[p*2]<=h[i*2])break;
  const a=h[p*2],b=h[p*2+1];h[p*2]=h[i*2];h[p*2+1]=h[i*2+1];h[i*2]=a;h[i*2+1]=b;i=p}}
function hpop(h){const d0=h[0],k0=h[1],n=(h.length>>1)-1;
 h[0]=h[n*2];h[1]=h[n*2+1];h.length-=2;
 let i=0;const m=(h.length>>1);
 for(;;){const a=2*i+1,b=a+1;let s=i;
  if(a<m&&h[a*2]<h[s*2])s=a;if(b<m&&h[b*2]<h[s*2])s=b;
  if(s===i)break;
  const x=h[s*2],y=h[s*2+1];h[s*2]=h[i*2];h[s*2+1]=h[i*2+1];h[i*2]=x;h[i*2+1]=y;i=s}
 _hpD=d0;_hpK=k0}
// 路徑場（由目標往外的最短路）：節點 0..NN-1 為地面層，NN 起為分層交會格的高速公路層（只配置分層格，見 HLI／HLC）
// 從高速公路（4）或匝道（7）進入分層格時走高速公路層，其餘走地面層；兩層不互通，所以高架下、地下道不能轉上國道
const NN=N*N,HLI=new Int32Array(NN).fill(-1);let HLC=new Int32Array(0);
// 建圖完成後編列分層格：HLI[格]＝第幾個分層格，HLC[i]＝格索引
function indexLayers(){HLI.fill(-1);const a=[];for(let k=0;k<NN;k++)if(HWL[k]){HLI[k]=a.length;a.push(k)}HLC=Int32Array.from(a)}
// 路徑場節點 → 格索引
const cellOf=n=>n<NN?n:HLC[n-NN];
function field(tx,ty,mode){
 const M=NN+HLC.length,D=new Float32Array(M).fill(INF),P=new Int32Array(M).fill(-1),k0=K(tx,ty);
 if(!canEnter(kcls(k0,mode),mode))return{D,P};
 D[k0]=0;const h=[];hpush(h,k0,0);
 while(h.length){
  hpop(h);const d=_hpD,n=_hpK;
  if(d>D[n])continue;
  const L=n>=NN,k=L?HLC[n-NN]:n,x=(k/N)|0,y=k%N,cc=L?4:kcls(k,mode),step=Math.fround(d+1/MULT[cc]);   // 與 Float32 陣列一致，避免被誤判為過時節點
  for(let i=0;i<4;i++){
   const nx=x+DIR[i][0],ny=y+DIR[i][1];
   if(nx<0||ny<0||nx>=N||ny>=N)continue;
   const nk=K(nx,ny);let nn=nk,nc;
   if(HWL[nk]&&(cc===4||cc===7)){nn=NN+HLI[nk];nc=4}else nc=kcls(nk,mode);
   if(!canEnter(nc,mode)||!linkOK(nc,cc))continue;
   if(step<D[nn]){D[nn]=step;P[nn]=n;hpush(h,nn,step)}}}
 return{D,P}}
function getF(o,m){o.F=o.F||{};
 if(!o.F[m])o.F[m]=field(o.ax!==undefined?o.ax:o.x[0],o.ay!==undefined?o.ay:o.x[1],m);
 return o.F[m]}
function baseF(place,m){place.F=place.F||{};
 if(!place.F[m])place.F[m]=field(place.x[0],place.x[1],m);
 return place.F[m]}
function etaTo(u,o){const f=getF(o,modeOf(u.code)),d=f.D[K(Math.round(u.x),Math.round(u.y))];
 return d===INF?null:Math.round(d/CODE[u.code].s)}
function chase(f,u){let k=K(Math.round(u.x),Math.round(u.y));
 if(!f)return null;
 if(f.D[k]===INF){if(HWL[k]&&f.D[NN+HLI[k]]!==INF)k=NN+HLI[k];else return null}   // 車在高架上
 const p=[];while(f.P[k]>=0){k=f.P[k];const c=cellOf(k);p.push([(c/N)|0,c%N])}return p}
const pathTo=(u,o)=>chase(getF(o,modeOf(u.code)),u);

function addU(si,code){
 const st=SPOT[si],b=parseInt(code,10),same=S.units.filter(u=>u.si===si&&u.code===code).length;
 const num=isNaN(b)?code+(same?String(same+1):''):String(b+same);
 // 機場消防隊的機場消防車呼號為「機消1、機消2…」
 S.units.push({id:uid++,si,code,cs:st.n==='機場'&&code==='機'?'機消'+(same+1):st.n+num,usar:/^特/.test(st.n)?1:0,lim:/^特/.test(st.n)?'usar':st.n==='機場'?'arff':null,x:st.x[0],y:st.x[1],path:[],st:'idle',
  inc:null,duty:null,off:0,wait:0,turn:0,oosT:0,mode:null,tp:false,crew:0,res:false,
  slot:null,arm:null,parked:0,ox:0,oy:0,hd:0,tank:CODE[code].cap||0,back:null})}
// 評鑑：累積制，增加有邊際效應（評鑑越高，同樣的表現加得越少）；扣分不打折，歸零即失去指揮權
function repGain(base){if(base<=0)return 0;const g=base*150/(150+Math.max(0,S.rep));S.rep+=g;S.repLast={g,t:S.t};return g}
// 救災救護大隊行動指揮車：一般分隊每 5 個成立一個大隊，隨機挑大隊內一個分隊配置「一大指、二大指…」
const BRIG_N=['一','二','三','四','五','六','七','八','九'];
function mcvBrigades(){
 const reg=[];for(let i=0;i<S.nst;i++)if(!/^特|^機場|^成功/.test(SPOT[i].n))reg.push(i);
 const want=Math.min(BRIG_N.length,Math.max(1,Math.floor(reg.length/5)));
 const have=S.units.filter(u=>u.brig).length;
 for(let b=have;b<want;b++){const free=reg.filter(i=>!S.units.some(u=>u.brig&&u.si===i)),si=free[Math.floor(Math.random()*free.length)];if(si===undefined)break;
  addU(si,'指');const u=S.units[S.units.length-1];u.brig=b+1;u.cs=BRIG_N[b]+'大指'}}
// 車輛所屬分隊名稱（跨縣市支援車隊用原單位分隊）
const ST_FULL={'特一':'第一特搜','特二':'第二特搜','機場':'機場消防隊','成功':'成功分隊（局本部）'};
const stName=u=>u.stn||ST_FULL[SPOT[u.si].n]||SPOT[u.si].n;
function tpFree(si){let n=0;for(const u of S.units)if(u.si===si&&u.res)n++;return S.tp[si]-n}
function reindex(){
 S.tick=(S.tick||0)+1;
 const m=new Map(),bySt=[],idle=[];
 for(let i=0;i<SPOT.length;i++){bySt.push([]);idle.push(0)}
 for(const u of S.units){
  bySt[u.si].push(u);
  if(u.st==='idle')idle[u.si]++;
  if(u.inc!=null){let a=m.get(u.inc);if(!a)m.set(u.inc,a=[]);a.push(u)}}
 S.ix={m,bySt,idle}}
const onScene=inc=>(S.ix&&S.ix.m.get(inc.id))||[];
const onDuty=u=>u.st==='work'||u.st==='tx'||u.st==='give'||u.st==='clean';
const FLEET=['11','11','11','16','21','41','61','91','91','71','75','57','51','31','艇','履','警','43'];
function reset(){
 build();
 S={day:1,t:0,money:15000,rep:100,score:0,solved:0,units:[],inc:[],duties:[],
  spawn:10,dspawn:90,nst:14,over:false,hyd:[],tp:SPOT.map(s=>s.tp)};
 for(let x=0;x<N;x++)for(let y=0;y<N;y++){const k=K(x,y);
  if(RD[k]&&RD[k]<4&&(TR[k]===7?Math.random()<.14:!TR[k]&&(inCity(x,y)?(RC.indexOf(x)>=0||RR.indexOf(y)>=0)&&Math.random()<.085:Math.random()<.05)))S.hyd.push([x,y])}
 // 消防訓練中心：火災模擬屋前的道路固定有一支消防栓
 if(SCHOOL&&!S.hyd.some(h=>h[0]===SCHOOL.x[0]&&h[1]===SCHOOL.x[1]))S.hyd.push(SCHOOL.x.slice());
 const roster=[
  [0,'11','16','71','71','99'],
  [1,'11','16','71','99'],
  [2,'11','11','16','31','21','41','61','91','91','71','75'],
  [3,'11','11','11','57','61','91','91','71'],
  [4,'11','11','16','61','91','91','71','警'],
  [5,'11','11','16','51','91','91','41'],
  [6,'11','11','16','21','91','91','61'],
  [7,'11','11','16','01','01','艇','71','91','91'],
  [8,'16','11','11','艇','57','91','91','警'],
  [9,'11','11','16','41','91','91','71'],
  [10,'11','16','61','91','71','43'],
  [11,'11','16','61','91','91'],
  [12,'機','機','機','91'],
  [13,'11','11','16','91','71','41','41','指']];
 roster.forEach(r=>{const si=r[0];for(let i=1;i<r.length;i++)addU(si,r[i])});
 for(const u of S.units)if(CAFS_CS.includes(u.cs))u.cafs=1;
 // 局本部（與成功分隊同一廳舍辦公）：局本部41、42 與局本部行動指揮車；特一、特二各有行動指揮車
 {const hq=SNAME.indexOf('成功');let n41=41;for(const u of S.units)if(u.si===hq&&(u.code==='41'||u.code==='指')){u.hq=1;u.cs=u.code==='指'?'局本部指':'局本部'+(n41++)}}
 for(const n of['特一','特二']){addU(SNAME.indexOf(n),'指');S.units[S.units.length-1].cs=n+'指'}
 mcvBrigades();
 S.ix=null;reindex();sel=selU=null;paused=false;zoom=2;
 cam={x:(SPOT[0].p[0]+.5)*cell()-cw/2,y:(SPOT[0].p[1]+.5)*cell()-ch/2};clamp()}
// 分隊均勻分布：依人口權重（市區建物 > 郊區 > 鄉鎮 > 港區 > 農地）做 Lloyd 迭代，
// 每個可移動的分隊移到自己責任區的重心，再貼齊最近、臨一般道路或幹道的空地；鄉鎮、特搜與離島分隊固定
function spreadStations(){
 const W=new Float32Array(N*N);
 for(let x=0;x<N;x++)for(let y=0;y<N;y++){const k=K(x,y),t=TR[k];
  W[k]=t===1?0:t===2?.02:t===3?.3:t===4?.1:t===5?.05:t===6?.03:inCity(x,y)?(isSub(x,y)?.6:1):.5}
 const mov=SPOT.map(s=>s.p&&!SABS[s.n]&&!SFIX[s.n]);
 for(let it=0;it<12;it++){
  const sx=new Float64Array(SPOT.length),sy=new Float64Array(SPOT.length),sw=new Float64Array(SPOT.length);
  for(let x=0;x<N;x+=2)for(let y=0;y<N;y+=2){const w=W[K(x,y)];if(!w)continue;
   let b=0,bd=1e9;for(let i=0;i<SPOT.length;i++){if(!SPOT[i].p)continue;const d=(SPOT[i].p[0]-x)**2+(SPOT[i].p[1]-y)**2;if(d<bd){bd=d;b=i}}
   sx[b]+=x*w;sy[b]+=y*w;sw[b]+=w}
  for(let i=0;i<SPOT.length;i++)if(mov[i]&&sw[i]>0){const s=SPOT[i];
   s.p=[Math.round(s.p[0]*.3+sx[i]/sw[i]*.7),Math.round(s.p[1]*.3+sy[i]/sw[i]*.7)]}}
 // 貼齊：臨一般道路或幹道的陸地空格，避開醫院、機場、港區與其他分隊
 const used=new Set(SPOT.filter((s,i)=>!mov[i]&&s.p).map(s=>K(s.p[0],s.p[1])));
 const ok=(x,y)=>{if(x<1||y<1||x>=N-1||y>=N-1)return false;const k=K(x,y);
  if(RD[k]||TR[k]===1||TR[k]===2||TR[k]===3||TR[k]===4||used.has(k))return false;
  if(HOSP.some(h=>Math.abs(h.p[0]-x)<4&&Math.abs(h.p[1]-y)<4))return false;
  for(let j=0;j<4;j++){const r=cls(x+DIR[j][0],y+DIR[j][1]);if(r===2||r===3)return true}return false};
 for(let i=0;i<SPOT.length;i++){if(!mov[i])continue;const s=SPOT[i];let best=null;
  for(let r=0;r<12&&!best;r++)for(let a=-r;a<=r&&!best;a++)for(let b=-r;b<=r;b++){if(Math.max(Math.abs(a),Math.abs(b))!==r)continue;
   if(ok(s.p[0]+a,s.p[1]+b)){best=[s.p[0]+a,s.p[1]+b];break}}
  if(best){s.p=best;used.add(K(best[0],best[1]))}}}
