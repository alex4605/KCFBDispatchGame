// 戰術指揮：CBRNE（化學、生物、放射、核、爆炸）共用核心——化學品物理性質、管制區（熱／暖／冷區）、
// 乾除污與濕除污、除污站位置（上風處）與排隊、傷患除污與大量除污、圍堵與廢水、中和與覆蓋、下風處民眾、偵測儀器
'use strict';
// ===== 化學品物理性質 =====
// ph 狀態（g 氣體／l 液體／s 固體粉末）；vd 蒸氣比重（>1 比空氣重，往低處、地下室沉；<1 往上散）；
// sol 溶於水的程度（水霧稀釋的效果）；wr 遇水反應（禁水）；hw 加水放熱噴濺；cor 腐蝕性；bio 疑似生物物質；
// dec 建議除污方式（dry 乾除污／wet 濕除污）；iso 初始隔離距離（m）；det 偵測方式（gas 五用氣體偵測器／tox 毒性氣體偵測器／pid 光離子偵測器／ph 酸鹼試紙／bio 生物檢測）
const TAC_CPD={ph:'l',vd:1,sol:0,dec:'wet',iso:50,det:'gas',un:'—',neu:''};
const TAC_CP={
 '氨氣':{ph:'g',vd:.6,sol:1,cor:1,dec:'wet',iso:100,det:'tox',un:'1005',neu:'大量水霧稀釋（極易溶於水）；廢水要圍堵'},
 '氯氣':{ph:'g',vd:2.5,sol:.5,cor:1,dec:'wet',iso:100,det:'tox',un:'1017',neu:'水霧壓制蒸氣（溶於水成酸），廢水要圍堵；鋼瓶止漏用專用止漏器'},
 '鹽酸':{ph:'l',vd:1.3,sol:1,cor:1,dec:'wet',iso:50,det:'ph',un:'1789',neu:'碳酸氫鈉（小蘇打）或石灰中和'},
 '硫酸':{ph:'l',vd:3.4,sol:1,cor:1,hw:1,dec:'wet',iso:50,det:'ph',un:'1830',neu:'碳酸氫鈉中和；不可直接灌水（放熱噴濺）'},
 '氫氟酸':{ph:'l',vd:.7,sol:1,cor:1,dec:'wet',iso:50,det:'ph',un:'1790',neu:'石灰（氫氧化鈣）中和；皮膚接觸塗葡萄糖酸鈣凝膠'},
 '氫氧化鈉（液鹼）':{ph:'l',vd:1,sol:1,cor:1,dec:'wet',iso:50,det:'ph',un:'1824',neu:'稀醋酸等弱酸中和'},
 '甲苯':{ph:'l',vd:3.1,sol:0,dec:'wet',iso:50,det:'pid',un:'1294',neu:'泡沫覆蓋抑制蒸氣；吸附棉、圍堵'},
 '丙酮':{ph:'l',vd:2,sol:1,dec:'wet',iso:50,det:'pid',un:'1090',neu:'抗溶性泡沫覆蓋；可用水稀釋'},
 '甲醇':{ph:'l',vd:1.1,sol:1,dec:'wet',iso:50,det:'pid',un:'1230',neu:'抗溶性泡沫覆蓋；可用水稀釋'},
 '硫化氫':{ph:'g',vd:1.2,sol:.3,dec:'dry',iso:100,det:'gas',un:'1053',neu:'水霧稀釋效果有限，以通風排除'},
 '硫化氫（缺氧）':{ph:'g',vd:1.2,sol:.3,dec:'dry',iso:30,det:'gas',un:'1053',neu:'通風排除、送風'},
 '汽油':{ph:'l',vd:3.5,sol:0,dec:'wet',iso:50,det:'pid',un:'1203',neu:'泡沫覆蓋抑制蒸氣；圍堵、吸油棉'},
 '天然氣':{ph:'g',vd:.55,sol:0,dec:'dry',iso:50,det:'gas',un:'1971',neu:'關斷氣源、通風；不需除污'},
 '桶裝瓦斯（液化石油氣）':{ph:'g',vd:1.8,sol:0,dec:'dry',iso:100,det:'gas',un:'1075',neu:'關斷氣源、水霧驅散；會沉積在低處'},
 '液化石油氣（LPG）':{ph:'g',vd:1.8,sol:0,dec:'dry',iso:300,det:'gas',un:'1075',neu:'關斷遮斷閥、水霧驅散；會沉積在低處'},
 '一氧化碳':{ph:'g',vd:.97,sol:0,dec:'dry',iso:30,det:'gas',un:'1016',neu:'關斷來源、通風'},
 '廢溶劑（甲苯、丙酮混合）':{ph:'l',vd:2.5,sol:.5,dec:'wet',iso:50,det:'pid',un:'1993',neu:'泡沫覆蓋；吸附棉、圍堵'},
 '強酸廢液':{ph:'l',vd:1.3,sol:1,cor:1,dec:'wet',iso:50,det:'ph',un:'3264',neu:'碳酸氫鈉或石灰中和'},
 '金屬鈉':{ph:'s',vd:1,sol:0,wr:1,dec:'dry',iso:50,det:'ph',un:'1428',neu:'乾砂、D 類滅火劑覆蓋；遇水產生氫氣起火'},
 '電石（碳化鈣）':{ph:'s',vd:1,sol:0,wr:1,dec:'dry',iso:50,det:'gas',un:'1402',neu:'乾燥覆蓋；遇水產生乙炔（可燃）'},
 '不明白色粉末':{ph:'s',vd:1,sol:0,bio:1,dec:'wet',iso:30,det:'bio',un:'—',neu:'濕布或稀釋漂白水覆蓋，避免揚塵；採樣送驗'}};
const tacCP=c=>c?Object.assign({},TAC_CPD,TAC_CP[c.n]||{}):TAC_CPD;
// 化工廠、槽車等可能出現的化學品（新增）
TAC_CHEM.push({n:'硫酸',lv:2},{n:'氫氟酸',lv:3,tox:1.6},{n:'氫氧化鈉（液鹼）',lv:2},{n:'甲醇',lv:2,fl:1,lelk:70},{n:'金屬鈉',lv:2,fl:1,lelk:40});
// 快速救援（Snatch and Grab）：背空氣呼吸器的小組可短時間進入比本身防護高一級的危害區，抓了人就出來（重度污染、會受傷）
// 消防衣＋空氣呼吸器可到 2 級、B 級可到 3 級；C 級沒有空氣呼吸器不能做
const tacPPEx=(q,k)=>{const lv=q.ppe||'F',p=TAC_PPE[lv].p;return lv!=='C'&&(k==='snatch'||q.task==='snatch'||(q.carry&&q.snG))?Math.min(3,p+1):p};
const TAC_PHN={g:'氣體',l:'液體',s:'固體／粉末'};
const tacCbOn=B=>!!(B.chem&&!B.chem.fuel&&!B.chem.nochem&&B.chem.lv>0);
// ===== 物理：蒸氣沉降或上升、水霧稀釋、遇水反應、廢水 =====
// tacChemStep 擴散後呼叫：樓梯間上下層的蒸氣交換、室外依比重散去的快慢、射水的效果、受困者的暴露
function tacCbStep(inc,B,dt){
 if(!B.chem)return;const P=tacCP(B.chem),W=B.W;
 // 比空氣重：經樓梯間往下一層（地下室）沉；比空氣輕：往上一層散
 if(!B.out&&B.F>1&&(P.vd>1.15||P.vd<.85))for(const n of B.L.N){if(n.ty!=='stair')continue;
  for(let f=0;f<B.F;f++){const a=B.cells[f*W+n.c],t=P.vd>1.15?f-1:f+1;if(t<0||t>=B.F||!(a.cz>.02))continue;const b=B.cells[t*W+n.c];
   const m=dt*.015*Math.max(0,a.cz-(b.cz||0)*.6)*Math.min(2,Math.abs(P.vd-1));if(m>0){a.cz-=m;b.cz=Math.min(1,(b.cz||0)+m)}}}
 for(const x of B.cells){if(!(x.cz>0))continue;
  // 室外：比空氣輕的散得快、重的貼地停留
  if(B.out)x.cz=Math.max(0,x.cz-dt*.003*(P.vd<.9?1:P.vd>1.5?-.4:0));
  // 射水：溶於水的才有稀釋效果（原本的消散已含一部分，不溶的扣回去）
  if(x.wet){x.cz=Math.max(0,x.cz-dt*.012*P.sol+dt*.008*(1-P.sol));
   if(P.wr&&!x.wrW){x.wrW=1;x.h=Math.max(x.h,.45);x.fu=Math.max(x.fu,.6);x.cz=Math.min(1,x.cz+.3);(B.viol||(B.viol={})).wr=1;
    radio(inc,'安全官',tacNm(B,x.f,x.c)+'遇水反應！'+B.chem.n+'碰到水產生可燃氣體起火，禁止射水，改用乾砂覆蓋！');tacEvt(inc,B,'danger','遇水反應（'+tacNm(B,x.f,x.c)+'）',1)}
   if(P.hw&&!x.hwW&&x.cz>.3){x.hwW=1;for(const q of B.sq)if(q.f===x.f&&q.c===x.c&&!q.down&&q.ty!=='robot')q.hp-=.12;
    radio(inc,'安全官',tacNm(B,x.f,x.c)+'直接灌水，'+B.chem.n+'放熱噴濺！改用中和劑，水只能大量稀釋。')}
   // 含化學品的廢水：沒有圍堵就流進排水溝
   if(!x.dike&&x.cz>.08&&!B.chem.util){B.runoff=(B.runoff||0)+dt*x.cz*12;
    if(B.runoff>120&&!(B.viol||{}).env){(B.viol||(B.viol={})).env=1;radio(inc,'環保局','含化學品的廢水流入排水溝，造成環境污染！請先圍堵（沙包、吸附棉、導水板）再射水。');tacEvt(inc,B,'warn','化學廢水流入排水溝')}}}
  // 圍堵、覆蓋、中和：減少本區往外擴散與蒸發
  if(x.foam||x.cover)x.cz=Math.max(0,x.cz-dt*.004);
  if(x.neu&&!(B.leak&&B.leak.on&&B.leak.f===x.f&&B.leak.c===x.c))x.cz=Math.max(0,x.cz-dt*.02);
  if(x.vic>0&&x.hz)x.vcz=Math.max(x.vcz||0,x.hz)}
 tacZoneStep(inc,B,dt);tacDwStep(inc,B,dt);tacDkPat(inc,B,dt)}
// 擴散時的阻隔係數：圍堵（液體）、泡沫覆蓋、乾砂覆蓋的區域較不會往外擴散
const tacCbBar=(B,x)=>x.dike&&tacCP(B.chem).ph==='l'?.3:x.foam||x.cover?.4:1;
// ===== 管制區 =====
// 熱區：有危害的區域（hz>0）；暖區：緊鄰熱區、除污站所在的緩衝帶；冷區：其餘（指揮站、集結區）
// 劃設管制區後畫出三區；化學品辨識後 60 秒還沒劃設，記缺失
function tacZoneStep(inc,B,dt){
 if(!tacCbOn(B))return;
 if(!B.zone&&B.chemK&&B.chemKT===undefined)B.chemKT=S.t;
 if(!B.zone&&B.chemKT!==undefined&&S.t-B.chemKT>60&&!(B.viol||{}).noZone){(B.viol||(B.viol={})).noZone=1;tacEvt(inc,B,'warn','化物辨識後未劃設管制區');radio(inc,'安全官','還沒劃設管制區（熱區、暖區、冷區）！人員與民眾可能誤入危害區。')}}
const tacHot=x=>x.hz>0||(x.cz||0)>.06;
function tacZoneSet(inc,B,q){
 if(B.zone)return;B.zone={t:S.t,by:q?q.cs:'指揮站'};
 const P=tacCP(B.chem);tacEvt(inc,B,'milestone','劃設管制區');
 radio(inc,q?q.cs:'指揮站','管制區劃設完成：熱區以三角錐與警戒帶圍起，暖區留給除污走廊，冷區設在'+(tacUpSide(B)?TAC_SDN[tacUpSide(B)]+'側（上風處）':'外圍')+'；初始隔離約 '+P.iso+' 公尺。')}
// 戶外風向：室外場景用場區風向；建物案件另給一個屋外風向（只用來判斷上下風，不影響室內擴散）
function tacOWind(B){if(B.wind)return B.wind;if(!B.owind)B.owind=tacWind();return B.owind}
// 上風側：四個方向中最逆風的（風從那裡吹來）；除污站、指揮站是帳篷，不一定要臨路（同樣逆風時臨路的優先）
function tacUpSide(B){const w=tacOWind(B);let best=null,bd=1e9;
 for(const s of ['n','s','w','e']){const v=TAC_SDV[s],d=v[0]*w.d[0]+v[1]*w.d[1]-(B.sd&&B.sd[s]&&B.sd[s].road?.05:0);if(d<bd){bd=d;best=s}}
 return best}
// 某側是否在下風處
const tacDownSide=(B,s)=>{const w=tacOWind(B),v=TAC_SDV[s]||[0,0];return v[0]*w.d[0]+v[1]*w.d[1]>.3};
// ===== 除污 =====
// 除污站：B.dcn={mode:'wet'|'dry', side}；一次一組，其餘排隊；設在下風處時除污人員會再暴露、速度變慢
function tacDcn(B){if(!B.dcn)B.dcn={mode:B.chemK?tacCP(B.chem).dec:'wet',side:(B.st.decon&&B.st.decon.side)||B.arr};return B.dcn}
function tacDeconStep(inc,B,q,dt){
 const D=tacDcn(B),P=tacCP(B.chem);
 if(B.dq&&B.dq!==q.u&&B.sq.some(y=>y.u===B.dq&&y.task==='decon')){q.dqw=1;return}
 B.dq=q.u;q.dqw=0;
 const down=tacDownSide(B,D.side),dry=D.mode==='dry';
 const need=((dry?6:10)+(q.cont||1)*(dry?3:5))*(down?1.5:1); // 乾除污約 9～15 秒、濕除污約 15～25 秒
 q.wk+=dt;if(q.wk<need)return;q.wk=0;B.dq=null;
 if(down&&!(B.viol||{}).dcDown){(B.viol||(B.viol={})).dcDown=1;tacEvt(inc,B,'warn','除污站設在下風處');radio(inc,'安全官','除污站在下風處，除污人員一直吸到飄過來的化學品，請把除污站移到上風處！')}
 if(B.chemK&&P.wr&&!dry){q.hp-=.15;radio(inc,q.cs,'濕除污碰到'+B.chem.n+'遇水反應，人員灼傷！這種化學品只能乾除污。');(B.viol||(B.viol={})).wr=1}
 if(dry&&P.dec==='wet'&&(P.ph==='l'||P.cor)&&q.cont>=2){q.cont--;radio(inc,q.cs,'乾除污完成，但'+(B.chemK?B.chem.n:'化學品')+'是'+(P.cor?'腐蝕性':'')+'液體，乾除污不夠，還要濕除污（污染剩 '+q.cont+' 級）。');q.task='idle';return}
 q.cont=0;q.task='idle';radio(inc,q.cs,(dry?'乾除污':'濕除污')+'完成，人員可再派遣。')}
// 受污染的傷患：除污站開設後依序除污（大量除污時每人約 4 秒、同時 3 人），除污完成才能後送；
// 沒有除污就送醫，救護車與急診被污染
function tacDkPat(inc,B,dt){
 if(!B.st.decon)return;const D=tacDcn(B),m=B.st.mdecon;
 // 紅色優先除污；每人約 6 秒（大量除污 3 秒、同時 3 人），污染越重越久
 const ps=B.pts.filter(p=>p.cont>0).sort((a,b)=>TAC_SEVP[a.sev]-TAC_SEVP[b.sev]).slice(0,m?3:1);
 for(const p of ps){p.dcT=(p.dcT||0)+dt;if(p.dcT>=(m?3:D.mode==='dry'?5:6)*(.6+.4*p.cont)){p.cont=0;p.dcT=0;if(!B.dkpW||S.t-B.dkpW>20){B.dkpW=S.t;radio(inc,'除污站','受污染傷患除污完成，交救護組後送。')}}}}
// ===== 下風處民眾 =====
// 洩漏中、化學品飄出（室外場區或開著的窗）時，下風處民眾持續暴露；疏散（要警方協助，約 60 秒完成）或就地避難（關窗、關空調）可降低暴露
function tacDwStep(inc,B,dt){
 if(!tacCbOn(B))return;const D=B.dwn||(B.dwn={exp:0,mode:'',t:0,r:0});
 let r=0;for(const x of B.cells)if((B.out||x.v)&&(x.cz||0)>r)r=x.cz;
 r*=B.chem.lv>=3?1:B.chem.lv>=2?.6:.3;if(!(B.leak&&B.leak.on))r*=.4;D.r=r;
 if(D.mode==='evac0'&&S.t>=D.t){D.mode='evac';radio(inc,'110','下風處民眾疏散完成。');tacEvt(inc,B,'milestone','下風處民眾疏散完成')}
 D.exp+=dt*r*(D.mode==='evac'?.05:D.mode==='shelter'?.35:1);
 for(const [th,n] of [[25,1],[55,2]]){if(D.exp>=th&&!(D.hit>=th)){D.hit=th;
  for(let i=0;i<n;i++)B.pts.push({id:B.pid=(B.pid||0)+1,sev:i===0&&th>30?'yellow':'green',hp:.9,t:S.t,cont:1});
  radio(inc,'受理','下風處民眾 '+n+' 名出現咳嗽、眼睛刺痛，自行到傷患集結處（需除污）。');tacEvt(inc,B,'warn','下風處民眾 '+n+' 名受化學品影響')}}}
function tacDwSet(inc,B,mode){
 const D=B.dwn||(B.dwn={exp:0,mode:'',t:0,r:0});
 if(mode==='evac'){if(D.mode==='evac'||D.mode==='evac0')return;D.mode='evac0';D.t=S.t+(inc.pol===2?60:120);
  radio(inc,'指揮官','下風處民眾開始疏散'+(inc.pol===2?'，請警方協助管制。':'（警方未到場，進度較慢）。'))}
 else{D.mode='shelter';radio(inc,'指揮官','廣播下風處民眾就地避難：關閉門窗與空調，待在室內。')}}
// ===== 新任務：劃設管制區、圍堵、中和／覆蓋 =====
function tacCbCan(B,q,k,f,c){
 if(k==='snatch'){if(q.ty==='robot'||q.ty==='ladder'||q.ty==='med')return'此組無法執行';if(q.sk==='vol')return'拒絕：義消（一般）不執行快速救援';if((q.ppe||'F')==='C')return'C 級沒有空氣呼吸器，不能進入危害區快速救援';
  if(f===undefined||f<0)return'請點選有受困者的位置';const x=tacCel(B,f,c);if(!(tacPinFree(x)>0))return'這裡沒有可以直接帶走的受困者';if(!(x.rep||x.srch>=1||B.out))return'只對已知位置的受困者快速救援（不知道人在哪就做搜索）';
  if((x.hz||0)>tacPPEx(q,'snatch'))return'危害等級 '+x.hz+' 超過快速救援的上限（'+(q.ppe||'F')+' 只能進入 '+tacPPEx(q,'snatch')+' 級），需要更高的防護';return''}
 if(k==='zone'){if(!tacCbOn(B))return'沒有化學品危害，不需劃設管制區';if(B.zone)return'管制區已劃設';if(tacIn(q))return'人員在室內';if(q.ty==='robot')return'機器人無法執行';return''}
 if(k!=='dike'&&k!=='neut')return null;
 if(!B.chem||B.chem.util)return'沒有化學品外洩';
 if(q.ty==='robot'||q.ty==='ladder')return'此組無法執行';
 if(f===undefined||f<0)return'請點選洩漏處或外洩的區域';
 const x=tacCel(B,f,c),P=tacCP(B.chem);
 if(!(x.cz>.03)&&!(B.leak&&B.leak.f===f&&B.leak.c===c))return'這裡沒有外洩的化學品';
 if(k==='dike'){if(P.ph==='g')return'氣體無法圍堵（改用止漏、通風或水霧稀釋）';if(x.dike)return'已圍堵';return''}
 if(P.ph==='g')return'氣體無法中和覆蓋（可溶於水的用水霧稀釋，其餘止漏、通風）';
 if((P.fl||B.chem.fl)&&P.ph==='l'&&!P.cor&&!(q.code==='57'||q.code==='01'||q.cafs||q.ty==='hazmat'||q.epa))return'可燃液體要泡沫覆蓋：需要泡沫車、特殊化學車、CAFS 車或化災組';
 if(x.neu||x.foam||x.cover)return'已處理';
 return''}
function tacCbTask(inc,B,q,k,cl,dt){
 if(k==='snatch'){const n=tacPinFree(cl);if(!n){q.task='idle';radio(inc,q.cs,tacNm(B,q.f,q.c)+'沒有可以帶走的受困者。');return true}
  const take=Math.min(n,q.n>=4?2:1);cl.vic-=take;q.carry=take;q.cvh=cl.vh;q.cvc=cl.vcz||cl.hz||0;q.cbed=0;q.snG=1;q.task='carry';q.tf=-1;q.tc=0;q.sayT=0;tacSay(q,'found');
  radio(inc,q.cs,'快速救援：抓到受困者 '+take+' 名，立即撤出熱區！');tacEvt(inc,B,'victim','快速救援 '+take+' 名（'+tacNm(B,q.f,q.c)+'）');return true}
 const P=tacCP(B.chem);q.wk+=dt;
 if(k==='dike'){if(q.wk<(q.ty==='hazmat'||q.epa?12:20))return true;q.wk=0;cl.dike=1;q.task='idle';
  radio(inc,q.cs,tacNm(B,q.f,q.c)+'圍堵完成（沙包、吸附棉、導水板），外洩液體與廢水不再往外流。');tacEvt(inc,B,'milestone','圍堵：'+tacNm(B,q.f,q.c));return true}
 if(k==='neut'){if(q.wk<(q.ty==='hazmat'||q.epa?12:22))return true;q.wk=0;q.task='idle';
  // 固體（粉末、金屬鈉、電石）外洩：覆蓋收集後就不再外洩
  if(P.ph==='s'&&B.leak&&B.leak.on&&B.leak.f===q.f&&B.leak.c===q.c){B.leak.on=0;tacEvt(inc,B,'milestone','覆蓋收集完成（'+q.cs+'）')}
  if(P.wr){cl.cover=1;if(cl.h>.05){cl.h=0;cl.fu*=.5}radio(inc,q.cs,tacNm(B,q.f,q.c)+'以乾砂、D 類滅火劑覆蓋'+B.chem.n+'，隔絕水氣'+(cl.h===0?'，火勢悶熄':'')+'。')}
  else if(P.cor){cl.neu=1;radio(inc,q.cs,tacNm(B,q.f,q.c)+'中和處理：'+P.neu+'。')}
  else{cl.foam=1;radio(inc,q.cs,tacNm(B,q.f,q.c)+'泡沫覆蓋完成，抑制蒸氣與起火。')}
  tacEvt(inc,B,'milestone','中和／覆蓋：'+tacNm(B,q.f,q.c));return true}
 return false}
// ===== 偵測：要用對儀器 =====
// 五用氣體偵測器只測得到可燃氣體、CO、H₂S、HCN、O₂；其他化學品要化災組或化災應變隊的毒性氣體偵測器、PID、酸鹼試紙或生物檢測
function tacCbMeas(B,q,x){
 if(!B.chem||!(x.cz>.02)||B.chem.util)return'';const P=tacCP(B.chem),pro=q.ty==='hazmat'||q.epa;
 const ppm=Math.round(x.cz*(P.det==='pid'?800:P.det==='tox'?300:100));
 if(P.det==='gas')return'';
 if(!pro)return'　※五用氣體偵測器測不到這類化學品'+(P.det==='ph'?'（腐蝕性液體）':P.det==='bio'?'（不明粉末）':'')+'，需化災組偵檢器材。';
 return'　'+(P.det==='pid'?'PID 揮發性有機物 '+ppm+' ppm':P.det==='tox'?'毒性氣體偵測 '+ppm+' ppm':P.det==='ph'?'pH 試紙 '+(P.cor&&/氫氧化鈉/.test(B.chem.n)?'13':'1')+'（強'+(/氫氧化鈉/.test(B.chem.n)?'鹼':'酸')+'）':'生物快篩採樣中（需送驗）')+'。'}
// ===== 繪製：管制區（劃設後）與除污站位置 =====
function tacZoneDraw(g,G,B,vf){
 if(!tacCbOn(B)||!B.zone||vf>=B.F)return;
 const hot=new Set();for(const n of B.L.N){const x=tacCel(B,vf,n.c);if(tacHot(x))hot.add(n.c)}
 for(const n of B.L.N){if(hot.has(n.c))continue;if(!tacNb(B,vf,n.c).some(o=>hot.has(o)))continue;const r=G.r(n.c);
  g.fillStyle='rgba(233,200,90,.1)';g.fillRect(r[0],r[1],r[2],r[3]);g.strokeStyle='rgba(233,200,90,.5)';g.setLineDash([4,4]);g.lineWidth=1.5;g.strokeRect(r[0]+2,r[1]+2,r[2]-4,r[3]-4);g.setLineDash([]);
  g.fillStyle='rgba(233,200,90,.9)';g.font='600 10px '+FONT;g.textAlign='center';g.textBaseline='bottom';g.fillText('暖區',r[0]+r[2]/2,r[1]+r[3]-3)}
 // 熱區外框（警戒帶）
 g.save();g.strokeStyle='rgba(226,86,79,.85)';g.lineWidth=2.5;g.setLineDash([8,5]);
 for(const c of hot){const r=G.r(c);for(const o of tacNb(B,vf,c)){if(hot.has(o))continue;const m=tacDoorMid(G,c,o),cc=G.ctr(c),dx=m[0]-cc[0],dy=m[1]-cc[1];
  g.beginPath();if(Math.abs(dx)>Math.abs(dy)){const x0=dx>0?r[0]+r[2]:r[0];g.moveTo(x0,r[1]);g.lineTo(x0,r[1]+r[3])}else{const y0=dy>0?r[1]+r[3]:r[1];g.moveTo(r[0],y0);g.lineTo(r[0]+r[2],y0)}g.stroke()}}
 g.restore();
 // 除污站：在建物（場區）外緣那一側畫除污走廊
 if(B.st.decon&&vf===(B.out?0:B.bf)){const D=tacDcn(B),s=D.side,dv=TAC_SDV[s],mid={n:[G.bx+G.bw/2,G.by],s:[G.bx+G.bw/2,G.by+G.bh],w:[G.bx,G.by+G.bh/2],e:[G.bx+G.bw,G.by+G.bh/2]}[s];
  const x=mid[0]+dv[0]*34+(dv[1]?G.bw*.28:0),y=mid[1]+dv[1]*34+(dv[0]?G.bh*.28:0),dn=tacDownSide(B,s);
  g.fillStyle=dn?'rgba(226,86,79,.25)':'rgba(125,179,232,.22)';g.strokeStyle=dn?'#e2564f':'#7db3e8';g.lineWidth=1.5;g.fillRect(x-34,y-11,68,22);g.strokeRect(x-34,y-11,68,22);
  g.fillStyle=dn?'#ff8a7a':'#cfe2f5';g.font='600 10px '+FONT;g.textAlign='center';g.textBaseline='middle';g.fillText((D.mode==='dry'?'乾':'濕')+'除污'+(B.st.mdecon?'＋大量':'')+(dn?'（下風！）':''),x,y)}}
// ===== 側欄：化學品性質、管制區、除污站、下風處民眾 =====
function tacCbHTML(inc,B){
 if(!tacCbOn(B))return'';const P=tacCP(B.chem),D=tacDcn(B),rw=(a,b)=>'<div class="row"><span>'+a+'</span><span>'+b+'</span></div>';let h='';
 if(B.chemK){h+=rw('性質',TAC_PHN[P.ph]+' · UN '+P.un+' · '+(P.vd>1.15?'比空氣重（往低處、地下室沉）':P.vd<.85?'比空氣輕（往上散）':'與空氣相近')+(P.wr?' · <b style="color:var(--red)">遇水反應禁水</b>':'')+(P.cor?' · 腐蝕性':'')+(P.sol>=.5?' · 溶於水':'')+(P.bio?' · 疑似生物':''));
  h+=rw('處置',P.neu+'；建議'+(P.dec==='dry'?'乾':'濕')+'除污')}
 const up=tacUpSide(B),w=tacOWind(B);
 h+=rw('風向',w.nm+(up?' · 上風處：'+TAC_SDN[up]+'側':''));
 h+=rw('管制區',B.zone?'<b style="color:var(--grn)">已劃設</b>（隔離約 '+P.iso+' m）':'<b style="color:var(--amb)">未劃設</b>');
 if(B.st.decon){const dn=tacDownSide(B,D.side),qn=B.sq.filter(q=>q.task==='decon').length,pn=B.pts.filter(p=>p.cont>0).length;
  h+=rw('除污站','<button data-tdcm="1" title="切換乾除污（脫除外層、刷除、吸附，較快）／濕除污（沖淋、中和，液體與腐蝕性一定要）">'+(D.mode==='dry'?'乾除污':'濕除污')+'</button> <button data-tdcs="1" title="把除污站移到另一側（應設在上風處）">'+TAC_SDN[D.side]+'側'+(dn?'（下風！）':'')+'</button>'+(qn?' · 除污中 '+qn+' 組':'')+(pn?' · 傷患待除污 '+pn:''))}
 else if(B.sq.some(q=>q.cont)||B.pts.some(p=>p.cont))h+=rw('除污站','<b style="color:var(--red)">未開設</b>（有人受污染）');
 const R=B.dwn||{exp:0,mode:'',r:0};
 h+=rw('下風處民眾',(R.r>.05?'<b style="color:var(--amb)">受影響中</b>':'暫無影響')+' · 累積暴露 '+Math.round(R.exp)+' · '+(R.mode==='evac'?'已疏散':R.mode==='evac0'?'疏散中':R.mode==='shelter'?'就地避難':'未處置')+
  (R.mode!=='evac'&&R.mode!=='evac0'?' <button data-tdw="evac">疏散</button>':'')+(!R.mode?' <button data-tdw="shelter">就地避難</button>':''));
 if(B.runoff>5)h+=rw('化學廢水',Math.round(B.runoff)+' L'+((B.viol||{}).env?'（<b style="color:var(--red)">已流入排水溝</b>）':'（尚在場內，請圍堵）'));
 return h}
// ===== 結案報告：化災缺失 =====
function tacCbRep(B,sc,notes){
 const v=B.viol||{};
 if(v.noZone){sc.safe-=8;notes.push('化物辨識後沒有及時劃設管制區')}
 if(v.dcDown){sc.safe-=8;notes.push('除污站設在下風處，除污人員再暴露')}
 if(v.wr){sc.safe-=12;notes.push('遇水反應的化學品碰到水（射水或濕除污）')}
 if(v.env){sc.loss-=15;notes.push('含化學品的廢水流入排水溝（沒有先圍堵）')}
 if(B.ctx){sc.safe-=6*B.ctx;notes.push('受污染傷患未除污即送醫 '+B.ctx+' 名，救護車與急診受污染')}
 if(B.dwn&&B.dwn.exp>25)notes.push('下風處民眾暴露偏高（累積 '+Math.round(B.dwn.exp)+'），應及早疏散或就地避難');
 sc.safe=Math.max(0,sc.safe);sc.loss=Math.max(0,sc.loss)}
// ===== 戰術 AI：管制區、除污站方式與位置、大量除污、圍堵、中和覆蓋、下風處民眾、快速救援 =====
function tacCbAI(inc,B,free,take){
 if(!B.chem)return;
 // 快速救援：已知位置的受困者在危害區，現場沒有足夠防護能搜救時，派背空氣呼吸器的小組進去抓人
 for(const x of B.cells){if(!(x.hz>0)||!(tacPinFree(x)>0)||!(x.rep||x.srch>=1||B.out)||B.sq.some(q=>(q.task==='snatch'||q.task==='search')&&q.tf===x.f&&q.tc===x.c))continue;
  const r=free.find(q=>!tacCbCan(B,q,'snatch',x.f,x.c)&&!tacIn(q)&&!q.cont&&q.air>.7&&TAC_PPE[q.ppe||'F'].p<x.hz);
  if(r&&tacOrder(inc,r,'snatch',x.f,x.c,1)){take(r);radio(inc,r.cs,'快速救援：衝進'+tacNm(B,x.f,x.c)+'把人帶出來！')}}
 if(!tacCbOn(B))return;const P=tacCP(B.chem),rk={F:0,C:1,B:2,A:3},need=B.chemK?['','C','B','A'][B.chem.lv]:'A';
 const out=q=>!tacIn(q)&&q.ty!=='robot'&&q.ty!=='ladder'&&!q.sdb&&!q.vol&&!q.cont;
 if(!B.zone&&(B.chemK||B.cells.some(x=>x.hz>0))){const r=free.find(q=>out(q)&&(q.ty==='hazmat'||q.epa))||free.find(out);if(r&&tacOrder(inc,r,'zone',-1,0,1))take(r)}
 if(B.st.decon){const D=tacDcn(B);
  if(B.dcnAI!==(B.chemK?B.chem.n:'?')){B.dcnAI=B.chemK?B.chem.n:'?';D.mode=B.chemK?P.dec:'wet';const up=tacUpSide(B);if(up){D.side=up;B.st.decon.side=up}}
  if(!B.st.mdecon&&B.pts.filter(p=>p.cont>0).length>=3)tacStnOpen(inc,B,'mdecon',1)}
 const lk=B.leak;if(!B.chemK||!lk)return;
 const lc=tacCel(B,lk.f,lk.c);
 const pick=k=>{const ok=free.filter(q=>out(q)&&!tacCbCan(B,q,k,lk.f,lk.c));
  const r=ok.find(q=>rk[q.ppe||'F']>=rk[need]);if(r)return r;
  const d=ok.find(q=>q.ty==='hazmat'||q.ty==='resc');if(d&&tacPPE(inc,B,d,need,1))take(d);return null};
 if(P.ph==='l'&&!lc.dike&&!B.sq.some(y=>y.task==='dike')){const r=pick('dike');if(r&&tacOrder(inc,r,'dike',lk.f,lk.c,1))take(r)}
 if(P.ph!=='g'&&!(lc.neu||lc.foam||lc.cover)&&(!lk.on||P.wr)&&!B.sq.some(y=>y.task==='neut')){const r=pick('neut');if(r&&tacOrder(inc,r,'neut',lk.f,lk.c,1))take(r)}
 const R=B.dwn;if(R&&R.r>.05&&!R.mode)tacDwSet(inc,B,inc.pol===2?'evac':'shelter')}
