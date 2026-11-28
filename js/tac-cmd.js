// 戰術指揮的指揮支援：事件時間軸與事件暫停、結案報告、幕僚建議、戰術畫面請求增援、
// 結構穩定度與坍塌、消防專用升降機、前進指揮所
'use strict';
// 記錄事件；pause=1 時若玩家正在這個案件的戰術畫面，且開啟事件暫停，就暫停遊戲
function tacEvt(inc,B,ty,s,pause){
 B.ev=B.ev||[];B.ev.push({t:S.t-(B.t0||S.t),ty,s});
 if(pause&&TAC.open&&TAC.id===inc.id&&TAC.autoPause!==false){paused=true;TAC.pmsg=s;
  const b=document.getElementById('btnPause');if(b)b.textContent='繼續'}}
// 一次性事件（同類只記第一次）
function tacOnce(inc,B,k,s){B.once=B.once||{};if(B.once[k])return;B.once[k]=1;tacEvt(inc,B,'milestone',s)}
// ===== 結構穩定度 =====
// 穩定度：數值越大越耐燒（鋼筋混凝土幾乎不會坍塌，低穩定度的鐵皮或老舊建物長時間猛燒才會）
const TAC_STAB={'高':3,'中':1.2,'低':.6};
function tacStruct(inc,B,dt){
 if(B.hoax)return;
 let load=0;for(const x of B.cells)if(x.ty==='room'&&x.h>.5)load+=x.h-.5;
 B.dmg=Math.min(1.2,(B.dmg||0)+dt*.00012*load/B.stab);
 const warn=(k,lv,s)=>{if(B.dmg>=lv&&!B[k]){B[k]=1;radio(inc,'安全官',s);tacEvt(inc,B,'struct',s,1)}};
 warn('sw1',.5,'結構出現裂縫、樓板下陷，請各組注意撤退路線。');
 warn('sw2',.8,'結構嚴重受損，有坍塌危險！建議起火樓層以上全員撤出，改採外部防禦。');
 if(B.dmg>=1&&!B.cz){B.cz=new Set();
  // 燒得最嚴重的樓層坍塌（該層至少兩間房燃料燒掉六成以上）
  // 坍塌：燒得最嚴重的一到兩層（該層至少兩間房燃料燒掉六成以上）
  // 坍塌只會發生在起火層以上（燒得最久的樓層），不會讓下方樓梯中斷而困住上方小組
  const cand=[];for(let f=Math.max(B.bf,B.of);f<B.F;f++){const n=B.cells.filter(x=>x.f===f&&x.ty==='room'&&x.fu<.4).length;if(n>=2)cand.push([n,f])}
  cand.sort((a,b)=>b[0]-a[0]);for(const x of cand.slice(0,2))B.cz.add(x[1]);
  if(!B.cz.size)B.cz.add(B.of);
  const fl=[...B.cz].map(f=>tacFlr(B,f)).join('、');
  radio(inc,'受理',fl+' 樓板坍塌！該樓層禁止進入。');tacEvt(inc,B,'collapse',fl+' 樓板坍塌',1);
  for(const q of B.sq)if(tacIn(q)&&B.cz.has(q.f)&&!q.down&&q.ty!=='robot'){q.hp=Math.max(.05,q.hp-.6);tacDown(inc,B,q,'遭坍塌壓困')}
  for(const x of B.cells)if(B.cz.has(x.f)&&x.vic){B.lost+=x.vic;S.rep-=3*x.vic;x.vic=0}
  for(const x of B.cells)if(B.cz.has(x.f)&&x.hid){B.lost+=x.hid;x.hid=0}}}
// ===== 消防專用升降機：消防模式下往返起火層下兩層以下的樓層 =====
// 升降機可到的最高樓層：起火層下兩層；火在地下室時可到頂樓
const tacElevTop=B=>B.of<B.bf?B.F-1:B.of-2;
function tacElevOK(B,a,b){return B.elOn&&Math.max(a,b)<=tacElevTop(B)&&Math.min(a,b)>=B.bf}
function tacElevStep(inc,B,dt){
 if(!B.elev)return;
 if(B.elT>0){B.elT-=dt;if(B.elT<=0){B.elOn=1;radio(inc,'受理','消防專用升降機已切換消防模式，可運送人員至'+tacFlr(B,Math.max(B.bf,tacElevTop(B)))+'。');tacEvt(inc,B,'milestone','啟用消防專用升降機')}}
 if(B.elOn){for(let f=B.bf;f<=tacElevTop(B);f++)if(tacCel(B,f,0).s>.6){B.elOn=0;radio(inc,'安全官','升降機井道進煙，消防專用升降機停用！');tacEvt(inc,B,'warn','升降機井道進煙停用');break}}}
// ===== 前進指揮所：高樓於起火層下兩層換瓶休息 =====
const tacFwdOK=B=>!!(B.fwd&&B.sq.some(q=>q.task==='station'&&q.stn==='fwd'&&q.f===B.fwd.f));
// ===== 幕僚建議：有開設指揮站（有幕僚）時才提供 =====
function tacHints(inc,B){
 if(!B.st.icp)return null;
 const H=[],add=(p,s)=>H.push([p,s]);
 const inside=B.sq.filter(q=>tacIn(q)&&!q.down);
 if(B.mayday)add(0,'MAYDAY 進行中：確認 RIT 已出動，其他小組維持水線掩護。');
 if(!B.st.air&&!onScene(inc).some(u=>u.code==='71'))add(1,'現場沒有救助器材車，無法開設氣瓶充填區：各組車上備用瓶用完就不能換瓶，請求救助車增援。');
 if(B.dmg>=.5)add(1,'結構受損 '+Math.round(B.dmg*100)+'%：'+(B.dmg>=.8?'立即撤出起火樓層以上小組，改外部防禦。':'注意撤退路線，避免深入起火樓層。'));
 if(inside.length&&!B.sq.some(q=>q.task==='rit'||q.task==='ritgo'))add(1,'已有小組入室，但尚未編成 RIT。');
 if(!tacAcc(B))add(2,'尚未設置人員管制板，建議指派安全官。');
 for(const x of B.cells)if(x.ty==='room'&&x.o2<13&&x.h>.35&&!x.v&&!x.wet){add(1,tacNm(B,x.f,x.c)+'缺氧悶燒：勿直接破窗，先射水降溫再開口。');break}
 if(B.hyd&&!tacHydOK(inc,B))add(2,tacHydN(B)+'在'+TAC_SDN[B.hyd.side]+'側尚未'+(B.hyd.draft?'架設吸水':'佔水')+'，建議移一輛幫浦車過去。');
 if(B.sp&&!B.sp.on&&B.of-B.bf>=2)add(2,'高樓起火，建議送水口加壓，改由各樓層出水口接線。');
 if(B.F-B.bf>=5&&B.of-B.bf>=3&&!B.st.fwd)add(3,'建議於'+tacFlr(B,Math.max(B.bf+1,B.of-2))+'設置前進指揮所，就近換瓶休息。');
 if(B.elev&&!B.elOn&&!(B.elT>0)&&(B.of-B.bf>=3||B.of<B.bf))add(3,'可啟用消防專用升降機，運送人員到'+tacFlr(B,tacElevTop(B))+'。');
 if(tacCivOn(B))add(2,'現場有民眾可詢問屋內資訊。');
 const rep=B.cells.find(x=>x.rep&&x.srch<1);if(rep)add(2,tacNm(B,rep.f,rep.c)+'民眾指稱有人，尚未搜索。');
 for(const s of Object.keys(B.exp))if(B.exp[s]>.35&&!B.expL[s]&&!B.sq.some(q=>q.task==='cover'&&q.cside===s))add(2,TAC_SDN[s]+'側鄰棟受熱 '+Math.round(B.exp[s]*100)+'%，建議周界防護。');
 if(B.pts.length>tacAmbFree(inc,B))add(2,'傷患 '+B.pts.length+' 名待送醫，救護車不足，建議請求救護車。');
 const em=B.cells.filter(x=>x.emb).length;if(em&&!B.cells.some(x=>x.h>.05))add(3,'火勢已滅，仍有 '+em+' 間房有餘燼，建議殘火處理。');
 const lowB=B.sq.filter(q=>tacIn(q)&&q.air<.4&&q.task!=='exit').length;if(lowB&&tacAcc(B))add(2,'管制板顯示 '+lowB+' 組氣量偏低，注意撤出時機。');
 {const gl=B.cells.filter(x=>x.gm&&x.gm.lel>=10&&S.t-x.gm.t<180).sort((a,b)=>b.gm.lel-a.gm.lel)[0];
  if(gl)add(0,tacNm(B,gl.f,gl.c)+'量到 LEL '+gl.gm.lel+'%：禁止任何火源與會產生火花的器材；悶燒空間開口前先射水冷卻、門控控制進氣，瓦斯外洩則先關斷氣源再通風排除。')}
 if(B.gasL&&B.gasL.t>0)add(1,'瓦斯管線持續供氣：起火點撲滅後仍會再燒，先防護周邊與搜救瓦礫，待欣高關閥後再撲滅。');
 if(B.cells.some(x=>x.rub&&x.vic))add(1,'1F 瓦礫堆中有受困者：派救助組搜救，瓦礫搜索很慢，注意結構。');
 if(B.rf&&B.rf.h>0)add(1,'屋頂光電板起火'+(inc.pow>=2?'，台電已斷電，可派雲梯射水撲滅。':'，仍帶電：只能以雲梯水霧遠距射水，等待台電斷電。'));
 if(B.ext&&B.ext.h>0)add(1,tacNm(B,B.ext.f,B.ext.c)+'窗外室外機起火：派雲梯射水或入室由窗口射水，並檢查上一層同位置住戶。');
 if(B.T&&B.T.away&&B.cells.some(x=>x.o2<13&&x.h>.2))add(1,'起火戶門窗緊閉悶燒：破門前先備妥水線，開門後立即射水，防範爆燃。');
 if(B.cells.some(x=>x.li&&(x.emb||x.h>.05)))add(2,'鋰電池火災：撲滅後仍會熱失控復燃，需持續灌水冷卻並做殘火處理。');
 tacHazHints(inc,B,add);
 if(B.spk&&!B.spk.ok&&B.cells.some(x=>x.h>.3))add(1,'自動撒水設備未動作：火勢會快速擴大，請優先壓制起火層並防止往上層延燒。');
 if(B.spk&&B.spk.ok&&B.sp&&!B.sp.on&&Object.keys(B.spk.fl).length)add(2,'撒水頭已動作：送水口加壓可增強撒水效果。');
 // 防火門：已知被拆除或卡住、或被水帶卡住，樓梯間會進煙
 const bad=[...B.fd.values()].filter(d=>B.fdK.has(d.f)&&(d.t==='gone'||d.t==='wedge')&&d.f>=B.of-1);
 if(bad.length){const d=bad[0];add(1,tacFlr(B,d.f)+'樓梯間防火門'+TAC_FDN[d.t]+(d.t==='wedge'?'：建議派員到樓梯間門控，把門關上。':'：樓梯會進煙，受困者避難與搜索改走另一座樓梯。'))}
 const st=B.L.N.filter(n=>n.ty==='stair');
 if(st.length>1&&B.of>B.bf&&B.atkS&&B.atkS.size&&B.atkS.size<st.length){const ev=st.find(n=>!B.atkS.has(n.c));
  add(3,'水線走'+(st.findIndex(n=>B.atkS.has(n.c))+1)+'號梯（攻擊梯，防火門被水帶卡住會進煙），'+(st.indexOf(ev)+1)+'號梯維持關門作為避難梯。')}
 H.sort((a,b)=>a[0]-b[0]);return H.slice(0,5).map(h=>h[1])}
// ===== 戰術畫面請求增援 =====
const TAC_REQ=[['pump','幫浦車',['11','16']],['ladder','雲梯車',['21','31']],['resc','救助車',['71','搜']],['vent','排煙車',['75']],['hazmat','化災車',['51','01']],['foam','泡沫車',['57']],
 ['amb','救護車',['91']],['cmd','指揮車',['41']],['tank','水庫車',['61']]];
function tacReinf(inc,B,k){
 const r=TAC_REQ.find(x=>x[0]===k);if(!r)return;
 const u=nearest(inc,r[2],k==='amb'&&B.pts.some(p=>p.sev==='red'));
 if(!u){msg='目前無可用或可進場的'+r[1];return}
 if(send(inc,u,k==='amb'?(u.tp?'ALS':'BLS'):null)){reindex();radio(inc,'受理','現場請求增援'+r[1]+'，'+u.cs+' 出動。');tacEvt(inc,B,'milestone','請求增援 '+u.cs)}}
// ===== 結案報告 =====
function tacReport(inc,B){
 const T0=B.t0||0,tm=t=>t===undefined?'—':fmt(t);
 const tw=B.tWater,tc=B.tCtrl,dur=S.t-T0;
 const sc={};
 // 時效：首次出水與控火時間
 // 時效：首次出水 30 秒內、火勢控制 3 分鐘內滿分，之後逐秒扣分；誤報看查證完成時間；外部火源（屋頂、外牆）也計入
 sc.time=B.hoax?Math.max(0,Math.min(100,100-Math.max(0,dur-120)*.25)):!B.peak?100:Math.max(0,Math.min(100,100-Math.max(0,(tw===undefined?dur:tw)-30)*.8-Math.max(0,(tc===undefined?dur:tc)-180)*.15));
 // 救援：送醫比例，罹難大扣
 sc.resc=B.vtot?Math.max(0,Math.min(100,B.tx/B.vtot*100-B.lost*15)):100;
 // 安全
 const v=B.viol||{};
 sc.safe=Math.max(0,100-(B.mdN||0)*20-B.lodd*60-(v.noRit?15:0)-(v.noAcc?10:0)-(v.earlyV?5:0)-(B.bdN||0)*15-(B.foN||0)*8);
 // 財損：燒毀比例、延燒鄰棟、復燃
 const rooms=B.cells.filter(x=>x.ty==='room').length,burnt=B.cells.filter(x=>x.ty==='room'&&x.fu<.3).length;
 sc.loss=Math.max(0,100-burnt/Math.max(1,rooms)*120-Object.keys(B.expL).length*25-(B.rkN||0)*5-(B.cz?25:0));
 const notes=[];tacCbRep(B,sc,notes);tacRescRep(B,sc,notes);
 const avg=(sc.time+sc.resc+sc.safe+sc.loss)/4,grade=avg>=90?'S':avg>=80?'A':avg>=65?'B':avg>=50?'C':'D';
 if(v.noRit)notes.push('有小組入室時尚未編成 RIT');
 if(v.noAcc)notes.push('入室時尚未設置人員管制板，無法掌握氣量');
 if(B.bdN)notes.push('發生爆燃 '+B.bdN+' 次：悶燒缺氧的空間應採門控進入、先射水降溫再開口');
 if(v.earlyV)notes.push('過早排煙：火點還沒有水線壓制就開口或送風，火勢因進氣變大');
 if(B.foN)notes.push('有小組在閃燃現場 '+B.foN+' 次');
 if(B.rkN)notes.push('殘火復燃 '+B.rkN+' 次');
 if(Object.keys(B.expL).length)notes.push('火勢延燒至鄰棟');
 if(B.dws)notes.push('傷患在現場等待後送時死亡 '+B.dws+' 名');
 if(B.cz)notes.push('發生樓板坍塌');
 if(!notes.length)notes.push('無明顯缺失');
 return{nm:(inc.nm||KIND[inc.k].n)+' · '+inc.addr,dur,grade,avg:Math.round(avg),sc,notes,
  sum:[['首次出水',tm(tw)],['火勢控制',tm(tc)],['救出／送醫',B.resc+' / '+B.tx],['罹難',B.lost],['燒毀',burnt+' / '+rooms+' 室'],['MAYDAY',B.mdN||0],['殉職',B.lodd]].concat(B.played?[['親自指揮',Object.keys(B.pcU||{}).length+' / '+B.sq.length+' 組（獎勵 '+Math.round(tacPlayF(B)*100)+'%）']]:[]).concat(B.bonus?[['指揮獎金','$'+B.bonus]]:[]),
  ev:(B.ev||[]).slice()}}
function tacShowRep(r){
 const el=document.getElementById('tacRep');if(!el)return;
 const bar=(k,n)=>'<div class="rrow"><span>'+k+'</span><span class="tbar"><i style="width:'+Math.round(n)+'%;background:'+(n>=80?'var(--grn)':n>=60?'var(--amb)':'var(--red)')+'"></i></span><b>'+Math.round(n)+'</b></div>';
 const col={milestone:'var(--blu)',mayday:'var(--red)',struct:'var(--amb)',collapse:'var(--red)',danger:'var(--red)',victim:'var(--grn)',warn:'var(--amb)'};
 el.innerHTML='<div class="rbox"><div class="row" style="padding:0"><b style="font-size:16px">結案報告</b><button data-rclose="1">關閉</button></div>'+
  '<div class="sub" style="margin:4px 0 10px">'+esc(r.nm)+' · 戰術指揮 '+fmt(r.dur)+'</div>'+
  '<div class="rgrade">'+r.grade+'<span>'+r.avg+' 分</span></div>'+
  '<div class="rgrid"><div>'+bar('時效',r.sc.time)+bar('救援',r.sc.resc)+bar('安全',r.sc.safe)+bar('財損控制',r.sc.loss)+'</div>'+
  '<div class="kv" style="grid-template-columns:repeat(2,minmax(0,1fr))">'+r.sum.map(s=>'<div><b>'+s[0]+'</b>'+s[1]+'</div>').join('')+'</div></div>'+
  '<div class="hd mt">檢討</div>'+r.notes.map(n=>'<div class="sub">・'+esc(n)+'</div>').join('')+
  '<div class="hd mt">時間軸</div><div class="rev">'+r.ev.map(e=>'<div><span class="mono">'+fmt(e.t)+'</span><span style="color:'+(col[e.ty]||'var(--fg2)')+'">'+esc(e.s)+'</span></div>').join('')+'</div></div>';
 el.hidden=false}
document.addEventListener('click',e=>{if(e.target.closest('[data-rclose]')){document.getElementById('tacRep').hidden=true}});
// ===== 防火門 =====
const TAC_FDN={auto:'常閉',mag:'常開（連動）',wedge:'被卡住常開',gone:'已被拆除'};
// 小組經過樓梯間的防火門：常閉門開門通過後自動關回；有水帶通過時門被卡住無法關閉
function tacFDPass(inc,B,q,key,d){
 if(!B.fdK.has(d.f)){B.fdK.add(d.f);
  const bad=[...B.fd.values()].filter(x=>x.f===d.f&&(x.t==='gone'||x.t==='wedge'));
  if(bad.length){const g=bad.some(x=>x.t==='gone');
   radio(inc,q.cs,tacFlr(B,d.f)+'樓梯間防火門'+(g?'已被拆除':'被雜物卡住常開')+'，樓梯間無法阻煙！');
   tacEvt(inc,B,'warn',tacFlr(B,d.f)+'樓梯間防火門'+(g?'被拆除':'卡住常開'))}}
 if(d.t!=='auto')return;
 B.cd.delete(key);
 const o=B.fdO.get(key)||{h:new Set()};o.t=S.t;if(q.line)o.h.add(q.u);B.fdO.set(key,o)}
// 每秒：常開式防火門偵煙後關閉（少數故障）；通過後的常閉門自動關回；統計攻擊梯
function tacFDStep(inc,B,dt){
 B.fdT=(B.fdT||0)-dt;if(B.fdT>0)return;B.fdT=1;
 for(const[key,d]of B.fd){
  if(d.t==='mag'&&tacCel(B,d.f,d.o).s>.15){
   if(Math.random()<.85){d.t='auto';if(!B.fdO.has(key))B.cd.add(key)}else d.t='wedge'}}
 for(const[key,o]of B.fdO){const d=B.fd.get(key);if(!d||d.t!=='auto'){B.fdO.delete(key);continue}
  const hold=[...o.h].some(u=>{const q=B.sq.find(y=>y.u===u);return q&&q.line&&tacIn(q)&&!q.down});
  if(hold){if(!o.w){o.w=1;const q=B.sq.find(y=>o.h.has(y.u));
    radio(inc,q?q.cs:'安全官','水帶通過'+tacNm(B,d.f,d.s)+'防火門，門無法關閉，注意樓梯間進煙。')}continue}
  if(S.t-o.t>2){B.cd.add(key);B.fdO.delete(key)}}
 // 攻擊梯：有水線的入室小組所走的樓梯
 B.atkS=new Set();
 for(const q of B.sq)if(q.line&&tacIn(q)&&q.f>B.bf&&q.lent){const p=tacPath(B,tacEF(B,q.lent),q.lent.c,q.f,q.c);
  for(let i=1;i<p.length;i++)if(p[i][0]!==p[i-1][0]){B.atkS.add(p[i][1]);break}}}
// 門控關門：被拆除的防火門關不了；卡住或常開的防火門關上後恢復自動關閉
function tacFDClose(B,key){const d=B.fd.get(key);if(!d)return true;if(d.t==='gone')return false;d.t='auto';B.fdO.delete(key);return true}
// ===== 氣體偵測（五用氣體偵測器：O₂、LEL、CO、H₂S、HCN）=====
const TAC_GAS=[['o2','O₂','%'],['lel','LEL','%'],['co','CO','ppm'],['h2s','H₂S','ppm'],['hcn','HCN','ppm']];
// 合成材質多的空間燃燒時 HCN（氰化氫）較高
const TAC_HCNK={shelf:2,rack:2.2,bunk:1.8,park:2,stall:1.6,store:1.5,shop:1.4,food:1.3,machine:1.3,care:1.2,ward:1.2};
function tacGasRead(B,x){
 const k=x.ty==='room'?tacK(B,x.f,x.c):'',hf=TAC_HCNK[k]||1,sm=Math.max(0,(18-x.o2)/6);
 let lel=0,h2s=0;
 if(x.o2<15&&x.s>.55)lel+=(15-x.o2)*5+x.s*8; // 悶燒熱裂解產生的可燃氣體（爆燃前兆）
 if(x.li)lel+=x.h>.02||x.emb?18:6; // 鋰電池熱失控釋出氫氣等可燃氣體
 if(B.gasL&&B.gasL.t>0&&x.f===B.bf){const g=B.gasL.c;lel+=x.c===g?55:B.L.N[g].nb.includes(x.c)?28:x.ty==='hall'?10:0}
 if(B.gas!==undefined&&!B.gasX&&x.f===B.gasF&&x.c===B.gas&&x.h>.2)lel+=8; // 瓦斯桶受熱洩漏
 if(B.k==='chemfire'&&k==='machine')h2s+=4+x.h*30+x.s*10;
 if(B.chem&&x.cz>0){if(B.chem.fl)lel+=x.cz*(B.chem.lelk||70);if(B.chem.h2s)h2s+=x.cz*150}
 if(k==='park'||k==='mech')h2s+=x.s*3;
 const co=Math.min(1999,Math.round((x.s*700+x.h*1400)*(1+sm)+(B.chem&&B.chem.co?(x.cz||0)*2400:0)));
 const hcn=Math.min(99,Math.round((x.s*22+x.h*18)*hf*10)/10);
 return{o2:Math.round(x.o2*10)/10,lel:Math.min(100,Math.round(lel)),co,h2s:Math.round(h2s),hcn}}
// 警報值：O₂ <19.5%；LEL ≥10%；CO ≥35 ppm；H₂S ≥10 ppm；HCN ≥4.7 ppm
function tacGasBad(r){const b=[];if(r.o2<19.5)b.push('缺氧');if(r.lel>=10)b.push('可燃氣體');if(r.co>=35)b.push('CO');if(r.h2s>=10)b.push('H₂S');if(r.hcn>=4.7)b.push('HCN');return b}
const tacGasCol=(k,v)=>k==='o2'?(v<19.5||v>23.5?'#ff6a5a':'#9d9a92'):(k==='lel'?v>=10:k==='co'?v>=200:k==='h2s'?v>=10:v>=10)?'#ff6a5a':(k==='co'?v>=35:k==='hcn'?v>=4.7:false)?'#e9a13b':'#9d9a92';
function tacGasMeas(inc,B,q,x){
 const r=tacGasRead(B,x);x.gm=Object.assign({t:S.t},r);const bad=tacGasBad(r);
 radio(inc,q.cs,tacNm(B,x.f,x.c)+'氣體偵測：O₂ '+r.o2+'%、LEL '+r.lel+'%、CO '+r.co+' ppm、H₂S '+r.h2s+' ppm、HCN '+r.hcn+' ppm'+
  (r.lel>=10?'。可燃氣體超標，禁止開口與任何火源！':bad.length?'。'+bad.join('、')+'超標，全程著空氣呼吸器。':'，各項正常。')+tacCbMeas(B,q,x));
 tacEvt(inc,B,r.lel>=10?'danger':bad.length?'warn':'milestone',tacNm(B,x.f,x.c)+'氣體偵測'+(bad.length?'：'+bad.join('、')+'超標':'正常'),r.lel>=25)}
// 養護機構值班人員：每隔一段時間把起火層濃煙中的一名住民推床移到同層遠離火點、還沒有煙的房間（水平避難）；人員有限、濃煙太重就無法進行
function tacStaff(inc,B,dt){
 const S2=B.staff;if(!S2||S2.n<=0)return;
 S2.t-=dt;if(S2.t>0)return;S2.t=45/S2.n;
 const src=B.cells.filter(x=>x.ty==='room'&&x.vic>0&&x.s>.15&&x.s<.75&&x.h<.45).sort((a,b)=>b.s-a.s)[0];
 if(!src)return;
 const dst=B.cells.filter(x=>x.f===src.f&&x.ty==='room'&&x.c!==src.c&&x.s<.08&&x.h<.02&&tacPath(B,src.f,src.c,x.f,x.c).length).sort((a,b)=>tacGd(B,b.c,B.oc)-tacGd(B,a.c,B.oc))[0];
 if(!dst){S2.n--;radio(inc,'受理','機構人員回報同層已無安全區域，人員撤離。');return}
 src.vic--;dst.vic++;if(src.bedv>0){src.bedv--;dst.bedv=(dst.bedv||0)+1}dst.vh=Math.max(dst.vh,src.vh);dst.rep=1;
 radio(inc,'受理','機構護理人員將一名住民由'+tacNm(B,src.f,src.c)+'水平避難至'+tacNm(B,dst.f,dst.c)+'。');
 if(src.s>.5&&Math.random()<.3){S2.n--;radio(inc,'受理','一名機構人員吸入濃煙不適，退出避難作業。')}}
// ===== 交給轄區分隊善後 =====
// 主要目標達成後（B.hOK），留轄區（離現場最近的分隊）一輛幫浦車做殘火處理，其餘車輛返隊；照常結案與計分，畫面回到指揮中心
function tacHandoff(inc,B){
 if(!B.hOK||B.done)return;
 const on=S.units.filter(u=>u.inc===inc.id),wk=on.filter(u=>u.st==='work');
 const dist=u=>{const s=SPOT[u.si];return s?Math.hypot(s.p[0]-inc.x,s.p[1]-inc.y):1e9};
 const pumps=wk.filter(u=>CODE[u.code].cap&&u.code!=='61'&&!u.ma).sort((a,b)=>dist(a)-dist(b));
 const keep=pumps[0]||wk[0]||on[0];  // 還在路上的車也一併返隊
 for(const u of on){if(u===keep||u.load>0)continue;u.inc=null;home(u)}
 reindex();
 for(const x of B.cells){x.emb=0;x.pre=0;if(x.h<.1){x.h=0;x.ovh=1}}   // 餘燼與殘餘熱由轄區分隊處理
 B.handed=keep?keep.cs:'轄區分隊';B.doneT=3;
 radio(inc,'指揮官','火勢撲滅、人員都已處置，現場交由'+B.handed+'殘火處理善後，其餘車輛返隊。');
 tacEvt(inc,B,'milestone','交由 '+B.handed+' 善後');
 tacClose('現場交由'+B.handed+'善後，回到指揮中心')}
