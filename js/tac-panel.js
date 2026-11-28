// 戰術指揮：面板 HTML（頂列、側欄、小組看板、指令列）
'use strict';
// 面板 HTML
function tacTopHTML(inc){
 const B=inc.tac,others=S.inc.filter(i=>i!==inc),wait=others.filter(i=>!onScene(i).length).length;
 let idle=0;for(const u of S.units)if(u.st==='idle')idle++;
 return '<b class="tt">⚔ 戰術指揮</b><span class="tadr" title="'+esc((inc.nm||KIND[inc.k].n)+' · '+inc.addr)+'">'+esc(inc.nm||KIND[inc.k].n)+' · '+esc(inc.addr)+'</span>'+
  '<span class="chip"><i>時</i><b>'+fmt(S.t)+'</b></span><span class="chip" title="自進入戰術指揮起經過的現實時間（換算）"><i>現場</i><b>'+fmt((S.t-(B.ti??(B.ti=S.t)))*TAC_RT)+'</b></span><span class="chip"><i>進度</i><b>'+Math.round(Math.min(1,inc.work/inc.dur)*100)+'%</b></span>'+
  '<span class="chip"><i>評鑑</i><b>'+Math.round(S.rep)+'</b></span>'+
  '<span class="strat">戰略 AI 代理中：其他案件 '+others.length+' 件'+(wait?'（待派 '+wait+'）':'')+' · 待命 '+idle+' 車</span>'+
  '<span class="sp"></span><span class="tmsg" title="'+esc(msg||'')+'">'+esc(msg||'')+'</span>'+
  '<span class="tspd" title="戰術畫面中 1 秒相當於現實幾秒（場內動作以約 1:10 模擬，倍率 0.3 即 1:3）">時間 1:'+TAC_SPDS.map(v=>'<button data-tspd="'+v+'"'+(Math.abs(TAC.spd-v)<.001?' class="on"':'')+'>'+Math.round(v*10)+'</button>').join('')+'</span>'+
  '<button data-tap="1"'+(TAC.autoPause?' class="on"':'')+' title="MAYDAY、閃燃、爆燃、結構警告等重大事件時自動暫停">事件暫停</button>'+
  '<span class="tspd">樓層 '+tacFlr(B,TAC.vf)+' <button data-tfl="1" title="上一層（]）">▲</button><button data-tfl="-1" title="下一層（[）">▼</button></span>'+
  '<button data-tpause="1">'+(paused?'繼續':'暫停')+'</button>'+
  (B.hOK&&!B.done?'<button data-thand="1" class="hand" title="火勢已撲滅、受困者與傷患都已處置：留轄區分隊一輛幫浦車殘火處理，其餘車輛返隊，回到指揮中心">交給轄區分隊善後</button>':'')+
  '<button data-texit="1">返回指揮中心（交由 AI 指揮）</button>'}
function tacSideHTML(inc){
 const B=inc.tac,L=tacCapAll(inc,B),used=B.sq.filter(q=>q.line).length;
 let unk=0;for(const x of B.cells)if(x.ty==='room'&&x.sl<1)unk++;
 let sumH=0;for(const x of B.cells)sumH+=x.h;
 const rit=B.sq.filter(q=>q.task==='rit'||q.task==='ritgo').map(q=>q.cs);
 // 精簡概況：一行
 const chip=(k,v,c)=>'<span class="tch"><i>'+k+'</i><b'+(c?' style="color:'+c+'"':'')+'>'+v+'</b></span>';
 let h='<div class="tstat">'+chip(B.hoax?'報案樓層':'起火',tacFlr(B,B.of))+chip('火勢',B.hoax?'無':Math.round(sumH/Math.max(.001,B.peak)*100)+'%')+
  chip('受困',B.vtot)+chip('救出',B.resc+(B.lost?' · 罹難 '+B.lost:''),B.lost?'var(--red)':'')+chip('未搜',unk+(B.out?' 區':' 室'))+
  chip('RIT',rit.length?rit.join('、'):'未編成',rit.length?'':'var(--amb)')+'</div>';
 h+=trainGoalsHTML(inc);
 h+=tacFinishHTML(inc,B);
 if(!tacAcc(B))h+='<div class="note">尚未設置人員管制板：看不到各組入室時間與氣量。開設指揮站並指派安全官後約 10 秒完成設置。</div>';
 if(B.mayday)h+='<div class="note" style="background:var(--red);color:#111">MAYDAY：'+B.sq.filter(q=>q.down).map(q=>q.cs+' '+tacFlr(B,q.f)).join('、')+'</div>';
 if(B.lodd)h+='<div class="note">殉職 '+B.lodd+' 組</div>';
 // ===== 分頁：概況 =====
 h+='\u0001ov';
 // 幕僚建議（有開設指揮站才有幕僚）
 const hs=tacHints(inc,B);
 h+='<div class="hd mt">幕僚建議</div>'+(hs?(hs.length?hs.map(x=>'<div class="thint">'+esc(x)+'</div>').join(''):'<div class="sub">目前沒有特別建議。</div>'):'<div class="sub" style="color:var(--fg3)">未開設指揮站，沒有幕僚提供建議。</div>');
 // 化學災害：化學品、洩漏、防護衣套數、除污站、化災應變隊
 const cap=tacPPECap(inc);
 if((B.chem&&!B.chem.nochem)||cap.A||B.sq.some(q=>q.epa)){const rw=(a,b)=>'<div class="row"><span>'+a+'</span><span>'+b+'</span></div>';
  h+='<div class="hd mt">化學災害</div><div class="twater">';
  if(B.chem)h+=rw('化學品',B.chemK?'<b>'+esc(B.chem.n)+'</b>（'+(B.chem.ppeN||(B.chem.fuel?'消防衣＋空氣呼吸器':['','C','B','A'][B.chem.lv]+' 級以上'))+'）':'<b style="color:#b9a0ee">未辨識</b>');
  if(B.leak)h+=rw('洩漏',B.leak.on?'<b style="color:var(--red)">持續外洩（'+esc(tacNm(B,B.leak.f,B.leak.c))+'）</b>':'已止漏');
  h+=rw('防護衣',cap.A||cap.B?'A 級 '+(cap.A-tacPPEUsed(B,'A'))+'/'+cap.A+'　B 級 '+(cap.B-tacPPEUsed(B,'B'))+'/'+cap.B+'　C 級 不限':'<span class="sub">無化災車（僅 C 級）</span>');
  if(B.chem&&!B.chem.fuel)h+=rw('除污站',B.st.decon?'已開設':'<span style="color:var(--amb)">未開設</span>'+(B.sq.some(q=>q.cont)?'（'+B.sq.filter(q=>q.cont).length+' 組待除污）':''));
  if(EPA_K(inc.k))h+=rw('環保署化災應變隊',!inc.epa?'<button data-tepa="1">請求支援</button>':inc.epa===1?'集結中 '+fmt(inc.epaT):inc.epa===2?'前往中 '+Math.ceil(inc.epaT)+' 秒':'<b style="color:var(--grn)">已到場</b>');
  if(B.wind&&!tacCbOn(B))h+=rw('風向',B.wind.nm);
  h+=tacCbHTML(inc,B);
  h+='</div>'}
 else if(B.wind)h+='<div class="hd mt">風向</div><div class="twater"><div class="row"><span>'+B.wind.nm+'</span><span class="sub">順風延燒快、會飛火</span></div>'+
  (B.wui?'<div class="row"><span>外圍山火'+(B.fside?'（'+TAC_SDN[B.fside]+'側）':'')+'</span><span>'+(B.wh>.05?'<b style="color:var(--red)">逼近中 '+Math.round(B.wh*100)+'%</b>':'已過境')+'</span></div><div class="row"><span>民宅</span><span>'+(B.homeLost?'<b style="color:var(--red)">燒毀 '+B.homeLost+' 棟</b>':'安全')+'</span></div>':'')+'</div>';
 // 結構與設施
 h+='<div class="hd mt">結構與設施</div><div class="twater">';
 if(!B.hoax){const dm=Math.min(1,B.dmg||0);h+='<div class="row"><span>結構受損（穩定度'+(inc.pm.stab||'—')+'）</span><span>'+Math.round(dm*100)+'% <span class="tbar"><i style="width:'+Math.round(dm*100)+'%;background:'+(dm>=.8?'var(--red)':dm>=.5?'var(--amb)':'var(--grn)')+'"></i></span></span></div>';
  if(B.cz)h+='<div class="row"><span>坍塌樓層</span><b style="color:var(--red)">'+[...B.cz].map(f=>tacFlr(B,f)).join('、')+'</b></div>'}
 if(B.spk)h+='<div class="row"><span>自動撒水設備</span><span>'+(!B.spk.ok?'<b style="color:var(--red)">未動作（關閉或故障）</b>':Object.keys(B.spk.fl).length?'<b style="color:#7db3e8">動作中：'+Object.keys(B.spk.fl).map(f=>tacFlr(B,+f)).join('、')+'</b>'+(B.sp&&!B.sp.on?'（送水口加壓可增強）':''):'待機')+'</span></div>';
 if(B.staff)h+='<div class="row"><span>機構人員</span><span>'+(B.staff.n>0?B.staff.n+' 名進行水平避難':'已撤離')+'</span></div>';
 if(B.gasL)h+='<div class="row"><span>瓦斯管線</span><span>'+(B.gasL.t>0?'<b style="color:var(--red)">持續供氣，欣高關閥約 '+Math.ceil(B.gasL.t)+' 秒</b>':'已關閥')+'</span></div>';
 if(B.rf)h+='<div class="row"><span>屋頂光電板</span><span>'+(B.rf.h>0?'<b style="color:var(--red)">燃燒 '+Math.round(B.rf.h*100)+'%</b>　'+(inc.pow>=2?'已斷電':'帶電中'):'已撲滅')+'</span></div>';
 if(B.ext)h+='<div class="row"><span>外牆室外機</span><span>'+(B.ext.h>0?'<b style="color:var(--red)">燃燒 '+Math.round(B.ext.h*100)+'%</b>（'+tacNm(B,B.ext.f,B.ext.c)+'窗外）':'已撲滅')+'</span></div>';
 if(B.fd&&B.fd.size){const kv=[...B.fd.values()].filter(d=>B.fdK.has(d.f)),bad=kv.filter(d=>d.t==='gone'||d.t==='wedge');
  h+='<div class="row"><span>'+(B.sc&&B.sc.k==='tunnel'?'逃生通道防火門':'樓梯間防火門')+'</span><span>'+(!kv.length?'未查明':bad.length?'<b style="color:var(--red)">'+[...new Set(bad.map(d=>tacFlr(B,d.f)))].join('、')+' 異常</b>':'已查 '+B.fdK.size+' 層正常')+'</span></div>'}
 if(B.elev)h+='<div class="row"><span>消防專用升降機</span><span>'+(B.elOn?'<b style="color:var(--grn)">消防模式運轉（至 '+tacFlr(B,Math.max(B.bf,tacElevTop(B)))+'）</b>':B.elT>0?'切換中…':'<button data-telev="1"'+(B.st.icp?'':' disabled title="需先開設指揮站"')+'>啟用</button>')+'</span></div>';
 h+=tacSysHTML(B);
 h+=tacSdbHTML(B);
 h+=tacSc4HTML(inc,B);h+=tacRescHTML(B);
 if(B.lift)h+='<div class="row"><span>電梯</span><span>'+(B.leak.on?'<b style="color:var(--red)">未斷電</b>（機房 '+tacNm(B,B.leak.f,B.leak.c)+'）':'已斷電、煞車鎖定')+'</span></div>';
 if(B.bv)h+='<div class="row"><span>'+B.bv.n+'壓力</span><span>'+(B.bv.boom?'<b style="color:var(--red)">已 BLEVE</b>':'<b style="color:'+(B.bv.p>.75?'var(--red)':B.bv.p>.5?'var(--amb)':'var(--grn)')+'">'+Math.round(B.bv.p*100)+'%</b>'+(B.bv.rel?'　安全閥起跳':'')+'　冷卻 '+(B.bv.cool||0).toFixed(1)+' 線')+'</span></div>';
 if(!B.out)h+='<div class="row"><span>屋頂出入口</span><span>'+(B.roof?'<b style="color:var(--amb)">開啟（樓梯間往上排煙）</b>':'關閉')+'</span></div>';
 if(B.fwd)h+='<div class="row"><span>前進指揮所</span><span>'+tacFlr(B,B.fwd.f)+' · '+(tacFwdOK(B)?'就位':'前往中')+' · 備用瓶 '+(B.st.air?'充填區供應':B.fwd.stock)+'</span></div>';
 h+='</div>';
 // 氣體偵測紀錄（最近 4 筆）
 {const gs=B.cells.filter(x=>x.gm).sort((a,b)=>b.gm.t-a.gm.t).slice(0,4);
  if(gs.length){h+='<div class="hd mt">氣體偵測</div>';for(const x of gs){const r=x.gm;
   h+='<div class="row" style="flex-wrap:wrap"><span>'+esc(tacNm(B,x.f,x.c))+'</span><span>'+TAC_GAS.map(k=>'<b style="color:'+tacGasCol(k[0],r[k[0]])+'">'+k[1]+' '+r[k[0]]+'</b>').join(' ')+'</span></div>'}}}
 // 請求增援
 if(maAny(inc)){h+='<div class="hd mt">跨縣市支援</div><div class="tords">'+Object.keys(MA_DEF).filter(k=>maOK(inc,k)).map(k=>{const D=MA_DEF[k],st=inc.ma&&inc.ma[k];
  return st?'<span class="sub">'+D.cs+'：'+(maStat(inc,k)||'已返隊')+'</span>':'<button data-tma="'+k+'" title="'+D.fx+'"'+(S.rep-D.cost<5?' disabled':'')+'>'+D.cs+'（評鑑 -'+D.cost+'）</button>'}).join('')+'</div>'}
 h+='<div class="hd mt">請求增援</div><div class="tords">'+TAC_REQ.map(r=>{const n=S.units.filter(u=>u.st==='idle'&&r[2].indexOf(u.code)>=0).length;
  return'<button data-treq="'+r[0]+'"'+(n?'':' disabled')+'>'+r[1]+' <span class="sub">'+n+'</span></button>'}).join('')+'</div>';
 // 現場民眾
 // 現場民眾：對談紀錄（進場時民眾先描述火場基本狀況），下方為還沒問過的問題
 if(B.civ&&(tacCivOn(B)||B.civ.log)){if(tacCivOn(B))tacCivOpen(inc,B);
  h+='<div class="hd mt">現場'+tacCivWho(inc)+(tacCivOn(B)?'（'+B.civ.n+' 人，可詢問屋內資訊）':'（已離開）')+'</div><div class="civlog">';
  for(const l of(B.civ.log||[]).slice().reverse())h+='<div class="'+(l.w==='民'?'cm':'cf')+'"><b>'+(l.w==='民'?tacCivWho(inc):'指揮官')+'</b>'+esc(l.s)+'</div>';
  h+='</div>';
  if(tacCivOn(B)&&TAC_ASK.some(a=>!B.civ.asked[a.k]))h+='<div class="sub">指揮官持續詢問中…</div>'}
 // ===== 分頁：水線 =====
 h+='\u0001wt';
 // 水源與水線
 const tp=tankPool(inc),inflow=Math.round(inflowOf(inc)),flowing=B.sq.filter(q=>q.line&&q.pf>0&&!(q.burst>0));
 const use=flowing.length*LPS,hydU=B.hyd&&B.sq.find(q=>q.ty==='pump'&&q.tside===B.hyd.side&&!q.tmv);
 const bar=(v,c)=>'<span class="tbar"><i style="width:'+Math.round(Math.max(0,Math.min(1,v))*100)+'%;background:'+c+'"></i></span>';
 h+='<div class="hd mt">水源與水線</div><div class="twater">';
 h+='<div class="row"><span>水源</span><span>'+(B.hyd?tacHydN(B)+' '+TAC_SDN[B.hyd.side]+'側 '+B.hyd.d+' m · '+(hydU?'<b style="color:var(--grn)">'+hydU.cs+(B.hyd.draft?' 吸水':' 佔水')+'</b>':'<b style="color:var(--red)">未佔水，只能用水箱</b>')
  :inc.shuttle?'無消防栓，幫浦車輪流補水':inc.tender?'無消防栓，水庫車循環送水':'—')+'</span></div>';
 h+=tenderHTML(inc);
 h+='<div class="row"><span>供水／用水</span><span>'+inflow+' / '+use+' L/s '+bar(inflow?use/inflow:use?1:0,use>inflow?'var(--red)':'var(--blu)')+'</span></div>';
 if(tp[1])h+='<div class="row"><span>車上水箱</span><span>'+Math.round(tp[0]/tp[1]*100)+'% '+bar(tp[0]/tp[1],tp[0]/tp[1]<.25?'var(--red)':'var(--blu)')+'</span></div>';
 if(B.sp)h+='<div class="row"><span>送水口</span><span>'+TAC_SDN[B.sp.side]+'側 '+(B.sp.on?'<b style="color:var(--grn)">加壓中</b>':'未接')+'</span></div>';
 h+='<div class="row"><span>水線</span><span>出水 '+flowing.length+' · 佈設 '+used+' / 可用 '+L+' 線</span></div>';
 const ls=B.sq.filter(q=>q.ty!=='ladder'&&(q.line||TAC_WET[q.task]));
 for(const q of ls){const st=q.burst>0?['燒破','var(--red)']:!q.line?['扁帶・未分到水','var(--fg3)']:q.pf<=0?['扁帶・無壓','var(--fg3)']:[Math.round(q.pf*100)+'%',q.pf>=.7?'var(--blu)':q.pf>=.4?'var(--amb)':'var(--red)'];
  h+='<div class="tline"><b class="mono">'+q.cs+'</b><span class="sub">'+(q.src==='sp'&&q.line?'連結送水管':(q.task==='cover'?'鄰棟周界防護':'自 '+((B.sq.find(x=>x.u===q.lu)||q).cs)+((q.lent||q.inEnt)?' · '+TAC_SDN[(q.lent||q.inEnt).side]+'側入口':'')))+(q.line?' · '+q.len+' 條':'')+(q.line&&q.fs<.97?' · <b style="color:var(--amb)">分流 '+Math.round(q.fs*100)+'%</b>':'')+'</span>'+
   '<span>'+bar(q.line?q.pf:0,st[1])+' <b style="color:'+st[1]+'">'+st[0]+'</b></span>'+tacLineWhy(inc,B,q,L)+'</div>'}
 h+='</div>';
 // ===== 分頁：ICS（救護與編組） =====
 h+='\u0001ics';
 // 傷患集結與後送
 const cnt={red:0,yellow:0,green:0};for(const p of B.pts)cnt[p.sev]++;
 const amb=onScene(inc).filter(u=>u.code==='91'&&u.st==='work'),ambF=tacAmbFree(inc,B);
 h+='<div class="hd mt">傷患集結與後送</div><div class="row" style="padding:2px 0;flex-wrap:wrap;gap:6px"><span>'+
  '<span class="tag" style="background:var(--red)">紅 '+cnt.red+'</span> <span class="tag" style="background:var(--amb)">黃 '+cnt.yellow+'</span> <span class="tag" style="background:var(--grn)">綠 '+cnt.green+'</span></span>'+
  '<span class="sub">救護車 可用 '+ambF+' / 在場 '+amb.length+' · 已送醫 '+B.tx+'</span>'+
  '<button data-tamb="1"'+(inc.req?' disabled':'')+'>請求救護車</button></div>';
 if(B.pts.length&&!ambF)h+='<div class="sub" style="color:var(--red)">傷患在現場等待後送，傷勢持續惡化！</div>';
 // ICS 架構圖：指揮站、幕僚（安全官、聯訪處）、作業組、後勤組、救護組；每個方塊可開關（站點開設／撤除、職務指派／解除）
 h+=tacIcsHTML(inc,B);
 // ===== 分頁：無線電（含周邊） =====
 h+='\u0001rd';
 // 周邊：一行
 h+='<div class="hd mt">周邊</div><div class="sub">'+TAC_SIDES.map(x=>{const d=B.sd[x];
  return TAC_SDN[x]+' '+(d.road?d.nm+(d.big?'':'（大型車禁入）'):d.nm)+(B.exp[x]!==undefined?(B.expL[x]?'<b style="color:var(--red)"> 已延燒</b>':' 受熱 '+Math.round(B.exp[x]*100)+'%'+(B.sq.some(q=>q.task==='cover'&&q.cside===x)?'・防護中':'')):'')}).join('　')+'</div>';
 h+='<div class="hd mt">無線電</div><div class="tlog">';
 for(const l of inc.log.slice(-30).reverse())h+='<div class="'+(l.w==='台'?'lt':l.w==='民'?'lm':'lf')+'">'+esc(l.s)+'</div>';
 h+='</div>';
 // 組合分頁：上方概況列固定，下方依分頁顯示
 const parts=h.split('\u0001'),tab={};for(const p of parts.slice(1)){const k=p.match(/^(ov|wt|ics|rd)/)[1];tab[k]=p.slice(k.length)}
 const flow=B.sq.filter(q=>q.line&&q.pf>0).length,slots=tacRoleSlots(inc,B),ru=Object.values(B.role).filter(Boolean).length;
 const TABS=[['ov','概況',hs&&hs.length?hs.length:''],['wt','水線',flow+'/'+L],['ics','ICS',Object.keys(B.st).filter(k=>B.st[k]).length+(slots?' · '+ru+'/'+slots:'')],['rd','無線電','']];
 const cur=TAC.tab||'ov';
 return parts[0]+'<div class="ttabs">'+TABS.map(t=>'<button data-ttab="'+t[0]+'"'+(cur===t[0]?' class="on"':'')+'>'+t[1]+(t[2]!==''?'<i>'+t[2]+'</i>':'')+'</button>').join('')+'</div><div class="ttabc">'+(tab[cur]||'')+'</div>'}
// 管制牌看板：依狀態分欄（入室作業、屋外勤務、RIT、換瓶休息、待命、站點後勤）
function tacCat(q){
 if(q.task==='station'||q.task==='fwdgo')return'stn';
 if(q.down||tacIn(q))return'in';
 if(q.task==='rit'||q.task==='ritgo')return'rit';
 if(q.ty!=='ladder'&&q.ty!=='robot'&&(q.refill||q.prev||q.air<1||(q.fat>.5&&q.task==='idle')))return'rest';
 if(q.task==='idle'&&!q.tmv)return'idle';
 return'out'}
const TAC_COLS=[['in','入室作業'],['out','屋外勤務'],['rit','RIT'],['rest','換瓶・休息'],['idle','待命'],['stn','站點・後勤']];
// 單位看板：攜帶水線（瞄子）
function tacNoz(B,q){
 if(q.ty==='ladder')return q.task==='master'&&q.line?'雲梯瞄子':'無';
 if(q.task==='sky')return'車頂砲塔（朝天瞄）';
 if(q.ty==='pump'&&(q.line||TAC_WET[q.task])){
  const foam=q.code==='57'||q.code==='01'||q.cafs;
  if(foam&&q.f>=0&&tacCel(B,q.f,q.c).fuel)return'泡沫瞄';
  return q.task==='trans'||q.task==='cover'||q.task==='guard'||B.out||q.code==='57'?'2.5 吋瞄子':'1.5 吋瞄子'}
 if(q.ty==='pump'||q.ty==='resc'||q.ty==='crew'||q.ty==='vent')return q.ty==='pump'?'無':'滅火器';
 return'無'}
// 單位看板：攜帶裝備（依車輛器材與目前任務）
const TAC_PORT=[['TIC 熱顯像儀','TIC'],['RIT 快速救援包','RIT 包'],['破壞器材組','破門器具'],['三用敲棒','三用敲棒'],['油壓剪','油壓剪'],['照明索','照明索'],['四用氣體偵測器','氣體偵測器'],['正壓排煙機','送風機'],['負壓排煙機與排煙管','排風機'],['SKED 軟式擔架','SKED 擔架'],['生命探測器','生命探測器']];
function tacGear(B,q){
 if(q.ty==='ladder'||q.ty==='robot')return'';
 const eq=EQ[q.code]||[],g=[];
 for(const [k,n] of TAC_PORT){if(!eq.includes(k))continue;
  if(n==='RIT 包'&&!(q.task==='rit'||q.task==='ritgo'))continue;
  if((n==='送風機'&&!(B.ppv&&q.task==='ppv'))||(n==='排風機'&&q.task!=='npv'))continue;
  if((n==='生命探測器'||n==='SKED 擔架')&&!(q.task==='search'||q.task==='search2'||q.carry))continue;
  if(n==='油壓剪'&&q.task!=='force'&&q.task!=='dctrl')continue;
  g.push(n)}
 if(q.task==='gas'&&!g.includes('氣體偵測器'))g.push('氣體偵測器');
 if(tacTIC(q)&&!g.includes('TIC'))g.unshift('TIC');
 if(!tacTIC(q))g.push('無 TIC');
 if(q.vol)g.push('手電筒');
 return g.join('、')||'—'}
// 單位看板：現行動作（括號內）
function tacDoing(B,q){
 if(q.down)return'';
 if(q.tmv)return'移車中';if(q.mkT>0)return'接上肺力閥中';if(q.refill==='none')return'沒有備用氣瓶，等救助車（71）開設充填區';if(q.refill)return'換瓶中';if(q.task==='dress')return'換裝中';
 if(!tacReady(q))return q.off?'整裝、交 passkey 中':'整裝中';
 if(q.task==='idle')return q.f>=0?'原地待命':'';
 if(q.task==='exit')return q.f>=0?(q.nf!==q.f&&q.mt?'下樓梯中':'撤出中'):'';
 if(q.carry)return q.nf!==q.f&&q.mt?'搬運下樓中':'搬運中';
 if(q.task==='veis')return tacVeisDoing(q);
 if(q.dpK)return q.line&&q.pf>0?'門控：開關門脈衝射水（第 '+(q.dpN+1)+' 輪）':'門控：開門觀察煙況';
 const at=q.f>=0&&q.f===q.tf&&q.c===q.tc;
 if(q.task==='sky'||q.task==='trans'||q.task==='cover'||(q.ty==='ladder'&&q.task==='master'))return q.line&&q.pf>0?'射水中':'等待出水';
 if(q.ty==='ladder')return q.ext<1?'架設雲梯中':'作業中';
 if((q.task==='force'||q.task==='dctrl')&&q.f<0)return q.frc>0||q.wk>0?'破壞中':q.side===q.dside?'控門中':'前往入口';
 if(q.tf>=0&&!at){if(q.f<0)return q.line?'延伸水線、前往入口':'前往入口';
  return q.mt&&q.nf!==q.f?'爬樓梯中':q.frc>0?'破門中':'移動中'}
 const D={attack:q.line&&q.pf>0?'射水中':'等待出水',hold:'守線中',confine:q.line&&q.pf>0?'射水降溫中':'等待出水',guard:'射水中',
  search:'搜索中',search2:'搜索中',overhaul:'翻搜中',force:'破壞中',dctrl:q.dcd?'控門中':'關門中',vent:'破窗中',npv:'排煙中',hydro:'排煙中',
  gas:'偵測中',shore:'支撐中',relay:'中繼送水中',rit:'待命中',ritgo:'救援中',vvent:'開孔中',stand:'加壓中',fwdgo:'設置中',fwdref:'換瓶休息中',station:'駐守中',roofres:'救援中',ident:'偵檢中',plug:'止漏中'};
 return D[q.task]||'作業中'}
function tacTagHTML(inc,B,q,i){
 const acc=tacAcc(B),inT=tacIn(q)&&q.inT?S.t-q.inT:0;
 const dn=tacDoing(B,q),task=q.down?'倒地待救（MAYDAY）':(q.task==='idle'?'待命':q.task==='station'?tacStnDef(q.stn).n:tacTN(B,q.task)||q.task)+(q.prev?'（換瓶後續行）':dn?'（'+dn+'）':'');
 const noz=tacNoz(B,q),gear=tacGear(B,q),sk=tacSk(q);
 const offS=TAC.off&&TAC.off.some(o=>o.u.id===q.u);
 const loc=offS&&!tacIn(q)&&(q.task==='idle'||q.ty==='pump')?'已抵達（畫面外）':q.ty==='ladder'&&q.lf!==undefined&&q.task!=='idle'?'雲梯→'+tacNm(B,q.lf,q.lc):tacIn(q)?tacNm(B,q.f,q.c):(q.ty==='pump'||q.ty==='ladder'?(q.tmv?'移車往'+TAC_SDN[q.tgt]+'側':TAC_SDN[q.tside]+'側'):'屋外');
 let air='';
 if(q.ty!=='robot'&&q.ty!=='ladder'&&tacIn(q)&&!q.mk&&!B.wild)air='<span class="sub" title="在安全區，尚未接上肺力閥，不耗氣">面罩未接</span>';
 else if(q.ty!=='robot'&&q.ty!=='ladder')air=acc?'<span class="tbar"><i style="width:'+Math.round(q.air*100)+'%;background:'+(q.air<.33?'var(--red)':q.air<.5?'var(--amb)':'var(--grn)')+'"></i></span>':'<span class="sub">氣量 ？</span>';
 if(acc&&q.mk&&tacIn(q)&&q.airK>1.3)air+='<span class="sub" style="color:var(--amb)" title="高溫、破門、爬樓梯、搬運等負荷讓耗氣變快">耗氣×'+q.airK.toFixed(1)+'</span>';
 return'<div class="mtag ty-'+q.ty+(q.vol?(q.sk==='volp'?' volp':' vol'):'')+(q.u===TAC.sq||TAC.ms.indexOf(q.u)>=0?' sel':'')+(q.down?' dn':'')+(q.task==='idle'&&S.t-(q.seen||0)<15?' new':'')+'" data-tsq="'+q.u+'">'+
  '<div class="mh"><b>'+(i<9?(i+1)+' ':'')+q.cs+'</b><span>'+(B.sop&&!q.pc?'<i class="ppe sopb" title="依標準作業（SOP）自動行動；你一下令就歸你指揮">SOP</i>':'')+(q.cafs?'<i class="ppe" style="background:#2a6a5a" title="CAFS：可打泡沫瞄，對油火有效、對一般火效果較好">CAFS</i>':'')+(q.ppe&&q.ppe!=='F'&&!q.sdb?'<i class="ppe">'+TAC_PPE[q.ppe].n+'</i>':'')+(q.cont?'<i class="ppe cont">污染</i>':'')+(q.ma?'<i class="ppe" style="background:#3d5a80">'+maGrp(q.ma).replace(/市消防局|縣消防局/,'')+'</i>':'')+(q.usar?'<i class="ppe" style="background:#6a4a9a">特搜</i>':q.sk&&q.sk!=='reg'||q.rookie?'<i class="ppe" style="background:'+(q.sk==='volp'?'#5a7a3a':'#7a6a3a')+'">'+sk.n+'</i>':'')+(TAC_TYN[q.ty]||'')+' '+q.n+'人</span></div>'+
  '<div class="mb"><div><span class="sub">任務</span> '+task+(q.line?' 💧'+(q.burst>0?'燒破':Math.round(q.pf*100)+'%'):'')+'</div>'+
  (q.ty!=='robot'?'<div class="mg"><span class="sub">水線</span> '+noz+(gear?'　<span class="sub">裝備</span> '+gear:'')+'</div>':'')+
  '<div class="mf"><span class="sub">'+loc+'</span>'+(inT&&acc?'<span class="sub">入室 '+fmt(inT)+'</span>':'')+air+(q.ty!=='robot'&&q.ty!=='ladder'&&q.fat>.4?'<span class="sub" style="color:'+(q.fat>.7?'var(--red)':'var(--amb)')+'">疲勞 '+Math.round(q.fat*100)+'%</span>':'')+'</div></div></div>'}
// 指令能否下給這一組：回傳不可執行的原因（'' 表示可以）；需點目標的指令只看小組本身，目標相關的限制等點了再判斷
function tacOrdWhy(B,q,k){
 if(/^ppe/.test(k))return q.ty==='ladder'||q.ty==='robot'?'此組不需換裝':tacIn(q)?'人員在室內，需先撤出才能換裝':q.down?'該組已倒地':'';
 if(k==='dcool')return q.ty!=='pump'?'門控冷卻需要幫浦組（帶水線）':q.vol?'義消徒步到場、沒有車輛水線':tacRefuse(B,q,k);
 if(k==='veis')return q.ty==='robot'?'機器人無法執行':q.sdb?'自衛消防編組不執行入室搜救':q.sk==='vol'?'拒絕：義消（一般）不執行入室搜救（可改派義消+或正職）':tacIn(q)?'人員要在屋外（由窗口進入）':B.out?'室外場景不適用':'';
 const t=TAC_NEEDT[k],pr=(B.L.N.find(n=>n.ty==='room'&&n.wins&&n.wins.some(w=>B.sd[w].road))||B.L.N.find(n=>n.ty==='room')).c;
 const why=k==='truck'?tacCan(B,q,'truck'):k==='roofres'||k==='roof'?tacCan(B,q,k,B.F-1,0):tacCan(B,q,k,t?B.bf:-1,t?pr:0);
 return why&&!(t&&/高度|道路|窗|地下|樓梯|搜索|頂樓|房間|請點/.test(why))?why:tacRefuse(B,q,k)}
// 水線下方一行：供水車 出水 N kg/cm²（影響原因）
function tacLineWhy(inc,B,q,L){
 const sup=q.src==='sp'?'連結送水管':(B.sq.find(x=>x.u===q.lu)||q).cs;
 if(!q.line)return'<div class="tlr"><i>未分到水：可用 '+L+' 線已用完（增加幫浦車或接水源）</i></div>';
 const base=q.task==='trans'||q.task==='cover'||q.task==='guard'?5:7,wo=waterOK(inc);
 const kg=wo?Math.round(base*Math.max(0,q.pf)*10)/10:0;
 const why=(q.pfR||[]).map(r=>r[0]);if(!wo)why.unshift('水源見底，射水中斷');
 return'<div class="tlr">'+esc(sup)+' 出水 <b>'+kg+'</b> kg/cm²（'+(why.length?why.map(w=>/−|見底|燒破|沒有|未接/.test(w)?'<i>'+esc(w)+'</i>':esc(w)).join('、'):'正常')+'）</div>'}
// 指令說明拆成欄位：可執行／目標／效果／注意
function tacDescF(d){const p=d.split('｜');return p.length<3?{fx:d}:{who:p[0],tgt:p[1],fx:p[2],note:p[3]||''}}
// 指令面板：上方說明列（選取的小組、滑過或選定的指令說明與不可執行原因），下方依類別分組的按鈕
function tacCmdHTML(inc,B){
 const qs=tacSelList(B),hzOn=!!B.chem||tacPPECap(inc).A>0||B.sq.some(q=>q.epa||q.ty==='hazmat');
 const why={};TAC.cwhy=why;
 const btn=o=>{const k=o[0],t=TAC_NEEDT[k],on2=B.out&&TAC_OUTN[k];
  let ok=0,r='';for(const q of qs){const w=tacOrdWhy(B,q,k);if(!w)ok++;else if(!r)r=(qs.length>1?q.cs+'：':'')+w}
  if(!qs.length)r='請先選擇小組';if(!ok)why[k]=r;
  const cls=(TAC.ord===k?'on ':'')+(ok?'':'dis ')+(t?'otg':'onw');
  return'<button data-tord="'+k+'" class="'+cls+'"><i class="emo">'+(TAC_EMO[k]||'')+'</i>'+(on2?on2[0]:o[1])+
   (qs.length>1&&ok&&ok<qs.length?' <i class="cnt">'+ok+'/'+qs.length+'</i>':'')+(o[2]?' <span class="key">'+o[2]+'</span>':'')+'</button>'};
 let h='<div class="tgrps">';
 for(const gp of TAC_GRP){if((gp[0]==='化災'&&!hzOn)||(gp[0]==='野火'&&!B.wild))continue;
  h+='<div class="tgrp"><span class="tgl">'+gp[0]+'</span>'+gp[1].map(btn).join('')+'</div>'}
 return'<div class="tinfo">'+tacCmdInfo(B,qs,why)+'</div>'+h+'</div>'}
function tacGlobHTML(inc,B){let h='';
 h+='<div class="tgrp tglob"><span class="tgl" title="小組自行開門（上鎖或關著的門、入口）時的方式：破壞進入快，但門的開關不受控制，悶燒缺氧的空間容易爆燃；門控進入在門口反覆開關門、短促射水冷卻後才進去，較慢，但不容易爆燃">ROE</span>'+
  ['force','dctrl'].map(r=>'<button data-troe="'+r+'"'+((B.roe||'force')===r?' class="on"':'')+'>'+(r==='force'?'🪓 破壞':'🚪 門控')+'</button>').join('')+
  '<button data-tsop="1"'+(tacSopOn(inc,B)?' class="on"':'')+' title="到場標準作業：沒被你下過令的小組依標準作業自動行動（攻擊、佔水、搜索、編 RIT…）；你一下令該組就歸你指揮，待命 30 秒後交回 SOP">🤖 SOP '+(B.sop?'開':'關')+'</button>'+
  '<button data-tord="evac" class="evac" title="所有入室小組立即撤出建物，人員清點">⚠ 全員撤出</button></div>';
 return h}
function tacCmdInfo(B,qs,why){
 const k=TAC.hord&&TAC.hord!=='evac'?TAC.hord:TAC.ord,o=k&&TAC_ORD.find(x=>x[0]===k);
 let sel;
 if(!qs.length)sel='<span class="sub">未選小組</span>';
 else if(qs.length===1){const q=qs[0];sel='<b>'+q.cs+'</b> <span class="sub">'+(TAC_TYN[q.ty]||'')+' '+q.n+'人</span>'}
 else sel='<b>'+qs.length+' 組</b> <span class="sub">'+qs.slice(0,4).map(q=>q.cs).join('、')+(qs.length>4?'…':'')+'</span>';
 sel='<div class="tisel">'+sel+'</div>';
 if(!o){
  const tip=!qs.length?'先選小組：點看板上的牌、畫面上的人員或按 1–9；拖曳可框選多組':
   TAC.hord==='evac'?'⚠ 全員撤出：所有入室小組立即撤出建物，人員清點':
   '點下方指令；<b class="otg">◎</b> 需再點畫面目標，<b class="onw">⚡</b> 立即執行。也可直接右鍵點畫面，使用該處的預設任務';
  let sg='';if(qs.length===1&&qs[0].task==='idle'){const ic=S.inc.find(i=>i.id===TAC.id),s=ic&&tacSuggest(ic,B,qs[0]);if(s)sg=' <button data-tsug="1" class="sugb">💡 建議：'+esc(s[3])+'</button>'}
  return sel+'<div class="tidesc"><span class="sub">'+tip+'</span>'+sg+'</div>'}
 const on2=B.out&&TAC_OUTN[k],d=tacDescF(on2?on2[1]:o[3]),f=(l,v)=>v?'<span><i>'+l+'</i>'+esc(v)+'</span>':'';
 const head=(TAC.ord===k&&!TAC.hord?'<b class="go">▶ 請點畫面上的目標（Esc 取消）</b>':'')+'<b>'+(TAC_EMO[k]||'')+' '+(on2?on2[0]:o[1])+'</b>'+(o[2]?' <span class="key">'+o[2]+'</span>':'')+
  ' <span class="sub">'+(TAC_NEEDT[k]?'◎ 需點目標':'⚡ 立即執行')+'</span>';
 return sel+'<div class="tidesc"><div class="tih">'+head+(why[k]?'<span class="no">✕ '+esc(why[k])+'</span>':'')+'</div><div class="tif">'+f('可執行',d.who)+f('目標',d.tgt)+f('效果',d.fx)+f('注意',d.note)+'</div></div>'}
function tacBotHTML(inc){
 const B=inc.tac,sq=B.sq.find(q=>q.u===TAC.sq);
 // 沒有小組的欄位縮窄，讓有小組的欄位寬一點
 const cols=TAC_COLS.map(c=>[c,B.sq.map((q,i)=>[q,i]).filter(x=>tacCat(x[0])===c[0])]);
 const idle=tacIdleQ(inc,B),sop=tacSopOn(inc,B),nS=B.sq.filter(q=>!q.pc).length;
 let h='<div class="tbhd">'+(idle.length?'<button data-tidle="1" class="pendq" title="依序選取在屋外待命、等你下令的小組">⚑ 待分派 '+idle.length+' 組</button><button data-tsugall="1" title="每組套用畫面建議的任務">💡 全部套用建議</button>':'<span class="sub">沒有待分派的小組</span>')+
  '<span class="sub">'+(sop?'🤖 SOP 自動：'+nS+' 組 · 你指揮：'+(B.sq.length-nS)+' 組':'🤖 SOP 關閉：全部由你指揮')+'</span><span class="sp"></span>'+tacGlobHTML(inc,B)+'<button data-tbmin="1">'+(TAC.bmin?'▴ 展開看板':'▾ 收合看板')+'</button></div>';
 if(TAC.bmin){h+='<div class="tbmini">'+B.sq.map((q,i)=>'<span class="mchip ty-'+q.ty+(q.u===TAC.sq||TAC.ms.indexOf(q.u)>=0?' sel':'')+(q.down?' dn':'')+(q.task==='idle'&&S.t-(q.seen||0)<15?' new':'')+'" data-tsq="'+q.u+'"><b>'+(i<9?(i+1)+' ':'')+q.cs+'</b> '+esc(q.down?'MAYDAY':q.task==='idle'?'待命':(tacTN(B,q.task)||q.task))+(sop&&!q.pc?' <i>SOP</i>':'')+'</span>').join('')+'</div>'}
 else{h+='<div class="tboard" style="--cols:'+cols.map(x=>x[1].length?'minmax(0,'+Math.min(3,1+x[1].length*.25)+'fr)':'72px').join(' ')+'">';
 for(const [c,qs] of cols){
  if(c[0]==='in')qs.sort((a,b)=>(b[0].down-a[0].down)||(b[0].f-a[0].f));
  h+='<div class="tcol c-'+c[0]+(qs.length?'':' empty')+'"><div class="tch2">'+c[1]+' <span>'+qs.length+'</span></div><div class="tcards">'+qs.map(x=>tacTagHTML(inc,B,x[0],x[1])).join('')+'</div></div>'}
 h+='</div>'}
 if(!B.sq.length)h+='<div class="sub">尚無可編組的小組到場（幫浦、雲梯、救助、排煙、機器人）。</div>';
 h+=tacCmdHTML(inc,B);
 return h}
function tacUI(){
 const inc=S.inc.find(i=>i.id===TAC.id);if(!inc||!inc.tac)return;
 const a=tacTopHTML(inc),b=tacSideHTML(inc),c=tacBotHTML(inc);
 if(a!==tTopH){tTopH=a;morph($('tacTop'),a)}
 if(b!==tSideH){tSideH=b;morph($('tacSide'),b)}
 if(c!==tBotH){tBotH=c;morph($('tacBot'),c)}}
