# Saturn TV 0.3.0

Modulo sperimentale per AnimeSaturn su TizenBrew, pensato per Samsung UE50AU9070UXZT.
Non è un browser completo e non equivale a uBlock Origin.

## Installazione e aggiornamenti

Nel gestore moduli TizenBrew scegliere Aggiungi modulo GitHub e inserire:

```
Mattia-testlab/saturn-tv
```

Non aggiungere un tag se si desiderano gli aggiornamenti. Riavviare completamente
TizenBrew/TV per svuotare la cache del codice del servizio. La barra e il pulsante
Menu mostrano la versione effettivamente eseguita. GitHub/jsDelivr possono avere cache.
Il Mac non deve rimanere acceso; è necessaria la connessione Internet.

## Comandi

- Frecce: muovono il cursore; ai bordi superiore/inferiore scorrono la pagina.
- OK: attiva l'elemento sotto il cursore. I link del sito sono aperti direttamente.
- Indietro o Blu: aprono/chiudono la barra.
- Menu in basso a destra: apre la barra anche senza tasto colorato.
- Nella barra: frecce per selezionare, OK per eseguire.
- Dopo OK nella ricerca, il campo perde il focus dopo l'evento, preservando l'invio.
- Indietro nei campi di testo lascia chiudere la tastiera e rilascia il focus.
- In pieno schermo i tasti sono lasciati al player. Home del telecomando resta di sistema.
- Pagina precedente: pulsante Indietro nella barra.
- Salva pagina conserva un collegamento, non il minuto del video.

## Protezioni

Blocca window.open, impedisce che venga sostituito con semplice assegnazione,
blocca link/form verso domini esterni e nuove finestre quando il filtro è attivo.
Protegge anche form.submit(), che non genera un evento submit.
Filtra script, iframe, fetch e XHR di un elenco limitato di domini pubblicitari.
L'elenco include subsignsodaic.com e 073m.com osservati durante l'ispezione del sito.
Rimuove il wrapper fisso immediato di un iframe identificato come pubblicitario
soltanto se non contiene altri iframe, audio o video.
Non rimuove genericamente dialoghi, codici QR, CAPTCHA o player.

## Limiti e stato reale

- Un annuncio già eseguito prima dell'iniezione può sfuggire al filtro.
- Nessuna intercettazione universale di location.href, redirect HTTP o richieste di rete.
- La modalità document-start è disabilitata: il percorso TizenBrew esaminato presenta
  una discordanza fra nome semplice/fullName nel messaggio di avvio.
- Il cursore genera clic sintetici: alcuni player li rifiutano. I frame di altri domini
  non sono controllabili; nei frame dello stesso dominio i tasti sono inoltrati al modulo principale.
- I link esterni legittimi sono bloccati quando il filtro è attivo.
- La finestra QR con conto alla rovescia segnalata sulla TV non è stata riprodotta
  esattamente sul Mac: la sua eliminazione NON è ancora dimostrata.
- Verificati 20 test Node e 12 controlli DOM in un browser reale su fixture locale.
  Questi non dimostrano compatibilità con la tastiera Tizen o riproduzione video reale.

## Test

```
node --check saturn.js
node --test test/*.test.cjs
```

`saturn.js` è la sorgente; `saturn-0.3.0.js` è la copia identica distribuita.
I file versionati precedenti restano per i tag già pubblicati.
Nessuna dipendenza o telemetria aggiunta dal modulo; il sito mantiene le proprie richieste non filtrate.

## 0.3.1: rimozione manuale degli overlay

Indietro/Blu → Nascondi overlay nasconde il riquadro fisso grande con z-index più alto,
escludendo l’interfaccia Saturn, video, audio, iframe /embed/, CAPTCHA noti e login.
Annulla rimozione ripristina esattamente lo stile precedente. È un’azione manuale:
un riquadro legittimo potrebbe essere selezionato, per questo è reversibile.
Non garantisce la rimozione di finestre native o interni di player cross-origin.

Sono state consultate le liste pubbliche uBlock/uAssets ed EasyList. Le sole regole
AnimeSaturn trovate nei file consultati riguardano animesaturn.cx (2024), non .at.
Non sono state importate né eseguite regole legacy non verificate. Il progetto non
include il motore uBlock e non possiede le API di filtraggio di rete delle estensioni.
Riferimenti: https://github.com/uBlockOrigin/uAssets e https://github.com/easylist/easylist

## 0.4.0

- Overlay automatici attivi per default. Usa la stessa euristica geometrica del
  comando manuale verificato dall’utente; ignora riquadri con video, embed, CAPTCHA
  noti, login e form/dialoghi annidati. Non è un riconoscimento certo della pubblicità:
  può nascondere un grande riquadro legittimo. Annulla rimozione lo ripristina e
  sospende l’automatico per la sessione. Il pulsante ON/OFF lo riattiva senza ricaricare.
- Cursore continuo a requestAnimationFrame tenendo una freccia, fermato al rilascio
  o dopo 900 ms senza eventi (protezione da keyup perso). Movimento 500 px/s,
  diagonali normalizzate, passo singolo conservato. Nei browser senza rAF resta il passo.
- Schermo intero nella barra cerca il più grande video/embed visibile. Prova l’API
  nativa e, se rifiutata, allarga il riquadro con CSS reversibile. Indietro esce dalla
  modalità CSS. Non cambia codec, proporzioni interne o controlli di player esterni.
- Verificati 20 test Node e 21 controlli su fixture in un browser reale, inclusi
  automatico/annulla, pressione continua/rilascio e fallback video/ripristino.
  La riproduzione e lo schermo intero nativo sulla Samsung richiedono prova fisica.

## 0.4.1: rifinitura dei comandi video

- Il clic su controlli fullscreen riconoscibili (Plyr, Video.js, JW Player, classi e
  etichette fullscreen/schermo intero) usa il percorso nativo con fallback CSS anche
  senza passare dalla barra. Riconosce le icone figlie del pulsante.
- Il puntatore attraversa fino a cinque iframe dello stesso dominio; nei frame
  esterni resta il limite della same-origin policy. Non promette supporto a pulsanti
  senza etichette/classi riconoscibili o in player cross-origin.
- Il movimento genera mousemove per rivelare i controlli dei player compatibili.
- La barra mostra lo stato ON/OFF effettivo degli overlay e consente tre velocità:
  lenta (350 px/s), media (500 px/s), veloce (700 px/s).
- Verificati 20 test Node e 25 controlli browser su fixture, incluso clic sull'icona
  di un pulsante fullscreen con rifiuto dell'API nativa e fallback CSS.
  Il pulsante specifico di AnimeSaturn e la riproduzione sulla Samsung richiedono prova.

## 0.4.2

Aggiunto nella barra il collegamento Black Clover · episodio 50. URL verificato
nella lista episodi pubblica: https://animesaturn.at/watch/black-clover-jgswge/ep-50
