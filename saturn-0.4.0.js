/* Saturn TV 0.4.0 — no external dependencies; experimental TizenBrew module. */
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
    var api = {enabled: true, popups: 0, resources: 0, version: '0.4.0'};
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
      var nodes = container.querySelectorAll('script[src],iframe[src]');
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
    var queued = false;
    function scheduleScan() {
      if (queued) return;
      queued = true;
      win.setTimeout(function () { queued = false; scan(doc); if (api.enabled && autoOverlay && !cinema) { for (var n = 0; n < 4 && hideOverlay(true); n++) {} } }, 100);
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
          if (!own) { scheduleScan(); return; }
        }
      }).observe(doc, {childList: true, subtree: true, attributes: true, attributeFilter: ['src','style','class']});
    }
    var bar = null, buttons = [], previousFocus = null, message = null;
    var hiddenOverlays = [], autoOverlay = true, cinema = null;
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
    function hideOverlay(automatic) {
      if (!doc.querySelectorAll || !win.getComputedStyle) { tell('Rimozione non disponibile.'); return; }
      var nodes = doc.querySelectorAll('div,section,aside,iframe,dialog'), best = null, score = -1;
      for (var i = 0; i < nodes.length; i++) {
        var el = nodes[i];
        if (!overlayCandidate(el)) continue;
        if (automatic && el.querySelector && el.querySelector('form,[role=dialog]')) continue;
        var inside = el, own = false;
        while (inside && inside !== doc.body) { if (/^saturn-/.test(inside.id || '')) own = true; inside = inside.parentNode; }
        if (own) continue;
        var css = win.getComputedStyle(el), z = parseInt(css.zIndex, 10) || 0;
        if (z > score) { best = el; score = z; }
      }
      if (!best) { if (!automatic) tell('Nessun overlay separabile dal player trovato.'); return false; }
      hiddenOverlays.push({element:best, style:best.getAttribute('style')});
      best.style.setProperty('display', 'none', 'important');
      api.popups++;
      if (!automatic) tell('Riquadro nascosto. Se era utile, scegli Annulla rimozione.');
      return true;
    }
    function undoOverlay() {
      autoOverlay = false;
      try { win.sessionStorage.setItem('saturn-auto-overlay', '0'); } catch (e) {}
      var item = hiddenOverlays.pop();
      if (!item) { tell('Nessuna rimozione da annullare.'); return; }
      if (item.style === null) item.element.removeAttribute('style'); else item.element.setAttribute('style',item.style);
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
      if (cinema.style === null) cinema.el.removeAttribute('style'); else cinema.el.setAttribute('style',cinema.style);
      cinema = null; ensurePointer();
    }
    function fullscreen() {
      if (cinema) { exitCinema(); return; }
      var nodes = doc.querySelectorAll('video,iframe[src*="/embed/"]'), best = null, area = 0;
      for (var i = 0; i < nodes.length; i++) {
        var rect = nodes[i].getBoundingClientRect(), a = rect.width * rect.height;
        if (a > area) { area = a; best = nodes[i]; }
      }
      if (!best) { tell('Apri prima un episodio: nessun lettore riconosciuto.'); return; }
      hideBar();
      function fallback() {
        if (cinema) return;
        cinema = {el:best, style:best.getAttribute('style')};
        best.style.setProperty('position','fixed','important');
        var values = {top:'0',left:'0',width:'100vw',height:'100vh',maxWidth:'none',maxHeight:'none',zIndex:'2147483644',background:'#000',border:'0'};
        for (var key in values) best.style.setProperty(key.replace(/[A-Z]/g,function(c){return '-'+c.toLowerCase();}),values[key],'important');
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
    api.actions = {
      fullscreen: fullscreen,
      autoOverlay: function () {
        autoOverlay = !autoOverlay;
        try { win.sessionStorage.setItem('saturn-auto-overlay', autoOverlay ? '1' : '0'); } catch(e) {}
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
          if (buttons[5]) buttons[5].disabled = false;
        } catch (e) { tell('Salvataggio non disponibile: la memoria del browser non è accessibile.'); }
      },
      resume: function () {
        var saved = safeBookmark();
        if (saved) win.location.assign(saved.url);
        else tell('Nessuna pagina salvata. Apri un episodio e scegli «Salva pagina».');
      }
    };
    function hideBar() {
      if (!bar) return;
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
      style.textContent = '#saturn-toolbar button{font:inherit;line-height:1.3;min-height:58px;padding:12px 18px;margin:6px 10px 6px 0;border:2px solid #72899c;border-radius:6px;background:#1d3040;color:#f4f7fa;cursor:pointer}#saturn-toolbar button:focus,#saturn-toolbar button:hover{outline:4px solid #8cdeff;outline-offset:2px;background:#294b62}#saturn-toolbar button:disabled{color:#adbdca;border-color:#526575;cursor:default}#saturn-toolbar p{margin:8px 0 12px;font:inherit;color:#c6d9e8}';
      bar.appendChild(style);
      var title = doc.createElement('strong'); title.textContent = 'Saturn TV ' + api.version; bar.appendChild(title);
      var stats = doc.createElement('p');
      stats.textContent = 'Filtro ' + (api.enabled ? 'attivo' : 'spento') + ' · Finestre bloccate: ' + api.popups + ' · Risorse bloccate: ' + api.resources;
      bar.appendChild(stats);
      var specs = [['Indietro', 'back'], ['Avanti', 'forward'], ['Aggiorna', 'reload'], ['Home', 'home'], ['Salva pagina', 'save'], ['Riapri salvato', 'resume'], [api.enabled ? 'Disattiva filtro' : 'Attiva filtro', 'filter'], ['Nascondi overlay', 'overlay'], ['Annulla rimozione', 'undoOverlay'], ['Schermo intero', 'fullscreen'], ['Overlay automatici ON/OFF', 'autoOverlay'], ['Chiudi barra', 'close']];
      for (var i = 0; i < specs.length; i++) {
        var btn = doc.createElement('button'); btn.type = 'button'; btn.textContent = specs[i][0];
        btn.setAttribute('data-saturn-action', specs[i][1]);
        if (specs[i][1] === 'resume') btn.disabled = !safeBookmark();
        btn.addEventListener('click', function (event) {
          event.preventDefault(); event.stopPropagation();
          var action = this.getAttribute('data-saturn-action');
          if (action === 'close') hideBar(); else api.actions[action]();
        });
        buttons.push(btn); bar.appendChild(btn);
      }
      message = doc.createElement('p'); message.setAttribute('role', 'status'); message.setAttribute('aria-live', 'polite');
      message.textContent = 'Frecce: scegli · OK: esegui · Indietro o Blu: chiudi. Aggiorna e cambio filtro ricaricano la pagina: il minuto del video può andare perso.';
      bar.appendChild(message); doc.body.appendChild(bar); buttons[0].focus(); ensurePointer();
    }
    api.status = status;
    api.isBlocked = blocked;
    var pointer = null, cursorX = 0, cursorY = 0, menuButton = null;
    function ensurePointer() {
      if (win !== win.top || !doc.body || !doc.elementFromPoint || !win.innerWidth) return false;
      if (!pointer) {
        cursorX = Math.round(win.innerWidth / 2); cursorY = Math.round(win.innerHeight / 2);
        pointer = doc.createElement('div'); pointer.id = 'saturn-pointer';
        pointer.textContent = '➤'; pointer.setAttribute('aria-hidden', 'true');
        pointer.style.cssText = 'position:fixed;z-index:2147483646;pointer-events:none;color:#fff;font:36px sans-serif;text-shadow:0 0 4px #000,2px 2px 2px #000;transform:rotate(-35deg);line-height:1';
        doc.body.appendChild(pointer);
        menuButton = doc.createElement('button'); menuButton.type = 'button';
        menuButton.id = 'saturn-menu'; menuButton.textContent = '☰ Menu · ' + api.version;
        menuButton.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:2147483645;padding:12px 18px;background:#101820;color:white;border:2px solid #8cdeff;border-radius:8px;font:20px sans-serif';
        menuButton.addEventListener('click', function (event) { event.preventDefault(); event.stopPropagation(); status(); });
        doc.body.appendChild(menuButton);
      }
      pointer.style.left = cursorX + 'px'; pointer.style.top = cursorY + 'px';
      var hidden = bar || cinema || doc.fullscreenElement || doc.webkitFullscreenElement;
      pointer.style.display = hidden ? 'none' : 'block';
      if (menuButton) menuButton.style.display = hidden ? 'none' : 'block';
      return true;
    }
    function pointerKey(code) {
      if (!ensurePointer()) return;
      if (code === 13) {
        var el = doc.elementFromPoint(cursorX, cursorY);
        if (el && el.tagName === 'IFRAME') {
          // Same-origin frames only. Foreign players need their own native controls.
          try {
            var rect = el.getBoundingClientRect();
            el = el.contentDocument.elementFromPoint(cursorX - rect.left, cursorY - rect.top);
          } catch (e) { return; }
        }
        if (el) {
          var link = el;
          while (link && link !== doc && link.tagName !== 'A') link = link.parentNode;
          if (link && link.tagName === 'A' && link.getAttribute('href')) {
            var href = link.getAttribute('href');
            if (allowedNavigation(href)) win.location.assign(new win.URL(href, win.location.href).href);
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
      ensurePointer();
    }
    function stopMotion() { held = {}; motionTime = 0; }
    function tick(time) {
      motionFrame = null;
      if (bar || (Date.now() - lastKeyAt > 900)) { stopMotion(); return; }
      var dx = (held[39] ? 1 : 0) - (held[37] ? 1 : 0);
      var dy = (held[40] ? 1 : 0) - (held[38] ? 1 : 0);
      if (!dx && !dy) { motionTime = 0; return; }
      var elapsed = motionTime ? Math.min(time - motionTime, 40) : 0; motionTime = time;
      var distance = elapsed * 0.5 / (dx && dy ? 1.414 : 1);
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
        event.preventDefault(); event.stopImmediatePropagation(); pointerKey(code); return;
      }
      if (code === 405 || code === 406 || code === 10009 || (bar && [37, 38, 39, 40, 13, 27, 10009].indexOf(code) !== -1)) {
        event.preventDefault(); event.stopImmediatePropagation();
        if (event.repeat) return;
        if (code === 405) toggleFilter();
        else if (code === 406 || code === 10009) { status(); ensurePointer(); }
        else if (code === 27) hideBar();
        else if (code === 13) { if (doc.activeElement && buttons.indexOf(doc.activeElement) !== -1) doc.activeElement.click(); }
        else {
          var pos = buttons.indexOf(doc.activeElement), step = (code === 37 || code === 38) ? -1 : 1;
          for (var n = 0; n < buttons.length; n++) {
            pos = (pos + step + buttons.length) % buttons.length;
            if (!buttons[pos].disabled) { buttons[pos].focus(); break; }
          }
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
