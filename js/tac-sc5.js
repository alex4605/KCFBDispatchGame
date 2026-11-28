// 戰術指揮：沿用現成機制的小型救助勤務——車禍受困、兒童受困車內（mvc 場景）、機械夾傷、工安墜落（工地／廠區場景）、
// 電線掉落（變電箱場景＋斷電）、集體食物中毒（大量傷病患場景）、露營帳篷火警（雜草火場景）
'use strict';
Object.assign(TACK,{
 rtc:{f:[1,1],lay:'yard',yard:'hwy',k:[2,2],b:0,out:1,nofire:1,sc:'mvc',nv:[1,2],city:1,small:1},
 kidcar:{f:[1,1],lay:'yard',yard:'hwy',k:[2,2],b:0,out:1,nofire:1,sc:'mvc',nv:[1,2],city:1,small:1},
 machine:{f:[1,1],lay:'yard',yard:'csite',k:[2,3],b:0,out:1,nofire:1,sc:'crane',mach:1},
 fall:{f:[1,1],lay:'yard',yard:'csite',k:[2,3],b:0,out:1,nofire:1,sc:'crane',fall:1},
 powerline:{f:[1,1],lay:'yard',yard:'road',k:[2,2],b:0,out:1,vic:[0,0],sc:'elec'},
 foodpois:{f:[1,1],lay:'yard',yard:'plaza',k:[3,3],b:0,out:1,nofire:1,sc:'crowd',mci:1},
 tentfire:{f:[1,1],lay:'yard',yard:'grass',k:[3,3],b:0,out:1,wild:1,camp:1,vic:[0,1]}});
Object.assign(TAC_RK,{wire:{n:'掉落電線',fk:0,sr:.3},tent:{n:'帳篷',fk:1.4,sr:.8},mach:{n:'滾輪機台',fk:.8,sr:.8}});
// 開場：依案類調整現成場景（回傳受困者人數的增減）
function tacSc5Post(inc,B,T){
 const k=inc.k,R=Math.random,N=B.L.N,rooms=N.filter(n=>n.ty==='room'),cel=c=>tacCel(B,0,c),pk=a=>a[Math.floor(R()*a.length)];let d=0;
 const clr=x=>{d-=x.vic||0;x.vic=0;x.pin=0;x.hid=0;x.rep=0},add=(x,n,vh)=>{x.vic=(x.vic||0)+n;x.vh=vh;x.rep=1;d+=n};
 const noLeak=()=>{if(B.leak){const x=cel(B.leak.c);x.fuel=0;x.h=0;x.s=0}B.chem=null;B.leak=null;B.chemK=0;for(const x of B.cells)x.cz=0};
 if(k==='rtc'){const vs=rooms.filter(n=>/^(car|cab)$/.test(n.kind));
  if(vs.length&&!B.cells.some(x=>x.pin>0)){const x=cel(vs[0].c);if(!(x.vic>0))add(x,1,.6);x.pin=1}
  const p=B.cells.reduce((s,x)=>s+(x.pin||0),0);
  B.sc.brief='車禍受困：市區道路 '+vs.length+' 輛車碰撞，'+p+' 名駕駛或乘客被變形的車體夾住。先在來車方向設置警戒，車輛穩固（墊木、拔鑰匙斷電，避免未爆氣囊爆開）後破壞救援；受困較久的先醫療處置，救出後上長背板送醫'+(B.chem?'；有車輛漏油，禁止火源':'')+'。';
  B.sc.done='受困者都已救出送醫';return d}
 if(k==='kidcar'){noLeak();for(const x of B.cells)if(x.vic||x.pin)clr(x);
  const cs=rooms.filter(n=>n.kind==='car'),c=pk(cs.length?cs:rooms.filter(n=>/^(cab|bus)$/.test(n.kind))),x=cel(c.c);add(x,1,.78);x.pin=1;x.stab=1;x.kidc=1;B.of=0;B.oc=c.c;
  B.sc.brief='兒童受困車內：家長下車時鑰匙鎖在車內，'+tacNm(B,0,c.c)+'裡有一名幼童，烈日下車內溫度快速上升（每分鐘惡化）。不必等開鎖：選離孩子最遠的車窗「破壞救援」破窗開鎖，抱出後交救護降溫。';
  B.sc.done='幼童已救出、交救護送醫';return d}
 if(k==='machine'){B.mach=1;B.pwScn=1;
  for(const n of rooms)if(n.kind==='debris'){n.kind='mach';const x=cel(n.c);x.rub=0;x.k=0;x.stab=1;if(!(x.vic>0)){add(x,1,.65)}x.pin=1;x.vic=Math.min(x.vic,1);B.oc=n.c}
  for(const n of rooms)if(n.kind!=='mach'){const x=cel(n.c);x.rub=0;if(x.vic)clr(x)}
  const t=tacTxt(inc);
  B.sc.brief='機械夾傷：工廠員工'+(/手/.test(t)?'的手':'的肢體')+'被捲進'+tacNm(B,0,B.oc)+'的滾輪機。先通知廠方機台斷電、上鎖掛牌（LOTO），斷電前不能拆解（機台可能再轉動）；斷電後以油壓擴張器、切斷滾輪軸「破壞救援」，受困較久先醫療處置止血、輸液。';
  B.sc.done='受困員工已救出送醫';return d}
 if(k==='fall'){
  for(const n of rooms){const x=cel(n.c);x.rub=0;if(x.vic)clr(x);if(n.kind==='crane'||n.kind==='debris')n.kind=n.kind==='crane'?'site':'scaf'}
  const sc=rooms.filter(n=>n.kind==='site'),c=pk(sc.length?sc:rooms),x=cel(c.c);add(x,1,.5);x.lbv=1;B.oc=c.c;
  if(R()<.35){const s2=rooms.filter(n=>n.kind==='scaf'&&n!==c);if(s2.length){const y=cel(pk(s2).c);add(y,1,.8)}}
  B.sc.brief='工安墜落：工人從鷹架摔落'+tacNm(B,0,c.c)+'，人有反應但不能動，疑似頸椎、脊椎受傷：不可隨意搬動，要上長背板、頸圈固定（4 人以上搬運）；鷹架上還可能有受傷的同事。';
  B.sc.done='墜落工人已固定、送醫';return d}
 if(k==='powerline'){const o=N[B.ebx],x=cel(B.ebx);o.kind='wire';x.k=0;x.h=0;x.s=0;x.fu=0;B.wire=B.ebx;
  const nb=rooms.filter(n=>/^(car|scoot)$/.test(n.kind)).sort((a,b)=>tacGd(B,a.c,o.c)-tacGd(B,b.c,o.c)),cr=nb[0]||null;
  if(cr){const y=cel(cr.c);add(y,R()<.5?2:1,.9);y.inCar=1}
  B.sc.brief='電線掉落：颱風吹斷的電線垂到路面，還在冒火花'+(cr?'，壓在旁邊'+tacNm(B,0,cr.c)+'上，車上的人被困在車內':'')+'。電線還帶電：請車上的人留在車內不要下車，所有人遠離電線，通知台電斷電；斷電前不能接近電線與車輛，斷電後再救出。';
  B.sc.done='台電已斷電、車上民眾已救出';return d}
 if(k==='foodpois'){const pl=pk(['學校午餐','婚宴','員工餐廳','宮廟流水席']),tot=B.cells.reduce((s,x)=>s+(x.vic||0),0);
  B.sc.brief='集體食物中毒：'+pl+'後多人嘔吐、腹瀉、虛弱，傷患約 '+tot+' 名散在會場各區（有人脫水嚴重）。開設檢傷站、醫療站，依紅黃綠分類後送，加派救護車；通報衛生局採檢。';
  B.sc.done='傷患都已檢傷、後送完畢';return d}
 return d}
// 每幀：車內高溫
function tacSc5Step(inc,B,dt){for(const x of B.cells)if(x.kidc&&x.vic>0)x.vh-=dt*.002}
// 拒絕：機台沒斷電、電線帶電
function tacSc5Refuse(B,q,k,f,c,rt){
 if(B.mach&&B.pwOn&&k==='extr')return'拒絕：機台還沒斷電上鎖（LOTO），拆解時可能再轉動；先通知廠方斷電（側欄）';
 if(B.wire!==undefined&&B.pwOn){const bad=p=>p===B.wire||tacCel(B,0,p).inCar;if(bad(c)||rt.some(p=>p[1]===B.wire))return'拒絕：電線還帶電，接近電線與被壓住的車輛有觸電危險；先通知台電斷電（側欄）'}
 return''}
// 繪製：掉落電線、帳篷
function tacSc5Draw(g,G,B,n,x,r,k,dark){
 if(k==='wire'){g.fillStyle=dark?'#151412':'#2e2d2b';g.fillRect(r[0],r[1],r[2],r[3]);g.strokeStyle=B.pwOn?'rgba(233,193,59,.25)':'rgba(120,115,105,.2)';g.lineWidth=1;g.setLineDash([4,4]);g.beginPath();g.arc(r[0]+r[2]/2,r[1]+r[3]/2,Math.min(r[2],r[3])*.46,0,TAU);g.stroke();g.setLineDash([]);
  g.strokeStyle='#c9c4b8';g.lineWidth=2.5;g.beginPath();
  for(let i=0;i<=8;i++){const u=i/8,xx=r[0]+r[2]*u,yy=r[1]+r[3]*(.3+.4*u)+Math.sin(u*9)*6;i?g.lineTo(xx,yy):g.moveTo(xx,yy)}g.stroke();
  if(B.pwOn&&Math.sin(G.t*13+n.c)>.3){const sx=r[0]+r[2]*(.3+.4*Math.random()),sy=r[1]+r[3]*.5;g.strokeStyle='#ffe27a';g.lineWidth=1.5;for(let i=0;i<5;i++){const a=Math.random()*TAU;g.beginPath();g.moveTo(sx,sy);g.lineTo(sx+Math.cos(a)*8,sy+Math.sin(a)*8);g.stroke()}}
  g.fillStyle=B.pwOn?'#e9c13b':'#7d7a74';g.font='600 10px '+FONT;g.textAlign='center';g.textBaseline='bottom';g.fillText(B.pwOn?'⚡ 帶電':'已斷電',r[0]+r[2]/2,r[1]+r[3]-3);return true}
 if(k==='mach'){g.fillStyle=dark?'#1a1816':'#3a3e44';g.fillRect(r[0]+r[2]*.12,r[1]+r[3]*.3,r[2]*.76,r[3]*.45);
  for(let i=0;i<3;i++){const cx=r[0]+r[2]*(.28+.22*i),cy=r[1]+r[3]*.52,R=Math.min(r[2],r[3])*.11;g.fillStyle='#8a8f96';g.beginPath();g.arc(cx,cy,R,0,TAU);g.fill();g.strokeStyle='#4f555c';g.lineWidth=2;g.beginPath();g.moveTo(cx-R*.7,cy);g.lineTo(cx+R*.7,cy);g.stroke()}
  g.fillStyle=B.pwOn?'#e9c13b':'#7d7a74';g.font='600 10px '+FONT;g.textAlign='center';g.textBaseline='bottom';g.fillText(B.pwOn?'⚡ 電源未斷':'已斷電上鎖',r[0]+r[2]/2,r[1]+r[3]*.74);return true}
 if(k==='tent'){const burnt=x.fu<.3;g.fillStyle=burnt?'#161412':'#1a2e1e';g.fillRect(r[0],r[1],r[2],r[3]);
  const cols=['#d9823b','#3b7dd9','#4fae6a','#c44a4a'];
  for(let i=0;i<2;i++){const cx=r[0]+r[2]*(.3+.4*i),cy=r[1]+r[3]*(.4+.2*i),w=Math.min(r[2],r[3])*.32;g.fillStyle=burnt?'#2a2622':cols[(n.c+i)%4];
   g.beginPath();g.moveTo(cx,cy-w*.6);g.lineTo(cx+w*.7,cy+w*.5);g.lineTo(cx-w*.7,cy+w*.5);g.closePath();g.fill();g.strokeStyle='rgba(0,0,0,.4)';g.lineWidth=1;g.beginPath();g.moveTo(cx,cy-w*.6);g.lineTo(cx,cy+w*.5);g.stroke()}
  return true}
 return false}
