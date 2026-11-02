const {test} = require('node:test');
const assert = require('node:assert/strict');
const {install} = require('../saturn.js');
function fixture(saved) {
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
  doc = {title: 'Episodio 7', body: new Element('body'), addEventListener(k, f) { events[k] = f; }, querySelectorAll() { return []; }, createElement(tag) { return new Element(tag); }};
  const win = {document: doc, Node: Element, URL, Promise, location: {hostname: 'animesaturn.at', href: 'https://animesaturn.at/watch/show/ep-7', reload() { calls.push('reload'); }, assign(url) { calls.push(url); }}, history: {back() { calls.push('back'); }, forward() { calls.push('forward'); }}, sessionStorage: {getItem() {}, setItem() {}}, localStorage: {getItem(k) { return storage.get(k); }, setItem(k,v) { storage.set(k,v); }}, open() {}, setTimeout() {}};
  win.top = win;
  const api = install(win);
  function key(code) { events.keydown({keyCode: code, preventDefault() {}, stopImmediatePropagation() {}}); }
  function buttons() { return doc.body.children[0].children.filter(n => n.tagName === 'BUTTON'); }
  return {api, win, doc, calls, key, buttons};
}
test('blue opens the toolbar; arrows skip unavailable bookmark; OK refreshes; Back restores focus', () => {
  const f = fixture(); const oldFocus = {focus() { f.doc.activeElement = this; }}; oldFocus.focus();
  f.key(406); const b = f.buttons(); assert.equal(b.length, 8); assert.equal(f.doc.activeElement, b[0]);
  f.key(39); f.key(39); assert.equal(f.doc.activeElement.textContent, 'Aggiorna');
  f.key(13); assert.deepEqual(f.calls, ['reload']);
  b[4].focus(); f.key(39); assert.equal(f.doc.activeElement, b[6]);
  f.key(10009); assert.equal(f.doc.body.children.length, 0); assert.equal(f.doc.activeElement, oldFocus);
});
test('browser navigation controls call history and canonical home', () => {
  const f = fixture(); f.api.actions.back(); f.api.actions.forward(); f.api.actions.home();
  assert.deepEqual(f.calls, ['back', 'forward', 'https://animesaturn.at/']);
});
test('saving a page enables its button and reopens the saved episode', () => {
  const f = fixture(); f.key(406); const b = f.buttons(); assert.equal(b[5].disabled, true);
  b[4].click(); assert.equal(b[5].disabled, false); b[5].click();
  assert.equal(f.calls[0], f.win.location.href);
});
test('stored bookmarks reject foreign domains and dangerous schemes', () => {
  for (const url of ['javascript:alert(1)', 'https://animesaturn.at.evil.test/', 'http://animesaturn.at/', 'https://user:password@animesaturn.at/']) {
    const f = fixture({url}); f.key(406); assert.equal(f.buttons()[5].disabled, true);
    f.api.actions.resume(); assert.equal(f.calls.length, 0);
  }
});
test('storage failures produce feedback without navigating', () => {
  const f = fixture(); f.key(406); f.win.localStorage.setItem = () => { throw Error('denied'); };
  f.api.actions.save(); assert.equal(f.calls.length, 0);
  assert.match(f.doc.body.children[0].children.at(-1).textContent, /non disponibile/);
});
test('Back opens and closes toolbar without navigating, but respects fullscreen and text fields', () => {
  const f = fixture();
  f.key(10009); assert.equal(f.buttons().length, 8);
  f.key(10009); assert.equal(f.doc.body.children.length, 0);
  assert.deepEqual(f.calls, []);
  f.doc.fullscreenElement = {};
  f.key(10009); assert.equal(f.doc.body.children.length, 0);
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
