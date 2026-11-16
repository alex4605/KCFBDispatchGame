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
  const us=S.ix.bySt[i],idle=S.ix.idle[i];
  out.push('<div class="stn"><span>'+SPOT[i].n+' <b>'+idle+'/'+us.length+'</b></span>'+
   '<span class="mono" style="color:var(--fg3)">P'+tpFree(i)+'/'+S.tp[i]+'</span></div><div class="units">');
  for(const u of us){const st=ST[u.st];
   out.push('<div class="u'+(selU===u.id?' sel':'')+'" data-u="'+u.id+'"><span class="mono">'+u.cs+
    (u.mode?'<span style="color:var(--fg3)">'+(u.mode==='ALS'?'ᴀ':'ʙ')+'</span>':'')+
    '</span><span class="dot" style="background:'+st[1]+'" title="'+st[0]+'"></span></div>')}
  out.push('</div>')}
 return out.join('')}
function callsHTML(){
 const out=['<div class="hd">進線案件 '+(S.inc.length+S.duties.length)+'</div>'];
 if(!S.inc.length&&!S.duties.length)out.push('<div class="sub">目前無受理案件。</div>');
 for(const i of S.inc.slice().sort((a,b)=>a.left-b.left)){
  const d=KIND[i.k],f=fill(i,0),got=f.reduce((a,b)=>a+b,0),tot=i.need.reduce((a,g)=>a+g.n,0);
  const urg=i.left/i.max<.35,col=i.rev?d.col:'#6b6960';
  out.push('<div class="call'+(sel===i.id?' sel':'')+'" data-sel="'+i.id+'" style="border-left-color:'+col+'">'+
   '<div class="row" style="padding:0"><span class="tag" style="background:'+col+';color:'+(i.rev?'#111110':'#eceae3')+'">'+
   (i.rev?(i.nm||d.n)+(i.pm.lvl>1?' '+['','一級','二級','三級','四級'][i.pm.lvl]+'火警':'')+(i.pm.trap?' 困'+i.pm.trap:''):d.cls+'類 · 待確認')+'</span>'+
   '<span class="mono" style="color:'+(urg?'var(--red)':'var(--fg2)')+'">'+fmt(i.left)+'</span></div>'+
   '<div class="sub" style="margin-top:3px">'+esc(i.addr)+' · 同時 '+(i.calls||1)+' 通 · 編組 '+got+'/'+(i.rev?tot:'?')+
   (i.rev&&i.ph>=0?' · '+i.phs[i.ph]:'')+(i.req?' · 待回覆':'')+(KIND[i.k].pol&&i.pol<2?' · 待警方':'')+(KIND[i.k].pow&&i.pow<2?' · 待斷電':'')+
   (i.note?' · '+esc(i.note):'')+'</div></div>')}
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
 return out.join('')+'</div></div>'}
function unitHTML(u){
 const inc=S.inc.find(i=>i.id===u.inc),dy=S.duties.find(x=>x.id===u.duty);
 let h='<div class="hd">車輛資料</div><div class="mono" style="font-size:15px">'+u.cs+
  ' <span class="sub">'+CODE[u.code].n+' · '+SPOT[u.si].n+'分隊</span></div>';
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
function shopHTML(){
 let h='<div class="row" style="padding:0"><span class="hd" style="margin:0">車輛採購 · 經費 $'+S.money+
  '</span><button data-shopclose="1">關閉</button></div><select id="selSt" style="margin:8px 0">';
 for(let i=0;i<S.nst;i++)h+='<option value="'+i+'"'+(i===shopSt?' selected':'')+'>'+SPOT[i].n+
  '分隊（'+S.ix.bySt[i].length+' 輛 · EMT-P '+S.tp[i]+' 人）</option>';
 h+='</select><div class="buy">';
 h+='<button data-hire="1">招募高級救護技術員<br><span class="sub">EMT-P · $2500</span></button>';
 for(const c of FLEET)h+='<button data-buy="'+c+'"><span class="mono">'+SPOT[shopSt].n+c+'</span><br>'+
  '<span class="sub">'+CODE[c].n+(CODE[c].cap?' '+CODE[c].cap+'L':'')+' · $'+CODE[c].c+'</span></button>';
 h+='</div>';
 if(S.nst<SPOT.length)h+='<button data-newst="1" style="width:100%;margin-top:8px">增設 '+
  SPOT[S.nst].n+'分隊 · $12000（附編 11 三輛、91 一輛、41 一輛）</button>';
 return h}
