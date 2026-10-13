// Cloudflare Worker: POST /log
// Set secrets NOTION_TOKEN and LOG_WRITE_KEY in Cloudflare, never in GitHub.
// Set variable NOTION_DATA_SOURCE_ID to the NEW GTD Work Log DB data source ID.
const ORIGIN = "https://owlleather1-tech.github.io";
const allowedHeaders = {"Access-Control-Allow-Origin":ORIGIN,"Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Allow-Headers":"Content-Type, Authorization","Vary":"Origin","Cache-Control":"no-store"};
function reply(body,status=200,originAllowed=false){return new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store",...(originAllowed?allowedHeaders:{})}})}
function safeEqual(a,b){if(typeof a!=="string"||typeof b!=="string")return false;const x=new TextEncoder().encode(a),y=new TextEncoder().encode(b);let v=x.length^y.length;for(let i=0;i<Math.max(x.length,y.length);i++)v|=(x[i]||0)^(y[i]||0);return v===0}
export default {async fetch(req,env){
 const origin=req.headers.get("Origin"),originAllowed=origin===ORIGIN;
 if(req.method==="OPTIONS")return originAllowed?new Response(null,{status:204,headers:allowedHeaders}):reply({error:"Forbidden origin"},403);
 if(new URL(req.url).pathname!=="/log")return reply({error:"Not found"},404,originAllowed);
 if(req.method!=="POST")return reply({error:"Method not allowed"},405,originAllowed);
 if(!originAllowed)return reply({error:"Forbidden origin"},403);
 if(!env.NOTION_TOKEN||!env.LOG_WRITE_KEY||!env.NOTION_DATABASE_ID)return reply({error:"Server not configured"},503,true);
 const auth=req.headers.get("Authorization")||"";
 if(!safeEqual(auth,"Bearer "+env.LOG_WRITE_KEY))return reply({error:"Unauthorized"},401,true);
 const len=Number(req.headers.get("Content-Length")||0);if(len>8192)return reply({error:"Payload too large"},413,true);
 let d;try{d=await req.json()}catch{return reply({error:"Invalid JSON"},400,true)}
 const task=String(d.task||"").trim().slice(0,150),note=String(d.note||"").slice(0,1900),url=String(d.taskUrl||"").trim();
 const start=new Date(d.start),end=new Date(d.end),minutes=Number(d.minutes);
 if(!task||!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime())||end<start||!Number.isFinite(minutes)||minutes<0||minutes>1440||Math.abs((end-start)/60000-minutes)>2)return reply({error:"Invalid work log"},400,true);
 if(url&&(!/^https:\/\/(www\.)?notion\.so\//i.test(url)&&!/^https:\/\/[^/]+\.notion\.site\//i.test(url)))return reply({error:"Invalid Notion URL"},400,true);
 const props={"作業名":{"title":[{"text":{"content":task}}]},"開始日時":{"date":{"start":start.toISOString()}},"終了日時":{"date":{"start":end.toISOString()}},"作業時間（分）":{"number":Math.round(minutes*100)/100},"再開メモ":{"rich_text":note?[{"text":{"content":note}}]:[]},"関連タスクURL":{"url":url||null}};
 try{
 const res=await fetch("https://api.notion.com/v1/pages",{method:"POST",headers:{"Authorization":"Bearer "+env.NOTION_TOKEN,"Notion-Version":"2022-06-28","Content-Type":"application/json"},body:JSON.stringify({parent:{database_id:env.NOTION_DATABASE_ID},properties:props})});
 if(!res.ok)return reply({error:"Notion write failed",status:res.status},502,true);
 const obj=await res.json();return reply({ok:true,id:obj.id},201,true);
 }catch{return reply({error:"Upstream unavailable"},502,true)}
}};