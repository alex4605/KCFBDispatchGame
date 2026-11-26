// 戰術指揮：建物火災的樓層平面模型、火煙動態、小組指令與現場戰術 AI
// 每層平面相同：節點 0 是樓梯間（不燃，上下樓與出入口），中間一排走廊，走廊南北兩側各一排房間；
// 節點之間有門（人、煙、火可通過）或牆（只有火會慢慢延燒）。f=-1 代表建物外
'use strict';
// 可進入戰術指揮的案類：樓層數、格局（house 透天、corridor 走廊式、open 開放賣場／廠房）、每排空間數、樓梯座數
const TACK={mfire:{f:[2,4],lay:'house',k:[1,1]},hifire:{f:[7,10],lay:'corridor',k:[3,4]},fact:{f:[1,2],lay:'open',k:[3,3],st:1},
 deptfire:{f:[5,7],lay:'open',k:[3,4],st:2},skyscraper:{f:[11,14],lay:'corridor',k:[3,3]},hospfire:{f:[4,6],lay:'corridor',k:[4,4]}};
// 玩家戰術畫面的介面狀態
const TAC={open:false,id:null,sq:null,ord:null,hits:[]};
const TAC_AIR=110; // 滿瓶可在室內作業的秒數
const TAC_LADR={'21':10,'31':7}; // 雲梯可達樓層數
// 車種 → 小組類型；水庫車、指揮車、救護車不編成入室小組
const TAC_SQ={'11':'pump','16':'pump','57':'pump','21':'ladder','31':'ladder','71':'resc','搜':'resc','75':'vent','履':'robot'};
const TAC_TYN={pump:'幫浦組',ladder:'雲梯組',resc:'救助組',vent:'排煙組',robot:'機器人'};
const TAC_TASK={cover:'鄰棟防護',idle:'待命',move:'移動',truck:'移車',stand:'接送水口',hold:'守線',attack:'射水攻擊',search:'搜索',carry:'搬運受困者',vent:'破窗排煙',roof:'屋頂排煙',
 ppv:'正壓送風',ladder:'雲梯救援',master:'雲梯外部射水',rit:'RIT 待命',ritgo:'RIT 救援',exit:'撤出'};
const tacRint=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
const tacCel=(B,f,c)=>B.cells[f*B.W+c];
const tacFlr=f=>f<0?'屋外':(f+1)+'F';
// 樓層平面：gx/gy/gw/gh 為平面格座標；nb 為門、wl 為共用牆；
// door[side] 為該側入口在平面上的位置、ent[side] 為入口通往的節點；房間貼著外牆的方向就有對外窗（wins）
function tacLayout(T,K){
 const N=[],add=o=>{o.c=N.length;o.nb=[];o.wl=[];N.push(o);return o};
 const door=(a,b)=>{a.nb.push(b.c);b.nb.push(a.c)},wall=(a,b)=>{a.wl.push(b.c);b.wl.push(a.c)};
 const SW=.6,L={N,door:{},ent:{}};let no=0;
 const room=(gx,gy,gw,gh)=>add({ty:'room',gx,gy,gw,gh,no:++no});
 if(T.lay==='house'){ // 透天：樓梯在一側，前後三間串連（前廳臨街、中間、後間）
  const st=add({ty:'stair',gx:0,gy:0,gw:SW,gh:3});
  const bk=room(SW,0,1.7,1),md=room(SW,1,1.7,1),fr=room(SW,2,1.7,1);
  door(st,md);door(md,bk);door(md,fr);wall(st,bk);wall(st,fr);
  L.GW=SW+1.7;L.GH=3;
  L.door={n:[SW+.85,0],s:[SW+.85,3],w:[0,1.5],e:[L.GW,1.5]};L.ent={n:bk.c,s:fr.c,w:st.c,e:md.c}}
 else if(T.lay==='open'){ // 開放空間：兩排賣場／廠區彼此相通，樓梯在西側（百貨東側另有一座）
  const st=add({ty:'stair',gx:0,gy:0,gw:SW,gh:2});
  const Z=[[],[]];
  for(let r=0;r<2;r++)for(let i=0;i<K;i++)Z[r].push(room(SW+i*1.2,r,1.2,1));
  for(let r=0;r<2;r++)for(let i=0;i<K;i++){if(i)door(Z[r][i-1],Z[r][i]);if(r)door(Z[0][i],Z[1][i])}
  door(st,Z[0][0]);door(st,Z[1][0]);
  L.GW=SW+K*1.2;L.GH=2;
  const m=Math.floor(K/2);
  L.door={n:[SW+m*1.2+.6,0],s:[SW+m*1.2+.6,2],w:[0,1]};L.ent={n:Z[0][m].c,s:Z[1][m].c,w:st.c};
  if(T.st===2){const s2=add({ty:'stair',gx:L.GW,gy:0,gw:SW,gh:2});door(s2,Z[0][K-1]);door(s2,Z[1][K-1]);L.GW+=SW;L.door.e=[L.GW,1];L.ent.e=s2.c}
  else{L.door.e=[L.GW,1.5];L.ent.e=Z[1][K-1].c}}
 else{ // 走廊式：中間走廊、南北兩排房間，樓梯在西端
  const st=add({ty:'stair',gx:0,gy:0,gw:SW,gh:3,cy:1.5}),H=[],No=[],So=[];
  for(let i=0;i<K;i++)H.push(add({ty:'hall',gx:SW+i,gy:1.1,gw:1,gh:.8}));
  for(let i=0;i<K;i++)No.push(room(SW+i,0,1,1.1));
  for(let i=0;i<K;i++)So.push(room(SW+i,1.9,1,1.1));
  door(st,H[0]);wall(st,No[0]);wall(st,So[0]);
  for(let i=0;i<K;i++){door(No[i],H[i]);door(So[i],H[i]);
   if(i){door(H[i-1],H[i]);wall(No[i-1],No[i]);wall(So[i-1],So[i])}}
  L.GW=K+SW;L.GH=3;
  L.door={n:[SW/2,0],s:[SW/2,3],w:[0,1.5],e:[L.GW,1.5]};L.ent={n:st.c,s:st.c,w:st.c,e:H[K-1].c}}
 // 貼著外牆的方向（房間有窗，鄰棟受熱也依此計算）
 for(const n of N){n.edge=[];
  if(n.gy<.01)n.edge.push('n');if(n.gy+n.gh>L.GH-.01)n.edge.push('s');
  if(n.gx<.01)n.edge.push('w');if(n.gx+n.gw>L.GW-.01)n.edge.push('e');
  if(n.ty==='room'&&n.edge.length){n.wins=n.edge.slice();n.win=n.wins[0]}}
 L.nr=N.filter(n=>n.ty==='room').length;
 return L}
const tacStair=(B,c)=>B.L.N[c].ty==='stair';
// 位置名稱：3F-302 室、3F 走廊、3F 樓梯間
function tacNm(B,f,c){
 if(f<0)return'屋外';const n=B.L.N[c];
 return(f+1)+'F'+(n.ty==='stair'?' 樓梯間':n.ty==='hall'?' 走廊':'-'+((f+1)*100+n.no)+' 室')}
const tacGd=(B,a,b)=>{const x=B.L.N[a],y=B.L.N[b];return Math.abs(x.gx+x.gw/2-y.gx-y.gw/2)+Math.abs(x.gy+x.gh/2-y.gy-y.gh/2)};
// 同層最近的符合條件節點（以平面距離計）
function tacNear(B,f,c,ok){let best=null,bd=99;
 for(let i=1;i<B.W;i++){const x=tacCel(B,f,i);if(!ok(x))continue;const d=tacGd(B,c,i);if(d<bd){bd=d;best=i}}
 return best}
function tacOK(inc){return !!TACK[inc.k]&&!!inc.rev&&!inc.wrap}
// 建立建物模型；若案件已依原本的抽象進度推進，火勢依進度縮小
function tacInit(inc){
 const T=TACK[inc.k],F=tacRint(T.f[0],T.f[1]),L=tacLayout(T,tacRint(T.k[0],T.k[1])),W=L.N.length,R=L.nr;
 const cells=[];
 for(let f=0;f<F;f++)for(const n of L.N)cells.push({f,c:n.c,ty:n.ty,h:0,fu:n.ty==='room'?1:n.ty==='hall'?.35:0,
  s:0,v:0,vic:0,vh:1,srch:n.ty==='room'?0:1,fl:0,wet:0});
 const load={'低':.8,'中':1,'高':1.2,'極高':1.4}[inc.pm.load]||1;
 const B={F,R,W,L,cells,exp:{},expW:{},expL:{},roof:0,ppv:0,ppvW:0,sq:[],resc:0,lost:0,vtot:0,peak:0,p:0,done:0,doneT:0,paid:0,
  mayday:0,lodd:0,hint:-1,aiT:0,fk:load,of:0,noRit:0};
 const rooms=L.N.filter(n=>n.ty==='room').map(n=>n.c);
 const of=(inc.k==='mfire'||inc.k==='fact')?tacRint(0,Math.min(1,F-1)):tacRint(Math.floor(F*.25),Math.floor(F*.6));
 const oc=pick(rooms);B.of=of;B.oc=oc;
 const prog=Math.min(.8,inc.work/inc.dur);
 const nIgn=Math.max(1,Math.min(R,Math.round((inc.pm.area||60)/55)));
 const cand=[];
 for(let f=of;f<Math.min(F,of+2);f++)for(const c of rooms)cand.push([tacGd(B,c,oc)+(f-of)*1.6+(L.N[c].win===L.N[oc].win?0:.5),f,c]);
 cand.sort((a,b)=>a[0]-b[0]);
 for(let i=0;i<Math.min(nIgn,cand.length);i++){
  const x=tacCel(B,cand[i][1],cand[i][2]);
  x.h=Math.max(.12,(.62-i*.08)*(.75+.25*load)*(1-prog)+Math.random()*.1);x.s=Math.min(1,x.h*.9)}
 // 受困者：起火層與以上樓層
 let trap=inc.pm.trap||0;
 for(let i=0;i<trap;i++){
  const f=Math.min(F-1,of+tacRint(0,Math.min(2,F-1-of))),c=pick(rooms);
  tacCel(B,f,c).vic++;if(B.hint<0)B.hint=f}
 // 醫院：另有臥床病患無法自行避難
 if(inc.k==='hospfire')for(let i=0,n=tacRint(2,4);i<n;i++){const f=Math.min(F-1,of+tacRint(0,1));tacCel(B,f,pick(rooms)).vic++;trap++}
 B.vtot=trap;
 tacSite(inc,B);
 inc.tac=B;tacSync(inc);
 radio(inc,'受理','指揮中心接管現場戰術指揮：'+F+' 層建物、每層 '+R+' 室，起火點 '+tacNm(B,of,oc)+
  (trap?'，報案人表示 '+(B.hint+1)+'F 有人受困':'')+'。');
 radio(inc,'受理','周邊：'+TAC_SIDES.map(x=>TAC_SDN[x]+'側'+B.sd[x].nm+(B.sd[x].road&&!B.sd[x].big?'（大型車禁入）':'')).join('、')+
  (B.hyd?'；消防栓在'+TAC_SDN[B.hyd.side]+'側約 '+B.hyd.d+' m':'；附近無消防栓，需水庫車供水')+(B.sp?'；送水口在'+TAC_SDN[B.sp.side]+'側':'')+'。')}
// 在場作業的車輛 → 戰術小組（新到場加入，離場移除）
function tacSync(inc){
 const B=inc.tac;
 for(const u of onScene(inc)){
  if(u.st!=='work'||!TAC_SQ[u.code])continue;
  if(B.sq.some(q=>q.u===u.id))continue;
  const ty=TAC_SQ[u.code];
  B.sq.push({u:u.id,cs:u.cs,code:u.code,ty,n:ty==='robot'?1:crewOf(u),f:-1,c:0,nf:-1,nc:0,mt:0,tf:-1,tc:0,
   task:'idle',air:1,hp:1,down:0,carry:0,line:0,lt:0,prev:null,resc:null,low:0,ext:0,wk:0,
   tside:B.arr,side:B.arr,tmv:0,pf:0,len:0,src:null,burst:0,ent:null,ws:null})}
 B.sq=B.sq.filter(q=>{const u=S.units.find(x=>x.id===q.u);
  if(u&&u.inc===inc.id&&u.st==='work')return true;
  if(q.down)B.mayday=Math.max(0,B.mayday-1);
  if(B.sp&&B.sp.u===q.u){B.sp.on=0;B.sp.u=null}
  return false})}
const tacIn=q=>q.f>=0;
// 可通行的鄰點：同層經門相通；樓梯間上下樓，1F 樓梯間通往屋外
function tacAdj(B,f,c){
 const r=B.L.N[c].nb.map(x=>[f,x]);
 if(tacStair(B,c)){if(f>0)r.push([f-1,c]);if(f<B.F-1)r.push([f+1,c])}
 if(f===0&&B.ents.some(e=>e.c===c))r.push([-1,0]);
 return r}
// 從 (f0,c0) 到 (tf,tc) 的最短路徑（廣度優先）；回傳整條路徑，不含起點
function tacPath(B,f0,c0,tf,tc){
 const key=(f,c)=>f<0?-1:f*B.W+c,goal=key(tf,tc),start=key(f0,c0);
 if(goal===start)return[];
 const prev=new Map([[start,null]]),qu=[[f0,c0]];
 while(qu.length){const n=qu.shift();if(key(n[0],n[1])===goal)break;if(n[0]<0)continue;
  for(const m of tacAdj(B,n[0],n[1])){const k=key(m[0],m[1]);if(!prev.has(k)){prev.set(k,n);qu.push(m)}}}
 if(!prev.has(goal))return[];
 const out=[];let cur=tf<0?[-1,0]:[tf,tc];
 while(key(cur[0],cur[1])!==start){out.unshift(cur);cur=prev.get(key(cur[0],cur[1]))}
 return out}
function tacNext(B,q){
 if(q.f===q.tf&&q.c===q.tc)return null;
 if(q.f<0){if(!q.ent)q.ent=tacBestEnt(B,q.side,q.tf,q.tc,false);return[0,q.ent.c]}
 return tacPath(B,q.f,q.c,q.tf,q.tc)[0]||null}
function tacStepTime(B,q,ns){
 let t=q.f<0||ns[0]<0?1.5:ns[0]!==q.f?2.2:1.8;
 const cl=ns[0]>=0?tacCel(B,ns[0],ns[1]):null;
 if(cl)t*=1+cl.s*.8;
 if(q.task==='attack'&&q.line)t*=1.4;
 if(q.carry)t*=1.5;
 if(q.ty==='robot')t*=1.6;
 if(q.task==='ritgo')t*=.8;
 return t}
// 能力：回傳 '' 表示可以，否則為不可執行的原因
function tacCan(B,q,k,f,c){
 if(q.down)return'該組已倒地，等待 RIT 救援';
 const lad=q.ty==='ladder';
 if(k==='exit')return lad?'雲梯組在建物外作業':'';
 if(k==='truck')return(q.ty==='pump'||lad)?'':'只有幫浦車與雲梯車需要移車';
 if(k==='stand')return q.ty!=='pump'?'只有幫浦車能接送水口':!B.sp?'本建物沒有連結送水管（五層以上才有）':B.sp.on&&B.sp.u!==q.u?'送水口已由其他車接妥':tacIn(q)?'人員在室內':tacCanSide(B,q,B.sp.side);
 if(k==='ppv')return q.ty==='vent'?'':'只有排煙組有正壓送風機';
 if(k==='rit')return(lad||q.ty==='robot')?'此組無法編為 RIT':'';
 if(k==='cover')return q.ty!=='pump'?'只有幫浦車能做鄰棟防護':Object.keys(B.exp).length?'':'四周沒有鄰棟';
 if(q.air<.3&&!lad&&q.ty!=='robot'&&k!=='exit')return'空氣瓶不足，需先撤出換瓶';
 if(f===undefined||f<0)return'請點選建物內的位置';
 if(lad){
  if(f>=(TAC_LADR[q.code]||7))return'超出雲梯可達高度（'+(TAC_LADR[q.code]||7)+'F 以下）';
  if(k==='roof')return tacLadSide(B,q,null)?'':'沒有大型車可停靠的道路，雲梯無法架設';
  if(k==='ladder'||k==='master'||k==='vent'){const n=B.L.N[c];
   if(!n.wins)return'雲梯須靠對外窗作業';
   return tacLadSide(B,q,n.wins)?'':'此室的窗戶面向'+n.wins.map(w=>TAC_SDN[w]+'側'+B.sd[w].nm).join('、')+'，雲梯車無法停靠'}
  return'雲梯組只能雲梯救援、外部射水或破窗排煙'}
 if(k==='master'||k==='ladder')return'需要雲梯車';
 if(k==='move')return'';
 if(k==='attack')return(q.ty==='pump'||q.ty==='robot')?'':'此組沒有水線';
 if(k==='search')return q.ty==='robot'?'機器人無法搜索搬運':B.L.N[c].ty!=='room'?'只有房間需要搜索':'';
 if(k==='vent')return q.ty==='robot'?'機器人無法破窗':!B.L.N[c].win?(tacStair(B,c)?'屋頂排煙請點頂樓樓梯間':'此處沒有對外窗'):'';
 if(k==='roof')return q.ty==='robot'?'機器人無法上屋頂':'';
 return''}
// 下達指令
// 雲梯車可停靠的一側：wins 為窗戶方向（null 表示任一側，用於屋頂），優先目前所在側
function tacLadSide(B,q,wins){
 const ok=(wins||TAC_SIDES).filter(s=>!tacCanSide(B,q,s));
 return ok.includes(q.tside)?q.tside:ok[0]||null}
function tacOrder(inc,q,k,f,c,quiet,side){
 const B=inc.tac;
 if(k==='vent'&&f===B.F-1&&tacStair(B,c))k='roof';
 if(k==='truck')return tacTruck(inc,B,q,side,quiet);
 if(k==='cover'){
  const why=q.ty!=='pump'?'只有幫浦車能做鄰棟防護':!side||B.exp[side]===undefined?'請點選鄰棟那一側':tacIn(q)?'人員在室內':'';
  const ts=why?null:tacCoverSide(B,q,side);
  if(why||!ts){if(!quiet)msg=q.cs+'：'+(why||'沒有相鄰道路可停車射水');return false}
  if(B.sp&&B.sp.u===q.u){B.sp.on=0;B.sp.u=null;radio(inc,q.cs,'離開送水口，連結送水管停止加壓！')}
  q.prev=null;q.task='cover';q.cside=side;q.tf=-1;q.tc=0;q.lt=S.t;q.ws=null;
  if(ts!==q.tside)tacTruck(inc,B,q,ts,1);
  if(!quiet)radio(inc,q.cs,'收到，於'+TAC_SDN[ts]+'側對'+TAC_SDN[side]+'側鄰棟外牆射水防護。');
  return true}
 const why=tacCan(B,q,k,f,c);
 if(why){if(!quiet)msg=q.cs+'：'+why;return false}
 // 攻擊線：先確認水帶拉得到
 let ln=null;
 if(k==='attack'){ln=tacLineTo(B,q,f,c);
  if(!ln){if(!quiet)msg=q.cs+'：水帶長度不足（上限 '+TAC_HOSE+' 條）'+(B.sp&&f>=1?'，請先接送水口改用連結送水管':'')+'，或移車到較近入口那側';return false}}
 if(B.sp&&B.sp.u===q.u&&k!=='stand'){B.sp.on=0;B.sp.u=null;radio(inc,q.cs,'離開送水口，連結送水管停止加壓！')}
 q.prev=null;q.wk=0;q.ext=0;q.ws=null;
 q.ent=ln&&ln.ent&&ln.src==='pump'&&ln.u===q.u?ln.ent:(f>=0&&q.ty!=='ladder'?tacBestEnt(B,q.side,f,c,false):null);
 if(k==='exit'){q.task='exit';q.tf=-1;q.tc=0}
 else if(k==='stand'){q.task='stand';q.tf=-1;q.tc=0;
  if(q.tside!==B.sp.side)tacTruck(inc,B,q,B.sp.side,1)}
 else if(k==='rit'){q.task='rit';q.tf=-1;q.tc=0;
  const dn=B.sq.find(x=>x.down&&!B.sq.some(y=>y.task==='ritgo'&&y.resc===x.u));
  if(dn){q.task='ritgo';q.resc=dn.u;q.tf=dn.f;q.tc=dn.c}}
 else if(k==='ppv'){
  if(B.ppv&&q.task==='ppv'){B.ppv=0;q.task='idle';if(!quiet)radio(inc,q.cs,'正壓送風機關閉。');return true}
  q.task='ppv';q.tf=-1;q.tc=0;q.ws=side&&B.ents.some(e=>e.side===side)?side:(B.ents.find(e=>e.side===q.side)||B.ents[0]).side}
 else if(k==='roof'){q.task='roof';q.tf=q.ty==='ladder'?-1:B.F-1;q.tc=0;q.lf=B.F-1;q.lc=0}
 else if(q.ty==='ladder'){q.task=k;q.tf=-1;q.tc=0;q.lf=f;q.lc=c}
 if(q.ty==='ladder'&&(k==='ladder'||k==='master'||k==='vent'||k==='roof')){
  const sd=tacLadSide(B,q,k==='roof'?null:B.L.N[c].wins);q.lside=sd;
  if(sd!==q.tside)tacTruck(inc,B,q,sd,1)}
 else if(k!=='stand'&&k!=='ppv'&&k!=='exit'&&k!=='rit'&&k!=='roof'){q.task=k;q.tf=f;q.tc=c}
 if(k==='attack'||k==='master')q.lt=S.t;
 if(!quiet)radio(inc,q.cs,'收到，'+TAC_TASK[q.task]+(f>=0&&k!=='rit'&&k!=='exit'&&k!=='ppv'?'，'+(k==='move'?'前往 ':'目標 ')+(k==='roof'?tacFlr(B.F-1)+' 屋頂':tacNm(B,f,c)):'')+'。');
 return true}
function tacDown(inc,B,q,why){
 if(q.down)return;
 if(q.carry&&q.f>=0){tacCel(B,q.f,q.c).vic+=q.carry}
 q.down=1;q.carry=0;B.mayday++;
 radio(inc,q.cs,'MAYDAY！MAYDAY！MAYDAY！'+why+'，位置 '+tacNm(B,q.f,q.c)+'，'+q.n+' 名隊員。');
 const r=B.sq.find(x=>x.task==='rit'&&!x.down);
 if(r){r.task='ritgo';r.resc=q.u;r.tf=q.f;r.tc=q.c;radio(inc,r.cs,'RIT 收到，立即入室救援 '+q.cs+'。')}
 else{B.noRit++;radio(inc,'受理','現場未編成 RIT！請立即指派小組救援 '+q.cs+'。')}}
// 小組每幀更新：空氣、受傷、移動、任務執行
function tacSquad(inc,B,q,dt,eff){
 const inside=tacIn(q),cl=inside?tacCel(B,q.f,q.c):null,cmd=onScene(inc).some(u=>u.code==='41'&&u.st==='work')?1.15:1;
 if(q.down){
  q.hp-=dt*.0025*(1+(cl?cl.h*2:0));
  if(q.hp<=0){
   B.lodd++;B.mayday=Math.max(0,B.mayday-1);S.rep-=12;S.score-=200;
   msg='消防人員殉職：'+q.cs+'（評鑑 -12）';
   radio(inc,'受理',q.cs+' 隊員搶救無效，現場全員默哀，請各組確實人員清點。');
   const u=S.units.find(x=>x.id===q.u);if(u){u.inc=null;crewDown(u);home(u)}
   q.gone=1;if(S.rep<=0){S.rep=0;S.over=true}}
  return}
 if(inside&&q.ty!=='robot'){
  q.air-=dt/TAC_AIR*((q.task==='attack'||q.task==='search'||q.task==='ritgo')?1.15:1)*(q.carry?1.3:1);
  if(q.air<=0){q.air=0;tacDown(inc,B,q,'空氣瓶耗盡');return}
  // 低壓：剩餘氣量不足以從目前位置撤到屋外（含安全餘裕）就撤出換瓶，換瓶後回原任務；
  // 搬運受困者與 RIT 救援除外。樓層越高越早撤
  const est=(q.f*2.6+(tacGd(B,q.c,0)+1)*1.8)*1.7*1.15,lowAt=Math.max(.33,(est*1.3+8)/TAC_AIR);
  if(q.air<lowAt&&q.task!=='exit'&&q.task!=='carry'&&q.task!=='ritgo'){
   if(!q.low)radio(inc,q.cs,'空氣瓶低壓警報，撤出換瓶。');
   q.low=1;q.prev=(q.task==='idle'||q.task==='rit')?null:{task:q.task,tf:q.tf,tc:q.tc};q.task='exit';q.tf=-1;q.tc=0}
  else if(q.air<lowAt&&!q.low){q.low=1;radio(inc,q.cs,'空氣瓶低壓警報，完成手上任務後撤出。')}
  const prot=q.task==='attack'&&q.line&&eff>0&&q.pf>.15&&q.f===q.tf&&q.c===q.tc;
  if(cl.h>.68)q.hp-=dt*(cl.h-.62)*(prot?.015:.07);
  // 沒有水線保護、所在空間過熱：自動撤退（搬運與 RIT 救援除外）
  if(!prot&&cl.h>.6&&q.ty!=='robot'&&q.task!=='exit'&&q.task!=='carry'&&q.task!=='ritgo'&&!q.mt){
   radio(inc,q.cs,tacNm(B,q.f,q.c)+'溫度過高，無水線掩護，撤退！');q.prev=null;q.task='exit';q.tf=-1;q.tc=0}
  if(q.hp<.3){tacDown(inc,B,q,'高溫受困');return}}
 // 移動：屋外先移車或繞到入口那側，再進出建物
 if(!inside&&tacOutStep(inc,B,q,dt)){q.nf=q.f;q.nc=q.c;return}
 const ns=tacNext(B,q);
 if(ns){q.nf=ns[0];q.nc=ns[1];q.mt+=dt;
  if(q.mt>=tacStepTime(B,q,ns)){q.mt=0;const pc=q.c;q.f=ns[0];q.c=ns[1];
   if(q.f<0){q.side=tacExitSide(B,q,pc);q.ent=null;tacOutside(inc,B,q)}}
  return}
 q.mt=0;q.nf=q.f;q.nc=q.c;
 const k=q.task;
 if(!inside){
  // 屋外：換瓶、雲梯作業、正壓送風
  if(q.hp<1)q.hp=Math.min(1,q.hp+dt*.03);
  if(q.air<1&&q.ty!=='robot'&&q.ty!=='ladder'){q.air=Math.min(1,q.air+dt/7);
   if(q.air>=1){q.low=0;if(q.prev){const p=q.prev;q.prev=null;q.task=p.task;q.tf=p.tf;q.tc=p.tc;
     radio(inc,q.cs,'換瓶完成，返回'+tacFlr(p.tf)+'續行'+TAC_TASK[p.task]+'。')}}
   return}
  if(k==='ppv'){if(!B.ppv){B.ppv=1;B.ppvSide=q.side;radio(inc,q.cs,'正壓送風機於'+TAC_SDN[q.side]+'側入口架設完成，開始送風。')}return}
  if(k==='stand'){if(!B.sp.on){q.wk+=dt;if(q.wk>=8){q.wk=0;B.sp.on=1;B.sp.u=q.u;
    radio(inc,q.cs,'已接妥'+TAC_SDN[B.sp.side]+'側送水口，連結送水管加壓完成，各樓層出水口可用。')}}return}
  if(q.ty==='ladder'&&(k==='ladder'||k==='master'||k==='vent'||k==='roof')){
   if(q.ext<1){q.ext=Math.min(1,q.ext+dt/7);return}
   const lc=tacCel(B,q.lf,q.lc);
   if(k==='roof'){if(!B.roof){B.roof=1;radio(inc,q.cs,'雲梯就位，已開啟頂樓樓梯間屋頂排煙口。')}q.task='idle';return}
   if(k==='vent'){if(!lc.v){lc.v=1;radio(inc,q.cs,'由雲梯破窗，'+tacNm(B,q.lf,q.lc)+'開口完成。')}q.task='idle';return}
   if(k==='master'){
    if(lc.h<=0){q.task='idle';radio(inc,q.cs,tacNm(B,q.lf,q.lc)+'火勢已熄，停止外部射水。');return}
    if(q.line&&eff>0&&q.pf>0){lc.h=Math.max(0,lc.h-dt*.06*eff*q.pf);lc.wet=1;lc.v=1;if(lc.h<.03){lc.h=0;lc.dw=1}
     // 內外夾攻：同層、射水房間附近的入室小組會被推回的熱煙燙傷
     const hit=B.sq.filter(x=>tacIn(x)&&x.f===q.lf&&(x.c===q.lc||B.L.N[q.lc].nb.includes(x.c))&&x.ty!=='robot'&&!x.down);
     if(hit.length&&!q.warn){q.warn=1;radio(inc,'安全官','警告：'+tacFlr(q.lf)+' 有入室小組，外部射水會把熱煙推回室內！')}
     if(!hit.length)q.warn=0;
     for(const x of hit)x.hp-=dt*.015}
    return}
   // 雲梯救援：先由窗口搜索，再逐一救下
   if(lc.srch<1){lc.srch=Math.min(1,lc.srch+dt/9);
    if(lc.srch>=1)radio(inc,q.cs,tacNm(B,q.lf,q.lc)+'窗口搜索完成，'+(lc.vic?'發現 '+lc.vic+' 名受困者。':'未發現受困者。'));return}
   if(lc.vic>0){q.wk+=dt;
    if(q.wk>=6){q.wk=0;lc.vic--;B.resc++;radio(inc,q.cs,'雲梯救出受困者 1 名，交由救護組。')}
    return}
   q.task='idle'}
  return}
 // 室內任務
 if(k==='attack'){
  if(q.line&&eff>0&&q.pf>0){
   const fo=q.code==='57'?1.3:1,pw=.085*eff*q.pf*fo*(q.n/3)*cmd;
   cl.h=Math.max(0,cl.h-dt*pw);cl.wet=1;if(cl.h<.03){cl.h=0;cl.dw=1}
   // 水霧也會冷卻門另一側的空間
   for(const cc of B.L.N[q.c].nb){const nb=tacCel(B,q.f,cc);nb.h=Math.max(0,nb.h-dt*pw*.2);if(nb.h<.02)nb.h=0}
   if(cl.h<.03){ // 本室已撲滅：推進到同層最近的火點
    const best=tacNear(B,q.f,q.c,x=>x.h>.05&&!B.sq.some(y=>y!==q&&y.task==='attack'&&y.tf===q.f&&y.tc===x.c));
    if(best!==null)q.tc=best;else{q.task='hold';q.tf=q.f;q.tc=q.c;radio(inc,q.cs,tacFlr(q.f)+' 火勢已撲滅，守線待命。')}}}
  return}
 if(k==='move'){q.task='idle';return}
 if(k==='hold'){ // 守線：同層復燃立即再攻擊
  const c=tacNear(B,q.f,q.c,x=>x.h>.05);if(c!==null){q.task='attack';q.tc=c;q.lt=S.t}
  return}
 if(k==='search'){
  if(cl.srch<1){cl.srch=Math.min(1,cl.srch+dt/(q.ty==='resc'?5:8)/(1+cl.s)*(q.n/3)*cmd);return}
  if(cl.vic>0){
   // 估算扛人到屋外所需氣量；不夠就回報位置撤出，由後續小組接手
   const need=tacPath(B,q.f,q.c,-1,0).length*2.6*1.5*1.3*1.2/TAC_AIR+.06;
   if(q.air<need){q.prev=null;q.task='exit';q.tf=-1;q.tc=0;
    radio(inc,q.cs,tacNm(B,q.f,q.c)+'發現受困者 '+cl.vic+' 名，本組氣量不足以搬運，回報位置撤出，請後續小組接手。');return}}
  if(cl.vic>0){const take=Math.min(cl.vic,q.n>=4?2:1);cl.vic-=take;q.carry=take;q.task='carry';q.tf=-1;q.tc=0;
   radio(inc,q.cs,tacNm(B,q.f,q.c)+'發現受困者 '+take+' 名，搬運下樓。');return}
  // 本室無人：往同層下一個未搜索的房間
  const best=tacNear(B,q.f,q.c,x=>x.ty==='room'&&x.srch<1&&x.h<.6&&!B.sq.some(y=>y!==q&&y.task==='search'&&y.tf===q.f&&y.tc===x.c));
  if(best!==null)q.tc=best;else{q.task='idle';radio(inc,q.cs,tacFlr(q.f)+' 搜索完畢，未再發現受困者。')}
  return}
 if(k==='vent'){q.wk+=dt;if(q.wk>=(q.ty==='vent'?2:4)){q.wk=0;cl.v=1;q.task='idle';
  radio(inc,q.cs,tacNm(B,q.f,q.c)+'破窗完成，開口建立。')}return}
 if(k==='roof'){q.wk+=dt;if(q.wk>=4){q.wk=0;B.roof=1;q.task='idle';radio(inc,q.cs,'頂樓屋頂排煙口已開啟。')}return}
 if(k==='ritgo'){
  const dn=B.sq.find(x=>x.u===q.resc);
  if(!dn||!dn.down||dn.gone){q.task='rit';q.tf=-1;q.tc=0;return}
  if(dn.f!==q.f||dn.c!==q.c){q.tf=dn.f;q.tc=dn.c;return}
  q.wk+=dt;
  if(q.wk>=4){q.wk=0;dn.down=0;dn.hp=Math.max(dn.hp,.5);dn.air=Math.max(dn.air,.3);dn.low=1;
   B.mayday=Math.max(0,B.mayday-1);dn.task='exit';dn.tf=-1;dn.tc=0;dn.prev=null;
   q.task='exit';q.tf=-1;q.tc=0;q.prev={task:'rit',tf:-1,tc:0};
   radio(inc,q.cs,'RIT 已接觸 '+dn.cs+'，更換備用氣瓶，協同撤出。')}
  return}}
function tacOutside(inc,B,q){
 if(q.carry){B.resc+=q.carry;
  const ems=onScene(inc).some(u=>u.code==='91'&&u.st==='work');
  radio(inc,q.cs,'受困者 '+q.carry+' 名救出，'+(ems?'交由救護組處置。':'現場無救護車，請求救護支援！'));
  q.carry=0;q.task='idle';
  if(!q.low){q.prev=null}}
 else if(q.task==='exit'){q.task=q.prev&&q.prev.task==='rit'?'rit':'idle';if(q.task==='rit')q.prev=null}}
// 火煙動態：成長、延燒、閃燃、煙層流動、排煙、受困者存活
function tacFire(inc,B,dt){
 const W=B.W,F=B.F,R=B.R,dh=new Float32Array(B.cells.length);
 let openings=B.roof;for(const x of B.cells)if(x.v)openings++;
 if(B.ppv&&!openings&&!B.ppvW){B.ppvW=1;radio(inc,'安全官','正壓送風中但建物沒有排煙開口，煙無處可去！')}
 for(const x of B.cells){
  if(x.ty==='stair')continue;
  const nd=B.L.N[x.c];
  if(x.fu>0&&x.h>.02){
   const ox=.45+.55*x.v+(x.v&&B.ppvS&&B.ppvS.has(x.f*W+x.c)?.6:0)-(x.s>.85&&!x.v?.2:0);
   if(!x.wet)x.h=Math.min(1,x.h+dt*(.006+.03*x.h*(1-x.h*.5))*ox*B.fk*(x.dw?.35:1));
   x.fu=Math.max(0,x.fu-dt*x.h*.0028)}
  else if(x.fu<=0)x.h=Math.max(0,x.h-dt*.02);
  x.s=Math.min(1,x.s+dt*x.h*.09);
  if(!x.fl&&x.h>.82&&x.s>.7&&!x.wet){x.fl=1;x.h=1;
   radio(inc,'安全官',tacNm(B,x.f,x.c)+'發生閃燃！');
   for(const q of B.sq)if(q.f===x.f&&q.c===x.c&&q.ty!=='robot'&&!q.down){q.hp=Math.max(.2,q.hp-.4);if(q.hp<.3)tacDown(inc,B,q,'遭遇閃燃')}}
  if(x.fl&&x.h<.25)x.fl=0;
  if(x.h>.45&&!x.wet){
   // 經門延燒較快、隔牆較慢；有窗的房間經外牆往上層延燒（開窗更快）
   for(const cc of nd.nb){const nb=B.cells[x.f*W+cc];if(nb.fu>0)dh[x.f*W+cc]+=dt*.011*(x.h-.4)*(nb.wet?.2:1)}
   for(const cc of nd.wl){const nb=B.cells[x.f*W+cc];if(nb.fu>0)dh[x.f*W+cc]+=dt*.005*(x.h-.4)*(nb.wet?.2:1)}
   if(x.f+1<F){const up=B.cells[(x.f+1)*W+x.c];if(up.fu>0)dh[(x.f+1)*W+x.c]+=dt*(nd.win?.008:.004)*(x.h-.45)*(1+x.v*1.6)}}}
 for(let i=0;i<dh.length;i++)if(dh[i]>0){const x=B.cells[i];x.h=Math.min(1,Math.max(x.h,.02)+dh[i])}
 // 煙：同層經門交換（含樓梯間），樓梯間往上竄
 for(let f=0;f<F;f++)for(const n of B.L.N)for(const cc of n.nb){if(cc<n.c)continue;
  const a=B.cells[f*W+n.c],b=B.cells[f*W+cc],m=(a.s-b.s)*dt*.25;a.s-=m;b.s+=m}
 for(const n of B.L.N)if(n.ty==='stair')for(let f=0;f<F-1;f++){const a=B.cells[f*W+n.c],b=B.cells[(f+1)*W+n.c],m=a.s*dt*.2*(1-b.s);a.s-=m;b.s+=m}
 B.ppvT=(B.ppvT||0)-dt;if(B.ppvT<=0){B.ppvT=1;B.ppvS=tacPpvSet(B)}
 const pset=B.ppvS||new Set();
 for(const x of B.cells){
  let out=.004;
  const onP=pset.has(x.f*W+x.c);
  if(x.v)out+=.1+(onP?.18:0);
  if(onP)out+=.08;
  if(x.ty==='stair'&&x.f===F-1&&B.roof)out+=.25;
  x.s=Math.max(0,Math.min(1,x.s-dt*out*Math.max(.3,x.s)*2));
  if(x.vic>0){x.vh-=dt*(x.s*.005+Math.max(0,x.h-.35)*.03);
   if(x.vh<=0){B.lost+=x.vic;S.rep-=3*x.vic;radio(inc,'受理',tacNm(B,x.f,x.c)+'受困者 '+x.vic+' 名罹難（評鑑 -'+(3*x.vic)+'）。');
    x.vic=0;if(S.rep<=0){S.rep=0;S.over=true}}}}}
// 水線分配：依下令先後，最多 effLines 條
function tacCap(inc){
 if(!waterOK(inc))return 0;
 const tp=tankPool(inc);
 return Math.max(0,Math.min(pumpsOn(inc)*2,Math.max(1,Math.floor((inflowOf(inc)+(tp[0]>tp[1]*.3?LPS:0))/LPS)))-(inc.burst>0?1:0))}
// 消防栓那側沒有幫浦車佔水：只能用車上水箱（水箱剩不多時只剩一線，用完就沒水）
function tacCapAll(inc,B){
 let L=tacCap(inc);
 if(!tacHydOK(inc,B)){const tp=tankPool(inc);L=Math.min(L,tp[0]>tp[1]*.15?1:0)}
 return L}
function tacLines(inc,B,dt){
 const L=tacCapAll(inc,B);
 if(B.hyd&&!tacHydOK(inc,B)&&!B.hydW&&B.sq.some(q=>q.ty==='pump')){B.hydW=1;
  radio(inc,'受理','消防栓在'+TAC_SDN[B.hyd.side]+'側，該側沒有幫浦車佔水，目前只能用車上水箱，請移車佔水。')}
 if(tacHydOK(inc,B))B.hydW=0;
 const want=B.sq.filter(q=>(q.task==='attack'||q.task==='master'||q.task==='hold'||q.task==='cover')&&!q.down).sort((a,b)=>a.lt-b.lt);
 for(const q of B.sq){q.line=0;if(q.burst>0)q.burst-=dt}
 let n=0,spN=0;
 for(const q of want){
  if(n>=L)break;
  if(q.task==='cover'){if(q.tmv)continue;q.src='pump';q.len=4;q.pf=.9;q.lu=q.u;q.lent=null;q.line=1;n++;continue}
  if(q.ty==='ladder'){ // 雲梯射水由同側幫浦車供水，沒有則壓力不足
   if(q.lside===undefined)continue;
   q.src='pump';q.len=3;q.pf=B.sq.some(x=>x.ty==='pump'&&x.tside===q.tside&&!x.tmv)?.9:.5;q.line=1;n++;continue}
  // 水線跟著小組：以目前位置計算；還在屋外時以目標計算
  const f=q.f>=0?q.f:q.tf,c=q.f>=0?q.c:q.tc;if(f<0)continue;
  const ln=tacLineTo(B,q,f,c);
  if(!ln||(ln.src==='sp'&&spN>=TAC_SPMAX)){q.pf=0;q.src=null;continue}
  if(ln.src==='sp')spN++;
  q.line=1;n++;q.src=ln.src;q.len=ln.len;q.pf=ln.pf;q.lent=ln.ent;q.lu=ln.u;
  // 經過高溫空間的水帶可能燒破
  if(ln.src==='pump'&&q.f>=0&&!q.burst){
   const path=tacPath(B,0,ln.ent.c,q.f,q.c);
   if(path.some(p=>tacCel(B,p[0],p[1]).h>.7)&&Math.random()<dt*.025){q.burst=8;
    radio(inc,q.cs,'水帶遭高溫燒破，出水中斷，更換水帶中。')}}
  if(q.burst>0)q.pf=0}
 inc.lines=Math.max(1,n); // 用水量依實際出水線數計算
 return L}
// 戰術 AI：玩家未親自指揮時的現場指揮官
function tacAI(inc,B,dt){
 B.aiT-=dt;if(B.aiT>0)return;B.aiT=1.5;
 const free=B.sq.filter(q=>!q.down&&!q.tmv&&(q.task==='idle'||q.task==='hold')&&!q.prev&&(q.ty==='ladder'||q.ty==='robot'||q.air>(tacIn(q)?.45:.6)));
 const burning=B.cells.filter(x=>x.ty!=='stair'&&x.h>.05).sort((a,b)=>a.f-b.f||b.h-a.h);
 if(!B.sq.some(q=>q.task==='rit'||q.task==='ritgo')&&B.sq.length>=3){
  const r=free.find(q=>q.ty==='resc'&&!tacIn(q))||(B.sq.length>=4?free.find(q=>q.ty==='pump'&&!tacIn(q)):null);
  if(r){tacOrder(inc,r,'rit',-1,0,1);radio(inc,r.cs,'編為 RIT，於一樓入口待命。');free.splice(free.indexOf(r),1)}}
 if(B.mayday&&!B.sq.some(q=>q.task==='ritgo')){
  const dn=B.sq.find(q=>q.down);
  const r=dn&&B.sq.filter(q=>!q.down&&q.ty!=='ladder'&&q.ty!=='robot'&&q.air>.45&&q.task!=='carry')
   .sort((a,b)=>(Math.abs(a.f-dn.f)+Math.abs(a.c-dn.c))-(Math.abs(b.f-dn.f)+Math.abs(b.c-dn.c)))[0];
  if(r){tacOrder(inc,r,'rit',-1,0,1);radio(inc,r.cs,'轉任 RIT，前往救援 '+dn.cs+'。');const i=free.indexOf(r);if(i>=0)free.splice(i,1)}}
 // 消防栓那側沒有幫浦車：派一輛屋外待命的幫浦車移車佔水
 if(!tacHydOK(inc,B)&&!B.sq.some(q=>q.tmv&&q.tgt===B.hyd.side)){
  const p=free.find(q=>q.ty==='pump'&&!tacIn(q)&&!tacCanSide(B,q,B.hyd.side));
  if(p&&tacTruck(inc,B,p,B.hyd.side)){free.splice(free.indexOf(p),1);radio(inc,p.cs,'前往'+TAC_SDN[B.hyd.side]+'側消防栓佔水。')}}
 // 高樓：起火層在 3F 以上先接送水口
 if(B.sp&&!B.sp.on&&B.of>=2&&!B.sq.some(q=>q.task==='stand')){
  const p=free.find(q=>q.ty==='pump'&&!tacIn(q)&&!tacCan(B,q,'stand',-1,0));
  if(p&&tacOrder(inc,p,'stand',-1,0,1)){free.splice(free.indexOf(p),1);radio(inc,p.cs,'前往'+TAC_SDN[B.sp.side]+'側接送水口。')}}
 let spare=tacCapAll(inc,B)-B.sq.filter(q=>q.line).length;
 // 鄰棟受熱：派一輛屋外幫浦車防護
 for(const sd of Object.keys(B.exp)){
  if(B.exp[sd]<.35||B.expL[sd]||spare<=0||B.sq.some(q=>q.task==='cover'&&q.cside===sd))continue;
  const p=free.find(q=>q.ty==='pump'&&!tacIn(q)&&!q.line);
  if(p&&tacOrder(inc,p,'cover',-1,0,1,sd)){free.splice(free.indexOf(p),1);spare--}}
 for(const q of free){
  if((q.ty==='pump'||q.ty==='robot')&&(spare>0||q.line)){
   const ts=burning.filter(x=>!B.sq.some(y=>y!==q&&y.task==='attack'&&y.tf===x.f&&y.tc===x.c));
   // 屋外的幫浦車先移到水帶最短的那側再佈線（差 3 條以上才移）
   if(q.ty==='pump'&&!tacIn(q)&&!q.line&&ts.length&&!(B.hyd&&q.tside===B.hyd.side&&B.sq.filter(x=>x.ty==='pump'&&x.tside===B.hyd.side).length<2)){
    const t=ts[0],bs=tacBestSide(B,q,t.f,t.c),cur=tacLineTo(B,q,t.f,t.c);
    if(bs&&bs.side!==q.tside&&(!cur||cur.len-bs.len>=3)&&!(cur&&cur.src==='sp')){tacTruck(inc,B,q,bs.side,1);radio(inc,q.cs,'移車至'+TAC_SDN[bs.side]+'側，縮短水帶佈線。');continue}}
   let ok=false;for(const t of ts)if(tacOrder(inc,q,'attack',t.f,t.c,1)){ok=true;break}
   if(ok){if(!q.line)spare--;continue}
   if(q.task==='hold'&&burning.length===0&&q.ty==='pump'){/* 守線即可 */}}
  if(q.ty==='resc'||q.ty==='pump'||q.ty==='vent'){
   const un=B.cells.filter(x=>x.ty==='room'&&(x.srch<1||x.vic>0)&&x.h<.45&&!B.sq.some(y=>y!==q&&y.task==='search'&&y.tf===x.f&&y.tc===x.c));
   const pri=x=>(x.f===B.hint?-20:0)+(x.f>=B.of?-5:0)+Math.abs(x.f-B.of)+tacGd(B,0,x.c)*.1;
   un.sort((a,b)=>pri(a)-pri(b));
   if(q.ty==='vent'){
    const atk=B.sq.find(y=>y.task==='attack'&&y.line&&y.f===y.tf&&y.c===y.tc&&tacIn(y));
    if(atk&&!tacCel(B,atk.f,atk.c).v&&tacOrder(inc,q,'vent',atk.f,atk.c,1))continue;
    if(atk&&!B.ppv&&!tacIn(q)&&tacOrder(inc,q,'ppv',-1,0,1))continue}
   if(un.length&&q.ty!=='vent'&&tacOrder(inc,q,'search',un[0].f,un[0].c,1))continue}
  if(q.ty==='ladder'){
   const reach=TAC_LADR[q.code]||7;
   const v=B.cells.find(x=>x.ty==='room'&&x.f<reach&&x.vic>0&&x.srch>=1);
   if(v&&tacOrder(inc,q,'ladder',v.f,v.c,1))continue;
   const top=tacCel(B,B.F-1,0);
   if(!B.roof&&top.s>.5&&B.F-1<reach&&tacOrder(inc,q,'roof',B.F-1,0,1))continue;
   const ex=burning.find(x=>x.ty==='room'&&x.f<reach&&!B.sq.some(y=>tacIn(y)&&y.f===x.f));
   if(ex&&spare>0&&tacOrder(inc,q,'master',ex.f,ex.c,1)){spare--;continue}}
  // 室內沒事做：退回屋外待命，不要留在可能延燒的樓層
  if(tacIn(q)&&q.task==='idle')tacOrder(inc,q,'exit',-1,0,1)}}
// 由 stepIncident 呼叫：取代原本的抽象進度
function tacIncident(inc,dt,first,flow){
 const B=inc.tac;
 if(inc.req){inc.reqT-=dt;if(inc.reqT<=0)answer(inc,false,true)}
 tacSync(inc);
 const eff=waterOK(inc)?flow:0;
 tacLines(inc,B,dt);
 for(const x of B.cells)x.wet=0;
 for(const q of B.sq)tacSquad(inc,B,q,dt,eff);
 B.sq=B.sq.filter(q=>!q.gone);
 tacFire(inc,B,dt);
 tacExpo(inc,B,dt);
 if(!(TAC.open&&TAC.id===inc.id))tacAI(inc,B,dt);
 // 進度：控火 60%、受困者處置 40%；完全撲滅且受困者都已處置後殘火處理 8 秒
 let sumH=0,out=true;for(const x of B.cells){sumH+=x.h;if(x.h>=.04)out=false}
 B.peak=Math.max(B.peak,sumH);
 let left=0;for(const x of B.cells)left+=x.vic;for(const q of B.sq)left+=q.carry;
 const vd=B.vtot?(B.vtot-left)/B.vtot:1;
 B.p=.6*(1-sumH/Math.max(.001,B.peak))+.4*vd;
 if(out&&!left){B.doneT+=dt;
  if(B.doneT>=8&&!B.done){B.done=1;
   B.burnt=B.cells.filter(x=>x.ty==='room'&&x.fu<.3).length;
   const half=B.burnt>B.R*B.F*.5;
   if(half){S.rep-=5;if(S.rep<=0){S.rep=0;S.over=true}}
   radio(inc,first?first.cs:'現場',(half?'建物大部分燒毀，火勢因燃料耗盡熄滅（評鑑 -5）':'火勢完全撲滅、殘火處理完成')+'，救出 '+B.resc+' 名'+(B.lost?'、罹難 '+B.lost+' 名':'')+(B.burnt?'，燒毀 '+B.burnt+' 室':'')+'。');
   if(!B.paid){B.paid=1;S.money+=B.resc*400;S.score+=B.resc*50+(B.lodd?0:60)}}}
 else B.doneT=0;
 const w=inc.dur*(B.done?1:Math.min(.96,B.p));
 if(w>inc.work)inc.work=w;
 const np=Math.min(inc.phs.length-1,Math.floor(inc.work/inc.dur*inc.phs.length));
 if(np>inc.ph){inc.ph=np;radio(inc,first?first.cs:'現場','進入「'+inc.phs[np]+'」階段。')}
 if(!B.done)inc.left-=dt*(first?.22:1)}
