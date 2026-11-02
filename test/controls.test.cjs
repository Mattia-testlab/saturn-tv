const {test} = require('node:test');
const assert = require('node:assert/strict');
const {install} = require('../saturn.js');
function fixture(saved, media) {
  const events = {}, calls = [];
  const storage = new Map(saved ? [['saturn-bookmark', JSON.stringify(saved)]] : []);
  let doc;
  class Element {
    constructor(tag) { this.tagName = tag.toUpperCase(); this.style = {}; this.children = []; this.attrs = {}; this.handlers = {}; }
    appendChild(n) { this.children.push(n); n.parentNode = this; return n; }
    insertBefore(n) { return this.appendChild(n); }
    removeChild(n) { this.children = this.children.filter(v => v !== n); n.parentNode = null; }
    setAttribute(k, v) { this.attrs[k] = v; }
    getAttribute(k) { return this.attrs[k] || null; }
    addEventListener(k, fn) { this.handlers[k] = fn; }
    querySelectorAll() { return []; }
    focus() { doc.activeElement = this; }
    click() { this.handlers.click.call(this, {preventDefault() {}, stopPropagation() {}}); }
  }
  doc = {title: 'Episodio 7', body: new Element('body'), addEventListener(k, f) { events[k] = f; }, querySelectorAll(selector) { return selector==='video' && media ? [media] : []; }, createElement(tag) { return new Element(tag); }};
  const win = {document: doc, Node: Element, URL, Promise, location: {hostname: 'www.animesaturn.net', href: 'https://www.animesaturn.net/anime/show/ep-7', reload() { calls.push('reload'); }, assign(url) { calls.push(url); }}, history: {back() { calls.push('back'); }, forward() { calls.push('forward'); }}, sessionStorage: {getItem() {}, setItem() {}}, localStorage: {getItem(k) { return storage.get(k); }, setItem(k,v) { storage.set(k,v); }}, open() {}, setTimeout() {}};
  win.top = win;
  const api = install(win);
  function key(code) { events.keydown({keyCode: code, preventDefault() {}, stopImmediatePropagation() {}}); }
  function buttons() { return doc.body.children[0].children.filter(n => n.tagName === 'BUTTON'); }
  return {api, win, doc, calls, key, buttons, storage, events};
}
test('quick menu opens, settings refresh works, Back restores focus', () => {
 const f=fixture(), old={focus(){f.doc.activeElement=this;}};old.focus();f.key(406);
 assert.equal(f.buttons().length,6);assert.equal(f.doc.activeElement.getAttribute('data-saturn-action'),'toggleVideo');
 f.api.actions.settings();f.api.actions.tools();let reload=f.buttons().find(b=>b.getAttribute('data-saturn-action')==='reload');reload.focus();f.key(13);assert.deepEqual(f.calls,['reload']);
 f.key(10009);assert.equal(f.buttons().length,6);f.key(10009);assert.equal(f.doc.body.children.length,0);
});
test('browser navigation controls call history and canonical home', () => {
  const f = fixture(); f.api.actions.back(); f.api.actions.forward(); f.api.actions.home();
  assert.deepEqual(f.calls, ['back', 'forward', 'https://www.animesaturn.net/']);
});
test('bookmark fallback can reopen saved page when no recent episode exists',()=>{
 const f=fixture();f.storage.delete('saturn-last');f.api.actions.save();f.api.actions.resume();assert.equal(f.calls[0],f.win.location.href);
});
test('invalid stored URLs cannot be resumed',()=>{
 for(const url of ['javascript:alert(1)','https://www.animesaturn.net.evil.test/','http://www.animesaturn.net/','https://user:password@www.animesaturn.net/']){
  const f=fixture({url});f.storage.delete('saturn-last');f.key(406);f.api.actions.settings();assert.equal(f.buttons().find(b=>b.getAttribute('data-saturn-action')==='resume').disabled,true);f.api.actions.resume();assert.equal(f.calls.length,0);
 }
});
test('storage failures produce feedback without navigating', () => {
  const f = fixture(); f.key(406); f.win.localStorage.setItem = () => { throw Error('denied'); };
  f.api.actions.save(); assert.equal(f.calls.length, 0);
  assert.match(f.doc.body.children[0].children.at(-1).textContent, /non disponibile/);
});
test('Back opens and closes toolbar without navigating, but respects fullscreen and text fields', () => {
  const f = fixture();
  f.key(10009); assert.equal(f.buttons().length, 6);
  f.key(10009); assert.equal(f.doc.body.children.length, 0);
  assert.deepEqual(f.calls, []);
  f.doc.fullscreenElement = {}; f.doc.exitFullscreen=()=>{f.doc.fullscreenElement=null;};
  f.win.setTimeout=fn=>fn(); f.key(10009); assert.equal(f.buttons().length,6);f.key(10009);
  f.doc.fullscreenElement = null;
  f.doc.activeElement = {tagName: 'INPUT'};
  f.key(10009); assert.equal(f.doc.body.children.length, 0);
  f.doc.activeElement = null;
  f.key(415); f.key(19); f.key(10252);
  assert.equal(f.doc.body.children.length, 0);
});
test('cursor moves with arrows, clicks the hit element and scrolls at vertical edges', () => {
  const f = fixture(); let point, clicked = 0, scrolled = 0;
  f.win.innerWidth = 1280; f.win.innerHeight = 720;
  f.win.scrollBy = (x,y) => { scrolled += y; };
  f.doc.elementFromPoint = (x,y) => { point = [x,y]; return {focus() {}, click() { clicked++; }}; };
  f.key(39); f.key(13);
  assert.deepEqual(point, [668,360]); assert.equal(clicked,1);
  for (let i=0;i<20;i++) f.key(40);
  assert.ok(scrolled > 0);
  f.key(10009);
  assert.ok(f.doc.body.children.some(n => n.id === 'saturn-toolbar'));
});
test('confirming search preserves submit and releases focus before moving cursor again', () => {
  const f = fixture(); const pending = []; let hit, blurred = false;
  f.win.setTimeout = fn => pending.push(fn);
  f.win.innerWidth = 1280; f.win.innerHeight = 720;
  f.doc.elementFromPoint = (x,y) => {hit=[x,y]; return null;};
  const input = {tagName:'INPUT', blur() {blurred=true; f.doc.activeElement=null;}};
  f.doc.activeElement=input;
  f.key(13);
  assert.equal(blurred,false); // Browser default submission runs first.
  pending.forEach(fn=>fn());
  assert.equal(blurred,true);
  f.key(39); f.key(13); assert.deepEqual(hit,[668,360]);
});

test('Black Clover shortcut in toolbar opens the verified episode 50', () => {
  const f=fixture(); f.key(10009);
  const shortcut=f.buttons().find(b=>b.getAttribute('data-saturn-action')==='blackClover50');
  assert.equal(shortcut.textContent,'Black Clover · 50');
  shortcut.click();assert.deepEqual(f.calls,['https://www.animesaturn.net/anime/black-clover-67Dip/ep-50']);
});

test('favorites preserve multiple pages and reject unsafe stored links',()=>{
 const f=fixture();f.api.actions.addFavorite();f.win.location.href='https://www.animesaturn.net/anime/second/ep-1';f.api.actions.addFavorite();
 assert.equal(JSON.parse(f.storage.get('saturn-favorites')).length,2);
 f.storage.set('saturn-favorites',JSON.stringify([{url:'javascript:alert(1)',title:'bad'}]));f.api.actions.favorites();assert.equal(f.buttons().length,2);
});
test('speed preference is saved, next episode only follows real same-series links',()=>{
 const f=fixture();f.api.actions.speed();assert.equal(JSON.parse(f.storage.get('saturn-speed')),700);
 const links=['/anime/show/ep-6','/anime/show/ep-9','/anime/other/ep-8'];f.doc.querySelectorAll=()=>links.map(url=>({getAttribute(){return url;}}));
 f.api.actions.previousEpisode();f.api.actions.nextEpisode();assert.deepEqual(f.calls,['https://www.animesaturn.net/anime/show/ep-6','https://www.animesaturn.net/anime/show/ep-9']);
});

test('accessible video progress is saved without persisting unrelated page data',()=>{
 const handlers={}, video={readyState:0,addEventListener(k,fn){handlers[k]=fn;},currentTime:42};
 const f=fixture(null,video);handlers.timeupdate();const progress=JSON.parse(f.storage.get('saturn-progress'));
 assert.equal(progress[f.win.location.href],42);
});
test('cursor clicks the button containing an SVG icon',()=>{
 const f=fixture();let clicked=0;
 f.win.innerWidth=1280;f.win.innerHeight=720;
 const button={tagName:'BUTTON',focus(){},click(){clicked++;}};
 f.doc.elementFromPoint=()=>({tagName:'path',parentNode:{tagName:'svg',parentNode:button}});
 f.key(13);assert.equal(clicked,1);
});
test('cursor scrolls an internal episode list at its edge',()=>{
 const f=fixture();f.win.innerWidth=1280;f.win.innerHeight=720;f.win.scrollBy=()=>{throw Error('Should scroll list');};
 const list={scrollHeight:600,clientHeight:100,scrollTop:0,getBoundingClientRect(){return{top:300,bottom:380};}};
 f.win.getComputedStyle=()=>({overflowY:'auto'});f.doc.elementFromPoint=()=>list;
 f.key(40);assert.ok(list.scrollTop>0);
});
