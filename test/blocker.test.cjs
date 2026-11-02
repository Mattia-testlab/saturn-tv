const {test} = require('node:test');
const assert = require('node:assert/strict');
const {hostBlocked, install} = require('../saturn.js');
function fixture(host = 'www.animesaturn.net', disabled = false) {
  const handlers = {};
  function Node() {}
  Node.prototype.appendChild = function (node) { this.appended = node; return node; };
  Node.prototype.insertBefore = Node.prototype.appendChild;
  const doc = {addEventListener(n, f) { handlers[n] = f; }, querySelectorAll() { return []; }};
  let opened = 0, fetched = 0, reloaded = 0;
  const win = {document: doc, Node, URL, Promise, location: {hostname: host, href: 'https://' + host + '/anime/test', reload() { reloaded++; }}, sessionStorage: {getItem() { return disabled ? '1' : null; }, setItem() {}}, open() { opened++; return 'opened'; }, fetch() { fetched++; return Promise.resolve('video'); }, setTimeout() {}};
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
  assert.equal(f.win.location.href, 'https://www.animesaturn.net/anime/test');
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
  f.handlers.click(event({tagName: 'A', getAttribute(k) { return k === 'target' ? '_blank' : '/anime/next'; }}));
  assert.equal(prevented, 1);
  f.handlers.click(event({tagName: 'A', getAttribute(k) { return k === 'href' ? '/anime/next' : null; }}));
  assert.equal(prevented, 1);
});
test('disabled mode preserves original open and fetch', async () => {
  const f = fixture('www.animesaturn.net', true); install(f.win);
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
test('ad scripts cannot overwrite window.open after the filter installs', () => {
  const f = fixture(); const api=install(f.win);let hijacked=false;
  f.win.open=()=>{hijacked=true;};
  assert.equal(f.win.open('https://073m.com/afu.php'),null);
  assert.equal(hijacked,false);assert.equal(api.popups,1);
});
test('programmatic form.submit blocks external ads while preserving same-site submission', () => {
  const f=fixture();let submits=0;
  function Form(action){this.action=action;}
  Form.prototype.getAttribute=function(k){return k==='action'?this.action:'_self';};
  Form.prototype.submit=function(){submits++;};f.win.HTMLFormElement=Form;
  install(f.win);new Form('https://073m.com/afu.php').submit();assert.equal(submits,0);
  new Form('/filter?keyword=naruto').submit();assert.equal(submits,1);
});
test('same-window external links are blocked but an episode link is preserved', () => {
  const f=fixture();install(f.win);let blocked=0;
  for(const href of ['https://073m.com/afu.php','https://www.animesaturn.net.evil.test/','/anime/test']){
    f.handlers.click({target:{tagName:'A',getAttribute(k){return k==='href'?href:'_self';}},preventDefault(){blocked++;},stopImmediatePropagation(){}});
  }
  assert.equal(blocked,2);
});
test('official migration rejects old domain and lookalikes while accepting the verified player',()=>{
 assert.equal(install(fixture('animesaturn.at').win),null);
 assert.equal(install(fixture('www.animesaturn.net.evil.test').win),null);
 assert.equal(install(fixture('evil.animesaturn.net').win),null);
 assert.ok(install(fixture('animesaturn.net').win));
 assert.ok(install(fixture('play.saturncdn.net').win));
});
test('player bridge ignores wrong origins and sources before requesting fullscreen',()=>{
 const f=fixture('www.animesaturn.net'),events={};let requests=0;
 f.win.addEventListener=(key,fn)=>events[key]=fn;
 const child={},frame={contentWindow:child,getBoundingClientRect(){return {width:640,height:360};},requestFullscreen(){requests++;return Promise.resolve();}};
 f.win.document.querySelector=()=>frame;
 install(f.win);
 for(const event of [{source:child,origin:'https://evil.test'},{source:{},origin:'https://play.saturncdn.net'}])events.message({...event,data:{saturnTV:1,type:'fullscreen'}});
 assert.equal(requests,0);
 events.message({source:child,origin:'https://play.saturncdn.net',data:{saturnTV:1,type:'fullscreen'}});assert.equal(requests,1);
});
test('player click bridge accepts only parent site and coordinates inside frame',()=>{
 const f=fixture('play.saturncdn.net'),events={},parent={};let clicks=0;
 f.win.top={};f.win.parent=parent;f.win.innerWidth=640;f.win.innerHeight=360;
 f.win.addEventListener=(key,fn)=>events[key]=fn;
 f.win.document.elementFromPoint=()=>({click(){clicks++;}});
 install(f.win);
 const message=(origin,x)=>events.message({source:parent,origin,data:{saturnTV:1,type:'click',x,y:30}});
 message('https://evil.test',20);message('https://www.animesaturn.net',900);assert.equal(clicks,0);
 message('https://www.animesaturn.net',20);assert.equal(clicks,1);
});
test('player play rejection is reported rather than silently ignored',async()=>{
 const f=fixture('play.saturncdn.net'),events={},reports=[],parent={postMessage(data){reports.push(data);}};
 f.win.top={};f.win.parent=parent;f.win.addEventListener=(key,fn)=>events[key]=fn;
 const video={paused:true,readyState:4,currentTime:0,play(){return Promise.reject({name:'NotAllowedError',message:'User gesture required'});}};
 f.win.document.querySelector=()=>video;install(f.win);
 events.message({source:parent,origin:'https://www.animesaturn.net',data:{saturnTV:1,type:'play',enabled:false}});
 await Promise.resolve();await Promise.resolve();
 assert.match(reports[0].error,/NotAllowedError/);
 assert.equal(f.win.__saturnTV.enabled,false);
});
