// 案件進線 spawn()
'use strict';
function spawn(){
 const cand=[];
 for(let x=1;x<N-1;x++)for(let y=1;y<N-1;y++){
  const k=K(x,y);
  if(RD[k]||TR[k]===1)continue;
  let near=false;for(let i=0;i<4;i++)if(cls(x+DIR[i][0],y+DIR[i][1])){near=true;break}
  if(!near)continue;
  if(inFacility(x,y))continue;
  if(S.inc.some(i=>Math.abs(i.x-x)<3&&Math.abs(i.y-y)<3))continue;
  cand.push([x,y])}
 if(!cand.length)return;
 const c=pick(cand),z=zoneOf(c[0],c[1]),a=nbRoad(c[0],c[1]);
 if(!a)return;
 const probe={ax:a[0],ay:a[1]};
 const fs=getF(probe,0);
 let ok=false;
 for(let i=0;i<S.nst;i++)if(fs.D[K(SPOT[i].x[0],SPOT[i].x[1])]!==INF){ok=true;break}
 if(!ok)return;
 const fb=getF(probe,1);
 let bigOK=false;
 for(let i=0;i<S.nst;i++)if(fb.D[K(SPOT[i].x[0],SPOT[i].x[1])]!==INF){bigOK=true;break}
 const lv=S.day<3?0:S.day<5?1:S.day<8?2:3;
 const pool=((bigOK?POOL:POOLB)[z]||POOL.city)[lv]||['ems'];
 if(!pool.length)return;
 const pickKind=()=>{for(let t2=0;t2<6;t2++){const kk=pick(pool);const r2=KIND[kk].rare;
  if(!r2||Math.random()<Math.min(1,r2*4.2))return kk}return 'ems'};
 const k=pickKind(),d=KIND[k];
 const o=d.hoax?{need:d.base.map(g=>({c:g.c.slice(),n:g.n,l:g.l,als:g.als,k:g.k})),pm:{mal:Math.random()<.35},dur:d.dur,pay:d.pay,pen:d.pen}:
  d.fire?mkFire(d):d.med?mkMed():d.trap?mkTrap():
  {need:d.base.map(g=>({c:g.c.slice(),n:g.n,l:g.l,als:g.als,k:g.k})),pm:{},dur:d.dur,pay:d.pay,pen:d.pen};
 const need=o.need;
 const inc={id:uid++,k,x:c[0],y:c[1],ax:a[0],ay:a[1],z,bigOK,F:probe.F,
  left:Math.round((o.t||d.t)*TX*(1+(o.need.reduce((a,g)=>a+g.n,0))/26)),
  max:0,work:0,dur:Math.round(o.dur*DURX*(1+(o.need.reduce((a,g)=>a+g.n,0))/12)),pay:o.pay,pen:o.pen,pm:o.pm,need,
  hy:null,hd:999,hp:null,relay:0,tender:0,addr:'',rev:0,note:'',t0:S.t,fl:{},
  phs:phasesFor(k,d),ph:-1,req:null,reqT:0,pol:d.police?2:0,polT:0,pow:0,powT:0,dai:'',defl:0,
  clr:d.tac?(d.clrT?d.clrT[0]+Math.random()*(d.clrT[1]-d.clrT[0]):40+Math.random()*35):0,
  lines:0,dry:0,hook:0,hooked:0,burst:0,burstT:45};
if(d.road){inc.x=a[0];inc.y=a[1]}
 inc.addr=z==='hiway'?'國道'+(1+Math.floor(Math.random()*9))+'號 '+(10+Math.floor(Math.random()*300))+'K':
  z==='forest'?'山區產業道路 '+(1+Math.floor(Math.random()*30))+'K':
  pick(RDN)+(Math.random()<.5?'路':'街')+(1+Math.floor(Math.random()*500))+'號';
 if(d.w){
  const hy=nearHyd(inc);inc.hy=hy.h;inc.hd=hy.d;inc.hp=hy.p;
  inc.hin=hy.cl===3?600:hy.cl===2?480:hy.cl?340:0;
  if(hy.h&&hy.d<=HOSE*5){
   inc.relay=Math.min(4,Math.max(0,Math.ceil(hy.d/HOSE)-1));
   const g=need.find(g=>g.c.indexOf('11')>=0);if(g)g.n+=inc.relay}
  else{inc.tender=1;
   if(!need.some(g=>g.c.indexOf('61')>=0))need.push(G(['61'],1,'水庫車'))}}
 const flat=[];
 for(const g of inc.need){
  if(!g.k){flat.push(g);continue}
  const ov=(KITEM[k]&&KITEM[k][g.k])||g.items;
  const rows=mkItems(g.k,g.n,g.als,ov);
  for(const r of rows){
   const same=flat.find(x=>x.item===r.item);
   if(same)same.n=Math.max(same.n,r.n);else flat.push(r)}}
 if(flat.length)inc.need=flat;
 inc.calls=(function(){
  if(d.hoax||d.quiet)return 1;
  let n=1;
  if(d.fire)n=1+Math.round((o.pm.area||60)/80)+(o.pm.lvl||1);
  else if(k==='mci'||k==='aircraft'||k==='collapse'||k==='train'||k==='nursing')n=4+Math.floor(Math.random()*6);
  else if(d.police)n=1;
  else if(d.cls==='救護')n=1+(Math.random()<.3?1:0);
  else n=1+Math.floor(Math.random()*3);
  if(d.z==='hiway')n+=2;
  if(o.pm.trap)n+=1;
  return Math.max(1,Math.min(24,n))})();
 if(d.dlgm){
  const sc2=pick(d.dlgm);inc.pm.sc=sc2;
  if(sc2[2]>=0){inc.pm.cc=sc2[2];inc.pm.als=MED[sc2[2]].lv>=1;inc.pm.ohca=MED[sc2[2]].lv===2;
   if(MED[sc2[2]].dead){inc.pm.dead=1;inc.pm.als=false;inc.pm.ohca=false;inc.phs=PHX.doa.slice()}}
  if(sc2[3]==='fake'){inc.pm.fake=1;inc.dur=5;inc.pay=Math.round(inc.pay*.3);inc.need=inc.need.slice(0,1)}}
 else if(MCMAP[k]){
  const ci2=pick(MCMAP[k]),M2=MED[ci2];
  inc.pm.cc=ci2;inc.pm.als=M2.lv>=1;inc.pm.ohca=M2.lv===2}
 if(d.defl)inc.pm.special=Math.random()<.4;
 if(inc.pm.special&&(k==='bee'||k==='animal')){
  inc.nm=k==='bee'?'蜂螫傷救護':'動物咬傷救護';
  inc.need=[mkGroup('ems',1,0,['外傷急救包','生命徵象監視器（12 導程）','氧氣與甦醒球']),
   mkGroup('rescue',1,0,k==='bee'?['防蜂衣','捕蜂網具與伸縮桿']:['捕蛇夾與捕犬網','運輸籠'])];
  inc.phs=k==='bee'?PH.med.slice():['接觸傷患','評估過敏反應','傷處處置','動物移置','轉交救護'];
  if(k==='bee'){inc.pm.cc=35;inc.pm.als=true}
  inc.dur=Math.round(inc.dur*1.3);inc.pay=Math.round(inc.pay*2.2);inc.pen+=6}
 inc.max=inc.left;
 inc.log=mkLog(k,d,inc);
 // AI 模式：通話改由 AI 扮演報案人，腳本對話留作備援；系統自動報案（定位）維持腳本
 if(aiActive()&&!d.gps)aiBegin(inc);
 else if(inc.calls>=3){
  const extra=[['另一位民眾','我也要報案，'+inc.addr+'那邊'+(d.fire?(o.pm.area>=120?'在冒煙，火很大':'在冒煙，看得到火'):'出事了，很多人圍觀')],
   ['第三位民眾',(d.fire?(d.wild?'我看到山上火光很大，煙一直往這邊飄':'我看到火從屋頂竄出來，隔壁鄰居都跑出來了'):
    (d.med||d.trap||d.carry||inc.pm.cc!==undefined||inc.pm.trap>0)?'現場有人躺著，已經有人在幫忙了':'現場還沒有人來處理，你們派人了嗎')],
   ['路過民眾','我在對面，剛剛聽到很大的聲音，你們快一點']];
  const m=Math.min(extra.length,inc.calls>=6?3:inc.calls>=4?2:1);
  for(let i2=0;i2<m;i2++)
   inc.log.push({w:'民',s:'（'+extra[i2][0]+'）'+extra[i2][1],t:6+i2*5.5})}
 S.inc.push(inc)}
