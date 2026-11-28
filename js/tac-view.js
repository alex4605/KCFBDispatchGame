// 戰術畫面：樓層平面（俯視）繪製、樓層選擇列、小組卡片、指令列、鍵盤與滑鼠輸入
'use strict';
const tcv=document.getElementById('tcv'),tctx=tcv.getContext('2d');
let tW=800,tH=500,tTopH='',tSideH='',tBotH='';
// 指令列：依類別分組；[代碼, 名稱, 快捷鍵, 說明]
// 說明格式：誰能做｜點哪裡｜做什麼、效果｜注意事項（提示框分行顯示）
const TAC_GRP=[
 ['水線',[['attack','入室攻擊','A','幫浦組、機器人｜點起火的房間或走廊｜帶水線進入火點射水，撲滅後自動往同層最近火點推進，全層熄滅後原地守線｜水帶長度有限，太遠請移車或送水口加壓'],
  ['sky','車頂砲塔','','幫浦組（人員須在車邊）｜點 1F～3F 窗戶面向道路的房間｜必要時先移車到那一側，由車頂砲塔（朝天瞄）經窗口大流量射水，約 14 秒壓制後自動轉入室攻擊｜占兩條水線；室內有小組時會把熱煙蒸汽壓回去'],
  ['trans','過渡射水','E','幫浦組（人員在屋外）｜點 1F、2F 窗戶面向道路的房間｜只能由室外經窗口往室內打：先在窗外射水降溫約 10 秒，再自動轉入室攻擊｜射水會打破窗戶成為開口；打不到的死角仍在燒，要接著入室攻擊'],
  ['cover','周界防護','H','幫浦組｜點鄰棟那一側｜車停在相鄰道路，對鄰棟外牆射水，防止延燒過去；鄰棟降溫後自動停止｜只針對鄰接的建築物（室外場景點要保護的建物）'],
  ['confine','侷限火勢','F','幫浦組｜點火點旁的房間｜持續對本室與相鄰房間射水降溫、濕潤，擋住延燒；火點房間也會慢慢降溫｜降溫只有入室攻擊的約四成，要撲滅請派入室攻擊'],
  ['extg','滅火器','','各組（雲梯組、機器人除外）｜點小型火點（變電箱、車輛初期火災）｜CO₂ 或乾粉滅火器壓制，對帶電的電氣火災有效｜火勢大時效果有限；變電箱斷電後才能射水'],
  ['overhaul','殘火處理','Q','各組（幫浦組較快，機器人除外）｜點有餘燼的房間｜翻開夾層與家具澆熄餘燼，完成後自動往同層下一個有餘燼的房間｜堆積物、倉儲、鋰電池、油品等深層悶燒的空間要帶一條水線（用水量約半條），沒有水線很慢；有餘燼未處理不會結案']]],
 ['進入',[['force','破壞進入','B','各組（機器人除外）｜點道路（入口）、點門或點房間｜破開上鎖的入口、指定的門或本室所有門鎖｜快，但門的開關不受控制，悶燒缺氧的空間容易爆燃'],
  ['dcool','門控冷卻','','幫浦組（帶水線）｜點火點隔壁、以門相連的房間｜站在隔壁（不入室），反覆開門→短促射水→關門，冷卻那個房間的熱煙；冷卻後把門關上守住｜不會撲滅火點，只是臨時壓制、保護所在空間與避難路線；開門瞬間會被熱氣撲到'],
  ['veis','VEIS','','各組（機器人、一般義消除外；2F～9F 限雲梯組）｜點沒起火、有對外窗的房間（1F；有雲梯 2～9F）｜由窗口：破窗（V）→進入（E）→立刻關上房門隔離（I）→快速徹底搜索（S）→由窗口救出受困者｜房門是百葉、玻璃窗或已損壞時隔離效果差；房間溫度升高會中止撤出'],
  ['dctrl','門控進入','K','各組（機器人除外，一般義消不做室內門控）｜點道路（入口）、點門或點房間｜門後有熱或濃煙時，在門口反覆「開門→短促射水冷卻煙層→關門」（每輪約 3 秒），溫度降到可進入才進去攻擊（上鎖會先破壞）；點房間則把通往火點的門關上並守住，阻斷進氣｜較慢，但悶燒空間不易爆燃、受傷較輕；要帶水線才能脈衝射水；百葉門、玻璃窗門、破壞過的門關上也擋不住煙熱']]],
 ['搜救',[['search','初期搜索','S','各組（救助組最快，機器人除外）｜點房間｜快速掃過可能有人的地方，發現受困者就搬運撤出；本室完成後自動往同層下一間｜濃煙中可能漏人'],
  ['search2','次級搜索','D','各組（救助組最快，機器人除外）｜點房間（通常是已初搜的房間）｜徹底翻找，找出初搜遺漏的人；本室完成後自動往同層下一間｜比初搜慢'],
  ['gas','氣體偵測','Y','各組｜點空間｜到點以五用氣體偵測器量測約 5 秒（O₂、LEL、CO、H₂S、HCN）｜結果顯示在空間參數，超標以紅、橘色標示'],
  ['cush','救生氣墊','','各組（人員在屋外、雲梯組與機器人除外）｜立即執行（約 15 秒）｜在受困者正下方架設救生氣墊：墜落時接住（約 7 層以下）｜只用在高空受困、幼童受困陽台外'],
  ['rope','繩索救援','','救助組、特搜｜點懸在外牆的受困者（吊籠、窗外）｜到上一層窗口架設繩索系統垂降，約 20 秒把人拉進窗內再搬運下樓｜雲梯到不了的高度用這個'],
  ['clear','人潮疏導','','各組（雲梯組、機器人除外；警方到場較快）｜點人群太擠的區域｜打開空間、引導人潮離開，人群密度降下來才能進去搜救｜人潮推擠時人群底下的傷患持續惡化'],
  ['stab','車輛穩固','','各組（雲梯組、機器人除外）｜點有人被夾住的事故車｜墊木、支撐、拔鑰匙斷電，約 6 秒｜沒穩固就破壞，車體晃動會讓受困者與隊員受傷'],
  ['extr','破壞救援','','救助組、特搜最快，幫浦組較慢｜點有人被夾住的車輛或倒塌結構｜車輛用油壓剪、擴張器開門掀頂；倒塌結構以氣墊頂升（要先支撐）；進度記在現場，多組同時作業會相加；每次救出 1 名，上長背板搬運｜倒塌結構沒支撐不能頂升；車輛沒穩固、斷電，未爆氣囊可能爆開；受壓超過 90 秒的人釋放前沒醫療處置會擠壓症候群'],
  ['care','醫療處置','','各組（雲梯組、機器人除外；特搜醫療組只在屋外）｜點受困者所在的位置｜在受困者旁頸椎保護、給氧（醫療組可輸液），持續到救出：受困者惡化減緩、危急的慢慢回穩；釋放前有處置可避免擠壓症候群｜會佔住一組人力'],
  ['locate','生命探測','','救助組（音響生命探測器，約 22 秒）、特搜（搜救犬，約 10 秒）｜點瓦礫、倒塌結構、土石｜找出被埋在深處、搜索找不到的受困者｜每處只需探測一次'],
  ['shore','支撐','','救助組、特搜｜點瓦礫空間｜架設支撐（約 20 秒，特搜較快）：防止二次崩塌，瓦礫中搜救加快｜只有瓦礫空間需要'],
  ['roofres','屋頂救援','U','各組（機器人除外；雲梯組直接架梯）｜立即執行，或點畫面上的屋頂｜上屋頂把避難民眾帶下來｜走樓梯的小組每趟帶 1～2 人，人多要再下令；屋頂超出雲梯高度時雲梯組不能執行']]],
 ['排煙',[['vent','破窗排煙','V','各組（排煙組較快，機器人除外）｜點有窗的房間｜打破窗戶建立排煙開口；點頂樓樓梯間則改為屋頂排煙｜火點還沒有水線就開口會助燃；悶燒缺氧時可能爆燃'],
  ['hydro','水霧排煙','W','幫浦組｜點有窗的房間｜開窗後以水霧把煙帶出窗外，提升能見度；排除後原地守線｜需要水線'],
  ['ppv','正壓排煙','P','排煙組、11 幫浦車｜立即執行（本組所在側入口），排煙組也可點道路指定入口｜在入口架送風機，沿送風路徑把煙推向開口｜要先有出風口；火點未壓制時送風會助燃；同一組再下一次即關閉送風機'],
  ['npv','負壓排煙','N','排煙組｜點有窗的房間｜開窗架排風機，把煙抽出｜進氣由其他開口自然補入，比正壓排煙不易把火勢推向未燒區；排風機要放在下風處，抽到的是高溫可燃煙氣'],
  ['vvent','垂直排煙','J','各組（雲梯組較快，機器人除外）｜點頂樓房間｜在正上方屋頂開孔，排出熱煙、避免閃燃｜火點未壓制時開孔會助燃'],
  ['roof','屋頂出入口','O','各組（機器人除外）｜立即執行（再下一次就關閉）｜開啟或關閉頂樓樓梯間通往屋頂的出入口：開啟時樓梯間的煙往上排出（也加強煙囪效應）；關閉可保護屋頂避難者、避免拉動整座樓梯間的煙｜開啟前最好已有水線壓制起火層']]],
 ['野火',[['beat','撲打','','各組（雲梯組、機器人除外）｜點草地火線｜以打火拍、背負式水袋撲打低矮火線，撲滅後自動往附近火線｜火勢猛烈時無法靠近'],
  ['brk','防火線','','各組（雲梯組、機器人除外）｜點還沒燒到的草地｜清除可燃物開設防火線，阻斷延燒（救助組較快）｜要在火頭前方預先開設']]],
 ['化災',[['snatch','快速救援','','背空氣呼吸器的小組（C 級、雲梯組、機器人、一般義消除外）｜點已知位置受困者所在的危害區｜Snatch and Grab：直接衝進去，抓了人就撤出（不做搜索），可進入比本身防護高一級的危害區（消防衣到 2 級、B 級到 3 級）｜重度污染、會受傷，出來要除污；被夾住的受困者帶不走'],
  ['zone','劃設管制區','','各組（人員在屋外）｜立即執行（化災組、化災應變隊較快）｜依危害範圍、隔離距離與風向劃出熱區（警戒帶）、暖區（除污走廊）、冷區（指揮站、集結區，設在上風處）｜化物辨識後 60 秒內沒劃設記缺失'],
  ['dike','圍堵','','各組（雲梯組、機器人除外）｜點外洩液體所在的區域或洩漏處｜沙包、吸附棉、導水板圍住外洩液體與射水的廢水：本區往外擴散減少，廢水不會流進排水溝｜氣體無法圍堵；進熱區要穿足夠的防護衣'],
  ['neut','中和／覆蓋','','各組（化災組、化災應變隊較快；可燃液體要泡沫車、特殊化學車、CAFS 或化災組）｜點外洩處｜依化學品：酸鹼中和、可燃液體泡沫覆蓋、遇水反應的乾砂覆蓋，止漏後濃度快速下降｜氣體不能中和（可溶於水的用水霧稀釋）'],
  ['ident','化物辨識','I','化災組、化災應變隊｜點洩漏處｜偵檢辨識化學品並劃設危害區｜辨識前請著適當防護'],
  ['plug','止漏','Z','各組（化災應變隊最快、化災組次之，其他組很慢；瓦斯、熱水器各組約 10 秒）｜點洩漏源｜止漏；加油站、油罐車為關閉緊急遮斷閥，瓦斯外洩為關閉開關與總閥，一氧化碳為關閉熱水器｜侷限空間持續產生的氣體無法止漏，要送風'],
  ['ppeF','消防衣','','各組（雲梯組、機器人除外）｜立即執行（人員須在屋外）｜換回消防衣帽鞋｜耐火，但不防化學品'],
  ['ppeC','C級','','各組（雲梯組、機器人除外）｜立即執行（人員須在屋外）｜濾毒罐與防濺衣，不耗氣｜不耐火，不能進濃煙、缺氧或高濃度區'],
  ['ppeB','B級','','各組（雲梯組、機器人除外）｜立即執行（人員須在屋外）｜空氣呼吸器＋防濺衣｜每輛化災車 2 套'],
  ['ppeA','A級','','各組（雲梯組、機器人除外）｜立即執行（人員須在屋外）｜氣密全身防護｜每輛化災車 1 套']]],
 ['雲梯',[['ladder','雲梯救援','L','雲梯組｜點有窗的房間｜移車到窗戶那一側、架梯到窗口搜索，逐一救下受困者｜要在可達樓層內，窗戶那一側要能停大型車'],
  ['master','雲梯射水','M','雲梯組｜點有窗的房間｜從窗外以雲梯瞄子射水，該室熄滅後自動停止；也能撲滅屋頂光電板、外牆室外機火｜室內有小組時會把熱煙壓回去']]],
 ['調度',[['move','移動','G','各組｜點空間｜移到指定位置待命｜一般義消不進入高溫或濃煙的空間'],['rit','RIT','R','各組（雲梯組、機器人除外）｜立即執行｜在入口待命，MAYDAY 時入室救援；已有隊員倒地時立即入室｜人員入室前應先編成（2 進 2 出）'],
  ['exit','撤出','X','室內各組｜立即執行｜撤出建物｜'],['truck','移車','T','幫浦組、雲梯組｜點道路｜把車移到另一側道路（約 12 秒）｜人員在室內時不能移車'],
  ['relay','中繼送水','','幫浦組（人員在車邊、本車不出水）｜立即執行（自動接到水壓最低的幫浦車或連結送水管）｜替它中繼加壓：水帶上限 +8 條、長度與樓層的壓損減半、供水能力 +0.8｜同一來源只需一輛中繼車；對象收線就自動結束'],
  ['hyd','佔據水源','','幫浦組（人員須在車邊）｜立即執行｜移車到消防栓那一側接栓佔水，水線改由消防栓持續供水｜沒有佔水只能用車上水箱'],
  ['stand','送水口加壓','C','幫浦組（人員須在車邊）｜立即執行｜移車到送水口那一側，接連結送水管，約 8 秒後各樓層出水口可接線｜七層以上，或五層以上的大型場所（百貨、醫院、機構）才有']]]];
// 指令的 Emoji
const TAC_EMO={care:'🩹',locate:'🐕',cush:'🛟',rope:'🪢',clear:'🚶',extg:'🧯',snatch:'🏃',stab:'🪵',extr:'✂️',zone:'🚧',dike:'🧱',neut:'⚗️',dcool:'🚪',veis:'🪟',relay:'🔗',shore:'🧱',hyd:'🚰',cover:'🛡️',attack:'🔥',sky:'⛲',trans:'💦',guard:'🛡️',confine:'💧',overhaul:'🧯',force:'🪓',dctrl:'🚪',search:'🔦',search2:'🔍',gas:'📟',
 vent:'🪟',hydro:'🌫️',ppv:'🌀',npv:'💨',vvent:'⬆️',roof:'🏠',beat:'🧹',brk:'⛏️',ident:'🧪',plug:'🔩',ppeF:'🧥',ppeC:'😷',ppeB:'🥽',ppeA:'🦺',
 ladder:'🪜',master:'🚿',move:'➡️',rit:'🆘',exit:'↩️',truck:'🚒',stand:'🔌',roofres:'🚁',decon:'🚿'};
const TAC_ORD=TAC_GRP.flatMap(g=>g[1]);
const TAC_KEYS={};for(const o of TAC_ORD)if(o[2])TAC_KEYS[o[2].toLowerCase()]=o[0];
// 小組編號轉數值雜湊（支援義消、化災應變隊等字串識別碼，避免三角函數運算出現 NaN）
function tacUidN(u){if(typeof u==='number')return u;let h=0;const s=String(u);for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;return h&1023}
// 預繪火焰光暈離屏畫布，避免每幀為每個火焰點重複建立 createRadialGradient
let _tacGlow=null;
function tacFlameGlow(g,fx,fy,rad,alpha){
 if(!_tacGlow){const cv=document.createElement('canvas');cv.width=cv.height=64;const c=cv.getContext('2d');
  const gr=c.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(255,230,120,.95)');gr.addColorStop(.45,'rgba(255,140,40,.85)');gr.addColorStop(1,'rgba(255,80,20,0)');
  c.fillStyle=gr;c.fillRect(0,0,64,64);_tacGlow=cv}
 if(alpha!==undefined&&alpha<1){g.save();g.globalAlpha=alpha;g.drawImage(_tacGlow,fx-rad,fy-rad,rad*2,rad*2);g.restore()}
 else g.drawImage(_tacGlow,fx-rad,fy-rad,rad*2,rad*2)}
// 需要再點選目標的指令
const TAC_NEEDT={care:1,locate:1,rope:1,clear:1,extg:1,snatch:1,stab:1,extr:1,dike:1,neut:1,dcool:1,veis:1,shore:1,cover:1,sky:1,beat:1,brk:1,ident:1,plug:1,gas:1,attack:1,trans:1,guard:1,confine:1,overhaul:1,force:1,dctrl:1,search:1,search2:1,vent:1,hydro:1,npv:1,vvent:1,ladder:1,master:1,move:1,truck:1};
let TAC_UIS=1; // 戰術畫面的縮放倍率（寬螢幕放大）
function sizeTac(){
 const mid=tcv.parentElement,r=mid.getBoundingClientRect(),sd=document.getElementById('tacSide');
 const col=getComputedStyle(mid).flexDirection==='column';
 const cw=Math.max(300,Math.floor(r.width-(col?12:sd.offsetWidth+18))),ch=Math.max(240,Math.floor(r.height-(col?sd.offsetHeight+18:12)));
 // 寬螢幕（1900 以上，例如 2560×1440）：整個戰術畫面（平面、樓層列、文字）等比例放大，最多 1.5 倍
 TAC_UIS=innerWidth>=1900&&!col?Math.min(1.5,Math.max(1,Math.min(innerWidth/1700,innerHeight/950))):1;
 tW=Math.floor(cw/TAC_UIS);tH=Math.floor(ch/TAC_UIS);
 tcv.style.width=cw+'px';tcv.style.height=ch+'px';
 tcv.width=Math.round(cw*dpr);tcv.height=Math.round(ch*dpr);tctx.setTransform(dpr*TAC_UIS,0,0,dpr*TAC_UIS,0,0)}
function tacOpen(inc){
 if(!tacHas(inc)){msg='此案類沒有戰術指揮';return}
 if(!inc.rev){msg='首車到場回報後才能進入戰術指揮';return}
 if(inc.wrap){msg='現場已在收整，無法進入戰術指揮';return}
 if(!inc.tac)tacInit(inc);
 TAC.open=true;TAC.id=inc.id;TAC.B=inc.tac;TAC.vf=inc.tac.of;TAC.sq=null;TAC.ms=[];TAC.ord=null;stratT=0;inc.tac.played=1;
 document.getElementById('tac').hidden=false;tTopH=tSideH=tBotH='';
 tacUI();sizeTac()}
// 底部面板或視窗大小改變時，重算畫布大小
if(window.ResizeObserver)new ResizeObserver(()=>{if(TAC.open)sizeTac()}).observe(document.getElementById('tacMid'));
function tacClose(why){
 const inc=S.inc.find(i=>i.id===TAC.id);
 if(inc&&inc.tac&&!why)radio(inc,'受理','指揮中心退出戰術畫面，現場戰術交由 AI 指揮官。');
 TAC.open=false;TAC.id=null;TAC.sq=null;TAC.ord=null;
 document.getElementById('tac').hidden=true;
 if(why)msg=why;
 size();dirty()}
// 點空間時的預設指令：依小組類型與該空間狀態
function tacDefault(B,q,f,c){
 if(f<0)return q.ty==='vent'?'ppv':'exit';
 const x=tacCel(B,f,c),n=B.L.N[c],srch=x.sl>=1?'search2':'search';
 if(q.ty==='ladder')return tacStair(B,c)?'roof':(x.h>.05&&x.srch>=1&&!x.vic)?'master':'ladder';
 if(n.ty!=='room')return(x.h>.05&&(q.ty==='pump'||q.ty==='robot'))?'attack':(tacStair(B,c)&&f===B.F-1&&q.ty!=='pump')?'roof':'move';
 if(q.ty==='pump'||q.ty==='robot')return(x.h>.05||q.ty==='robot')?'attack':srch;
 if(q.ty==='vent')return'vent';
 return srch}
// 選取：一般點選＝單選；Shift／Ctrl＝加入或移除；框選＝框內全部
const tacSelList=B=>{const ids=TAC.ms.length?TAC.ms:TAC.sq?[TAC.sq]:[];return ids.map(id=>B.sq.find(q=>q.u===id)).filter(Boolean)};
function tacToggle(B,id){const i=TAC.ms.indexOf(id);if(!TAC.ms.length&&TAC.sq)TAC.ms=[TAC.sq];
 if(i>=0)TAC.ms.splice(TAC.ms.indexOf(id),1);else TAC.ms.push(id);TAC.sq=TAC.ms[0]||null;TAC.ord=null}
function tacSel(B,id){TAC.sq=id;TAC.ms=[id];TAC.ord=null;const q=B.sq.find(x=>x.u===id);
 if(q){const f=q.ty==='ladder'?(q.task!=='idle'&&q.lf!==undefined?q.lf:-1):q.f;if(f>=0)TAC.vf=f}}
function tacFloor(B,d){TAC.vf=Math.max(0,Math.min(B.F,TAC.vf+d))}
function tacCmd(k){
 const inc=S.inc.find(i=>i.id===TAC.id);if(!inc)return;
 const B=inc.tac;
 if(k==='evac'){const n=tacEvac(inc,B);
  radio(inc,'受理',B.bv&&!B.bv.boom?'緊急撤離！全員撤到安全距離外，人員清點。':'緊急撤退！所有入室小組立即撤出建物，人員清點。');msg=n?'已下令 '+n+' 組撤出':'';TAC.ord=null;return}
 const qs=tacSelList(B);
 if(!qs.length){msg='請先選擇小組';return}
 if(TAC.cwhy&&TAC.cwhy[k]){msg=TAC.cwhy[k];for(const q of qs){const w=tacOrdWhy(B,q,k);if(/^拒絕：/.test(w))tacNo(inc,q,w)}if(qs.length>1)msg=TAC.cwhy[k];TAC.ord=null;return}
 if(TAC_NEEDT[k]){TAC.ord=TAC.ord===k?null:k;return}
 let ok=0;qs.forEach((q,i)=>{if(tacOrder(inc,q,k,k==='roof'||k==='roofres'?B.F-1:-1,0,i>0))ok++});
 if(qs.length>1)msg=TAC_TASK[k]+'：'+ok+' / '+qs.length+' 組受令';TAC.ord=null}
tcv.addEventListener('contextmenu',e=>e.preventDefault());
// 指令按鈕滑過時，說明列顯示該指令的說明與不可執行的原因
{const tb=document.getElementById('tacBot'),hv=k=>{if(k!==TAC.hord){TAC.hord=k;tBotH='';tacUI()}};
 tb.addEventListener('mouseover',e=>{const b=e.target.closest('[data-tord]');hv(b?b.dataset.tord:null)});
 tb.addEventListener('mouseleave',()=>hv(null))}
tcv.addEventListener('pointermove',e=>{const r=tcv.getBoundingClientRect(),x=(e.clientX-r.left)/TAC_UIS,y=(e.clientY-r.top)/TAC_UIS;
 if(TAC.drag){TAC.drag.x1=x;TAC.drag.y1=y}
 if(e.pointerType!=='touch')TAC.hov={x,y}});
tcv.addEventListener('pointerleave',e=>{if(e.pointerType!=='touch')TAC.hov=null});
// 樓層只用按鈕（上方 ▲▼、左側樓層列）或 [ ] 鍵切換；滾輪不換層，避免誤觸
tcv.addEventListener('wheel',e=>{if(TAC.open)e.preventDefault()},{passive:false});
// 畫面點擊：按下時選小組或開始框選；沒拖曳就在放開時下令
tcv.addEventListener('pointerdown',e=>{
 const inc=S.inc.find(i=>i.id===TAC.id);if(!inc||!inc.tac)return;
 const B=inc.tac,r=tcv.getBoundingClientRect(),x=(e.clientX-r.left)/TAC_UIS,y=(e.clientY-r.top)/TAC_UIS;
 const hit=TAC.hits.find(h=>x>=h.x&&x<=h.x+h.w&&y>=h.y&&y<=h.y+h.h);
 if(e.pointerType==='touch'){TAC.hov={x,y,pin:1}}
 if(hit&&hit.t==='flr'){TAC.vf=hit.f;return}
 if(hit&&hit.t==='sq'&&e.button!==2){if(e.shiftKey||e.ctrlKey||e.metaKey)tacToggle(B,hit.id);else tacSel(B,hit.id);tBotH='';tacUI();return}
 if(e.button===2){tacClick(inc,B,hit,e,x,y);return}
 TAC.drag={x0:x,y0:y,x1:x,y1:y,add:e.shiftKey||e.ctrlKey||e.metaKey,hit};tcv.setPointerCapture(e.pointerId)});
tcv.addEventListener('pointerup',e=>{
 const d=TAC.drag;TAC.drag=null;if(!d)return;
 const inc=S.inc.find(i=>i.id===TAC.id);if(!inc||!inc.tac)return;const B=inc.tac;
 if(Math.hypot(d.x1-d.x0,d.y1-d.y0)>8){ // 框選
  const x0=Math.min(d.x0,d.x1),x1=Math.max(d.x0,d.x1),y0=Math.min(d.y0,d.y1),y1=Math.max(d.y0,d.y1);
  const ids=Object.keys(TAC.sqp||{}).map(k=>/^\d+$/.test(k)?+k:k).filter(id=>{const p=TAC.sqp[id];return p&&p[0]>=x0&&p[0]<=x1&&p[1]>=y0&&p[1]<=y1});
  if(d.add){for(const id of ids)if(TAC.ms.indexOf(id)<0)TAC.ms.push(id)}else TAC.ms=ids;
  TAC.sq=TAC.ms[0]||null;TAC.ord=null;if(ids.length)msg='已選取 '+TAC.ms.length+' 組';tBotH='';tacUI();return}
 tacClick(inc,B,d.hit,e,d.x0,d.y0)});
tcv.addEventListener('pointercancel',()=>{TAC.drag=null});
function tacClick(inc,B,hit,e,x,y){
 const qs=tacSelList(B),q=qs[0];
 if(!q){if(hit&&hit.t==='cell')TAC.hov={x,y,pin:1};return}
 let f=-1,c=0,side=null;
 if(hit&&hit.t==='roof'){qs.forEach((s,i)=>tacOrder(inc,s,'roofres',B.F-1,0,i>0));TAC.ord=null;tBotH='';tacUI();return}
 if(hit&&hit.t==='cell'){f=hit.f;c=hit.c}
 else if(hit&&hit.t==='side')side=hit.s;
 else return;
 let ok=0;
 qs.forEach((q,i)=>{
  let k=(e.button===2||!TAC.ord)?tacDefault(B,q,f,c):TAC.ord;
  // 點道路：幫浦／雲梯車移車；排煙組在該側入口做正壓排煙；室內小組撤出
  if(side&&B.exp[side]!==undefined&&!B.sd[side].road)k=q.ty==='pump'?'cover':'';
  else if(side&&k!=='truck'&&k!=='cover'&&k!=='guard'&&k!=='force'&&k!=='dctrl')k=tacIn(q)?'exit':(q.ty==='pump'||q.ty==='ladder')&&side!==q.tside?'truck':q.ty==='vent'?'ppv':k;
  if(k==='guard'&&side)k='cover';
  if(k==='cover'&&!side&&B.out&&f>=0)k='guard'; // 室外場景：點要保護的建物
  if(!k){if(!i)msg='點鄰棟可下令幫浦組做鄰棟周界防護';return}
  if((k==='truck'||k==='cover')&&!side){if(!i)msg=k==='truck'?'移車請點選建物外的道路':'鄰棟周界防護請點選鄰棟那一側';return}
  if(TAC_NEEDT[k]&&k!=='truck'&&k!=='cover'&&k!=='guard'&&!((k==='force'||k==='dctrl')&&side)&&f<0){if(!i)msg='請點選建物內的房間';return}
  // 破壞進入／門控進入：點在門附近就指定那扇門（站在較安全的一側）
  let door=null,c2=c;
  if((k==='force'||k==='dctrl')&&f>=0){const G=tacGeo(B);let bd=20;
   for(const o of B.L.N[c].nb){const [mx,my]=tacDoorMid(G,c,o),d=Math.hypot(mx-x,my-y);
    if(d<bd){bd=d;door=o}}
   if(door!==null){const a=tacCel(B,f,c),b=tacCel(B,f,door);if(a.h+a.s*.3>b.h+b.s*.3){c2=door;door=c}}}
  if(tacOrder(inc,q,k,f,c2,i>0,side,door))ok++});
 if(qs.length>1)msg='下令 '+ok+' / '+qs.length+' 組';
 TAC.ord=null;tBotH='';tacUI()}
// 戰術畫面的按鈕：點擊時依 data-* 屬性分派（新增時加進 TAC_CLICK）
const TAC_CLICK=['tdec','tall','tpow','tdcm','tdcs','tdw','tsop','tsug','tsugall','tidle','tbmin','tfin','tsys','troe','tfl','ttab','tsq','tord','tpause','texit','thand','tamb','tstn','trole','task','treq','telev','tspd','tap','tepa','tma'];
const TAC_CLICK_SEL=TAC_CLICK.map(k=>'[data-'+k+']').join(',');
document.getElementById('tac').addEventListener('click',e=>{
 const b=e.target.closest(TAC_CLICK_SEL);if(!b)return;
 const D=b.dataset;msg='';
 const ic=S.inc.find(i=>i.id===TAC.id);
 if(ic&&ic.tac){const B=ic.tac;
  if(D.tamb)tacAmbReq(ic,B);
  if(D.tsys)tacSysTog(ic,B,D.tsys);
  if(D.task)tacAsk(ic,B,D.task);
  if(D.treq)tacReinf(ic,B,D.treq);
  if(D.tepa)epaCall(ic);
  if(D.tma)maCall(ic,D.tma);
 if(D.telev&&B.elev&&!B.elOn&&!(B.elT>0)){B.elT=10;radio(ic,'受理','消防專用升降機切換消防模式中。')}}
 if(D.tspd){TAC.spd=+D.tspd}
 if(D.troe){const ic=S.inc.find(i=>i.id===TAC.id);if(ic&&ic.tac){ic.tac.roe=D.troe;ic.tac.roeSet=1;radio(ic,'受理','進入方式 ROE：'+(D.troe==='dctrl'?'門控進入（在門口反覆開關門、短促射水冷卻後才進去；較慢，悶燒空間不易爆燃）':'破壞進入（較快，悶燒空間容易爆燃）')+'。');tBotH=''}}
 if(D.tap){TAC.autoPause=!TAC.autoPause}
 if(D.tbmin){TAC.bmin=!TAC.bmin;tBotH='';tacUI();return}
 if(ic&&ic.tac){const B=ic.tac;
  if(D.tstn){if(B.st[D.tstn]){tacStnClose(ic,B,D.tstn);if(D.tstn==='air')B.airOff=1}else tacStnOpen(ic,B,D.tstn)}
  if(D.trole)tacRoleSet(ic,B,D.trole,!B.role[D.trole]);
  if(D.tsop){B.sop=B.sop===1?2:B.sop===2?0:1;if(!B.sop)for(const q of B.sq)q.pc=1;radio(ic,'指揮官',B.sop===1?'各組依到場標準作業（SOP）行動，另有指示再下令。':B.sop===2?'SOP 只管安全與後勤（佔水、救護、RIT），攻擊與搜索由指揮官下令。':'取消 SOP，各組待命，等指揮官下令。')}
  if(D.tsug){const q=B.sq.find(x=>x.u===TAC.sq);if(q&&!tacDoSuggest(ic,B,q))msg=q.cs+'：目前沒有合適的建議任務'}
  if(D.tsugall){let n=0;for(const q of tacIdleQ(ic,B))if(tacDoSuggest(ic,B,q))n++;msg=n?'已套用 '+n+' 組建議任務':'目前沒有合適的建議任務'}
  if(D.tidle){const l=tacIdleQ(ic,B);if(l.length){const i=l.findIndex(q=>q.u===TAC.sq);tacSel(B,l[(i+1)%l.length].u)}}
  if(D.tfin)tacFinishGo(ic,B,D.tfin);
  if(D.tdcm){const d=tacDcn(B);d.mode=d.mode==='dry'?'wet':'dry';radio(ic,'除污站','除污方式改為'+(d.mode==='dry'?'乾除污（脫除外層防護衣、刷除、吸附）':'濕除污（沖淋、中和）')+'。')}
  if(D.tdcs){const d=tacDcn(B),ss=['n','e','s','w'];if(ss.length){d.side=ss[(ss.indexOf(d.side)+1)%ss.length];if(B.st.decon)B.st.decon.side=d.side;radio(ic,'除污站','除污站移到'+TAC_SDN[d.side]+'側'+(tacDownSide(B,d.side)?'（下風處！）':'')+'。')}}
  if(D.tdw)tacDwSet(ic,B,D.tdw);
  if(D.tdec!==undefined)tacDecPick(ic,B,+D.tdec);
  if(D.tall){TAC.allCmd=!TAC.allCmd;tBotH=''}
  if(D.tpow)tacPowReq(ic,B)}
 if(D.ttab){TAC.tab=D.ttab;tacUI();return}
 if(D.tfl){const ic=S.inc.find(i=>i.id===TAC.id);if(ic&&ic.tac){tacFloor(ic.tac,+D.tfl);tacUI()}return}
 if(D.texit){tacClose();return}
 if(D.thand){const ic=S.inc.find(i=>i.id===TAC.id);if(ic&&ic.tac)tacHandoff(ic,ic.tac);return}
 if(D.tpause){paused=!paused;if(!paused)TAC.pmsg='';$('btnPause').textContent=paused?'繼續':'暫停'}
 if(D.tsq){const inc=S.inc.find(i=>i.id===TAC.id);if(inc){const id=/^\d+$/.test(D.tsq)?+D.tsq:D.tsq;if(e.shiftKey||e.ctrlKey||e.metaKey)tacToggle(inc.tac,id);else tacSel(inc.tac,id)}}
 if(D.tord)tacCmd(D.tord);
 tTopH=tBotH='';tacUI()});
document.addEventListener('keydown',e=>{
 if(!TAC.open||e.target.tagName==='INPUT')return;
 const inc=S.inc.find(i=>i.id===TAC.id);if(!inc)return;
 const k=e.key.toLowerCase();
 if(k==='escape'){if(TAC.ord)TAC.ord=null;else tacClose();}
 else if(k===' '){e.preventDefault();paused=!paused;if(!paused)TAC.pmsg='';$('btnPause').textContent=paused?'繼續':'暫停'}
 else if(/^[1-9]$/.test(k)){const q=inc.tac.sq[+k-1];if(q)tacSel(inc.tac,q.u)}
 else if(k==='['||k==='pagedown'){e.preventDefault();tacFloor(inc.tac,-1)}
 else if(k===']'||k==='pageup'){e.preventDefault();tacFloor(inc.tac,1)}
 else if(TAC_KEYS[k]){msg='';tacCmd(TAC_KEYS[k])}
 else return;
 tTopH=tBotH='';tacUI()});
// ===== ICS 架構圖 =====
// 節點：s 站點（data-tstn）、r 職務（data-trole）
const ICS_TREE={top:{s:'icp',n:'指揮站',sub:'現場指揮官',ic:'🚩'},
 staff:[{r:'safety',n:'安全官',ic:'🦺'},{s:'media',n:'聯訪處',sub:'新聞發布',ic:'🎙'}],
 secs:[{n:'作業組',ic:'🔥',items:[{r:'water',n:'水源組長',ic:'💧'},{r:'search',n:'搜救組長',ic:'🔦'},{s:'fwd',n:'前進指揮所',ic:'⛺'},{s:'decon',n:'除污站',chem:1,ic:'🚿'},{s:'mdecon',n:'大量除污',chem:1,ic:'🌧'}]},
  {n:'後勤組',ic:'📦',items:[{s:'stage',n:'待命集結區',ic:'🅿'},{s:'air',n:'氣瓶充填區',ic:'🫧'},{s:'rehab',n:'後勤照護區',ic:'🥤'}]},
  {n:'救護組',ic:'🚑',items:[{r:'ems',n:'救護組長',ic:'⛑'},{s:'triage',n:'檢傷站',ic:'🏷'},{s:'treat',n:'醫療站',ic:'🩺'}]}]};
function tacIcsNode(inc,B,nd,cls){
 const slots=tacRoleSlots(inc,B),used=tacStaffUsed(B);
 let on,st,dis='',tip,attr;
 if(nd.s){const o=B.st[nd.s],def=tacStnDef(nd.s);on=!!o;attr='data-tstn="'+nd.s+'"';tip=def.fx;
  if(o){const u=S.units.find(x=>x.id===o.u);st=(o.staff?'幕僚':u?u.cs+(def.drv?' 司機':''):nd.s==='media'?'警方':'')||'開設中'}
  else{const r=tacStnPick(inc,B,nd.s);st=r.why?r.why.replace(/^需要/,'需 '):'可開設';if(r.why)dis=' disabled'}}
 else{const r=TAC_ROLE.find(x=>x.k===nd.r);on=!!B.role[nd.r];attr='data-trole="'+nd.r+'"';tip=r.fx;
  st=on?'已指派':!B.st.icp?'需開設指揮站':used>=slots?'幕僚已滿':'可指派';if(!on&&(used>=slots))dis=' disabled'}
 const stc=on?'on':dis?'no':'av';
 return'<button class="icsr '+stc+(cls?' '+cls:'')+'" '+attr+dis+' title="'+esc(tip)+'"><span class="ic">'+(nd.ic||'')+'</span><b>'+nd.n+(nd.sub?'<small>'+nd.sub+'</small>':'')+'</b><i>'+esc(st)+'</i></button>'}
const tacIcsOn=(B,nd)=>nd.s?!!B.st[nd.s]:!!B.role[nd.r];
function tacIcsHTML(inc,B){
 const slots=tacRoleSlots(inc,B),used=tacStaffUsed(B),T=ICS_TREE;
 const all=[T.top,...T.staff,...T.secs.flatMap(s=>s.items.filter(n=>!n.chem||B.chem))],onN=all.filter(n=>tacIcsOn(B,n)).length;
 let h='<div class="hd mt">ICS 編組 <span class="sub">已開設 '+onN+' / '+all.length+'　·　幕僚 '+used+' / '+slots+'</span></div>';
 h+='<div class="icsleg"><span class="on">運作中</span><span class="av">可開設／指派</span><span class="no">條件不足</span><span class="sub">點一列開設／撤除</span></div><div class="ics2">';
 h+=tacIcsNode(inc,B,T.top,'top');
 h+='<div class="icsg"><div class="icsgh">🧭 指揮幕僚<span>'+T.staff.filter(n=>tacIcsOn(B,n)).length+' / '+T.staff.length+'</span></div>'+T.staff.map(n=>tacIcsNode(inc,B,n)).join('')+'</div>';
 for(const s of T.secs){const it=s.items.filter(n=>!n.chem||B.chem);
  h+='<div class="icsg"><div class="icsgh">'+s.ic+' '+s.n+'<span>'+it.filter(n=>tacIcsOn(B,n)).length+' / '+it.length+'</span></div>'+it.map(n=>tacIcsNode(inc,B,n)).join('')+'</div>'}
 h+='</div>';
 if(!slots)h+='<div class="sub">開設指揮站後，指揮車提供 2 名幕僚、行動指揮車（MCV）提供 4 名幕僚，可指派安全官與各組長。</div>';
 return h}
