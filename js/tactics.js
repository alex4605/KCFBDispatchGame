// 戰術指揮：建物火災的樓層平面模型、火煙動態、小組指令與現場戰術 AI
// 每層平面相同：節點 0 是樓梯間（不燃，上下樓與出入口），中間一排走廊，走廊南北兩側各一排房間；
// 節點之間有門（人、煙、火可通過）或牆（只有火會慢慢延燒）。f=-1 代表建物外
'use strict';
// 可進入戰術指揮的案類：樓層數、格局（house 透天、corridor 走廊式、open 開放賣場／廠房）、每排空間數、樓梯座數
// b：有地下一層（B1）的機率
const TACK={mfire:{f:[2,4],lay:'house',k:[1,1],b:0},hifire:{f:[7,10],lay:'corridor',k:[3,4],b:.6},fact:{f:[1,2],lay:'open',k:[3,3],st:1,b:.3},
 deptfire:{f:[5,7],lay:'open',k:[3,4],st:2,b:.7},skyscraper:{f:[11,14],lay:'corridor',k:[3,3],b:.8},hospfire:{f:[4,6],lay:'corridor',k:[4,4],b:.5}};
// 玩家戰術畫面的介面狀態
const TAC={open:false,id:null,sq:null,ord:null,hits:[]};
const TAC_AIR=110; // 滿瓶可在室內作業的秒數
const TAC_LADR={'21':10,'31':7}; // 雲梯可達樓層數
// 車種 → 小組類型；水庫車、指揮車、救護車不編成入室小組
const TAC_SQ={'11':'pump','16':'pump','57':'pump','21':'ladder','31':'ladder','71':'resc','搜':'resc','75':'vent','履':'robot'};
const TAC_TYN={pump:'幫浦組',ladder:'雲梯組',resc:'救助組',vent:'排煙組',robot:'機器人'};
const TAC_TASK={idle:'待命',move:'移動',truck:'移車',stand:'送水口加壓',hold:'守線',attack:'入室攻擊',trans:'過渡射水',
 guard:'周界防護',cover:'周界防護（鄰棟）',confine:'侷限火勢',search:'初期搜索',search2:'次級搜索',carry:'搬運傷者',
 vent:'破窗排煙',hydro:'水霧排煙',roof:'屋頂排煙',ppv:'正壓排煙',npv:'負壓排煙',vvent:'垂直排煙',force:'破壞進入',dctrl:'門控進入',overhaul:'殘火處理',ladder:'雲梯救援',master:'雲梯射水',roofres:'屋頂救援',
 rit:'RIT 待命',ritgo:'RIT 救援',exit:'撤出',station:'駐守站點'};
// 需要水線的任務
const TAC_WET={attack:1,hold:1,trans:1,guard:1,hydro:1,cover:1,master:1};
// 門的開關：關上的門延燒與煙的流動都大幅降低（人員通過時會打開）
const tacDK=(B,f,a,b)=>f*B.W*B.W+Math.min(a,b)*B.W+Math.max(a,b);
const tacShut=(B,f,a,b)=>B.cd&&B.cd.has(tacDK(B,f,a,b));
const tacRint=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
const tacCel=(B,f,c)=>B.cells[f*B.W+c];
const tacFlr=(B,f)=>f<0?'屋外':f>=B.F?'屋頂':f<B.bf?'B'+(B.bf-f):(f-B.bf+1)+'F';
// 房間用途：可燃物倍率 fk、搜索時間倍率 sr
const TAC_RK={bed:{n:'臥室',fk:1,sr:1.1},living:{n:'客廳',fk:1.1,sr:1},kitchen:{n:'廚房',fk:1.25,sr:.9},bath:{n:'浴室',fk:.35,sr:.5},
 store:{n:'儲藏室',fk:1.45,sr:1.3},office:{n:'辦公室',fk:1,sr:1.1},ward:{n:'病房',fk:.9,sr:1.1},shelf:{n:'賣場',fk:1.3,sr:1.4},machine:{n:'廠區',fk:1.2,sr:1.2}};
const TAC_KINDS={hifire:['bed','living','bed','kitchen'],skyscraper:['office','office','living'],hospfire:['ward','ward','ward','office'],
 deptfire:['shelf','shelf','shelf'],fact:['machine','machine','store'],mfire:['bed']};
// 樓層平面（隨機不規則）：gx/gy/gw/gh 為平面格座標；nb 為門、wl 為共用牆；
// door[side] 為該側入口在平面上的位置、ent[side] 為入口通往的節點；房間貼著外牆的方向就有對外窗（wins）
function tacLayout(T,K,kind){
 const R=Math.random,N=[],L={N,door:{},ent:{}},SW=.6;
 const add=o=>{o.c=N.length;o.nb=[];o.wl=[];N.push(o);return o};
 const kinds=TAC_KINDS[kind]||['bed'];
 const room=(gx,gy,gw,gh,k)=>{const small=Math.min(gw,gh)<.75||gw*gh<.55;
  return add({ty:'room',gx,gy,gw,gh,kind:k||(small?(T.lay==='open'?(R()<.5?'office':'store'):R()<.5?'bath':'store'):kinds[Math.floor(R()*kinds.length)]),small})};
 // 把 [a,b] 隨機切成寬 lo~hi 的段落，尾段太短就併入前一段
 const cuts=(a,b,lo,hi)=>{const r=[a];let x=a;
  while(b-x>hi){const w=lo+R()*(hi-lo);if(b-x-w<lo)break;x+=w;r.push(x)}
  r.push(b);return r};
 if(T.lay==='house'){ // 透天：一側樓梯，中段小走道串起前廳、後間、廚房、浴室
  L.GW=SW+1.8;L.GH=3;
  add({ty:'stair',gx:0,gy:0,gw:SW,gh:3});
  const hw=.45,y0=.9+R()*.25,y1=y0+.95;
  add({ty:'hall',gx:SW,gy:y0,gw:hw,gh:y1-y0});
  const bk=R()<.5?[SW,L.GW]:[SW,SW+.75+R()*.35,L.GW];
  for(let i=0;i<bk.length-1;i++)room(bk[i],0,bk[i+1]-bk[i],y0,'bed');
  const kw=.7+R()*.25,rest=L.GW-SW-hw-kw,mid=R()<.5?[['kitchen',kw],['bath',rest]]:[['bath',rest],['kitchen',kw]];
  let x=SW+hw;for(const m of mid){room(x,y0,m[1],y1-y0,m[0]);x+=m[1]}
  if(R()<.4){const w=.5+R()*.2;room(SW,y1,L.GW-SW-w,3-y1,'living');room(L.GW-w,y1,w,3-y1,'store')}
  else room(SW,y1,L.GW-SW,3-y1,'living')}
 else if(T.lay==='open'){ // 賣場／廠區：寬窄不一的兩排相通區塊，偶有隔出的小房間；百貨東側另有樓梯
  L.GH=2.4;const we=SW+K*1.2,ym=.85+R()*.7;
  add({ty:'stair',gx:0,gy:0,gw:SW,gh:L.GH});
  const xs=cuts(SW,we,.85,1.5);
  for(let i=0;i<xs.length-1;i++){const w=xs[i+1]-xs[i];
   if(R()<.22&&w>1){const sy=R()<.5;room(xs[i],0,w/2,ym,sy?'store':'office');room(xs[i]+w/2,0,w/2,ym,'store')}
   else room(xs[i],0,w,ym);
   room(xs[i],ym,w,L.GH-ym)}
  L.GW=we;
  if(T.st===2){add({ty:'stair',gx:we,gy:0,gw:SW,gh:L.GH});L.GW+=SW}}
 else{ // 走廊式：主走廊分段，有時多一條往北或往南的支走廊；兩側房間寬窄不一
  L.GW=SW+K;L.GH=3;const ch=.62,y0=.95+R()*.45,y1=y0+ch;
  add({ty:'stair',gx:0,gy:0,gw:SW,gh:3});
  let br=null;
  if(R()<.55&&K>=3){br={x:SW+1+R()*(K-2.3),w:.5,north:R()<.5}}
  const hc=cuts(SW,L.GW,.9,1.4);
  for(let i=0;i<hc.length-1;i++)add({ty:'hall',gx:hc[i],gy:y0,gw:hc[i+1]-hc[i],gh:ch});
  if(br)add({ty:'hall',gx:br.x,gy:br.north?0:y1,gw:br.w,gh:br.north?y0:3-y1});
  const strip=(ya,yb,isN)=>{const segs=br&&br.north===isN?[[SW,br.x],[br.x+br.w,L.GW]]:[[SW,L.GW]];
   for(const sg of segs){if(sg[1]-sg[0]<.35)continue;const cs=cuts(sg[0],sg[1],.6,1.4);
    for(let i=0;i<cs.length-1;i++)room(cs[i],ya,cs[i+1]-cs[i],yb-ya)}};
  strip(0,y0,true);strip(y1,3,false)}
 // 鄰接：共用邊長度超過 0.25 才算相鄰
 const E=1e-6,ov=(a,b)=>{
  if(Math.abs(a.gx+a.gw-b.gx)<E||Math.abs(b.gx+b.gw-a.gx)<E)return Math.min(a.gy+a.gh,b.gy+b.gh)-Math.max(a.gy,b.gy);
  if(Math.abs(a.gy+a.gh-b.gy)<E||Math.abs(b.gy+b.gh-a.gy)<E)return Math.min(a.gx+a.gw,b.gx+b.gw)-Math.max(a.gx,b.gx);
  return 0};
 const P=[];for(let i=0;i<N.length;i++)for(let j=i+1;j<N.length;j++){const o=ov(N[i],N[j]);if(o>.25)P.push([N[i],N[j],o])}
 const door=(a,b)=>{a.wl=a.wl.filter(x=>x!==b.c);b.wl=b.wl.filter(x=>x!==a.c);if(!a.nb.includes(b.c)){a.nb.push(b.c);b.nb.push(a.c)}};
 const wall=(a,b)=>{a.wl.push(b.c);b.wl.push(a.c)};
 const open=T.lay==='open';
 for(const[a,b]of P){
  if(a.ty!=='room'&&b.ty!=='room')door(a,b);
  else if(open&&!a.small&&!b.small)door(a,b);
  else wall(a,b)}
 // 每間房開一扇門到接觸最長的走廊
 for(const r of N){if(r.ty!=='room'||r.nb.length)continue;
  const hs=P.filter(p=>(p[0]===r&&p[1].ty==='hall')||(p[1]===r&&p[0].ty==='hall')).sort((x,y)=>y[2]-x[2]);
  if(hs.length)door(r,hs[0][0]===r?hs[0][1]:hs[0][0])}
 // 客廳與廚房常常相通
 for(const[a,b]of P)if(a.ty==='room'&&b.ty==='room'&&((a.kind==='living'&&b.kind==='kitchen')||(b.kind==='living'&&a.kind==='kitchen'))&&R()<.6)door(a,b);
 // 連通：從樓梯出發還走不到的房間，開門到相鄰已走得到的空間
 for(let it=0;it<20;it++){
  const seen=new Set([0]),qu=[0];while(qu.length){const c=qu.shift();for(const d of N[c].nb)if(!seen.has(d)){seen.add(d);qu.push(d)}}
  if(seen.size===N.length)break;
  for(const[a,b]of P){if(seen.has(a.c)!==seen.has(b.c)){door(a,b);break}}}
 // 外牆方向、對外窗
 for(const n of N){n.edge=[];
  if(n.gy<.01)n.edge.push('n');if(n.gy+n.gh>L.GH-.01)n.edge.push('s');
  if(n.gx<.01)n.edge.push('w');if(n.gx+n.gw>L.GW-.01)n.edge.push('e');
  if(n.ty==='room'&&n.edge.length){n.wins=n.edge.slice();n.win=n.wins[0]}}
 // 樓梯間的中心點對齊通往走廊（或房間）的門，水線與走位才會從門進出
 for(const s of N)if(s.ty==='stair'&&s.nb.length){const o=N[s.nb[0]];s.cy=Math.max(s.gy,o.gy)+(Math.min(s.gy+s.gh,o.gy+o.gh)-Math.max(s.gy,o.gy))/2}
 // 各側入口：優先走廊，其次樓梯間，再其次客廳或其他房間
 const pri=n=>n.ty==='hall'?0:n.ty==='stair'?1:n.kind==='living'?1.5:2+(n.small?1:0);
 for(const sd of['n','e','s','w']){
  const cand=N.filter(n=>n.edge.includes(sd)).sort((a,b)=>pri(a)+(a.kind==='bath'?5:0)-pri(b)-(b.kind==='bath'?5:0));const n=cand[0];if(!n)continue;
  L.ent[sd]=n.c;
  const cy=n.cy!==undefined?n.cy:n.gy+n.gh/2;
  L.door[sd]=sd==='n'?[n.gx+n.gw/2,0]:sd==='s'?[n.gx+n.gw/2,L.GH]:sd==='w'?[0,cy]:[L.GW,cy]}
 // 房號：由北往南、由西往東
 N.filter(n=>n.ty==='room').sort((a,b)=>a.gy-b.gy||a.gx-b.gx).forEach((n,i)=>n.no=i+1);
 L.nr=N.filter(n=>n.ty==='room').length;
 return L}
// 初期搜索完成：每名受困者有一定機率被漏掉（煙越濃越容易漏），留給次級搜索
function tacPrim(B,x,extra){x.sl=Math.max(x.sl,1);x.srch=1;
 let m=0;for(let i=0;i<x.vic;i++)if(Math.random()<.08+.25*x.s+extra)m++;
 x.vic-=m;x.hid+=m}
// 打開窗戶：缺氧的悶燒火場突然開口，可能發生爆燃（Backdraft）
function tacOpenWin(inc,B,x,cs){
 if(x.v)return;x.v=1;
 if(x.o2<13&&x.h>.35&&!x.wet){x.h=1;x.fl=1;
  radio(inc,'安全官',tacNm(B,x.f,x.c)+'開口瞬間發生爆燃（Backdraft）！');
  for(const q of B.sq)if(tacIn(q)&&q.f===x.f&&(q.c===x.c||B.L.N[x.c].nb.includes(q.c))&&q.ty!=='robot'&&!q.down){q.hp=Math.max(.15,q.hp-.35);if(q.hp<.3)tacDown(inc,B,q,'遭遇爆燃')}}}
// 空間參數（換算成實際單位顯示）：溫度 °C、能見度 m、燃燒面積 ㎡、含氧量 %
function tacParam(B,x){
 const n=B.L.N[x.c],area=Math.round(n.gw*n.gh*25);
 const temp=Math.round(Math.max(25+x.h**1.15*870,25+x.s*180));
 const vis=x.s<.02?30:Math.max(.2,30*(1-x.s)**2.6);
 return{temp,vis:vis>=10?Math.round(vis):+vis.toFixed(1),area,burn:x.h>.05&&x.fu>0?Math.min(area,Math.round(area*Math.min(1,x.h*1.25))):0,o2:+x.o2.toFixed(1)}}
const tacStair=(B,c)=>B.L.N[c].ty==='stair';
// 位置名稱：3F-302 室、3F 走廊、3F 樓梯間
function tacNm(B,f,c){
 if(f<0)return'屋外';const n=B.L.N[c];
 return tacFlr(B,f)+(n.ty==='stair'?' 樓梯間':n.ty==='hall'?' 走廊':'-'+tacRm(B,f,n.no)+' 室')}
// 房號：3F 第 2 間為 302，B1 第 2 間為 B102
const tacRm=(B,f,no)=>f<B.bf?'0'+no:(f-B.bf+1)*100+no;
// 地面層（1F）的樓層索引；地下室樓層小於它
const tacG=B=>B.bf;
const tacGd=(B,a,b)=>{const x=B.L.N[a],y=B.L.N[b];return Math.abs(x.gx+x.gw/2-y.gx-y.gw/2)+Math.abs(x.gy+x.gh/2-y.gy-y.gh/2)};
// 同層最近的符合條件節點（以平面距離計）
function tacNear(B,f,c,ok){let best=null,bd=99;
 for(let i=1;i<B.W;i++){const x=tacCel(B,f,i);if(!ok(x))continue;const d=tacGd(B,c,i);if(d<bd){bd=d;best=i}}
 return best}
function tacOK(inc){return !!TACK[inc.k]&&!!inc.rev&&!inc.wrap}
// 建立建物模型；若案件已依原本的抽象進度推進，火勢依進度縮小
function tacInit(inc){
 const T=TACK[inc.k],bf=Math.random()<T.b?1:0,Fa=tacRint(T.f[0],T.f[1]),F=Fa+bf,L=tacLayout(T,tacRint(T.k[0],T.k[1]),inc.k),W=L.N.length,R=L.nr;
 const cells=[];
 for(let f=0;f<F;f++)for(const n of L.N)cells.push({f,c:n.c,ty:n.ty,sl:0,s2:0,hid:0,o2:20.9,emb:0,fk:n.ty==='room'?TAC_RK[n.kind].fk:.5,h:0,fu:n.ty==='room'?1:n.ty==='hall'?.35:0,
  s:0,v:0,vic:0,vh:1,srch:n.ty==='room'?0:1,fl:0,wet:0});
 const load={'低':.8,'中':1,'高':1.2,'極高':1.4}[inc.pm.load]||1;
 const B={F,bf,R,W,L,cells,cd:new Set(),roofV:0,roofS:0,roofH:1,st:{},role:{},pts:[],tx:0,exp:{},expW:{},expL:{},roof:0,ppv:0,ppvW:0,sq:[],resc:0,lost:0,vtot:0,peak:0,p:0,done:0,doneT:0,paid:0,
  mayday:0,lodd:0,hint:-1,aiT:0,fk:load,of:0,noRit:0};
 const rooms=L.N.filter(n=>n.ty==='room').map(n=>n.c);
 // 起火層：有地下室時約三分之一從 B1 起火（停車場、機房）
 const of=bf&&Math.random()<.35?0:bf+((inc.k==='mfire'||inc.k==='fact')?tacRint(0,Math.min(1,Fa-1)):tacRint(Math.floor(Fa*.25),Math.floor(Fa*.6)));
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
  // 五層以上的建物，火在下方時有人會往屋頂避難
  if(Fa>=5&&of<F-2&&Math.random()<.25){B.roofV++;continue}
  const f=Math.min(F-1,of+tacRint(0,Math.min(2,F-1-of))),c=pick(rooms);
  tacCel(B,f,c).vic++;if(B.hint<0)B.hint=f}
 // 醫院：另有臥床病患無法自行避難
 if(inc.k==='hospfire')for(let i=0,n=tacRint(2,4);i<n;i++){const f=Math.min(F-1,of+tacRint(0,1));tacCel(B,f,pick(rooms)).vic++;trap++}
 B.vtot=trap;
 tacSite(inc,B);
 // 上鎖：約半數入口是鐵捲門或上鎖的鐵門；約 15% 的房門上鎖，需破壞進入
 for(const e of B.ents)e.lock=Math.random()<.5?1:0;
 B.lk=new Set();B.eo={};
 for(let f=0;f<F;f++)for(const n of L.N)if(n.ty==='room'&&!n.small&&Math.random()<.15)for(const o of n.nb)if(L.N[o].ty!=='room')B.lk.add(tacDK(B,f,n.c,o));
 inc.tac=B;tacSync(inc);
 radio(inc,'受理','指揮中心接管現場戰術指揮：地上 '+Fa+' 層'+(bf?'、地下 1 層':'')+'建物、每層 '+R+' 室，起火點 '+tacNm(B,of,oc)+
  (trap&&B.hint>=0?'，報案人表示 '+tacFlr(B,B.hint)+' 有人受困':'')+(B.roofV?'，有民眾逃往屋頂':'')+(bf?'；本建物有地下室（B1），地下室沒有對外窗，只能經樓梯排煙':'')+'。');
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
   tside:B.arr,side:B.arr,tmv:0,pf:0,len:0,src:null,burst:0,ent:null,ws:null,fat:0,cyl:2})}
 // 集結區開設後，新到小組直接在集結區那側整裝待命
 if(B.st&&B.st.stage)for(const q of B.sq)if(!q.seen){q.seen=1;if(q.ty!=='ladder')q.side=B.st.stage.side}
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
 if(f===B.bf&&B.ents.some(e=>e.c===c))r.push([-1,0]);
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
 if(q.f<0){if(!q.ent)q.ent=tacBestEnt(B,q.side,q.tf,q.tc,false);return[B.bf,q.ent.c]}
 return tacPath(B,q.f,q.c,q.tf,q.tc)[0]||null}
function tacStepTime(B,q,ns){
 let t=q.f<0||ns[0]<0?1.5:ns[0]!==q.f?2.2:1.8;
 const cl=ns[0]>=0?tacCel(B,ns[0],ns[1]):null;
 if(cl)t*=1+cl.s*.8;
 if(q.task==='attack'&&q.line)t*=1.4;
 if(q.carry)t*=1.5;
 if(q.ty==='robot')t*=1.6;
 if(q.task==='ritgo')t*=.8;
 return t*(1+(q.fat||0)*.6)}
// 能力：回傳 '' 表示可以，否則為不可執行的原因
function tacCan(B,q,k,f,c){
 if(q.down)return'該組已倒地，等待 RIT 救援';
 if(q.task==='station')return'駐守'+tacStnDef(q.stn).n+'，請先撤除站點';
 const lad=q.ty==='ladder';
 if(k==='exit')return lad?'雲梯組在建物外作業':'';
 if(k==='truck')return(q.ty==='pump'||lad)?'':'只有幫浦車與雲梯車需要移車';
 if(k==='stand')return q.ty!=='pump'?'只有幫浦組能做送水口加壓':!B.sp?'本建物沒有連結送水管（五層以上才有）':B.sp.on&&B.sp.u!==q.u?'送水口已由其他車接妥':tacIn(q)?'人員在室內':tacCanSide(B,q,B.sp.side);
 if(k==='ppv')return q.ty==='vent'?'':'只有排煙組有正壓排煙送風機';
 if(k==='rit')return(lad||q.ty==='robot')?'此組無法編為 RIT':'';
 if(k==='cover')return q.ty!=='pump'?'只有幫浦組能做周界防護':Object.keys(B.exp).length?'':'四周沒有鄰棟';
 if(q.air<.3&&!lad&&q.ty!=='robot'&&k!=='exit'&&k!=='force'&&k!=='dctrl')return'空氣瓶不足，需先撤出換瓶';
 if(f===undefined||f<0)return'請點選建物內的位置';
 if(lad){
  if(f<B.bf)return'地下室無法使用雲梯';
  if(k==='roofres')return B.F-B.bf>(TAC_LADR[q.code]||7)?'屋頂超出雲梯可達高度':'';
  if(f-B.bf>=(TAC_LADR[q.code]||7))return'超出雲梯可達高度（'+(TAC_LADR[q.code]||7)+'F 以下）';
  if(k==='roof')return tacLadSide(B,q,null)?'':'沒有大型車可停靠的道路，雲梯無法架設';
  if(k==='vvent')return f!==B.F-1||B.L.N[c].ty!=='room'?'垂直排煙請點頂樓的房間':B.F-B.bf>(TAC_LADR[q.code]||7)?'屋頂超出雲梯可達高度':tacLadSide(B,q,null)?'':'沒有大型車可停靠的道路';
  if(k==='ladder'||k==='master'||k==='vent'){const n=B.L.N[c];
   if(!n.wins)return'雲梯須靠對外窗作業';
   return tacLadSide(B,q,n.wins)?'':'此室的窗戶面向'+n.wins.map(w=>TAC_SDN[w]+'側'+B.sd[w].nm).join('、')+'，雲梯車無法停靠'}
  return'雲梯組只能雲梯救援、雲梯射水或破窗排煙'}
 if(k==='master'||k==='ladder')return'需要雲梯車';
 if(k==='move')return'';
 if(k==='attack'||k==='guard')return(q.ty==='pump'||q.ty==='robot')?'':'此組沒有水線';
 if(k==='confine')return q.ty==='robot'?'機器人無法關門':'';
 if(k==='force'||k==='dctrl')return q.ty==='robot'?'機器人無法執行':'';
 if(k==='overhaul')return q.ty==='robot'?'機器人無法翻搜殘火':B.L.N[c].ty!=='room'?'請點選房間':'';
 if(k==='npv')return q.ty!=='vent'?'負壓排煙需要排煙組的排風機':f<B.bf?'地下室沒有對外窗':!B.L.N[c].wins?'此處沒有對外窗':'';
 if(k==='vvent')return q.ty==='robot'?'機器人無法上屋頂':f!==B.F-1||B.L.N[c].ty!=='room'?'垂直排煙請點頂樓的房間（在其正上方屋頂開孔）':'';
 if(k==='hydro')return q.ty!=='pump'?'水霧排煙需要幫浦組的水線':f<B.bf?'地下室沒有對外窗':!B.L.N[c].wins?'此處沒有對外窗':'';
 if(k==='trans'){if(q.ty!=='pump')return'過渡射水需要幫浦組';if(f<B.bf||f-B.bf>1)return'過渡射水只能從地面打 1F、2F 的窗口';
  const n=B.L.N[c];if(!n.wins||!n.wins.some(w=>B.sd[w].road))return'此室的窗戶不面向可站位的道路';return''}
 if(k==='search2')return q.ty==='robot'?'機器人無法搜索搬運':B.L.N[c].ty!=='room'?'只有房間需要搜索':'';
 if(k==='search')return q.ty==='robot'?'機器人無法搜索搬運':B.L.N[c].ty!=='room'?'只有房間需要搜索':'';
 if(k==='roofres')return q.ty==='robot'?'機器人無法上屋頂':'';
 if(k==='vent'&&f<B.bf)return'地下室沒有對外窗，只能經樓梯與屋頂排煙';
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
 if(k==='guard'&&side){k='cover'}
 if(k==='cover'){
  const why=q.ty!=='pump'?'只有幫浦組能做周界防護':!side||B.exp[side]===undefined?'請點選鄰棟那一側':tacIn(q)?'人員在室內':'';
  const ts=why?null:tacCoverSide(B,q,side);
  if(why||!ts){if(!quiet)msg=q.cs+'：'+(why||'沒有相鄰道路可停車射水');return false}
  if(B.sp&&B.sp.u===q.u){B.sp.on=0;B.sp.u=null;radio(inc,q.cs,'離開送水口，連結送水管停止加壓！')}
  q.prev=null;q.task='cover';q.cside=side;q.tf=-1;q.tc=0;q.lt=S.t;q.ws=null;
  if(ts!==q.tside)tacTruck(inc,B,q,ts,1);
  if(!quiet)radio(inc,q.cs,'收到，於'+TAC_SDN[ts]+'側對'+TAC_SDN[side]+'側鄰棟外牆周界防護。');
  return true}
 const why=tacCan(B,q,k,f,c);
 if(why){if(!quiet)msg=q.cs+'：'+why;return false}
 // 攻擊線：先確認水帶拉得到
 let ln=null;
 if((k==='force'||k==='dctrl')&&side){
  if(!B.ents.some(e=>e.side===side)){if(!quiet)msg=q.cs+'：該側沒有入口';return false}
  if(B.sp&&B.sp.u===q.u){B.sp.on=0;B.sp.u=null}
  q.prev=null;q.wk=0;q.task=k;q.tf=-1;q.tc=0;q.ws=side;q.dside=side;q.ent=null;
  if(!quiet)radio(inc,q.cs,'收到，'+TAC_TASK[k]+'，'+TAC_SDN[side]+'側入口。');
  return true}
 if(k==='vvent'&&q.ty!=='ladder'){
  q.prev=null;q.wk=0;q.task='vvent';q.vc=c;q.tf=B.F-1;q.tc=tacNearStair(B,B.F-1,c);q.ent=tacBestEnt(B,q.side,q.tf,q.tc,false);
  if(!quiet)radio(inc,q.cs,'收到，上屋頂於'+tacNm(B,f,c)+'正上方開孔垂直排煙。');
  return true}
 if(k==='trans'){const sd=B.L.N[c].wins.filter(w=>B.sd[w].road).sort((a,b)=>tacOutLen(q.tside,a)-tacOutLen(q.tside,b))[0];
  if(B.sp&&B.sp.u===q.u){B.sp.on=0;B.sp.u=null;radio(inc,q.cs,'離開送水口，連結送水管停止加壓！')}
  q.prev=null;q.wk=0;q.task='trans';q.tf=-1;q.tc=0;q.lf=f;q.lc=c;q.ws=sd;q.lt=S.t;q.ent=null;
  if(!quiet)radio(inc,q.cs,'收到，由'+TAC_SDN[sd]+'側窗口對'+tacNm(B,f,c)+'過渡射水，降溫後入室。');
  return true}
 if(k==='attack'||k==='guard'||k==='hydro'){ln=tacLineTo(B,q,f,c);
  if(!ln){if(!quiet)msg=q.cs+'：水帶長度不足（上限 '+TAC_HOSE+' 條）'+(B.sp&&f>=1?'，請先做送水口加壓，改由各樓層出水口接線':'')+'，或移車到較近入口那側';return false}}
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
  if(B.ppv&&q.task==='ppv'){B.ppv=0;q.task='idle';if(!quiet)radio(inc,q.cs,'正壓排煙停止，送風機關閉。');return true}
  q.task='ppv';q.tf=-1;q.tc=0;q.ws=side&&B.ents.some(e=>e.side===side)?side:(B.ents.find(e=>e.side===q.side)||B.ents[0]).side}
 else if(k==='roof'){q.task='roof';q.tf=q.ty==='ladder'?-1:B.F-1;q.tc=0;q.lf=B.F-1;q.lc=0}
 else if(k==='roofres'){q.task='roofres';q.tf=q.ty==='ladder'?-1:B.F-1;q.tc=0;q.lf=B.F;q.lc=0}
 else if(k==='vvent'){q.task='vvent';q.tf=-1;q.tc=0;q.lf=B.F;q.lc=0;q.vc=c}
 else if(q.ty==='ladder'){q.task=k;q.tf=-1;q.tc=0;q.lf=f;q.lc=c}
 if(q.ty==='ladder'&&(k==='ladder'||k==='master'||k==='vent'||k==='roof'||k==='roofres'||k==='vvent')){
  const sd=tacLadSide(B,q,k==='roof'||k==='roofres'||k==='vvent'?null:B.L.N[c].wins);q.lside=sd;
  if(sd!==q.tside)tacTruck(inc,B,q,sd,1)}
 else if(k!=='stand'&&k!=='ppv'&&k!=='exit'&&k!=='rit'&&k!=='roof'){q.task=k;q.tf=f;q.tc=c}
 if(TAC_WET[k])q.lt=S.t;
 if(!quiet)radio(inc,q.cs,'收到，'+TAC_TASK[q.task]+(f>=0&&k!=='rit'&&k!=='exit'&&k!=='ppv'?'，'+(k==='move'?'前往 ':'目標 ')+(k==='roof'||k==='roofres'?'屋頂':tacNm(B,f,c)):'')+'。');
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
 const inside=tacIn(q),cl=inside?tacCel(B,q.f,q.c):null,cmd=B.st.icp?1.15:1;
 if(q.task==='station')return;
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
  const hv=q.task==='attack'||q.task==='search'||q.task==='ritgo'||q.carry;
  q.air-=dt/TAC_AIR*(hv?1.15:1)*(q.carry?1.3:1)*(1+q.fat*.3);
  q.fat=Math.min(1.2,q.fat+dt/220*(hv?1.4:1));
  // 體力透支：撤出到屋外休息，恢復後回原任務
  if(q.fat>=1&&q.task!=='exit'&&q.task!=='carry'&&q.task!=='ritgo'){
   radio(inc,q.cs,'隊員體力透支，撤出休息。');q.prev=(q.task==='idle'||q.task==='rit')?null:{task:q.task,tf:q.tf,tc:q.tc};q.task='exit';q.tf=-1;q.tc=0}
  if(q.air<=0){q.air=0;tacDown(inc,B,q,'空氣瓶耗盡');return}
  // 低壓：剩餘氣量不足以從目前位置撤到屋外（含安全餘裕）就撤出換瓶，換瓶後回原任務；
  // 搬運受困者與 RIT 救援除外。樓層越高越早撤
  const est=(Math.abs(q.f-B.bf)*2.6+(tacGd(B,q.c,0)+1)*1.8)*1.8*1.15*(1+q.fat*.6)*(1+q.fat*.3),lowAt=Math.max(.33,(est*1.3+8)/TAC_AIR);
  if(q.air<lowAt&&q.task!=='exit'&&q.task!=='carry'&&q.task!=='ritgo'){
   if(!q.low)radio(inc,q.cs,'空氣瓶低壓警報，撤出換瓶。');
   q.low=1;q.prev=(q.task==='idle'||q.task==='rit')?null:{task:q.task,tf:q.tf,tc:q.tc};q.task='exit';q.tf=-1;q.tc=0}
  else if(q.air<lowAt&&!q.low){q.low=1;radio(inc,q.cs,'空氣瓶低壓警報，完成手上任務後撤出。')}
  const prot=(q.task==='attack'||q.task==='guard'||q.task==='hydro')&&q.line&&eff>0&&q.pf>.15&&q.f===q.tf&&q.c===q.tc;
  if(cl.h>.68)q.hp-=dt*(cl.h-.62)*(prot?.015:.07);
  // 沒有水線保護、所在空間過熱：自動撤退（搬運與 RIT 救援除外）
  if(!prot&&cl.h>.6&&q.ty!=='robot'&&q.task!=='exit'&&q.task!=='carry'&&q.task!=='ritgo'&&!q.mt){
   radio(inc,q.cs,tacNm(B,q.f,q.c)+'溫度過高，無水線掩護，撤退！');q.prev=null;q.task='exit';q.tf=-1;q.tc=0}
  if(q.hp<.3){tacDown(inc,B,q,'高溫受困');return}}
 // 移動：屋外先移車或繞到入口那側，再進出建物
 if(!inside&&tacOutStep(inc,B,q,dt)){q.nf=q.f;q.nc=q.c;return}
 const ns=tacNext(B,q);
 if(ns){q.nf=ns[0];q.nc=ns[1];
  const lockE=q.f<0&&ns[0]>=0&&q.ent&&q.ent.lock?q.ent:null;
  const lockD=q.f>=0&&ns[0]===q.f&&B.lk.has(tacDK(B,q.f,q.c,ns[1]));
  if(lockE||lockD){const need=q.ty==='resc'?4:q.ty==='robot'?6:9;
   if(!q.frc&&!B.sq.some(y=>y!==q&&y.frc>0&&y.nf===ns[0]&&y.nc===ns[1]))radio(inc,q.cs,(lockE?TAC_SDN[lockE.side]+'側入口鐵捲門上鎖':tacNm(B,q.f,ns[1])+'房門上鎖')+'，破壞進入中。');
   q.frc=(q.frc||0)+dt;q.mt=0;
   if(q.frc>=need){q.frc=0;
    if(lockE){lockE.lock=0;radio(inc,q.cs,TAC_SDN[lockE.side]+'側入口破壞完成。')}
    else{B.lk.delete(tacDK(B,q.f,q.c,ns[1]));radio(inc,q.cs,tacNm(B,q.f,ns[1])+'門鎖破壞完成。')}}
   return}
  q.frc=0;q.mt+=dt;
  if(q.mt>=tacStepTime(B,q,ns)){q.mt=0;const pc=q.c;
   if(q.f<0&&ns[0]>=0&&q.ent){B.eo[q.ent.side]=S.t;q.inEnt=q.ent}
   if(ns[0]===q.f&&q.f>=0&&B.cd.delete(tacDK(B,q.f,pc,ns[1]))&&q.task!=='exit')radio(inc,q.cs,'打開'+tacNm(B,q.f,ns[1])+'的門通過，侷限解除。');
   q.f=ns[0];q.c=ns[1];
   if(q.f<0){q.side=tacExitSide(B,q,pc);B.eo[q.side]=S.t;q.ent=null;q.inEnt=null;tacOutside(inc,B,q)}}
  return}
 q.mt=0;q.nf=q.f;q.nc=q.c;
 const k=q.task;
 if(!inside){
  // 屋外：換瓶、雲梯作業、正壓排煙
  if(q.hp<1)q.hp=Math.min(1,q.hp+dt*.03);
  q.fat=Math.max(0,q.fat-dt/(B.st.rehab?16:80));
  if(q.air<1&&q.ty!=='robot'&&q.ty!=='ladder'){
   // 換瓶：充填區 3 秒；否則用車上備用瓶 7 秒，用完要等 25 秒
   if(!q.refill){q.refill=B.st.air?'air':q.cyl>0?'cyl':'none';if(q.refill==='cyl')q.cyl--;
    if(q.refill==='none'&&!q.noCyl){q.noCyl=1;radio(inc,q.cs,'車上備用氣瓶用完，換瓶要向其他車借瓶，請開設氣瓶充填區。')}}
   q.air=Math.min(1,q.air+dt/(q.refill==='air'?3:q.refill==='cyl'?7:25));
   if(q.air>=1)q.refill=null;
   return}
  if(q.prev&&q.fat<.5){q.low=0;const p=q.prev;q.prev=null;q.task=p.task;q.tf=p.tf;q.tc=p.tc;
   radio(inc,q.cs,'換瓶休息完成，返回'+tacFlr(B,p.tf)+'續行'+TAC_TASK[p.task]+'。');return}
  if(q.prev)return;
  if(q.air>=1)q.low=0;
  if(k==='ppv'){if(!B.ppv){B.ppv=1;B.ppvSide=q.side;radio(inc,q.cs,'正壓排煙：送風機於'+TAC_SDN[q.side]+'側入口就位，開始送風。')}return}
  if(k==='force'){ // 破壞進入：預先破開這一側入口的鐵捲門或鐵門
   const e=B.ents.find(x=>x.side===q.dside);
   if(!e||!e.lock){q.task='idle';radio(inc,q.cs,TAC_SDN[q.dside]+'側入口未上鎖，可直接進入。');return}
   q.wk+=dt;if(q.wk>=(q.ty==='resc'?4:9)){q.wk=0;e.lock=0;q.task='idle';radio(inc,q.cs,TAC_SDN[e.side]+'側入口破壞完成，可以進入。')}
   return}
  if(k==='dctrl')return; // 門控進入：守在入口控制開度，入口不會變成進氣路徑
  if(k==='trans'){ // 過渡射水：從窗口外先打一波，降溫後轉入室攻擊
   const lc=tacCel(B,q.lf,q.lc);
   if(q.line&&eff>0){lc.h=Math.max(0,lc.h-dt*.14*eff*q.pf);lc.wet=1;lc.v=1;q.wk+=dt}
   if(q.wk>=10||lc.h<.15){q.wk=0;radio(inc,q.cs,tacNm(B,q.lf,q.lc)+'過渡射水完成，火勢壓制，轉入室攻擊。');
    if(!tacOrder(inc,q,'attack',q.lf,q.lc,1))q.task='idle'}
   return}
  if(k==='stand'){if(!B.sp.on){q.wk+=dt;if(q.wk>=8){q.wk=0;B.sp.on=1;B.sp.u=q.u;
    radio(inc,q.cs,'已接妥'+TAC_SDN[B.sp.side]+'側送水口，連結送水管加壓完成，各樓層出水口可接線。')}}return}
  if(q.ty==='ladder'&&(k==='ladder'||k==='master'||k==='vent'||k==='roof'||k==='roofres')){
   if(q.ext<1){q.ext=Math.min(1,q.ext+dt/(k==='roofres'?10:7));return}
   if(k==='roofres'){
    if(!B.roofS){q.wk+=dt;if(q.wk>=5){q.wk=0;B.roofS=1;radio(inc,q.cs,'雲梯抵達屋頂，'+(B.roofV?'發現避難民眾 '+B.roofV+' 名。':'屋頂無人。'))}return}
    if(B.roofV>0){q.wk+=dt;if(q.wk>=8){q.wk=0;B.roofV--;tacPatient(inc,B,B.roofH,q.cs+' 以雲梯自屋頂');}return}
    q.task='idle';return}
   const lc=tacCel(B,q.lf,q.lc);
   if(k==='roof'){if(!B.roof){B.roof=1;radio(inc,q.cs,'雲梯就位，已開啟頂樓樓梯間屋頂排煙口。')}q.task='idle';return}
   if(k==='vvent'){q.wk+=dt;if(q.wk>=10){q.wk=0;const x=tacCel(B,B.F-1,q.vc);x.vv=1;q.task='idle';
    radio(inc,q.cs,'雲梯就位，於'+tacNm(B,B.F-1,q.vc)+'正上方屋頂開孔，垂直排煙建立。')}return}
   if(k==='vent'){if(!lc.v){tacOpenWin(inc,B,lc,q.cs);radio(inc,q.cs,'雲梯破窗，'+tacNm(B,q.lf,q.lc)+'開口完成。')}q.task='idle';return}
   if(k==='master'){
    if(lc.h<=0){q.task='idle';radio(inc,q.cs,tacNm(B,q.lf,q.lc)+'火勢已熄，雲梯停止射水。');return}
    if(q.line&&eff>0&&q.pf>0){lc.h=Math.max(0,lc.h-dt*.06*eff*q.pf);lc.wet=1;lc.v=1;if(lc.h<.03){lc.h=0;lc.dw=1}
     // 內外夾攻：同層、射水房間附近的入室小組會被推回的熱煙燙傷
     const hit=B.sq.filter(x=>tacIn(x)&&x.f===q.lf&&(x.c===q.lc||B.L.N[q.lc].nb.includes(x.c))&&x.ty!=='robot'&&!x.down);
     if(hit.length&&!q.warn){q.warn=1;radio(inc,'安全官','注意，'+tacFlr(B,q.lf)+' 有入室小組，雲梯射水會把熱煙壓回室內，請協調內外攻擊！')}
     if(!hit.length)q.warn=0;
     for(const x of hit)x.hp-=dt*.015}
    return}
   // 雲梯救援：先由窗口搜索，再逐一救下
   if(lc.srch<1){lc.srch=Math.min(1,lc.srch+dt/9);
    if(lc.srch>=1){tacPrim(B,lc,.1);radio(inc,q.cs,tacNm(B,q.lf,q.lc)+'窗口初期搜索完成，'+(lc.vic?'發現受困者 '+lc.vic+' 名。':'未發現受困者。'))}return}
   if(lc.vic>0){q.wk+=dt;
    if(q.wk>=6){q.wk=0;lc.vic--;tacPatient(inc,B,lc.vh,q.cs+' 以雲梯')}
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
    if(best!==null)q.tc=best;else{q.task='hold';q.tf=q.f;q.tc=q.c;radio(inc,q.cs,tacFlr(B,q.f)+' 火勢已撲滅，原地守線。')}}}
  return}
 if(k==='move'){q.task='idle';return}
 if(k==='dctrl')return; // 門控進入：守在這裡控制門的開度，相鄰火點吃不到新鮮空氣
 if(k==='force'){ // 破壞進入：沿路的鎖都已在移動時破開；到達後把本室其餘門鎖也破開
  for(const o of B.L.N[q.c].nb)B.lk.delete(tacDK(B,q.f,q.c,o));
  q.task='idle';radio(inc,q.cs,tacNm(B,q.f,q.c)+'破壞進入完成。');return}
 if(k==='overhaul'){ // 殘火處理：翻開夾層、家具與天花板，徹底澆熄餘燼
  if(!cl.emb){const nx=tacNear(B,q.f,q.c,x=>x.emb&&x.h<.05&&!B.sq.some(y=>y!==q&&y.task==='overhaul'&&y.tf===q.f&&y.tc===x.c));
   if(nx!==null){q.tc=nx;return}q.task='idle';radio(inc,q.cs,tacFlr(B,q.f)+' 殘火處理完成。');return}
  q.wk+=dt*(q.ty==='pump'?1:.6)*(q.n/3)*cmd;
  if(q.wk>=8){q.wk=0;cl.emb=0;cl.ovh=1;radio(inc,q.cs,tacNm(B,q.f,q.c)+'殘火處理完成，確認無餘燼。')}
  return}
 if(k==='npv'){ // 負壓排煙：在窗口架排風機把煙抽出（不像正壓會把空氣灌進火場）
  if(!cl.v){q.wk+=dt;if(q.wk>=3){q.wk=0;tacOpenWin(inc,B,cl,q.cs);radio(inc,q.cs,tacNm(B,q.f,q.c)+'開窗架設排風機，負壓排煙開始。')}}
  return}
 if(k==='vvent'){ // 垂直排煙：從頂樓樓梯上屋頂，在目標房間正上方開孔
  q.wk+=dt;if(q.wk>=12){q.wk=0;tacCel(B,B.F-1,q.vc).vv=1;q.task='idle';radio(inc,q.cs,'屋頂開孔完成，'+tacNm(B,B.F-1,q.vc)+'垂直排煙建立。')}
  return}
 if(k==='hold'){ // 守線：同層復燃立即再攻擊
  const c=tacNear(B,q.f,q.c,x=>x.h>.05);if(c!==null){q.task='attack';q.tc=c;q.lt=S.t}
  return}
 if(k==='search'||k==='search2'){
  const rate=dt/(q.ty==='resc'?5:8)/TAC_RK[B.L.N[q.c].kind].sr/(1+cl.s)*(q.n/3)*cmd;
  // 初期搜索：快速掃過可能遇難處所，濃煙中可能漏人
  if(k==='search'&&cl.srch<1){cl.srch=Math.min(1,cl.srch+rate/.6);if(cl.srch>=1&&!cl.sl)tacPrim(B,cl,0);return}
  // 次級搜索：徹底翻找，找出初搜漏掉的人
  if(k==='search2'&&cl.sl<2){cl.s2=Math.min(1,cl.s2+rate/1.4);
   if(cl.s2>=1){cl.sl=2;cl.srch=1;if(cl.hid){radio(inc,q.cs,tacNm(B,q.f,q.c)+'次級搜索發現初搜遺漏的受困者 '+cl.hid+' 名！');cl.vic+=cl.hid;cl.hid=0}}
   return}
  if(cl.vic>0){
   // 估算扛人到屋外所需氣量；不夠就回報位置撤出，由後續小組接手
   const need=tacPath(B,q.f,q.c,-1,0).length*2.6*1.5*1.3*1.2/TAC_AIR+.06;
   if(q.air<need){q.prev=null;q.task='exit';q.tf=-1;q.tc=0;
    radio(inc,q.cs,tacNm(B,q.f,q.c)+'發現受困者 '+cl.vic+' 名，本組氣量不足以搬運，回報位置撤出，請後續小組接手。');return}}
  if(cl.vic>0){const take=Math.min(cl.vic,q.n>=4?2:1);cl.vic-=take;q.carry=take;q.cvh=cl.vh;q.task='carry';q.tf=-1;q.tc=0;
   radio(inc,q.cs,tacNm(B,q.f,q.c)+'發現受困者 '+take+' 名，搬運撤出。');return}
  // 本室無人：往同層下一個還沒做到這一級的房間
  const lv=k==='search'?1:2;
  const best=tacNear(B,q.f,q.c,x=>x.ty==='room'&&x.sl<lv&&x.h<.6&&!B.sq.some(y=>y!==q&&y.task===k&&y.tf===q.f&&y.tc===x.c));
  if(best!==null)q.tc=best;else{q.task='idle';radio(inc,q.cs,tacFlr(B,q.f)+(k==='search'?' 初期搜索完成。':' 次級搜索完成，本層確認淨空。'))}
  return}
 if(k==='guard'){ // 防護射水：守住這個空間不讓火延燒進來
  if(q.line&&eff>0&&q.pf>0){cl.wet=1;cl.h=Math.max(0,cl.h-dt*.03*eff*q.pf);if(cl.h<.02)cl.h=0}
  return}
 if(k==='confine'){ // 火勢侷限：關上本處通往火點或濃煙的門
  q.wk+=dt;if(q.wk<3)return;q.wk=0;
  const nd=B.L.N[q.c];let sh=nd.nb.filter(o=>{const y=tacCel(B,q.f,o);return y.h>.05||y.s>.35});
  if(!sh.length)sh=nd.nb.filter(o=>B.L.N[o].ty==='room');
  for(const o of sh)B.cd.add(tacDK(B,q.f,q.c,o));
  radio(inc,q.cs,tacNm(B,q.f,q.c)+'關閉 '+sh.length+' 扇門，侷限火勢。');
  q.task=q.ty==='pump'?'guard':'idle';q.lt=S.t;return}
 if(k==='hydro'){ // 水霧排煙：先開窗，再用水霧把煙從窗口帶出去
  if(!cl.v){q.wk+=dt;if(q.wk>=3){q.wk=0;tacOpenWin(inc,B,cl,q.cs);radio(inc,q.cs,tacNm(B,q.f,q.c)+'開窗完成，水霧排煙。')}return}
  if(q.line&&eff>0&&q.pf>0){cl.s=Math.max(0,cl.s-dt*.45*q.pf);cl.wet=1;
   for(const o of B.L.N[q.c].nb)if(!tacShut(B,q.f,q.c,o)){const y=tacCel(B,q.f,o);y.s=Math.max(0,y.s-dt*.12*q.pf)}}
  if(cl.s<.05&&B.L.N[q.c].nb.every(o=>tacCel(B,q.f,o).s<.15)){q.task='hold';radio(inc,q.cs,tacNm(B,q.f,q.c)+'一帶濃煙已排除。')}
  return}
 if(k==='vent'){q.wk+=dt;if(q.wk>=(q.ty==='vent'?2:4)){q.wk=0;tacOpenWin(inc,B,cl,q.cs);q.task='idle';
  radio(inc,q.cs,tacNm(B,q.f,q.c)+'破窗完成，開口建立。')}return}
 if(k==='roofres'){
  q.wk+=dt;if(q.wk<5)return;q.wk=0;
  if(!B.roofS){B.roofS=1;radio(inc,q.cs,'已登上屋頂，'+(B.roofV?'發現避難民眾 '+B.roofV+' 名。':'屋頂無人。'))}
  if(B.roofV>0){const take=Math.min(B.roofV,q.n>=4?2:1);B.roofV-=take;q.carry=take;q.cvh=B.roofH;q.task='carry';q.tf=-1;q.tc=0;
   radio(inc,q.cs,'自屋頂帶領民眾 '+take+' 名經樓梯下樓。')}
  else q.task='idle';
  return}
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
 if(q.carry){for(let i=0;i<q.carry;i++)tacPatient(inc,B,q.cvh===undefined?.7:q.cvh,q.cs);
  q.carry=0;q.task='idle';
  if(!q.low){q.prev=null}}
 else if(q.task==='exit'){q.task=q.prev&&q.prev.task==='rit'?'rit':'idle';if(q.task==='rit')q.prev=null}}
// 火煙動態：成長、延燒、閃燃、煙層流動、排煙、受困者存活
function tacFire(inc,B,dt){
 const W=B.W,F=B.F,R=B.R,dh=new Float32Array(B.cells.length);
 let openings=B.roof;for(const x of B.cells)if(x.v)openings++;
 if(B.ppv&&!openings&&!B.ppvW){B.ppvW=1;radio(inc,'安全官','正壓排煙中但建物沒有排煙開口，請先建立出風口！')}
 // 負壓排煙與門控的位置（每幀由小組狀態算出）
 const npv=new Set(),dcN=new Set(),dcS=new Set();
 for(const q of B.sq){if(q.down||q.mt)continue;
  if(q.task==='npv'&&q.f===q.tf&&q.c===q.tc&&tacIn(q))npv.add(q.f*W+q.c);
  if(q.task==='dctrl'){if(tacIn(q)&&q.f===q.tf&&q.c===q.tc)dcN.add(q.f*W+q.c);else if(!tacIn(q)&&q.side===q.dside)dcS.add(q.dside)}}
 B.npvS=npv;B.dcS=dcS;B.dcN=dcN;
 // 入口最近 20 秒有人進出、又沒有門控：形成進氣路徑，助長地面附近的火勢
 const flow=Object.keys(B.eo).some(s=>S.t-B.eo[s]<20&&!dcS.has(s));
 B.flow=flow;
 for(const x of B.cells){
  // 含氧量：火燒與濃煙消耗，開口越多回復越快（8% 以下幾乎無法燃燒）
  const op=x.v||x.vv||npv.has(x.f*W+x.c);
  const tg=Math.max(8,20.9-(x.h*7+x.s*7)*(op?.35:1));
  x.o2+=(tg-x.o2)*Math.min(1,dt*.3);
  if(x.ty==='stair')continue;
  const nd=B.L.N[x.c];
  if(x.h>.2){x.bd=1;x.ovh=0}
  if(x.fu>0&&x.h>.02){
   let ox=.45+.55*x.v+(x.v&&B.ppvS&&B.ppvS.has(x.f*W+x.c)?.6:0)+(x.vv?.2:0)-(x.s>.85&&!x.v?.2:0);
   if(flow&&x.f<=B.bf+1)ox+=.2;
   if(nd.nb.some(o=>dcN.has(x.f*W+o)))ox-=.3;
   ox=Math.max(.05,ox)*Math.max(.15,Math.min(1.1,(x.o2-9)/11));
   if(!x.wet)x.h=Math.min(1,x.h+dt*(.006+.03*x.h*(1-x.h*.5))*ox*B.fk*x.fk*(x.dw?.35:1));
   x.fu=Math.max(0,x.fu-dt*x.h*.0028)}
  else if(x.fu<=0)x.h=Math.max(0,x.h-dt*.02);
  x.s=Math.min(1,x.s+dt*x.h*.09);
  if(!x.fl&&!x.vv&&x.h>.82&&x.s>.7&&!x.wet){x.fl=1;x.h=1;
   radio(inc,'安全官',tacNm(B,x.f,x.c)+'發生閃燃！');
   for(const q of B.sq)if(q.f===x.f&&q.c===x.c&&q.ty!=='robot'&&!q.down){q.hp=Math.max(.2,q.hp-.4);if(q.hp<.3)tacDown(inc,B,q,'遭遇閃燃')}}
  if(x.fl&&x.h<.25)x.fl=0;
  if(x.h>.45&&!x.wet){
   // 經門延燒較快、隔牆較慢；有窗的房間經外牆往上層延燒（開窗更快）
   for(const cc of nd.nb){const nb=B.cells[x.f*W+cc];if(nb.fu>0)dh[x.f*W+cc]+=dt*(tacShut(B,x.f,x.c,cc)?.004:.011)*(x.h-.4)*(nb.wet?.2:1)}
   for(const cc of nd.wl){const nb=B.cells[x.f*W+cc];if(nb.fu>0)dh[x.f*W+cc]+=dt*.005*(x.h-.4)*(nb.wet?.2:1)}
   if(x.f+1<F){const up=B.cells[(x.f+1)*W+x.c];if(up.fu>0)dh[(x.f+1)*W+x.c]+=dt*(nd.win&&x.f>=B.bf?.008:.004)*(x.h-.45)*(1+x.v*1.6)}}}
 for(let i=0;i<dh.length;i++)if(dh[i]>0){const x=B.cells[i];x.h=Math.min(1,Math.max(x.h,.02)+dh[i])}
 // 煙：同層經門交換（含樓梯間），樓梯間往上竄
 for(let f=0;f<F;f++)for(const n of B.L.N)for(const cc of n.nb){if(cc<n.c)continue;
  const a=B.cells[f*W+n.c],b=B.cells[f*W+cc],m=(a.s-b.s)*dt*(tacShut(B,f,n.c,cc)?.04:.25);a.s-=m;b.s+=m}
 for(const n of B.L.N)if(n.ty==='stair')for(let f=0;f<F-1;f++){const a=B.cells[f*W+n.c],b=B.cells[(f+1)*W+n.c],m=a.s*dt*.2*(1-b.s);a.s-=m;b.s+=m}
 B.ppvT=(B.ppvT||0)-dt;if(B.ppvT<=0){B.ppvT=1;B.ppvS=tacPpvSet(B)}
 const pset=B.ppvS||new Set();
 for(const x of B.cells){
  let out=.004;
  const onP=pset.has(x.f*W+x.c);
  if(x.v)out+=.1+(onP?.18:0);
  if(onP)out+=.08;
  if(x.ty==='stair'&&x.f===F-1&&B.roof)out+=.25;
  if(x.vv)out+=.3;
  if(npv.has(x.f*W+x.c))out+=.35;
  else if(B.L.N[x.c].nb.some(o=>npv.has(x.f*W+o)&&!tacShut(B,x.f,x.c,o)))out+=.1;
  // 餘燼：燒過、撲滅後還有可燃物，沒做殘火處理就留著；沒人在場時偶爾復燃
  if(x.ty==='room'){
   if(x.bd&&x.h<.02&&x.fu>.1&&!x.ovh&&!x.emb){x.emb=1;x.embT=150}
   // 餘燼約 150 秒後自然熄滅；在那之前沒人在場時偶爾復燃
   if(x.emb&&(x.embT-=dt)<=0){x.emb=0;x.ovh=1}
   if(x.emb&&x.h<.02&&!B.sq.some(q=>q.f===x.f&&q.c===x.c)&&Math.random()<dt*.0015){x.h=.15;x.emb=0;x.dw=0;
    radio(inc,'安全官',tacNm(B,x.f,x.c)+'殘火復燃！請派員殘火處理。')}}
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
 const want=B.sq.filter(q=>TAC_WET[q.task]&&!q.down).sort((a,b)=>a.lt-b.lt);
 for(const q of B.sq){q.line=0;if(q.burst>0)q.burst-=dt}
 let n=0,spN=0;
 for(const q of want){
  if(n>=L)break;
  if(q.task==='trans'){if(q.side!==q.ws)continue;q.src='pump';q.len=tacOutLen(q.tside,q.ws)+1;q.pf=.95;q.lu=q.u;q.lent=null;q.line=1;n++;continue}
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
   const path=tacPath(B,B.bf,ln.ent.c,q.f,q.c);
   if(path.some(p=>tacCel(B,p[0],p[1]).h>.7)&&Math.random()<dt*.025){q.burst=8;
    radio(inc,q.cs,'水帶遭高溫燒破，出水中斷，更換水帶中。')}}
  if(q.burst>0)q.pf=0}
 inc.lines=Math.max(1,n); // 用水量依實際出水線數計算
 return L}
// 戰術 AI：分成可個別啟用的模組。AI 指揮時全部啟用；玩家指揮時只啟用已指派職務對應的模組
// M：{safety, water, search, ems, attack, ladder, stn}
function tacAI(inc,B,dt,M){
 B.aiT-=dt;if(B.aiT>0)return;B.aiT=1.5;
 const free=B.sq.filter(q=>!q.down&&!q.tmv&&(q.task==='idle'||q.task==='hold')&&!q.prev&&(q.ty==='ladder'||q.ty==='robot'||q.air>(tacIn(q)?.45:.6)));
 const take=q=>{const i=free.indexOf(q);if(i>=0)free.splice(i,1)};
 const burning=B.cells.filter(x=>x.ty!=='stair'&&x.h>.05).sort((a,b)=>a.f-b.f||b.h-a.h);
 // 站點（AI 指揮）：指揮站、氣瓶充填區、Rehab、聯訪處、集結區
 if(M.stn){
  if(!B.st.icp)tacStnOpen(inc,B,'icp',1);
  if(!B.st.air&&B.sq.length>=4)tacStnOpen(inc,B,'air',1);
  if(!B.st.media&&B.vtot&&B.st.icp)tacStnOpen(inc,B,'media',1);
  if(!B.st.stage&&onScene(inc).filter(u=>u.code==='41').length>=2)tacStnOpen(inc,B,'stage',1);
  if(!B.st.rehab&&B.sq.length>=6&&tacAmbFree(inc,B)>=2)tacStnOpen(inc,B,'rehab',1);
  for(const q of free.slice())if(q.task==='station')take(q)}
 // 救護：檢傷站、醫療站、請求救護車
 if(M.ems){
  if(!B.st.triage&&B.pts.length>=2&&tacAmbFree(inc,B)>=2)tacStnOpen(inc,B,'triage',1);
  if(!B.st.treat&&B.pts.some(p=>p.sev==='red')&&B.pts.length>=2)tacStnOpen(inc,B,'treat',1);
  if(B.pts.length>tacAmbFree(inc,B)&&B.ambT<=0&&!inc.req)tacAmbReq(inc,B,1)}
 // 安全：RIT、MAYDAY、閃燃前兆撤出
 if(M.safety){
  if(!B.sq.some(q=>q.task==='rit'||q.task==='ritgo')&&B.sq.length>=3){
   const r=free.find(q=>q.ty==='resc'&&!tacIn(q))||(B.sq.length>=4?free.find(q=>q.ty==='pump'&&!tacIn(q)):null);
   if(r){tacOrder(inc,r,'rit',-1,0,1);radio(inc,r.cs,'奉安全官指派編成 RIT，於入口待命。');take(r)}}
  if(B.mayday&&!B.sq.some(q=>q.task==='ritgo')){
   const dn=B.sq.find(q=>q.down);
   const r=dn&&B.sq.filter(q=>!q.down&&q.ty!=='ladder'&&q.ty!=='robot'&&q.air>.45&&q.task!=='carry'&&q.task!=='station')
    .sort((a,b)=>(Math.abs(a.f-dn.f)+Math.abs(a.c-dn.c))-(Math.abs(b.f-dn.f)+Math.abs(b.c-dn.c)))[0];
   if(r){tacOrder(inc,r,'rit',-1,0,1);radio(inc,r.cs,'轉任 RIT，前往救援 '+dn.cs+'。');take(r)}}
  for(const q of B.sq){if(!tacIn(q)||q.down||q.ty==='robot'||q.task==='exit'||q.task==='carry'||q.task==='ritgo')continue;
   const x=tacCel(B,q.f,q.c),prot=q.task==='attack'&&q.line&&q.pf>.3&&q.f===q.tf&&q.c===q.tc;
   if(!prot&&!x.fl&&x.h>.7&&x.s>.6){q.prev=null;q.task='exit';q.tf=-1;q.tc=0;radio(inc,'安全官',tacNm(B,q.f,q.c)+'出現閃燃前兆（煙層下降、溫度急升），'+q.cs+' 立即撤出！')}}}
 // 水源：佔水、送水口、鄰棟防護
 let spare=tacCapAll(inc,B)-B.sq.filter(q=>q.line).length;
 if(M.water){
  if(!tacHydOK(inc,B)&&!B.sq.some(q=>q.tmv&&q.tgt===B.hyd.side)){
   const p=free.find(q=>q.ty==='pump'&&!tacIn(q)&&!tacCanSide(B,q,B.hyd.side));
   if(p&&tacTruck(inc,B,p,B.hyd.side)){take(p);radio(inc,p.cs,'前往'+TAC_SDN[B.hyd.side]+'側消防栓佔水。')}}
  if(B.sp&&!B.sp.on&&B.of-B.bf>=2&&!B.sq.some(q=>q.task==='stand')){
   const p=free.find(q=>q.ty==='pump'&&!tacIn(q)&&!tacCan(B,q,'stand',-1,0));
   if(p&&tacOrder(inc,p,'stand',-1,0,1)){take(p);radio(inc,p.cs,'前往'+TAC_SDN[B.sp.side]+'側送水口加壓。')}}
  for(const sd of Object.keys(B.exp)){
   if(B.exp[sd]<.35||B.expL[sd]||spare<=0||B.sq.some(q=>q.task==='cover'&&q.cside===sd))continue;
   const p=free.find(q=>q.ty==='pump'&&!tacIn(q)&&!q.line);
   if(p&&tacOrder(inc,p,'cover',-1,0,1,sd)){take(p);spare--}}}
 // 進入（AI）：入口都上鎖時先派救助組破壞；人手夠時派一組門控主入口
 if(M.attack){
  if(B.ents.length&&B.ents.every(e=>e.lock)&&!B.sq.some(y=>y.task==='force')){
   const r=free.find(q=>q.ty==='resc'&&!tacIn(q))||free.find(q=>q.ty!=='ladder'&&q.ty!=='robot'&&!tacIn(q)&&!q.line);
   const e=r&&B.ents.slice().sort((a,b)=>tacWalk(r.side,a.side)-tacWalk(r.side,b.side))[0];
   if(r&&e&&tacOrder(inc,r,'force',-1,0,1,e.side))take(r)}
  if(B.sq.length>=6&&!B.sq.some(y=>y.task==='dctrl')&&burning.length){
   const e=B.ents.find(x=>x.side===B.arr)||B.ents[0],r=free.find(q=>(q.ty==='resc'||q.ty==='vent')&&!tacIn(q));
   if(r&&e&&tacOrder(inc,r,'dctrl',-1,0,1,e.side)){take(r);radio(inc,r.cs,'於'+TAC_SDN[e.side]+'側入口門控，控制進氣。')}}}
 for(const q of free.slice()){
  // 殘火處理（AI）：同層沒有火點了，就翻搜有餘燼的房間
  if(M.attack&&q.ty!=='ladder'&&q.ty!=='robot'){
   const em=B.cells.filter(x=>x.emb&&x.h<.05&&!B.sq.some(y=>y!==q&&y.task==='overhaul'&&y.tf===x.f&&y.tc===x.c))
    .sort((a,b)=>Math.abs(a.f-(q.f<0?B.bf:q.f))-Math.abs(b.f-(q.f<0?B.bf:q.f)));
   const fireOnFloor=q.f>=0&&burning.some(x=>x.f===q.f);
   if(em.length&&!fireOnFloor&&(q.ty!=='pump'||!burning.length||q.task==='hold')&&tacOrder(inc,q,'overhaul',em[0].f,em[0].c,1))continue}
  // 攻擊（AI 指揮）
  if(M.attack&&(q.ty==='pump'||q.ty==='robot')&&(spare>0||q.line)){
   const ts=burning.filter(x=>!B.sq.some(y=>y!==q&&y.task==='attack'&&y.tf===x.f&&y.tc===x.c));
   if(q.ty==='pump'&&!tacIn(q)&&!q.line&&ts.length&&!(B.hyd&&q.tside===B.hyd.side&&B.sq.filter(x=>x.ty==='pump'&&x.tside===B.hyd.side).length<2)){
    const t=ts[0],bs=tacBestSide(B,q,t.f,t.c),cur=tacLineTo(B,q,t.f,t.c);
    if(bs&&bs.side!==q.tside&&(!cur||cur.len-bs.len>=3)&&!(cur&&cur.src==='sp')){tacTruck(inc,B,q,bs.side,1);radio(inc,q.cs,'移車至'+TAC_SDN[bs.side]+'側，縮短水帶佈線。');continue}}
   // 地面兩層的猛烈火點：先從窗外過渡射水再入室
   const t0=ts[0];
   if(q.ty==='pump'&&!tacIn(q)&&t0&&t0.h>.5&&!tacCan(B,q,'trans',t0.f,t0.c)&&!B.sq.some(y=>y.task==='trans')&&tacOrder(inc,q,'trans',t0.f,t0.c,1)){spare--;continue}
   let ok=false;for(const t of ts)if(tacOrder(inc,q,'attack',t.f,t.c,1)){ok=true;break}
   if(ok){if(!q.line)spare--;continue}}
  // 水霧排煙（AI）：守線組所在空間濃煙仍重，又有窗可開
  if(M.attack&&q.task==='hold'&&q.line&&tacIn(q)&&tacCel(B,q.f,q.c).s>.5&&!tacCan(B,q,'hydro',q.f,q.c)&&tacOrder(inc,q,'hydro',q.f,q.c,1))continue;
  // 火勢侷限（AI）：水線不夠打所有火點時，派非幫浦組到火點旁的走廊關門
  if(M.attack&&(q.ty==='resc'||q.ty==='vent')&&spare<=0&&burning.length>B.sq.filter(y=>y.line).length+1){
   const fl=burning[0].f;B.confF=B.confF||{};
   if(!B.confF[fl]){const hn=B.L.N.find(n=>n.ty==='hall'&&n.nb.some(o=>tacCel(B,fl,o).h>.1)&&tacCel(B,fl,n.c).h<.1);
    if(hn&&tacOrder(inc,q,'confine',fl,hn.c,1)){B.confF[fl]=1;continue}}}
  // 排煙（AI 指揮）：配合射水破窗、正壓排煙
  if(M.attack&&q.ty==='vent'){
   const atk=B.sq.find(y=>y.task==='attack'&&y.line&&y.f===y.tf&&y.c===y.tc&&tacIn(y)&&y.f>=B.bf);
   if(atk&&B.L.N[atk.c].wins&&!tacCel(B,atk.f,atk.c).v&&tacOrder(inc,q,'vent',atk.f,atk.c,1))continue;
   if(atk&&!B.ppv&&!tacIn(q)&&tacOrder(inc,q,'ppv',-1,0,1))continue;
   // 沒有火的空間濃煙仍重：在有窗的房間負壓排煙
   const sm=B.cells.filter(x=>x.ty==='room'&&x.f>=B.bf&&x.s>.6&&x.h<.1&&B.L.N[x.c].wins&&!B.npvS.has(x.f*B.W+x.c)).sort((a,b)=>b.s-a.s)[0];
   if(!atk&&sm&&tacOrder(inc,q,'npv',sm.f,sm.c,1))continue}
  // 搜索：救助組（AI 指揮時幫浦組與排煙組也會搜）
  if(M.search&&(q.ty==='resc'||(M.attack&&(q.ty==='pump'||q.ty==='vent')))){
   if(B.roofV&&!B.roofS&&!B.sq.some(y=>y.task==='roofres')&&q.ty==='resc'&&tacOrder(inc,q,'roofres',B.F-1,0,1))continue;
   if(B.roofS&&B.roofV>0&&!B.sq.some(y=>y.task==='roofres')&&tacOrder(inc,q,'roofres',B.F-1,0,1))continue;
   const un=B.cells.filter(x=>x.ty==='room'&&(x.sl<1||x.vic>0)&&x.h<.45&&!B.sq.some(y=>y!==q&&y.task==='search'&&y.tf===x.f&&y.tc===x.c));
   // 搜索順序：受困通報樓層 → 起火層 → 上一層 → 下一層，再往外擴（上方略優先）
   const pri=x=>(x.f===B.hint?-20:0)+Math.abs(x.f-B.of)-(x.f>B.of?.5:0)+tacGd(B,0,x.c)*.1;
   un.sort((a,b)=>pri(a)-pri(b));
   if(un.length&&tacOrder(inc,q,'search',un[0].f,un[0].c,1))continue;
   // 初搜都做完但人數還對不上：次級搜索（起火層與上方優先）
   let found=B.resc+B.lost+B.roofV;for(const x of B.cells)found+=x.vic;for(const y of B.sq)found+=y.carry;
   if(!un.length&&found<B.vtot){
    const s2=B.cells.filter(x=>x.ty==='room'&&x.sl===1&&x.h<.45&&!B.sq.some(y=>y!==q&&y.task==='search2'&&y.tf===x.f&&y.tc===x.c)).sort((a,b)=>pri(a)-pri(b));
    if(s2.length&&tacOrder(inc,q,'search2',s2[0].f,s2[0].c,1))continue}}
  // 雲梯：窗口救援、屋頂救援（搜救組長或 AI）；屋頂排煙與外部射水（AI）
  if(q.ty==='ladder'&&(M.search||M.attack)){
   const reach=TAC_LADR[q.code]||7;
   if(B.roofV>0&&!B.sq.some(y=>y.task==='roofres'&&y.ty==='ladder')&&tacOrder(inc,q,'roofres',B.F-1,0,1))continue;
   const v=B.cells.find(x=>x.ty==='room'&&x.f>=B.bf&&x.f-B.bf<reach&&x.vic>0&&x.srch>=1);
   if(v&&tacOrder(inc,q,'ladder',v.f,v.c,1))continue;
   if(M.attack){
    const top=tacCel(B,B.F-1,0);
    if(!B.roof&&top.s>.5&&B.F-1-B.bf<reach&&tacOrder(inc,q,'roof',B.F-1,0,1))continue;
    const ex=burning.find(x=>x.ty==='room'&&x.f>=B.bf&&x.f-B.bf<reach&&!B.sq.some(y=>tacIn(y)&&y.f===x.f));
    if(ex&&spare>0&&tacOrder(inc,q,'master',ex.f,ex.c,1)){spare--;continue}}}
  // 室內沒事做：退回屋外待命（AI 指揮）
  if(M.attack&&tacIn(q)&&q.task==='idle')tacOrder(inc,q,'exit',-1,0,1)}}
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
 tacStnStep(inc,B,dt);
 tacEMS(inc,B,dt);
 // 屋頂避難者：頂樓樓梯間的煙會讓他們慢慢惡化
 if(B.roofV>0){let ts=0;for(const n of B.L.N)if(n.ty==='stair')ts=Math.max(ts,tacCel(B,B.F-1,n.c).s);
  B.roofH-=dt*(ts*.004+.0004);
  if(B.roofH<=0){B.lost+=B.roofV;S.rep-=3*B.roofV;radio(inc,'受理','屋頂避難民眾 '+B.roofV+' 名罹難（評鑑 -'+3*B.roofV+'）。');B.roofV=0}}
 const ply=TAC.open&&TAC.id===inc.id;
 tacAI(inc,B,dt,ply?{safety:B.role.safety,water:B.role.water,search:B.role.search,ems:B.role.ems}:
  {safety:1,water:1,search:1,ems:1,attack:1,stn:1});
 // 進度：控火 60%、受困者處置 40%；火全滅、餘燼都處理完、受困者都已處置與後送後 3 秒結案
 let sumH=0,out=true;for(const x of B.cells){sumH+=x.h;if(x.h>=.04)out=false}
 B.peak=Math.max(B.peak,sumH);
 let left=B.roofV;for(const x of B.cells)left+=x.vic+x.hid;for(const q of B.sq)left+=q.carry;
 const vd=B.vtot?(B.vtot-left)/B.vtot:1;
 B.p=.6*(1-sumH/Math.max(.001,B.peak))+.4*vd;
 // 結案條件：火全滅、受困者都已處置、傷患都已後送（或不治）
 const evac=B.pts.length+onScene(inc).filter(u=>u.load>0).length;
 if(out&&!left&&!evac&&!B.cells.some(x=>x.emb)){B.doneT+=dt;
  if(B.doneT>=3&&!B.done){B.done=1;
   B.burnt=B.cells.filter(x=>x.ty==='room'&&x.fu<.3).length;
   const half=B.burnt>B.R*B.F*.5;
   if(half){S.rep-=5;if(S.rep<=0){S.rep=0;S.over=true}}
   radio(inc,first?first.cs:'現場',(half?'建物大部分燒毀，火勢因燃料耗盡熄滅（評鑑 -5）':'火勢完全撲滅、殘火處理完成')+'，救出 '+B.resc+' 名、送醫 '+B.tx+' 名'+(B.lost?'、罹難 '+B.lost+' 名':'')+(B.burnt?'，燒毀 '+B.burnt+' 室':'')+'。');
   if(B.st.media){S.rep=Math.min(100,S.rep+2)}
   if(!B.paid){B.paid=1;S.money+=B.tx*400;S.score+=B.tx*50+(B.lodd?0:60)}}}
 else B.doneT=0;
 const w=inc.dur*(B.done?1:Math.min(.96,B.p));
 if(w>inc.work)inc.work=w;
 const np=Math.min(inc.phs.length-1,Math.floor(inc.work/inc.dur*inc.phs.length));
 if(np>inc.ph){inc.ph=np;radio(inc,first?first.cs:'現場','進入「'+inc.phs[np]+'」階段。')}
 if(!B.done)inc.left-=dt*(first?.22:1)}
