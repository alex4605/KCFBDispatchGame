// 戰術指揮：建物周邊（依大地圖決定四面道路、消防栓、送水口）、出入口、車輛停放與移車、水帶佈線與水壓
'use strict';
const TAC_SIDES=['n','e','s','w'];
const TAC_SDN={n:'北',e:'東',s:'南',w:'西'};
const TAC_SDV={n:[0,-1],e:[1,0],s:[0,1],w:[-1,0]};
const TAC_RDN=['','巷弄','一般道路','主幹道','國道','產業道路','橋','交流道'];
const TAC_HOSE=16; // 一條攻擊線最多可接的水帶條數（每條約 20 m）
const TAC_SPMAX=3; // 連結送水管同時可供的線數
const tacDirOf=(dx,dy)=>Math.abs(dx)>=Math.abs(dy)?(dx>=0?'e':'w'):(dy>=0?'s':'n');
const tacOpp=(a,b)=>(a==='n'&&b==='s')||(a==='s'&&b==='n')||(a==='e'&&b==='w')||(a==='w'&&b==='e');
// 繞建物走到另一側的秒數、從車輛到入口的水帶條數
const tacWalk=(a,b)=>a===b?0:tacOpp(a,b)?14:8;
const tacOutLen=(a,b)=>a===b?2:tacOpp(a,b)?8:5;
// 依大地圖上建物四周的格子判斷道路：巷弄大型車禁入，水域與鄰棟無法停車
function tacSite(inc,B){
 const sd={};
 for(const s of TAC_SIDES){const v=TAC_SDV[s],x=inc.x+v[0],y=inc.y+v[1];
  const ok=x>=0&&y>=0&&x<N&&y<N,k=ok?K(x,y):-1,r=ok?RD[k]:0,t=ok?TR[k]:0;
  const road=r>0&&t!==1?r:0;
  sd[s]={road,big:road>=2&&road!==5,nm:road?(TAC_RDN[road]||'道路'):t===1?'水域':'鄰棟'}}
 const arr=tacDirOf(inc.ax-inc.x,inc.ay-inc.y);
 if(!sd[arr].road)sd[arr]={road:2,big:true,nm:'道路'};
 B.sd=sd;B.arr=arr;
 for(const s of TAC_SIDES)if(!sd[s].road&&sd[s].nm==='鄰棟')B.exp[s]=0;
 const roads=TAC_SIDES.filter(s=>sd[s].road);
 // 出入口：北、南、西側開在樓梯間，東側開在走廊盡頭
 B.ents=roads.map(s=>({side:s,c:B.L.ent[s]}));
 // 消防栓：依實際位置方向，落在最近的有路一側
 B.hyd=null;
 if(inc.hy&&!inc.tender&&!inc.shuttle){
  let s=tacDirOf(inc.hy[0]-inc.x,inc.hy[1]-inc.y);
  if(!sd[s].road)s=roads.includes(arr)?arr:roads[0];
  B.hyd={side:s,d:Math.max(10,Math.round((inc.hd||1)*35/5)*5)}}
 // 五層以上設連結送水管，送水口在最寬的道路一側
 B.sp=B.F-B.bf>=5?{side:roads.slice().sort((a,b)=>sd[b].road-sd[a].road)[0],on:0,u:null}:null}
// 大型車（雲梯、幫浦等）能否停在某側
function tacCanSide(B,q,s){
 const d=B.sd[s];
 if(!d.road)return'該側為'+d.nm+'，無法停車';
 if(BIG[q.code]&&!d.big)return'該側為'+d.nm+'，大型車禁入';
 return''}
// 從某側進入建物到 (f,c) 最近的入口；hose=true 時以水帶條數計（含從車輛拉到入口）
function tacBestEnt(B,side,f,c,hose){
 let best=null,bd=INF;
 for(const e of B.ents){
  const d=(hose?tacOutLen(side,e.side):tacWalk(side,e.side)/2)+tacPath(B,B.bf,e.c,f,c).length;
  if(d<bd){bd=d;best=e}}
 return best}
// 人員離開建物時落在哪一側：同一節點有多個出口時，優先自己車輛那側
function tacExitSide(B,q,c){
 const es=B.ents.filter(e=>e.c===c);
 return(es.find(e=>e.side===q.tside)||es.find(e=>e.side===q.side)||es[0]||{side:B.arr}).side}
// 水壓：水帶越長、樓層越高，出水越弱；連結送水管由地面加壓，只計樓層內的水帶
function tacPf(len,f,sp){
 return sp?Math.max(.5,Math.min(.95,.95-.03*Math.max(0,len-3))):Math.max(.1,Math.min(1,1-.03*Math.max(0,len-5)-.065*f))}
// 一條攻擊線到 (f,c) 的佈線方案：{src:'pump'|'sp', u:供水車, len, pf, ent}；拉不到回傳 null
function tacLineTo(B,q,f,c){
 let best=null;
 const pumps=q.ty==='pump'?[q]:B.sq.filter(x=>x.ty==='pump'&&!x.tmv);
 for(const p of pumps){
  const e=tacBestEnt(B,p.tside,f,c,true);if(!e)continue;
  const len=tacOutLen(p.tside,e.side)+tacPath(B,B.bf,e.c,f,c).length+1;
  if(len>TAC_HOSE)continue;
  const pf=tacPf(len,Math.max(0,f-B.bf),0);
  if(!best||pf>best.pf)best={src:'pump',u:p.u,len,pf,ent:e}}
 if(B.sp&&B.sp.on&&f>B.bf){
  const len=tacPath(B,f,tacNearStair(B,f,c),f,c).length+2,pf=tacPf(len,f-B.bf,1);
  if(!best||pf>best.pf)best={src:'sp',u:B.sp.u,len,pf,ent:null}}
 return best}
// 消防栓那側要有幫浦車佔水，否則只能用車上水箱
function tacHydOK(inc,B){
 return!B.hyd||inc.tender||inc.shuttle||B.sq.some(q=>q.ty==='pump'&&q.tside===B.hyd.side&&!q.tmv)}
// 屋外動作：移車與走到指定一側；回傳 true 表示這一幀已用掉
function tacOutStep(inc,B,q,dt){
 if(q.tmv>0){q.tmv-=dt;
  if(q.tmv<=0){q.tmv=0;q.tside=q.tgt;q.side=q.tgt;if(q.task==='truck')q.task='idle';
   radio(inc,q.cs,'已移車至'+TAC_SDN[q.tside]+'側'+B.sd[q.tside].nm+'。')}
  return true}
 const want=q.f<0&&q.tf>=0&&q.ent?q.ent.side:q.ws;
 if(want&&q.side!==want){q.wkS=(q.wkS||0)+dt;q.mt=0;
  if(q.wkS>=tacWalk(q.side,want)){q.wkS=0;q.side=want}
  return true}
 q.wkS=0;return false}
// 移車指令：人員在車邊（屋外）才能開走
function tacTruck(inc,B,q,s,quiet){
 const why=tacIn(q)?'人員在室內，無法移車':tacCanSide(B,q,s);
 if(why){if(!quiet)msg=q.cs+'：'+why;return false}
 if(q.tside===s&&!q.tmv)return true;
 if(q.tmv&&q.tgt===s)return true;
 q.tgt=s;q.tmv=12;q.side=q.tside;
 if(!quiet)radio(inc,q.cs,'收到，移車至'+TAC_SDN[s]+'側'+B.sd[s].nm+'，約 12 秒。');
 return true}
// 正壓排煙的作用範圍：從送風入口經門與樓梯通往各排煙開口（破窗、屋頂）的路徑；沒有開口就沒有效果
function tacPpvSet(B){
 const set=new Set();
 if(!B.ppv||!B.ppvSide)return set;
 const e=B.ents.find(x=>x.side===B.ppvSide);if(!e)return set;
 const outs=B.cells.filter(x=>x.v).map(x=>[x.f,x.c]);
 if(B.roof)for(const n of B.L.N)if(n.ty==='stair')outs.push([B.F-1,n.c]);
 for(const o of outs){set.add(o[0]*B.W+o[1]);
  for(const p of tacPath(B,B.bf,e.c,o[0],o[1]))set.add(p[0]*B.W+p[1]);set.add(B.bf*B.W+e.c)}
 return set}
const TAC_NBH=4; // 鄰棟高度（層）：只有這個高度以下的房間會烤到鄰棟
// 鄰棟受熱：貼著鄰棟那面牆的房間燒得越旺越快累積（開窗加倍）；有防護射水會降溫；滿了就延燒過去
function tacExpo(inc,B,dt){
 for(const s of TAC_SIDES){
  if(B.sd[s].road||B.sd[s].nm!=='鄰棟')continue;
  let add=0;
  for(const x of B.cells){if(x.ty!=='room'||x.h<.5||x.f<B.bf||x.f-B.bf>=TAC_NBH)continue;const n=B.L.N[x.c];
   if(n.edge.includes(s))add+=(x.h-.5)*(x.v?2:1)}
  const cov=B.sq.filter(q=>q.task==='cover'&&q.cside===s&&q.line&&!q.tmv).reduce((a,q)=>a+q.pf,0);
  B.exp[s]=Math.max(0,Math.min(1,(B.exp[s]||0)+dt*(.004*add-.03*cov)));
  if(B.exp[s]>.5&&!B.expW[s]){B.expW[s]=1;radio(inc,'安全官',TAC_SDN[s]+'側鄰棟外牆受熱嚴重，請佈線防護射水！')}
  if(B.exp[s]<.3)B.expW[s]=0;
  // 受熱已降、該面牆也沒有房間在燒：防護組收線待命
  if(B.exp[s]<.05&&!add)for(const q of B.sq)if(q.task==='cover'&&q.cside===s){q.task='idle';radio(inc,q.cs,TAC_SDN[s]+'側鄰棟已降溫，停止防護射水。')}
  if(B.exp[s]>=1&&!B.expL[s]){B.expL[s]=1;S.rep-=6;inc.pay=Math.round(inc.pay*.85);
   radio(inc,'受理','火勢延燒至'+TAC_SDN[s]+'側鄰棟（評鑑 -6），請加強防護並注意鄰棟住戶疏散。');
   if(S.rep<=0){S.rep=0;S.over=true}}}}
// 防護射水：幫浦車停在鄰棟相鄰的道路側（不能是對面），向鄰棟外牆射水
function tacCoverSide(B,q,s){
 const ok=TAC_SIDES.filter(x=>x!==s&&!tacOpp(x,s)&&!tacCanSide(B,q,x));
 return ok.includes(q.tside)?q.tside:ok[0]||null}
// 最適合佈線到 (f,c) 的停車側：水帶最短；回傳 {side,len}
function tacBestSide(B,q,f,c){
 let best=null;
 for(const s of TAC_SIDES){if(tacCanSide(B,q,s))continue;
  const e=tacBestEnt(B,s,f,c,true);if(!e)continue;
  const len=tacOutLen(s,e.side)+tacPath(B,B.bf,e.c,f,c).length+1;
  if(!best||len<best.len)best={side:s,len}}
 return best}
// 同層最近的樓梯間（連結送水管的出水口在各樓梯間）
function tacNearStair(B,f,c){let best=0,bd=INF;
 for(const n of B.L.N)if(n.ty==='stair'){const d=tacGd(B,c,n.c);if(d<bd){bd=d;best=n.c}}
 return best}
