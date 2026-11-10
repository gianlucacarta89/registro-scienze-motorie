# MAPPA — Registro S.Mot (Registro Scienze Motorie) v7.9

Indice dei file: cosa c'è dentro e quale parte dell'app ne dipende.
Tutti i moduli stanno nell'oggetto globale `App`. Ordine di caricamento in `index.html`:
config → core → servizi → stampa → dati → ui → avvio (jsPDF in `lib/` si carica solo quando serve).

## Radice
| File | Scopo |
|---|---|
| `index.html` | Rimanda ad `app/index.html` (vecchio indirizzo e apertura con doppio clic) |
| `app/index.html` | **La pagina dell'app**: scheletro (testata, menu, contenuto, piè) ed elenco ordinato degli script; `<html data-base="../">` = dove sono css/, js/, icone/, lib/ (letto da `App.U.base()`) |
| `LEGGIMI.txt` | Istruzioni per chi usa l'app |
| `MAPPA.md` | Questo indice |
| `NOVITA.md` | Cronologia delle versioni |
| `manifest.webmanifest` | Nome, icone e colori dell'app installata (PWA); `scope`, `id` e avvio in `app/` (`./app/?app=smot`) |
| `sw.js` | Service worker: salva i file per l'uso offline. **Aggiornare `VERSIONE` a ogni consegna e l'elenco `FILE` se si aggiungono o tolgono file** |
| `icone/` | Icone dell'app: racchetta e pallone su quadrato verde arrotondato (`icona.svg` anche nella testata; PNG 192, 512, maskable 512, apple-touch 180) |
| `.nojekyll` | Dice a GitHub Pages di pubblicare i file così come sono |

La versione online (pagina privata su claude.ai) usa gli stessi file `css/` e `js/`: cambia solo la pagina iniziale, senza `<html>` e `<head>`.

## css/
| File | Scopo |
|---|---|
| `base.css` | Colori (variabili per funzione: ok, pericolo, info) chiari e scuri, caratteri, testata, piè |
| `componenti.css` | Pulsanti, tabelle, caselle, chip, finestre, moduli, avvisi |
| `pagine.css` | Menu (in alto sul computer, fisso in basso sul telefono), titoli e sottoschede delle pagine, 🏠 tessere colorate della Home, classi e alunni, elenco test con "Lo uso" |
| `elenco-test.css` | Elenco 📚, test del libro 📖, scheda del test |
| `statistiche.css` | Scheda 📈 Statistiche test: 🏅 primi 3 alunni e alunne, 🕸️ ragnatela |
| `telefono.css` | Adattamenti sotto 760 px e 480 px |

## js/config.js — `App.Config`
Nome, versione, nome dell'archivio, **tipologie dei test (menu a tendina, e ordine delle colonne)**, **formati del tempo** (`formatiTempo`), **menu** (`menu`: voci, icone, etichette corte), **parametri modificabili dei test del libro** (`parametri`: distanza dello sprint e della corsa, peso della palla medica, valori possibili, modello di ricalcolo e coefficienti k/e), **capacità del grafico a ragnatela** (`capacita`), **fasce** delle tabelle del libro (`fasce`), **campi della scheda del test** (`schedaTest`), **♂/♀ dai nomi** (`sessoDaiNomi`: particelle dei cognomi, finali, eccezioni come Andrea e Luca), mesi (set–giu), prove, tipi di test, **simboli delle giustificazioni** (con `certificato: true` quelli che ammettono la spunta), **spunta del certificato medico** (`certificato`), limiti, parole d'intestazione, testi delle regole, passi del backup con Google Drive (`backupPassi`, `backupDispositivi`, `backupNota`) e nota privacy.
→ Per cambiare simboli, mesi o testi delle regole si tocca solo qui.

## lib/ (librerie in locale: funzionano offline, si caricano solo quando si crea un PDF)
| File | Scopo |
|---|---|
| `jspdf-2.5.1.umd.min.js` | jsPDF (MIT) — creazione dei PDF |
| `jspdf-autotable-3.8.2.min.js` | jsPDF-AutoTable (MIT) — tabelle nei PDF |

## js/stampa/ (PDF — **solo caratteri ASCII nel codice**, simboli come `\uXXXX`)
| File | Modulo | Funzioni principali |
|---|---|---|
| `pdf-base.js` | `App.PdfBase` | `carica` (librerie da lib/), `testo` (filtro per i font standard: niente emoji, apostrofi curvi, frecce), `nuovo`, `intestazione`, `sezione`, `tabella`, `legenda`, `nota`, `piede` (numeri di pagina), `nomeFile` |
| `pdf-dati.js` | `App.PdfDati` | testi comuni: `risultato` (valore + voto), `cellaTest`, `mediaVoti`, `strumentoPer` (♂/♀), `descrizioneTest`, `legendaVoti`, `periodo`, `cellaGiust` ("5 S, 12 A"), `legendaGiust` |
| `pdf-classe.js` | `App.PdfClasse` | `crea` — tabella della classe per i colleghi (orizzontale): test, legenda, riepilogo, giustificazioni per mese con sigle e totali |
| `pdf-alunno.js` | `App.PdfAlunno` | `crea`, `nomeFile` — scheda del singolo alunno per la famiglia (verticale), solo i suoi dati |

## js/core/ (base comune, core 1.0)
| File | Modulo | Funzioni principali |
|---|---|---|
| `utils.js` | `App.U` | `el`, `svuota`, `esc`, `nuovoId`, `oggiISO`, `dataIT`, `dataOraIT`, `spazi`, `chiaveNome`, `confronta`, `scarica`, `copia` |
| `archivio.js` | `App.Archivio` | `apri`, `leggi`, `scrivi`, `tipo` — IndexedDB con riserva localStorage |
| `stato.js` | `App.Stato` | `dati`, `bozze`, `carica`, `salva` (aggiorna ultimaModifica), `scrivi` (preferenze), `sostituisci`, `classe`, `daSalvareInBackup`; v6.9: protezione "app aperta in due finestre" — prima di ogni salvataggio rilegge l'archivio e, se un'altra finestra ha salvato dopo, non sovrascrive ma carica i dati recenti e avvisa; `controllaAltri` (al ritorno in primo piano), avviso tra finestre con BroadcastChannel `registro-sm` |
| `finestra.js` | `App.Finestra` | `apri({titolo, icona, corpo, pulsanti})` — finestre sovrapponibili, Esc chiude |
| `avvisi.js` | `App.Avvisi` | `toast`, `conferma` |
| `pwa.js` | `App.Pwa` | `avvia` (registra sw.js, dati persistenti), `puoInstallare`, `installa`, `cercaAggiornamenti` (controlla all'avvio e al ritorno in primo piano, ricarica da sola alla nuova versione) — pulsante 📲 Installa l'app nel piè di pagina |
| `tema.js` | `App.Tema` | `leggi`, `imposta`, `pulsante` — tema ☀️ chiaro (predefinito) / 🌙 scuro con il pulsante nella testata, salvato in localStorage (`registro-sm-tema`) per dispositivo, non nel backup; caricato nel `<head>` e applicato subito (eccezione voluta: niente lampo bianco) |

## js/servizi/ (logica, senza interfaccia)
| File | Modulo | Funzioni principali |
|---|---|---|
| `calendario.js` | `App.Calendario` | `annoCorrente`, `annoAttivo`, `etichetta`, `mesi`, `limiti`, `meseDi` |
| `nomi.js` | `App.Nomi` | `daRighe`: se trova l'intestazione (Cognome / Nome / Cognome e nome / Alunno / Nominativo) prende **solo quelle colonne e solo le righe sotto**; senza intestazione un nome per riga. `colonneNomi`, `colonnaDi` (colonna per sovrapposizione), `pezzi` (toglie cifre e lettere singole), `pulisci` (numeri d'ordine, MAIUSCOLE), `righeDaTesto`, `unici` |
| `classi.js` | `App.Classi` | `impostaSesso`, `senzaSesso`, `crea`, `rinomina`, `elimina`, `aggiungiAlunni`, `rinominaAlunno`, `eliminaAlunno`, `esisteAlunno`, `datiAlunno` |
| `test.js` | `App.Test` | `formato` (tempo: 'sec' velocità / 'min' resistenza / 'auto'), `formatta`, `riscrivi`, `riscriviTutti` (tempi nel formato del test), `gruppo`, `ordina` (colonne in ordine di tipologia come in config.js), `ordinaTutti` (avvio e backup), `sposta` (solo nella stessa tipologia), `copia` (test in un'altra classe), `valida` (numeri e tempi), `etichetteStrumento` (uno per tutti o ♂/♀), `crea`, `modifica`, `elimina`, `sposta`, `valore`, `imposta`, `confronto` (1ª → ultima prova svolta), `quantiRisultati` |
| `voti.js` | `App.Voti` | `scala` (4–10 con i mezzi voti), `controlla` (tabella in ordine), `calcola` (voto da risultato e ♂/♀), `votoAlunno`, `media`, `haTabella`, `sufficiente` |
| `statistiche.js` | `App.Statistiche` | `test` (svolti, media, migliore, peggiore, ♂/♀, quanti per voto), `miglioramenti`, `mediaVotiPerTest`, `primi` (primi 3 ♂ o ♀ di un test, miglior risultato tra le prove, pari merito), `testoValore` |
| `elenco-test.js` | `App.ElencoTest` | `contenitore` (l'elenco con la forma di una classe), `tutti`, `registra` (test nuovo di classe → elenco, collegato con `origine`), `aggiorna` (copia collegata allineata), `stacca` (modifica fatta nell'elenco), `aggiungiAClasse`, `prendiDaClasse` |
| `statistiche-giust.js` | `App.StatGiust` | `perAlunno` (totale, per tipologia e con certificato, mese o anno), `perMese`, `totali` (anche ♂/♀) |
| `nomi-sesso.js` | `App.NomiSesso` | `indovina` — ♂/♀ proposto dal nome di battesimo (elenchi di nomi + finale -a/-o, regole in `config.sessoDaiNomi`); '' se incerto |
| `scheda-test.js` | `App.SchedaTest` | Scheda del test (`campi`, `imposta`, `errore`, `haScheda`) e tabelle per fascia (`fasciaDiClasse` dal nome della classe, `applicaFascia`, `haFasce`) |
| `parametri-test.js` | `App.ParametriTest` | `regola`, `coefficiente`, `scalaValore`, `scalaTabella`, `nome`, `valori`, `applica` (cambia distanza/peso ♂/♀ di un test del libro: nome, strumento e soglie ricalcolate sempre dalla tabella originale del libro; sprint ×(1+k·Δd/base), lancio ×(base/peso)^e, corsa ×(d/base)^e; dati in `test.parametro`) |
| `doppioni.js` | `App.Doppioni` | `simili`, `gruppi`, `compatibili`, `proposto`, `voci` (elenco + libro + test solo nelle classi), `nelleClassi`, `risultatiTotali`, `gruppiTutti`, `unisci(tieni, altri)` (una volta sola: toglie i doppioni dall'elenco e in OGNI classe i test con quei nomi diventano uno, con il nome di quello tenuto e tutti i risultati), `unisciInClasse`, `quanti`, `perche` (motivo per cui due test non si possono unire) — 1 km = 1000 m nei nomi; parole con una lettera diversa uguali (Sergent = Sargent); mai numeri diversi nello stesso gruppo, test senza numeri ambigui esclusi |
| `partecipazioni.js` | `App.Partecipa` | `voci`, `ha`, `imposta`, `icone`, `titolo` — spunte per alunno 🏐 torneo scolastico / 🏅 giochi della gioventù (`alunno.partecipa`, config `partecipazioni`); solo promemoria, nessun calcolo sui voti |
| `attivita.js` | `App.Attivita` | `votiPossibili`, `errore`, `tutte`, `aggiungi`, `modifica`, `elimina`, `togliAlunno`, `valutati`, `media`, `quante` — ⛹️ attività valutate per classe (`classe.attivita`: data, titolo, descrizione, note, `voti[alunnoId] = { voto, nota }`; voti da config `attivita`, interi o mezzi punti) |
| `libro-voti.js` | `App.LibroVoti` | `compatibili`, `proposto` (test del libro equivalente: nome con sinonimi + tipologia), `applica` (tabella della fascia + scheda nei campi vuoti, `test.daLibro`), `togli`, `modello` (copia nell'elenco o libro), `sostituisci` (il test diventa quello del libro, risultati riscritti con `converti`, unione se già presente) |
| `profilo.js` | `App.Profilo` | `alunno` — media dei voti per capacità in una prova (capacità e tipologie in `config.capacita`), `capacitaClasse`, `capacitaDi` |
| `giustificazioni.js` | `App.Giust` | `errore` (mese, doppioni, simbolo), `ammetteCertificato`, `conCertificato`, `aggiungi`, `modifica`, `elimina`, `delMese`, `totaleAnno`, `contaClasse` |

## js/dati/
| File | Modulo | Funzioni principali |
|---|---|---|
| `test-libro.js` | `App.TestLibro` | Dati: i 33 test del libro (scheda + tabelle per fascia b1/b2/q o tabella unica), generati dal PDF del docente |
| `zip.js` | `App.Zip` | `apri(buffer)` — legge .xlsx/.docx senza librerie (DecompressionStream) |
| `pdf-oggetti.js` | `App.PdfOggetti` | `apri(buffer)` — oggetti del PDF, object stream, flussi FlateDecode/ASCII85/ASCIIHex, pagine in ordine |
| `pdf-caratteri.js` | `App.PdfCaratteri` | `prepara(doc, font)` — ToUnicode, WinAnsi, /Differences, font Type0, larghezze |
| `pdf-testo.js` | `App.PdfTesto` | `estrai(buffer)` — testo per posizione → righe di celle `{t, x, x1}` (numeri e lettere in celle separate) |
| `leggi-file.js` | `App.LeggiFile` | `righe(file)` — Excel (primo foglio), Word (paragrafi, tabelle, a capo), PDF, csv/txt |
| `zip-scrivi.js` | `App.ZipScrivi` | `crea` (ZIP senza compressione: più schede PDF in un file), `crc32` |
| `backup.js` | `App.Backup` | `esporta`, `leggi`, `riepilogo`, `localiPiuRecenti`, `applica` |
| `unisci-backup.js` | `App.UnisciBackup` | `unisci(backup)`: ➕ Unisci senza cancellare né cambiare nulla — aggiunge classi, alunni, test (anche dell'elenco) mancanti (stesso id o nome = già presente), risultati solo nelle caselle vuote, giustificazioni mancanti (stesso id o stesso giorno = già presente); conta cosa ha aggiunto e i risultati diversi |
| `migra-sprint.js` | `App.MigraSprint` | `applica(dati)` (da `normalizza`, anche per i backup vecchi): "Sprint 30 metri" → "Sprint" (anche `daLibro`/`parametro.libro`); nelle classi "Velocità 60 m ♀ / 80 m ♂" → "Sprint" con ⚙️ ♂ 80 / ♀ 60 m, risultati e tabella invariati ("Sprint (♂ 80 m, ♀ 60 m)" se c'è già uno Sprint); nell'elenco la sua copia si toglie |

## js/ui/ (interfaccia: una pagina, sottoscheda o finestra per file)
Menu (config.menu): 🏠 Home · 🏫 Classi · 📚 Test · 📖 Libro · ⏱️ Sessioni · 📋 Giustificazioni · 📄 Riepilogo · 💾 Backup.
Ogni pagina è `App.UI.Pagine[id].disegna(cont)`; la pagina aperta è `preferenze.pagina`.

| File | Modulo | Cosa disegna |
|---|---|---|
| `pagina.js` | `App.UI.disegna`, `disegnaContenuto`, `piede`, `vuoto`, `regole`, `titoloPagina`, `sceltaClasse`, `sottoSchede`, `senzaClassi` | Pagina intera (menu + pagina aperta + piè con stato del backup) e pezzi comuni |
| `menu.js` | `App.UI.Menu`, `App.UI.vai(pagina, sotto)` | Menu principale |
| `pagina-home.js` | `App.UI.Pagine.home` | 🏠 Saluto, tessere quadrate colorate (una per sezione, con i numeri dal vivo; Backup rossa se va fatto), schede delle classi |
| `pagina-classi.js` | `App.UI.Pagine.classi` | 🏫 Crea classe; per ogni classe: nome modificabile, ♂/♀, 📥 Carica alunni, 👥 Gestisci alunni, 🗑️, elenco degli alunni (tocco = correggi) |
| `pagina-test.js` | `App.UI.Pagine.test` | 📚 Sottoschede "Elenco dei test" e "📈 Statistiche" (classe scelta in alto) |
| `lista-test.js` | `App.UI.ListaTest` | Elenco unico: test del libro + miei, per tipologia, spunta "Lo uso", filtri Tutti / In uso / Libro / Miei, ➕ Nuovo test, 📥 Prendi i test della classe, ✏️ |
| `pagina-libro.js` | `App.UI.Pagine.libro` | 📖 Test del libro da consultare: per tipologia, caratteristiche, scheda e tabella di valutazione ♂/♀ della fascia scelta (`preferenze.fasciaLibro`), ricerca, Apri/Chiudi tutti |
| `pagina-sessioni.js` | `App.UI.Pagine.sessioni` | ⏱️ Parte operativa: sottosezioni "✏️ Risultati" e "🎯 Voti" della classe scelta |
| `tabella-voti.js` | `App.UI.TabellaVoti` (anche `tabellaSoglie`) | 🎯 Voti: alunni × test con voto calcolato, media alunno, media classe per test; tabelle dei voti (♂/♀) dei test |
| `tabella-test.js` | `App.UI.TabellaTest` | Tabella alunni × test: Classe, 📚 Scegli i test, 1ª / 2ª / 3ª prova, Confronto, 📋 Copia test, voto e media voti |
| `finestra-elenco-test.js` | `App.UI.FinestraElencoTest` | 📚 Scegli i test (da Sessioni): solo quelli in uso, già presenti segnati, fascia dei voti, ➕ Nuovo test al volo |
| `finestra-test.js` | `App.UI.FinestraTest` | Nuovo test e ✏️ intestazione colonna: nome, tipologia (menu da config + Altro…), strumento (uno o ♂/♀), tipo, unità, migliore, 📖 scheda, ◀ ▶ sposta, 🗑️ |
| `finestra-voti-classe.js` | `App.UI.FinestraVotiClasse` | 📏 Tabelle dei voti della classe: fascia (proposta dal nome, ricordata in `classe.fascia`), per ogni test il test del libro proposto e lo stato, 📖 Applica / 🗑️ Togli / 🔄 Sostituisci con il test del libro sui test spuntati |
| `finestra-parametri.js` | `App.UI.FinestraParametri` | ⚙️ Parametri del test: menu ♂/♀ dei valori, anteprima delle soglie libro → nuovo con i coefficienti, avviso se ci sono già risultati, ✔ Applica |
| `finestra-doppioni.js` | `App.UI.FinestraDoppioni` | 🔗 Test doppioni: gruppi unici (non per classe) con "Tieni"/"Unisci" e in che classi c'è ogni test; 🔗 Unisci vale per elenco e tutte le classi; ✋ Unisci a mano tra tutti i test (elenco, libro, classi) |
| `finestra-voti.js` | `App.UI.FinestraVoti` | 📏 Tabella dei voti: una riga per voto, soglia ♂ e ♀, ➕ riga, controllo dell'ordine; 📖 Riempi dal libro (test compatibili, il più simile per primo, fascia della classe; al salvataggio anche la scheda) |
| `finestra-copia-test.js` | `App.UI.FinestraCopiaTest` | 📋 Copia test in un'altra classe |
| `statistiche.js` | `App.UI.Statistiche` | 📈 Statistiche (pagina Test): per test e prova, andamento, miglioramenti, media voti per test, 🏅 primi 3, 🕸️ profilo |
| `profilo-alunno.js` | `App.UI.ProfiloAlunno` | `disegna(classe, alunno, prova)`: grafico a ragnatela (SVG) con la media dei voti per capacità, 1ª prova tratteggiata dalla 2ª in poi, voti per capacità; spiega cosa manca (capacità, tabelle, ♂/♀) |
| `scheda-alunno.js` | `App.UI.SchedaAlunno` | 👤 Scheda dell'alunno (tocca il nome in 🏫 Classi): risultati e voti di ogni test nelle prove svolte, media voti per prova, ragnatela della prova scelta, ✏️ Correggi |
| `grafici.js` | `App.UI.Grafici` | `colonne`, `barre` (grafici HTML/CSS) |
| `pagina-giust.js` | `App.UI.Pagine.giust` | 📋 Sottoschede "Registro" e "📈 Statistiche" (classe scelta in alto) |
| `tabella-giust.js` | `App.UI.TabellaGiust` | Registro: ◀ anno ▶, alunni × mesi, Tot., legenda (nome alunno toccabile) |
| `finestra-giust.js` | `App.UI.FinestraGiust` | Tocco su una casella del mese: elenco, ✏️, 🗑️, nuova giustificazione con spunta 📄 certificato medico (non per l'attrezzatura; con bozza) |
| `finestra-appello.js` | `App.UI.FinestraAppello` | ⚡ Appello rapido: un giorno, tutta la classe; un tocco sul motivo per alunno (🌸 solo alunne o ♂/♀ non indicato), 📄 certificato e nota dove servono, chi è già giustificato quel giorno indicato e non toccato; ✔ Salva le aggiunge tutte dopo averle controllate tutte |
| `spunte-partecipa.js` | `App.UI.spuntePartecipa`, `App.UI.iconePartecipa` | spunte salvate subito (scheda dell'alunno, ✏️ Correggi) e icone 🏐🏅 accanto al nome (Classi, risultati, voti) |
| `pagina-attivita.js` | `App.UI.Pagine.attivita` | ⛹️ Attività: classe, ➕ Nuova attività, elenco (data, titolo, descrizione, valutati, media) |
| `finestra-attivita.js` | `App.UI.FinestraAttivita` | attività nuova o da modificare: data, titolo, descrizione, note, voto (menu 10…1 con mezzi punti) e nota per alunno; ✔ Salva, 🗑️ Elimina con conferma |
| `statistiche-giust.js` | `App.UI.StatisticheGiust` | 📈 Statistiche giustificazioni: anno, mese o tutto l'anno, per alunno e tipologia, grafici |
| `pagina-riepilogo.js` | `App.UI.Pagine.riepilogo` | 📄 PDF: classi, alunni, contenuto, periodo, tipo (tabella della classe / schede alunni, ZIP), docente |
| `pagina-backup.js` | `App.UI.Pagine.backup` | 💾 Stato, passi con Google Drive, ⬇️ Esporta, ⬆️ Importa (con conferma) |
| `finestra-alunno.js` | `App.UI.FinestraAlunno` | Tocco sul nome: correggi il nome, ♂/♀, 🗑️ Togli (`togli` usato anche da finestra-alunni) |
| `finestra-alunni.js` | `App.UI.FinestraAlunni` | 👥 Gestisci alunni: aggiungi, ♂/♀, correggi nome, 🗑️, ☑️ Seleziona tutti / 🗑️ Togli selezionati, 📥 Carica |
| `finestra-importa.js` | `App.UI.FinestraImporta` | 📥 Carica alunni: 📂 file (anche PDF), 📋 incolla, anteprima con spunte, ♂/♀ proposti e nomi correggibili |

## js/avvio.js
`App.avvia` — imposta titolo e icona, carica i dati (`App.Stato.carica`), poi `App.UI.disegna` e `App.Pwa.avvia`. È l'unico file che fa partire qualcosa.

## Struttura dei dati (`App.Stato.dati`)
```
{ schema: 1, ultimaModifica, ultimoBackup,
  archivio: { test: [ come classe.test + origine: { c, t }, inUso: false (= non lo uso), libro: true, fasce ] },   // 📚 elenco dei test
  preferenze: { classeAttiva, docente, pagina: 'home'|'classi'|'test'|'sessioni'|'giust'|'riepilogo'|'backup', sottoTest: 'elenco'|'stat', sottoGiust: 'registro'|'stat', sottoSessioni: 'risultati'|'voti', filtroTest, prova: 1|2|3|'c', statgMese, statgOrdine, annoInizio: null|2026, statTest, statAlunno },
  classi: [{ id, nome, fascia: 'b1'|'b2'|'q' (facoltativa: fascia scelta per le tabelle del libro),
    alunni: [{ id, nome, sesso: 'M'|'F'|'' }],
    test: [{ id, nome, tipologia, note, strumento, perSesso, strumentoM, strumentoF, unita, tipo: 'numero'|'tempo', migliore: 'alto'|'basso',
            voti: { righe: [{ voto: 8, M: '440', F: '380' }] } }],
    risultati: { alunnoId: { testId: { '1': '145', '2': '152', '3': '160' } } },
    giust: { alunnoId: [{ id, data: 'AAAA-MM-GG', simbolo, certificato: true|false, nota }] } }] }
```
