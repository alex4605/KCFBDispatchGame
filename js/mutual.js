// 跨縣市支援（Mutual aid）：
// 一、我方請求：臺南市、屏東縣消防局、內政部消防署特種搜救隊，或本日輪值的 USAR Strike Force，需花費評鑑；集結與長途行駛時間長，任務結束直接返回原單位。
// 二、外縣市請求我方：偶爾會收到其他縣市的支援請求，派出指定車種（USAR 只能由特搜分隊執行）完成後以評鑑為報酬。
'use strict';
const MA_DEF={
 tn:{n:'臺南市消防局',cs:'臺南',cost:15,prep:240,from:'n',fx:'幫浦車 3、水庫車 1、指揮車 1（歸仁、關廟、仁德、龍崎分隊）',
  us:[['11','歸仁'],['11','關廟'],['11','仁德'],['61','龍崎'],['41','歸仁']]},
 pt:{n:'屏東縣消防局',cs:'屏東',cost:10,prep:240,from:'e',fx:'幫浦車 2、救助車 1、特搜 1（新園、萬丹、里港分隊與屏東特搜）',
  us:[['11','新園'],['11','萬丹'],['71','里港'],['搜','屏東']]},
 nfa:{n:'內政部消防署特種搜救隊',cs:'署搜',grp:'署特搜',cost:12,prep:360,from:'n',fx:'特搜 2、救助車 1、消防機器人 1（重型破壞、倒塌搜救、侷限空間）',
  us:[['搜','署搜'],['搜','署搜'],['71','署搜'],['履','署搜']]},
 sf:{n:'輪值 USAR Strike Force',cs:'輪值特搜',cost:12,rot:1}};
// 輪值支援單位：重大災害時由該縣市負責支援 USAR 能量；每週（7 個遊戲日）輪替
const MA_ROT=[
 ['臺北市',['民權'],'n',900],['新北市',['南雅','德音','慈福','秀峰','大埔'],'n',900],['桃園市',['一搜','二搜','三搜','四搜'],'n',840],
 ['臺中市',['大誠','國光','西屯','搜救犬隊'],'n',600],['臺南市',['大橋','歸仁','關廟','仁德','龍崎'],'n',300],
 ['基隆市',['七堵','百福'],'n',960],['新竹縣市',['金山','光復','二重','竹北','光明'],'n',780],['苗栗縣',['特搜'],'n',720],
 ['彰化縣',['林厝','彰化東區'],'n',560],['南投縣',['竹山','埔里','南投'],'n',600],['雲林縣',['公園','虎尾','四湖'],'n',480],
 ['嘉義縣市',['東區','蘭潭','祥和','雙福','三和'],'n',420],['屏東縣',['特搜'],'e',240],['宜蘭縣',['馬賽','冬山'],'n',1020],
 ['花蓮縣',['特搜','自強','仁里'],'e',960],['臺東縣',['特搜'],'e',780]];
const maWeek=()=>Math.floor((S.day-1)/7)+1;
const maRot=()=>MA_ROT[(maWeek()-1)%MA_ROT.length];
// 輪值單位的呼號：一搜等本身就是特搜分隊；「特搜」冠縣市名；其餘為分隊名加「搜」
const maRotCs=(cty,st)=>st==='特搜'?cty.slice(0,2)+'特搜':/搜$/.test(st)?st:/隊$/.test(st)?cty.slice(0,2)+st:st+'搜';
// 署特搜另可支援的重大救助案件
const MA_RESC=['collapse','majorind','gasblast','slide','mrescue','aircraft','train','transit','buscrash','confined'];
// 三級火警才能請求（有火警分級的看分級，其他火警看案類等級）；署特搜、輪值 Strike Force 另可支援重大救助
function maLvl3(inc){const d=KIND[inc.k];if(d.cls!=='火警')return false;return(inc.pm.lvl!==undefined?inc.pm.lvl:d.lv||0)>=3}
const maOK=(inc,key)=>!!inc.rev&&(maLvl3(inc)||((key==='nfa'||key==='sf')&&MA_RESC.includes(inc.k)));
const maAny=inc=>Object.keys(MA_DEF).some(k=>maOK(inc,k));
const maName=k=>k==='sf'?'輪值 USAR（'+maRot()[0]+'）':MA_DEF[k].n;
const maGrp=k=>k==='sf'?'輪值特搜':MA_DEF[k].grp||MA_DEF[k].n;
// 進入轄區的道路：北邊國道或東邊（高屏溪、南橫）的地圖邊緣
function maEntry(side){let best=null,bv=-INF;
 for(let x=0;x<N;x++)for(let y=0;y<N;y++){const r=RD[K(x,y)];if(!r||r===5)continue;const v=side==='n'?-y:side==='e'?x:side==='s'?y:-x;if(v>bv){bv=v;best=[x,y]}}
 return best}
function maCall(inc,key){
 const D=MA_DEF[key];inc.ma=inc.ma||{};
 if(inc.ma[key]){msg=maName(key)+'已在支援中';return false}
 if(!maOK(inc,key)){msg=key==='nfa'||key==='sf'?'僅支援三級火警或重大救助案件':'三級火警才能請求跨縣市支援';return false}
 if(S.rep-D.cost<5){msg='評鑑不足（需 '+D.cost+'，且請求後須保留 5 以上）';return false}
 // 輪值 Strike Force：由本日輪值縣市的分隊組成（3 個以上分隊取 3 個；單一分隊時另加救助車）
 let us=D.us,from=D.from,prep=D.prep,fx=D.fx,nm=D.n;
 if(D.rot){const R=maRot(),pick=R[1].slice().sort(()=>Math.random()-.5).slice(0,3);
  us=pick.map(s=>['搜',s]);if(pick.length===1)us.push(['71',pick[0]]);from=R[2];prep=R[3];nm='輪值 USAR Strike Force（'+R[0]+'）';
  fx=us.map(u=>u[0]==='71'?maRotCs(R[0],u[1]).replace(/搜$/,'')+'71':maRotCs(R[0],u[1])).join('、')}
 const e=maEntry(from);if(!e){msg='找不到進入轄區的道路';return false}
 let si=0,bd=INF;for(let i=0;i<S.nst;i++){const d=Math.hypot(SPOT[i].p[0]-e[0],SPOT[i].p[1]-e[1]);if(d<bd){bd=d;si=i}}
 S.rep-=D.cost;const cnt={};
 for(const[c,st]of us){
  addU(si,c);const u=S.units[S.units.length-1];u.ma=key;u.usar=0;
  const tag=st+c;cnt[tag]=(cnt[tag]||0)+1;
  let cs;
  if(D.rot){const R=maRot();cs=c==='搜'?maRotCs(R[0],st):maRotCs(R[0],st).replace(/搜$/,'')+c;u.stn=st+'（'+R[0]+'）'}
  else if(key==='nfa'){cs='署搜'+(c==='搜'?cnt[tag]:c==='71'?'救助':c==='履'?'履':c);u.stn='署特搜'}
  else{cs=st+(c==='搜'?'特搜':c)+(cnt[tag]>1?'-'+cnt[tag]:'');u.stn=st+(c==='搜'?'特搜':'')+'分隊（'+D.cs+'）'}
  // 同時有另一批同單位車隊在轄區：加註梯次避免呼號重複
  const dup=S.units.filter(v=>v!==u&&v.cs.replace(/-第\d梯$/,'')===cs).length;u.cs=dup?cs+'-第'+(dup+1)+'梯':cs;
  u.x=e[0];u.y=e[1];reindex();
  if(send(inc,u))u.turn=prep+Math.random()*60;else u.gone=1}
 inc.ma[key]={t:S.t,nm};
 radio(inc,'受理','已請求'+nm+'支援（評鑑 -'+D.cost+'）：'+fx+'，集結後由'+(from==='n'?'北邊國道':'東邊高屏溪橋')+'進入轄區。');
 return true}
// 支援車隊在現場的狀態
function maStat(inc,key){const us=S.units.filter(u=>u.ma===key&&u.inc===inc.id);
 if(!us.length)return'';const w=us.filter(u=>u.st==='work').length;
 return w?'到場 '+w+' / '+us.length+' 車':us.some(u=>u.turn>0)?'集結中 '+fmt(Math.max(...us.map(u=>u.turn))):'前往中 '+us.length+' 車'}
// 詳情面板按鈕
function maHTML(inc){
 let h='';
 for(const k in MA_DEF){if(!maOK(inc,k))continue;const D=MA_DEF[k],st=inc.ma&&inc.ma[k];
  const tip=k==='sf'?'第 '+maWeek()+' 週輪值：'+maRot()[0]+'（'+maRot()[1].join('、')+'）；集結約 '+Math.round(maRot()[3]/60)+' 分鐘':D.fx+'；集結約 '+Math.round(D.prep/60)+' 分鐘';
  h+=st?'<span class="tag" style="background:#3d5a80">'+(k==='sf'?'輪值特搜':D.cs)+'支援：'+(maStat(inc,k)||'已返隊')+'</span>':
   '<button data-ma="'+k+'" title="'+esc(tip)+'"'+(S.rep-D.cost<5?' disabled':'')+'>請求'+maName(k)+'支援（評鑑 -'+D.cost+'）</button>'}
 return h}
// ===== 外縣市請求我方支援 =====
const MR_FROM=['臺南市','屏東縣','嘉義縣','臺東縣','臺中市','花蓮縣','雲林縣'];
const MR_TYPE=[['大樓火災',[['11',2]],6],['工廠火警',[['11',1],['61',1]],5],['建物倒塌',[['usar',2]],8],['山林火警',[['11',2],['71',1]],7],['大量傷病患',[['91',2]],5]];
function mrStep(dt){
 S.mr=S.mr||[];S.mrT=S.mrT===undefined?420+Math.random()*300:S.mrT-dt;
 if(S.mrT<=0){S.mrT=600+Math.random()*420;
  if(!S.mr.some(r=>!r.sent)){const t=pick(MR_TYPE),f=pick(MR_FROM);
   S.mr.push({id:uid++,from:f,n:t[0],need:t[1].map(x=>({c:x[0],n:x[1]})),rep:t[2],pay:1500+Math.round(Math.random()*3000),left:120,dur:360+Math.random()*240,sent:0,us:[]});
   msg=f+'消防局請求跨縣市支援：'+t[0]+'（點進線案件查看）'}}
 for(let i=S.mr.length-1;i>=0;i--){const r=S.mr[i];
  if(!r.sent){r.left-=dt;if(r.left<=0){S.mr.splice(i,1);if(sel===r.id)sel=null;msg=r.from+'的支援請求已由其他縣市承接。'}continue}
  if(S.units.filter(u=>r.us.includes(u.id)).every(u=>u.st!=='away')){
   const g=repGain(r.rep);S.money+=r.pay;S.score+=Math.round(r.pay/10);
   msg='支援'+r.from+'（'+r.n+'）完成返隊：評鑑 +'+g.toFixed(1)+'、補助 $'+r.pay;S.mr.splice(i,1);if(sel===r.id)sel=null}}}
// 可派出的車：USAR 只能由特搜分隊（特一、特二）出勤；其他依車種，優先從待命車多的分隊抽
function mrPick(r){const out=[],used=new Set();
 for(const g of r.need){const c=S.units.filter(u=>u.st==='idle'&&!u.ma&&!used.has(u.id)&&(g.c==='usar'?u.usar&&u.code!=='99':u.code===g.c&&!u.usar))
  .sort((a,b)=>S.ix.idle[b.si]-S.ix.idle[a.si]).slice(0,g.n);
  if(c.length<g.n)return null;for(const u of c){used.add(u.id);out.push(u)}}
 return out}
function mrSend(r){const us=mrPick(r);if(!us){msg='待命車輛不足，無法派出支援';return false}
 for(const u of us){u.st='away';u.awayT=r.dur;u.awayTo=r.from;if(u.code==='91')crewUp(u,'BLS')}
 r.sent=1;r.us=us.map(u=>u.id);msg='已派 '+us.map(u=>u.cs).join('、')+' 支援'+r.from+'，約 '+Math.round(r.dur/60)+' 分鐘後返隊。';return true}
function mrHTML(r,mm){
 const L=g=>g.c==='usar'?'USAR（特搜分隊）':CODE[g.c].n;
 let h=mm+'<div class="hd">跨縣市支援請求</div><div style="font-size:15px">'+r.from+'消防局 · '+r.n+'</div>'+
  '<div class="sub" style="margin:6px 0">請求 '+r.need.map(g=>L(g)+' × '+g.n).join('、')+'；支援約 '+Math.round(r.dur/60)+' 分鐘'+(r.sent?'':' · 回覆時限 '+fmt(r.left))+'</div>'+
  '<div class="sub">報酬：評鑑 +'+r.rep+'（實際依目前評鑑遞減）、補助 $'+r.pay+'。派出期間這些車無法在轄區出勤。</div>';
 if(r.sent)h+='<div class="sub" style="margin-top:6px">支援中：'+S.units.filter(u=>r.us.includes(u.id)).map(u=>u.cs+(u.st==='away'?'（剩 '+fmt(u.awayT)+'）':'（已返隊）')).join('、')+'</div>';
 else{const us=mrPick(r);h+='<div class="sub" style="margin-top:6px">將派出：'+(us?us.map(u=>u.cs).join('、'):'<span style="color:var(--red)">待命車輛不足</span>')+'</div>'+
  '<div class="row" style="gap:6px;margin-top:6px"><button data-mrsend="'+r.id+'"'+(us?'':' disabled')+'>派遣支援</button><button data-mrno="'+r.id+'">婉拒</button></div>'}
 return h}
