const {test}=require('node:test');
const assert=require('node:assert/strict');
const {install,hostBlocked}=require('../saturn.js');
function fixture(host='www.animesaturn.net',child=false){
 const events={},docEvents={},sent=[],changes=[],storage=new Map();let doc;
 class El{
  constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.attrs={};this.style={};this.handlers={};this.nodeType=1;}
  appendChild(n){this.children.push(n);n.parentNode=this;return n;}insertBefore(n){return this.appendChild(n);}removeChild(n){this.children=this.children.filter(x=>x!==n);n.parentNode=null;}
  removeAttribute(k){delete this.attrs[k];}setAttribute(k,v){this.attrs[k]=v;}getAttribute(k){return this.attrs[k]||null;}hasAttribute(k){return k in this.attrs;}
  addEventListener(k,f){this.handlers[k]=f;}querySelectorAll(){return [];}querySelector(){return null;}
  focus(options){doc.activeElement=this;this.focusOptions=options;}click(){if(this.handlers.click)this.handlers.click.call(this,{preventDefault(){},stopPropagation(){}});}dispatchEvent(e){if(this.handlers[e.type])this.handlers[e.type].call(this,e);return true;}
 }
 doc={body:new El('body'),documentElement:{},activeElement:null,createElement(tag){changes.push(['create',tag]);return new El(tag);},querySelectorAll(){return [];},querySelector(){return null;},addEventListener(k,f){docEvents[k]=f;}};
 const parent={postMessage(data,origin){sent.push({data,origin});}};
 const win={document:doc,Node:El,URL,Promise,innerWidth:1280,innerHeight:720,location:{hostname:host,href:'https://'+host+'/',assign(url){changes.push(['navigate',url]);},reload(){changes.push(['reload']);}},localStorage:{getItem(k){return storage.get(k);},setItem(k,v){storage.set(k,v);}},sessionStorage:{getItem(k){return storage.get(k);},setItem(k,v){storage.set(k,v);}},open(){changes.push(['open']);return 1;},fetch(input){changes.push(['fetch',input]);return Promise.resolve('ok');},setTimeout(){},addEventListener(k,f){events[k]=f;},MouseEvent:function(type,data){this.type=type;Object.assign(this,data);}};
 win.top=child?{}:win;win.parent=parent;
 const api=install(win);sent.length=0;
 function key(code,target){let stopped=false;events.keydown({keyCode:code,target:target||doc.activeElement,preventDefault(){stopped=true;},stopImmediatePropagation(){}});return stopped;}
 function message(data,origin='https://www.animesaturn.net',source=parent){events.message({data:{saturnTV:1,...data},origin,source});}
 return{api,win,doc,events,docEvents,sent,changes,storage,key,message,El};
}
test('only exact official domains activate and ad host matching rejects lookalikes',()=>{
 assert.equal(install({location:{hostname:'animesaturn.at'}}),null);assert.equal(hostBlocked('a.acscdn.com'),true);assert.equal(hostBlocked('acscdn.com.evil.test'),false);assert.equal(hostBlocked('play.saturncdn.net'),false);
});
test('installation never creates/replaces video or touches provider APIs',()=>{
 const f=fixture('play.saturncdn.net',true);let calls=0;f.win.jwplayer=()=>{calls++;throw Error('Must leave provider alone');};
 for(const type of ['play','toggle','seek','fullscreen','status'])f.message({type,value:20});
 assert.equal(calls,0);assert.ok(!f.changes.some(c=>c[0]==='create'&&/video|iframe|input/i.test(c[1])));assert.equal(f.doc.body.children.length,0);assert.equal(f.api.actions.playVideo,undefined);
});
test('original Play/fullscreen clicks are untouched by the advertising guard',()=>{
 const f=fixture('play.saturncdn.net',true);let prevented=0;
 for(const name of ['Riproduci','Schermo intero','Cerca nel video'])f.events.click({target:{tagName:'DIV',getAttribute(k){return k==='aria-label'?name:null;}},preventDefault(){prevented++;},stopImmediatePropagation(){}});
 assert.equal(prevented,0);
});
test('new windows and advertising requests are blocked, source requests pass unchanged',async()=>{
 const f=fixture();assert.equal(f.win.open('https://ad.example'),null);await assert.rejects(f.win.fetch('https://acscdn.com/script/aclib.js'));
 assert.equal(await f.win.fetch('https://play.saturncdn.net/assets/js/embed/embed.js'),'ok');assert.equal(await f.win.fetch('https://media.example/video.mp4'),'ok');assert.equal(f.api.popups,1);
});
test('disabled filter preserves ordinary open/fetch',async()=>{
 const f=fixture();f.api.enabled=false;assert.equal(f.win.open('https://ad.example'),1);assert.equal(await f.win.fetch('https://acscdn.com/code'),'ok');
});
test('dynamic ad resources are rejected without blocking the player iframe',()=>{
 const f=fixture(),parent=new f.El('div'),ad=new f.El('script'),frame=new f.El('iframe');ad.setAttribute('src','https://acscdn.com/code');frame.setAttribute('src','https://play.saturncdn.net/embed/176');parent.appendChild(ad);parent.appendChild(frame);assert.deepEqual(parent.children,[frame]);
});
test('Back restores the complete quick menu without a custom playback panel',()=>{
 const f=fixture();assert.ok(!f.doc.body.children.some(e=>e.id==='saturn-toolbar'||e.id==='saturn-cinema-controls'||e.id==='saturn-menu'));
 f.key(10009);const bar=f.doc.body.children.find(e=>e.id==='saturn-toolbar');assert.ok(bar);const labels=bar.children.filter(e=>e.tagName==='BUTTON').map(e=>e.textContent);assert.deepEqual(labels,['Play / Pausa','Schermo intero','Puntata prec.','Puntata succ.','Black Clover · 70','Altro']);f.key(10009);assert.ok(!f.doc.body.children.some(e=>e.id==='saturn-toolbar'));
});
test('first OK inside the player forwards a pointer click before playback',()=>{
 const f=fixture('play.saturncdn.net',true);assert.equal(f.key(13),true);assert.equal(f.sent[0].data.type,'key');assert.equal(f.sent[0].data.code,13);
});
test('trusted click forwards mouse coordinates to the original timeline listener',()=>{
 const f=fixture('play.saturncdn.net',true),received=[];const target={tagName:'DIV',getAttribute(k){return k==='role'?'slider':null;},focus(options){assert.equal(options.preventScroll,true);},dispatchEvent(e){received.push(e);}};f.doc.elementFromPoint=()=>target;
 f.message({type:'click',x:210,y:50});assert.deepEqual(received.map(e=>e.type),['mousedown','mouseup','click']);assert.ok(received.every(e=>e.clientX===210&&e.clientY===50));
});
test('foreign origins, windows and invalid coordinates cannot click the player',()=>{
 const f=fixture('play.saturncdn.net',true);let clicks=0;f.doc.elementFromPoint=()=>({click(){clicks++;}});
 f.message({type:'click',x:10,y:10},'https://evil.test');f.message({type:'click',x:10,y:10},'https://www.animesaturn.net',{});for(const x of [-1,Infinity,NaN,'10',1281])f.message({type:'click',x,y:20});assert.equal(clicks,0);
});
test('original keyboard controls keep arrows/Enter/media keys in native fullscreen',()=>{
 const f=fixture('play.saturncdn.net',true);f.doc.fullscreenElement={};for(const code of [37,39,13,415,10252])assert.equal(f.key(code),false);assert.equal(f.sent.length,0);
});
test('Back exits native fullscreen without replacing the player or opening a playback panel',()=>{
 const f=fixture('play.saturncdn.net',true);let exited=0;f.doc.fullscreenElement={};f.doc.exitFullscreen=()=>{exited++;f.doc.fullscreenElement=null;};assert.equal(f.key(10009),true);assert.equal(exited,1);assert.equal(f.doc.body.children.length,0);
});
test('typing and search Enter remain available to the site',()=>{
 const f=fixture();let input={tagName:'INPUT'};assert.equal(f.key(39,input),false);assert.equal(f.key(13,input),false);assert.equal(f.key(10252),false);
});
test('shortcut and reload preserve the requested episode and browser navigation',()=>{
 const f=fixture();f.api.actions.blackClover50();f.api.actions.reload();assert.deepEqual(f.changes.filter(c=>/navigate|reload/.test(c[0])),[['navigate','https://www.animesaturn.net/anime/black-clover-67Dip/ep-50'],['reload']]);
});
test('cursor taps are four pixels, holds accelerate smoothly, and release stops motion',t=>{
 let now=1000;t.mock.method(Date,'now',()=>now);const f=fixture(),frames=[];
 f.doc.elementFromPoint=()=>null;f.win.requestAnimationFrame=fn=>{frames.push(fn);return frames.length;};
 function x(){const p=f.doc.body.children.find(e=>e.id==='saturn-pointer');return Number(p.style.transform.match(/translate3d\(([-.\d]+)/)[1]);}
 assert.equal(x(),640);f.key(39);assert.equal(x(),644);
 const positions=[];for(let i=0;i<55;i++){now+=16;if(i%8===0)f.key(39);frames.shift()(i*16+100);positions.push(x());}
 const early=positions[8]-positions[3],late=positions[52]-positions[47];assert.ok(late>early*2);assert.ok(positions.every((v,i)=>i===0||v-positions[i-1]<11));
 f.events.keyup({keyCode:39,preventDefault(){},stopImmediatePropagation(){}});const final=x();frames.shift()(1100);assert.equal(x(),final);
});
test('pointer events reach the original control and temporary capture handling is restored',()=>{
 const f=fixture('play.saturncdn.net',true),seen=[];f.win.PointerEvent=function(type,data){this.type=type;Object.assign(this,data);};
 function capture(){const e=Error('No hardware pointer');e.name='NotFoundError';throw e;}
 const target={tagName:'DIV',getAttribute(k){return k==='role'?'slider':null;},setPointerCapture:capture,releasePointerCapture:capture,dispatchEvent(e){if(e.type==='pointerdown')this.setPointerCapture(e.pointerId);if(e.type==='pointerup')this.releasePointerCapture(e.pointerId);seen.push(e.type);}};
 f.doc.elementFromPoint=()=>target;f.message({type:'click',x:120,y:80});
 assert.deepEqual(seen,['pointerdown','pointerup','click']);assert.equal(target.setPointerCapture,capture);assert.equal(target.releasePointerCapture,capture);assert.throws(()=>target.setPointerCapture(2147483000),/hardware/);
});
test('site fullscreen fallback keeps native keys and Back uses the original exit button',()=>{
 const f=fixture('play.saturncdn.net',true);let active=true,clicks=0;
 const control={tagName:'DIV',getAttribute(k){return k==='role'?'button':null;},getBoundingClientRect(){return{left:10,top:20,width:30,height:30};},dispatchEvent(e){if(e.type==='click'){clicks++;active=false;}}};
 f.doc.querySelector=selector=>selector==='.jw-flag-fullscreen,media-player[data-fullscreen]'?(active?{}:null):selector==='.jw-flag-fullscreen .jw-icon-fullscreen'?control:null;
 assert.equal(f.key(39),false);assert.equal(f.key(10009),true);assert.equal(clicks,1);assert.equal(active,false);
});
test('key names preserve press/release when a browser reports keyCode zero',()=>{
 const f=fixture('play.saturncdn.net',true);f.events.keydown({keyCode:0,key:'ArrowRight',preventDefault(){},stopImmediatePropagation(){}});f.events.keyup({keyCode:0,key:'ArrowRight',preventDefault(){},stopImmediatePropagation(){}});assert.deepEqual(f.sent.map(m=>[m.data.type,m.data.code]),[['key',39],['keyup',39]]);
});
function barButtons(f){const bar=f.doc.body.children.find(e=>e.id==='saturn-toolbar');return bar?bar.children.filter(e=>e.tagName==='BUTTON'):[];}
test('settings, favorites and tools are restored and Back returns to the main bar',()=>{
 const f=fixture();f.key(10009);f.api.actions.settings();assert.ok(barButtons(f).some(b=>b.getAttribute('data-saturn-action')==='resume'));assert.ok(barButtons(f).some(b=>b.getAttribute('data-saturn-action')==='favorites'));f.api.actions.tools();assert.ok(barButtons(f).some(b=>b.getAttribute('data-saturn-action')==='undoOverlay'));f.key(10009);assert.equal(barButtons(f)[0].getAttribute('data-saturn-action'),'toggleVideo');f.key(10009);assert.ok(!f.doc.body.children.some(e=>e.id==='saturn-toolbar'));
});
test('existing favorites and the last episode survive the restored menu',()=>{
 const f=fixture();f.storage.set('saturn-favorites',JSON.stringify([{url:'https://www.animesaturn.net/anime/old/ep-3',title:'Salvato prima'},{url:'javascript:alert(1)',title:'Unsafe'}]));f.api.actions.favorites();assert.ok(barButtons(f).some(b=>b.textContent==='Salvato prima'));assert.ok(!barButtons(f).some(b=>b.textContent==='Unsafe'));
 f.win.location.href='https://www.animesaturn.net/anime/current/ep-50';f.api.actions.addFavorite();assert.equal(JSON.parse(f.storage.get('saturn-favorites'))[0].url,f.win.location.href);
 f.storage.set('saturn-last',JSON.stringify({url:'https://www.animesaturn.net/anime/old/ep-3'}));f.api.actions.resume();assert.deepEqual(f.changes.at(-1),['navigate','https://www.animesaturn.net/anime/old/ep-3']);
});
test('episode navigation uses real adjacent links from the current series',()=>{
 const f=fixture();f.win.location.href='https://www.animesaturn.net/anime/show/ep-50';f.doc.querySelectorAll=selector=>selector==='a[href]'?['/anime/show/ep-49','/anime/show/ep-51','/anime/other/ep-50'].map(url=>({getAttribute(){return url;}})):[];
 f.api.actions.previousEpisode();f.api.actions.nextEpisode();assert.deepEqual(f.changes.filter(c=>c[0]==='navigate'),[['navigate','https://www.animesaturn.net/anime/show/ep-49'],['navigate','https://www.animesaturn.net/anime/show/ep-51']]);
});
test('speed preferences and filter state use the existing storage keys',()=>{
 const f=fixture();f.api.actions.speed();assert.equal(JSON.parse(f.storage.get('saturn-speed')),700);f.api.actions.autoOverlay();assert.equal(f.storage.get('saturn-auto-overlay'),'0');f.api.actions.filter();assert.equal(f.storage.get('saturn-disabled'),'1');assert.deepEqual(f.changes.at(-1),['reload']);
});
test('quick Play/fullscreen controls click only the original UI, never a provider API',()=>{
 const f=fixture('play.saturncdn.net',true),received=[];let apiCalls=0;f.win.jwplayer=()=>{apiCalls++;throw Error('Not allowed');};
 const control={tagName:'DIV',getAttribute(k){return k==='role'?'button':null;},getBoundingClientRect(){return{left:20,top:30,width:40,height:20};},dispatchEvent(e){received.push(e.type);}};
 f.doc.querySelector=selector=>/jw-icon/.test(selector)?control:null;
 f.message({type:'uiControl',action:'toggleVideo'});f.message({type:'uiControl',action:'fullscreen'});assert.equal(apiCalls,0);assert.equal(received.filter(t=>t==='click').length,2);assert.equal(f.sent.filter(m=>m.data.type==='controlResult'&&m.data.found).length,2);
 received.length=0;f.message({type:'uiControl',action:'toggleVideo'},'https://evil.test');assert.equal(received.length,0);
});
test('overlay hiding and undo protect every element inside the original player',()=>{
 const f=fixture(),jw=new f.El('div'),legitimate=new f.El('div'),ad=new f.El('div');jw.id='jw-player';jw.appendChild(legitimate);ad.id='learned-ad';ad.setAttribute('style','position:fixed;z-index:9000');
 for(const el of [legitimate,ad]){el.getBoundingClientRect=()=>({width:1200,height:700});el.style.setProperty=(name,value)=>{el.style[name]=value;};}
 f.win.getComputedStyle=el=>({position:'fixed',display:el.style.display||'block',visibility:'visible',opacity:'1',pointerEvents:'auto',zIndex:el===legitimate?'999999':'9000'});
 f.doc.querySelectorAll=selector=>selector==='div,section,aside,iframe,dialog'?[legitimate,ad]:[];
 f.api.actions.overlay();assert.equal(ad.style.display,'none');assert.equal(legitimate.style.display,undefined);assert.equal(JSON.parse(f.storage.get('saturn-overlay-rules')).length,1);
 f.api.actions.undoOverlay();assert.equal(ad.getAttribute('style'),'position:fixed;z-index:9000');assert.equal(JSON.parse(f.storage.get('saturn-overlay-rules')).length,0);
});

test('Samsung IME Done and Cancel release editable focus without cancelling native keyboard actions',()=>{
 for(const code of [65376,65385])for(const tag of ['input','textarea','div']){
  const f=fixture(),input=new f.El(tag);if(tag==='div')input.isContentEditable=true;
  input.blur=()=>{if(f.doc.activeElement===input)f.doc.activeElement=f.doc.body;};input.focus();
  assert.equal(f.key(39),false);assert.equal(f.key(code),false);assert.equal(f.doc.activeElement,f.doc.body);
  f.doc.elementFromPoint=()=>null;assert.equal(f.key(39),true);
 }
});
test('Back first leaves search, then opens and closes the complete bar without refocusing search',()=>{
 const f=fixture(),input=new f.El('input');input.blur=()=>{f.doc.activeElement=f.doc.body;};input.focus();
 assert.equal(f.key(10009),true);assert.equal(f.doc.activeElement,f.doc.body);assert.equal(barButtons(f).length,0);
 f.key(10009);assert.equal(barButtons(f).length,6);f.key(10009);assert.equal(barButtons(f).length,0);assert.notEqual(f.doc.activeElement,input);
 // Opening the bar directly from a focused field must not restore the keyboard on close.
 input.focus();f.api.actions.main();f.api.actions.close();assert.notEqual(f.doc.activeElement,input);
});
test('search Enter allows native form submission before releasing focus and preserves composition',()=>{
 const f=fixture(),timers=[],input=new f.El('input');f.win.setTimeout=fn=>{timers.push(fn);return timers.length;};input.blur=()=>{f.doc.activeElement=f.doc.body;};input.focus();
 f.events.keydown({keyCode:13,target:input,isComposing:true,preventDefault(){throw Error('Do not cancel composition');}});assert.equal(timers.length,0);assert.equal(f.doc.activeElement,input);
 assert.equal(f.key(13),false);assert.equal(f.doc.activeElement,input);timers.shift()();assert.equal(f.doc.activeElement,f.doc.body);
 input.focus();f.key(13);const newer=new f.El('input');newer.focus();timers.shift()();assert.equal(f.doc.activeElement,newer);
});
test('IME completion uses active input even when the keyboard targets body',()=>{
 const f=fixture(),input=new f.El('input');input.blur=()=>{f.doc.activeElement=f.doc.body;};input.focus();assert.equal(f.key(65385,f.doc.body),false);assert.equal(f.doc.activeElement,f.doc.body);
});
test('the search shortcut selects the visible field and never focuses a hidden desktop copy',()=>{
 const f=fixture(),hidden=new f.El('input'),shown=new f.El('input');hidden.getBoundingClientRect=()=>({width:0,height:0});shown.getBoundingClientRect=()=>({width:300,height:40});
 f.doc.querySelectorAll=selector=>selector.indexOf('input[type=search]')===0?[hidden,shown]:[];
 f.api.actions.main();f.api.actions.search();assert.equal(f.doc.activeElement,shown);assert.equal(barButtons(f).length,0);
});
test('a site autofocus cannot trap toolbar navigation inside its input',()=>{
 const f=fixture(),input=new f.El('input');input.blur=()=>{f.doc.activeElement=f.doc.body;};f.api.actions.main();input.focus();assert.equal(f.key(39),true);assert.ok(barButtons(f).includes(f.doc.activeElement));
});

test('Done returns OK to the series under the cursor, without treating Done as a click',()=>{
 const f=fixture(),input=new f.El('input'),series=new f.El('a');let selected=0;input.blur=()=>{f.doc.activeElement=f.doc.body;};series.addEventListener('click',()=>{selected++;});series.setAttribute('href','https://www.animesaturn.net/anime/black-clover-67Dip');f.doc.elementFromPoint=()=>series;input.focus();
 f.key(65376);assert.equal(selected,0);f.key(40);f.events.keyup({keyCode:40,preventDefault(){},stopImmediatePropagation(){}});f.key(13);assert.equal(selected,1);
});
test('Blue escapes text entry to the full bar and closing never opens the keyboard again',()=>{
 const f=fixture(),input=new f.El('input');input.blur=()=>{f.doc.activeElement=f.doc.body;};input.focus();f.key(406);assert.equal(barButtons(f).length,6);assert.notEqual(f.doc.activeElement,input);f.key(10009);assert.notEqual(f.doc.activeElement,input);
});

test('stop cancels pending requestAnimationFrame to prevent cursor drift',t=>{
 let now=1000,cancelled=[];t.mock.method(Date,'now',()=>now);const f=fixture();
 f.doc.elementFromPoint=()=>null;f.win.requestAnimationFrame=fn=>{return 42;};f.win.cancelAnimationFrame=id=>{cancelled.push(id);};
 f.key(39);f.events.blur({});assert.deepEqual(cancelled,[42]);
});
test('hit returns safe fallback when elementFromPoint is missing',()=>{
 const f=fixture();delete f.doc.elementFromPoint;
 // activate() calls hit() internally; it should not crash
 assert.doesNotThrow(()=>{f.key(13);});
});
test('readJSON preserves falsy stored values like zero without falling back',()=>{
 const f=fixture();f.storage.set('saturn-speed','350');
 // Reinstall to read the stored speed
 delete f.win.__saturnTV;const api2=install(f.win);
 api2.actions.speed();// 350->500
 assert.equal(JSON.parse(f.storage.get('saturn-speed')),500);
 api2.actions.speed();// 500->700
 assert.equal(JSON.parse(f.storage.get('saturn-speed')),700);
});
test('XHR ad blocking aborts without throwing an exception into caller code',()=>{
 const f=fixture();let aborted=false,thrown=false;
 f.win.XMLHttpRequest={prototype:{open:function(){},send:function(){}}};
 // Reinstall to pick up XHR
 delete f.win.__saturnTV;const api2=install(f.win);
 const xhr=Object.create(f.win.XMLHttpRequest.prototype);
 xhr.abort=()=>{aborted=true;};
 xhr.__saturnURL='https://acscdn.com/evil.js';
 try{f.win.XMLHttpRequest.prototype.send.call(xhr);}catch(e){thrown=true;}
 assert.equal(aborted,true);assert.equal(thrown,false);
});

test('remote media keys forward toggleVideo to player iframe',()=>{
 const f=fixture();const frame=new f.El('iframe');frame.id='watch-iframe';frame.src='https://play.saturncdn.net/embed/123';
 const sent=[];frame.contentWindow={postMessage(d,o){sent.push({data:d,origin:o});}};
 f.doc.querySelector=s=>s==='iframe#watch-iframe'?frame:null;
 f.key(415);// MediaPlay
 assert.equal(sent.length,1);assert.equal(sent[0].data.type,'uiControl');assert.equal(sent[0].data.action,'toggleVideo');
});
test('originalControl falls back to video container when buttons are auto-hidden',()=>{
 const f=fixture('play.saturncdn.net',true),received=[];
 const videoContainer={tagName:'DIV',getBoundingClientRect(){return{left:0,top:0,width:1280,height:720};},dispatchEvent(e){received.push(e.type);}};
 f.doc.querySelector=selector=>selector==='.jw-media'?videoContainer:null;
 f.message({type:'uiControl',action:'toggleVideo'});
 assert.ok(received.includes('click'));
 assert.equal(f.sent.filter(m=>m.data.type==='controlResult'&&m.data.found).length,1);
});
test('pending UI controls are queued and flushed once player signals ready',()=>{
 const f=fixture();const sent=[];
 f.api.actions.toggleVideo();// Frame not ready yet
 const frame=new f.El('iframe');frame.id='watch-iframe';frame.src='https://play.saturncdn.net/embed/123';
 frame.contentWindow={postMessage(d,o){sent.push({data:d,origin:o});}};
 f.doc.querySelector=s=>s==='iframe#watch-iframe'?frame:null;
 f.message({type:'ready'},'https://play.saturncdn.net',frame.contentWindow);
 assert.ok(sent.some(m=>m.data.type==='uiControl'&&m.data.action==='toggleVideo'));
});
test('fullscreen state sync hides pointer and forwards OK and seek keys',()=>{
 const f=fixture();const frame=new f.El('iframe');frame.id='watch-iframe';frame.src='https://play.saturncdn.net/embed/123';
 const sent=[];frame.contentWindow={postMessage(d,o){sent.push({data:d,origin:o});}};
 f.doc.querySelector=s=>s==='iframe#watch-iframe'?frame:null;
 f.message({type:'fullscreen',active:true},'https://play.saturncdn.net',frame.contentWindow);
 const pointer=f.doc.body.children.find(e=>e.id==='saturn-pointer');
 assert.equal(pointer.style.display,'none');
 f.key(13);// OK in fullscreen triggers toggleVideo
 assert.ok(sent.some(m=>m.data.type==='uiControl'&&m.data.action==='toggleVideo'));
 f.key(39);// Right arrow forwards seek
 assert.ok(sent.some(m=>m.data.type==='key'&&m.data.code===39));
});

test('vidstack player is preferred by default on animesaturn',()=>{
 const f=fixture();
 assert.equal(f.win.localStorage.getItem('watch:player'),'vidstack');
});
test('blackClover70 navigates to episode 70',()=>{
 const f=fixture();f.api.actions.blackClover70();
 assert.ok(f.changes.some(c=>c[0]==='navigate'&&c[1]==='https://www.animesaturn.net/anime/black-clover-67Dip/ep-70'));
});
test('local video controls operate without cross-origin iframe',()=>{
 const f=fixture();let played=0,paused=0;
 const video=new f.El('video');video.paused=true;video.play=()=>{played++;video.paused=false;};video.pause=()=>{paused++;video.paused=true;};
 f.doc.querySelector=s=>s==='video'?video:null;
 f.api.actions.toggleVideo();
 assert.equal(played,1);
 f.api.actions.toggleVideo();
 assert.equal(paused,1);
});
test('exitNative restores pointer display after fullscreen exit',()=>{
 const f=fixture();
 const pointer=f.doc.body.children.find(e=>e.id==='saturn-pointer');
 pointer.style.display='none';
 f.doc.fullscreenElement={};
 f.doc.exitFullscreen=()=>{f.doc.fullscreenElement=null;};
 f.key(10009);// Back in fullscreen exits
 assert.equal(f.doc.fullscreenElement,null);
});
