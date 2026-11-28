// 戰術指揮：門的材質與狀態、門控進入（脈衝射水）
// 材質：塑膠門／木門／具通風口門／玻璃門／玻璃窗門／鐵門；狀態：完整（關）／開啟／破壞／燒毀／熔毀／變形
// 受熱：塑膠門很快熔毀、玻璃門受熱破裂、木門約一分鐘燒穿；鐵門不會燒穿（煙熱過不去），但高溫會變形卡死、打不開，要破壞
// 有通風口（百葉）、玻璃窗門或已被破壞的門：關著也是無效的防火區隔，煙熱會從開口、破洞穿過
'use strict';
const TAC_DMN={plas:'塑膠門',wood:'木門',louv:'具通風口門',glass:'玻璃門',gwin:'玻璃窗門',steel:'鐵門'};
const TAC_DSN={ok:'完整',open:'開啟',brk:'破壞',burn:'燒毀',melt:'熔毀',warp:'變形'};
// 依兩側空間的用途決定門的材質
function tacDoorMat(B,f,a,b,key){
 const L=B.L,na=L.N[a],nb=L.N[b],r=Math.random();
 if(B.fd.has(key)||na.ty==='stair'||nb.ty==='stair')return'steel';             // 樓梯間防火門
 if((na.uent&&nb.ty!=='room')||(nb.uent&&na.ty!=='room'))return r<.85?'steel':'wood'; // 住宅戶門多為鋼製門
 const rm=na.ty==='room'?na:nb.ty==='room'?nb:null;if(!rm)return'wood';
 const k=tacK(B,f,rm.c);
 if(k==='bath')return r<.3?'louv':'plas';
 if(k==='store'||k==='mech')return r<.35?'louv':/fact|warehouse|chem|tin|farm/.test(B.k||'')||k==='mech'?'steel':'wood';
 if(/^(shop|mart|shelf|food|lobby|stall)$/.test(k))return r<.8?'glass':'gwin';
 if(/^(office|yoff|clinic|nurse|act)$/.test(k))return r<.4?'gwin':r<.55?'glass':'wood';
 if(/^(ward|care)$/.test(k))return r<.45?'gwin':'wood';
 if(/^(ware|dock|machine|rack|park|drum|plastic|paper|metal|ewaste|cylz|shack|cont)$/.test(k))return'steel';
 if(k==='kitchen')return r<.15?'gwin':'wood';
 return r<.08?'plas':'wood'}
function tacDoorInit(inc,B){
 B.dm=new Map();if(B.out)return;
 const L=B.L;
 for(let f=0;f<B.F;f++)for(const n of L.N)for(const o of n.nb){if(o<n.c||tacOpn(B,n.c,o))continue;
  const key=tacDK(B,f,n.c,o);B.dm.set(key,{m:tacDoorMat(B,f,n.c,o,key),st:'ok'})}}
// 關著卻擋不住煙熱：具通風口、玻璃窗門、或已被破壞
const tacDLeak=d=>!!d&&(d.m==='louv'||d.m==='gwin'||d.st==='brk');
// 已經不存在的門（燒毀、熔毀）：關不起來
const tacDGone=(B,key)=>{const d=B.dm&&B.dm.get(key);return!!d&&(d.st==='burn'||d.st==='melt')};
// 關著且確實隔絕煙熱
function tacSeal(B,f,a,b){const key=tacDK(B,f,a,b);return!!B.cd&&B.cd.has(key)&&!tacDLeak(B.dm&&B.dm.get(key))}
// 關著但會漏（煙熱交換約為開門的六成）
function tacLeakC(B,f,a,b){const key=tacDK(B,f,a,b);return!!B.cd&&B.cd.has(key)&&tacDLeak(B.dm&&B.dm.get(key))}
// 門的狀態文字（提示框）
function tacDoorTxt(B,f,a,b){
 const key=tacDK(B,f,a,b),d=B.dm&&B.dm.get(key);if(!d)return null;
 const fdd=B.fd&&B.fd.get(key);
 let st=d.st==='ok'?(B.cd.has(key)?'完整':'開啟'):TAC_DSN[d.st];
 if(d.st==='brk'&&!B.cd.has(key))st='破壞、開啟';
 if(fdd&&fdd.t==='gone')return['防火門已拆除','#ff6a5a'];
 const lk=B.lk.has(key)&&d.st!=='warp'&&B.lkK&&B.lkK.has(key)?'、上鎖':'';
 const bad=d.st==='melt'||d.st==='burn'||d.st==='warp'||d.st==='brk',leak=B.cd.has(key)&&tacDLeak(d);
 return[(fdd?'防火門（'+TAC_DMN[d.m]+'）':TAC_DMN[d.m])+'（'+st+lk+'）'+(leak?' ⚠ 煙熱會穿過':''),bad||leak?'#e9a13b':'#9d9a92']}
// 受熱：關著的門被火烤（x 為受熱側），依材質熔毀、破裂、燒穿或變形
function tacDoorHeat(inc,B,x,cc,dt){
 const key=tacDK(B,x.f,x.c,cc),d=(B.dm&&B.dm.get(key))||{m:'wood',st:'ok'},bt=B.dbt||(B.dbt={});
 if(d.st==='warp'||d.st==='melt'||d.st==='burn')return;
 const P={plas:[.5,20],glass:[.55,12],wood:[.7,60],louv:[.65,45],gwin:[.6,50],steel:[.88,90]}[d.m]||[.7,60];
 if(x.h<P[0])return;
 bt[key]=(bt[key]||0)+dt;if(bt[key]<P[1])return;
 const nm=tacNm(B,x.f,x.c)+'通往'+tacNm(B,x.f,cc);
 if(d.m==='steel'){d.st='warp';B.lk.add(key);(B.lkK||(B.lkK=new Set())).add(key);
  radio(inc,'安全官',nm+'的鐵門受熱變形卡死：煙熱過不去，但打不開，要破壞才能通過。');return}
 d.st=d.m==='plas'?'melt':d.m==='glass'?'brk':'burn';B.cd.delete(key);B.lk.delete(key);
 radio(inc,'安全官',nm+'的'+TAC_DMN[d.m]+(d.st==='melt'?'熔毀':d.st==='brk'?'受熱破裂':'被燒穿')+'，火勢擴大！')}
// 破壞進入：門鎖、門框被破壞，之後關上也擋不住煙熱
function tacDoorBrk(B,key){const d=B.dm&&B.dm.get(key);if(d&&d.st!=='melt'&&d.st!=='burn')d.st='brk'}
// 變形的鐵門破壞較久
const tacDoorHard=(B,key)=>{const d=B.dm&&B.dm.get(key);return d&&d.st==='warp'?2:d&&d.m==='steel'?1.3:1};
// ===== 門控進入（脈衝射水）=====
// 門後有熱或濃煙：在門口反覆「開門 → 短促射水冷卻煙層 → 關門」（每輪約 3 秒，開門約 1 秒），
// 門後溫度降到可進入攻擊才進去；開門時間短，火吃不到大量新鮮空氣。沒有水線只能觀察約 3 秒。
// 短促射水冷卻上方的熱煙、煙層升高；門後已經不熱還繼續打，會產生蒸汽、破壞熱平衡讓煙層掉下來
function tacDPulse(inc,B,q,y,key,dt,info){
 if(q.ty==='robot'||q.task==='exit'||q.sdb)return false;
 if(!(y.h>.2||y.s>.5)){q.dpK=null;return false}
 if(q.dpK!==key){q.dpK=key;q.dpT=0;q.dpN=0;q.dpI=info;q.dpS=0}
 q.dpT+=dt;q.mt=0;
 const wet=q.line&&q.pf>0,goal=tacHotLim(q)*.75;
 if(!wet){q.dpO=q.dpT<3;if(q.dpT<3)return true;q.dpK=null;q.dpO=0;return false}
 const ph=q.dpT%3,cyc=Math.floor(q.dpT/3);q.dpO=ph<1;
 if(!q.dpS){q.dpS=1;radio(inc,q.cs,'門控進入：在'+tacNm(B,y.f,y.c)+'門口反覆開關門、短促射水冷卻煙層（門後約 '+tacParam(B,y).temp+' °C）。');tacSay(q,'dpulse')}
 if(cyc>q.dpN){q.dpN=cyc;
  if(y.h<=goal&&q.dpN>=1){q.dpK=null;q.dpO=0;y.dpc=S.t;radio(inc,q.cs,tacNm(B,y.f,y.c)+'溫度降到約 '+tacParam(B,y).temp+' °C，可以進入，入室。');return false}
  if(q.dpN>=14){q.dpK=null;q.dpO=0;y.dpc=S.t;radio(inc,q.cs,tacNm(B,y.f,y.c)+'脈衝射水溫度降不下來，火點還在燒，直接入室攻擊。');return false}
  if(Math.random()<.4)tacSay(q,'dpulse')}
 if(ph<1){const pw=dt*q.pf*Math.min(1.2,q.n/3);
  y.h=Math.max(0,y.h-pw*.11);
  if(y.h>.3)y.lay=Math.min(1,tacLayV(y)+pw*.12);        // 冷卻熱煙：煙層升高
  else{y.lay=Math.max(0,tacLayV(y)-pw*.1);y.s=Math.min(1,y.s+pw*.05)} // 不熱了還打：蒸汽擾亂煙層
  y.o2=Math.min(20.9,y.o2+pw*.6)}
 return true}
// 繪製：脈衝射水中的門（開門的瞬間畫成開著，水霧往門內噴）
function tacDPulseDraw(g,G,B,vf,T){
 for(const q of B.sq){if(!q.dpK||!q.dpO||!q.dpI)continue;const I=q.dpI;let m,d;
  if(I.e){if(vf!==B.bf)continue;m=tacDoor(G,I.e);d=TAC_SDV[I.e].map(v=>-v)}
  else{if(I.f!==vf)continue;m=tacDoorMid(G,I.a,I.b);const c=G.ctr(I.b);const l=Math.hypot(c[0]-m[0],c[1]-m[1])||1;d=[(c[0]-m[0])/l,(c[1]-m[1])/l]}
  for(let k=0;k<7;k++){const ph=(T*2.2+k/7)%1,sp=(k%3-1)*.35;
   g.fillStyle='rgba(125,179,232,'+(.85*(1-ph)).toFixed(2)+')';g.beginPath();
   g.arc(m[0]+(d[0]-d[1]*sp)*ph*30,m[1]+(d[1]+d[0]*sp)*ph*30,2,0,TAU);g.fill()}
  g.fillStyle='#7db3e8';g.font='600 9px '+FONT;g.textAlign='center';g.textBaseline='bottom';g.fillText('脈衝',m[0],m[1]-6)}}
