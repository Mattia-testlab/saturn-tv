# Debug avvio e primo OK — 0.8.0

La TV all’indirizzo già configurato risponde all’API di stato: modello UE50AU9070UXZT, Developer Mode attivo e Host PC IP 127.0.0.1. Questi dati non includono console o richieste del video. L’utente conferma 0.7.0, rotellina e nessun audio: il problema fisico non è attribuito alla cache.

Correzioni confermate nel codice: inoltro del primo OK rimosso dalla condizione remotePointerActive; trasmissione dei tasti del player indipendente dall’eccezione SOP; collegamento della barra all’iframe senza avvio video; focus senza scorrimento.

Compatibilità: su UA Tizen 3–6 si usa il video nativo per l’MP4 HTTPS non protetto già presente nella playlist JW. Si ferma JW e si nasconde il suo contenitore. Si conservano provider, formati e protezioni degli altri casi. I cambi episodio sono riconosciuti solo da origine/finestra parent e dominio/path player previsti. Nessuna sorgente viene salvata.

Un timeout singolo di 12 secondi rileva Play senza avanzamento e mostra readyState e networkState; non ripete l’avvio. La diagnostica include anche engine, pausa, dimensioni ed errore media.

La prima prova locale della playlist ha ottenuto 403 perché il proxy non conservava il Referer del player. Corretto il banco di prova. Non è una prova di un 403 sulla TV e non ha generato modifiche alle intestazioni di produzione.

Prova reale nel browser Mac: provider e MP4 originali, ramo nativo forzato soltanto nel banco locale. Primo OK con frecce riuscito senza Play dal menu. Video 1280×720 con readyState 4, avanzamento oltre 55 secondi, salto +10 s e pausa a 74,111 s, nessun MediaError. Il browser risulta muted: audio udibile non confermato. Screenshot outputs/saturn-0.8.0-player-reale.png.

41 test Node e 41 verifiche DOM (27 + 14) per filtri, menu, bridge, primo OK, timeline, pausa, uscita e messaggi autenticati. Il test manuale riproducibile è test/real-player-debug.py --native.

Rimane da provare la 0.8.0 sulla Samsung. Non è stato dimostrato un ciclo infinito nel firmware; i cicli di report e i comandi sono separati e i test verificano che lo stato non ripeta Play. Il percorso nativo è una correzione di compatibilità, non una diagnosi certa del blocco di rete/codec sul dispositivo.
