// 跨縣市支援（Mutual aid）：向臺南市、臺東縣消防局或內政部消防署特種搜救隊請求支援，需花費評鑑；
// 集結與長途行駛時間長，任務結束直接返回原單位。呼號沿用派出分隊（以與高雄接壤的鄉鎮分隊為主，不足再用市區分隊）
'use strict';
const MA_DEF={
 tn:{n:'臺南市消防局',cs:'臺南',cost:15,prep:240,from:'n',fx:'幫浦車 3、水庫車 1、指揮車 1（歸仁、關廟、仁德、龍崎分隊）',
  us:[['11','歸仁'],['11','關廟'],['11','仁德'],['61','龍崎'],['41','歸仁']]},
 tt:{n:'臺東縣消防局',cs:'臺東',cost:10,prep:540,from:'e',fx:'幫浦車 2、救助車 1、特搜 1（海端、延平、關山分隊與臺東特搜，熟悉山區）',
  us:[['11','海端'],['11','延平'],['71','關山'],['搜','臺東']]},
 nfa:{n:'內政部消防署特種搜救隊',cs:'署特搜',cost:12,prep:360,from:'n',fx:'特搜 2、救助車 1、消防機器人 1（重型破壞、倒塌搜救、侷限空間）',
  us:[['搜','署特搜'],['搜','署特搜'],['71','署特搜'],['履','署特搜']],rescue:1}};
// 署特搜也可支援的重大救助案件
const MA_RESC=['collapse','majorind','gasblast','slide','mrescue','aircraft','train','transit','buscrash','confined'];
// 三級火警才能請求（有火警分級的看分級，其他火警看案類等級）；署特搜另可支援重大救助
function maLvl3(inc){const d=KIND[inc.k];if(d.cls!=='火警')return false;return(inc.pm.lvl!==undefined?inc.pm.lvl:d.lv||0)>=3}
const maOK=(inc,key)=>!!inc.rev&&(maLvl3(inc)||(key==='nfa'&&MA_RESC.includes(inc.k)));
const maAny=inc=>Object.keys(MA_DEF).some(k=>maOK(inc,k));
// 進入轄區的道路：臺南與署特搜從北邊、臺東從東邊的地圖邊緣
function maEntry(side){let best=null,bv=-INF;
 for(let x=0;x<N;x++)for(let y=0;y<N;y++){const r=RD[K(x,y)];if(!r||r===5)continue;const v=side==='n'?-y:side==='e'?x:side==='s'?y:-x;if(v>bv){bv=v;best=[x,y]}}
 return best}
function maCall(inc,key){
 const D=MA_DEF[key];inc.ma=inc.ma||{};
 if(inc.ma[key]){msg=D.n+'已在支援中';return false}
 if(!maOK(inc,key)){msg=key==='nfa'?'署特搜僅支援三級火警或重大救助案件':'三級火警才能請求跨縣市支援';return false}
 if(S.rep-D.cost<5){msg='評鑑不足（需 '+D.cost+'，且請求後須保留 5 以上）';return false}
 const e=maEntry(D.from);if(!e){msg='找不到進入轄區的道路';return false}
 let si=0,bd=INF;for(let i=0;i<S.nst;i++){const d=Math.hypot(SPOT[i].p[0]-e[0],SPOT[i].p[1]-e[1]);if(d<bd){bd=d;si=i}}
 S.rep-=D.cost;let n=0;const cnt={};
 for(const[c,st]of D.us){
  addU(si,c);const u=S.units[S.units.length-1];u.ma=key;
  const tag=st+c;cnt[tag]=(cnt[tag]||0)+1;
  let cs=key==='nfa'?'署特搜'+(c==='搜'?cnt[tag]:c==='71'?'救助':c==='履'?'履':c):st+(c==='搜'?'特搜':c)+(cnt[tag]>1?'-'+cnt[tag]:'');
  // 同時有另一批同單位車隊在轄區：加註梯次避免呼號重複
  const dup=S.units.filter(v=>v!==u&&v.cs.replace(/-第\d梯$/,'')===cs).length;u.cs=dup?cs+'-第'+(dup+1)+'梯':cs;
  u.stn=key==='nfa'?'署特搜':st+(c==='搜'?'特搜':'')+'分隊（'+D.cs+'）';u.x=e[0];u.y=e[1];reindex();
  if(send(inc,u)){u.turn=D.prep+Math.random()*60;n++}else u.gone=1}
 inc.ma[key]={t:S.t,n};
 radio(inc,'受理','已請求'+D.n+'支援（評鑑 -'+D.cost+'）：'+D.fx+'，集結後由'+(D.from==='n'?'北邊國道':'東部山區道路')+'進入轄區。');
 return true}
// 支援車隊在現場的狀態
function maStat(inc,key){const us=S.units.filter(u=>u.ma===key&&u.inc===inc.id);
 if(!us.length)return'';const w=us.filter(u=>u.st==='work').length;
 return w?'到場 '+w+' / '+us.length+' 車':us.some(u=>u.turn>0)?'集結中 '+fmt(Math.max(...us.map(u=>u.turn))):'前往中 '+us.length+' 車'}
// 詳情面板按鈕
function maHTML(inc){
 let h='';
 for(const k in MA_DEF){if(!maOK(inc,k))continue;const D=MA_DEF[k],st=inc.ma&&inc.ma[k];
  h+=st?'<span class="tag" style="background:#3d5a80">'+D.cs+'支援：'+(maStat(inc,k)||'已返隊')+'</span>':
   '<button data-ma="'+k+'" title="'+D.fx+'；集結約 '+Math.round(D.prep/60)+' 分鐘"'+(S.rep-D.cost<5?' disabled':'')+'>請求'+D.n+'支援（評鑑 -'+D.cost+'）</button>'}
 return h}
