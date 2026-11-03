# Saturn TV 0.9.0 — player originale del sito

Modulo TizenBrew per la Samsung UE50AU9070UXZT. Questa versione segue la richiesta
di usare il lettore classico di AnimeSaturn. Play, pausa, timeline, sorgente video,
impostazioni e fullscreen sono quelli del sito. Il modulo non chiama le API JW,
non crea video alternativi, non cambia src/controls e non aggiunge transport bar.

## Installazione

Gestore moduli TizenBrew → Aggiungi GitHub:

   Mattia-testlab/saturn-tv@v0.9.0

Aprire la scheda “player del sito · 0.9.0”. Il tag usa una chiave nuova della cache;
rimane fissato a questa release. Il canale Mattia-testlab/saturn-tv senza tag resta
aggiornabile, ma codice e metadati possono rimanere nella cache del servizio: il
semplice refresh della pagina non la svuota. Il Mac può rimanere spento durante
l’uso sulla TV. Il banco locale è uno strumento di sviluppo separato.

## Telecomando e cursore

- OK clicca il controllo originale sotto la freccia.
- Tocco breve: 4 pixel, con 120 ms di soglia prima della corsa continua.
- Pressione prolungata: animazione con requestAnimationFrame e accelerazione
 progressiva da 90 a 600 px/s. Coordinate frazionarie e transform GPU; niente
 salto iniziale di 28 px e niente salto supplementare per ogni evento repeat.
- Rilascio, perdita del focus e watchdog fermano il movimento. Scorrimento di
 pagina e liste segue il movimento, senza il precedente moltiplicatore 4×.
- In fullscreen i tasti restano al player. Indietro usa l’uscita standard/WebKit
 o il pulsante di uscita originale nel fallback fullscreen del sito.
- Fuori dal fullscreen, Indietro o Blu aprono una navigazione essenziale: Cerca,
 Puntate, Black Clover 50, Home, Aggiorna pagina, Chiudi. È nascosta inizialmente.

La precisione del singolo tocco e la curva di movimento sono controllate nei test.
La cadenza e il frame rate del telecomando sul firmware Samsung richiedono il
collaudo fisico; non si dichiara una equivalenza con un mouse hardware.

## Compatibilità dei clic

Il JW Player attuale usa Pointer Events quando disponibili. Inviare soltanto
mousedown/mouseup non attivava i suoi controlli nel banco reale. Il bridge ora
invia pointerdown/pointerup e il normale click, con coordinate locali, senza
invocare play/seek/fullscreen. Sui motori senza Pointer Events usa gli eventi mouse.

Un puntatore virtuale non ha una cattura hardware: durante il solo dispatch sono
protetti i metodi set/releasePointerCapture degli antenati del bersaglio, ignorando
solo NotFoundError per l’ID sintetico. I metodi sono ripristinati immediatamente.
I puntatori e gli errori reali non sono modificati. Origine, finestra mittente e
coordinate del bridge sono verificati. Il focus usa preventScroll.

## Filtro annunci

Sono bloccati popup e domini pubblicitari identificati, incluso il loader acscdn.com e viowrel.com
osservato nell’iframe del sito. Le richieste del player e dei video passano inalterate.
La pulizia cosmetica è limitata a risorse pubblicitarie e marcatori espliciti del
sito; non usa euristiche per nascondere riquadri bianchi o modificare il player.
Il MutationObserver ignora gli aggiornamenti style/class e i nodi di testo della
riproduzione. Questo filtro non equivale a uBlock Origin e non garantisce il blocco
di ogni inserzione caricata prima dell’iniezione del modulo.

## Verifica

   npm test
   node --check saturn.js
   node test/build-browser-fixture.cjs
   python3 -m http.server 8766 --bind 127.0.0.1 --directory test/.browser

Aprire http://127.0.0.1:8766/ e /bridge.html. La copia di test ammette i due host
locali del banco; quella distribuita ammette soltanto il sito e il player ufficiali.

   python3 test/real-player-debug.py

Aprire http://127.0.0.1:8768/ . Il banco carica il provider e la playlist originali;
il video è richiesto dal browser e non viene salvato su disco. HTML/asset/playlist
passano da un proxy locale per la prova, con il normale Referer del player. Non è
un emulatore del firmware TV e non costituisce una prova completa del filtro.

Le prove reali sul Mac hanno verificato avvio con OK sul Play originale, avanzamento
del video 1280×720 con readyState 4, clic sulla timeline, ingresso e uscita dal
fullscreen del sito, con un solo video e senza controlli di riproduzione aggiunti.
L’audio del browser di prova è silenziato; non si dichiara verificato l’ascolto.
La verifica finale sulla Samsung resta necessaria.

`saturn.js` e `saturn-0.9.0.js` sono identici. Le vecchie copie 0.6/0.7/0.8 sul ramo
aggiornabile sono alias di compatibilità; i tag Git pubblicati restano immutati.
L’esperimento 0.8.0 è archiviato e non è il player attivo. I file legacy sono
conservati per consultazione e non rientrano nella suite corrente.
