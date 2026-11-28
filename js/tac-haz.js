// 戰術指揮：化學災害——防護裝備（消防衣／A／B／C 級）、化學品洩漏與濃度擴散、化物辨識、止漏、除污、環保署化災應變隊
'use strict';
// 防護等級：消防衣帽鞋（預設，耐火）、C 級（濾毒罐、防濺，不耐火、不能進濃煙缺氧）、B 級（空氣呼吸器＋防濺）、A 級（氣密全身）
const TAC_PPE={F:{n:'消防衣',p:1,fire:1},C:{n:'C級',p:1},B:{n:'B級',p:2},A:{n:'A級',p:3}};
// 化學品：lv 需要的防護等級（1 C、2 B、3 A）；fl 可燃（偵測器量得到 LEL）；h2s 為硫化氫
const TAC_CHEM=[{n:'氨氣',lv:3},{n:'氯氣',lv:3},{n:'鹽酸',lv:2},{n:'甲苯',lv:2,fl:1},{n:'硫化氫',lv:3,h2s:1},{n:'丙酮',lv:2,fl:1}];
const TAC_WASTE=[{n:'廢溶劑（甲苯、丙酮混合）',lv:2,fl:1},{n:'強酸廢液',lv:2}];
const TAC_FUEL={n:'汽油',lv:1,fl:1,fuel:1};
// 化災車（化學災害車、特殊化學車）每輛攜帶的 A、B 級防護衣套數
const TAC_PPEK={'51':{A:1,B:2},'01':{A:1,B:2}};
function tacPPECap(inc){const c={A:0,B:0};for(const u of onScene(inc)){const k=TAC_PPEK[u.code];if(k&&u.st==='work'){c.A+=k.A;c.B+=k.B}}return c}
function tacPPEUsed(B,lv,ex){return B.sq.filter(q=>q!==ex&&!q.epa&&q.ppe===lv).reduce((a,q)=>a+q.n,0)}
// 換裝：人員須在屋外；A、B 級受化災車套數限制（化災應變隊自備，不受限）；套數不足 3 人時以 2 人編組進入
function tacPPE(inc,B,q,lv,quiet){
 const say=s=>{if(!quiet)msg=q.cs+'：'+s;return false};
 if(q.ty==='ladder'||q.ty==='robot')return say('此組不需換裝');
 if(tacIn(q))return say('人員在室內，需先撤出才能換裝');
 if(q.down)return say('該組已倒地');
 if((q.ppe||'F')===lv&&q.task!=='dress')return say('已是'+TAC_PPE[lv].n);
 if(q.n0)q.n=q.n0;
 if((lv==='A'||lv==='B')&&!q.epa){
  const cap=tacPPECap(inc)[lv],av=cap-tacPPEUsed(B,lv,q);
  if(!cap)return say('現場沒有化災車，沒有'+TAC_PPE[lv].n+'防護衣');
  if(av<2)return say(TAC_PPE[lv].n+'防護衣已用完（共 '+cap+' 套）');
  if(av<q.n){q.n0=q.n;q.n=av;if(!quiet)radio(inc,q.cs,TAC_PPE[lv].n+'防護衣只剩 '+av+' 套，以 '+av+' 人編組，其餘人員車邊待命。')}}
 q.prev=null;q.task='dress';q.wk=0;q.ppeT=lv;q.tf=-1;q.tc=0;
 if(!quiet)radio(inc,q.cs,'收到，換穿'+TAC_PPE[lv].n+(lv==='F'?'帽鞋':'防護')+'，約 '+tacDressT(q,lv)+' 秒。');
 return true}
const tacDressT=(q,lv)=>q.epa?(lv==='A'?20:10):lv==='A'?40:lv==='B'?25:lv==='C'?15:15;
// 化學品洩漏：濃度 cz（0～1）由洩漏源向相鄰空間擴散，室外順風擴散較快；止漏後慢慢消散
// 危害等級 hz：依濃度與化學品需要的防護等級換算（0 無、1 低、2 中、3 高）
function tacChemStep(inc,B,dt){
 if(!B.chem)return;
 const lk=B.leak,W=B.W;
 if(lk&&lk.on){const x=tacCel(B,lk.f,lk.c);x.cz=1;
  if(B.chem.fuel&&x.fu<.8)x.fu=.8; // 油品持續外洩，起火點撲不熄
  if(B.chem.fuel&&x.h>.05)x.h=Math.max(x.h,.35)}
 const add=new Float32Array(B.cells.length);
 for(const x of B.cells){if(!(x.cz>0))continue;
  for(const cc of tacNb(B,x.f,x.c)){const y=B.cells[x.f*W+cc];
   const wf=B.wind?tacWF(B,x.c,cc):1,m=dt*(B.out?.05:.022)*(x.cz-(y.cz||0))*wf*(tacShut(B,x.f,x.c,cc)?.2:1)*tacCbBar(B,x);if(m>0)add[x.f*W+cc]+=m}
  // 蒸氣比空氣重：往下一層的樓梯間沉降、比空氣輕往上散（見 cbrne.js）
  // 消散：室外較快；止漏後、開窗通風、射水稀釋都會加快
  x.cz=Math.max(0,x.cz-dt*((B.out?.004:.0015)+(lk&&lk.on?0:.004)+(x.wet?.01:0)+(x.v?.004:0)))}
 for(let i=0;i<add.length;i++)if(add[i]>0){const y=B.cells[i];y.cz=Math.min(1,(y.cz||0)+add[i])}
 const L=B.chem.fuel?0:B.chem.lv;
 for(const x of B.cells){x.hz=!L||!(x.cz>.06)?0:Math.max(1,Math.min(L,x.cz>.55?L:x.cz>.25?L-1:1));
  // 受困者暴露在化學品中也會惡化
  if(x.vic>0&&x.hz)x.vh-=dt*.002*x.hz*(B.chem.tox||1)}
 tacCbStep(inc,B,dt)}
// 每幀：換裝、化學暴露、防護衣受熱、C 級的限制、空氣與體力、除污；回傳 true 表示這一幀已用掉
function tacHazStep(inc,B,q,dt){
 if(q.task==='dress'){q.wk+=dt;if(q.wk>=tacDressT(q,q.ppeT)){q.wk=0;q.ppe=q.ppeT;q.task='idle';
  if(q.ppe==='F'&&q.n0){q.n=q.n0;q.n0=0}
  radio(inc,q.cs,'換裝完成（'+TAC_PPE[q.ppe].n+'）。')}return true}
 if(q.task==='decon'){if(!B.st.decon){q.task='idle';return true}tacDeconStep(inc,B,q,dt);return true}
 if(q.task==='zone'){q.wk+=dt;if(q.wk>=(q.ty==='hazmat'||q.epa?3:6)){q.wk=0;q.task='idle';tacZoneSet(inc,B,q)}return true}
 // 野火：露天作業不背空氣呼吸器，但濃煙中會受傷
 if(B.wild&&tacIn(q)){q.air=1;const x=tacCel(B,q.f,q.c);if(x.s>.55){q.hp-=dt*.008;if(!q.smW){q.smW=1;radio(inc,q.cs,'濃煙中作業，沒有空氣呼吸器，人員嗆傷，往上風處移動！')}}else q.smW=0}
 const lv=q.ppe||'F',P=TAC_PPE[lv];
 if(!tacIn(q)){
  // 受污染的小組：除污站開設後自動前往除污
  if(q.cont&&B.st.decon&&q.task==='idle'){q.task='decon';q.wk=0;radio(inc,q.cs,'前往除污站除污。')}
  return false}
 if(q.down||q.ty==='robot')return false;
 const x=tacCel(B,q.f,q.c),hz=x.hz||0;
 if(hz>0&&(hz>=2||lv!=='F'))q.cont=Math.max(q.cont||0,Math.min(3,hz)); // 污染程度：依暴露的危害等級（1 輕～3 重）
 if(hz>P.p){q.hp-=dt*.006*(hz-P.p)*(lv==='F'?1.2:1);
  if(!q.hzW){q.hzW=1;radio(inc,q.cs,'人員遭受化學暴露（'+(B.chemK?B.chem.n:'不明化學品')+'），防護等級不足！');tacEvt(inc,B,'danger',q.cs+' 化學暴露（'+tacNm(B,q.f,q.c)+'）',1)}
  if(q.hp<.3)tacDown(inc,B,q,'化學暴露')}
 else q.hzW=0;
 // 化學防護衣不耐火
 if(!P.fire&&x.h>.25){q.hp-=dt*.05*x.h;if(!q.htW){q.htW=1;radio(inc,q.cs,TAC_PPE[lv].n+'防護衣不耐火，遇火受熱，立即撤離！')}
  if(q.task!=='exit'){q.prev=null;q.task='exit';q.tf=-1;q.tc=0}
  if(q.hp<.3)tacDown(inc,B,q,'防護衣受熱損壞')}
 // C 級沒有空氣呼吸器：不耗氣，但不能進濃煙、缺氧或高濃度區
 if(lv==='C'){q.air=1;
  if(x.s>.3||x.o2<19.5||hz>1||(B.chem&&B.chem.noC&&hz>0)){q.hp-=dt*.02;if(!q.cW){q.cW=1;radio(inc,q.cs,(q.sdb?'沒有空氣呼吸器，遇到':'C 級濾毒罐無法應付')+(hz>1?'高濃度化學品':x.o2<19.5?'缺氧環境':'濃煙')+'，撤出！')}
   if(q.task!=='exit'){q.prev=null;q.task='exit';q.tf=-1;q.tc=0}}}
 // A、B 級：較耗氣、較易疲勞
 if(lv==='A'||lv==='B'){q.air-=dt/TAC_AIR*(lv==='A'?.25:.15);q.fat=Math.min(1.2,q.fat+dt/220*(lv==='A'?.8:.4))}
 return false}
// 化物辨識：化災組（偵檢器材）或化災應變隊到洩漏處辨識，揭露化學品名稱與危害區
function tacIdent(inc,B,q,dt){
 if(!B.chem){q.task='idle';radio(inc,q.cs,tacNm(B,q.f,q.c)+'偵檢結果：未檢出化學品。');return}
 if(B.chemK){q.task='idle';return}
 q.wk+=dt;if(q.wk<(q.epa?8:25)*(tacCP(B.chem).det==='bio'?1.8:1))return;q.wk=0;
 const x=tacCel(B,q.f,q.c);
 if(!(x.cz>.03)){q.task='idle';radio(inc,q.cs,tacNm(B,q.f,q.c)+'偵檢未檢出，請往洩漏源方向偵檢。');return}
 B.chemK=1;q.task='idle';
 radio(inc,q.cs,'化物辨識完成：'+B.chem.n+'，須著'+(['','C','B','A'][B.chem.lv])+'級以上防護進入熱區'+(B.chem.fl?'，具可燃性':'')+'。危害區已劃設。');
 tacEvt(inc,B,'milestone','化物辨識：'+B.chem.n+'（'+q.cs+'）')}
// 止漏：在洩漏源作業（化災應變隊最快、化災組次之，其他小組很慢）
function tacPlug(inc,B,q,dt){
 const lk=B.leak;
 if(!lk||!lk.on||lk.f!==q.f||lk.c!==q.c){q.task='idle';if(lk&&!lk.on)radio(inc,q.cs,'洩漏已止住。');else radio(inc,q.cs,'此處不是洩漏源。');return}
 q.wk+=dt;if(q.wk<(B.chem.util?10:q.epa?15:q.ty==='hazmat'?35:70))return;q.wk=0;
 lk.on=0;q.task='idle';
 radio(inc,q.cs,B.chem.plug?B.chem.plug:B.chem.fuel?'已關閉緊急遮斷閥並止漏，油料停止外洩。':'止漏完成，'+(B.chemK?B.chem.n:'化學品')+'停止外洩。');
 tacEvt(inc,B,'milestone','止漏完成（'+q.cs+'）')}
// 化災應變隊到場：加入一組（自備 A／B／C 級，不受化災車套數限制）
function tacEpaSync(inc,B){
 if(inc.epa!==3||B.sq.some(q=>q.epa))return;
 B.sq.push({u:'epa',epa:1,cs:inc.epaTr?'實習化災應變隊':'化災應變隊',sk:inc.epaTr?'rookie':undefined,code:'環',ty:'epa',n:4,f:-1,c:0,nf:-1,nc:0,mt:0,tf:-1,tc:0,
  task:'idle',air:1,hp:1,down:0,carry:0,line:0,lt:0,prev:null,resc:null,low:0,ext:0,wk:0,ppe:'B',
  tside:B.arr,side:B.arr,tmv:0,pf:0,len:0,src:null,burst:0,ent:null,ws:null,fat:0,cyl:3});
 tacEvt(inc,B,'milestone',inc.epaTr?'實習毒化災應變隊在場':'環保署化災應變隊到場')}
// 指令限制：受污染需先除污；化災應變隊、化災組能做的事
function tacHazCan(B,q,k){
 if(q.cont&&!tacIn(q)&&k!=='exit'&&k!=='move'&&!/^ppe/.test(k))return'人員受化學污染，需先到除污站除污';
 if(q.task==='dress'&&!/^ppe/.test(k))return'換裝中';
 if(q.epa&&!['ident','plug','gas','move','exit','search','search2','zone','dike','neut'].includes(k)&&!/^ppe/.test(k))return'化災應變隊只執行化物辨識、止漏、氣體偵測與搜索';
 if(k==='ident'&&q.ty!=='hazmat'&&!q.epa)return'需要化災車的偵檢器材（化災組）或化災應變隊';
 if(k==='plug'&&!(B.leak&&B.leak.on))return'目前沒有洩漏需要止漏';
 if(k==='plug'&&B.leak.np)return'管道內持續產生的硫化氫無法止漏，請往人孔送風（正壓排煙）';
 return''}
// 幕僚建議
function tacHazHints(inc,B,add){
 if(B.chem&&!B.chemK)add(1,'疑似化學品洩漏：派化災組'+(inc.epa===3?'或化災應變隊':'')+'化物辨識，辨識前進入熱區一律著 A 級。');
 if(B.leak&&B.leak.on)add(1,(B.chem.fuel?'油料持續外洩：先關閉緊急遮斷並止漏，泡沫車壓制油火（射水會擴大油火）。':'洩漏持續：派員著適當防護止漏'+(inc.epa===3?'（化災應變隊最快）':'')+'。'));
 if(B.chem&&!B.chem.fuel&&!B.st.decon&&(B.sq.some(q=>q.cont)||B.cells.some(x=>x.hz>=2)||B.pts.some(p=>p.cont)))add(1,'需開設除污站（設在上風處的暖區），受污染人員與傷患除污後才能再派、才能送醫。');
 if(tacCbOn(B)){const P=tacCP(B.chem),D=B.dcn;
  if(!B.zone&&(B.chemK||B.cells.some(x=>x.hz>0)))add(1,'劃設管制區：熱區、暖區、冷區，指揮站與集結區設在上風處（'+(tacUpSide(B)?TAC_SDN[tacUpSide(B)]+'側':'外圍')+'）。');
  if(B.chemK&&D&&B.st.decon&&D.mode!==P.dec&&!(P.dec==='dry'&&!P.wr))add(1,B.chem.n+(P.wr?'遇水反應：除污站只能乾除污！':'是'+(P.cor?'腐蝕性':'')+TAC_PHN[P.ph]+'，除污站要改濕除污。'));
  if(D&&B.st.decon&&tacDownSide(B,D.side))add(1,'除污站在下風處，應移到上風處（'+(tacUpSide(B)?TAC_SDN[tacUpSide(B)]+'側':'')+'）。');
  if(B.chemK&&P.wr&&B.sq.some(q=>q.line&&q.f>=0))add(0,B.chem.n+'遇水反應：禁止射水，用乾砂覆蓋（中和／覆蓋）。');
  if(B.chemK&&P.ph==='l'&&B.leak&&!B.cells.some(x=>x.dike))add(2,'外洩液體與射水的廢水要先圍堵（沙包、吸附棉），避免流入排水溝。');
  if(B.dwn&&B.dwn.r>.05&&!B.dwn.mode)add(1,'化學品飄向下風處民眾：疏散或廣播就地避難（關窗、關空調）。');
  if(B.pts.some(p=>p.cont)&&!B.st.mdecon&&B.pts.filter(p=>p.cont).length>=3)add(2,'受污染傷患多：開設大量除污（兩側消防車噴霧形成沖淋通道）。')}
 if(B.chem&&!B.chem.fuel&&EPA_K(inc.k)&&!inc.epa)add(2,'可請求環保署化災應變隊支援（集結約 5～8 分鐘）。');
 if(B.wind&&B.sq.some(q=>!tacIn(q)&&q.ty==='pump'&&TAC_SDV[q.tside][0]*B.wind.d[0]+TAC_SDV[q.tside][1]*B.wind.d[1]>.5)&&B.cells.some(x=>x.h>.3))
  add(2,'有車輛停在下風側（'+B.wind.nm+'），濃煙與毒性煙流會吹向人車，指揮站與集結區應設在上風處。')}
