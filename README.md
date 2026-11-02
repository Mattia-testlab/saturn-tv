# Saturn TV — prototipo 0.2.1

Modulo scritto per TizenBrew, dedicato a https://animesaturn.at/.
Destinazione prevista: Samsung UE50AU9070UXZT, firmware T-NKLADEUC-2310.0.
Compatibilità fisica e riproduzione sul televisore NON ancora verificate.

## Che cosa contiene

- Blocca le chiamate a window.open e i link/form che aprono nuove finestre.
- Filtra un piccolo elenco esplicito di domini pubblicitari, compreso il dominio
  osservato durante l'ispezione del sito. Non usa liste complete EasyList/uBlock.
- Filtra fetch, XHR e inserimenti dinamici di script/iframe riconosciuti.
- Mantiene i normali collegamenti agli episodi e gli iframe video non bloccati.
- Indietro oppure Blu apre/chiude la barra browser. In pieno schermo e nei campi di testo, Indietro resta al player o alla tastiera. Per la pagina precedente usare Indietro nella barra. Frecce selezionano, OK esegue, Indietro chiude.
- Barra: Indietro, Avanti, Aggiorna, Home, Salva pagina, Riapri salvato, Filtro, Chiudi.
- Salva pagina conserva un singolo collegamento sul dispositivo, non il minuto del video.
- Giallo cambia protezione e ricarica:
  prima mettere in pausa il video; la ricarica può perdere il punto di visione.
- Nessuna nuova dipendenza, nessuna telemetria aggiunta dal modulo.
  Il sito continua a effettuare le proprie richieste non filtrate.

## Limiti importanti

È codice sorgente di un prototipo, non un browser autonomo né un pacchetto WGT/TPK
già installabile. Richiede TizenBrew e una modalità di distribuzione del modulo.
Distribuzione GitHub: `Mattia-testlab/saturn-tv`. Lo ZIP non si installa semplicemente via USB.

I filtri JavaScript non equivalgono a un filtro di rete: gli script caricati dal
parser prima dell'iniezione possono essere già stati eseguiti. La rimozione DOM
successiva non annulla richieste o codice già eseguiti. Non intercetta in modo
universale location.href/location.replace, redirect HTTP o frame su altri domini.
L'iniezione all'avvio documento è richiesta nei metadati ma va verificata sul firmware.
I link legittimi in nuova finestra sono bloccati anch'essi: Giallo disattiva il filtro.
Non aggira DRM, autenticazione, blocchi di accesso o restrizioni geografiche.

## Verifica locale

Con Node.js già disponibile, nella cartella del progetto:

    node --check saturn.js
    node --test test/*.test.cjs

I test verificano comportamento delle funzioni in un ambiente simulato. Non sono
una prova di navigazione reale, riproduzione video o compatibilità Tizen.

## Prossimo passaggio sul televisore

1. Installare TizenBrew secondo la guida originale, dopo autorizzazione all'installazione.
2. Nel gestore moduli di TizenBrew scegliere Aggiungi modulo GitHub e inserire
   `Mattia-testlab/saturn-tv@v0.2.1`. Il tag fissa la versione da collaudare.
   Non inserire l’URL completo né il prefisso `gh/`.
3. Aggiungerlo come modulo e aprirlo. Il Mac serve per la preparazione/installazione;
   non è previsto un server Mac durante la visione. I file del modulo devono comunque
   essere raggiungibili tramite il canale di distribuzione configurato in TizenBrew.
4. Provare un episodio: avvio, pausa, pieno schermo, episodio successivo, Indietro.
5. Ripetere le interazioni che prima aprivano pubblicità. Controllare il contatore Blu.
   Se il video non parte, provare Giallo e confrontare. Non dichiarare il progetto
   funzionante finché questa verifica non è completata sul dispositivo.

Riferimento formato moduli: https://github.com/reisxd/TizenBrew/blob/main/docs/MODULES.md

Questo è il primo filtro sperimentale. Non promette eliminazione di ogni pubblicità
e non modifica il browser Samsung, il firmware o le altre app del televisore.
