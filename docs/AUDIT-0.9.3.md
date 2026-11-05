# Saturn TV 0.9.3 — Ottimizzazione Player per Smart TV Samsung (Tizen)

## Problemi riscontrati in precedenza sulla Smart TV
1. **Tasti multimediali del telecomando Samsung non funzionanti**:
   I telecomandi Samsung (es. One Remote / serie AU9000 UE50AU9070) inviano codici specifici per i tasti multimediali:
   - `KEY_PLAY` (415)
   - `KEY_PAUSE` (19)
   - `KEY_PLAYPAUSE` (10252)
   - `KEY_FAST_FORWARD` (417)
   - `KEY_REWIND` (412)
   Questi tasti non erano registrati in `package.json` né gestiti dal dispatcher, risultando totalmente inattivi.
2. **Auto-hide dei controlli JW Player**:
   Durante la riproduzione del video, la controlbar di JW Player entra in dissolvenza (`.jw-flag-user-inactive`, dimensioni 0). Il precedente selettore cercava solo `.jw-icon-playback` visibile: non trovandolo, falliva la pausa/riproduzione.
3. **Mancata sincronizzazione dello stato Fullscreen tra iframe e top window**:
   La finestra principale non sapeva quando l'iframe era a schermo intero (specialmente con il fallback fullscreen CSS del player). Il cursore del mouse restava visibile sul video e il tasto Indietro non usciva correttamente dal fullscreen del player.
4. **Comandi UI inviati prima della disponibilità del player**:
   Se l'utente premeva Play prima dell'evento `ready` dell'iframe, il comando andava perso senza possibilità di recupero.
5. **Drift del cursore da requestAnimationFrame orfano**:
   La funzione `stop()` non cancellava `raf`, causando movimenti residui su blur e transizioni.

## Modifiche implementate nella 0.9.3
- **Supporto completo telecomando Samsung**: registrati `MediaPlay`, `MediaPause`, `MediaPlayPause`, `MediaFastForward`, `MediaRewind` in `package.json` e mappati in `keyCode(e)`.
- **Controllo in Fullscreen**:
  - Tasto **OK** (13) o **Play/Pause** (415, 19, 10252) azionano direttamente Play/Pausa sul video.
  - Tasti **Frecce Sinistra/Destra** (37, 39) o **Rewind/FastForward** (412, 417) effettuano il seek nel video.
  - Tasto **Indietro** (10009) esce dal fullscreen (sia WebKit che in-player) e ripristina la visualizzazione normale.
  - Il cursore virtuale viene automaticamente nascosto a schermo intero.
- **Attivazione video robusta con fallback**:
  `originalControl('toggleVideo')` verifica prima le icone di playback/display icon; se sono nascoste per l'auto-hide, indirizza il click al contenitore del video (`.jw-media`, `video`), garantendo l'avvio o la pausa istantanea.
- **Coda `pendingPlayer`**: comandi UI inviati all'avvio vengono accodati e recapitati appena il player notifica lo stato `ready`.
- **Risoluzione drift cursore**: `stop()` cancella esplicitamente il frame rAF pendente via `cancelAnimationFrame`.
- **Gestione storage e XHR**: `readJSON` gestisce correttamente valori falsy (0, false); blocco XHR senza eccezioni non gestite.

## Verifica
- 40 test Node superati (`npm test`)
- Controllo sintassi superato su `saturn.js` e `saturn-0.9.3.js`
- Test specifici per tasti telecomando TV, fallback controlli video, sincronizzazione fullscreen e coda messaggi.
