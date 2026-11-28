// 戰術指揮：場所自有設備（機械排煙、特別安全梯加壓、停車場排風、泳池機房排風、隧道射流風機、機艙 CO₂）、
// BLEVE（壓力容器受熱沸騰液體膨脹蒸氣爆炸）、國道作業的後方來車
'use strict';
const TAC_SYSD={
 smx:{n:'機械排煙設備',fx:'各樓層排煙口抽出煙霧；約六成會由火警受信總機自動連動'},
 stp:{n:'特別安全梯加壓',fx:'樓梯間保持正壓，煙不容易進入，維持攻擊與避難路線'},
 pex:{n:'地下停車場排風',fx:'持續抽出地下室的煙與廢氣'},
 pvent:{n:'泳池與機房排風',fx:'機房、泳池區持續換氣，降低氣體濃度'},
 jet:{n:'隧道射流風機',fx:'沿車流方向縱向推煙：上游清出攻擊路線，但煙會往下游（下游還有人時要先疏散）'},
 co2:{n:'機艙 CO₂ 全區放射',fx:'機艙灌入二氧化碳窒息滅火；放射前機艙內人員必須全部撤出'}};
// 各案類有哪些設備（出現機率）；約兩成故障或被關閉，啟動時才知道
const TAC_SYSK={skyscraper:{smx:1,stp:1,pex:.9},deptfire:{smx:1,pex:.8},hospfire:{smx:.8,stp:.6},hifire:{smx:.4,stp:.5},nursing:{smx:.4},smoke:{pex:.9},poolgas:{pvent:1},tunnel:{jet:1},ship:{co2:1}};
function tacSysInit(inc,B){
 // 資源回收場的鋼瓶區：受熱會 BLEVE（取代原本的單純瓦斯桶爆炸）
 if(inc.k==='wastefire'){const cy=B.L.N.find(n=>n.kind==='cylz');if(cy){B.bv={c:cy.c,f:0,p:0,k:1.5,n:'鋼瓶區',r:1.4};if(B.gas===cy.c)B.gas=undefined}}
 B.sys={};const d=TAC_SYSK[inc.k];if(!d)return;
 for(const k in d){if(k==='pex'&&!B.bf)continue;if(Math.random()>=d[k])continue;
  B.sys[k]={on:0,t:0,ok:Math.random()>(k==='co2'||k==='jet'?.1:.2),auto:k==='smx'&&Math.random()<.6}}
 if(B.sys.jet)B.sys.jet.dir=B.arr==='w'?'e':'w'}

// 啟動／停止（有人到防災中心或控制盤操作，約 10 秒）
function tacSysTog(inc,B,k,quiet){
 const s=B.sys&&B.sys[k];if(!s||s.dead)return false;
 if(k==='co2'){if(s.on||s.t>0)return false;
  const inE=B.sq.filter(q=>tacIn(q)&&q.f<B.bf&&!q.down);
  if(inE.length){if(!quiet)msg='機艙還有 '+inE.map(q=>q.cs).join('、')+'，不能放射 CO₂';return false}
  for(const n of B.L.N)if(n.ty==='stair')for(const o of n.nb)B.cd.add(tacDK(B,0,n.c,o));}
 if(s.on){s.on=0;if(!quiet)radio(inc,'受理',TAC_SYSD[k].n+'停止。');return true}
 if(s.t>0)return false;
 s.t=k==='co2'?15:10;radio(inc,'受理',(k==='co2'?'機艙人員清點完畢、艙門關閉，':'派員前往防災中心，')+'啟動'+TAC_SYSD[k].n+'。');return true}
function tacSysStep(inc,B,dt){
 const Y=B.sys;if(!Y)return;
 for(const k in Y){const s=Y[k];
  if(s.t>0){s.t-=dt;if(s.t<=0){s.t=0;
    if(!s.ok){s.dead=1;radio(inc,'受理',TAC_SYSD[k].n+'故障，無法啟動！');tacEvt(inc,B,'warn',TAC_SYSD[k].n+'故障')}
    else{s.on=1;s.t0=S.t;radio(inc,'受理',TAC_SYSD[k].n+'運轉中。');tacEvt(inc,B,'milestone',TAC_SYSD[k].n+'啟動')}}}
  // 機械排煙：受信總機偵煙自動連動
  if(k==='smx'&&s.auto&&!s.on&&!s.t&&!s.dead&&B.cells.some(x=>x.ty!=='stair'&&x.f>=B.bf&&x.s>.3)){s.auto=0;if(s.ok){s.on=1;s.t0=S.t;radio(inc,'受理','火警受信總機連動，機械排煙設備自動啟動。')}else{s.dead=1;radio(inc,'受理','機械排煙設備應連動但沒有動作（故障或被關閉）。')}}
  if(!s.on)continue;
  if(k==='smx')for(const x of B.cells){if(x.ty==='stair'||x.f<B.bf)continue;if(x.s>.03)x.s=Math.max(0,x.s-dt*.018*(x.h>.6?.5:1))}
  else if(k==='stp')for(const x of B.cells){if(x.ty==='stair'&&x.s>.04)x.s=Math.max(.02,x.s-dt*.12)}
  else if(k==='pex')for(const x of B.cells){if(x.f<B.bf&&x.s>.03)x.s=Math.max(0,x.s-dt*.03)}
  else if(k==='pvent'&&B.chem)for(const x of B.cells){if(x.cz>0)x.cz=Math.max(0,x.cz-dt*.005)}
  else if(k==='jet')tacJetStep(B,dt,s.dir);
  else if(k==='co2'){for(const x of B.cells)if(x.f<B.bf){x.o2=Math.min(x.o2,10.5);if(x.h>0)x.h=Math.max(0,x.h-dt*.012)}
   if(!s.done&&!B.cells.some(x=>x.f<B.bf&&x.h>.04)){s.done=1;radio(inc,'受理','機艙溫度下降，CO₂ 放射後火勢已窒熄；開艙前先量測含氧，進入要防復燃。')}}}}
// 射流風機：主隧道內的煙依風向往下游推，隧道口排出
function tacJetStep(B,dt,dir){
 const N=B.L.N,tube=B.cells.filter(x=>N[x.c].tube).sort((a,b)=>(N[a.c].gx-N[b.c].gx)*(dir==='e'?-1:1));
 for(const x of tube){if(x.s<.01)continue;const n=N[x.c];
  const dn=n.nb.concat(n.wl).map(o=>B.cells[x.f*B.W+o]).filter(y=>N[y.c].tube&&(dir==='e'?N[y.c].gx>n.gx:N[y.c].gx<n.gx));
  const m=Math.min(x.s,dt*.25*x.s);x.s-=m;if(dn.length)for(const y of dn)y.s=Math.min(1,y.s+m/dn.length)}
 for(const x of tube)if(N[x.c].portal===dir)x.s=Math.max(0,x.s-dt*.2)}
// 側欄：場所設備
function tacSysHTML(B){
 if(!B.sys||!Object.keys(B.sys).length)return'';let h='';
 for(const k in B.sys){const s=B.sys[k],d=TAC_SYSD[k];
  const st=s.dead?'<b style="color:var(--red)">故障</b>':s.on?'<b style="color:var(--grn)">'+(k==='co2'?'已放射':'運轉中')+(k==='jet'?'（往'+TAC_SDN[s.dir]+'）':'')+'</b>':s.t>0?'啟動中…':'待命';
  const bt=s.dead||(k==='co2'&&(s.on||s.t>0))?'':' <button data-tsys="'+k+'" title="'+esc(d.fx)+'">'+(s.on?'停止':k==='co2'?'放射':'啟動')+'</button>';
  h+='<div class="row"><span title="'+esc(d.fx)+'">'+d.n+'</span><span>'+st+bt+'</span></div>'}
 return h}
// 戰術 AI：啟動場所設備（CO₂ 只在機艙起火、機艙內沒有人時放射）
function tacSysAI(inc,B){
 if(!B.sys)return;
 for(const k in B.sys){const s=B.sys[k];if(s.on||s.t>0||s.dead)continue;
  if(k==='co2'){if(B.cells.some(x=>x.f<B.bf&&x.h>.3)&&S.t-B.t0>40&&!B.sq.some(q=>tacIn(q)&&q.f<B.bf))tacSysTog(inc,B,k,1);continue}
  if(k==='jet'&&B.cells.some(x=>B.L.N[x.c].tube&&x.vic>0&&(B.sys.jet.dir==='e'?B.L.N[x.c].gx>B.L.N[B.oc].gx:B.L.N[x.c].gx<B.L.N[B.oc].gx)))continue; // 下游還有受困民眾：先不推煙
  if(k==='smx'&&s.auto)continue;
  tacSysTog(inc,B,k,1)}}
// ===== BLEVE =====
// 壓力容器（LPG 槽體、鋼瓶區）受火焰直接燒烤時壓力上升；射水冷卻（防護射水、雲梯射水、攻擊）讓壓力下降；
// 50% 安全閥起跳（尖嘯、噴出火炬）；75% 安全官警告；100% BLEVE：火球與破片，半徑內的人員、受困者全部波及
function tacBvCool(B,q){const bv=B.bv,set=[bv.c].concat(B.L.N[bv.c].nb);
 if(!q.line||!(q.pf>0)||q.down||q.burst>0)return 0;
 if(q.ty==='ladder'&&q.task==='master'&&set.includes(q.lc))return q.pf*1.3;
 if((q.task==='guard'||q.task==='attack'||q.task==='confine'||q.task==='hold')&&q.f===bv.f&&set.includes(q.c))return q.pf;
 return 0}
function tacBvStep(inc,B,dt){
 const bv=B.bv;if(!bv||bv.boom)return;
 const x=tacCel(B,bv.f,bv.c);let heat=x.h;for(const o of B.L.N[bv.c].nb)heat=Math.max(heat,tacCel(B,bv.f,o).h*.8);
 let cool=0;for(const q of B.sq)cool+=tacBvCool(B,q);bv.cool=cool;
 bv.p=Math.max(0,bv.p+dt*(heat*.0042*bv.k-cool*.011-(bv.rel?.0008:0)));
 if(bv.p>.5&&!bv.rel){bv.rel=1;radio(inc,'安全官',bv.n+'安全閥起跳，發出尖嘯聲、噴出火炬！容器過熱，立即大量射水冷卻。');tacEvt(inc,B,'danger',bv.n+'安全閥起跳',1)}
 if(bv.rel&&bv.p<.35)bv.rel=0;
 if(bv.rel&&x.fu>0)x.h=Math.max(x.h,.45);
 if(bv.p>.75&&!bv.w75){bv.w75=1;radio(inc,'安全官',bv.n+'壓力約 '+Math.round(bv.p*100)+'%，BLEVE 危險！冷卻不足就全員撤離（全員撤出），只留冷卻水線。');tacEvt(inc,B,'danger','BLEVE 警戒（'+bv.n+'）',1)}
 if(bv.p<.6)bv.w75=0;
 if(bv.p>=1)tacBleve(inc,B)}
function tacBleve(inc,B){
 const bv=B.bv;bv.boom=1;bv.p=1;B.bleve=1;
 radio(inc,'安全官',bv.n+'發生 BLEVE！火球與破片波及半徑內所有人員！');tacEvt(inc,B,'danger','BLEVE：'+bv.n,1);
 S.rep-=8;B.viol.bleve=1;if(S.rep<=0){S.rep=0;S.over=true}
 const d=c=>tacGd(B,bv.c,c);
 for(const y of B.cells){if(y.f!==bv.f)continue;const r=d(y.c);if(r>bv.r)continue;
  if(y.fu>0)y.h=Math.max(y.h,1-r/bv.r*.5);y.s=1;
  if(y.vic>0){B.lost+=y.vic;S.rep-=3*y.vic;radio(inc,'受理',tacNm(B,y.f,y.c)+'受困者 '+y.vic+' 名遭 BLEVE 波及罹難。');y.vic=0;y.hid=0}}
 for(const q of B.sq){if(q.down||q.ty==='robot')continue;
  if(tacIn(q)&&q.f===bv.f&&d(q.c)<=bv.r){q.hp-=.95-d(q.c)/bv.r*.4;if(q.hp<.3)tacDown(inc,B,q,'BLEVE 火球')}
  else if(!tacIn(q)&&B.out&&!q.wd){q.hp-=bv.big?.5:.25;radio(inc,q.cs,'人員遭 BLEVE 破片與熱輻射波及！');if(q.hp<.3)tacDown(inc,B,q,'BLEVE 破片')}}
 if(B.leak&&B.leak.c===bv.c)B.leak.on=0;
 if(B.chem)B.chem.vap=0;B.dmg=Math.max(B.dmg,.4)}
// ===== 國道後方來車 =====
// 車道上作業時，上游（來車方向）要有大型消防車斜停阻擋；沒有阻擋時有後方來車撞入作業區的風險
function tacTrafStep(inc,B,dt){
 const T=B.traf;if(!T)return;
 T.t=(T.t||0)-dt;if(T.t>0)return;T.t=1;
 const blk=B.sq.some(q=>(q.ty==='pump'||q.ty==='ladder')&&q.tside===T.up&&!q.tmv);T.blk=blk;
 if(blk)return;
 const ex=B.sq.filter(q=>tacIn(q)&&!q.down&&B.L.N[q.c].lane&&!B.L.N[q.c].shd);
 if(ex.length&&!T.w){T.w=1;radio(inc,'安全官','車道上有人員作業，上游（'+TAC_SDN[T.up]+'側）沒有大型車阻擋，請移車到'+TAC_SDN[T.up]+'側防護！')}
 for(const q of ex)if(Math.random()<.004){q.hp-=.45;radio(inc,'安全官','後方來車衝入作業區，撞及 '+q.cs+'！');tacEvt(inc,B,'danger','後方來車撞入（'+q.cs+'）',1);B.viol.traf=1;if(q.hp<.3)tacDown(inc,B,q,'遭後方來車撞擊');break}}
// 戰術 AI：BLEVE 冷卻與撤離、國道上游阻擋
function tacBvAI(inc,B,free,take){
 const bv=B.bv;
 if(bv&&!bv.boom){
  const hot=tacCel(B,bv.f,bv.c).h>.05||B.L.N[bv.c].nb.some(o=>tacCel(B,bv.f,o).h>.1);
  if(bv.p>.85&&bv.cool<1&&!B.aiWd){B.aiWd=1;tacEvac(inc,B);radio(inc,'安全官','冷卻水量不足，BLEVE 迫在眉睫，全員撤離！')}
  else if((hot||bv.p>.2)&&!B.aiWd&&B.sq.filter(q=>q.task==='guard'&&q.tc===bv.c).length<2){
   const set=[bv.c].concat(B.L.N[bv.c].nb),p=free.find(q=>q.ty==='pump'&&(q.ppe||'F')==='F')||B.sq.find(q=>q.ty==='pump'&&!q.down&&!q.wd&&q.task==='attack'&&!set.includes(q.tc)&&q.air>.4);
   if(p&&tacOrder(inc,p,'guard',bv.f,bv.c,1)){take(p);radio(inc,p.cs,'對'+bv.n+'射水冷卻。')}}}
 const T=B.traf;
 if(T&&!T.blk&&!B.sq.some(q=>q.tmv&&q.tgt===T.up)){const p=free.find(q=>q.ty==='pump'&&!tacIn(q)&&!q.line&&!tacCanSide(B,q,T.up));
  if(p&&tacTruck(inc,B,p,T.up,1)){take(p);radio(inc,p.cs,'移車至'+TAC_SDN[T.up]+'側斜停，阻擋後方來車。')}}}
// 全員撤出：室內小組撤出；有 BLEVE 危險的場區全員撤到安全距離（撤離的小組不受破片波及，直到再下令）
function tacEvac(inc,B){
 let n=0;for(const q of B.sq){if(tacIn(q)&&!q.down){q.task='exit';q.tf=-1;q.tc=0;q.prev=null;n++}if(B.bv&&!B.bv.boom&&!q.down){q.wd=1;if(!tacIn(q)&&q.task!=='station'){q.task='idle';q.prev=null}}}
 return n}
// 繪製：BLEVE 壓力表、安全閥火炬；國道車流方向與阻擋狀態；隧道射流風機
function tacSysDraw(g,G,B,vf){
 const t=G.t,T=S.t;
 // 可燃或有毒氣體雲：濃度越高越明顯，緩慢飄動
 if(B.chem&&(B.chem.vap||B.chem.lelk)&&vf<B.F)for(const n of B.L.N){const x=tacCel(B,vf,n.c);if(!((x.cz||0)>.08))continue;const r=G.r(n.c),c=B.chem.co?'200,120,200':B.chem.h2s?'180,200,90':'150,210,120';
  for(let k=0;k<3;k++){const ph=(T*.12+k/3+n.c*.11)%1;g.fillStyle='rgba('+c+','+(Math.min(.3,x.cz*.3)).toFixed(3)+')';g.beginPath();g.ellipse(r[0]+r[2]*(.2+.6*ph),r[1]+r[3]*(.3+.4*((k*.41+n.c*.17)%1)),r[2]*.22,r[3]*.16,0,0,TAU);g.fill()}
  if(x.gm&&B.chem.lelk&&!B.blasted){g.fillStyle=x.gm.lel>=100?'#ff6a5a':x.gm.lel>=10?'#e9a13b':'#9d9a92';g.font='600 10px '+FONT;g.textAlign='right';g.textBaseline='bottom';g.fillText('LEL '+x.gm.lel+'%'+(S.t-x.gm.t>60?'（'+Math.round((S.t-x.gm.t)/60)+' 分前）':''),r[0]+r[2]-4,r[1]+r[3]-3)}}
 // 架設支撐：木料 X 形支撐
 if(vf<B.F)for(const n of B.L.N){const x=tacCel(B,vf,n.c);if(!x.shore)continue;const r=G.r(n.c);g.strokeStyle='#b8894a';g.lineWidth=4;
  g.beginPath();g.moveTo(r[0]+r[2]*.2,r[1]+r[3]*.2);g.lineTo(r[0]+r[2]*.8,r[1]+r[3]*.8);g.moveTo(r[0]+r[2]*.8,r[1]+r[3]*.2);g.lineTo(r[0]+r[2]*.2,r[1]+r[3]*.8);g.stroke();
  g.fillStyle='#e9c85a';g.font='600 10px '+FONT;g.textAlign='center';g.textBaseline='top';g.fillText('已支撐',r[0]+r[2]/2,r[1]+4)}
 // 侷限空間：送風機往人孔送風
 if(B.sc&&B.sc.k==='pit'&&B.ppv){const h=B.L.N.find(n=>n.hole);if(h){const r=G.r(h.c),cx=r[0]+r[2]/2;g.fillStyle='rgba(125,179,232,.85)';
  for(let k=0;k<3;k++){const ph=(T*.8+k/3)%1,y=r[1]-t*.4+ph*t*.6;g.beginPath();g.moveTo(cx-5,y);g.lineTo(cx+5,y);g.lineTo(cx,y+7);g.fill()}}}
 // 隧道：主隧道外框（頂板）與隧道口
 if(B.sc&&B.sc.k==='tunnel'){const tb=B.L.N.filter(n=>n.tube);if(tb.length){const x0=Math.min(...tb.map(n=>n.gx)),y0=Math.min(...tb.map(n=>n.gy)),x1=Math.max(...tb.map(n=>n.gx+n.gw)),y1=Math.max(...tb.map(n=>n.gy+n.gh));
  g.strokeStyle='#6a665e';g.lineWidth=5;g.strokeRect(G.bx+x0*t,G.by+y0*t,(x1-x0)*t,(y1-y0)*t);
  g.fillStyle='rgba(236,234,227,.65)';g.font='600 11px '+FONT;g.textBaseline='bottom';g.textAlign='left';g.fillText('主隧道（封閉，煙排不出去）',G.bx+x0*t+6,G.by+y1*t-4)}}
 // 啟動中的場所設備
 if(B.sys){const on=Object.keys(B.sys).filter(k=>B.sys[k].on);let y=G.by+G.bh-8;for(const k of on){const tx=TAC_SYSD[k].n+(k==='co2'?' 已放射':' 運轉中');g.font='600 10px '+FONT;const w=g.measureText(tx).width+14;
  g.fillStyle='rgba(20,40,34,.85)';g.fillRect(G.bx+6,y-15,w,15);g.fillStyle='#5dcaa5';g.textAlign='left';g.textBaseline='bottom';g.fillText('⟳ '+tx,G.bx+10,y-3);y-=18}}
 if(B.bv&&!B.bv.boom&&B.bv.f===vf){const bv=B.bv,r=G.r(bv.c),cx=r[0]+r[2]-18,cy=r[1]+18,p=bv.p;
  g.fillStyle='rgba(12,12,11,.85)';g.beginPath();g.arc(cx,cy,15,0,TAU);g.fill();
  g.strokeStyle='rgba(255,255,255,.15)';g.lineWidth=4;g.beginPath();g.arc(cx,cy,11,Math.PI*.75,Math.PI*2.25);g.stroke();
  g.strokeStyle=p>.75?'#e2564f':p>.5?'#e9a13b':'#5dcaa5';g.beginPath();g.arc(cx,cy,11,Math.PI*.75,Math.PI*(.75+1.5*Math.min(1,p)));g.stroke();
  g.fillStyle='#eceae3';g.font='600 9px '+FONT;g.textAlign='center';g.textBaseline='middle';g.fillText(Math.round(p*100),cx,cy);
  g.fillStyle=p>.75?'#ff8a7a':'rgba(236,234,227,.8)';g.font='600 10px '+FONT;g.textBaseline='top';g.fillText(p>.75&&(T*3)%1<.5?'BLEVE 危險':'槽壓',cx,cy+16);
  if(bv.rel){const bx=r[0]+r[2]/2,by=r[1]+r[3]*.3;for(let i=0;i<6;i++){const ph=(T*4+i/6)%1;g.fillStyle='rgba(255,'+(180-ph*120|0)+',60,'+(.8*(1-ph)).toFixed(2)+')';g.beginPath();g.arc(bx,by-ph*t*.8,t*(.05+ph*.08),0,TAU);g.fill()}}
  if(bv.cool>0){g.fillStyle='rgba(125,179,232,.9)';g.font='10px '+FONT;g.textAlign='left';g.textBaseline='bottom';g.fillText('冷卻 '+bv.cool.toFixed(1)+' 線',r[0]+4,r[1]+r[3]-2)}}
 if(B.traf){const up=B.traf.up,y=G.by-14,x0=G.bx+8,x1=G.bx+G.bw-8,dir=up==='w'?1:-1;
  g.fillStyle=B.traf.blk?'rgba(93,202,165,.9)':'rgba(226,86,79,'+(.6+.4*Math.sin(T*5)).toFixed(2)+')';g.font='600 11px '+FONT;g.textAlign=up==='w'?'left':'right';g.textBaseline='middle';
  g.fillText((dir>0?'車流 →　':'')+'上游（'+TAC_SDN[up]+'側）'+(B.traf.blk?'已有大型車阻擋':'未阻擋：後方來車危險')+(dir<0?'　← 車流':''),up==='w'?x0:x1,y)}
 if(B.sys&&B.sys.jet&&B.sys.jet.on){const d=B.sys.jet.dir==='e'?1:-1;g.fillStyle='rgba(125,179,232,.55)';
  for(const n of B.L.N){if(!n.tube||n.ty!=='hall')continue;const r=G.r(n.c);for(let i=0;i<3;i++){const ph=((T*.6*d+i/3)%1+1)%1,xx=r[0]+r[2]*ph;g.beginPath();g.moveTo(xx,r[1]+r[3]/2-4);g.lineTo(xx+8*d,r[1]+r[3]/2);g.lineTo(xx,r[1]+r[3]/2+4);g.fill()}}}}
// ===== 四周環境（依類型畫：水域、山體、護欄外、騎樓店面、民宅、圍籬、農田、魚塭、樹林、廠區） =====
const TAC_BANDT={'水域':1,'海面':1,'山體':1,'護欄外':1,'高架護欄外':1,'騎樓店面':1,'民宅':1,'鄰棟':1,'工區圍籬':1,'停車場邊界':1,'農田':1,'魚塭':1,'樹林':1,'廠區':1,'貨櫃堆':1};
// 建物面向這條帶的那一邊（帶在北側時，建物在它的南邊）
const tacBandIn=(b,s)=>s==='n'?[b[0],b[1]+b[3],b[0]+b[2],b[1]+b[3]]:s==='s'?[b[0],b[1],b[0]+b[2],b[1]]:s==='w'?[b[0]+b[2],b[1],b[0]+b[2],b[1]+b[3]]:[b[0],b[1],b[0],b[1]+b[3]];
function tacBandBg(g,b,d,s,T){
 const nm=d.nm,hz=s==='n'||s==='s';let sd=s.charCodeAt(0)*977+13;const rnd=()=>((sd=(sd*9301+49297)%233280)/233280);
 g.save();g.beginPath();g.rect(b[0],b[1],b[2],b[3]);g.clip();
 if(nm==='水域'||nm==='海面'){g.fillStyle='#0e2436';g.fillRect(b[0],b[1],b[2],b[3]);g.strokeStyle='rgba(125,179,232,.22)';g.lineWidth=1.2;
  for(let k=0;k<6;k++){const off=((T*8+k*37)%60);g.beginPath();for(let u=0;u<=(hz?b[2]:b[3]);u+=6){const w=Math.sin((u+off)/14+k)*2.5,p=(k+.5)/6*(hz?b[3]:b[2]);if(hz)g.lineTo(b[0]+u,b[1]+p+w);else g.lineTo(b[0]+p+w,b[1]+u)}g.stroke()}}
 else if(nm==='山體'){g.fillStyle='#24211c';g.fillRect(b[0],b[1],b[2],b[3]);for(let k=0;k<40;k++){g.fillStyle=['#2e2a24','#1c1a16','#34302a'][k%3];g.beginPath();g.ellipse(b[0]+b[2]*rnd(),b[1]+b[3]*rnd(),6+rnd()*10,4+rnd()*6,rnd()*3,0,TAU);g.fill()}}
 else if(nm==='護欄外'||nm==='高架護欄外'){g.fillStyle=nm==='護欄外'?'#1f2a1c':'#0a0b0d';g.fillRect(b[0],b[1],b[2],b[3]);
  if(nm==='護欄外')for(let k=0;k<60;k++){g.fillStyle='rgba(90,120,60,.35)';g.fillRect(b[0]+b[2]*rnd(),b[1]+b[3]*rnd(),2,3)}
  else{g.fillStyle='rgba(236,234,227,.35)';g.font='10px '+FONT;g.textAlign='center';g.textBaseline='middle';g.fillText('（高架橋下方，懸空）',b[0]+b[2]/2,b[1]+b[3]*.7)}}
 else if(nm==='騎樓店面'||nm==='民宅'||nm==='鄰棟'||nm==='廠區'){g.fillStyle='#1d1b18';g.fillRect(b[0],b[1],b[2],b[3]);const L=hz?b[2]:b[3];let u=0;
  while(u<L){const w=(nm==='廠區'?60:28)+rnd()*(nm==='廠區'?50:24);const r=hz?[b[0]+u+1,b[1]+3,w-2,b[3]-6]:[b[0]+3,b[1]+u+1,b[2]-6,w-2];
   g.fillStyle=nm==='廠區'?'#2c2e30':['#2c2823','#27241f','#302b25'][Math.floor(rnd()*3)];g.fillRect(r[0],r[1],r[2],r[3]);g.strokeStyle='rgba(0,0,0,.4)';g.lineWidth=1;g.strokeRect(r[0]+.5,r[1]+.5,r[2]-1,r[3]-1);
   if(nm==='廠區'){g.strokeStyle='rgba(255,255,255,.06)';for(let q=4;q<(hz?r[2]:r[3]);q+=5){g.beginPath();if(hz){g.moveTo(r[0]+q,r[1]);g.lineTo(r[0]+q,r[1]+r[3])}else{g.moveTo(r[0],r[1]+q);g.lineTo(r[0]+r[2],r[1]+q)}g.stroke()}}
   u+=w}}
 else if(nm==='工區圍籬'||nm==='停車場邊界'||nm==='貨櫃堆'){g.fillStyle='#1c1b18';g.fillRect(b[0],b[1],b[2],b[3]);const e=tacBandIn(b,s);
  g.strokeStyle=nm==='工區圍籬'?'rgba(233,161,59,.6)':'rgba(200,200,190,.35)';g.lineWidth=2;g.setLineDash([6,4]);g.beginPath();g.moveTo(e[0]+(hz?0:(s==='w'?-6:6)),e[1]+(hz?(s==='n'?-6:6):0));g.lineTo(e[2]+(hz?0:(s==='w'?-6:6)),e[3]+(hz?(s==='n'?-6:6):0));g.stroke();g.setLineDash([])}
 else if(nm==='農田'){g.fillStyle='#1f2a18';g.fillRect(b[0],b[1],b[2],b[3]);g.strokeStyle='rgba(120,150,70,.3)';g.lineWidth=2;for(let k=0;k<(hz?b[2]:b[3]);k+=7){g.beginPath();if(hz){g.moveTo(b[0]+k,b[1]);g.lineTo(b[0]+k,b[1]+b[3])}else{g.moveTo(b[0],b[1]+k);g.lineTo(b[0]+b[2],b[1]+k)}g.stroke()}}
 else if(nm==='魚塭'){g.fillStyle='#163230';g.fillRect(b[0],b[1],b[2],b[3]);g.strokeStyle='#2a2620';g.lineWidth=4;for(let k=60;k<(hz?b[2]:b[3]);k+=80){g.beginPath();if(hz){g.moveTo(b[0]+k,b[1]);g.lineTo(b[0]+k,b[1]+b[3])}else{g.moveTo(b[0],b[1]+k);g.lineTo(b[0]+b[2],b[1]+k)}g.stroke()}}
 else if(nm==='樹林'){g.fillStyle='#16241a';g.fillRect(b[0],b[1],b[2],b[3]);for(let k=0;k<50;k++){g.fillStyle=['#203a26','#28462e','#1b3020'][k%3];g.beginPath();g.arc(b[0]+b[2]*rnd(),b[1]+b[3]*rnd(),5+rnd()*7,0,TAU);g.fill()}}
 else{g.fillStyle='#191816';g.fillRect(b[0],b[1],b[2],b[3])}
 g.restore()}
// 道路：靠建物側的緣石與人行道；碼頭畫繫船柱；國道畫護欄
function tacRoadDeco(g,b,d,s){
 const e=tacBandIn(b,s),hz=s==='n'||s==='s',dx=hz?0:(s==='w'?-1:1),dy=hz?(s==='n'?-1:1):0;
 if(d.nm!=='碼頭'&&d.road!==4&&d.road!==7){g.fillStyle='rgba(120,116,106,.35)';if(hz)g.fillRect(b[0],s==='n'?b[1]+b[3]-7:b[1],b[2],7);else g.fillRect(s==='w'?b[0]+b[2]-7:b[0],b[1],7,b[3])}
 g.strokeStyle='rgba(236,234,227,.35)';g.lineWidth=1.5;g.beginPath();g.moveTo(e[0]+dx*7,e[1]+dy*7);g.lineTo(e[2]+dx*7,e[3]+dy*7);g.stroke();
 const far=s==='n'?[b[0],b[1]+3,b[0]+b[2],b[1]+3]:s==='s'?[b[0],b[1]+b[3]-3,b[0]+b[2],b[1]+b[3]-3]:s==='w'?[b[0]+3,b[1],b[0]+3,b[1]+b[3]]:[b[0]+b[2]-3,b[1],b[0]+b[2]-3,b[1]+b[3]];
 if(d.road===4){g.strokeStyle='rgba(200,200,190,.55)';g.lineWidth=2;g.beginPath();g.moveTo(far[0],far[1]);g.lineTo(far[2],far[3]);g.stroke()}
 if(d.nm==='碼頭'){g.fillStyle='#4a4a46';const L=hz?b[2]:b[3];for(let u=20;u<L;u+=46){g.beginPath();g.arc(hz?b[0]+u:far[0],hz?far[1]:b[1]+u,3.5,0,TAU);g.fill()}
  g.strokeStyle='rgba(233,200,90,.5)';g.lineWidth=2;g.beginPath();g.moveTo(far[0],far[1]);g.lineTo(far[2],far[3]);g.stroke()}}
