# MAPPA — Registro Scienze Motorie v2.2

Indice dei file: cosa c'è dentro e quale parte dell'app ne dipende.
Tutti i moduli stanno nell'oggetto globale `App`. Ordine di caricamento in `index.html`:
config → core → servizi → dati → ui → avvio.

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
Nome, versione, nome dell'archivio, mesi (set–giu), prove, tipi di test, **simboli delle giustificazioni**, limiti, parole d'intestazione, testi delle regole, passi del backup con Google Drive (`backupPassi`, `backupDispositivi`, `backupNota`) e nota privacy.
→ Per cambiare simboli, mesi o testi delle regole si tocca solo qui.

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
| `classi.js` | `App.Classi` | `crea`, `rinomina`, `elimina`, `aggiungiAlunni`, `rinominaAlunno`, `eliminaAlunno`, `esisteAlunno`, `datiAlunno` |
| `test.js` | `App.Test` | `valida` (numeri e tempi), `crea`, `modifica`, `elimina`, `sposta`, `valore`, `imposta`, `confronto`, `quantiRisultati` |
| `giustificazioni.js` | `App.Giust` | `errore` (mese, doppioni, simbolo), `aggiungi`, `modifica`, `elimina`, `delMese`, `totaleAnno`, `contaClasse` |

## js/dati/
| File | Modulo | Funzioni principali |
|---|---|---|
| `zip.js` | `App.Zip` | `apri(buffer)` — legge .xlsx/.docx senza librerie (DecompressionStream) |
| `pdf-oggetti.js` | `App.PdfOggetti` | `apri(buffer)` — oggetti del PDF, object stream, flussi FlateDecode/ASCII85/ASCIIHex, pagine in ordine |
| `pdf-caratteri.js` | `App.PdfCaratteri` | `prepara(doc, font)` — ToUnicode, WinAnsi, /Differences, font Type0, larghezze |
| `pdf-testo.js` | `App.PdfTesto` | `estrai(buffer)` — testo per posizione → righe di celle `{t, x, x1}` (numeri e lettere in celle separate) |
| `leggi-file.js` | `App.LeggiFile` | `righe(file)` — Excel (primo foglio), Word (paragrafi, tabelle, a capo), PDF, csv/txt |
| `backup.js` | `App.Backup` | `esporta`, `leggi`, `riepilogo`, `localiPiuRecenti`, `applica` |

## js/ui/ (interfaccia: una scheda o finestra per file)
| File | Modulo | Cosa disegna |
|---|---|---|
| `pagina.js` | `App.UI.disegna`, `disegnaContenuto`, `piede`, `vuoto`, `regole` | Pagina intera, piè di pagina con stato del backup |
| `barra.js` | `App.UI.Barra` | Scelta classe, pulsanti 👥 Alunni, 🏫 Classi, 💾 Backup, schede 📊 Test / 📋 Giustificazioni |
| `tabella-test.js` | `App.UI.TabellaTest` | Scheda 📊 Test (nome alunno toccabile): ➕ Nuovo test, 1ª / 2ª prova / ⇄ Confronto, caselle dei risultati |
| `finestra-test.js` | `App.UI.FinestraTest` | ➕ Nuovo test e ✏️ intestazione colonna: nome, tipo, unità, migliore, ◀ ▶ sposta, 🗑️ |
| `tabella-giust.js` | `App.UI.TabellaGiust` | Scheda 📋 Giustificazioni (nome alunno toccabile): ◀ anno ▶, tabella mesi, Tot., legenda |
| `finestra-giust.js` | `App.UI.FinestraGiust` | Tocco su una casella del mese: elenco, ✏️, 🗑️, nuova giustificazione (con bozza) |
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
  preferenze: { classeAttiva, modulo: 'test'|'giust', prova: 1|2|'c', annoInizio: null|2026 },
  classi: [{ id, nome,
    alunni: [{ id, nome }],
    test: [{ id, nome, unita, tipo: 'numero'|'tempo', migliore: 'alto'|'basso' }],
    risultati: { alunnoId: { testId: { '1': '145', '2': '152' } } },
    giust: { alunnoId: [{ id, data: 'AAAA-MM-GG', simbolo, nota }] } }] }
```
