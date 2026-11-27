// 案件生成：災情參數、報案對話
'use strict';
function nearHyd(inc){
 const f=getF(inc,0);let b=null,bd=INF;
 for(const h of S.hyd){const d=f.D[K(h[0],h[1])];if(d<bd){bd=d;b=h}}
 if(!b)return{h:null,d:999,p:null,cl:0};
 let k=K(b[0],b[1]);const p=[];while(f.P[k]>=0){k=f.P[k];const c=k%NN;p.push([(c/N)|0,c%N])}
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
 return inCity(x,y)?'city':'rural'}
