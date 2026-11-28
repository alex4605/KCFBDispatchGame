// 戰術指揮：門控冷卻、VEIS，以及下令時反亮可執行的目標
'use strict';
// ===== 門控冷卻 =====
// 幫浦組帶水線站在以門相連的隔壁空間，反覆開門短促射水、關門，冷卻隔壁房間的熱煙，不入室
function tacDcoolPos(B,q,f,c){
 const lim=tacHotLim(q)*.8;let best=null,bs=1e9;
 for(const o of tacNb(B,f,c)){if(tacOpn(B,c,o))continue;const y=tacCel(B,f,o);
  if(y.h>lim||tacDGone(B,tacDK(B,f,c,o))||(y.hz||0)>TAC_PPE[q.ppe||'F'].p)continue;
  const sc=y.h*3+y.s+(B.L.N[o].ty==='room'?.3:0)+(q.f===f&&q.c===o?-.5:0);if(sc<bs){bs=sc;best=o}}
 return best}
function tacDcoolCan(B,q,f,c){
 if(q.ty!=='pump')return'門控冷卻需要幫浦組（帶水線）';
 if(q.vol)return'義消徒步到場、沒有車輛水線';
 if(f===undefined||f<0)return'請點選要冷卻的房間';
 if(B.out)return'室外場景沒有門可以控制';
 const x=tacCel(B,f,c);if(x.h<.12&&x.s<.5)return tacNm(B,f,c)+'不熱，不需要冷卻';
 if(tacDcoolPos(B,q,f,c)==null)return'沒有以門相連、可以站的相鄰空間（隔壁也太熱、門已燒毀，或是沒有門的開口）';
 return''}
function tacDcoolOrder(inc,B,q,f,c,quiet){
 let why=tacDcoolCan(B,q,f,c);const o=why?null:tacDcoolPos(B,q,f,c);
 if(!why)why=tacRefuse(B,q,'attack',f,o);
 if(why){if(!quiet)tacNo(inc,q,why);return false}
 const ln=tacLineTo(B,q,f,o);
 if(!ln){if(!quiet)msg=q.cs+'：水帶長度不足（上限 '+TAC_HOSE+' 條）';return false}
 if(B.sp&&B.sp.u===q.u){B.sp.on=0;B.sp.u=null;radio(inc,q.cs,'離開送水口，連結送水管停止加壓！')}
 q.prev=null;q.wk=0;q.dkT=0;q.dcS=0;q.dcW=0;q.dpK=null;q.dpO=0;q.ws=null;
 q.task='dcool';q.tf=f;q.tc=o;q.dcT={f,c};q.lt=S.t;
 q.ent=ln.ent&&ln.src==='pump'&&ln.u===q.u?ln.ent:tacBestEnt(B,q.side,f,o,false);
 if(!quiet)radio(inc,q.cs,'收到，門控冷卻：由'+tacNm(B,f,o)+'經門對'+tacNm(B,f,c)+'短促射水冷卻，不入室。');
 return true}
function tacDcoolStep(inc,B,q,dt){
 const T2=q.dcT;if(!T2||q.f!==T2.f||!B.L.N[q.c].nb.includes(T2.c)){q.task='idle';q.dpK=null;return}
 const y=tacCel(B,T2.f,T2.c),key=tacDK(B,q.f,q.c,T2.c),nm=tacNm(B,T2.f,T2.c);
 if(tacDGone(B,key)){q.dpK=null;q.task='hold';radio(inc,q.cs,'通往'+nm+'的門已燒毀，無法門控，原地守線。');return}
 if(!(q.line&&q.pf>0)){q.dpO=0;return}
 if(y.h<.25&&y.s<.7){q.dpK=null;q.dpO=0;B.cd.add(key);q.task='hold';radio(inc,q.cs,nm+'已冷卻壓制（約 '+tacParam(B,y).temp+' °C），門關上守住；火點仍需入室撲滅。');return}
 q.dkT+=dt;const ph=q.dkT%3;q.dpK=key;q.dpO=ph<1;q.dpN=Math.floor(q.dkT/3);q.dpI={f:q.f,a:q.c,b:T2.c};
 if(!q.dcS){q.dcS=1;radio(inc,q.cs,'門控冷卻開始：開門、短促射水、關門，冷卻'+nm+'（約 '+tacParam(B,y).temp+' °C）。');tacSay(q,'dcool')}
 if(ph<1){const pw=dt*q.pf*Math.min(1.2,q.n/3);
  y.h=Math.max(y.fu>.05?.18:0,y.h-pw*.09); // 只打得到門口附近：不會撲滅火點
  if(y.h>.3)y.lay=Math.min(1,tacLayV(y)+pw*.1);else{y.lay=Math.max(0,tacLayV(y)-pw*.08);y.s=Math.min(1,y.s+pw*.04)}
  y.o2=Math.min(20.9,y.o2+pw*.4);
  if(y.h>.6)q.hp=Math.max(.35,q.hp-pw*.01*y.h)} // 開門的瞬間會被熱氣撲到
 else if(!B.lk.has(key))B.cd.add(key);
 if(Math.random()<dt*.08)tacSay(q,'dcool');
 if(q.dkT>60&&y.h>.5&&!q.dcW){q.dcW=1;radio(inc,q.cs,nm+'門控冷卻壓不住，火勢仍大，建議入室攻擊。')}}
// ===== VEIS（破窗、進入、隔離、搜索）=====
// 由窗口進入沒起火的房間：先破窗（V），進入（E）後立刻關上房門隔離（I），快速徹底搜索（S），由窗口救出受困者。
// 1F 各組都能做（架梯或直接爬窗）；2F～9F 要雲梯組架梯到窗口
function tacVeisSide(B,q,c){const w=B.L.N[c].wins||[];if(!w.length)return null;
 if(q.ty==='ladder')return tacLadSide(B,q,w);
 return w.slice().sort((a,b)=>(B.sd[b].road?1:0)-(B.sd[a].road?1:0)||(a===q.side?-1:0))[0]}
function tacVeisCan(B,q,f,c){
 if(q.ty==='robot')return'機器人無法執行';
 if(q.sdb)return'自衛消防編組不執行入室搜救';
 if(q.sk==='vol')return'拒絕：義消（一般）不執行入室搜救（可改派義消+或正職）';
 if(f===undefined||f<0)return'請點選有對外窗的房間';
 if(B.out)return'室外場景不適用';
 if(tacIn(q))return'人員要在屋外（由窗口進入）';
 const n=B.L.N[c];if(n.ty!=='room')return'請點選房間';
 if(f<B.bf)return'地下室沒有對外窗';
 if(!n.wins||!n.wins.length)return'這個房間沒有對外窗';
 const x=tacCel(B,f,c);if(x.h>.1)return'房間已經起火，不適合 VEIS（改派入室攻擊或雲梯救援）';
 if(x.sl>=2)return'這個房間已經次級搜索過';
 const fl=f-B.bf;
 if(fl>0&&q.ty!=='ladder')return'2F 以上要由雲梯組架梯執行 VEIS';
 if(fl>8)return'VEIS 只做到 9F';
 if(q.ty==='ladder'&&fl>=(TAC_LADR[q.code]||7))return'超出雲梯可達高度';
 if(q.ty!=='ladder'&&q.fat>=.85)return'拒絕：隊員體力透支，需先休息';
 if(tacVeisSide(B,q,c)==null)return'沒有大型車可停靠的道路，雲梯無法架設';
 return''}
function tacVeisOrder(inc,B,q,f,c,quiet){
 const why=tacVeisCan(B,q,f,c);if(why){if(!quiet)tacNo(inc,q,why);return false}
 const sd=tacVeisSide(B,q,c);
 if(B.sp&&B.sp.u===q.u){B.sp.on=0;B.sp.u=null;radio(inc,q.cs,'離開送水口，連結送水管停止加壓！')}
 q.prev=null;q.wk=0;q.ext=0;q.vp=0;q.task='veis';q.tf=-1;q.tc=0;q.lf=f;q.lc=c;q.lside=sd;q.ws=null;q.ent=null;
 if(q.ty==='ladder'&&sd!==q.tside)tacTruck(inc,B,q,sd,1);
 if(!quiet)radio(inc,q.cs,'收到，VEIS：'+(q.ty==='ladder'?'雲梯架到':'由')+TAC_SDN[sd]+'側窗口進入'+tacNm(B,f,c)+'，破窗、隔離、搜索。');
 return true}
function tacVeisStep(inc,B,q,dt){
 if(q.tmv)return;
 const x=tacCel(B,q.lf,q.lc),lad=q.ty==='ladder',nm=tacNm(B,q.lf,q.lc);
 if(q.vp>=2&&x.h>tacHotLim(q)*.8){q.task='idle';q.ext=0;radio(inc,q.cs,nm+'溫度升高，VEIS 中止，由窗口撤出。');return}
 if(q.ext<1){q.ext=Math.min(1,q.ext+dt/(lad?7:4));return}
 q.wk+=dt;
 if(q.vp===0){if(q.wk<2)return;q.wk=0;q.vp=1;tacOpenWin(inc,B,x,q.cs);radio(inc,q.cs,'破窗（V）：'+nm+'開口完成，觀察室內煙況。');return}
 if(q.vp===1){if(q.wk<2)return;q.wk=0;q.vp=2;
  const nd=B.L.N[q.lc];let lk=0;
  for(const o of nd.nb){if(tacOpn(B,q.lc,o))continue;const key=tacDK(B,q.lf,q.lc,o);if(tacDGone(B,key)){lk=1;continue}B.cd.add(key);if(tacDLeak(B.dm&&B.dm.get(key)))lk=1}
  radio(inc,q.cs,'由窗口進入（E），先關上房門隔離（I）'+(lk?'：門有通風口、玻璃窗或已損壞，煙熱還是會進來，加快搜索':'')+'。');tacSay(q,'veis');return}
 if(q.vp===2){const tm=7*((TAC_RK[tacK(B,q.lf,q.lc)]||{sr:1}).sr)*tacLowPost(x)*tacSk(q).t;if(q.wk<tm)return;q.wk=0;q.vp=3;
  if(x.hid){x.vic+=x.hid;x.hid=0}
  tacPrim(B,x,.1);x.sl=2;
  radio(inc,q.cs,'室內搜索（S）完成：'+(x.vic?'發現受困者 '+x.vic+' 名，由窗口救出。':'未發現受困者，由窗口撤出。'));return}
 if(q.vp===3){
  if(x.vic>0){const bed=(x.bedv||0)>0;if(q.wk<(lad?8:6)*(bed?2:1))return;q.wk=0;x.vic--;if(bed)x.bedv--;tacPatient(inc,B,x.vh,q.cs+' 以 VEIS 由窗口',x.vcz);return}
  q.task='idle';q.ext=0;radio(inc,q.cs,'VEIS 完成，'+nm+'已隔離、搜索完畢。');tacEvt(inc,B,'milestone','VEIS：'+nm)}}
function tacVeisDraw(g,G,B,vf){
 for(const q of B.sq){if(q.task!=='veis'||q.lf!==vf||q.ty==='ladder'||!q.lside||q.ext<=0)continue;
  const w=tacWinPt(G,q.lc,q.lside),dv=TAC_SDV[q.lside],x=w[0]+dv[0]*12,y=w[1]+dv[1]*12;
  g.strokeStyle='#d8d4c8';g.lineWidth=2;g.beginPath();g.moveTo(x+dv[0]*16,y+dv[1]*16);g.lineTo(w[0],w[1]);g.stroke();
  tacMan(g,q.vp>=2?w[0]-dv[0]*10:x,q.vp>=2?w[1]-dv[1]*10:y,5,'#f3c43b',Math.atan2(-dv[1],-dv[0]),{scba:1});
  g.fillStyle='#f3c43b';g.font='600 9px '+FONT;g.textAlign='center';g.textBaseline='bottom';g.fillText('VEIS',x+dv[0]*14,y+dv[1]*14-6)}}
const tacVeisDoing=q=>q.ext<1?(q.ty==='ladder'?'架設雲梯到窗口中':'架梯到窗口中'):['破窗中（V）','入室、關門隔離中（E・I）','室內搜索中（S）','由窗口救出受困者中'][q.vp]||'';
// ===== 下令時反亮可執行的目標 =====
// 依指令的目標規則篩出本層可以點的房間或區塊（以第一個選取的小組判斷），每 0.5 秒重算
function tacTgtOK(B,q,k,f,c){
 const x=tacCel(B,f,c),n=B.L.N[c],room=n.ty==='room',fl=f-B.bf,wins=n.wins&&n.wins.length&&f>=B.bf,road=wins&&n.wins.some(w=>B.sd[w]&&B.sd[w].road);
 const fireNb=()=>tacNb(B,f,c).some(o=>tacCel(B,f,o).h>.2);
 switch(k){
  case'attack':return x.h>.05;
  case'confine':return x.h<.6&&(x.h>.05||fireNb());
  case'trans':return room&&road&&fl>=0&&fl<=1&&x.h>.05;
  case'sky':return room&&road&&fl>=0&&fl<=2&&x.h>.05;
  case'overhaul':return!!x.emb;
  case'search':return(room&&x.sl<1)||x.vic>0;
  case'search2':return room&&x.sl<2;
  case'vent':return room&&wins&&!x.v;
  case'hydro':case'npv':return room&&wins&&x.s>.2;
  case'vvent':return f===B.F-1&&!x.vv;
  case'ladder':case'master':return room&&road&&(q.ty!=='ladder'||fl<(TAC_LADR[q.code]||7));
  case'shore':return!!x.rub;
  case'plug':case'ident':return!!(B.leak&&B.leak.f===f&&B.leak.c===c)||(x.cz||0)>.05||(x.hz||0)>0;
  case'beat':return x.h>.05&&/grass|reed|shrub|forest/.test(tacK(B,f,c)||'');
  case'brk':return x.h<.02&&/grass|reed|shrub|forest/.test(tacK(B,f,c)||'');
  case'force':return n.nb.some(o=>B.lk.has(tacDK(B,f,c,o)));
  case'dctrl':return n.nb.some(o=>!tacOpn(B,c,o)&&(B.lk.has(tacDK(B,f,c,o))||tacCel(B,f,o).h>.05||tacCel(B,f,o).s>.4));
  case'dcool':return!tacDcoolCan(B,q,f,c);
  case'veis':return!tacVeisCan(B,q,f,c);
  case'snatch':return tacPinFree(x)>0&&(x.hz||0)>0&&!!(x.rep||x.srch>=1||B.out);
  case'stab':return x.pin>0&&!x.rub&&!x.stab;
  case'extr':return x.pin>0&&(!x.rub||!!x.shore);
  case'dike':case'neut':return(x.cz||0)>.03||!!(B.leak&&B.leak.f===f&&B.leak.c===c);
  case'gas':return true;
  default:return false}}
function tacTgtSet(B,qs,k,vf){
 const C=TAC.tgC;if(C&&C.k===k&&C.vf===vf&&C.q===qs[0].u&&S.t-C.t<.5&&C.B===B)return C;
 const q=qs[0],cells=new Set(),sides=[];
 if(vf<B.F)for(const n of B.L.N){let ok=false;try{ok=tacTgtOK(B,q,k,vf,n.c)&&(k==='dcool'||k==='veis'||!tacCan(B,q,k,vf,n.c))}catch(e){ok=false}if(ok)cells.add(n.c)}
 if(k==='cover'||k==='guard')for(const s of ['n','s','w','e'])if(B.exp&&B.exp[s]!==undefined)sides.push(s);
 if(k==='force'||k==='dctrl')for(const e of B.ents||[])if(e.lock||!e.open)sides.push(e.side);
 return TAC.tgC={k,vf,q:q.u,t:S.t,B,cells,sides}}
function tacTgtDraw(g,G,B,vf,T,qs){
 const k=TAC.ord;if(!k||!qs.length||k==='move'||k==='truck')return;
 const C=tacTgtSet(B,qs,k,vf),a=.55+.35*Math.sin(T*4);
 g.save();
 for(const c of C.cells){const r=G.r(c);g.fillStyle='rgba(93,202,165,'+(.2+.08*Math.sin(T*4)).toFixed(3)+')';g.fillRect(r[0],r[1],r[2],r[3]);
  g.strokeStyle='rgba(120,235,190,'+a.toFixed(2)+')';g.lineWidth=3;g.setLineDash([6,4]);g.strokeRect(r[0]+2,r[1]+2,r[2]-4,r[3]-4)}
 g.setLineDash([]);
 if(vf===B.bf||k==='cover'||k==='guard'){const P={n:[G.bx,G.by,G.bx+G.bw,G.by],s:[G.bx,G.by+G.bh,G.bx+G.bw,G.by+G.bh],w:[G.bx,G.by,G.bx,G.by+G.bh],e:[G.bx+G.bw,G.by,G.bx+G.bw,G.by+G.bh]};
  for(const s of C.sides){if(k==='force'||k==='dctrl'){const d=tacDoor(G,s);g.strokeStyle='rgba(93,202,165,'+a.toFixed(2)+')';g.lineWidth=3;g.beginPath();g.arc(d[0],d[1],11,0,TAU);g.stroke();continue}
   const p=P[s],dv=TAC_SDV[s];g.strokeStyle='rgba(93,202,165,'+a.toFixed(2)+')';g.lineWidth=5;g.beginPath();g.moveTo(p[0]+dv[0]*10,p[1]+dv[1]*10);g.lineTo(p[2]+dv[0]*10,p[3]+dv[1]*10);g.stroke()}}
 g.restore();
 if(!C.cells.size&&!C.sides.length){g.fillStyle='rgba(233,161,59,.9)';g.font='600 12px '+FONT;g.textAlign='center';g.textBaseline='top';g.fillText('本層沒有可執行「'+(tacTN(B,k)||k)+'」的目標',G.bx+G.bw/2,G.by+6)}}
// ===== 排煙時的煙流箭頭 =====
// 有排煙行動（破窗、負壓、正壓、垂直排煙、屋頂出入口）時：開口往外的灰色箭頭、門與開口間由濃往淡的煙流方向
function tacSmokeArrows(g,G,B,vf,T){
 if(B.out||vf>=B.F)return;
 const W=B.W,np=B.npvS||new Set(),pp=B.ppvS||new Set();
 const act=B.ppv||np.size||B.roof||B.cells.some(x=>x.v||x.vv);if(!act)return;
 const arrow=(x0,y0,x1,y1,w,col)=>{const a=Math.atan2(y1-y0,x1-x0),L=Math.hypot(x1-x0,y1-y0);if(L<4)return;
  g.strokeStyle=col;g.lineWidth=w;g.setLineDash([5,4]);g.lineDashOffset=-T*18;g.beginPath();g.moveTo(x0,y0);g.lineTo(x1,y1);g.stroke();g.setLineDash([]);
  g.fillStyle=col;g.beginPath();g.moveTo(x1,y1);g.lineTo(x1-Math.cos(a-.5)*(5+w),y1-Math.sin(a-.5)*(5+w));g.lineTo(x1-Math.cos(a+.5)*(5+w),y1-Math.sin(a+.5)*(5+w));g.closePath();g.fill()};
 const col=s=>'rgba(190,190,198,'+Math.min(.9,.35+s*.6).toFixed(2)+')';
 g.save();
 for(const n of B.L.N){const x=tacCel(B,vf,n.c),key=vf*W+n.c,c=G.ctr(n.c);
  // 破窗／負壓排風：往窗外
  if((x.v||np.has(key))&&x.s>.06&&n.wins&&n.wins.length&&vf>=B.bf){const sd=n.wins.find(w=>B.sd[w]&&B.sd[w].road)||n.wins[0],w=tacWinPt(G,n.c,sd),dv=TAC_SDV[sd];
   arrow(c[0]+(w[0]-c[0])*.35,c[1]+(w[1]-c[1])*.35,w[0]+dv[0]*18,w[1]+dv[1]*18,np.has(key)?3.5:2.5,col(x.s))}
  // 垂直排煙、頂樓樓梯間屋頂出入口：往上
  if((x.vv||(n.ty==='stair'&&vf===B.F-1&&B.roof))&&x.s>.04){g.strokeStyle=col(x.s);g.lineWidth=2;g.beginPath();g.arc(c[0],c[1],11,0,TAU);g.stroke();
   arrow(c[0],c[1]+7,c[0],c[1]-8,2.5,col(x.s))}
  // 門與開口之間：由濃往淡（正壓送風路徑上順著送風方向）
  for(const o of tacNb(B,vf,n.c)){if(o<n.c||tacShut(B,vf,n.c,o))continue;const y=tacCel(B,vf,o),d=x.s-y.s;
   const ppd=pp.has(key)&&pp.has(vf*W+o);if(Math.abs(d)<.06&&!ppd)continue;
   const [a,b]=d>=0?[n.c,o]:[o,n.c],m=tacDoorMid(G,a,b),ca=G.ctr(a),cb=G.ctr(b),la=Math.hypot(cb[0]-ca[0],cb[1]-ca[1])||1,ux=(cb[0]-ca[0])/la,uy=(cb[1]-ca[1])/la;
   arrow(m[0]-ux*12,m[1]-uy*12,m[0]+ux*12,m[1]+uy*12,1.5+Math.min(2,Math.abs(d)*4),col(Math.max(x.s,y.s)))}}
 g.restore()}
