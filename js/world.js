// 全域狀態、地圖生成、路徑搜尋、車輛與開局
'use strict';
const RD=new Uint8Array(N*N),TR=new Uint8Array(N*N),SH=new Float32Array(N*N),RUN=new Uint8Array(N*N);
const K=(x,y)=>x*N+y;
const RC=[],RR=[];
let FX=0,FY=0,FYE=0,SPOT=[],HOSP=[];
let S,cw=900,ch=700,base=14,zoom=2,cam={x:0,y:0},uid=1,sel=null,selU=null,paused=false,
 last=0,uiT=0,msg='',mt=0,shopSt=0,shopOn=false,dpr=1;
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
  if(!RD[k]||lab[k]>=0)continue;
  const q=[k];lab[k]=n;let sz=0;
  while(q.length){const c=q.pop();sz++;const x=(c/N)|0,y=c%N;
   for(let i=0;i<4;i++){const nx=x+DIR[i][0],ny=y+DIR[i][1];
    if(nx<0||ny<0||nx>=N||ny>=N)continue;
    const nk=K(nx,ny);
    if(!RD[nk]||lab[nk]>=0||!linkOK(RD[c],RD[nk]))continue;
    lab[nk]=n;q.push(nk)}}
  sizes.push(sz);n++}
 return{lab,sizes}}
function oneComponent(){const c=comps();return c.sizes.length<=1}
function pruneIslands(){
 const {lab,sizes}=comps();
 if(!sizes.length)return;
 let best=0;for(let i=1;i<sizes.length;i++)if(sizes[i]>sizes[best])best=i;
 for(let k=0;k<N*N;k++)if(RD[k]&&lab[k]!==best)RD[k]=0}
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
const inCity=(x,y)=>x<CITY&&y<CITY;
function inFacility(x,y){
 for(let i=0;i<SPOT.length;i++)if(SPOT[i].p[0]===x&&SPOT[i].p[1]===y)return true;
 for(const h of HOSP)for(const q of (h.cells||[h.p]))if(q[0]===x&&q[1]===y)return true;
 return false}
function build(){
 grid();RD.fill(0);TR.fill(0);RUN.fill(0);
 // 水域：蜿蜒河道 + 西南港灣
 for(let y=0;y<CITY;y++){const c=(9+4.5*Math.sin(y/7.5/MF)+1.5*Math.sin(y/3.1/MF))*MF;
  for(let x=0;x<CITY;x++)if(Math.abs(x-c)<1.8)TR[K(x,y)]=1}
 for(let x=0;x<Math.round(17*MF);x++)for(let y=Math.round(55*MF);y<N;y++)TR[K(x,y)]=1;
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
 for(let y of[Math.round(46*MF),Math.round(52*MF)])for(let x=Math.round(46*MF);x<Math.round(59*MF);x++)RUN[K(x,y)]=1;
 const set=(x,y,c)=>{if(x<0||y<0||x>=N||y>=N)return;const k=K(x,y);
  if(TR[k]===1)return;                      // 水域不鋪路
  RD[k]=TR[k]===2?5:c};                     // 山林一律降為產業道路
 // 山林裡只保留少數棋盤道路（每 4 條留 1 條），其餘不鋪
 for(let i=0;i<RC.length;i++)for(let y=0;y<CITY;y++)if(TR[K(RC[i],y)]!==2||i%4===0)set(RC[i],y,i%2?3:2);
 for(let i=0;i<RR.length;i++)for(let x=0;x<CITY;x++)if(TR[K(x,RR[i])]!==2||i%4===0)set(x,RR[i],i%2?3:2);
 // 橋樑：部分幹道跨河
 for(let i2=1;i2<RR.length;i2+=2){const y=RR[i2];
  for(let x=0;x<CITY;x++)if(TR[K(x,y)]===1&&x>2)RD[K(x,y)]=6}
 for(let i2=2;i2<RC.length;i2+=3){const x=RC[i2];
  for(let y=0;y<CITY;y++)if(TR[K(x,y)]===1&&x>2&&y<Math.round(55*MF))RD[K(x,y)]=6}
 // 國道：南北 + 東西，交會處互通
 FX=Math.round(41*MF);FY=RR[Math.round(9*MF)]+2;
 // 國道一號止於市區南緣；國道十號向東延伸到旗山
 for(let y=0;y<CITY;y++)RD[K(FX,y)]=TR[K(FX,y)]===1?6:4;
 FYE=RTOWN[0].c[0]-3;
 for(let x=0;x<=FYE;x++)if(TR[K(x,FY)]!==1)RD[K(x,FY)]=4;
 RD[K(FYE,FY)]=7;
 const rampY=[1,4,7,12,15,18].map(i=>RR[Math.min(RR.length-2,Math.round(i*MF))]),rampX=[2,5,9,13,16].map(i=>RC[Math.min(RC.length-2,Math.round(i*MF))]);
 for(const y of rampY){RD[K(FX,y)]=7;if(!RD[K(FX-1,y)])RD[K(FX-1,y)]=2;if(!RD[K(FX+1,y)])RD[K(FX+1,y)]=2}
 for(const x of rampX){if(TR[K(x,FY)]===1)continue;RD[K(x,FY)]=7;
  if(!RD[K(x,FY-1)])RD[K(x,FY-1)]=2;if(!RD[K(x,FY+1)])RD[K(x,FY+1)]=2}
 // 山區加幾條蜿蜒產業道路
 for(let b=0;b<3;b++){
  let x=Math.round(46*MF)+b*6,y=RR[Math.round(6*MF)];
  for(let s=0;s<30&&y>0&&x>0&&x<N-1;s++){
   if(TR[K(x,y)]!==1&&RD[K(x,y)]!==4)RD[K(x,y)]=RD[K(x,y)]||5;
   y--;if(Math.random()<.45)x+=Math.random()<.5?1:-1}}
 // 巷弄
 for(let i=0;i<150;i++){
  const hz=Math.random()<.5,a=(hz?RC:RR)[Math.floor(Math.random()*(hz?RC:RR).length)],
   b=1+Math.floor(Math.random()*(CITY-2)),d=Math.random()<.5?1:-1,len=2+Math.floor(Math.random()*4);
  for(let k=1;k<=len;k++){const v=a+d*k;if(v<1||v>CITY-2)break;
   const x=hz?v:b,y=hz?b:v,kk=K(x,y);
   if(TR[kk]===1||RD[kk]===4||RD[kk]===7)break;
   if(!RD[kk])RD[kk]=TR[kk]===2?5:1}}
 for(let i=0;i<90;i++){
  const x=Math.round((18+Math.random()*16)*MF),y=Math.round((34+Math.random()*14)*MF);
  if(x<1||y<1||x>N-2||y>N-2)continue;
  const hz=Math.random()<.5,len=1+Math.floor(Math.random()*3);
  for(let k2=0;k2<len;k2++){const xx=hz?x+k2:x,yy=hz?y:y+k2;
   if(xx>N-2||yy>N-2)break;const kk=K(xx,yy);
   if(TR[kk]===1||RD[kk]===4||RD[kk]===7)break;if(!RD[kk])RD[kk]=1}}
 // 工業區：拆掉部分巷道形成大街廓
 for(let x=Math.round(30*MF);x<Math.round(42*MF);x++)for(let y=Math.round(50*MF);y<Math.round(58*MF);y++){
  const kk=K(x,y);if(RD[kk]===1||(RD[kk]===2&&Math.random()<.35))RD[kk]=0}
 ruralRoads();
 pruneIslands();
 // 分隊與醫院
 SPOT=SNAME.map((n,i)=>({n,tp:STP[i],p:SABS[n]?SABS[n].slice():[RC[SIDX[i][0]]+1,RR[SIDX[i][1]]+1]}));
 HOSP=HNAME.map((n,i)=>{
  const px=RC[HIDX[i][0]]+1,py=RR[HIDX[i][1]]+1,w=HSIZE[i][0],h2=HSIZE[i][1],cells=[];
  for(let a=0;a<w;a++)for(let b=0;b<h2;b++)if(px+a<N-1&&py+b<N-1)cells.push([px+a,py+b]);
  return{n,p:[px,py],w,h:h2,cells}});
 const places=SPOT.concat(HOSP);
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
  if(!c||c>=4||prot[k])continue;
  RD[k]=0;if(!oneComponent())RD[k]=c}
 for(let k=0;k<N*N;k++)SH[k]=Math.random();
 for(const s of places){
  let e=null;
  for(const q of (s.cells||[s.p])){e=nbRoad(q[0],q[1]);if(e)break}
  if(!e){                       // 保底：往東開一條連絡道
   for(let d=1;d<6&&!e;d++){const x=s.p[0]+d,y=s.p[1];
    if(x>=N)break;if(TR[K(x,y)]!==1&&!RD[K(x,y)])RD[K(x,y)]=2;e=nbRoad(s.p[0],s.p[1])}}
  s.x=e||s.p}
 pruneIslands()}

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
function field(tx,ty,mode){
 const D=new Float64Array(N*N).fill(INF),P=new Int32Array(N*N).fill(-1),k0=K(tx,ty);
 if(!canEnter(kcls(k0,mode),mode))return{D,P};
 D[k0]=0;const h=[];hpush(h,k0,0);
 while(h.length){
  hpop(h);const d=_hpD,k=_hpK;
  if(d>D[k])continue;
  const x=(k/N)|0,y=k%N,cc=kcls(k,mode),step=d+1/MULT[cc];
  for(let i=0;i<4;i++){
   const nx=x+DIR[i][0],ny=y+DIR[i][1];
   if(nx<0||ny<0||nx>=N||ny>=N)continue;
   const nk=K(nx,ny),nc=kcls(nk,mode);
   if(!canEnter(nc,mode)||!linkOK(nc,cc))continue;
   if(step<D[nk]){D[nk]=step;P[nk]=k;hpush(h,nk,step)}}}
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
 if(!f||f.D[k]===INF)return null;
 const p=[];while(f.P[k]>=0){k=f.P[k];p.push([(k/N)|0,k%N])}return p}
const pathTo=(u,o)=>chase(getF(o,modeOf(u.code)),u);

function addU(si,code){
 const st=SPOT[si],b=parseInt(code,10),same=S.units.filter(u=>u.si===si&&u.code===code).length;
 const num=isNaN(b)?code+(same?String(same+1):''):String(b+same);
 S.units.push({id:uid++,si,code,cs:st.n+num,usar:/^特/.test(st.n)?1:0,x:st.x[0],y:st.x[1],path:[],st:'idle',
  inc:null,duty:null,off:0,wait:0,turn:0,oosT:0,mode:null,tp:false,crew:0,res:false,
  slot:null,arm:null,parked:0,ox:0,oy:0,hd:0,tank:CODE[code].cap||0,back:null})}
// 評鑑：累積制，增加有邊際效應（評鑑越高，同樣的表現加得越少）；扣分不打折，歸零即失去指揮權
function repGain(base){if(base<=0)return 0;const g=base*150/(150+Math.max(0,S.rep));S.rep+=g;S.repLast={g,t:S.t};return g}
// 車輛所屬分隊名稱（跨縣市支援車隊用原單位分隊）
const ST_FULL={'特一':'第一特搜','特二':'第二特搜'};
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
const FLEET=['11','11','11','16','21','41','61','91','91','71','75','57','51','31','艇','履','警'];
function reset(){
 build();
 S={day:1,t:0,money:15000,rep:100,score:0,solved:0,units:[],inc:[],duties:[],
  spawn:10,dspawn:90,nst:10,over:false,hyd:[],tp:SPOT.map(s=>s.tp)};
 for(let x=0;x<N;x++)for(let y=0;y<N;y++){const k=K(x,y);
  if(RD[k]&&RD[k]<4&&!TR[k]&&(inCity(x,y)?(RC.indexOf(x)>=0||RR.indexOf(y)>=0)&&Math.random()<.085:Math.random()<.05))S.hyd.push([x,y])}
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
  [9,'11','11','16','41','91','91','71']];
 roster.forEach(r=>{const si=r[0];for(let i=1;i<r.length;i++)addU(si,r[i])});
 S.ix=null;reindex();sel=selU=null;paused=false;zoom=2;
 cam={x:(SPOT[0].p[0]+.5)*cell()-cw/2,y:(SPOT[0].p[1]+.5)*cell()-ch/2};clamp()}
