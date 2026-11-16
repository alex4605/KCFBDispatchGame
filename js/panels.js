// 側欄面板 HTML 產生
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
const FOLD={};
const fh=(k,t,mt,x)=>'<div class="hd fold'+(mt?' mt':'')+'" data-fold="'+k+'">'+(FOLD[k]?'▸ ':'▾ ')+t+(x||'')+'</div><div'+(FOLD[k]?' hidden':'')+'>';
function detailHTML(){
 if(S.over)return '<div style="text-align:center;padding:32px 0"><div style="font-size:17px">評鑑歸零，指揮權移交</div>'+
  '<div class="sub" style="margin:10px 0">值勤 '+S.day+' 天 · 出勤 '+S.solved+' 件 · '+S.score+' 分</div>'+
  '<button id="rs">重新開始</button></div>';
 const mm=msg?'<div class="note">'+esc(msg)+'</div>':'';
 if(selU){const u=S.units.find(x=>x.id===selU);if(u)return mm+unitHTML(u)}
 const dy=S.duties.find(x=>x.id===sel);
 if(dy){
  let h=mm+'<div class="hd">公務勤務</div><div style="font-size:15px">'+dy.n+
   ' <span class="sub">'+esc(dy.addr)+'</span></div>';
  h+='<div class="sub" style="margin:6px 0">需求 '+CODE[dy.code].n+'（'+dy.code+'） · 勤務 '+dy.dur+
   ' 秒 · 補助 $'+dy.pay+(dy.unit?'':' · 應派時限 '+fmt(dy.left))+'</div>';
  if(dy.unit){const u=S.units.find(x=>x.id===dy.unit);
   h+='<div class="sub">執行中：'+(u?u.cs:'')+(dy.run>0?'（剩 '+Math.ceil(dy.run)+' 秒）':'')+'</div>'}
  else{
   const l=S.units.filter(u=>u.st==='idle'&&u.code===dy.code);
   h+='<div class="hd mt">可指派</div>';
   if(!l.length)h+='<div class="sub">無此車種待命。</div>';
   l.slice(0,8).forEach(u=>{h+='<div class="row"><span class="mono">'+u.cs+
    ' <span class="sub">'+SPOT[u.si].n+'</span></span><button data-duty="'+u.id+'">指派</button></div>'})}
  return h}
 const inc=S.inc.find(x=>x.id===sel);
 if(!inc)return mm+'<div class="hd">案件詳情</div><div class="sub">在右上進線列表點選案件，或在左欄點選車號查看車輛。'+
  '地圖上灰色「？」代表尚未到場、災情不明。</div>';
 const d=KIND[inc.k],fw=fill(inc,1);
 let h=mm+'<div class="row" style="padding:0"><span style="font-size:16px">'+
  (inc.rev?(inc.nm||d.n)+(inc.pm.lvl>1?'（'+['','一級','二級','三級','四級'][inc.pm.lvl]+'火警）':''):'受理中 · '+d.cls+'類')+'</span>'+
  '<span class="mono" style="color:var(--fg2)">'+esc(inc.addr)+' · '+fmt(inc.left)+'</span></div>'+
  '<div class="sub" style="margin-top:3px">同時進線 <span style="color:'+
  ((inc.calls||1)>=4?'var(--amb)':(inc.calls||1)===1?'var(--fg3)':'var(--fg2)')+'">'+(inc.calls||1)+
  ' 通</span>'+((inc.calls||1)===1?'（僅一通，真實性待查證）':(inc.calls||1)>=6?'（多通湧入，規模可能不小）':'')+'</div>';
 h+='<div class="sub" style="margin-top:4px">動線：'+
  (inc.z==='hiway'?'國道，須由交流道進入':inc.z==='forest'?'山區產業道路，大型車禁入':
   inc.z==='water'?'水岸邊':'市區道路')+' · '+(inc.bigOK?'大型車可進場':'僅小型車可進場')+'</div>';
 h+=logHTML(inc);
 if(inc.rev){
  const fr=Math.min(1,inc.work/inc.dur),per=1/inc.phs.length,cur=Math.min(inc.phs.length-1,Math.floor(fr/per));
  h+='<div class="steps">';
  inc.phs.forEach((nm,i)=>{
   const w=i<cur?100:i>cur?0:Math.round(((fr-cur*per)/per)*100);
   h+='<div class="step '+(i<cur?'done':i===cur&&inc.work>0?'now':'')+'"><i><b style="width:'+w+'%"></b></i>'+nm+'</div>'});
  h+='</div>';
  {const cur=inc.phs[Math.max(0,inc.ph)],req=PHREQ[cur]||[];
   if(req.length){
    const have=sceneEq(inc);
    const miss=req.filter(i=>!have.has(i));
    h+='<div class="sub" style="margin:2px 0 6px">「'+cur+'」需要 '+
     req.map(i=>'<span style="color:'+(have.has(i)?'var(--grn)':'var(--red)')+'">'+i+'</span>').join('、')+
     (miss.length?'　<span style="color:var(--red)">缺件，作業暫停中</span>':'　<span style="color:var(--grn)">器材齊備</span>')+'</div>'}}
  if(inc.req){
   const r=inc.req;
   h+='<div class="req"><div class="txt">現場請求（'+r.cs+'）：'+esc(r.s)+'</div><div style="display:flex;gap:6px">'+
    (r.t==='call'?'<button data-req="1">回電報案人</button><button data-req="0">要求現場自行搜索</button>':
     r.t==='need'?'<button data-req="1">同意增派'+LB[r.c]+'</button><button data-req="0">現場自行處理</button>':
     '<button data-req="1">收到</button>')+
    '<span class="sub" style="align-self:center">'+Math.ceil(inc.reqT)+' 秒後自動處理</span></div></div>'}
  const pt=pmText(inc);
  if(pt.length){h+='<div class="kv">';pt.forEach(t=>{h+='<div><b>'+t[0]+'</b>'+t[1]+'</div>'});h+='</div>'}
  if(d.w){
   const wo=waterOK(inc),eff=Math.max(0,effLines(inc)-(inc.burst>0?1:0)),tp=tankPool(inc);
   const use=eff*LPS,inflow=inflowOf(inc),net=inflow-use;
   const crew=onScene(inc).filter(u=>u.st==='work'&&CODE[u.code].cap);
   const tender=crew.filter(u=>u.code==='61'),pumps=crew.filter(u=>u.code!=='61');
   const sup=inc.tender?tender:pumps.slice(0,1+inc.relay);
   const atk=inc.tender?pumps:(pumps.length>1+inc.relay?pumps.slice(1+inc.relay):pumps);
   const rows=[];
   for(let li=0;li<Math.max(1,eff);li++){
    const a=atk.length?atk[li%atk.length]:null;
    const t=sup.length?sup[li%sup.length]:null;
    const noz=!a?'—':a.code==='57'?'泡沫':a.code==='01'?'泡沫砲':a.code==='61'?'移動砲塔':
     a.code==='16'?'1.5 吋':(li%2?'1.5 吋':'2.5 吋');
    rows.push('[栓]'+(inc.tender?'⇢':'─')+'['+(t?t.cs:(inc.tender?'水庫車?':'佔水車?'))+']─['+
     (a?a.cs:'幫浦車?')+']─'+noz+'→')}
   const chain=rows.join('<br>');
   h+=fh('water','水情',1);
   h+='<div class="row" style="padding:2px 0;align-items:flex-start"><span class="mono" style="font-size:12px;color:var(--blu);line-height:1.7">'+
    chain+'</span><span class="tag" style="background:'+(wo?'var(--grn)':inc.hook>0?'var(--amb)':'var(--red)')+';white-space:nowrap">'+
    (wo?'已通水':inc.hook>0?('佔水中 '+Math.ceil(inc.hook)+' 秒'):'未通水')+'</span></div>';
   h+='<div class="sub">'+(inc.tender?'無可用消防栓，全靠水庫車載水接力':
    '消防栓距 '+inc.hd+' 格 · 需 '+(1+inc.relay)+' 輛幫浦（1 佔水'+(inc.relay?' + '+inc.relay+' 中繼':'')+'）')+'</div>';
   const pct=tp[1]?Math.round(tp[0]/tp[1]*100):0;
   const src=(inc.tender?'無栓，水庫車載水':(inc.hin>=600?'幹道消防栓':inc.hin>=480?'一般道路消防栓':'巷弄消防栓')
    +(hydShare(inc)<1?'（共用分流）':'')+(inc.hd>8?'（管線 '+inc.hd+' 格，壓損 '+Math.round((1-Math.max(.55,1-inc.hd*.018))*100)+'%）':''))
    +(inc.hooked?'':'　※尚未佔水，目前使用車載水');
   h+='<div class="row" style="padding:4px 0"><span class="sub">出水 '+eff+' 線 · 耗水 '+use+
    ' L/s（'+(use*60)+' L/min） · 供水 '+inflow+' L/s · '+src+' · 淨值 '+(net>=0?'+':'')+net+' L/s</span>'+
    '<span class="tag" style="background:#2a2a27;color:#c9c6bd;white-space:nowrap">佈線由現場指揮決定</span></div>';
   h+='<div style="background:#2a2a27;border-radius:4px;height:7px;overflow:hidden;margin:3px 0">'+
    '<div style="height:100%;width:'+pct+'%;background:'+(pct<20?'var(--red)':pct<50?'var(--amb)':'var(--blu)')+'"></div></div>';
   h+=(inc.burst>0?'<div class="sub" style="color:var(--red)">一線水帶爆管更換中（剩 '+Math.ceil(inc.burst)+' 秒）</div>':'')+
    '<div class="sub">現場水量 '+Math.round(tp[0]).toLocaleString()+' / '+tp[1].toLocaleString()+' L'+
    (inc.dry?' · <span style="color:var(--red)">水箱見底，射水中斷</span>':'')+
    ' · 建議 '+recLines(inc)+' 線</div></div>'}
  const doneN=inc.need.filter((g,i)=>fw[i]>=g.n).length;
  if(!d.w&&(d.cls==='救護'||d.carry||d.cls==='救助')){
   if(!(d.cls==='救助'||d.tac)&&inc.pm.cc!==undefined){
    const M=MED[inc.pm.cc],v1=inc.pm.vs1,v2=inc.pm.vs2;
    const als=inc.pm.als||inc.need.some(gg=>gg.als);
    const hasALS=onScene(inc).some(u=>(u.st==='work'||u.st==='tx')&&u.code==='91'&&u.tp);
    const hf=hospFor(inc.ax,inc.ay),hb=hf.h;
    h+=fh('vital','生命徵象',1);
    const row=(v,lb)=>v?('<div class="row" style="padding:2px 0"><span class="mono" style="color:var(--fg2)">'+lb+
     '</span><span class="mono">BT '+v.bt+'　HR '+(v.hr||'—')+'　BP '+v.bp+'　SpO₂ '+(v.sp||'—')+
     '　AVPU '+v.av+'</span></div>'):('<div class="sub">'+lb+'：尚未測量</div>');
    h+=row(v1,'第一組');
    h+=row(v2,'第二組');
    h+='<div class="kv" style="grid-template-columns:repeat(1,minmax(0,1fr))">'+
     '<div><b>主訴</b>'+M.n+'</div><div><b>主要發現</b>'+M.f+'</div><div><b>主懷疑</b>'+M.imp+'</div></div>';
    h+='<div class="row" style="padding:3px 0"><span class="sub">後送 '+(hb?hb.n:'—')+
     '　預估車程 '+(hb?Math.round(hf.d/CODE['91'].s):'—')+' 秒</span><span class="tag" style="background:'+
     (als&&!hasALS?'var(--red)':'var(--grn)')+'">'+(als?(hasALS?'ALS 已到場':'待 ALS'):'BLS 處置')+'</span></div>';
    if(inc.pm.ohca)h+='<div class="sub">DA-CPR：'+(inc.dai==='cpr'?'<span style="color:var(--grn)">線上指導中</span>':
     '<span style="color:var(--red)">未實施</span>')+'</div>';h+='</div>'}
   else if(d.cls==='救助'||d.tac){
    const trap0=inc.pm.trap||1,saved=Math.min(trap0,Math.round(trap0*Math.min(1,inc.work/inc.dur)));
    const ritOK=onScene(inc).some(u=>u.st==='work'&&(u.code==='71'||u.code==='搜'));
    h+='<div class="hd mt">救助作業</div>';
    h+='<div class="kv"><div><b>受困</b>'+trap0+' 人</div><div><b>已救出</b>'+saved+' 人</div>'+
     '<div><b>現場人力</b>'+onScene(inc).reduce((a,u)=>a+(u.st==='work'?(u.crew||2):0),0)+' 人</div>'+
     '<div><b>備援組</b>'+(ritOK?'已編成':'未編成')+'</div></div>'}}
  h+=fh('eqneed','現場器材需求 '+doneN+'/'+inc.need.length+' 項',1);
  const seenK={};
  inc.need.forEach((g,i)=>{
   const bk=g.k||'other';
   if(!seenK[bk]){seenK[bk]=1;
    h+='<div class="sub" style="margin:6px 0 2px;color:var(--fg3)">'+((EQK[bk]&&EQK[bk].l)||'其他')+'</div>'}
   const ok=fw[i]>=g.n;
   h+='<div class="row" style="padding:2px 0"><span class="mono" style="color:'+(ok?'var(--grn)':'var(--fg)')+'">'+
    g.l+'</span><span class="mono" style="color:'+(ok?'var(--grn)':'var(--amb)')+'">'+fw[i]+'/'+g.n+
    '<span class="sub"> ('+g.c.join('/')+')</span></span></div>'});
  h+='</div>';
  }
 const Kx=KIND[inc.k];
 h+=fh('ext','外部支援',1)+'<div class="row" style="padding:0;gap:6px;justify-content:flex-start;flex-wrap:wrap">';
 h+=inc.pol===0?'<button data-ext="pol">轉報 110</button>':
  inc.pol===1?'<span class="tag" style="background:var(--amb)">警方出動中 '+Math.ceil(inc.polT)+' 秒</span>':
  '<span class="tag" style="background:var(--grn)">警方已到場</span>';
 h+=inc.pow===0?'<button data-ext="pow">通報台電斷電</button>':
  inc.pow===1?'<span class="tag" style="background:var(--amb)">台電處理中 '+Math.ceil(inc.powT)+' 秒</span>':
  '<span class="tag" style="background:var(--grn)">已確認斷電</span>';
 if(Kx.defl&&!inc.defl)h+='<button data-defl="1">轉報'+Kx.defl+'</button>';
 if(Kx.police)h+='<span class="sub">本案由警方轉報，現場已有警力</span>';
 if(Kx.pol&&inc.pol<2)h+='<span class="sub">此類案件須警方到場才能繼續處置</span>';
 if(Kx.pow&&inc.pow<2)h+='<span class="sub">未確認斷電前不得射水</span>';
 if(!inc.dai){
  const deadCase=inc.pm.cc!==undefined&&MED[inc.pm.cc]&&MED[inc.pm.cc].dead;
  if(deadCase)h+='<button data-dai="dead">確認明顯死亡徵象</button>';
  else if(Kx.cls==='救護')h+='<button data-dai="cpr">轉接 DA-CPR</button>';
  if(inc.k==='birth')h+='<button data-dai="birth">線上生產指導</button>';
  if(Kx.cls==='救助'&&!deadCase)h+='<button data-dai="bleed">線上止血指導</button>';
  if(Kx.fire||Kx.hoax)h+='<button data-dai="esc">指導疏散避難</button>';
 }else h+='<span class="tag" style="background:var(--blu)">線上指導中</span>';
 h+='</div></div>';
 h+=fh('pkg','分類派遣（ARR 編組）',1);
 const idleBy={},alsBy={};
 for(const u of S.units)if(u.st==='idle'){idleBy[u.code]=(idleBy[u.code]||0)+1;
  if(u.code==='91'&&tpFree(u.si)>0)alsBy['91']=(alsBy['91']||0)+1}
 const availOf=pk=>{let need=0,got=0;
  for(const it of pk.l){const codes=ALT[it[0]]||[it[0]];need+=it[1];
   let n2=0;for(const cd of codes)n2+=(it[2]&&cd==='91')?(alsBy[cd]||0):(idleBy[cd]||0);
   got+=Math.min(it[1],n2)}
  return[got,need]};
 // 以未滿足需求計算各編組涵蓋度，挑出最佳建議
 const fwA=fill(inc,0),unmet=inc.need.filter((g2,i2)=>fwA[i2]<g2.n);
 // 涵蓋度依器材專屬程度加權：越少車種有的器材越重要
 const coverOf=pk=>{let v=0;for(const g2 of unmet)if(pk.l.some(it=>(ALT[it[0]]||[it[0]]).some(cd=>g2.c.indexOf(cd)>=0)))v+=1/Math.max(1,g2.c.length);return v};
 const sizeOf=pk=>pk.l.reduce((a,it)=>a+it[1],0);
 const tags=new Set();
 if(d.mci)tags.add('mci');if(d.hz)tags.add('hz');if(d.tac)tags.add('tac');if(d.road)tags.add('road');
 if(inc.k==='evfire'||inc.k==='solarfire')tags.add('ev');if(inc.k==='grassfire'||inc.k==='forest')tags.add('grass');if(d.cls==='公務')tags.add('duty');
 if(['drown','swift','mob','kayak'].indexOf(inc.k)>=0)tags.add('water');
 if(['collapse','slide','majorind','gasblast','search'].indexOf(inc.k)>=0)tags.add('usar');
 if(inc.k==='ship')tags.add('ship');if(['aircraft','airlanding'].indexOf(inc.k)>=0)tags.add('air');if(inc.k==='tunnel')tags.add('tunnel');
  if(['psych','crisis','selfharm','suicall'].indexOf(inc.k)>=0)tags.add('behav');
 const scoreOf=pk=>{const cv=coverOf(pk);if(cv<=0)return -1;
  return cv+(pk.cls.indexOf(d.cls)>=0?.6:0)+(pk.tag&&tags.has(pk.tag)?.9:0)-.05*sizeOf(pk)};
 let bestPkg=-1,bestV=0;
 PKG.forEach((pk0,i)=>{const pk=i<3?lvPk(i,inc.al|0):pk0;const v=scoreOf(pk);const av=availOf(pk);
  if(av[0]>0&&v>bestV){bestV=v;bestPkg=i}});
 const upBtn=()=>{const al=inc.al|0,on=al>=1&&al<3,av=availOf(lvPk(Math.min(al,2),al));
  return '<button data-up="1" style="grid-column:1/-1;border-color:var(--amb)"'+(on&&av[0]>0?'':' disabled')+'>▲ 升級'+(on?' → '+LVN[al+1]+'火警（'+av[0]+'/'+av[1]+' 可用）':al<1?'（請先派遣一級火警）':'（已達三級）')+'</button>'};
 PKGG.forEach(gname=>{
  h+='<div class="sub" style="margin:5px 0 3px;color:var(--fg3)">'+gname+'</div><div class="pkg">'+(gname==='火警分級'&&d.fire?upBtn():'');
  const order=PKG.map((pk,i)=>i).filter(i=>PKG[i].g===gname)
   .sort((a,b2)=>(a<3?-1e9+a:-scoreOf(PKG[a]))-(b2<3?-1e9+b2:-scoreOf(PKG[b2])));
  order.forEach(i=>{const pk=i<3?lvPk(i,inc.al|0):PKG[i];
   const av=availOf(pk),rel=pk.cls&&pk.cls.indexOf(d.cls)>=0,best=(i===bestPkg);
   const dis=av[0]===0?' disabled':'';
   const col=av[0]>=av[1]?'var(--grn)':av[0]>0?'var(--amb)':'var(--fg3)';
   h+='<button data-pkg="'+i+'"'+dis+(rel?' style="border-color:var(--line2);box-shadow:inset 2px 0 0 var(--blu)"':'')+
    ' title="'+pk.l.map(x=>LB[x[0]]+'×'+x[1]+(x[2]?'(ALS)':'')).join('、')+'">'+
    (best?'<span style="color:#111110;background:var(--grn);border-radius:3px;padding:0 4px;font-size:10px;margin-right:3px">建議</span>':'')+pk.n+
    '<br><span class="sub" style="color:'+col+'">'+(av[1]?av[0]+'/'+av[1]+' 可用':'已派遣')+'</span></button>'});
  h+='</div>'});
 h+='<div class="row" style="padding:6px 0 0"><span class="sub">現場多餘車輛可解除返隊</span>'+
  '<button data-stand="1">解除多餘車輛</button></div></div>';
 h+='<div class="hd mt">案件備註</div><div class="row" style="gap:6px">'+
  '<input id="note" value="'+esc(inc.note||'')+'" placeholder="指揮官註記">'+
  '<button data-note="1">儲存</button>'+(inc.rev?'<button data-auto="1">依回報補足</button>':'')+
  '</div><div class="err" id="nerr"></div>';
 const asg=onScene(inc);
 if(asg.length){
  h+='<div class="hd mt">現場編組 '+asg.length+' 輛</div>';
  asg.forEach(u=>{const cap=CODE[u.code].cap;
   const cov=inc.need.filter(g=>match(g,u)).map(g=>g.l);
   const miss=!cov.length&&inc.need.some(g=>g.c.indexOf(u.code)>=0&&g.als&&!u.tp);
   h+='<div class="row"><span class="mono">'+u.cs+(u.lead?' <span style="color:#d9a93a">帶隊官</span>':'')+' <span class="sub">'+CODE[u.code].n+
   (cov.length?' · 支援 '+cov.join('、'):miss?' · <span style="color:var(--amb)">車上無 EMT-P，未計入 ALS 需求</span>':'')+
   (cap?' · '+Math.round(u.tank)+'/'+cap+'L':'')+
   (u.mode?' · '+u.mode+' '+u.crew+' 人'+(u.tp?'、EMT-P':'、無 P'):'')+' · '+ST[u.st][0]+
   (u.turn>0?'（整裝）':'')+'</span></span><button data-rc="'+u.id+'">撤回</button></div>'})}
 const sg=suggested(inc);
 const idle=S.units.filter(u=>u.st==='idle')
  .map(u=>({u,e:etaTo(u,inc),ok:sg.some(g=>match(g,u)),near:sg.some(g=>g.c.indexOf(u.code)>=0)}))
  .sort((a,b)=>(b.ok-a.ok)||((a.e===null?9999:a.e)-(b.e===null?9999:b.e)));
 h+=fh('indiv','個別派遣 · 待命 '+idle.length+' 輛',1);
 idle.slice(0,18).forEach(o=>{
  const u=o.u,unreach=o.e===null;
  let btn;
  if(unreach)btn='<span class="sub">無法進場</span>';
  else if(u.code==='91'){
   const free=tpFree(u.si);
   const wantA=sg.some(g=>g.als&&g.c.indexOf('91')>=0);
   btn='<span style="display:flex;gap:5px"><button data-send="'+u.id+'" data-mode="BLS"'+
    (o.ok&&!wantA?' class="on"':'')+'>BLS</button><button data-send="'+u.id+'" data-mode="ALS"'+
    (free<=0?' disabled':(wantA?' class="on"':''))+'>ALS</button></span>'}
  else btn='<button data-send="'+u.id+'"'+(o.ok?' class="on"':'')+'>出動</button>';
  const cov=sg.filter(g=>match(g,u)).map(g=>g.l.replace('（ALS）',''));
  const needALS=u.code==='91'&&!o.ok&&o.near&&sg.some(g=>g.als);
  h+='<div class="row"><span class="mono">'+u.cs+' <span class="sub">'+SPOT[u.si].n+' · '+CODE[u.code].n+
   (cov.length?' · 可補 '+cov[0]+(cov.length>1?' 等 '+cov.length+' 項':''):
    needALS?' · <span style="color:var(--amb)">此案需 ALS，請以 ALS 編組出動</span>':'')+' · '+
   (unreach?'—':o.e+' 秒')+'</span></span>'+btn+'</div>'});
 h+='</div>';
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
