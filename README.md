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
