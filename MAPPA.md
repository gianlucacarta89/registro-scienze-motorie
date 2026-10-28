# MAPPA — Registro Scienze Motorie v4.0

Indice dei file: cosa c'è dentro e quale parte dell'app ne dipende.
Tutti i moduli stanno nell'oggetto globale `App`. Ordine di caricamento in `index.html`:
config → core → servizi → stampa → dati → ui → avvio (jsPDF in `lib/` si carica solo quando serve).

## Radice
| File | Scopo |
|---|---|
| `index.html` | Scheletro della pagina (testata, schede, contenuto, piè) ed elenco ordinato degli script |
| `LEGGIMI.txt` | Istruzioni per chi usa l'app |
| `MAPPA.md` | Questo indice |
| `NOVITA.md` | Cronologia delle versioni |
| `manifest.webmanifest` | Nome, icone e colori dell'app installata (PWA) |
| `sw.js` | Service worker: salva i file per l'uso offline. **Aggiornare `VERSIONE` a ogni consegna e l'elenco `FILE` se si aggiungono o tolgono file** |
| `icone/` | Icone dell'app (192, 512, maskable 512, apple-touch 180) |
| `.nojekyll` | Dice a GitHub Pages di pubblicare i file così come sono |

La versione online (pagina privata su claude.ai) usa gli stessi file `css/` e `js/`: cambia solo la pagina iniziale, senza `<html>` e `<head>`.

## css/
| File | Scopo |
|---|---|
| `base.css` | Colori (variabili per funzione: ok, pericolo, info) chiari e scuri, caratteri, testata, schede, piè |
| `componenti.css` | Pulsanti, tabelle, caselle, chip, finestre, moduli, avvisi |
| `telefono.css` | Adattamenti sotto 760 px e 480 px |

## js/config.js — `App.Config`
Nome, versione, nome dell'archivio, **tipologie dei test (menu a tendina, e ordine delle colonne)**, **formati del tempo** (`formatiTempo`), mesi (set–giu), prove, tipi di test, **simboli delle giustificazioni** (con `certificato: true` quelli che ammettono la spunta), **spunta del certificato medico** (`certificato`), limiti, parole d'intestazione, testi delle regole, passi del backup con Google Drive (`backupPassi`, `backupDispositivi`, `backupNota`) e nota privacy.
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
| `pwa.js` | `App.Pwa` | `avvia` (registra sw.js, dati persistenti), `puoInstallare`, `installa` — pulsante 📲 Installa l'app nel piè di pagina |

## js/servizi/ (logica, senza interfaccia)
| File | Modulo | Funzioni principali |
|---|---|---|
| `calendario.js` | `App.Calendario` | `annoCorrente`, `annoAttivo`, `etichetta`, `mesi`, `limiti`, `meseDi` |
| `nomi.js` | `App.Nomi` | `daRighe`: se trova l'intestazione (Cognome / Nome / Cognome e nome / Alunno / Nominativo) prende **solo quelle colonne e solo le righe sotto**; senza intestazione un nome per riga. `colonneNomi`, `colonnaDi` (colonna per sovrapposizione), `pezzi` (toglie cifre e lettere singole), `pulisci` (numeri d'ordine, MAIUSCOLE), `righeDaTesto`, `unici` |
| `classi.js` | `App.Classi` | `impostaSesso`, `senzaSesso`, `crea`, `rinomina`, `elimina`, `aggiungiAlunni`, `rinominaAlunno`, `eliminaAlunno`, `esisteAlunno`, `datiAlunno` |
| `test.js` | `App.Test` | `formato` (tempo: 'sec' velocità / 'min' resistenza / 'auto'), `formatta`, `riscrivi`, `riscriviTutti` (tempi nel formato del test), `gruppo`, `ordina` (colonne in ordine di tipologia come in config.js), `ordinaTutti` (avvio e backup), `sposta` (solo nella stessa tipologia), `copia` (test in un'altra classe), `valida` (numeri e tempi), `etichetteStrumento` (uno per tutti o ♂/♀), `crea`, `modifica`, `elimina`, `sposta`, `valore`, `imposta`, `confronto` (1ª → ultima prova svolta), `quantiRisultati` |
| `voti.js` | `App.Voti` | `scala` (4–10 con i mezzi voti), `controlla` (tabella in ordine), `calcola` (voto da risultato e ♂/♀), `votoAlunno`, `media`, `haTabella`, `sufficiente` |
| `statistiche.js` | `App.Statistiche` | `test` (svolti, media, migliore, peggiore, ♂/♀, quanti per voto), `miglioramenti`, `mediaVotiPerTest`, `testoValore` |
| `elenco-test.js` | `App.ElencoTest` | `contenitore` (l'elenco con la forma di una classe), `tutti`, `registra` (test nuovo di classe → elenco, collegato con `origine`), `aggiorna` (copia collegata allineata), `stacca` (modifica fatta nell'elenco), `aggiungiAClasse`, `prendiDaClasse` |
| `statistiche-giust.js` | `App.StatGiust` | `perAlunno` (totale, per tipologia e con certificato, mese o anno), `perMese`, `totali` (anche ♂/♀) |
| `giustificazioni.js` | `App.Giust` | `errore` (mese, doppioni, simbolo), `ammetteCertificato`, `conCertificato`, `aggiungi`, `modifica`, `elimina`, `delMese`, `totaleAnno`, `contaClasse` |

## js/dati/
| File | Modulo | Funzioni principali |
|---|---|---|
| `zip.js` | `App.Zip` | `apri(buffer)` — legge .xlsx/.docx senza librerie (DecompressionStream) |
| `pdf-oggetti.js` | `App.PdfOggetti` | `apri(buffer)` — oggetti del PDF, object stream, flussi FlateDecode/ASCII85/ASCIIHex, pagine in ordine |
| `pdf-caratteri.js` | `App.PdfCaratteri` | `prepara(doc, font)` — ToUnicode, WinAnsi, /Differences, font Type0, larghezze |
| `pdf-testo.js` | `App.PdfTesto` | `estrai(buffer)` — testo per posizione → righe di celle `{t, x, x1}` (numeri e lettere in celle separate) |
| `leggi-file.js` | `App.LeggiFile` | `righe(file)` — Excel (primo foglio), Word (paragrafi, tabelle, a capo), PDF, csv/txt |
| `zip-scrivi.js` | `App.ZipScrivi` | `crea` (ZIP senza compressione: più schede PDF in un file), `crc32` |
| `backup.js` | `App.Backup` | `esporta`, `leggi`, `riepilogo`, `localiPiuRecenti`, `applica` |

## js/ui/ (interfaccia: una scheda o finestra per file)
| File | Modulo | Cosa disegna |
|---|---|---|
| `pagina.js` | `App.UI.disegna`, `disegnaContenuto`, `piede`, `vuoto`, `regole` | Pagina intera, piè di pagina con stato del backup |
| `barra.js` | `App.UI.Barra` | Scelta classe, pulsanti 👥 Alunni, 🏫 Classi, 📚 Test, 📄 PDF, 💾 Backup; schede 📊 Test / 📈 Statistiche test / 📋 Giustificazioni / 📈 Statistiche giustificazioni |
| `tabella-test.js` | `App.UI.TabellaTest` | Scheda 📊 Test (nome alunno toccabile): ➕ Nuovo test, 1ª / 2ª prova / ⇄ Confronto, caselle dei risultati |
| `finestra-voti.js` | `App.UI.FinestraVoti` | 📏 Tabella dei voti: una riga per voto, soglia ♂ e ♀, ➕ riga, 🗑️ Svuota |
| `finestra-copia-test.js` | `App.UI.FinestraCopiaTest` | 📋 Copia test in un'altra classe |
| `finestra-elenco-test.js` | `App.UI.FinestraElencoTest` | 📚 Test (in alto) e 📚 Dall'elenco: elenco dei test, ➕ Nuovo test nell'elenco, ✏️, 📥 Prendi i test della classe, ➕ Aggiungi alla classe |
| `finestra-pdf.js` | `App.UI.FinestraPdf` | 📄 PDF (in alto): classi, alunni, contenuto, periodo, tipo (classe / schede), docente → PDF o ZIP |
| `grafici.js` | `App.UI.Grafici` | `colonne`, `barre` (grafici HTML/CSS) |
| `statistiche.js` | `App.UI.Statistiche` | Scheda 📈 Statistiche test (prove 1ª/2ª/3ª, andamento nelle prove, miglioramenti 1ª → ultima) |
| `statistiche-giust.js` | `App.UI.StatisticheGiust` | Scheda 📈 Statistiche giustificazioni: anno, mese o tutto l'anno, A–Z / Più giustificati, per tipologia, per mese, tabella per alunno |
| `finestra-test.js` | `App.UI.FinestraTest` | ➕ Nuovo test e ✏️ intestazione colonna: nome, tipologia (menu da config + Altro…), strumento (uno o ♂/♀), tipo, unità, migliore, ◀ ▶ sposta, 🗑️ |
| `tabella-giust.js` | `App.UI.TabellaGiust` | Scheda 📋 Giustificazioni (nome alunno toccabile): ◀ anno ▶, tabella mesi, Tot., legenda |
| `finestra-giust.js` | `App.UI.FinestraGiust` | Tocco su una casella del mese: elenco, ✏️, 🗑️, nuova giustificazione con spunta 📄 certificato medico (non per l'attrezzatura; con bozza) |
| `finestra-classi.js` | `App.UI.FinestraClassi` | 🏫 Classi: crea, rinomina, Apri, 🗑️ |
| `finestra-alunno.js` | `App.UI.FinestraAlunno` | Tocco sul nome nelle tabelle: correggi il nome, 🗑️ Togli (`togli` usato anche da finestra-alunni) |
| `finestra-alunni.js` | `App.UI.FinestraAlunni` | 👥 Alunni: aggiungi, correggi nome, 🗑️, ☑️ Seleziona tutti / 🗑️ Togli selezionati, 📥 Carica da file o incolla |
| `finestra-importa.js` | `App.UI.FinestraImporta` | 📥 Carica alunni: 📂 file (anche PDF), 📋 incolla, anteprima con spunte e nomi correggibili |
| `finestra-backup.js` | `App.UI.FinestraBackup` | 💾 Backup: ⬇️ Esporta, ⬆️ Importa (con conferma) |

## js/avvio.js
`App.avvia` — imposta titolo e icona, carica i dati (`App.Stato.carica`), poi `App.UI.disegna` e `App.Pwa.avvia`. È l'unico file che fa partire qualcosa.

## Struttura dei dati (`App.Stato.dati`)
```
{ schema: 1, ultimaModifica, ultimoBackup,
  archivio: { test: [ come classe.test + origine: { c, t } ] },   // 📚 elenco dei test, fuori dalle classi
  preferenze: { classeAttiva, docente, modulo: 'test'|'stat'|'giust'|'statg', prova: 1|2|3|'c', statgMese, statgOrdine, annoInizio: null|2026, statTest },
  classi: [{ id, nome,
    alunni: [{ id, nome, sesso: 'M'|'F'|'' }],
    test: [{ id, nome, tipologia, note, strumento, perSesso, strumentoM, strumentoF, unita, tipo: 'numero'|'tempo', migliore: 'alto'|'basso',
            voti: { righe: [{ voto: 8, M: '440', F: '380' }] } }],
    risultati: { alunnoId: { testId: { '1': '145', '2': '152', '3': '160' } } },
    giust: { alunnoId: [{ id, data: 'AAAA-MM-GG', simbolo, certificato: true|false, nota }] } }] }
```
