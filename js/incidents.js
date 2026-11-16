// 案件生成：災情參數、報案對話、進線
'use strict';
function nearHyd(inc){
 const f=getF(inc,0);let b=null,bd=INF;
 for(const h of S.hyd){const d=f.D[K(h[0],h[1])];if(d<bd){bd=d;b=h}}
 if(!b)return{h:null,d:999,p:null,cl:0};
 let k=K(b[0],b[1]);const p=[];while(f.P[k]>=0){k=f.P[k];p.push([(k/N)|0,k%N])}
 return{h:b,d:Math.round(bd),p,cl:RD[K(b[0],b[1])]||2}}

function arrNeed(level,wild,trap){
 const acc={},tbl=wild?WARR:ARR;
 for(let l=1;l<=level;l++)for(const it of tbl[l])acc[it[0]]=(acc[it[0]]||0)+it[1];
 const order=['11','21','57','61','75','71','履','41','91'];
 return order.filter(c=>acc[c]).map(c=>{
  const als=c==='91'&&trap>=1;
  return G(ALT[c]||[c],acc[c],LB[c]+(c==='91'?(als?' ALS':' BLS'):''),als?1:0)})}
function mkFire(d){
 const area=Math.round((30+Math.random()*Math.random()*(d.wild?520:300))/5)*5;
 const load=d.fac?wpick({'高':.45,'極高':.4,'中':.15}):d.wild?wpick({'中':.5,'高':.4,'低':.1}):
  wpick({'低':.28,'中':.42,'高':.24,'極高':.06});
 const r=Math.random();
 const trap=d.wild?(r<.85?0:1):(r<.4?0:r<.66?1:r<.84?2:r<.94?3:4+Math.floor(Math.random()*3));
 const stab=wpick({'高':.74,'中':.2,'低':.06});
 let lvl=1;
 if(area>=120||trap>=2||load==='高'||load==='極高'||d.hi)lvl=2;
 if(area>=340||trap>=5||(stab==='低'&&area>=180)||(load==='極高'&&area>=240))lvl=3;
 const need=arrNeed(lvl,d.wild,trap);
 if(trap>=1&&!need.some(g=>g.c.indexOf('71')>=0))need.push(G(['71'],1,'救助器材車'));
 if(stab==='低'&&!d.wild)need.push(G(['履'],1,'消防機器人'));
 if(load==='極高'&&!need.some(g=>g.c.indexOf('57')>=0)&&!d.wild)need.push(G(['57'],1,'泡沫車'));
 const LF={'低':.85,'中':1,'高':1.25,'極高':1.5}[load];
 const tot=need.reduce((a,g)=>a+g.n,0);
 return{need,pm:{area,load,trap,stab,lvl},
  dur:Math.round((10+tot*1.5)*LF*(1+area/420)),
  t:130+lvl*30+(d.wild?40:0),
  pay:Math.round(700+area*8+trap*600+lvl*900),
  pen:7+trap*3+lvl*2+(stab==='低'?5:0)}}
function vsOf(m,round2,improved){
 const j=(x,d)=>Math.max(0,Math.round(x+(Math.random()*2-1)*d));
 if(m.lv===2||m.dead)return{bt:m.dead?'—':m.bt,hr:0,bp:'0/0',sp:0,av:'U'};
 const k=round2?(improved?1:-1):0;
 const hr=j(m.hr-k*6,3),sp=Math.min(100,j(m.sp+k*3,1));
 const sys=Math.round(parseInt(m.bp)+k*4+(Math.random()*8-4));
 const dia=Math.round(parseInt(m.bp.split('/')[1])+k*2);
 return{bt:(m.bt+(Math.random()*.2-.1)).toFixed(1),hr,bp:sys+'/'+dia,sp,av:m.av}}
function mkMed(){
 const r=Math.random(),tier=r<.55?0:r<.86?1:2;
 const pool=MED.filter(m=>m.lv===tier&&m.a),m=pick(pool),ci=MED.indexOf(m);
 if(tier===2)return{need:[G(['91'],1,'救護 ALS',1),GB('manpower',1)],
  pm:{als:1,ohca:1,cc:ci},dur:18,pay:1800,pen:18};
 return{need:[G(['91'],1,tier?'救護 ALS':'救護 BLS',tier?1:0)],pm:{als:tier===1,cc:ci},
  dur:tier?14:8,pay:tier?900:480,pen:tier?12:8}}
function mkTrap(){
 const trap=1+Math.floor(Math.random()*3),als=trap>=2;
 const need=[G(['71'],1,'救助器材車'),
  G(['91'],Math.max(1,Math.ceil(trap/2)),als?'救護 ALS':'救護 BLS',als?1:0),
  G(['11','16'],2,'幫浦車')];
 if(trap>=2)need.push(G(['41'],1,'指揮車'));
 return{need,pm:{trap},dur:12+trap*2,pay:1100+trap*520,pen:10+trap*2}}
const CALM={
 open:['先不要緊張，慢慢講，我在聽。','深呼吸一下，我一步一步問你。','好，我知道你很急，先告訴我地址。'],
 urgent:['拜託你們快一點！','怎麼辦，他看起來很不舒服！','車子到底什麼時候到？','我好怕，我不知道要怎麼做'],
 reply:['車已經在路上了，我會一直陪你講電話。','你做得很好，{V}正在趕過去。','別擔心，{V}已經出動，我先教你怎麼做。','我知道你很擔心，{V}已經派了，我們一起撐一下。'],
 fire:['請先離開屋內，不要回去拿東西。','低姿勢往外走，出去後把門帶上可以擋煙。','不要搭電梯，走樓梯往下。','到了外面先確認家人有沒有都出來。'],
 ems:['繼續陪著他，注意他的呼吸。','如果他狀況變差，馬上再打回來。','幫他鬆開衣領，讓他保持舒服的姿勢。','把門打開、燈打亮，方便救護人員找到。'],
 rescue:['請不要自己下去救，等消防隊專業處理。','請先離開危險區域，保持安全距離。','幫我注意周邊有沒有其他人受傷。'],
 police:['收到，我們會跟貴分局保持聯繫。','麻煩請同仁協助引導救護車進場。'],
 other:['收到，我們會盡快派人過去處理。','請先在安全的地方等候。'],
 duty:['謝謝您的檢舉，我們會依規定處理。','如需補充資料，可以再來電告知。']};
function calmPass(L,d,inc){
 if(!L.length)return L;
 const last=L[L.length-1];
 if(last.w!=='台')return L;
 const body=L.slice(0,-1),out=[];
 const key=d.cls==='公務'?'duty':d.police?'police':d.cls==='火警'?'fire':(d.cls==='救護'||d.carry)?'ems':d.cls==='救助'?'rescue':'other';
 // 報案人情緒：依案件嚴重度與通報人身分
 const tense=d.cls!=='公務'&&!d.police&&!d.gps&&(inc.pm.als||inc.pm.ohca||inc.pm.trap>0||d.fire||Math.random()<.35);
 for(let i=0;i<body.length;i++){
  out.push(body[i]);
  if(body[i].w==='民'&&!out.some(x=>x.calm)&&d.cls!=='公務'&&!d.police&&!d.gps&&Math.random()<.45)out.push({w:'台',s:pick(CALM.open),calm:1});}
 const V=key==='fire'?'消防車':key==='ems'?'救護車':key==='rescue'?'救援車隊':'車輛';
 const person=key==='ems'||inc.pm.trap>0||inc.pm.cc!==undefined; // 「他」指的是傷病患，沒有人受困受傷時不用
 if(tense&&!d.hoax){out.push({w:'民',s:pick(CALM.urgent.filter(x=>person||x.indexOf('他')<0))});out.push({w:'台',s:pick(CALM.reply).replace('{V}',V)})}
 out.push(last);
 const n2=(d.police||d.cls==='公務')?1:(inc.pm.ohca?1:2);
 let pool=CALM[key].slice();
 if(key==='fire'&&d.wild)pool=['請不要靠近火場，往上風處移動。','請留在安全的地方，幫我們注意火勢往哪個方向燒。','不要自己上山滅火，等消防隊到場。'];
 if(key==='fire'&&!(inc.pm.trap>0))pool=pool.filter(x=>x.indexOf('電梯')<0&&x.indexOf('低姿勢')<0).concat(['請所有人保持距離，不要再靠近火場。']);
 for(let i=0;i<n2&&pool.length;i++){const j=Math.floor(Math.random()*pool.length);out.push({w:'台',s:pool.splice(j,1)[0]})}
 // 重新排定時間軸
 const extra=L.slice(L.indexOf(last)+1);
 const res=out.concat(extra);
 for(let i=0;i<res.length;i++)res[i].t=i*2.4;
 return res}
function mkLog(k,d,inc){
 const L=[],add=(w,s)=>L.push({w,s,t:L.length*2.4}),p=inc.pm;
 if(!d.police)add('台','119 消防隊，請說您的位置和狀況。');
 if(d.fire){
  add('民',pick(d.hi?['大樓高層一直冒煙，警報器響個不停','樓上在燒，樓梯間都是煙下不去']:
   d.wild?['山上有一片濃煙，看起來越燒越大','產業道路旁邊的雜木林在燒，風很大']:
   d.fac?['鐵皮工廠在燒，旁邊堆了很多桶子','工業區傳出爆炸聲，黑煙很大']:
   ['隔壁在燒，火從窗戶竄出來','二樓一直冒白煙，聞到很重的燒焦味',
    '頂樓加蓋那邊有火光，整片都紅的','我家廚房油鍋起火，我拿鍋蓋蓋不住',
    '神明廳的香爐倒了，桌布整個燒起來','冷氣室外機在冒火，牆壁都燻黑了',
    '倉庫堆的紙箱燒起來，火一直往上跑','電動車在騎樓充電，突然爆一聲就燒了']));
  add('台','地址在哪裡？');
  add('民',d.wild?inc.addr+'附近，從路邊就看得到。':inc.addr+'，大門在'+pick(['大馬路邊','巷子裡面','後面的小路'])+'。');
  add('台',d.wild?'附近還有沒有人？':'裡面還有沒有人？');
  add('民',d.wild?(p.trap>=1?'有一個人還在上面沒下來，電話打不通':'沒看到人，附近的人都離開了'):
   p.trap>=3?'裡面應該還有好幾個人沒出來，我聽到有人在喊':p.trap===2?'好像還有兩個人在裡面':
   p.trap===1?'有一個人還沒看到出來，不確定':'人都跑出來了，都在外面等');
  add('台','火燒多大、燒到哪裡了？');
  add('民',d.wild?(p.area<80?'一小片在燒，煙很濃':p.area<180?'燒了一大片，一直往上坡燒':'整面山坡都在燒，風一吹又更大'):
   p.area<80?'看起來一個房間在燒':p.area<180?'整層都是火，窗戶都破了':'一整棟都在燒，隔壁也快燒到了');
  if(p.stab!=='高'&&!d.wild)add('民','剛剛有東西掉下來，'+(p.stab==='低'?'牆壁看起來快垮了':'感覺結構有點怪'));
  add('台','車已經出勤，請退到安全距離等候。')}
 else if(d.med){
  const M=MED[p.cc]||MED[0];
  add('民',M.a);
  add('台','地址給我一下。');add('民',inc.addr+'。');
  add('台',M.q);
  add('民',M.b);
  add('台',p.ohca?'救護車已經出發了，如果他沒有呼吸，我可以在線上教您壓胸。':
   p.als?'救護車已經派了，請讓他保持不動，我們馬上到。':
   '救護車已經派了，先讓他坐著休息，不要隨意移動。')}
 else if(d.trap){
  add('民',pick(d.hw?['國道上連環撞，有車翻過去了','高速公路有車自撞，已經塞住了']:
   ['機車跟小客車對撞，人壓在車底下','汽車自撞護欄，駕駛卡在裡面',
    '有一台車翻在路邊，裡面的人出不來','砂石車跟轎車撞在一起，轎車整個變形',
    '公車跟機車擦撞，騎士倒在車底下','路口三台車追撞，有人說脖子很痛不敢動']));
  add('台','確切位置？');add('民',inc.addr+(d.hw?'，往南方向。':'，路口附近。'));
  add('台','有幾個人受困？');
  add('民',p.trap+' 個出不來，'+(p.trap>=2?'有人流很多血':'意識還清楚'));
  add('台','消防車跟救護車已經出勤。')}
 else if(d.police){
  const sc=inc.pm.sc||pick(d.dlg),W='警';
  add('台','高雄市消防局，請說。');
  add(W,sc[0]);
  add('台','確切位置？');
  add(W,inc.addr+'，我們的人在現場。');
  add('台',d.q||'傷者狀況？');
  add(W,sc[1]);
  add('台',d.close||'收到，救護車已經派遣，請協助引導。')}
 else{
  const sc=inc.pm.sc||pick(inc.pm.special&&d.sp?d.sp:(d.dlg||[['現場狀況不明','我也說不上來']]));
  const ln=Array.isArray(sc)?sc:[sc];
  add('民',ln[0]);
  if(d.gps){add('台','系統定位中。');add('民','（系統）座標定位：'+inc.addr+'附近。')}
  else{add('台','地址在哪裡？');add('民',inc.addr+'。')}
  if(ln[1]){add('台',(inc.pm.special&&d.spq)?d.spq:(d.q||'現場現在什麼情況？'));add('民',ln[1])}
  if(d.close)add('台',d.close);
  else if(d.pol)add('台','請保持跟他講話、不要掛斷，車輛已經出勤，我們同時會協請警方到場。');
  else if(d.pow)add('台','請不要靠近變電箱，也不要用水潑，車輛已出勤，我們會通報台電斷電。');
  else if(k==='birth')add('台','讓產婦側躺、不要用力，救護車已經出發，我會在線上指導您。');
  else add('台','收到，車輛已經出勤。')}
  return calmPass(L,d,inc)}
function zoneOf(x,y){
 for(let i=0;i<4;i++){const c=cls(x+DIR[i][0],y+DIR[i][1]);if(c===4||c===7)return 'hiway'}
 if(ter(x,y)===4)return 'airport';
 for(let i=0;i<4;i++)if(ter(x+DIR[i][0],y+DIR[i][1])===4)return 'airport';
 if(ter(x,y)===3)return 'port';
 for(let i=0;i<4;i++)if(ter(x+DIR[i][0],y+DIR[i][1])===3)return 'port';
 if(ter(x,y)===2)return 'forest';
 for(let i=0;i<4;i++)if(ter(x+DIR[i][0],y+DIR[i][1])===2)return 'forest';
 for(let i=0;i<4;i++)if(ter(x+DIR[i][0],y+DIR[i][1])===1)return 'water';
 return 'city'}
// 新增案件類型（在建立 POOL 之前追加）
Object.assign(KIND,{
 bikefall:{n:'自行車摔傷',ch:'摔',t:150,col:C.ems,lv:0,carry:1,z:'city',road:1,cls:'救護',
  base:[GB('ems',1),GB('manpower',1)],dur:10,pay:800,pen:9,q:'人現在能自己站起來嗎？',
  close:'請不要移動傷者，注意後方來車，救護車已經出發。',
  dlgm:[['有人騎公共自行車自摔，倒在人行道上','意識清楚，手肘擦傷流血，說手腕很痛',48],
   ['小朋友騎腳踏車衝下斜坡摔倒','他在哭，下巴流血，爸爸在旁邊',60]]},
 stairfall:{n:'樓梯跌落',ch:'墜',t:150,col:C.ems,lv:0,carry:1,z:'city',cls:'救護',quiet:1,
  base:[GB('ems',1),GB('manpower',1)],dur:12,pay:900,pen:10,q:'有沒有摔到頭？現在能不能講話？',
  close:'請不要搬動他，保暖等救護車到。',
  dlgm:[['阿嬤從二樓樓梯滾下來，躺在樓梯間','他清醒但說頭暈，藥罐撒了一地',49],
   ['樓梯間有人倒地不起，鄰居發現的','叫他有反應，但右手好像有點無力',54]]},
 ringstuck:{n:'戒指手指受困',ch:'戒',t:170,col:C.cmd,lv:0,z:'city',cls:'救助',
  base:[GB('rescue',1)],dur:6,pay:600,pen:6,q:'手指現在有沒有發紫或麻掉？',
  dlg:[['我的戒指卡在手指上，用肥皂水都拔不下來','手指已經腫脹發紫了，很痛'],
   ['小孩的手指卡在玻璃瓶口，哭得很厲害','已經開始腫脹，媽媽在旁邊安撫']]},
 drainfall:{n:'人孔掉落受困',ch:'孔',t:160,col:C.cmd,lv:1,z:'city',cls:'救助',
  base:[GB('rescue',1),GB('manpower',1)],dur:13,pay:1200,pen:12,q:'人還有意識嗎？有沒有進水？',
  dlg:[['騎士掉進水溝蓋缺口，人卡在裡面','他清醒，水深大概到腰部'],
   ['小朋友從路面塌陷的孔洞掉下去了','他有回答，但說腿卡住動不了']]},
 snake:{n:'捕蛇',ch:'蛇',t:200,col:'#9ac95d',lv:0,z:'any',cls:'其他',defl:'動保處',spq:'有沒有人被咬到？',
  base:[GB('rescue',1)],dur:5,pay:450,pen:5,q:'蛇現在在哪裡？',
  dlg:[['廚房有一條蛇，卡在架子底下','大約一米長，我們已經退到客廳'],
   ['水溝邊的草叢有蛇，小孩幾乎踩到','黑黑的，我不確定是不是毒蛇']],
  sp:[['有人被蛇咬傷，傷口開始腫脹','對方說可能是毒蛇，需要送醫']]}
});
Object.assign(KIND,{
 acfire:{n:'冷氣室外機起火',ch:'冷',t:190,col:C.red,lv:0,w:1,z:'city',cls:'火警',
  base:[GB('water',1),GB('manpower',1)],dur:8,pay:700,pen:8,q:'火是從室外機燒起來的嗎？旁邊有沒有窗戶？',
  close:'請不要自行潑水，也不要靠近，我們已經派車。',
  dlg:[['公寓外牆的冷氣室外機在冒火','火苗往上竄，上面住戶的窗戶開著'],['後陽台的室外機一直冒黑煙','聽到啪的一聲，現在整個機殼在燒']]},
 tinfire:{n:'鐵皮屋火警',ch:'鐵',t:230,col:C.red,lv:1,w:1,carry:1,z:'city',cls:'火警',
  base:[GB('water',2),GB('supply',1),GB('manpower',1)],dur:18,pay:2400,pen:14,q:'裡面有堆放什麼東西？有沒有人在裡面？',
  close:'請遠離建物，不要進去搶救財物，車輛已經出發。',
  dlg:[['違建鐵皮屋整個屋頂都是火','裡面堆了很多紙箱和保麗龍'],['住家後面的鐵皮加蓋在燒，鐵皮一直變形','隔壁就是民宅，火舌快舔到了']]},
 asthma:{n:'氣喘發作',ch:'喘',t:140,col:C.ems,lv:0,carry:1,z:'city',cls:'救護',
  base:[GB('ems',1)],dur:10,pay:750,pen:9,q:'他有沒有帶藥？現在還講得出話嗎？',
  close:'讓他坐著身體前傾，放鬆呼吸，有藥的話先用，救護車已經出發。',
  dlgm:[['小朋友打球後一直喘，吸不到氣','講話只能講一兩個字，有帶吸入劑'],['我先生半夜突然喘得很厲害','一直咳，嘴唇有點發紫']]},
 hypogly:{n:'低血糖昏迷',ch:'糖',t:150,col:C.ems,lv:0,carry:1,z:'city',cls:'救護',quiet:1,
  base:[GB('ems',1)],dur:10,pay:800,pen:9,q:'他有糖尿病嗎？現在能吞東西嗎？',
  close:'意識不清時不要餵食，讓他側躺，救護車已經出發。',
  dlgm:[['鄰居阿伯講話含糊、一直冒冷汗','他有糖尿病，早上有打胰島素但沒吃飯'],['同事叫不太醒，全身濕冷','聽說他有在吃降血糖藥']]},
 seizure:{n:'癲癇發作',ch:'癇',t:140,col:C.ems,lv:0,carry:1,z:'city',cls:'救護',
  base:[GB('ems',1),GB('manpower',1)],dur:11,pay:850,pen:10,q:'現在還在抽嗎？大概抽了多久？',
  close:'請移開周圍物品，不要塞東西進嘴巴，讓他側躺，救護車已經出發。',
  dlgm:[['同學在教室突然倒地全身抽搐','已經抽了快三分鐘，嘴角有白沫'],['路人在公車站倒下去一直抖','現在停了，人昏昏的叫不太醒']]},
 stroke:{n:'疑似中風',ch:'中',t:140,col:C.ems,lv:0,carry:1,z:'city',cls:'救護',
  base:[GB('ems',1,1)],dur:12,pay:1100,pen:12,q:'他是幾點發現不對勁的？嘴巴有沒有歪？',
  close:'請記下症狀開始的時間，不要給他吃喝，救護車已經出發。',
  dlgm:[['媽媽突然講話口齒不清，右手拿不住東西','嘴角有點歪，大概二十分鐘前開始'],['阿公走路突然偏一邊，說話含糊','他有高血壓，現在坐在椅子上']]},
 balcony:{n:'幼童受困陽台外',ch:'陽',t:170,col:C.cmd,lv:1,z:'city',cls:'救助',
  base:[GB('aerial',1),GB('manpower',1)],dur:12,pay:1500,pen:14,q:'孩子現在在哪裡？有沒有抓住東西？',
  close:'請你站在門口安撫他，不要拉他，消防車馬上到。',
  dlg:[['小孩爬到陽台外的冷氣架上，不敢動','我們在三樓，他一直哭'],['孩子卡在陽台欄杆外面，雙腳懸空','我抓著他的手，不敢放開']]},
 bathfall:{n:'浴室跌倒無法起身',ch:'浴',t:160,col:C.ems,lv:0,carry:1,z:'city',cls:'救護',quiet:1,
  base:[GB('ems',1),GB('manpower',1)],dur:11,pay:850,pen:9,q:'他意識清楚嗎？門有沒有反鎖？',
  close:'請先蓋上乾毛巾保暖，不要自己搬動他，救護車已經出發。',
  dlgm:[['爺爺在浴室滑倒，爬不起來','人清醒，說腰很痛，地上都是水'],['婆婆洗澡後倒在浴缸旁','叫她有反應，但說頭暈想吐']]}
});
Object.assign(KIND,{
 fishing:{n:'釣客受困消波塊',ch:'釣',t:180,col:C.cmd,lv:0,z:'water',cls:'救助',
  base:[GB('rescue',1),GB('manpower',1)],dur:12,pay:1400,pen:12,q:'他現在站在哪裡？有沒有受傷？',
  close:'請不要下去拉他，保持聯絡，消防人員正在趕往。',
  dlg:[['有釣客爬到消波塊中間，潮水漲上來回不去','他人沒事，但腳底很滑不敢動'],['釣魚的人滑倒卡在消波塊縫隙','他說腳踝很痛，浪一直打過來']]},
 tentfire:{n:'露營帳篷火警',ch:'帳',t:200,col:C.red,lv:0,w:1,z:'forest',cls:'火警',
  base:[GB('water',1),GB('manpower',1)],dur:9,pay:800,pen:8,q:'有沒有人在帳篷裡？瓦斯罐有沒有移開？',
  close:'請所有人退到空曠處，不要搶救帳篷裡的東西，消防車正在趕往。',
  dlg:[['營地有帳篷燒起來了，旁邊還有瓦斯罐','大家都跑出來了，風很大火一直擴大'],['烤肉的炭火引燃帳篷，旁邊就是樹林','有一個小孩吸入濃煙在咳嗽']]},
 schoollab:{n:'學校實驗室藥劑外洩',ch:'實',t:200,col:'#c88fd0',lv:1,z:'city',cls:'其他',
  base:[G(['91'],1,'救護 BLS'),G(['41'],1,'指揮車'),GB('detect',1),GB('vent',1)],dur:14,pay:1800,pen:14,q:'有沒有人吸入或接觸到？藥劑標示是什麼？',
  close:'請所有學生往上風處疏散，不要接觸外洩液體，消防人員馬上到。',
  dlg:[['化學實驗課打翻藥品，整間教室都是刺鼻味','有學生說眼睛刺痛，老師已經帶大家出來'],['實驗室的玻璃瓶摔破，冒出白色煙霧','有兩個同學一直咳嗽，教室門已經關上']]},
 foodpois:{n:'集體食物中毒',ch:'食',t:170,col:C.ems,lv:1,carry:1,z:'city',cls:'救護',
  base:[GB('ems',2),GB('manpower',1)],dur:15,pay:1700,pen:14,q:'有幾個人不舒服？大家都吃了什麼？',
  close:'請保留剩餘食物，讓不舒服的人側躺，救護車已經出發。',
  dlgm:[['公司聚餐後好幾個人上吐下瀉','已經有三個人臉色很差，一直吐'],['便當吃完不久，有同事開始發燒腹痛','我們這邊有五個人不舒服']]},
 fireworks:{n:'鞭炮炸傷',ch:'炮',t:150,col:C.ems,lv:0,carry:1,z:'city',cls:'救護',
  base:[GB('ems',1,1),GB('manpower',1)],dur:12,pay:1100,pen:11,q:'傷在哪裡？還在流血嗎？',
  close:'請用乾淨的布直接壓住出血處，不要拔除卡住的東西，救護車已經出發。',
  dlgm:[['小孩放鞭炮手被炸到，手掌都是血','手指好像少了一截，他一直哭'],['有人點沖天炮不小心炸到臉','眼睛睜不開，臉上有燒傷']]},
 diveacc:{n:'潛水意外',ch:'潛',t:170,col:C.cmd,lv:1,z:'water',cls:'救助',
  base:[GB('rescue',1),GB('ems',1,1),GB('manpower',1)],dur:15,pay:2200,pen:15,q:'他上來多久了？現在有沒有意識？',
  close:'請讓他平躺並給氧氣，不要讓他再下水，消防人員馬上到。',
  dlg:[['潛水客浮上來後說胸口悶、手腳發麻','他在船上，意識清楚，但臉色很差'],['有人在海邊潛水後突然昏過去','同伴把他拖上岸，現在叫不太醒']]}
});
PHX.acfire=PHX.evfire;PHX.tinfire=PH.fire;PHX.tentfire=PHX.grassfire;PHX.schoollab=PH.chem;
// 階段表修正：保留「車內照護」與「到院交接」以維持後送醫院流程
PHX.snake=PH.animal;PHX.diveacc=PH.water;PHX.kayak=PH.water;PHX.fishing=PH.mount;
PHX.psych=['接觸評估','建立溝通','安全確保','約束保護','車內照護','到院交接'];
PHX.crisis=['接觸評估','持續溝通','現場安全','人員確保','車內照護','到院交接'];
PHX.birth=['產婦評估','協助生產','新生兒照護','車內照護','到院交接'];
PHX.co=['警戒進入','偵測濃度','患者移出','通風排除','車內照護','到院交接'];
PHX.polinj=['現場安全','接觸傷患','傷口處置','搬運上車','車內照護','到院交接'];
PHX.polrtc=['現場管制','接觸傷患','頸椎固定','搬運上車','車內照護','到院交接'];
PHX.polesc=['與警方確認','戒護上車','車內照護','到院交接'];
const ZN=['city','forest','water','hiway','port','airport'],POOL={},POOLB={};
(function(){
 const keys=Object.keys(KIND);
 for(const z of ZN){POOL[z]=[];POOLB[z]=[];
  for(let lv=0;lv<=3;lv++){
   const a=[],b=[];
   for(const k of keys){const d=KIND[k];
    if(d.lv>lv||(d.z!==z&&d.z!=='any'))continue;
    a.push(k);if(!d.big)b.push(k)}
   if(z==='city'){const ex=['ems','ems','ems','mfire','rtc','carfire'];a.push(...ex);b.push(...ex)}
   POOL[z][lv]=a;POOLB[z][lv]=b}}
})();
function spawn(){
 const cand=[];
 for(let x=1;x<N-1;x++)for(let y=1;y<N-1;y++){
  const k=K(x,y);
  if(RD[k]||TR[k]===1)continue;
  let near=false;for(let i=0;i<4;i++)if(cls(x+DIR[i][0],y+DIR[i][1])){near=true;break}
  if(!near)continue;
  if(inFacility(x,y))continue;
  if(S.inc.some(i=>Math.abs(i.x-x)<3&&Math.abs(i.y-y)<3))continue;
  cand.push([x,y])}
 if(!cand.length)return;
 const c=pick(cand),z=zoneOf(c[0],c[1]),a=nbRoad(c[0],c[1]);
 if(!a)return;
 const probe={ax:a[0],ay:a[1]};
 const fs=getF(probe,0);
 let ok=false;
 for(let i=0;i<S.nst;i++)if(fs.D[K(SPOT[i].x[0],SPOT[i].x[1])]!==INF){ok=true;break}
 if(!ok)return;
 const fb=getF(probe,1);
 let bigOK=false;
 for(let i=0;i<S.nst;i++)if(fb.D[K(SPOT[i].x[0],SPOT[i].x[1])]!==INF){bigOK=true;break}
 const lv=S.day<3?0:S.day<5?1:S.day<8?2:3;
 const pool=((bigOK?POOL:POOLB)[z]||POOL.city)[lv]||['ems'];
 if(!pool.length)return;
 const pickKind=()=>{for(let t2=0;t2<6;t2++){const kk=pick(pool);const r2=KIND[kk].rare;
  if(!r2||Math.random()<Math.min(1,r2*4.2))return kk}return 'ems'};
 const k=pickKind(),d=KIND[k];
 const o=d.hoax?{need:d.base.map(g=>({c:g.c.slice(),n:g.n,l:g.l,als:g.als,k:g.k})),pm:{mal:Math.random()<.35},dur:d.dur,pay:d.pay,pen:d.pen}:
  d.fire?mkFire(d):d.med?mkMed():d.trap?mkTrap():
  {need:d.base.map(g=>({c:g.c.slice(),n:g.n,l:g.l,als:g.als,k:g.k})),pm:{},dur:d.dur,pay:d.pay,pen:d.pen};
 const need=o.need;
 const inc={id:uid++,k,x:c[0],y:c[1],ax:a[0],ay:a[1],z,bigOK,F:probe.F,
  left:Math.round((o.t||d.t)*TX*(1+(o.need.reduce((a,g)=>a+g.n,0))/26)),
  max:0,work:0,dur:Math.round(o.dur*DURX*(1+(o.need.reduce((a,g)=>a+g.n,0))/12)),pay:o.pay,pen:o.pen,pm:o.pm,need,
  hy:null,hd:999,hp:null,relay:0,tender:0,addr:'',rev:0,note:'',t0:S.t,fl:{},
  phs:phasesFor(k,d),ph:-1,req:null,reqT:0,pol:d.police?2:0,polT:0,pow:0,powT:0,dai:'',defl:0,
  clr:d.tac?(d.clrT?d.clrT[0]+Math.random()*(d.clrT[1]-d.clrT[0]):40+Math.random()*35):0,
  lines:0,dry:0,hook:0,hooked:0,burst:0,burstT:45};
if(d.road){inc.x=a[0];inc.y=a[1]}
 inc.addr=z==='hiway'?'國道'+(1+Math.floor(Math.random()*9))+'號 '+(10+Math.floor(Math.random()*300))+'K':
  z==='forest'?'山區產業道路 '+(1+Math.floor(Math.random()*30))+'K':
  pick(RDN)+(Math.random()<.5?'路':'街')+(1+Math.floor(Math.random()*500))+'號';
 if(d.w){
  const hy=nearHyd(inc);inc.hy=hy.h;inc.hd=hy.d;inc.hp=hy.p;
  inc.hin=hy.cl===3?600:hy.cl===2?480:hy.cl?340:0;
  if(hy.h&&hy.d<=HOSE*5){
   inc.relay=Math.min(4,Math.max(0,Math.ceil(hy.d/HOSE)-1));
   const g=need.find(g=>g.c.indexOf('11')>=0);if(g)g.n+=inc.relay}
  else{inc.tender=1;
   if(!need.some(g=>g.c.indexOf('61')>=0))need.push(G(['61'],1,'水庫車'))}}
 const flat=[];
 for(const g of inc.need){
  if(!g.k){flat.push(g);continue}
  const ov=(KITEM[k]&&KITEM[k][g.k])||g.items;
  const rows=mkItems(g.k,g.n,g.als,ov);
  for(const r of rows){
   const same=flat.find(x=>x.item===r.item);
   if(same)same.n=Math.max(same.n,r.n);else flat.push(r)}}
 if(flat.length)inc.need=flat;
 inc.calls=(function(){
  if(d.hoax||d.quiet)return 1;
  let n=1;
  if(d.fire)n=1+Math.round((o.pm.area||60)/80)+(o.pm.lvl||1);
  else if(k==='mci'||k==='aircraft'||k==='collapse'||k==='train'||k==='nursing')n=4+Math.floor(Math.random()*6);
  else if(d.police)n=1;
  else if(d.cls==='救護')n=1+(Math.random()<.3?1:0);
  else n=1+Math.floor(Math.random()*3);
  if(d.z==='hiway')n+=2;
  if(o.pm.trap)n+=1;
  return Math.max(1,Math.min(24,n))})();
 if(d.dlgm){
  const sc2=pick(d.dlgm);inc.pm.sc=sc2;
  if(sc2[2]>=0){inc.pm.cc=sc2[2];inc.pm.als=MED[sc2[2]].lv>=1;inc.pm.ohca=MED[sc2[2]].lv===2;
   if(MED[sc2[2]].dead){inc.pm.dead=1;inc.pm.als=false;inc.pm.ohca=false;inc.phs=PHX.doa.slice()}}
  if(sc2[3]==='fake'){inc.pm.fake=1;inc.dur=5;inc.pay=Math.round(inc.pay*.3);inc.need=inc.need.slice(0,1)}}
 else if(MCMAP[k]){
  const ci2=pick(MCMAP[k]),M2=MED[ci2];
  inc.pm.cc=ci2;inc.pm.als=M2.lv>=1;inc.pm.ohca=M2.lv===2}
 if(d.defl)inc.pm.special=Math.random()<.4;
 if(inc.pm.special&&(k==='bee'||k==='animal')){
  inc.nm=k==='bee'?'蜂螫傷救護':'動物咬傷救護';
  inc.need=[mkGroup('ems',1,0,['外傷急救包','生命徵象監視器（12 導程）','氧氣與甦醒球']),
   mkGroup('rescue',1,0,k==='bee'?['防蜂衣','捕蜂網具與伸縮桿']:['捕蛇夾與捕犬網','運輸籠'])];
  inc.phs=k==='bee'?PH.med.slice():['接觸傷患','評估過敏反應','傷處處置','動物移置','轉交救護'];
  if(k==='bee'){inc.pm.cc=35;inc.pm.als=true}
  inc.dur=Math.round(inc.dur*1.3);inc.pay=Math.round(inc.pay*2.2);inc.pen+=6}
 inc.max=inc.left;
 inc.log=mkLog(k,d,inc);
 if(inc.calls>=3){
  const extra=[['另一位民眾','我也要報案，'+inc.addr+'那邊'+(d.fire?(o.pm.area>=120?'在冒煙，火很大':'在冒煙，看得到火'):'出事了，很多人圍觀')],
   ['第三位民眾',(d.fire?(d.wild?'我看到山上火光很大，煙一直往這邊飄':'我看到火從屋頂竄出來，隔壁鄰居都跑出來了'):
    (d.med||d.trap||d.carry||inc.pm.cc!==undefined||inc.pm.trap>0)?'現場有人躺著，已經有人在幫忙了':'現場還沒有人來處理，你們派人了嗎')],
   ['路過民眾','我在對面，剛剛聽到很大的聲音，你們快一點']];
  const m=Math.min(extra.length,inc.calls>=6?3:inc.calls>=4?2:1);
  for(let i2=0;i2<m;i2++)
   inc.log.push({w:'民',s:'（'+extra[i2][0]+'）'+extra[i2][1],t:6+i2*5.5})}
 S.inc.push(inc)}
