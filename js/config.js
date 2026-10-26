/* config.js — Registro Scienze Motorie
 * Cosa fa: impostazioni e REGOLE dell'app (nome, archivio, mesi, simboli, testi).
 *          È l'unica parte da cambiare per creare un'app "sorella".
 * Dipende da: nulla (è il primo file caricato).
 * Usato da: tutti i moduli.
 */
(function (App) {
  'use strict';

  App.Config = {
    nome: 'Registro Scienze Motorie',
    icona: '🏃',
    versione: '3.4',

    // Nome dell'archivio nel browser: DEVE essere diverso per ogni app.
    archivio: {
      db: 'registro-scienze-motorie',
      store: 'dati',
      chiave: 'stato',
      chiaveRiserva: 'registro-scienze-motorie__stato',
      soloRiserva: false          // true = usa solo localStorage (per le prove)
    },

    // Backup
    backup: {
      id: 'registro-scienze-motorie',   // riconosce i backup di questa app
      nomeFile: 'registro-sm_backup'
    },

    // Anno scolastico: da settembre a giugno
    meseInizio: 9,
    mesi: [
      { num: 9, nome: 'Settembre', breve: 'Set' },
      { num: 10, nome: 'Ottobre', breve: 'Ott' },
      { num: 11, nome: 'Novembre', breve: 'Nov' },
      { num: 12, nome: 'Dicembre', breve: 'Dic' },
      { num: 1, nome: 'Gennaio', breve: 'Gen' },
      { num: 2, nome: 'Febbraio', breve: 'Feb' },
      { num: 3, nome: 'Marzo', breve: 'Mar' },
      { num: 4, nome: 'Aprile', breve: 'Apr' },
      { num: 5, nome: 'Maggio', breve: 'Mag' },
      { num: 6, nome: 'Giugno', breve: 'Giu' }
    ],

    // Modulo Test
    prove: [
      { id: 1, nome: '1ª prova' },
      { id: 2, nome: '2ª prova' },
      { id: 3, nome: '3ª prova' }
    ],
    tipiTest: {
      numero: { nome: 'Numero (cm, m, ripetizioni, kg…)', esempio: 'es. 145 oppure 3,5', migliore: 'alto' },
      tempo: { nome: 'Tempo (minuti e secondi)', esempio: 'es. 3:45 oppure 12,8 (secondi)', migliore: 'basso' }
    },

    // Tipologie dei test (menu a tendina); con "Altro…" se ne scrive una a mano
    tipologie: ['Forza arti superiori', 'Forza arti inferiori', 'Core', 'Velocità', 'Resistenza',
      'Equilibrio', 'Coordinazione', 'Abilità miste'],

    // Voti automatici dei test (tabelle del libro di testo)
    voti: { min: 4, max: 10, passo: 0.5, sufficienza: 6, righeIniziali: [10, 9, 8, 7, 6, 5, 4] },
    sessi: { M: { icona: '♂', nome: 'Alunno' }, F: { icona: '♀', nome: 'Alunna' } },

    // Modulo Giustificazioni: legenda dei simboli
    simboli: [
      { id: 'salute', icona: '🤒', nome: 'Problemi di salute' },
      { id: 'infortunio', icona: '🩹', nome: 'Infortunio' },
      { id: 'ciclo', icona: '🌸', nome: 'Ciclo mestruale' },
      { id: 'certificato', icona: '📄', nome: 'Certificato medico' },
      { id: 'attrezzatura', icona: '👟', nome: 'Mancata attrezzatura' }
    ],

    limiti: {
      nomeClasse: 20,
      nomeAlunno: 60,
      nomeTest: 40,
      tipologia: 60,
      noteTest: 200,
      strumento: 60,
      unita: 12,
      nota: 120,
      valoreMax: 100000
    },

    // Prime parole che indicano una riga di intestazione nei file con i nomi
    paroleIntestazione: ['cognome', 'nome', 'nominativo', 'alunno', 'alunna', 'alunni', 'studente',
      'studentessa', 'studenti', 'elenco', 'classe', 'n.', 'n°', 'nr', 'nr.', 'num.', 'istituto', 'scuola',
      'liceo', 'registro', 'anno', 'a.s.', 'pagina', 'pag.', 'totale', 'docente', 'data', 'sezione', 'plesso',
      'il', 'la', 'firma', 'dirigente', 'coordinatore', 'timbro', 'stampato', 'generato', 'luogo', 'indirizzo'],

    // File accettati per caricare i nomi
    fileNomi: '.xlsx,.docx,.pdf,.csv,.txt',

    testi: {
      regoleTest: [
        'Ogni test ha fino a tre prove (per esempio inizio, metà e fine anno). Scegli la prova sopra la tabella; la 3ª è facoltativa.',
        'Numeri: si accettano solo cifre, con la virgola per i decimali (es. 3,5).',
        'Tempi: minuti e secondi con i due punti (es. 3:45) oppure solo secondi (es. 12,8).',
        'Una casella vuota resta vuota: non conta come zero.',
        'Voto automatico: con la tabella dei voti (📏, separata per alunni e alunne) sotto ogni risultato compare il voto. Serve indicare ♂/♀ di ogni alunno (👥 Alunni). Un risultato peggiore dell\'ultima riga della tabella prende il voto più basso.',
        'La colonna Media voti fa la media dei voti dei test della prova scelta (i test senza voto non contano).',
        'In "Confronto" vedi le prove in fila e la differenza dalla 1ª all\'ultima prova svolta; il verde indica un miglioramento, il rosso un peggioramento, secondo la regola del test (↑ meglio più alto, ↓ meglio più basso).',
        'Ogni valore si salva da solo mentre scrivi. Un valore non valido resta in rosso e non viene salvato.'
      ],
      regoleGiust: [
        'Tocca una casella per aggiungere, modificare o cancellare le giustificazioni di quel mese.',
        'La data deve appartenere al mese della colonna. Non si possono avere due giustificazioni nello stesso giorno.',
        'Il totale conta le giustificazioni dell\'anno scolastico mostrato.'
      ],
      // Passaggio dei dati tra dispositivi con una cartella di Google Drive
      backupPassi: [
        'Finito di lavorare: tocca "⬇️ Esporta backup" e salva il file nella cartella "Registro SM" del tuo Google Drive.',
        'Prima di lavorare su un altro dispositivo: tocca "⬆️ Importa backup", scegli Google Drive e apri il file più recente (il nome contiene data e ora).'
      ],
      backupDispositivi: [
        'iPhone / iPad: al salvataggio scegli "Salva su File" → Google Drive. Per importare: Sfoglia → Google Drive.',
        'Android: il file finisce in Download; aprilo dalla notifica → Condividi → Drive. Per importare: nel selettore tocca ☰ → Drive.',
        'Computer: con "Google Drive per desktop" salva direttamente nella cartella di Drive; altrimenti trascina il file su drive.google.com.'
      ],
      backupNota: 'I dati restano sul dispositivo e l\'app funziona anche senza connessione. Serve internet solo nel momento in cui il file passa da Google Drive. L\'importazione sostituisce tutti i dati: lavora su un dispositivo alla volta.',
      notaPrivacy: 'Per rispetto della privacy degli alunni usa il simbolo e, se serve, una nota generica: evita diagnosi o dettagli sanitari.'
    }
  };
})(window.App = window.App || {});
