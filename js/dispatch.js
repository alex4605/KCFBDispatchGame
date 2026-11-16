// 派遣：編組比對、水源、出動、停車、到場
'use strict';
function spawnDuty(){
 const t=pick(DUTY),cand=[];
 for(let x=2;x<N-2;x++)for(let y=2;y<N-2;y++){const k=K(x,y);
  if(!RD[k]&&!TR[k]&&(cls(x+1,y)||cls(x,y+1)))cand.push([x,y])}
 if(!cand.length)return;
 const c=pick(cand),a=nbRoad(c[0],c[1]);
 if(!a)return;
 S.duties.push({id:uid++,n:t.n,code:t.c,dur:t.d,pay:t.p,x:c[0],y:c[1],ax:a[0],ay:a[1],
  left:75,unit:null,run:0,addr:pick(RDN)+'路'})}
function match(g,u){
 if(!g.items||!g.items.length)return g.c.indexOf(u.code)>=0&&(!g.als||u.tp);
 const set=eqSet(u);
 for(const i of g.items)if(!set.has(i))return false;
 return true}
function fill(inc,wk){
 const r=inc.need.map(()=>0);let ex=0;
 for(const u of onScene(inc)){
  if(wk&&!onDuty(u))continue;
  let put=0;
  for(let i=0;i<inc.need.length;i++)
   if(r[i]<inc.need[i].n&&match(inc.need[i],u)){r[i]++;put=1}
  if(!put)ex++}
 r.extra=ex;return r}
function recLines(inc){const d=KIND[inc.k];
 return d.fire?Math.max(1,Math.min(6,Math.round((inc.pm.area||60)/90)+1)):2}
function pumpsOn(inc){let n=0;
 for(const u of onScene(inc))if(u.st==='work'&&CODE[u.code].cap)n++;
 return n}
function effLines(inc){return Math.max(0,Math.min(inc.lines||0,pumpsOn(inc)*2))}
function tankPool(inc){let a=0,b=0;
 for(const u of onScene(inc))if(u.st==='work'&&CODE[u.code].cap){a+=u.tank;b+=CODE[u.code].cap}
 return[a,b]}
function drawWater(inc,L){
 let[pool]=tankPool(inc);if(pool<=0)return 0;
 const take=Math.min(L,pool),r=take/pool;
 for(const u of onScene(inc))if(u.st==='work'&&CODE[u.code].cap)u.tank=Math.max(0,u.tank-u.tank*r);
 return take}
function fillTanks(inc,L){
 for(const u of onScene(inc)){
  if(u.st!=='work')continue;
  const cap=CODE[u.code].cap;if(!cap)continue;
  const room=cap-u.tank;if(room<=0)continue;
  const add=Math.min(room,L);u.tank+=add;L-=add;if(L<=0)break}}
function refillRun(u,inc){
 let best=null,bd=1e9;
 for(const h of S.hyd){const d=Math.abs(h[0]-u.x)+Math.abs(h[1]-u.y);if(d<bd){bd=d;best=h}}
 if(!best)return false;
 const p=chase(field(best[0],best[1],modeOf(u.code)),u);
 if(!p)return false;
 unpark(u);u.path=p;u.st='fill';u.back=inc.id;
 radio(inc,u.cs,'水箱見底，返回最近水源補水，來回約需一段時間。');
 return true}
function hydShare(inc){
 if(!inc.hy)return 1;
 let n=1;
 for(const o of S.inc)if(o!==inc&&o.hy&&o.hy[0]===inc.hy[0]&&o.hy[1]===inc.hy[1]&&o.hooked)n++;
 return 1/n}
// 實際供水量（L/s）：模擬與面板共用同一個算式
function inflowOf(inc){
 if(!inc.hooked)return 0;
 let tend=0;for(const u of onScene(inc))if(u.st==='work'&&u.code==='61')tend++;
 const share=inc.tender?1:hydShare(inc),loss=inc.tender?1:Math.max(.55,1-(inc.hd||0)*.018);
 return Math.round((inc.hin||INFLOW)*share*loss+Math.min(300,tend*150))}
function waterOK(inc){
 if(!KIND[inc.k].w)return true;
 if(inc.hooked)return true;
 let tk=0;
 for(const u of onScene(inc))if(u.st==='work'&&CODE[u.code].cap)tk+=u.tank;
 return tk>60}

function pmText(inc){
 const d=KIND[inc.k],p=inc.pm;
 if(d.fire)return[['火警分級',['','一級','二級','三級','四級'][p.lvl]+'火警'],['火載量',p.load],['燃燒面積',p.area+' ㎡'],
  ['受困人數',p.trap+' 人'],['結構穩定度',p.stab]];
 if(d.med)return[['救護等級',p.als?'ALS':'BLS'],['處置',p.als?'須 EMT-P 隨車':'基本救護即可']];
 if(p.trap!==undefined)return[['受困人數',p.trap+' 人']];
 return[]}
function reveal(inc,u){
 if(inc.pm.fake){inc.rev=1;radio(inc,u.cs,'到達現場，當事人表示手錶掉落誤觸，無人受傷，任務取消。');return}
 const d=KIND[inc.k];inc.rev=1;
 if(d.fake){radio(inc,u.cs,'到達現場，患者可自行對答與行走，生命徵象正常，'+
   pick(['主訴與檢查所見不符，仍依規定戒護送醫。','研判無立即危險，依規定送醫由急診評估。']));return}
 if(d.hoax){radio(inc,u.cs,'到達現場查無火煙、無傷病患，研判為'+(inc.pm.mal?'惡作劇謊報，建議轉報 110 究辦':'善意誤報')+'。');return}
 radio(inc,u.cs,'到達現場，'+(d.fire?
  '回報'+['','一級','二級','三級','四級'][inc.pm.lvl]+'火警，火載量 '+inc.pm.load+'、燃燒面積約 '+inc.pm.area+' ㎡、受困 '+inc.pm.trap+
  ' 人、結構穩定度 '+inc.pm.stab:
  d.med?'病患'+(inc.pm.ohca?'無呼吸心跳，立即開始急救':inc.pm.als?'意識不清、呼吸窘迫，需高級救護處置':'意識清楚、生命徵象穩定'):'現場為'+(inc.nm||d.n))+
  '，需求 '+inc.need.slice(0,4).map(g=>g.l+' '+g.n).join('、')+(inc.need.length>4?' 等 '+inc.need.length+' 項器材':'')+'。');
 if(d.fire&&inc.pm.lvl<3&&Math.random()<.3){
  inc.pm.lvl++;inc.pm.area+=60;
  const add=arrNeed(inc.pm.lvl,!!d.wild,inc.pm.trap);
  inc.need=add.concat(inc.need.filter(g=>!add.some(a=>a.l===g.l)));
  inc.pay=Math.round(inc.pay*1.35);inc.left=Math.min(inc.max,inc.left+25);
  radio(inc,u.cs,'火勢延燒隔棟，升級為'+['','一級','二級','三級','四級'][inc.pm.lvl]+'火警，請依編組增派。')}
 else if(Math.random()<.2){
  const g=pick(inc.need);g.n++;inc.pay=Math.round(inc.pay*1.2);inc.left=Math.min(inc.max,inc.left+15);
  radio(inc,u.cs,'現場狀況超出預估，請求增派'+g.l+'一組。')}}
function fireEvent(inc,u){
 const list=EV[inc.phs[inc.ph]];
 if(!list||inc.req)return;
 const e=pickFit(list,inc,x=>x.s);if(!e)return;
 inc.req={t:e.t,s:e.s,c:e.c,als:e.als||0,cs:u?u.cs:'現場'};
 inc.reqT=22;
 radio(inc,u?u.cs:'現場',e.s)}
function answer(inc,yes,timeout){
 const r=inc.req;if(!r)return;
 inc.req=null;inc.reqT=0;
 if(r.t==='note'){if(!timeout)radio(inc,'受理','收到，繼續回報。');return}
 if(r.t==='call'){
  if(yes){
   inc.log.push({w:'民',s:pick(['我在'+inc.addr+'的後面那條巷子，你們從側門進來。',
    '不好意思，是隔壁棟，門口有一台白色機車。',
    '我在三樓，鐵門沒鎖，直接上來就好。']),t:S.t-inc.t0});
   radio(inc,r.cs,'位置確認，續行任務。')}
  else{inc.left-=14;radio(inc,r.cs,'自行搜索中，耗費較多時間。')}
  return}
 // need
 if(yes){
  const codes=ALT[r.c]||[r.c];
  let g=inc.need.find(x=>x.c.indexOf(r.c)>=0&&(!!x.als)===(!!r.als));
  if(g)g.n++;
  else{const bk=CODEQ[r.c];
   if(bk){const rows=mkItems(bk,1,r.als,(KITEM[inc.k]&&KITEM[inc.k][bk])||null);
    for(const rr2 of rows){const same=inc.need.find(x=>x.item===rr2.item);
     if(same)same.n++;else inc.need.push(rr2)}g=rows[0]||inc.need[0]}
   else{g=G(codes,1,LB[r.c],r.als);inc.need.push(g)}}
  inc.pay=Math.round(inc.pay*1.08);
  const u2=nearest(inc,codes,r.als);
  const sent=u2&&send(inc,u2,r.c==='91'?(r.als?'ALS':'BLS'):null);
  if(!sent&&!u2)msg='無可調度的'+LB[r.c]+'，請自行指派';
  radio(inc,'受理',sent?'同意增派'+LB[r.c]+'，已下達出動。':'同意增派'+LB[r.c]+'，但目前無車可派，待調度後補派。')}
 else if(r.gate){radio(inc,r.cs,'了解，現場先行處置，持續等待器材到場。')}
 else{inc.slow=Math.max(.62,(inc.slow||1)*.85);
  radio(inc,r.cs,'了解，現場以現有人力續行，進度會慢一些。')}}
function suggested(inc){if(!inc.rev)return[];const f=fill(inc,0);return inc.need.filter((g,i)=>f[i]<g.n)}
function crewUp(u,mode){u._eq=null;
 if(u.code!=='91'){u.mode=null;u.tp=false;u.crew=2;return true}
 if(mode==='ALS'){
  if(tpFree(u.si)<=0){msg=SPOT[u.si].n+'分隊已無可派遣的高級救護技術員';return false}
  u.mode='ALS';u.crew=3;u.tp=true;u.res=true;return true}
 u.mode='BLS';u.crew=2;u.tp=Math.random()<.2;u.res=false;return true}
function crewDown(u){u._eq=null;u.mode=null;u.tp=false;u.crew=0;u.res=false}
function send(inc,u,mode){
 const p=pathTo(u,inc);
 if(!p){msg=u.cs+' 無法進場（'+(isBig(u.code)?'大型車受巷弄或山區道路限制':isBoat(u.code)?'無水域或道路可通達':'無可行路線')+'）';return false}
 if(!crewUp(u,mode))return false;
 u.path=p;u.st='go';u.turn=u.code==='搜'?(26+Math.random()*18):(5+Math.random()*4);
 u.inc=inc.id;u.duty=null;
 u.lead=LEADC[u.code]&&Math.random()<.22;
 if(u.code==='搜')radio(inc,u.cs,'特搜人員與搜救犬集結中，預計 '+Math.round(u.turn)+' 秒後出發。');
 let cnt=0;for(const v of S.units)if(v.inc===inc.id)cnt++;
 u.off=cnt-1;
 if(cnt<=3)radio(inc,u.cs,'受命出動，預計 '+(etaTo(u,inc)+Math.round(u.turn))+' 秒到達。');
 else if(cnt%4===0)radio(inc,'受理','已陸續增派，目前編組 '+cnt+' 車。');
 return true}
function nearest(inc,codes,als){
 let best=null,bd=INF;
 for(const u of S.units){
  if(u.st!=='idle'||codes.indexOf(u.code)<0)continue;
  if(als&&u.code==='91'&&tpFree(u.si)<=0)continue;
  const e=etaTo(u,inc);if(e===null||e>=bd)continue;bd=e;best=u}
 return best}
// 轉報 110：手動按鈕與編組自動轉報共用
function callPol(inc){
 if(inc.pol!==0)return;
 inc.pol=1;inc.polT=25+Math.random()*20;
 radio(inc,'受理','已轉報 110，警方預估 '+Math.ceil(inc.polT)+' 秒到場。')}
function sendPkg(inc,p){
 let n=0;
 for(const item of p.l){
  const c=item[0],q=item[1],als=item[2],codes=ALT[c]||[c];
  for(let i=0;i<q;i++){
   const u=nearest(inc,codes,als);
   if(!u){msg='無可用或可進場的'+LB[c]+(als?'（含 EMT-P）':'');break}
   if(send(inc,u,c==='91'?(als?'ALS':'BLS'):null))n++}}
 if(p.pol&&n)callPol(inc);
 return n}
const LVN=['','一級','二級','三級'];
// 累計編組：把 al+1 ~ i+1 級尚未派遣的車組合併（同車種同 ALS 需求相加）
function lvPk(i,al){
 const m=new Map();
 for(let j=al;j<=i;j++)for(const it of PKG[j].l){
  const k=it[0]+'|'+(it[2]?1:0),o=m.get(k);
  if(o)o[1]+=it[1];else m.set(k,it.slice())}
 const b=PKG[i];return{g:b.g,n:b.n,cls:b.cls,l:Array.from(m.values())}}
// 依序派遣到第 to 級：直接按二、三級會先補派較低級別，升級則只派下一級
function sendLv(inc,to){
 let sent=0;
 for(let L=(inc.al|0)+1;L<=to;L++){
  const n=sendPkg(inc,PKG[L-1]);
  if(!n)break;
  inc.al=L;sent+=n;
  radio(inc,'受理',LVN[L]+'火警編組出動，共 '+n+' 車。')}
 return sent}
function auto(inc){
 for(let pass=0;pass<14;pass++){
  const f=fill(inc,0);
  let idx=-1;
  for(let i=0;i<inc.need.length;i++)if(f[i]<inc.need[i].n){idx=i;break}
  if(idx<0)break;
  const g=inc.need[idx],u=nearest(inc,g.c,g.als);
  if(!u)break;
  send(inc,u,g.c.indexOf('91')>=0?(g.als?'ALS':'BLS'):null)}}
// 後送醫院：取車程最短者；面板顯示與實際後送共用
function hospFor(x,y){
 let b=null,bd=INF;
 for(const h of HOSP){const dd=baseF(h,0).D[K(x,y)];if(dd<bd){bd=dd;b=h}}
 return{h:b,d:bd}}
function toHosp(u){
 const r=hospFor(Math.round(u.x),Math.round(u.y));
 return{h:r.h,p:r.h?chase(baseF(r.h,0),u):null}}
function home(u){
 unpark(u);u.lead=false;
 const p=chase(baseF(SPOT[u.si],modeOf(u.code)),u);
 u.path=p||[];u.st='back';u.turn=0}
function release(inc,ok){
 onScene(inc).slice().forEach(u=>{
  if(u.st==='tx'||u.st==='give'||u.st==='clean'){u.inc=null;return}
  u.inc=null;unpark(u);
  if(ok&&u.code==='91'&&KIND[inc.k].carry&&!inc.pm.dead){
   u.path=toHosp(u).p||[];u.st='hosp';u.turn=0}
  else home(u)})}
function parkArms(inc){
 if(inc.pk)return inc.pk;
 const seen=new Set([K(inc.ax,inc.ay)]),Q=[[inc.ax,inc.ay,0]],spots=[],par=new Map();
 while(Q.length&&spots.length<30){
  const [x,y,dd]=Q.shift();
  if(dd>0){
   const hz=cls(x+1,y)||cls(x-1,y),vt=cls(x,y+1)||cls(x,y-1);
   const dir=(hz&&!vt)?[1,0]:(!hz&&vt)?[0,1]:(Math.abs(x-inc.x)>=Math.abs(y-inc.y)?[1,0]:[0,1]);
   spots.push({x,y,dir,d:dd,key:x+','+y})}
  if(dd>=7)continue;
  for(const dv of DIR){
   const nx=x+dv[0],ny=y+dv[1],k2=K(nx,ny),cc=cls(nx,ny);
   if(seen.has(k2)||!cc||cc===4||cc===7)continue;
   seen.add(k2);par.set(k2,K(x,y));Q.push([nx,ny,dd+1])}}
 if(!spots.length)spots.push({x:inc.ax,y:inc.ay,dir:[1,0],d:0,key:inc.ax+','+inc.ay});
 inc.pk={spots,par,arms:[{cells:spots.map(p=>[p.x,p.y]),dir:[1,0],key:'all'}]};
 return inc.pk}
function stagePark(u){
 const inc=S.inc.find(i=>i.id===u.inc);if(!inc)return false;
 const pk=parkArms(inc),used=new Set();
 for(const v of S.units)if(v!==u&&v.inc===inc.id&&v.arm)used.add(v.arm);
 const dx=Math.round(Math.cos(u.hd||0)),dy=Math.round(Math.sin(u.hd||0));
 const ux=Math.round(u.x),uy=Math.round(u.y);
 let best=null,bv=1e9;
 for(const p of pk.spots){
  if(used.has(p.key))continue;
  const back=(p.x-inc.ax)*dx+(p.y-inc.ay)*dy<0?0:.4;
  const v2=p.d+Math.abs(p.x-ux)*.15+Math.abs(p.y-uy)*.15+back;
  if(v2<bv){bv=v2;best=p}}
 if(!best)best=pk.spots[pk.spots.length-1];
 u.arm=best.key;u.slot=0;
 const perp=[best.dir[1],best.dir[0]];
 let side=Math.sign(perp[0]*(inc.x-best.x)+perp[1]*(inc.y-best.y));if(!side)side=-1;
 u.ox=perp[0]*side*.26;u.oy=perp[1]*side*.26;
 const face=Math.sign(best.dir[0]*(inc.x-best.x)+best.dir[1]*(inc.y-best.y))||1;
 u.hd=Math.atan2(best.dir[1]*face,best.dir[0]*face);
 // 由停車點沿 BFS 父節點回溯到進場口，再反轉成行進路徑
 const chain=[];let kk=K(best.x,best.y);const k0=K(inc.ax,inc.ay);let g2=0;
 while(kk!==k0&&kk!==undefined&&g2++<40){chain.push([(kk/N)|0,kk%N]);kk=pk.par.get(kk)}
 if(kk!==k0){const f2=field(best.x,best.y,modeOf(u.code)),p2=chase(f2,u);
  if(!p2||!p2.length)return false;u.path=p2;return true}
 chain.reverse();
 if(Math.round(u.x)!==inc.ax||Math.round(u.y)!==inc.ay){
  const f2=field(best.x,best.y,modeOf(u.code)),p2=chase(f2,u);
  if(!p2||!p2.length)return false;u.path=p2;return true}
 if(!chain.length)return false;
 u.path=chain;return true}
function unpark(u){u.slot=null;u.arm=null;u.parked=0;u.ox=0;u.oy=0}
function arrive(u){
 u.st='work';u.at=S.t;
 if(u.lead){const ic=S.inc.find(i=>i.id===u.inc);
  if(ic)radio(ic,u.cs,SPOT[u.si].n+'分隊帶隊官隨車到場，率隊進入內圈作業。')}
 const inc=S.inc.find(i=>i.id===u.inc);if(!inc)return;
 if(!inc.rev)reveal(inc,u);else radio(inc,u.cs,'到達現場，加入編組。');
 if(u.code==='91'){
  const needALS=inc.need.some(g=>g.als);
  if(u.mode==='ALS')radio(inc,u.cs,'三人編組，高級救護技術員在車，可執行高級處置。');
  else if(u.tp)radio(inc,u.cs,'二人編組，車上剛好有高級救護技術員。');
  else{const alsOn=onScene(inc).some(v=>v!==u&&v.code==='91'&&v.tp&&(v.st==='work'||v.st==='tx'));
   radio(inc,u.cs,'二人編組，無高級救護技術員'+(!needALS?'。':alsOn?'，高級處置由現場 ALS 組負責。':'，無法執行高級處置，請求 ALS 支援。'))}}}
