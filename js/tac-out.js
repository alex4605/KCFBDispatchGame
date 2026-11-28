// 戰術指揮：室外場景的任務名稱、可執行範圍與露天燃燒的物理
// 露天空間（堆置區、草地、車道、停車格）：沒有屋頂與門窗，煙順風飄散、不會累積成煙層、含氧量不會下降、不會閃燃或爆燃；
// 場內有牆的建物（辦公室、便利商店、民宅、鐵皮屋、貨櫃、隧道、管道）照建物的規則
'use strict';
const tacOpenAir=(B,x)=>{if(!B.out)return false;const n=B.L.N[x.c];return!n.walled&&!n.tube&&!n.pipe&&!n.hole&&!n.xp&&n.kind!=='cont'};
// 室外的任務名稱與說明（格式同 TAC_GRP：可執行｜目標｜效果｜注意）
Object.assign(TAC_OUTN,{
 attack:['滅火攻擊','幫浦組、機器人｜點燃燒中的堆置區、車輛、草地或建物｜帶水線到火點射水，撲滅後自動往最近火點推進｜露天燃燒受風影響：從上風側往下風推進；堆置物深層悶燒要接著殘火處理'],
 trans:['外圍射水','幫浦組（人員在場外道路）｜點臨路的堆置區、車輛或建物｜在場外道路以 2.5 吋瞄子先打一波，壓低火勢與輻射熱，約 10 秒後推進攻擊｜打不到堆置物深處與背面，熄滅還要推進攻擊與殘火處理'],
 sky:['車頂砲塔','幫浦組（人員須在車邊）｜點臨路的堆置區、車輛或建物｜由車頂砲塔大流量遠距射水壓制，約 14 秒後轉滅火攻擊｜占兩條水線、用水量大，沒有消防栓時水很快見底'],
 confine:['阻絕延燒','幫浦組｜點火點旁、特別是下風處的區域或建物｜持續射水濕潤，擋住延燒與飛火｜不會撲滅火點；下風側優先'],
 cover:['周界防護','幫浦組｜點場外鄰接建物那一側，或點要保護的建物｜對受威脅建物外牆射水降溫，擋住輻射熱與飛火｜'],
 guard:['周界防護','幫浦組｜點要保護的建物｜對建物外牆射水降溫，擋住輻射熱與飛火｜'],
 overhaul:['殘火處理','各組（幫浦組較快，機器人除外）｜點有餘燼的區域｜翻開堆置物（塑膠、紙類堆要翻堆）澆熄深層悶燒，完成後往下一處｜深層悶燒要帶水線（用水量約半條）；有餘燼未處理不會結案'],
 force:['破壞進入','各組（機器人除外）｜點道路（場區入口）或有門的建物（辦公室、民宅、鐵皮屋、貨櫃）｜破開上鎖的入口或門｜露天區域沒有門；悶燒缺氧的建物或貨櫃開門容易爆燃'],
 dctrl:['門控進入','各組（機器人除外）｜點道路（場區入口）或有門的建物（辦公室、民宅、鐵皮屋、貨櫃）｜門後有熱或濃煙時反覆開門、短促射水、關門，溫度降到可進入才進去｜露天區域沒有門'],
 vent:['破窗排煙','各組（排煙組較快，機器人除外）｜點有牆的建物（辦公室、民宅、鐵皮屋）｜打破窗戶建立排煙開口｜露天區域的煙會順風飄散，不需排煙'],
 hydro:['水霧排煙','幫浦組｜點有牆的建物｜開窗後以水霧把煙帶出窗外｜露天區域不需排煙'],
 npv:['負壓排煙','排煙組｜點有牆的建物或隧道｜架排風機把煙抽出｜露天區域不需排煙'],
 ppv:['正壓排煙','排煙組、11 幫浦車｜隧道：在洞口架送風機，把煙往另一端推｜一般露天場區不需送風'],
 ladder:['雲梯救援','雲梯組｜點臨路、有受困者的建物｜架梯到窗口搜索並救下受困者｜'],
 master:['高空射水','雲梯組｜點臨路、雲梯車可停靠的區域或建物｜由雲梯頂端高空射水，越過堆置物打進火堆中央｜'],
 gas:['氣體偵測','各組｜點區域｜到點量測約 5 秒（O₂、LEL、CO、H₂S、HCN）｜露天燃燒的毒性煙順風飄：下風處要量']});
// 室外不能做或目標不對的任務（回傳原因；含「請點」的原因只在點錯目標時才顯示）
function tacOutCan(B,q,k,f,c){
 if(!B.out)return'';
 if(k==='roof'||k==='roofres'||k==='vvent')return'室外場景沒有屋頂可以開孔或避難';
 if(k==='stand')return'室外場景沒有連結送水管';
 if(k==='ppv'&&!(B.sc&&(B.sc.k==='tunnel'||B.sc.k==='pit')))return'露天場區的煙會順風飄散，不需正壓送風（隧道、人孔才需要）';
 if(f===undefined||f<0)return'';
 const x=tacCel(B,f,c);
 if(!tacOpenAir(B,x))return'';
 if(k==='vent'||k==='hydro'||k==='npv')return'露天區域的煙會順風飄散，不需排煙；請點有牆的建物';
 if(k==='force'||k==='dctrl')return'露天區域沒有門；請點有門的建物或道路（場區入口）';
 if(k==='ladder')return'雲梯救援請點有受困者的建物';
 return''}
// 人員受熱：露天的熱氣往上散，同樣火勢下人員承受的熱比室內低（以八成計）
const tacHx=(B,x)=>tacOpenAir(B,x)?x.h*.8:x.h;
// 露天空間每秒的煙：順風飄散（風越大散得越快）
const tacOutSmokeOut=B=>.3+.35*(B.wind?B.wind.v:.3);
// 繪製：露天燃燒的煙順風飄走（灰色流動箭頭）
function tacOutSmokeDraw(g,G,B,T){
 if(!B.out||!B.wind)return;const W=B.wind;
 g.save();
 for(const n of B.L.N){const x=tacCel(B,0,n.c);if(!tacOpenAir(B,x)||(x.s<.06&&x.h<.15))continue;
  const c=G.ctr(n.c),L=G.t*(.35+.4*W.v),a=Math.min(.85,.3+x.s*1.5+x.h*.3);
  const x0=c[0]-W.d[0]*L*.2,y0=c[1]-W.d[1]*L*.2,x1=c[0]+W.d[0]*L,y1=c[1]+W.d[1]*L;
  g.strokeStyle='rgba(185,185,192,'+a.toFixed(2)+')';g.lineWidth=2.5;g.setLineDash([6,5]);g.lineDashOffset=-T*20*(.5+W.v);
  g.beginPath();g.moveTo(x0,y0);g.lineTo(x1,y1);g.stroke();g.setLineDash([]);
  const an=Math.atan2(y1-y0,x1-x0);g.fillStyle='rgba(185,185,192,'+a.toFixed(2)+')';g.beginPath();g.moveTo(x1,y1);
  g.lineTo(x1-Math.cos(an-.5)*8,y1-Math.sin(an-.5)*8);g.lineTo(x1-Math.cos(an+.5)*8,y1-Math.sin(an+.5)*8);g.closePath();g.fill()}
 g.restore()}
