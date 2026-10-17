import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import {createHash,randomUUID} from 'node:crypto';
import {buildDigest, selectDigest, createNewsletterHandler, APP_URL} from '../netlify/functions/lib/newsletter.mjs';

const NOW=Date.parse('2026-10-17T13:05:00Z');
const article=(id,extra={})=>({id,title:`AI launch ${id}`,url:`https://example.com/${id}`,source:`Publisher ${id}`,publishedAt:new Date(NOW-1000).toISOString(),category:'news',summary:'Publisher excerpt.',...extra});
test('morning briefing enforces exact freshness, deduplication, publisher diversity, section coverage, safe HTML and original links',()=>{
  const values=['news','technical','clinical','tools','geopolitical'].map((category,index)=>article(String(index),{category}));
  values.push(article('old',{publishedAt:new Date(NOW-86400001).toISOString()}),article('future',{publishedAt:new Date(NOW+1).toISOString()}),article('dup',{title:values[0].title}),article('unsafe',{url:'javascript:evil()'}));
  for(let index=0;index<20;index++) values.push(article(`extra-${index}`,{source:'One Publisher'}));
  values.push(article('html',{title:'AI <script> & "news"',summary:'<img src=x onerror=alert(1)>'}));
  const digest=buildDigest(values,NOW);
  assert.equal(digest.date,'2026-10-17'); assert.ok(digest.articles.length<=10);
  assert.deepEqual(new Set(digest.articles.map(item=>item.category)),new Set(['news','technical','clinical','tools','geopolitical']));
  assert.ok(!digest.articles.some(item=>['old','future','dup','unsafe'].some(id=>item.url.endsWith('/'+id))));
  assert.ok(digest.articles.filter(item=>item.source==='One Publisher').length<=2);
  assert.ok(!digest.html.includes('<script>'));assert.ok(!digest.html.includes('<img src=x'));assert.ok(digest.html.includes('&lt;script&gt;'));
  assert.ok(digest.html.includes('{{UNSUBSCRIBE_URL}}'));assert.equal(selectDigest(null,NOW).length,0);
});
const env={NEWSLETTER_GOOGLE_SCRIPT_URL:'https://script.google.com/macros/s/real-id/exec',NEWSLETTER_BRIDGE_SECRET:'a'.repeat(64)};
const post=body=>new Request(APP_URL+'/.netlify/functions/newsletter',{method:'POST',headers:{origin:APP_URL,'content-type':'application/json'},body:JSON.stringify(body)});
test('subscription endpoint fails closed without setup and never calls Google from preview deploys',async()=>{
  let calls=0;const fetcher=async()=>{calls++;return Response.json({ok:true,ready:true});};
  const disabled=createNewsletterHandler({env:{},fetcher});
  assert.deepEqual(await (await disabled(new Request(APP_URL))).json(),{enabled:false,message:'Email delivery is awaiting the sender connection.'});
  assert.equal((await disabled(post({}))).status,503);
  const ready=createNewsletterHandler({env,fetcher});
  assert.equal((await ready(post({}),{deploy:{published:false}})).status,503);assert.equal(calls,0);
});
test('subscription validates consent, origin, email and action, keeps secrets server-side, and reports bridge failure honestly',async()=>{
  const bodies=[];
  const handler=createNewsletterHandler({env,fetcher:async(url,options)=>{bodies.push(JSON.parse(options.body));return Response.json({ok:true,ready:true});}});
  assert.equal((await handler(post({action:'subscribe',email:'reader@example.com'}))).status,400);
  assert.equal((await handler(post({action:'subscribe',email:'=formula@example.com',consent:true}))).status,400);
  assert.equal((await handler(post({action:'subscribe',email:'bad',consent:true}))).status,400);
  assert.equal((await handler(post({action:'confirm',token:'bad'}))).status,400);
  assert.equal((await handler(new Request(APP_URL,{method:'POST',headers:{origin:'https://attacker.example','content-type':'application/json'},body:'{}'}))).status,403);
  const response=await handler(post({action:'subscribe',email:'Reader@Example.com',consent:true}));
  assert.equal(response.status,200);assert.equal(bodies.at(-1).email,'reader@example.com');assert.equal(bodies.at(-1).secret,env.NEWSLETTER_BRIDGE_SECRET);
  assert.ok(!(await response.text()).includes(env.NEWSLETTER_BRIDGE_SECRET));
  const broken=createNewsletterHandler({env,fetcher:async()=>{throw new Error('private provider details');}});
  assert.equal((await broken(post({action:'subscribe',email:'reader@example.com',consent:true}))).status,503);
  assert.equal((await (await broken(new Request(APP_URL))).json()).enabled,false);
});

async function googleFixture() {
  const source=await readFile(new URL('../scripts/newsletter-google.gs',import.meta.url),'utf8');
  const rows=[['email','status','pendingHash','pendingExpires','lastRequest','unsubscribeToken','lastSentDay','deliveryState']],messages=[],properties=new Map([['BRIDGE_SECRET','a'.repeat(64)],['SUBSCRIBER_SHEET_ID','private-sheet'],['READY','true']]);
  let quota=100, mailError=false;
  const sheet={getDataRange:()=>({getValues:()=>rows.map(row=>[...row])}),getRange:(r,c,_height,width)=>({setValues:values=>{rows[r-1]=[...values[0]];},setValue:value=>{rows[r-1][c-1]=value;}})};
  class FixedDate extends Date {constructor(...args){super(...(args.length?args:[NOW]));}static now(){return NOW;}}
  const context=vm.createContext({Date:FixedDate,console,JSON,Session:{getEffectiveUser:()=>({getEmail:()=> 'renduchinthalasaipraneethkumar@gmail.com'})},
    Utilities:{DigestAlgorithm:{SHA_256:'sha256'},computeDigest:(_,text)=>[...createHash('sha256').update(text).digest()],getUuid:randomUUID,formatDate:(_date,_zone,format)=>format==='HH'?'08':'2026-10-17'},
    PropertiesService:{getScriptProperties:()=>({getProperty:key=>properties.get(key),setProperty:(key,value)=>properties.set(key,value)})},
    SpreadsheetApp:{openById:()=>({getSheets:()=>[sheet]}),flush(){}},LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})},
    MailApp:{getRemainingDailyQuota:()=>quota,sendEmail:message=>{if(mailError)throw new Error('Quota');messages.push(message);}},
    ContentService:{MimeType:{JSON:'json'},createTextOutput:text=>({setMimeType:()=>JSON.parse(text)})},
    UrlFetchApp:{fetch:()=>({getResponseCode:()=>200,getContentText:()=>JSON.stringify(buildDigest([article('a')],NOW))})},
  });
  vm.runInContext(source,context);
  const call=body=>context.doPost({postData:{contents:JSON.stringify({...body,secret:'a'.repeat(64)})}});
  return {context,call,rows,messages,properties,setQuota:value=>{quota=value;},setMailError:value=>{mailError=value;}};
}
test('Google service requires confirmation, throttles repeats, keeps unsubscribed readers out, and rejects replayed consent',async()=>{
  const f=await googleFixture();assert.equal(f.call({action:'subscribe',email:'reader@example.com'}).ok,true);assert.equal(f.rows[1][1],'pending');
  const token=f.messages[0].body.match(/token=([a-f0-9]{64})/u)[1];
  f.call({action:'subscribe',email:'reader@example.com'});assert.equal(f.messages.length,1);
  f.context.runMorningDigest();assert.equal(f.messages.length,1);
  assert.equal(f.call({action:'confirm',token}).ok,true);assert.equal(f.rows[1][1],'active');
  f.context.runMorningDigest();assert.equal(f.messages.length,2);assert.ok(f.messages[1].body.includes('newsletter=unsubscribe&token='));
  f.context.runMorningDigest();assert.equal(f.messages.length,2);
  assert.equal(f.call({action:'unsubscribe',token:f.rows[1][5]}).ok,true);assert.equal(f.rows[1][1],'unsubscribed');
  assert.equal(f.call({action:'confirm',token}).code,'invalid-link');assert.equal(f.rows[1][1],'unsubscribed');
});
test('Google delivery reserves one edition before send and flags ambiguous failures without duplicate retries',async()=>{
  const f=await googleFixture();f.call({action:'subscribe',email:'reader@example.com'});
  const token=f.messages[0].body.match(/token=([a-f0-9]{64})/u)[1];f.call({action:'confirm',token});
  f.setMailError(true);assert.throws(()=>f.context.runMorningDigest(),/Quota/);assert.equal(f.rows[1][7],'sending');
  f.setMailError(false);f.context.runMorningDigest();assert.equal(f.messages.length,1);
});
test('Google quota exhaustion never sends or reserves unsent recipients',async()=>{
  const f=await googleFixture();f.call({action:'subscribe',email:'reader@example.com'});const token=f.messages[0].body.match(/token=([a-f0-9]{64})/u)[1];f.call({action:'confirm',token});
  f.setQuota(0);assert.throws(()=>f.context.runMorningDigest(),/quota/);assert.equal(f.rows[1][6],'');assert.equal(f.messages.length,1);
});

test('operator test digest requires the owner’s confirmed consent and never advances the daily delivery reservation',async()=>{
  const f=await googleFixture();assert.throws(()=>f.context.sendTestDigest(),/Confirm/);
  const owner=f.context.DHIVI_OWNER;f.call({action:'subscribe',email:owner});
  const token=f.messages[0].body.match(/token=([a-f0-9]{64})/u)[1];f.call({action:'confirm',token});
  f.context.sendTestDigest();assert.equal(f.messages.length,2);assert.equal(f.messages[1].to,owner);
  assert.match(f.messages[1].subject,/^\[TEST\] Dhivi Morning Signal/);assert.ok(!f.messages[1].htmlBody.includes('{{UNSUBSCRIBE_URL}}'));
  assert.equal(f.rows[1][6],'');assert.equal(f.rows[1][7],'');
  f.call({action:'unsubscribe',token:f.rows[1][5]});assert.throws(()=>f.context.sendTestDigest(),/Confirm/);assert.equal(f.messages.length,2);
});

test('operator test digest respects remaining Gmail quota',async()=>{
  const f=await googleFixture();f.call({action:'subscribe',email:f.context.DHIVI_OWNER});
  const token=f.messages[0].body.match(/token=([a-f0-9]{64})/u)[1];f.call({action:'confirm',token});
  f.setQuota(0);assert.throws(()=>f.context.sendTestDigest(),/quota/);assert.equal(f.messages.length,1);
});
