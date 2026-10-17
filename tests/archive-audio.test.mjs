import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSavedArchive, changeSavedArchive } from '../src/saved-archive.mjs';
import { filterArticles, NEWS_WINDOW } from '../src/feed-model.mjs';
import { createContinuousReader } from '../src/continuous-reader.mjs';
import { createSpeechReader } from '../src/speech-reader.mjs';

const old = {id:'old',title:'An AI research story',url:'https://example.com/old',publishedAt:'2026-01-01T00:00:00Z',source:'Publisher',category:'technical'};
test('archive survives JSON restoration, arbitrary age, read marks and the former 200-save boundary', () => {
  let archive = normalizeSavedArchive(JSON.parse(JSON.stringify([old])));
  for (let index=0; index<205; index++) archive = changeSavedArchive(archive,{...old,id:`new-${index}`,url:`https://example.com/${index}`});
  const restored = normalizeSavedArchive(JSON.parse(JSON.stringify(archive)));
  assert.equal(restored.length,206);
  assert.ok(restored.some(article => article.id === 'old'));
  assert.equal(filterArticles(restored,{category:'saved',now:Date.parse(old.publishedAt)+365*NEWS_WINDOW,readIds:['old']}).length,206);
  assert.equal(filterArticles(restored,{now:Date.parse(old.publishedAt)+365*NEWS_WINDOW}).length,0);
  assert.equal(changeSavedArchive(restored,old,true).length,205);
  assert.equal(normalizeSavedArchive([null,old,old,{title:'invalid'}]).length,1);
});

function fixture() {
  const calls=[], timers=new Map(); let current={id:'a',title:'AI a'}, index=0;
  const list=[current,{id:'b',title:'AI b'},{id:'c',title:'AI c'}];
  const settings={gap:5,rate:1.25,mode:'headline'};
  const reader={read:(...args)=>{calls.push(args);return true;},stop:()=>calls.push('stop')};
  const states=[];
  const controller=createContinuousReader({reader,current:()=>current,next:(id,seen)=>{current=list.find(article=>!seen.has(article.id));return current;},settings:()=>settings,onState:state=>states.push(state),delay:(callback,ms)=>{timers.set(++index,{callback,ms});return index;},cancelDelay:id=>timers.delete(id)});
  const fire=()=>{const [id,timer]=timers.entries().next().value;timers.delete(id);timer.callback();};
  return {controller,calls,timers,states,settings,fire,move:article=>{current=article;}};
}
test('continuous playback starts only on explicit start, honors gaps, transitions without numbering, and ends without looping', () => {
  const f=fixture(); assert.deepEqual(f.calls,[]);
  f.controller.start(); assert.equal(f.calls.at(-1)[0].id,'a'); assert.equal(f.calls.at(-1)[2].introduction,'');
  f.controller.completed('a'); assert.equal([...f.timers.values()][0].ms,5000); assert.equal(f.states.at(-1).phase,'interval');
  f.fire(); assert.equal(f.calls.at(-1)[0].id,'b'); assert.equal(f.calls.at(-1)[2].introduction,'Next news.');
  assert.equal(f.calls.at(-1)[1],'headline'); assert.equal(f.calls.at(-1)[2].rate,1.25);
  f.controller.completed('b'); f.fire(); f.controller.completed('c'); f.fire();
  assert.equal(f.controller.enabled,false); assert.equal(f.states.at(-1).phase,'idle');
});
test('Stop cancels gaps and invalidates even a late timer callback; stale completion cannot advance', () => {
  const f=fixture();f.controller.start(); f.controller.completed('wrong');assert.equal(f.timers.size,0);
  f.controller.completed('a');const late=[...f.timers.values()][0].callback; f.controller.stop();
  assert.equal(f.timers.size,0);const count=f.calls.length;late();f.controller.completed('a');assert.equal(f.calls.length,count);
});
test('manual scrolling cancels current speech and reads the newly visible card after settling', () => {
  const f=fixture(); f.controller.start();f.controller.completed('a');f.move({id:'c',title:'AI c'});f.controller.moved();
  assert.equal(f.calls.at(-1),'stop');assert.equal(f.timers.size,1);assert.equal([...f.timers.values()][0].ms,700);
  f.fire();assert.equal(f.calls.at(-1)[0].id,'c'); f.controller.stop();assert.equal(f.timers.size,0);
});
test('speech completion is distinct from explicit Stop, errors, and disposed late events; rate is bounded', () => {
  const queued=[],completed=[];
  const synthesis={speak:value=>queued.push(value),cancel(){},resume(){},getVoices:()=>[]};
  class Utterance {constructor(text){this.text=text;}}
  const reader=createSpeechReader({synthesis,Utterance,onComplete:id=>completed.push(id)});
  reader.read({id:'one',title:'One short title'},'headline',{rate:50,introduction:'Next news.'});
  assert.equal(queued[0].rate,1.5);assert.equal(queued[0].text,'Next news. One short title');
  queued[0].onstart();queued[0].onend();assert.deepEqual(completed,['one']);
  reader.read({id:'two',title:'Two'});const late=queued.at(-1).onend;reader.stop();late();assert.deepEqual(completed,['one']);
  reader.read({id:'three',title:'Three'});queued.at(-1).onerror({error:'not-allowed'});assert.deepEqual(completed,['one']);
});
