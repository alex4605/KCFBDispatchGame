// 地標設施（只影響地圖繪製與標示）：高雄車站（地下化）、高鐵左營站與高架高鐵、巨蛋、百貨公司、量販店、學校
// 各佔 1～2 格，放在相關分隊附近、臨一般道路或幹道的空地
'use strict';
let LMK=[];const LMKC=new Map();   // LMKC：格 → {m:地標, i}
let THSR=[];                       // 高架高鐵經過的格（由高鐵站往北到地圖邊緣）
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
 {k:'edu',n:'國小',sub:'',w:1,h:1,near:['小港',-3,-2],col:'#5a6a3a',ic:'🏫'}];
const lmkAt=(x,y)=>LMKC.get(K(x,y));
function placeLandmarks(){
 LMK=[];LMKC.clear();THSR=[];
 const land=(x,y)=>{if(x<1||y<1||x>=N-1||y>=N-1)return false;const k=K(x,y);return!RD[k]&&!HWL[k]&&!HG[k]&&TR[k]===0&&!inFacility(x,y)&&!LMKC.has(k)};
 const road=(x,y)=>{const r=cls(x,y);return r===1||r===2||r===3};
 for(const d of LMK_DEF){const s=SPOT.find(z=>z.n===d.near[0]);if(!s||!s.p)continue;
  const cx=s.p[0]+d.near[1],cy=s.p[1]+d.near[2];let best=null,bd=1e9;
  for(const [W,H] of(d.w===d.h?[[d.w,d.h]]:[[d.w,d.h],[d.h,d.w]]))
   for(let x0=cx-12;x0<=cx+12;x0++)for(let y0=cy-12;y0<=cy+12;y0++){
    const dd=Math.hypot(x0+W/2-cx,y0+H/2-cy);if(dd>=bd)continue;
    let ok=true;for(let i=0;i<W&&ok;i++)for(let j=0;j<H;j++)if(!land(x0+i,y0+j)){ok=false;break}
    if(!ok)continue;
    let rd=0;for(let i=0;i<W;i++){if(road(x0+i,y0-1))rd++;if(road(x0+i,y0+H))rd++}for(let j=0;j<H;j++){if(road(x0-1,y0+j))rd++;if(road(x0+W,y0+j))rd++}
    if(!rd)continue;bd=dd;best={x0,y0,w:W,h:H}}
  if(!best)continue;
  const m=Object.assign({},d,best,{cells:[]});m.p=[best.x0+(best.w-1)/2,best.y0+(best.h-1)/2];
  for(let i=0;i<best.w;i++)for(let j=0;j<best.h;j++){const x=best.x0+i,y=best.y0+j;m.cells.push([x,y]);LMKC.set(K(x,y),{m,i,j})}
  LMK.push(m)}
 // 高架高鐵：由高鐵站往北延伸到地圖邊緣（高架，不影響地面道路）
 const h=LMK.find(m=>m.k==='hsr');
 if(h){let x=h.x0+Math.floor(h.w/2);for(let y=h.y0-1;y>=0;y--){if(y<h.y0-6&&y%9===0&&x>h.x0-6)x--;THSR.push([x,y])}}}
// 放大後的地標俯視圖（一格）
function lmkDetail(L,px,py,c){
 const m=L.m,i=L.i,j=L.j,hz=m.w>=m.h,first=hz?i===0:j===0,last=hz?i===m.w-1:j===m.h-1;
 ctx.fillStyle='#3a3833';ctx.fillRect(px,py,c+.6,c+.6);
 if(m.k==='tra'){ // 地下化車站：站前廣場、玻璃天篷（下方為月台）、出入口
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
