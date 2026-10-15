// Cloudflare Worker for the new GTD Task DB.
// Keep NOTION_TOKEN and LOG_WRITE_KEY server-side.
const ORIGIN = "https://owlleather1-tech.github.io";
const DATA_SOURCE_ID = "faf488e6-adf6-4b4b-ab4d-b07ca58ae4c8";
const allowedHeaders = {"Access-Control-Allow-Origin":ORIGIN,"Access-Control-Allow-Methods":"GET, POST, OPTIONS","Access-Control-Allow-Headers":"Content-Type, Authorization, CF-Access-Jwt-Assertion","Access-Control-Allow-Credentials":"true","Vary":"Origin","Cache-Control":"no-store"};
function reply(body,status=200,originAllowed=false){return new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store",...(originAllowed?allowedHeaders:{})}})}
function safeEqual(a,b){if(typeof a!=="string"||typeof b!=="string")return false;const x=new TextEncoder().encode(a),y=new TextEncoder().encode(b);let v=x.length^y.length;for(let i=0;i<Math.max(x.length,y.length);i++)v|=(x[i]||0)^(y[i]||0);return v===0}
function textProp(p){return p?.title?.map(x=>x.plain_text||x.text?.content||'').join('')||p?.rich_text?.map(x=>x.plain_text||x.text?.content||'').join('')||''}
function pageUrl(id){return `https://www.notion.so/${String(id).replaceAll('-','')}`}
function pageId(value){const m=String(value||'').match(/[0-9a-f]{32}/i);return m?m[0]:String(value||'').replaceAll('-','')}
async function notion(env,path,init={}){return fetch(`https://api.notion.com/v1${path}`,{...init,headers:{Authorization:`Bearer ${env.NOTION_TOKEN}`,"Notion-Version":"2026-03-11","Content-Type":"application/json",...(init.headers||{})}})}
function authOk(req,env){if(env.LOG_WRITE_KEY){const h=req.headers.get('Authorization')||'';return safeEqual(h,'Bearer '+env.LOG_WRITE_KEY)}return Boolean(req.headers.get('CF-Access-Jwt-Assertion'))}
export default {async fetch(req,env){
 const origin=req.headers.get('Origin'),originAllowed=origin===ORIGIN;
 if(req.method==='OPTIONS')return originAllowed?new Response(null,{status:204,headers:allowedHeaders}):reply({error:'Forbidden origin'},403);
 const url=new URL(req.url);if(!['/tasks','/log'].includes(url.pathname))return reply({error:'Not found'},404,originAllowed);
 if(!originAllowed)return reply({error:'Forbidden origin'},403);if(!env.NOTION_TOKEN||!env.NOTION_DATABASE_ID)return reply({error:'Server not configured'},503,true);if(!authOk(req,env))return reply({error:'Authentication required'},401,true);
 if(req.method==='GET'&&url.pathname==='/tasks'){
  const limit=Math.min(Math.max(Number(url.searchParams.get('limit')||50),1),100);const res=await notion(env,`/data_sources/${DATA_SOURCE_ID}/query`,{method:'POST',body:JSON.stringify({page_size:limit,filter:{property:'進行状況',status:{does_not_equal:'完了'}},sorts:[{property:'予定日',direction:'ascending'}]})});
  if(!res.ok)return reply({error:'Notion query failed',status:res.status},502,true);const data=await res.json();return reply({tasks:(data.results||[]).map(p=>({id:p.id,title:textProp(p.properties?.['タスク名'])||'無題のタスク',url:p.url||pageUrl(p.id),status:p.properties?.['進行状況']?.status?.name||'',minutes:p.properties?.['所要時間（分）']?.number||0,next:textProp(p.properties?.['再開メモ'])}))},200,true)
 }
 if(req.method!=='POST')return reply({error:'Method not allowed'},405,true);const len=Number(req.headers.get('Content-Length')||0);if(len>8192)return reply({error:'Payload too large'},413,true);let d;try{d=await req.json()}catch{return reply({error:'Invalid JSON'},400,true)};
 const id=pageId(d.taskId||d.taskUrl),task=String(d.task||'').trim().slice(0,160),note=String(d.note||'').trim().slice(0,500),urlValue=String(d.taskUrl||'').trim();const start=new Date(d.start),end=new Date(d.end),minutes=Number(d.minutes);
 if(!id||!task||!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime())||end<start||!Number.isFinite(minutes)||minutes<0||minutes>1440||Math.abs((end.getTime()-start.getTime())/60000-minutes)>2)return reply({error:'Invalid work log'},400,true);
 if(urlValue&&(!/^https:\/\/(www\.)?notion\.so\//i.test(urlValue)&&!/^https:\/\/[^/]+\.notion\.site\//i.test(urlValue)))return reply({error:'Invalid Notion URL'},400,true);
 const existing=await notion(env,`/pages/${id}`);if(!existing.ok)return reply({error:'Task not found',status:existing.status},404,true);const page=await existing.json(),props=page.properties||{};const oldMinutes=Number(props['所要時間（分）']?.number||0);const oldNote=textProp(props['再開メモ']);const stamp=end.toISOString().replace('T',' ').replace(/\.\d{3}Z$/,' UTC');const entry=`[集中タイマー ${stamp}] ${Math.round(minutes*100)/100}分${note?` / ${note}`:''}`;const combined=[entry,oldNote].filter(Boolean).join('\n').slice(0,1900);
 const update={properties:{'所要時間（分）':{number:Math.round((oldMinutes+minutes)*100)/100},'再開メモ':{rich_text:combined?[{text:{content:combined}}]:[]}}};if(props['進行状況']?.status?.name&&props['進行状況'].status.name!=='完了')update.properties['進行状況']={status:{name:'進行中'}};
 const saved=await notion(env,`/pages/${id}`,{method:'PATCH',body:JSON.stringify(update)});if(!saved.ok)return reply({error:'Notion update failed',status:saved.status},502,true);return reply({ok:true,id},201,true)
 }};

