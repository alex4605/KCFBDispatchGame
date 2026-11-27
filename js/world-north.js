// 地圖位移與北側擴展：基礎地圖生成完後整體位移 (dx,dy)，在北側補上岡山以北的郊區鄉間（路竹、阿蓮、湖內一帶、田寮丘陵），
// 西側補上海面；國道一號、台 1、台 17 往北延伸到臺南界的二仁溪
'use strict';
function shiftWorld(dx,dy){
 const mv=(A,fill)=>{const B=A.slice();A.fill(fill);
  for(let x=0;x+dx<N;x++)for(let y=0;y+dy<N;y++)A[K(x+dx,y+dy)]=B[K(x,y)]};
 for(const A of[RD,HWL,HG,RGF,RUN])mv(A,0);
 mv(TR,1);mv(SH,0);
 for(let k=0;k<N*N;k++)if(!SH[k])SH[k]=Math.random();
 for(let i=0;i<RC.length;i++)RC[i]+=dx;for(let i=0;i<RR.length;i++)RR[i]+=dy;
 FX+=dx;FY+=dy;FYE+=dx;OX=dx;OY=dy;
 for(const s of SPOT){if(s.p){s.p[0]+=dx;s.p[1]+=dy}if(s.x){s.x=[s.x[0]+dx,s.x[1]+dy]}}
 for(const h of HOSP){h.p[0]+=dx;h.p[1]+=dy;h.cells=h.cells.map(q=>[q[0]+dx,q[1]+dy])}
 if(AP){AP.x0+=dx;AP.x1+=dx;AP.y0+=dy;AP.y1+=dy}
 RTOWN.forEach((t,i)=>t.c=[RTOWN0[i][0]+dx,RTOWN0[i][1]+dy]);
 for(const r of ROUTES)r.cells=r.cells.map(q=>[q[0]+dx,q[1]+dy])}
function extendNorth(){
 const T={};for(const t of RTOWN)T[t.n]=t.c;
 // 地形：西側整條海面；北側由西往東為海岸、魚塭（永安、彌陀）、農田（湖內、路竹、阿蓮）、丘陵（田寮），最北是二仁溪（臺南界）
 for(let x=0;x<N;x++)for(let y=0;y<OY;y++){const k=K(x,y),lx=x-OX;let t=5;
  const coast=3+2*Math.sin(y/5)+Math.sin(y/2.1);
  if(x<OX||lx<coast)t=1;
  else if(Math.abs(y-2.5-.8*Math.sin(x/7))<1.1&&lx<88)t=1;            // 二仁溪
  else if(lx>78+6*Math.sin(y/4)-(OY-y)*.25)t=2;                          // 田寮丘陵，往東接市區東北山林
  else if(lx<18&&Math.sin(x*1.7+y*2.3)>-.2&&(x*7+y*13)%5!==0)t=6;     // 沿海魚塭
  TR[k]=t}
 for(let x=0;x<OX;x++)for(let y=OY;y<N;y++){TR[K(x,y)]=1;RD[K(x,y)]=0}
 // 鄉鎮
 for(const n of['路竹','阿蓮']){const t=RTOWN.find(z=>z.n===n),[cx,cy]=t.c;
  for(let x=cx-t.r;x<=cx+t.r;x++)for(let y=cy-t.r;y<=cy+t.r;y++){if(x<0||y<0||x>=N||y>=N)continue;
   if(Math.hypot(x-cx,y-cy)<=t.r+.3*Math.sin(x*3+y)&&TR[K(x,y)]!==1)TR[K(x,y)]=0}
  for(let d=-t.r-1;d<=t.r+1;d++){rset(cx+d,cy,2,RGK.TWN);rset(cx,cy+d,2,RGK.TWN)}}
 // 國道一號往北（平面，交叉道路走地下道），並在路竹設交流道
 const c1=[];for(let y=0;y<OY;y++){layHW(FX,y,RGK.HWG);c1.push([FX,y])}
 const r1=ROUTES.find(r=>r.n==='國1');if(r1)r1.cells=c1.concat(r1.cells);
 // 市區北緣接到各鄉鎮的省道、縣道
 const top=(x)=>cityEntry(x,OY);
 rroad(top(OX+36),T['路竹'],3,.1,RGK.PROV,'台1');
 rroad(T['路竹'],[OX+38,0],3,.1,RGK.PROV);
 rroad(top(OX+8),[OX+9,0],3,.1,RGK.PROV,'台17');
 rroad(T['路竹'],T['阿蓮'],3,.12,RGK.PROV,'台28');
 rroad(T['阿蓮'],top(OX+70),2,.15,RGK.CNTY,'縣182');
 rroad(T['阿蓮'],[OX+66,0],2,.15,RGK.TWN,'高19');
 rroad(top(OX+20),[OX+12,OY-14],2,.15,RGK.TWN,'高17');
 rroad([OX+12,OY-14],T['路竹'],2,.15,RGK.TWN);
 // 台 28 經田寮丘陵往東到旗山（省道，可通大型車）
 rroad(T['阿蓮'],T['旗山'],3,.1,RGK.PROV,'台28');
 // 國一路竹交流道：台 28 與國道交會處改為匝道
 for(let y=0;y<OY;y++){const k=K(FX,y);if(HWL[k]&&RD[k]>=2&&RD[k]<=3&&Math.abs(y-T['路竹'][1])<8){RD[k]=7;HWL[k]=0;break}}
 // 農路與帶狀聚落
 const seeds=[];for(let x=OX;x<N;x++)for(let y=0;y<OY;y++){const r=RD[K(x,y)];if(r>=2&&r<=3)seeds.push([x,y])}
 for(let i=0;i<45&&seeds.length;i++){let [x,y]=seeds[Math.floor(Math.random()*seeds.length)],d=Math.floor(Math.random()*4);
  const len=3+Math.floor(Math.random()*8);
  for(let s=0;s<len;s++){if(Math.random()<.22)d=(d+(Math.random()<.5?1:3))%4;
   const nx=x+DIR[d][0],ny=y+DIR[d][1];if(nx<OX||ny<0||nx>=N||ny>=OY)break;
   const k=K(nx,ny);if(TR[k]===1||TR[k]===2||RD[k]===4||RD[k]===7||HG[k])break;
   let nb=0;for(let j=0;j<4;j++)if(cls(nx+DIR[j][0],ny+DIR[j][1]))nb++;if(!RD[k]&&nb>1)break;
   x=nx;y=ny;if(!RD[k]){RD[k]=1;RGF[k]=RGK.IND}}}
 for(let x=OX;x<N;x++)for(let y=0;y<OY;y++){const k=K(x,y);if(RD[k]||TR[k]!==5)continue;
  let near=false;for(let j=0;j<4;j++){const r=cls(x+DIR[j][0],y+DIR[j][1]);if(r>=2&&r<=3)near=true}
  if(near&&Math.random()<(isSub(x,y)?.6:.18))TR[k]=0}
 // 台 20 往北延伸到地圖邊（往甲仙、那瑪夏）
 rroad([OX+136,OY+2],[OX+138,0],5,.2,RGK.IND);
 // 山區與丘陵的死路：反覆移除只連一端的產業道路與小徑（地圖邊緣除外）
 pruneDeadEnds();
 // 北側分隊：鄉鎮中心右下一格
 for(const s of SPOT){if(s.p||!SABSN[s.n])continue;const o=SABSN[s.n];s.p=[OX+o[0],OY+o[1]];
  const k=K(s.p[0],s.p[1]);TR[k]=0;RD[k]=0;const e=nbRoad(s.p[0],s.p[1]);s.x=e||null}}
// 移除山區（含丘陵）只連一端的道路格，直到沒有死路；地圖邊緣的路視為通往圖外，保留
function pruneDeadEnds(){
 for(let pass=0;pass<80;pass++){let n=0;
  for(let x=1;x<N-1;x++)for(let y=1;y<N-1;y++){const k=K(x,y),r=RD[k];
   if(!r||TR[k]!==2||r===4||r===6||r===7||HWL[k]||inFacility(x,y))continue;
   let d=0;for(let j=0;j<4;j++)if(cls(x+DIR[j][0],y+DIR[j][1]))d++;
   if(d<=1){RD[k]=0;RGF[k]=0;n++}}
  if(!n)break}}
