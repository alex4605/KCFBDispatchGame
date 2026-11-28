// 戰術指揮：決策點——關鍵時刻暫停，讓指揮官從 2～3 個方案選一個（只在玩家親自指揮時出現；30 秒沒選就照預設方案）
'use strict';
// opts：[[方案, 說明, fn(inc,B)]]；def：預設方案（逾時採用）
function tacDecide(inc,B,id,title,desc,opts,def){
 if(!B.played||inc.train||!TAC.open||TAC.id!==inc.id||B.dec||(B.decd||{})[id])return false;
 (B.decd||(B.decd={}))[id]=1;B.dec={id,title,desc,opts,def:def||0,t:S.t};
 tacEvt(inc,B,'danger','決策：'+title,1);tSideH='';return true}
function tacDecPick(inc,B,i,auto){const d=B.dec;if(!d)return;const o=d.opts[i];if(!o)return;B.dec=null;
 radio(inc,'指揮官',(auto?'（未下決策，依預設）':'')+d.title+'：'+o[0]+'。');tacEvt(inc,B,'milestone','決策「'+d.title+'」：'+o[0]+(auto?'（逾時預設）':''));
 if(!auto)B.decN=(B.decN||0)+1;if(o[2])o[2](inc,B);
 if(!auto&&paused){paused=false;TAC.pmsg='';const b=document.getElementById('btnPause');if(b)b.textContent='暫停'}tSideH='';tBotH=''}
// 每幀：沒暫停時 30 秒內沒選，採用預設方案
function tacDecStep(inc,B,dt){const d=B.dec;if(!d)return;d.w=(d.w||0)+dt;if(d.w>=30)tacDecPick(inc,B,d.def,1)}
function tacDecHTML(B){const d=B.dec;if(!d)return'';
 return'<div class="tdec"><b>⚠ 決策：'+esc(d.title)+'</b><div class="sub">'+esc(d.desc)+'</div>'+d.opts.map((o,i)=>'<button data-tdec="'+i+'" title="'+esc(o[1])+'">'+(i+1)+'. '+esc(o[0])+'<span>'+esc(o[1])+'</span></button>').join('')+
  '<div class="sub">'+(paused?'遊戲已暫停，選擇後繼續':'約 '+Math.max(0,Math.ceil(30-(d.w||0)))+' 秒內未選，採用方案 '+(d.def+1))+'</div></div>'}
// 挑一組：優先待命、在屋外的；排除倒地、RIT、搬運、破壞中
function tacDecQ(B,ok){const c=B.sq.filter(q=>!q.down&&!q.gone&&q.ty!=='robot'&&!/^(rit|ritgo|carry|extr|station|care)$/.test(q.task)&&ok(q));
 const r=c.filter(q=>q.decT!==S.t).sort((a,b)=>(a.task==='idle'?0:1)-(b.task==='idle'?0:1)||(tacIn(a)?1:0)-(tacIn(b)?1:0))[0]||null;if(r)r.decT=S.t;return r}
const tacFoamQ=q=>q.code==='57'||q.code==='01'||q.code==='機'||!!q.cafs;
// 受困者：派一組破壞救援（未穩固／未支撐就先做）
function tacDecExtr(inc,B,x){const r=tacDecQ(B,q=>q.usar||q.ty==='resc'||q.ty==='pump');if(!r)return;
 const k=x.rub?(x.shore?'extr':'shore'):(x.stab?'extr':'stab');tacOrder(inc,r,k==='shore'&&r.ty==='pump'?'extr':k,x.f,x.c)}
// ===== 油池引燃 =====
function tacDecPool(inc,B,x){
 tacDecide(inc,B,'pool','油池引燃',tacNm(B,0,x.c)+'的油池被引燃，火勢會沿油料擴大'+(B.cells.some(y=>y.pin>0)?'，附近還有被夾住的受困者':'')+'。',[
  ['泡沫攻擊油池','泡沫車、CAFS 對油池射泡沫；現場沒有就請求泡沫車，先由幫浦組射水壓制',(inc,B)=>{const f=tacDecQ(B,q=>tacFoamQ(q));
   if(f)tacOrder(inc,f,'attack',0,x.c);else{if(!B.foamReq){B.foamReq=1;tacReinf(inc,B,'foam')}const p=tacDecQ(B,q=>q.ty==='pump');if(p)tacOrder(inc,p,'attack',0,x.c)}}],
  ['水線掩護、先救人','兩組幫浦水線壓住火勢、保護受困位置，救助組持續破壞救援',(inc,B)=>{for(let i=0;i<2;i++){const p=tacDecQ(B,q=>q.ty==='pump'&&q.task!=='attack');if(p)tacOrder(inc,p,'attack',0,x.c)}
   for(const y of B.cells)if(y.pin>0&&y.vic>0&&tacGd(B,y.c,x.c)<2.5&&!B.sq.some(q=>q.task==='extr'&&q.tf===y.f&&q.tc===y.c))tacDecExtr(inc,B,y)}],
  ['人員撤離熱區','油池旁的小組先撤出，等泡沫車到場再處理',(inc,B)=>{const nb=new Set([x.c].concat(B.L.N[x.c].nb));
   for(const q of B.sq)if(!q.down&&q.f>=0&&nb.has(q.c))tacOrder(inc,q,'exit',-1,0);if(!B.foamReq){B.foamReq=1;tacReinf(inc,B,'foam')}}]],0)}
// ===== 受困者轉危急 =====
function tacDecRed(inc,B,x){const cr=tacCared(x),n=B.sq.filter(q=>q.task==='extr'&&q.tf===x.f&&q.tc===x.c).length;
 tacDecide(inc,B,'red'+x.f+'_'+x.c,'受困者轉危急',tacNm(B,x.f,x.c)+'被夾住的受困者生命徵象轉差（紅色），受困 '+fmt(x.pT||0)+(cr?'，醫療處置中':'，還沒有醫療處置')+'；目前 '+n+' 組破壞救援。',[
  ['派員醫療處置','一組在受困者旁給氧、輸液，惡化減緩，釋放前也可避免擠壓症候群',(inc,B)=>{const r=tacDecQ(B,q=>q.ty==='med')||tacDecQ(B,q=>q.ty!=='ladder');if(r)tacOrder(inc,r,'care',x.f,x.c)}],
  ['加派一組協同破壞','兩組同時作業進度相加，盡快救出',(inc,B)=>tacDecExtr(inc,B,x)],
  ['維持目前作業','不調整人力',null]],cr?1:0)}
// ===== 下風處民眾 =====
function tacDecDw(inc,B){
 tacDecide(inc,B,'dw','下風處民眾',(B.chemK?B.chem.n:'不明化學品')+'正往下風處飄散，民宅有住戶。',[
  ['疏散','警方協助挨家疏散（約 1～2 分鐘），疏散後幾乎不再暴露',(inc,B)=>tacDwSet(inc,B,'evac')],
  ['就地避難','廣播關閉門窗、空調待在室內，立即生效但仍有少量暴露',(inc,B)=>tacDwSet(inc,B,'shelter')],
  ['先觀察','暫不處置，民眾持續暴露',null]],1)}
