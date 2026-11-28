// 車輛動態、進線案件、通聯紀錄、車輛資料、採購等面板 HTML
'use strict';
const fmt=s=>{s=Math.max(0,Math.round(s));
 return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')};
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
function leftHTML(){
 if(!leftOpen){let fr=0;for(let i=0;i<S.nst;i++)fr+=S.ix.idle[i];
  return '<div class="lcol"><button class="tg" data-lc="1" title="展開車輛動態" aria-label="展開車輛動態" aria-expanded="false">›</button><div class="lvt">車輛動態</div><div class="lid">'+fr+'/'+S.units.length+'</div></div>'}
 const out=['<div class="lhd"><span class="hd">車輛動態</span><button class="tg" data-lc="1" title="收合車輛動態" aria-label="收合車輛動態" aria-expanded="true">‹</button></div>'];
 for(let i=0;i<S.nst;i++){
  const us=S.ix.bySt[i].filter(u=>!u.ma&&!u.trainee),idle=S.ix.idle[i];
  out.push('<div class="stn"><span>'+(ST_FULL[SPOT[i].n]||SPOT[i].n)+' <b>'+idle+'/'+us.length+'</b></span>'+
   '<span class="mono" style="color:var(--fg3)">P'+tpFree(i)+'/'+S.tp[i]+'</span></div><div class="units">');
  for(const u of us){const st=ST[u.st];
   out.push('<div class="u'+(selU===u.id?' sel':'')+'" data-u="'+u.id+'"><span class="mono">'+u.cs+
    (u.mode?'<span style="color:var(--fg3)">'+(u.mode==='ALS'?'ᴀ':'ʙ')+'</span>':'')+
    '</span><span class="dot" style="background:'+st[1]+'" title="'+st[0]+'"></span></div>')}
  out.push('</div>')}
 // 消防學校訓練假想單位（訓中）
 {const us=S.units.filter(u=>u.trainee&&!u.gone);if(us.length){
  out.push('<div class="stn" style="color:#bfaaf0"><span>🎓 訓中（訓練） <b>'+us.length+'</b></span><span class="mono" style="color:var(--fg3)">菜鳥</span></div><div class="units">');
  for(const u of us){const st=ST[u.st];out.push('<div class="u'+(selU===u.id?' sel':'')+'" data-u="'+u.id+'"><span class="mono">'+u.cs+'</span><span class="dot" style="background:'+st[1]+'" title="'+st[0]+'"></span></div>')}
  out.push('</div>')}}
 // 跨縣市支援車隊另外分組
 for(const k in MA_DEF){const us=S.units.filter(u=>u.ma===k);if(!us.length)continue;
  out.push('<div class="stn" style="color:#9ab8e8"><span>'+maGrp(k)+' <b>'+us.filter(u=>u.st==='work').length+'/'+us.length+'</b></span><span class="mono" style="color:var(--fg3)">支援</span></div><div class="units">');
  for(const u of us){const st=ST[u.st];out.push('<div class="u'+(selU===u.id?' sel':'')+'" data-u="'+u.id+'"><span class="mono">'+u.cs+'</span><span class="dot" style="background:'+st[1]+'" title="'+st[0]+'"></span></div>')}
  out.push('</div>')}
 return out.join('')}
let callOrd=[],callOrdT=0,callsHover=false;
function callsHTML(){
 const out=['<div class="hd">進線案件 '+(S.inc.length+S.duties.length+(S.mr||[]).length)+'</div>'];
 if(!S.inc.length&&!S.duties.length)out.push('<div class="sub">目前無受理案件。</div>');
 // 依剩餘時間排序，但滑鼠停在列表上時凍結順序、平常每 2 秒才重排，避免點下去的瞬間換位
 const now=performance.now();
 if(!callsHover&&now-callOrdT>2000){callOrdT=now;callOrd=S.inc.slice().sort((a,b)=>a.left-b.left).map(i=>i.id)}
 const list=callOrd.map(id=>S.inc.find(i=>i.id===id)).filter(Boolean).concat(S.inc.filter(i=>callOrd.indexOf(i.id)<0));
 for(const i of list){
  const d=KIND[i.k],f=fill(i,0),got=f.reduce((a,b)=>a+b,0),tot=i.need.reduce((a,g)=>a+g.n,0);
  const urg=i.left/i.max<.35,col=i.rev?d.col:'#6b6960';
  out.push('<div class="call'+(sel===i.id?' sel':'')+(i.req?' pend':'')+'" data-sel="'+i.id+'" style="border-left-color:'+col+'">'+
   '<div class="row" style="padding:0"><span class="tag" style="background:'+col+';color:'+(i.rev?'#111110':'#eceae3')+'">'+
   (i.rev?(i.nm||d.n)+(i.pm.lvl>1?' '+['','一級','二級','三級','四級'][i.pm.lvl]+'火警':'')+(i.pm.trap?' 困'+i.pm.trap:''):d.cls+'類 · 待確認')+'</span>'+
   '<span class="mono" style="color:'+(urg?'var(--red)':'var(--fg2)')+'">'+(tacFrozen(i)?'⏸ ':'')+fmt(i.left)+'</span></div>'+
   '<div class="sub" style="margin-top:3px">'+esc(i.addr)+' · 同時 '+(i.calls||1)+' 通 · 編組 '+got+'/'+(i.rev?tot:'?')+
   (i.rev&&i.ph>=0?' · '+i.phs[i.ph]:'')+(i.req?' · <b class="pendb">⚑ 待回覆 '+Math.ceil(i.reqT)+' 秒</b>':'')+(KIND[i.k].pol&&i.pol<2?' · 待警方':'')+(KIND[i.k].pow&&i.pow<2?' · 待斷電':'')+
   (i.note?' · '+esc(i.note):'')+'</div></div>')}
 for(const r of S.mr||[])
  out.push('<div class="call'+(sel===r.id?' sel':'')+(r.sent?'':' pend')+'" data-sel="'+r.id+'" style="border-left-color:#7f77dd">'+
   '<div class="row" style="padding:0"><span class="tag" style="background:#7f77dd">跨縣市支援請求 · '+r.from+'</span>'+
   '<span class="mono" style="color:var(--fg2)">'+(r.sent?'支援中':'<b class="pendb">⚑ 待回覆</b> '+fmt(r.left))+'</span></div>'+
   '<div class="sub" style="margin-top:3px">'+r.n+' · 請求 '+r.need.map(g=>(g.c==='usar'?'USAR':LB[g.c]||g.c)+'×'+g.n).join('、')+' · 評鑑 +'+r.rep+'</div></div>');
 for(const d of S.duties)
  out.push('<div class="call'+(sel===d.id?' sel':'')+'" data-sel="'+d.id+'" style="border-left-color:var(--pur)">'+
   '<div class="row" style="padding:0"><span class="tag" style="background:var(--pur)">公務 · '+d.n+'</span>'+
   '<span class="mono" style="color:var(--fg2)">'+(d.unit?'執行中':fmt(d.left))+'</span></div>'+
   '<div class="sub" style="margin-top:3px">'+esc(d.addr)+' · 需 '+CODE[d.code].n+'</div></div>');
 return out.join('')}
function logHTML(inc){
 const el=S.t-inc.t0,vis=inc.log.filter(l=>l.t<=el).slice(-120);
 const out=[fh('log','通聯紀錄',1,' <span class="sub">共 '+vis.length+' 則</span>')+'<div class="talk" id="logbox">'];
 for(const l of vis){
  const col=l.w==='台'?'var(--fg3)':l.w==='場'?'var(--amb)':l.w==='警'?'var(--blu)':'var(--fg)';
  out.push('<div class="ln"><span class="who" style="color:'+col+'">'+
   (l.w==='台'?'受理':l.w==='場'?'現場':l.w==='警'?'警方':'報案')+'</span><span style="color:'+col+'">'+esc(l.s)+'</span></div>')}
 if(inc.log.some(l=>l.t>el))out.push('<div class="sub" style="padding-left:47px">通話中…</div>');
 const a=inc.ai;
 if(a&&a.busy)out.push('<div class="sub" style="padding-left:47px">報案人回應中…</div>');
 let chat='';
 if(a&&!a.fb){
  const live=aiLive(inc);
  chat='<div class="row" style="gap:6px;padding:6px 0 0"><input id="aiq" data-keep="'+inc.id+'" maxlength="120" autocomplete="off" placeholder="'+
   (live?'輸入要問報案人的話，按 Enter 送出':inc.rev?'通話已結束（消防人員已到場）':'通話已結束')+'"'+(live?'':' disabled')+'>'+
   '<button data-aisend="1" style="flex:none;white-space:nowrap"'+(live&&!a.busy?'':' disabled')+'>送出</button></div>'}
 return out.join('')+'</div>'+chat+'</div>'}
function unitHTML(u){
 const inc=S.inc.find(i=>i.id===u.inc),dy=S.duties.find(x=>x.id===u.duty);
 let h='<div class="hd">車輛資料</div><div class="mono" style="font-size:15px">'+u.cs+
  ' <span class="sub">'+CODE[u.code].n+' · '+(u.stn||stName(u)+'分隊')+'</span></div>';
 h+='<div class="sub" style="margin:6px 0">狀態：'+ST[u.st][0]+
  (u.turn>0?'（整裝中 '+Math.ceil(u.turn)+' 秒）':'')+
  (u.st==='oos'?'（'+Math.ceil(u.oosT)+' 秒後復歸）':'')+
  (u.mode?' · '+u.mode+' 編組 '+u.crew+' 人'+(u.tp?'、EMT-P 隨車':'、無 EMT-P'):'')+
  (inc?' · 執行 '+KIND[inc.k].n+' '+esc(inc.addr):'')+(dy?' · '+dy.n:'')+'</div>';
 if(CODE[u.code].cap)h+='<div class="sub">水箱 '+Math.round(u.tank)+' / '+CODE[u.code].cap+' L</div>';
 h+='<div class="hd mt">車上裝載</div><div class="chips">'+
  carries(u).map(x=>'<span class="tag" style="background:#2a2a27;color:#c9c6bd">'+x+'</span>').join('')+'</div>';
 h+='<div class="sub">'+(isBig(u.code)?'大型車：不可進入巷弄與山區產業道路':isBoat(u.code)?'救生艇：可於水域航行，也可經道路機動':'一般車：可進入巷弄與山區產業道路')+'</div>';
 h+='<div class="row">'+(u.st==='idle'?'<button data-oos="'+u.id+'">報停</button>':'')+
  (u.st==='oos'?'<button data-ret="'+u.id+'">復歸</button>':'')+'<button data-uc="1">關閉</button></div>';
 return h}
// 名冊（Roster）：高雄市政府消防局編組：局本部、特種搜救大隊、各救災救護大隊與所屬分隊、機場消防隊
function rosterHTML(){
 const chip=u=>{const st=ST[u.st];return'<span data-u="'+u.id+'" title="'+esc(LB[u.code]+' · '+st[0])+'"><i style="background:'+st[1]+'"></i><b class="mono">'+u.cs+'</b><em class="sub">'+LB[u.code]+'</em></span>'};
 const own=u=>!u.ma&&!u.trainee&&!u.gone;
 const row=(nm,us)=>'<div class="rs"><b>'+nm+' <span class="sub">'+us.filter(u=>u.st==='idle').length+'/'+us.length+'</span></b><div class="ru">'+us.map(chip).join('')+'</div></div>';
 const stUs=i=>S.ix.bySt[i].filter(u=>own(u)&&!u.hq);
 let h='<div class="row" style="padding:0"><span class="hd" style="margin:0">高雄市政府消防局 · 名冊 <span class="sub">共 '+S.units.filter(own).length+' 輛</span></span><button data-rosterclose="1">關閉</button></div>';
 const hq=S.units.filter(u=>own(u)&&u.hq);
 h+='<div class="rg">局本部 <span class="sub">與成功分隊同一廳舍辦公</span></div>'+row('局本部',hq);
 h+='<div class="rg">特種搜救大隊 <span class="sub">平時不出動一般救災救護，呼叫特一、特二時派遣</span></div>';
 for(const n of['特一','特二']){const i=SNAME.indexOf(n);if(i>=0&&i<S.nst)h+=row(ST_FULL[n]+'分隊',stUs(i))}
 const reg=[];for(let i=0;i<S.nst;i++)if(!/^特|^機場/.test(SPOT[i].n))reg.push(i);
 const mcv=S.units.filter(u=>u.brig).sort((a,b)=>a.brig-b.brig),grp=mcv.map(()=>[]);
 for(const i of reg){let b=0,bd=INF;mcv.forEach((m,k)=>{const d=Math.hypot(SPOT[m.si].p[0]-SPOT[i].p[0],SPOT[m.si].p[1]-SPOT[i].p[1]);if(d<bd){bd=d;b=k}});if(grp[b])grp[b].push(i)}
 mcv.forEach((m,k)=>{h+='<div class="rg">第'+BRIG_N[m.brig-1]+'救災救護大隊 <span class="sub">大隊行動指揮車 '+m.cs+'（駐 '+SPOT[m.si].n+'分隊）</span></div>';
  for(const i of grp[k])h+=row(ST_FULL[SPOT[i].n]||SPOT[i].n+'分隊',stUs(i))});
 const ap=SNAME.indexOf('機場');if(ap>=0&&ap<S.nst)h+='<div class="rg">機場消防隊 <span class="sub">民航局所屬，僅呼叫機場消防時協力出動</span></div>'+row('機場消防隊',stUs(ap));
 return h}
// 採購：依分隊類型列出可購車種（特搜沒有一般救護車；機場消防隊屬民航局，不在採購範圍）
const SHOP_REG=[['滅火',['11','16','57','61','21','31']],['救助',['71','43','艇','履']],['救護',['91']],['指揮與特種',['41','75','51','01','警']]];
const SHOP_USAR=[['滅火',['11','16']],['救助',['搜','71','43','履']],['救護',['99']],['指揮與特種',['41','75']]];
const shopOK=i=>SPOT[i]&&SPOT[i].n!=='機場';
const shopList=i=>/^特/.test(SPOT[i].n)?SHOP_USAR:SHOP_REG;
function shopHTML(){
 if(!shopOK(shopSt))shopSt=SPOT.findIndex((s,i)=>i<S.nst&&shopOK(i));
 const st=SPOT[shopSt],nm=ST_FULL[st.n]||st.n+'分隊',us=S.ix.bySt[shopSt]||[],cnt=c=>us.filter(u=>u.code===c).length;
 let h='<div class="row shophd"><span class="hd" style="margin:0">車輛採購 · 經費 <b class="mono">$'+S.money+'</b></span><button data-shopclose="1">關閉</button></div>';
 h+='<select id="selSt" style="margin:8px 0;width:100%">';
 for(let i=0;i<S.nst;i++)if(shopOK(i))h+='<option value="'+i+'"'+(i===shopSt?' selected':'')+'>'+(ST_FULL[SPOT[i].n]||SPOT[i].n+'分隊')+'（'+(S.ix.bySt[i]||[]).length+' 輛 · EMT-P '+S.tp[i]+' 人）</option>';
 h+='</select>';
 h+='<div class="sub" style="margin-bottom:6px">'+nm+'現有：'+(us.length?us.map(u=>u.cs).join('、'):'無')+'</div>';
 for(const[gn,cs]of shopList(shopSt)){h+='<div class="shopg">'+gn+'</div><div class="buy">';
  if(gn==='救護')h+='<button data-hire="1"'+(S.money<2500?' disabled':'')+'><b>高級救護技術員</b> <span class="sub">現有 '+S.tp[shopSt]+' 人</span><br><span class="sub">EMT-P 招募 · $2500</span></button>';
  for(const c of cs){const d=CODE[c];h+='<button data-buy="'+c+'"'+(S.money<d.c?' disabled title="經費不足"':'')+'><span class="mono">'+unitCsNext(shopSt,c)+'</span> <span class="sub">'+(cnt(c)?'現有 '+cnt(c):'新車種')+'</span><br>'+
   '<span class="sub">'+d.n+(d.cap?' '+d.cap+'L':'')+' · $'+d.c+'</span></button>'}
  h+='</div>'}
 if(S.nst<SPOT.length){const n2=SPOT[S.nst].n,rur=SABS[n2]||SABSN[n2];
  h+='<button data-newst="1" class="newst"'+(S.money<12000?' disabled':'')+'>增設 '+n2+'分隊 · $12000<br><span class="sub">附編幫浦車 3 輛（第一輛為 CAFS）、救護車 1 輛、指揮車 1 輛'+(rur?'、越野警備車 1 輛（鄉間分隊）':'')+'</span></button>'}
 return h}
