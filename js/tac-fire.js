// 戰術指揮：火煙模擬（煙囪效應、毒性、火勢成長與延燒、受困者狀況）
'use strict';
// 煙囪效應強度（0～約 1.2）：地上樓層數、火勢、頂部開口
function tacStack(B){let mh=0;for(const x of B.cells)if(x.h>mh)mh=x.h;
 return Math.min(1.2,.25+Math.min(1,(B.F-B.bf)/10)*.5+mh*.3+(B.roof?.25:0))*(mh>.05||B.cells.some(x=>x.ty==='stair'&&x.s>.2)?1:0)}
// 煙沿樓梯間竄到起火層以上三層以上：安全官提醒（一次）
function tacStackWarn(inc,B,stk){
 if(B.stkW||!stk||B.F-B.bf<4)return;
 const hi=B.cells.find(x=>x.f>=B.of+3&&x.ty!=='stair'&&x.s>.3&&B.L.N[x.c].nb.some(o=>B.L.N[o].ty==='stair'));
 if(hi){B.stkW=1;radio(inc,'安全官','煙囪效應：樓梯間的煙已竄到 '+tacFlr(B,hi.f)+'，請確認各層樓梯間防火門關閉'+(B.sp?'、上方樓層住戶就地避難':'')+'！');tacEvt(inc,B,'warn','煙囪效應：煙竄至 '+tacFlr(B,hi.f))}}
// 受困者吸入火災煙氣的惡化速度：CO（煙濃、缺氧時高）與 HCN（合成材質多的空間高）
function tacToxV(B,x){
 const sm=Math.max(0,(18-x.o2)/6),co=(x.s*700+x.h*1400)*(1+sm),hf=x.ty==='room'?(TAC_HCNK[tacK(B,x.f,x.c)]||1):1,hcn=(x.s*22+x.h*18)*hf;
 return(x.s*.0012+Math.min(2,co/800)*.002+Math.min(2.5,hcn/25)*.002)*tacLayTox(x)}
// 火煙動態：成長、延燒、閃燃、煙層流動、排煙、受困者存活
function tacFire(inc,B,dt){
 const W=B.W,F=B.F,R=B.R,dh=new Float32Array(B.cells.length);
 tacFDStep(inc,B,dt);
 tacExtFire(inc,B,dt);
 let openings=B.roof;for(const x of B.cells)if(x.v)openings++;
 if(B.ppv&&!openings&&!B.ppvW){B.ppvW=1;radio(inc,'安全官','正壓排煙中但建物沒有排煙開口，請先建立出風口！')}
 // 負壓排煙與門控的位置（每幀由小組狀態算出）
 const npv=new Set(),dcN=new Set(),dcS=new Set();
 for(const q of B.sq){if(q.down||q.mt)continue;
  if(q.task==='npv'&&q.f===q.tf&&q.c===q.tc&&tacIn(q))npv.add(q.f*W+q.c);
  if(q.task==='dctrl'){if(tacIn(q)&&q.f===q.tf&&q.c===q.tc)dcN.add(q.f*W+q.c);else if(!tacIn(q)&&q.side===q.dside)dcS.add(q.dside)}}
 B.npvS=npv;B.dcS=dcS;B.dcN=dcN;
 for(const x of B.cells){
  // 含氧量：火燒與濃煙消耗，開口越多回復越快（8% 以下幾乎無法燃燒）
  const op=x.v||x.vv||npv.has(x.f*W+x.c);
  // 門窗都關著的空間（密閉）：氧氣耗得更快，容易形成通風控制的悶燒
  const sealed=!op&&x.ty==='room'&&B.L.N[x.c].nb.every(o=>tacShut(B,x.f,x.c,o)||B.lk.has(tacDK(B,x.f,x.c,o)));
  const oa=tacOpenAir(B,x); // 露天：空氣隨時補充，含氧量不會下降
  const tg=oa?20.9:Math.max(8,20.9-(sealed?x.h*10+x.s*8:(x.h*7+x.s*7)*(op?.35:1)));
  x.o2+=(tg-x.o2)*Math.min(1,dt*.3);
  if(x.ty==='stair')continue;
  const nd=B.L.N[x.c];
  // 自動撒水設備：房間溫度升高（h>.25）時撒水頭動作，壓制火勢、阻止經門與外牆延燒；送水口加壓時效果較好；火勢過猛（閃燃後）只能減緩
  if(B.spk&&B.spk.ok&&x.ty==='room'&&x.f>=B.bf&&x.h>.25&&x.fu>0){
   if(!x.spkOn){x.spkOn=1;if(!B.spk.fl[x.f]){B.spk.fl[x.f]=1;radio(inc,'受理','火警受信總機顯示'+tacFlr(B,x.f)+'撒水頭動作。');tacEvt(inc,B,'milestone',tacFlr(B,x.f)+'撒水頭動作')}}
   // 撒水是「控制」：把火壓在約三成並阻止延燒，仍需小組進入撲滅；煙照樣會累積
   x.wet=1;if(x.h>.32)x.h=Math.max(.32,x.h-dt*(x.h>.85?.004:.01)*(B.sp&&B.sp.on?1.5:1))}
  if(x.h>.2){x.bd=1;x.ovh=0}
  // 窗戶受熱：高溫先龜裂；猛烈燃燒時玻璃偶爾爆裂成開口（自然排煙、也讓火吃到空氣）
  if(x.h>.55&&!x.wcr&&B.L.N[x.c].win&&x.f>=B.bf)x.wcr=1;
  if(x.h>.92&&!x.v&&x.wcr&&B.L.N[x.c].win&&x.f>=B.bf&&Math.random()<dt*.01){x.v=1;radio(inc,'安全官',tacNm(B,x.f,x.c)+'窗戶受熱爆裂，濃煙火舌竄出窗外！')}
  if(x.fu>0&&x.h>.02){
   let ox=.45+.55*x.v+(x.v&&B.ppvS&&B.ppvS.has(x.f*W+x.c)?.6:0)+(x.vv?.2:0)-(x.s>.85&&!x.v?.2:0);
   if(nd.nb.some(o=>dcN.has(x.f*W+o)))ox-=.3;
   ox=Math.max(.05,ox)*Math.max(.15,Math.min(1.1,(x.o2-9)/11));
   // 成長：初期（起火後幾分鐘）較慢，火勢大了才加速
   if(!x.wet)x.h=Math.min(1,x.h+dt*(.0043+.030*x.h*(1-x.h*.5))*ox*B.fk*x.fk*(x.dw?.35:1));
   x.fu=Math.max(0,x.fu-dt*x.h*.0028*(x.gr?4:1))}
  else if(x.fu<=0)x.h=Math.max(0,x.h-dt*.02);
  x.s=Math.min(1,x.s+dt*x.h*.09);
  if(!oa&&!x.fl&&!x.vv&&x.h>.82&&x.s>.7&&!x.wet){x.fl=1;x.h=1; // 閃燃只發生在有牆、有頂的空間
   radio(inc,'安全官',tacNm(B,x.f,x.c)+'發生閃燃！');
   const crew=B.sq.some(q=>q.f===x.f&&q.c===x.c&&!q.down);if(crew)B.foN=(B.foN||0)+1;
   tacEvt(inc,B,'danger',tacNm(B,x.f,x.c)+'閃燃'+(crew?'（有小組在內）':''),crew);
   for(const q of B.sq)if(q.f===x.f&&q.c===x.c&&q.ty!=='robot'&&!q.down){q.hp=Math.max(.2,q.hp-.4);if(q.hp<.3)tacDown(inc,B,q,'遭遇閃燃')}}
  if(x.fl&&x.h<.25)x.fl=0;
  // 挑空：熱氣經電扶梯開口直接往上層竄
  if(nd.atr&&x.f+1<F&&x.h>.3)dh[(x.f+1)*W+x.c]+=dt*.01*(x.h-.3);
  if(x.h>.45&&!x.wet){
   // 經門延燒較快、隔牆較慢；有窗的房間經外牆往上層延燒（開窗更快）
   for(const cc of tacNb(B,x.f,x.c)){const nb=B.cells[x.f*W+cc];if(nb.fu<=0)continue;const sh=tacShut(B,x.f,x.c,cc),lc=!sh&&tacLeakC(B,x.f,x.c,cc);
    dh[x.f*W+cc]+=dt*(sh?.0013:lc?.004:.0068)*(x.h-.45)*(nb.wet?.2:1)*(B.wind?tacWF(B,x.c,cc):1)*(nb.gr?2.5:1);
    // 關著的門持續受熱：塑膠門熔毀、玻璃破裂、木門燒穿（約 60 秒，現實約 10 分鐘）、鐵門變形卡死
    if(B.cd.has(tacDK(B,x.f,x.c,cc)))tacDoorHeat(inc,B,x,cc,dt)}
   for(const cc of nd.wl){if(x.f<B.bf&&nd.nbO&&nd.nbO.includes(cc))continue;const nb=B.cells[x.f*W+cc];if(nb.fu>0)dh[x.f*W+cc]+=dt*(B.thin?.01:.003)*(B.out&&B.L.N[cc].walled?.45:1)*(x.h-.4)*(nb.wet?.2:1)}
   // 往上層：主要經外牆窗口（開窗更快）；樓板延燒很慢
   if(x.f+1<F){const up=B.cells[(x.f+1)*W+x.c];if(up.fu>0)dh[(x.f+1)*W+x.c]+=dt*(nd.win&&x.f>=B.bf?.004:x.f<B.bf?.0008:.0015)*(x.h-.5)*(1+x.v*2)}}}
 for(let i=0;i<dh.length;i++)if(dh[i]>0){const x=B.cells[i];
  // 室外有牆的建物：外牆受熱要累積到一定程度才會起燃（周界防護射水會讓預熱下降）
  // 未起火的格子要先累積受熱才會起燃（室外有牆的建物門檻更高，周界防護射水會讓預熱下降）
  if(x.h<.02){x.pre=(x.pre||0)+dh[i]*(x.wet?.2:1);if(x.pre<(B.out&&B.L.N[x.c].walled?.08:.05))continue}
  x.h=Math.min(1,Math.max(x.h,.02)+dh[i])}
 for(const x of B.cells)if(x.pre>0&&x.h<.02)x.pre=Math.max(0,x.pre-dt*(x.wet?.01:.0005))
 // 煙：同層經門交換（含樓梯間），樓梯間往上竄
 // 煙囪效應：建物越高、火越大、頂部有開口（屋頂排煙口）時，樓梯間往上竄得越快；
 // 建物上半部（中性面以上）樓梯間的煙更容易被壓進樓層，防火門關著時大幅減少
 const stk=B.out?0:tacStack(B),midF=B.bf+(F-B.bf)/2;
 for(let f=0;f<F;f++)for(const n of B.L.N)for(const cc of tacNb(B,f,n.c)){if(cc<n.c)continue;
  const a=B.cells[f*W+n.c],b=B.cells[f*W+cc];let k=tacShut(B,f,n.c,cc)?.04:tacLeakC(B,f,n.c,cc)?.15:.25;
  if(stk&&f>=midF){const sa=n.ty==='stair',sb=B.L.N[cc].ty==='stair';if((sa&&a.s>b.s)||(sb&&b.s>a.s))k*=1+stk*.8}
  if(B.out&&B.wind)k*=a.s>b.s?tacWF(B,n.c,cc):tacWF(B,cc,n.c); // 室外：煙順風飄，往下風處的交換較快
  const m=(a.s-b.s)*dt*k;a.s-=m;b.s+=m}
 for(const n of B.L.N)if(n.ty==='stair'||n.atr)for(let f=0;f<F-1;f++){const a=B.cells[f*W+n.c],b=B.cells[(f+1)*W+n.c],m=a.s*dt*(n.atr?.3:.2)*(n.atr?1:.6+stk)*(1-b.s);a.s-=m;b.s+=m}
 tacStackWarn(inc,B,stk);
 B.ppvT=(B.ppvT||0)-dt;if(B.ppvT<=0){B.ppvT=1;B.ppvS=tacPpvSet(B)}
 const pset=B.ppvS||new Set();
 for(const x of B.cells){
  let out=tacOpenAir(B,x)?tacOutSmokeOut(B):.004; // 露天的煙順風飄散
  const onP=pset.has(x.f*W+x.c);
  if(x.v)out+=.1+(onP?.18:0);
  if(onP)out+=.08;
  if(x.ty==='stair'&&x.f===F-1&&B.roof)out+=.25;
  if(x.vv)out+=.3;
  if(npv.has(x.f*W+x.c))out+=.35;
  else if(B.L.N[x.c].nb.some(o=>npv.has(x.f*W+o)&&!tacShut(B,x.f,x.c,o)))out+=.1;
  // 餘燼：燒過、撲滅後還有可燃物，沒做殘火處理就留著；沒人在場時偶爾復燃
  if(x.ty==='room'){
   if(x.bd&&x.h<.02&&x.fu>.1&&!x.ovh&&!x.emb){x.emb=1;x.embT=x.li?420:x.deep?300:x.gr?30:150}
   // 餘燼約 150 秒後自然熄滅；在那之前沒人在場時偶爾復燃
   if(x.emb&&(x.embT-=dt)<=0){x.emb=0;x.ovh=1}
   if(x.emb&&x.h<.02&&!B.sq.some(q=>q.f===x.f&&q.c===x.c)&&Math.random()<dt*(x.li?.012:x.deep?.005:.0015)){x.h=x.li?.3:.15;x.emb=0;x.dw=0;
    radio(inc,'安全官',tacNm(B,x.f,x.c)+(x.li?'鋰電池熱失控復燃！需持續大量灌水冷卻。':'殘火復燃！請派員殘火處理。'));B.rkN=(B.rkN||0)+1;tacEvt(inc,B,'warn',tacNm(B,x.f,x.c)+'殘火復燃')}}
  x.s=Math.max(0,Math.min(1,x.s-dt*out*Math.max(.3,x.s)*2));
  if(x.vic>0){x.vh=Math.min(1,x.vh-dt*(tacToxV(B,x)+Math.max(0,x.h-.35)*.03+tacTrauma(B,x)));
   if(x.vh<=0){B.lost+=x.vic;S.rep-=3*x.vic;radio(inc,'受理',tacNm(B,x.f,x.c)+'受困者 '+x.vic+' 名罹難（評鑑 -'+(3*x.vic)+'）。');
    x.vic=0;if(S.rep<=0){S.rep=0;S.over=true}}}}}
