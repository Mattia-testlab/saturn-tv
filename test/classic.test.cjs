const {test}=require('node:test');
const assert=require('node:assert/strict');
const {install,hostBlocked}=require('../saturn.js');
function fixture(host='www.animesaturn.net',child=false){
 const events={},docEvents={},sent=[],changes=[],storage=new Map();let doc;
 class El{
  constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.attrs={};this.style={};this.handlers={};this.nodeType=1;}
  appendChild(n){this.children.push(n);n.parentNode=this;return n;}insertBefore(n){return this.appendChild(n);}removeChild(n){this.children=this.children.filter(x=>x!==n);n.parentNode=null;}
  setAttribute(k,v){this.attrs[k]=v;}getAttribute(k){return this.attrs[k]||null;}hasAttribute(k){return k in this.attrs;}
  addEventListener(k,f){this.handlers[k]=f;}querySelectorAll(){return [];}querySelector(){return null;}
  focus(options){doc.activeElement=this;this.focusOptions=options;}click(){if(this.handlers.click)this.handlers.click.call(this,{preventDefault(){},stopPropagation(){}});}dispatchEvent(e){if(this.handlers[e.type])this.handlers[e.type].call(this,e);return true;}
 }
 doc={body:new El('body'),documentElement:{},activeElement:null,createElement(tag){changes.push(['create',tag]);return new El(tag);},querySelectorAll(){return [];},querySelector(){return null;},addEventListener(k,f){docEvents[k]=f;}};
 const parent={postMessage(data,origin){sent.push({data,origin});}};
 const win={document:doc,Node:El,URL,Promise,innerWidth:1280,innerHeight:720,location:{hostname:host,href:'https://'+host+'/',assign(url){changes.push(['navigate',url]);},reload(){changes.push(['reload']);}},sessionStorage:{getItem(k){return storage.get(k);},setItem(k,v){storage.set(k,v);}},open(){changes.push(['open']);return 1;},fetch(input){changes.push(['fetch',input]);return Promise.resolve('ok');},setTimeout(){},addEventListener(k,f){events[k]=f;},MouseEvent:function(type,data){this.type=type;Object.assign(this,data);}};
 win.top=child?{}:win;win.parent=parent;
 const api=install(win);
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
test('navigation is hidden initially and contains no playback/fullscreen controls',()=>{
 const f=fixture();assert.ok(!f.doc.body.children.some(e=>e.id==='saturn-toolbar'||e.id==='saturn-cinema-controls'||e.id==='saturn-menu'));
 f.key(10009);const bar=f.doc.body.children.find(e=>e.id==='saturn-toolbar');assert.ok(bar);const labels=bar.children.filter(e=>e.tagName==='BUTTON').map(e=>e.textContent);assert.deepEqual(labels,['Cerca','Puntate','Black Clover · 50','Home','Aggiorna pagina','Chiudi']);f.key(10009);assert.ok(!f.doc.body.children.some(e=>e.id==='saturn-toolbar'));
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
