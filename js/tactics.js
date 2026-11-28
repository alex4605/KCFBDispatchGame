// 戰術指揮：建物火災的樓層平面模型、火煙動態、小組指令與現場戰術 AI
// 每層平面相同：節點 0 是樓梯間（不燃，上下樓與出入口），中間一排走廊，走廊南北兩側各一排房間；
// 節點之間有門（人、煙、火可通過）或牆（只有火會慢慢延燒）。f=-1 代表建物外
'use strict';
// 可進入戰術指揮的案類：樓層數、格局（house 透天、corridor 走廊式、open 開放賣場／廠房）、每排空間數、樓梯座數
// b：有地下一層（B1）的機率
const TACK={mfire:{f:[2,4],lay:'house',k:[1,1],b:0},hifire:{f:[7,10],lay:'corridor',k:[3,4],b:.6},fact:{f:[1,2],lay:'open',k:[3,3],st:1,b:.3},
 deptfire:{f:[5,7],lay:'open',k:[3,4],st:2,b:.7,spk:1},skyscraper:{f:[11,14],lay:'corridor',k:[3,3],b:.8,spk:1},hospfire:{f:[4,6],lay:'corridor',k:[4,4],b:.5},
 // 煮食不慎：公寓或透天的廚房起火；誤報謊報：沒有火，查證報案的樓層
 cook:{f:[3,7],lay:'corridor',k:[2,3],b:0,cook:1},hoax:{f:[3,8],lay:'corridor',k:[3,3],b:.3,hoax:1},
 // 工廠類：倉庫、農地工廠、鐵皮屋、化工廠、傳統市場（開放廠區，可燃物多）
 warehouse:{f:[1,2],lay:'open',k:[3,4],st:1,b:0,vic:[0,1]},farmfire:{f:[1,1],lay:'open',k:[2,3],st:1,b:0,vic:[0,1],thin:1},
 tinfire:{f:[1,2],lay:'open',k:[1,2],st:1,b:0,vic:[0,1],thin:1},chemfire:{f:[1,2],lay:'open',k:[3,4],st:1,b:0,vic:[0,2],gas:.8},
 market:{f:[1,2],lay:'open',k:[3,4],st:1,b:.3,vic:[0,2],gas:.7},
 // 機構類：養護機構（臥床住民）、外籍移工宿舍（鐵皮隔間、防火門常被拆）
 nursing:{f:[2,4],lay:'corridor',k:[3,4],b:0,vic:[1,2],bed:[3,6],spk:1,staff:1},dorm:{f:[2,4],lay:'corridor',k:[3,4],b:0,vic:[2,5],thin:1,poor:.7},
 // 地下室濃煙：地下停車場起火
 smoke:{f:[3,7],lay:'corridor',k:[3,3],b:1,bas:1,vic:[0,2]},
 // 離火未熄：屋主不在、戶門上鎖，廚房悶燒（缺氧，開門可能爆燃）
 cookodor:{f:[3,7],lay:'corridor',k:[3,3],b:0,cook:1,away:1,unit:1},
 // 住警器響：多半誤報；依報案內容可能是小火悶燒或獨居長者倒地
 alarm:{f:[3,7],lay:'corridor',k:[3,3],b:0,hoax:1,unit:1},
 // 電動車／儲能：鋰電池熱失控，撲滅後容易復燃
 evfire:{f:[4,7],lay:'corridor',k:[3,3],b:1,bfN:1,ofB:0,unit:1,li:1,vic:[0,1]},
 // 冷氣室外機：火在外牆，經窗戶燒進室內並往上層延燒
 acfire:{f:[4,8],lay:'corridor',k:[3,3],b:0,unit:1,ext:1,vic:[0,1]},
 // 太陽能板屋頂：火在屋頂，往頂樓延燒；台電斷電前只能水霧遠距射水
 solarfire:{f:[1,1],lay:'open',k:[2,3],st:1,b:0,roofF:1,vic:[0,0],kinds:['rack','store']},
 // 氣爆（建物）：1F 炸毀成瓦礫，瓦斯持續供氣
 gasblast:{f:[4,7],lay:'corridor',k:[3,3],b:0,unit:1,blast:1,only:1,vic:[2,4]},
 // 室外場景：資源回收場、加油站（場區平面、風向、飛火、化學桶與油料外洩）
 wastefire:{f:[1,1],lay:'yard',yard:'waste',k:[3,4],b:0,out:1,vic:[0,1]},gasstn:{f:[1,1],lay:'yard',yard:'gas',k:[3,3],b:0,out:1,vic:[0,1]},
 // 雜草火：空地或河堤草地，燒得快、順風擴大，可撲打、開設防火線
 grassfire:{f:[1,1],lay:'yard',yard:'grass',k:[3,4],b:0,out:1,wild:1,vic:[0,0]},
 // 山林火警的建物防護：作戰圖上火線逼近民宅時，就地守住聚落（林地邊緣、防禦空間、民宅、道路）
 forest:{f:[1,1],lay:'yard',yard:'wui',k:[3,4],b:0,out:1,wild:1,wui:1,vic:[0,2]}};
// 依報案內容調整建物：地下室層數、起火樓層與空間、建物型態
const TAC_VAR={
 smoke:[[/B2/,{bfN:2,ofB:0}],[/B1/,{bfN:1}],[/電箱/,{ofK:'mech'}]],
 deptfire:[[/地下停車場/,{bfN:1,ofB:0}],[/美食街/,{food:1}]],
 hospfire:[[/地下室配電室/,{bfN:1,ofB:0,ofK:'mech'}],[/五樓/,{ofF:4,f:[5,6]}]],
 evfire:[[/工廠/,{lay:'open',k:[2,3],st:1,f:[1,2],b:0,bfN:0,ofB:undefined,unit:0,kinds:['machine','store']}]],
 solarfire:[[/公寓/,{lay:'corridor',f:[3,6],k:[3,3],st:0,unit:1,kinds:null}]],
 alarm:[[/燒焦味/,{hoax:0,cook:1,away:1}],[/沒看到煙/,{hoax:0,nofire:1,elder:1}],[/煎魚/,{smk:1}]],
 gasblast:[[/公寓/,{ok:1}]],
 grassfire:[[/河堤/,{river:1}]],
 ship:[[/漁船/,{f:[2,2],k:[2,2]}],[/貨船|貨輪/,{f:[4,5],k:[3,4]}]]};
const tacTxt=inc=>{const sc=inc.pm&&inc.pm.sc;return Array.isArray(sc)?sc.slice(0,2).join(' '):''};
function tacVar(inc){const T=Object.assign({},TACK[inc.k]),t=tacTxt(inc);T.txt=t;
 for(const v of TAC_VAR[inc.k]||[])if(v[0].test(t))Object.assign(T,v[1]);
 if(inc.k==='forest'&&inc.wf)T.fdir=wfFireDir(inc); // 建物防護：林地朝向作戰圖上火的來向
 if(inc.tfl)T.f=inc.tfl;                              // 地標超高層（85 大樓、50 層大樓）
 return T}
// 此案件是否適用戰術指揮（氣爆只有建物那種報案才適用）
const tacHas=inc=>inc.k==='forest'?!!(inc.tac||inc.wf&&wfWuiTodo(inc.wf).length):!!TACK[inc.k]&&(!TACK[inc.k].only||!!tacVar(inc).ok);
// 玩家戰術畫面的介面狀態
// 時間尺度：場內動作（移動、氣瓶、火勢）約以 1:10 模擬（1 秒＝現實 10 秒）。
// spd 為戰術畫面開著時的時間倍率：0.2／0.3／0.5／1 分別等於現實時間的 1:2／1:3／1:5／1:10，預設 1:3
const TAC_RT=10,TAC_SPDS=[.2,.3,.5,1];
// 戰術畫面開著時，其他案件的時限暫停
const tacFrozen=inc=>TAC.open&&inc.id!==TAC.id;
const TAC={open:false,id:null,sq:null,ord:null,hits:[],spd:.3,autoPause:true,ms:[]};
const TAC_AIR=110; // 滿瓶可在室內作業的秒數
const TAC_LADR={'21':10,'31':7}; // 雲梯可達樓層數
// 車種 → 小組類型；水庫車、指揮車、救護車不編成入室小組
// 人員能力分級：移動與動作時間 t、作業效率 w、疲勞累積 fat
// 菜鳥（僅教學）＜義消＝菜鳥（且不執行高危險任務）＜義消+（接近正職）＜正職＜特搜
const TAC_SKL={rookie:{n:'菜鳥',t:1.25,w:.7,fat:1.3},vol:{n:'義消',t:1.25,w:.7,fat:1.3},volp:{n:'義消+',t:1.1,w:.9,fat:1.15},reg:{n:'正職',t:1,w:1,fat:1},usar:{n:'特搜',t:.88,w:1.2,fat:.85}};
// 熱顯像儀（TIC）：消防車上大多都有；義消與菜鳥沒有，濃煙中幾乎看不見
// 入室對話泡泡（臨場感）：同一組至少間隔 12 秒
const TAC_SAY={search:['有人嗎？我們是消防隊的！','消防隊！有人聽得到嗎？','出個聲音！我們來救你了！','有沒有人？敲牆壁讓我們知道！'],
 attack:['開水！','水線往前推！','溫度很高，壓低身體！','注意頭上！','火點在前面，射水！'],found:['找到人了！','這裡有人！準備搬運！'],
 stair:['上樓，注意腳步。','樓梯間有煙，跟緊！'],smoke:['什麼都看不到，沿牆走！','能見度零，保持接觸！']};
function tacSay(q,k){if(q.sayT&&S.t-q.sayT<12)return;q.sayT=S.t;const a=TAC_SAY[k];q.say={s:a[Math.floor(Math.random()*a.length)],t:performance.now()}}
const tacTIC=q=>!q.vol&&!q.rookie&&q.ty!=='robot';
// 能見度（濃煙）對作業效率的影響：煙濃到能見度近 0 時，沒有 TIC 的小組效率大減
const tacVisF=(q,x)=>!x||x.s<.6?1:tacTIC(q)?1-.15*(x.s-.6)/.4:1-.55*(x.s-.6)/.4;
const tacSk=q=>TAC_SKL[q.sk||(q.rookie?'rookie':q.usar?'usar':'reg')];
// 義消（一般）不執行的高危險任務：深入火場、容易發生 MAYDAY
const TAC_VOLNO={attack:1,search:1,search2:1,rit:1,ritgo:1,vvent:1,hydro:1,confine:1,sky:1,fwdgo:1,roofres:1,dctrl:1,npv:1,vent:1};
const TAC_SQ={'機':'pump','43':'resc','99':'med','51':'hazmat','01':'pump','11':'pump','16':'pump','57':'pump','21':'ladder','31':'ladder','71':'resc','搜':'resc','75':'vent','履':'robot'};
const TAC_TYN={crew:'人力組',med:'特搜醫療組',hazmat:'化災組',epa:'化災應變隊',pump:'幫浦組',ladder:'雲梯組',resc:'救助組',vent:'排煙組',robot:'機器人'};
const TAC_TASK={sky:'車頂砲塔射水',hyd:'佔據水源',beat:'撲打',brk:'開設防火線',gas:'氣體偵測',ident:'化物辨識',plug:'止漏',dress:'換裝',decon:'除污',fwdref:'前進指揮所換瓶',fwdgo:'前往設置前進指揮所',idle:'待命',move:'移動',truck:'移車',stand:'送水口加壓',hold:'守線',attack:'入室攻擊',trans:'過渡射水',
 guard:'周界防護',cover:'周界防護（鄰棟）',confine:'侷限火勢',search:'初期搜索',search2:'次級搜索',carry:'搬運傷者',
 vent:'破窗排煙',hydro:'水霧排煙',roof:'屋頂排煙',ppv:'正壓排煙',npv:'負壓排煙',vvent:'垂直排煙',force:'破壞進入',dctrl:'門控進入',overhaul:'殘火處理',ladder:'雲梯救援',master:'雲梯射水',roofres:'屋頂救援',
 rit:'RIT 待命',ritgo:'RIT 救援',exit:'撤出',station:'駐守站點'};
// 需要水線的任務
// 室外（工廠廠區、資源回收場、鐵皮屋、山林等）不叫「入室」：任務名稱改用戶外說法
const TAC_OUTN={attack:['滅火攻擊','帶水線到火點射水滅火，撲滅後自動往最近火點推進'],trans:['外圍射水','先在外圍射水壓制，再推進攻擊'],search:['搜索','快速搜索建物與周邊，找出受困者'],search2:['複搜','徹底翻找，找出初搜遺漏的受困者'],exit:['撤離','撤離危險區域']};
const tacTN=(B,k)=>B&&B.out&&TAC_OUTN[k]?TAC_OUTN[k][0]:TAC_TASK[k];
const TAC_WET={confine:1,attack:1,sky:1,hold:1,trans:1,guard:1,hydro:1,cover:1,master:1};
// 用水量較大的任務：占用兩條水線的流量
const TAC_WET2={sky:1};
// 門的開關：關上的門延燒與煙的流動都大幅降低（人員通過時會打開）
const tacDK=(B,f,a,b)=>f*B.W*B.W+Math.min(a,b)*B.W+Math.max(a,b);
const tacShut=(B,f,a,b)=>B.cd&&B.cd.has(tacDK(B,f,a,b));
// 相通區塊之間沒有門的開口
const tacOpn=(B,a,b)=>!!B.L.op&&B.L.op.has(Math.min(a,b)*1000+Math.max(a,b));
const tacRint=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
const tacCel=(B,f,c)=>B.cells[f*B.W+c];
const tacFlr=(B,f)=>f<0?'屋外':B.out?'場區':f>=B.F?'屋頂':f<B.bf?'B'+(B.bf-f):(f-B.bf+1)+'F';
// 房間用途：可燃物倍率 fk、搜索時間倍率 sr
const TAC_RK={bed:{n:'臥室',fk:1,sr:1.1},living:{n:'客廳',fk:1.1,sr:1},kitchen:{n:'廚房',fk:1.25,sr:.9},bath:{n:'浴室',fk:.35,sr:.5},
 store:{n:'儲藏室',fk:1.45,sr:1.3},ware:{n:'倉儲區',fk:1.55,sr:1.6},dock:{n:'裝卸區',fk:1.15,sr:1.1},office:{n:'辦公室',fk:1,sr:1.1},ward:{n:'病房',fk:.9,sr:1.1},shelf:{n:'賣場',fk:1.3,sr:1.4},machine:{n:'廠區',fk:1.2,sr:1.2},
 park:{n:'停車場',fk:1.35,sr:1.3},mech:{n:'機房',fk:.8,sr:.7},shop:{n:'店面',fk:1.2,sr:1},lobby:{n:'大廳',fk:.6,sr:.8},nurse:{n:'護理站',fk:.8,sr:.6},food:{n:'美食街',fk:1.3,sr:1.1},shrine:{n:'神明廳',fk:1.15,sr:.8},clinic:{n:'門診',fk:.8,sr:.9},act:{n:'活動室',fk:.9,sr:.9},
 care:{n:'住房',fk:.9,sr:1.2},bunk:{n:'寢室',fk:1.25,sr:1.3},stall:{n:'攤位區',fk:1.4,sr:1.2},rack:{n:'貨架區',fk:1.5,sr:1.4},
 plastic:{n:'塑膠堆',fk:1.6,sr:1.2},paper:{n:'紙類堆',fk:1.4,sr:1.2},metal:{n:'金屬堆',fk:.3,sr:1},ewaste:{n:'電子廢料',fk:1.3,sr:1.1},drum:{n:'化學桶區',fk:1.2,sr:1},
 cylz:{n:'鋼瓶區',fk:.6,sr:.8},yoff:{n:'辦公室',fk:.9,sr:.9},island:{n:'加油島',fk:1.5,sr:.6},tank:{n:'油槽區',fk:1,sr:.6},mart:{n:'便利商店',fk:1.1,sr:1},grass:{n:'雜草',fk:2,sr:.5},reed:{n:'芒草',fk:2.2,sr:.5},shrub:{n:'灌木',fk:1.6,sr:.6},shack:{n:'鐵皮屋',fk:1.3,sr:1},cars:{n:'停放汽車',fk:1.2,sr:.6},forest:{n:'林地',fk:1.8,sr:.6},home:{n:'民宅',fk:1.1,sr:1},wash:{n:'洗車區',fk:.3,sr:.6}};
// 空間用途：同一格局的各樓層可有不同用途（地下停車場、1F 店面或大廳）
const tacK=(B,f,c)=>{const x=B.cells[f*B.W+c];return x&&x.k||B.L.N[c].kind};
// 分戶住宅（走廊式公寓）：房間依戶分組，只有玄關所在的客廳開門到走廊
const TAC_UNIT={hifire:1,cook:1,hoax:1,smoke:1};
const TAC_KINDS={cook:['bed','living','kitchen'],hoax:['bed','living','office','kitchen'],hifire:['bed','living','bed','kitchen'],skyscraper:['office','office','living'],hospfire:['ward','ward','ward','office'],
 deptfire:['shelf','shelf','shelf'],fact:['machine','machine','store'],mfire:['bed'],
 warehouse:['rack','rack','store'],farmfire:['machine','store'],tinfire:['store','machine'],chemfire:['machine','store','machine'],market:['stall','stall','store'],
 nursing:['care','care','care','living'],dorm:['bunk','bunk','bunk','kitchen'],smoke:['bed','living','bed','kitchen']};
// 樓層平面（隨機不規則）：gx/gy/gw/gh 為平面格座標；nb 為門、wl 為共用牆；
// door[side] 為該側入口在平面上的位置、ent[side] 為入口通往的節點；房間貼著外牆的方向就有對外窗（wins）
// 走廊式型態的機率（依案類）：端部梯、中央梯廳、單邊外廊
const TAC_RES={end:.45,center:.4,single:.15};
const TAC_CVW={hifire:TAC_RES,cook:TAC_RES,hoax:TAC_RES,alarm:TAC_RES,cookodor:TAC_RES,smoke:TAC_RES,evfire:TAC_RES,acfire:TAC_RES,solarfire:TAC_RES,gasblast:TAC_RES,
 skyscraper:{center:.7,end:.3},hospfire:{end:.5,center:.25,single:.25},nursing:{single:.5,end:.3,center:.2},dorm:{single:.6,end:.4}};
function tacPickV(kind){const w=TAC_CVW[kind]||{end:1};let r=Math.random()*Object.values(w).reduce((a,b)=>a+b,0);for(const k in w){r-=w[k];if(r<=0)return k}return'end'}
// 開放式採走道型的機率
const TAC_AISLE={market:.8,warehouse:.6,fact:.3,farmfire:.3,chemfire:.3,tinfire:.2,solarfire:.4,evfire:.3};
function tacLayout(T,K,kind,two){
 const R=Math.random,N=[],L={N,door:{},ent:{}},SW=.6,unit=(T.unit||TAC_UNIT[kind])&&T.lay==='corridor';let nu=0;
 const add=o=>{o.c=N.length;o.nb=[];o.wl=[];N.push(o);return o};
 const kinds=T.kinds||TAC_KINDS[kind]||['bed'];
 const room=(gx,gy,gw,gh,k)=>{const small=Math.min(gw,gh)<.75||gw*gh<.55;
  return add({ty:'room',gx,gy,gw,gh,kind:k||(small?(T.lay==='open'?(R()<.5?'office':'store'):R()<.5?'bath':'store'):kinds[Math.floor(R()*kinds.length)]),small})};
 // 把 [a,b] 隨機切成寬 lo~hi 的段落，尾段太短就併入前一段
 const cuts=(a,b,lo,hi)=>{const r=[a];let x=a;
  while(b-x>hi){const w=lo+R()*(hi-lo);if(b-x-w<lo)break;x+=w;r.push(x)}
  r.push(b);return r};
 // 樓梯核：樓梯間只佔一小塊，同一條邊的其餘空間是門廳走廊
 // （先加樓梯間：第一座樓梯一定是節點 0，其他程式以此當主樓梯）
 const core=(x,ya,yb,sy,sh)=>{add({ty:'stair',gx:x,gy:sy,gw:SW,gh:sh});
  if(sy-ya>.2)add({ty:'hall',gx:x,gy:ya,gw:SW,gh:sy-ya});
  if(yb-sy-sh>.2)add({ty:'hall',gx:x,gy:sy+sh,gw:SW,gh:yb-sy-sh})};
 // 走廊式的樓梯核：樓梯間在門廳一側（北或南），入口進門廳直通走廊，樓梯不擋在門口
 const coreL=(x,y0,y1,top)=>{
  if(top){add({ty:'stair',gx:x,gy:0,gw:SW,gh:y0});add({ty:'hall',gx:x,gy:y0,gw:SW,gh:L.GH-y0,lob:1})}
  else{add({ty:'stair',gx:x,gy:y1,gw:SW,gh:L.GH-y1});add({ty:'hall',gx:x,gy:0,gw:SW,gh:y1,lob:1})}};
 if(T.lay==='yard')tacYardLay(T,K,L,add,room,cuts,R);
 else if(T.lay==='house'&&R()<.4){ // 街屋（長條形）：前廳臨街、中段樓梯與走道、後段廚房浴室、最後是後間
  L.GW=SW+1.25;L.GH=4.2;L.hv='deep';
  add({ty:'stair',gx:0,gy:1.3,gw:SW,gh:.95});add({ty:'hall',gx:SW,gy:1.3,gw:L.GW-SW,gh:.95});
  room(0,0,L.GW,1.3,'living');
  const kw=L.GW*(.5+R()*.1);room(0,2.25,kw,.9,'kitchen');room(kw,2.25,L.GW-kw,.9,'bath');
  room(0,3.15,L.GW,L.GH-3.15,'bed')}
 else if(T.lay==='house'){ // 透天：一側樓梯，中段小走道串起前廳、後間、廚房、浴室
  L.GW=SW+1.8;L.GH=3;
  const hw=.45,y0=.9+R()*.25,y1=y0+.95;
  // 樓梯在側邊中段，前方是客廳（正門進客廳），樓梯後方隔出儲藏室或浴室
  add({ty:'stair',gx:0,gy:y0,gw:SW,gh:y1-y0});
  add({ty:'hall',gx:SW,gy:y0,gw:hw,gh:y1-y0});
  room(0,0,SW,y0,R()<.5?'store':'bath');
  const bk=R()<.5?[SW,L.GW]:[SW,SW+.75+R()*.35,L.GW];
  for(let i=0;i<bk.length-1;i++)room(bk[i],0,bk[i+1]-bk[i],y0,'bed');
  const kw=.7+R()*.25,rest=L.GW-SW-hw-kw,mid=R()<.5?[['kitchen',kw],['bath',rest]]:[['bath',rest],['kitchen',kw]];
  let x=SW+hw;for(const m of mid){room(x,y0,m[1],y1-y0,m[0]);x+=m[1]}
  if(R()<.4){const w=.5+R()*.2;room(0,y1,L.GW-w,3-y1,'living');room(L.GW-w,y1,w,3-y1,'store')}
  else room(0,y1,L.GW,3-y1,'living')}
 else if(T.lay==='open'&&(kind==='warehouse'||kind==='cargo')&&R()<.6){ // 倉儲：一個大倉儲空間（太寬時分成兩區、中間不設門），一角隔出辦公室、廁所與裝卸區
  L.GH=2.4;const we=SW+K*1.2,sy=Math.max(.3,L.GH/2-.4),ow=.9+R()*.3,oh=.95+R()*.2;L.cv='grid';
  core(0,0,L.GH,sy,.8);
  const of=room(SW,0,ow,oh,'office');of.ofc=1;
  const wc=room(SW,oh,ow*.5,.5,'bath');wc.ofc=1;room(SW+ow*.5,oh,ow*.5,.5,'office').ofc=1;
  room(SW,oh+.5,ow,L.GH-oh-.5,'dock');                                    // 裝卸區（與倉儲相通）
  const x0=SW+ow,bw=we-x0;
  if(bw>3.2){const m=x0+bw*(.45+R()*.1);room(x0,0,m-x0,L.GH,'ware').big=1;room(m,0,we-m,L.GH,'ware').big=1}
  else room(x0,0,bw,L.GH,'ware').big=1;
  L.GW=we;L.ware=1}
 else if(T.lay==='open'&&T.st!==2&&R()<(TAC_AISLE[kind]||0)){ // 走道型：一到兩條貫穿的走道，兩側一排排攤位、貨架或機台
  L.GH=2.4+R()*.4;const we=SW+K*1.2,na=R()<.5?1:2,aw=.36,rh=(L.GH-na*aw)/(na+1),sy=Math.max(.3,Math.min(L.GH-1.1,L.GH/2-.4));L.cv='aisle';
  core(0,0,L.GH,sy,.8);
  let y=0;for(let b=0;b<=na;b++){const xs=cuts(SW,we,.55,1.1);
   for(let i=0;i<xs.length-1;i++)room(xs[i],y,xs[i+1]-xs[i],rh,kinds[Math.floor(R()*kinds.length)]);
   y+=rh;if(b<na){const hs=cuts(SW,we,.9,1.4);for(let i=0;i<hs.length-1;i++)add({ty:'hall',gx:hs[i],gy:y,gw:hs[i+1]-hs[i],gh:aw});y+=aw}}
  L.GW=we}
 else if(T.lay==='open'){ // 賣場／廠區：寬窄不一的兩排相通區塊，偶有隔出的小房間；百貨東側另有樓梯
  L.GH=2.4;const we=SW+K*1.2,ym=.85+R()*.7,sy=Math.max(.3,Math.min(L.GH-1.1,ym-.4));L.cv='grid';
  core(0,0,L.GH,sy,.8);
  const xs=cuts(SW,we,.85,1.5);
  for(let i=0;i<xs.length-1;i++){const w=xs[i+1]-xs[i];
   if(R()<.22&&w>1){const sy=R()<.5;room(xs[i],0,w/2,ym,sy?'store':'office');room(xs[i]+w/2,0,w/2,ym,'store')}
   else room(xs[i],0,w,ym);
   // 百貨：中段一格是貫穿各層的挑空與電扶梯，煙熱會往上竄
   if(T.st===2&&i===Math.floor((xs.length-1)/2)&&xs.length>3)add({ty:'hall',gx:xs[i],gy:ym,gw:w,gh:L.GH-ym,atr:1});
   else if(!L.ct&&T.st!==2&&i>0&&i<xs.length-2&&R()<.22){L.ct=1;room(xs[i],ym,w,L.GH-ym,'court').court=1}
   else room(xs[i],ym,w,L.GH-ym)}
  L.GW=we;
  if(T.st===2){core(we,0,L.GH,sy,.8);L.GW+=SW}}
 else{ // 走廊式：三種型態——端部梯（梯廳在走廊一端）、中央梯廳（電梯大樓常見）、單邊外廊（宿舍、機構常見）
  const H=2.7+R()*.6;L.GH=H;const ch=.62,cv=T.cv||tacPickV(kind);L.cv=cv;L.wc=!unit&&R()<.35; // 非分戶的走廊式建物：約三分之一有天井
  let y0,y1,top;
  if(cv==='single'){const n=R()<.5;y0=n?0:H-ch;y1=y0+ch;top=!n}
  else{y0=(H-ch)/2-.3+R()*.6;y1=y0+ch;top=R()<.5}
  L.GW=SW+K;let segX;
  if(cv==='center'){const cx=.9+R()*(K-1.8);coreL(cx,y0,y1,top);segX=[[0,cx],[cx+SW,L.GW]]}
  else{coreL(0,y0,y1,top);segX=[[SW,L.GW]]}
  let br=null;
  if(cv==='end'&&R()<.55&&K>=3){br={x:SW+1+R()*(K-2.3),w:.5,north:R()<.5}}
  for(const sg of segX){const hc=cuts(sg[0],sg[1],.9,1.4);for(let i=0;i<hc.length-1;i++)add({ty:'hall',gx:hc[i],gy:y0,gw:hc[i+1]-hc[i],gh:ch})}
  if(br)add({ty:'hall',gx:br.x,gy:br.north?0:y1,gw:br.w,gh:br.north?y0:H-y1});
  // 一戶：一般為一排 2～3 間；外廊式房間很深，前排客廳（玄關）、後排臥室與衛浴
  const mkUnit=(g,ya,yb,nearTop)=>{const u=nu++;
   if(yb-ya>1.6){const fd=.9+R()*.3,fy=nearTop?ya:yb-fd,by0=nearTop?ya+fd:ya,by1=nearTop?yb:yb-fd,x0=g[0][0],x1=g[g.length-1][0]+g[g.length-1][1];
    const lv=room(x0,fy,x1-x0,fd,'living');lv.u=u;lv.uent=1;let kit=0;
    g.forEach(x=>{const k=x[1]<.62?'bath':!kit&&R()<.5?(kit=1,'kitchen'):'bed';const n=room(x[0],by0,x[1],by1-by0,k);n.u=u});return}
   const wi=g.reduce((a,x,j)=>x[1]>g[a][1]?j:a,0);let kit=0;
   g.forEach((x,j)=>{let k;if(j===wi)k='living';else if(x[1]<.62)k='bath';else if(!kit&&R()<.6){k='kitchen';kit=1}else k='bed';
    const n=room(x[0],ya,x[1],yb-ya,k);n.u=u;if(j===wi)n.uent=1})};
  // nearTop：這一排靠走廊的是上緣（走廊在這排的北邊）
  const strip=(ya,yb,isN)=>{if(yb-ya<.3)return;const nearTop=!isN;
   for(const s0 of segX){const segs=br&&br.north===isN&&br.x>=s0[0]&&br.x<s0[1]?[[s0[0],br.x],[br.x+br.w,s0[1]]]:[s0];
    for(const sg of segs){if(sg[1]-sg[0]<.35)continue;
     if(!unit){const cs=cuts(sg[0],sg[1],.6,1.4);
      for(let i=0;i<cs.length-1;i++){const w=cs[i+1]-cs[i];
       // 很深的房間有時隔成前後兩間（後間要穿過前間）
       if(yb-ya>1.6&&R()<.55){const fd=(yb-ya)*(.45+R()*.15);if(nearTop){room(cs[i],ya,w,fd);room(cs[i],ya+fd,w,yb-ya-fd)}else{room(cs[i],yb-fd,w,fd);room(cs[i],ya,w,yb-ya-fd)}}
       else if(L.wc&&!L.ct&&i>0&&i<cs.length-2&&w>=.8){L.ct=1;room(cs[i],ya,w,yb-ya,'court').court=1}
       else room(cs[i],ya,w,yb-ya)}continue}
     const cs=cuts(sg[0],sg[1],.5,1.05),rs=[];for(let i=0;i<cs.length-1;i++)rs.push([cs[i],cs[i+1]-cs[i]]);
     const gs=[];for(let i=0;i<rs.length;){let k=rs.length-i<=3?rs.length-i:R()<.5?2:3;if(rs.length-i-k===1)k--;gs.push(rs.slice(i,i+k));i+=k}
     for(const g of gs)mkUnit(g,ya,yb,nearTop)}}};
  strip(0,y0,true);strip(y1,H,false);
  // 五層以上：走廊另一端設第二座安全梯（兩方向避難）
  if(two){coreL(L.GW,y0,y1,cv==='single'?top:!top);L.GW+=SW}}
 // 隨機鏡射：同一種格局也會左右、上下顛倒（樓梯、入口、房間朝向都會不同）
 // 建物防護：格局以林地在北建立，再依火的來向轉向（東西向時轉置），另一軸仍隨機鏡射
 const fd=T.yard==='wui'?T.fdir||'n':null;
 if(fd==='e'||fd==='w'){for(const n of N){[n.gx,n.gy]=[n.gy,n.gx];[n.gw,n.gh]=[n.gh,n.gw]}[L.GW,L.GH]=[L.GH,L.GW]}
 const mx=fd?fd==='e'||((fd==='n'||fd==='s')&&R()<.5):R()<.5,my=fd?fd==='s'||((fd==='e'||fd==='w')&&R()<.5):R()<.5;
 if(mx){for(const n of N)n.gx=L.GW-n.gx-n.gw;if(L.canopy)L.canopy[0]=L.GW-L.canopy[0]-L.canopy[2]}
 if(my){for(const n of N)n.gy=L.GH-n.gy-n.gh;if(L.canopy)L.canopy[1]=L.GH-L.canopy[1]-L.canopy[3]}
 // 鄰接：共用邊長度超過 0.25 才算相鄰
 const E=1e-6,ov=(a,b)=>{
  if(Math.abs(a.gx+a.gw-b.gx)<E||Math.abs(b.gx+b.gw-a.gx)<E)return Math.min(a.gy+a.gh,b.gy+b.gh)-Math.max(a.gy,b.gy);
  if(Math.abs(a.gy+a.gh-b.gy)<E||Math.abs(b.gy+b.gh-a.gy)<E)return Math.min(a.gx+a.gw,b.gx+b.gw)-Math.max(a.gx,b.gx);
  return 0};
 L.op=new Set();   // 沒有門的開口（相通區塊之間）：永遠關不起來
 const P=[];for(let i=0;i<N.length;i++)for(let j=i+1;j<N.length;j++){const o=ov(N[i],N[j]);if(o>.25)P.push([N[i],N[j],o])}
 const door=(a,b)=>{a.wl=a.wl.filter(x=>x!==b.c);b.wl=b.wl.filter(x=>x!==a.c);if(!a.nb.includes(b.c)){a.nb.push(b.c);b.nb.push(a.c)}};
 const wall=(a,b)=>{a.wl.push(b.c);b.wl.push(a.c)};
 const open=T.lay==='open'||T.lay==='yard';
 for(const[a,b]of P){
  if(tacScAdj(a,b,door,wall,L))continue;
  if(a.ty!=='room'&&b.ty!=='room')door(a,b);
  else if(a.u!==undefined&&a.u===b.u)door(a,b);
  else if(a.walled||b.walled)wall(a,b);
  else if(a.ofc||b.ofc){const o=a.ofc?a:b,q=o===a?b:a;   // 倉儲辦公室：一扇門通大倉儲，其他是牆
   if(q.big&&!o.sd&&o.kind==='office'){o.sd=1;door(a,b)}else if(q.ofc&&q.kind==='office'&&o.kind==='bath')door(a,b);else wall(a,b)}
  else if(open&&!a.small&&!b.small){door(a,b);L.op.add(Math.min(a.c,b.c)*1000+Math.max(a.c,b.c))}
  else wall(a,b)}
 // 每間房開一扇門到接觸最長的走廊
 for(const r of N){if(r.ty!=='room'||r.court||(r.nb.length&&!r.uent))continue;
  const hs=P.filter(p=>(p[0]===r&&p[1].ty==='hall')||(p[1]===r&&p[0].ty==='hall')).sort((x,y)=>y[2]-x[2]);
  if(hs.length)door(r,hs[0][0]===r?hs[0][1]:hs[0][0])}
 // 客廳與廚房常常相通
 for(const[a,b]of P)if(a.ty==='room'&&b.ty==='room'&&((a.kind==='living'&&b.kind==='kitchen')||(b.kind==='living'&&a.kind==='kitchen'))&&R()<.6)door(a,b);
 // 連通：從樓梯出發還走不到的房間，開門到相鄰已走得到的空間
 for(let it=0;it<20;it++){
  const seen=new Set([0]),qu=[0];let qi=0;while(qi<qu.length){const c=qu[qi++];for(const d of N[c].nb)if(!seen.has(d)){seen.add(d);qu.push(d)}}
  if(seen.size===N.filter(n=>!n.court).length)break;
  for(const[a,b]of P){if(!a.court&&!b.court&&seen.has(a.c)!==seen.has(b.c)){door(a,b);break}}}
 // 外牆方向、對外窗
 for(const n of N){n.edge=[];
  if(n.gy<.01)n.edge.push('n');if(n.gy+n.gh>L.GH-.01)n.edge.push('s');
  if(n.gx<.01)n.edge.push('w');if(n.gx+n.gw>L.GW-.01)n.edge.push('e');
  if(n.ty==='room'&&n.edge.length){n.wins=n.edge.slice();n.win=n.wins[0]}}

 // 各側入口：優先走廊，其次樓梯間，再其次客廳或其他房間
 const pri=T.lay==='house'?n=>n.kind==='living'?0:n.ty==='hall'?1:n.ty==='stair'?2:3+(n.small?1:0):
  n=>n.lob?0:n.ty==='hall'?.5:n.ty==='stair'?1:n.kind==='living'?1.5:2+(n.small?1:0);
 for(const sd of['n','e','s','w']){
  const cand=N.filter(n=>n.edge.includes(sd)&&!n.court).sort((a,b)=>pri(a)+(a.kind==='bath'?5:0)-pri(b)-(b.kind==='bath'?5:0));const n=cand[0];if(!n)continue;
  L.ent[sd]=n.c;
  const cy=n.cy!==undefined?n.cy:n.gy+n.gh/2;
  L.door[sd]=sd==='n'?[n.gx+n.gw/2,0]:sd==='s'?[n.gx+n.gw/2,L.GH]:sd==='w'?[0,cy]:[L.GW,cy]}
 // 房號：由北往南、由西往東；分戶住宅同一戶共用門牌
 let no=0;const um={};
 N.filter(n=>n.ty==='room').sort((a,b)=>a.gy-b.gy||a.gx-b.gx).forEach(n=>{if(n.u===undefined)n.no=++no;else n.no=um[n.u]||(um[n.u]=++no)});
 N.filter(n=>n.ty==='room').sort((a,b)=>a.gy-b.gy||a.gx-b.gx).forEach((n,i)=>n.bi=i+1); // 地下室不分戶，逐區編號
 L.nu=nu;
 L.nr=N.filter(n=>n.ty==='room').length;
 return L}
// 初期搜索完成：每名受困者有一定機率被漏掉（煙越濃越容易漏），留給次級搜索
function tacPrim(B,x,extra){x.sl=Math.max(x.sl,1);x.srch=1;x.ps=Math.max(x.ps||0,x.s+extra);
 let m=0;for(let i=0;i<x.vic;i++)if(Math.random()<.08+.25*x.s+extra)m++;
 x.vic-=m;x.hid+=m}
// 打開窗戶：缺氧的悶燒火場突然開口，可能發生爆燃（Backdraft）
function tacOpenWin(inc,B,x,cs){
 if(x.v)return;x.v=1;
 if(tacVL(x))tacBackdraft(inc,B,x,1,'開口瞬間');
 else tacEarlyVent(inc,B,x)}
// 通風控制燃燒（悶燒缺氧）：突然進氣會爆燃
const tacVL=x=>x.o2<13.5&&x.h>.2&&x.s>.6&&!x.wet;
// 爆燃（Backdraft）：dmg 為對附近小組的傷害倍率（門控開門較輕）；extra 小組為開門的小組（站在門口也會受傷）
function tacBackdraft(inc,B,x,dmg,how,extra){
 x.h=1;x.fl=1;
 radio(inc,'安全官',tacNm(B,x.f,x.c)+(how||'')+'發生爆燃（Backdraft）！');
 B.bdN=(B.bdN||0)+1;tacEvt(inc,B,'danger',tacNm(B,x.f,x.c)+'爆燃（Backdraft）',1);
 for(const q of B.sq)if((q===extra||tacIn(q)&&q.f===x.f&&(q.c===x.c||B.L.N[x.c].nb.includes(q.c)))&&q.ty!=='robot'&&!q.down){q.hp=Math.max(.15,q.hp-.35*dmg);if(q.hp<.3)tacDown(inc,B,q,'遭遇爆燃')}}
// 開門進入某空間：破壞進入（門的開關不受控制，大量新鮮空氣湧入）在悶燒缺氧的空間很容易爆燃；
// 門控進入（控制門的開度、慢慢開、先觀察煙況與射水）較慢，但不容易爆燃、受傷也較輕
function tacDoorIn(inc,B,q,x,mode){
 if(!x||!tacVL(x))return;
 if(mode==='dctrl'){if(Math.random()<.12)tacBackdraft(inc,B,x,.4,'門控開門時',q);else if(!x.dcw){x.dcw=1;radio(inc,q.cs,'門控開門，'+tacNm(B,x.f,x.c)+'煙往內吸、門縫冒黑煙，悶燒缺氧！控制開度、先射水降溫。')}}
 else if(Math.random()<.6)tacBackdraft(inc,B,x,1,'破門瞬間',q)}
// 過早排煙：火點還沒有水線壓制就開口或送風，給火充足的氧氣，火勢變大、更難撲滅
function tacEarlyVent(inc,B,x){
 if(x.h<.45||x.wet||B.sq.some(q=>q.line&&q.f===x.f&&(q.c===x.c||B.L.N[x.c].nb.includes(q.c))&&(q.task==='attack'||q.task==='hold')))return;
 if(!B.viol.earlyV){B.viol.earlyV=1;tacEvt(inc,B,'warn','過早排煙：'+tacNm(B,x.f,x.c)+'火點尚無水線就開口')}
 radio(inc,'安全官','注意：'+tacNm(B,x.f,x.c)+'還沒有水線壓制就開口排煙，火勢會因進氣變大！')}
// 入口或房門的開門方式：指定任務優先，其餘依 ROE（預設破壞進入）
const tacEntryMode=(B,q)=>q.task==='dctrl'?'dctrl':q.task==='force'?'force':(B.roe||'force');
// 對外窗戶狀態：無（沒有對外窗或地下室）／已破裂（破窗或受熱爆裂，已成開口）／部分破損（受高溫龜裂）／完整
function tacWinSt(B,x,n){
 if(!n.win||x.f<B.bf)return['無','#9d9a92'];
 if(x.v)return['已破裂（開口）','#ff8a5a'];
 if(x.wcr)return['部分破損（受熱龜裂）','#e9a13b'];
 return['完整','#7db3e8']}
// 空間參數（換算成實際單位顯示）：溫度 °C、能見度 m、燃燒面積 ㎡、含氧量 %
function tacParam(B,x){
 const n=B.L.N[x.c],area=Math.round(n.gw*n.gh*25);
 const temp=Math.round(Math.max(25+x.h**1.15*870,25+x.s*180));
 const vis=x.s<.02?30:Math.max(.2,30*(1-x.s)**2.6);
 return{temp,vis:vis>=10?Math.round(vis):+vis.toFixed(1),area,burn:x.h>.05&&x.fu>0?Math.min(area,Math.round(area*Math.min(1,x.h*1.25))):0,o2:+x.o2.toFixed(1)}}
const tacStair=(B,c)=>B.L.N[c].ty==='stair';
// 鄰接：地下停車場是開放空間（只剩柱列），除樓梯間與小機房外各區互通
const tacNb=(B,f,c)=>f<B.bf&&B.L.N[c].nbO?B.L.N[c].nbO:B.L.N[c].nb;
// 位置名稱：3F-302 室、3F 走廊、3F 樓梯間
function tacNm(B,f,c){
 if(f<0)return'屋外';if(B.out)return tacYardNm(B,c);const n=B.L.N[c];
 return tacFlr(B,f)+(n.ty==='stair'?' 樓梯間':n.atr?' 挑空區':n.ty==='hall'?' 走廊':'-'+tacRm(B,f,f<B.bf?n.bi:n.no)+(n.u!==undefined||tacK(B,f,c)!==n.kind?' '+TAC_RK[tacK(B,f,c)].n:' 室'))}
// 房號：3F 第 2 間為 302，B1 第 2 間為 B102
const tacRm=(B,f,no)=>f<B.bf?'0'+no:(f-B.bf+1)*100+no;
const tacGd=(B,a,b)=>{const x=B.L.N[a],y=B.L.N[b];return Math.abs(x.gx+x.gw/2-y.gx-y.gw/2)+Math.abs(x.gy+x.gh/2-y.gy-y.gh/2)};
// 同層最近的符合條件節點（以平面距離計）
function tacNear(B,f,c,ok){let best=null,bd=99;
 for(let i=1;i<B.W;i++){const x=tacCel(B,f,i);if(!ok(x))continue;const d=tacGd(B,c,i);if(d<bd){bd=d;best=i}}
 return best}
function tacOK(inc){return tacHas(inc)&&!!inc.rev&&!inc.wrap}
// 建立建物模型；若案件已依原本的抽象進度推進，火勢依進度縮小
function tacInit(inc){
 const T=tacVar(inc),bf=T.bfN!==undefined?T.bfN:Math.random()<T.b?1:0,Fa=tacRint(T.f[0],T.f[1]),F=Fa+bf,L=tacLayout(T,tacRint(T.k[0],T.k[1]),inc.k,T.lay==='corridor'&&(Fa>=5||inc.k==='hospfire'||!!T.bed)),W=L.N.length,R=L.nr;
 const cells=[];
 for(let f=0;f<F;f++)for(const n of L.N)cells.push({f,c:n.c,ty:n.ty,sl:0,s2:0,hid:0,o2:20.9,emb:0,fk:n.ty==='room'?TAC_RK[n.kind].fk:.5,h:0,fu:n.ty==='room'?(n.court?0:1):n.ty==='hall'?.35:0,
  s:0,v:0,vic:0,vh:1,srch:n.ty==='room'?0:1,fl:0,wet:0});
 const load={'低':.8,'中':1,'高':1.2,'極高':1.4}[inc.pm.load]||1;
 const B={F,bf,R,W,L,cells,cd:new Set(),roofV:0,roofS:0,roofH:1,st:{},role:{},pts:[],tx:0,exp:{},expW:{},expL:{},roof:0,ppv:0,ppvW:0,sq:[],resc:0,lost:0,vtot:0,peak:0,p:0,done:0,doneT:0,paid:0,
  mayday:0,lodd:0,hint:-1,aiT:0,fk:load,of:0,noRit:0};
 const rooms=L.N.filter(n=>n.ty==='room'&&!n.court).map(n=>n.c);
 // 地下室：一間小房留作機房（有牆），其餘打通成停車場
 const mech=L.N.find(n=>n.ty==='room'&&n.small);
 if(bf){const op=n=>n.ty!=='stair'&&n!==mech;for(const n of L.N)if(op(n))n.nbO=n.nb.concat(n.wl.filter(o=>op(L.N[o])&&!n.nb.includes(o)))}
 // 各樓層用途：地下室為停車場與機房；公寓 1F 為店面、大樓 1F 為大廳
 const use=(f,c,k)=>{const x=cells[f*W+c];x.k=k;x.fk=TAC_RK[k].fk};
 for(const c of rooms){const n=L.N[c];
  for(let f=0;f<bf;f++)use(f,c,n===mech?'mech':'park');
  if(Fa>=3&&(T.unit||TAC_UNIT[inc.k])&&!T.blast)use(bf,c,n.uent?'shop':n.small?'bath':'store');
  if(inc.k==='skyscraper'&&!n.small)use(bf,c,'lobby')}
 // 各樓層用途差異（隨機）：透天樓上是臥室、頂樓神明廳；醫院 1F 門診；機構 1F 活動室；百貨地下室可能是美食街
 for(const c of rooms){const n=L.N[c];
  if(inc.k==='mfire')for(let f=bf+1;f<F;f++){
   if(n.kind==='living')use(f,c,f===F-1&&Fa>=3?'shrine':Math.random()<.6?'bed':'living');
   else if(n.kind==='kitchen')use(f,c,Math.random()<.5?'bed':'store')}
  if(inc.k==='hospfire'&&!n.small)use(bf,c,Math.random()<.7?'clinic':'office');
  if(inc.k==='nursing'&&!n.small&&Math.random()<.5)use(bf,c,'act')}
 if(inc.k==='deptfire'&&bf&&T.ofB===undefined&&Math.random()<.5)for(const c of rooms)if(L.N[c]!==mech)for(let f=0;f<bf;f++)use(f,c,'food');
 // 醫院：每層走廊旁最近樓梯的一間小房為護理站
 if(inc.k==='hospfire'||inc.k==='nursing'){const ns=rooms.filter(c=>L.N[c].nb.some(o=>L.N[o].ty==='hall')).sort((a,b)=>tacGd({L},a,0)-tacGd({L},b,0));if(ns.length)L.N[ns[0]].kind='nurse',cells.filter(x=>x.c===ns[0]).forEach(x=>x.fk=TAC_RK.nurse.fk)}
 // 起火層：有地下室時約三分之一從 B1 起火（停車場、機房）
 let of=T.ofB!==undefined?T.ofB:T.ofF!==undefined?bf+Math.min(Fa-1,T.ofF):T.food||T.roofF?F-1:T.blast?bf:T.bas?0:bf&&Math.random()<.35?0:bf+((inc.k==='mfire'||inc.k==='fact')?tacRint(0,Math.min(1,Fa-1)):tacRint(Math.floor(Fa*.25),Math.floor(Fa*.6)));
 let oc=pick(rooms);
 if((T.cook||T.ext||T.elder||T.smk)&&of===bf&&Fa>1&&(T.unit||TAC_UNIT[inc.k]))of=bf+1;
 if(T.food)for(const c of rooms)if(!L.N[c].small)use(F-1,c,'food');
 if(T.ofK){const ks=rooms.filter(c=>tacK({cells,W,L},of,c)===T.ofK);if(ks.length)oc=pick(ks)}
 // 場區：加油站起火在加油島（卸油時在油槽區），回收場起火在堆置區
 if(T.yard==='gas'){const is=rooms.filter(c=>L.N[c].isl),tk=rooms.find(c=>L.N[c].kind==='tank');oc=/卸油/.test(tacTxt(inc))&&tk!==undefined?tk:is.length?pick(is):oc}
 if(T.yard==='wui'){const fs=rooms.filter(c=>L.N[c].kind==='forest');if(fs.length)oc=pick(fs)}
 if(T.yard==='grass'){const gs=rooms.filter(c=>T.river?L.N[c].riv:L.N[c].kind!=='shack'&&L.N[c].kind!=='cars');if(gs.length)oc=pick(gs)}
 if(T.yard==='waste'){const ps=rooms.filter(c=>!L.N[c].walled&&L.N[c].kind!=='drum'&&L.N[c].kind!=='metal');if(ps.length)oc=pick(ps)}
 // 室外機：起火戶要有面向道路的窗
 if(T.ext){const ws=rooms.filter(c=>L.N[c].wins&&!L.N[c].small);if(ws.length)oc=pick(ws)}
 if(T.smk||T.elder){const ks=rooms.filter(c=>L.N[c].kind===(T.smk?'kitchen':'bed'));if(ks.length)oc=pick(ks)}
 if(T.cook){const ks=rooms.filter(c=>L.N[c].kind==='kitchen');if(ks.length)oc=pick(ks);else L.N[oc].kind='kitchen'}
 B.of=of;B.oc=oc;B.hoax=!!T.hoax;B.T=T;B.k=inc.k;
 // 建物防護：對應作戰圖上受威脅的民宅格，防護期間作戰圖不再直接延燒它
 if(T.wui&&inc.wf){const W=inc.wf;B.wui=1;B.wk=wfWuiTodo(W)[0];(W.prot||(W.prot=new Set())).add(B.wk);B.doneT=0}
 if(T.out)tacYardInit(inc,B,T);
 // 化工廠：約三分之二有化學品洩漏（起火層的廠區或倉庫）
 if(inc.k==='chemfire'&&Math.random()<.65){B.chem=pick(TAC_CHEM);const ks=rooms.filter(c=>/machine|store/.test(L.N[c].kind));B.leak={f:of,c:ks.length?pick(ks):oc,on:1}}
 const prog=Math.min(.8,inc.work/inc.dur);
 const nIgn=T.hoax||T.nofire?0:T.cook||T.ext||T.roofF?1:T.blast||T.wui?2:Math.max(1,Math.min(R,Math.round((inc.pm.area||60)/100)));
 const cand=[];
 for(let f=of;f<Math.min(F,of+2);f++)for(const c of rooms)cand.push([tacGd(B,c,oc)+(f-of)*1.6+(L.N[c].win===L.N[oc].win?0:.5),f,c]);
 cand.sort((a,b)=>a[0]-b[0]);
 for(let i=0;i<Math.min(nIgn,cand.length);i++){
  const x=tacCel(B,cand[i][1],cand[i][2]);
  x.h=Math.max(.12,(.62-i*.2)*(.75+.25*load)*(1-prog)+Math.random()*.1);x.s=Math.min(1,x.h*.9);
  if(T.cook){x.h=.3+Math.random()*.25;x.s=.8;x.o2=17}
  // 離火未熄：門窗緊閉的悶燒，含氧低、煙濃，開門有爆燃風險
  if(T.away){x.h=.25+Math.random()*.1;x.s=.95;x.o2=12.5;for(const o of L.N[cand[i][2]].nb)if(!tacOpn(B,cand[i][2],o))B.cd.add(tacDK(B,cand[i][1],cand[i][2],o))}
  if(T.ext||T.roofF){x.h=.12;x.s=.4}
  if(T.li&&i===0)x.li=1}
 // 住警器（煎魚）：廚房有點煙，沒有火
 if(T.smk){const x=tacCel(B,of,oc);x.s=.3}
 // 誤報謊報：查證報案指稱的樓層；偶爾只是燒焦味（微量煙、無火）
 if(T.hoax){B.hint=of;if(Math.random()<.35){const x=tacCel(B,of,oc);x.s=.35}}
 // 氣爆：起火點附近 2～3 間炸成瓦礫（搜救很慢），結構一開始就受損，瓦斯管線持續供氣
 if(T.blast){B.rub=rooms.slice().sort((a,b)=>tacGd(B,a,oc)-tacGd(B,b,oc)).slice(0,tacRint(2,3));
  for(const c of B.rub){const x=tacCel(B,bf,c);x.rub=1;x.fu=Math.min(x.fu,.5);x.s=Math.max(x.s,.6)}
  B.gasL={c:oc,t:150+Math.random()*90}}
 // 外部火源：室外機（外牆）、太陽能板（屋頂）
 if(T.ext)B.ext={f:of,c:oc,h:.7,side:L.N[oc].wins[0]};
 if(T.roofF)B.rf={h:.65};
 // 受困者：起火層與以上樓層
 let trap=T.hoax||T.away?0:T.elder?1:T.cook?(Math.random()<.3?1:0):Number.isFinite(inc.pm.trap)?inc.pm.trap:T.vic?tacRint(T.vic[0],T.vic[1]):0;
 for(let i=0;i<trap;i++){
  // 五層以上的建物，火在下方時有人會往屋頂避難
  if(Fa>=5&&of<F-2&&Math.random()<.25){B.roofV++;continue}
  let f=Math.min(F-1,of+tacRint(0,Math.min(2,F-1-of))),c=pick(rooms);
  if(T.elder){f=of;c=oc}
  // 建物防護：還沒撤離的住戶在民宅裡
  if(T.wui){const hs=rooms.filter(c=>L.N[c].kind==='home');if(hs.length)c=pick(hs)}
  // 氣爆：受困者多半埋在 1F 瓦礫中
  if(T.blast&&B.rub&&B.rub.length&&i<B.rub.length*2){f=bf;c=B.rub[i%B.rub.length]}
  tacCel(B,f,c).vic++;if(B.hint<0)B.hint=f}
 // 醫院：另有臥床病患無法自行避難
 if(inc.k==='hospfire'||T.bed)for(let i=0,n=T.bed?tacRint(T.bed[0],T.bed[1]):tacRint(2,4);i<n;i++){const f=Math.min(F-1,of+tacRint(0,1));tacCel(B,f,pick(rooms)).vic++;trap++}
 B.vtot=trap;
 tacSite(inc,B);
 if(B.out)tacYardPost(inc,B,T);
 // 上鎖：約半數入口是鐵捲門或上鎖的鐵門；約 15% 的房門上鎖，需破壞進入
 for(const e of B.ents)e.lock=Math.random()<(e.shop?.85:e.ramp?.3:.5)?1:0;
 B.lk=new Set();B.eo={};
 // 防火門（樓梯間與各層之間）：常閉式（自動關門器）、常開式（偵煙連動關閉）、被物品卡住常開、被拆除
 // 經濟狀況差的老舊公寓、宿舍常見防火門被拆走或卡住
 B.fd=new Map();B.fdO=new Map();B.poor=Math.random()<(T.poor||(TAC_UNIT[inc.k]?.35:inc.k==='mfire'?0:.1));
 if(T.lay!=='house')for(let f=0;f<F;f++)for(const n of L.N)if(n.ty==='stair')for(const o of n.nb){if(L.N[o].ty==='stair')continue;
  const r=Math.random(),t=B.poor?(r<.35?'gone':r<.65?'wedge':'auto'):(r<.07?'wedge':r<.4&&T.lay!=='house'?'mag':'auto');
  const key=tacDK(B,f,n.c,o);B.fd.set(key,{t,f,s:n.c,o});if(t==='auto')B.cd.add(key)}
 for(let f=0;f<F;f++)for(const n of L.N)if(n.ty==='room'&&!n.small&&Math.random()<.15)for(const o of n.nb)if(L.N[o].ty!=='room')B.lk.add(tacDK(B,f,n.c,o));
 // 分戶住宅的戶門平常是關著的（避難的住戶約兩成會沒關門）：火與煙經戶門外洩慢很多，直到有人開門或門被燒穿
 for(let f=0;f<F;f++)for(const n of L.N)if(n.uent&&Math.random()<.8)for(const o of n.nb)if(L.N[o].ty!=='room')B.cd.add(tacDK(B,f,n.c,o));
 // 瓦斯桶：民宅與煮食不慎常見（多在廚房）
 if(!T.hoax&&Math.random()<(T.gas||(inc.k==='mfire'||inc.k==='cook'?.45:.2))){const ks=rooms.filter(c=>/kitchen|store|stall|machine/.test(L.N[c].kind));
  if(ks.length){B.gas=pick(ks);B.gasF=Math.max(bf,Math.min(F-1,of+tacRint(-1,1)))}}
 tacCivInit(inc,B);
 B.thin=!!T.thin;B.fdK=new Set([bf]);
 // 自動撒水設備：約 20% 因關閉、故障或水源不足而未動作
 if(T.spk)B.spk={ok:Math.random()>.2,fl:{}};
 // 養護機構：值班護理人員進行水平避難
 if(T.staff)B.staff={n:tacRint(2,3),t:20};
 // 屋主不在：起火戶的戶門上鎖
 if(T.away||T.elder){const u=L.N[oc].u,en=u!==undefined?L.N.find(n=>n.u===u&&n.uent):L.N[oc];
  if(en)for(const o of en.nb)if(L.N[o].ty!=='room')B.lk.add(tacDK(B,of,en.c,o))}
 B.t0=S.t;B.ev=[];B.viol={};B.stab=TAC_STAB[inc.pm.stab]||1;B.dmg=T.blast?.4:0;
 B.elev=Fa>=6&&T.lay==='corridor'; // 六層以上走廊式建物有消防專用升降機
 B.fwdF=Math.max(bf+1,of>=bf+3?of-2:bf+Math.floor((F-bf)/2)); // 火在低樓層時設在建物中段，方便上方樓層搜索
 tacLayPost(inc,B);
 if(T.sc)tacScInit(inc,B,T);
 tacSysInit(inc,B);
 inc.tac=B;tacSync(inc);
 if(T.hoax)radio(inc,'受理','指揮中心接管現場戰術指揮：報案指稱'+tacFlr(B,of)+'冒煙，現場未見明顯火光，請查證該層各戶。');
 else if(B.sc)radio(inc,'受理','指揮中心接管現場戰術指揮：'+B.sc.brief);
 else radio(inc,'受理','指揮中心接管現場戰術指揮：地上 '+Fa+' 層'+(bf?'、地下 1 層':'')+'建物、每層 '+R+' 室，起火點 '+tacNm(B,of,oc)+
  (trap&&B.hint>=0?'，報案人表示 '+tacFlr(B,B.hint)+' 有人受困':'')+(B.roofV?'，有民眾逃往屋頂':'')+(bf?'；本建物有地下室（B1），地下室沒有對外窗，只能經樓梯排煙':'')+'。');
 radio(inc,'受理','周邊：'+TAC_SIDES.map(x=>TAC_SDN[x]+'側'+B.sd[x].nm+(B.sd[x].road&&!B.sd[x].big?'（大型車禁入）':'')).join('、')+
  (B.hyd?'；消防栓在'+TAC_SDN[B.hyd.side]+'側約 '+B.hyd.d+' m':'；附近無消防栓，需水庫車供水')+(B.sp?'；送水口在'+TAC_SDN[B.sp.side]+'側':'')+'。')}
// 在場作業的車輛 → 戰術小組（新到場加入，離場移除）
function tacSync(inc){
 const B=inc.tac;
 for(const u of onScene(inc)){
  if(u.st!=='work'||!TAC_SQ[u.code])continue;
  if(B.sq.some(q=>q.u===u.id))continue;
  const ty=TAC_SQ[u.code];
  B.sq.push({rookie:u.trainee?1:0,cafs:u.cafs||u.code==='機'?1:0,usar:u.usar?1:0,ma:u.ma||null,u:u.id,cs:u.cs,code:u.code,ty,n:ty==='robot'?1:crewOf(u),f:-1,c:0,nf:-1,nc:0,mt:0,tf:-1,tc:0,
   task:'idle',air:1,hp:1,down:0,carry:0,line:0,lt:0,prev:null,resc:null,low:0,ext:0,wk:0,
   tside:B.arr,side:B.arr,tmv:0,pf:0,len:0,src:null,burst:0,ent:null,ws:null,fat:0,cyl:2})}
 tacEpaSync(inc,B);
 // 集結區開設後，新到小組直接在集結區那側整裝待命
 if(B.st&&B.st.stage)for(const q of B.sq)if(!q.seen){q.seen=1;if(q.ty!=='ladder')q.side=B.st.stage.side}
 tacVolSync(inc,B);
 B.sq=B.sq.filter(q=>{if(q.epa||q.vol)return true;const u=S.units.find(x=>x.id===q.u);
  if(u&&u.inc===inc.id&&u.st==='work')return true;
  if(q.down)B.mayday=Math.max(0,B.mayday-1);
  if(B.sp&&B.sp.u===q.u){B.sp.on=0;B.sp.u=null}
  return false})}
const tacIn=q=>q.f>=0;
// 可通行的鄰點：同層經門相通；樓梯間上下樓，1F 樓梯間通往屋外
function tacAdj(B,f,c){
 const r=tacNb(B,f,c).map(x=>[f,x]);
 if(tacStair(B,c)){const ok=x=>!(B.cz&&B.cz.has(x));if(f>0&&ok(f-1))r.push([f-1,c]);if(f<B.F-1&&ok(f+1))r.push([f+1,c])}
 if(f<=B.bf&&B.ents.some(e=>e.c===c&&tacEF(B,e)===f&&!(e.shop&&e.lock)))r.push([-1,0]);
 return r}
// 從 (f0,c0) 到 (tf,tc) 的最短路徑（廣度優先，含拓樸版本快取）；回傳整條路徑，不含起點
function tacPath(B,f0,c0,tf,tc){
 const key=(f,c)=>f<0?-1:f*B.W+c,goal=key(tf,tc),start=key(f0,c0);
 if(goal===start)return[];
 let pv=(B.cz?B.cz.size:0)*31+(B.ents?B.ents.length:0);
 if(B.ents)for(let i=0;i<B.ents.length;i++)if(B.ents[i].shop&&B.ents[i].lock)pv+=1024*(i+1);
 if(B._pv!==pv){B._pv=pv;B._pc=new Map()}
 const ck=start*100003+goal,hit=B._pc.get(ck);
 if(hit!==undefined)return hit;
 const prev=new Map([[start,null]]),qu=[[f0,c0]];let qi=0;
 while(qi<qu.length){const n=qu[qi++];if(key(n[0],n[1])===goal)break;if(n[0]<0)continue;
  for(const m of tacAdj(B,n[0],n[1])){const k=key(m[0],m[1]);if(!prev.has(k)){prev.set(k,n);qu.push(m)}}}
 if(!prev.has(goal)){B._pc.set(ck,[]);return[]}
 const out=[];let cur=tf<0?[-1,0]:[tf,tc];
 while(key(cur[0],cur[1])!==start){out.push(cur);cur=prev.get(key(cur[0],cur[1]))}
 out.reverse();B._pc.set(ck,out);return out}
// 換瓶前的任務已經沒有意義（射水目標火已熄）
const tacStale=(B,p)=>!!TAC_WET[p.task]&&p.task!=='cover'&&p.tf>=0&&tacCel(B,p.tf,p.tc).h<.05;
function tacNext(B,q){
 if(q.f===q.tf&&q.c===q.tc)return null;
 if(q.f<0){if(!q.ent)q.ent=tacBestEnt(B,q.side,q.tf,q.tc,false);return q.ent?[tacEF(B,q.ent),q.ent.c]:null}
 return tacPath(B,q.f,q.c,q.tf,q.tc)[0]||null}
function tacStepTime(B,q,ns){
 let t=q.f<0||ns[0]<0?1.5:ns[0]!==q.f?(tacElevOK(B,q.f,ns[0])?.6:2.2):1.8;
 const cl=ns[0]>=0?tacCel(B,ns[0],ns[1]):null;
 if(cl)t*=1+cl.s*(tacTIC(q)?.5:1.4);          // 濃煙中摸索前進：有 TIC 較快
 if(q.task==='attack'&&q.line)t*=1.4;
 if(q.carry)t*=1.5;
 if(ns[0]>=0&&(B.L.N[ns[1]].hole||(q.f>=0&&B.L.N[q.c].hole)))t*=q.carry?5:2.5; // 人孔：垂降、以三腳架吊升
 if(q.ty==='robot')t*=1.6;
 t*=tacSk(q).t;                            // 能力分級：菜鳥、義消較慢，特搜較快
 if(q.task==='ritgo')t*=.8;
 return t*(1+(q.fat||0)*.6)}
// 耐熱上限（無水線掩護）：超過就拒絕進入；所在空間再熱一點（+.05）就自動撤退。機器人不受限
// h .55 約 460°C（正職、特搜）；菜鳥與義消經驗不足，.45 約 370°C 就不進入
const tacHotLim=q=>q.ty==='robot'?9:q.rookie||q.sk==='rookie'||q.sk==='vol'||q.sk==='volp'?.45:.55;
// 帶著有水、壓力足夠的水線：可以邊射水邊推進，不受耐熱上限限制
const tacCovered=(q,eff)=>!!(TAC_WET[q.task]&&q.line&&eff>0&&q.pf>.15&&!(q.burst>0));
const tacTmp=(B,x)=>tacParam(B,x).temp;
// 從目前位置（屋外時從最近入口）到目標經過的空間
function tacRoute(B,q,f,c){
 if(q.f>=0)return tacPath(B,q.f,q.c,f,c);
 const e=tacBestEnt(B,q.side,f,c,false);return e?[[tacEF(B,e),e.c]].concat(tacPath(B,tacEF(B,e),e.c,f,c)):[]}
// 會帶水線出水的任務：靠水線掩護推進，不用耐熱上限拒絕（沒有水線時由移動中的檢查擋下）
const TAC_HOSEK={attack:1,confine:1,hydro:1,guard:1};
// 安全區：沒有煙、熱、化學品、缺氧的空間，可以不戴面罩（不接肺力閥、不耗氣）
const tacSafe=x=>x.s<.12&&x.h<.04&&!(x.hz>0)&&x.o2>=19.5&&!((x.cz||0)>.03);
// 高樓：起火層的直下層是安全區邊界，進入起火層（以上）前一定要先接上肺力閥
const tacHiR=B=>B.F-B.bf>=5;
// 接上肺力閥的時機：要進入不安全的空間（低樓層在燃燒門外、高樓在起火層直下層）
function tacMaskNeed(B,q,ns){
 if(q.mk||q.ty==='robot'||q.ty==='ladder'||B.wild||(q.ppe||'F')==='C')return false;
 if(!tacSafe(tacCel(B,ns[0],ns[1])))return true;
 return tacHiR(B)&&ns[0]>=B.of&&B.cells.some(x=>x.f===B.of&&(x.h>.05||x.s>.2))}
// 小組拒絕命令：回傳以「拒絕：」開頭的原因（'' 表示接受）。機器人不會拒絕
function tacRefuse(B,q,k,f,c){
 if(q.ty==='robot'||q.ty==='ladder'||q.down)return'';
 if(k==='exit'||k==='rit'||k==='truck'||k==='ppv'||k==='stand'||k==='hyd'||k==='cover'||k==='sky'||k==='trans'||/^ppe/.test(k))return'';
 if(q.fat>=.85&&(f===undefined||f>=0||k==='roof'||k==='roofres'))return'拒絕：隊員體力透支（疲勞 '+Math.round(q.fat*100)+'%），需先撤出休息';
 if(f===undefined||f<0)return'';
 {const w=tacScRefuse(B,q,k,f,c);if(w)return w}
 if(TAC_HOSEK[k])return'';
 const lim=tacHotLim(q),tf=k==='roof'||k==='roofres'?B.F-1:f;
 const rt=tacRoute(B,q,tf,k==='roof'||k==='roofres'?tacNearStair(B,B.F-1,0):c),hot=rt.find(p=>tacCel(B,p[0],p[1]).h>lim);
 if(hot){const x=tacCel(B,hot[0],hot[1]),tg=hot[0]===f&&hot[1]===c;
  return'拒絕：'+(tg?'目標':'路線經過的')+tacNm(B,hot[0],hot[1])+'溫度約 '+tacTmp(B,x)+'°C，沒有水線掩護無法進入'+(lim<.5?'（'+tacSk(q).n+'耐熱上限較低）':'')+'，請先射水降溫'}
 return''}
// 能力：回傳 '' 表示可以，否則為不可執行的原因
function tacCan(B,q,k,f,c){
 if(q.down)return'該組已倒地，等待 RIT 救援';
 {const w=tacHazCan(B,q,k)||tacScCan(B,q,k,f,c);if(w)return w}
 if(q.sk==='vol'&&(TAC_VOLNO[k]||(k==='move'&&f>=0&&(tacCel(B,f,c).h>.05||tacCel(B,f,c).s>.4))||(k==='dctrl'&&f>=0)))return'拒絕：義消（一般）不執行入室攻擊、搜索等深入火場的任務（可改派義消+或正職）';
 if(q.vol&&(k==='attack'||k==='sky'||k==='confine'||k==='trans'||k==='cover'||k==='hydro'))return'義消徒步到場、沒有車輛水線';
 if(q.ty==='med'&&k!=='move'&&k!=='exit')return'特搜醫療組在屋外支援傷患處置，不進入建物';
 if(k==='beat'||k==='brk')return tacWildCan(B,q,k,c);
 if(q.task==='station')return'駐守'+tacStnDef(q.stn).n+'，請先撤除站點';
 if(B.cz&&f!==undefined&&B.cz.has(f)&&k!=='exit')return'該樓層已坍塌，禁止進入';
 if(B.dmg>=.8&&f!==undefined&&f>=B.of&&q.ty!=='ladder'&&q.ty!=='robot'&&k!=='exit'&&k!=='rit'&&k!=='truck'&&k!=='stand'&&k!=='ppv'&&k!=='cover')return'結構有坍塌危險，起火樓層以上禁止入室（請用雲梯射水等外部防禦）';
 const lad=q.ty==='ladder';
 if(k==='exit')return lad?'雲梯組在建物外作業':'';
 if(k==='truck')return(q.ty==='pump'||lad)?'':'只有幫浦車與雲梯車需要移車';
 if(k==='stand')return q.ty!=='pump'?'只有幫浦組能做送水口加壓':!B.sp?'本建物沒有連結送水管（五層以上才有）':B.sp.on&&B.sp.u!==q.u?'送水口已由其他車接妥':tacIn(q)?'人員在室內':tacCanSide(B,q,B.sp.side);
 if(k==='ppv')return q.ty==='vent'||(q.ty==='pump'&&q.code==='11')?'':'需要排煙組或 11 幫浦車的正壓排煙機';
 if(k==='hyd')return q.ty!=='pump'?'只有幫浦車能佔水':!B.hyd?'附近沒有消防栓，需水庫車供水':tacIn(q)?'人員在室內':q.tside===B.hyd.side&&!q.tmv?'已在消防栓那一側':tacCanSide(B,q,B.hyd.side);
 if(k==='rit')return(lad||q.ty==='robot')?'此組無法編為 RIT':'';
 if(k==='cover')return q.ty!=='pump'?'只有幫浦組能做周界防護':Object.keys(B.exp).length?'':'四周沒有鄰棟';
 if(q.air<.3&&!lad&&q.ty!=='robot'&&k!=='exit'&&k!=='force'&&k!=='dctrl')return'空氣瓶不足，需先撤出換瓶';
 if((k==='force'||k==='dctrl')&&(f===undefined||f<0))return q.ty==='robot'?'機器人無法執行':tacIn(q)?'人員在室內':'';
 if(f===undefined||f<0)return'請點選建物內的位置';
 if(k==='shore')return tacShoreCan(B,q,f,c);
 if(lad){
  if(f<B.bf)return'地下室無法使用雲梯';
  if(k==='roofres')return B.F-B.bf>(TAC_LADR[q.code]||7)?'屋頂超出雲梯可達高度':'';
  if(f-B.bf>=(TAC_LADR[q.code]||7))return'超出雲梯可達高度（'+(TAC_LADR[q.code]||7)+'F 以下）';
  if(k==='roof')return tacLadSide(B,q,null)?'':'沒有大型車可停靠的道路，雲梯無法架設';
  if(k==='vvent')return f!==B.F-1||B.L.N[c].ty!=='room'?'垂直排煙請點頂樓的房間':B.F-B.bf>(TAC_LADR[q.code]||7)?'屋頂超出雲梯可達高度':tacLadSide(B,q,null)?'':'沒有大型車可停靠的道路';
  if(k==='ladder'||k==='master'||k==='vent'){const n=B.L.N[c];
   if(!n.wins)return'雲梯須靠對外窗作業';
   return tacLadSide(B,q,n.wins)?'':'此室的窗戶面向'+n.wins.map(w=>TAC_SDN[w]+'側'+B.sd[w].nm).join('、')+'，雲梯車無法停靠'}
  return'雲梯組只能雲梯救援、雲梯射水或破窗排煙'}
 if(k==='master'||k==='ladder')return'需要雲梯車';
 if(k==='move'||k==='gas'||k==='ident'||k==='plug')return'';
 if(k==='sky'){if(q.ty!=='pump')return'車頂砲塔需要幫浦車';if(tacIn(q))return'人員在室內，請先撤出';if(f<B.bf||f-B.bf>2)return'車頂砲塔只能打 1F～3F 的窗口';
  const n=B.L.N[c];if(!n.wins||!n.wins.some(w=>B.sd[w].road&&!tacCanSide(B,q,w)))return'此室的窗戶不面向幫浦車可停靠的道路';return''}
 if(k==='guard'&&!B.out)return'周界防護只針對鄰接的建築物，請點選鄰棟那一側';
 if(k==='attack'||k==='guard'||k==='confine')return(q.ty==='pump'||q.ty==='robot')?'':'此組沒有水線';
 if(k==='force'||k==='dctrl')return q.ty==='robot'?'機器人無法執行':'';
 if(k==='overhaul')return q.ty==='robot'?'機器人無法翻搜殘火':B.L.N[c].ty!=='room'?'請點選房間':'';
 if(k==='npv')return q.ty!=='vent'?'負壓排煙需要排煙組的排風機':f<B.bf?'地下室沒有對外窗':!B.L.N[c].wins?'此處沒有對外窗':'';
 if(k==='vvent')return q.ty==='robot'?'機器人無法上屋頂':f!==B.F-1||B.L.N[c].ty!=='room'?'垂直排煙請點頂樓的房間（在其正上方屋頂開孔）':'';
 if(k==='hydro')return q.ty!=='pump'?'水霧排煙需要幫浦組的水線':f<B.bf?'地下室沒有對外窗':!B.L.N[c].wins?'此處沒有對外窗':'';
 if(k==='trans'){if(q.ty!=='pump')return'過渡射水需要幫浦組';if(f<B.bf||f-B.bf>1)return'過渡射水只能從地面打 1F、2F 的窗口';
  const n=B.L.N[c];if(!n.wins||!n.wins.some(w=>B.sd[w].road))return'此室的窗戶不面向可站位的道路';return''}
 if(k==='search2')return q.ty==='robot'?'機器人無法搜索搬運':B.L.N[c].ty!=='room'?'只有房間需要搜索':'';
 if(k==='search')return q.ty==='robot'?'機器人無法搜索搬運':B.L.N[c].ty!=='room'&&!(f>=0&&tacCel(B,f,c).vic)?'只有房間需要搜索':'';
 if(k==='roofres')return q.ty==='robot'?'機器人無法上屋頂':'';
 if(k==='vent'&&f<B.bf)return'地下室沒有對外窗，只能經樓梯與屋頂排煙';
 if(k==='vent')return q.ty==='robot'?'機器人無法破窗':!B.L.N[c].win?(tacStair(B,c)?'屋頂排煙請點頂樓樓梯間':'此處沒有對外窗'):'';
 if(k==='roof')return q.ty==='robot'?'機器人無法上屋頂':'';
 return''}
// 下達指令
// 命令被拒絕或無法執行：畫面提示；小組自己拒絕的（「拒絕：」開頭）另以無線電回報
function tacNo(inc,q,why){const r=/^拒絕：/.test(why);msg=q.cs+'：'+(r?why.slice(3):why);
 if(r)radio(inc,q.cs,'報告指揮官，無法執行：'+why.slice(3)+'。')}
// 雲梯車可停靠的一側：wins 為窗戶方向（null 表示任一側，用於屋頂），優先目前所在側
function tacLadSide(B,q,wins){
 const ok=(wins||TAC_SIDES).filter(s=>!tacCanSide(B,q,s));
 return ok.includes(q.tside)?q.tside:ok[0]||null}
function tacOrder(inc,q,k,f,c,quiet,side,door){
 const B=inc.tac;q.wd=0;
 if(/^ppe/.test(k))return tacPPE(inc,B,q,k.slice(3),quiet);
 if(k==='vent'&&f===B.F-1&&tacStair(B,c))k='roof';
 if(k==='truck')return tacTruck(inc,B,q,side,quiet);
 if(k==='hyd'){const why=tacCan(B,q,'hyd');if(why){if(!quiet)msg=q.cs+'：'+why;return false}
  if(tacTruck(inc,B,q,B.hyd.side,1)){radio(inc,q.cs,'收到，移車至'+TAC_SDN[B.hyd.side]+'側消防栓佔水。');return true}return false}
 if(k==='guard'&&side){k='cover'}
 if(k==='cover'){
  const why=q.ty!=='pump'?'只有幫浦組能做周界防護':!side||B.exp[side]===undefined?'請點選鄰棟那一側':tacIn(q)?'人員在室內':'';
  const ts=why?null:tacCoverSide(B,q,side);
  if(why||!ts){if(!quiet)msg=q.cs+'：'+(why||'沒有相鄰道路可停車射水');return false}
  if(B.sp&&B.sp.u===q.u){B.sp.on=0;B.sp.u=null;radio(inc,q.cs,'離開送水口，連結送水管停止加壓！')}
  q.prev=null;q.task='cover';q.cside=side;q.tf=-1;q.tc=0;q.lt=S.t;q.ws=null;
  if(ts!==q.tside)tacTruck(inc,B,q,ts,1);
  if(!quiet)radio(inc,q.cs,'收到，於'+TAC_SDN[ts]+'側對'+TAC_SDN[side]+'側鄰棟外牆周界防護。');
  return true}
 const why=tacCan(B,q,k,f,c)||tacRefuse(B,q,k,f,c);
 if(why){if(!quiet)tacNo(inc,q,why);return false}
 // AI 下令（quiet）：路線或目標經過超過本組防護等級的化學品區域就不派
 if(quiet&&B.chem&&f>=0&&k!=='exit'&&q.ty!=='ladder'){const p=TAC_PPE[q.ppe||'F'].p,st=q.f>=0?[q.f,q.c]:null;
  const e=st?null:tacBestEnt(B,q.side,f,c,false),path=st?tacPath(B,st[0],st[1],f,c):e?[[tacEF(B,e),e.c]].concat(tacPath(B,tacEF(B,e),e.c,f,c)):[];
  if(path.some(x=>(tacCel(B,x[0],x[1]).hz||0)>p))return false}
 // 攻擊線：先確認水帶拉得到
 let ln=null;
 if((k==='force'||k==='dctrl')&&side){
  if(!B.ents.some(e=>e.side===side)){if(!quiet)msg=q.cs+'：該側沒有入口';return false}
  if(B.sp&&B.sp.u===q.u){B.sp.on=0;B.sp.u=null}
  q.prev=null;q.wk=0;q.dcd=0;q.task=k;q.tf=-1;q.tc=0;q.ws=side;q.dside=side;q.ent=null;
  if(!quiet)radio(inc,q.cs,'收到，'+TAC_TASK[k]+'，'+TAC_SDN[side]+'側入口。');
  return true}
 if(k==='vvent'&&q.ty!=='ladder'){
  q.prev=null;q.wk=0;q.task='vvent';q.vc=c;q.tf=B.F-1;q.tc=tacNearStair(B,B.F-1,c);q.ent=tacBestEnt(B,q.side,q.tf,q.tc,false);
  if(!quiet)radio(inc,q.cs,'收到，上屋頂於'+tacNm(B,f,c)+'正上方開孔垂直排煙。');
  return true}
 if(k==='trans'){const sd=B.L.N[c].wins.filter(w=>B.sd[w].road).sort((a,b)=>tacOutLen(q.tside,a)-tacOutLen(q.tside,b))[0];
  if(B.sp&&B.sp.u===q.u){B.sp.on=0;B.sp.u=null;radio(inc,q.cs,'離開送水口，連結送水管停止加壓！')}
  q.prev=null;q.wk=0;q.task='trans';q.tf=-1;q.tc=0;q.lf=f;q.lc=c;q.ws=sd;q.lt=S.t;q.ent=null;
  if(!quiet)radio(inc,q.cs,'收到，由'+TAC_SDN[sd]+'側窗口對'+tacNm(B,f,c)+'過渡射水，降溫後入室。');
  return true}
 if(k==='sky'){const sd=B.L.N[c].wins.filter(w=>B.sd[w].road&&!tacCanSide(B,q,w)).sort((a,b)=>(a===q.tside?0:1)-(b===q.tside?0:1))[0];
  if(B.sp&&B.sp.u===q.u){B.sp.on=0;B.sp.u=null;radio(inc,q.cs,'離開送水口，連結送水管停止加壓！')}
  q.prev=null;q.wk=0;q.task='sky';q.tf=-1;q.tc=0;q.lf=f;q.lc=c;q.ws=sd;q.lt=S.t;q.ent=null;q.warn=0;
  if(sd!==q.tside)tacTruck(inc,B,q,sd,1);
  if(!quiet)radio(inc,q.cs,'收到，'+(sd!==q.tside?'移車至'+TAC_SDN[sd]+'側，':'')+'以車頂砲塔對'+tacNm(B,f,c)+'射水壓制。');
  return true}
 if(k==='attack'||k==='guard'||k==='hydro'||k==='confine'){ln=tacLineTo(B,q,f,c);
  if(!ln){if(!quiet)msg=q.cs+'：水帶長度不足（上限 '+TAC_HOSE+' 條）'+(B.sp&&f>=1?'，請先做送水口加壓，改由各樓層出水口接線':'')+'，或移車到較近入口那側';return false}}
 if(B.sp&&B.sp.u===q.u&&k!=='stand'){B.sp.on=0;B.sp.u=null;radio(inc,q.cs,'離開送水口，連結送水管停止加壓！')}
 q.prev=null;q.wk=0;q.ext=0;q.ws=null;q.dcd=0;q.dto=(k==='force'||k==='dctrl')&&door!=null?door:null;
 q.ent=ln&&ln.ent&&ln.src==='pump'&&ln.u===q.u?ln.ent:(f>=0&&q.ty!=='ladder'?tacBestEnt(B,q.side,f,c,false):null);
 if(k==='exit'){q.task='exit';q.tf=-1;q.tc=0}
 else if(k==='stand'){q.task='stand';q.tf=-1;q.tc=0;
  if(q.tside!==B.sp.side)tacTruck(inc,B,q,B.sp.side,1)}
 else if(k==='rit'){q.task='rit';q.tf=-1;q.tc=0;
  const dn=B.sq.find(x=>x.down&&!B.sq.some(y=>y.task==='ritgo'&&y.resc===x.u));
  if(dn){q.task='ritgo';q.resc=dn.u;q.tf=dn.f;q.tc=dn.c}}
 else if(k==='ppv'){
  if(B.ppv&&q.task==='ppv'){B.ppv=0;q.task='idle';if(!quiet)radio(inc,q.cs,'正壓排煙停止，送風機關閉。');return true}
  q.task='ppv';q.tf=-1;q.tc=0;q.ws=side&&B.ents.some(e=>e.side===side)?side:(B.ents.find(e=>e.side===q.side)||B.ents[0]).side}
 else if(k==='roof'){q.task='roof';q.tf=q.ty==='ladder'?-1:B.F-1;q.tc=0;q.lf=B.F-1;q.lc=0}
 else if(k==='roofres'){q.task='roofres';q.tf=q.ty==='ladder'?-1:B.F-1;q.tc=0;q.lf=B.F;q.lc=0}
 else if(k==='vvent'){q.task='vvent';q.tf=-1;q.tc=0;q.lf=B.F;q.lc=0;q.vc=c}
 else if(q.ty==='ladder'){q.task=k;q.tf=-1;q.tc=0;q.lf=f;q.lc=c}
 if(q.ty==='ladder'&&(k==='ladder'||k==='master'||k==='vent'||k==='roof'||k==='roofres'||k==='vvent')){
  const sd=tacLadSide(B,q,k==='roof'||k==='roofres'||k==='vvent'?null:B.L.N[c].wins);q.lside=sd;
  if(sd!==q.tside)tacTruck(inc,B,q,sd,1)}
 else if(k!=='stand'&&k!=='ppv'&&k!=='exit'&&k!=='rit'&&k!=='roof'){q.task=k;q.tf=f;q.tc=c}
 if(TAC_WET[k])q.lt=S.t;
 if(!quiet)radio(inc,q.cs,'收到，'+TAC_TASK[q.task]+(f>=0&&k!=='rit'&&k!=='exit'&&k!=='ppv'?'，'+(k==='move'?'前往 ':'目標 ')+(k==='roof'||k==='roofres'?'屋頂':tacNm(B,f,c)):'')+'。');
 return true}
function tacDown(inc,B,q,why){
 if(q.down)return;
 if(q.carry&&q.f>=0){tacCel(B,q.f,q.c).vic+=q.carry}
 q.down=1;q.carry=0;B.mayday++;B.mdN=(B.mdN||0)+1;q.inj=1;
 tacEvt(inc,B,'mayday','MAYDAY：'+q.cs+' '+why+'（'+tacNm(B,q.f,q.c)+'）',1);
 radio(inc,q.cs,'MAYDAY！MAYDAY！MAYDAY！'+why+'，位置 '+tacNm(B,q.f,q.c)+'，'+q.n+' 名隊員。');
 const r=B.sq.find(x=>x.task==='rit'&&!x.down);
 if(r){r.task='ritgo';r.resc=q.u;r.tf=q.f;r.tc=q.c;radio(inc,r.cs,'RIT 收到，立即入室救援 '+q.cs+'。')}
 else{B.noRit++;radio(inc,'受理','現場未編成 RIT！請立即指派小組救援 '+q.cs+'。')}}
// 已發現但還沒有人去搬的受困者（換瓶回來的小組優先去接手）
function tacKnownVic(B,q){if(q.ty==='robot'||q.ty==='ladder'||q.sk==='vol')return null;
 return B.cells.find(x=>x.vic>0&&x.srch>=1&&x.h<.6&&!B.sq.some(y=>y!==q&&(y.task==='search'||y.task==='search2')&&y.tf===x.f&&y.tc===x.c))||null}
// 換瓶休息後回原任務；有已發現的受困者待搬運就先去接手
function tacResume(inc,B,q,p,where){const kv=tacKnownVic(B,q);
 if(kv){q.task='search';q.tf=kv.f;q.tc=kv.c;radio(inc,q.cs,where+'換瓶完成，前往'+tacNm(B,kv.f,kv.c)+'接手搬運受困者。');return}
 q.task=p.task;q.tf=p.tf;q.tc=p.tc;radio(inc,q.cs,where+'換瓶完成，返回'+tacFlr(B,p.tf)+'續行'+TAC_TASK[p.task]+'。')}
// 小組每幀更新：空氣、受傷、移動、任務執行
function tacSquad(inc,B,q,dt,eff){
 if(tacHazStep(inc,B,q,dt))return;
 const inside=tacIn(q),cl=inside?tacCel(B,q.f,q.c):null,cmd=(B.st.icp?1.15:1)*tacSk(q).w*tacVisF(q,cl);
 if(q.task==='station')return;
 if(q.down){
  q.hp-=dt*.0025*(1+(cl?cl.h*2:0));
  if(q.hp<=0){
   B.lodd++;B.mayday=Math.max(0,B.mayday-1);S.rep-=12;S.score-=200;
   msg='消防人員殉職：'+q.cs+'（評鑑 -12）';
   radio(inc,'受理',q.cs+' 隊員搶救無效，現場全員默哀，請各組確實人員清點。');
   const u=S.units.find(x=>x.id===q.u);if(u){u.inc=null;crewDown(u);home(u);u.oosAfter=900}
   tacEvt(inc,B,'danger','殉職：'+q.cs,1);
   q.gone=1;if(S.rep<=0){S.rep=0;S.over=true}}
  return}
 // 搬運途中經過前進指揮所：換瓶後續行
 if(inside&&q.carry&&q.air<.6&&tacFwdOK(B)&&q.f===B.fwd.f&&(B.fwd.stock>0||B.st.air)){if(!B.st.air)B.fwd.stock--;q.air=1;radio(inc,q.cs,'搬運途中於前進指揮所換瓶，續行搬運。')}
 if(inside&&q.ty!=='robot'){
  const hv=q.task==='attack'||q.task==='search'||q.task==='ritgo'||q.carry;
  // 面罩：在安全區不接肺力閥、不耗氣；煙熱突然進到所在空間時緊急戴上（吸到一點煙）
  if(!q.mk&&!tacSafe(cl)&&!B.wild&&(q.ppe||'F')!=='C'){q.mk=1;q.mkF=q.f;q.mkT=0;q.hp=Math.max(.3,q.hp-.04);radio(inc,q.cs,tacNm(B,q.f,q.c)+'煙進來了，緊急戴上面罩、接上肺力閥。')}
  // 撤回安全區：卸下肺力閥，不再耗氣
  if(q.mk&&q.mkF>=0&&q.f<=q.mkF&&tacSafe(cl)&&(q.task==='exit'||q.task==='fwdref'||q.task==='idle'||q.task==='station')){q.mk=0}
  if(q.mk)q.air-=dt/TAC_AIR*(hv?1.15:1)*(q.carry?1.3:1)*(1+q.fat*.3);
  q.fat=Math.min(1.2,q.fat+dt/220*(hv?1.4:1)*tacSk(q).fat);
  // 體力透支：撤出到屋外休息，恢復後回原任務
  if(q.fat>=1&&q.task!=='exit'&&q.task!=='carry'&&q.task!=='ritgo'){
   radio(inc,q.cs,'隊員體力透支，撤出休息。');q.prev=(q.task==='idle'||q.task==='rit')?null:{task:q.task,tf:q.tf,tc:q.tc};q.task='exit';q.tf=-1;q.tc=0}
  if(q.air<=0){q.air=0;tacDown(inc,B,q,'空氣瓶耗盡');return}
  // 低壓：剩餘氣量不足以從目前位置撤到屋外（含安全餘裕）就撤出換瓶，換瓶後回原任務；
  // 搬運受困者與 RIT 救援除外。樓層越高越早撤
  // 只要撐到安全區（前進指揮所、接上肺力閥的樓層或屋外）就能卸下面罩
  const est=(Math.abs(q.f-(tacFwdOK(B)&&q.f>B.fwd.f?B.fwd.f:q.mkF>=0?Math.min(q.f,q.mkF):B.bf))*2.6+(tacGd(B,q.c,tacNearStair(B,q.f,q.c))+1)*1.8)*1.8*1.15*(1+q.fat*.6)*(1+q.fat*.3),lowAt=Math.min(.7,Math.max(.33,(est*1.3+8)/TAC_AIR));
  if(q.mk&&q.air<lowAt&&q.task!=='exit'&&q.task!=='carry'&&q.task!=='ritgo'&&q.task!=='fwdref'){
   const fw=tacFwdOK(B)&&q.f>B.fwd.f;
   if(!q.low)radio(inc,q.cs,'空氣瓶低壓警報，'+(fw?'到'+tacFlr(B,B.fwd.f)+'前進指揮所換瓶。':'撤出換瓶。'));
   q.low=1;q.prev=(q.task==='idle'||q.task==='rit')?null:{task:q.task,tf:q.tf,tc:q.tc};
   if(fw){q.task='fwdref';q.tf=B.fwd.f;q.tc=0}else{q.task='exit';q.tf=-1;q.tc=0}}
  else if(q.mk&&q.air<lowAt&&!q.low){q.low=1;radio(inc,q.cs,'空氣瓶低壓警報，完成手上任務後撤出。')}
  const prot=(q.task==='attack'||q.task==='guard'||q.task==='confine'||q.task==='hydro')&&q.line&&eff>0&&q.pf>.15&&q.f===q.tf&&q.c===q.tc;
  if(cl.h>.68)q.hp-=dt*(cl.h-.62)*(prot?.015:.07);
  // 沒有水線掩護、所在空間超過耐熱上限：自動撤退（搬運與 RIT 救援除外；機器人不受限）
  const keep=q.ty==='robot'||q.task==='exit'||q.task==='carry'||q.task==='ritgo'||q.task==='fwdref';
  if(!keep&&!tacCovered(q,eff)&&cl.h>tacHotLim(q)+.05&&!q.mt){
   radio(inc,q.cs,tacNm(B,q.f,q.c)+'溫度約 '+tacTmp(B,cl)+'°C，無水線掩護，撤退！');q.prev=null;q.task='exit';q.tf=-1;q.tc=0}
  // 有水線也頂不住：隊員受熱過度，撤出休息，之後回原任務
  else if(!keep&&q.hp<.45&&cl.h>.68&&!q.mt){
   radio(inc,q.cs,tacNm(B,q.f,q.c)+'溫度約 '+tacTmp(B,cl)+'°C，隊員受熱過度，撤出！');q.prev=TAC_WET[q.task]||q.task==='search'||q.task==='search2'?{task:q.task,tf:q.tf,tc:q.tc}:null;q.task='exit';q.tf=-1;q.tc=0}
  if(q.hp<.3){tacDown(inc,B,q,'高溫受困');return}}
 // 停車整裝（畫面外的車另加步行時間）完成前，屋外小組可以先下令，但還不會出發
 if(!inside&&!tacReady(q)){q.nf=q.f;q.nc=q.c;q.mt=0;return}
 // 移動：屋外先移車或繞到入口那側，再進出建物
 if(!inside&&tacOutStep(inc,B,q,dt)){q.nf=q.f;q.nc=q.c;return}
 const ns=tacNext(B,q);
 // 前方空間超過耐熱上限、又沒有水線掩護：停止前進（室內撤出、屋外放棄進入）
 if(ns&&ns[0]>=0&&q.ty!=='robot'&&!q.mt&&q.task!=='exit'&&q.task!=='carry'&&q.task!=='ritgo'&&q.task!=='fwdref'&&!tacCovered(q,eff)&&tacCel(B,ns[0],ns[1]).h>tacHotLim(q)){
  const y=tacCel(B,ns[0],ns[1]);radio(inc,q.cs,'前方'+tacNm(B,ns[0],ns[1])+'溫度約 '+tacTmp(B,y)+'°C，'+(TAC_WET[q.task]?'水線還沒出水':'沒有水線掩護')+'，無法前進'+(inside?'，撤出。':'，屋外待命。'));
  q.prev=null;if(inside){q.task='exit';q.tf=-1;q.tc=0}else{q.task='idle';q.tf=-1;q.tc=0}q.nf=q.f;q.nc=q.c;return}
  // 接上肺力閥：在安全區邊界（燃燒門外、高樓起火層的直下層）停下來戴面罩約 6 秒
 if(ns&&ns[0]>=0&&!q.mt&&tacMaskNeed(B,q,ns)){q.mkT=(q.mkT||0)+dt;q.nf=q.f;q.nc=q.c;
  if(q.mkT<6)return;q.mkT=0;q.mk=1;q.mkF=q.f;
  if(tacHiR(B)&&q.f>=0)radio(inc,q.cs,'於'+tacFlr(B,q.f)+'安全區接上肺力閥，進入作業區。');return}
 if(ns){q.nf=ns[0];q.nc=ns[1];
  const lockE=q.f<0&&ns[0]>=0&&q.ent&&q.ent.lock?q.ent:null;
  const lockD=q.f>=0&&ns[0]===q.f&&B.lk.has(tacDK(B,q.f,q.c,ns[1]));
  if(lockE||lockD){const need=(q.ty==='resc'?4:q.ty==='robot'?6:9)/(q.usar?1.6:1)*(tacEntryMode(B,q)==='dctrl'?1.5:1); // 特搜分隊破壞器材較強；門控較慢
   if(!q.frc&&!B.sq.some(y=>y!==q&&y.frc>0&&y.nf===ns[0]&&y.nc===ns[1]))radio(inc,q.cs,(lockE?TAC_SDN[lockE.side]+'側'+(lockE.shop?'店面':lockE.ramp?'車道':'入口')+'鐵捲門上鎖':tacNm(B,q.f,ns[1])+'房門上鎖')+'，破壞進入中。');
   q.frc=(q.frc||0)+dt;q.mt=0;
   if(lockE)lockE.known=1;else(B.lkK||(B.lkK=new Set())).add(tacDK(B,q.f,q.c,ns[1]));
   if(q.frc>=need){q.frc=0;const md=tacEntryMode(B,q);
    if(lockE){lockE.lock=0;lockE.open=1;radio(inc,q.cs,TAC_SDN[lockE.side]+'側入口'+(md==='dctrl'?'破壞完成，門控開門。':'破壞完成。'));tacDoorIn(inc,B,q,tacCel(B,ns[0],ns[1]),md)}
    else{B.lk.delete(tacDK(B,q.f,q.c,ns[1]));B.cd.delete(tacDK(B,q.f,q.c,ns[1]));radio(inc,q.cs,tacNm(B,q.f,ns[1])+(md==='dctrl'?'門鎖破壞完成，門控開門。':'門鎖破壞完成。'));tacDoorIn(inc,B,q,tacCel(B,ns[0],ns[1]),md)}}
   return}
  // 門控：關著的門後面有熱或濃煙，先控制開度、觀察煙況約 3 秒再通過
  {const cdk=q.f>=0&&ns[0]===q.f?tacDK(B,q.f,q.c,ns[1]):null;
   if(cdk&&B.cd.has(cdk)&&q.task!=='exit'&&tacEntryMode(B,q)==='dctrl'){const y=tacCel(B,ns[0],ns[1]);
    if(y.h>.2||y.s>.5){if(q.dcoK!==cdk){q.dcoK=cdk;q.dco=0}q.dco+=dt;if(q.dco<3){q.mt=0;return}}}}
  q.frc=0;q.mt+=dt;
  if(q.mt>=tacStepTime(B,q,ns)){q.mt=0;const pc=q.c,pf=q.f;
   if(q.f>=0&&ns[0]>q.f&&Math.random()<.3)tacSay(q,'stair');
   if(q.f<0&&ns[0]>=0&&q.ent){if(!q.ent.open){q.ent.open=1;tacDoorIn(inc,B,q,tacCel(B,ns[0],ns[1]),tacEntryMode(B,q))}B.eo[q.ent.side]=S.t;q.inEnt=q.ent;q.inT=S.t;
    tacOnce(inc,B,'entry','首組入室：'+q.cs+'（'+TAC_SDN[q.ent.side]+'側入口）');
    // 已知有受困者時入室救人屬「2 進 2 出」的救人例外，不記缺失
    if(!B.sq.some(y=>y.task==='rit'||y.task==='ritgo')&&!B.viol.noRit&&!B.cells.some(x=>x.vic>0&&(x.rep||x.rub||x.srch>=1))){B.viol.noRit=1;tacEvt(inc,B,'warn','未編成 RIT 即入室（'+q.cs+'）')}
    // 初期搶救時間緊迫：指揮車未到、或到場後 2 分鐘內、或安全官正在設置管制板時入室，不記缺失
    if(B.played&&!tacAcc(B)&&!B.viol.noAcc&&!B.role.safety&&S.t-B.t0>120&&onScene(inc).some(u=>(u.code==='41'||u.code==='指')&&u.st==='work')){B.viol.noAcc=1;tacEvt(inc,B,'warn','未設人員管制板即入室（'+q.cs+'）')}}
   const dk=tacDK(B,q.f,pc,ns[1]),fdd=ns[0]===q.f&&q.f>=0&&B.fd.get(dk);
   if(fdd)tacFDPass(inc,B,q,dk,fdd);
   else if(ns[0]===q.f&&q.f>=0&&B.cd.delete(dk)&&q.task!=='exit'){radio(inc,q.cs,'打開'+tacNm(B,q.f,ns[1])+'的門通過，侷限解除。');tacDoorIn(inc,B,q,tacCel(B,ns[0],ns[1]),tacEntryMode(B,q))}
   q.f=ns[0];q.c=ns[1];
   if(q.f<0){q.side=tacExitSide(B,q,pc,pf);B.eo[q.side]=S.t;q.ent=null;q.inEnt=null;tacOutside(inc,B,q)}}
  return}
 q.mt=0;q.nf=q.f;q.nc=q.c;
 const k=q.task;
 if(!inside){
  // 屋外：換瓶、雲梯作業、正壓排煙
  if(q.hp<1)q.hp=Math.min(1,q.hp+dt*.03);
  q.fat=Math.max(0,q.fat-dt/(B.st.rehab?16:80));
  if(q.air<1&&q.ty!=='robot'&&q.ty!=='ladder'){
   // 換瓶：充填區 3 秒；否則用車上備用瓶 7 秒；備用瓶用完又沒有充填區就無法換瓶（等救助器材車到場）
   if(q.refill==='none'&&B.st.air)q.refill=null;
   if(!q.refill){q.refill=B.st.air?'air':q.cyl>0?'cyl':'none';if(q.refill==='cyl')q.cyl--;
    if(q.refill==='none'&&!q.noCyl){q.noCyl=1;radio(inc,q.cs,'車上備用氣瓶用完，現場沒有氣瓶充填區，無法換瓶！請派救助器材車（71）。')}}
   if(q.refill!=='none')q.air=Math.min(1,q.air+dt/(q.refill==='air'?3:7));
   if(q.air>=1)q.refill=null;
   return}
  if(q.prev&&q.fat<.5&&tacStale(B,q.prev)){q.prev=null;q.low=0;q.task='idle';return}
  if(q.prev&&q.fat<.5){q.low=0;const p=q.prev;q.prev=null;tacResume(inc,B,q,p,'');return}
  if(q.prev)return;
  if(q.air>=1)q.low=0;
  if(k==='ppv'){if(!B.ppv){B.ppv=1;B.ppvSide=q.side;radio(inc,q.cs,'正壓排煙：送風機於'+TAC_SDN[q.side]+'側入口就位，開始送風。');
    const hot=B.cells.filter(x=>x.ty!=='stair'&&x.h>.45).sort((a,b)=>b.h-a.h)[0];if(hot)tacEarlyVent(inc,B,hot)}return}
  if(k==='force'){ // 破壞進入：預先破開這一側入口的鐵捲門或鐵門
   const e=B.ents.find(x=>x.side===q.dside);
   if(!e||!e.lock){q.task='idle';radio(inc,q.cs,TAC_SDN[q.dside]+'側入口未上鎖，可直接進入。');return}
   q.wk+=dt;if(q.wk>=(q.ty==='resc'?4:9)){q.wk=0;e.lock=0;q.task='idle';radio(inc,q.cs,TAC_SDN[e.side]+'側入口破壞完成，可以進入。')}
   return}
  if(k==='dctrl'){ // 門控進入：入口上鎖先破壞，之後守在入口控制開度，入口不會變成進氣路徑
   const e=B.ents.find(x=>x.side===q.dside);
   if(e&&e.lock){q.wk+=dt;q.frc=q.wk;if(q.wk>=(q.ty==='resc'?4:9)){q.wk=0;q.frc=0;e.lock=0;radio(inc,q.cs,TAC_SDN[e.side]+'側入口破壞完成，門控中，控制進氣。')}}
   return}
  if(k==='sky'){ // 車頂砲塔：大流量直流水柱經窗口打進室內，快速降溫壓制；室內有小組時會被熱煙蒸汽波及
   if(q.tmv)return;
   const lc=tacCel(B,q.lf,q.lc);
   if(q.line&&eff>0&&q.pf>0){const pw=.3*eff*q.pf;
    lc.h=Math.max(0,lc.h-dt*pw);lc.s=Math.max(0,lc.s-dt*pw*.2);lc.wet=1;
    if(!lc.v)tacOpenWin(inc,B,lc,q.cs);
    for(const cc of B.L.N[q.lc].nb){const nb=tacCel(B,q.lf,cc);if(nb.h>.05)nb.h=Math.max(0,nb.h-dt*pw*.3)}
    q.wk+=dt;
    const hit=B.sq.filter(x=>tacIn(x)&&x.f===q.lf&&(x.c===q.lc||B.L.N[q.lc].nb.includes(x.c))&&x.ty!=='robot'&&!x.down);
    if(hit.length&&!q.warn){q.warn=1;radio(inc,'安全官','注意，'+tacFlr(B,q.lf)+' 有入室小組，車頂砲塔會把熱煙蒸汽壓回室內，請協調內外攻擊！')}
    for(const x of hit)x.hp-=dt*.02}
   if(q.wk>=14||lc.h<.1){q.wk=0;radio(inc,q.cs,tacNm(B,q.lf,q.lc)+'車頂砲塔壓制完成，停止砲塔，轉入室攻擊。');
    if(lc.h<.03||!tacOrder(inc,q,'attack',q.lf,q.lc,1))q.task='idle'}
   return}
  if(k==='trans'){ // 過渡射水：從窗口外先打一波，降溫後轉入室攻擊
   const lc=tacCel(B,q.lf,q.lc);
   if(q.line&&eff>0){lc.h=Math.max(0,lc.h-dt*.14*eff*q.pf);lc.wet=1;lc.v=1;q.wk+=dt}
   if(q.wk>=10||lc.h<.15){q.wk=0;radio(inc,q.cs,tacNm(B,q.lf,q.lc)+'過渡射水完成，火勢壓制，轉入室攻擊。');
    if(!tacOrder(inc,q,'attack',q.lf,q.lc,1))q.task='idle'}
   return}
  if(k==='stand'){if(!B.sp.on){q.wk+=dt;if(q.wk>=8){q.wk=0;B.sp.on=1;B.sp.u=q.u;
    radio(inc,q.cs,'已接妥'+TAC_SDN[B.sp.side]+'側送水口，連結送水管加壓完成，各樓層出水口可接線。')}}return}
  if(q.ty==='ladder'&&(k==='ladder'||k==='master'||k==='vent'||k==='roof'||k==='roofres')){
   if(q.ext<1){q.ext=Math.min(1,q.ext+dt/(k==='roofres'?10:7));return}
   if(k==='roofres'){
    if(!B.roofS){q.wk+=dt;if(q.wk>=5){q.wk=0;B.roofS=1;radio(inc,q.cs,'雲梯抵達屋頂，'+(B.roofV?'發現避難民眾 '+B.roofV+' 名。':'屋頂無人。'))}return}
    if(B.roofV>0){q.wk+=dt;if(q.wk>=8){q.wk=0;B.roofV--;tacPatient(inc,B,B.roofH,q.cs+' 以雲梯自屋頂');}return}
    q.task='idle';return}
   const lc=tacCel(B,q.lf,q.lc);
   if(k==='roof'){if(!B.roof){B.roof=1;radio(inc,q.cs,'雲梯就位，已開啟頂樓樓梯間屋頂排煙口。')}q.task='idle';return}
   if(k==='vvent'){q.wk+=dt;if(q.wk>=10){q.wk=0;const x=tacCel(B,B.F-1,q.vc);x.vv=1;tacEarlyVent(inc,B,x);q.task='idle';
    radio(inc,q.cs,'雲梯就位，於'+tacNm(B,B.F-1,q.vc)+'正上方屋頂開孔，垂直排煙建立。')}return}
   if(k==='vent'){if(!lc.v){tacOpenWin(inc,B,lc,q.cs);radio(inc,q.cs,'雲梯破窗，'+tacNm(B,q.lf,q.lc)+'開口完成。')}q.task='idle';return}
   if(k==='master'){
    const rfT=B.rf&&B.rf.h>0&&q.lf===B.F-1,exT=B.ext&&B.ext.h>0&&q.lf===B.ext.f&&q.lc===B.ext.c;
    if(q.line&&eff>0&&q.pf>0&&(rfT||exT)){
     if(rfT){const pw=inc.pow>=2;if(!pw&&!B.rfW){B.rfW=1;radio(inc,'安全官','屋頂光電板仍帶電，只能以水霧遠距射水，等待台電斷電！')}
      B.rf.h=Math.max(0,B.rf.h-dt*.035*eff*q.pf*(pw?1:.3));if(B.rf.h<=0)radio(inc,q.cs,'屋頂光電板火勢已撲滅。')}
     if(exT){B.ext.h=Math.max(0,B.ext.h-dt*.08*eff*q.pf);if(B.ext.h<=0)radio(inc,q.cs,'外牆室外機火勢已撲滅。')}}
    if(lc.h<=0&&!rfT&&!exT){q.task='idle';radio(inc,q.cs,tacNm(B,q.lf,q.lc)+'火勢已熄，雲梯停止射水。');return}
    if(q.line&&eff>0&&q.pf>0){lc.h=Math.max(0,lc.h-dt*.06*eff*q.pf);lc.wet=1;lc.v=1;if(lc.h<.03){lc.h=0;lc.dw=1}
     // 內外夾攻：同層、射水房間附近的入室小組會被推回的熱煙燙傷
     const hit=B.sq.filter(x=>tacIn(x)&&x.f===q.lf&&(x.c===q.lc||B.L.N[q.lc].nb.includes(x.c))&&x.ty!=='robot'&&!x.down);
     if(hit.length&&!q.warn){q.warn=1;radio(inc,'安全官','注意，'+tacFlr(B,q.lf)+' 有入室小組，雲梯射水會把熱煙壓回室內，請協調內外攻擊！')}
     if(!hit.length)q.warn=0;
     for(const x of hit)x.hp-=dt*.015}
    return}
   // 雲梯救援：先由窗口搜索，再逐一救下
   if(lc.srch<1){lc.srch=Math.min(1,lc.srch+dt/9);
    if(lc.srch>=1){tacPrim(B,lc,.1);radio(inc,q.cs,tacNm(B,q.lf,q.lc)+'窗口初期搜索完成，'+(lc.vic?'發現受困者 '+lc.vic+' 名。':'未發現受困者。'))}return}
   if(lc.vic>0){q.wk+=dt;
    if(q.wk>=6){q.wk=0;lc.vic--;tacPatient(inc,B,lc.vh,q.cs+' 以雲梯')}
    return}
   q.task='idle'}
  return}
 // 室內任務
 if(k==='attack'){
  if(q.line&&eff>0&&q.pf>0&&Math.random()<dt*.1)tacSay(q,'attack');
  if(q.line&&eff>0&&q.pf>0){
   // 泡沫：泡沫車、特殊化學車與 CAFS 幫浦車（泡沫瞄）對油火有效，對一般火也比清水好
   const foam=q.code==='57'||q.code==='01'||q.cafs,fo=cl.fuel?(foam?(q.cafs?1:1.2):.3):(q.code==='57'?1.3:q.cafs?1.25:1),pw=.085*eff*q.pf*fo*(q.n/3)*cmd;
   cl.h=Math.max(0,cl.h-dt*pw);cl.wet=1;if(cl.h<.03){cl.h=0;cl.dw=1}
   // 水霧也會冷卻門另一側的空間
   for(const cc of B.L.N[q.c].nb){const nb=tacCel(B,q.f,cc);nb.h=Math.max(0,nb.h-dt*pw*.2);if(nb.h<.02)nb.h=0}
   if(cl.h<.03){ // 本室已撲滅：推進到同層最近的火點
    const best=tacNear(B,q.f,q.c,x=>x.h>.05&&!B.sq.some(y=>y!==q&&y.task==='attack'&&y.tf===q.f&&y.tc===x.c));
    if(best!==null)q.tc=best;else{q.task='hold';q.tf=q.f;q.tc=q.c;radio(inc,q.cs,tacFlr(B,q.f)+' 火勢已撲滅，原地守線。')}}}
  return}
 if(k==='move'){q.task='idle';return}
 if(k==='fwdgo'){q.task='station';q.stn='fwd';radio(inc,q.cs,tacFlr(B,q.f)+'前進指揮所設置完成，備用氣瓶 '+B.fwd.stock+' 支。');tacEvt(inc,B,'milestone','前進指揮所就位（'+tacFlr(B,q.f)+'）');return}
 if(k==='fwdref'){ // 前進指揮所：換瓶（備用瓶用完就要等充填區送上來）、休息
  if(tacSafe(cl))q.mk=0;
  if(q.refill==='none'&&B.st.air)q.refill=null;
  if(!q.refill){q.refill=B.st.air?'air':B.fwd.stock>0?'cyl':'none';if(q.refill==='cyl')B.fwd.stock--}
  // 前進指揮所的備用氣瓶用完、又沒有氣瓶充填區：不能在這裡等，撤到屋外換瓶（之後回原任務）
  if(q.refill==='none'&&q.air<1){q.refill=null;q.task='exit';q.tf=-1;q.tc=0;radio(inc,q.cs,'前進指揮所備用氣瓶用完，撤出到屋外換瓶。');return}
  if(q.refill!=='none')q.air=Math.min(1,q.air+dt/(q.refill==='air'?4:7));q.fat=Math.max(0,q.fat-dt/40);
  if(q.air>=1&&q.fat<.5){q.refill=null;q.low=0;let p=q.prev;q.prev=null;if(p&&tacStale(B,p))p=null;
   if(p)tacResume(inc,B,q,p,'於前進指揮所');else{const kv=tacKnownVic(B,q);if(kv){q.task='search';q.tf=kv.f;q.tc=kv.c}else q.task='idle'}}
  return}
 if(k==='beat'||k==='brk'){tacWildTask(inc,B,q,k,cl,dt,cmd);return}
 if(k==='ident'){tacIdent(inc,B,q,dt);return}
 if(k==='plug'){tacPlug(inc,B,q,dt);return}
 if(k==='shore'){q.wk+=dt;if(q.wk>=(q.usar?14:20)){q.wk=0;cl.shore=1;q.task='idle';radio(inc,q.cs,tacNm(B,q.f,q.c)+'支撐架設完成，可以進入瓦礫搜救。');tacEvt(inc,B,'milestone','支撐：'+tacNm(B,q.f,q.c))}return}
 if(k==='gas'){q.wk+=dt;if(q.wk>=5){q.wk=0;tacGasMeas(inc,B,q,cl);q.task='idle'}return} // 氣體偵測：到點量測約 5 秒
 if(k==='dctrl'){ // 門控（室內）：指定門則慢慢破開、控制開度開門並守住；否則先把本處通往火點或濃煙的門關上，再守在門邊控制開度，相鄰火點吃不到新鮮空氣
  if(q.dto!=null&&!q.dcd){const dk=tacDK(B,q.f,q.c,q.dto);
   if(B.lk.has(dk)){q.wk+=dt;q.frc=q.wk;if(q.wk<(q.ty==='resc'?4:9)/(q.usar?1.6:1)*1.5)return;q.wk=0;q.frc=0;B.lk.delete(dk)}
   q.wk+=dt;if(q.wk<3)return;q.wk=0;q.dcd=1;B.cd.delete(dk);
   radio(inc,q.cs,'門控開門：'+tacNm(B,q.f,q.dto)+'的門控制開度中。');tacDoorIn(inc,B,q,tacCel(B,q.f,q.dto),'dctrl');return}
  if(!q.dcd){q.wk+=dt;if(q.wk<3)return;q.wk=0;q.dcd=1;
   const nd=B.L.N[q.c];let sh=nd.nb.filter(o=>{const y=tacCel(B,q.f,o);return y.h>.05||y.s>.35});
   if(!sh.length)sh=nd.nb.filter(o=>B.L.N[o].ty==='room');
   if(nd.ty==='stair')sh=nd.nb.filter(o=>B.L.N[o].ty!=='stair'); // 在樓梯間：關上該層的防火門
   const nod=sh.filter(o=>tacOpn(B,q.c,o));sh=sh.filter(o=>!nod.includes(o));
   const gone=sh.filter(o=>!tacFDClose(B,tacDK(B,q.f,q.c,o)));sh=sh.filter(o=>!gone.includes(o));
   for(const o of sh)B.cd.add(tacDK(B,q.f,q.c,o));if(nod.length)radio(inc,q.cs,'通往'+tacNm(B,q.f,nod[0])+'是沒有門的開口，無法關閉。');
   radio(inc,q.cs,tacNm(B,q.f,q.c)+'關閉 '+sh.length+' 扇門，門控中。'+(gone.length?'防火門已被拆除，無法關閉！':''))}
  return}
 if(k==='force'){ // 破壞進入：沿路的鎖都已在移動時破開；指定門則破開那扇門並打開，否則把本室其餘門鎖破開
  if(q.dto!=null){const dk=tacDK(B,q.f,q.c,q.dto);
   if(B.lk.has(dk)){q.wk+=dt;if(q.wk<(q.ty==='resc'?4:9)/(q.usar?1.6:1))return;q.wk=0;B.lk.delete(dk)}
   B.cd.delete(dk);radio(inc,q.cs,'破壞進入，'+tacNm(B,q.f,q.dto)+'的門已打開。');tacDoorIn(inc,B,q,tacCel(B,q.f,q.dto),'force');q.dto=null;q.task='idle';return}
  for(const o of B.L.N[q.c].nb)B.lk.delete(tacDK(B,q.f,q.c,o));
  q.task='idle';radio(inc,q.cs,tacNm(B,q.f,q.c)+'破壞進入完成。');return}
 if(k==='overhaul'){ // 殘火處理：翻開夾層、家具與天花板，徹底澆熄餘燼
  if(!cl.emb){const nx=tacNear(B,q.f,q.c,x=>x.emb&&x.h<.05&&!B.sq.some(y=>y!==q&&y.task==='overhaul'&&y.tf===q.f&&y.tc===x.c));
   if(nx!==null){q.tc=nx;return}q.task='idle';radio(inc,q.cs,tacFlr(B,q.f)+' 殘火處理完成。');return}
  q.wk+=dt*(q.ty==='pump'?1:.6)*(q.n/3)*cmd;
  if(q.wk>=8){q.wk=0;cl.emb=0;cl.ovh=1;radio(inc,q.cs,tacNm(B,q.f,q.c)+'殘火處理完成，確認無餘燼。')}
  return}
 if(k==='npv'){ // 負壓排煙：在窗口架排風機把煙抽出（不像正壓會把空氣灌進火場）
  if(!cl.v){q.wk+=dt;if(q.wk>=3){q.wk=0;tacOpenWin(inc,B,cl,q.cs);radio(inc,q.cs,tacNm(B,q.f,q.c)+'開窗架設排風機，負壓排煙開始。')}}
  return}
 if(k==='vvent'){ // 垂直排煙：從頂樓樓梯上屋頂，在目標房間正上方開孔
  q.wk+=dt;if(q.wk>=12){q.wk=0;tacCel(B,B.F-1,q.vc).vv=1;tacEarlyVent(inc,B,tacCel(B,B.F-1,q.vc));q.task='idle';radio(inc,q.cs,'屋頂開孔完成，'+tacNm(B,B.F-1,q.vc)+'垂直排煙建立。')}
  return}
 if(k==='hold'){ // 守線：同層復燃立即再攻擊
  const c=tacNear(B,q.f,q.c,x=>x.h>.05);if(c!==null){q.task='attack';q.tc=c;q.lt=S.t}
  return}
 if(k==='search'||k==='search2'){
  const rate=dt/(q.ty==='resc'?5:8)/(cl.rub?(q.usar?1.2:q.ty==='resc'?2.5:4)*(cl.shore?.7:1):1)/(q.usar?1.3:1)/(TAC_RK[tacK(B,q.f,q.c)]||{sr:1}).sr/(1+cl.s*(tacTIC(q)?.6:1.5))*(q.n/3)*cmd;
  // 初期搜索：快速掃過可能遇難處所，濃煙中可能漏人
  if((k==='search'||k==='search2')&&!cl.vic&&Math.random()<dt*.15)tacSay(q,!tacTIC(q)&&cl.s>.7?'smoke':'search');
  if(k==='search'&&cl.srch<1){cl.srch=Math.min(1,cl.srch+rate/.6);if(cl.srch>=1&&!cl.sl)tacPrim(B,cl,0);return}
  // 次級搜索：徹底翻找，找出初搜漏掉的人
  if(k==='search2'&&cl.sl<2){cl.s2=Math.min(1,cl.s2+rate/1.4);
   if(cl.s2>=1){cl.sl=2;cl.srch=1;if(cl.hid){radio(inc,q.cs,tacNm(B,q.f,q.c)+'次級搜索發現初搜遺漏的受困者 '+cl.hid+' 名！');cl.vic+=cl.hid;cl.hid=0}}
   return}
  if(cl.vic>0){
   // 估算扛人到屋外所需氣量；不夠就回報位置撤出，由後續小組接手
   // 有前進指揮所在下方（有備用瓶或充填區）：只需撐到前進指揮所，在那裡換瓶後續行搬運
   const fw=tacFwdOK(B)&&q.f>B.fwd.f&&(B.fwd.stock>0||B.st.air);
   const need=(fw?tacPath(B,q.f,q.c,B.fwd.f,tacNearStair(B,B.fwd.f,0)).length:tacPath(B,q.f,q.c,-1,0).length)*2.6*1.3/TAC_AIR+.05;   // 搬運較慢、耗氣較多，留 30% 餘裕
   if(q.air<need){q.prev=null;q.task='exit';q.tf=-1;q.tc=0;
    radio(inc,q.cs,tacNm(B,q.f,q.c)+'發現受困者 '+cl.vic+' 名，本組氣量不足以搬運，回報位置撤出，請後續小組接手。');return}}
  if(cl.vic>0){const take=Math.min(cl.vic,q.n>=4?2:1);cl.vic-=take;q.carry=take;q.cvh=cl.vh;q.task='carry';q.tf=-1;q.tc=0;
   radio(inc,q.cs,tacNm(B,q.f,q.c)+'發現受困者 '+take+' 名，搬運撤出。');q.sayT=0;tacSay(q,'found');tacEvt(inc,B,'victim',tacNm(B,q.f,q.c)+'發現受困者 '+take+' 名（'+q.cs+'）');return}
  // 本室無人：往同層下一個還沒做到這一級的房間
  const lv=k==='search'?1:2;
  const best=tacNear(B,q.f,q.c,x=>x.ty==='room'&&x.sl<lv&&x.h<tacHotLim(q)&&!B.sq.some(y=>y!==q&&y.task===k&&y.tf===q.f&&y.tc===x.c));
  if(best!==null)q.tc=best;else{q.task='idle';radio(inc,q.cs,tacFlr(B,q.f)+(k==='search'?' 初期搜索完成。':' 次級搜索完成，本層確認淨空。'))}
  return}
 if(k==='guard'){ // 防護射水：守住這個空間不讓火延燒進來
  if(q.line&&eff>0&&q.pf>0){cl.wet=1;cl.h=Math.max(0,cl.h-dt*.03*eff*q.pf);if(cl.h<.02)cl.h=0}
  // 室外：同時濕潤相鄰建物的外牆（一線可兼顧相鄰兩棟）
  if(B.out&&q.line&&eff>0&&q.pf>0)for(const o of B.L.N[q.c].wl.concat(B.L.N[q.c].nb))if(B.L.N[o].walled)tacCel(B,q.f,o).wet=1;
  return}
 if(k==='confine'){ // 侷限火勢：帶水線在火點附近，對本室與相鄰房間射水降溫、濕潤，阻止延燒過來
  if(q.line&&eff>0&&q.pf>0){const pw=.035*eff*q.pf*(q.n/3)*cmd;cl.wet=1;cl.h=Math.max(0,cl.h-dt*pw*1.5);if(cl.h<.02)cl.h=0;
   const nd=B.L.N[q.c];for(const o of nd.nb.concat(nd.wl)){const y=tacCel(B,q.f,o);if(y.ty==='stair')continue;y.wet=1;if(y.h>0)y.h=Math.max(0,y.h-dt*pw);if(y.pre)y.pre=Math.max(0,y.pre-dt*.01)}}
  return}
 if(k==='hydro'){ // 水霧排煙：先開窗，再用水霧把煙從窗口帶出去
  if(!cl.v){q.wk+=dt;if(q.wk>=3){q.wk=0;tacOpenWin(inc,B,cl,q.cs);radio(inc,q.cs,tacNm(B,q.f,q.c)+'開窗完成，水霧排煙。')}return}
  if(q.line&&eff>0&&q.pf>0){cl.s=Math.max(0,cl.s-dt*.45*q.pf);cl.wet=1;
   for(const o of B.L.N[q.c].nb)if(!tacShut(B,q.f,q.c,o)){const y=tacCel(B,q.f,o);y.s=Math.max(0,y.s-dt*.12*q.pf)}}
  if(cl.s<.05&&B.L.N[q.c].nb.every(o=>tacShut(B,q.f,q.c,o)||tacCel(B,q.f,o).s<.15)){q.task='hold';radio(inc,q.cs,tacNm(B,q.f,q.c)+'一帶濃煙已排除。')}
  return}
 if(k==='vent'){q.wk+=dt;if(q.wk>=(q.ty==='vent'?2:4)){q.wk=0;tacOpenWin(inc,B,cl,q.cs);q.task='idle';
  radio(inc,q.cs,tacNm(B,q.f,q.c)+'破窗完成，開口建立。')}return}
 if(k==='roofres'){
  q.wk+=dt;if(q.wk<5)return;q.wk=0;
  if(!B.roofS){B.roofS=1;radio(inc,q.cs,'已登上屋頂，'+(B.roofV?'發現避難民眾 '+B.roofV+' 名。':'屋頂無人。'))}
  if(B.roofV>0){const take=Math.min(B.roofV,q.n>=4?2:1);B.roofV-=take;q.carry=take;q.cvh=B.roofH;q.task='carry';q.tf=-1;q.tc=0;
   radio(inc,q.cs,'自屋頂帶領民眾 '+take+' 名經樓梯下樓。')}
  else q.task='idle';
  return}
 if(k==='roof'){q.wk+=dt;if(q.wk>=4){q.wk=0;B.roof=1;q.task='idle';radio(inc,q.cs,'頂樓屋頂排煙口已開啟。')}return}
 if(k==='ritgo'){
  const dn=B.sq.find(x=>x.u===q.resc);
  if(!dn||!dn.down||dn.gone){q.task='rit';q.tf=-1;q.tc=0;return}
  if(dn.f!==q.f||dn.c!==q.c){q.tf=dn.f;q.tc=dn.c;return}
  q.wk+=dt;
  if(q.wk>=4){q.wk=0;dn.down=0;dn.hp=Math.max(dn.hp,.5);dn.air=Math.max(dn.air,.7);dn.low=1;
   B.mayday=Math.max(0,B.mayday-1);dn.task='exit';dn.tf=-1;dn.tc=0;dn.prev=null;
   q.task='exit';q.tf=-1;q.tc=0;q.prev={task:'rit',tf:-1,tc:0};
   radio(inc,q.cs,'RIT 已接觸 '+dn.cs+'，更換備用氣瓶，協同撤出。')}
  return}}
function tacOutside(inc,B,q){
 q.mk=0;q.mkT=0;
 if(q.carry){for(let i=0;i<q.carry;i++)tacPatient(inc,B,q.cvh===undefined?.7:q.cvh,q.cs);
  q.carry=0;q.task='idle';
  if(!q.low){q.prev=null}}
 else if(q.task==='exit'){q.task=q.prev&&q.prev.task==='rit'?'rit':'idle';if(q.task==='rit')q.prev=null}
 if(q.inj&&!q.down){const u=S.units.find(x=>x.id===q.u);
  radio(inc,q.cs,'受傷隊員已撤出送醫，本車人力不足，報停返隊。');tacEvt(inc,B,'warn',q.cs+' 隊員受傷送醫，報停');
  if(u){u.inc=null;crewDown(u);home(u);u.oosAfter=180}q.gone=1}}
// 火煙動態：成長、延燒、閃燃、煙層流動、排煙、受困者存活
function tacFire(inc,B,dt){
 const W=B.W,F=B.F,R=B.R,dh=new Float32Array(B.cells.length);
 tacFDStep(inc,B,dt);
 tacExtFire(inc,B,dt);
 let openings=B.roof;for(const x of B.cells)if(x.v)openings++;
 if(B.ppv&&!openings&&!B.ppvW){B.ppvW=1;radio(inc,'安全官','正壓排煙中但建物沒有排煙開口，請先建立出風口！')}
 // 負壓排煙與門控的位置（每幀由小組狀態算出）
 const npv=new Set(),dcN=new Set(),dcS=new Set();
 for(const q of B.sq){if(q.down||q.mt)continue;
  if(q.task==='npv'&&q.f===q.tf&&q.c===q.tc&&tacIn(q))npv.add(q.f*W+q.c);
  if(q.task==='dctrl'){if(tacIn(q)&&q.f===q.tf&&q.c===q.tc)dcN.add(q.f*W+q.c);else if(!tacIn(q)&&q.side===q.dside)dcS.add(q.dside)}}
 B.npvS=npv;B.dcS=dcS;B.dcN=dcN;
 // 入口最近 20 秒有人進出、又沒有門控：形成進氣路徑，助長地面附近的火勢
 const flow=Object.keys(B.eo).some(s=>S.t-B.eo[s]<20&&!dcS.has(s));
 B.flow=flow;
 for(const x of B.cells){
  // 含氧量：火燒與濃煙消耗，開口越多回復越快（8% 以下幾乎無法燃燒）
  const op=x.v||x.vv||npv.has(x.f*W+x.c);
  // 門窗都關著的空間（密閉）：氧氣耗得更快，容易形成通風控制的悶燒
  const sealed=!op&&x.ty==='room'&&B.L.N[x.c].nb.every(o=>B.cd.has(tacDK(B,x.f,x.c,o))||B.lk.has(tacDK(B,x.f,x.c,o)));
  const tg=Math.max(8,20.9-(sealed?x.h*10+x.s*8:(x.h*7+x.s*7)*(op?.35:1)));
  x.o2+=(tg-x.o2)*Math.min(1,dt*.3);
  if(x.ty==='stair')continue;
  const nd=B.L.N[x.c];
  // 自動撒水設備：房間溫度升高（h>.25）時撒水頭動作，壓制火勢、阻止經門與外牆延燒；送水口加壓時效果較好；火勢過猛（閃燃後）只能減緩
  if(B.spk&&B.spk.ok&&x.ty==='room'&&x.f>=B.bf&&x.h>.25&&x.fu>0){
   if(!x.spkOn){x.spkOn=1;if(!B.spk.fl[x.f]){B.spk.fl[x.f]=1;radio(inc,'受理','火警受信總機顯示'+tacFlr(B,x.f)+'撒水頭動作。');tacEvt(inc,B,'milestone',tacFlr(B,x.f)+'撒水頭動作')}}
   // 撒水是「控制」：把火壓在約三成並阻止延燒，仍需小組進入撲滅；煙照樣會累積
   x.wet=1;if(x.h>.32)x.h=Math.max(.32,x.h-dt*(x.h>.85?.004:.01)*(B.sp&&B.sp.on?1.5:1))}
  if(x.h>.2){x.bd=1;x.ovh=0}
  // 窗戶受熱：高溫先龜裂；猛烈燃燒時玻璃偶爾爆裂成開口（自然排煙、也讓火吃到空氣）
  if(x.h>.55&&!x.wcr&&B.L.N[x.c].win&&x.f>=B.bf)x.wcr=1;
  if(x.h>.92&&!x.v&&x.wcr&&B.L.N[x.c].win&&x.f>=B.bf&&Math.random()<dt*.01){x.v=1;radio(inc,'安全官',tacNm(B,x.f,x.c)+'窗戶受熱爆裂，濃煙火舌竄出窗外！')}
  if(x.fu>0&&x.h>.02){
   let ox=.45+.55*x.v+(x.v&&B.ppvS&&B.ppvS.has(x.f*W+x.c)?.6:0)+(x.vv?.2:0)-(x.s>.85&&!x.v?.2:0);
   if(flow&&x.f<=B.bf+1)ox+=.2;
   if(nd.nb.some(o=>dcN.has(x.f*W+o)))ox-=.3;
   ox=Math.max(.05,ox)*Math.max(.15,Math.min(1.1,(x.o2-9)/11));
   // 成長：初期（起火後幾分鐘）較慢，火勢大了才加速
   if(!x.wet)x.h=Math.min(1,x.h+dt*(.0043+.030*x.h*(1-x.h*.5))*ox*B.fk*x.fk*(x.dw?.35:1));
   x.fu=Math.max(0,x.fu-dt*x.h*.0028*(x.gr?4:1))}
  else if(x.fu<=0)x.h=Math.max(0,x.h-dt*.02);
  x.s=Math.min(1,x.s+dt*x.h*.09);
  if(!x.fl&&!x.vv&&x.h>.82&&x.s>.7&&!x.wet){x.fl=1;x.h=1;
   radio(inc,'安全官',tacNm(B,x.f,x.c)+'發生閃燃！');
   const crew=B.sq.some(q=>q.f===x.f&&q.c===x.c&&!q.down);if(crew)B.foN=(B.foN||0)+1;
   tacEvt(inc,B,'danger',tacNm(B,x.f,x.c)+'閃燃'+(crew?'（有小組在內）':''),crew);
   for(const q of B.sq)if(q.f===x.f&&q.c===x.c&&q.ty!=='robot'&&!q.down){q.hp=Math.max(.2,q.hp-.4);if(q.hp<.3)tacDown(inc,B,q,'遭遇閃燃')}}
  if(x.fl&&x.h<.25)x.fl=0;
  // 挑空：熱氣經電扶梯開口直接往上層竄
  if(nd.atr&&x.f+1<F&&x.h>.3)dh[(x.f+1)*W+x.c]+=dt*.01*(x.h-.3);
  if(x.h>.45&&!x.wet){
   // 經門延燒較快、隔牆較慢；有窗的房間經外牆往上層延燒（開窗更快）
   for(const cc of tacNb(B,x.f,x.c)){const nb=B.cells[x.f*W+cc];if(nb.fu<=0)continue;const sh=tacShut(B,x.f,x.c,cc);
    dh[x.f*W+cc]+=dt*(sh?.0013:.0068)*(x.h-.45)*(nb.wet?.2:1)*(B.wind?tacWF(B,x.c,cc):1)*(nb.gr?2.5:1);
    // 關著的門持續受熱會被燒穿（約 60 秒，現實約 10 分鐘）
    if(sh&&x.h>.7){const key=tacDK(B,x.f,x.c,cc),bt=B.dbt||(B.dbt={});bt[key]=(bt[key]||0)+dt;
     if(bt[key]>60&&B.cd.has(key)){B.cd.delete(key);radio(inc,'安全官',tacNm(B,x.f,x.c)+'通往'+tacNm(B,x.f,cc)+'的門被燒穿，火勢擴大！')}}}
   for(const cc of nd.wl){if(x.f<B.bf&&nd.nbO&&nd.nbO.includes(cc))continue;const nb=B.cells[x.f*W+cc];if(nb.fu>0)dh[x.f*W+cc]+=dt*(B.thin?.01:.003)*(B.out&&B.L.N[cc].walled?.45:1)*(x.h-.4)*(nb.wet?.2:1)}
   // 往上層：主要經外牆窗口（開窗更快）；樓板延燒很慢
   if(x.f+1<F){const up=B.cells[(x.f+1)*W+x.c];if(up.fu>0)dh[(x.f+1)*W+x.c]+=dt*(nd.win&&x.f>=B.bf?.004:x.f<B.bf?.0008:.0015)*(x.h-.5)*(1+x.v*2)}}}
 for(let i=0;i<dh.length;i++)if(dh[i]>0){const x=B.cells[i];
  // 室外有牆的建物：外牆受熱要累積到一定程度才會起燃（周界防護射水會讓預熱下降）
  // 未起火的格子要先累積受熱才會起燃（室外有牆的建物門檻更高，周界防護射水會讓預熱下降）
  if(x.h<.02){x.pre=(x.pre||0)+dh[i]*(x.wet?.2:1);if(x.pre<(B.out&&B.L.N[x.c].walled?.08:.05))continue}
  x.h=Math.min(1,Math.max(x.h,.02)+dh[i])}
 for(const x of B.cells)if(x.pre>0&&x.h<.02)x.pre=Math.max(0,x.pre-dt*(x.wet?.01:.0005))
 // 煙：同層經門交換（含樓梯間），樓梯間往上竄
 for(let f=0;f<F;f++)for(const n of B.L.N)for(const cc of tacNb(B,f,n.c)){if(cc<n.c)continue;
  const a=B.cells[f*W+n.c],b=B.cells[f*W+cc],m=(a.s-b.s)*dt*(tacShut(B,f,n.c,cc)?.04:.25);a.s-=m;b.s+=m}
 for(const n of B.L.N)if(n.ty==='stair'||n.atr)for(let f=0;f<F-1;f++){const a=B.cells[f*W+n.c],b=B.cells[(f+1)*W+n.c],m=a.s*dt*(n.atr?.3:.2)*(1-b.s);a.s-=m;b.s+=m}
 B.ppvT=(B.ppvT||0)-dt;if(B.ppvT<=0){B.ppvT=1;B.ppvS=tacPpvSet(B)}
 const pset=B.ppvS||new Set();
 for(const x of B.cells){
  let out=.004;
  const onP=pset.has(x.f*W+x.c);
  if(x.v)out+=.1+(onP?.18:0);
  if(onP)out+=.08;
  if(x.ty==='stair'&&x.f===F-1&&B.roof)out+=.25;
  if(x.vv)out+=.3;
  if(npv.has(x.f*W+x.c))out+=.35;
  else if(B.L.N[x.c].nb.some(o=>npv.has(x.f*W+o)&&!tacShut(B,x.f,x.c,o)))out+=.1;
  // 餘燼：燒過、撲滅後還有可燃物，沒做殘火處理就留著；沒人在場時偶爾復燃
  if(x.ty==='room'){
   if(x.bd&&x.h<.02&&x.fu>.1&&!x.ovh&&!x.emb){x.emb=1;x.embT=x.li?420:x.deep?300:x.gr?30:150}
   // 餘燼約 150 秒後自然熄滅；在那之前沒人在場時偶爾復燃
   if(x.emb&&(x.embT-=dt)<=0){x.emb=0;x.ovh=1}
   if(x.emb&&x.h<.02&&!B.sq.some(q=>q.f===x.f&&q.c===x.c)&&Math.random()<dt*(x.li?.012:x.deep?.005:.0015)){x.h=x.li?.3:.15;x.emb=0;x.dw=0;
    radio(inc,'安全官',tacNm(B,x.f,x.c)+(x.li?'鋰電池熱失控復燃！需持續大量灌水冷卻。':'殘火復燃！請派員殘火處理。'));B.rkN=(B.rkN||0)+1;tacEvt(inc,B,'warn',tacNm(B,x.f,x.c)+'殘火復燃')}}
  x.s=Math.max(0,Math.min(1,x.s-dt*out*Math.max(.3,x.s)*2));
  if(x.vic>0){x.vh-=dt*(x.s*.005+Math.max(0,x.h-.35)*.03);
   if(x.vh<=0){B.lost+=x.vic;S.rep-=3*x.vic;radio(inc,'受理',tacNm(B,x.f,x.c)+'受困者 '+x.vic+' 名罹難（評鑑 -'+(3*x.vic)+'）。');
    x.vic=0;if(S.rep<=0){S.rep=0;S.over=true}}}}}
// 水線分配：依下令先後，最多 effLines 條
function tacCap(inc){
 if(!waterOK(inc))return 0;
 const tp=tankPool(inc);
 return Math.max(0,Math.min(pumpsOn(inc)*2,Math.max(1,Math.floor((inflowOf(inc)+(tp[0]>tp[1]*.3?LPS:0))/LPS)))-(inc.burst>0?1:0))}
// 消防栓那側沒有幫浦車佔水：只能用車上水箱（水箱剩不多時只剩一線，用完就沒水）
function tacCapAll(inc,B){
 let L=tacCap(inc);
 // 建物防護：水庫車接力供水，至少可出 2 線
 if(B.wui)return Math.max(L,Math.min(2,B.sq.filter(q=>q.ty==='pump').length));
 if(!tacHydOK(inc,B)){const tp=tankPool(inc);L=Math.min(L,tp[0]>tp[1]*.15?1:0)}
 return L}
function tacLines(inc,B,dt){
 const L=tacCapAll(inc,B);
 if(B.hyd&&!tacHydOK(inc,B)&&!B.hydW&&B.sq.some(q=>q.ty==='pump')){B.hydW=1;
  radio(inc,'受理','消防栓在'+TAC_SDN[B.hyd.side]+'側，該側沒有幫浦車佔水，目前只能用車上水箱，請移車佔水。')}
 if(tacHydOK(inc,B))B.hydW=0;
 const want=B.sq.filter(q=>TAC_WET[q.task]&&!q.down).sort((a,b)=>a.lt-b.lt);
 for(const q of B.sq){q.line=0;if(q.burst>0)q.burst-=dt}
 let n=0,spN=0;
 for(const q of want){
  if(n>=L||(TAC_WET2[q.task]&&n+2>L))break;
  if(q.task==='sky'){if(q.tmv||q.tside!==q.ws)continue;q.src='pump';q.len=0;q.pf=1;q.lu=q.u;q.lent=null;q.line=1;n+=2;continue}
  if(q.task==='trans'){if(q.side!==q.ws)continue;q.src='pump';q.len=tacOutLen(q.tside,q.ws)+1;q.pf=.95;q.lu=q.u;q.lent=null;q.line=1;n++;continue}
  if(q.task==='cover'){if(q.tmv)continue;q.src='pump';q.len=4;q.pf=.9;q.lu=q.u;q.lent=null;q.line=1;n++;continue}
  if(q.ty==='ladder'){ // 雲梯射水由同側幫浦車供水，沒有則壓力不足
   if(q.lside===undefined)continue;
   q.src='pump';q.len=3;q.pf=B.sq.some(x=>x.ty==='pump'&&x.tside===q.tside&&!x.tmv)?.9:.5;q.line=1;n++;continue}
  // 水線跟著小組：以目前位置計算；還在屋外時以目標計算
  const f=q.f>=0?q.f:q.tf,c=q.f>=0?q.c:q.tc;if(f<0)continue;
  const ln=tacLineTo(B,q,f,c);
  if(!ln||(ln.src==='sp'&&spN>=TAC_SPMAX)){q.pf=0;q.src=null;continue}
  if(ln.src==='sp')spN++;
  q.line=1;n+=TAC_WET2[q.task]?2:1;q.src=ln.src;q.len=ln.len;q.pf=ln.pf;q.lent=ln.ent;q.lu=ln.u;
  // 經過高溫空間的水帶可能燒破
  if(ln.src==='pump'&&q.f>=0&&!q.burst){
   const path=tacPath(B,tacEF(B,ln.ent),ln.ent.c,q.f,q.c);
   if(path.some(p=>tacCel(B,p[0],p[1]).h>.7)&&Math.random()<dt*.025){q.burst=8;
    radio(inc,q.cs,'水帶遭高溫燒破，出水中斷，更換水帶中。')}}
  if(q.burst>0)q.pf=0}
 inc.lines=Math.max(1,n); // 用水量依實際出水線數計算
 return L}
// 戰術 AI：分成可個別啟用的模組。AI 指揮時全部啟用；玩家指揮時只啟用已指派職務對應的模組
// M：{safety, water, search, ems, attack, ladder, stn}
function tacAI(inc,B,dt,M){
 B.aiT-=dt;if(B.aiT>0)return;B.aiT=1.5;
 const free=B.sq.filter(q=>!q.down&&!q.tmv&&!q.wd&&(q.task==='idle'||q.task==='hold')&&!q.prev&&(q.ty==='ladder'||q.ty==='robot'||q.air>(tacIn(q)?.45:.6)));
 const take=q=>{const i=free.indexOf(q);if(i>=0)free.splice(i,1)};
 const burning=B.cells.filter(x=>x.ty!=='stair'&&x.h>.05).sort((a,b)=>a.f-b.f||b.h-a.h);
 // 站點（AI 指揮）：指揮站、氣瓶充填區、後勤照護區、聯訪處、集結區
 if(M.stn){
  if(!B.st.icp)tacStnOpen(inc,B,'icp',1);
  // 沒有救助器材車就無法開設氣瓶充填區：有人開始用備用瓶時請求一輛救助車（只請求一次）
  if(!B.st.air&&!B.req71&&!onScene(inc).some(u=>u.code==='71')&&B.sq.some(q=>q.cyl<2||q.refill==='none')){B.req71=1;tacReinf(inc,B,'resc')}
  if(!B.st.media&&B.vtot&&B.st.icp)tacStnOpen(inc,B,'media',1);
  if(!B.st.stage&&B.st.icp)tacStnOpen(inc,B,'stage',1);
  if(!B.st.rehab&&B.sq.length>=6&&tacAmbFree(inc,B)>=2)tacStnOpen(inc,B,'rehab',1);
  for(const q of free.slice())if(q.task==='station')take(q)}
 // 救護：檢傷站、醫療站、請求救護車
 if(M.ems){
  if(!B.st.triage&&B.pts.length>=2&&tacAmbFree(inc,B)>=2)tacStnOpen(inc,B,'triage',1);
  if(!B.st.treat&&B.pts.some(p=>p.sev==='red')&&B.pts.length>=2)tacStnOpen(inc,B,'treat',1);
  if(B.pts.length>tacAmbFree(inc,B)&&B.ambT<=0&&!inc.req)tacAmbReq(inc,B,1)}
 // 高樓（AI）：前進指揮所、消防專用升降機
 // 屋頂光電板起火：通報台電斷電（斷電前雲梯只能水霧遠距射水）
 if((M.stn||M.water)&&B.rf&&B.rf.h>0&&inc.pow===0){inc.pow=1;inc.powT=30+Math.random()*30;radio(inc,'受理','現場請求通報台電斷電，預估 '+Math.ceil(inc.powT)+' 秒完成。')}
 // 指揮站開設後指派安全官（入口設人員管制板）
 if(M.stn&&B.st.icp&&!B.role.safety&&Object.values(B.role).filter(Boolean).length<tacRoleSlots(inc,B))tacRoleSet(inc,B,'safety',1);
 // A 級化學品但 A 級防護衣不足 2 套：請求增派化災車
 if(M.stn&&B.chem&&B.chem.lv>=3&&!B.chem.fuel&&tacPPECap(inc).A<2&&!B.hzReq){B.hzReq=1;tacReinf(inc,B,'hazmat')}
 // 高樓：起火層在 3F 以上，或火在低樓層但上方樓層還要搜索時，開設前進指揮所
 const upS=B.F-B.bf>=5&&B.cells.some(x=>x.f-B.bf>=3&&x.ty==='room'&&(x.sl<2||x.vic>0));
 if(M.stn&&B.F-B.bf>=5&&(B.of-B.bf>=3||B.of<B.bf||upS)){
  if(!B.st.fwd&&B.st.icp&&(B.of-B.bf>=3||upS))tacStnOpen(inc,B,'fwd',1);
  if(B.elev&&!B.elOn&&!(B.elT>0)){B.elT=10;radio(inc,'受理','消防專用升降機切換消防模式中。')}}
 // 安全：結構嚴重受損，撤出起火樓層以上的小組
 if(M.safety&&B.dmg>=.8&&!B.evacS){B.evacS=1;
  for(const q of B.sq)if(tacIn(q)&&!q.down&&q.task!=='carry'&&q.task!=='ritgo'&&q.task!=='station'){q.prev=null;q.task='exit';q.tf=-1;q.tc=0}
  radio(inc,'安全官','結構有坍塌危險，入室小組全部撤出，改採外部防禦！')}
 // 安全：RIT、MAYDAY、閃燃前兆撤出
 if(M.safety){
  // 發現悶燒缺氧（門縫冒黑煙、煙往內吸）的空間：ROE 改為門控進入
  if((B.roe||'force')==='force'&&!B.roeSet&&((B.T&&B.T.away)||B.cells.some(x=>tacVL(x)&&(x.dcw||x.srch>=1||x.rep)))){B.roeSet=1;B.roe='dctrl';radio(inc,'安全官','發現悶燒缺氧的空間，各組改採門控進入，開門前先射水降溫，避免爆燃！')}
  if(!B.sq.some(q=>q.task==='rit'||q.task==='ritgo')&&B.sq.length>=3){
   // 侷限空間：救助組要下人孔救人，RIT 改由其他小組編成
   const pit=B.sc&&B.sc.k==='pit',r=(pit?null:free.find(q=>q.ty==='resc'&&!tacIn(q)))||free.find(q=>q.ty==='pump'&&!tacIn(q)&&!q.line);
   if(r){tacOrder(inc,r,'rit',-1,0,1);radio(inc,r.cs,'奉安全官指派編成 RIT，於入口待命。');take(r)}}
  if(B.mayday&&!B.sq.some(q=>q.task==='ritgo')){
   const dn=B.sq.find(q=>q.down);
   const r=dn&&B.sq.filter(q=>!q.down&&q.ty!=='ladder'&&q.ty!=='robot'&&q.air>.45&&q.task!=='carry'&&q.task!=='station')
    .sort((a,b)=>(Math.abs(a.f-dn.f)+Math.abs(a.c-dn.c))-(Math.abs(b.f-dn.f)+Math.abs(b.c-dn.c)))[0];
   if(r){tacOrder(inc,r,'rit',-1,0,1);radio(inc,r.cs,'轉任 RIT，前往救援 '+dn.cs+'。');take(r)}}
  for(const q of B.sq){if(!tacIn(q)||q.down||q.ty==='robot'||q.task==='exit'||q.task==='carry'||q.task==='ritgo')continue;
   const x=tacCel(B,q.f,q.c),prot=q.task==='attack'&&q.line&&q.pf>.3&&q.f===q.tf&&q.c===q.tc;
   // 化學品濃度超過防護等級：撤出
   if((x.hz||0)>TAC_PPE[q.ppe||'F'].p&&q.task!=='exit'){q.prev=null;q.task='exit';q.tf=-1;q.tc=0;radio(inc,'安全官',tacNm(B,q.f,q.c)+'化學品濃度超過'+q.cs+'的防護等級，立即撤出！');continue}
   // 地下室熱煙排不出去，閃燃前兆的門檻較低
   const ub=q.f<B.bf?.12:0;
   if(!prot&&!x.fl&&x.h>.7-ub&&x.s>.6-ub){q.prev=null;q.task='exit';q.tf=-1;q.tc=0;radio(inc,'安全官',tacNm(B,q.f,q.c)+'出現閃燃前兆（煙層下降、溫度急升），'+q.cs+' 立即撤出！')}}}
 // 水源：佔水、送水口、鄰棟防護
 let spare=tacCapAll(inc,B)-B.sq.filter(q=>q.line).length;
 if(M.water){
  if(!tacHydOK(inc,B)&&!B.sq.some(q=>q.tmv&&q.tgt===B.hyd.side)){
   const p=free.find(q=>q.ty==='pump'&&!tacIn(q)&&!tacCanSide(B,q,B.hyd.side));
   if(p&&tacTruck(inc,B,p,B.hyd.side)){take(p);radio(inc,p.cs,'前往'+TAC_SDN[B.hyd.side]+'側消防栓佔水。')}}
  if(B.sp&&!B.sp.on&&B.of-B.bf>=2&&!B.sq.some(q=>q.task==='stand')){
   const p=free.find(q=>q.ty==='pump'&&!tacIn(q)&&!tacCan(B,q,'stand',-1,0));
   if(p&&tacOrder(inc,p,'stand',-1,0,1)){take(p);radio(inc,p.cs,'前往'+TAC_SDN[B.sp.side]+'側送水口加壓。')}}
  for(const sd of Object.keys(B.exp)){
   if(B.exp[sd]<.35||B.expL[sd]||spare<=0||B.sq.some(q=>q.task==='cover'&&q.cside===sd))continue;
   const p=free.find(q=>q.ty==='pump'&&!tacIn(q)&&!q.line);
   if(p&&tacOrder(inc,p,'cover',-1,0,1,sd)){take(p);spare--}}}
 if(M.attack&&B.wild)tacWildAI(inc,B,free,take,spare);
 // 化災（AI）：開設除污站；化災應變隊或化災組換上足夠的防護後辨識、止漏；油料外洩由幫浦組關閉遮斷止漏
 if(M.attack&&B.chem){
  if(!B.chem.fuel&&B.sq.some(q=>q.cont)&&!B.st.decon)tacStnOpen(inc,B,'decon',1);
  if(!B.chem.fuel&&!inc.epa&&EPA_K(inc.k))epaCall(inc,1);
  const lk=B.leak,rk={F:0,C:1,B:2,A:3};
  if(B.chem.fuel||B.chem.util){if(lk&&lk.on&&!lk.np&&!B.sq.some(y=>y.task==='plug')){const r=free.find(q=>(q.ty==='pump'||q.ty==='resc'||q.ty==='hazmat'||q.ty==='vent')&&!tacIn(q)&&!q.line);
    if(r&&tacOrder(inc,r,'plug',lk.f,lk.c,1)){take(r);radio(inc,r.cs,'前往'+tacNm(B,lk.f,lk.c)+(B.chem.fuel?'關閉緊急遮斷閥止漏。':'關斷氣源。'))}}}
  else{const who=free.find(q=>q.epa)||free.find(q=>q.ty==='hazmat'&&!tacIn(q));
   if(who&&lk&&(!B.chemK||lk.on)){const need=B.chemK?['','C','B','A'][B.chem.lv]:'A';
    if(rk[who.ppe||'F']<rk[need]){if(tacPPE(inc,B,who,need,1))take(who)}
    else if(tacOrder(inc,who,B.chemK?'plug':'ident',lk.f,lk.c,1))take(who)}}}
 // 氣體偵測（AI）：悶燒、鋰電池、瓦斯外洩、住警器等案件，先派一組到起火點量測
 tacScAI(inc,B,free,take,M);
 if(M.stn)tacSysAI(inc,B);
 if(M.attack||M.safety)tacBvAI(inc,B,free,take);
 if(M.attack&&!B.aiGas&&(B.T.away||B.T.li||B.T.smk||B.T.elder||B.gasL||B.k==='chemfire'||(B.sc&&B.chem&&B.chem.util))){
  const r=free.find(q=>(q.ty==='resc'||q.ty==='vent')&&!tacIn(q))||free.find(q=>q.ty==='pump'&&!tacIn(q)&&!q.line);
  if(r&&tacOrder(inc,r,'gas',B.of,B.oc,1)){B.aiGas=1;take(r);radio(inc,r.cs,'攜五用氣體偵測器前往'+tacNm(B,B.of,B.oc)+'量測。')}}
 // 進入（AI）：入口都上鎖時先派救助組破壞；人手夠時派一組門控主入口
 if(M.attack){
  if(B.ents.length&&B.ents.every(e=>e.lock)&&!B.sq.some(y=>y.task==='force')){
   const r=free.find(q=>q.ty==='resc'&&!tacIn(q))||free.find(q=>q.ty!=='ladder'&&q.ty!=='robot'&&!tacIn(q)&&!q.line);
   const e=r&&B.ents.slice().sort((a,b)=>tacWalk(r.side,a.side)-tacWalk(r.side,b.side))[0];
   if(r&&e&&tacOrder(inc,r,'force',-1,0,1,e.side))take(r)}
  if(B.sq.length>=6&&!B.sq.some(y=>y.task==='dctrl')&&burning.length){
   const e=B.ents.find(x=>x.side===B.arr)||B.ents[0],r=free.find(q=>(q.ty==='resc'||q.ty==='vent')&&!tacIn(q));
   if(r&&e&&tacOrder(inc,r,'dctrl',-1,0,1,e.side)){take(r);radio(inc,r.cs,'於'+TAC_SDN[e.side]+'側入口門控，控制進氣。')}}}
 // 進入建物前先編成 RIT（2 進 2 出）；人手不足時最多等 45 秒，已知有受困者時立即進入
 const entryOK=B.sq.some(q=>q.task==='rit'||q.task==='ritgo')||S.t-B.t0>45||B.cells.some(x=>x.vic>0&&(x.rep||x.rub||x.srch>=1))||!M.safety;
 // 兩座樓梯（AI）：離火點較遠的一座為避難梯，派員關上起火層與上一層避難梯的防火門
 if(M.attack&&B.fd&&B.of>=B.bf){const st=B.L.N.filter(n=>n.ty==='stair');
  if(st.length>1){if(B.evS===undefined)B.evS=st.slice().sort((a,b)=>tacGd(B,b.c,B.oc)-tacGd(B,a.c,B.oc))[0].c;
   for(const f of[B.of,B.of+1]){if(f>=B.F||(B.evC&&B.evC[f]))continue;
    const bad=[...B.fd.values()].some(d=>d.f===f&&d.s===B.evS&&d.t!=='auto'&&d.t!=='gone');if(!bad)continue;
    const r=free.find(q=>(q.ty==='resc'||q.ty==='vent'||q.ty==='hazmat')&&!q.line);
    if(r&&tacOrder(inc,r,'dctrl',f,B.evS,1)){(B.evC||(B.evC={}))[f]=1;take(r);radio(inc,r.cs,tacFlr(B,f)+'避難梯防火門關閉，確保避難路線無煙。')}}}}
 for(const q of free.slice()){
  // 殘火處理（AI）：同層沒有火點了，就翻搜有餘燼的房間
  if(M.attack&&q.ty!=='ladder'&&q.ty!=='robot'){
   const em=B.cells.filter(x=>x.emb&&x.h<.05&&!B.sq.some(y=>y!==q&&y.task==='overhaul'&&y.tf===x.f&&y.tc===x.c))
    .sort((a,b)=>Math.abs(a.f-(q.f<0?B.bf:q.f))-Math.abs(b.f-(q.f<0?B.bf:q.f)));
   const fireOnFloor=q.f>=0&&burning.some(x=>x.f===q.f);
   if(em.length&&!fireOnFloor&&(q.ty!=='pump'||!burning.length||q.task==='hold')&&tacOrder(inc,q,'overhaul',em[0].f,em[0].c,1))continue}
  // 救人優先（AI）：已知有受困者（民眾指稱、瓦礫、已發現）而搜救人手不足時，沒分到水線的幫浦組先去救人
  if(M.attack&&M.search&&q.ty==='pump'&&!q.line&&!tacIn(q)&&entryOK){
   const kv=B.cells.filter(x=>(x.vic>0&&(x.srch>=1||x.rep||x.rub))&&x.h<.45&&!B.sq.some(y=>y!==q&&(y.task==='search'||y.task==='search2')&&y.tf===x.f&&y.tc===x.c));
   const nS=B.sq.filter(y=>y.task==='search'||y.task==='carry').length;
   const kt=kv.length&&nS<kv.length+1?kv.slice(0,4).find(t=>tacOrder(inc,q,'search',t.f,t.c,1)):null;
   if(kt){radio(inc,q.cs,'救人優先，前往'+tacNm(B,kt.f,kt.c)+'搜救。');continue}}
  // 攻擊（AI 指揮）
  if(M.attack&&(q.ty==='pump'||q.ty==='robot')&&(spare>0||q.line)&&(entryOK||tacIn(q))){
   // 有受困者的空間優先壓制（先救人：把通往受困者的火打掉）
   const nearV=x=>B.cells.some(y=>y.f===x.f&&y.vic>0&&(y.srch>=1||y.rep||y.rub)&&(y.c===x.c||B.L.N[x.c].nb.includes(y.c)))?0:1;
   const ts=burning.slice().sort((a,b)=>nearV(a)-nearV(b)).filter(x=>!B.sq.some(y=>y!==q&&y.task==='attack'&&y.tf===x.f&&y.tc===x.c)&&!((x.hz||0)>=2&&(q.ppe||'F')==='F'));
   if(q.ty==='pump'&&!tacIn(q)&&!q.line&&ts.length&&!(B.hyd&&q.tside===B.hyd.side&&B.sq.filter(x=>x.ty==='pump'&&x.tside===B.hyd.side).length<2)){
    const t=ts[0],bs=tacBestSide(B,q,t.f,t.c),cur=tacLineTo(B,q,t.f,t.c);
    if(bs&&bs.side!==q.tside&&(!cur||cur.len-bs.len>=3)&&!(cur&&cur.src==='sp')){tacTruck(inc,B,q,bs.side,1);radio(inc,q.cs,'移車至'+TAC_SDN[bs.side]+'側，縮短水帶佈線。');continue}}
   // 地面兩層的猛烈火點：先從窗外過渡射水再入室
   const t0=ts[0];
   // 1F～3F 已全面燃燒、室內沒有小組：先以車頂砲塔快速壓制（占兩條水線）
   if(q.ty==='pump'&&!tacIn(q)&&t0&&t0.h>.75&&spare>=2&&!B.sq.some(y=>y.task==='sky'||(tacIn(y)&&y.f===t0.f))&&!tacCan(B,q,'sky',t0.f,t0.c)&&tacOrder(inc,q,'sky',t0.f,t0.c,1)){
    radio(inc,q.cs,'火勢猛烈，以車頂砲塔對'+tacNm(B,t0.f,t0.c)+'快速壓制。');spare-=2;continue}
   if(q.ty==='pump'&&!tacIn(q)&&t0&&t0.h>.5&&!tacCan(B,q,'trans',t0.f,t0.c)&&!B.sq.some(y=>y.task==='trans')&&tacOrder(inc,q,'trans',t0.f,t0.c,1)){spare--;continue}
   let ok=false;for(const t of ts)if(tacOrder(inc,q,'attack',t.f,t.c,1)){ok=true;break}
   if(ok){if(!q.line)spare--;continue}}
  // 水霧排煙（AI）：守線組所在空間濃煙仍重，又有窗可開
  if(M.attack&&q.task==='hold'&&q.line&&tacIn(q)&&tacCel(B,q.f,q.c).s>.5&&!tacCan(B,q,'hydro',q.f,q.c)&&tacOrder(inc,q,'hydro',q.f,q.c,1))continue;
  // 門控（AI）：水線不夠打所有火點時，派非幫浦組到火點旁的走廊把門關上控住
  if(M.attack&&(q.ty==='resc'||q.ty==='vent')&&spare<=0&&burning.length>B.sq.filter(y=>y.line).length+1){
   const fl=burning[0].f;B.confF=B.confF||{};
   if(!B.confF[fl]){const hn=B.L.N.find(n=>n.ty==='hall'&&n.nb.some(o=>tacCel(B,fl,o).h>.1)&&tacCel(B,fl,n.c).h<.1);
    if(hn&&tacOrder(inc,q,'dctrl',fl,hn.c,1)){B.confF[fl]=1;continue}}}
  // 排煙（AI 指揮）：配合射水破窗、正壓排煙
  if(M.attack&&q.ty==='vent'){
   const atk=B.sq.find(y=>y.task==='attack'&&y.line&&y.f===y.tf&&y.c===y.tc&&tacIn(y)&&y.f>=B.bf);
   if(atk&&B.L.N[atk.c].wins&&!tacCel(B,atk.f,atk.c).v&&tacOrder(inc,q,'vent',atk.f,atk.c,1))continue;
   if(atk&&!B.ppv&&!tacIn(q)&&tacOrder(inc,q,'ppv',-1,0,1))continue;
   // 沒有火的空間濃煙仍重：在有窗的房間負壓排煙
   const sm=B.cells.filter(x=>x.ty==='room'&&x.f>=B.bf&&x.s>.6&&x.h<.1&&B.L.N[x.c].wins&&!B.npvS.has(x.f*B.W+x.c)).sort((a,b)=>b.s-a.s)[0];
   if(!atk&&sm&&tacOrder(inc,q,'npv',sm.f,sm.c,1))continue}
  // 搜索：救助組（AI 指揮時幫浦組與排煙組也會搜）
  if(M.search&&(entryOK||tacIn(q))&&(q.ty==='resc'||(M.attack&&(q.ty==='pump'||q.ty==='vent')))){
   // 屋頂避難民眾：救助組優先，現場沒有救助組時由其他小組上屋頂
   if(B.roofV&&!B.roofS&&!B.sq.some(y=>y.task==='roofres')&&(q.ty==='resc'||!B.sq.some(y=>y.ty==='resc'&&!y.down))&&tacOrder(inc,q,'roofres',B.F-1,0,1))continue;
   if(B.roofS&&B.roofV>0&&!B.sq.some(y=>y.task==='roofres')&&tacOrder(inc,q,'roofres',B.F-1,0,1))continue;
   const un=B.cells.filter(x=>(x.ty==='room'&&x.sl<1||x.vic>0)&&x.h<.45&&!((x.hz||0)>(TAC_PPE[q.ppe||'F'].p))&&!B.sq.some(y=>y!==q&&y.task==='search'&&y.tf===x.f&&y.tc===x.c));
   // 搜索順序：受困通報樓層 → 起火層 → 上一層 → 下一層，再往外擴（上方略優先）
   const pri=x=>(x.vic>0&&x.srch>=1?-30:0)+(x.rep?-15:0)+(x.rub?-12:0)+(x.f===B.hint?-20:0)+Math.abs(x.f-B.of)-(x.f>B.of?.5:0)+tacGd(B,0,x.c)*.1;
   un.sort((a,b)=>pri(a)-pri(b));
   if(un.slice(0,6).some(t=>tacOrder(inc,q,'search',t.f,t.c,1)))continue;
   // 初搜都做完但人數還對不上：次級搜索（起火層與上方優先）
   let found=B.resc+B.lost+B.roofV;for(const x of B.cells)found+=x.vic;for(const y of B.sq)found+=y.carry;
   if(!un.length&&found<B.vtot){
    const s2=B.cells.filter(x=>x.ty==='room'&&x.sl===1&&x.h<.45&&!B.sq.some(y=>y!==q&&y.task==='search2'&&y.tf===x.f&&y.tc===x.c)).sort((a,b)=>pri(a)-pri(b)-((a.ps||0)-(b.ps||0))*6);
    // 次級搜索：初搜時煙最濃的房間最可能漏人，優先複查
    if(s2.slice(0,6).some(t=>tacOrder(inc,q,'search2',t.f,t.c,1)))continue}}
  // 雲梯：窗口救援、屋頂救援（搜救組長或 AI）；屋頂排煙與外部射水（AI）
  if(q.ty==='ladder'&&(M.search||M.attack)){
   const reach=TAC_LADR[q.code]||7;
   if(B.roofV>0&&!B.sq.some(y=>y.task==='roofres'&&y.ty==='ladder')&&tacOrder(inc,q,'roofres',B.F-1,0,1))continue;
   const v=B.cells.find(x=>x.ty==='room'&&x.f>=B.bf&&x.f-B.bf<reach&&x.vic>0&&x.srch>=1);
   if(v&&tacOrder(inc,q,'ladder',v.f,v.c,1))continue;
   if(M.attack){
    const top=tacCel(B,B.F-1,0);
    if(!B.roof&&top.s>.5&&B.F-1-B.bf<reach&&tacOrder(inc,q,'roof',B.F-1,0,1))continue;
    // 屋頂光電板、外牆室外機：雲梯射水
    if(spare>0&&B.rf&&B.rf.h>0&&!B.sq.some(y=>y.task==='master'&&y.lf===B.F-1)){const tr=B.L.N.find(n=>n.ty==='room'&&n.wins&&!tacCan(B,q,'master',B.F-1,n.c));
     if(tr&&tacOrder(inc,q,'master',B.F-1,tr.c,1)){spare--;continue}}
    if(spare>0&&B.ext&&B.ext.h>0&&!B.sq.some(y=>y.task==='master'&&y.lf===B.ext.f)&&tacOrder(inc,q,'master',B.ext.f,B.ext.c,1)){spare--;continue}
    const ex=burning.find(x=>x.ty==='room'&&x.f>=B.bf&&x.f-B.bf<reach&&!B.sq.some(y=>tacIn(y)&&y.f===x.f));
    if(ex&&spare>0&&tacOrder(inc,q,'master',ex.f,ex.c,1)){spare--;continue}}}
  // 室內沒事做：退回屋外待命（AI 指揮）
  if(M.attack&&tacIn(q)&&q.task==='idle')tacOrder(inc,q,'exit',-1,0,1)}}
// 洩漏還在（坑道持續產生的氣體不算）；可燃或有毒氣體還沒通風排除
const tacLeakOn=B=>!!(B.leak&&B.leak.on&&!B.leak.np);
const tacVapLeft=B=>!!(B.chem&&B.chem.vap&&B.cells.some(x=>(x.cz||0)>.1))||!!(B.chk&&tacCel(B,B.chk.f,B.chk.c).sl<1);
// 由 stepIncident 呼叫：取代原本的抽象進度
function tacIncident(inc,dt,first,flow){
 const B=inc.tac;
 if(inc.req){inc.reqT-=dt;if(inc.reqT<=0)answer(inc,false,true)}
 tacSync(inc);
 tacParkStep(inc,B,dt);
 tacCivStep(inc,B);
 const eff=waterOK(inc)?flow:0;
 tacLines(inc,B,dt);
 for(const x of B.cells)x.wet=0;
 for(const q of B.sq)tacSquad(inc,B,q,dt,eff);
 B.sq=B.sq.filter(q=>!q.gone);
 tacFire(inc,B,dt);
 tacChemStep(inc,B,dt);
 tacScStep(inc,B,dt);
 tacSysStep(inc,B,dt);tacBvStep(inc,B,dt);tacTrafStep(inc,B,dt);
 tacStaff(inc,B,dt);
 tacYardStep(inc,B,dt);
 tacExpo(inc,B,dt);
 tacGas(inc,B);
 tacStruct(inc,B,dt);
 tacElevStep(inc,B,dt);
 if(B.sq.some(q=>q.line&&q.pf>0&&!(q.burst>0)&&q.task!=='cover')&&B.tWater===undefined){B.tWater=S.t-B.t0;tacOnce(inc,B,'water','首線出水')}
 // AI 指揮時，到場就把現場民眾問一輪
 if(!(TAC.open&&TAC.id===inc.id)&&tacCivOn(B))for(const a of TAC_ASK)tacAsk(inc,B,a.k);
 tacStnStep(inc,B,dt);
 tacEMS(inc,B,dt);
 // 屋頂避難者：頂樓樓梯間的煙會讓他們慢慢惡化
 if(B.roofV>0){let ts=0;for(const n of B.L.N)if(n.ty==='stair')ts=Math.max(ts,tacCel(B,B.F-1,n.c).s);
  B.roofH-=dt*(ts*.004+.0004);
  if(B.roofH<=0){B.lost+=B.roofV;S.rep-=3*B.roofV;radio(inc,'受理','屋頂避難民眾 '+B.roofV+' 名罹難（評鑑 -'+3*B.roofV+'）。');B.roofV=0}}
 const ply=TAC.open&&TAC.id===inc.id;
 tacAI(inc,B,dt,ply?{safety:B.role.safety,water:B.role.water,search:B.role.search,ems:B.role.ems}:
  {safety:1,water:1,search:1,ems:1,attack:1,stn:1});
 if(B.wui){tacWuiStep(inc,B,dt,first);return}
 // 進度：控火 60%、受困者處置 40%；火全滅、餘燼都處理完、受困者都已處置與後送後 3 秒結案
 let sumH=0,out=true;for(const x of B.cells){sumH+=x.h;if(x.h>=.04)out=false}
 if(B.ext&&B.ext.h>0){sumH+=B.ext.h;out=false}
 if(B.rf&&B.rf.h>0){sumH+=B.rf.h;out=false}
 B.peak=Math.max(B.peak,sumH);
 if(B.peak>0&&sumH<B.peak*.25&&B.tCtrl===undefined&&B.tWater!==undefined){B.tCtrl=S.t-B.t0;tacOnce(inc,B,'ctrl','火勢控制（剩不到四分之一）')}
 if(B.peak>0&&out&&!B.once?.out)tacOnce(inc,B,'out','火勢撲滅');
 let left=B.roofV;for(const x of B.cells)left+=x.vic+x.hid;for(const q of B.sq)left+=q.carry;
 const vd=B.vtot?(B.vtot-left)/B.vtot:1;
 B.p=.6*(1-sumH/Math.max(.001,B.peak))+.4*vd;
 if(B.hoax){const hs=B.cells.filter(x=>x.f===B.hint&&x.ty==='room');const ck=hs.filter(x=>x.sl>=1).length;B.p=ck/Math.max(1,hs.length);
  if(ck<hs.length)out=false}
 // 結案條件：火全滅、受困者都已處置、傷患都已後送（或不治）
 const evac=B.pts.length+onScene(inc).filter(u=>u.load>0).length;
 // 主要目標達成（火已撲滅、受困者與現場傷患都已處置、沒有洩漏）：可交給轄區分隊善後
 B.hOK=!B.hoax&&!B.wui&&B.peak>0&&out&&!left&&!B.pts.length&&!tacLeakOn(B)&&!tacVapLeft(B);
 if(out&&!left&&!evac&&!B.cells.some(x=>x.emb)&&!tacLeakOn(B)&&!tacVapLeft(B)){B.doneT+=dt;
  if(B.doneT>=3&&!B.done){B.done=1;
   B.burnt=B.cells.filter(x=>x.ty==='room'&&x.fu<.3).length;
   const half=B.burnt>B.R*B.F*.5;
   if(half&&!inc.train){S.rep-=5;if(S.rep<=0){S.rep=0;S.over=true}}
   if(B.hoax)radio(inc,first?first.cs:'現場',tacFlr(B,B.hint)+' 各戶查證完畢，查無火煙與傷患，'+(inc.pm.mal?'研判為惡作劇謊報，建議轉報 110 究辦。':'研判為善意誤報。'));
   else radio(inc,first?first.cs:'現場',(half?'建物大部分燒毀，火勢因燃料耗盡熄滅（評鑑 -5）':B.sc&&(!B.peak||B.out)?tacScDone(B):'火勢完全撲滅、殘火處理完成')+'，救出 '+B.resc+' 名、送醫 '+B.tx+' 名'+(B.lost?'、罹難 '+B.lost+' 名':'')+(B.burnt?'，燒毀 '+B.burnt+' 室':'')+'。');
   if(B.st.media)repGain(2);
   // 親自指揮的戰術案件：依結案報告等級累積評鑑
   const rg=B.played&&!inc.train?{S:6,A:4,B:2,C:1}[(B.report0=tacReport(inc,B)).grade]||0:0;
   if(rg){const g=repGain(rg);radio(inc,'受理','戰術指揮成果（'+B.report0.grade+' 級）：評鑑 +'+g.toFixed(1)+'。')}
   if(!B.paid&&!inc.train){B.paid=1;S.money+=B.tx*400;S.score+=B.tx*50+(B.lodd?0:60)}
   tacEvt(inc,B,'milestone','結案');
   B.report=tacReport(inc,B);if(B.played)tacShowRep(B.report)}}
 else B.doneT=0;
 const w=inc.dur*(B.done?1:Math.min(.96,B.p));
 if(w>inc.work)inc.work=w;
 const np=Math.min(inc.phs.length-1,Math.floor(inc.work/inc.dur*inc.phs.length));
 if(np>inc.ph){inc.ph=np;radio(inc,first?first.cs:'現場','進入「'+inc.phs[np]+'」階段。')}
 if(!B.done)inc.left-=dt*(first?.22:1)}
// 外部火源：外牆室外機、屋頂光電板、氣爆後持續供氣的瓦斯管線
function tacExtFire(inc,B,dt){
 const E=B.ext;
 if(E&&E.h>0){const x=tacCel(B,E.f,E.c);
  // 入室攻擊組在起火戶內，可從陽台／窗口直接射水
  for(const q of B.sq)if(q.task==='attack'&&q.line&&q.pf>0&&q.f===E.f&&q.c===E.c&&!q.down){E.h=Math.max(0,E.h-dt*.05*q.pf);if(E.h<=0)radio(inc,q.cs,'由窗口射水，外牆室外機火勢已撲滅。')}
  E.fu=(E.fu===undefined?1:E.fu)-dt*.003*E.h;
  if(E.h>0){E.h=E.fu<=0?Math.max(0,E.h-dt*.02):Math.min(1,E.h+dt*.002);
   if(E.h>.4&&!x.v){x.v=1;radio(inc,'安全官',tacNm(B,E.f,E.c)+'窗戶受熱破裂，室外機火勢燒進室內！')}
   if(x.fu>0)x.h=Math.min(1,Math.max(x.h,.02)+dt*.005*E.h);
   if(E.f+1<B.F){const up=tacCel(B,E.f+1,E.c);if(up.fu>0&&E.h>.3)up.h=Math.min(1,Math.max(up.h,.01)+dt*.003*(E.h-.3))}}}
 const R=B.rf;
 if(R&&R.h>0){R.fu=(R.fu===undefined?1:R.fu)-dt*.0012*R.h;R.h=R.fu<=0?Math.max(0,R.h-dt*.01):Math.min(1,R.h+dt*.0015*(inc.pow>=2?.5:1));
  // 頂樓入室小組帶水線上屋頂射水（帶電時效果有限）
  for(const q of B.sq)if(q.task==='attack'&&q.line&&q.pf>0&&q.f===B.F-1&&!q.down)R.h=Math.max(0,R.h-dt*.012*q.pf*(inc.pow>=2?1:.3));
  for(const x of B.cells)if(x.f===B.F-1&&x.ty==='room'&&x.c%2===0&&x.fu>0&&R.h>.3)x.h=Math.min(1,Math.max(x.h,.01)+dt*.002*(R.h-.3))}
 const G=B.gasL;
 if(G&&G.t>0){G.t-=dt;const x=tacCel(B,B.bf,G.c);
  if(G.t<=0)radio(inc,'受理','欣高瓦斯已關閉管線總閥，起火點失去氣源。');
  else if(x.fu>0)x.h=Math.max(x.h,.32)}}

// ===== 義消 =====
// 中大型火場偶爾有義消徒步到場（人到、不綁車），呼號為轄區與鄰近分隊名加「義」或「義+」。
// 義消能力等同菜鳥、不執行高危險任務；義消+ 受過火場搶救訓練、平時配合出勤，能力接近正職，可入室
function tacVolPlan(inc,B){
 if(B.volQ)return;B.volQ=[];
 if(inc.train){if(inc.train>=1)B.volQ.push({t:S.t+8,cs:'訓中義',sk:'vol',n:3});return}
 const big=(inc.pm&&inc.pm.lvl>=2)||B.F>=4||B.L.N.filter(n=>n.ty==='room').length*B.F>=20;
 if(!big||B.out||B.wui||!KIND[inc.k]||!/火警/.test(KIND[inc.k].cls)||Math.random()>.3)return;
 const r=Math.random(),kinds=r<.4?['vol']:r<.7?['volp']:['vol','volp'];
 const st=SPOT.filter(s=>!/^特|^機場|^局本部/.test(s.n)&&s.p).map(s=>[Math.hypot(s.p[0]-inc.x,s.p[1]-inc.y),s.n]).sort((a,b)=>a[0]-b[0]).slice(0,4).map(x=>x[1]);
 const nG=1+Math.floor(Math.random()*Math.random()*4),used=new Set();
 for(let i=0;i<nG;i++){const sk=kinds[i%kinds.length],nm=st[Math.min(st.length-1,Math.floor(Math.random()*Math.random()*st.length))]+(sk==='vol'?'義':'義+');
  if(used.has(nm))continue;used.add(nm);B.volQ.push({t:S.t+60+Math.random()*240,cs:nm,sk,n:3+(Math.random()<.4?1:0)})}}
function tacVolSync(inc,B){
 tacVolPlan(inc,B);
 for(const v of B.volQ){if(v.on||S.t<v.t)continue;v.on=1;
  B.sq.push({u:'vol:'+v.cs,vol:1,sk:v.sk,cs:v.cs,code:'義',ty:'crew',n:v.n,f:-1,c:0,nf:-1,nc:0,mt:0,tf:-1,tc:0,
   task:'idle',air:1,hp:1,down:0,carry:0,line:0,lt:0,prev:null,resc:null,low:0,ext:0,wk:0,
   tside:B.st&&B.st.stage?B.st.stage.side:B.arr,side:B.st&&B.st.stage?B.st.stage.side:B.arr,tmv:0,pf:0,len:0,src:null,burst:0,ent:null,ws:null,fat:0,cyl:1});
  radio(inc,v.cs,(v.sk==='vol'?'義消':'義消（具火場搶救訓練）')+' '+v.n+' 名徒步到場，向指揮站報到'+(v.sk==='vol'?'，支援外圍與後勤作業。':'，可配合入室作業。'));
  tacEvt(inc,B,'milestone',v.cs+' 到場（'+TAC_SKL[v.sk].n+'）')}}
