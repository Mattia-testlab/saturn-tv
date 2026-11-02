# Verifica del lettore — 0.7.0

Difetti confermati: avvio con video.play() invece dell’API JW; clic senza coordinate; assenza della timeline del modulo; messaggi che sostituivano il tempo. La 0.7.0 usa il provider per play/pause/seek, inoltra clic con coordinate e mostra tempo/durata e input range anche fuori dal fullscreen.

Non è stato dimostrato un ciclo infinito sulla TV. Nel codice nuovo i report passivi aggiornano solo la UI, timeupdate è limitato a due report/secondo, i listener JW sono registrati una volta per istanza e non viene avviato polling del provider. Lo schermo intero chiede solo lo stato: non avvia il video. La UI saturn-* è esclusa dalle scansioni del MutationObserver.

Regressioni: il modello JW parte da idle e vieta il play del video grezzo. I test coprono anche seek assoluto, clic sulla timeline, frecce con focus, OK che libera il controllo, Indietro e report di stato che non ripetono Play. Un test ha rilevato un messaggio che sovrascriveva il tempo; corretto. Corretto anche il banco di prova, che deve inviare i tasti all’elemento con focus.

39 test Node e 39 controlli browser superati (27 generali, 12 su due origini distinte). Il player di questi test è simulato: la decodifica e il compositing della Samsung restano non misurati. Il test del sito sul Mac senza il modulo è un’evidenza distinta. La correzione dell’avvio non dimostra che fosse l’unica causa del nero sulla TV.

Per una versione certa: Mattia-testlab/saturn-tv@v0.7.0. Questo cambia la chiave della cache TizenBrew senza cancellare moduli, dati o preferiti. Il tag rimane fissato alla release. Il canale senza tag continua a esistere. La barra principale e la scheda indicano 0.7.0.

API: https://docs.jwplayer.com/players/reference/playback e https://docs.jwplayer.com/players/reference/seek.
