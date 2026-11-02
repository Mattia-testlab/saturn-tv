# Saturn TV 0.7.0

Modulo sperimentale TizenBrew per AnimeSaturn, destinato a Samsung UE50AU9070UXZT.
Il modulo non equivale a un browser completo o a uBlock Origin.

## Installazione

Gestore moduli TizenBrew → Aggiungi modulo GitHub:

```
Mattia-testlab/saturn-tv
```

I nomi con `@v...` restano fissi a quella versione. Il Mac può rimanere spento durante
l'uso, ma occorre Internet per scaricare il modulo. Le cache GitHub/jsDelivr e del
servizio TizenBrew possono ritardare gli aggiornamenti. Altro → Strumenti → Versione
attiva mostra la versione realmente in esecuzione; non promette un aggiornamento
forzato. Il riavvio della pagina non svuota necessariamente la cache del servizio.

## Barra e telecomando

- Indietro o Blu aprono la barra; dal menu principale la richiudono.
- Indietro nelle impostazioni/preferiti riporta al menu principale.
- Frecce nella barra seguono la disposizione visiva dei pulsanti; OK esegue.
- Menu rapido: Play / Pausa, Schermo intero, Puntate, Cerca, Black Clover 50, Altro.
- Le puntate adiacenti si ricavano dai link realmente presenti per la serie corrente;
  senza link il relativo comando è disabilitato. Non vengono inventati URL.
- Riprendi conserva automaticamente l'ultima pagina /anime/.../ep-.... Se il video è accessibile,
  registra il secondo ogni 5 secondi e lo ripristina dopo il caricamento dei metadati.
  Non riprende a meno di 15 secondi dalla fine. Player esterni possono impedire il salvataggio.
- Preferiti conserva fino a 12 collegamenti; l'aggiunta di un tredicesimo sostituisce
  il meno recente. Nessun account o invio della cronologia ad altri servizi.
- Velocità del cursore lenta/media/veloce conservata sul dispositivo tra le pagine.
- Puntatore a requestAnimationFrame, diagonali normalizzate, stop al rilascio e watchdog
  a 900 ms senza eventi. Si nasconde dopo 3,5 secondi senza uso.
- Menu visibile in basso a destra; versione e dettagli tecnici sono nelle impostazioni.

## Video

Il clic su controlli fullscreen riconoscibili (Plyr, Video.js, JW Player, classi e
etichette fullscreen/schermo intero) prova l'API nativa. Se rifiutata, allarga il video
/embed con CSS reversibile. Nel fallback il puntatore resta utilizzabile, ci sono un
pulsante di uscita e Play/Pausa se il video è accessibile. Indietro ripristina la pagina.
I frame dello stesso dominio possono inoltrare i tasti al modulo principale; i player
cross-origin restano soggetti ai limiti del browser. Nessuna modifica a DRM o codec.

## Overlay e protezione

- Blocca window.open e ne protegge il riferimento da semplice assegnazione successiva.
- Blocca link/form pubblicitari, nuove finestre e form.submit() esterni col filtro attivo.
- Filtra script/iframe/fetch/XHR di un elenco limitato di domini pubblicitari osservati.
- Le scansioni sono raggruppate e limitate alle parti modificate quando possibile.
- L'automatico interviene su riquadri riconosciuti come pubblicitari o ricordati da una
  rimozione manuale. Non elimina ogni grande elemento fisso sconosciuto.
- Impostazioni → Nascondi overlay e ricordalo: nasconde il riquadro e ne conserva una
  firma locale (tag, id, classi e indirizzo del primo iframe), se disponibile.
- Annulla rimozione ripristina lo stile, elimina la firma e sospende l'automatico nella
  sessione. Nessun cambio impostazioni quando non esiste una rimozione da annullare.
- Un riquadro senza firma stabile potrebbe richiedere una nuova rimozione. Firme e
  classificazione possono dare falsi positivi: il ripristino resta necessario.

La modalità document-start resta disabilitata per un problema nel percorso di lancio
TizenBrew esaminato. Script già eseguiti prima dell'iniezione e redirect tramite
location.href o HTTP non sono intercettati universalmente. Il popup QR specifico della
TV richiede una verifica sul dispositivo. Non sono state importate le vecchie regole
animesaturn.cx di uAssets sul nuovo dominio .at senza verificarne l'applicabilità.

## Verifica riproducibile

```
node --check saturn.js
node --test test/*.test.cjs
node test/build-browser-fixture.cjs
python3 -m http.server 8766 --bind 127.0.0.1 --directory test/.browser
```

Aprire http://127.0.0.1:8766/ nel browser. La fixture modifica SOLO la propria copia
del controllo dominio per consentire localhost; il modulo distribuito non lo accetta.
La fixture contiene simulazioni DOM, non video streaming o pubblicità reali.
39 test Node. Le verifiche browser della release sono descritte nella sezione 0.7.0. Firmware, tastiera Samsung,
player reale e pubblicità reale non sono sostituiti da questi test.

`saturn.js` è la sorgente; `saturn-0.7.0.js` è la copia identica distribuita.
I file versionati precedenti restano per i tag già pubblicati.
Riferimenti: https://github.com/reisxd/TizenBrew e https://github.com/uBlockOrigin/uAssets


## Migrazione al dominio ufficiale (.net)

Dalla versione 0.6.0 il modulo apre https://www.animesaturn.net/, indicato da
https://www.animesaturn.me/ nella lista dei domini. Il vecchio .at è escluso.
Black Clover 50: https://www.animesaturn.net/anime/black-clover-67Dip/ep-50

Verifiche sul sito reale nel browser Mac: ricerca Black Clover, pagina serie,
episodio 50, avvio video e avanzamento oltre 80 secondi senza errore. La durata
rilevata era circa 1430 secondi. Questo verifica la disponibilità del contenuto
sul Mac, non la riproduzione sul firmware della TV né il filtraggio del modulo reale.

Il player osservato è un iframe #watch-iframe su https://play.saturncdn.net/embed/176.
Il modulo accetta solo il sito .net (con/senza www) e quel dominio player esatto.
Il bridge postMessage per clic/tasti/fullscreen verifica origine e finestra sorgente;
non consente messaggi da iframe pubblicitari o altri siti. Richiede che TizenBrew
inietti il modulo anche nel contesto del player: da confermare sulla Samsung.

Ricerca: /filter?key=Black+Clover. I link /episode/... sono pagine intermedie;
la riproduzione diretta è /anime/.../ep-50. Sono stati adattati ricerca, Home,
segnalibri, puntate adiacenti, ripresa, fullscreen e il pulsante Black Clover.

Preferiti e progressi salvati su .at non sono trasferiti: l'origine e gli
identificativi sono diversi. Non vengono cancellati o convertiti in URL inventati.


## 0.6.2 — avvio lettore e selezione puntate

OK nel player cross-origin non è più intercettato dal modulo: resta al lettore.
Avvia video nel menu invia un comando play al player autorizzato e riporta l'esito
della Promise. Stato lettore nelle impostazioni distingue mancata risposta, video
non creato, video in pausa, errore e riproduzione. Non garantisce di risolvere codec,
rete, sintassi del player o richieste di attivazione utente del firmware.
Il comando trasmette al player anche lo stato del filtro per il confronto diagnostico.
Il cursore risale dalle icone SVG al pulsante/collegamento contenitore e scorre
anche liste interne con overflow, come la lista degli episodi.

La release attuale usa un file JS con nome nuovo per evitare la cache del codice.
I file saturn-0.6.0.js, saturn-0.6.1.js e saturn-0.6.2.js sul ramo aggiornabile sono
alias di compatibilità per metadati vecchi; i tag Git già pubblicati restano immutati.
La versione vera è sempre quella stampata dal modulo.


## 0.6.2 — barra ridotta e uscita dal video

Barra principale: sei pulsanti su due righe (Play/Pausa, Schermo intero, Puntate,
Cerca, Black Clover 50, Altro). Altro separa le preferenze dagli Strumenti diagnostici.
Indietro dal fullscreen/cinema richiede esplicitamente l'uscita e riapre la barra,
anche tramite il bridge del player autorizzato. Non mette in pausa o ricarica il video.
Il pulsante Esci da schermo intero della modalità cinema riporta alla barra.

Per l'iframe ufficiale #watch-iframe, Schermo intero usa ora l'ingrandimento controllato
nell'app: il viewport TV è già a tutto schermo, mentre Menu e puntatore restano
raggiungibili. Se il lettore attiva comunque un fullscreen nativo, viene gestita
l'uscita tramite API standard/WebKit quando disponibili. La consegna dei tasti dal
firmware Samsung e l'iniezione nel player restano da verificare sul dispositivo.

Verificati 31 test Node e 24 controlli browser per la 0.6.2, inclusa uscita da player ingrandito e riapertura della barra. La consegna dei tasti reali sulla Samsung resta da collaudare.


## 0.6.3 — controlli durante la riproduzione

Il movimento del cursore ora attraversa il bridge del player ufficiale (massimo 25
aggiornamenti al secondo), con coordinate locali e verifica di origine e finestra.
Il player riceve mousemove per mostrare i propri controlli. Dopo aver attivato il
cursore o un comando video, OK torna al puntatore: il focus nell’iframe non impedisce
più di cliccare il punto indicato. Prima di ciò OK resta disponibile al player nativo.

Nell’ingrandimento controllato compaiono −10 s, Play / Pausa, +10 s ed Esci da schermo
intero anche con video cross-origin. Si nascondono dopo 3,5 secondi e ricompaiono
muovendo la freccia; Menu resta raggiungibile. Indietro esce e apre la barra principale.
I salti preservano la pausa e si fermano ai limiti del video; con durata non ancora
disponibile viene mostrato un errore. I tasti media supportati vengono registrati
quando le API Tizen lo permettono; i pulsanti restano l’alternativa disponibile.

Per aggiornare dalla 0.6.0 con il nome senza @v, tenere premuto Accensione fino al
logo Samsung, quindi aprire TizenBrew e il modulo. Non basta Aggiorna pagina.
Il codice ufficiale TizenBrew conserva il JS in una Map indicizzata per nome modulo
per tutta la vita del servizio: utils/debugger.js. Il numero della scheda può riferirsi
ai metadati; controllare Altro → Strumenti → Versione attiva nel modulo.

Prova del bridge nel browser: /bridge.html della fixture locale, con origini distinte
127.0.0.1 e localhost sulla porta 8766. Confermati movimento, clic e uscita dal video
tra contesti reali. Il player è simulato: non dimostra che JW Player o il firmware
Samsung reagiscano allo stesso modo. La verifica conclusiva resta sulla TV.


## 0.7.0 — avvio tramite API del player e barra temporale

Corretto un errore di integrazione: le release 0.6.x chiamavano direttamente
video.play(), anche quando il video era gestito da JW Player. La 0.7.0 usa
jwplayer('jw-player').play/pause/seek, getPosition/getDuration e setControls(true).
Se il provider è Vidstack usa media-player; HTML5 resta il fallback senza provider.
Questo corregge il percorso di avvio, ma non prova da solo che fosse l’unica causa
del nero sulla Samsung: rete, codec e rendering sul dispositivo non sono misurati.

La barra ora mostra posizione, durata e un vero input range anche fuori dal cinema.
Clic sulla timeline JW tradotto in seek con coordinate; frecce sul range spostano
di 10 secondi, OK libera il focus, Indietro rimane disponibile. Durante la regolazione
la barra non si nasconde. Il tempo non viene sostituito dai messaggi diagnostici.

Gli aggiornamenti seguono gli eventi media, con timeupdate limitato a due report al
secondo. I report passivi aggiornano solo la UI: non richiamano play o fullscreen.
Non viene aggiunto un polling del player. I listener JW sono registrati una sola
volta per istanza. Il test del percorso Play da idle fallisce se viene usato il
video grezzo invece del provider. I test precedenti con video simulato non
verificavano questo errore e non dimostravano il funzionamento reale su Tizen.

Per un collaudo con versione certa, aggiungere senza rimuovere l’altro modulo:

    Mattia-testlab/saturn-tv@v0.7.0

Questo usa un nome nuovo nella cache TizenBrew e un tag immutabile sulla CDN.
La scheda e la barra principale indicano 0.7.0; il canale senza tag resta disponibile.
Non vengono cancellati dati, preferiti o impostazioni. Il tag è una prova fissata
a questa release, non riceverà automaticamente le successive.

39 test Node e 39 verifiche browser (27 generali, 12 su origini separate) includono
avvio tramite modello JW da idle, tempo/durata, seek assoluto, focus della timeline,
uscita e assenza di Play ripetuti dopo report di stato. Il modello JW non è la
libreria reale e non prova la decodifica sulla TV. La prova del sito reale senza
modulo e la prova del modulo simulato sono evidenze distinte.

API di riferimento: https://docs.jwplayer.com/players/reference/playback e
https://docs.jwplayer.com/players/reference/seek
