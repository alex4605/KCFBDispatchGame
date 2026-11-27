// 外部支援：環保署化災應變隊（集結需要很長時間；到場後精通化物辨識、止漏與除污）
'use strict';
const EPA_KS=['wastefire','gasstn','schoollab','sewer','chemfire','tanker','chem','poolgas'];
const EPA_K=k=>!!(KIND[k]&&(KIND[k].hz||EPA_KS.includes(k)));
// 應變隊駐地：林園（工業區附近），找不到就用大寮或第一個分隊
function epaBase(){const s=SPOT.find(x=>x.n==='林園')||SPOT.find(x=>x.n==='大寮')||SPOT[0];return s?s.p.slice():[N-2,N-2]}
function epaCall(inc,ai){
 if(inc.epa)return;
 inc.epa=1;inc.epaT=300+Math.random()*180;inc.epaB=epaBase();
 radio(inc,'受理',(ai?'（AI 代理）':'')+'已通報環保署化災應變隊，隊員集結中，預估 '+Math.ceil(inc.epaT/60)+' 分鐘後出發。')}
// 狀態：1 集結中 → 2 前往現場 → 3 到場
function epaStep(inc,dt){
 if(!inc.epa||inc.epa===3)return;
 inc.epaT-=dt;if(inc.epaT>0)return;
 if(inc.epa===1){inc.epa=2;const d=Math.hypot(inc.x-inc.epaB[0],inc.y-inc.epaB[1]);inc.epaT0=inc.epaT=40+d*2.2;
  radio(inc,'化災隊','環保署化災應變隊集結完成，偵檢車與除污車出發，預估 '+Math.ceil(inc.epaT)+' 秒到場。')}
 else{inc.epa=3;radio(inc,'化災隊','環保署化災應變隊到場，可協助化物辨識、止漏與除污。')}}
// 地圖上的位置：集結中在駐地，前往中沿直線移動
function epaPos(inc){const k=inc.epa===2?Math.max(0,1-inc.epaT/inc.epaT0):inc.epa===3?1:0;
 return[inc.epaB[0]+(inc.x-inc.epaB[0])*k,inc.epaB[1]+(inc.y-inc.epaB[1])*k]}
// 大地圖標示：駐地集結（脈動圈與倒數）、前往中的車隊（虛線指向案件）、到場（案件旁標記）
function epaDraw(ctx,c){
 for(const inc of S.inc){if(!inc.epa)continue;
  const p=epaPos(inc),x=(p[0]+.5)*c,y=(p[1]+.5)*c,s=Math.max(8,c*.62);
  if(inc.epa===2){ctx.strokeStyle='rgba(175,169,236,.6)';ctx.lineWidth=Math.max(1,c*.06);ctx.setLineDash([4,4]);
   ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo((inc.x+.5)*c,(inc.y+.5)*c);ctx.stroke();ctx.setLineDash([])}
  if(inc.epa===1){const pl=.5+.5*Math.sin(S.t*3);ctx.strokeStyle='rgba(175,169,236,'+(.3+.5*pl).toFixed(2)+')';ctx.lineWidth=2;
   ctx.beginPath();ctx.arc(x,y,s*(.9+.3*pl),0,TAU);ctx.stroke()}
  const ox=inc.epa===3?c*.75:0,oy=inc.epa===3?-c*.75:0;
  ctx.fillStyle='#7f77dd';rr(x+ox-s/2,y+oy-s/2,s,s,3);ctx.fill();ctx.strokeStyle='rgba(255,255,255,.4)';ctx.lineWidth=1;ctx.stroke();
  if(c>=10){ctx.fillStyle='#fff';ctx.font='600 '+(s*.55)+'px '+FONT;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('環',x+ox,y+oy)}
  if(c>=18&&inc.epa<3){const lb=inc.epa===1?'化災隊集結 '+fmt(inc.epaT):'化災隊 '+Math.ceil(inc.epaT)+' 秒';
   ctx.font='500 '+Math.max(10,c*.26)+'px '+FONT;const tw=ctx.measureText(lb).width+8;
   ctx.fillStyle='rgba(0,0,0,.8)';rr(x-tw/2,y+s*.62,tw,c*.34,3);ctx.fill();ctx.fillStyle='#d8d4f6';ctx.fillText(lb,x,y+s*.62+c*.17)}}}
