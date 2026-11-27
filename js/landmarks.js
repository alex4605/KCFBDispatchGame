// 地標設施：高雄車站（地下化）、高鐵左營站與高架高鐵、巨蛋、百貨公司、量販店、學校、85 大樓、50 層大樓、農地工廠、
// 軍事基地與兵工廠（管制區，平時不能進入、不會發生一般案件）。各佔 1～4 格，放在相關分隊附近、臨路的空地
'use strict';
let LMK=[];const LMKC=new Map();   // LMKC：格 → {m:地標, i}
let THSR=[],LMK_NEXT=null;          // THSR：高架高鐵經過的格（由高鐵站往北到地圖邊緣）；LMK_NEXT：正在建立的地標案件（makeInc 用來寫地址）
const LMK_DEF=[
 {k:'tra',n:'高雄車站',sub:'地下化車站',w:2,h:1,near:['苓雅',0,-9],col:'#3f5a74',ic:'🚉'},
 {k:'hsr',n:'高鐵左營站',sub:'高架車站',w:2,h:1,near:['左營',2,-4],col:'#c8732c',ic:'🚄'},
 {k:'dome',n:'高雄巨蛋',sub:'室內體育館',w:2,h:1,near:['左營',0,5],col:'#6a7480',ic:'🏟'},
 {k:'dept',n:'百貨公司',sub:'漢神百貨',w:1,h:1,near:['苓雅',3,2],col:'#7a4a6a',ic:'🛍'},
 {k:'dept',n:'百貨公司',sub:'夢時代',w:2,h:1,near:['前鎮',-2,3],col:'#7a4a6a',ic:'🛍'},
 {k:'mart',n:'量販店',sub:'',w:1,h:1,near:['鳳山',-3,2],col:'#2f6a5a',ic:'🛒'},
 {k:'mart',n:'量販店',sub:'',w:1,h:1,near:['鼓山',3,3],col:'#2f6a5a',ic:'🛒'},
 {k:'edu',n:'國中',sub:'',w:2,h:1,near:['楠梓',-4,4],col:'#5a6a3a',ic:'🏫'},
 {k:'edu',n:'高中',sub:'',w:2,h:1,near:['前鎮',4,-3],col:'#5a6a3a',ic:'🏫'},
 {k:'edu',n:'國小',sub:'',w:1,h:1,near:['鳳山',3,-3],col:'#5a6a3a',ic:'🏫'},
 {k:'edu',n:'國小',sub:'',w:1,h:1,near:['小港',-3,-2],col:'#5a6a3a',ic:'🏫'},
 {k:'edu',n:'國小',sub:'',w:1,h:1,near:['左營',4,2],col:'#5a6a3a',ic:'🏫'},
 {k:'edu',n:'國中',sub:'',w:2,h:1,near:['鼓山',-2,-4],col:'#5a6a3a',ic:'🏫'},
 {k:'edu',n:'高中',sub:'',w:2,h:1,near:['苓雅',-4,4],col:'#5a6a3a',ic:'🏫'},
 {k:'edu',n:'國小',sub:'',w:1,h:1,near:['岡山',2,3],col:'#5a6a3a',ic:'🏫'},
 {k:'edu',n:'大學',sub:'',w:2,h:2,near:['楠梓',5,-4],col:'#5a6a3a',ic:'🎓'},
 {k:'edu',n:'國中',sub:'',w:1,h:1,near:['大寮',2,2],col:'#5a6a3a',ic:'🏫'},
 {k:'edu',n:'國小',sub:'',w:1,h:1,near:['旗山',2,2],any:1,col:'#5a6a3a',ic:'🏫'},
 {k:'dept',n:'百貨公司',sub:'大遠百',w:1,h:1,near:['苓雅',-2,-2],col:'#7a4a6a',ic:'🛍'},
 {k:'dept',n:'百貨公司',sub:'新光三越',w:1,h:1,near:['苓雅',5,-3],col:'#7a4a6a',ic:'🛍'},
 {k:'dept',n:'百貨公司',sub:'漢神巨蛋',w:1,h:1,near:['左營',2,7],col:'#7a4a6a',ic:'🛍'},
 {k:'t85',n:'85 大樓',sub:'超高層',w:1,h:1,near:['苓雅',-3,6],col:'#8a6a3a',ic:'🏙'},
 {k:'t50',n:'50 層大樓',sub:'',w:1,h:1,near:['前鎮',3,-6],col:'#6a5a4a',ic:'🏢'},
 {k:'t50',n:'50 層大樓',sub:'',w:1,h:1,near:['鼓山',4,-2],col:'#6a5a4a',ic:'🏢'},
 {k:'farm',n:'農地工廠',sub:'',w:1,h:1,near:['路竹',4,4],any:1,col:'#5a5a4a',ic:'🏭'},
 {k:'farm',n:'農地工廠',sub:'',w:2,h:1,near:['湖內',-3,3],any:1,col:'#5a5a4a',ic:'🏭'},
 {k:'farm',n:'農地工廠',sub:'',w:1,h:1,near:['大樹',4,-3],any:1,col:'#5a5a4a',ic:'🏭'},
 {k:'farm',n:'農地工廠',sub:'',w:2,h:1,near:['仁武',5,-2],any:1,col:'#5a5a4a',ic:'🏭'},
 {k:'farm',n:'農地工廠',sub:'',w:1,h:1,near:['林園',-6,-4],any:1,col:'#5a5a4a',ic:'🏭'},
 {k:'farm',n:'農地工廠',sub:'',w:1,h:1,near:['阿蓮',3,3],any:1,col:'#5a5a4a',ic:'🏭'},
 {k:'mil',n:'左營海軍基地',sub:'管制區',w:2,h:2,near:['左營',-8,0],any:1,ban:1,col:'#3a4a3a',ic:'⚓'},
 {k:'afb',n:'岡山空軍基地',sub:'管制區',w:5,h:2,near:['岡山',-4,-7],any:1,ban:1,col:'#3a4a3a',ic:'✈'},
 {k:'mil',n:'陸軍官校',sub:'管制區',w:2,h:2,near:['鳳山',4,4],any:1,ban:1,col:'#3a4a3a',ic:'🪖'},
 {k:'beach',n:'旗津海水浴場',sub:'沙灘',w:1,h:3,near:['旗津',-3,0],any:1,sea:1,side:'w',col:'#b8a070',ic:'🏖'},
 {k:'arms',n:'兵工廠',sub:'管制區',w:2,h:2,near:['大寮',6,4],any:1,ban:1,col:'#4a3a2a',ic:'💥'}];
const lmkAt=(x,y)=>LMKC.get(K(x,y));
function placeLandmarks(){
 LMK=[];LMKC.clear();THSR=[];
 // any：鄉間農地或魚塭也可（農地工廠、軍事基地）；用地改為建地
 // sea：沙灘，要臨海（不需臨路），港區、魚塭也可
 let any=0,sea=0;const land=(x,y)=>{if(x<1||y<1||x>=N-1||y>=N-1)return false;const k=K(x,y);return!RD[k]&&!HWL[k]&&!HG[k]&&(TR[k]===0||any&&(TR[k]===5||TR[k]===6)||sea&&TR[k]===3)&&!inFacility(x,y)&&!LMKC.has(k)};
 const road=(x,y)=>{if(sea)return x>=0&&y>=0&&x<N&&y<N&&TR[K(x,y)]===1;const r=cls(x,y);return r===1||r===2||r===3};
 for(const d of LMK_DEF){const s=SPOT.find(z=>z.n===d.near[0]);if(!s||!s.p)continue;any=d.any?1:0;sea=d.sea?1:0;
  const cx=s.p[0]+d.near[1],cy=s.p[1]+d.near[2];let best=null,bd=1e9;
  for(const [W,H] of(d.w===d.h?[[d.w,d.h]]:[[d.w,d.h],[d.h,d.w]]))
   for(let x0=cx-12;x0<=cx+12;x0++)for(let y0=cy-12;y0<=cy+12;y0++){
    const dd=Math.hypot(x0+W/2-cx,y0+H/2-cy);if(dd>=bd)continue;
    let ok=true;for(let i=0;i<W&&ok;i++)for(let j=0;j<H;j++)if(!land(x0+i,y0+j)){ok=false;break}
    if(!ok)continue;
    let rd=0;if(d.side==='w'){for(let j=0;j<H;j++)if(road(x0-1,y0+j))rd++}   // 沙灘面向西邊的海
    else{for(let i=0;i<W;i++){if(road(x0+i,y0-1))rd++;if(road(x0+i,y0+H))rd++}for(let j=0;j<H;j++){if(road(x0-1,y0+j))rd++;if(road(x0+W,y0+j))rd++}}
    if(!rd)continue;bd=dd;best={x0,y0,w:W,h:H}}
  if(!best)continue;
  const m=Object.assign({},d,best,{cells:[]});m.p=[best.x0+(best.w-1)/2,best.y0+(best.h-1)/2];
  for(let i=0;i<best.w;i++)for(let j=0;j<best.h;j++){const x=best.x0+i,y=best.y0+j;m.cells.push([x,y]);LMKC.set(K(x,y),{m,i,j});TR[K(x,y)]=0}
  LMK.push(m)}
 // 高架高鐵：由高鐵站往北延伸到地圖邊緣（高架，不影響地面道路）
 const h=LMK.find(m=>m.k==='hsr');
 if(h){let x=h.x0+Math.floor(h.w/2);for(let y=h.y0-1;y>=0;y--){if(y<h.y0-6&&y%9===0&&x>h.x0-6)x--;THSR.push([x,y])}}}
// 放大後的地標俯視圖（一格）
function lmkDetail(L,px,py,c){
 const m=L.m,i=L.i,j=L.j,hz=m.w>=m.h,first=hz?i===0:j===0,last=hz?i===m.w-1:j===m.h-1;
 ctx.fillStyle='#3a3833';ctx.fillRect(px,py,c+.6,c+.6);
 if(m.k==='t85'||m.k==='t50'){ // 超高層：塔樓量體（投影陰影）、屋頂停機坪
  const big=m.k==='t85';ctx.fillStyle='rgba(0,0,0,.35)';ctx.fillRect(px+c*.3,py+c*.3,c*.66,c*.66);
  ctx.fillStyle=big?'#8a8f98':'#6f747c';ctx.fillRect(px+c*.18,py+c*.12,c*.6,c*.66);
  if(big){ctx.fillStyle='#a8adb5';ctx.fillRect(px+c*.3,py+c*.04,c*.36,c*.3);ctx.fillStyle='#c8a050';ctx.fillRect(px+c*.44,py,c*.08,c*.12)}
  ctx.strokeStyle='#e8c040';ctx.lineWidth=Math.max(1,c*.02);ctx.beginPath();ctx.arc(px+c*.48,py+c*.5,c*.12,0,TAU);ctx.stroke();
  ctx.fillStyle='#e8c040';ctx.font='700 '+Math.max(8,c*.14)+'px '+FONT;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('H',px+c*.48,py+c*.5)}
 else if(m.k==='farm'){ // 農地工廠：鐵皮廠房、堆料、貨車
  ctx.fillStyle='#4d5a55';ctx.fillRect(px+c*.06,py+c*.1,c*.7,c*.56);ctx.strokeStyle='rgba(255,255,255,.12)';ctx.lineWidth=1;
  for(let q=1;q<7;q++){ctx.beginPath();ctx.moveTo(px+c*.06+q*c*.1,py+c*.1);ctx.lineTo(px+c*.06+q*c*.1,py+c*.66);ctx.stroke()}
  ctx.fillStyle='#6a5a3a';ctx.fillRect(px+c*.1,py+c*.72,c*.3,c*.18);ctx.fillStyle='#d8d6cc';ctx.fillRect(px+c*.6,py+c*.74,c*.3,c*.12)}
 else if(m.k==='afb'&&(m.w>=m.h?j===0:i===0)){ // 空軍基地跑道：一排格子畫成跑道，兩端跑道頭標線
  const hz2=m.w>=m.h,end0=hz2?i===0:j===0,end1=hz2?i===m.w-1:j===m.h-1;ctx.fillStyle='#2f3236';ctx.fillRect(px,py,c+.6,c+.6);
  ctx.fillStyle='#3e4246';if(hz2)ctx.fillRect(px,py+c*.22,c+.6,c*.56);else ctx.fillRect(px+c*.22,py,c*.56,c+.6);
  ctx.fillStyle='rgba(240,240,232,.7)';
  if(hz2){ctx.fillRect(px+c*.2,py+c*.48,c*.35,Math.max(1,c*.04));if(end0||end1)for(let q=0;q<4;q++)ctx.fillRect(px+(end0?c*.06:c*.82),py+c*(.27+q*.12),c*.12,c*.05)}
  else{ctx.fillRect(px+c*.48,py+c*.2,Math.max(1,c*.04),c*.35);if(end0||end1)for(let q=0;q<4;q++)ctx.fillRect(px+c*(.27+q*.12),py+(end0?c*.06:c*.82),c*.05,c*.12)}}
 else if(m.k==='beach'){ // 海水浴場：沙灘、陽傘、救生台，臨海側有浪花
  ctx.fillStyle='#c8b280';ctx.fillRect(px,py,c+.6,c+.6);
  const cols=['#e05a3a','#3a8ae0','#e8c040'];for(let q=0;q<3;q++){const ux=px+c*(.25+.25*q),uy=py+c*(.3+.2*((q+j)%2));ctx.fillStyle=cols[(q+j)%3];ctx.beginPath();ctx.arc(ux,uy,c*.08,0,TAU);ctx.fill()}
  if(j===1||m.w*m.h===1){ctx.fillStyle='#d8d6cc';ctx.fillRect(px+c*.7,py+c*.62,c*.1,c*.14);ctx.fillStyle='#c8332c';ctx.fillRect(px+c*.68,py+c*.58,c*.14,c*.05)}
  for(let d=0;d<4;d++){const nx=m.x0+i+DIR[d][0],ny=m.y0+j+DIR[d][1];if(nx<0||ny<0||nx>=N||ny>=N||TR[K(nx,ny)]!==1)continue;
   ctx.strokeStyle='rgba(240,245,250,.7)';ctx.lineWidth=Math.max(1,c*.04);ctx.beginPath();
   if(DIR[d][0]){const ex=px+(DIR[d][0]>0?c:0);ctx.moveTo(ex,py);ctx.lineTo(ex,py+c)}else{const ey=py+(DIR[d][1]>0?c:0);ctx.moveTo(px,ey);ctx.lineTo(px+c,ey)}ctx.stroke()}}
 else if(m.k==='mil'||m.k==='arms'||m.k==='afb'){ // 管制區：圍牆與斜線、營舍（或彈藥庫土堆）、車輛
  ctx.fillStyle=m.k==='mil'?'#34402f':'#3e362a';ctx.fillRect(px,py,c+.6,c+.6);
  ctx.save();ctx.beginPath();ctx.rect(px,py,c+.6,c+.6);ctx.clip();
  ctx.strokeStyle='rgba(220,80,60,.25)';ctx.lineWidth=Math.max(1,c*.03);for(let q=-4;q<4;q++){ctx.beginPath();ctx.moveTo(px+q*c*.3,py+c);ctx.lineTo(px+q*c*.3+c,py);ctx.stroke()}
  ctx.restore();
  if(m.n==='陸軍官校'&&(i+j)%2===1){ctx.fillStyle='#4a5a3a';ctx.fillRect(px+c*.08,py+c*.08,c*.84,c*.84);ctx.strokeStyle='#a85a42';ctx.lineWidth=Math.max(2,c*.05);ctx.beginPath();ctx.ellipse(px+c*.5,py+c*.5,c*.34,c*.26,0,0,TAU);ctx.stroke()}
  else if(m.k==='mil'||m.k==='afb'){ctx.fillStyle='#5a6450';for(let q=0;q<3;q++)ctx.fillRect(px+c*.12,py+c*(.14+q*.26),c*.46,c*.16);ctx.fillStyle='#4a5a3a';ctx.fillRect(px+c*.68,py+c*.2,c*.18,c*.1);ctx.fillRect(px+c*.68,py+c*.4,c*.18,c*.1)}
  else{ctx.fillStyle='#5a4e3a';for(let q=0;q<2;q++)for(let r=0;r<2;r++){ctx.beginPath();ctx.ellipse(px+c*(.3+q*.4),py+c*(.3+r*.4),c*.14,c*.1,0,0,TAU);ctx.fill()}}
  ctx.strokeStyle='#c8c4b8';ctx.setLineDash([c*.05,c*.04]);ctx.lineWidth=Math.max(1,c*.025);
  if(i===0){ctx.beginPath();ctx.moveTo(px+1,py);ctx.lineTo(px+1,py+c);ctx.stroke()}if(i===m.w-1){ctx.beginPath();ctx.moveTo(px+c-1,py);ctx.lineTo(px+c-1,py+c);ctx.stroke()}
  if(j===0){ctx.beginPath();ctx.moveTo(px,py+1);ctx.lineTo(px+c,py+1);ctx.stroke()}if(j===m.h-1){ctx.beginPath();ctx.moveTo(px,py+c-1);ctx.lineTo(px+c,py+c-1);ctx.stroke()}ctx.setLineDash([])}
 else if(m.k==='tra'){ // 地下化車站：站前廣場、玻璃天篷（下方為月台）、出入口
  ctx.fillStyle='#4a4842';ctx.fillRect(px+c*.04,py+c*.04,c*.92,c*.92);
  ctx.fillStyle='rgba(150,200,235,.35)';ctx.beginPath();ctx.ellipse(px+c*(first?.7:.3),py+c*.5,c*.42,c*.3,0,0,TAU);ctx.fill();
  ctx.strokeStyle='rgba(220,235,245,.5)';ctx.lineWidth=Math.max(1,c*.02);ctx.stroke();
  ctx.fillStyle='#2a2c30';for(let q=0;q<2;q++)ctx.fillRect(px+c*(.15+q*.55),py+c*.82,c*.14,c*.1);
  ctx.strokeStyle='rgba(255,255,255,.12)';ctx.setLineDash([c*.06,c*.04]);ctx.beginPath();ctx.moveTo(px,py+c*.5);ctx.lineTo(px+c,py+c*.5);ctx.stroke();ctx.setLineDash([])}
 else if(m.k==='hsr'){ // 高架車站：長條站體與月台雨棚
  ctx.fillStyle='#8a8a84';ctx.fillRect(px,py+c*.2,c+.6,c*.6);ctx.fillStyle='#c8732c';ctx.fillRect(px,py+c*.2,c+.6,c*.08);
  ctx.fillStyle='rgba(255,255,255,.18)';for(let q=0;q<5;q++)ctx.fillRect(px+c*(.06+q*.19),py+c*.34,c*.12,c*.32)}
 else if(m.k==='dome'){ // 巨蛋：橢圓屋頂（跨兩格）
  const cx=hz?px+(first?c:0):px+c/2,cy=hz?py+c/2:py+(first?c:0);
  ctx.save();ctx.beginPath();ctx.rect(px,py,c+.6,c+.6);ctx.clip();
  ctx.fillStyle='#8a929c';ctx.beginPath();ctx.ellipse(cx,cy,hz?c*.95:c*.45,hz?c*.45:c*.95,0,0,TAU);ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,.25)';ctx.lineWidth=Math.max(1,c*.02);for(let q=1;q<4;q++){ctx.beginPath();ctx.ellipse(cx,cy,(hz?c*.95:c*.45)*q/4,(hz?c*.45:c*.95)*q/4,0,0,TAU);ctx.stroke()}
  ctx.restore()}
 else if(m.k==='dept'){ // 百貨公司：大量體、屋頂設備、招牌
  ctx.fillStyle='#5a4a56';ctx.fillRect(px+c*.04,py+c*.06,c*.92,c*.88);ctx.fillStyle='#7a6a76';ctx.fillRect(px+c*.12,py+c*.14,c*.76,c*.6);
  ctx.fillStyle='#4a4a4e';for(let q=0;q<3;q++)ctx.fillRect(px+c*(.2+q*.22),py+c*.24,c*.12,c*.12);ctx.fillStyle='#d8b050';ctx.fillRect(px+c*.12,py+c*.8,c*.76,c*.06)}
 else if(m.k==='mart'){ // 量販店：大屋頂、屋頂停車場、賣場招牌
  ctx.fillStyle='#4a5a54';ctx.fillRect(px+c*.04,py+c*.06,c*.92,c*.6);ctx.fillStyle='#e05a3a';ctx.fillRect(px+c*.04,py+c*.06,c*.92,c*.06);
  ctx.fillStyle='#2c2b27';ctx.fillRect(px+c*.04,py+c*.7,c*.92,c*.26);ctx.fillStyle='rgba(255,255,255,.4)';for(let q=0;q<6;q++)ctx.fillRect(px+c*(.08+q*.15),py+c*.72,Math.max(1,c*.01),c*.1)}
 else if(m.k==='edu'){ // 學校：ㄇ字形校舍＋操場跑道
  if(first||m.w*m.h===1){ctx.fillStyle='#6a5a4a';ctx.fillRect(px+c*.08,py+c*.08,c*.84,c*.2);ctx.fillRect(px+c*.08,py+c*.08,c*.2,c*.7);ctx.fillRect(px+c*.72,py+c*.08,c*.2,c*.7);
   ctx.fillStyle='#4a5a3a';ctx.fillRect(px+c*.32,py+c*.34,c*.36,c*.56);
   if(m.w*m.h===1){ctx.strokeStyle='#a85a42';ctx.lineWidth=Math.max(1,c*.03);ctx.strokeRect(px+c*.36,py+c*.42,c*.28,c*.42)}}
  else{ctx.fillStyle='#3d5a32';ctx.fillRect(px+c*.04,py+c*.04,c*.92,c*.92);ctx.strokeStyle='#a85a42';ctx.lineWidth=Math.max(2,c*.06);
   ctx.beginPath();ctx.ellipse(px+c*.5,py+c*.5,c*.36,c*.28,0,0,TAU);ctx.stroke();ctx.fillStyle='rgba(255,255,255,.6)';ctx.fillRect(px+c*.49,py+c*.3,Math.max(1,c*.02),c*.4)}}
}
// 放大後的地標名稱（另一個繪製階段，避免被相鄰格蓋住）
function lmkLabels(c,x0,x1,y0,y1){
 ctx.font='600 11px '+FONT;ctx.textAlign='center';ctx.textBaseline='middle';
 for(const m of LMK){if(m.x0>x1+1||m.x0+m.w<x0-1||m.y0>y1+1||m.y0+m.h<y0-1)continue;
  const lb=m.n+(m.sub?'（'+m.sub+'）':''),tw=ctx.measureText(lb).width+10,lx=(m.x0+m.w/2)*c,ly=m.y0*c+6;
  ctx.fillStyle='rgba(10,10,9,.78)';rr(lx-tw/2,ly-8,tw,16,3);ctx.fill();ctx.fillStyle='#eceae3';ctx.fillText(lb,lx,ly+.5)}}
// 高架高鐵：灰色高架橋面、軌道與橋墩（不論縮放都畫，縮小時只畫一條線）
function drawTHSR(c,x0,x1,y0,y1){
 if(!THSR.length)return;
 ctx.save();
 for(let n=0;n<THSR.length;n++){const [x,y]=THSR[n];if(x<x0-1||x>x1+1||y<y0-1||y>y1+1)continue;
  const nx=THSR[n+1],px=(x+.5)*c,py=(y+.5)*c,qx=nx?(nx[0]+.5)*c:px,qy=nx?(nx[1]+.5)*c:py-c;
  ctx.strokeStyle='rgba(20,20,18,.45)';ctx.lineWidth=Math.max(2,c*.34);ctx.beginPath();ctx.moveTo(px+c*.06,py+c*.06);ctx.lineTo(qx+c*.06,qy+c*.06);ctx.stroke();
  ctx.strokeStyle='#9a9a94';ctx.lineWidth=Math.max(1.5,c*.28);ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(qx,qy);ctx.stroke();
  if(c>=14){ctx.strokeStyle='rgba(60,60,58,.8)';ctx.lineWidth=Math.max(1,c*.02);for(const o of[-.06,.06]){ctx.beginPath();ctx.moveTo(px+o*c,py);ctx.lineTo(qx+o*c,qy);ctx.stroke()}}}
 ctx.restore()}
// 地標專屬案件：抽到的案類若適合某類地標，約三成機率改發生在該地標（地址寫地標名稱）
const LMK_KIND={beach:['drown','heat','faint','sport','mob'],t85:['skyscraper','hifire','lift','ems','faint'],t50:['skyscraper','hifire','lift','ems'],farm:['farmfire','machine','fall','stuck'],tra:['train','crowd','smoke','faint','ems','lonewolf','hazmat'],hsr:['train','crowd','faint','ems','hazmat'],dome:['crowd','mci','heat','faint','sport','ems'],
 dept:['deptfire','lift','crowd','faint','smoke'],mart:['deptfire','lift','faint','choke','carfire'],edu:['sport','faint','hypervent','brawl','kidfever','poolgas']};
function lmkFor(k){const ms=LMK.filter(m=>LMK_KIND[m.k]&&LMK_KIND[m.k].includes(k)&&!S.inc.some(i=>i.lm===m.n+m.x0));return ms.length?pick(ms):null}
function lmkSpawn(k){
 const m=Math.random()<.35&&lmkFor(k);if(!m)return null;
 const cc=pick(m.cells),aa=nbRoad(cc[0],cc[1])||m.cells.map(q=>nbRoad(q[0],q[1])).find(Boolean);if(!aa)return null;
 LMK_NEXT=m;let inc=null;try{inc=makeInc(k,cc,aa,zoneOf(cc[0],cc[1]),true,{ax:aa[0],ay:aa[1]})}finally{LMK_NEXT=null}
 if(!inc)return null;
 inc.lm=m.n+m.x0;
 if(k==='deptfire'&&m.k==='mart')inc.nm='量販店火警';
 if(m.k==='t85'||m.k==='t50'){inc.tfl=m.k==='t85'?[20,24]:[15,17];inc.nm=(KIND[k].n)+'（'+m.n+'）'}   // 戰術畫面的樓層數（模擬範圍）
 if(m.k==='tra'&&k==='smoke')inc.nm='地下車站濃煙';
 return inc}
