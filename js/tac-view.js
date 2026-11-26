// 戰術畫面：樓層平面（俯視）繪製、樓層選擇列、小組卡片、指令列、鍵盤與滑鼠輸入
'use strict';
const tcv=document.getElementById('tcv'),tctx=tcv.getContext('2d');
let tW=800,tH=500,tTopH='',tSideH='',tBotH='';
// 指令列：依類別分組；[代碼, 名稱, 快捷鍵, 說明]
const TAC_GRP=[
 ['水線',[['attack','入室攻擊','A','帶水線進入火點射水'],['trans','過渡射水','E','先從 1F、2F 窗外射水降溫，再自動轉入室攻擊'],
  ['guard','防護射水','H','守住一個空間不讓火延燒進來；點鄰棟則為鄰棟防護'],['confine','火勢侷限','F','到火點旁關門，減緩延燒與濃煙擴散']]],
 ['搜救',[['search','初期搜索','S','快速掃過，濃煙中可能漏人'],['search2','次級搜索','D','徹底翻找，找出初搜遺漏的人'],['roofres','屋頂救援','U','上屋頂帶回避難民眾']]],
 ['排煙',[['vent','破窗排煙','V','打破窗戶建立排煙開口'],['hydro','水霧排煙','W','開窗後以水霧把煙帶出窗外（需水線）'],
  ['ppv','正壓排煙','P','在入口架送風機，沿送風路徑把煙推向開口'],['roof','屋頂排煙','O','開啟頂樓樓梯間的排煙口']]],
 ['雲梯',[['ladder','雲梯救援','L','架雲梯到窗口搜救'],['master','雲梯射水','M','由雲梯從窗外射水']]],
 ['調度',[['move','移動','G','移到指定位置待命'],['rit','RIT','R','於入口待命，MAYDAY 時入室救援'],['exit','撤出','X','撤出建物'],
  ['truck','移車','T','把車移到另一側道路'],['stand','送水口加壓','C','接連結送水管送水口，各樓層出水口可用']]]];
const TAC_ORD=TAC_GRP.flatMap(g=>g[1]);
const TAC_KEYS={};for(const o of TAC_ORD)TAC_KEYS[o[2].toLowerCase()]=o[0];
// 需要再點選目標的指令
const TAC_NEEDT={attack:1,trans:1,guard:1,confine:1,search:1,search2:1,vent:1,hydro:1,ladder:1,master:1,move:1,truck:1};
function sizeTac(){
 const mid=tcv.parentElement,r=mid.getBoundingClientRect(),sd=document.getElementById('tacSide');
 const col=getComputedStyle(mid).flexDirection==='column';
 tW=Math.max(300,Math.floor(r.width-(col?12:sd.offsetWidth+18)));tH=Math.max(240,Math.floor(r.height-(col?sd.offsetHeight+18:12)));
 tcv.style.width=tW+'px';tcv.style.height=tH+'px';
 tcv.width=Math.round(tW*dpr);tcv.height=Math.round(tH*dpr);tctx.setTransform(dpr,0,0,dpr,0,0)}
function tacOpen(inc){
 if(!TACK[inc.k]){msg='此案類沒有戰術指揮';return}
 if(!inc.rev){msg='首車到場回報後才能進入戰術指揮';return}
 if(inc.wrap){msg='現場已在收整，無法進入戰術指揮';return}
 if(!inc.tac)tacInit(inc);
 TAC.open=true;TAC.id=inc.id;TAC.B=inc.tac;TAC.vf=inc.tac.of;TAC.sq=null;TAC.ord=null;stratT=0;
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
 const L=B.L,sx=8,sw=58,top=28,ax=sx+sw+16,ay=top,aw=tW-ax-8,ah=tH-ay-6,m={};
 for(const s of TAC_SIDES)m[s]=B.sd[s].road?84:30; // 道路：外側兩排車位、內側一條人員待命通道
 const t=Math.max(34,Math.min(170,(aw-m.w-m.e-20)/L.GW,(ah-m.n-m.s-20)/L.GH));
 const bw=t*L.GW,bh=t*L.GH;
 const bx=ax+m.w+10+Math.max(0,(aw-m.w-m.e-20-bw)/2),by=ay+m.n+10+Math.max(0,(ah-m.n-m.s-20-bh)/2);
 const band={n:[ax,by-10-m.n,aw,m.n],s:[ax,by+bh+10,aw,m.s],w:[bx-10-m.w,ay,m.w,ah],e:[bx+bw+10,ay,m.e,ah]};
 const sh=Math.max(16,Math.min(46,(tH-top-30)/(B.F+1)));
 return{t,bx,by,bw,bh,band,sx,sw,sh,L,
  r:c=>{const n=L.N[c];return[bx+n.gx*t,by+n.gy*t,n.gw*t,n.gh*t]},
  ctr:c=>{const n=L.N[c];return[bx+(n.gx+n.gw/2)*t,by+(n.cy!==undefined?n.cy:n.gy+n.gh/2)*t]},
  fy:f=>top+(B.F-f)*sh}}
// 入口門的位置（依格局）
function tacDoor(G,s){const d=G.L.door[s]||[0,0];return[G.bx+d[0]*G.t,G.by+d[1]*G.t]}
// 屋外人員在某側的站位（沿外牆排開）
function tacStage(G,s,i){
 const d=tacDoor(G,s),a=34+(i%8)*36,b=0;
 return s==='n'?[d[0]+a,G.by-22-b]:s==='s'?[d[0]+a,G.by+G.bh+22+b]:s==='w'?[G.bx-22-b,d[1]+a-G.t*.9]:[G.bx+G.bw+22+b,d[1]+a-G.t*.9]}
// 車輛停放格：道路外緣一字排開；東西兩側直放
function tacSlot(G,s,i){
 const b=G.band[s];
 if(s==='n'||s==='s'){const per=Math.max(1,Math.floor(G.bw/58)),r=Math.floor(i/per)%2,x=G.bx+(i%per)*58;
  return[x,s==='n'?b[1]+4+r*24:b[1]+b[3]-24-r*24,0]}
 const per=Math.max(1,Math.floor(G.bh/58)),r=Math.floor(i/per)%2;
 return[s==='w'?b[0]+4+r*24:b[0]+b[2]-24-r*24,G.by+(i%per)*58,1]}
// 建物四角的路口：放站點帳篷（車輛不會停在那裡）；抵達側兩角優先
function tacCorners(G,side){
 const B4=G.band,rc=(v,h)=>[B4[v][0],B4[h][1],B4[v][2],B4[h][3]];
 const all={nw:rc('w','n'),ne:rc('e','n'),sw:rc('w','s'),se:rc('e','s')};
 const ord={n:['nw','ne','sw','se'],s:['sw','se','nw','ne'],e:['ne','se','nw','sw'],w:['nw','sw','ne','se']}[side];
 return ord.map(k=>all[k])}
// 家具：依房間用途畫，固定種子讓每次畫的位置一樣
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
 else if(kind==='store'){for(let k=0;k<6;k++){const s2=u*(.12+rnd()*.1);box(x+p+rnd()*(w-2*p-s2),y+p+rnd()*(h-2*p-s2),s2,s2)}}
 else if(kind==='office'){const nx=Math.max(1,Math.floor(w/(u*.45))),ny=Math.max(1,Math.floor(h/(u*.45)));
  for(let i=0;i<nx;i++)for(let j=0;j<ny;j++){const dx=x+p+i*(w-2*p)/nx,dy=y+p+j*(h-2*p)/ny;box(dx,dy,(w-2*p)/nx*.6,(h-2*p)/ny*.35);
   g.fillStyle=fc;g.beginPath();g.arc(dx+(w-2*p)/nx*.3,dy+(h-2*p)/ny*.55,u*.04,0,TAU);g.fill()}}
 else if(kind==='ward'){const n2=Math.max(2,Math.min(4,Math.floor(w/(u*.3))));
  for(let i=0;i<n2;i++){const bx=x+p+i*(w-2*p)/n2;box(bx,y+p,(w-2*p)/n2*.6,h*.32);g.fillStyle=dark?fc:'#7b7468';g.fillRect(bx+2,y+p+2,(w-2*p)/n2*.6-4,h*.06)}
  g.strokeStyle=lc;g.setLineDash([3,3]);g.beginPath();g.moveTo(x+p,y+h*.45);g.lineTo(x+w-p,y+h*.45);g.stroke();g.setLineDash([])}
 else if(kind==='shelf'){const n2=Math.max(2,Math.floor(h/(u*.28)));for(let i=0;i<n2;i++)box(x+w*.12,y+p+i*(h-2*p)/n2,w*.76,u*.07)}
 else if(kind==='machine'){box(x+w*.12,y+h*.2,w*.45,h*.4,dark?fc:'#4f555c');g.strokeStyle=lc;g.lineWidth=2;
  for(let k=0;k<2;k++){g.beginPath();g.arc(x+w*.25+k*w*.2,y+h*.4,u*.07,0,TAU);g.stroke()}
  g.lineWidth=1;g.beginPath();g.moveTo(x+w*.1,y+h*.78);g.lineTo(x+w*.9,y+h*.78);g.moveTo(x+w*.1,y+h*.84);g.lineTo(x+w*.9,y+h*.84);g.stroke()}}
// 窗戶在某側的外牆位置
function tacWinPt(G,c,s){const r=G.r(c);
 return s==='n'?[r[0]+r[2]/2,r[1]]:s==='s'?[r[0]+r[2]/2,r[1]+r[3]]:s==='e'?[r[0]+r[2],r[1]+r[3]/2]:[r[0],r[1]+r[3]/2]}
function tacSqPos(B,G,q,i){
 const vf=TAC.vf;
 const at=(f,c)=>{
  if(f<0)return q.ty==='ladder'?null:tacStage(G,q.side,i);
  if(f!==vf)return null;
  const p=G.ctr(c),n=B.L.N[c],o=G.t*.2;
  return[p[0]+((i%3)-1)*o,p[1]+(Math.floor(i/3)%2?o:-o*.3)+(n.ty==='stair'?-G.t*.2:0)]};
 const p=at(q.f,q.c);
 if(!q.mt||(q.nf===q.f&&q.nc===q.c))return p;
 const n=at(q.nf,q.nc),k=Math.min(1,q.mt/tacStepTime(B,q,[q.nf,q.nc]));
 if(p&&n)return[p[0]+(n[0]-p[0])*k,p[1]+(n[1]-p[1])*k];
 return p||n}
// 俯視人員：頭盔、空氣瓶、肩膀
function tacMan(g,x,y,r,col,a,opt){
 g.save();g.translate(x,y);g.rotate(a);
 g.fillStyle='rgba(0,0,0,.35)';g.beginPath();g.ellipse(1,1.5,r*1.25,r*.95,0,0,TAU);g.fill();
 g.fillStyle=opt.coat||'#1e2c52';g.beginPath();g.ellipse(0,0,r*.85,r*1.2,0,0,TAU);g.fill();
 if(opt.scba){g.fillStyle='#c9d0d8';scRR(g,-r*1.05,-r*.45,r*.5,r*.9,r*.15);g.fill()}
 g.fillStyle=col;g.beginPath();g.arc(r*.1,0,r*.62,0,TAU);g.fill();
 g.fillStyle='rgba(0,0,0,.35)';g.fillRect(r*.35,-r*.25,r*.3,r*.5);
 g.restore()}
// 屋外水帶沿道路繞過建物轉角：同側直拉，相鄰側經一個轉角，對側經兩個轉角（優先走有路的那側）
function tacRoute(B,G,fs,es){
 const cx=s=>G.band[s][0]+G.band[s][2]/2,cy=s=>G.band[s][1]+G.band[s][3]/2;
 const corner=(a,b)=>{const v=a==='e'||a==='w'?a:b,h=a==='n'||a==='s'?a:b;return[cx(v),cy(h)]};
 if(fs===es)return[];
 if(!tacOpp(fs,es))return[corner(fs,es)];
 const via=(fs==='n'||fs==='s')?(B.sd.e.road||!B.sd.w.road?'e':'w'):(B.sd.s.road||!B.sd.n.road?'s':'n');
 return[corner(fs,via),corner(via,es)]}
const tacPfCol=(pf,a)=>(pf>=.7?'rgba(125,179,232,':pf>=.4?'rgba(233,161,59,':'rgba(226,86,79,')+a+')';
function drawTac(){
 const inc=S.inc.find(i=>i.id===TAC.id);
 if(!inc||!inc.tac){const b=TAC.B;
  tacClose(b&&b.done?(b.burnt>b.R*b.F*.5?'建物燒毀':'戰術指揮完成')+'：救出 '+b.resc+' 名'+(b.burnt?'、燒毀 '+b.burnt+' 室':'')+(b.lost?'、罹難 '+b.lost+' 名':'')+(b.lodd?'、殉職 '+b.lodd+' 組':''):'戰術指揮失敗：案件逾時，火勢未能控制');return}
 const B=inc.tac,g=tctx,G=tacGeo(B),T=S.t,L=B.L,t=G.t;
 if(TAC.vf===undefined||TAC.vf>B.F)TAC.vf=Math.min(B.F-1,B.of);
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
 // 車輛：小組的車依停放側排列，其他車（水庫、指揮、救護）停在抵達側
 const TP={},crew=onScene(inc).filter(u=>u.st==='work'),cnt={n:0,e:0,s:0,w:0};
 const truck=(u,s,ghost)=>{const p=tacSlot(G,s,cnt[s]++);TP[u.id]=[p[0]+(p[2]?10:25),p[1]+(p[2]?25:10)];
  g.save();if(ghost)g.globalAlpha=.45;g.translate(p[0],p[1]);
  const w=p[2]?20:50,h=p[2]?50:20;g.fillStyle=CODE[u.code].col;scRR(g,0,0,w,h,3);g.fill();
  g.fillStyle='rgba(0,0,0,.35)';if(p[2])g.fillRect(3,38,14,9);else g.fillRect(38,3,9,14);
  g.fillStyle=(T*3+u.id)%1<.5?'#ff4a3a':'#4a8aff';if(p[2])g.fillRect(-2,39,2,7);else g.fillRect(39,-2,7,2);
  g.fillStyle='#eceae3';g.font='10px '+FONT;g.textAlign='center';g.textBaseline='top';
  if(p[2]){g.translate(w/2,h/2);g.rotate(-Math.PI/2);g.textBaseline='middle';g.fillText(u.cs,0,0)}else g.fillText(u.cs,25,22);
  g.restore()};
 for(const u of crew){const q=B.sq.find(x=>x.u===u.id);
  if(q&&q.tmv>0){truck(u,q.tgt,1);continue}
  truck(u,q?q.tside:B.arr,0)}
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
 g.fillStyle='#4a463f';g.fillRect(G.bx-5,G.by-5,G.bw+10,G.bh+10);
 const burnt=x=>x.ty!=='stair'&&x.fu<.05;
 for(const n of L.N){
  const x=tacCel(B,vf,n.c),r=G.r(n.c);
  TAC.hits.push({t:'cell',f:vf,c:n.c,x:r[0],y:r[1],w:r[2],h:r[3]});
  g.fillStyle=burnt(x)?'#141210':n.ty==='room'?'#2b2722':n.ty==='hall'?'#38352f':'#23262c';g.fillRect(r[0],r[1],r[2],r[3]);
  if(n.ty==='room')tacFurn(g,r,n.kind,n.c*7+vf*3+1,burnt(x)||x.fu<.3);
  if(n.ty==='hall'){g.strokeStyle='rgba(255,255,255,.05)';g.lineWidth=1;for(let k=1;k<4;k++){g.beginPath();g.moveTo(r[0]+r[2]*k/4,r[1]);g.lineTo(r[0]+r[2]*k/4,r[1]+r[3]);g.stroke()}}
  if(n.ty==='stair'){
   g.strokeStyle='rgba(200,200,190,.25)';g.lineWidth=1;
   for(let k=1;k<10;k++){const yy=r[1]+r[3]*k/10;g.beginPath();g.moveTo(r[0]+r[2]*.12,yy);g.lineTo(r[0]+r[2]*.88,yy);g.stroke()}
   g.fillStyle='rgba(236,234,227,.55)';g.font='600 11px '+FONT;g.textAlign='center';g.textBaseline='middle';
   g.fillText('▲ '+(vf<B.F-1?tacFlr(B,vf+1):(B.roof?'屋頂 開':'屋頂')),r[0]+r[2]/2,r[1]+14);
   g.fillText(vf===B.bf?'▼ 出口'+(B.bf?'／B1':''):vf>0?'▼ '+tacFlr(B,vf-1):'',r[0]+r[2]/2,r[1]+r[3]-14);
   if(B.sp){g.fillStyle=B.sp.on?'#7db3e8':'#6b6960';g.font='10px '+FONT;g.fillText(B.sp.on?'出水口 ●':'出水口',r[0]+r[2]/2,r[1]+r[3]*.32)}}
  if(x.h>.02){g.fillStyle='rgba(255,'+(110-x.h*60|0)+',30,'+(x.h*.45).toFixed(3)+')';g.fillRect(r[0],r[1],r[2],r[3])}
  if(x.h>.15){const nF=Math.ceil(x.h*6);
   for(let k=0;k<nF;k++){const sd=(n.c*7+k*13)%17/17,sd2=(n.c*3+k*29)%19/19;
    const fx=r[0]+r[2]*(.15+.7*sd),fy=r[1]+r[3]*(.15+.7*sd2),fr=t*(.06+.1*x.h)*(.8+.25*Math.sin(T*9+k*2));
    const gr=g.createRadialGradient(fx,fy,0,fx,fy,fr*1.6);gr.addColorStop(0,'rgba(255,230,120,.95)');gr.addColorStop(.45,'rgba(255,140,40,.85)');gr.addColorStop(1,'rgba(255,80,20,0)');
    g.fillStyle=gr;g.beginPath();g.arc(fx,fy,fr*1.6,0,TAU);g.fill()}}
  if(n.ty==='room'){
   if(x.srch>=1){
    for(let k=0;k<x.vic;k++){const vx=r[0]+r[2]*.25+k*t*.16,vy=r[1]+r[3]*.72;
     g.fillStyle='#7a4a9a';g.beginPath();g.ellipse(vx,vy,t*.07,t*.03,0,0,TAU);g.fill();
     g.fillStyle='#d9bfae';g.beginPath();g.arc(vx+t*.08,vy,t*.025,0,TAU);g.fill()}
    if(x.vic&&(T*2)%1<.6){g.fillStyle='#ff5a4a';g.font='600 10px '+FONT;g.textAlign='left';g.textBaseline='bottom';g.fillText('受困 '+x.vic,r[0]+r[2]*.18,r[1]+r[3]*.64)}
    if(!x.vic){g.fillStyle=x.sl>=2?'rgba(93,202,165,.75)':'rgba(233,161,59,.75)';g.font='600 10px '+FONT;g.textAlign='left';g.textBaseline='top';g.fillText(x.sl>=2?'次搜✓':'初搜',r[0]+4,r[1]+4)}
    if(x.sl===1&&x.s2>0&&x.s2<1){g.fillStyle='rgba(93,202,165,.85)';g.fillRect(r[0]+4,r[1]+r[3]-6,(r[2]-8)*x.s2,3)}}
   else{
    if(x.srch>0){g.fillStyle='rgba(125,179,232,.85)';g.fillRect(r[0]+4,r[1]+r[3]-6,(r[2]-8)*x.srch,3)}
    g.fillStyle='rgba(236,234,227,.2)';g.font='600 '+Math.max(12,t*.22|0)+'px '+FONT;g.textAlign='center';g.textBaseline='middle';
    g.fillText('?',r[0]+r[2]/2,r[1]+r[3]/2)}
   g.fillStyle='rgba(236,234,227,.45)';g.font='10px '+FONT;g.textAlign='right';g.textBaseline='top';
   g.fillText(tacRm(B,vf,n.no),r[0]+r[2]-5,r[1]+4);
   g.textAlign='left';g.fillStyle='rgba(236,234,227,.4)';g.fillText(TAC_RK[n.kind].n,r[0]+(x.srch>=1&&!x.vic?36:5),r[1]+4)}
  if(x.s>.03){g.fillStyle='rgba(66,68,74,'+(.12+.68*x.s).toFixed(3)+')';g.fillRect(r[0],r[1],r[2],r[3]);
   for(let k=0;k<3;k++){const ph=(T*.15+k/3+n.c*.13)%1;g.fillStyle='rgba(120,122,128,'+(x.s*.18).toFixed(3)+')';
    g.beginPath();g.arc(r[0]+r[2]*(.2+.6*ph),r[1]+r[3]*(.3+.4*((k*.37+n.c*.21)%1)),t*.18,0,TAU);g.fill()}}}
 // 牆與門
 g.strokeStyle='#8a857a';g.lineWidth=3;
 for(const n of L.N){const r=G.r(n.c);g.strokeRect(r[0],r[1],r[2],r[3])}
 const flr=c=>{const x=tacCel(B,vf,c),n=L.N[c];return burnt(x)?'#141210':n.ty==='room'?'#2b2722':n.ty==='hall'?'#38352f':'#23262c'};
 for(const a of L.N)for(const bc of a.nb){if(bc<a.c)continue;const ra=G.r(a.c),rb=G.r(bc);let s;
  if(Math.abs(ra[1]+ra[3]-rb[1])<1||Math.abs(rb[1]+rb[3]-ra[1])<1){const y=Math.abs(ra[1]+ra[3]-rb[1])<1?rb[1]:ra[1];
   const x0=Math.max(ra[0],rb[0]),x1=Math.min(ra[0]+ra[2],rb[0]+rb[2]);s=[(x0+x1)/2-t*.14,y-3,t*.28,6]}
  else{const x=Math.abs(ra[0]+ra[2]-rb[0])<1?rb[0]:ra[0];const y0=Math.max(ra[1],rb[1]),y1=Math.min(ra[1]+ra[3],rb[1]+rb[3]);s=[x-3,(y0+y1)/2-t*.14,6,t*.28]}
  g.fillStyle=flr(a.ty==='room'?bc:a.c);g.fillRect(s[0],s[1],s[2],s[3]);
  if(vf<B.F&&tacShut(B,vf,a.c,bc)){g.fillStyle='#b5853f';if(s[2]>s[3])g.fillRect(s[0],s[1]+1.5,s[2],3);else g.fillRect(s[0]+1.5,s[1],3,s[3])}}
 // 對外窗（各方向）
 for(const n of L.N){if(!n.wins||vf<B.bf)continue;const x=tacCel(B,vf,n.c);
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
 for(const e of B.ents){const d=tacDoor(G,e.side),hz=e.side==='n'||e.side==='s';
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
 // 水線：供水車 → 入口 → 樓梯間 →（本層）→ 射水組；顏色代表水壓
 let li=0;
 for(const q of B.sq){
  if(!q.line)continue;li++;
  const off=(li%4-1.5)*3,col=q.burst>0?((T*4)%1<.5?'rgba(226,86,79,.9)':'rgba(226,86,79,.2)'):tacPfCol(q.pf,.9);
  g.strokeStyle=col;g.lineWidth=2.4;g.setLineDash([8,5]);g.lineDashOffset=-T*30*Math.max(.2,q.pf);
  if(q.ty==='ladder'){
   if(q.lf===vf&&TP[q.u]&&q.ext>0&&q.lside){const w=tacWinPt(G,q.lc,q.lside),tp=TP[q.u];
    g.beginPath();g.moveTo(tp[0],tp[1]);g.lineTo(tp[0]+(w[0]-tp[0])*q.ext,tp[1]+(w[1]-tp[1])*q.ext);g.stroke()}
   g.setLineDash([]);continue}
  const sp=q.src==='sp',tp=TP[q.lu];
  if(q.task==='cover'){const b=G.band[q.cside];if(tp&&b){const cx=Math.max(b[0],Math.min(b[0]+b[2],tp[0])),cy=Math.max(b[1],Math.min(b[1]+b[3],tp[1]));
   g.beginPath();g.moveTo(tp[0],tp[1]);g.lineTo(cx,cy);g.stroke();g.setLineDash([]);g.fillStyle='rgba(170,210,245,.5)';
   for(let k=0;k<6;k++){const ph=(T*2+k/6)%1;g.beginPath();g.arc(tp[0]+(cx-tp[0])*ph,tp[1]+(cy-tp[1])*ph,3+ph*8,0,TAU);g.fill()}}
   g.setLineDash([]);continue}
  g.beginPath();
  if(!sp&&q.lent&&tp){const d=tacDoor(G,q.lent.side),ts=(B.sq.find(x=>x.u===q.lu)||q).tside;
   if(vf!==B.bf){g.stroke();g.strokeStyle=tacPfCol(q.pf,.35);g.beginPath()} // 地面段在其他樓層畫淡
   g.moveTo(tp[0],tp[1]);for(const c of tacRoute(B,G,ts,q.lent.side))g.lineTo(c[0]+off,c[1]+off);g.lineTo(d[0]+off,d[1]+off);
   if(vf!==B.bf){g.stroke();g.strokeStyle=col;g.beginPath()}
}
  // 本層經過的節點：從入口（或送水口出水的樓梯間）沿最短路徑到小組
  const f0=sp?q.f:B.bf,c0=sp?tacNearStair(B,q.f,q.c):q.lent?q.lent.c:0;
  if(q.f>=0){const pts=[[f0,c0]].concat(tacPath(B,f0,c0,q.f,q.c)).filter(p=>p[0]===vf);
   let first=!(vf===B.bf&&!sp&&q.lent&&tp);
   for(const p of pts){const c=G.ctr(p[1]);if(first){g.moveTo(c[0]+off,c[1]+off);first=false}else g.lineTo(c[0]+off,c[1]+off)}
   if(q.f===vf){const pp=tacSqPos(B,G,q,0);if(pp&&pts.length)g.lineTo(pp[0],pp[1])}
   else if(pts.length===1&&vf!==B.bf){const c=G.ctr(pts[0][1]);g.lineTo(c[0]+off,c[1]-t*.5)}}
  g.stroke();g.setLineDash([])}
 // 雲梯：只畫在目標樓層
 for(const q of B.sq){
  if(q.ty!=='ladder'||q.lf!==vf||!q.lside||(q.task==='idle'&&!q.ext)||!TP[q.u]||q.tmv)continue;
  const mid={n:[G.bx+G.bw/2,G.by],s:[G.bx+G.bw/2,G.by+G.bh],w:[G.bx,G.by+G.bh/2],e:[G.bx+G.bw,G.by+G.bh/2]};
  const tp=TP[q.u],w=q.task==='roofres'?mid[q.lside]:q.task==='roof'?tacDoor(G,q.lside):tacWinPt(G,q.lc,q.lside);
  const bx=tp[0],by=tp[1],ex=bx+(w[0]-bx)*q.ext,ey=by+(w[1]-by)*q.ext,a=Math.atan2(ey-by,ex-bx),nx=-Math.sin(a)*5,ny=Math.cos(a)*5;
  g.strokeStyle='#d8d4c8';g.lineWidth=2;g.beginPath();g.moveTo(bx+nx,by+ny);g.lineTo(ex+nx,ey+ny);g.moveTo(bx-nx,by-ny);g.lineTo(ex-nx,ey-ny);
  const len=Math.hypot(ex-bx,ey-by);for(let k=7;k<len;k+=7){const u=k/len;g.moveTo(bx+(ex-bx)*u+nx,by+(ey-by)*u+ny);g.lineTo(bx+(ex-bx)*u-nx,by+(ey-by)*u-ny)}g.stroke();
  if(q.ext>=1){tacMan(g,ex,ey,5,'#f3c43b',a,{scba:1});
   if(q.task==='master'&&q.line&&q.pf>0){const c=G.ctr(q.lc);g.fillStyle='rgba(170,210,245,.5)';for(let k=0;k<6;k++){const ph=(T*2+k/6)%1;
    g.beginPath();g.arc(ex+(c[0]-ex)*ph,ey+(c[1]-ey)*ph,3+ph*7,0,TAU);g.fill()}}}}
 // 小組
 const fr=Math.max(3,Math.min(8,t*.055)),slot={};
 for(const q of B.sq){
  if(q.ty==='ladder')continue;
  const key=q.f<0?'out'+q.side:q.f+','+q.c,k=slot[key]=(slot[key]||0)+1;
  const p=tacSqPos(B,G,q,k-1);if(!p)continue;
  const n=Math.min(4,q.n),sel=TAC.sq===q.u,moving=q.mt>0||q.wkS>0;
  const tgt=q.f===q.tf&&q.c===q.tc&&q.f>=0?G.ctr(q.c):null;
  let a=-Math.PI/2;
  if(q.mt>0&&q.nf===q.f&&q.f>=0){const c2=G.ctr(q.nc),c1=G.ctr(q.c);a=Math.atan2(c2[1]-c1[1],c2[0]-c1[0])}
  if(q.task==='attack'&&q.line&&tgt)a=-Math.PI/2+Math.sin(T*.7+q.u)*.9;
  if(sel){g.strokeStyle='#e9a13b';g.lineWidth=2;g.beginPath();g.arc(p[0],p[1],fr*3.2,0,TAU);g.stroke()}
  if(q.down){const pul=.5+.5*Math.sin(T*8);g.fillStyle='rgba(226,86,79,'+(.3+.35*pul).toFixed(2)+')';g.beginPath();g.arc(p[0],p[1],fr*4,0,TAU);g.fill()}
  if(q.ty==='robot'){g.save();g.translate(p[0],p[1]);g.rotate(a);g.fillStyle='#6b7f96';scRR(g,-fr*1.6,-fr*1.1,fr*3.2,fr*2.2,2);g.fill();
   g.fillStyle='#222';g.fillRect(-fr*1.6,-fr*1.4,fr*3.2,fr*.4);g.fillRect(-fr*1.6,fr*1,fr*3.2,fr*.4);g.fillStyle='#c9d3e0';g.fillRect(fr*.8,-fr*.25,fr*1.4,fr*.5);g.restore()}
  else for(let i=0;i<n;i++){
   const ox=Math.cos(a)*(-i*fr*1.9)+Math.cos(a+Math.PI/2)*((i%2)-.5)*fr*1.2,oy=Math.sin(a)*(-i*fr*1.9)+Math.sin(a+Math.PI/2)*((i%2)-.5)*fr*1.2;
   const col=q.ty==='resc'?'#f6f6f2':'#f3c43b',coat=q.ty==='resc'?'#c8332c':'#1e2c52';
   tacMan(g,p[0]+ox,p[1]+oy,fr,col,q.down?a+Math.PI/2:a+(moving?Math.sin(T*8+i)*.15:0),{scba:q.f>=0||q.task==='rit',coat})}
  if(q.task==='attack'&&q.line&&q.pf>0&&!q.burst&&tgt&&!q.down){
   g.fillStyle='rgba(170,210,245,.5)';const rch=t*.4*Math.max(.25,q.pf);
   for(let k=0;k<7;k++){const ph=(T*2.2+k/7)%1,sp=(k%3-1)*.25;
    g.beginPath();g.arc(p[0]+Math.cos(a+sp)*(fr*2+ph*rch),p[1]+Math.sin(a+sp)*(fr*2+ph*rch),fr*(.3+ph*.7),0,TAU);g.fill()}}
  if(q.carry){g.fillStyle='rgba(236,234,227,.95)';g.save();g.translate(p[0],p[1]);g.rotate(a);g.fillRect(-fr*3,-fr*.6,fr*2.4,fr*1.2);
   g.fillStyle='#7a4a9a';g.fillRect(-fr*2.8,-fr*.4,fr*1.6,fr*.8);g.restore()}
  g.font='10px '+FONT;g.textAlign='left';g.textBaseline='bottom';
  const lx=p[0]-fr*2,ly=p[1]-fr*3;
  g.fillStyle=q.down?'#ff5a4a':sel?'#e9a13b':'rgba(236,234,227,.9)';
  g.fillText((q.down?'MAYDAY ':'')+(q.task==='rit'||q.task==='ritgo'?'RIT ':'')+q.cs+(q.line&&q.f>=0?' '+Math.round(q.pf*100)+'%':''),lx,ly);
  if(q.ty!=='robot'){g.fillStyle='rgba(0,0,0,.6)';g.fillRect(lx,ly+1,26,3);
   g.fillStyle=q.air<.25?'#e2564f':q.air<.5?'#e9a13b':'#5dcaa5';g.fillRect(lx,ly+1,26*q.air,3)}
  TAC.hits.unshift({t:'sq',id:q.u,x:p[0]-fr*3.5,y:p[1]-fr*4,w:fr*7,h:fr*7})}
 // 雲梯組與幫浦組也可以點車輛選取
 for(const q of B.sq){const p=TP[q.u];if(p&&(q.ty==='ladder'||q.ty==='pump'))TAC.hits.push({t:'sq',id:q.u,x:p[0]-14,y:p[1]-14,w:28,h:28});
  if(p&&TAC.sq===q.u){g.strokeStyle='#e9a13b';g.lineWidth=2;g.strokeRect(p[0]-28,p[1]-14,56,28)}}
 // 樓層選擇列
 g.fillStyle='#161615';g.fillRect(0,0,G.sx+G.sw+10,tH);
 g.fillStyle='#9d9a92';g.font='10px '+FONT;g.textAlign='center';g.textBaseline='top';g.fillText('樓層',G.sx+G.sw/2,8);
 const ry=G.fy(B.F);
 g.fillStyle=B.roof?'#07080a':'#3a3833';g.fillRect(G.sx,ry+G.sh*.35,G.sw,G.sh*.55);
 g.fillStyle=B.roofV&&(T*2)%1<.6?'#ff8a6a':'#9d9a92';g.textBaseline='middle';g.fillText(B.roofV?'屋頂 ⚠'+(B.roofS?B.roofV:''):B.roof?'屋頂 開':'屋頂',G.sx+G.sw/2,ry+G.sh*.62);
 if(vf>=B.F){g.strokeStyle='#e9a13b';g.lineWidth=2;g.strokeRect(G.sx-1,ry+G.sh*.35-1,G.sw+2,G.sh*.55+2)}
 TAC.hits.push({t:'flr',f:B.F,x:G.sx,y:ry,w:G.sw,h:G.sh});
 for(let f=0;f<B.F;f++){
  const y=G.fy(f),h=G.sh-3;let mh=0,ms=0,vic=0;
  for(let c=0;c<B.W;c++){const x=tacCel(B,f,c);mh=Math.max(mh,x.h);ms=Math.max(ms,x.s);if(x.srch>=1)vic+=x.vic}
  g.fillStyle='#24211d';g.fillRect(G.sx,y,G.sw,h);
  if(ms>.05){g.fillStyle='rgba(90,92,98,'+(ms*.8).toFixed(2)+')';g.fillRect(G.sx,y,G.sw,h)}
  if(mh>.05){g.fillStyle='rgba(255,'+(120-mh*70|0)+',40,'+(.25+mh*.7).toFixed(2)+')';g.fillRect(G.sx,y+h*.5,G.sw*Math.min(1,mh*1.2),h*.5)}
  if(f===vf){g.strokeStyle='#e9a13b';g.lineWidth=2;g.strokeRect(G.sx-1,y-1,G.sw+2,h+2)}
  g.fillStyle=f===B.of?'#ff8a6a':'#eceae3';g.font='600 11px '+FONT;g.textAlign='left';g.textBaseline='middle';g.fillText(tacFlr(B,f),G.sx+3,y+h/2);
  if(f===B.bf&&B.bf){g.strokeStyle='#5dcaa5';g.lineWidth=1;g.beginPath();g.moveTo(G.sx-2,y+h+1.5);g.lineTo(G.sx+G.sw+2,y+h+1.5);g.stroke()}
  if(f<B.bf){g.fillStyle='rgba(0,0,0,.25)';g.fillRect(G.sx,y,G.sw,h)}
  const ns=B.sq.filter(q=>q.f===f).length,dn=B.sq.some(q=>q.f===f&&q.down);
  if(ns){g.fillStyle=dn&&(T*3)%1<.5?'#ff5a4a':'#f3c43b';g.textAlign='right';g.fillText('●'+ns,G.sx+G.sw-3,y+h/2)}
  if(vic||(f===B.hint&&B.cells.some(x=>x.f===f&&x.vic>0&&x.srch<1))){g.fillStyle='#e9a13b';g.font='9px '+FONT;g.textAlign='center';g.fillText(vic?'受困':'通報',G.sx+G.sw*.55,y+h/2)}
  TAC.hits.push({t:'flr',f,x:G.sx,y,w:G.sw,h})}
 // 提示列
 g.font='12px '+FONT;g.textAlign='left';g.textBaseline='top';g.fillStyle='rgba(236,234,227,.85)';
 const sq=B.sq.find(q=>q.u===TAC.sq);
 g.fillText((vf>=B.F?'屋頂':tacFlr(B,vf)+' 平面'+(vf<B.bf?'（地下室：無對外窗）':''))+'　'+(sq?(TAC.ord?'【'+sq.cs+'】'+TAC_TASK[TAC.ord]+'：點選目標'+(TAC.ord==='truck'?'道路':'')+'（Esc 取消）':'【'+sq.cs+'】點空間＝預設指令；點道路＝移車'):'點選小組或車輛（或按 1–9），再點房間、走廊或道路；左側／滾輪／[ ] 切換樓層'),G.sx+G.sw+18,8);
 if(B.mayday){g.fillStyle='rgba(226,86,79,'+(.6+.4*Math.sin(T*8)).toFixed(2)+')';g.font='700 14px '+FONT;g.textAlign='right';g.fillText('MAYDAY × '+B.mayday+'　'+B.sq.filter(q=>q.down).map(q=>q.cs+' '+tacFlr(B,q.f)).join('、'),tW-10,8)}}
// 面板 HTML
function tacTopHTML(inc){
 const B=inc.tac,others=S.inc.filter(i=>i!==inc),wait=others.filter(i=>!onScene(i).length).length;
 let idle=0;for(const u of S.units)if(u.st==='idle')idle++;
 return '<b class="tt">⚔ 戰術指揮</b><span>'+esc(inc.nm||KIND[inc.k].n)+' · '+esc(inc.addr)+'</span>'+
  '<span class="chip"><i>時</i><b>'+fmt(S.t)+'</b></span><span class="chip"><i>進度</i><b>'+Math.round(Math.min(1,inc.work/inc.dur)*100)+'%</b></span>'+
  '<span class="chip"><i>評鑑</i><b>'+Math.round(S.rep)+'</b></span>'+
  '<span class="strat">戰略 AI 代理中：其他案件 '+others.length+' 件'+(wait?'（待派 '+wait+'）':'')+' · 待命 '+idle+' 車</span>'+
  '<span class="sp"></span><span class="tmsg">'+esc(msg||'')+'</span>'+
  '<button data-tpause="1">'+(paused?'繼續':'暫停')+'</button><button data-texit="1">返回指揮中心（交由 AI 指揮）</button>'}
function tacSideHTML(inc){
 const B=inc.tac,L=tacCapAll(inc,B),used=B.sq.filter(q=>q.line).length;
 let left=0,unk=0;for(const x of B.cells){left+=x.vic}
 for(const x of B.cells)if(x.c&&x.srch<1)unk++;
 let sumH=0;for(const x of B.cells)sumH+=x.h;
 const rit=B.sq.filter(q=>q.task==='rit'||q.task==='ritgo').map(q=>q.cs);
 let h='<div class="hd">現場狀況</div><div class="kv">'+
  '<div><b>建物</b>地上 '+(B.F-B.bf)+' 層'+(B.bf?'＋B1':'')+' · 每層 '+B.R+' 室</div><div><b>起火層</b>'+tacFlr(B,B.of)+'</div>'+
  '<div><b>火勢</b>'+Math.round(sumH/Math.max(.001,B.peak)*100)+'%</div><div><b>出水</b>'+(waterOK(inc)?'正常':'<span style="color:var(--red)">無水</span>')+'</div>'+
  '<div><b>水線</b>'+used+' / '+L+' 線</div><div><b>正壓排煙</b>'+(B.ppv?'運轉中':'—')+'</div>'+
  '<div><b>受困</b>通報 '+B.vtot+' 人</div><div><b>救出</b>'+B.resc+(B.lost?' · <span style="color:var(--red)">罹難 '+B.lost+'</span>':'')+'</div>'+
  '<div><b>未搜索</b>'+unk+' 室</div><div><b>RIT</b>'+(rit.length?rit.join('、'):'<span style="color:var(--amb)">未編成</span>')+'</div></div>';
 if(B.mayday)h+='<div class="note" style="background:var(--red);color:#111">MAYDAY：'+B.sq.filter(q=>q.down).map(q=>q.cs+' '+tacFlr(B,q.f)).join('、')+'</div>';
 if(B.lodd)h+='<div class="note">殉職 '+B.lodd+' 組</div>';
 // 周邊與佈線
 // 傷患集結與後送
 const cnt={red:0,yellow:0,green:0};for(const p of B.pts)cnt[p.sev]++;
 const amb=onScene(inc).filter(u=>u.code==='91'&&u.st==='work'),ambF=tacAmbFree(inc,B);
 h+='<div class="hd mt">傷患集結與後送</div><div class="row" style="padding:2px 0;flex-wrap:wrap;gap:6px"><span>'+
  '<span class="tag" style="background:var(--red)">紅 '+cnt.red+'</span> <span class="tag" style="background:var(--amb)">黃 '+cnt.yellow+'</span> <span class="tag" style="background:var(--grn)">綠 '+cnt.green+'</span></span>'+
  '<span class="sub">救護車 可用 '+ambF+' / 在場 '+amb.length+' · 已送醫 '+B.tx+'</span>'+
  '<button data-tamb="1"'+(inc.req?' disabled':'')+'>請求救護車</button></div>';
 if(B.pts.length&&!ambF)h+='<div class="sub" style="color:var(--red)">傷患在現場等待後送，傷勢持續惡化！</div>';
 // 站點
 h+='<div class="hd mt">現場站點</div>';
 for(const d of TAC_STN){const o=B.st[d.k];let st;
  if(o){const u=S.units.find(x=>x.id===o.u);st='<span style="color:var(--grn)">開設中</span> <span class="sub">'+(u?u.cs:'警方')+'</span>'}
  else{const r=tacStnPick(inc,B,d.k);st='<span class="sub">'+(r.why||'可開設')+'</span>'}
  h+='<div class="row" style="padding:2px 0" title="'+esc(d.fx)+'"><span>'+d.n+' '+st+'</span><button data-tstn="'+d.k+'"'+(!o&&tacStnPick(inc,B,d.k).why?' disabled':'')+'>'+(o?'撤除':'開設')+'</button></div>'}
 // 職務
 const slots=tacRoleSlots(inc,B),rUsed=Object.values(B.role).filter(Boolean).length;
 h+='<div class="hd mt">職務指派（幕僚 '+rUsed+' / '+slots+'）</div><div class="tords">';
 for(const r of TAC_ROLE)h+='<button data-trole="'+r.k+'" title="'+esc(r.fx)+'"'+(B.role[r.k]?' class="on"':'')+(!B.role[r.k]&&rUsed>=slots?' disabled':'')+'>'+r.n+'</button>';
 h+='</div>'+(slots?'':'<div class="sub">開設指揮站後，每輛指揮車可提供 2 名幕僚。</div>');
 // 周邊與水源
 h+='<div class="hd mt">周邊與水源</div><div class="kv">'+TAC_SIDES.map(x=>{const d=B.sd[x];
  return'<div><b>'+TAC_SDN[x]+'側</b>'+(d.road?(d.big?d.nm:'<span style="color:var(--amb)">'+d.nm+'・大型車禁入</span>'):'<span style="color:var(--fg3)">'+d.nm+'</span>')+'</div>'}).join('')+
  Object.keys(B.exp).map(x=>'<div><b>'+TAC_SDN[x]+'側鄰棟受熱</b>'+(B.expL[x]?'<span style="color:var(--red)">已延燒</span>':
   '<span style="color:'+(B.exp[x]>.5?'var(--red)':B.exp[x]>.25?'var(--amb)':'var(--fg2)')+'">'+Math.round(B.exp[x]*100)+'%</span>'+(B.sq.some(q=>q.task==='cover'&&q.cside===x)?' · 防護中':''))+'</div>').join('')+
  '<div><b>消防栓</b>'+(B.hyd?TAC_SDN[B.hyd.side]+'側 '+B.hyd.d+' m'+(tacHydOK(inc,B)?'':' <span style="color:var(--red)">未佔水</span>'):inc.tender?'無，水庫車供水':'無')+'</div>'+
  '<div><b>送水口</b>'+(B.sp?TAC_SDN[B.sp.side]+'側 '+(B.sp.on?'<span style="color:var(--grn)">加壓中</span>':'未接'):'無（五層以下）')+'</div></div>';
 const ls=B.sq.filter(q=>q.line&&q.ty!=='ladder');
 if(ls.length){h+='<div class="hd mt">水線（長度・水壓）</div>';
  for(const q of ls)h+='<div class="row" style="padding:2px 0"><span class="mono">'+q.cs+'</span><span class="sub">'+(q.src==='sp'?'連結送水管':'自 '+(B.sq.find(x=>x.u===q.lu)||{cs:''}).cs+(q.lent?' 經'+TAC_SDN[q.lent.side]+'側入口':''))+
   ' · '+q.len+' 條 · <b style="color:'+(q.burst>0?'var(--red)':q.pf>=.7?'var(--blu)':q.pf>=.4?'var(--amb)':'var(--red)')+'">'+(q.burst>0?'燒破':Math.round(q.pf*100)+'%')+'</b></span></div>'}
 h+='<div class="hd mt">無線電</div><div class="tlog">';
 for(const l of inc.log.slice(-8).reverse())h+='<div class="'+(l.w==='台'?'lt':'lf')+'">'+esc(l.s)+'</div>';
 return h+'</div>'}
function tacBotHTML(inc){
 const B=inc.tac,sq=B.sq.find(q=>q.u===TAC.sq);
 let h='<div class="tsqs">';
 B.sq.forEach((q,i)=>{
  h+='<div class="tsq'+(q.u===TAC.sq?' sel':'')+(q.down?' dn':'')+'" data-tsq="'+q.u+'"><div class="row" style="padding:0"><b class="mono">'+(i<9?(i+1)+' ':'')+q.cs+'</b>'+
   '<span class="sub">'+TAC_TYN[q.ty]+' '+q.n+' 人</span></div>'+
   '<div class="sub">'+(q.down?'<span style="color:var(--red)">倒地待救</span>':(q.task==='station'?'駐守'+tacStnDef(q.stn).n:TAC_TASK[q.task])+(q.prev?'（換瓶休息後續行）':''))+' · '+(q.ty==='ladder'&&q.lf!==undefined&&q.task!=='idle'?'雲梯→'+tacNm(inc.tac,q.lf,q.lc):tacNm(inc.tac,q.f,q.c))+(q.line?' · 💧'+(q.burst>0?'燒破':Math.round(q.pf*100)+'%'):'')+'</div>'+
   ((q.ty==='pump'||q.ty==='ladder')?'<div class="sub">車：'+(q.tmv?'移車往'+TAC_SDN[q.tgt]+'側':TAC_SDN[q.tside]+'側')+'</div>':'')+
   (q.ty!=='robot'&&q.ty!=='ladder'?'<div class="sub">疲勞 <span style="color:'+(q.fat>.7?'var(--red)':q.fat>.4?'var(--amb)':'var(--fg2)')+'">'+Math.round(q.fat*100)+'%</span> · 備用瓶 '+(B.st.air?'充填區':q.cyl)+'</div>':'')+
   (q.ty==='robot'||q.ty==='ladder'?'':'<div class="bar"><i style="width:'+Math.round(q.air*100)+'%;background:'+(q.air<.25?'var(--red)':q.air<.5?'var(--amb)':'var(--grn)')+'"></i></div>')+
   '<div class="bar hp"><i style="width:'+Math.round(Math.max(0,q.hp)*100)+'%"></i></div></div>'});
 if(!B.sq.length)h+='<div class="sub">尚無可編組的小組到場（幫浦、雲梯、救助、排煙、機器人）。</div>';
 h+='</div><div class="tords">';
 // 用一間有窗的 1F 房間試算能力，只依小組類型決定按鈕能不能按
 const pr=(B.L.N.find(n=>n.ty==='room'&&n.wins&&n.wins.some(w=>B.sd[w].road))||B.L.N.find(n=>n.ty==='room')).c;
 for(const gp of TAC_GRP){h+='<span class="tgl">'+gp[0]+'</span>';
  for(const o of gp[1]){const t=TAC_NEEDT[o[0]];
   let dis=!sq;
   if(sq){const why=o[0]==='truck'?tacCan(B,sq,'truck'):o[0]==='roofres'?tacCan(B,sq,'roofres',B.F-1,0):o[0]==='roof'?tacCan(B,sq,'roof',B.F-1,0):tacCan(B,sq,o[0],t?B.bf:-1,t?pr:0);
    dis=!!why&&!/高度|道路|窗|地下|樓梯|搜索/.test(why)}
   h+='<button data-tord="'+o[0]+'" title="'+esc(o[3])+'"'+(TAC.ord===o[0]?' class="on"':'')+(dis?' disabled':'')+'>'+o[1]+' <span class="sub">'+o[2]+'</span></button>'}}
 h+='<button data-tord="evac" style="border-color:var(--red);margin-left:auto">全員撤出</button></div>';
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
function tacSel(B,id){TAC.sq=id;TAC.ord=null;const q=B.sq.find(x=>x.u===id);
 if(q){const f=q.ty==='ladder'?(q.task!=='idle'&&q.lf!==undefined?q.lf:-1):q.f;if(f>=0)TAC.vf=f}}
function tacFloor(B,d){TAC.vf=Math.max(0,Math.min(B.F,TAC.vf+d))}
function tacCmd(k){
 const inc=S.inc.find(i=>i.id===TAC.id);if(!inc)return;
 const B=inc.tac;
 if(k==='evac'){let n=0;for(const q of B.sq)if(tacIn(q)&&!q.down){q.task='exit';q.tf=-1;q.tc=0;q.prev=null;n++}
  radio(inc,'受理','緊急撤退！所有入室小組立即撤出建物，人員清點。');msg=n?'已下令 '+n+' 組撤出':'';TAC.ord=null;return}
 const q=B.sq.find(x=>x.u===TAC.sq);
 if(!q){msg='請先選擇小組';return}
 if(TAC_NEEDT[k]){TAC.ord=TAC.ord===k?null:k;return}
 if(k==='stand'){tacOrder(inc,q,'stand',-1,0);TAC.ord=null;return}
 if(k==='roofres'){tacOrder(inc,q,'roofres',B.F-1,0);TAC.ord=null;return}
 tacOrder(inc,q,k,k==='roof'?B.F-1:-1,0);TAC.ord=null}
tcv.addEventListener('contextmenu',e=>e.preventDefault());
tcv.addEventListener('wheel',e=>{const inc=S.inc.find(i=>i.id===TAC.id);if(!inc||!inc.tac)return;
 e.preventDefault();tacFloor(inc.tac,e.deltaY<0?1:-1)},{passive:false});
tcv.addEventListener('pointerdown',e=>{
 const inc=S.inc.find(i=>i.id===TAC.id);if(!inc||!inc.tac)return;
 const B=inc.tac,r=tcv.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;
 const hit=TAC.hits.find(h=>x>=h.x&&x<=h.x+h.w&&y>=h.y&&y<=h.y+h.h);
 if(hit&&hit.t==='flr'){TAC.vf=hit.f;return}
 if(hit&&hit.t==='sq'&&e.button!==2){tacSel(B,hit.id);tBotH='';tacUI();return}
 const q=B.sq.find(s=>s.u===TAC.sq);
 if(!q)return;
 let f=-1,c=0,side=null;
 if(hit&&hit.t==='roof'){if(tacOrder(inc,q,'roofres',B.F-1,0)){TAC.ord=null;tBotH='';tacUI()}return}
 if(hit&&hit.t==='cell'){f=hit.f;c=hit.c}
 else if(hit&&hit.t==='side')side=hit.s;
 else return;
 let k=(e.button===2||!TAC.ord)?tacDefault(B,q,f,c):TAC.ord;
 // 點道路：幫浦／雲梯車移車；排煙組在該側入口做正壓排煙；室內小組撤出
 if(side&&B.exp[side]!==undefined&&!B.sd[side].road)k=q.ty==='pump'?'cover':'';
 else if(side&&k!=='truck'&&k!=='cover'&&k!=='guard')k=tacIn(q)?'exit':(q.ty==='pump'||q.ty==='ladder')&&side!==q.tside?'truck':q.ty==='vent'?'ppv':k;
 if(k==='guard'&&side)k='cover';
 if(!k){msg='點鄰棟可下令幫浦組做鄰棟防護射水';return}
 if((k==='truck'||k==='cover')&&!side){msg=k==='truck'?'移車請點選建物外的道路':'鄰棟防護請點選鄰棟那一側';return}
 if(TAC_NEEDT[k]&&k!=='truck'&&k!=='cover'&&f<0){msg='請點選建物內的房間';return}
 tacOrder(inc,q,k,f,c,false,side);TAC.ord=null;tBotH='';tacUI()});
document.getElementById('tac').addEventListener('click',e=>{
 const b=e.target.closest('[data-tsq],[data-tord],[data-tpause],[data-texit],[data-tamb],[data-tstn],[data-trole]');if(!b)return;
 const D=b.dataset;msg='';
 const ic=S.inc.find(i=>i.id===TAC.id);
 if(ic&&ic.tac){const B=ic.tac;
  if(D.tamb)tacAmbReq(ic,B);
  if(D.tstn){if(B.st[D.tstn])tacStnClose(ic,B,D.tstn);else tacStnOpen(ic,B,D.tstn)}
  if(D.trole)tacRoleSet(ic,B,D.trole,!B.role[D.trole])}
 if(D.texit){tacClose();return}
 if(D.tpause){paused=!paused;$('btnPause').textContent=paused?'繼續':'暫停'}
 if(D.tsq){const inc=S.inc.find(i=>i.id===TAC.id);if(inc)tacSel(inc.tac,+D.tsq)}
 if(D.tord)tacCmd(D.tord);
 tTopH=tBotH='';tacUI()});
document.addEventListener('keydown',e=>{
 if(!TAC.open||e.target.tagName==='INPUT')return;
 const inc=S.inc.find(i=>i.id===TAC.id);if(!inc)return;
 const k=e.key.toLowerCase();
 if(k==='escape'){if(TAC.ord)TAC.ord=null;else tacClose();}
 else if(k===' '){e.preventDefault();paused=!paused;$('btnPause').textContent=paused?'繼續':'暫停'}
 else if(/^[1-9]$/.test(k)){const q=inc.tac.sq[+k-1];if(q)tacSel(inc.tac,q.u)}
 else if(k==='['||k==='pagedown'){e.preventDefault();tacFloor(inc.tac,-1)}
 else if(k===']'||k==='pageup'){e.preventDefault();tacFloor(inc.tac,1)}
 else if(TAC_KEYS[k]){msg='';tacCmd(TAC_KEYS[k])}
 else return;
 tTopH=tBotH='';tacUI()});
