// 案件詳情面板的各區塊；每個函式回傳該區塊的 HTML 字串
'use strict';
function dSteps(inc){
 let h='';
  // 階段進度條
  const fr=Math.min(1,inc.work/inc.dur),per=1/inc.phs.length,cur=Math.min(inc.phs.length-1,Math.floor(fr/per));
  h+='<div class="steps">';
  inc.phs.forEach((nm,i)=>{
   const w=i<cur?100:i>cur?0:Math.round(((fr-cur*per)/per)*100);
   h+='<div class="step '+(i<cur?'done':i===cur&&inc.work>0?'now':'')+'"><i><b style="width:'+w+'%"></b></i>'+nm+'</div>'});
  h+='</div>';
 return h}
function dPhaseReq(inc){
 let h='';
  // 本階段所需器材
  {const phNow=inc.phs[Math.max(0,inc.ph)],req=PHREQ[phNow]||[];
   if(req.length){
    const have=sceneEq(inc);
    const miss=req.filter(i=>!have.has(i));
    h+='<div class="sub" style="margin:2px 0 6px">「'+phNow+'」需要 '+
     req.map(i=>'<span style="color:'+(have.has(i)?'var(--grn)':'var(--red)')+'">'+i+'</span>').join('、')+
     (miss.length?'　<span style="color:var(--red)">缺件，作業暫停中</span>':'　<span style="color:var(--grn)">器材齊備</span>')+'</div>'}}
 return h}
function dRequest(inc){
 let h='';
  // 現場請求
  if(inc.req){
   const r=inc.req;
   h+='<div class="req"><div class="txt">現場請求（'+r.cs+'）：'+esc(r.s)+'</div><div style="display:flex;gap:6px">'+
    (r.t==='call'?'<button data-req="1">回電報案人</button><button data-req="0">要求現場自行搜索</button>':
     r.t==='need'?'<button data-req="1">同意增派'+LB[r.c]+'</button><button data-req="0">現場自行處理</button>':
     '<button data-req="1">收到</button>')+
    '<span class="sub" style="align-self:center">'+Math.ceil(inc.reqT)+' 秒後自動處理</span></div></div>'}
 return h}
function dWater(inc,d){
 let h='';
  // 水情
  if(d.w){
   const wo=waterOK(inc),eff=Math.max(0,effLines(inc)-(inc.burst>0?1:0)),tp=tankPool(inc);
   const use=eff*LPS,inflow=inflowOf(inc),net=inflow-use;
   const crew=onScene(inc).filter(u=>u.st==='work'&&CODE[u.code].cap);
   const tender=crew.filter(u=>u.code==='61'),pumps=crew.filter(u=>u.code!=='61');
   const wr=waterRoles(inc,pumps),sup=inc.tender&&!inc.shuttle?tender:wr.sup,atk=wr.atk;
   const rows=[];
   for(let li=0;li<Math.max(1,eff);li++){
    const a=atk.length?atk[li%atk.length]:null;
    const t=sup.length?sup[li%sup.length]:null;
    const noz=!a?'—':a.code==='57'?'泡沫':a.code==='01'?'泡沫砲':a.code==='61'?'移動砲塔':
     a.code==='16'?'1.5 吋':(li%2?'1.5 吋':'2.5 吋');
    rows.push((inc.shuttle?'[栓]⇢往返⇢':'[栓]'+(inc.tender?'⇢':'─')+'['+(t?t.cs:(inc.tender?'水庫車?':'佔水車?'))+']─')+'['+
     (a?a.cs:'幫浦車?')+']─'+noz+'→')}
   const chain=rows.join('<br>');
   h+=fh('water','水情',1);
   h+='<div class="row" style="padding:2px 0;align-items:flex-start"><span class="mono" style="font-size:12px;color:var(--blu);line-height:1.7">'+
    chain+'</span><span class="tag" style="background:'+(wo?'var(--grn)':inc.hook>0?'var(--amb)':'var(--red)')+';white-space:nowrap">'+
    (wo?'已通水':inc.hook>0?('佔水中 '+Math.ceil(inc.hook)+' 秒'):'未通水')+'</span></div>';
   h+='<div class="sub">'+(inc.shuttle?'無可用消防栓，大型車也進不去：幫浦車輪流往返補水，需 2 輛以上才能不斷水':inc.tender?'無可用消防栓：水庫車循環送水（卸水至移動式水槽、空車回消防栓補水，多輛輪替），幫浦車由水槽吸水':
    '消防栓距 '+inc.hd+' 格 · 需 '+(1+inc.relay)+' 輛幫浦（1 佔水'+(inc.relay?' + '+inc.relay+' 中繼':'')+'）')+'</div>';
   if(tenderOn(inc))h+='<div class="twater" style="margin:4px 0">'+tenderHTML(inc)+'</div>';
   const pct=tp[1]?Math.round(tp[0]/tp[1]*100):0;
   const src=(inc.shuttle?'無栓，幫浦車往返運水':inc.tender?'無栓，水庫車循環送水':(inc.hin>=600?'幹道消防栓':inc.hin>=480?'一般道路消防栓':'巷弄消防栓')
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
 return h}
function dMedRescue(inc,d){
 let h='';
  // 生命徵象 / 救助作業
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
 return h}
function dEqNeeds(inc,fw){
 let h='';
  // 現場器材需求
  const doneN=inc.need.filter((g,i)=>fw[i]>=g.n).length;
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
 return h}
function dExternal(inc){
 let h='';
 // 外部支援與線上指導
 const Kx=KIND[inc.k];
 h+=fh('ext','外部支援',1)+'<div class="row" style="padding:0;gap:6px;justify-content:flex-start;flex-wrap:wrap">';
 h+=inc.pol===0?'<button data-ext="pol">轉報 110</button>':
  inc.pol===1?'<span class="tag" style="background:var(--amb)">警方出動中 '+Math.ceil(inc.polT)+' 秒</span>':
  '<span class="tag" style="background:var(--grn)">警方已到場</span>';
 h+=inc.pow===0?'<button data-ext="pow">通報台電斷電</button>':
  inc.pow===1?'<span class="tag" style="background:var(--amb)">台電處理中 '+Math.ceil(inc.powT)+' 秒</span>':
  '<span class="tag" style="background:var(--grn)">已確認斷電</span>';
 h+=maHTML(inc);
 if(EPA_K(inc.k))h+=!inc.epa?'<button data-ext="epa">請求環保署化災應變隊</button>':
  inc.epa===1?'<span class="tag" style="background:#7f77dd">化災隊集結中 '+fmt(inc.epaT)+'</span>':
  inc.epa===2?'<span class="tag" style="background:#7f77dd">化災隊前往中 '+Math.ceil(inc.epaT)+' 秒</span>':'<span class="tag" style="background:var(--grn)">化災隊已到場</span>';
 if(EPA_K(inc.k)&&!inc.epa)h+='<span class="sub">化災應變隊集結約 5～8 分鐘，精通化物辨識、止漏與除污</span>';
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
 return h}
function dPackages(inc,d){
 let h='';
 // 分類派遣（ARR 編組）
 h+=fh('pkg','分類派遣（ARR 編組）',1);
 const idleBy={},alsBy={};
 for(const u of S.units)if(u.st==='idle'){idleBy[u.code]=(idleBy[u.code]||0)+1;
  if(u.code==='91'&&tpFree(u.si)>0)alsBy['91']=(alsBy['91']||0)+1}
 const availOf=pk=>{let need=0,got=0;
  for(const it of pk.l){const codes=ALT[it[0]]||[it[0]];need+=it[1];
   let n2=0;for(const cd of codes)n2+=(it[2]&&cd==='91')?(alsBy[cd]||0):(idleBy[cd]||0);
   got+=Math.min(it[1],n2)}
  return[got,need]};
 const fwA=fill(inc,0),unmet=inc.need.filter((g2,i2)=>fwA[i2]<g2.n); // 以未滿足需求計算各編組涵蓋度，挑出最佳建議
 const coverOf=pk=>{let v=0;for(const g2 of unmet)if(pk.l.some(it=>(ALT[it[0]]||[it[0]]).some(cd=>g2.c.indexOf(cd)>=0)))v+=1/Math.max(1,g2.c.length);return v}; // 涵蓋度依器材專屬程度加權：越少車種有的器材越重要
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
 return h}
function dOnScene(inc){
 let h='';
 // 現場編組
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
 return h}
function dIndividual(inc){
 let h='';
 // 個別派遣
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
  h+='<div class="row"><span class="mono">'+u.cs+' <span class="sub">'+stName(u)+' · '+CODE[u.code].n+
   (cov.length?' · 可補 '+cov[0]+(cov.length>1?' 等 '+cov.length+' 項':''):
    needALS?' · <span style="color:var(--amb)">此案需 ALS，請以 ALS 編組出動</span>':'')+' · '+
   (unreach?'—':o.e+' 秒')+'</span></span>'+btn+'</div>'});
 h+='</div>';
 return h}
