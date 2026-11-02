/* Saturn TV 0.5.0 — no external dependencies; experimental TizenBrew module. */
(function (root) {
  'use strict';
  var blockedHosts = [
    'subsignsodaic.com', 'doubleclick.net', 'googlesyndication.com',
    'adsterra.com', 'popads.net', 'popcash.net', '073m.com'
  ];
  function hostBlocked(host) {
    host = String(host || '').toLowerCase().replace(/\.$/, '');
    for (var i = 0; i < blockedHosts.length; i++) {
      var b = blockedHosts[i];
      if (host === b || host.slice(-(b.length + 1)) === '.' + b) return true;
    }
    return false;
  }
  function install(win) {
    try {
      if (win.__saturnTV) return win.__saturnTV;
      // Do not install on unrelated sites. Nested foreign frames are out of scope.
      var host = win.location.hostname.toLowerCase();
      if (host !== 'animesaturn.at' && !/\.animesaturn\.at$/.test(host)) return null;
    } catch (e) { return null; }
    var doc = win.document;
    var api = {enabled: true, popups: 0, resources: 0, version: '0.5.0'};
    win.__saturnTV = api;
    try { api.enabled = win.sessionStorage.getItem('saturn-disabled') !== '1'; } catch (e) {}
    function blocked(url) {
      try { return api.enabled && hostBlocked(new win.URL(String(url), win.location.href).hostname); }
      catch (e) { return false; }
    }
    function allowedNavigation(url) {
      try {
        var u = new win.URL(String(url), win.location.href);
        return (u.protocol === 'https:' || u.protocol === 'http:') &&
          (u.hostname === 'animesaturn.at' || /\.animesaturn\.at$/.test(u.hostname));
      } catch (e) { return false; }
    }
    function resource(el) {
      return el && /^(SCRIPT|IFRAME)$/.test(el.tagName) && blocked(el.getAttribute('src') || '');
    }
    // Block all new-window requests on this site while protection is enabled.
    // Existing-page location changes cannot all be intercepted this way.
    var originalOpen = win.open;
    var guardedOpen = function () {
      if (!api.enabled) return originalOpen.apply(win, arguments);
      api.popups++;
      return null;
    };
    // Stop advertising scripts replacing our window.open hook after installation.
    try { Object.defineProperty(win, 'open', {configurable: true, get: function () { return guardedOpen; }, set: function () {}}); }
    catch (e) { win.open = guardedOpen; }
    function guardTarget(event) {
      if (activateFullscreen(event.target)) { event.preventDefault(); event.stopImmediatePropagation(); return; }
      if (!api.enabled) return;
      var node = event.target;
      while (node && node !== doc) {
        if (node.tagName === 'A' || node.tagName === 'FORM') {
          var target = String(node.getAttribute('target') || '').toLowerCase();
          var url = node.getAttribute(node.tagName === 'A' ? 'href' : 'action');
          if (blocked(url || '') || (url && !allowedNavigation(url)) || (target && target !== '_self' && target !== '_parent' && target !== '_top')) {
            event.preventDefault(); event.stopImmediatePropagation(); api.popups++;
          }
          return;
        }
        node = node.parentNode;
      }
    }
    (win.addEventListener ? win : doc).addEventListener('click', guardTarget, true);
    doc.addEventListener('auxclick', guardTarget, true);
    doc.addEventListener('submit', guardTarget, true);
    if (win.HTMLFormElement) {
      var formProto = win.HTMLFormElement.prototype, submit = formProto.submit;
      formProto.submit = function () {
        var dest = this.getAttribute('action') || win.location.href;
        var target = this.getAttribute('target') || '_self';
        if (api.enabled && (!allowedNavigation(dest) || target === '_blank')) { api.popups++; return; }
        return submit.apply(this, arguments);
      };
    }
    // Hooks cover dynamic insertion; they do not stop every parser-loaded script.
    var proto = win.Node.prototype;
    var append = proto.appendChild;
    var insert = proto.insertBefore;
    proto.appendChild = function (node) {
      if (resource(node)) { api.resources++; return node; }
      return append.apply(this, arguments);
    };
    proto.insertBefore = function (node) {
      if (resource(node)) { api.resources++; return node; }
      return insert.apply(this, arguments);
    };
    var originalFetch = win.fetch;
    if (originalFetch) win.fetch = function (input) {
      if (blocked(input && input.url ? input.url : input)) {
        api.resources++;
        return win.Promise.reject(new Error('Saturn TV: richiesta pubblicitaria bloccata'));
      }
      return originalFetch.apply(win, arguments);
    };
    // Reject blocked XHR at send time, without silently contacting another URL.
    if (win.XMLHttpRequest) {
      var xp = win.XMLHttpRequest.prototype;
      var originalXOpen = xp.open, originalSend = xp.send;
      xp.open = function (method, url) {
        this.__saturnURL = url;
        return originalXOpen.apply(this, arguments);
      };
      xp.send = function () {
        if (blocked(this.__saturnURL)) {
          api.resources++;
          this.abort();
          throw new Error('Saturn TV: richiesta pubblicitaria bloccata');
        }
        return originalSend.apply(this, arguments);
      };
    }
    function scan(container) {
      var nodes=Array.prototype.slice.call(container.querySelectorAll('script[src],iframe[src]'));
      if(container.tagName && /^(SCRIPT|IFRAME)$/.test(container.tagName))nodes.unshift(container);
      for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];
        if (resource(node) && node.parentNode) {
          var remove = node;
          if (node.tagName === 'IFRAME' && win.getComputedStyle) {
            var parent = node.parentNode;
            // Only the immediate fixed wrapper of an identified advertising iframe.
            if (parent !== doc.body && parent !== doc.documentElement && parent.querySelectorAll &&
                win.getComputedStyle(parent).position === 'fixed' &&
                parent.querySelectorAll('video,audio,iframe').length === 1) remove = parent;
          }
          remove.parentNode.removeChild(remove); api.resources++;
        }
        else if (node.tagName === 'IFRAME') {
          try { install(node.contentWindow); } catch (e) {}
        }
      }
    }
    var queued = false, dirtyRoots=[];
    function scheduleScan(root) {
      if(root && root.querySelectorAll && dirtyRoots.indexOf(root)===-1)dirtyRoots.push(root);
      if (queued) return;
      queued = true;
      win.setTimeout(function () {
        queued=false;var roots=dirtyRoots.length?dirtyRoots:[doc];dirtyRoots=[];
        if(roots.length>12)roots=[doc];
        for(var i=0;i<roots.length;i++){scan(roots[i]);bindProgress(roots[i]);if(api.enabled&&autoOverlay&&!cinema)hideOverlay(true,roots[i]);}
      }, 200);
    }
    doc.addEventListener('load', function (event) {
      if (event.target && event.target.tagName === 'IFRAME') {
        try { install(event.target.contentWindow); } catch (e) {}
      }
    }, true);
    if (win.MutationObserver) {
      new win.MutationObserver(function (records) {
        for (var i = 0; i < records.length; i++) {
          var target = records[i].target, own = false;
          while (target && target !== doc) { if (/^saturn-/.test(target.id || '')) { own = true; break; } target = target.parentNode; }
          if (!own) { scheduleScan(records[i].target); }
        }
      }).observe(doc, {childList: true, subtree: true, attributes: true, attributeFilter: ['src','style','class']});
    }
    var bar = null, buttons = [], previousFocus = null, message = null;
    var hiddenOverlays = [], autoOverlay = true, cinema = null, cursorSpeed = 500;
    var view = 'main', lastAction = {}, idleTimer = null, learned = [];
    function readJSON(key, fallback) { try { return JSON.parse(win.localStorage.getItem(key) || 'null') || fallback; } catch(e) { return fallback; } }
    function writeJSON(key, value) { try { win.localStorage.setItem(key, JSON.stringify(value)); return true; } catch(e) { tell('Memoria non disponibile.'); return false; } }
    var speedSaved = readJSON('saturn-speed', 500); if ([350,500,700].indexOf(speedSaved)!==-1) cursorSpeed=speedSaved;
    learned=readJSON('saturn-overlay-rules',[]); if (!Array.isArray(learned)) learned=[];
    function safePage(saved) {
      try { var u=new win.URL(saved.url); return u.protocol==='https:' && u.hostname==='animesaturn.at' && !u.username && !u.password; } catch(e) {return false;}
    }
    function overlaySignature(el) {
      var frames=el.tagName==='IFRAME'?[el]:el.querySelectorAll('iframe[src]');
      var src=''; if(frames.length) try {var u=new win.URL(frames[0].getAttribute('src'),win.location.href); src=u.origin+u.pathname;} catch(e) {}
      var id=el.id || '', cls=String(el.getAttribute('class')||'').trim();
      return (id || cls || src) ? el.tagName+'|'+id+'|'+cls+'|'+src : '';
    }
    function recognizedAd(el) {
      var sig=overlaySignature(el); if(sig && learned.indexOf(sig)!==-1) return true;
      var frames=el.tagName==='IFRAME'?[el]:el.querySelectorAll('iframe[src]');
      for(var i=0;i<frames.length;i++) if(blocked(frames[i].getAttribute('src')||'')) return true;
      return false;
    }
    try { autoOverlay = win.sessionStorage.getItem('saturn-auto-overlay') !== '0'; } catch (e) {}
    function overlayCandidate(el) {
      if (!el || el === doc.body || el === doc.documentElement || !win.getComputedStyle || !el.getBoundingClientRect) return false;
      if (/^(VIDEO|AUDIO|INPUT|BUTTON)$/.test(el.tagName) || /^saturn-/.test(el.id || '')) return false;
      var css = win.getComputedStyle(el), rect = el.getBoundingClientRect();
      if (css.position !== 'fixed' || css.display === 'none' || css.visibility === 'hidden' || css.pointerEvents === 'none' || css.opacity === '0' ||
          rect.width < win.innerWidth * 0.3 || rect.height < win.innerHeight * 0.25) return false;
      if (el.querySelector && el.querySelector('video,audio,iframe[src*="/embed/"],iframe[src*="turnstile"],iframe[src*="recaptcha"],input[type="password"]')) return false;
      if (el.tagName === 'IFRAME' && /\/embed\/|turnstile|recaptcha/i.test(el.getAttribute('src') || '')) return false;
      return true;
    }
    function hideOverlay(automatic, root) {
      if (!doc.querySelectorAll || !win.getComputedStyle) { tell('Rimozione non disponibile.'); return; }
      var scope=root || doc, nodes=Array.prototype.slice.call(scope.querySelectorAll('div,section,aside,iframe,dialog')), best=null, score=-1;
      if(root && root.tagName)nodes.unshift(root);
      for (var i = 0; i < nodes.length; i++) {
        var el = nodes[i];
        if (!overlayCandidate(el)) continue;
        if (automatic && (!recognizedAd(el) || el.getAttribute('role')==='dialog' || el.tagName==='DIALOG' || (el.querySelector && el.querySelector('form,[role=dialog]')))) continue;
        var inside = el, own = false;
        while (inside && inside !== doc.body) { if (/^saturn-/.test(inside.id || '')) own = true; inside = inside.parentNode; }
        if (own) continue;
        var css = win.getComputedStyle(el), z = parseInt(css.zIndex, 10) || 0;
        if (z > score) { best = el; score = z; }
      }
      if (!best) { if (!automatic) tell('Nessun overlay separabile dal player trovato.'); return false; }
      if (!automatic) { var sig=overlaySignature(best); if(sig && learned.indexOf(sig)===-1) { learned.push(sig); learned=learned.slice(-30); writeJSON('saturn-overlay-rules',learned); } }
      hiddenOverlays.push({element:best, style:best.getAttribute('style')});
      best.style.setProperty('display', 'none', 'important');
      api.popups++;refreshLabels();
      if (!automatic) tell('Riquadro nascosto. Se era utile, scegli Annulla rimozione.');
      return true;
    }
    function undoOverlay() {
      var item = hiddenOverlays.pop();
      if (!item) { tell('Nessuna rimozione da annullare.'); return; }
      autoOverlay = false;
      try { win.sessionStorage.setItem('saturn-auto-overlay','0'); } catch(e) {}
      var rule=overlaySignature(item.element), at=learned.indexOf(rule); if(at!==-1) { learned.splice(at,1); writeJSON('saturn-overlay-rules',learned); }
      if (item.style === null) item.element.removeAttribute('style'); else item.element.setAttribute('style',item.style);
      refreshLabels();
      tell('Riquadro ripristinato. Rimozione automatica disattivata per questa sessione.');
    }

    var bookmarkKey = 'saturn-bookmark';
    function safeBookmark() {
      try {
        var saved = JSON.parse(win.localStorage.getItem(bookmarkKey) || 'null');
        if (!saved || typeof saved.url !== 'string') return null;
        var url = new win.URL(saved.url);
        if (url.protocol !== 'https:' || url.hostname !== 'animesaturn.at' || url.username || url.password) return null;
        return saved;
      } catch (e) { return null; }
    }
    function tell(text) { if (message) message.textContent = text; }
    function toggleFilter() {
      try { win.sessionStorage.setItem('saturn-disabled', api.enabled ? '1' : '0'); }
      catch (e) { tell('Impossibile salvare la preferenza del filtro.'); return; }
      win.location.reload();
    }
    function exitCinema() {
      if (!cinema) return;
      if(cinema.controls && cinema.controls.parentNode)cinema.controls.parentNode.removeChild(cinema.controls);
      if (cinema.style === null) cinema.el.removeAttribute('style'); else cinema.el.setAttribute('style',cinema.style);
      cinema = null; ensurePointer();
    }
    function fullscreen(preferred) {
      if (doc.fullscreenElement || doc.webkitFullscreenElement) {
        var exit = doc.exitFullscreen || doc.webkitExitFullscreen; if (exit) exit.call(doc); return;
      }
      if (cinema) { exitCinema(); return; }
      var nodes = doc.querySelectorAll('video,iframe[src*="/embed/"]'), best = null, area = 0;
      for (var i = 0; i < nodes.length; i++) {
        var rect = nodes[i].getBoundingClientRect(), a = rect.width * rect.height;
        if (a > area) { area = a; best = nodes[i]; }
      }
      if (preferred && preferred.getBoundingClientRect) best = preferred;
      if (!best) { tell('Apri prima un episodio: nessun lettore riconosciuto.'); return; }
      stopMotion(); hideBar();
      function fallback() {
        if (cinema) return;
        cinema = {el:best, style:best.getAttribute('style')};
        best.style.setProperty('position','fixed','important');
        var values = {top:'0',left:'0',width:'100vw',height:'100vh',maxWidth:'none',maxHeight:'none',zIndex:'2147483644',background:'#000',border:'0'};
        for (var key in values) best.style.setProperty(key.replace(/[A-Z]/g,function(c){return '-'+c.toLowerCase();}),values[key],'important');
        var controls=doc.createElement('section');controls.id='saturn-cinema-controls';
        controls.style.cssText='position:fixed;bottom:18px;left:18px;z-index:2147483645;background:#101820;padding:10px;color:white;font:22px sans-serif';
        var video=null;try{video=best.tagName==='VIDEO'?best:best.contentDocument?best.contentDocument.querySelector('video'):best.querySelector('video');}catch(e){}
        if(video){var play=doc.createElement('button');play.textContent='Play / Pausa';play.style.cssText='font:inherit;padding:12px';play.addEventListener('click',function(){if(video.paused){var p=video.play();if(p&&p.catch)p.catch(function(){});}else video.pause();});controls.appendChild(play);}
        var leave=doc.createElement('button');leave.textContent='Esci da schermo intero';leave.style.cssText='font:inherit;padding:12px;margin-left:10px';leave.addEventListener('click',exitCinema);controls.appendChild(leave);
        doc.body.appendChild(controls);cinema.controls=controls;
        ensurePointer();
      }
      try {
        var request = best.requestFullscreen || best.webkitRequestFullscreen;
        if (!request) { fallback(); return; }
        var promise = request.call(best);
        if (promise && promise.catch) promise.catch(fallback);
        else win.setTimeout(function(){if (!doc.fullscreenElement && !doc.webkitFullscreenElement) fallback();},300);
      } catch(e) { fallback(); }
    }
    function fullscreenControl(el) {
      for (var n = 0; el && n < 7; n++, el = el.parentNode) {
        if (!el.getAttribute) continue;
        var label = (el.getAttribute('aria-label') || '') + ' ' + (el.getAttribute('title') || '');
        var cls = String(el.getAttribute('class') || '');
        if (el.getAttribute('data-plyr') === 'fullscreen' ||
            /(?:jw-icon-fullscreen|vjs-fullscreen-control|fullscreen-button|fullscreen-btn)/i.test(cls) ||
            /full[ -]?screen|schermo intero|pieno schermo/i.test(label)) return true;
      }
      return false;
    }
    function activateFullscreen(el, frame) {
      if (!fullscreenControl(el)) return false;
      if (win !== win.top) {
        try { win.top.__saturnTV.fullscreenFromPlayer(win.frameElement); } catch(e) { return false; }
      } else fullscreen(frame);
      return true;
    }
    api.fullscreenFromPlayer = fullscreen;
    function refreshLabels() {
      for (var i = 0; i < buttons.length; i++) {
        var action = buttons[i].getAttribute('data-saturn-action');
        if (action === 'autoOverlay') buttons[i].textContent = 'Overlay automatici: ' + (autoOverlay ? 'ON' : 'OFF');
        if(action==='undoOverlay')buttons[i].disabled=!hiddenOverlays.length;
        if (action === 'speed') buttons[i].textContent = 'Cursore: ' + (cursorSpeed === 350 ? 'lento' : cursorSpeed === 500 ? 'medio' : 'veloce');
      }
    }
    api.actions = {
      blackClover50: function () { win.location.assign('https://animesaturn.at/watch/black-clover-jgswge/ep-50'); },
      fullscreen: function () { fullscreen(); },
      speed: function () { cursorSpeed = cursorSpeed === 350 ? 500 : cursorSpeed === 500 ? 700 : 350; writeJSON('saturn-speed',cursorSpeed); refreshLabels(); },
      autoOverlay: function () {
        autoOverlay = !autoOverlay;
        try { win.sessionStorage.setItem('saturn-auto-overlay', autoOverlay ? '1' : '0'); } catch(e) {}
        refreshLabels();
        tell('Overlay automatici: ' + (autoOverlay ? 'attivi' : 'spenti'));
        if (autoOverlay) scheduleScan();
      },
      overlay: hideOverlay,
      undoOverlay: undoOverlay,
      reload: function () { win.location.reload(); },
      back: function () { win.history.back(); },
      forward: function () { win.history.forward(); },
      home: function () { win.location.assign('https://animesaturn.at/'); },
      filter: toggleFilter,
      save: function () {
        try {
          var url = new win.URL(win.location.href);
          if (url.protocol !== 'https:' || url.hostname !== 'animesaturn.at' || url.username || url.password) {
            tell('Puoi salvare solo una pagina di AnimeSaturn.'); return;
          }
          win.localStorage.setItem(bookmarkKey, JSON.stringify({url: url.href, title: doc.title || 'Episodio salvato'}));
          tell('Pagina salvata. «Riapri salvato» ti riporta qui, senza memorizzare il minuto del video.');
          refreshLabels();
        } catch (e) { tell('Salvataggio non disponibile: la memoria del browser non è accessibile.'); }
      },
      resume: function () {
        var saved=readJSON('saturn-last',null); if(!saved || !safePage(saved)) saved=safeBookmark();
        if (saved) win.location.assign(saved.url);
        else tell('Nessuna pagina salvata. Apri un episodio e scegli «Salva pagina».');
      }
    };
    function episodeLinks() {
      var match=new win.URL(win.location.href).pathname.match(/^\/watch\/([^/]+)\/ep-(\d+)/);
      var result={previous:null,next:null}; if(!match) return result;
      var links=doc.querySelectorAll('a[href]'), current=Number(match[2]), lower=-1, higher=Infinity;
      for(var i=0;i<links.length;i++) try {
        var u=new win.URL(links[i].getAttribute('href'),win.location.href), m=u.pathname.match(/^\/watch\/([^/]+)\/ep-(\d+)/);
        if(!m || m[1]!==match[1] || !allowedNavigation(u.href)) continue;
        var n=Number(m[2]); if(n<current && n>lower){lower=n;result.previous=u.href;} if(n>current&&n<higher){higher=n;result.next=u.href;}
      } catch(e) {}
      return result;
    }
    api.actions.previousEpisode=function(){var u=episodeLinks().previous;if(u)win.location.assign(u);};
    api.actions.nextEpisode=function(){var u=episodeLinks().next;if(u)win.location.assign(u);};
    api.actions.search=function(){
      var input=doc.querySelector && doc.querySelector('input[type=search],input[name=keyword]');
      if(!input){tell('Ricerca non presente: apri Home.');return;} hideBar(); input.focus(); if(input.scrollIntoView)input.scrollIntoView({block:'center'});
    };
    api.actions.settings=function(){switchView('settings');};
    api.actions.main=function(){switchView('main');};
    api.actions.favorites=function(){switchView('favorites');};
    api.actions.addFavorite=function(){
      var entry={url:win.location.href,title:doc.title||'Puntata'}; if(!safePage(entry))return;
      var list=readJSON('saturn-favorites',[]); if(!Array.isArray(list))list=[];
      list=list.filter(function(x){return x.url!==entry.url;}); list.unshift(entry);writeJSON('saturn-favorites',list.slice(0,12));switchView('favorites');
    };
    api.actions.info=function(){tell('Versione attiva '+api.version+'. Se diversa da GitHub, il caricatore usa ancora una copia in cache. Ricaricare la pagina non garantisce un aggiornamento.');};
    function switchView(next){hideBar();view=next;status();}
    function bindProgress(root){
      if(!doc.querySelectorAll)return;
      var scope=root&&root.querySelectorAll?root:doc,videos=Array.prototype.slice.call(scope.querySelectorAll('video'));if(scope.tagName==='VIDEO')videos.unshift(scope);
      for(var i=0;i<videos.length;i++)(function(video){
        if(video.__saturnProgress)return;video.__saturnProgress=true;
        var page;try{page=win.top.location.href;}catch(e){return;}
        if(!/\/watch\//.test(page))return;
        var previous=readJSON('saturn-progress',{}), saved=previous[page];
        function restore(){if(saved && saved>5 && isFinite(video.duration) && saved<video.duration-15)try{video.currentTime=saved;}catch(e){}}
        if(video.readyState>=1)restore();else video.addEventListener('loadedmetadata',restore);
        var last=0;video.addEventListener('timeupdate',function(){var now=Date.now();if(now-last<5000)return;last=now;
          var data=readJSON('saturn-progress',{});if(typeof data!=='object'||Array.isArray(data))data={};data[page]=Math.floor(video.currentTime||0);
          var keys=Object.keys(data);while(keys.length>30)delete data[keys.shift()];writeJSON('saturn-progress',data);
        });
      })(videos[i]);
    }
    function rememberPage(){if(win!==win.top || !/\/watch\//.test(win.location.href))return;writeJSON('saturn-last',{url:win.location.href,title:doc.title||'Ultima puntata'});}
    rememberPage();bindProgress();doc.addEventListener('DOMContentLoaded',rememberPage);
    function hideBar() {
      if (!bar) return;
      if(doc.activeElement && doc.activeElement.getAttribute) lastAction[view]=doc.activeElement.getAttribute('data-saturn-action');
      bar.parentNode.removeChild(bar); bar = null; buttons = []; message = null;
      ensurePointer();
      try { if (previousFocus && previousFocus.focus) previousFocus.focus(); } catch (e) {}
    }
    function status() {
      if (win !== win.top || !doc.body) return;
      if (bar) { hideBar(); return; }
      stopMotion();
      previousFocus = doc.activeElement;
      if (previousFocus && /^(INPUT|TEXTAREA|SELECT)$/.test(previousFocus.tagName)) previousFocus = null;
      bar = doc.createElement('section');
      bar.id = 'saturn-toolbar'; bar.setAttribute('aria-label', 'Comandi Saturn TV');
      bar.style.cssText = 'position:fixed;top:3vh;left:3vw;right:3vw;z-index:2147483647;background:#101820;color:#f4f7fa;padding:24px;box-shadow:0 12px 32px #0008;font:22px/1.4 sans-serif;text-align:left;max-height:88vh;overflow:auto;box-sizing:border-box';
      var style = doc.createElement('style');
      style.textContent = '#saturn-toolbar button{font:inherit;line-height:1.3;min-height:58px;max-width:100%;box-sizing:border-box;overflow-wrap:break-word;padding:12px 18px;margin:6px 10px 6px 0;border:2px solid #72899c;border-radius:6px;background:#1d3040;color:#f4f7fa;cursor:pointer}#saturn-toolbar button:focus,#saturn-toolbar button:hover{outline:4px solid #8cdeff;outline-offset:2px;background:#294b62}#saturn-toolbar button:disabled{color:#adbdca;border-color:#526575;cursor:default}#saturn-toolbar p{margin:8px 0 12px;font:inherit;color:#c6d9e8}';
      bar.appendChild(style);
      var title = doc.createElement('strong'); title.textContent = view==='settings' ? 'Impostazioni · '+api.version : view==='favorites' ? 'Preferiti' : 'Saturn TV'; bar.appendChild(title);
      var stats = doc.createElement('p');
      stats.textContent=view==='settings'?'Filtro '+(api.enabled?'ON':'OFF')+' · Bloccati: '+api.popups+' finestre, '+api.resources+' risorse':'Frecce per scegliere · OK per aprire · Indietro per chiudere';
      bar.appendChild(stats);
      var specs;
      if(view==='main') specs=[['Riprendi','resume'],['Cerca','search'],['Puntata precedente','previousEpisode'],['Puntata successiva','nextEpisode'],['Schermo intero','fullscreen'],['Preferiti','favorites'],['Black Clover · episodio 50','blackClover50'],['Impostazioni','settings'],['Chiudi','close']];
      else if(view==='settings') specs=[['Menu principale','main'],['Pagina precedente','back'],['Pagina successiva','forward'],['Home','home'],['Aggiorna pagina','reload'],[api.enabled?'Disattiva filtro':'Attiva filtro','filter'],['Nascondi overlay e ricordalo','overlay'],['Annulla rimozione','undoOverlay'],['Overlay automatici','autoOverlay'],['Velocità cursore','speed'],['Versione e aggiornamenti','info'],['Salva collegamento','save']];
      else {
        specs=[['Menu principale','main'],['Aggiungi questa pagina','addFavorite']];
        var favorites=readJSON('saturn-favorites',[]); if(!Array.isArray(favorites)) favorites=[];
        favorites.filter(safePage).forEach(function(f,index){var action='favorite'+index;api.actions[action]=function(){win.location.assign(f.url);};specs.push([f.title||f.url,action]);});
      }
      var neighbors=episodeLinks(), latest=readJSON('saturn-last',null);

      for (var i = 0; i < specs.length; i++) {
        var btn = doc.createElement('button'); btn.type = 'button'; btn.textContent = specs[i][0];
        btn.setAttribute('data-saturn-action', specs[i][1]);
        if(specs[i][1]==='resume')btn.disabled=!(latest&&safePage(latest))&&!safeBookmark();
        if(specs[i][1]==='previousEpisode')btn.disabled=!neighbors.previous;
        if(specs[i][1]==='nextEpisode')btn.disabled=!neighbors.next;
        if(specs[i][1]==='undoOverlay')btn.disabled=!hiddenOverlays.length;
        btn.addEventListener('click', function (event) {
          event.preventDefault(); event.stopPropagation();
          var action = this.getAttribute('data-saturn-action');
          if (action === 'close') hideBar(); else api.actions[action]();
        });
        buttons.push(btn); bar.appendChild(btn);
      }
      message = doc.createElement('p'); message.setAttribute('role', 'status'); message.setAttribute('aria-live', 'polite');
      message.textContent = view==='settings' ? 'Indietro torna al menu. Aggiorna e cambio filtro ricaricano la pagina.' : view==='favorites' ? 'Salva più collegamenti. Indietro torna al menu.' : 'Riprendi apre l’ultima puntata. I comandi puntata si attivano quando il sito espone i collegamenti.';
      bar.appendChild(message); doc.body.appendChild(bar); var focus=buttons.filter(function(b){return !b.disabled && b.getAttribute('data-saturn-action')===lastAction[view];})[0] || buttons.filter(function(b){return !b.disabled;})[0];if(focus)focus.focus(); refreshLabels(); ensurePointer();
    }
    api.status = status;
    api.isBlocked = blocked;
    var pointer = null, cursorX = 0, cursorY = 0, menuButton = null;
    function ensurePointer() {
      if (win !== win.top || !doc.body || !doc.elementFromPoint || !win.innerWidth) return false;
      if (!pointer) {
        cursorX = Math.round(win.innerWidth / 2); cursorY = Math.round(win.innerHeight / 2);
        pointer = doc.createElement('div'); pointer.id = 'saturn-pointer';
        pointer.innerHTML = '<svg width=28 height=34 viewBox="0 0 28 34" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M2 2V28L9 21L15 32L21 29L15 18H26Z" fill="white" stroke="#101820" stroke-width="2"/></svg>'; pointer.setAttribute('aria-hidden', 'true');
        pointer.style.cssText = 'position:fixed;z-index:2147483646;pointer-events:none;color:#fff;font:36px sans-serif;text-shadow:0 0 4px #000,2px 2px 2px #000;transform:rotate(-35deg);line-height:1';
        doc.body.appendChild(pointer);
        menuButton = doc.createElement('button'); menuButton.type = 'button';
        menuButton.id = 'saturn-menu'; menuButton.textContent = 'Menu';
        menuButton.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:2147483645;padding:12px 18px;background:#101820;color:white;border:2px solid #8cdeff;border-radius:8px;font:20px sans-serif';
        menuButton.addEventListener('click', function (event) { event.preventDefault(); event.stopPropagation(); status(); });
        doc.body.appendChild(menuButton);
      }
      pointer.style.left='0'; pointer.style.top='0'; pointer.style.transform='translate3d('+cursorX+'px,'+cursorY+'px,0) rotate(-35deg)';
      var hidden = bar || doc.fullscreenElement || doc.webkitFullscreenElement;
      pointer.style.display = hidden ? 'none' : 'block';
      if (menuButton) menuButton.style.display = hidden ? 'none' : 'block';
      return true;
    }
    function wakePointer(){
      ensurePointer(); if(idleTimer && win.clearTimeout)win.clearTimeout(idleTimer);
      idleTimer=win.setTimeout(function(){if(pointer&&!bar)pointer.style.display='none';},3500);
    }
    function pointerKey(code) {
      if (!ensurePointer()) return;
      if (code === 13) {
        var el = doc.elementFromPoint(cursorX, cursorY), frame = null, hitX = cursorX, hitY = cursorY;
        for (var depth = 0; el && el.tagName === 'IFRAME' && depth < 5; depth++) {
          try {
            if (!frame) frame = el;
            var rect = el.getBoundingClientRect(); hitX -= rect.left; hitY -= rect.top;
            el = el.contentDocument.elementFromPoint(hitX, hitY);
          } catch (e) { return; }
        }
        if (el) {
          if (activateFullscreen(el, frame)) return;
          var link = el;
          while (link && link !== doc && link.tagName !== 'A') link = link.parentNode;
          if (link && link.tagName === 'A' && link.getAttribute('href')) {
            var href = link.getAttribute('href');
            if (allowedNavigation(href) || (!api.enabled && /^https?:/.test(new win.URL(href,win.location.href).protocol))) win.location.assign(new win.URL(href, win.location.href).href);
            else api.popups++;
            return;
          }
          if (el.focus) el.focus(); if (el.click) el.click();
        }
      } else {
        if (win.requestAnimationFrame) startMotion(code);
        else movePointer(code === 37 ? -28 : code === 39 ? 28 : 0, code === 38 ? -28 : code === 40 ? 28 : 0);
      }
    }
    var held = {}, motionFrame = null, motionTime = 0, lastKeyAt = 0;
    function movePointer(dx, dy) {
      var nextY = cursorY + dy;
      if (nextY < 20 || nextY > win.innerHeight - 45) win.scrollBy(0, dy * 4);
      cursorX = Math.max(4, Math.min(win.innerWidth - 40, cursorX + dx));
      cursorY = Math.max(20, Math.min(win.innerHeight - 45, nextY));
      wakePointer();
      if (doc.elementFromPoint && win.MouseEvent) {
        try {
          var hover = doc.elementFromPoint(cursorX,cursorY), x = cursorX, y = cursorY;
          for (var depth=0; hover && hover.tagName === 'IFRAME' && depth<5; depth++) {
            var box=hover.getBoundingClientRect(); x-=box.left; y-=box.top;
            hover=hover.contentDocument.elementFromPoint(x,y);
          }
          if (hover) hover.dispatchEvent(new win.MouseEvent('mousemove',{bubbles:true,clientX:x,clientY:y}));
        } catch(e) {}
      }
    }
    function stopMotion() { held = {}; motionTime = 0; }
    function tick(time) {
      motionFrame = null;
      if (bar || (Date.now() - lastKeyAt > 900)) { stopMotion(); return; }
      var dx = (held[39] ? 1 : 0) - (held[37] ? 1 : 0);
      var dy = (held[40] ? 1 : 0) - (held[38] ? 1 : 0);
      if (!dx && !dy) { motionTime = 0; return; }
      var elapsed = motionTime ? Math.min(time - motionTime, 40) : 0; motionTime = time;
      var distance = elapsed * cursorSpeed / 1000 / (dx && dy ? 1.414 : 1);
      movePointer(dx * distance, dy * distance);
      motionFrame = win.requestAnimationFrame(tick);
    }
    function startMotion(code) {
      lastKeyAt = Date.now();
      if (!held[code]) movePointer(code === 37 ? -28 : code === 39 ? 28 : 0,code === 38 ? -28 : code === 40 ? 28 : 0);
      held[code] = true;
      if (motionFrame === null) motionFrame = win.requestAnimationFrame(tick);
    }
    ensurePointer();
    doc.addEventListener('DOMContentLoaded', ensurePointer);
    doc.addEventListener('fullscreenchange', ensurePointer);
    doc.addEventListener('webkitfullscreenchange', ensurePointer);
    // Window capture runs before site handlers attached to document.
    var keyTarget = win.addEventListener ? win : doc;
    function handleKey(event) {
      if (win !== win.top) {
        try { if (win.top.__saturnTV && win.top.__saturnTV.handleKey) win.top.__saturnTV.handleKey(event); } catch (e) {}
        return;
      }
      var code = event.keyCode;
      if (code === 10009 && cinema) { event.preventDefault(); event.stopImmediatePropagation(); exitCinema(); return; }
      // Let the player and on-screen keyboard handle Back in their own contexts.
      var target = event.target || doc.activeElement;
      if (code === 10009 && !bar && (doc.fullscreenElement || doc.webkitFullscreenElement ||
          (target && (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable)))) {
        if (target && target.tagName === 'INPUT') win.setTimeout(function () {
          if ((target.ownerDocument || doc).activeElement === target && target.blur) target.blur();
        }, 0);
        return;
      }
      var editing = target && (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable);
      // Preserve the site's Enter/default submit, then release the text field.
      // Do not run for the Enter that initially clicks into a field.
      if (!bar && editing && code === 13 && target.tagName === 'INPUT') {
        win.setTimeout(function () {
          if ((target.ownerDocument || doc).activeElement === target && target.blur) target.blur();
          ensurePointer();
        }, 0);
        return;
      }
      if (!bar && !editing && !doc.fullscreenElement && !doc.webkitFullscreenElement && [37,38,39,40,13].indexOf(code) !== -1 && doc.elementFromPoint) {
        event.preventDefault(); event.stopImmediatePropagation(); wakePointer();pointerKey(code); return;
      }
      if (code === 405 || code === 406 || code === 10009 || (bar && [37, 38, 39, 40, 13, 27, 10009].indexOf(code) !== -1)) {
        event.preventDefault(); event.stopImmediatePropagation();
        if (event.repeat) return;
        if (code === 405) toggleFilter();
        else if (code===10009 && bar && view!=='main'){switchView('main');}
        else if (code === 406 || code === 10009) { status(); ensurePointer(); }
        else if (code === 27) hideBar();
        else if (code === 13) { if (doc.activeElement && buttons.indexOf(doc.activeElement) !== -1) doc.activeElement.click(); }
        else {
          var current=doc.activeElement, selected=null, cost=Infinity;
          if(current && current.getBoundingClientRect){
            var box=current.getBoundingClientRect(), cx=box.left+box.width/2, cy=box.top+box.height/2;
            for(var j=0;j<buttons.length;j++){var b=buttons[j];if(b.disabled||b===current)continue;var r=b.getBoundingClientRect(),dx=r.left+r.width/2-cx,dy=r.top+r.height/2-cy;
              var along=code===37?-dx:code===39?dx:code===38?-dy:dy, across=(code===37||code===39)?Math.abs(dy):Math.abs(dx);
              if(along>5 && along+across*3<cost){selected=b;cost=along+across*3;}
            }
          } else {var pos=buttons.indexOf(current),step=(code===37||code===38)?-1:1;for(var n=0;n<buttons.length;n++){pos=(pos+step+buttons.length)%buttons.length;if(!buttons[pos].disabled){selected=buttons[pos];break;}}}
          if(selected){selected.focus();if(selected.scrollIntoView)selected.scrollIntoView({block:'nearest'});}
        }
      }
    }
    api.handleKey = handleKey;
    keyTarget.addEventListener('keydown', handleKey, true);
    api.releaseKey = function (code) { delete held[code]; };
    keyTarget.addEventListener('keyup', function(event) {
      delete held[event.keyCode];
      if (win !== win.top) { try { win.top.__saturnTV.releaseKey(event.keyCode); } catch(e) {} }
    }, true);
    keyTarget.addEventListener('blur', stopMotion, true);
    scheduleScan();
    scan(doc);
    return api;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = {hostBlocked: hostBlocked, install: install};
  else install(root);
}(typeof window === 'undefined' ? this : window));
