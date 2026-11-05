# 0.9.0 — semplificazione richiesta dall’utente

Il player alternativo e la barra aggiunta dell’esperimento 0.8.0 sono stati eliminati dal percorso attivo. La versione 0.8.0 non è stata pubblicata come tag. La 0.9.0 usa il player classico del sito e non invoca le API JW né muta sorgente o proprietà dei video.

Il primo tentativo di clic sul vero provider non avviava Play. L’ispezione della libreria già caricata ha mostrato che il ramo attivo ascolta pointerdown/pointerup; gli eventi mouse da soli non lo raggiungevano. Corretto il bridge di input e gestito NotFoundError della cattura virtuale solo durante il dispatch. Dopo la correzione, il Play originale ha avviato il video e currentTime è avanzato, con readyState 4 e video 1280×720. Anche la timeline originale ha cambiato posizione. Ingresso/uscita dal fullscreen originale riusciti. Un solo video presente, nessun video o transport del modulo.

Per il cursore: tocco 4 px, soglia 120 ms che evita la deriva del tocco breve, corsa continua e accelerazione, rimozione dei salti di repeat e del fattore 4× nello scroll. L’osservatore DOM non processa più ogni variazione style/class del player. In fullscreen il provider mantiene i propri tasti; sono riconosciuti anche il fullscreen WebKit e il fallback JW.

Le prove DOM su due origini verificano clic e coordinate tramite i listener originali di un controllo simulato. La suite Node controlla anche l’assenza di chiamate al provider e creazione di video. Le prove reali del sito sono distinte dalle simulazioni. Frame rate e audio sul televisore non sono stati misurati. Il browser Mac di prova risulta silenziato. Non si garantisce il risultato fisico sulla TV basandosi sui test locali.

Screenshot del provider originale: outputs/player-originale-0.9.0.png. Cartella progetto corrente: TIZENBREW.

Verifica finale: 18 test Node e 16 controlli DOM superati.
