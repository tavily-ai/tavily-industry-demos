import test from 'node:test';
import assert from 'node:assert/strict';
import config from '../demo.config.mjs';
import {research,validateInput,buildPlan,safeUrl} from '../server/research.mjs';
import {createApp} from '../server/index.mjs';
import {consumeSSE} from '../src/stream.mjs';
import {markdown} from '../src/export.mjs';

const input = validateInput({...config.examples[0].input,timeRange:config.defaultTimeRange});
const fakeSearch = async (url,options) => {
 const domain = options ? JSON.parse(options.body).include_domains[0] || 'example.org' : 'example.org';
 return Response.json({answer:'A source-backed summary.',results:[
 {title:'Official update',url:`https://${domain}/update`,content:'An example source excerpt.',score:0.9},
 {title:'Duplicate',url:`https://${domain}/update`,content:'Duplicate.'},
 {title:'Unsafe',url:'javascript:alert(1)',content:'Unsafe.'},
],usage:{credits:2}}); };

test('all example inputs produce three focused advanced requests', () => {
 for (const example of config.examples) {
  const plan = buildPlan(validateInput({...example.input,timeRange:'month'}));
  assert.equal(plan.length,3);
  for(const lane of plan) {
   assert.ok(lane.request.query.length>0 && lane.request.query.length<=120);
   assert.equal(lane.request.search_depth,'advanced'); assert.equal(lane.request.max_results,10);
   assert.ok(lane.request.chunks_per_source>=3 && lane.request.chunks_per_source<=5);
   assert.ok(!/https?:|site:|www\./.test(lane.request.query));
   assert.ok(lane.request.include_domains.every(d=>!d.includes('/')));
  }
 }
});

test('untrusted and oversized inputs are rejected without echoing credentials',()=>{
 assert.throws(()=>validateInput(null));
 assert.throws(()=>validateInput({...input,[config.fields[0].id]:''}));
 assert.throws(()=>validateInput({...input,[config.fields[0].id]:'a'.repeat(300)}));
 assert.throws(()=>validateInput({...input,timeRange:'century'}));
 assert.equal(validateInput({...input,apiKey:'secret'}).apiKey,undefined);
 if(config.id==='threat-vulnerability-monitor') assert.throws(()=>validateInput({...input,context:'not a domain'}));
 if(config.id==='legal-regulatory-monitor') assert.throws(()=>validateInput({...input,context:'Mars'}));
});

test('searches execute concurrently and emit real completions',async()=>{
 let active=0,maxActive=0;
 const events=[];
 const fetchImpl=async(url,options)=>{
  active++;maxActive=Math.max(maxActive,active);
  assert.equal(url,'https://api.tavily.com/search');
  assert.equal(options.headers.Authorization,'Bearer test-secret');
  const body=JSON.parse(options.body);assert.equal(body.apiKey,undefined);
  await new Promise(resolve=>setTimeout(resolve,10));active--;
  return fakeSearch(url,options);
 };
 const report=await research(input,{apiKey:'test-secret',fetchImpl,emit:event=>events.push(event)});
 assert.equal(maxActive,3);assert.equal(report.status,'complete');assert.ok(report.sourceCount>=1);assert.equal(report.credits,6);
 assert.equal(events.filter(e=>e.type==='result').length,3);
 assert.ok(report.sections.every(s=>s.sources.length===1));
 assert.ok(!JSON.stringify(report).includes('test-secret'));
 assert.ok(!markdown(report).includes('test-secret'));
 assert.match(markdown(report),/https:\/\/.+\/update/);
});

test('partial upstream failures keep successful sources and sanitize API errors',async()=>{
 let count=0;
 const report=await research(input,{apiKey:'test-secret',fetchImpl:async()=>++count===2?new Response('test-secret',{status:429}):fakeSearch()});
 assert.equal(report.status,'partial');assert.equal(report.sections.filter(s=>s.status==='error').length,1);
 assert.ok(report.sections.find(s=>s.status==='error').error.includes('credit limit'));
 assert.ok(!JSON.stringify(report).includes('test-secret'));assert.equal(report.credits,4);
});

test('all upstream failures cannot appear as a successful brief',async()=>{
 const report=await research(input,{apiKey:'key',fetchImpl:async()=>new Response('',{status:401})});
 assert.equal(report.status,'failed');assert.equal(report.sourceCount,0);assert.equal(report.credits,null);
});

test('empty results do not produce a free-floating answer',async()=>{
 const report=await research(input,{apiKey:'key',fetchImpl:async()=>Response.json({answer:'Unsupported',results:[]})});
 assert.ok(report.sections.every(s=>s.summary===null));assert.equal(report.sourceCount,0);
});

test('domain-restricted sections cannot show out-of-scope evidence or summaries',async()=>{
 const report=await research(input,{apiKey:'key',fetchImpl:async()=>Response.json({answer:'Untrusted summary',results:[{url:'https://unrelated.example/story',title:'Unrelated',content:'Outside the requested domains.'}]})});
 for(const section of report.sections.filter(s=>s.request.include_domains.length)) {
  assert.equal(section.request.include_domains_mode,'filter');assert.equal(section.sources.length,0);assert.equal(section.summary,null);
 }
});

test('cancellation propagates instead of reporting success',async()=>{
 const controller=new AbortController();controller.abort();
 await assert.rejects(()=>research(input,{apiKey:'key',signal:controller.signal,fetchImpl:async(url,{signal})=>{signal.throwIfAborted();}}));
});

test('only web source URLs are allowed',()=>{
 assert.equal(safeUrl('file:///etc/passwd'),null);assert.equal(safeUrl('javascript:alert(1)'),null);assert.equal(safeUrl('https://example.org/'),'https://example.org/');
});

test('stream parser handles arbitrary byte splits and reports truncated streams',async()=>{
 const bytes=new TextEncoder().encode(': keepalive\n\ndata: {"type":"result","message":"café"}\n\ndata: {"type":"complete"}\n\n');
 const response=new Response(new ReadableStream({start(c){for(const b of bytes)c.enqueue(Uint8Array.of(b));c.close();}}));
 const events=[];await consumeSSE(response,e=>events.push(e));assert.equal(events[0].message,'café');assert.equal(events.length,2);
 await assert.rejects(()=>consumeSSE(new Response('data: {"type":"result"}\n\n'),()=>{}),/before the brief finished/);
 await assert.rejects(()=>consumeSSE(Response.json({error:'Missing key'},{status:401}),()=>{}),/Missing key/);
});

test('HTTP API validates inputs, rejects cross-origin use, and streams a finished report',async t=>{
 const app=createApp({serverKey:'server-secret',fetchImpl:fakeSearch});
 await new Promise(resolve=>app.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>{app.closeAllConnections();app.close(resolve);}));
 const base=`http://127.0.0.1:${app.address().port}`;
 const request=(data,headers={})=>fetch(base+'/api/research',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(data)});
 const health=await (await fetch(base+'/api/health')).json();assert.equal(health.hasServerKey,true);assert.ok(!JSON.stringify(health).includes('server-secret'));
 assert.equal((await request({})).status,400);
 assert.equal((await request(input,{Origin:'https://untrusted.example'})).status,403);
 assert.equal((await request({...input,apiKey:{bad:true}})).status,400);
 const response=await request(input);assert.equal(response.headers.get('content-type'),'text/event-stream');
 const events=[];await consumeSSE(response,e=>events.push(e));assert.equal(events.at(-1).report.status,'complete');
 assert.ok(!JSON.stringify(events).includes('server-secret'));
});

test('missing API key is actionable before a stream starts',async t=>{
 const app=createApp({serverKey:'',fetchImpl:()=>{throw new Error('Must not call upstream');}});
 await new Promise(resolve=>app.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>{app.closeAllConnections();app.close(resolve);}));
 const response=await fetch(`http://127.0.0.1:${app.address().port}/api/research`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
 assert.equal(response.status,401);assert.match((await response.json()).error,/API key/);
});
