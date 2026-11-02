const {test} = require('node:test');
const assert = require('node:assert/strict');
const {hostBlocked, install} = require('../saturn.js');
function fixture(host = 'animesaturn.at', disabled = false) {
  const handlers = {};
  function Node() {}
  Node.prototype.appendChild = function (node) { this.appended = node; return node; };
  Node.prototype.insertBefore = Node.prototype.appendChild;
  const doc = {addEventListener(n, f) { handlers[n] = f; }, querySelectorAll() { return []; }};
  let opened = 0, fetched = 0, reloaded = 0;
  const win = {document: doc, Node, URL, Promise, location: {hostname: host, href: 'https://' + host + '/watch/test', reload() { reloaded++; }}, sessionStorage: {getItem() { return disabled ? '1' : null; }, setItem() {}}, open() { opened++; return 'opened'; }, fetch() { fetched++; return Promise.resolve('video'); }, setTimeout() {}};
  win.top = win;
  return {win, handlers, counts: () => ({opened, fetched, reloaded})};
}
test('domain matching includes subdomains but not lookalikes', () => {
  assert.equal(hostBlocked('yh.subsignsodaic.com'), true);
  assert.equal(hostBlocked('DOUBLECLICK.NET.'), true);
  assert.equal(hostBlocked('doubleclick.net.evil.test'), false);
  assert.equal(hostBlocked('notdoubleclick.net'), false);
});
test('does not activate on unrelated websites', () => { const f = fixture('example.com'); assert.equal(install(f.win), null); });
test('blocks new windows without preventing same-page browser navigation', () => {
  const f = fixture(); const api = install(f.win);
  assert.equal(f.win.open('https://example.com'), null);
  assert.equal(api.popups, 1); assert.equal(f.counts().opened, 0);
  assert.equal(f.win.location.href, 'https://animesaturn.at/watch/test');
});
test('rejects ad fetch while permitting video and query strings mentioning ad hosts', async () => {
  const f = fixture(); install(f.win);
  await assert.rejects(f.win.fetch('https://yh.subsignsodaic.com/ad.js'));
  assert.equal(await f.win.fetch('/embed/as/video'), 'video');
  assert.equal(await f.win.fetch('https://media.example/video?ref=doubleclick.net'), 'video');
  assert.equal(f.counts().fetched, 2);
});
test('does not insert a known advertising script, preserves the site player iframe', () => {
  const f = fixture(); install(f.win); const parent = new f.win.Node();
  const ad = {tagName: 'SCRIPT', getAttribute() { return '//yh.subsignsodaic.com/code'; }};
  parent.appendChild(ad); assert.equal(parent.appended, undefined);
  const player = {tagName: 'IFRAME', getAttribute() { return '/embed/as/player'; }};
  parent.appendChild(player); assert.equal(parent.appended, player);
});
test('captures a new-tab link but leaves ordinary episode links alone', () => {
  const f = fixture(); install(f.win); let prevented = 0;
  const event = target => ({target, preventDefault() { prevented++; }, stopImmediatePropagation() {}});
  f.handlers.click(event({tagName: 'A', getAttribute(k) { return k === 'target' ? '_blank' : '/watch/next'; }}));
  assert.equal(prevented, 1);
  f.handlers.click(event({tagName: 'A', getAttribute(k) { return k === 'href' ? '/watch/next' : null; }}));
  assert.equal(prevented, 1);
});
test('disabled mode preserves original open and fetch', async () => {
  const f = fixture('animesaturn.at', true); install(f.win);
  assert.equal(f.win.open('https://example.com'), 'opened');
  assert.equal(await f.win.fetch('https://doubleclick.net/ad'), 'video');
});
test('installation is idempotent and yellow reloads for a clean toggle', () => {
  const f = fixture(); const api = install(f.win); assert.equal(install(f.win), api);
  f.handlers.keydown({keyCode: 405, preventDefault() {}, stopImmediatePropagation() {}});
  assert.equal(f.counts().reloaded, 1);
});
test('XHR ad requests abort before sending; video requests are sent', () => {
  const f = fixture(); let sent = 0, aborted = 0;
  function XHR() {}
  XHR.prototype.open = function () {};
  XHR.prototype.send = function () { sent++; };
  XHR.prototype.abort = function () { aborted++; };
  f.win.XMLHttpRequest = XHR; install(f.win);
  const ad = new XHR(); ad.open('GET', 'https://doubleclick.net/ad');
  assert.throws(() => ad.send(), /bloccata/);
  assert.equal(sent, 0); assert.equal(aborted, 1);
  const video = new XHR(); video.open('GET', '/embed/as/video'); video.send();
  assert.equal(sent, 1);
});
