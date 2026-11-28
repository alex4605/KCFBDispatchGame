// 水庫車（61）循環送水：現場沒有可用消防栓時，第一輛水庫車到場架設移動式水槽（6 噸），
// 水庫車把水卸進水槽後空車回最近的消防栓補水，再滿載回來卸水，多輛輪替；攻擊幫浦車由水槽吸水。
// 供水量取決於水庫車數量與往返時間（距離、補水、卸水），跟不上用水量時水槽見底就斷水
'use strict';
const DK_CAP=6000,DK_DUMP=250,DK_SET=20;
const tenderOn=inc=>!!(inc.tender&&!inc.shuttle);
// 指派給本案件的水庫車（在場、往返補水中、前往中）
function tenderUnits(inc){return S.units.filter(u=>u.code==='61'&&!u.gone&&(u.inc===inc.id||u.back===inc.id)&&u.st!=='idle'&&u.st!=='oos')}
// 補水點距離（格）：最近的消防栓
function tenderDist(inc){
 if(inc.tdist!==undefined)return inc.tdist;let bd=1e9;
 for(const h of S.hyd||[]){const d=Math.abs(h[0]-inc.x)+Math.abs(h[1]-inc.y);if(d<bd)bd=d}
 return inc.tdist=bd<1e9?bd:30}
// 一輛水庫車循環一趟的時間（秒）：往返行車＋補水＋卸水＋接管
function tenderCycle(inc){const cap=CODE['61'].cap,leg=tenderDist(inc)/(CODE['61'].s*.95);return 2*leg+cap/FILLRATE+cap/DK_DUMP+10}
// 循環送水可持續的供水量（L/s）
function tenderRate(inc){return tenderUnits(inc).length*CODE['61'].cap/tenderCycle(inc)}
// 每幀：架設水槽、在場的水庫車卸水
function tenderStep(inc,dt,first){
 if(!tenderOn(inc))return;
 const T=inc.dk||(inc.dk={v:0,cap:DK_CAP,set:0,on:0});
 const tks=onScene(inc).filter(u=>u.st==='work'&&u.code==='61');
 if(!T.on){if(!tks.length)return;T.set+=dt;
  if(T.set>=DK_SET){T.on=1;radio(inc,tks[0].cs,'移動式水槽（6 噸）架設完成，水庫車開始卸水，幫浦車由水槽吸水。')}
  return}
 // 卸水口一次一輛：正在卸的先卸完，其餘排隊（往返因此自然錯開，不會同時離開造成斷水）
 const room=T.cap-T.v,full=tks.filter(u=>u.tank>60);
 const cur=full.find(u=>u.dump)||full.sort((a,b)=>a.tank-b.tank)[0];
 for(const u of tks)if(u!==cur)u.dump=0;
 if(!cur||room<=0){if(cur)cur.dump=0;return}
 const d=Math.min(cur.tank,DK_DUMP*dt,room);cur.tank-=d;T.v+=d;cur.dump=1;
 if(!cur.dmpM){cur.dmpM=1;radio(inc,cur.cs,'卸水至移動式水槽（'+Math.round(cur.tank/1000)+' 噸）。')}}
// 幫浦車由水槽吸水：回傳本秒實際供水量（L/s）；水槽有餘時也補滿幫浦車水箱
function tenderFeed(inc,use,dt){
 const T=inc.dk;if(!T||!T.on)return 0;
 const give=Math.min(use*dt,T.v);T.v-=give;
 const tp=tankPool(inc),room=tp[1]-tp[0];
 if(T.v>0&&room>0){const add=Math.min(T.v,LPS*dt,room);T.v-=add;fillTanks(inc,add)}
 // 供水跟不上：請求加派水庫車（同時最多 5 輛）
 const rate=tenderRate(inc),n=tenderUnits(inc).length;
 if(use>0&&rate<use*.85&&T.v<T.cap*.5&&n<5&&!inc.req&&!(T.rq>S.t)){T.rq=S.t+120;
  inc.req={t:'need',s:'循環送水跟不上用水量（水庫車 '+n+' 輛約可供 '+Math.round(rate)+' L/s，用水 '+Math.round(use)+' L/s），請求加派水庫車一輛。',c:'61',als:0,cs:'水源組'};inc.reqT=22}
 return give/dt}
// 水庫車狀態文字（面板）
function tenderState(inc,u){
 if(u.st==='work')return!(inc.dk&&inc.dk.on)?'架設移動式水槽':u.dump?'卸水中':u.tank<=60?'卸完、準備回程':inc.dk.v>=inc.dk.cap-50?'待卸水（水槽滿）':'排隊卸水';
 if(u.st==='fill')return'空車回程補水';if(u.st==='filling')return'補水中 '+Math.round(u.tank/CODE[u.code].cap*100)+'%';
 if(u.st==='go')return u.rtn?'滿載返回':'前往現場';return ST[u.st]?ST[u.st][0]:u.st}
function tenderHTML(inc,cls){
 if(!tenderOn(inc))return'';const T=inc.dk||{v:0,cap:DK_CAP,on:0},us=tenderUnits(inc),rate=Math.round(tenderRate(inc));
 const row=(a,b)=>'<div class="'+(cls||'row')+'"><span>'+a+'</span><span>'+b+'</span></div>';
 let h=row('循環送水','<span title="補水點（最近的消防栓）距離 '+tenderDist(inc)+' 格；每趟＝往返行車＋補水＋卸水">'+us.length+' 輛 · 每趟 '+fmt(tenderCycle(inc))+' · 約 '+rate+' L/s</span>');
 h+=row('移動式水槽',T.on?Math.round(T.v/100)/10+' / '+T.cap/1000+' 噸 <span class="tbar"><i style="width:'+Math.round(T.v/T.cap*100)+'%;background:'+(T.v<T.cap*.25?'var(--red)':'var(--blu)')+'"></i></span>':'<b style="color:var(--amb)">'+(us.some(u=>u.st==='work')?'架設中':'等水庫車到場架設')+'</b>');
 for(const u of us)h+=row('　'+u.cs,tenderState(inc,u)+' · '+Math.round(u.tank/1000*10)/10+' 噸');
 return h}
