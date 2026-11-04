# Saturn TV 0.9.4 — Audit e verifiche

## Sintesi delle modifiche 0.9.4

1. **Player Vidstack automatico (risoluzione schermo nero e lag)**:
   - Su Samsung Tizen, JW Player all'interno dell'iframe cross-origin (`play.saturncdn.net`) causa consumo anomalo di risorse (lag cursore) e schermo nero dovuto alla mancanza di supporto a determinati codec/canvas nel WebKit di Tizen.
   - Il sito AnimeSaturn supporta ufficialmente il player HTML5 alternativo **Vidstack** (`engine: 'vidstack'`), memorizzato in `localStorage.getItem('watch:player')`.
   - Saturn TV 0.9.4 imposta automaticamente `watch:player = 'vidstack'` di default e controlla all'avvio lo switch se il player iniziale fosse ancora JW.
   - È stata aggiunta l'azione `switchPlayer` nel menu secondario ("Altro") per poter alternare tra Vidstack e JW Player in qualunque momento.

2. **Risoluzione schermo intero e ripristino cursore freccia**:
   - Quando si usciva da fullscreen con il tasto Back (10009), lo stato `playerFullscreen` e le proprietà CSS del cursore virtuale potevano rimanere su `display: 'none'`.
   - In 0.9.4 `exitNative` forza `playerFullscreen = false;` e pianifica il risveglio forzato del cursore (`ensurePointer(); wake();`) sia immediatamente sia a 80ms e 250ms dall'uscita.
   - Supporto nativo all'uscita dal fullscreen del componente Vidstack (`media-fullscreen-button`, `media-player[data-fullscreen]`).
   - In `fullscreen()` si tiene conto di `media-player[data-fullscreen]` e dei video nativi.

3. **Menu rapido puntate con tasto Indietro (Back)**:
   - Premendo Indietro durante la navigazione, la barra principale presenta ora immediatamente:
     - `Play / Pausa`
     - `Schermo intero`
     - `Puntata prec.` (`previousEpisode`)
     - `Puntata succ.` (`nextEpisode`)
     - `Black Clover · 70` (`blackClover70`)
     - `Altro` (`settings`)
   - `previousEpisode` e `nextEpisode` cliccano prima i pulsanti nativi di AnimeSaturn (`button[title*="precedente" i]`, `button[title*="successivo" i]`) per transizioni istantanee SPA, con fallback ai link `<a>` della pagina o al calcolo dell'indice `ep-(n±1)`.

4. **Puntata di riferimento aggiornata a 70**:
   - `blackClover70` naviga a `https://www.animesaturn.net/anime/black-clover-67Dip/ep-70`.
   - Mantenuta retrocompatibilità per `blackClover50`.

5. **Controlli multimediali per video locale (Vidstack)**:
   - `originalControl` e `localControl` riconoscono `media-play-button`, `media-fullscreen-button`, `media-player video`, e il tag `<video>` standard nel top frame.
   - I tasti del telecomando Samsung (Play 415, Pause 19, PlayPause 10252, Rewind 412, FastForward 417) comandano direttamente la riproduzione e il seek anche su Vidstack.

## Esito Test
- **44 test su 44 superati** (`npm test`).
