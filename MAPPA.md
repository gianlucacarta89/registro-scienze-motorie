# MAPPA — Registro S.Mot (Registro Scienze Motorie) v5.3

Indice dei file: cosa c'è dentro e quale parte dell'app ne dipende.
Tutti i moduli stanno nell'oggetto globale `App`. Ordine di caricamento in `index.html`:
config → core → servizi → stampa → dati → ui → avvio (jsPDF in `lib/` si carica solo quando serve).

## Radice
| File | Scopo |
|---|---|
| `index.html` | Scheletro della pagina (testata, menu, contenuto, piè) ed elenco ordinato degli script |
| `LEGGIMI.txt` | Istruzioni per chi usa l'app |
| `MAPPA.md` | Questo indice |
| `NOVITA.md` | Cronologia delle versioni |
| `manifest.webmanifest` | Nome, icone e colori dell'app installata (PWA) |
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
Nome, versione, nome dell'archivio, **tipologie dei test (menu a tendina, e ordine delle colonne)**, **formati del tempo** (`formatiTempo`), **menu** (`menu`: voci, icone, etichette corte), **capacità del grafico a ragnatela** (`capacita`), **fasce** delle tabelle del libro (`fasce`), **campi della scheda del test** (`schedaTest`), **♂/♀ dai nomi** (`sessoDaiNomi`: particelle dei cognomi, finali, eccezioni come Andrea e Luca), mesi (set–giu), prove, tipi di test, **simboli delle giustificazioni** (con `certificato: true` quelli che ammettono la spunta), **spunta del certificato medico** (`certificato`), limiti, parole d'intestazione, testi delle regole, passi del backup con Google Drive (`backupPassi`, `backupDispositivi`, `backupNota`) e nota privacy.
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
| `stato.js` | `App.Stato` | `dati`, `bozze`, `carica`, `salva` (aggiorna ultimaModifica), `scrivi` (preferenze), `sostituisci`, `classe`, `daSalvareInBackup` |
| `finestra.js` | `App.Finestra` | `apri({titolo, icona, corpo, pulsanti})` — finestre sovrapponibili, Esc chiude |
| `avvisi.js` | `App.Avvisi` | `toast`, `conferma` |
| `pwa.js` | `App.Pwa` | `avvia` (registra sw.js, dati persistenti), `puoInstallare`, `installa`, `cercaAggiornamenti` (controlla all'avvio e al ritorno in primo piano, ricarica da sola alla nuova versione) — pulsante 📲 Installa l'app nel piè di pagina |

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

## js/ui/ (interfaccia: una pagina, sottoscheda o finestra per file)
Menu (config.menu): 🏠 Home · 🏫 Classi · 📚 Test · ⏱️ Sessioni · 📋 Giustificazioni · 📄 Riepilogo · 💾 Backup.
Ogni pagina è `App.UI.Pagine[id].disegna(cont)`; la pagina aperta è `preferenze.pagina`.

| File | Modulo | Cosa disegna |
|---|---|---|
| `pagina.js` | `App.UI.disegna`, `disegnaContenuto`, `piede`, `vuoto`, `regole`, `titoloPagina`, `sceltaClasse`, `sottoSchede`, `senzaClassi` | Pagina intera (menu + pagina aperta + piè con stato del backup) e pezzi comuni |
| `menu.js` | `App.UI.Menu`, `App.UI.vai(pagina, sotto)` | Menu principale |
| `pagina-home.js` | `App.UI.Pagine.home` | 🏠 Saluto, tessere quadrate colorate (una per sezione, con i numeri dal vivo; Backup rossa se va fatto), schede delle classi, ultime giustificazioni |
| `pagina-classi.js` | `App.UI.Pagine.classi` | 🏫 Crea classe; per ogni classe: nome modificabile, ♂/♀, 📥 Carica alunni, 👥 Gestisci alunni, 🗑️, elenco degli alunni (tocco = correggi) |
| `pagina-test.js` | `App.UI.Pagine.test` | 📚 Sottoschede "Elenco dei test" e "📈 Statistiche" (classe scelta in alto) |
| `lista-test.js` | `App.UI.ListaTest` | Elenco unico: test del libro + miei, per tipologia, spunta "Lo uso", filtri Tutti / In uso / Libro / Miei, ➕ Nuovo test, 📥 Prendi i test della classe, ✏️ |
| `pagina-sessioni.js` | `App.UI.Pagine.sessioni` | ⏱️ Parte operativa: sottosezioni "✏️ Risultati" e "🎯 Voti" della classe scelta |
| `tabella-voti.js` | `App.UI.TabellaVoti` | 🎯 Voti: alunni × test con voto calcolato, media alunno, media classe per test; tabelle dei voti (♂/♀) dei test |
| `tabella-test.js` | `App.UI.TabellaTest` | Tabella alunni × test: Classe, 📚 Scegli i test, 1ª / 2ª / 3ª prova, Confronto, 📋 Copia test, voto e media voti |
| `finestra-elenco-test.js` | `App.UI.FinestraElencoTest` | 📚 Scegli i test (da Sessioni): solo quelli in uso, già presenti segnati, fascia dei voti, ➕ Nuovo test al volo |
| `finestra-test.js` | `App.UI.FinestraTest` | Nuovo test e ✏️ intestazione colonna: nome, tipologia (menu da config + Altro…), strumento (uno o ♂/♀), tipo, unità, migliore, 📖 scheda, ◀ ▶ sposta, 🗑️ |
| `finestra-voti.js` | `App.UI.FinestraVoti` | 📏 Tabella dei voti: una riga per voto, soglia ♂ e ♀, ➕ riga, controllo dell'ordine |
| `finestra-copia-test.js` | `App.UI.FinestraCopiaTest` | 📋 Copia test in un'altra classe |
| `statistiche.js` | `App.UI.Statistiche` | 📈 Statistiche (pagina Test): per test e prova, andamento, miglioramenti, media voti per test, 🏅 primi 3, 🕸️ profilo |
| `profilo-alunno.js` | `App.UI.ProfiloAlunno` | Grafico a ragnatela SVG per capacità (prova scelta + 1ª tratteggiata), voti test per test |
| `grafici.js` | `App.UI.Grafici` | `colonne`, `barre` (grafici HTML/CSS) |
| `pagina-giust.js` | `App.UI.Pagine.giust` | 📋 Sottoschede "Registro" e "📈 Statistiche" (classe scelta in alto) |
| `tabella-giust.js` | `App.UI.TabellaGiust` | Registro: ◀ anno ▶, alunni × mesi, Tot., legenda (nome alunno toccabile) |
| `finestra-giust.js` | `App.UI.FinestraGiust` | Tocco su una casella del mese: elenco, ✏️, 🗑️, nuova giustificazione con spunta 📄 certificato medico (non per l'attrezzatura; con bozza) |
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
  classi: [{ id, nome,
    alunni: [{ id, nome, sesso: 'M'|'F'|'' }],
    test: [{ id, nome, tipologia, note, strumento, perSesso, strumentoM, strumentoF, unita, tipo: 'numero'|'tempo', migliore: 'alto'|'basso',
            voti: { righe: [{ voto: 8, M: '440', F: '380' }] } }],
    risultati: { alunnoId: { testId: { '1': '145', '2': '152', '3': '160' } } },
    giust: { alunnoId: [{ id, data: 'AAAA-MM-GG', simbolo, certificato: true|false, nota }] } }] }
```
