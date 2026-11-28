// 追加案類、階段表修正、各區域案件池 POOL
'use strict';
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
  base:[G(['51','01'],1,'化災車'),G(['11','16'],2,'幫浦車'),G(['91'],2,'救護 BLS'),G(['41'],1,'指揮車'),GB('detect',1),GB('vent',1)],dur:14,pay:1800,pen:14,q:'有沒有人吸入或接觸到？藥劑標示是什麼？',
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
 // 鄉間：沿用市區案類，但去掉高樓、百貨、捷運等都會型案件，加入雜草火與鐵皮屋
 const NORURAL=['hifire','skyscraper','deptfire','hospfire','transit','crowd','lonewolf','sinkhole','chemfire','majorind','poolgas','polsta','tactical','armedfight','schoollab'];
 // 工業區：化工、工廠、工安、儲槽與管線相關案件
 const IND=['chemfire','fact','majorind','warehouse','tanker','gas','gasblast','confined','fall','machine','electro','burn','hazmat','fact','chemfire','ems','ems'];
 POOL.industry=[];POOLB.industry=[];
 for(let lv=0;lv<=3;lv++){const ok=k=>KIND[k]&&KIND[k].lv<=lv;POOL.industry[lv]=IND.filter(ok);POOLB.industry[lv]=IND.filter(k=>ok(k)&&!KIND[k].big);
  if(!POOL.industry[lv].length)POOL.industry[lv]=['ems'];if(!POOLB.industry[lv].length)POOLB.industry[lv]=['ems']}
 POOL.rural=[];POOLB.rural=[];
 for(let lv=0;lv<=3;lv++){const f=k=>NORURAL.indexOf(k)<0,add=['grassfire','grassfire','tinfire','ems','moto'];
  POOL.rural[lv]=POOL.city[lv].filter(f).concat(add);POOLB.rural[lv]=POOLB.city[lv].filter(f).concat(add)}
})();
