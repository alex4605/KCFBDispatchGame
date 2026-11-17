// AI 通話：由 AI（Anthropic Claude 或 Google Gemini）扮演報案人即時回答受理員；連不上或出錯時退回 incidents.js 的腳本對話（備援）
'use strict';
const AI_STORE='kcfd.ai';
const AI_SLOW=2.5; // AI 模式下案件進線間隔的倍率：受理員要打字問話，案件來得慢一些
const AI_MODELS=[['claude-opus-5-5','Claude Opus 5.5（預設）'],['claude-sonnet-5-5','Claude Sonnet 5.5'],
 ['claude-haiku-5-5','Claude Haiku 5.5（最快、最省）'],['claude-fable-5-2','Claude Fable 5.2']];
// 供應商：各自的金鑰、模型與 API 主機
const AI_PROV={anthropic:{n:'Anthropic Claude',host:'api.anthropic.com',ph:'sk-ant-…',def:AI_MODELS[0][0]},
 gemini:{n:'Google Gemini',host:'generativelanguage.googleapis.com',ph:'AIza…',def:'gemini-4-hydrogen'}};
const AI={on:false,provider:'anthropic',keys:{anthropic:'',gemini:''},models:{anthropic:AI_PROV.anthropic.def,gemini:AI_PROV.gemini.def},
 gmodels:[],note:'',fails:0,status:'',testing:false,open:false};
(function(){
 try{const o=JSON.parse(localStorage.getItem(AI_STORE)||'{}');
  if(typeof o.key==='string')AI.keys.anthropic=o.key; // 舊版只有單一金鑰
  if(AI_MODELS.some(m=>m[0]===o.model))AI.models.anthropic=o.model;
  if(o.keys)for(const k in AI.keys)if(typeof o.keys[k]==='string')AI.keys[k]=o.keys[k];
  if(o.models){if(AI_MODELS.some(m=>m[0]===o.models.anthropic))AI.models.anthropic=o.models.anthropic;
   // 'gemini-2.5-flash' 是舊版的預設值，沒改過的人直接換成新的預設
   if(typeof o.models.gemini==='string'&&o.models.gemini&&o.models.gemini!=='gemini-2.5-flash')AI.models.gemini=o.models.gemini}
  if(AI_PROV[o.provider])AI.provider=o.provider;
  AI.on=!!(o.on&&AI.keys[AI.provider])}catch(e){}})();
function aiSave(){try{localStorage.setItem(AI_STORE,JSON.stringify({on:AI.on,provider:AI.provider,keys:AI.keys,models:AI.models}))}catch(e){}}
const aiKey=()=>AI.keys[AI.provider];
const aiActive=()=>AI.on&&!!aiKey();
// 這通電話還能不能繼續問：尚未轉備援、未結束、消防人員還沒到場
const aiLive=inc=>!!inc.ai&&!inc.ai.fb&&!inc.ai.done&&!inc.rev;

// 直接從瀏覽器呼叫供應商的 API。不載入任何第三方程式庫，金鑰只會送到該供應商的主機。
async function aiFetch(url,opt){
 const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),30000);
 try{return await fetch(url,Object.assign({signal:ctl.signal},opt))}
 catch(e){throw new Error(e&&e.name==='AbortError'?'連線逾時':'無法連線到 API')}
 finally{clearTimeout(timer)}}
async function aiHttpError(res){
 let m='';try{m=(await res.json()).error.message||''}catch(e){}
 const badKey=res.status===401||/API key/i.test(m);
 const err=new Error(badKey?'API 金鑰無效':res.status===403?'金鑰沒有使用權限':res.status===404?'找不到這個模型（代號可能不對）':
  res.status===429?'已達用量或頻率上限':res.status>=500?'API 暫時無法服務':(m||'HTTP '+res.status));
 err.status=badKey?401:res.status;return err}
function aiRequest(system,messages){return AI.provider==='gemini'?aiGemini(system,messages):aiClaude(system,messages)}
async function aiClaude(system,messages){
 const model=AI.models.anthropic;
 const headers={'content-type':'application/json','x-api-key':AI.keys.anthropic,'anthropic-version':'2026-10-21',
  'anthropic-dangerous-direct-browser-access':'true'};
 const body={model,max_tokens:2048,system,messages,output_config:{effort:'low'}};
 // 安全分類器拒答時由伺服器改用其他模型重跑（Haiku 不支援此參數）
 if(model!=='claude-haiku-5-5'){headers['anthropic-beta']='server-side-fallback-2026-07-01';body.fallbacks='default'}
 const res=await aiFetch('https://api.anthropic.com/v1/messages',{method:'POST',headers,body:JSON.stringify(body)});
 if(!res.ok)throw await aiHttpError(res);
 const data=await res.json();
 if(data.stop_reason==='refusal')throw new Error('模型拒絕回應這段對話');
 const text=(data.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('').trim();
 if(!text)throw new Error('模型沒有回應內容');
 return text}
const AI_GURL='https://generativelanguage.googleapis.com/v1beta/';
async function aiGemini(system,messages,retried){
 const body={systemInstruction:{parts:[{text:system}]},
  contents:messages.map(m=>({role:m.role==='assistant'?'model':'user',parts:[{text:m.content}]})),
  generationConfig:{maxOutputTokens:2048}};
 const res=await aiFetch(AI_GURL+'models/'+encodeURIComponent(AI.models.gemini)+':generateContent',{method:'POST',
  headers:{'content-type':'application/json','x-goog-api-key':AI.keys.gemini},body:JSON.stringify(body)});
 if(!res.ok){
  const err=await aiHttpError(res);
  // 404 代表模型代號不存在：查一次可用清單，自動換成最接近的模型後重試
  if(err.status===404&&!retried){
   const old=AI.models.gemini;
   try{await aiGeminiModels()}catch(e){throw err}
   if(aiGeminiPick()&&AI.models.gemini!==old){aiSave();aiPanel();msg=AI.note;mt=0;return aiGemini(system,messages,true)}}
  throw err}
 const data=await res.json(),c=(data.candidates||[])[0];
 // 內部思考段落（thought）不算報案人說的話
 const text=c&&c.content&&c.content.parts?c.content.parts.filter(x=>x.text&&!x.thought).map(x=>x.text).join('').trim():'';
 if(!text){
  if((data.promptFeedback&&data.promptFeedback.blockReason)||(c&&/SAFETY|PROHIBITED|BLOCKLIST|RECITATION|SPII/.test(c.finishReason||'')))throw new Error('模型拒絕回應這段對話');
  throw new Error('模型沒有回應內容')}
 return text}
// 向 Gemini 查詢這把金鑰可用的對話模型，供設定面板的模型欄位提示
async function aiGeminiModels(){
 const res=await aiFetch(AI_GURL+'models?pageSize=200',{headers:{'x-goog-api-key':AI.keys.gemini}});
 if(!res.ok)throw await aiHttpError(res);
 const data=await res.json();
 AI.gmodels=(data.models||[]).filter(m=>(m.supportedGenerationMethods||[]).indexOf('generateContent')>=0&&/gemini/.test(m.name))
  .map(m=>String(m.name).replace(/^models\//,'')).sort()}

// 報案人只知道自己看得到的事：以案件的真實參數加上備援腳本裡報案人的台詞當作依據
function aiSystem(inc,script){
 const d=KIND[inc.k],p=inc.pm,F=[];
 F.push('事件：'+(inc.nm||d.n)+'（'+d.cls+'類）');
 F.push('地點：'+inc.addr+(inc.z==='hiway'?'（國道上）':inc.z==='forest'?'（山區產業道路旁）':inc.z==='water'?'（水岸邊）':''));
 if(d.fire){
  F.push('火勢：'+(p.area<80?'範圍不大，約一個房間或一小片':p.area<180?'已經燒開，約一整層或一大片':'非常大，快要波及旁邊'));
  F.push(p.trap>0?'還有 '+p.trap+' 個人沒有出來':'沒有人受困，人都已經離開');
  if(p.stab==='低')F.push('建物看起來不穩，有東西掉落')}
 else if(p.trap>0)F.push('受困或受傷人數：'+p.trap+' 人');
 if(p.cc!==undefined&&MED[p.cc]){const M=MED[p.cc];
  F.push('傷病患狀況（你用一般人的說法描述，不懂醫學名詞）：'+M.a+'；'+M.b);
  if(p.dead)F.push('人已經冰冷僵硬、叫不醒，你其實心裡有數');
  else if(p.ohca)F.push('人已經沒有反應、沒有呼吸')}
 if(d.hoax)F.push(p.mal?'這其實是惡作劇謊報：你說不出具體細節，被追問就支支吾吾、前後不一，或想掛電話':
  '這其實是善意誤報：你沒有親眼確認，只是看到或聽到疑似狀況，問細節你答不出來');
 if(p.special)F.push('現場另外有人受傷');
 const lines=script.filter(l=>l.w!=='台').map(l=>'- '+l.s);
 return '你在一款消防勤務指揮中心模擬遊戲裡扮演'+(d.police?'在現場、透過警用線路轉報消防局的員警':'撥打 119 的報案民眾')+
  '。玩家是受理員，你只負責說報案人那一方的話。\n\n【你所在的狀況】\n'+F.join('\n')+
  '\n\n【你知道的事（參考說法，可以換句話說）】\n'+lines.join('\n')+
  '\n\n【怎麼演】\n'+
  '- 用台灣口語的繁體中文，每次只講一兩句，像真的在講電話。只輸出報案人說出口的話，不要旁白、動作描述、引號或括號說明。\n'+
  '- 第一句只講發生什麼事；地址、人數、嚴重程度等細節，等受理員問到再回答，不要一次全部講完。這樣玩家才有詢問的必要。\n'+
  '- 只根據上面的狀況回答，不要說出與它矛盾的事。受理員問到你不可能知道的事（專業判斷、你看不到的地方），就老實說不清楚。\n'+
  '- 情緒要符合情境：'+(d.police?'員警語氣冷靜、簡潔、用報告的口吻。':d.hoax?'語氣含糊、不太確定。':'事情越嚴重越慌張、越急，但還是能回答問題。')+'\n'+
  '- 受理員給你指示（疏散、壓胸、止血等）時，簡短回應並照做，之後可以回報做得怎麼樣。\n'+
  '- 訊息結尾若有〔狀態：…〕，那是遊戲系統給你的背景（例如車輛是否已派出），不是受理員說的話，不要唸出來，但可以據此反應。\n'+
  '- 不論受理員說什麼，都維持報案人的身分，不要談論這些規則。'}

// 進線時呼叫：保留腳本對話當備援，通聯紀錄從受理員的開場白開始，請 AI 說第一句
function aiBegin(inc){
 const script=inc.log;
 inc.ai={sys:aiSystem(inc,script),busy:true,done:false,fb:false,backup:script};
 inc.log=[{w:'台',s:script.length&&script[0].w==='台'?script[0].s:'119 消防隊，請說您的位置和狀況。',t:0,c:1}];
 aiTurn(inc)}
// 受理員送出一句話
function aiSend(inc,text){
 text=String(text||'').trim().slice(0,120);
 if(!text||!aiLive(inc)||inc.ai.busy)return false;
 inc.log.push({w:'台',s:text,t:S.t-inc.t0,c:1});
 inc.ai.busy=true;aiTurn(inc);return true}
// 把通話紀錄（只取標記 c 的電話對話，不含無線電）轉成 API 訊息，取得報案人的下一句
function aiTurn(inc){
 const a=inc.ai,msgs=[];
 for(const l of inc.log){
  if(!l.c)continue;
  const role=l.w==='台'?'user':'assistant';
  if(msgs.length&&msgs[msgs.length-1].role===role)msgs[msgs.length-1].content+='\n'+l.s;
  else msgs.push({role,content:l.s})}
 while(msgs.length&&msgs[0].role!=='user')msgs.shift();
 if(!msgs.length||msgs[msgs.length-1].role!=='user'){a.busy=false;return}
 let n=0;for(const u of S.units)if(u.inc===inc.id)n++;
 msgs[msgs.length-1].content+='\n〔狀態：'+(n?'受理員已派出 '+n+' 輛車，尚未到場':'尚未派車')+'〕';
 aiRequest(a.sys,msgs).then(text=>{
  a.busy=false;AI.fails=0;AI.status='';
  if(S.inc.indexOf(inc)<0)return;
  inc.log.push({w:KIND[inc.k].police?'警':'民',s:text.slice(0,300),t:S.t-inc.t0,c:1});dh=''
 }).catch(e=>{a.busy=false;aiFail(inc,e)})}
// 出錯：這通電話改用腳本；金鑰無效或連續失敗就整個關閉 AI 模式（案件頻率也回到原本）
function aiFail(inc,e){
 AI.fails++;AI.status=e.message;
 if(e.status===401||e.status===403||AI.fails>=2){
  AI.on=false;aiSave();aiPanel();
  msg='AI 通話已停用（'+e.message+'），改用備援對話系統';mt=0}
 else{msg='AI 通話失敗（'+e.message+'），本案改用備援對話';mt=0}
 aiFallback(inc);dh=''}
// 接上備援腳本：還沒講到話就整段照腳本播，已經講過則註明後接續剩下的台詞
function aiFallback(inc){
 const a=inc.ai;if(!a||a.fb)return;
 a.fb=true;a.done=true;
 if(S.inc.indexOf(inc)<0)return;
 const el=S.t-inc.t0,talked=inc.log.filter(l=>l.c).length>1;
 if(!talked)inc.log=inc.log.filter(l=>!l.c);
 else inc.log.push({w:'台',s:'（AI 通話中斷，以下由備援對話系統接續）',t:el});
 const rest=talked?a.backup.slice(1):a.backup;
 rest.forEach((l,i)=>inc.log.push({w:l.w,s:l.s,t:el+(i+(talked?1:0))*2.4}))}

// 設定的模型不在可用清單裡時，改用最接近的：名稱含原代號者優先，其次 flash 系列，再不然取第一個
function aiGeminiPick(){
 const L=AI.gmodels,cur=AI.models.gemini;
 if(!L.length||L.indexOf(cur)>=0)return false;
 const near=L.filter(m=>m.indexOf(cur)>=0||cur.indexOf(m)>=0).sort((a,b)=>a.length-b.length);
 AI.models.gemini=near[0]||L.find(m=>/flash/.test(m)&&!/image|tts|audio|live|embedding/.test(m))||L[0];
 AI.note='模型「'+cur+'」不在這把金鑰可用的清單裡，已改用「'+AI.models.gemini+'」';
 return true}
// ---- 設定面板 ----
function aiPanel(){
 const p=document.getElementById('aipanel'),b=document.getElementById('btnAI');
 if(b){b.textContent='AI 通話：'+(aiActive()?'開':'關');b.classList.toggle('on',aiActive())}
 if(!p)return;
 p.classList.toggle('open',AI.open);
 if(!AI.open)return;
 const P=AI_PROV[AI.provider];
 p.innerHTML='<div class="row" style="padding:0"><span class="hd" style="margin:0">AI 通話設定</span><button data-aiclose="1">關閉</button></div>'+
  '<p>開啟後，新進線的電話由 AI 扮演報案人：你在通聯紀錄下方打字詢問，報案人依案件實況回答。'+
  '原本的腳本對話會保留作為備援，連不上或出錯時自動接手。AI 模式下案件進線間隔拉長為 '+AI_SLOW+' 倍。</p>'+
  '<label for="aiprov">AI 供應商</label><select id="aiprov">'+Object.keys(AI_PROV).map(k=>'<option value="'+k+'"'+(k===AI.provider?' selected':'')+'>'+AI_PROV[k].n+'</option>').join('')+'</select>'+
  '<label for="aikey">'+P.n+' API 金鑰</label><input id="aikey" type="password" autocomplete="off" placeholder="'+P.ph+'" value="'+esc(aiKey())+'">'+
  '<label for="aimodel">模型</label>'+(AI.provider==='gemini'?
   (AI.gmodels.length?
    '<select id="aimodel">'+AI.gmodels.map(m=>'<option value="'+esc(m)+'"'+(m===AI.models.gemini?' selected':'')+'>'+esc(m)+'</option>').join('')+'</select>'+
    '<p>以上是這把金鑰實際可用的模型。</p>':
    '<input id="aimodel" autocomplete="off" placeholder="'+P.def+'" value="'+esc(AI.models.gemini)+'">'+
    '<p>請先按「測試連線」：會列出這把金鑰可用的模型，代號不對時自動改選。</p>'):
   '<select id="aimodel">'+AI_MODELS.map(m=>'<option value="'+m[0]+'"'+(m[0]===AI.models.anthropic?' selected':'')+'>'+m[1]+'</option>').join('')+'</select>')+
  '<div class="row" style="justify-content:flex-start;gap:6px;margin-top:10px">'+
  '<button data-aitoggle="1"'+(aiActive()?' class="on"':'')+'>'+(aiActive()?'關閉 AI 通話':'啟用 AI 通話')+'</button>'+
  '<button data-aitest="1"'+(AI.testing?' disabled':'')+'>'+(AI.testing?'測試中…':'測試連線')+'</button>'+
  '<button data-aiclear="1">清除金鑰</button></div>'+
  '<div class="err" style="margin-top:6px;color:'+(AI.status==='連線正常'?'var(--grn)':'var(--red)')+'">'+esc(AI.status)+'</div>'+
  (AI.note?'<p style="color:var(--amb)">'+esc(AI.note)+'</p>':'')+
  '<p>金鑰只存在這台瀏覽器的 localStorage，只會送往 '+P.host+'；每次問答都會依你在該供應商的帳號用量計費。請勿在公用電腦上儲存金鑰。</p>'}
function aiReadForm(){
 const k=document.getElementById('aikey'),m=document.getElementById('aimodel');
 if(k)AI.keys[AI.provider]=k.value.trim();
 if(m){const v=m.value.trim();
  if(AI.provider==='gemini')AI.models.gemini=v.replace(/^models\//,'')||AI_PROV.gemini.def;
  else if(AI_MODELS.some(x=>x[0]===v))AI.models.anthropic=v}}
document.getElementById('btnAI').onclick=()=>{AI.open=!AI.open;aiPanel()};
document.getElementById('aipanel').addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 const D=b.dataset;
 if(D.aiclose){aiReadForm();aiSave();AI.open=false}
 else if(D.aitoggle){aiReadForm();
  if(aiActive())AI.on=false;
  else if(!aiKey())AI.status='請先輸入 API 金鑰';
  else{AI.on=true;AI.fails=0;AI.status=''}
  aiSave()}
 else if(D.aiclear){AI.keys[AI.provider]='';AI.on=false;AI.status='';aiSave()}
 else if(D.aitest){aiReadForm();
  if(!aiKey())AI.status='請先輸入 API 金鑰';
  else{AI.testing=true;AI.status='';AI.note='';
   (AI.provider==='gemini'?aiGeminiModels().then(aiGeminiPick):Promise.resolve()).then(()=>aiRequest('這是連線測試。',[{role:'user',content:'請只回覆「OK」兩個字母。'}]))
    .then(()=>{AI.status='連線正常'}).catch(err=>{AI.status='連線失敗：'+err.message})
    .then(()=>{AI.testing=false;aiSave();aiPanel()})}}
 aiPanel()});
// 切換供應商：先存下目前欄位，再換成另一家的金鑰與模型；未填金鑰則關閉 AI 模式
document.getElementById('aipanel').addEventListener('change',e=>{
 if(e.target.id!=='aiprov'||!AI_PROV[e.target.value])return;
 aiReadForm();AI.provider=e.target.value;AI.status='';AI.fails=0;
 if(!aiKey())AI.on=false;
 aiSave();aiPanel()});
// ---- 通話輸入 ----
function aiSubmit(){
 const el=document.getElementById('aiq'),inc=S.inc.find(x=>x.id===sel);
 if(!el||!inc)return;
 if(aiSend(inc,el.value)){el.value='';dh=''}}
document.body.addEventListener('click',e=>{if(e.target.closest('[data-aisend]'))aiSubmit()});
document.body.addEventListener('keydown',e=>{
 // 輸入法選字中的 Enter 不送出
 if(e.target.id==='aiq'&&e.key==='Enter'&&!e.isComposing&&e.keyCode!==229){e.preventDefault();aiSubmit()}});
aiPanel();
