// 鄉間地圖：市區（左上 CITY×CITY）以外的東側旗山、美濃、大樹、六龜與南側林園
// 地形：高屏溪（東緣）、山區（東北）、南側海岸與魚塭、其餘為農田；道路為不規則的省道、鄉道與農路
'use strict';
// 鄉鎮中心（分隊在中心右下一格，見 SABS）
const RTOWN=[{n:'旗山',c:[118,62],r:5},{n:'美濃',c:[131,50],r:4},{n:'大樹',c:[116,94],r:4},{n:'林園',c:[78,128],r:5},{n:'六龜',c:[138,21],r:3}];
const riverX=y=>141+3*Math.sin(y/9)+1.2*Math.sin(y/3.7);
const mtnEdge=x=>36+5*Math.sin(x/6.5)+(x>=133?(x-133)*2.6:0);   // 這條線以北為山區；越往東山區越往南延伸
const seaEdge=x=>141+2*Math.sin(x/6)+Math.sin(x/2.3);
function ruralTerrain(){
 for(let x=0;x<N;x++)for(let y=0;y<N;y++){
  if(inCity(x,y))continue;
  const k=K(x,y),rx=riverX(y);
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
 // 鄉鎮與聚落用地
 for(const t of RTOWN){const [cx,cy]=t.c;
  for(let x=cx-t.r;x<=cx+t.r;x++)for(let y=cy-t.r;y<=cy+t.r;y++){
   if(x<0||y<0||x>=N||y>=N)continue;const d=Math.hypot(x-cx,y-cy);
   if(d<=t.r+.3*Math.sin(x*3+y)&&TR[K(x,y)]!==1)TR[K(x,y)]=0}}}
// 鋪設一格鄉間道路：過河為橋、遇國道成交流道、山區降為產業道路；不降級既有較高等級道路
function rset(x,y,c){
 if(x<0||y<0||x>=N||y>=N)return false;
 const k=K(x,y),r=RD[k];
 if(TR[k]===1){if(c>=2){RD[k]=6;return true}return false}
 if(r===4){RD[k]=7;return true}
 if(r===6||r===7)return true;
 const v=TR[k]===2?5:c;
 if(!r||(r===1&&v>1)||(r===5&&v!==5))RD[k]=v;
 return true}
// 蜿蜒道路：每步依剩餘距離比例決定橫向或縱向前進，偶爾側移，形成不規則的斜向路線
function rroad(a,b,c,wig){
 let x=a[0],y=a[1],n=0;rset(x,y,c);
 while((x!==b[0]||y!==b[1])&&n++<600){
  const dx=b[0]-x,dy=b[1]-y;
  if(Math.random()<(wig||.12)){const s=Math.random()<.5?1:-1;
   if(Math.abs(dx)>Math.abs(dy)){if(Math.abs(dy)<6)y+=s}else{if(Math.abs(dx)<6)x+=s}}
  else if(Math.random()<Math.abs(dx)/(Math.abs(dx)+Math.abs(dy)))x+=Math.sign(dx);
  else y+=Math.sign(dy);
  x=Math.max(0,Math.min(N-1,x));y=Math.max(0,Math.min(N-1,y));
  rset(x,y,c)}}
function ruralRoads(){
 const T={};for(const t of RTOWN)T[t.n]=t.c;
 // 鄉鎮街道：中心十字主街（筆直，分隊停靠）＋幾條歪斜的巷道
 for(const t of RTOWN){const [cx,cy]=t.c;
  for(let d=-t.r-1;d<=t.r+1;d++){rset(cx+d,cy,2);rset(cx,cy+d,2)}
  for(let i=0;i<t.r+2;i++){let x=cx+Math.round((Math.random()-.5)*t.r*1.6),y=cy+Math.round((Math.random()-.5)*t.r*1.6),hz=Math.random()<.5;
   for(let s=0;s<3+Math.random()*4;s++){if(Math.hypot(x-cx,y-cy)>t.r+1)break;rset(x,y,1);
    if(Math.random()<.25)hz=!hz;if(hz)x+=Math.random()<.85?1:-1;else y+=Math.random()<.85?1:-1}}}
 // 省道與縣道：市區邊緣接到各鄉鎮，再串連鄉鎮
 const edgeY=y=>RR.reduce((b,v)=>Math.abs(v-y)<Math.abs(b-y)?v:b,RR[0]);
 const edgeX=x=>RC.reduce((b,v)=>Math.abs(v-x)<Math.abs(b-x)?v:b,RC[0]);
 rroad([FYE,FY],T['旗山'],3,.08);                        // 國道十號端點接旗山
 rroad([CITY-1,edgeY(74)],T['旗山'],3);                   // 台 3 / 台 22
 rroad(T['旗山'],T['美濃'],3);                            // 旗美公路
 rroad(T['旗山'],T['大樹'],3);                            // 台 21 南段
 rroad([CITY-1,edgeY(92)],T['大樹'],3);                   // 台 29 / 鳳山—大樹
 rroad([edgeX(58),CITY-1],T['林園'],3);                   // 台 17 沿海
 rroad([edgeX(92),CITY-1],T['林園'],2);                   // 大寮—林園
 rroad(T['林園'],T['大樹'],2,.18);                        // 沿高屏溪的縣道
 rroad([CITY-1,edgeY(112)],[100,112],2,.2);
 rroad(T['旗山'],[134,76],2,.2);                         // 旗山往東到溪岸
 rroad(T['大樹'],[132,118],2,.2);                         // 大樹往東南的鄉道
 rroad(T['美濃'],[137,62],2,.2);
 // 山區道路只有少數幾條：美濃往六龜（沿荖濃溪）、旗山往北（甲仙方向）
 rroad(T['美濃'],T['六龜'],5,.22);
 rroad(T['六龜'],[136,2],5,.25);
 rroad([T['旗山'][0]-2,T['旗山'][1]-5],[110,8],5,.25);
 // 農路：從鄉間道路分岔出去的短路，會轉彎、有些是死路
 const seeds=[];for(let x=0;x<N;x++)for(let y=0;y<N;y++)if(!inCity(x,y)&&RD[K(x,y)]>=2&&RD[K(x,y)]<=3)seeds.push([x,y]);
 for(let i=0;i<120&&seeds.length;i++){let [x,y]=seeds[Math.floor(Math.random()*seeds.length)],d=Math.floor(Math.random()*4);
  const len=3+Math.floor(Math.random()*9);
  for(let s=0;s<len;s++){if(Math.random()<.22)d=(d+(Math.random()<.5?1:3))%4;
   const nx=x+DIR[d][0],ny=y+DIR[d][1];
   if(nx<1||ny<1||nx>=N-1||ny>=N-1||inCity(nx,ny))break;
   const k=K(nx,ny);if(TR[k]===1||TR[k]===2||RD[k]===4||RD[k]===7)break;
   x=nx;y=ny;if(!RD[k])RD[k]=1}}
 // 散村：農路旁幾戶人家
 for(let i=0;i<26;i++){const x=1+Math.floor(Math.random()*(N-2)),y=1+Math.floor(Math.random()*(N-2)),k=K(x,y);
  if(inCity(x,y)||RD[k]||TR[k]!==5)continue;
  let near=false;for(let j=0;j<4;j++)if(cls(x+DIR[j][0],y+DIR[j][1]))near=true;
  if(!near)continue;
  for(let a=0;a<2;a++)for(let b=0;b<2;b++){const kk=K(Math.min(N-1,x+a),Math.min(N-1,y+b));if(!RD[kk]&&TR[kk]===5)TR[kk]=0}}}
// 鄉間地址：最近的鄉鎮＋里名／路名
const RADDR={'旗山':['中山路','延平一路','旗甲路','中華路'],'美濃':['中山路','美興街','泰安路','中正路'],'大樹':['中興路','龍目路','竹寮路','檨腳路'],'林園':['林園北路','沿海路','東林西路','王公路'],'六龜':['光復路','中正路','新威路','荖濃路']};
function ruralAddr(x,y){
 let b=RTOWN[0],bd=1e9;for(const t of RTOWN){const d=Math.hypot(t.c[0]-x,t.c[1]-y);if(d<bd){bd=d;b=t}}
 const near=bd<=b.r+1;
 return b.n+'區'+(near?pick(RADDR[b.n])+(1+Math.floor(Math.random()*400))+'號':pick(['農路','產業道路','鄉道','堤防道路'])+'旁 '+pick(['一','二','三','五','七','九'])+'鄰')}
