// 跨縣市支援（Mutual aid）：向臺南市、臺東縣消防局請求支援車隊，需花費評鑑；集結與長途行駛時間長，結案後直接返回原縣市
'use strict';
const MA_DEF={
 tn:{n:'臺南市消防局',cs:'臺南',cost:15,prep:240,from:'n',pk:[['11',3],['61',1],['41',1]],fx:'幫浦車 3、水庫車 1、指揮車 1'},
 tt:{n:'臺東縣消防局',cs:'臺東',cost:10,prep:540,from:'e',pk:[['11',2],['71',1],['搜',1]],fx:'幫浦車 2、救助車 1、山搜特搜隊 1（熟悉山區）'}};
// 大型案件才能請求：大型災害、山林火警、二級以上火警
const maOK=inc=>{const d=KIND[inc.k];return!!inc.rev&&!!(d.big||d.wild||(inc.pm.lvl||0)>=2)};
// 進入轄區的道路：臺南從北邊、臺東從東邊的地圖邊緣
function maEntry(side){let best=null,bv=-INF;
 for(let x=0;x<N;x++)for(let y=0;y<N;y++){const r=RD[K(x,y)];if(!r||r===5)continue;const v=side==='n'?-y:side==='e'?x:side==='s'?y:-x;if(v>bv){bv=v;best=[x,y]}}
 return best}
function maCall(inc,key){
 const D=MA_DEF[key];inc.ma=inc.ma||{};
 if(inc.ma[key]){msg=D.n+'已在支援中';return false}
 if(!maOK(inc)){msg='僅大型案件可請求跨縣市支援';return false}
 if(S.rep-D.cost<5){msg='評鑑不足（需 '+D.cost+'，且請求後須保留 5 以上）';return false}
 const e=maEntry(D.from);if(!e){msg='找不到進入轄區的道路';return false}
 let si=0,bd=INF;for(let i=0;i<S.nst;i++){const d=Math.hypot(SPOT[i].p[0]-e[0],SPOT[i].p[1]-e[1]);if(d<bd){bd=d;si=i}}
 S.rep-=D.cost;let n=0;
 for(const[c,k]of D.pk)for(let i=0;i<k;i++){
  addU(si,c);const u=S.units[S.units.length-1];u.ma=key;u.cs=D.cs+(c==='搜'?'特搜':c)+(k>1?'-'+(i+1):'');u.x=e[0];u.y=e[1];
  reindex();
  if(send(inc,u)){u.turn=D.prep+Math.random()*60;n++}else u.gone=1}
 inc.ma[key]={t:S.t,n};
 radio(inc,'受理','已請求'+D.n+'跨縣市支援（評鑑 -'+D.cost+'）：'+D.fx+'，集結後由'+(D.from==='n'?'北邊國道':'東部山區道路')+'進入轄區。');
 return true}
// 支援車隊在現場的狀態
function maStat(inc,key){const us=S.units.filter(u=>u.ma===key&&u.inc===inc.id);
 if(!us.length)return'';const w=us.filter(u=>u.st==='work').length;
 return w?'到場 '+w+' / '+us.length+' 車':us.some(u=>u.turn>0)?'集結中 '+fmt(Math.max(...us.map(u=>u.turn)))+'':'前往中 '+us.length+' 車'}
// 詳情面板按鈕
function maHTML(inc){
 if(!maOK(inc))return'';
 let h='';
 for(const k in MA_DEF){const D=MA_DEF[k],st=inc.ma&&inc.ma[k];
  h+=st?'<span class="tag" style="background:#3d5a80">'+D.cs+'支援：'+(maStat(inc,k)||'已返隊')+'</span>':
   '<button data-ma="'+k+'" title="'+D.fx+'；集結約 '+Math.round(D.prep/60)+' 分鐘"'+(S.rep-D.cost<5?' disabled':'')+'>請求'+D.n+'支援（評鑑 -'+D.cost+'）</button>'}
 return h}
