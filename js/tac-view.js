// 戰術畫面：樓層平面（俯視）繪製、樓層選擇列、小組卡片、指令列、鍵盤與滑鼠輸入
'use strict';
const tcv=document.getElementById('tcv'),tctx=tcv.getContext('2d');
let tW=800,tH=500,tTopH='',tSideH='',tBotH='';
// 指令列：依類別分組；[代碼, 名稱, 快捷鍵, 說明]
// 說明格式：誰能做｜點哪裡｜做什麼、效果｜注意事項（提示框分行顯示）
const tacDesc=d=>{const p=d.split('｜');return p.length<3?d:['可執行：'+p[0],'目標：'+p[1],p[2]].concat(p[3]?['注意：'+p[3]]:[]).join('\n')};
const TAC_GRP=[
 ['水線',[['attack','入室攻擊','A','幫浦組｜點房間｜帶水線進入火點射水，撲滅後自動往同層最近火點推進｜水帶長度有限，太遠請移車或送水口加壓'],
  ['sky','車頂砲塔','','幫浦組｜點 1F～3F 面向道路的房間｜由車頂砲塔（朝天瞄）從車旁經窗口大流量射水，快速降溫壓制，之後自動轉入室攻擊｜占兩條水線；室內有小組時會把熱煙蒸汽壓回去'],
  ['trans','過渡射水','E','幫浦組｜點 1F、2F 有窗的房間｜先站在窗外射水降溫，再自動轉入室攻擊｜窗戶須面向可站位的道路'],
  ['cover','周界防護','H','幫浦組｜點鄰棟那一側｜車停在相鄰道路，對鄰棟外牆射水，防止延燒過去｜只針對鄰接的建築物（室外場景點要保護的建物）'],
  ['confine','侷限火勢','F','幫浦組｜點火點旁的房間｜對本室與相鄰房間射水降溫、濕潤，擋住延燒｜不會撲滅火點，需另派入室攻擊'],
  ['overhaul','殘火處理','Q','各組｜點有餘燼的房間｜翻開夾層與家具，澆熄餘燼避免復燃｜有餘燼未處理不會結案']]],
 ['進入',[['force','破壞進入','B','各組｜點道路（入口）、點門或點房間｜破開上鎖的入口、指定的門或本室房門｜快，但門的開關不受控制，悶燒缺氧的空間容易爆燃'],
  ['dctrl','門控進入','K','各組｜點道路（入口）、點門或點房間｜控制門的開度慢慢開門（上鎖會先破壞）；點房間則把通往火點的門關上並守住，阻斷進氣｜較慢，但悶燒空間不易爆燃、受傷較輕']]],
 ['搜救',[['search','初期搜索','S','救助組與各組｜點房間｜快速掃過可能有人的地方｜濃煙中可能漏人'],
  ['search2','次級搜索','D','救助組與各組｜點已初搜的房間｜徹底翻找，找出初搜遺漏的人｜較慢'],
  ['gas','氣體偵測','Y','各組｜點空間｜以五用氣體偵測器量測 O₂、LEL、CO、H₂S、HCN｜結果顯示在空間參數'],
  ['roofres','屋頂救援','U','各組（雲梯組直接架梯）｜立即執行｜上屋頂把避難民眾帶下樓｜屋頂超出雲梯高度時只能走樓梯']]],
 ['排煙',[['vent','破窗排煙','V','排煙組、雲梯組｜點有窗的房間｜打破窗戶建立排煙開口｜火點還沒有水線就開口會助燃；悶燒缺氧時可能爆燃'],
  ['hydro','水霧排煙','W','幫浦組｜點有窗的房間｜開窗後以水霧把煙帶出窗外，提升能見度｜需要水線'],
  ['ppv','正壓排煙','P','排煙組、11 幫浦車｜點道路（入口）｜在入口架送風機，沿送風路徑把煙推向開口｜要先有出風口；火點未壓制時送風會助燃'],
  ['npv','負壓排煙','N','排煙組｜點有窗的房間｜在窗口架排風機把煙抽出｜不會灌空氣助長火勢'],
  ['vvent','垂直排煙','J','各組（雲梯組較快）｜點頂樓房間｜在正上方屋頂開孔，排出熱煙、避免閃燃｜火點未壓制時開孔會助燃'],
  ['roof','屋頂排煙','O','各組｜立即執行｜開啟頂樓樓梯間的排煙口，樓梯間的煙往上排出｜']]],
 ['野火',[['beat','撲打','','各組｜點草地火線｜以打火拍、背負式水袋撲打低矮火線｜火勢猛烈時無法靠近'],
  ['brk','防火線','','各組｜點還沒燒到的草地｜清除可燃物開設防火線，阻斷延燒｜要在火頭前方預先開設']]],
 ['化災',[['ident','化物辨識','I','化災組、化災應變隊｜點洩漏處｜偵檢辨識化學品並劃設危害區｜辨識前請著適當防護'],
  ['plug','止漏','Z','化災組、化災應變隊（最快）｜點洩漏源｜止漏；加油站為關閉緊急遮斷閥｜'],
  ['ppeF','消防衣','','各組｜立即執行｜換回消防衣帽鞋｜耐火，但不防化學品'],
  ['ppeC','C級','','各組｜立即執行｜濾毒罐與防濺衣，不耗氣｜不耐火，不能進濃煙、缺氧或高濃度區'],
  ['ppeB','B級','','各組｜立即執行｜空氣呼吸器＋防濺衣｜每輛化災車 2 套'],
  ['ppeA','A級','','各組｜立即執行｜氣密全身防護｜每輛化災車 1 套']]],
 ['雲梯',[['ladder','雲梯救援','L','雲梯組｜點有窗的房間｜架雲梯到窗口搜索並救下受困者｜車要停在窗戶那一側、在可達樓層內'],
  ['master','雲梯射水','M','雲梯組｜點有窗的房間｜從窗外以雲梯瞄子射水｜室內有小組時會把熱煙壓回去']]],
 ['調度',[['move','移動','G','各組｜點空間｜移到指定位置待命｜'],['rit','RIT','R','各組｜立即執行｜在入口待命，MAYDAY 時入室救援｜人員入室前應先編成（2 進 2 出）'],
  ['exit','撤出','X','各組｜立即執行｜撤出建物｜'],['truck','移車','T','幫浦組、雲梯組｜點道路｜把車移到另一側道路（約 12 秒）｜人員在室內時不能移車'],
  ['hyd','佔據水源','','幫浦組｜立即執行｜移到消防栓那一側接栓佔水，水線改由消防栓持續供水｜沒有佔水只能用車上水箱'],
  ['stand','送水口加壓','C','幫浦組｜立即執行｜接連結送水管送水口，各樓層出水口可接線｜五層以上建物才有']]]];
// 指令的 Emoji
const TAC_EMO={hyd:'🚰',cover:'🛡️',attack:'🔥',sky:'⛲',trans:'💦',guard:'🛡️',confine:'💧',overhaul:'🧯',force:'🪓',dctrl:'🚪',search:'🔦',search2:'🔍',gas:'📟',
 vent:'🪟',hydro:'🌫️',ppv:'🌀',npv:'💨',vvent:'⬆️',roof:'🏠',beat:'🧹',brk:'⛏️',ident:'🧪',plug:'🔩',ppeF:'🧥',ppeC:'😷',ppeB:'🥽',ppeA:'🦺',
 ladder:'🪜',master:'🚿',move:'➡️',rit:'🆘',exit:'↩️',truck:'🚒',stand:'🔌',roofres:'🚁',decon:'🚿'};
const TAC_ORD=TAC_GRP.flatMap(g=>g[1]);
const TAC_KEYS={};for(const o of TAC_ORD)if(o[2])TAC_KEYS[o[2].toLowerCase()]=o[0];
// 小組編號轉數值雜湊（支援義消、化災應變隊等字串識別碼，避免三角函數運算出現 NaN）
function tacUidN(u){if(typeof u==='number')return u;let h=0;const s=String(u);for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;return h&1023}
// 預繪火焰光暈離屏畫布，避免每幀為每個火焰點重複建立 createRadialGradient
let _tacGlow=null;
function tacFlameGlow(g,fx,fy,rad,alpha){
 if(!_tacGlow){const cv=document.createElement('canvas');cv.width=cv.height=64;const c=cv.getContext('2d');
  const gr=c.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(255,230,120,.95)');gr.addColorStop(.45,'rgba(255,140,40,.85)');gr.addColorStop(1,'rgba(255,80,20,0)');
  c.fillStyle=gr;c.fillRect(0,0,64,64);_tacGlow=cv}
 if(alpha!==undefined&&alpha<1){g.save();g.globalAlpha=alpha;g.drawImage(_tacGlow,fx-rad,fy-rad,rad*2,rad*2);g.restore()}
 else g.drawImage(_tacGlow,fx-rad,fy-rad,rad*2,rad*2)}
// 需要再點選目標的指令
const TAC_NEEDT={cover:1,sky:1,beat:1,brk:1,ident:1,plug:1,gas:1,attack:1,trans:1,guard:1,confine:1,overhaul:1,force:1,dctrl:1,search:1,search2:1,vent:1,hydro:1,npv:1,vvent:1,ladder:1,master:1,move:1,truck:1};
function sizeTac(){
 const mid=tcv.parentElement,r=mid.getBoundingClientRect(),sd=document.getElementById('tacSide');
 const col=getComputedStyle(mid).flexDirection==='column';
 tW=Math.max(300,Math.floor(r.width-(col?12:sd.offsetWidth+18)));tH=Math.max(240,Math.floor(r.height-(col?sd.offsetHeight+18:12)));
 tcv.style.width=tW+'px';tcv.style.height=tH+'px';
 tcv.width=Math.round(tW*dpr);tcv.height=Math.round(tH*dpr);tctx.setTransform(dpr,0,0,dpr,0,0)}
function tacOpen(inc){
 if(!tacHas(inc)){msg='此案類沒有戰術指揮';return}
 if(!inc.rev){msg='首車到場回報後才能進入戰術指揮';return}
 if(inc.wrap){msg='現場已在收整，無法進入戰術指揮';return}
 if(!inc.tac)tacInit(inc);
 TAC.open=true;TAC.id=inc.id;TAC.B=inc.tac;TAC.vf=inc.tac.of;TAC.sq=null;TAC.ms=[];TAC.ord=null;stratT=0;inc.tac.played=1;
 document.getElementById('tac').hidden=false;tTopH=tSideH=tBotH='';
 tacUI();sizeTac()}
// 底部面板或視窗大小改變時，重算畫布大小
if(window.ResizeObserver)new ResizeObserver(()=>{if(TAC.open)sizeTac()}).observe(document.getElementById('tacMid'));
function tacClose(why){
 const inc=S.inc.find(i=>i.id===TAC.id);
 if(inc&&inc.tac&&!why)radio(inc,'受理','指揮中心退出戰術畫面，現場戰術交由 AI 指揮官。');
 TAC.open=false;TAC.id=null;TAC.sq=null;TAC.ord=null;
 document.getElementById('tac').hidden=true;
 if(why)msg=why;
 size();dirty()}
// 版面：左側樓層選擇列；建物平面置中，四周依現場地圖畫出道路、鄰棟或水域
function tacGeo(B){
 const L=B.L,sx=8,sw=146,top=28,ax=sx+sw+16,ay=top,aw=tW-ax-8,ah=tH-ay-6,m={};
 for(const s of TAC_SIDES)m[s]=B.sd[s].road?84:30; // 道路：外側兩排車位、內側一條人員待命通道
 const t=Math.max(34,Math.min(170,(aw-m.w-m.e-20)/L.GW,(ah-m.n-m.s-20)/L.GH));
 const bw=t*L.GW,bh=t*L.GH;
 const bx=ax+m.w+10+Math.max(0,(aw-m.w-m.e-20-bw)/2),by=ay+m.n+10+Math.max(0,(ah-m.n-m.s-20-bh)/2);
 const band={n:[ax,by-10-m.n,aw,m.n],s:[ax,by+bh+10,aw,m.s],w:[bx-10-m.w,ay,m.w,ah],e:[bx+bw+10,ay,m.e,ah]};
 const sh=Math.max(16,Math.min(50,(tH-top-30)/(B.F+1)));
 return{t,bx,by,bw,bh,band,sx,sw,sh,L,
  r:c=>{const n=L.N[c];return[bx+n.gx*t,by+n.gy*t,n.gw*t,n.gh*t]},
  ctr:c=>{const n=L.N[c];return[bx+(n.gx+n.gw/2)*t,by+(n.cy!==undefined?n.cy:n.gy+n.gh/2)*t]},
  fy:f=>top+(B.F-f)*sh}}
// 入口門的位置（依格局）
function tacDoor(G,s){const d=G.L.door[s]||[0,0];return[G.bx+d[0]*G.t,G.by+d[1]*G.t]}
// 某個入口的位置（店面鐵捲門、車道入口有自己的位置）
function tacEDoor(G,e){if(!e.pt)return tacDoor(G,e.side);return[G.bx+e.pt[0]*G.t,G.by+e.pt[1]*G.t]}
// 屋外人員在某側的站位（沿外牆排開）
function tacStage(G,s,i){
 const d=tacDoor(G,s),a=34+(i%8)*36,b=0;
 return s==='n'?[d[0]+a,G.by-22-b]:s==='s'?[d[0]+a,G.by+G.bh+22+b]:s==='w'?[G.bx-22-b,d[1]+a-G.t*.9]:[G.bx+G.bw+22+b,d[1]+a-G.t*.9]}
// ===== 車輛停放（繪製） =====
// 依模擬端的停放模型（tacParkModel，以公尺計）換算到畫面：每側道路段的長度對應該側可停長度
function tacParkPlan(inc,B,G){
 const P=B.park||(B.park=tacParkModel(inc,B)),bd=G.band,cars=[],off=[],edge={};
 const seg={n:[bd.w[0]+bd.w[2],bd.e[0]],s:[bd.w[0]+bd.w[2],bd.e[0]],w:[bd.n[1]+bd.n[3],bd.s[1]],e:[bd.n[1]+bd.n[3],bd.s[1]]};
 const rowC=(s,r)=>{const b=bd[s];return s==='n'?b[1]+14+r*24:s==='s'?b[1]+b[3]-14-r*24:s==='w'?b[0]+14+r*24:b[0]+b[2]-14-r*24};
 for(const s of TAC_SIDES)edge[s]=s==='n'?[seg.n[1]-30,rowC('n',0)]:s==='s'?[seg.s[1]-30,rowC('s',0)]:s==='w'?[rowC('w',0),seg.w[1]-14]:[rowC('e',0),seg.e[1]-14];
 for(const u of onScene(inc)){if(u.st!=='work')continue;const sl=P.slots[u.id];if(!sl)continue;
  if(sl.off){off.push({u,s:sl.s});continue}
  const s=sl.s,[A,Z]=seg[s],ppm=(Z-A)/P.front[s],hz=s==='n'||s==='s',m=(A+Z)/2+sl.o*ppm,cc=rowC(s,sl.row);
  cars.push({u,s,ghost:sl.ghost,len:Math.max(22,sl.len*Math.min(ppm,9)),vert:!hz,x:hz?m:cc,y:hz?cc:m,hp:hz?[m,cc]:[cc,m]})}
 return{cars,off,edge}}
// 建物四角的路口：放站點帳篷（車輛不會停在那裡）；抵達側兩角優先
function tacCorners(G,side){
 const B4=G.band,rc=(v,h)=>[B4[v][0],B4[h][1],B4[v][2],B4[h][3]];
 const all={nw:rc('w','n'),ne:rc('e','n'),sw:rc('w','s'),se:rc('e','s')};
 const ord={n:['nw','ne','sw','se'],s:['sw','se','nw','ne'],e:['ne','se','nw','sw'],w:['nw','sw','ne','se']}[side];
 return ord.map(k=>all[k])}
// 家具：依房間用途畫，固定種子讓每次畫的位置一樣
// 挑空與電扶梯：中央開口（看得到下層）＋兩道交錯的電扶梯
function tacAtr(g,r,top){
 const[x,y,w,h]=r,p=Math.min(w,h)*.14;
 g.fillStyle='rgba(0,0,0,.45)';g.fillRect(x+p,y+p,w-2*p,h-2*p);
 g.strokeStyle='rgba(200,200,190,.5)';g.lineWidth=1.5;g.setLineDash([4,3]);g.strokeRect(x+p,y+p,w-2*p,h-2*p);g.setLineDash([]);
 for(let k=0;k<2;k++){const ex=x+w*(.32+k*.22),ew=w*.12;g.fillStyle='#3d3a35';g.fillRect(ex,y+h*.22,ew,h*.56);
  g.strokeStyle='rgba(220,215,200,.35)';g.lineWidth=1;for(let yy=y+h*.25;yy<y+h*.76;yy+=5){g.beginPath();g.moveTo(ex+1,yy);g.lineTo(ex+ew-1,yy);g.stroke()}
  g.fillStyle='rgba(236,234,227,.6)';g.font='10px '+FONT;g.textAlign='center';g.textBaseline='middle';g.fillText(k?'▼':'▲',ex+ew/2,y+h*.17)}
 g.fillStyle='rgba(236,234,227,.55)';g.font='600 10px '+FONT;g.textAlign='center';g.textBaseline='bottom';g.fillText(top?'挑空（頂層）':'挑空・電扶梯',x+w/2,y+h-3)}
function tacFurn(g,r,kind,seed,dark){
 let sd=seed*9301+49297;const rnd=()=>((sd=(sd*9301+49297)%233280)/233280);
 const[x,y,w,h]=r,u=Math.min(w,h),p=u*.1;
 const fc=dark?'#1e1b18':'#4a443c',lc=dark?'#26221e':'#5e574d';
 const box=(a,b,c,d,col)=>{g.fillStyle=col||fc;g.fillRect(a,b,c,d);g.strokeStyle=lc;g.lineWidth=1;g.strokeRect(a,b,c,d)};
 if(kind==='bed'){const bw=u*.36,bh=u*.52,bx=rnd()<.5?x+p:x+w-p-bw;box(bx,y+p,bw,bh);g.fillStyle=dark?fc:'#7b7468';g.fillRect(bx+bw*.1,y+p+bh*.05,bw*.8,bh*.16);box(bx+(bx<x+w/2?bw+p*.5:-p*1.8),y+p,p*1.3,p*1.3);
  if(w>u*1.3)box(x+w-p-u*.5,y+h-p-u*.18,u*.5,u*.18)}
 else if(kind==='living'){box(x+p,y+h-p-u*.2,w*.5,u*.2);box(x+p,y+h-p-u*.55,u*.2,u*.35);box(x+w*.3,y+h*.45,w*.22,h*.15);box(x+w-p-u*.08,y+h*.3,u*.08,h*.35)}
 else if(kind==='kitchen'){box(x+p,y+p,w-2*p,u*.16);box(x+p,y+p,u*.16,h*.6);g.fillStyle=fc;g.beginPath();g.arc(x+w*.6,y+h*.62,u*.14,0,TAU);g.fill();
  for(let k=0;k<3;k++){const a=k*2.1+.4;g.beginPath();g.arc(x+w*.6+Math.cos(a)*u*.22,y+h*.62+Math.sin(a)*u*.22,u*.04,0,TAU);g.fill()}}
 else if(kind==='bath'){box(x+p,y+p,w*.55,h*.3,dark?fc:'#55606a');g.fillStyle=dark?fc:'#6b7680';g.beginPath();g.ellipse(x+w-p-u*.1,y+h-p-u*.13,u*.08,u*.12,0,0,TAU);g.fill()}
 else if(kind==='store'||kind==='ware'||kind==='dock'){for(let k=0;k<(kind==='ware'?14:6);k++){const s2=u*(.12+rnd()*.1);box(x+p+rnd()*(w-2*p-s2),y+p+rnd()*(h-2*p-s2),s2,s2)}}
 else if(kind==='office'){const nx=Math.max(1,Math.floor(w/(u*.45))),ny=Math.max(1,Math.floor(h/(u*.45)));
  for(let i=0;i<nx;i++)for(let j=0;j<ny;j++){const dx=x+p+i*(w-2*p)/nx,dy=y+p+j*(h-2*p)/ny;box(dx,dy,(w-2*p)/nx*.6,(h-2*p)/ny*.35);
   g.fillStyle=fc;g.beginPath();g.arc(dx+(w-2*p)/nx*.3,dy+(h-2*p)/ny*.55,u*.04,0,TAU);g.fill()}}
 else if(kind==='ward'){const n2=Math.max(2,Math.min(4,Math.floor(w/(u*.3))));
  for(let i=0;i<n2;i++){const bx=x+p+i*(w-2*p)/n2;box(bx,y+p,(w-2*p)/n2*.6,h*.32);g.fillStyle=dark?fc:'#7b7468';g.fillRect(bx+2,y+p+2,(w-2*p)/n2*.6-4,h*.06)}
  g.strokeStyle=lc;g.setLineDash([3,3]);g.beginPath();g.moveTo(x+p,y+h*.45);g.lineTo(x+w-p,y+h*.45);g.stroke();g.setLineDash([])}
 else if(kind==='shelf'){const n2=Math.max(2,Math.floor(h/(u*.28)));for(let i=0;i<n2;i++)box(x+w*.12,y+p+i*(h-2*p)/n2,w*.76,u*.07)}
 else if(kind==='care')tacFurn(g,r,'ward',seed,dark);
 else if(kind==='clinic'||kind==='act')tacFurn(g,r,'office',seed,dark);
 else if(kind==='food')tacFurn(g,r,'stall',seed,dark);
 else if(kind==='shrine'){box(x+w*.15,y+p,w*.7,u*.2,dark?fc:'#6a3a2a');g.fillStyle=dark?fc:'#c9a040';g.fillRect(x+w*.45,y+p+u*.03,w*.1,u*.12);box(x+w*.3,y+h*.45,w*.4,u*.16);box(x+p,y+h-p-u*.18,w*.35,u*.18)}
 else if(kind==='rack')tacFurn(g,r,'shelf',seed,dark);
 else if(kind==='bunk'){const n2=Math.max(2,Math.floor(w/(u*.32)));for(let i=0;i<n2;i++){const bx=x+p+i*(w-2*p)/n2,bw=(w-2*p)/n2*.7;
  box(bx,y+p,bw,h*.36);box(bx,y+h-p-h*.36,bw,h*.36);g.strokeStyle=lc;g.beginPath();g.moveTo(bx,y+p+h*.18);g.lineTo(bx+bw,y+p+h*.18);g.stroke()}}
 else if(kind==='stall'){const nx=Math.max(2,Math.floor(w/(u*.35))),ny=Math.max(1,Math.floor(h/(u*.55)));
  for(let i=0;i<nx;i++)for(let j=0;j<ny;j++){const sx=x+p+i*(w-2*p)/nx,sy=y+p+j*(h-2*p)/ny;box(sx,sy,(w-2*p)/nx*.8,(h-2*p)/ny*.45,dark?fc:['#5a4a3c','#4a5a46','#5a4048'][(i+j)%3])}}
 else if(kind==='park'){ // 停車格與車輛
  const n2=Math.max(2,Math.floor(w/(u*.34)));g.strokeStyle=dark?lc:'rgba(233,200,90,.35)';g.lineWidth=1;
  for(let i=0;i<=n2;i++){const px=x+p+i*(w-2*p)/n2;g.beginPath();g.moveTo(px,y+p);g.lineTo(px,y+p+h*.38);g.stroke()}
  for(let i=0;i<n2;i++)if(rnd()<.75){const px=x+p+i*(w-2*p)/n2,cw=(w-2*p)/n2;g.fillStyle=dark?fc:['#5a6470','#6e5a4a','#4a5a50','#707070'][Math.floor(rnd()*4)];scRR(g,px+cw*.18,y+p+2,cw*.64,h*.34,3);g.fill()}}
 else if(kind==='mech'){box(x+p,y+p,w*.4,h*.45,dark?fc:'#4f555c');box(x+w*.55,y+p,w*.3,h*.3,dark?fc:'#4f555c');g.strokeStyle=lc;g.lineWidth=2;g.beginPath();g.moveTo(x+p,y+h*.75);g.lineTo(x+w-p,y+h*.75);g.stroke()}
 else if(kind==='shop'){box(x+p,y+h*.62,w*.55,u*.12);const n2=Math.max(1,Math.floor(w/(u*.5)));for(let i=0;i<n2;i++)box(x+p+i*(w-2*p)/n2,y+p,(w-2*p)/n2*.7,u*.1)}
 else if(kind==='lobby'){box(x+w*.35,y+h*.4,w*.3,u*.14);for(let k=0;k<2;k++)box(x+p+k*w*.6,y+h-p-u*.18,w*.25,u*.14)}
 else if(kind==='nurse'){box(x+p,y+h*.45,w-2*p,u*.14);box(x+p,y+p,u*.18,h*.3)}
 else if(kind==='machine'){box(x+w*.12,y+h*.2,w*.45,h*.4,dark?fc:'#4f555c');g.strokeStyle=lc;g.lineWidth=2;
  for(let k=0;k<2;k++){g.beginPath();g.arc(x+w*.25+k*w*.2,y+h*.4,u*.07,0,TAU);g.stroke()}
  g.lineWidth=1;g.beginPath();g.moveTo(x+w*.1,y+h*.78);g.lineTo(x+w*.9,y+h*.78);g.moveTo(x+w*.1,y+h*.84);g.lineTo(x+w*.9,y+h*.84);g.stroke()}}
// 窗戶在某側的外牆位置
function tacWinPt(G,c,s){const r=G.r(c);
 return s==='n'?[r[0]+r[2]/2,r[1]]:s==='s'?[r[0]+r[2]/2,r[1]+r[3]]:s==='e'?[r[0]+r[2],r[1]+r[3]/2]:[r[0],r[1]+r[3]/2]}
function tacSqPos(B,G,q,i){
 const vf=TAC.vf;
 const at=(f,c)=>{
  if(f<0){if(q.ty==='ladder')return null;
   if(q.task==='trans'&&q.side===q.ws&&q.lf===vf&&q.lc!==undefined){const w=tacWinPt(G,q.lc,q.ws),dv=TAC_SDV[q.ws];
    return[w[0]+dv[0]*26+(dv[1]?(i-1)*16:0),w[1]+dv[1]*26+(dv[0]?(i-1)*16:0)]}
   // 屋外待命：站在自己的車旁（面向建物）；車在畫面外就站在該側道路末端
   const tp=TAC.tp&&TAC.tp[q.u];
   if(tp&&(q.task==='idle'||q.task==='hold'||q.task==='sky')&&!q.prev&&!q.refill){const s=q.tside||q.side,hz=s==='n'||s==='s';
    const lane=s==='n'?G.by-22:s==='s'?G.by+G.bh+22:s==='w'?G.bx-22:G.bx+G.bw+22,o=((i%3)-1)*12;
    return hz?[tp[0]+o,lane]:[lane,tp[1]+o]}
   return tacStage(G,q.side,i)}
  if(f!==vf)return null;
  const p=G.ctr(c),n=B.L.N[c],o=G.t*.2;
  return[p[0]+((i%3)-1)*o,p[1]+(Math.floor(i/3)%2?o:-o*.3)+(n.ty==='stair'?-G.t*.2:0)]};
 const p=at(q.f,q.c);
 if(!q.mt||(q.nf===q.f&&q.nc===q.c))return p;
 const n=at(q.nf,q.nc),k0=Math.min(1,q.mt/tacStepTime(B,q,[q.nf,q.nc])),k=k0*k0*(3-2*k0);   // 緩起緩停
 if(p&&n)return[p[0]+(n[0]-p[0])*k,p[1]+(n[1]-p[1])*k];
 return p||n}
// 地板材質：木地板（臥室、客廳、辦公、病房）、磁磚（廚房、浴室）、水泥（倉庫、廠區、走廊、賣場）
function tacFloorPat(g,r,n,kd){
 const k=n.ty==='hall'?'hall':n.ty==='stair'?'':kd||n.kind;if(!k)return;
 g.save();g.beginPath();g.rect(r[0],r[1],r[2],r[3]);g.clip();g.lineWidth=1;
 if(k==='bed'||k==='living'||k==='office'||k==='ward'||k==='shop'||k==='care'||k==='bunk'||k==='shrine'||k==='clinic'||k==='act'){g.strokeStyle='rgba(120,90,60,.22)';const hz=r[2]>=r[3];
  for(let a=7;a<(hz?r[3]:r[2]);a+=7){g.beginPath();if(hz){g.moveTo(r[0],r[1]+a);g.lineTo(r[0]+r[2],r[1]+a)}else{g.moveTo(r[0]+a,r[1]);g.lineTo(r[0]+a,r[1]+r[3])}g.stroke()}}
 else if(k==='kitchen'||k==='bath'||k==='lobby'||k==='nurse'){g.strokeStyle='rgba(200,210,220,.12)';
  for(let a=10;a<r[2];a+=10){g.beginPath();g.moveTo(r[0]+a,r[1]);g.lineTo(r[0]+a,r[1]+r[3]);g.stroke()}
  for(let a=10;a<r[3];a+=10){g.beginPath();g.moveTo(r[0],r[1]+a);g.lineTo(r[0]+r[2],r[1]+a);g.stroke()}}
 else{g.fillStyle='rgba(255,255,255,.04)';for(let k2=0;k2<18;k2++){const a=(n.c*31+k2*17)%97/97,b=(n.c*13+k2*29)%89/89;g.fillRect(r[0]+a*r[2],r[1]+b*r[3],2,2)}}
 g.restore()}
// 俯視車輛：50×20、車頭朝右；依車種畫車頂設備
function tacVeh(g,u,T){
 const c=u.code;
 g.fillStyle='rgba(0,0,0,.35)';scRR(g,1.5,2,50,20,3);g.fill(); // 陰影
 // 消防車一律消防紅，救護車白色、警車白色；車種靠車頂設備區分
 const body=u.trainee?(c==='91'?'#d8d6cc':'#9a4a40'):c==='91'||c==='警'?'#f2f2ee':'#c8332c';   // 訓練中心的除役車：褪色
 g.fillStyle=body;scRR(g,0,0,50,20,3);g.fill();
 // 駕駛艙與擋風玻璃
 g.fillStyle=c==='91'||c==='警'?'#d8d8d2':'rgba(0,0,0,.18)';g.fillRect(38,1,11,18);
 g.fillStyle='#22303c';g.fillRect(45,3,3,14);
 // 警示燈條（閃爍）
 const on=(T*3+u.id)%1<.5;g.fillStyle=on?'#ff4a3a':'#4a8aff';g.fillRect(39,2,3,7);g.fillStyle=on?'#4a8aff':'#ff4a3a';g.fillRect(39,11,3,7);
 if(c==='21'||c==='31'){ // 雲梯：梯架與後方轉台
  g.strokeStyle='#d8d4c8';g.lineWidth=1.2;g.beginPath();g.moveTo(4,6);g.lineTo(37,6);g.moveTo(4,14);g.lineTo(37,14);
  for(let x=6;x<37;x+=4){g.moveTo(x,6);g.lineTo(x,14)}g.stroke();
  g.fillStyle='#5a5f66';g.beginPath();g.arc(6,10,4.5,0,TAU);g.fill()}
 else if(c==='61'){g.fillStyle='rgba(255,255,255,.25)';scRR(g,3,3,33,14,7);g.fill();g.strokeStyle='rgba(0,0,0,.25)';g.lineWidth=1;
  for(let x=10;x<36;x+=8){g.beginPath();g.moveTo(x,3);g.lineTo(x,17);g.stroke()}}
 else if(c==='91'){g.fillStyle='#2f8f6a';g.fillRect(0,8.5,38,3);g.fillStyle='#d8362f';g.fillRect(17,4,4,12);g.fillRect(13,8,12,4)}
 else if(c==='41'){g.fillStyle='rgba(0,0,0,.22)';g.fillRect(6,3,28,14);g.fillStyle='#f3c43b';g.fillRect(8,9,24,2);g.fillStyle='#eceae3';g.font='600 7px '+FONT;g.textAlign='center';g.textBaseline='middle';g.fillText('指揮',20,6)}
 else if(c==='75'){g.fillStyle='#3a3d44';g.beginPath();g.arc(18,10,6.5,0,TAU);g.fill();g.strokeStyle='#c9d0d8';g.lineWidth=1.2;g.beginPath();
  for(let k=0;k<3;k++){const a=k*TAU/3+T*6;g.moveTo(18,10);g.lineTo(18+Math.cos(a)*5.5,10+Math.sin(a)*5.5)}g.stroke()}
 else if(c==='71'||c==='搜'){g.strokeStyle='rgba(0,0,0,.3)';g.lineWidth=1;for(let x=5;x<36;x+=8){g.strokeRect(x,3,6,14)}}
 else if(c==='警'){g.fillStyle='#2f6fd0';g.fillRect(0,8,38,4);g.fillStyle='#22303c';g.fillRect(26,3,8,14)}
 else if(c==='機'){g.fillStyle='#d8b83a';scRR(g,0,0,50,20,3);g.fill();g.fillStyle='#c8332c';g.fillRect(0,8,38,4);g.fillStyle='#3a3d44';g.beginPath();g.arc(30,10,4,0,TAU);g.fill();g.fillStyle='#eceae3';g.fillRect(30,9,14,2)}
 else if(c==='43'){g.fillStyle='#3b2a24';g.fillRect(2,3,22,14);g.strokeStyle='#d8d4c8';g.lineWidth=1;g.strokeRect(4,5,18,10);g.fillStyle='#1a1a1a';g.fillRect(0,0,3,20)}
 else if(c==='履'){g.fillStyle='#222';g.fillRect(2,0,34,4);g.fillRect(2,16,34,4)}
 else{ // 幫浦車：水帶床、白色腰線
  g.fillStyle='rgba(0,0,0,.25)';g.fillRect(3,3,14,14);g.strokeStyle='rgba(255,255,255,.35)';g.lineWidth=1;
  for(let y=5;y<16;y+=3){g.beginPath();g.moveTo(4,y);g.lineTo(16,y);g.stroke()}
  g.fillStyle='rgba(255,255,255,.75)';g.fillRect(18,9,19,2);g.fillStyle='rgba(0,0,0,.22)';g.fillRect(20,3,15,5)}}
// 俯視人員：頭盔、空氣瓶、肩膀
function tacMan(g,x,y,r,col,a,opt){
 g.save();g.translate(x,y);g.rotate(a);
 g.fillStyle='rgba(0,0,0,.35)';g.beginPath();g.ellipse(1,1.5,r*1.25,r*.95,0,0,TAU);g.fill();
 // 行走時兩腳交替（步伐）
 if(opt.step){const s=opt.step*r*.45;g.fillStyle='#14141a';g.beginPath();g.ellipse(s,-r*.45,r*.32,r*.22,0,0,TAU);g.ellipse(-s,r*.45,r*.32,r*.22,0,0,TAU);g.fill()}
 g.fillStyle=opt.coat||'#1e2c52';g.beginPath();g.ellipse(0,0,r*.85,r*1.2,0,0,TAU);g.fill();
 if(opt.scba){g.fillStyle='#c9d0d8';scRR(g,-r*1.05,-r*.45,r*.5,r*.9,r*.15);g.fill()}
 g.fillStyle=col;g.beginPath();g.arc(r*.1,0,r*.62,0,TAU);g.fill();
 g.fillStyle='rgba(0,0,0,.35)';g.fillRect(r*.35,-r*.25,r*.3,r*.5);
 g.restore()}
// 兩個相鄰空間之間的門（共用邊的中點）
function tacDoorMid(G,a,b){const ra=G.r(a),rb=G.r(b);return[(Math.max(ra[0],rb[0])+Math.min(ra[0]+ra[2],rb[0]+rb[2]))/2,(Math.max(ra[1],rb[1])+Math.min(ra[1]+ra[3],rb[1]+rb[3]))/2]}
// 屋外水帶：車 → 垂直拉到牆外通道 → 沿通道（轉角處轉彎）→ 入口門外 → 門口；o 為並排錯開量
function tacHoseOut(B,G,ts,tp,es,d,o){
 const lane=s=>s==='n'?G.by-16-o:s==='s'?G.by+G.bh+16+o:s==='w'?G.bx-16-o:G.bx+G.bw+16+o;
 const hz=s=>s==='n'||s==='s',pts=[[tp[0],tp[1]]];
 const onLane=(s,p)=>hz(s)?[p[0],lane(s)]:[lane(s),p[1]];
 pts.push(onLane(ts,tp));
 let cur=ts;
 const turn=to=>{const c=hz(cur)?[lane(to),lane(cur)]:[lane(cur),lane(to)];pts.push(c);cur=to};
 if(ts!==es){if(tacOpp(ts,es)){const via=hz(ts)?(B.sd.e.road||!B.sd.w.road?'e':'w'):(B.sd.s.road||!B.sd.n.road?'s':'n');turn(via)}turn(es)}
 const dd=hz(es)?[d[0]+o*.6,d[1]]:[d[0],d[1]+o*.6];
 pts.push(onLane(es,dd));pts.push(dd);
 return pts}
const tacPfCol=(pf,a)=>(pf>=.7?'rgba(125,179,232,':pf>=.4?'rgba(233,161,59,':'rgba(226,86,79,')+a+')';
function drawTac(){
 const inc=S.inc.find(i=>i.id===TAC.id);
 if(!inc||!inc.tac){const b=TAC.B;
  tacClose(b&&b.done?(b.burnt>b.R*b.F*.5?'建物燒毀':'戰術指揮完成')+'：救出 '+b.resc+' 名'+(b.burnt?'、燒毀 '+b.burnt+' 室':'')+(b.lost?'、罹難 '+b.lost+' 名':'')+(b.lodd?'、殉職 '+b.lodd+' 組':''):'戰術指揮失敗：案件逾時，火勢未能控制');return}
 const B=inc.tac,g=tctx,G=tacGeo(B),T=S.t,L=B.L,t=G.t;
 if(TAC.vf===undefined||TAC.vf>B.F)TAC.vf=Math.min(B.F-1,B.of);
 if(B.out)TAC.vf=0;
 const vf=TAC.vf;
 TAC.hits=[];
 g.fillStyle='#0d1015';g.fillRect(0,0,tW,tH);
 // 四周：道路（含名稱與大型車限制）、鄰棟、水域
 for(const s of ['w','e','n','s']){const b=G.band[s],d=B.sd[s];
  if(d.road){g.fillStyle=d.big?'#2a2a27':'#232320';g.fillRect(b[0],b[1],b[2],b[3]);
   g.strokeStyle='rgba(233,231,224,.16)';g.setLineDash([12,10]);g.beginPath();
   if(s==='n'||s==='s'){g.moveTo(b[0],b[1]+b[3]/2);g.lineTo(b[0]+b[2],b[1]+b[3]/2)}else{g.moveTo(b[0]+b[2]/2,b[1]);g.lineTo(b[0]+b[2]/2,b[1]+b[3])}
   g.stroke();g.setLineDash([]);
   TAC.hits.push({t:'side',s,x:b[0],y:b[1],w:b[2],h:b[3]})}
  else{g.fillStyle=d.nm==='水域'?'#0e2436':'#191816';g.fillRect(b[0],b[1],b[2],b[3]);
   if(B.exp[s]!==undefined){const ex=B.exp[s];
    if(ex>.02){g.fillStyle=B.expL[s]?'rgba(255,90,30,'+(.35+.15*Math.sin(T*6)).toFixed(2)+')':'rgba(255,110,40,'+(ex*.5).toFixed(2)+')';g.fillRect(b[0],b[1],b[2],b[3])}
    TAC.hits.push({t:'side',s,x:b[0],y:b[1],w:b[2],h:b[3]})}
   if(d.nm!=='水域'){g.strokeStyle='rgba(255,255,255,.05)';g.lineWidth=1;g.beginPath();
    for(let k=-b[3];k<b[2];k+=10){g.moveTo(b[0]+k,b[1]+b[3]);g.lineTo(b[0]+k+b[3],b[1])}g.save();g.rect(b[0],b[1],b[2],b[3]);g.clip();g.stroke();g.restore()}}}
 for(const s of TAC_SIDES){const b=G.band[s],d=B.sd[s];
  g.font='11px '+FONT;g.fillStyle=d.road?(d.big?'#9d9a92':'#e9a13b'):'#6b6960';g.textBaseline='middle';
  const lb=TAC_SDN[s]+'側 '+d.nm+(d.road&&!d.big?'（大型車禁入）':'')+(B.exp[s]!==undefined?(B.expL[s]?' 已延燒！':' 受熱 '+Math.round(B.exp[s]*100)+'%'):'');
  if(B.exp[s]>.5)g.fillStyle='#ff8a6a';
  if(s==='n'||s==='s'){g.textAlign='left';g.fillText(lb,b[0]+6,b[1]+b[3]/2)}
  else{g.save();g.translate(b[0]+b[2]/2,b[1]+b[3]-8);g.rotate(-Math.PI/2);g.textAlign='left';g.fillText(lb,0,0);g.restore()}}
 // 車輛：依真實車長與間距停在建物各側道路上（見 tacParkPlan）；停不下的列為「已抵達（畫面外）」
 const TP={},PL=tacParkPlan(inc,B,G);TAC.off=PL.off;TAC.tp=TP;
 for(const v of PL.cars){const u=v.u;TP[u.id]=v.hp;
  g.save();if(v.ghost)g.globalAlpha=.45;
  g.translate(v.x,v.y);if(v.vert)g.rotate(Math.PI/2);
  g.scale(v.len/50,1);g.translate(-25,-10);tacVeh(g,u,T);g.restore();
  g.fillStyle='rgba(236,234,227,.55)';g.font='9px '+FONT;g.textAlign='center';
  if(v.vert){g.save();g.translate(v.x+(v.s==='w'?18:-18),v.y);g.rotate(-Math.PI/2);g.textBaseline='middle';g.fillText(u.cs,0,0);g.restore()}
  else{g.textBaseline=v.s==='n'?'bottom':'top';g.fillText(u.cs,v.x,v.s==='n'?v.y-11:v.y+11)}}
 // 畫面外的車：在各側道路末端標示數量
 for(const s of TAC_SIDES){const n=PL.off.filter(o=>o.s===s).length;if(!n)continue;const e=PL.edge[s];TP.off=TP.off||{};
  g.fillStyle='rgba(10,10,9,.8)';const lb='畫面外 '+n+' 輛 '+(s==='n'||s==='s'?'→':'↓');g.font='600 10px '+FONT;const tw=g.measureText(lb).width+10;
  scRR(g,e[0]-tw/2,e[1]-8,tw,16,4);g.fill();g.fillStyle='#e9a13b';g.textAlign='center';g.textBaseline='middle';g.fillText(lb,e[0],e[1])}
 for(const o of PL.off)TP[o.u.id]=PL.edge[o.s];
 // 消防栓與供水管
 if(B.hyd){const b=G.band[B.hyd.side],s=B.hyd.side;
  const hp=s==='n'||s==='s'?[Math.min(b[0]+b[2]-20,G.bx+G.bw+40),b[1]+b[3]/2]:[b[0]+b[2]/2,Math.min(b[1]+b[3]-20,G.by+G.bh+40)];
  const sup=B.sq.find(q=>q.ty==='pump'&&q.tside===s&&!q.tmv);
  if(sup&&TP[sup.u]){g.strokeStyle='rgba(125,179,232,.85)';g.lineWidth=4;g.beginPath();g.moveTo(hp[0],hp[1]);g.lineTo(TP[sup.u][0],TP[sup.u][1]);g.stroke()}
  g.fillStyle='#c8332c';g.beginPath();g.arc(hp[0],hp[1],8,0,TAU);g.fill();g.fillStyle='#fff';g.font='600 9px '+FONT;g.textAlign='center';g.textBaseline='middle';g.fillText('栓',hp[0],hp[1]);
  g.fillStyle=sup?'#7db3e8':'#e2564f';g.font='10px '+FONT;g.fillText('消防栓 '+B.hyd.d+'m'+(sup?'':'（未佔水）'),hp[0],hp[1]+(s==='n'||s==='s'?16:-16))}
 if(vf>=B.F){ // 屋頂俯視：樓梯間出入口、屋頂排煙口、避難民眾
  g.fillStyle='#3a3833';g.fillRect(G.bx-5,G.by-5,G.bw+10,G.bh+10);
  g.strokeStyle='rgba(255,255,255,.06)';g.lineWidth=1;for(let k=10;k<G.bw;k+=16){g.beginPath();g.moveTo(G.bx+k,G.by);g.lineTo(G.bx+k,G.by+G.bh);g.stroke()}
  TAC.hits.push({t:'roof',x:G.bx,y:G.by,w:G.bw,h:G.bh});
  for(const n of L.N){if(n.ty!=='stair')continue;const r=G.r(n.c),x=tacCel(B,B.F-1,n.c);
   g.fillStyle=B.roof?'#07080a':'#55514a';g.fillRect(r[0]+r[2]*.15,r[1]+r[3]*.35,r[2]*.7,r[3]*.3);
   if(B.roof&&x.s>.05)for(let k=0;k<3;k++){const ph=(T*.5+k/3)%1;g.fillStyle='rgba(120,122,128,'+(x.s*.6*(1-ph)+.05).toFixed(3)+')';
    g.beginPath();g.arc(r[0]+r[2]/2+(k-1)*8,r[1]+r[3]/2-ph*40,5+ph*10,0,TAU);g.fill()}
   g.fillStyle='#eceae3';g.font='10px '+FONT;g.textAlign='center';g.textBaseline='middle';g.fillText(B.roof?'排煙口 開':'屋頂出入口',r[0]+r[2]/2,r[1]+r[3]*.25)}
  for(const n of L.N){const x=tacCel(B,B.F-1,n.c);if(!x.vv)continue;const r=G.r(n.c);
   g.fillStyle='#07080a';g.fillRect(r[0]+r[2]*.35,r[1]+r[3]*.35,r[2]*.3,r[3]*.3);
   for(let k=0;k<3;k++){const ph=(T*.6+k/3)%1;g.fillStyle='rgba(140,142,148,'+((1-ph)*.6).toFixed(2)+')';g.beginPath();g.arc(r[0]+r[2]/2,r[1]+r[3]/2-ph*30,5+ph*10,0,TAU);g.fill()}
   g.fillStyle='#eceae3';g.font='10px '+FONT;g.textAlign='center';g.textBaseline='top';g.fillText('垂直排煙口',r[0]+r[2]/2,r[1]+r[3]*.68)}
  // 屋頂光電板：板陣列與火勢
  if(B.rf){for(const n of L.N){if(n.ty!=='room'||n.c%2)continue;const r=G.r(n.c);
    g.fillStyle=B.rf.h>0?'#2a3550':'#1f2738';g.fillRect(r[0]+6,r[1]+6,r[2]-12,r[3]-12);g.strokeStyle='rgba(140,170,220,.35)';g.lineWidth=1;
    for(let k=r[0]+6;k<r[0]+r[2]-6;k+=12){g.beginPath();g.moveTo(k,r[1]+6);g.lineTo(k,r[1]+r[3]-6);g.stroke()}
    if(B.rf.h>0)for(let k=0;k<Math.ceil(B.rf.h*4);k++){const fx=r[0]+r[2]*(.2+.6*((n.c*7+k*13)%11/11)),fy=r[1]+r[3]*(.2+.6*((n.c*3+k*5)%7/7)),fr=t*.12*(.8+.3*Math.sin(T*8+k));
     tacFlameGlow(g,fx,fy,fr*1.6)}}
   g.fillStyle=B.rf.h>0?'#ff8a6a':'#5dcaa5';g.font='600 12px '+FONT;g.textAlign='center';g.textBaseline='bottom';
   g.fillText(B.rf.h>0?'光電板燃燒 '+Math.round(B.rf.h*100)+'%　'+(inc.pow>=2?'台電已斷電':'帶電中：僅能水霧遠距射水'):'光電板火勢已撲滅',G.bx+G.bw/2,G.by+G.bh-8)}
  const vc=[G.bx+G.bw*.62,G.by+G.bh*.5];
  if(B.roofV>0){
   if(B.roofS){for(let k=0;k<B.roofV;k++){const a=k*1.3;tacMan(g,vc[0]+Math.cos(a)*t*.25,vc[1]+Math.sin(a)*t*.25,6,'#d9bfae',a,{coat:'#7a4a9a'})}
    g.fillStyle='#ff5a4a';g.font='600 12px '+FONT;g.textAlign='center';g.fillText('屋頂避難 '+B.roofV+' 名',vc[0],vc[1]-t*.45)}
   else{g.fillStyle='#e9a13b';g.font='600 12px '+FONT;g.textAlign='center';g.fillText('通報：有民眾逃往屋頂（尚未確認人數）',vc[0],vc[1])}}
  else{g.fillStyle='rgba(236,234,227,.4)';g.font='12px '+FONT;g.textAlign='center';g.fillText(B.roofS?'屋頂已確認無人':'屋頂（點選可派員或雲梯登頂）',vc[0],vc[1])}}
 else{
 // 現場站點（帳篷）：排在各自那側道路的末端
 {// 每個路口依大小排成格子（每格 56×44），大的路口先用
  const slots=[];
  tacCorners(G,B.arr).map((cr,o)=>({cr,o,cap:Math.max(1,Math.floor(cr[2]/56))*Math.max(1,Math.floor(cr[3]/44))}))
   .sort((a,b)=>b.cap-a.cap||a.o-b.o).forEach(({cr})=>{const cl=Math.max(1,Math.floor(cr[2]/56)),rw=Math.max(1,Math.floor(cr[3]/44));
    for(let j=0;j<rw;j++)for(let i=0;i<cl;i++)slots.push([cr[0]+cr[2]*(i+.5)/cl,cr[1]+cr[3]*(j+.5)/rw-8])});
  let i=0;
  for(const d of TAC_STN){const o=B.st[d.k];if(!o)continue;
   const sp=slots[i++%slots.length],x=sp[0],y=sp[1];
   g.fillStyle=d.k==='icp'?'#e9a13b':d.k==='triage'||d.k==='treat'?'#5dcaa5':d.k==='air'?'#7db3e8':d.k==='rehab'?'#afa9ec':'#9d9a92';
   g.beginPath();g.moveTo(x-12,y+8);g.lineTo(x,y-9);g.lineTo(x+12,y+8);g.closePath();g.fill();
   g.fillStyle='#eceae3';g.font='10px '+FONT;g.textAlign='center';g.textBaseline='top';g.fillText(d.n,x,y+10)}}
 // 傷患集結處：在抵達側入口旁，依檢傷顏色排列
 if(B.pts.length||onScene(inc).some(u=>u.load>0)){const e=B.ents.find(x=>x.side===B.arr)||B.ents[0],d=tacDoor(G,e.side),dv=TAC_SDV[e.side];
  const bx=d[0]+dv[0]*34+(dv[0]?0:G.t*.6),by=d[1]+dv[1]*34+(dv[1]?0:G.t*.6);
  g.fillStyle='rgba(236,234,227,.12)';g.fillRect(bx-36,by-16,90,32);
  B.pts.forEach((p,i)=>{g.fillStyle=p.sev==='red'?'#e2564f':p.sev==='yellow'?'#e9a13b':'#5dcaa5';g.beginPath();g.arc(bx-28+(i%8)*10,by-6+Math.floor(i/8)*10,4,0,TAU);g.fill()});
  g.fillStyle='#eceae3';g.font='10px '+FONT;g.textAlign='left';g.textBaseline='top';g.fillText('傷患集結 '+B.pts.length,bx-34,by+6)}
 // 建物外牆底
 if(B.out)tacYardBase(g,G,B);else{g.fillStyle='#4a463f';g.fillRect(G.bx-5,G.by-5,G.bw+10,G.bh+10)}
 const burnt=x=>x.ty!=='stair'&&x.fu<.05;
 for(const n of L.N){
  const x=tacCel(B,vf,n.c),r=G.r(n.c);
  TAC.hits.push({t:'cell',f:vf,c:n.c,x:r[0],y:r[1],w:r[2],h:r[3]});
  const kd=vf<B.F?tacK(B,vf,n.c):n.kind;
  if(B.out)tacYardCell(g,G,B,n,x,r,T);else{
  g.fillStyle=burnt(x)?'#141210':n.ty==='room'?'#2b2722':n.ty==='hall'?'#38352f':'#23262c';g.fillRect(r[0],r[1],r[2],r[3]);
  if(!burnt(x))tacFloorPat(g,r,n,kd);
  if(n.ty==='room')tacFurn(g,r,kd,n.c*7+vf*3+1,burnt(x)||x.fu<.3);
  if(n.atr)tacAtr(g,r,vf===B.F-1);
  if(n.ty==='hall'){g.strokeStyle='rgba(255,255,255,.05)';g.lineWidth=1;for(let k=1;k<4;k++){g.beginPath();g.moveTo(r[0]+r[2]*k/4,r[1]);g.lineTo(r[0]+r[2]*k/4,r[1]+r[3]);g.stroke()}}}
  if(n.ty==='stair'){
   g.strokeStyle='rgba(200,200,190,.25)';g.lineWidth=1;
   for(let k=1;k<10;k++){const yy=r[1]+r[3]*k/10;g.beginPath();g.moveTo(r[0]+r[2]*.12,yy);g.lineTo(r[0]+r[2]*.88,yy);g.stroke()}
   g.fillStyle='rgba(236,234,227,.55)';g.font='600 11px '+FONT;g.textAlign='center';g.textBaseline='middle';
   g.fillText('▲ '+(vf<B.F-1?tacFlr(B,vf+1):(B.roof?'屋頂 開':'屋頂')),r[0]+r[2]/2,r[1]+14);
   g.fillText(vf===B.bf?'▼ 出口'+(B.bf?'／B1':''):vf>0?'▼ '+tacFlr(B,vf-1):'',r[0]+r[2]/2,r[1]+r[3]-14);
   if(B.sp){g.fillStyle=B.sp.on?'#7db3e8':'#6b6960';g.font='10px '+FONT;g.fillText(B.sp.on?'出水口 ●':'出水口',r[0]+r[2]/2,r[1]+r[3]*.32)}
   // 多座樓梯：編號與攻擊梯／避難梯
   const sts=L.N.filter(m=>m.ty==='stair');
   if(sts.length>1){const no=sts.indexOf(n)+1,ev=B.evS!==undefined?n.c===B.evS:!!(B.atkS&&B.atkS.size&&!B.atkS.has(n.c)),atk=!ev&&(B.evS!==undefined||(B.atkS&&B.atkS.has(n.c)));
    g.font='600 10px '+FONT;g.fillStyle=atk?'#e9a13b':ev?'#5dcaa5':'rgba(236,234,227,.45)';g.fillText(no+'號梯'+(atk?'・攻擊':ev?'・避難':''),r[0]+r[2]/2,r[1]+r[3]*.68)}}
  if(x.h>.02){g.fillStyle='rgba(255,'+(110-x.h*60|0)+',30,'+(x.h*.45).toFixed(3)+')';g.fillRect(r[0],r[1],r[2],r[3])}
  if(x.h>.15){const nF=Math.ceil(x.h*6);
   for(let k=0;k<nF;k++){const sd=(n.c*7+k*13)%17/17,sd2=(n.c*3+k*29)%19/19;
    const fx=r[0]+r[2]*(.15+.7*sd),fy=r[1]+r[3]*(.15+.7*sd2),fr=t*(.06+.1*x.h)*(.8+.25*Math.sin(T*9+k*2));
    tacFlameGlow(g,fx,fy,fr*1.6)}}
  if(n.ty==='room'){
   if(x.srch>=1){
    for(let k=0;k<x.vic;k++){const vx=r[0]+r[2]*.25+k*t*.16,vy=r[1]+r[3]*.72;
     g.fillStyle='#7a4a9a';g.beginPath();g.ellipse(vx,vy,t*.07,t*.03,0,0,TAU);g.fill();
     g.fillStyle='#d9bfae';g.beginPath();g.arc(vx+t*.08,vy,t*.025,0,TAU);g.fill()}
    if(x.vic&&(T*2)%1<.6){g.fillStyle='#ff5a4a';g.font='600 10px '+FONT;g.textAlign='left';g.textBaseline='bottom';g.fillText('受困 '+x.vic,r[0]+r[2]*.18,r[1]+r[3]*.64)}
    if(!x.vic&&!B.wild){g.fillStyle=x.sl>=2?'rgba(93,202,165,.75)':'rgba(233,161,59,.75)';g.font='600 10px '+FONT;g.textAlign='left';g.textBaseline='top';g.fillText(x.sl>=2?'次搜✓':'初搜',r[0]+4,r[1]+4)}
    if(x.sl===1&&x.s2>0&&x.s2<1){g.fillStyle='rgba(93,202,165,.85)';g.fillRect(r[0]+4,r[1]+r[3]-6,(r[2]-8)*x.s2,3)}}
   else{
    if(x.srch>0){g.fillStyle='rgba(125,179,232,.85)';g.fillRect(r[0]+4,r[1]+r[3]-6,(r[2]-8)*x.srch,3)}
    g.fillStyle='rgba(236,234,227,.2)';g.font='600 '+Math.max(12,t*.22|0)+'px '+FONT;g.textAlign='center';g.textBaseline='middle';
    g.fillText('?',r[0]+r[2]/2,r[1]+r[3]/2)}
   g.fillStyle='rgba(236,234,227,.45)';g.font='10px '+FONT;g.textAlign='right';g.textBaseline='top';
   if(B.out){g.textAlign='left';g.fillStyle='rgba(236,234,227,.6)';g.fillText(tacYardNm(B,n.c),r[0]+(x.srch>=1&&!x.vic?36:5),r[1]+4)}else{
   g.fillText(tacRm(B,vf,vf<B.bf?n.bi:n.no),r[0]+r[2]-5,r[1]+4);
   g.textAlign='left';g.fillStyle='rgba(236,234,227,.4)';g.fillText(TAC_RK[kd].n,r[0]+(x.srch>=1&&!x.vic?36:5),r[1]+4)}}
  if(x.s>.03){g.fillStyle='rgba(66,68,74,'+(.12+.68*x.s).toFixed(3)+')';g.fillRect(r[0],r[1],r[2],r[3]);
   for(let k=0;k<3;k++){const ph=(T*.15+k/3+n.c*.13)%1;g.fillStyle='rgba(120,122,128,'+(x.s*.18).toFixed(3)+')';
    g.beginPath();g.arc(r[0]+r[2]*(.2+.6*ph),r[1]+r[3]*(.3+.4*((k*.37+n.c*.21)%1)),t*.18,0,TAU);g.fill()}}}
 // 牆與門
 g.strokeStyle='#8a857a';g.lineWidth=3;
 const opn=vf<B.bf; // 地下停車場：開放空間，只畫柱列與停車區標線
 for(const n of L.N){const r=G.r(n.c);if(B.out)continue;
  if(opn&&n.nbO){g.save();g.strokeStyle='rgba(233,200,90,.18)';g.lineWidth=1;g.setLineDash([6,5]);g.strokeRect(r[0]+2,r[1]+2,r[2]-4,r[3]-4);g.restore();
   g.fillStyle='#8a857a';for(const p of[[r[0],r[1]],[r[0]+r[2],r[1]],[r[0],r[1]+r[3]],[r[0]+r[2],r[1]+r[3]]])g.fillRect(p[0]-4,p[1]-4,8,8)}
  else g.strokeRect(r[0],r[1],r[2],r[3])}
 if(opn&&B.ramp&&B.ramp.f===vf){const r=G.r(B.ramp.c),s2=B.ramp.side;g.save();g.fillStyle='rgba(233,200,90,.12)';
  const rw=s2==='n'||s2==='s'?[r[0]+r[2]*.3,s2==='n'?r[1]:r[1]+r[3]*.55,r[2]*.4,r[3]*.45]:[s2==='w'?r[0]:r[0]+r[2]*.55,r[1]+r[3]*.3,r[2]*.45,r[3]*.4];
  g.fillRect(rw[0],rw[1],rw[2],rw[3]);g.strokeStyle='rgba(233,200,90,.4)';g.lineWidth=1;for(let k=1;k<6;k++){g.beginPath();
   if(s2==='n'||s2==='s'){const yy=rw[1]+rw[3]*k/6;g.moveTo(rw[0],yy);g.lineTo(rw[0]+rw[2],yy)}else{const xx=rw[0]+rw[2]*k/6;g.moveTo(xx,rw[1]);g.lineTo(xx,rw[1]+rw[3])}g.stroke()}
  g.fillStyle='#e9c85a';g.font='600 10px '+FONT;g.textAlign='center';g.textBaseline='middle';g.fillText('車道坡道',rw[0]+rw[2]/2,rw[1]+rw[3]/2);g.restore()}
 // 分戶：每戶外圍以較粗的分戶牆框起
 if(L.nu&&vf>=B.bf){g.strokeStyle='#a69f90';g.lineWidth=5;
  for(let u=0;u<L.nu;u++){const rs=L.N.filter(n=>n.u===u).map(n=>G.r(n.c));if(!rs.length)continue;
   const x0=Math.min(...rs.map(r=>r[0])),y0=Math.min(...rs.map(r=>r[1])),x1=Math.max(...rs.map(r=>r[0]+r[2])),y1=Math.max(...rs.map(r=>r[1]+r[3]));g.strokeRect(x0,y0,x1-x0,y1-y0)}}
 if(!B.out){g.strokeStyle='#bdb6a8';g.lineWidth=7;g.strokeRect(G.bx-1,G.by-1,G.bw+2,G.bh+2);
 g.strokeStyle='#5c574f';g.lineWidth=1.5;g.strokeRect(G.bx+2.5,G.by+2.5,G.bw-5,G.bh-5)}
 const flr=c=>{const x=tacCel(B,vf,c),n=L.N[c];return burnt(x)?'#141210':n.ty==='room'?'#2b2722':n.ty==='hall'?'#38352f':'#23262c'};
 for(const a of L.N)for(const bc of a.nb){if(bc<a.c||(opn&&a.nbO&&L.N[bc].nbO)||(B.out&&!a.walled&&!L.N[bc].walled))continue;const ra=G.r(a.c),rb=G.r(bc);let s;
  if(Math.abs(ra[1]+ra[3]-rb[1])<1||Math.abs(rb[1]+rb[3]-ra[1])<1){const y=Math.abs(ra[1]+ra[3]-rb[1])<1?rb[1]:ra[1];
   const x0=Math.max(ra[0],rb[0]),x1=Math.min(ra[0]+ra[2],rb[0]+rb[2]);s=[(x0+x1)/2-t*.14,y-3,t*.28,6]}
  else{const x=Math.abs(ra[0]+ra[2]-rb[0])<1?rb[0]:ra[0];const y0=Math.max(ra[1],rb[1]),y1=Math.min(ra[1]+ra[3],rb[1]+rb[3]);s=[x-3,(y0+y1)/2-t*.14,6,t*.28]}
  const opg=tacOpn(B,a.c,bc);if(opg){if(s[2]>s[3]){s[0]-=t*.16;s[2]+=t*.32}else{s[1]-=t*.16;s[3]+=t*.32}}   // 沒有門的開口：畫成較寬的缺口
  g.fillStyle=flr(a.ty==='room'?bc:a.c);g.fillRect(s[0],s[1],s[2],s[3]);
  if(!opg&&!(vf<B.F&&tacShut(B,vf,a.c,bc))){const rm=a.ty==='room'?a:L.N[bc],rr=G.r(rm.c),dw=t*.17;
   g.strokeStyle='rgba(200,190,170,.55)';g.lineWidth=1;g.beginPath();
   if(s[2]>s[3]){const hx=s[0],hy=s[1]+3,dir=rr[1]>hy-3?1:-1;g.moveTo(hx,hy);g.lineTo(hx,hy+dir*dw);g.arc(hx,hy,dw,dir>0?Math.PI/2:-Math.PI/2,0,dir<0)}
   else{const hx=s[0]+3,hy=s[1],dir=rr[0]>hx-3?1:-1;g.moveTo(hx,hy);g.lineTo(hx+dir*dw,hy);g.arc(hx,hy,dw,dir>0?0:Math.PI,Math.PI/2,dir<0)}
   g.stroke()}
  if(vf<B.F&&tacShut(B,vf,a.c,bc)){g.fillStyle='#b5853f';if(s[2]>s[3])g.fillRect(s[0],s[1]+1.5,s[2],3);else g.fillRect(s[0]+1.5,s[1],3,s[3])}}
 // 化學品危害區、場區遮雨棚與風向
 tacHazDraw(g,G,B,vf);if(B.out)tacYardTop(g,G,B,T);
 // 撒水頭動作的空間：藍色水滴
 if(B.spk&&B.spk.ok&&vf<B.F)for(const n of L.N){const x=tacCel(B,vf,n.c);if(!x.spkOn)continue;const r=G.r(n.c);
  for(let k=0;k<5;k++){const ph=(T*1.5+k/5)%1;g.fillStyle='rgba(125,179,232,'+(.7*(1-ph)).toFixed(2)+')';g.beginPath();g.arc(r[0]+r[2]*(.15+.7*((k*37+n.c*11)%17/17)),r[1]+r[3]*(.15+ph*.7),2.2,0,TAU);g.fill()}}
 // 氣體偵測標記：量過的空間角落顯示「偵」，超標為紅色
 if(vf<B.F)for(const n of L.N){const x=tacCel(B,vf,n.c);if(!x.gm)continue;const r=G.r(n.c),bad=tacGasBad(x.gm).length;
  g.fillStyle=bad?'#a8362f':'#2f5f8a';g.fillRect(r[0]+4,r[1]+r[3]-20,20,16);g.fillStyle='#eceae3';g.font='600 10px '+FONT;g.textAlign='center';g.textBaseline='middle';g.fillText('偵',r[0]+14,r[1]+r[3]-12)}
 // 氣爆瓦礫
 if(vf<B.F)for(const n of L.N){const x=tacCel(B,vf,n.c);if(!x.rub)continue;const r=G.r(n.c);
  for(let k=0;k<14;k++){const a=(n.c*17+k*31)%97/97,b=(n.c*7+k*13)%89/89,sz=6+(k*7)%9;g.fillStyle=k%3?'#5a5048':'#6e6258';
   g.save();g.translate(r[0]+r[2]*(.1+.8*a),r[1]+r[3]*(.1+.8*b));g.rotate(k);g.fillRect(-sz/2,-sz/3,sz,sz*.66);g.restore()}
  g.fillStyle='rgba(233,161,59,.9)';g.font='600 10px '+FONT;g.textAlign='center';g.textBaseline='bottom';g.fillText('瓦礫',r[0]+r[2]/2,r[1]+r[3]-4)}
 // 外牆室外機火
 if(B.ext&&B.ext.h>0&&(vf===B.ext.f||vf===B.ext.f+1)){const w=tacWinPt(G,B.ext.c,B.ext.side),dv=TAC_SDV[B.ext.side],up=vf===B.ext.f+1;
  const fx=w[0]+dv[0]*14,fy=w[1]+dv[1]*14,fr=t*(up?.12:.2)*B.ext.h*(.85+.2*Math.sin(T*9));
  tacFlameGlow(g,fx,fy,fr*1.8,up?.55:1);
  g.fillStyle='#ff8a6a';g.font='600 10px '+FONT;g.textAlign='center';g.textBaseline='middle';g.fillText(up?'下層外牆火往上竄':'室外機火 '+Math.round(B.ext.h*100)+'%',fx+dv[0]*30+(dv[0]?0:0),fy+dv[1]*22+(dv[1]?0:-18))}
 // 防火門（樓梯間）：已知樓層才顯示狀態
 if(vf<B.F&&B.fd){g.font='600 9px '+FONT;g.textAlign='center';g.textBaseline='middle';
  for(const[key,d]of B.fd){if(d.f!==vf)continue;
   const co=G.ctr(d.o),[m0,m1]=tacDoorMid(G,d.s,d.o);
   // 標籤往走廊那側偏一點，避免蓋住樓梯間的文字
   const dl=Math.hypot(co[0]-m0,co[1]-m1)||1,mx=m0+(co[0]-m0)/dl*12,my=m1+(co[1]-m1)/dl*12;
   const kn=B.fdK.has(vf),shut=B.cd.has(key),held=B.fdO.has(key)&&B.fdO.get(key).w;
   const lb=!kn?'防?':d.t==='gone'?'拆除':d.t==='wedge'?'卡住':held?'水帶卡':shut?'防火門':d.t==='mag'?'常開':'開';
   const col=!kn?'#9d9a92':d.t==='gone'||d.t==='wedge'||held?'#e2564f':shut?'#d0a050':'#7db3e8';
   g.fillStyle='rgba(20,18,16,.85)';g.fillRect(mx-16,my-7,32,14);g.strokeStyle=col;g.lineWidth=1.2;g.strokeRect(mx-16,my-7,32,14);
   if(kn&&d.t==='gone'){g.setLineDash([2,2]);g.strokeRect(mx-16,my-7,32,14);g.setLineDash([])}
   g.fillStyle=col;g.fillText(lb,mx,my+.5)}}
 // 上鎖的房門（紅叉）、門控位置
 if(vf<B.F){
  for(const a of L.N)for(const bc of a.nb){if(bc<a.c)continue;
   const lk=B.lk.has(tacDK(B,vf,a.c,bc))&&!!B.lkK&&B.lkK.has(tacDK(B,vf,a.c,bc)),dcx=B.dcN&&(B.dcN.has(vf*B.W+a.c)||B.dcN.has(vf*B.W+bc));
   if(!lk&&!dcx)continue;const [mx,my]=tacDoorMid(G,a.c,bc);
   if(lk){g.strokeStyle='#e2564f';g.lineWidth=2;g.beginPath();g.moveTo(mx-5,my-5);g.lineTo(mx+5,my+5);g.moveTo(mx+5,my-5);g.lineTo(mx-5,my+5);g.stroke()}}
  for(const x of B.cells){if(x.f!==vf)continue;const r=G.r(x.c),key=vf*B.W+x.c;
   // 民眾提供的資訊：指稱有人、瓦斯桶、起火點
   if(x.rep&&x.srch<1){g.fillStyle='rgba(233,161,59,.9)';g.font='600 10px '+FONT;g.textAlign='center';g.textBaseline='bottom';g.fillText('民眾指稱有人',r[0]+r[2]/2,r[1]+r[3]-6)}
   if(B.gasK&&!B.gasX&&vf===B.gasF&&x.c===B.gas){const cx2=r[0]+r[2]-16,cy2=r[1]+r[3]-18;g.fillStyle='#e9a13b';g.beginPath();g.moveTo(cx2,cy2-8);g.lineTo(cx2+8,cy2+6);g.lineTo(cx2-8,cy2+6);g.closePath();g.fill();
    g.fillStyle='#111';g.font='700 10px '+FONT;g.textAlign='center';g.textBaseline='middle';g.fillText('!',cx2,cy2+1);g.fillStyle='#e9a13b';g.font='10px '+FONT;g.textBaseline='top';g.fillText('瓦斯桶',cx2,cy2+8)}
   if(B.ocKnown&&vf===B.of&&x.c===B.oc){g.fillStyle='rgba(255,120,80,.95)';g.font='600 10px '+FONT;g.textAlign='left';g.textBaseline='top';g.fillText('🔥起火點',r[0]+4,r[1]+18)}
   if(B.dcN&&B.dcN.has(key)){g.fillStyle='#e9a13b';g.font='600 10px '+FONT;g.textAlign='center';g.textBaseline='bottom';g.fillText('門控',r[0]+r[2]/2,r[1]+r[3]-4)}
   // 餘燼：閃爍的紅點（熱顯像可見）
   if(x.emb&&x.h<.05){for(let k=0;k<4;k++){const a=(x.c*7+k*13)%17/17,b2=(x.c*5+k*11)%13/13,pu=.5+.5*Math.sin(T*6+k*2);
     g.fillStyle='rgba(255,'+(70+pu*60|0)+',30,'+(.5+.4*pu).toFixed(2)+')';g.beginPath();g.arc(r[0]+r[2]*(.2+.6*a),r[1]+r[3]*(.25+.55*b2),2.5+pu*1.5,0,TAU);g.fill()}
    g.fillStyle='rgba(255,140,60,.85)';g.font='600 10px '+FONT;g.textAlign='right';g.textBaseline='bottom';g.fillText('餘燼',r[0]+r[2]-4,r[1]+r[3]-4)}
   // 垂直排煙：頂樓房間天花板開孔
   if(x.vv){g.fillStyle='rgba(7,8,10,.8)';g.fillRect(r[0]+r[2]*.4,r[1]+r[3]*.4,r[2]*.2,r[3]*.2);
    for(let k=0;k<3;k++){const ph=(T*.7+k/3)%1;g.fillStyle='rgba(140,142,148,'+((1-ph)*.5).toFixed(2)+')';g.beginPath();g.arc(r[0]+r[2]/2,r[1]+r[3]/2-ph*r[3]*.3,4+ph*8,0,TAU);g.fill()}}
   // 負壓排煙：窗口的排風機
   if(B.npvS&&B.npvS.has(key)&&B.L.N[x.c].wins){const w=tacWinPt(G,x.c,B.L.N[x.c].wins[0]),dv=TAC_SDV[B.L.N[x.c].wins[0]];
    const fx=w[0]-dv[0]*10,fy=w[1]-dv[1]*10;g.fillStyle='#3a3d44';g.beginPath();g.arc(fx,fy,8,0,TAU);g.fill();
    g.strokeStyle='#c9d0d8';g.lineWidth=1.6;g.beginPath();for(let k=0;k<3;k++){const a2=-T*14+k*TAU/3;g.moveTo(fx,fy);g.lineTo(fx+Math.cos(a2)*7,fy+Math.sin(a2)*7)}g.stroke()}}}
 // 對外窗（各方向）
 for(const n of L.N){if(!n.wins||vf<B.bf||B.out)continue;const x=tacCel(B,vf,n.c);
  for(const w of n.wins){const p=tacWinPt(G,n.c,w),hz=w==='n'||w==='s',ww=(hz?G.r(n.c)[2]:G.r(n.c)[3])*.4;
   const rx=hz?p[0]-ww/2:p[0]-3,ry=hz?p[1]-3:p[1]-ww/2,rw=hz?ww:6,rh=hz?6:ww;
   TAC.hits.push({t:'cell',f:vf,c:n.c,x:rx-4,y:ry-4,w:rw+8,h:rh+8});
   if(x.v){g.fillStyle='#07080a';g.fillRect(rx,ry,rw,rh);
    if(x.s>.05||x.h>.2)for(let k=0;k<3;k++){const ph=(T*.6+k/3)%1,dv=TAC_SDV[w];
     g.fillStyle=x.h>.5&&k===0?'rgba(255,120,40,'+(.6*(1-ph)).toFixed(2)+')':'rgba(120,122,128,'+((x.s*.6+.1)*(1-ph)).toFixed(3)+')';
     g.beginPath();g.arc(p[0]+dv[0]*ph*30+(hz?(k-1)*ww*.3:0),p[1]+dv[1]*ph*30+(hz?0:(k-1)*ww*.3),4+ph*9,0,TAU);g.fill()}}
   else{g.fillStyle=x.h>.3?'rgba(255,160,70,.9)':'#5d86a8';g.fillRect(rx,ry,rw,rh)}}}
 }
 // 出入口（1F）、送水口、正壓排煙送風機
 for(const e of B.ents){const d=tacEDoor(G,e),hz=e.side==='n'||e.side==='s',ef=tacEF(B,e);
  if(e.shop||e.ramp){if(vf===ef){g.fillStyle=e.lock&&e.known?'#8a2f2a':'#6b6960';if(hz)g.fillRect(d[0]-t*.22,d[1]-3,t*.44,6);else g.fillRect(d[0]-3,d[1]-t*.22,6,t*.44);
   g.fillStyle='#cfc9bb';g.font='9px '+FONT;g.textAlign='center';g.textBaseline='middle';g.fillText((e.ramp?'車道':'鐵捲門')+(e.lock&&e.known?'（鎖）':''),d[0]+TAC_SDV[e.side][0]*22,d[1]+TAC_SDV[e.side][1]*12)}continue}
  if(e.lock&&e.known&&vf===B.bf){g.fillStyle='#8a2f2a';if(hz)g.fillRect(d[0]-t*.18,d[1]-4,t*.36,8);else g.fillRect(d[0]-4,d[1]-t*.18,8,t*.36);
   g.fillStyle='#ff8a6a';g.font='600 10px '+FONT;g.textAlign='center';g.textBaseline='middle';g.fillText('上鎖',d[0]-TAC_SDV[e.side][0]*16,d[1]-TAC_SDV[e.side][1]*14)}
  if(tacAcc(B)&&vf===B.bf&&e===(B.ents.find(x=>x.side===B.arr)||B.ents[0])){const dv=TAC_SDV[e.side],bx2=d[0]+dv[0]*40+(dv[0]?0:-34),by2=d[1]+dv[1]*40+(dv[1]?0:-34);
   g.fillStyle='#e9e7e0';g.fillRect(bx2-9,by2-7,18,14);g.fillStyle='#2a2a27';for(let k=0;k<3;k++)g.fillRect(bx2-7,by2-5+k*4,14,2);
   g.fillStyle='#e9a13b';g.font='600 10px '+FONT;g.textAlign='center';g.textBaseline='top';g.fillText('管制板',bx2,by2+8)}
  if(B.dcS&&B.dcS.has(e.side)&&vf===B.bf){g.fillStyle='#e9a13b';g.font='600 10px '+FONT;g.textAlign='center';g.textBaseline='middle';g.fillText('門控',d[0]+TAC_SDV[e.side][0]*30,d[1]+TAC_SDV[e.side][1]*28)}
  g.fillStyle=vf===B.bf?'#e9a13b':'rgba(233,161,59,.35)';
  if(hz)g.fillRect(d[0]-t*.16,d[1]-3,t*.32,6);else g.fillRect(d[0]-3,d[1]-t*.16,6,t*.32);
  if(vf===B.bf){g.font='10px '+FONT;g.textAlign='center';g.textBaseline='middle';g.fillText('入口',d[0]+TAC_SDV[e.side][0]*14,d[1]+TAC_SDV[e.side][1]*12)}}
 if(B.sp){const d=tacDoor(G,B.sp.side),dv=TAC_SDV[B.sp.side],hz=B.sp.side==='n'||B.sp.side==='s';
  const p=[d[0]+(hz?t*.45:0)+dv[0]*6,d[1]+(hz?0:t*.45)+dv[1]*6];
  const su=B.sq.find(q=>q.u===B.sp.u);
  if(B.sp.on&&su&&TP[su.u]){g.strokeStyle='rgba(125,179,232,.9)';g.lineWidth=3.5;g.beginPath();g.moveTo(TP[su.u][0],TP[su.u][1]);g.lineTo(p[0],p[1]);g.stroke()}
  g.fillStyle=B.sp.on?'#7db3e8':'#8d8a81';g.beginPath();g.arc(p[0],p[1],6,0,TAU);g.fill();
  g.fillStyle='#eceae3';g.font='10px '+FONT;g.textAlign='center';g.textBaseline='middle';g.fillText(B.sp.on?'送水口 加壓中':'送水口',p[0]+dv[0]*30+(hz?0:0),p[1]+dv[1]*14+(hz?0:-14))}
 if(B.ppv&&B.ppvSide){const d=tacDoor(G,B.ppvSide),dv=TAC_SDV[B.ppvSide],fx=d[0]+dv[0]*22,fy=d[1]+dv[1]*22;
  g.fillStyle='#3a3d44';g.beginPath();g.arc(fx,fy,10,0,TAU);g.fill();
  g.strokeStyle='#c9d0d8';g.lineWidth=2;g.beginPath();for(let k=0;k<3;k++){const a=T*14+k*TAU/3;g.moveTo(fx,fy);g.lineTo(fx+Math.cos(a)*9,fy+Math.sin(a)*9)}g.stroke()}
 // 預計路線與指定空間：小組往目標走的路線（虛點線），目標空間外框閃動；選取中的小組最明顯
 const TCOL={attack:'125,179,232',trans:'125,179,232',guard:'125,179,232',hydro:'125,179,232',hold:'125,179,232',
  search:'93,202,165',search2:'93,202,165',roofres:'226,86,79',ritgo:'226,86,79',carry:'226,86,79',
  confine:'233,161,59',force:'233,161,59',dctrl:'233,161,59',overhaul:'240,120,60',vent:'175,169,236',npv:'175,169,236',vvent:'175,169,236',move:'236,234,227'};
 if(vf<B.F)for(const q of B.sq){
  const cc=TCOL[q.task];if(!cc||q.down)continue;
  const sel=TAC.sq===q.u,al=sel?.85:.35;
  // 路線
  if(q.tf>=0&&(q.f!==q.tf||q.c!==q.tc)){
   let pts=[];
   if(q.f>=0)pts=[[q.f,q.c]].concat(tacPath(B,q.f,q.c,q.tf,q.tc));
   else{const e=q.ent||tacBestEnt(B,q.side,q.tf,q.tc,false);if(e)pts=[[tacEF(B,e),e.c]].concat(tacPath(B,tacEF(B,e),e.c,q.tf,q.tc))}
   const on=pts.filter(p=>p[0]===vf);
   if(on.length){g.strokeStyle='rgba('+cc+','+al+')';g.lineWidth=sel?2:1.4;g.setLineDash([2,5]);g.lineDashOffset=-T*12;g.beginPath();
    if(q.f===vf){const pp=tacSqPos(B,G,q,0);if(pp)g.moveTo(pp[0],pp[1])}
    else if(q.f<0&&vf===tacEF(B,q.ent||{})&&q.ent){const d=tacEDoor(G,q.ent);g.moveTo(d[0],d[1])}
    on.forEach((p,k)=>{const c=G.ctr(p[1]);if(k===0&&q.f!==vf&&!(q.f<0&&q.ent&&vf===tacEF(B,q.ent)))g.moveTo(c[0],c[1]);else g.lineTo(c[0],c[1])});
    g.stroke();g.setLineDash([])}}
  // 指定空間
  const ex=q.task==='trans'||q.task==='sky'||q.ty==='ladder';
  const tf=ex?q.lf:q.task==='vvent'?B.F-1:q.tf,tc=ex?q.lc:q.task==='vvent'?q.vc:q.tc;
  if(tf===vf&&tc!==undefined&&tf>=0&&q.task!=='idle'&&q.task!=='rit'&&q.task!=='exit'){const r=G.r(tc),pu=.5+.5*Math.sin(T*5+tacUidN(q.u));
   g.strokeStyle='rgba('+cc+','+(al*(.5+.5*pu)).toFixed(2)+')';g.lineWidth=sel?3:2;g.setLineDash([6,4]);g.lineDashOffset=T*20;
   g.strokeRect(r[0]+4+pu*2,r[1]+4+pu*2,r[2]-8-pu*4,r[3]-8-pu*4);g.setLineDash([])}
  if((q.task==='force'||q.task==='dctrl')&&q.dside&&vf===B.bf){const d=tacDoor(G,q.dside),pu=.5+.5*Math.sin(T*5);
   g.strokeStyle='rgba('+cc+','+(al*(.6+.4*pu)).toFixed(2)+')';g.lineWidth=2;g.beginPath();g.arc(d[0],d[1],10+pu*4,0,TAU);g.stroke()}}
 // 水線：從供水車沿道路拉到入口，再沿入室路線拉到人員身上。
 // 充水時飽滿鮮明（線越粗水壓越高）；未出水（沒水、燒破、壓力不足、尚未分到水）就扁掉變淡
 let li=0;const entN={};
 for(const q of B.sq){
  if(!(q.line||(TAC_WET[q.task]&&q.task!=='master')))continue;li++;
  const eK=((q.line&&q.lent)||q.inEnt||q.ent||{side:q.ws||'x'}).side,eI=entN[eK]=(entN[eK]||0)+1,eo=(eI-1)*5;
  const off=(li%4-1.5)*3,charged=q.line&&q.pf>0&&!(q.burst>0)&&waterOK(inc);
  const col=q.burst>0?((T*4)%1<.5?'rgba(226,86,79,.9)':'rgba(226,86,79,.25)'):charged?tacPfCol(q.pf,.95):'rgba(150,170,190,.3)';
  const lw=charged?2+2.2*q.pf:1.1;
  const pen=c2=>{g.strokeStyle=c2;g.lineWidth=lw;if(charged){g.setLineDash([10,4]);g.lineDashOffset=-T*30*Math.max(.2,q.pf)}else g.setLineDash([])};
  pen(col);
  if(q.ty==='ladder'){
   if(q.lf===vf&&TP[q.u]&&q.ext>0&&q.lside){const w=tacWinPt(G,q.lc,q.lside),tp=TP[q.u];
    g.beginPath();g.moveTo(tp[0],tp[1]);g.lineTo(tp[0]+(w[0]-tp[0])*q.ext,tp[1]+(w[1]-tp[1])*q.ext);g.stroke()}
   g.setLineDash([]);continue}
  const sp=q.line&&q.src==='sp',tp=TP[q.line?q.lu:q.u];
  if(q.task==='cover'){const b=G.band[q.cside];if(tp&&b){const cx=Math.max(b[0],Math.min(b[0]+b[2],tp[0])),cy=Math.max(b[1],Math.min(b[1]+b[3],tp[1]));
   g.beginPath();g.moveTo(tp[0],tp[1]);g.lineTo(cx,cy);g.stroke();g.setLineDash([]);
   if(charged){g.fillStyle='rgba(170,210,245,.5)';for(let k=0;k<6;k++){const ph=(T*2+k/6)%1;g.beginPath();g.arc(tp[0]+(cx-tp[0])*ph,tp[1]+(cy-tp[1])*ph,3+ph*8,0,TAU);g.fill()}}}
   g.setLineDash([]);continue}
  const ts=(B.sq.find(x=>x.u===(q.line?q.lu:q.u))||q).tside;
  // 過渡射水：車 → 沿道路 → 窗外的射水手
  if(q.task==='sky'){g.setLineDash([]);continue} // 車頂砲塔：不拉水帶
  if(q.task==='trans'){const pp=tacSqPos(B,G,q,0);if(tp&&pp){g.beginPath();g.moveTo(tp[0],tp[1]);
    const ps=tacHoseOut(B,G,ts,tp,q.ws||q.side,pp,eo);for(let k=1;k<ps.length;k++)g.lineTo(ps[k][0],ps[k][1]);g.stroke()}
   g.setLineDash([]);continue}
  const ent=(q.line&&q.lent)||q.inEnt||q.ent;
  g.beginPath();
  const ef=ent?tacEF(B,ent):B.bf;
  if(!sp&&ent&&tp){const d=tacEDoor(G,ent);
   if(vf!==ef){g.stroke();pen(charged?tacPfCol(q.pf,.35):'rgba(150,170,190,.15)');g.beginPath()} // 地面段在其他樓層畫淡
   const ps=tacHoseOut(B,G,ts,tp,ent.side,d,eo);g.moveTo(ps[0][0],ps[0][1]);for(let k=1;k<ps.length;k++)g.lineTo(ps[k][0],ps[k][1]);
   if(q.f<0){const pp=tacSqPos(B,G,q,0);if(pp&&vf===ef)g.lineTo(pp[0],pp[1])}
   if(vf!==ef){g.stroke();pen(col);g.beginPath()}}
  // 本層經過的節點：從入口（或送水口出水的樓梯間）沿入室路線到人員
  const f0=sp?q.f:ef,c0=sp?tacNearStair(B,q.f,q.c):ent?ent.c:0;
  if(q.f>=0&&vf<B.F){const pts=[[f0,c0]].concat(tacPath(B,f0,c0,q.f,q.c)).filter(p=>p[0]===vf);
   let first=!(vf===ef&&!sp&&ent&&tp);
   for(const p of pts){const c=G.ctr(p[1]);if(first){g.moveTo(c[0]+off,c[1]+off);first=false}else g.lineTo(c[0]+off,c[1]+off)}
   if(q.f===vf){const pp=tacSqPos(B,G,q,0);if(pp&&pts.length)g.lineTo(pp[0],pp[1])}
   else if(pts.length===1&&vf!==B.bf){const c=G.ctr(pts[0][1]);g.lineTo(c[0]+off,c[1]-t*.5)}}
  g.stroke();g.setLineDash([])}
 // 雲梯：只畫在目標樓層
 for(const q of B.sq){
  if(q.ty!=='ladder'||q.lf!==vf||!q.lside||q.task==='idle'||!TP[q.u]||q.tmv)continue;
  const mid={n:[G.bx+G.bw/2,G.by],s:[G.bx+G.bw/2,G.by+G.bh],w:[G.bx,G.by+G.bh/2],e:[G.bx+G.bw,G.by+G.bh/2]};
  const tp=TP[q.u],w=q.task==='roofres'?mid[q.lside]:q.task==='roof'?tacDoor(G,q.lside):tacWinPt(G,q.lc,q.lside);
  const bx=tp[0],by=tp[1],ex=bx+(w[0]-bx)*q.ext,ey=by+(w[1]-by)*q.ext,a=Math.atan2(ey-by,ex-bx),nx=-Math.sin(a)*5,ny=Math.cos(a)*5;
  g.strokeStyle='#d8d4c8';g.lineWidth=2;g.beginPath();g.moveTo(bx+nx,by+ny);g.lineTo(ex+nx,ey+ny);g.moveTo(bx-nx,by-ny);g.lineTo(ex-nx,ey-ny);
  const len=Math.hypot(ex-bx,ey-by);for(let k=7;k<len;k+=7){const u=k/len;g.moveTo(bx+(ex-bx)*u+nx,by+(ey-by)*u+ny);g.lineTo(bx+(ex-bx)*u-nx,by+(ey-by)*u-ny)}g.stroke();
  if(q.ext>=1){tacMan(g,ex,ey,5,'#f3c43b',a,{scba:1});
   if(q.task==='master'&&q.line&&q.pf>0){const c=G.ctr(q.lc);g.fillStyle='rgba(170,210,245,.5)';for(let k=0;k<6;k++){const ph=(T*2+k/6)%1;
    g.beginPath();g.arc(ex+(c[0]-ex)*ph,ey+(c[1]-ey)*ph,3+ph*7,0,TAU);g.fill()}}}}
 // 小組
 const fr=Math.max(3,Math.min(8,t*.055)),slot={};TAC.sqp={};const LBL=[];   // LBL：這一幀已畫的名牌框（避免屋外小組名牌疊在一起）
 // 顯示位置平滑追隨目標位置（換位、換樓層時不瞬移），朝向依實際移動方向平滑轉動
 const now=performance.now(),fdt=Math.min(.1,(now-(TAC.vt||now))/1000);TAC.vt=now;TAC.vis=TAC.vis||{};
 for(const q of B.sq){
  if(q.ty==='ladder')continue;
  const key=q.f<0?'out'+q.side:q.f+','+q.c,k=slot[key]=(slot[key]||0)+1;
  const p0=tacSqPos(B,G,q,k-1);if(!p0){delete TAC.vis[q.u];continue}
  let v=TAC.vis[q.u];
  if(!v||v.vf!==TAC.vf||Math.hypot(p0[0]-v.x,p0[1]-v.y)>t*3)v=TAC.vis[q.u]={x:p0[0],y:p0[1],a:-Math.PI/2,sp:0,vf:TAC.vf};
  const kk=1-Math.exp(-fdt*(TAC.spd>=1?14:9)),nx=v.x+(p0[0]-v.x)*kk,ny=v.y+(p0[1]-v.y)*kk,sp=fdt>0?Math.hypot(nx-v.x,ny-v.y)/fdt:0;
  if(sp>6){const ta=Math.atan2(ny-v.y,nx-v.x);let da=ta-v.a;while(da>Math.PI)da-=TAU;while(da<-Math.PI)da+=TAU;v.a+=da*Math.min(1,fdt*10)}
  v.x=nx;v.y=ny;v.sp=v.sp+(sp-v.sp)*Math.min(1,fdt*8);
  const p=[v.x,v.y];
  const n=Math.min(4,q.n),sel=TAC.sq===q.u||TAC.ms.indexOf(q.u)>=0,moving=q.mt>0||q.wkS>0||v.sp>6;TAC.sqp[q.u]=p;
  const tgt=q.f===q.tf&&q.c===q.tc&&q.f>=0?G.ctr(q.c):null;
  let a=moving?v.a:(q.f>=0?v.a:-Math.PI/2);
  const qun=tacUidN(q.u);
  if(q.task==='attack'&&q.line&&tgt)a=-Math.PI/2+Math.sin(T*.7+qun)*.9;
  if(sel){g.strokeStyle='#e9a13b';g.lineWidth=2;g.beginPath();g.arc(p[0],p[1],fr*3.2,0,TAU);g.stroke()}
  if(q.down){const pul=.5+.5*Math.sin(T*8);g.fillStyle='rgba(226,86,79,'+(.3+.35*pul).toFixed(2)+')';g.beginPath();g.arc(p[0],p[1],fr*4,0,TAU);g.fill()}
  if(q.ty==='robot'){g.save();g.translate(p[0],p[1]);g.rotate(a);g.fillStyle='#6b7f96';scRR(g,-fr*1.6,-fr*1.1,fr*3.2,fr*2.2,2);g.fill();
   g.fillStyle='#222';g.fillRect(-fr*1.6,-fr*1.4,fr*3.2,fr*.4);g.fillRect(-fr*1.6,fr*1,fr*3.2,fr*.4);g.fillStyle='#c9d3e0';g.fillRect(fr*.8,-fr*.25,fr*1.4,fr*.5);g.restore()}
  else for(let i=0;i<n;i++){
   // 行進時成縱隊、步伐擺動；靜止時散開成小圈
   const gait=moving?Math.sin(T*11+i*1.7):0,sp2=moving?1.9:1.5,lat=moving?((i%2)-.5)*fr*1.1:Math.sin(i*2.1+qun)*fr*1.3;
   const ox=Math.cos(a)*(-i*fr*sp2)+Math.cos(a+Math.PI/2)*lat+Math.cos(a)*gait*fr*.15,oy=Math.sin(a)*(-i*fr*sp2)+Math.sin(a+Math.PI/2)*lat+Math.sin(a)*gait*fr*.15;
   const col=q.ty==='resc'?'#f6f6f2':'#f3c43b',coat=q.ty==='resc'?'#c8332c':'#1e2c52';
   tacMan(g,p[0]+ox,p[1]+oy,fr,col,q.down?a+Math.PI/2:a+gait*.18,{scba:q.f>=0||q.task==='rit',coat,step:gait})}
  if(q.task==='sky'&&q.line&&q.pf>0&&q.lf===vf){const tp2=TAC.tp&&TAC.tp[q.u],c2=G.ctr(q.lc);
   if(tp2){g.fillStyle='rgba(170,210,245,.6)';for(let k=0;k<12;k++){const ph=(T*2.8+k/12)%1,sp=(k%3-1)*.1;
    const ex=tp2[0]+(c2[0]-tp2[0])*ph,ey=tp2[1]+(c2[1]-tp2[1])*ph-Math.sin(ph*Math.PI)*22;g.beginPath();g.arc(ex+sp*24,ey,2.5+ph*7,0,TAU);g.fill()}}}
  if(q.task==='trans'&&q.line&&q.pf>0&&q.lf===vf&&q.side===q.ws){const c2=G.ctr(q.lc);
   g.fillStyle='rgba(170,210,245,.55)';for(let k=0;k<8;k++){const ph=(T*2.4+k/8)%1,sp=(k%3-1)*.12;
    const ex=p[0]+(c2[0]-p[0])*ph,ey=p[1]+(c2[1]-p[1])*ph-Math.sin(ph*Math.PI)*12;g.beginPath();g.arc(ex+sp*20,ey,2+ph*6,0,TAU);g.fill()}}
  if(q.frc>0){g.fillStyle='rgba(0,0,0,.6)';g.fillRect(p[0]-14,p[1]+fr*2.2,28,4);g.fillStyle='#e9a13b';g.fillRect(p[0]-14,p[1]+fr*2.2,28*Math.min(1,q.frc/(q.ty==='resc'?4:9)),4)}
  if(q.task==='attack'&&q.line&&q.pf>0&&!q.burst&&tgt&&!q.down){
   g.fillStyle='rgba(170,210,245,.5)';const rch=t*.4*Math.max(.25,q.pf);
   for(let k=0;k<7;k++){const ph=(T*2.2+k/7)%1,sp=(k%3-1)*.25;
    g.beginPath();g.arc(p[0]+Math.cos(a+sp)*(fr*2+ph*rch),p[1]+Math.sin(a+sp)*(fr*2+ph*rch),fr*(.3+ph*.7),0,TAU);g.fill()}}
  if(q.carry){g.fillStyle='rgba(236,234,227,.95)';g.save();g.translate(p[0],p[1]);g.rotate(a);g.fillRect(-fr*3,-fr*.6,fr*2.4,fr*1.2);
   g.fillStyle='#7a4a9a';g.fillRect(-fr*2.8,-fr*.4,fr*1.6,fr*.8);g.restore()}
  g.font='10px '+FONT;g.textAlign='left';g.textBaseline='bottom';
  const lt=(q.down?'MAYDAY ':'')+(q.task==='rit'||q.task==='ritgo'?'RIT ':'')+q.cs+(q.line&&q.f>=0?' '+Math.round(q.pf*100)+'%':''),lw=g.measureText(lt).width;
  let lx=p[0]-fr*2,ly=p[1]-fr*3,shown=true;
  const hitL=y=>LBL.some(r=>lx<r[0]+r[2]&&lx+lw>r[0]&&y-11<r[1]+r[3]&&y>r[1]);
  if(hitL(ly)&&!sel&&!q.down){if(!hitL(ly-11))ly-=11;else if(!hitL(ly+fr*6+11))ly+=fr*6+11;else shown=q.f>=0}   // 屋外擠在一起時往上下讓位，仍重疊就不寫名字（選取或倒地一定顯示）
  if(shown){LBL.push([lx,ly-11,lw,11]);
  g.fillStyle=q.down?'#ff5a4a':sel?'#e9a13b':'rgba(236,234,227,.9)';
  g.fillText(lt,lx,ly);
  if(q.ty!=='robot'&&tacAcc(B)){g.fillStyle='rgba(0,0,0,.6)';g.fillRect(lx,ly+1,26,3);
   g.fillStyle=q.air<.25?'#e2564f':q.air<.5?'#e9a13b':'#5dcaa5';g.fillRect(lx,ly+1,26*q.air,3)}}
  TAC.hits.unshift({t:'sq',id:q.u,x:p[0]-fr*3.5,y:p[1]-fr*4,w:fr*7,h:fr*7})}
 // 對話泡泡：入室小組喊話（約 3 秒）
 {const now=performance.now(),BB=[];for(const q of B.sq){if(!q.say||now-q.say.t>3000)continue;const p=TAC.sqp[q.u];if(!p||!tacIn(q)||q.f!==vf)continue;
  g.font='600 11px '+FONT;const w=g.measureText(q.say.s).width+12,bx=p[0]-w/2;let by=p[1]-fr*4-24;
  while(BB.some(r=>bx<r[0]+r[2]&&bx+w>r[0]&&by<r[1]+20&&by+20>r[1]))by-=22;BB.push([bx,by,w]);   // 泡泡重疊就往上疊
  const a=Math.min(1,(3000-(now-q.say.t))/400);
  g.globalAlpha=a;g.fillStyle='rgba(250,248,240,.95)';scRR(g,bx,by,w,18,6);g.fill();g.beginPath();g.moveTo(p[0]-4,by+18);g.lineTo(p[0]+4,by+18);g.lineTo(p[0],by+24);g.fill();
  g.fillStyle='#1a1a18';g.textAlign='center';g.textBaseline='middle';g.fillText(q.say.s,p[0],by+9.5);g.globalAlpha=1}}
 // 雲梯組與幫浦組也可以點車輛選取
 for(const q of B.sq){const p=TP[q.u];if(p&&(q.ty==='ladder'||q.ty==='pump'))TAC.hits.push({t:'sq',id:q.u,x:p[0]-14,y:p[1]-14,w:28,h:28});
  if(p&&(q.ty==='ladder'||q.ty==='pump')&&!TAC.sqp[q.u])TAC.sqp[q.u]=p;
  if(p&&(TAC.sq===q.u||TAC.ms.indexOf(q.u)>=0)){g.strokeStyle='#e9a13b';g.lineWidth=2;g.strokeRect(p[0]-28,p[1]-14,56,28)}}
 // 樓層概況：每層一列，寫出起火與溫度、煙、在場組數、受困、未搜索、餘燼；點選切換樓層
 g.fillStyle='#161615';g.fillRect(0,0,G.sx+G.sw+10,tH);
 g.fillStyle='#9d9a92';g.font='11px '+FONT;g.textAlign='left';g.textBaseline='top';g.fillText('樓層概況',G.sx,8);
 const ry=G.fy(B.F),rh=G.sh-3;
 if(!B.out){
 g.fillStyle=B.roof?'#2a2d33':'#24211d';g.fillRect(G.sx,ry,G.sw,rh);
 if(vf>=B.F){g.strokeStyle='#e9a13b';g.lineWidth=2;g.strokeRect(G.sx-1,ry-1,G.sw+2,rh+2)}
 g.fillStyle='#eceae3';g.font='600 11px '+FONT;g.textBaseline='middle';g.fillText('屋頂',G.sx+4,ry+rh/2);
 g.font='10px '+FONT;g.fillStyle=B.roofV&&(T*2)%1<.6?'#ff8a6a':'#9d9a92';
 g.fillText((B.rf&&B.rf.h>0?'光電板火 ':'')+(B.roof?'排煙口開 ':'')+(B.roofV?(B.roofS?'避難 '+B.roofV+' 人':'通報有人'):''),G.sx+34,ry+rh/2);
 TAC.hits.push({t:'flr',f:B.F,x:G.sx,y:ry,w:G.sw,h:rh})}
 const smk=v=>v>.7?'濃煙':v>.4?'中煙':v>.15?'薄煙':'';
 for(let f=0;f<B.F;f++){
  const y=G.fy(f),h=G.sh-3;let mh=0,ms=0,vic=0,un=0,emb=0,tmax=25;
  for(let c=0;c<B.W;c++){const x=tacCel(B,f,c);mh=Math.max(mh,x.h);ms=Math.max(ms,x.s);if(x.srch>=1)vic+=x.vic;
   if(x.ty==='room'&&x.sl<1)un++;if(x.emb)emb++;tmax=Math.max(tmax,tacParam(B,x).temp)}
  g.fillStyle=f<B.bf?'#1d1c1a':'#24211d';g.fillRect(G.sx,y,G.sw,h);
  if(ms>.05){g.fillStyle='rgba(90,92,98,'+(ms*.6).toFixed(2)+')';g.fillRect(G.sx,y,G.sw,h)}
  if(mh>.05){g.fillStyle='rgba(255,'+(120-mh*70|0)+',40,'+(.35+mh*.6).toFixed(2)+')';g.fillRect(G.sx,y+h-4,G.sw*Math.min(1,mh*1.2),4)}
  if(f===vf){g.strokeStyle='#e9a13b';g.lineWidth=2;g.strokeRect(G.sx-1,y-1,G.sw+2,h+2)}
  if(f===B.bf&&B.bf){g.strokeStyle='#5dcaa5';g.lineWidth=1;g.beginPath();g.moveTo(G.sx-2,y+h+1.5);g.lineTo(G.sx+G.sw+2,y+h+1.5);g.stroke()}
  const ns=B.sq.filter(q=>q.f===f).length,dn=B.sq.some(q=>q.f===f&&q.down);
  const big=h>=30,ty=big?y+11:y+h/2;
  g.fillStyle=f===B.of&&!B.hoax?'#ff8a6a':'#eceae3';g.font='600 11px '+FONT;g.textAlign='left';g.textBaseline='middle';g.fillText(tacFlr(B,f),G.sx+4,ty);
  if(ns){g.fillStyle=dn&&(T*3)%1<.5?'#ff5a4a':'#f3c43b';g.textAlign='right';g.fillText((dn?'MAYDAY ':'')+'●'+ns+' 組',G.sx+G.sw-4,ty)}
  // 摘要：火勢與溫度、煙、受困、未搜索、餘燼
  const parts=[];
  if(mh>.05)parts.push(['火 '+tmax+'°C','#ff8a5a']);else if(ms>.15)parts.push([smk(ms),'#b5b2aa']);
  if(vic)parts.push(['受困 '+vic,'#ff6a5a']);else if(f===B.hint&&B.cells.some(x=>x.f===f&&(x.vic||x.hid)&&x.srch<1))parts.push(['通報有人','#e9a13b']);
  if(B.cells.some(x=>x.f===f&&x.rep&&x.srch<1))parts.push(['民眾指稱','#e9a13b']);
  if(un&&(mh>.05||f===B.hint||ns))parts.push(['未搜 '+un,'#7db3e8']);
  if(emb)parts.push(['餘燼 '+emb,'#f08a3c']);
  if(B.cz&&B.cz.has(f))parts.unshift(['坍塌','#ff5a4a']);
  g.font='10px '+FONT;g.textAlign='left';
  let px=big?G.sx+4:G.sx+30;const py=big?y+h-12:y+h/2;
  for(const pr of parts){const w=g.measureText(pr[0]).width;if(px+w>G.sx+G.sw-(big?2:44))break;g.fillStyle=pr[1];g.fillText(pr[0],px,py);px+=w+6}
  TAC.hits.push({t:'flr',f,x:G.sx,y,w:G.sw,h})}
 // 提示列
 g.font='12px '+FONT;g.textAlign='left';g.textBaseline='top';g.fillStyle='rgba(236,234,227,.85)';
 const sq=B.sq.find(q=>q.u===TAC.sq);
 g.fillText((B.out?'場區平面（'+(B.wind?B.wind.nm:'')+'）':vf>=B.F?'屋頂':tacFlr(B,vf)+' 平面'+(vf<B.bf?'（地下室：無對外窗）':''))+'　'+(sq?(TAC.ord?'【'+sq.cs+'】'+(tacTN(B,TAC.ord)||TAC.ord)+'：'+((TAC_ORD.find(o=>o[0]===TAC.ord)||[])[3]||'').split('｜')[1]+'（Esc 取消）':'【'+sq.cs+'】點空間＝預設指令；點道路＝移車'):'點選小組或車輛（或按 1–9），再點房間、走廊或道路；左側／滾輪／[ ] 切換樓層'),G.sx+G.sw+18,8);
 // 坍塌樓層：整層斜線遮罩
 if(B.cz&&B.cz.has(vf)){g.save();g.beginPath();g.rect(G.bx,G.by,G.bw,G.bh);g.clip();g.fillStyle='rgba(60,20,15,.55)';g.fillRect(G.bx,G.by,G.bw,G.bh);
  g.strokeStyle='rgba(255,90,60,.35)';g.lineWidth=3;for(let k=-G.bh;k<G.bw;k+=22){g.beginPath();g.moveTo(G.bx+k,G.by+G.bh);g.lineTo(G.bx+k+G.bh,G.by);g.stroke()}g.restore();
  g.fillStyle='#ff8a6a';g.font='700 18px '+FONT;g.textAlign='center';g.textBaseline='middle';g.fillText('樓板坍塌・禁止進入',G.bx+G.bw/2,G.by+G.bh/2)}
 // 樓梯間：前進指揮所、消防專用升降機
 if(vf<B.F){const r0=G.r(0);g.font='600 10px '+FONT;g.textAlign='center';g.textBaseline='bottom';
  if(B.fwd&&vf===B.fwd.f){g.fillStyle=tacFwdOK(B)?'#5dcaa5':'#9d9a92';g.fillText('前進指揮所',r0[0]+r0[2]/2,r0[1]-2)}
  if(B.elev&&vf>=B.bf){g.fillStyle=B.elOn&&vf<=tacElevTop(B)?'#7db3e8':'#6b6960';g.textBaseline='top';g.fillText(B.elOn&&vf<=tacElevTop(B)?'升降機 ●':'升降機',r0[0]+r0[2]/2,r0[1]+r0[3]+2)}}
 // 框選框
 if(TAC.drag&&Math.hypot(TAC.drag.x1-TAC.drag.x0,TAC.drag.y1-TAC.drag.y0)>8){const d=TAC.drag;
  g.strokeStyle='#e9a13b';g.lineWidth=1.5;g.setLineDash([5,4]);g.strokeRect(Math.min(d.x0,d.x1),Math.min(d.y0,d.y1),Math.abs(d.x1-d.x0),Math.abs(d.y1-d.y0));g.setLineDash([]);
  g.fillStyle='rgba(233,161,59,.08)';g.fillRect(Math.min(d.x0,d.x1),Math.min(d.y0,d.y1),Math.abs(d.x1-d.x0),Math.abs(d.y1-d.y0))}
 // 事件暫停橫幅
 if(paused&&TAC.pmsg){g.font='700 14px '+FONT;const tw=Math.min(tW-200,g.measureText(TAC.pmsg).width+180);const bx=(tW-tw)/2+40;
  g.fillStyle='rgba(120,24,20,.92)';g.fillRect(bx,34,tw,30);g.fillStyle='#fff';g.textAlign='center';g.textBaseline='middle';
  g.fillText('⏸ 事件暫停：'+TAC.pmsg+'　（空白鍵繼續）',bx+tw/2,49)}
 // 空間參數提示框（滑鼠停留的空間）
 const hv=TAC.hov;
 if(hv&&vf<B.F){const h0=TAC.hits.find(h=>h.t==='cell'&&hv.x>=h.x&&hv.x<=h.x+h.w&&hv.y>=h.y&&hv.y<=h.y+h.h);
  if(h0){const x=tacCel(B,h0.f,h0.c),P=tacParam(B,x),n=L.N[h0.c];
   const nm0=tacNm(B,h0.f,h0.c),kn=n.ty==='room'?TAC_RK[tacK(B,h0.f,h0.c)].n:'';const rows=[[nm0+(kn&&!nm0.includes(kn)?'　'+kn:''),'#eceae3'],
    ['溫度　'+P.temp+' °C',P.temp>500?'#ff6a5a':P.temp>150?'#e9a13b':'#9d9a92'],
    ['能見度　'+P.vis+' m',P.vis<1?'#ff6a5a':P.vis<5?'#e9a13b':'#9d9a92'],
    ['燃燒面積　'+P.burn+' / '+P.area+' ㎡',P.burn?'#ff8a5a':'#9d9a92'],
    ['含氧量　'+P.o2+' %',P.o2<14?'#ff6a5a':P.o2<18?'#e9a13b':'#9d9a92']];
   {const ws=tacWinSt(B,x,n);rows.push(['對外窗戶　'+ws[0],ws[1]])}
   if(x.gm){const a=Math.round((S.t-x.gm.t)/60);rows.push(['氣體偵測（'+(a?a+' 分鐘前':'剛剛')+'）','#7db3e8']);
    for(const gk of TAC_GAS)rows.push(['　'+gk[1]+'　'+x.gm[gk[0]]+' '+gk[2],tacGasCol(gk[0],x.gm[gk[0]])])}
   if(x.emb)rows.push(['餘燼未處理（可能復燃）','#ff8a5a']);
   if(n.ty==='room')rows.push([x.sl>=2?'已次級搜索':x.sl===1?'已初期搜索':'未搜索','#7db3e8']);
   if(x.o2<13&&x.h>.35&&!x.v)rows.push(['⚠ 缺氧悶燒：開口可能爆燃','#ff6a5a']);
   if(x.h>.7&&x.s>.6&&!x.fl&&!x.vv)rows.push(['⚠ 閃燃前兆','#ff6a5a']);
   g.font='12px '+FONT;const bw=Math.max(170,...rows.map(r=>g.measureText(r[0]).width))+16,bh=rows.length*16+10;
   let bx=hv.x+16,by=hv.y+12;if(bx+bw>tW-4)bx=hv.x-bw-12;if(by+bh>tH-4)by=tH-bh-4;
   g.fillStyle='rgba(12,12,11,.92)';g.fillRect(bx,by,bw,bh);g.strokeStyle='rgba(255,255,255,.18)';g.lineWidth=1;g.strokeRect(bx,by,bw,bh);
   g.font='12px '+FONT;g.textAlign='left';g.textBaseline='top';
   rows.forEach((r,k)=>{g.fillStyle=r[1];g.fillText(r[0],bx+8,by+6+k*16)})}}
 if(B.mayday){g.fillStyle='rgba(226,86,79,'+(.6+.4*Math.sin(T*8)).toFixed(2)+')';g.font='700 14px '+FONT;g.textAlign='right';g.fillText('MAYDAY × '+B.mayday+'　'+B.sq.filter(q=>q.down).map(q=>q.cs+' '+tacFlr(B,q.f)).join('、'),tW-10,8)}}
// 面板 HTML
function tacTopHTML(inc){
 const B=inc.tac,others=S.inc.filter(i=>i!==inc),wait=others.filter(i=>!onScene(i).length).length;
 let idle=0;for(const u of S.units)if(u.st==='idle')idle++;
 return '<b class="tt">⚔ 戰術指揮</b><span class="tadr" title="'+esc((inc.nm||KIND[inc.k].n)+' · '+inc.addr)+'">'+esc(inc.nm||KIND[inc.k].n)+' · '+esc(inc.addr)+'</span>'+
  '<span class="chip"><i>時</i><b>'+fmt(S.t)+'</b></span><span class="chip" title="自進入戰術指揮起經過的現實時間（換算）"><i>現場</i><b>'+fmt((S.t-(B.ti??(B.ti=S.t)))*TAC_RT)+'</b></span><span class="chip"><i>進度</i><b>'+Math.round(Math.min(1,inc.work/inc.dur)*100)+'%</b></span>'+
  '<span class="chip"><i>評鑑</i><b>'+Math.round(S.rep)+'</b></span>'+
  '<span class="strat">戰略 AI 代理中：其他案件 '+others.length+' 件'+(wait?'（待派 '+wait+'）':'')+' · 待命 '+idle+' 車</span>'+
  '<span class="sp"></span><span class="tmsg" title="'+esc(msg||'')+'">'+esc(msg||'')+'</span>'+
  '<span class="tspd" title="戰術畫面中 1 秒相當於現實幾秒（場內動作以約 1:10 模擬，倍率 0.3 即 1:3）">時間 1:'+TAC_SPDS.map(v=>'<button data-tspd="'+v+'"'+(Math.abs(TAC.spd-v)<.001?' class="on"':'')+'>'+Math.round(v*10)+'</button>').join('')+'</span>'+
  '<button data-tap="1"'+(TAC.autoPause?' class="on"':'')+' title="MAYDAY、閃燃、爆燃、結構警告等重大事件時自動暫停">事件暫停</button>'+
  '<span class="tspd">樓層 '+tacFlr(B,TAC.vf)+' <button data-tfl="1" title="上一層（]）">▲</button><button data-tfl="-1" title="下一層（[）">▼</button></span>'+
  '<button data-tpause="1">'+(paused?'繼續':'暫停')+'</button>'+
  (B.hOK&&!B.done?'<button data-thand="1" class="hand" title="火勢已撲滅、受困者與傷患都已處置：留轄區分隊一輛幫浦車殘火處理，其餘車輛返隊，回到指揮中心">交給轄區分隊善後</button>':'')+
  '<button data-texit="1">返回指揮中心（交由 AI 指揮）</button>'}
function tacSideHTML(inc){
 const B=inc.tac,L=tacCapAll(inc,B),used=B.sq.filter(q=>q.line).length;
 let unk=0;for(const x of B.cells)if(x.ty==='room'&&x.sl<1)unk++;
 let sumH=0;for(const x of B.cells)sumH+=x.h;
 const rit=B.sq.filter(q=>q.task==='rit'||q.task==='ritgo').map(q=>q.cs);
 // 精簡概況：一行
 const chip=(k,v,c)=>'<span class="tch"><i>'+k+'</i><b'+(c?' style="color:'+c+'"':'')+'>'+v+'</b></span>';
 let h='<div class="tstat">'+chip(B.hoax?'報案樓層':'起火',tacFlr(B,B.of))+chip('火勢',B.hoax?'無':Math.round(sumH/Math.max(.001,B.peak)*100)+'%')+
  chip('受困',B.vtot)+chip('救出',B.resc+(B.lost?' · 罹難 '+B.lost:''),B.lost?'var(--red)':'')+chip('未搜',unk+' 室')+
  chip('RIT',rit.length?rit.join('、'):'未編成',rit.length?'':'var(--amb)')+'</div>';
 h+=trainGoalsHTML(inc);
 if(!tacAcc(B))h+='<div class="note">尚未設置人員管制板：看不到各組入室時間與氣量。開設指揮站並指派安全官後約 10 秒完成設置。</div>';
 if(B.mayday)h+='<div class="note" style="background:var(--red);color:#111">MAYDAY：'+B.sq.filter(q=>q.down).map(q=>q.cs+' '+tacFlr(B,q.f)).join('、')+'</div>';
 if(B.lodd)h+='<div class="note">殉職 '+B.lodd+' 組</div>';
 // ===== 分頁：概況 =====
 h+='\u0001ov';
 // 幕僚建議（有開設指揮站才有幕僚）
 const hs=tacHints(inc,B);
 h+='<div class="hd mt">幕僚建議</div>'+(hs?(hs.length?hs.map(x=>'<div class="thint">'+esc(x)+'</div>').join(''):'<div class="sub">目前沒有特別建議。</div>'):'<div class="sub" style="color:var(--fg3)">未開設指揮站，沒有幕僚提供建議。</div>');
 // 化學災害：化學品、洩漏、防護衣套數、除污站、化災應變隊
 const cap=tacPPECap(inc);
 if(B.chem||cap.A||B.sq.some(q=>q.epa)){const rw=(a,b)=>'<div class="row"><span>'+a+'</span><span>'+b+'</span></div>';
  h+='<div class="hd mt">化學災害</div><div class="twater">';
  if(B.chem)h+=rw('化學品',B.chemK?'<b>'+esc(B.chem.n)+'</b>（'+(B.chem.fuel?'消防衣＋空氣呼吸器':['','C','B','A'][B.chem.lv]+' 級以上')+'）':'<b style="color:#b9a0ee">未辨識</b>');
  if(B.leak)h+=rw('洩漏',B.leak.on?'<b style="color:var(--red)">持續外洩（'+esc(tacNm(B,B.leak.f,B.leak.c))+'）</b>':'已止漏');
  h+=rw('防護衣',cap.A||cap.B?'A 級 '+(cap.A-tacPPEUsed(B,'A'))+'/'+cap.A+'　B 級 '+(cap.B-tacPPEUsed(B,'B'))+'/'+cap.B+'　C 級 不限':'<span class="sub">無化災車（僅 C 級）</span>');
  if(B.chem&&!B.chem.fuel)h+=rw('除污站',B.st.decon?'已開設':'<span style="color:var(--amb)">未開設</span>'+(B.sq.some(q=>q.cont)?'（'+B.sq.filter(q=>q.cont).length+' 組待除污）':''));
  if(EPA_K(inc.k))h+=rw('環保署化災應變隊',!inc.epa?'<button data-tepa="1">請求支援</button>':inc.epa===1?'集結中 '+fmt(inc.epaT):inc.epa===2?'前往中 '+Math.ceil(inc.epaT)+' 秒':'<b style="color:var(--grn)">已到場</b>');
  if(B.wind)h+=rw('風向',B.wind.nm);
  h+='</div>'}
 else if(B.wind)h+='<div class="hd mt">風向</div><div class="twater"><div class="row"><span>'+B.wind.nm+'</span><span class="sub">順風延燒快、會飛火</span></div>'+
  (B.wui?'<div class="row"><span>外圍山火'+(B.fside?'（'+TAC_SDN[B.fside]+'側）':'')+'</span><span>'+(B.wh>.05?'<b style="color:var(--red)">逼近中 '+Math.round(B.wh*100)+'%</b>':'已過境')+'</span></div><div class="row"><span>民宅</span><span>'+(B.homeLost?'<b style="color:var(--red)">燒毀 '+B.homeLost+' 棟</b>':'安全')+'</span></div>':'')+'</div>';
 // 結構與設施
 h+='<div class="hd mt">結構與設施</div><div class="twater">';
 if(!B.hoax){const dm=Math.min(1,B.dmg||0);h+='<div class="row"><span>結構受損（穩定度'+(inc.pm.stab||'—')+'）</span><span>'+Math.round(dm*100)+'% <span class="tbar"><i style="width:'+Math.round(dm*100)+'%;background:'+(dm>=.8?'var(--red)':dm>=.5?'var(--amb)':'var(--grn)')+'"></i></span></span></div>';
  if(B.cz)h+='<div class="row"><span>坍塌樓層</span><b style="color:var(--red)">'+[...B.cz].map(f=>tacFlr(B,f)).join('、')+'</b></div>'}
 if(B.spk)h+='<div class="row"><span>自動撒水設備</span><span>'+(!B.spk.ok?'<b style="color:var(--red)">未動作（關閉或故障）</b>':Object.keys(B.spk.fl).length?'<b style="color:#7db3e8">動作中：'+Object.keys(B.spk.fl).map(f=>tacFlr(B,+f)).join('、')+'</b>'+(B.sp&&!B.sp.on?'（送水口加壓可增強）':''):'待機')+'</span></div>';
 if(B.staff)h+='<div class="row"><span>機構人員</span><span>'+(B.staff.n>0?B.staff.n+' 名進行水平避難':'已撤離')+'</span></div>';
 if(B.gasL)h+='<div class="row"><span>瓦斯管線</span><span>'+(B.gasL.t>0?'<b style="color:var(--red)">持續供氣，欣高關閥約 '+Math.ceil(B.gasL.t)+' 秒</b>':'已關閥')+'</span></div>';
 if(B.rf)h+='<div class="row"><span>屋頂光電板</span><span>'+(B.rf.h>0?'<b style="color:var(--red)">燃燒 '+Math.round(B.rf.h*100)+'%</b>　'+(inc.pow>=2?'已斷電':'帶電中'):'已撲滅')+'</span></div>';
 if(B.ext)h+='<div class="row"><span>外牆室外機</span><span>'+(B.ext.h>0?'<b style="color:var(--red)">燃燒 '+Math.round(B.ext.h*100)+'%</b>（'+tacNm(B,B.ext.f,B.ext.c)+'窗外）':'已撲滅')+'</span></div>';
 if(B.fd&&B.fd.size){const kv=[...B.fd.values()].filter(d=>B.fdK.has(d.f)),bad=kv.filter(d=>d.t==='gone'||d.t==='wedge');
  h+='<div class="row"><span>樓梯間防火門</span><span>'+(!kv.length?'未查明':bad.length?'<b style="color:var(--red)">'+[...new Set(bad.map(d=>tacFlr(B,d.f)))].join('、')+' 異常</b>':'已查 '+B.fdK.size+' 層正常')+'</span></div>'}
 if(B.elev)h+='<div class="row"><span>消防專用升降機</span><span>'+(B.elOn?'<b style="color:var(--grn)">消防模式運轉（至 '+tacFlr(B,Math.max(B.bf,tacElevTop(B)))+'）</b>':B.elT>0?'切換中…':'<button data-telev="1"'+(B.st.icp?'':' disabled title="需先開設指揮站"')+'>啟用</button>')+'</span></div>';
 if(B.fwd)h+='<div class="row"><span>前進指揮所</span><span>'+tacFlr(B,B.fwd.f)+' · '+(tacFwdOK(B)?'就位':'前往中')+' · 備用瓶 '+(B.st.air?'充填區供應':B.fwd.stock)+'</span></div>';
 h+='</div>';
 // 氣體偵測紀錄（最近 4 筆）
 {const gs=B.cells.filter(x=>x.gm).sort((a,b)=>b.gm.t-a.gm.t).slice(0,4);
  if(gs.length){h+='<div class="hd mt">氣體偵測</div>';for(const x of gs){const r=x.gm;
   h+='<div class="row" style="flex-wrap:wrap"><span>'+esc(tacNm(B,x.f,x.c))+'</span><span>'+TAC_GAS.map(k=>'<b style="color:'+tacGasCol(k[0],r[k[0]])+'">'+k[1]+' '+r[k[0]]+'</b>').join(' ')+'</span></div>'}}}
 // 請求增援
 if(maAny(inc)){h+='<div class="hd mt">跨縣市支援</div><div class="tords">'+Object.keys(MA_DEF).filter(k=>maOK(inc,k)).map(k=>{const D=MA_DEF[k],st=inc.ma&&inc.ma[k];
  return st?'<span class="sub">'+D.cs+'：'+(maStat(inc,k)||'已返隊')+'</span>':'<button data-tma="'+k+'" title="'+D.fx+'"'+(S.rep-D.cost<5?' disabled':'')+'>'+D.cs+'（評鑑 -'+D.cost+'）</button>'}).join('')+'</div>'}
 h+='<div class="hd mt">請求增援</div><div class="tords">'+TAC_REQ.map(r=>{const n=S.units.filter(u=>u.st==='idle'&&r[2].indexOf(u.code)>=0).length;
  return'<button data-treq="'+r[0]+'"'+(n?'':' disabled')+'>'+r[1]+' <span class="sub">'+n+'</span></button>'}).join('')+'</div>';
 // 現場民眾
 // 現場民眾：對談紀錄（進場時民眾先描述火場基本狀況），下方為還沒問過的問題
 if(B.civ&&(tacCivOn(B)||B.civ.log)){if(tacCivOn(B))tacCivOpen(inc,B);
  h+='<div class="hd mt">現場'+tacCivWho(inc)+(tacCivOn(B)?'（'+B.civ.n+' 人，可詢問屋內資訊）':'（已離開）')+'</div><div class="civlog">';
  for(const l of(B.civ.log||[]).slice().reverse())h+='<div class="'+(l.w==='民'?'cm':'cf')+'"><b>'+(l.w==='民'?tacCivWho(inc):'指揮官')+'</b>'+esc(l.s)+'</div>';
  h+='</div>';
  if(tacCivOn(B)&&TAC_ASK.some(a=>!B.civ.asked[a.k]))h+='<div class="sub">指揮官持續詢問中…</div>'}
 // ===== 分頁：水線 =====
 h+='\u0001wt';
 // 水源與水線
 const tp=tankPool(inc),inflow=Math.round(inflowOf(inc)),flowing=B.sq.filter(q=>q.line&&q.pf>0&&!(q.burst>0));
 const use=flowing.length*LPS,hydU=B.hyd&&B.sq.find(q=>q.ty==='pump'&&q.tside===B.hyd.side&&!q.tmv);
 const bar=(v,c)=>'<span class="tbar"><i style="width:'+Math.round(Math.max(0,Math.min(1,v))*100)+'%;background:'+c+'"></i></span>';
 h+='<div class="hd mt">水源與水線</div><div class="twater">';
 h+='<div class="row"><span>水源</span><span>'+(B.hyd?'消防栓 '+TAC_SDN[B.hyd.side]+'側 '+B.hyd.d+' m · '+(hydU?'<b style="color:var(--grn)">'+hydU.cs+' 佔水</b>':'<b style="color:var(--red)">未佔水，只能用水箱</b>')
  :inc.shuttle?'無消防栓，幫浦車輪流補水':inc.tender?'無消防栓，水庫車供水':'—')+'</span></div>';
 h+='<div class="row"><span>供水／用水</span><span>'+inflow+' / '+use+' L/s '+bar(inflow?use/inflow:use?1:0,use>inflow?'var(--red)':'var(--blu)')+'</span></div>';
 if(tp[1])h+='<div class="row"><span>車上水箱</span><span>'+Math.round(tp[0]/tp[1]*100)+'% '+bar(tp[0]/tp[1],tp[0]/tp[1]<.25?'var(--red)':'var(--blu)')+'</span></div>';
 if(B.sp)h+='<div class="row"><span>送水口</span><span>'+TAC_SDN[B.sp.side]+'側 '+(B.sp.on?'<b style="color:var(--grn)">加壓中</b>':'未接（五層以上可用）')+'</span></div>';
 h+='<div class="row"><span>水線</span><span>出水 '+flowing.length+' · 佈設 '+used+' / 可用 '+L+' 線</span></div>';
 const ls=B.sq.filter(q=>q.ty!=='ladder'&&(q.line||TAC_WET[q.task]));
 for(const q of ls){const st=q.burst>0?['燒破','var(--red)']:!q.line?['扁帶・未分到水','var(--fg3)']:q.pf<=0?['扁帶・無壓','var(--fg3)']:[Math.round(q.pf*100)+'%',q.pf>=.7?'var(--blu)':q.pf>=.4?'var(--amb)':'var(--red)'];
  h+='<div class="tline"><b class="mono">'+q.cs+'</b><span class="sub">'+(q.src==='sp'&&q.line?'連結送水管':(q.task==='cover'?'鄰棟周界防護':'自 '+((B.sq.find(x=>x.u===q.lu)||q).cs)+((q.lent||q.inEnt)?' · '+TAC_SDN[(q.lent||q.inEnt).side]+'側入口':'')))+(q.line?' · '+q.len+' 條':'')+'</span>'+
   '<span>'+bar(q.line?q.pf:0,st[1])+' <b style="color:'+st[1]+'">'+st[0]+'</b></span></div>'}
 h+='</div>';
 // ===== 分頁：ICS（救護與編組） =====
 h+='\u0001ics';
 // 傷患集結與後送
 const cnt={red:0,yellow:0,green:0};for(const p of B.pts)cnt[p.sev]++;
 const amb=onScene(inc).filter(u=>u.code==='91'&&u.st==='work'),ambF=tacAmbFree(inc,B);
 h+='<div class="hd mt">傷患集結與後送</div><div class="row" style="padding:2px 0;flex-wrap:wrap;gap:6px"><span>'+
  '<span class="tag" style="background:var(--red)">紅 '+cnt.red+'</span> <span class="tag" style="background:var(--amb)">黃 '+cnt.yellow+'</span> <span class="tag" style="background:var(--grn)">綠 '+cnt.green+'</span></span>'+
  '<span class="sub">救護車 可用 '+ambF+' / 在場 '+amb.length+' · 已送醫 '+B.tx+'</span>'+
  '<button data-tamb="1"'+(inc.req?' disabled':'')+'>請求救護車</button></div>';
 if(B.pts.length&&!ambF)h+='<div class="sub" style="color:var(--red)">傷患在現場等待後送，傷勢持續惡化！</div>';
 // ICS 架構圖：指揮站、幕僚（安全官、聯訪處）、作業組、後勤組、救護組；每個方塊可開關（站點開設／撤除、職務指派／解除）
 h+=tacIcsHTML(inc,B);
 // ===== 分頁：無線電（含周邊） =====
 h+='\u0001rd';
 // 周邊：一行
 h+='<div class="hd mt">周邊</div><div class="sub">'+TAC_SIDES.map(x=>{const d=B.sd[x];
  return TAC_SDN[x]+' '+(d.road?d.nm+(d.big?'':'（大型車禁入）'):d.nm)+(B.exp[x]!==undefined?(B.expL[x]?'<b style="color:var(--red)"> 已延燒</b>':' 受熱 '+Math.round(B.exp[x]*100)+'%'+(B.sq.some(q=>q.task==='cover'&&q.cside===x)?'・防護中':'')):'')}).join('　')+'</div>';
 h+='<div class="hd mt">無線電</div><div class="tlog">';
 for(const l of inc.log.slice(-30).reverse())h+='<div class="'+(l.w==='台'?'lt':l.w==='民'?'lm':'lf')+'">'+esc(l.s)+'</div>';
 h+='</div>';
 // 組合分頁：上方概況列固定，下方依分頁顯示
 const parts=h.split('\u0001'),tab={};for(const p of parts.slice(1)){const k=p.match(/^(ov|wt|ics|rd)/)[1];tab[k]=p.slice(k.length)}
 const flow=B.sq.filter(q=>q.line&&q.pf>0).length,slots=tacRoleSlots(inc,B),ru=Object.values(B.role).filter(Boolean).length;
 const TABS=[['ov','概況',hs&&hs.length?hs.length:''],['wt','水線',flow+'/'+L],['ics','ICS',Object.keys(B.st).filter(k=>B.st[k]).length+(slots?' · '+ru+'/'+slots:'')],['rd','無線電','']];
 const cur=TAC.tab||'ov';
 return parts[0]+'<div class="ttabs">'+TABS.map(t=>'<button data-ttab="'+t[0]+'"'+(cur===t[0]?' class="on"':'')+'>'+t[1]+(t[2]!==''?'<i>'+t[2]+'</i>':'')+'</button>').join('')+'</div><div class="ttabc">'+(tab[cur]||'')+'</div>'}
// 管制牌看板：依狀態分欄（入室作業、屋外勤務、RIT、換瓶休息、待命、站點後勤）
function tacCat(q){
 if(q.task==='station'||q.task==='fwdgo')return'stn';
 if(q.down||tacIn(q))return'in';
 if(q.task==='rit'||q.task==='ritgo')return'rit';
 if(q.ty!=='ladder'&&q.ty!=='robot'&&(q.refill||q.prev||q.air<1||(q.fat>.5&&q.task==='idle')))return'rest';
 if(q.task==='idle'&&!q.tmv)return'idle';
 return'out'}
const TAC_COLS=[['in','入室作業'],['out','屋外勤務'],['rit','RIT'],['rest','換瓶・休息'],['idle','待命'],['stn','站點・後勤']];
// 單位看板：攜帶水線（瞄子）
function tacNoz(B,q){
 if(q.ty==='ladder')return q.task==='master'&&q.line?'雲梯瞄子':'無';
 if(q.task==='sky')return'車頂砲塔（朝天瞄）';
 if(q.ty==='pump'&&(q.line||TAC_WET[q.task])){
  const foam=q.code==='57'||q.code==='01'||q.cafs;
  if(foam&&q.f>=0&&tacCel(B,q.f,q.c).fuel)return'泡沫瞄';
  return q.task==='trans'||q.task==='cover'||q.task==='guard'||B.out||q.code==='57'?'2.5 吋瞄子':'1.5 吋瞄子'}
 if(q.ty==='pump'||q.ty==='resc'||q.ty==='crew'||q.ty==='vent')return q.ty==='pump'?'無':'滅火器';
 return'無'}
// 單位看板：攜帶裝備（依車輛器材與目前任務）
const TAC_PORT=[['TIC 熱顯像儀','TIC'],['RIT 快速救援包','RIT 包'],['破壞器材組','破門器具'],['三用敲棒','三用敲棒'],['油壓剪','油壓剪'],['照明索','照明索'],['四用氣體偵測器','氣體偵測器'],['正壓排煙機','送風機'],['負壓排煙機與排煙管','排風機'],['SKED 軟式擔架','SKED 擔架'],['生命探測器','生命探測器']];
function tacGear(B,q){
 if(q.ty==='ladder'||q.ty==='robot')return'';
 const eq=EQ[q.code]||[],g=[];
 for(const [k,n] of TAC_PORT){if(!eq.includes(k))continue;
  if(n==='RIT 包'&&!(q.task==='rit'||q.task==='ritgo'))continue;
  if((n==='送風機'&&!(B.ppv&&q.task==='ppv'))||(n==='排風機'&&q.task!=='npv'))continue;
  if((n==='生命探測器'||n==='SKED 擔架')&&!(q.task==='search'||q.task==='search2'||q.carry))continue;
  if(n==='油壓剪'&&q.task!=='force'&&q.task!=='dctrl')continue;
  g.push(n)}
 if(q.task==='gas'&&!g.includes('氣體偵測器'))g.push('氣體偵測器');
 if(tacTIC(q)&&!g.includes('TIC'))g.unshift('TIC');
 if(!tacTIC(q))g.push('無 TIC');
 if(q.vol)g.push('手電筒');
 return g.join('、')||'—'}
// 單位看板：現行動作（括號內）
function tacDoing(B,q){
 if(q.down)return'';
 if(q.tmv)return'移車中';if(q.refill==='none')return'沒有備用氣瓶，等救助車（71）開設充填區';if(q.refill)return'換瓶中';if(q.task==='dress')return'換裝中';
 if(!tacReady(q))return q.off?'整裝、交 passkey 中':'整裝中';
 if(q.task==='idle')return q.f>=0?'原地待命':'';
 if(q.task==='exit')return q.f>=0?(q.nf!==q.f&&q.mt?'下樓梯中':'撤出中'):'';
 if(q.carry)return q.nf!==q.f&&q.mt?'搬運下樓中':'搬運中';
 const at=q.f>=0&&q.f===q.tf&&q.c===q.tc;
 if(q.task==='sky'||q.task==='trans'||q.task==='cover'||(q.ty==='ladder'&&q.task==='master'))return q.line&&q.pf>0?'射水中':'等待出水';
 if(q.ty==='ladder')return q.ext<1?'架設雲梯中':'作業中';
 if((q.task==='force'||q.task==='dctrl')&&q.f<0)return q.frc>0||q.wk>0?'破壞中':q.side===q.dside?'控門中':'前往入口';
 if(q.tf>=0&&!at){if(q.f<0)return q.line?'延伸水線、前往入口':'前往入口';
  return q.mt&&q.nf!==q.f?'爬樓梯中':q.frc>0?'破門中':'移動中'}
 const D={attack:q.line&&q.pf>0?'射水中':'等待出水',hold:'守線中',confine:q.line&&q.pf>0?'射水降溫中':'等待出水',guard:'射水中',
  search:'搜索中',search2:'搜索中',overhaul:'翻搜中',force:'破壞中',dctrl:q.dcd?'控門中':'關門中',vent:'破窗中',npv:'排煙中',hydro:'排煙中',
  gas:'偵測中',rit:'待命中',ritgo:'救援中',vvent:'開孔中',stand:'加壓中',fwdgo:'設置中',fwdref:'換瓶休息中',station:'駐守中',roofres:'救援中',ident:'偵檢中',plug:'止漏中'};
 return D[q.task]||'作業中'}
function tacTagHTML(inc,B,q,i){
 const acc=tacAcc(B),inT=tacIn(q)&&q.inT?S.t-q.inT:0;
 const dn=tacDoing(B,q),task=q.down?'倒地待救（MAYDAY）':(q.task==='idle'?'待命':q.task==='station'?tacStnDef(q.stn).n:tacTN(B,q.task)||q.task)+(q.prev?'（換瓶後續行）':dn?'（'+dn+'）':'');
 const noz=tacNoz(B,q),gear=tacGear(B,q),sk=tacSk(q);
 const offS=TAC.off&&TAC.off.some(o=>o.u.id===q.u);
 const loc=offS&&!tacIn(q)&&(q.task==='idle'||q.ty==='pump')?'已抵達（畫面外）':q.ty==='ladder'&&q.lf!==undefined&&q.task!=='idle'?'雲梯→'+tacNm(B,q.lf,q.lc):tacIn(q)?tacNm(B,q.f,q.c):(q.ty==='pump'||q.ty==='ladder'?(q.tmv?'移車往'+TAC_SDN[q.tgt]+'側':TAC_SDN[q.tside]+'側'):'屋外');
 let air='';
 if(q.ty!=='robot'&&q.ty!=='ladder')air=acc?'<span class="tbar"><i style="width:'+Math.round(q.air*100)+'%;background:'+(q.air<.33?'var(--red)':q.air<.5?'var(--amb)':'var(--grn)')+'"></i></span>':'<span class="sub">氣量 ？</span>';
 return'<div class="mtag ty-'+q.ty+(q.u===TAC.sq||TAC.ms.indexOf(q.u)>=0?' sel':'')+(q.down?' dn':'')+'" data-tsq="'+q.u+'">'+
  '<div class="mh"><b>'+(i<9?(i+1)+' ':'')+q.cs+'</b><span>'+(q.cafs?'<i class="ppe" style="background:#2a6a5a" title="CAFS：可打泡沫瞄，對油火有效、對一般火效果較好">CAFS</i>':'')+(q.ppe&&q.ppe!=='F'?'<i class="ppe">'+TAC_PPE[q.ppe].n+'</i>':'')+(q.cont?'<i class="ppe cont">污染</i>':'')+(q.ma?'<i class="ppe" style="background:#3d5a80">'+maGrp(q.ma).replace(/市消防局|縣消防局/,'')+'</i>':'')+(q.usar?'<i class="ppe" style="background:#6a4a9a">特搜</i>':q.sk&&q.sk!=='reg'||q.rookie?'<i class="ppe" style="background:'+(q.sk==='volp'?'#5a7a3a':'#7a6a3a')+'">'+sk.n+'</i>':'')+(TAC_TYN[q.ty]||'')+' '+q.n+'人</span></div>'+
  '<div class="mb"><div><span class="sub">任務</span> '+task+(q.line?' 💧'+(q.burst>0?'燒破':Math.round(q.pf*100)+'%'):'')+'</div>'+
  (q.ty!=='robot'?'<div class="mg"><span class="sub">水線</span> '+noz+(gear?'　<span class="sub">裝備</span> '+gear:'')+'</div>':'')+
  '<div class="mf"><span class="sub">'+loc+'</span>'+(inT&&acc?'<span class="sub">入室 '+fmt(inT)+'</span>':'')+air+(q.ty!=='robot'&&q.ty!=='ladder'&&q.fat>.4?'<span class="sub" style="color:'+(q.fat>.7?'var(--red)':'var(--amb)')+'">疲勞 '+Math.round(q.fat*100)+'%</span>':'')+'</div></div></div>'}
function tacBotHTML(inc){
 const B=inc.tac,sq=B.sq.find(q=>q.u===TAC.sq);
 // 沒有小組的欄位縮窄，讓有小組的欄位寬一點
 const cols=TAC_COLS.map(c=>[c,B.sq.map((q,i)=>[q,i]).filter(x=>tacCat(x[0])===c[0])]);
 let h='<div class="tboard" style="--cols:'+cols.map(x=>x[1].length?'minmax(0,1fr)':'minmax(0,.45fr)').join(' ')+'">';
 for(const [c,qs] of cols){
  if(c[0]==='in')qs.sort((a,b)=>(b[0].down-a[0].down)||(b[0].f-a[0].f));
  h+='<div class="tcol c-'+c[0]+'"><div class="tch2">'+c[1]+' <span>'+qs.length+'</span></div>'+qs.map(x=>tacTagHTML(inc,B,x[0],x[1])).join('')+'</div>'}
 h+='</div>';
 if(!B.sq.length)h+='<div class="sub">尚無可編組的小組到場（幫浦、雲梯、救助、排煙、機器人）。</div>';
 // 指令：需指定目標的（先選指令再點畫面）／立即執行的
 const pr=(B.L.N.find(n=>n.ty==='room'&&n.wins&&n.wins.some(w=>B.sd[w].road))||B.L.N.find(n=>n.ty==='room')).c;
 const hzOn=!!B.chem||tacPPECap(inc).A>0||B.sq.some(q=>q.epa||q.ty==='hazmat');
 const btn=o=>{const t=TAC_NEEDT[o[0]];let dis=!sq;
  if(sq&&/^ppe/.test(o[0]))dis=tacIn(sq)||sq.ty==='ladder'||sq.ty==='robot';
  else if(sq){const why=o[0]==='truck'?tacCan(B,sq,'truck'):o[0]==='roofres'?tacCan(B,sq,'roofres',B.F-1,0):o[0]==='roof'?tacCan(B,sq,'roof',B.F-1,0):tacCan(B,sq,o[0],t?B.bf:-1,t?pr:0);
   dis=!!why&&!/高度|道路|窗|地下|樓梯|搜索|頂樓|房間/.test(why)}
  const on2=B.out&&TAC_OUTN[o[0]];
  return'<button data-tord="'+o[0]+'" title="'+esc(tacDesc(on2?on2[1]:o[3]))+'"'+(TAC.ord===o[0]?' class="on"':'')+(dis?' disabled':'')+'><i class="emo">'+(TAC_EMO[o[0]]||'')+'</i>'+(on2?on2[0]:o[1])+' <span class="sub">'+o[2]+'</span></button>'};
 h+='<div class="tords"><span class="trow">需指定目標</span>';
 for(const gp of TAC_GRP){const os=gp[1].filter(o=>TAC_NEEDT[o[0]]);if(!os.length||(gp[0]==='化災'&&!hzOn)||(gp[0]==='野火'&&!B.wild))continue;h+='<span class="tgl">'+gp[0]+'</span>'+os.map(btn).join('')}
 h+='</div><div class="tords"><span class="trow">立即執行</span>';
 for(const gp of TAC_GRP)for(const o of gp[1])if(!TAC_NEEDT[o[0]]&&(gp[0]!=='化災'||hzOn))h+=btn(o);
 h+='<span class="trow" style="margin-left:auto" title="小組自行開門（上鎖或關著的門、入口）時的方式：破壞進入快，但門的開關不受控制，悶燒缺氧的空間容易爆燃；門控進入較慢，但不容易爆燃">ROE</span>'+
  ['force','dctrl'].map(r=>'<button data-troe="'+r+'"'+((B.roe||'force')===r?' class="on"':'')+'>'+(r==='force'?'🪓 破壞進入':'🚪 門控進入')+'</button>').join('');
 h+='<button data-tord="evac" style="border-color:var(--red)">全員撤出</button></div>';
 return h}
function tacUI(){
 const inc=S.inc.find(i=>i.id===TAC.id);if(!inc||!inc.tac)return;
 const a=tacTopHTML(inc),b=tacSideHTML(inc),c=tacBotHTML(inc);
 if(a!==tTopH){tTopH=a;morph($('tacTop'),a)}
 if(b!==tSideH){tSideH=b;morph($('tacSide'),b)}
 if(c!==tBotH){tBotH=c;morph($('tacBot'),c)}}
// 點空間時的預設指令：依小組類型與該空間狀態
function tacDefault(B,q,f,c){
 if(f<0)return q.ty==='vent'?'ppv':'exit';
 const x=tacCel(B,f,c),n=B.L.N[c],srch=x.sl>=1?'search2':'search';
 if(q.ty==='ladder')return tacStair(B,c)?'roof':(x.h>.05&&x.srch>=1&&!x.vic)?'master':'ladder';
 if(n.ty!=='room')return(x.h>.05&&(q.ty==='pump'||q.ty==='robot'))?'attack':(tacStair(B,c)&&f===B.F-1&&q.ty!=='pump')?'roof':'move';
 if(q.ty==='pump'||q.ty==='robot')return(x.h>.05||q.ty==='robot')?'attack':srch;
 if(q.ty==='vent')return'vent';
 return srch}
// 選取：一般點選＝單選；Shift／Ctrl＝加入或移除；框選＝框內全部
const tacSelList=B=>{const ids=TAC.ms.length?TAC.ms:TAC.sq?[TAC.sq]:[];return ids.map(id=>B.sq.find(q=>q.u===id)).filter(Boolean)};
function tacToggle(B,id){const i=TAC.ms.indexOf(id);if(!TAC.ms.length&&TAC.sq)TAC.ms=[TAC.sq];
 if(i>=0)TAC.ms.splice(TAC.ms.indexOf(id),1);else TAC.ms.push(id);TAC.sq=TAC.ms[0]||null;TAC.ord=null}
function tacSel(B,id){TAC.sq=id;TAC.ms=[id];TAC.ord=null;const q=B.sq.find(x=>x.u===id);
 if(q){const f=q.ty==='ladder'?(q.task!=='idle'&&q.lf!==undefined?q.lf:-1):q.f;if(f>=0)TAC.vf=f}}
function tacFloor(B,d){TAC.vf=Math.max(0,Math.min(B.F,TAC.vf+d))}
function tacCmd(k){
 const inc=S.inc.find(i=>i.id===TAC.id);if(!inc)return;
 const B=inc.tac;
 if(k==='evac'){let n=0;for(const q of B.sq)if(tacIn(q)&&!q.down){q.task='exit';q.tf=-1;q.tc=0;q.prev=null;n++}
  radio(inc,'受理','緊急撤退！所有入室小組立即撤出建物，人員清點。');msg=n?'已下令 '+n+' 組撤出':'';TAC.ord=null;return}
 const qs=tacSelList(B);
 if(!qs.length){msg='請先選擇小組';return}
 if(TAC_NEEDT[k]){TAC.ord=TAC.ord===k?null:k;return}
 let ok=0;qs.forEach((q,i)=>{if(tacOrder(inc,q,k,k==='roof'||k==='roofres'?B.F-1:-1,0,i>0))ok++});
 if(qs.length>1)msg=TAC_TASK[k]+'：'+ok+' / '+qs.length+' 組受令';TAC.ord=null}
tcv.addEventListener('contextmenu',e=>e.preventDefault());
tcv.addEventListener('pointermove',e=>{const r=tcv.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;
 if(TAC.drag){TAC.drag.x1=x;TAC.drag.y1=y}
 if(e.pointerType!=='touch')TAC.hov={x,y}});
tcv.addEventListener('pointerleave',e=>{if(e.pointerType!=='touch')TAC.hov=null});
// 樓層只用按鈕（上方 ▲▼、左側樓層列）或 [ ] 鍵切換；滾輪不換層，避免誤觸
tcv.addEventListener('wheel',e=>{if(TAC.open)e.preventDefault()},{passive:false});
// 畫面點擊：按下時選小組或開始框選；沒拖曳就在放開時下令
tcv.addEventListener('pointerdown',e=>{
 const inc=S.inc.find(i=>i.id===TAC.id);if(!inc||!inc.tac)return;
 const B=inc.tac,r=tcv.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;
 const hit=TAC.hits.find(h=>x>=h.x&&x<=h.x+h.w&&y>=h.y&&y<=h.y+h.h);
 if(e.pointerType==='touch'){TAC.hov={x,y,pin:1}}
 if(hit&&hit.t==='flr'){TAC.vf=hit.f;return}
 if(hit&&hit.t==='sq'&&e.button!==2){if(e.shiftKey||e.ctrlKey||e.metaKey)tacToggle(B,hit.id);else tacSel(B,hit.id);tBotH='';tacUI();return}
 if(e.button===2){tacClick(inc,B,hit,e,x,y);return}
 TAC.drag={x0:x,y0:y,x1:x,y1:y,add:e.shiftKey||e.ctrlKey||e.metaKey,hit};tcv.setPointerCapture(e.pointerId)});
tcv.addEventListener('pointerup',e=>{
 const d=TAC.drag;TAC.drag=null;if(!d)return;
 const inc=S.inc.find(i=>i.id===TAC.id);if(!inc||!inc.tac)return;const B=inc.tac;
 if(Math.hypot(d.x1-d.x0,d.y1-d.y0)>8){ // 框選
  const x0=Math.min(d.x0,d.x1),x1=Math.max(d.x0,d.x1),y0=Math.min(d.y0,d.y1),y1=Math.max(d.y0,d.y1);
  const ids=Object.keys(TAC.sqp||{}).map(k=>/^\d+$/.test(k)?+k:k).filter(id=>{const p=TAC.sqp[id];return p&&p[0]>=x0&&p[0]<=x1&&p[1]>=y0&&p[1]<=y1});
  if(d.add){for(const id of ids)if(TAC.ms.indexOf(id)<0)TAC.ms.push(id)}else TAC.ms=ids;
  TAC.sq=TAC.ms[0]||null;TAC.ord=null;if(ids.length)msg='已選取 '+TAC.ms.length+' 組';tBotH='';tacUI();return}
 tacClick(inc,B,d.hit,e,d.x0,d.y0)});
tcv.addEventListener('pointercancel',()=>{TAC.drag=null});
function tacClick(inc,B,hit,e,x,y){
 const qs=tacSelList(B),q=qs[0];
 if(!q){if(hit&&hit.t==='cell')TAC.hov={x,y,pin:1};return}
 let f=-1,c=0,side=null;
 if(hit&&hit.t==='roof'){qs.forEach((s,i)=>tacOrder(inc,s,'roofres',B.F-1,0,i>0));TAC.ord=null;tBotH='';tacUI();return}
 if(hit&&hit.t==='cell'){f=hit.f;c=hit.c}
 else if(hit&&hit.t==='side')side=hit.s;
 else return;
 let ok=0;
 qs.forEach((q,i)=>{
  let k=(e.button===2||!TAC.ord)?tacDefault(B,q,f,c):TAC.ord;
  // 點道路：幫浦／雲梯車移車；排煙組在該側入口做正壓排煙；室內小組撤出
  if(side&&B.exp[side]!==undefined&&!B.sd[side].road)k=q.ty==='pump'?'cover':'';
  else if(side&&k!=='truck'&&k!=='cover'&&k!=='guard'&&k!=='force'&&k!=='dctrl')k=tacIn(q)?'exit':(q.ty==='pump'||q.ty==='ladder')&&side!==q.tside?'truck':q.ty==='vent'?'ppv':k;
  if(k==='guard'&&side)k='cover';
  if(k==='cover'&&!side&&B.out&&f>=0)k='guard'; // 室外場景：點要保護的建物
  if(!k){if(!i)msg='點鄰棟可下令幫浦組做鄰棟周界防護';return}
  if((k==='truck'||k==='cover')&&!side){if(!i)msg=k==='truck'?'移車請點選建物外的道路':'鄰棟周界防護請點選鄰棟那一側';return}
  if(TAC_NEEDT[k]&&k!=='truck'&&k!=='cover'&&k!=='guard'&&!((k==='force'||k==='dctrl')&&side)&&f<0){if(!i)msg='請點選建物內的房間';return}
  // 破壞進入／門控進入：點在門附近就指定那扇門（站在較安全的一側）
  let door=null,c2=c;
  if((k==='force'||k==='dctrl')&&f>=0){const G=tacGeo(B);let bd=20;
   for(const o of B.L.N[c].nb){const [mx,my]=tacDoorMid(G,c,o),d=Math.hypot(mx-x,my-y);
    if(d<bd){bd=d;door=o}}
   if(door!==null){const a=tacCel(B,f,c),b=tacCel(B,f,door);if(a.h+a.s*.3>b.h+b.s*.3){c2=door;door=c}}}
  if(tacOrder(inc,q,k,f,c2,i>0,side,door))ok++});
 if(qs.length>1)msg='下令 '+ok+' / '+qs.length+' 組';
 TAC.ord=null;tBotH='';tacUI()}
// 戰術畫面的按鈕：點擊時依 data-* 屬性分派（新增時加進 TAC_CLICK）
const TAC_CLICK=['troe','tfl','ttab','tsq','tord','tpause','texit','thand','tamb','tstn','trole','task','treq','telev','tspd','tap','tepa','tma'];
const TAC_CLICK_SEL=TAC_CLICK.map(k=>'[data-'+k+']').join(',');
document.getElementById('tac').addEventListener('click',e=>{
 const b=e.target.closest(TAC_CLICK_SEL);if(!b)return;
 const D=b.dataset;msg='';
 const ic=S.inc.find(i=>i.id===TAC.id);
 if(ic&&ic.tac){const B=ic.tac;
  if(D.tamb)tacAmbReq(ic,B);
  if(D.task)tacAsk(ic,B,D.task);
  if(D.treq)tacReinf(ic,B,D.treq);
  if(D.tepa)epaCall(ic);
  if(D.tma)maCall(ic,D.tma);
 if(D.telev&&B.elev&&!B.elOn&&!(B.elT>0)){B.elT=10;radio(ic,'受理','消防專用升降機切換消防模式中。')}}
 if(D.tspd){TAC.spd=+D.tspd}
 if(D.troe){const ic=S.inc.find(i=>i.id===TAC.id);if(ic&&ic.tac){ic.tac.roe=D.troe;ic.tac.roeSet=1;radio(ic,'受理','進入方式 ROE：'+(D.troe==='dctrl'?'門控進入（較慢，悶燒空間不易爆燃）':'破壞進入（較快，悶燒空間容易爆燃）')+'。');tBotH=''}}
 if(D.tap){TAC.autoPause=!TAC.autoPause}
 if(ic&&ic.tac){const B=ic.tac;
  if(D.tstn){if(B.st[D.tstn]){tacStnClose(ic,B,D.tstn);if(D.tstn==='air')B.airOff=1}else tacStnOpen(ic,B,D.tstn)}
  if(D.trole)tacRoleSet(ic,B,D.trole,!B.role[D.trole])}
 if(D.ttab){TAC.tab=D.ttab;tacUI();return}
 if(D.tfl){const ic=S.inc.find(i=>i.id===TAC.id);if(ic&&ic.tac){tacFloor(ic.tac,+D.tfl);tacUI()}return}
 if(D.texit){tacClose();return}
 if(D.thand){const ic=S.inc.find(i=>i.id===TAC.id);if(ic&&ic.tac)tacHandoff(ic,ic.tac);return}
 if(D.tpause){paused=!paused;if(!paused)TAC.pmsg='';$('btnPause').textContent=paused?'繼續':'暫停'}
 if(D.tsq){const inc=S.inc.find(i=>i.id===TAC.id);if(inc){const id=/^\d+$/.test(D.tsq)?+D.tsq:D.tsq;if(e.shiftKey||e.ctrlKey||e.metaKey)tacToggle(inc.tac,id);else tacSel(inc.tac,id)}}
 if(D.tord)tacCmd(D.tord);
 tTopH=tBotH='';tacUI()});
document.addEventListener('keydown',e=>{
 if(!TAC.open||e.target.tagName==='INPUT')return;
 const inc=S.inc.find(i=>i.id===TAC.id);if(!inc)return;
 const k=e.key.toLowerCase();
 if(k==='escape'){if(TAC.ord)TAC.ord=null;else tacClose();}
 else if(k===' '){e.preventDefault();paused=!paused;if(!paused)TAC.pmsg='';$('btnPause').textContent=paused?'繼續':'暫停'}
 else if(/^[1-9]$/.test(k)){const q=inc.tac.sq[+k-1];if(q)tacSel(inc.tac,q.u)}
 else if(k==='['||k==='pagedown'){e.preventDefault();tacFloor(inc.tac,-1)}
 else if(k===']'||k==='pageup'){e.preventDefault();tacFloor(inc.tac,1)}
 else if(TAC_KEYS[k]){msg='';tacCmd(TAC_KEYS[k])}
 else return;
 tTopH=tBotH='';tacUI()});
// ===== ICS 架構圖 =====
// 節點：s 站點（data-tstn）、r 職務（data-trole）
const ICS_TREE={top:{s:'icp',n:'指揮站',sub:'現場指揮官'},
 staff:[{r:'safety',n:'安全官'},{s:'media',n:'聯訪處',sub:'新聞發布'}],
 secs:[{n:'作業組',items:[{r:'water',n:'水源組長'},{r:'search',n:'搜救組長'},{s:'fwd',n:'前進指揮所'},{s:'decon',n:'除污站',chem:1}]},
  {n:'後勤組',items:[{s:'stage',n:'待命集結區'},{s:'air',n:'氣瓶充填區'},{s:'rehab',n:'後勤照護區'}]},
  {n:'救護組',items:[{r:'ems',n:'救護組長'},{s:'triage',n:'檢傷站'},{s:'treat',n:'醫療站'}]}]};
function tacIcsNode(inc,B,nd,cls){
 const slots=tacRoleSlots(inc,B),used=tacStaffUsed(B);
 let on,st,dis='',tip,attr;
 if(nd.s){const o=B.st[nd.s],def=tacStnDef(nd.s);on=!!o;attr='data-tstn="'+nd.s+'"';tip=def.fx;
  if(o){const u=S.units.find(x=>x.id===o.u);st=(o.staff?'幕僚':u?u.cs+(def.drv?' 司機':''):nd.s==='media'?'警方':'')||'開設中'}
  else{const r=tacStnPick(inc,B,nd.s);st=r.why?r.why.replace(/^需要/,'需 '):'可開設';if(r.why)dis=' disabled'}}
 else{const r=TAC_ROLE.find(x=>x.k===nd.r);on=!!B.role[nd.r];attr='data-trole="'+nd.r+'"';tip=r.fx;
  st=on?'已指派':!B.st.icp?'需開設指揮站':used>=slots?'幕僚已滿':'可指派';if(!on&&(used>=slots))dis=' disabled'}
 return'<button class="icsn'+(cls?' '+cls:'')+(on?' on':'')+'" '+attr+dis+' title="'+esc(tip)+'"><b>'+nd.n+'</b><i>'+esc(st)+'</i></button>'}
function tacIcsHTML(inc,B){
 const slots=tacRoleSlots(inc,B),used=tacStaffUsed(B),T=ICS_TREE;
 let h='<div class="hd mt">ICS 編組 <span class="sub">幕僚 '+used+' / '+slots+'　點方塊開設／撤除、指派／解除</span></div><div class="ics">';
 h+='<div class="ics-top">'+tacIcsNode(inc,B,T.top,'top')+'</div>';
 h+='<div class="ics-staff">'+T.staff.map(n=>tacIcsNode(inc,B,n,'staff')).join('')+'</div>';
 h+='<div class="ics-secs">';
 for(const s of T.secs){const it=s.items.filter(n=>!n.chem||B.chem);
  h+='<div class="ics-sec"><div class="ics-h">'+s.n+'</div>'+it.map(n=>tacIcsNode(inc,B,n)).join('')+'</div>'}
 h+='</div></div>';
 if(!slots)h+='<div class="sub">開設指揮站後，指揮車提供 2 名幕僚、行動指揮車（MCV）提供 4 名幕僚，可指派安全官與各組長。</div>';
 return h}
