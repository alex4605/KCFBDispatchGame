// 鄉間地圖：市區（左上 CITY×CITY）以外的東側旗山、美濃、大樹、六龜與南側林園
// 地形：高屏溪（東緣）、山區（東北）、南側海岸與魚塭、其餘為農田；道路為不規則的省道、鄉道與農路
'use strict';
// 鄉鎮中心（分隊在中心右下一格，見 SABS）
// 座標為相對市區左上角 (OX,OY)；每次生成地圖時由 RTOWN0 重設，位移後加上 (OX,OY)
const RTOWN0=[[118,62],[131,50],[116,94],[78,128],[138,21],[41,-16],[65,-12]];
const RTOWN=[{n:'旗山',r:5},{n:'美濃',r:4},{n:'大樹',r:4},{n:'林園',r:5},{n:'六龜',r:3},{n:'路竹',r:4},{n:'阿蓮',r:3}];
const riverX=y=>OX+141+3*Math.sin((y-OY)/9)+1.2*Math.sin((y-OY)/3.7);
const mtnEdge=x=>OY+36+5*Math.sin((x-OX)/6.5)+(x-OX>=133?(x-OX-133)*2.6:0);   // 這條線以北為山區；越往東山區越往南延伸
const seaEdge=x=>OY+141+2*Math.sin((x-OX)/6)+Math.sin((x-OX)/2.3);
function ruralTerrain(){
 for(let x=0;x<N;x++)for(let y=0;y<N;y++){
  if(inCity(x,y))continue;
  const k=K(x,y),rx=riverX(y);
  if(TR[k]===1)continue;                              // 先前畫好的海面（西南海岸）保留
  let t=5;                                            // 預設農田
  if(Math.abs(x-rx)<1.6)t=1;                          // 高屏溪
  else if(y>seaEdge(x)&&x<rx)t=1;                     // 南側海岸
  else if(x>=CITY&&y<mtnEdge(x))t=2;                  // 東北山區
  TR[k]=t}
 // 河岸沙洲邊的灘地樹林
 for(let y=0;y<N;y++){const rx=Math.round(riverX(y));for(const dx of[-2,2])if(Math.random()<.35){const x=rx+dx;if(x>=0&&x<N&&TR[K(x,y)]===5)TR[K(x,y)]=2}}
 // 南側近海魚塭（成片）
 for(let i=0;i<16;i++){const cx=30+Math.random()*75,cy=118+Math.random()*20,rx=2+Math.random()*3,ry=1.5+Math.random()*2.5;
  for(let x=Math.floor(cx-rx);x<=cx+rx;x++)for(let y=Math.floor(cy-ry);y<=cy+ry;y++){
   if(x<0||y<0||x>=N||y>=N||inCity(x,y))continue;const k=K(x,y);if(TR[k]===5)TR[k]=6}}
 // 東側丘陵小樹林
 for(let i=0;i<10;i++){const cx=CITY+2+Math.random()*30,cy=60+Math.random()*60,r=1+Math.random()*2;
  for(let x=Math.floor(cx-r);x<=cx+r;x++)for(let y=Math.floor(cy-r);y<=cy+r;y++){if(x>=0&&y>=0&&x<N&&y<N&&TR[K(x,y)]===5&&!inCity(x,y)&&Math.random()<.8)TR[K(x,y)]=2}}
 // 林園石化工業區（TR 7）：林園東南、近海，儲槽與廠房
 for(let x=84;x<=101;x++)for(let y=123;y<=139;y++){const k=K(x,y);
  if(TR[k]===1||y>seaEdge(x)-1)continue;
  if((x===84||x===101||y===123)&&Math.sin(x*2.1+y*1.3)>.4)continue;TR[k]=7}
 // 鄉鎮與聚落用地
 for(const t of RTOWN){const [cx,cy]=t.c;
  for(let x=cx-t.r;x<=cx+t.r;x++)for(let y=cy-t.r;y<=cy+t.r;y++){
   if(x<0||y<0||x>=N||y>=N)continue;const d=Math.hypot(x-cx,y-cy);
   if(d<=t.r+.3*Math.sin(x*3+y)&&TR[K(x,y)]!==1)TR[K(x,y)]=0}}}
// 鋪設一格鄉間道路：過河為橋、遇國道成交流道、山區降為產業道路；不降級既有較高等級道路
// g：指定的道路等級（RGK.PROV 等），寫進 RGF 供分級使用；省道進山區不降級（台 27、台 20 可通大型車）
function rset(x,y,c,g){
 if(x<0||y<0||x>=N||y>=N)return false;
 const k=K(x,y),r=RD[k];
 if(TR[k]===1&&!HG[k]){if(c>=2){RD[k]=6;if(g&&(!RGF[k]||g<RGF[k]))RGF[k]=g;return true}return false}
 if(r===4){RD[k]=TR[k]===2&&g!==RGK.PROV?5:c;HWL[k]=1;if(g)RGF[k]=g;return true}   // 穿越平面國道：走地下道
 if(r===6||r===7)return true;
 const v=TR[k]===2&&g!==RGK.PROV?5:c;
 if(!r||(r===1&&v>1)||(r===5&&v!==5))RD[k]=v;
 if(g&&(!RGF[k]||g<RGF[k]))RGF[k]=g;
 return true}
// 鄉間道路：先規劃大方向（起訖點之間放 1～2 個略為偏移的控制點），再以成本路徑搜尋鋪設：
// 沿用既有道路很便宜（減少重疊與平行路）、緊鄰既有道路但不在路上較貴（避免兩條路並排）、
// 過河很貴（只在必要處架橋）、偏離規劃線有小額成本（鋪出均勻的斜線，畫面上再以斜切轉角平滑）
function rroad(a,b,c,wig,g,name){
 const L=Math.hypot(b[0]-a[0],b[1]-a[1]),pts=[a],nm=L>40?2:L>14?1:0,px=-(b[1]-a[1])/(L||1),py=(b[0]-a[0])/(L||1);
 for(let i=1;i<=nm;i++){const f=i/(nm+1),o=(Math.random()-.5)*2*L*(wig||.12)*.9;
  pts.push([Math.round(a[0]+(b[0]-a[0])*f+px*o),Math.round(a[1]+(b[1]-a[1])*f+py*o)].map(v=>Math.max(1,Math.min(N-2,v))))}
 pts.push(b);
 const cells=[];
 for(let i=0;i<pts.length-1;i++){const seg=routeAStar(pts[i],pts[i+1],c,g);
  for(const q of(i?seg.slice(1):seg)){rset(q[0],q[1],c,g);cells.push(q)}}
 if(name)ROUTES.push({n:name,g,cells});
 return cells}
function routeAStar(a,b,c,g){
 const cost=(x,y,k)=>{const r=RD[k],t=TR[k];
  if(t===4||inFacility(x,y))return INF;
  if(t===1&&!HG[k]){if(r)return .4;if(c<2)return INF;
   // 開闊海面不鋪路（5×5 內幾乎都是水），窄河道才架橋
   let w=0;for(let a=-2;a<=2;a++)for(let b=-2;b<=2;b++){const xx=x+a,yy=y+b;if(xx<0||yy<0||xx>=N||yy>=N||TR[K(xx,yy)]===1)w++}
   return w>=20?INF:14}
  if(r===4)return 3;if(r===7)return 1.2;if(r)return .35;
  let adj=0;for(let j=0;j<4;j++){const xx=x+DIR[j][0],yy=y+DIR[j][1];if(xx>=0&&yy>=0&&xx<N&&yy<N&&RD[K(xx,yy)])adj=1}
  return (t===2?(g===RGK.PROV?1.6:2.2):t===6?3:t===0?.9:1)+(adj?1.6:0)+(inCity(x,y)?.6:0)};
 const ax=a[0],ay=a[1],dx=b[0]-ax,dy=b[1]-ay,dl=Math.hypot(dx,dy)||1;
 const dev=(x,y)=>Math.abs((x-ax)*dy-(y-ay)*dx)/dl;
 const D=new Float32Array(N*N).fill(INF),P=new Int32Array(N*N).fill(-1),k0=K(a[0],a[1]),k1=K(b[0],b[1]),h=[];
 D[k0]=0;hpush(h,k0,0);
 while(h.length){hpop(h);const k=_hpK;if(k===k1)break;const d=D[k],x=(k/N)|0,y=k%N;
  if(_hpD>d+Math.abs(b[0]-x)*.35+Math.abs(b[1]-y)*.35+1e-3)continue;
  for(let j=0;j<4;j++){const nx=x+DIR[j][0],ny=y+DIR[j][1];if(nx<0||ny<0||nx>=N||ny>=N)continue;
   const nk=K(nx,ny),cc=nk===k1?.35:cost(nx,ny,nk);if(cc===INF)continue;
   const nd=Math.fround(d+cc+dev(nx,ny)*.06);
   if(nd<D[nk]){D[nk]=nd;P[nk]=k;hpush(h,nk,nd+Math.abs(b[0]-nx)*.35+Math.abs(b[1]-ny)*.35)}}}
 if(P[k1]<0&&k1!==k0)return[a,b];
 const out=[];for(let k=k1;k>=0;k=P[k]){out.push([(k/N)|0,k%N]);if(k===k0)break}
 return out.reverse()}
// 市區接線點：從市區邊緣附近找最接近 (x,y) 的既有幹道格（郊區的次要道路可能沒有通到邊緣）
function cityEntry(x,y){
 let best=null,bd=1e9;
 for(let a=Math.max(OX,x-14);a<=Math.min(OX+CITY-1,x+14);a++)for(let b=Math.max(OY,y-14);b<=Math.min(OY+CITY-1,y+14);b++){
  const r=RD[K(a,b)];if(!r||r===1||r===4||r===5||r===7||HG[K(a,b)])continue;
  const d=Math.hypot(a-x,b-y)-(r===3?2:0);if(d<bd){bd=d;best=[a,b]}}
 return best||[Math.min(CITY-1,x),Math.min(CITY-1,y)]}
function ruralRoads(){
 const T={};for(const t of RTOWN)T[t.n]=t.c;
 // 鄉鎮街道：中心十字主街（筆直，分隊停靠）＋幾條歪斜的巷道
 for(const t of RTOWN){const [cx,cy]=t.c;
  for(let d=-t.r-1;d<=t.r+1;d++){rset(cx+d,cy,2,RGK.TWN);rset(cx,cy+d,2,RGK.TWN)}
  for(let i=0;i<Math.max(2,t.r-1);i++){let x=cx+Math.round((Math.random()-.5)*t.r*1.6),y=cy+Math.round((Math.random()-.5)*t.r*1.6),hz=Math.random()<.5;
   for(let s=0;s<3+Math.random()*4;s++){if(Math.hypot(x-cx,y-cy)>t.r+1)break;
    // 小巷不貼著既有道路平行走（相鄰道路超過一格就停）
    let nb=0;for(let j=0;j<4;j++)if(cls(x+DIR[j][0],y+DIR[j][1]))nb++;
    if(s>0&&nb>1&&!RD[K(x,y)])break;
    rset(x,y,1,RGK.PATH);
    if(Math.random()<.25)hz=!hz;if(hz)x+=Math.random()<.85?1:-1;else y+=Math.random()<.85?1:-1}}}
 // 工業區道路：大街廓棋盤（每 4 格一條），再接到林園市區
 for(let x=84;x<=101;x++)for(let y=123;y<=139;y++){const k=K(x,y);if(TR[k]!==7)continue;
  if((x-84)%5===0||(y-123)%4===0){RD[k]=2;RGF[k]=RGK.TWN}}
 rroad(T['林園'],[86,127],2,.05,RGK.TWN,'工業一路');
 // 省道與縣道：市區邊緣接到各鄉鎮，再串連鄉鎮
 const edgeY=y=>RR.reduce((b,v)=>Math.abs(v-y)<Math.abs(b-y)?v:b,RR[0]);
 const edgeX=x=>RC.reduce((b,v)=>Math.abs(v-x)<Math.abs(b-x)?v:b,RC[0]);
 rroad([FYE,FY],T['旗山'],3,.08,RGK.PROV);                          // 國道十號端點接旗山
 rroad(cityEntry(CITY-1,edgeY(74)),T['旗山'],3,.12,RGK.PROV,'台3');  // 台 3
 rroad(T['旗山'],T['美濃'],3,.12,RGK.CNTY,'縣184');                   // 旗美公路
 rroad(T['旗山'],T['大樹'],3,.12,RGK.PROV,'台21');                    // 台 21
 rroad(cityEntry(CITY-1,edgeY(92)),T['大樹'],3,.12,RGK.PROV,'台29');  // 鳳山—大樹
 rroad(cityEntry(edgeX(58),CITY-1),T['林園'],3,.12,RGK.PROV,'台17');  // 台 17 沿海
 rroad(cityEntry(edgeX(92),CITY-1),T['林園'],2,.12,RGK.CNTY,'縣188'); // 大寮—林園
 rroad(T['林園'],T['大樹'],2,.18,RGK.CNTY,'縣186');                   // 沿高屏溪的縣道
 rroad(cityEntry(CITY-1,CITY-1),[100,112],2,.2,RGK.TWN);
 rroad(T['旗山'],[134,76],2,.2,RGK.TWN,'高30');                       // 旗山往東到溪岸
 rroad(T['大樹'],[132,118],2,.2,RGK.TWN,'高37');                      // 大樹往東南的鄉道
 rroad(T['美濃'],[137,62],2,.2,RGK.TWN);
 // 山區道路只有少數幾條：美濃往六龜為省道（台 27，可通大型車），其餘為產業道路
 rroad(T['美濃'],T['六龜'],3,.22,RGK.PROV,'台27');
 rroad(T['六龜'],[136,2],5,.25,RGK.IND,'台20');
 // 市區東北山林：從市區邊緣兩條產業道路進山，接到台 20 與美濃，不留死路
 rroad(cityEntry(86,30),T['六龜'],5,.2,RGK.IND,'高36');
 rroad(cityEntry(96,12),[118,14],5,.2,RGK.IND);
 rroad([118,14],T['美濃'],5,.2,RGK.IND);
 // 農路：從鄉間道路分岔出去的短路，會轉彎、有些是死路
 const seeds=[];for(let x=0;x<N;x++)for(let y=0;y<N;y++)if(!inCity(x,y)&&RD[K(x,y)]>=2&&RD[K(x,y)]<=3)seeds.push([x,y]);
 for(let i=0;i<120&&seeds.length;i++){let [x,y]=seeds[Math.floor(Math.random()*seeds.length)],d=Math.floor(Math.random()*4);
  const len=3+Math.floor(Math.random()*9);
  for(let s=0;s<len;s++){if(Math.random()<.22)d=(d+(Math.random()<.5?1:3))%4;
   const nx=x+DIR[d][0],ny=y+DIR[d][1];
   if(nx<1||ny<1||nx>=N-1||ny>=N-1||inCity(nx,ny))break;
   const k=K(nx,ny);if(TR[k]===1||TR[k]===2||RD[k]===4||RD[k]===7)break;
   x=nx;y=ny;if(!RD[k]){RD[k]=1;RGF[k]=RGK.IND}}}
 expressway88();
 // 郊區帶狀聚落：緊鄰市區的鄉間道路兩旁蓋滿透天與鐵皮工廠
 for(let x=0;x<N;x++)for(let y=0;y<N;y++){if(inCity(x,y)||!isSub(x,y))continue;const k=K(x,y);
  if(RD[k]||TR[k]!==5)continue;
  let near=false;for(let j=0;j<4;j++){const r=cls(x+DIR[j][0],y+DIR[j][1]);if(r>=2&&r<=3)near=true}
  const d=Math.max(x-CITY+1,y-CITY+1);
  if(near&&Math.random()<.75-d*.06)TR[k]=0}
 // 散村：農路旁幾戶人家
 for(let i=0;i<26;i++){const x=1+Math.floor(Math.random()*(N-2)),y=1+Math.floor(Math.random()*(N-2)),k=K(x,y);
  if(inCity(x,y)||RD[k]||TR[k]!==5)continue;
  let near=false;for(let j=0;j<4;j++)if(cls(x+DIR[j][0],y+DIR[j][1]))near=true;
  if(!near)continue;
  for(let a=0;a<2;a++)for(let b=0;b<2;b++){const kk=K(Math.min(N-1,x+a),Math.min(N-1,y+b));if(!RD[kk]&&TR[kk]===5)TR[kk]=0}}}
// 鄉間地址：最近的鄉鎮＋里名／路名
const RADDR={'路竹':['中山路','大社路','國昌路','竹東街'],'阿蓮':['中正路','民生路','崗山北路','復安路'],'旗山':['中山路','延平一路','旗甲路','中華路'],'美濃':['中山路','美興街','泰安路','中正路'],'大樹':['中興路','龍目路','竹寮路','檨腳路'],'林園':['林園北路','沿海路','東林西路','王公路'],'六龜':['光復路','中正路','新威路','荖濃路']};
function ruralAddr(x,y){
 for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){const xx=x+a,yy=y+b;if(xx>=0&&yy>=0&&xx<N&&yy<N&&TR[K(xx,yy)]===7)return'林園石化工業區 工業'+pick(['一','二','三','四'])+'路'+(1+Math.floor(Math.random()*90))+'號'}
 let b=RTOWN[0],bd=1e9;for(const t of RTOWN){const d=Math.hypot(t.c[0]-x,t.c[1]-y);if(d<bd){bd=d;b=t}}
 const near=bd<=b.r+1;
 return b.n+'區'+(near?pick(RADDR[b.n])+(1+Math.floor(Math.random()*400))+'號':pick(['農路','產業道路','鄉道','堤防道路'])+'旁 '+pick(['一','二','三','五','七','九'])+'鄰')}
// 鄉間地貌細節：作物分區、灌溉水圳、光電魚塭、學校、高壓電塔線（只影響繪製，不影響路網與案件）
// CROP：1 稻田 2 香蕉園 3 檳榔園 4 溫室 5 果園 6 旱作 7 光電魚塭 8 學校操場
const CROPN=['','稻田','香蕉園','檳榔園','溫室','果園','旱作','光電魚塭','學校','工廠','航廈','停機坪'];
let PYLON=[];
function ruralDetail(){
 CROP.fill(0);CANAL.fill(0);
 const T={};for(const t of RTOWN)T[t.n]=t.c;
 const nearT=(x,y,a)=>{let n=0;for(let dx=-a;dx<=a;dx++)for(let dy=-a;dy<=a;dy++){const xx=x+dx,yy=y+dy;if(xx>=0&&yy>=0&&xx<N&&yy<N&&TR[K(xx,yy)]===2)n++}return n};
 // 以 3×3 區塊決定作物，讓同一片田一致
 const blk=(x,y,s)=>{let h=((x/3|0)*73856093^(y/3|0)*19349663^s*83492791)>>>0;h^=h>>>13;h=Math.imul(h,1274126177)>>>0;return(h>>>0)/4294967296};
 for(let x=0;x<N;x++)for(let y=0;y<N;y++){const k=K(x,y);if(inCity(x,y))continue;
  if(TR[k]===5&&!isSub(x,y)||TR[k]===5&&!inCity(x,y)){const b=blk(x,y,1),dq=Math.hypot(x-T['旗山'][0],y-T['旗山'][1]),dm=Math.hypot(x-T['美濃'][0],y-T['美濃'][1]),hill=nearT(x,y,3);
   let c=1;
   if(hill>4&&b<.55)c=3;
   else if(dq<16&&b<.5)c=2;
   else if(dm<12&&b<.25)c=4;
   else if(y>112&&b<.35)c=6;
   else if(b>.86)c=5;
   else if(b>.8)c=4;
   CROP[k]=c}
  else if(TR[k]===6&&blk(x,y,2)<.3)CROP[k]=7}
 // 郊區的鐵皮工廠、倉庫（CROP 9）
 for(let x=0;x<N;x++)for(let y=0;y<N;y++){const k=K(x,y);if(TR[k]!==0||RD[k]||!isSub(x,y)||inFacility(x,y))continue;
  if(blk(x,y,5)<.38)CROP[k]=9}
 // 機場：航廈、停機坪、塔台、貨運站、修護棚廠、油庫（配置見 airport.js）
 airportCrops();
 // 學校：每個鄉鎮邊緣一處操場
 for(const t of RTOWN){for(let tries=0;tries<30;tries++){const x=t.c[0]+Math.round((Math.random()-.5)*2*t.r),y=t.c[1]+Math.round((Math.random()-.5)*2*t.r),k=K(x,y);
  if(x<0||y<0||x>=N||y>=N||RD[k]||TR[k]!==0||inFacility(x,y))continue;CROP[k]=8;break}}
 // 灌溉水圳：從高屏溪或山腳往平原流，沿田埂轉折，不穿越道路以外的設施（遇路以涵洞通過）
 const starts=[[riverX(OY+70)-2,OY+70],[riverX(OY+100)-2,OY+100],[riverX(OY+125)-2,OY+125],[OX+124,mtnEdge(OX+124)+1],[OX+112,mtnEdge(OX+112)+1],[OX+128,mtnEdge(OX+128)+2],[OX+30,OY-10],[OX+55,OY-6]];
 for(const s of starts){let x=Math.round(s[0]),y=Math.round(s[1]),d=x>CITY+18?1:2;
  const tx=s[1]<OY?s[0]+(Math.random()-.5)*30:OX+CITY+2+Math.random()*20,ty=s[1]<OY?OY-1:s[1]+20+Math.random()*25;
  for(let i=0;i<70;i++){
   if(x<0||y<0||x>=N||y>=N||inCity(x,y))break;const k=K(x,y);
   if(TR[k]===1||TR[k]===2&&i>3)break;
   if(TR[k]===5&&!RD[k])CANAL[k]=1;
   const dx=tx-x,dy=ty-y;if(Math.abs(dx)+Math.abs(dy)<2)break;
   if(Math.random()<.25)d=Math.abs(dx)>Math.abs(dy)?(dx>0?0:1):(dy>0?2:3);
   x+=DIR[d][0];y+=DIR[d][1]}}
 // 高壓電塔線：從市區東緣往東南穿過農田到高屏溪
 PYLON=[];const a=[OX+CITY+1,OY+56],b=[OX+138,OY+116],n=14;
 for(let i=0;i<=n;i++)PYLON.push([a[0]+(b[0]-a[0])*i/n+.5,a[1]+(b[1]-a[1])*i/n+.5])}
// 台 88 快速道路：國道一號往東，高架經大寮一帶到高屏溪（往屏東），沿途幾處匝道
function expressway88(){
 const y=RR.reduce((b,v)=>Math.abs(v-68)<Math.abs(b-68)?v:b,RR[0]),xe=Math.floor(riverX(y))+1,cells=[];
 for(let x=FX+1;x<=xe;x++){layHW(x,y,RGK.EXP);cells.push([x,y])}
 const k0=K(FX,y);RD[k0]=7;HWL[k0]=0;                      // 與國一系統交流道
 // 匝道：與地面道路交會處設菱形匝道（RD 7），兩側補一格地面道路
 const want=[86,CITY+3,118,130];
 for(const wx of want){let bx=-1;for(let d=0;d<8&&bx<0;d++)for(const x of[wx+d,wx-d])if(bx<0&&x>FX&&x<xe&&HWL[K(x,y)]&&RD[K(x,y)]>=2&&RD[K(x,y)]<=3)bx=x;
  if(bx<0)continue;const k=K(bx,y);RD[k]=7;HWL[k]=0}
 ROUTES.push({n:'台88',g:RGK.EXP,cells})}
// 道路分級：依生成時的指定（RGF）、功能類別（RD）與所在區域決定每格的地面道路等級 RG
function roadGrades(){
 // 市區的台 1 線：中段一條南北向幹道
 const c1=RC.reduce((b,v)=>Math.abs(v-OX-36)<Math.abs(b-OX-36)?v:b,RC[0]),cells=[];
 for(let y=OY;y<OY+CITY;y++){const k=K(c1,y);if(RD[k]>=2&&RD[k]!==4&&RD[k]!==7){RGF[k]=RGK.PROV;cells.push([c1,y])}}
 ROUTES.push({n:'台1',g:RGK.PROV,cells});
 const inTown=(x,y)=>RTOWN.some(t=>Math.hypot(x-t.c[0],y-t.c[1])<=t.r+1.5);
 for(let x=0;x<N;x++)for(let y=0;y<N;y++){const k=K(x,y),r=RD[k];
  if(!r){RG[k]=0;continue}
  if(r===4){RG[k]=HG[k]===RGK.EXP?RGK.EXP:HG[k]===RGK.HWG?RGK.HWG:RGK.HWE;continue}
  if(r===7){RG[k]=RGK.RAMP;continue}
  if(HWL[k]&&HG[k]===RGK.HWG){RG[k]=RGK.UND;continue}
  if(RGF[k]&&!(r===1&&RGF[k]<RGK.IND)){RG[k]=RGF[k];continue}
  if(inCity(x,y))RG[k]=r===1?RGK.PATH:r===5?RGK.IND:RGK.CITY;
  else RG[k]=r===1?(inTown(x,y)?RGK.PATH:RGK.IND):r===5?RGK.IND:RGK.TWN}}
// 國道／快速道路名稱：依旁邊的高速公路格判斷
function hwName(x,y){
 for(let d=0;d<=2;d++)for(let a=-d;a<=d;a++)for(let b=-d;b<=d;b++){const xx=x+a,yy=y+b;if(xx<0||yy<0||xx>=N||yy>=N)continue;const k=K(xx,yy);
  if(HG[k]===RGK.EXP)return'台88線快速道路';if(HG[k]){return xx===FX?'國道1號':'國道10號'}}
 return'國道1號'}
