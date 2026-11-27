// 右下案件詳情面板 detailHTML()
'use strict';
const FOLD={};
const fh=(k,t,mt,x)=>'<div class="hd fold'+(mt?' mt':'')+'" data-fold="'+k+'">'+(FOLD[k]?'▸ ':'▾ ')+t+(x||'')+'</div><div'+(FOLD[k]?' hidden':'')+'>';
function detailHTML(){
 if(S.over)return '<div style="text-align:center;padding:32px 0"><div style="font-size:17px">評鑑歸零，指揮權移交</div>'+
  '<div class="sub" style="margin:10px 0">值勤 '+S.day+' 天 · 出勤 '+S.solved+' 件 · '+S.score+' 分</div>'+
  '<button id="rs">重新開始</button></div>';
 // 提示列固定輸出（無訊息時隱藏），避免它出現或消失時把後面的節點整排往後擠、打斷輸入中的欄位
 const mm='<div class="note"'+(msg?'':' hidden')+'>'+esc(msg)+'</div>';
 if(selU){const u=S.units.find(x=>x.id===selU);if(u)return mm+unitHTML(u)}
 if(sel===SCHOOL_ID)return mm+schoolHTML();
 const mr=(S.mr||[]).find(x=>x.id===sel);if(mr)return mrHTML(mr,mm);
 const dy=S.duties.find(x=>x.id===sel);
 if(dy)return dutyDetailHTML(dy,mm);
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
   inc.z==='water'?'水岸邊':inc.z==='rural'?'鄉間道路，水源較遠':'市區道路')+' · '+(inc.bigOK?'大型車可進場':'僅小型車可進場')+'</div>';
 if(tacHas(inc))h+='<div class="row" style="padding:6px 0 2px">'+(!tacUnlocked()&&!inc.train?'<button class="tacbtn" disabled title="通過消防學校三關訓練後，才能接管現場指揮權">🔒 進入戰術指揮（需通過消防學校訓練）</button><button data-gosch="1">🎓 前往消防學校</button><button data-trainskip="1" title="不經訓練直接取得現場指揮權">⏭ 跳過教學</button>':'')+'<button data-tac="1" class="tacbtn"'+(tacOK(inc)&&(tacUnlocked()||inc.train)?'':' disabled')+(!tacUnlocked()&&!inc.train?' hidden':'')+'>'+(inc.k==='forest'?'⚔ 建物防護戰術':'⚔ 進入戰術指揮')+'</button>'+
  '<span class="sub">'+(inc.tac?(TAC.open?'':'現場由 AI 指揮官依戰術模型處置'):tacOK(inc)?'親自指揮各小組；期間由戰略 AI 代理派遣':'首車到場回報後可進入')+'</span></div>';
 if(inc.wf)h+=wfPanel(inc);
 h+=logHTML(inc);
 if(inc.rev)h+=detailRevealed(inc,d,fw);
 // 外部支援與線上指導
 h+=dExternal(inc);
 // 分類派遣（ARR 編組）
 h+=dPackages(inc,d);
 // 案件備註
 h+='<div class="hd mt">案件備註</div><div class="row" style="gap:6px">'+
  '<input id="note" value="'+esc(inc.note||'')+'" placeholder="指揮官註記">'+
  '<button data-note="1">儲存</button>'+(inc.rev?'<button data-auto="1">依回報補足</button>':'')+
  '</div><div class="err" id="nerr"></div>';
 // 現場編組
 h+=dOnScene(inc);
 // 個別派遣
 h+=dIndividual(inc);
 // 完成
 return h}
// 公務勤務的詳情
function dutyDetailHTML(dy,mm){
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
// 已到場案件：進度、請求、災情、水情、生命徵象、器材需求
function detailRevealed(inc,d,fw){
 let h='';
  // 階段進度條
  h+=dSteps(inc);
  // 本階段所需器材
  h+=dPhaseReq(inc);
  // 現場請求
  h+=dRequest(inc);
  // 災情參數
  const pt=pmText(inc);
  if(pt.length){h+='<div class="kv">';pt.forEach(t=>{h+='<div><b>'+t[0]+'</b>'+t[1]+'</div>'});h+='</div>'}
  // 水情
  h+=dWater(inc,d);
  // 生命徵象 / 救助作業
  h+=dMedRescue(inc,d);
  // 現場器材需求
  h+=dEqNeeds(inc,fw);
  // 完成
 return h}
