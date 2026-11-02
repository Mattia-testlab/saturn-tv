/* Saturn TV 0.2.0 — no external dependencies; experimental TizenBrew module. */
(function (root) {
  'use strict';
  var blockedHosts = [
    'subsignsodaic.com', 'doubleclick.net', 'googlesyndication.com',
    'adsterra.com', 'popads.net', 'popcash.net'
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
    var api = {enabled: true, popups: 0, resources: 0, version: '0.2.0'};
    win.__saturnTV = api;
    try { api.enabled = win.sessionStorage.getItem('saturn-disabled') !== '1'; } catch (e) {}
    function blocked(url) {
      try { return api.enabled && hostBlocked(new win.URL(String(url), win.location.href).hostname); }
      catch (e) { return false; }
    }
    function resource(el) {
      return el && /^(SCRIPT|IFRAME)$/.test(el.tagName) && blocked(el.getAttribute('src') || '');
    }
    // Block all new-window requests on this site while protection is enabled.
    // Existing-page location changes cannot all be intercepted this way.
    var originalOpen = win.open;
    win.open = function () {
      if (!api.enabled) return originalOpen.apply(win, arguments);
      api.popups++;
      return null;
    };
    function guardTarget(event) {
      if (!api.enabled) return;
      var node = event.target;
      while (node && node !== doc) {
        if (node.tagName === 'A' || node.tagName === 'FORM') {
          var target = String(node.getAttribute('target') || '').toLowerCase();
          var url = node.getAttribute(node.tagName === 'A' ? 'href' : 'action');
          if (blocked(url || '') || (target && target !== '_self' && target !== '_parent' && target !== '_top')) {
            event.preventDefault(); event.stopImmediatePropagation(); api.popups++;
          }
          return;
        }
        node = node.parentNode;
      }
    }
    doc.addEventListener('click', guardTarget, true);
    doc.addEventListener('auxclick', guardTarget, true);
    doc.addEventListener('submit', guardTarget, true);
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
        if (resource(node) && node.parentNode) { node.parentNode.removeChild(node); api.resources++; }
        else if (node.tagName === 'IFRAME') {
          try { install(node.contentWindow); } catch (e) {}
        }
      }
    }
    var queued = false;
    function scheduleScan() {
      if (queued) return;
      queued = true;
      win.setTimeout(function () { queued = false; scan(doc); }, 100);
    }
    doc.addEventListener('load', function (event) {
      if (event.target && event.target.tagName === 'IFRAME') {
        try { install(event.target.contentWindow); } catch (e) {}
      }
    }, true);
    if (win.MutationObserver) {
      new win.MutationObserver(scheduleScan).observe(doc, {childList: true, subtree: true, attributes: true, attributeFilter: ['src']});
    }
    var bar = null, buttons = [], previousFocus = null, message = null;
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
    api.actions = {
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
      try { if (previousFocus && previousFocus.focus) previousFocus.focus(); } catch (e) {}
    }
    function status() {
      if (win !== win.top || !doc.body) return;
      if (bar) { hideBar(); return; }
      previousFocus = doc.activeElement;
      bar = doc.createElement('section');
      bar.id = 'saturn-toolbar'; bar.setAttribute('aria-label', 'Comandi Saturn TV');
      bar.style.cssText = 'position:fixed;top:3vh;left:3vw;right:3vw;z-index:2147483647;background:#101820;color:#f4f7fa;padding:24px;box-shadow:0 12px 32px #0008;font:22px/1.4 sans-serif;text-align:left;max-height:88vh;overflow:auto;box-sizing:border-box';
      var style = doc.createElement('style');
      style.textContent = '#saturn-toolbar button{font:inherit;line-height:1.3;min-height:58px;padding:12px 18px;margin:6px 10px 6px 0;border:2px solid #72899c;border-radius:6px;background:#1d3040;color:#f4f7fa;cursor:pointer}#saturn-toolbar button:focus,#saturn-toolbar button:hover{outline:4px solid #8cdeff;outline-offset:2px;background:#294b62}#saturn-toolbar button:disabled{color:#adbdca;border-color:#526575;cursor:default}#saturn-toolbar p{margin:8px 0 12px;font:inherit;color:#c6d9e8}';
      bar.appendChild(style);
      var title = doc.createElement('strong'); title.textContent = 'Saturn TV'; bar.appendChild(title);
      var stats = doc.createElement('p');
      stats.textContent = 'Filtro ' + (api.enabled ? 'attivo' : 'spento') + ' · Finestre bloccate: ' + api.popups + ' · Risorse bloccate: ' + api.resources;
      bar.appendChild(stats);
      var specs = [['Indietro', 'back'], ['Avanti', 'forward'], ['Aggiorna', 'reload'], ['Home', 'home'], ['Salva pagina', 'save'], ['Riapri salvato', 'resume'], [api.enabled ? 'Disattiva filtro' : 'Attiva filtro', 'filter'], ['Chiudi barra', 'close']];
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
      bar.appendChild(message); doc.body.appendChild(bar); buttons[0].focus();
    }
    api.status = status;
    api.isBlocked = blocked;
    doc.addEventListener('keydown', function (event) {
      if (win !== win.top) return;
      var code = event.keyCode;
      if (code === 405 || code === 406 || (bar && [37, 38, 39, 40, 13, 27, 10009].indexOf(code) !== -1)) {
        event.preventDefault(); event.stopImmediatePropagation();
        if (code === 405) toggleFilter();
        else if (code === 406) status();
        else if (code === 27 || code === 10009) hideBar();
        else if (code === 13) { if (doc.activeElement && buttons.indexOf(doc.activeElement) !== -1) doc.activeElement.click(); }
        else {
          var pos = buttons.indexOf(doc.activeElement), step = (code === 37 || code === 38) ? -1 : 1;
          for (var n = 0; n < buttons.length; n++) {
            pos = (pos + step + buttons.length) % buttons.length;
            if (!buttons[pos].disabled) { buttons[pos].focus(); break; }
          }
        }
      }
    }, true);
    scan(doc);
    return api;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = {hostBlocked: hostBlocked, install: install};
  else install(root);
}(typeof window === 'undefined' ? this : window));
