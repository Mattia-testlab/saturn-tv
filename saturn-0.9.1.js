/* Saturn TV 0.9.4 — player del sito (Vidstack/JW) · puntate rapide · telecomando Samsung */
(function(root){
  'use strict';
  var version='0.9.4';
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
    try{if(siteHost(host)&&win.localStorage.getItem('watch:player')!=='vidstack')win.localStorage.setItem('watch:player','vidstack');}catch(e){}
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
    if(win.XMLHttpRequest){var xp=win.XMLHttpRequest.prototype,xopen=xp.open,xsend=xp.send;xp.open=function(method,url){this.__saturnURL=url;return xopen.apply(this,arguments);};xp.send=function(){if(blocked(this.__saturnURL)){api.resources++;this.abort();return;}return xsend.apply(this,arguments);};}
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
      scanOverlays(scope);
    }
    if(win.MutationObserver)new win.MutationObserver(function(records){records.forEach(function(record){if(record.type==='attributes')scan(record.target);else Array.prototype.forEach.call(record.addedNodes||[],function(n){if(n.nodeType===1)scan(n);});});}).observe(doc,{childList:true,subtree:true,attributes:true,attributeFilter:['src']});

    function ensureVidstack(){
      if(!top||!siteHost(host))return;
      var btn=doc.querySelector&&doc.querySelector('button[title*="Cambia player" i],button[x-show="canSwitch"]');
      if(btn){var span=btn.querySelector('span');if(span&&/JW/i.test(span.textContent)&&btn.click)btn.click();}
    }
    doc.addEventListener('DOMContentLoaded',function(){scan(doc);rememberPage();ensureVidstack();});
    if(win.setTimeout){win.setTimeout(ensureVidstack,600);win.setTimeout(ensureVidstack,1600);}

    var bar=null,buttons=[],previousFocus=null,pointer=null,cursorX=0,cursorY=0,held={},raf=null,lastTick=0,lastKey=0,motionStarted=0,idle=null,lastMove=0,playerFullscreen=false;
    function focus(el){if(el&&el.focus)try{el.focus({preventScroll:true});}catch(e){el.focus();}}
    function fullscreen(){
      var video=doc.querySelector&&doc.querySelector('video');
      var siteFs=!!(doc.querySelector&&doc.querySelector('.jw-flag-fullscreen,media-player[data-fullscreen]'));
      var nativeFs=!!(doc.fullscreenElement||doc.webkitFullscreenElement||doc.webkitCurrentFullScreenElement||(video&&video.webkitDisplayingFullscreen));
      return !!(playerFullscreen||nativeFs||siteFs);
    }
    function stop(){held={};lastTick=0;motionStarted=0;if(raf!==null&&win.cancelAnimationFrame){win.cancelAnimationFrame(raf);raf=null;}}
    function ensurePointer(){
      if(!top||!doc.body||!win.innerWidth)return false;
      if(!pointer){cursorX=Math.round(win.innerWidth/2);cursorY=Math.round(win.innerHeight/2);pointer=doc.createElement('div');pointer.id='saturn-pointer';pointer.setAttribute('aria-hidden','true');pointer.innerHTML='<svg width="28" height="34" viewBox="0 0 28 34" xmlns="http://www.w3.org/2000/svg"><path d="M2 2V28L9 21L15 32L21 29L15 18H26Z" fill="white" stroke="#101820" stroke-width="2"/></svg>';pointer.style.cssText='position:fixed;left:0;top:0;z-index:2147483646;pointer-events:none;will-change:transform';doc.body.appendChild(pointer);}
      pointer.style.transform='translate3d('+cursorX+'px,'+cursorY+'px,0)';pointer.style.display=bar||fullscreen()?'none':'block';return true;
    }
    function wake(){if(!ensurePointer())return;if(pointer&&!bar)pointer.style.display=fullscreen()?'none':'block';if(idle&&win.clearTimeout)win.clearTimeout(idle);idle=win.setTimeout(function(){if(pointer&&!bar)pointer.style.display='none';},3500);}
    var view='main',lastAction={},message=null,hiddenOverlays=[],autoOverlay=true;
    function readJSON(key,fallback){try{var raw=win.localStorage.getItem(key);if(raw===null)return fallback;var val=JSON.parse(raw);return val!==null&&val!==undefined?val:fallback;}catch(e){return fallback;}}
    function writeJSON(key,value){try{win.localStorage.setItem(key,JSON.stringify(value));return true;}catch(e){report('Memoria non disponibile.');return false;}}
    var learned=readJSON('saturn-overlay-rules',[]);if(!Array.isArray(learned))learned=[];
    var cursorSpeed=readJSON('saturn-speed',500);if([350,500,700].indexOf(cursorSpeed)===-1)cursorSpeed=500;
    try{autoOverlay=win.sessionStorage.getItem('saturn-auto-overlay')!=='0';}catch(e){}
    function report(text){if(message)message.textContent=text;}
    function safePage(page){try{var u=new win.URL(page.url);return u.protocol==='https:'&&siteHost(u.hostname)&&!u.username&&!u.password;}catch(e){return false;}}
    function latestPage(){var saved=readJSON('saturn-last',null);if(!safePage(saved))saved=readJSON('saturn-bookmark',null);return safePage(saved)?saved:null;}
    function rememberPage(){if(top&&/^\/(?:anime|episode)\/[^/]+\/ep-\d+/.test(new win.URL(win.location.href).pathname))writeJSON('saturn-last',{url:win.location.href,title:doc.title||'Ultima puntata'});}
    function close(){if(!bar)return;if(doc.activeElement&&doc.activeElement.getAttribute){var action=doc.activeElement.getAttribute('data-saturn-action');if(action)lastAction[view]=action;}if(editing(doc.activeElement))leaveEditing(doc.activeElement);bar.parentNode.removeChild(bar);bar=null;buttons=[];message=null;if(previousFocus&&!editing(previousFocus)&&!own(previousFocus)&&previousFocus.isConnected!==false)focus(previousFocus);previousFocus=null;wake();}
    function switchView(next){close();view=next;navigation();}
    function visible(el){if(!el||el.disabled||!el.getBoundingClientRect)return false;var r=el.getBoundingClientRect();if(!r.width||!r.height)return false;var css=win.getComputedStyle&&win.getComputedStyle(el);return !css||(css.visibility!=='hidden'&&css.display!=='none');}
    function search(){var inputs=doc.querySelectorAll('input[type=search],input[name=key],input[name=keyword]'),input=Array.prototype.filter.call(inputs,visible)[0];if(input){close();if(input.scrollIntoView)input.scrollIntoView({block:'center'});focus(input);}else{var opener=doc.querySelector&&doc.querySelector('header button[aria-label="Cerca"]');if(visible(opener)){close();opener.click();}else report('Ricerca non presente: apri Home.');}}
    function episodeList(){var list=doc.querySelector&&doc.querySelector('#ep-list-scroll,.ep-list-scroll');if(!list){report('Lista puntate non trovata.');return;}close();if(list.scrollIntoView)list.scrollIntoView({block:'center'});focus(list.querySelector('a[href]'));}
    function episodeLinks(){
      var match=new win.URL(win.location.href).pathname.match(/^\/(?:anime|episode)\/([^/]+)\/ep-(\d+)/),result={previous:null,next:null};if(!match)return result;
      var current=Number(match[2]),lower=-1,higher=Infinity;
      Array.prototype.forEach.call(doc.querySelectorAll('a[href]'),function(link){try{var u=new win.URL(link.getAttribute('href'),win.location.href),m=u.pathname.match(/^\/(?:anime|episode)\/([^/]+)\/ep-(\d+)/);if(!m||m[1]!==match[1]||!allowed(u.href))return;var n=Number(m[2]);if(n<current&&n>lower){lower=n;result.previous=u.href;}if(n>current&&n<higher){higher=n;result.next=u.href;}}catch(e){}});return result;
    }
    var pendingPlayer=[];
    function sendPlayer(data){var frame=doc.querySelector&&doc.querySelector('iframe#watch-iframe');if(!trustedFrame(frame)){if(data.type==='uiControl')pendingPlayer.push(data);return false;}frame.contentWindow.postMessage(data,'https://play.saturncdn.net');return true;}
    function settingsSync(){if(top)sendPlayer({saturnTV:1,type:'settings',enabled:api.enabled,autoOverlay:autoOverlay});}
    function localControl(action){
      var ctrl=originalControl(action);
      if(ctrl){click(ctrl.el,ctrl.x,ctrl.y);return true;}
      var video=doc.querySelector&&doc.querySelector('video');
      if(video){
        if(action==='toggleVideo'){if(video.paused)try{video.play();}catch(e){}else try{video.pause();}catch(e){}return true;}
        if(action==='fullscreen'){var req=video.requestFullscreen||video.webkitRequestFullscreen||video.webkitEnterFullscreen;if(req)try{req.call(video);return true;}catch(e){}}
      }
      return false;
    }
    function playerControl(action){if(localControl(action))return;if(!sendPlayer({saturnTV:1,type:'uiControl',action:action}))report('Nessun video trovato.');}
    function setAuto(value){autoOverlay=!!value;try{win.sessionStorage.setItem('saturn-auto-overlay',autoOverlay?'1':'0');}catch(e){}refreshLabels();if(autoOverlay)scanOverlays(doc);}
    function refreshLabels(){buttons.forEach(function(b){var action=b.getAttribute('data-saturn-action');if(action==='speed')b.textContent='Cursore: '+(cursorSpeed===350?'lento':cursorSpeed===500?'medio':'veloce');if(action==='autoOverlay')b.textContent='Overlay automatici: '+(autoOverlay?'ON':'OFF');});}
    function navigation(){
      if(!top||!doc.body)return;if(bar){close();return;}stop();previousFocus=doc.activeElement;
      bar=doc.createElement('section');bar.id='saturn-toolbar';bar.setAttribute('data-view',view);bar.setAttribute('aria-label','Comandi Saturn TV');bar.style.cssText='position:fixed;top:3vh;left:3vw;right:3vw;z-index:2147483647;background:#101820;color:#eef6ff;padding:20px;font:22px/1.4 sans-serif;max-height:88vh;overflow:auto;box-sizing:border-box';
      var style=doc.createElement('style');style.textContent='#saturn-toolbar button{font:inherit;min-height:54px;padding:12px 16px;margin:6px;border:1px solid #72899c;background:#1d3040;color:#eef6ff;box-sizing:border-box}#saturn-toolbar[data-view=main] button{width:calc(33.333% - 12px)}#saturn-toolbar button:focus{outline:3px solid #8cdeff;outline-offset:2px}#saturn-toolbar button:disabled{color:#adbdca;border-color:#526575}';bar.appendChild(style);
      var title=doc.createElement('div');title.textContent=(view==='settings'?'Altre opzioni':view==='episodes'?'Puntate':view==='tools'?'Strumenti':view==='favorites'?'Preferiti':'Saturn TV')+' · '+version;bar.appendChild(title);
      var specs,neighbors=episodeLinks();
      if(view==='main')specs=[['Play / Pausa','toggleVideo'],['Schermo intero','fullscreen'],['Puntata prec.','previousEpisode'],['Puntata succ.','nextEpisode'],['Black Clover · 70','blackClover70'],['Altro','settings']];
      else if(view==='settings')specs=[['Torna','main'],['Riprendi','resume'],['Cambia player','switchPlayer'],['Cerca','search'],['Puntate','episodes'],['Preferiti','favorites'],['Home','home'],['Velocità cursore','speed'],['Overlay automatici','autoOverlay'],['Strumenti','tools']];
      else if(view==='episodes')specs=[['Torna','main'],['Puntata precedente','previousEpisode'],['Puntata successiva','nextEpisode'],['Mostra lista puntate','episodeList']];
      else if(view==='tools')specs=[['Torna','settings'],['Aggiorna pagina','reload'],[api.enabled?'Disattiva filtro':'Attiva filtro','filter'],['Nascondi overlay e ricordalo','overlay'],['Annulla rimozione','undoOverlay'],['Stato lettore','playerStatus'],['Versione attiva','info']];
      else{specs=[['Torna','main'],['Aggiungi questa pagina','addFavorite']];var favorites=readJSON('saturn-favorites',[]);if(!Array.isArray(favorites))favorites=[];favorites.filter(safePage).slice(0,12).forEach(function(saved,i){var action='favorite'+i;api.actions[action]=function(){win.location.assign(saved.url);};specs.push([saved.title||saved.url,action]);});}
      specs.forEach(function(spec){var b=doc.createElement('button');b.type='button';b.textContent=spec[0];b.setAttribute('data-saturn-action',spec[1]);if(spec[1]==='resume')b.disabled=!latestPage();if(spec[1]==='previousEpisode')b.disabled=!neighbors.previous&&!doc.querySelector('button[title*="precedente" i]');if(spec[1]==='nextEpisode')b.disabled=!neighbors.next&&!doc.querySelector('button[title*="successivo" i]');b.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();lastAction[view]=spec[1];api.actions[spec[1]]();});bar.appendChild(b);buttons.push(b);});
      message=doc.createElement('p');message.setAttribute('role','status');message.setAttribute('aria-live','polite');message.textContent=view==='main'?'Frecce · OK seleziona · Indietro chiude':view==='tools'?'Aggiorna e cambio filtro ricaricano la pagina.':'Indietro torna alla barra principale.';bar.appendChild(message);
      doc.body.appendChild(bar);refreshLabels();focus(buttons.filter(function(b){return !b.disabled&&b.getAttribute('data-saturn-action')===lastAction[view];})[0]||buttons.filter(function(b){return !b.disabled;})[0]);ensurePointer();
    }
    api.actions={main:function(){switchView('main');},close:close,search:search,episodes:function(){switchView('episodes');},episodeList:episodeList,settings:function(){switchView('settings');},tools:function(){switchView('tools');},favorites:function(){switchView('favorites');},
      toggleVideo:function(){playerControl('toggleVideo');},fullscreen:function(){playerControl('fullscreen');},playerStatus:function(){playerControl('status');},
      home:function(){win.location.assign('https://www.animesaturn.net/');},
      blackClover70:function(){win.location.assign('https://www.animesaturn.net/anime/black-clover-67Dip/ep-70');},
      blackClover50:function(){win.location.assign('https://www.animesaturn.net/anime/black-clover-67Dip/ep-50');},
      reload:function(){win.location.reload();},
      back:function(){if(win.history)win.history.back();},forward:function(){if(win.history)win.history.forward();},
      previousEpisode:function(){
        var btn=doc.querySelector&&doc.querySelector('button[title*="precedente" i],button[title*="Episodio precedente" i]');
        if(btn&&!btn.disabled&&btn.click){btn.click();return;}
        var url=episodeLinks().previous;if(url){win.location.assign(url);return;}
        var m=new win.URL(win.location.href).pathname.match(/^\/(?:anime|episode)\/([^/]+)\/ep-(\d+)/);
        if(m&&Number(m[2])>1)win.location.assign('/anime/'+m[1]+'/ep-'+(Number(m[2])-1));
      },
      nextEpisode:function(){
        var btn=doc.querySelector&&doc.querySelector('button[title*="successivo" i],button[title*="Episodio successivo" i]');
        if(btn&&!btn.disabled&&btn.click){btn.click();return;}
        var url=episodeLinks().next;if(url){win.location.assign(url);return;}
        var m=new win.URL(win.location.href).pathname.match(/^\/(?:anime|episode)\/([^/]+)\/ep-(\d+)/);
        if(m)win.location.assign('/anime/'+m[1]+'/ep-'+(Number(m[2])+1));
      },
      switchPlayer:function(){
        var btn=doc.querySelector&&doc.querySelector('button[title*="Cambia player" i],button[x-show="canSwitch"]');
        if(btn&&btn.click){btn.click();report('Cambiato player video.');}
        else{try{var c=win.localStorage.getItem('watch:player');win.localStorage.setItem('watch:player',c==='vidstack'?'jw':'vidstack');win.location.reload();}catch(e){report('Impossibile cambiare player.');}}
      },
      resume:function(){var saved=latestPage();if(saved)win.location.assign(saved.url);else report('Nessuna puntata salvata.');},
      save:function(){var entry={url:win.location.href,title:doc.title||'Puntata'};if(safePage(entry)&&writeJSON('saturn-bookmark',entry))report('Pagina salvata.');},
      addFavorite:function(){var entry={url:win.location.href,title:doc.title||'Puntata'};if(!safePage(entry))return;var saved=readJSON('saturn-favorites',[]);if(!Array.isArray(saved))saved=[];saved=saved.filter(function(item){return item.url!==entry.url;});saved.unshift(entry);if(writeJSON('saturn-favorites',saved.slice(0,12)))switchView('favorites');},
      speed:function(){cursorSpeed=cursorSpeed===350?500:cursorSpeed===500?700:350;writeJSON('saturn-speed',cursorSpeed);refreshLabels();},
      autoOverlay:function(){setAuto(!autoOverlay);settingsSync();},overlay:function(){if(!hideOverlay(false,doc)&&!sendPlayer({saturnTV:1,type:'utility',action:'overlay'}))report('Nessun overlay separabile dal player trovato.');},
      undoOverlay:function(){setAuto(false);settingsSync();if(!undoOverlay()&&!sendPlayer({saturnTV:1,type:'utility',action:'undoOverlay'}))report('Nessuna rimozione da annullare.');},
      filter:function(){try{win.sessionStorage.setItem('saturn-disabled',api.enabled?'1':'0');win.location.reload();}catch(e){report('Impossibile salvare il filtro.');}},
      info:function(){report('Versione attiva '+version+' · modulo stabile Mattia-testlab/saturn-tv.');}
    };
    api.status=navigation;
    function insidePlayer(el){for(var n=el;n&&n!==doc;n=n.parentNode)if(n.id==='jw-player'||n.id==='watch-iframe'||n.id==='vidstack-player'||n.id==='embed-shell'||/^(VIDEO|AUDIO|MEDIA-PLAYER)$/.test(n.tagName))return true;return false;}
    function overlaySignature(el){var frames=el.tagName==='IFRAME'?[el]:el.querySelectorAll('iframe[src]'),source='';if(frames.length)try{var u=new win.URL(frames[0].getAttribute('src'),win.location.href);source=u.origin+u.pathname;}catch(e){}var id=el.id||'',cls=String(el.getAttribute('class')||'').trim();return id||cls||source?el.tagName+'|'+id+'|'+cls+'|'+source:'';}
    function overlayCandidate(el){
      if(!el||own(el)||insidePlayer(el)||el===doc.body||el===doc.documentElement||!win.getComputedStyle||!el.getBoundingClientRect||/^(INPUT|BUTTON|SELECT|TEXTAREA)$/.test(el.tagName))return false;
      if(el.querySelector&&el.querySelector('video,audio,#watch-iframe,#jw-player,#vidstack-player,media-player,form,[role=dialog],iframe[src*="/embed/"],iframe[src*="recaptcha"],iframe[src*="turnstile"]'))return false;
      if(el.tagName==='IFRAME'&&/embed|captcha|turnstile/i.test(el.getAttribute('src')||''))return false;
      var css=win.getComputedStyle(el),r=el.getBoundingClientRect();return css.position==='fixed'&&css.display!=='none'&&css.visibility!=='hidden'&&css.opacity!=='0'&&css.pointerEvents!=='none'&&r.width>=win.innerWidth*.3&&r.height>=win.innerHeight*.25;
    }
    function recognizedOverlay(el){var signature=overlaySignature(el);if(signature&&learned.indexOf(signature)!==-1)return true;var frames=el.tagName==='IFRAME'?[el]:el.querySelectorAll('iframe[src]');for(var i=0;i<frames.length;i++)if(adResource(frames[i]))return true;return false;}
    function hideOverlay(automatic,scope){
      if(!scope||!scope.querySelectorAll||!win.getComputedStyle)return false;
      var nodes=Array.prototype.slice.call(scope.querySelectorAll('div,section,aside,iframe,dialog')),best=null,z=-Infinity;if(scope.tagName)nodes.unshift(scope);
      nodes.forEach(function(el){if(!overlayCandidate(el)||(automatic&&!recognizedOverlay(el)))return;var layer=parseInt(win.getComputedStyle(el).zIndex,10)||0;if(layer>z){z=layer;best=el;}});
      if(!best)return false;
      var signature=overlaySignature(best);if(!automatic&&signature&&learned.indexOf(signature)===-1){learned.push(signature);learned=learned.slice(-30);writeJSON('saturn-overlay-rules',learned);}
      hiddenOverlays.push({element:best,style:best.getAttribute('style'),signature:signature});best.style.setProperty('display','none','important');api.popups++;watchOverlay(best);report('Overlay nascosto e ricordato. Annulla rimozione lo ripristina.');return true;
    }
    function watchOverlay(el){if(!win.MutationObserver||el.__saturnOverlayWatch||insidePlayer(el)||own(el)||!el.id)return;var base=el.tagName+'|'+el.id+'|';if(!learned.some(function(rule){return rule.indexOf(base)===0;}))return;el.__saturnOverlayWatch=true;new win.MutationObserver(function(){if(autoOverlay&&api.enabled)hideOverlay(true,el);}).observe(el,{attributes:true,attributeFilter:['style','class']});}
    function scanOverlays(scope){if(!scope||!scope.querySelectorAll||insidePlayer(scope)||own(scope))return;var nodes=Array.prototype.slice.call(scope.querySelectorAll('div[id],section[id],aside[id],iframe[id]'));if(scope.tagName)nodes.unshift(scope);nodes.forEach(watchOverlay);if(autoOverlay&&api.enabled)hideOverlay(true,scope);}
    function undoOverlay(){var item=hiddenOverlays.pop();if(!item)return false;setAuto(false);var index=learned.indexOf(item.signature);if(index!==-1){learned.splice(index,1);writeJSON('saturn-overlay-rules',learned);}if(item.style===null)item.element.removeAttribute('style');else item.element.setAttribute('style',item.style);report('Overlay ripristinato. Automatico sospeso per questa sessione.');return true;}
    function originalControl(action){
      if(action==='toggleVideo'){
        var s1=['media-play-button','.jw-icon-playback','.jw-display-icon-container','.jw-display-icon-display','.jw-icon-display','button[aria-label*="Play" i]','button[aria-label*="Riproduci" i]','button[aria-label*="Pause" i]','button[aria-label*="Pausa" i]'];
        for(var i=0;i<s1.length;i++){var el=doc.querySelector(s1[i]);if(!el||!el.getBoundingClientRect)continue;var r=el.getBoundingClientRect();if(r.width>0&&r.height>0)return{el:el,x:r.left+r.width/2,y:r.top+r.height/2};}
        var s2=['media-player video','media-player','.jw-media','.jw-aspect','.jw-wrapper','.jwplayer','video'];
        for(var j=0;j<s2.length;j++){var vel=doc.querySelector(s2[j]);if(!vel||!vel.getBoundingClientRect)continue;var vr=vel.getBoundingClientRect();if(vr.width>0&&vr.height>0)return{el:vel,x:vr.left+vr.width/2,y:vr.top+vr.height/2};}
      }else if(action==='fullscreen'){
        var s3=['media-fullscreen-button','.jw-icon-fullscreen','button[aria-label*="Fullscreen" i]','button[aria-label*="Schermo intero" i]'];
        for(var k=0;k<s3.length;k++){var fel=doc.querySelector(s3[k]);if(!fel||!fel.getBoundingClientRect)continue;var fr=fel.getBoundingClientRect();if(fr.width>0&&fr.height>0)return{el:fel,x:fr.left+fr.width/2,y:fr.top+fr.height/2};}
      }
      return null;
    }
    function playerStatus(){var video=doc.querySelector('video');return{ready:video?video.readyState:0,paused:video?video.paused:true,time:video?Math.floor(video.currentTime||0):0,width:video?video.videoWidth||0:0,height:video?video.videoHeight||0:0,error:video&&video.error?'MediaError '+video.error.code:''};}
    function trustedFrame(frame){try{return frame&&frame.id==='watch-iframe'&&new win.URL(frame.src,win.location.href).origin==='https://play.saturncdn.net';}catch(e){return false;}}
    function hit(){
      if(!doc.elementFromPoint)return{el:null,x:cursorX,y:cursorY};
      var el=doc.elementFromPoint(cursorX,cursorY),x=cursorX,y=cursorY;
      if(!el)return{el:null,x:x,y:y};
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
      if(dy&&win.getComputedStyle){var el=doc.elementFromPoint(cursorX,cursorY);for(;el&&el!==doc.body;el=el.parentNode){if(el.scrollHeight>el.clientHeight+2&&/auto|scroll|overlay/.test(win.getComputedStyle(el).overflowY)){var r=el.getBoundingClientRect();if((dy>0&&nextY>r.bottom-16)||(dy<0&&nextY<r.top+16)){var old=el.scrollTop;el.scrollTop+=dy;if(el.scrollTop!==old)nextY=cursorY;}break;}}}
      if((nextY<16||nextY>win.innerHeight-35)&&win.scrollBy)win.scrollBy(0,dy);
      cursorX=Math.max(4,Math.min(win.innerWidth-32,cursorX+dx));cursorY=Math.max(16,Math.min(win.innerHeight-35,nextY));ensurePointer();
      var target=hit();if(target.frame){if(trustedFrame(target.frame)&&Date.now()-lastMove>=40){lastMove=Date.now();target.frame.contentWindow.postMessage({saturnTV:1,type:'move',x:target.x,y:target.y},'https://play.saturncdn.net');}}
      else hover(target.el,target.x,target.y);
    }
    function tick(time){
      raf=null;if(bar||fullscreen()||Date.now()-lastKey>900){stop();return;}
      var x=(held[39]?1:0)-(held[37]?1:0),y=(held[40]?1:0)-(held[38]?1:0);if(!x&&!y){lastTick=0;motionStarted=0;return;}
      var heldFor=Date.now()-motionStarted,ramp=Math.min(1,Math.max(0,heldFor-120)/850),speed=heldFor<120?0:(90+510*ramp*ramp)*cursorSpeed/500;
      var distance=(lastTick?Math.min(time-lastTick,40):0)*speed/1000/(x&&y?1.414:1);lastTick=time;move(x*distance,y*distance);raf=win.requestAnimationFrame(tick);
    }
    function arrow(code){
      lastKey=Date.now();if(!motionStarted)motionStarted=lastKey;
      var opposite={37:39,39:37,38:40,40:38}[code];if(held[opposite]){delete held[opposite];motionStarted=lastKey;}
      if(!held[code])move(code===37?-4:code===39?4:0,code===38?-4:code===40?4:0);
      held[code]=true;if(win.requestAnimationFrame&&raf===null)raf=win.requestAnimationFrame(tick);
    }
    function editing(target){return target&&(target.isContentEditable||/^(SELECT|TEXTAREA)$/.test(target.tagName)||(target.tagName==='INPUT'&&!/^(button|submit|reset|checkbox|radio|range|image|hidden|color|file)$/i.test(target.type||'text')));}
    function leaveEditing(target){stop();if(target&&target.blur&&doc.activeElement===target)target.blur();wake();}
    function keyCode(e){return e.keyCode||{ArrowLeft:37,ArrowUp:38,ArrowRight:39,ArrowDown:40,Enter:13,Escape:27,ColorF2Yellow:405,ColorF3Blue:406,XF86Back:10009,MediaPlay:415,MediaPause:19,MediaPlayPause:10252,MediaStop:413,MediaFastForward:417,MediaRewind:412,FastForward:417,Rewind:412}[e.key||e.code]||0;}
    function prevent(e){e.preventDefault();e.stopImmediatePropagation();}
    function exitNative(e){
      var exit=doc.exitFullscreen||doc.webkitExitFullscreen||doc.webkitCancelFullScreen,video=doc.querySelector&&doc.querySelector('video');
      prevent(e);
      playerFullscreen=false;
      try{
        if(exit&&(doc.fullscreenElement||doc.webkitFullscreenElement||doc.webkitCurrentFullScreenElement))exit.call(doc);
        else if(video&&video.webkitDisplayingFullscreen&&video.webkitExitFullscreen)video.webkitExitFullscreen();
        var control=doc.querySelector&&doc.querySelector('.jw-flag-fullscreen .jw-icon-fullscreen');
        if(!control)control=doc.querySelector&&doc.querySelector('media-player[data-fullscreen] media-fullscreen-button,media-fullscreen-button');
        if(control){var r=control.getBoundingClientRect();click(control,r.left+r.width/2,r.top+r.height/2);}
      }catch(ignore){}
      if(top&&playerFullscreen)playerControl('fullscreen');
      if(win.setTimeout){
        win.setTimeout(function(){playerFullscreen=false;ensurePointer();wake();},80);
        win.setTimeout(function(){playerFullscreen=false;ensurePointer();wake();},250);
      }
      return true;
    }
    function key(event){
      var code=keyCode(event),target=event.target||doc.activeElement;
      if(fullscreen()){
        if(code===10009){exitNative(event);return;}
        else if(top){
          if(code===13||code===415||code===19||code===10252){prevent(event);if(!event.repeat)playerControl('toggleVideo');}
          else if(code===37||code===39||code===412||code===417){
            prevent(event);
            var delta=(code===37||code===412)?-10:10,v=doc.querySelector&&doc.querySelector('video');
            if(v&&typeof v.currentTime==='number')v.currentTime=Math.max(0,v.currentTime+delta);
            else sendPlayer({saturnTV:1,type:'key',code:(code===37||code===412)?37:39,repeat:!!event.repeat});
          }
        }
        return;
      }
      var editTarget=editing(target)?target:editing(doc.activeElement)?doc.activeElement:null;
      if(editTarget&&(code===65376||code===65385)){leaveEditing(editTarget);return;}
      if(editTarget&&!bar){
        if(code===10009||code===27){prevent(event);leaveEditing(editTarget);return;}
        if(code===406){leaveEditing(editTarget);}
        else{if(code===13&&editTarget.tagName==='INPUT'&&!event.isComposing)win.setTimeout(function(){if(doc.activeElement===editTarget)leaveEditing(editTarget);},0);return;}
      }
      if(!top){
        if(player&&[37,38,39,40,13,10009,405,406,412,415,417,10252].indexOf(code)!==-1){prevent(event);win.parent.postMessage({saturnTV:1,type:'key',code:code,repeat:!!event.repeat},'https://www.animesaturn.net');}return;
      }
      if(code===415||code===19||code===10252){if(!event.repeat)playerControl('toggleVideo');return;}
      if(code===412||code===417){
        var d=(code===412)?-10:10,lv=doc.querySelector&&doc.querySelector('video');
        if(lv&&typeof lv.currentTime==='number')lv.currentTime=Math.max(0,lv.currentTime+d);
        else sendPlayer({saturnTV:1,type:'key',code:code===412?37:39,repeat:!!event.repeat});
        return;
      }
      if(code===405){prevent(event);if(!event.repeat)api.actions.filter();return;}
      if(code===10009||code===406){prevent(event);if(!event.repeat){if(bar&&view!=='main')switchView('main');else navigation();}return;}
      if(bar){
        if([37,38,39,40,13,27].indexOf(code)===-1)return;prevent(event);
        if(code===27){close();return;}if(code===13){if(!event.repeat&&buttons.indexOf(doc.activeElement)!==-1)doc.activeElement.click();return;}
        if(buttons.indexOf(doc.activeElement)===-1){if(editing(doc.activeElement))leaveEditing(doc.activeElement);focus(buttons.filter(function(b){return !b.disabled;})[0]);return;}
        var current=doc.activeElement,selected=null,cost=Infinity;
        if(current&&current.getBoundingClientRect){var box=current.getBoundingClientRect(),cx=box.left+box.width/2,cy=box.top+box.height/2;buttons.forEach(function(b){if(b.disabled||b===current)return;var r=b.getBoundingClientRect(),dx=r.left+r.width/2-cx,dy=r.top+r.height/2-cy,along=code===37?-dx:code===39?dx:code===38?-dy:dy,across=code===37||code===39?Math.abs(dy):Math.abs(dx);if(along>5&&along+across*3<cost){selected=b;cost=along+across*3;}});}else{var pos=buttons.indexOf(current),step=code===37||code===38?-1:1;for(var i=0;i<buttons.length;i++){pos=(pos+step+buttons.length)%buttons.length;if(!buttons[pos].disabled){selected=buttons[pos];break;}}}
        if(selected){focus(selected);if(selected.scrollIntoView)selected.scrollIntoView({block:'nearest'});}return;
      }
      if([37,38,39,40,13].indexOf(code)===-1||!doc.elementFromPoint)return;
      prevent(event);wake();if(code===13){if(!event.repeat)activate();}else arrow(code);
    }
    api.handleKey=key;
    events.addEventListener('keydown',key,true);
    events.addEventListener('keyup',function(e){var code=keyCode(e);delete held[code];if(!fullscreen()&&!editing(e.target||doc.activeElement)&&[37,38,39,40,13,10009,405,406,412,415,417,10252].indexOf(code)!==-1)prevent(e);if(player&&!top)win.parent.postMessage({saturnTV:1,type:'keyup',code:code},'https://www.animesaturn.net');},true);
    events.addEventListener('blur',stop,true);
    function reportFullscreen(){if(player&&!top)win.parent.postMessage({saturnTV:1,type:'fullscreen',active:fullscreen()},'https://www.animesaturn.net');}
    doc.addEventListener('DOMContentLoaded',ensurePointer);
    doc.addEventListener('fullscreenchange',function(){stop();playerFullscreen=false;ensurePointer();wake();reportFullscreen();});
    doc.addEventListener('webkitfullscreenchange',function(){stop();playerFullscreen=false;ensurePointer();wake();reportFullscreen();});
    if(win.addEventListener)win.addEventListener('message',function(event){
      var data=event.data;if(!data||data.saturnTV!==1)return;
      if(top){var frame=doc.querySelector&&doc.querySelector('iframe#watch-iframe');if(!trustedFrame(frame)||event.source!==frame.contentWindow||event.origin!=='https://play.saturncdn.net')return;
        if(data.type==='ready'){settingsSync();while(pendingPlayer.length)sendPlayer(pendingPlayer.shift());}
        else if(data.type==='fullscreen'){playerFullscreen=!!data.active;if(pointer)pointer.style.display=(bar||fullscreen())?'none':'block';}
        else if(data.type==='controlResult'){
          if(data.action==='status'){var state=data.status||{};report('Lettore del sito · '+(state.paused?'pausa':'play')+' · pronto '+state.ready+' · '+state.time+' s · '+state.width+'×'+state.height+(state.error?' · '+state.error:''));}
          else if(!data.found)report('Controllo del sito non disponibile: apri o attendi la puntata.');
          else if(typeof data.x==='number'&&typeof data.y==='number'&&isFinite(data.x)&&isFinite(data.y)){close();var r=frame.getBoundingClientRect();cursorX=Math.max(4,Math.min(win.innerWidth-32,r.left+data.x));cursorY=Math.max(16,Math.min(win.innerHeight-35,r.top+data.y));focus(frame);wake();}
        }
        else if(data.type==='utilityResult')report(data.message||'Operazione completata.');
        else if(data.type==='key'&&[37,38,39,40,13,10009,405,406,412,415,417,10252].indexOf(data.code)!==-1)key({keyCode:data.code,target:frame,repeat:!!data.repeat,preventDefault:function(){},stopImmediatePropagation:function(){}});
        else if(data.type==='keyup')delete held[data.code];
      }else if(player&&event.source===win.parent&&event.origin==='https://www.animesaturn.net'){
        if(data.type==='settings'){if(typeof data.enabled==='boolean'){api.enabled=data.enabled;try{win.sessionStorage.setItem('saturn-disabled',api.enabled?'0':'1');}catch(e){}}if(typeof data.autoOverlay==='boolean')setAuto(data.autoOverlay);return;}
        if(data.type==='uiControl'){
          if(data.action==='status'){win.parent.postMessage({saturnTV:1,type:'controlResult',action:'status',status:playerStatus()},'https://www.animesaturn.net');return;}
          if(data.action!=='toggleVideo'&&data.action!=='fullscreen')return;
          var control=originalControl(data.action);if(control)click(control.el,control.x,control.y);
          if(data.action==='fullscreen'&&win.setTimeout)win.setTimeout(reportFullscreen,120);
          win.parent.postMessage({saturnTV:1,type:'controlResult',action:data.action,found:!!control,x:control?control.x:0,y:control?control.y:0},'https://www.animesaturn.net');return;
        }
        if(data.type==='utility'){
          var success=false;if(data.action==='overlay')success=hideOverlay(false,doc);else if(data.action==='undoOverlay')success=undoOverlay();else return;
          win.parent.postMessage({saturnTV:1,type:'utilityResult',message:success?(data.action==='overlay'?'Overlay nascosto.':'Overlay ripristinato.'):'Nessun riquadro separabile dal player trovato.'},'https://www.animesaturn.net');return;
        }
        if(data.type==='key'&&typeof data.code==='number'){
          if(data.code===415||data.code===19||data.code===10252){var c=originalControl('toggleVideo');if(c)click(c.el,c.x,c.y);}
          else{var kt=doc.querySelector('.jwplayer,video,[role=slider]')||doc.activeElement||doc.body;if(kt&&kt.dispatchEvent&&win.KeyboardEvent){try{kt.dispatchEvent(new win.KeyboardEvent('keydown',{keyCode:data.code,which:data.code,bubbles:true,cancelable:true}));}catch(e){}}}
          return;
        }
        if((data.type!=='move'&&data.type!=='click')||typeof data.x!=='number'||typeof data.y!=='number'||!isFinite(data.x)||!isFinite(data.y)||data.x<0||data.y<0||data.x>win.innerWidth||data.y>win.innerHeight)return;
        var el=doc.elementFromPoint(data.x,data.y);if(data.type==='click')click(el,data.x,data.y);else hover(el,data.x,data.y);
      }
    });
    doc.addEventListener('load',function(event){if(event.target&&event.target.tagName==='IFRAME'&&trustedFrame(event.target))settingsSync();},true);
    rememberPage();scan(doc);ensurePointer();if(top)settingsSync();else if(player)win.parent.postMessage({saturnTV:1,type:'ready'},'https://www.animesaturn.net');return api;
  }
  if(typeof module!=='undefined'&&module.exports)module.exports={hostBlocked:hostBlocked,install:install};else install(root);
}(typeof window==='undefined'?this:window));
