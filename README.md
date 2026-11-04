# Novità 0.9.5

- Preferiti: seleziona una voce per aprirla, mostrarla nella barra o rimuoverla.
  La rimozione si può annullare finché la pagina resta aperta.
- La barra mantiene sei pulsanti: il preferito scelto sostituisce Black Clover 70.
- Riprendi si chiama Ultima puntata: riapre la pagina, senza promettere il minuto.
- Prima che il player sia disponibile, i comandi uguali vengono accorpati;
  dopo cinque secondi o un cambio pagina sono scartati.
- Filtro pubblicitario e regole overlay invariati rispetto alla 0.9.4.

# Saturn TV 0.9.4 — player originale del sito

Modulo TizenBrew per la Samsung UE50AU9070UXZT. Questa versione integra il supporto
al player HTML5 Vidstack (selezionato automaticamente per evitare blocchi e lag dello
schermo nero su Tizen), controlli rapidi per episodio successivo e precedente richiamabili
con il tasto Indietro, puntata di riferimento Black Clover 70 e ripristino istantaneo
della freccia del cursore dopo l'uscita da schermo intero.

## Installazione e aggiornamenti

Usare sempre questa unica voce GitHub in TizenBrew:

    Mattia-testlab/saturn-tv

Se è già presente, aprire quella: non aggiungere una nuova voce per ogni release.
Gli aggiornamenti vengono pubblicati nello stesso repository, sul ramo main,
e contrassegnati da un tag di release SemVer per il CDN usato da TizenBrew.
Il tag viene pubblicato dallo sviluppatore: il nome inserito sulla TV resta uguale.
I suffissi @v0.x fissano una versione e non sono il canale da usare normalmente.

Il servizio TizenBrew può tenere il vecchio codice in memoria. Quando una nuova
versione non compare, tenere premuto Accensione fino al logo Samsung, quindi
riaprire TizenBrew e la voce senza suffisso. Aggiorna pagina non svuota questa
cache. La verifica va fatta sul numero mostrato dalla barra del modulo.

Il Mac può rimanere spento durante l’uso sulla TV. Il banco locale è soltanto
uno strumento di sviluppo separato.

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
- Fuori dal fullscreen, Indietro o Blu aprono la barra completa: Play/Pausa,
 Schermo intero, Puntate, Cerca, Black Clover 50 e Altro. È nascosta inizialmente.
- Play/Pausa e Schermo intero sono scorciatoie che cliccano i controlli originali
 del sito. Non chiamano API del provider e non costruiscono un player alternativo.
- Altro contiene Riprendi (riapre l’ultima pagina, senza cambiare il minuto del
 video), Preferiti, Home, velocità cursore e overlay automatici.
- Strumenti conserva Aggiorna, filtro ON/OFF, Nascondi overlay e ricordalo,
 Annulla rimozione, Stato lettore e Versione attiva. Indietro dai sottomenu torna
 alla barra principale. Preferiti e velocità usano le chiavi di memoria esistenti.

### Ricerca e tastiera Samsung (0.9.2)

- Fine/Ricerca Samsung (65376) e Annulla (65385) rilasciano il campo di testo.
  Le frecce e OK tornano al cursore: si può selezionare una serie nei risultati.
- Durante la scrittura, Indietro chiude prima il campo; la pressione successiva
  apre la barra. Blu apre direttamente la barra. Chiuderla non riapre la tastiera.
- Invio normale conserva l’invio del form del sito e rilascia il campo dopo
  l’azione predefinita. L’Invio durante la composizione non interrompe la scrittura.
- La scorciatoia Cerca sceglie il campo visibile; se la ricerca mobile è chiusa,
  usa il pulsante Cerca originale del sito. Checkbox e slider non sono campi testo.

La gestione dei codici IME e della rimozione del focus segue la
[documentazione Samsung](https://developer.samsung.com/smarttv/develop/guides/user-interaction/keyboardime.html).
Il banco `/search.html` simula i codici Samsung e consente di provare la sequenza
ricerca → Fine → frecce → OK. Non emula la tastiera del firmware fisico.

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
La pulizia cosmetica automatica riguarda marcatori pubblicitari, domini noti e
regole apprese usando Nascondi overlay. La rimozione manuale seleziona riquadri
fissi grandi esterni al player; Annulla li ripristina e sospende l’automatismo.
Video, contenitore e controlli del player sono protetti. Non nasconde qualsiasi
riquadro bianco indiscriminatamente. L’osservatore generale ignora style/class e
i nodi di testo; solo gli overlay già riconosciuti con ID hanno un osservatore
specifico, esterno al player. Questo filtro non equivale a uBlock Origin e non garantisce il blocco
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
Anche le scorciatoie della barra 0.9.1 hanno avviato il video originale (readyState 4)
e il suo fullscreen nel banco reale sul Mac. La verifica finale sulla Samsung resta necessaria.

`saturn.js` e `saturn-0.9.3.js` sono identici. Le vecchie copie 0.6/0.7/0.8/0.9 sul ramo
aggiornabile sono alias di compatibilità; i tag Git pubblicati restano immutati.
L’esperimento 0.8.0 è archiviato e non è il player attivo. I file legacy sono
conservati per consultazione e non rientrano nella suite corrente.

Per chi pubblica: jsDelivr senza suffisso seleziona l’ultima release SemVer,
non semplicemente l’ultimo commit main. Ogni release deve quindi includere il tag
corrispondente prima del controllo del canale stabile.
[Documentazione jsDelivr](https://www.jsdelivr.com/documentation).
