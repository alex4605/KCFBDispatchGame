// 戰術指揮：煙層高度（簡化的中性面）
// 每個空間推算煙層下緣高度 lay（0＝煙到地板、1＝無煙；天花板約 3 公尺）：
// 煙越濃、溫度越高煙層越低；上方有排氣口（屋頂開孔、負壓排風、頂樓排煙口）煙層升高；只有破窗或門開著時，
// 煙經開口上半部流出、新鮮空氣從下半部進來，煙層停在開口中段附近（中性面）；正壓送風路徑把煙層推高
'use strict';
const TAC_CEIL=3;
const tacLayV=x=>x.lay===undefined?1:x.lay;
const tacLayM=x=>(tacLayV(x)*TAC_CEIL).toFixed(1);
function tacLayStep(inc,B,dt){
 B.lyT=(B.lyT||0)-dt;if(B.lyT>0)return;const st=.25-B.lyT;B.lyT=.25;
 const W=B.W,ps=B.ppvS;
 for(const x of B.cells){const n=B.L.N[x.c];let tg;
  // 室外開放空間沒有煙層（煙直接飄走）；隧道、管道、貨櫃、有牆的建物照算
  if(B.out&&!n.tube&&!n.pipe&&!n.hole&&!n.walled&&!n.xp&&n.kind!=='cont')tg=1;
  else if(x.s<.03)tg=1;
  else{tg=1-x.s*(.75+.35*x.h);
   const key=x.f*W+x.c,up=x.vv||(B.npvS&&B.npvS.has(key))||(x.ty==='stair'&&x.f===B.F-1&&B.roof);
   if(up)tg=Math.max(tg,.6)+.1;
   else if(x.v)tg=Math.max(tg,.45)+.05;
   else if(n.nb.some(o=>!tacShut(B,x.f,x.c,o)&&B.cells[x.f*W+o].s<x.s-.1))tg=Math.max(tg,.3);
   if(ps&&ps.has(key))tg+=.2}
  tg=Math.max(0,Math.min(1,tg));
  const old=x.lay===undefined?tg:x.lay;x.lay=old+(tg-old)*Math.min(1,st*.6);x.layD=(x.lay-old)/st}
 // 滾燃（Rollover）：煙層快速下降、天花板出現火舌，是閃燃前兆
 for(const x of B.cells){if(x.fl||x.vv||x.lay>=.25||x.h<.55||!(x.layD<-.03)||x.lyW>S.t)continue;
  x.lyW=S.t+90;
  const near=B.sq.some(q=>tacIn(q)&&q.f===x.f&&(q.c===x.c||B.L.N[x.c].nb.includes(q.c))&&!q.down);
  radio(inc,'安全官',tacNm(B,x.f,x.c)+'煙層快速下降到約 '+tacLayM(x)+' 公尺，天花板出現火舌（滾燃）'+(near?'，閃燃前兆！附近小組撤出或射水冷卻煙層！':'，閃燃前兆！'));
  tacEvt(inc,B,'warn','滾燃：'+tacNm(B,x.f,x.c),near)}}
// 低姿前進：煙層低於腰部（約 1.35 公尺）要蹲低或爬行，移動與搜索變慢
const tacLowPost=x=>{const l=tacLayV(x);return l<.2?1.45:l<.45?1.25:1};
// 倒在地上的受困者：煙層還高時吸到的煙氣少，煙層降到地板才快速惡化
const tacLayTox=x=>{const l=tacLayV(x);return l>=.5?.4:l>=.25?.75:1.15};
// 提示框的剖面條：天花板到地板，上方灰色為煙層，標出煙層下緣與腰部高度
function tacLayBar(g,x0,y0,h,x){
 const l=tacLayV(x),w=22;g.fillStyle='#1c2430';g.fillRect(x0,y0,w,h);
 const sh=h*(1-l);g.fillStyle='rgba(120,122,128,'+(.45+.5*Math.min(1,x.s)).toFixed(2)+')';g.fillRect(x0,y0,w,sh);
 if(x.h>.3){g.fillStyle='rgba(255,120,40,'+Math.min(.8,x.h*.7).toFixed(2)+')';g.fillRect(x0,y0,w,Math.max(2,sh*.25))}
 g.strokeStyle='rgba(255,255,255,.35)';g.lineWidth=1;g.strokeRect(x0+.5,y0+.5,w-1,h-1);
 g.strokeStyle='#e9a13b';g.setLineDash([3,2]);g.beginPath();g.moveTo(x0-3,y0+h*(1-.45));g.lineTo(x0+w+3,y0+h*(1-.45));g.stroke();g.setLineDash([]);
 if(l<1){g.strokeStyle='#eceae3';g.beginPath();g.moveTo(x0-3,y0+sh);g.lineTo(x0+w+3,y0+sh);g.stroke()}
 g.fillStyle='#9d9a92';g.font='9px '+FONT;g.textAlign='center';g.textBaseline='bottom';g.fillText('剖面',x0+w/2,y0-1)}
