// 戰略 AI：玩家在戰術畫面親自指揮時，代理勤務指揮中心的派遣、請求回覆、外部通報與公務勤務
'use strict';
let stratT=0;
function stratAI(dt){
 stratT-=dt;if(stratT>0)return;stratT=1.2;
 for(const inc of S.inc){if(inc.train)continue;   // 消防學校訓練案件不由戰略 AI 派遣
  const d=KIND[inc.k];
  // 現場請求一律同意（增派、位置確認）
  if(inc.req)answer(inc,true,false);
  if(inc.pm.ohca&&!inc.dai){inc.dai='cpr';
   inc.log.push({w:'台',s:'（AI 代理）請把他平放在硬地面，兩手壓在胸口正中央，跟著我的節奏用力壓。',t:S.t-inc.t0})}
  if(d.fire&&!inc.dai&&!d.wild&&!d.road){inc.dai='esc';
   inc.log.push({w:'台',s:'（AI 代理）請所有人往樓下或上風處疏散，低姿勢用濕毛巾摀住口鼻，不要搭電梯。',t:S.t-inc.t0})}
  if(d.pow&&inc.pow===0){inc.pow=1;inc.powT=30+Math.random()*30;
   radio(inc,'受理','（AI 代理）已通報台電，預估 '+Math.ceil(inc.powT)+' 秒完成斷電。')}
  if(d.pol&&inc.pol===0)callPol(inc);
  // 化災案件：通報環保署化災應變隊（加油站除外，多半不需要）
  if(EPA_K(inc.k)&&inc.k!=='gasstn'&&!inc.epa&&inc.rev)epaCall(inc,1);
  // 派遣：火警先派分級編組，其餘依需求補足（已派出未到的車也算在內，不會重複派）
  if(!onScene(inc).length&&d.cls==='火警'&&!d.wild&&!d.road&&!(inc.al|0)){sendLv(inc,(inc.calls||1)>=4?2:1);reindex()}
  auto(inc);reindex()}
 // 外縣市支援請求：轄區案件不多、待命車足夠時代為派遣
 for(const r of S.mr||[])if(!r.sent&&S.inc.length<=3&&mrPick(r)){mrSend(r);msg='（AI 代理）'+msg}
 // 公務勤務：指派最近的同車種待命車
 for(const dd of S.duties){
  if(dd.unit)continue;
  let best=null,bd=INF;
  for(const u of S.units){if(u.st!=='idle'||u.code!==dd.code)continue;
   const e=Math.abs(u.x-dd.x)+Math.abs(u.y-dd.y);if(e<bd){bd=e;best=u}}
  if(!best)continue;
  const p=chase(getF(dd,modeOf(best.code)),best);
  if(p){best.path=p;best.st='dgo';best.turn=5+Math.random()*4;best.duty=dd.id;best.inc=null;dd.unit=best.id;reindex()}}}
