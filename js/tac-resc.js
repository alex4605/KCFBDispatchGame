// 戰術指揮：救助案件深化——受困者創傷惡化與醫療處置、擠壓症候群、破壞救援的器材與協同（累積進度）、
// 未爆氣囊、瓦礫中的生命探測（搜救犬、音響生命探測器）、脫困傷患以長背板搬運
'use strict';
Object.assign(TAC_TASK,{care:'醫療處置',locate:'生命探測'});
// 重物壓住（瓦礫、聯結車、遊覽車、列車）：惡化較快，長時間受壓會有擠壓症候群
const tacHeavy=(B,x)=>!!x.rub||/cargo|bus|rcar|loco|cab/.test(tacK(B,x.f,x.c)||'');
const tacCared=x=>x.careT>S.t;
// 被夾住、被壓住的受困者每秒惡化（醫療處置時減為四分之一，狀況差的會慢慢回穩）
function tacTrauma(B,x){if(!(x.pin>0))return 0;const r=.0009*(tacHeavy(B,x)?1.4:1);return tacCared(x)?(x.vh<.55?-.0012*(x.careM?1.6:1):r*.25):r}
// 開場：倒塌、坍陷、吊車現場的瓦礫深處另有被埋的人（搜索找不到，要生命探測）
function tacRescInit(B){if(!/^(collapse|crane|sink)$/.test(B.sc.k))return 0;let n=0;
 const rb=B.cells.filter(x=>x.rub&&!x.edge).sort(()=>Math.random()-.5);
 for(const x of rb){if(n>=2||(n&&Math.random()<.5))break;x.hid=(x.hid||0)+1;if(!(x.vic>0))x.vh=.6+Math.random()*.15;n++}
 return n}
// 每幀：受困時間
function tacRescStep(inc,B,dt){for(const x of B.cells){if(x.pin>x.vic)x.pin=Math.max(0,x.vic);if(x.pin>0)x.pT=(x.pT||0)+dt}}
// ===== 新任務：醫療處置、生命探測 =====
function tacRescCan(B,q,k,f,c){
 if(k!=='care'&&k!=='locate')return null;
 if(q.ty==='robot'||q.ty==='ladder')return'此組無法執行';
 if(f===undefined||f<0)return'請點選受困者所在的位置';
 const x=tacCel(B,f,c);
 if(k==='care'){if(!(x.vic>0))return'這裡沒有受困者';if(q.ty==='med'&&!B.out)return'特搜醫療組在屋外支援，不進入建物';return''}
 if(q.ty!=='resc'&&!q.usar)return'生命探測需要救助組（音響生命探測器）或特搜（搜救犬）';
 if(!x.rub)return'生命探測用在瓦礫、倒塌結構、土石中';if(x.loc)return'這裡已經探測過';return''}
function tacRescTask(inc,B,q,k,cl,dt){
 if(k==='care'){if(!(cl.vic>0)){q.task='idle';radio(inc,q.cs,tacNm(B,q.f,q.c)+'受困者已救出，醫療處置結束。');return}
  cl.careT=S.t+1.5;cl.careM=q.ty==='med'?1:0;
  if(!q.cwS){q.cwS=1;radio(inc,q.cs,'醫療處置：'+tacNm(B,q.f,q.c)+'受困者頸椎保護、給氧'+(q.ty==='med'?'、建立靜脈管路輸液':'')+'，持續監測生命徵象。')}return}
 if(k==='locate'){q.wk+=dt;if(q.wk<(q.usar?10:22))return;q.wk=0;cl.loc=1;q.task='idle';
  if(cl.hid>0){const n=cl.hid;cl.vic+=n;cl.hid=0;cl.pin=(cl.pin||0)+n;cl.rep=1;if(!(cl.vh>0))cl.vh=.55;
   radio(inc,q.cs,(q.usar?'搜救犬吠叫示警、':'')+'音響生命探測器聽到回應：'+tacNm(B,q.f,q.c)+'下方有 '+n+' 名受困者被壓住！');tacEvt(inc,B,'victim','生命探測：'+tacNm(B,q.f,q.c)+' '+n+' 名')}
  else radio(inc,q.cs,tacNm(B,q.f,q.c)+'生命探測沒有發現生命跡象。');return}}
// ===== 破壞救援（取代原本的單組計時）=====
// 進度記在受困位置上，多組可以協同（同時作業進度相加）；器材：特搜最快、救助組次之、幫浦組（簡易破壞器材）最慢；倒塌結構要先支撐，較慢
// 沒先穩固：車體晃動、未爆氣囊突然爆開；長時間受壓的受困者釋放前沒有醫療處置（輸液）會發生擠壓症候群；脫困後以長背板搬運
const tacExtrRate=q=>q.usar?1/12:q.ty==='resc'?1/18:1/35;
function tacExtrStep(inc,B,q,cl,dt){
 if(!cl.stab&&!cl.rub&&!q.ex0){q.ex0=1;const R=Math.random();
  if(R<.25){cl.vh=Math.max(.05,(cl.vh||.6)-.15);q.hp-=.1;radio(inc,'安全官',tacNm(B,q.f,q.c)+'車輛沒先穩固，破壞時車體晃動，受困者與隊員受傷！');tacEvt(inc,B,'warn','未先穩固車輛（'+q.cs+'）');(B.viol||(B.viol={})).noStab=1}
  else if(R<.45&&!cl.ab){cl.ab=1;cl.vh=Math.max(.05,(cl.vh||.6)-.1);q.hp-=.15;radio(inc,'安全官',tacNm(B,q.f,q.c)+'未爆的安全氣囊突然爆開，隊員受傷！破壞前要先穩固、斷電（拔鑰匙、斷電瓶）。');tacEvt(inc,B,'warn','未爆氣囊爆開（'+q.cs+'）');(B.viol||(B.viol={})).airbag=1}}
 const n=B.sq.filter(y=>y.task==='extr'&&y.f===q.f&&y.c===q.c&&!y.down).length;
 cl.exP=(cl.exP||0)+dt*tacExtrRate(q)/(cl.rub?1.3:1)*(cl.kidc?4:1);
 if(n>1&&!cl.coW){cl.coW=1;radio(inc,q.cs,'兩組協同破壞救援'+tacNm(B,q.f,q.c)+'，一組撐開、一組剪切，進度加快。')}
 if(cl.exP<1)return;cl.exP=0;q.ex0=0;cl.coW=0;
 // 擠壓症候群：受壓超過 90 秒、釋放前沒有醫療處置
 const crush=tacHeavy(B,cl)&&(cl.pT||0)>90;
 if(crush&&!tacCared(cl)){cl.vh=Math.max(.02,(cl.vh||.6)-.35);(B.viol||(B.viol={})).crush=1;
  radio(inc,'救護組','擠壓症候群！受困者長時間受壓、突然釋放後休克（血鉀上升、心律不整）。釋放前要先醫療處置（輸液）。');tacEvt(inc,B,'danger','擠壓症候群（'+tacNm(B,q.f,q.c)+'）',1)}
 else if(crush)radio(inc,'救護組','釋放前已預先輸液，受困者生命徵象穩定。');
 cl.pin--;if(!cl.kidc)cl.lbv=(cl.lbv||0)+1;cl.pT=cl.pin>0?cl.pT:0;
 radio(inc,q.cs,tacNm(B,q.f,q.c)+(cl.kidc?'擊破離孩子最遠的車窗、開鎖後':cl.rub?'以氣墊頂升、破壞後':B.mach?'拆解機台（油壓擴張器、切斷滾輪軸）後':'破壞救援（油壓剪、擴張器）')+'救出 1 名受困者'+(cl.pin>0?'，還有 '+cl.pin+' 名被夾住':'')+(cl.kidc?'，抱出交給救護人員降溫。':'，上長背板搬運。'));
 tacEvt(inc,B,'victim','破壞救援：'+tacNm(B,q.f,q.c));
 if(cl.pin<=0){q.task='search';q.tf=q.f;q.tc=q.c}}
// ===== 戰術 AI：生命探測、醫療處置、第二組協同破壞 =====
function tacRescAI(inc,B,free,take){
 for(const x of B.cells){if(!x.rub||x.loc||B.sq.some(q=>q.task==='locate'&&q.tf===x.f&&q.tc===x.c))continue;
  const r=free.find(q=>q.usar)||free.find(q=>q.ty==='resc'&&q.air>.5);if(r&&tacOrder(inc,r,'locate',x.f,x.c,1)){take(r);radio(inc,r.cs,'前往'+tacNm(B,x.f,x.c)+'生命探測。')}}
 for(const x of B.cells){if(!(x.pin>0)||!(x.vic>0)||(x.pT||0)<15||B.sq.some(q=>q.task==='care'&&q.tf===x.f&&q.tc===x.c)||(x.careQ&&x.careQ.task==='care'&&!x.careQ.down)||S.t-(x.careO||-99)<40)continue;
  const r=free.find(q=>q.ty==='med')||free.find(q=>q.ty==='pump'&&!q.line&&!q.vol)||free.find(q=>q.ty!=='robot'&&q.ty!=='ladder'&&!q.line);
  if(r&&tacOrder(inc,r,'care',x.f,x.c,1)){take(r);x.careQ=r;x.careO=S.t;radio(inc,r.cs,'前往'+tacNm(B,x.f,x.c)+'醫療處置（受困者狀況不穩）。')}}
 for(const x of B.cells){if(!(x.pin>0)||(x.rub&&!x.shore)||(!x.rub&&!x.stab))continue;const n=B.sq.filter(q=>q.task==='extr'&&q.tf===x.f&&q.tc===x.c).length;if(n!==1)continue;
  const r=free.find(q=>q.usar)||free.find(q=>q.ty==='resc');if(r&&tacOrder(inc,r,'extr',x.f,x.c,1)){take(r);radio(inc,r.cs,'支援'+tacNm(B,x.f,x.c)+'協同破壞救援。')}}}
// ===== 顯示 =====
const tacVicCond=vh=>vh<.45?['紅（危急）','#ff6a5a']:vh<.8?['黃（嚴重）','#e9a13b']:['綠（輕傷）','#5dcaa5'];
function tacRescRows(B,x){
 if(!(x.pin>0)||!(x.vic>0))return[];const c=tacVicCond(x.vh);
 return[['受困 '+x.vic+' 名（夾住 '+x.pin+'）· '+c[0]+' · 受困 '+fmt(x.pT||0)+(tacCared(x)?' · 醫療處置中':''),c[1]]].concat(tacHeavy(B,x)&&(x.pT||0)>60&&!tacCared(x)?[['⚠ 長時間受壓：釋放前要先醫療處置（擠壓症候群）','#ff6a5a']]:[])}
function tacRescHTML(B){
 const xs=B.cells.filter(x=>x.pin>0&&x.vic>0);if(!xs.length)return'';
 return'<div class="hd mt">受困者（被夾、被壓）</div><div class="twater">'+xs.map(x=>{const c=tacVicCond(x.vh);
  return'<div class="row"><span>'+tacNm(B,x.f,x.c)+'</span><span><b style="color:'+c[1]+'">'+c[0]+'</b> · 夾住 '+x.pin+' · '+fmt(x.pT||0)+(tacCared(x)?' · <b style="color:var(--grn)">醫療處置中</b>':'')+(x.rub?(x.shore?' · 已支撐':' · 未支撐'):(x.stab?' · 已穩固':' · 未穩固'))+(x.exP?' · 破壞 '+Math.round(x.exP*100)+'%':'')+'</span></div>'}).join('')+'</div>'}
function tacRescRep(B,sc,notes){const v=B.viol||{};
 if(v.crush){sc.safe-=10;notes.push('長時間受壓的受困者釋放前沒有醫療處置，發生擠壓症候群')}
 if(v.airbag){sc.safe-=5;notes.push('破壞前沒有穩固、斷電，未爆氣囊爆開')}
 if(v.noStab){sc.safe-=5;notes.push('破壞救援前沒有先穩固車輛')}
 sc.safe=Math.max(0,sc.safe)}
