/* Saturn TV 0.9.0 — the website owns playback, seeking and fullscreen. */
(function(root){
  'use strict';
  var version='0.9.0';
  var adHosts=['subsignsodaic.com','doubleclick.net','googlesyndication.com','adsterra.com','popads.net','popcash.net','073m.com','a-ads.com','wingsmob.com','sowve.com','chagnougroalry.net','acscdn.com','viowrel.com'];
  function hostBlocked(host){host=String(host||'').toLowerCase().replace(/\.$/,'');return adHosts.some(function(h){return host===h||host.slice(-h.length-1)==='.'+h;});}
  function siteHost(host){return /^(www\.)?animesaturn\.net$/.test(String(host).toLowerCase());}
  function install(win){
    var host = win.location.hostname.toLowerCase();
    if(!siteHost(host)&&host!=='play.saturncdn.net')return null;
    if(win.__saturnTV)return win.__saturnTV;
    var doc=win.document,top=win===win.top,player=host==='play.saturncdn.net';
    var api={version:version,enabled:true,popups:0,resources:0};win.__saturnTV=api;
    try{api.enabled=win.sessionStorage.getItem('saturn-disabled')!=='1';}catch(e){}
    function blocked(url){try{return api.enabled&&hostBlocked(new win.URL(String(url),win.location.href).hostname);}catch(e){return false;}}
    function allowed(url){try{var u=new win.URL(url,win.location.href);return /^https?:$/.test(u.protocol)&&!u.username&&!u.password&&(siteHost(u.hostname)||(player&&u.hostname===host));}catch(e){return false;}}
    function own(el){for(;el&&el!==doc;el=el.parentNode)if(/^saturn-/.test(el.id||''))return true;return false;}
    var open=win.open;
    try{Object.defineProperty(win,'open',{configurable:true,get:function(){return function(){if(!api.enabled)return open.apply(win,arguments);api.popups++;return null;};},set:function(){}});}catch(e){}
    function guard(event){
      if(!api.enabled||own(event.target))return;
      for(var n=event.target;n&&n!==doc;n=n.parentNode){
        if(n.tagName!=='A'&&n.tagName!=='FORM')continue;
        var href=n.getAttribute(n.tagName==='A'?'href':'action')||'',target=String(n.getAttribute('target')||'').toLowerCase();
        if((href&&!allowed(href))||blocked(href)){event.preventDefault();event.stopImmediatePropagation();api.popups++;}
        else if(target&&target!=='_self'&&n.setAttribute)n.setAttribute('target','_self');
        return;
      }
    }
    var events=win.addEventListener?win:doc;
    events.addEventListener('click',guard,true);doc.addEventListener('submit',guard,true);doc.addEventListener('auxclick',guard,true);
    if(win.HTMLFormElement){var fp=win.HTMLFormElement.prototype,submit=fp.submit;fp.submit=function(){if(api.enabled&&!allowed(this.getAttribute('action')||win.location.href)){api.popups++;return;}return submit.apply(this,arguments);};}
    function adResource(el){return el&&/^(SCRIPT|IFRAME)$/.test(el.tagName)&&blocked(el.getAttribute('src')||'');}
    if(win.Node){['appendChild','insertBefore'].forEach(function(name){var original=win.Node.prototype[name];if(!original)return;win.Node.prototype[name]=function(el){if(adResource(el)){api.resources++;return el;}return original.apply(this,arguments);};});}
    if(win.fetch){var fetch=win.fetch;win.fetch=function(input){if(blocked(input&&input.url?input.url:input)){api.resources++;return win.Promise.reject(new Error('Risorsa pubblicitaria bloccata'));}return fetch.apply(win,arguments);};}
    if(win.XMLHttpRequest){var xp=win.XMLHttpRequest.prototype,xopen=xp.open,xsend=xp.send;xp.open=function(method,url){this.__saturnURL=url;return xopen.apply(this,arguments);};xp.send=function(){if(blocked(this.__saturnURL)){api.resources++;this.abort();throw new Error('Risorsa pubblicitaria bloccata');}return xsend.apply(this,arguments);};}
    function scan(scope){
      if(!scope||!scope.querySelectorAll||own(scope))return;
      var nodes=Array.prototype.slice.call(scope.querySelectorAll('script[src],iframe[src],[data-ad-unit],#dl-banner-728x90'));
      if(scope.tagName)nodes.unshift(scope);
      nodes.forEach(function(el){
        if(!api.enabled||!el.parentNode||own(el))return;
        var explicit=el.hasAttribute&&el.hasAttribute('data-ad-unit')||el.id==='dl-banner-728x90';
        if(!adResource(el)&&!explicit)return;
        if(el.querySelector&&el.querySelector('video,audio,#watch-iframe,#jw-player,media-player'))return;
        el.parentNode.removeChild(el);api.resources++;
      });
    }
    if(win.MutationObserver)new win.MutationObserver(function(records){records.forEach(function(record){if(record.type==='attributes')scan(record.target);else Array.prototype.forEach.call(record.addedNodes||[],function(n){if(n.nodeType===1)scan(n);});});}).observe(doc,{childList:true,subtree:true,attributes:true,attributeFilter:['src']});
    scan(doc);doc.addEventListener('DOMContentLoaded',function(){scan(doc);});

    var bar=null,buttons=[],previousFocus=null,pointer=null,cursorX=0,cursorY=0,held={},raf=null,lastTick=0,lastKey=0,motionStarted=0,idle=null,lastMove=0;
    function focus(el){if(el&&el.focus)try{el.focus({preventScroll:true});}catch(e){el.focus();}}
    function fullscreen(){var video=doc.querySelector&&doc.querySelector('video');return !!(doc.fullscreenElement||doc.webkitFullscreenElement||doc.webkitCurrentFullScreenElement||(video&&video.webkitDisplayingFullscreen)||(doc.querySelector&&doc.querySelector('.jw-flag-fullscreen,media-player[data-fullscreen]')));}
    function stop(){held={};lastTick=0;motionStarted=0;}
    function ensurePointer(){
      if(!top||!doc.body||!win.innerWidth)return false;
      if(!pointer){cursorX=Math.round(win.innerWidth/2);cursorY=Math.round(win.innerHeight/2);pointer=doc.createElement('div');pointer.id='saturn-pointer';pointer.setAttribute('aria-hidden','true');pointer.innerHTML='<svg width="28" height="34" viewBox="0 0 28 34" xmlns="http://www.w3.org/2000/svg"><path d="M2 2V28L9 21L15 32L21 29L15 18H26Z" fill="white" stroke="#101820" stroke-width="2"/></svg>';pointer.style.cssText='position:fixed;left:0;top:0;z-index:2147483646;pointer-events:none;will-change:transform';doc.body.appendChild(pointer);}
      pointer.style.transform='translate3d('+cursorX+'px,'+cursorY+'px,0)';pointer.style.display=bar||fullscreen()?'none':'block';return true;
    }
    function wake(){if(!ensurePointer())return;if(idle&&win.clearTimeout)win.clearTimeout(idle);idle=win.setTimeout(function(){if(pointer&&!bar)pointer.style.display='none';},3500);}
    function close(){if(!bar)return;bar.parentNode.removeChild(bar);bar=null;buttons=[];focus(previousFocus);wake();}
    function search(){var input=doc.querySelector&&doc.querySelector('input[type=search],input[name=key],input[name=keyword]');if(input){close();focus(input);if(input.scrollIntoView)input.scrollIntoView({block:'center'});}else win.location.assign('https://www.animesaturn.net/');}
    function episodes(){var list=doc.querySelector&&doc.querySelector('#ep-list-scroll,.ep-list-scroll');if(list){close();if(list.scrollIntoView)list.scrollIntoView({block:'center'});var first=list.querySelector('a[href]');focus(first);}}
    function navigation(){
      if(!top||!doc.body)return;if(bar){close();return;}stop();previousFocus=doc.activeElement;
      bar=doc.createElement('section');bar.id='saturn-toolbar';bar.setAttribute('aria-label','Navigazione Saturn TV');bar.style.cssText='position:fixed;top:16px;left:16px;right:16px;z-index:2147483647;background:#101820;color:#eef6ff;padding:16px;font:22px/1.4 sans-serif;max-height:85vh;overflow:auto';
      var style=doc.createElement('style');style.textContent='#saturn-toolbar button{font:inherit;min-height:48px;padding:10px 16px;margin:6px;border:1px solid #72899c;background:#1d3040;color:#eef6ff}#saturn-toolbar button:focus{outline:3px solid #8cdeff;outline-offset:2px}';bar.appendChild(style);
      var title=doc.createElement('div');title.textContent='Saturn TV · '+version;bar.appendChild(title);
      [['Cerca','search'],['Puntate','episodes'],['Black Clover · 50','blackClover50'],['Home','home'],['Aggiorna pagina','reload'],['Chiudi','close']].forEach(function(spec){var b=doc.createElement('button');b.type='button';b.textContent=spec[0];b.setAttribute('data-saturn-action',spec[1]);b.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();api.actions[spec[1]]();});bar.appendChild(b);buttons.push(b);});
      doc.body.appendChild(bar);focus(buttons[0]);ensurePointer();
    }
    api.actions={main:navigation,close:close,search:search,episodes:episodes,home:function(){win.location.assign('https://www.animesaturn.net/');},blackClover50:function(){win.location.assign('https://www.animesaturn.net/anime/black-clover-67Dip/ep-50');},reload:function(){win.location.reload();}};
    api.status=navigation;
    function trustedFrame(frame){try{return frame&&frame.id==='watch-iframe'&&new win.URL(frame.src,win.location.href).origin==='https://play.saturncdn.net';}catch(e){return false;}}
    function hit(){
      var el=doc.elementFromPoint(cursorX,cursorY),x=cursorX,y=cursorY;
      for(var i=0;el&&el.tagName==='IFRAME'&&i<5;i++){
        var frame=el,r=el.getBoundingClientRect();x-=r.left;y-=r.top;
        try{el=el.contentDocument.elementFromPoint(x,y);}catch(e){return {frame:frame,el:null,x:x,y:y};}
      }
      return {el:el,x:x,y:y};
    }
    function click(el,x,y){
      if(!el)return;
      var target=el;
      for(var i=0;target&&target!==doc&&i<10;i++,target=target.parentNode)if(/^(A|BUTTON|INPUT|TEXTAREA|SELECT|VIDEO)$/.test(target.tagName)||(target.getAttribute&&/^(button|slider)$/.test(target.getAttribute('role')||''))){el=target;break;}
      focus(el);
      if(el.dispatchEvent&&win.MouseEvent){
        if(win.PointerEvent){
          // Virtual pointers have no OS capture. Suppress only that expected error,
          // only on this target's ancestor chain, and restore every method immediately.
          var restore=[],virtualId=2147483000;
          for(var n=el;n&&n!==doc;n=n.parentNode)['setPointerCapture','releasePointerCapture'].forEach(function(name){
            if(typeof n[name]!=='function')return;
            var node=n,original=node[name],had=Object.prototype.hasOwnProperty.call(node,name);
            try{node[name]=function(id){try{return original.call(this,id);}catch(e){if(id!==virtualId||e.name!=='NotFoundError')throw e;}};restore.push({node:node,name:name,original:original,had:had});}catch(e){}
          });
          try{['pointerdown','pointerup'].forEach(function(type){el.dispatchEvent(new win.PointerEvent(type,{bubbles:true,cancelable:true,clientX:x,clientY:y,pointerId:virtualId,pointerType:'mouse',isPrimary:true,button:0,buttons:type==='pointerdown'?1:0,pressure:type==='pointerdown'?0.5:0}));});}
          finally{restore.forEach(function(item){if(item.had)item.node[item.name]=item.original;else delete item.node[item.name];});}
        }else ['mousedown','mouseup'].forEach(function(type){el.dispatchEvent(new win.MouseEvent(type,{bubbles:true,cancelable:true,clientX:x,clientY:y,button:0,buttons:type==='mousedown'?1:0}));});
        el.dispatchEvent(new win.MouseEvent('click',{bubbles:true,cancelable:true,clientX:x,clientY:y,button:0}));
      }
      else if(el.click)el.click();
    }
    function hover(el,x,y){if(!el||!el.dispatchEvent)return;if(win.PointerEvent)el.dispatchEvent(new win.PointerEvent('pointermove',{bubbles:true,clientX:x,clientY:y,pointerId:2147483000,pointerType:'mouse',isPrimary:true,buttons:0}));if(win.MouseEvent)el.dispatchEvent(new win.MouseEvent('mousemove',{bubbles:true,clientX:x,clientY:y}));}
    function activate(){var target=hit();if(target.frame){if(trustedFrame(target.frame))target.frame.contentWindow.postMessage({saturnTV:1,type:'click',x:target.x,y:target.y},'https://play.saturncdn.net');}else click(target.el,target.x,target.y);}
    function move(dx,dy){
      if(!pointer&&!ensurePointer())return;var nextY=cursorY+dy;
      if(dy&&win.getComputedStyle){var el=doc.elementFromPoint(cursorX,cursorY);for(;el&&el!==doc.body;el=el.parentNode){if(el.scrollHeight>el.clientHeight+2&&/auto|scroll/.test(win.getComputedStyle(el).overflowY)){var r=el.getBoundingClientRect();if((dy>0&&nextY>r.bottom-16)||(dy<0&&nextY<r.top+16)){var old=el.scrollTop;el.scrollTop+=dy;if(el.scrollTop!==old)nextY=cursorY;}break;}}}
      if((nextY<16||nextY>win.innerHeight-35)&&win.scrollBy)win.scrollBy(0,dy);
      cursorX=Math.max(4,Math.min(win.innerWidth-32,cursorX+dx));cursorY=Math.max(16,Math.min(win.innerHeight-35,nextY));ensurePointer();
      var target=hit();if(target.frame){if(trustedFrame(target.frame)&&Date.now()-lastMove>=40){lastMove=Date.now();target.frame.contentWindow.postMessage({saturnTV:1,type:'move',x:target.x,y:target.y},'https://play.saturncdn.net');}}
      else hover(target.el,target.x,target.y);
    }
    function tick(time){
      raf=null;if(bar||fullscreen()||Date.now()-lastKey>900){stop();return;}
      var x=(held[39]?1:0)-(held[37]?1:0),y=(held[40]?1:0)-(held[38]?1:0);if(!x&&!y){lastTick=0;motionStarted=0;return;}
      var heldFor=Date.now()-motionStarted,ramp=Math.min(1,Math.max(0,heldFor-120)/850),speed=heldFor<120?0:90+510*ramp*ramp;
      var distance=(lastTick?Math.min(time-lastTick,40):0)*speed/1000/(x&&y?1.414:1);lastTick=time;move(x*distance,y*distance);raf=win.requestAnimationFrame(tick);
    }
    function arrow(code){
      lastKey=Date.now();if(!motionStarted)motionStarted=lastKey;
      var opposite={37:39,39:37,38:40,40:38}[code];if(held[opposite]){delete held[opposite];motionStarted=lastKey;}
      if(!held[code])move(code===37?-4:code===39?4:0,code===38?-4:code===40?4:0);
      held[code]=true;if(win.requestAnimationFrame&&raf===null)raf=win.requestAnimationFrame(tick);
    }
    function editing(target){return target&&(/^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName)||target.isContentEditable);}
    function keyCode(e){return e.keyCode||{ArrowLeft:37,ArrowUp:38,ArrowRight:39,ArrowDown:40,Enter:13,Escape:27,ColorF3Blue:406,XF86Back:10009}[e.key||e.code]||0;}
    function prevent(e){e.preventDefault();e.stopImmediatePropagation();}
    function exitNative(e){
      var exit=doc.exitFullscreen||doc.webkitExitFullscreen||doc.webkitCancelFullScreen,video=doc.querySelector&&doc.querySelector('video');
      if(!fullscreen())return false;
      try{if(exit&&(doc.fullscreenElement||doc.webkitFullscreenElement||doc.webkitCurrentFullScreenElement)){prevent(e);exit.call(doc);return true;}if(video&&video.webkitDisplayingFullscreen&&video.webkitExitFullscreen){prevent(e);video.webkitExitFullscreen();return true;}
        var control=doc.querySelector&&doc.querySelector('.jw-flag-fullscreen .jw-icon-fullscreen');if(control){var r=control.getBoundingClientRect();prevent(e);click(control,r.left+r.width/2,r.top+r.height/2);return true;}
      }catch(ignore){}return false;
    }
    function key(event){
      var code=keyCode(event),target=event.target||doc.activeElement;
      if(fullscreen()){if(code===10009)exitNative(event);return;}
      if(editing(target)){
        if(code===13&&target.tagName==='INPUT')win.setTimeout(function(){if(target.blur)target.blur();wake();},0);
        return;
      }
      if(!top){
        if(player&&[37,38,39,40,13,10009,406].indexOf(code)!==-1){prevent(event);win.parent.postMessage({saturnTV:1,type:'key',code:code,repeat:!!event.repeat},'https://www.animesaturn.net');}return;
      }
      if(code===10009||code===406){prevent(event);if(!event.repeat)navigation();return;}
      if(bar){
        if([37,38,39,40,13,27].indexOf(code)===-1)return;prevent(event);
        if(code===27){close();return;}if(code===13){if(!event.repeat&&buttons.indexOf(doc.activeElement)!==-1)doc.activeElement.click();return;}
        var pos=buttons.indexOf(doc.activeElement);focus(buttons[(pos+(code===37||code===38?-1:1)+buttons.length)%buttons.length]);return;
      }
      if([37,38,39,40,13].indexOf(code)===-1||!doc.elementFromPoint)return;
      prevent(event);wake();if(code===13){if(!event.repeat)activate();}else arrow(code);
    }
    api.handleKey=key;
    events.addEventListener('keydown',key,true);
    events.addEventListener('keyup',function(e){var code=keyCode(e);delete held[code];if(!fullscreen()&&!editing(e.target||doc.activeElement)&&[37,38,39,40,13,10009,406].indexOf(code)!==-1)prevent(e);if(player&&!top)win.parent.postMessage({saturnTV:1,type:'keyup',code:code},'https://www.animesaturn.net');},true);
    events.addEventListener('blur',stop,true);
    doc.addEventListener('DOMContentLoaded',ensurePointer);doc.addEventListener('fullscreenchange',function(){stop();ensurePointer();});doc.addEventListener('webkitfullscreenchange',function(){stop();ensurePointer();});
    if(win.addEventListener)win.addEventListener('message',function(event){
      var data=event.data;if(!data||data.saturnTV!==1)return;
      if(top){var frame=doc.querySelector&&doc.querySelector('iframe#watch-iframe');if(!trustedFrame(frame)||event.source!==frame.contentWindow||event.origin!=='https://play.saturncdn.net')return;
        if(data.type==='key'&&[37,38,39,40,13,10009,406].indexOf(data.code)!==-1)key({keyCode:data.code,target:frame,repeat:!!data.repeat,preventDefault:function(){},stopImmediatePropagation:function(){}});
        else if(data.type==='keyup')delete held[data.code];
      }else if(player&&event.source===win.parent&&event.origin==='https://www.animesaturn.net'){
        if((data.type!=='move'&&data.type!=='click')||typeof data.x!=='number'||typeof data.y!=='number'||!isFinite(data.x)||!isFinite(data.y)||data.x<0||data.y<0||data.x>win.innerWidth||data.y>win.innerHeight)return;
        var el=doc.elementFromPoint(data.x,data.y);if(data.type==='click')click(el,data.x,data.y);else hover(el,data.x,data.y);
      }
    });
    ensurePointer();return api;
  }
  if(typeof module!=='undefined'&&module.exports)module.exports={hostBlocked:hostBlocked,install:install};else install(root);
}(typeof window==='undefined'?this:window));
