/* stato.js — core 1.0
 * Cosa fa: tiene i dati in memoria, li carica all'avvio e li salva a ogni modifica.
 *          Tiene anche le "bozze": ciò che è stato scritto ma non è ancora valido,
 *          così non si perde quando la pagina si ridisegna.
 *          App aperta in due finestre (v6.9): prima di ogni salvataggio rilegge l'archivio; se un'altra
 *          finestra ha salvato dopo (ultimaModifica diversa da quella che questa finestra conosce) NON
 *          sovrascrive: carica i dati più recenti, ridisegna e avvisa. Lo stesso controllo si fa quando
 *          l'app torna in primo piano (avvio.js) e quando un'altra finestra avvisa (BroadcastChannel).
 * Dipende da: App.Archivio, App.Avvisi (avvisi), App.UI.disegna (dopo aver caricato dati più recenti)
 * Usato da: servizi, dati, ui, avvio
 */
(function (App) {
  'use strict';

  function nuovi() {
    return {
      schema: 1,
      classi: [],
      archivio: { test: [] },            // elenco dei test del docente (fuori dalle classi)
      preferenze: { classeAttiva: null, pagina: 'home', sottoTest: 'elenco', sottoGiust: 'registro', sottoSessioni: 'risultati', filtroTest: 'tutti', fasciaLibro: null, prova: 1, annoInizio: null, statTest: null, statgMese: '', statgOrdine: 'nome', docente: null, statAlunno: null },
      ultimaModifica: null,
      ultimoBackup: null
    };
  }

  // Completa i dati letti (o importati) con i campi mancanti
  function normalizza(d) {
    var n = nuovi();
    if (!d || typeof d !== 'object') return n;
    n.classi = Array.isArray(d.classi) ? d.classi : [];
    n.classi.forEach(function (c) {
      c.alunni = Array.isArray(c.alunni) ? c.alunni : [];
      c.test = Array.isArray(c.test) ? c.test : [];
      c.risultati = c.risultati && typeof c.risultati === 'object' ? c.risultati : {};
      c.giust = c.giust && typeof c.giust === 'object' ? c.giust : {};
      c.attivita = Array.isArray(c.attivita) ? c.attivita : [];
      c.osservazioni = c.osservazioni && typeof c.osservazioni === 'object' ? c.osservazioni : {};   // 🗒️ v7.13          // ⛹️ v7.8
      // Fino alla v4.0 "Certificato medico" era un motivo: ora è una spunta (motivo: infortunio)
      Object.keys(c.giust).forEach(function (k) {
        (c.giust[k] || []).forEach(function (g) {
          if (g.simbolo === 'certificato') { g.simbolo = 'infortunio'; g.certificato = true; }
        });
      });
    });
    var p = d.preferenze || {};
    n.preferenze.classeAttiva = p.classeAttiva || null;
    // Dalla v5.0 il menu ha pagine (config.menu); le vecchie schede ("modulo") non servono più
    n.preferenze.pagina = App.Config.menu.some(function (m) { return m.id === p.pagina; }) ? p.pagina : 'home';
    n.preferenze.sottoTest = p.sottoTest === 'stat' ? 'stat' : 'elenco';
    n.preferenze.sottoGiust = p.sottoGiust === 'stat' ? 'stat' : 'registro';
    n.preferenze.sottoSessioni = p.sottoSessioni === 'voti' ? 'voti' : 'risultati';
    n.preferenze.fasciaLibro = ['b1', 'b2', 'q'].indexOf(p.fasciaLibro) >= 0 ? p.fasciaLibro : null;
    n.preferenze.filtroTest = ['uso', 'libro', 'miei'].indexOf(p.filtroTest) >= 0 ? p.filtroTest : 'tutti';
    n.preferenze.statgMese = p.statgMese || '';
    n.preferenze.docente = typeof p.docente === 'string' ? p.docente : null;
    n.preferenze.statgOrdine = p.statgOrdine === 'tot' ? 'tot' : 'nome';
    n.preferenze.statTest = p.statTest || null;
    n.preferenze.statAlunno = p.statAlunno || null;
    n.preferenze.prova = p.prova === 2 || p.prova === 3 || p.prova === 'c' ? p.prova : 1;
    n.preferenze.annoInizio = typeof p.annoInizio === 'number' ? p.annoInizio : null;
    n.ultimaModifica = d.ultimaModifica || null;
    n.ultimoBackup = d.ultimoBackup || null;
    n.archivio = { test: d.archivio && Array.isArray(d.archivio.test) ? d.archivio.test : [] };
    if (App.MigraSprint) App.MigraSprint.applica(n);       // v7.5: "Sprint" al posto di Sprint 30 metri e Velocità 60/80
    return n;
  }

  function errore() {
    if (App.Avvisi) App.Avvisi.toast('⚠️ Non riesco a salvare nel browser. Esporta subito un backup.', 'errore', 6000);
  }

  var base = null;          // ultimaModifica dei dati come li ha letti o scritti questa finestra
  var coda = Promise.resolve();
  var canale = null;
  try { canale = new BroadcastChannel('registro-sm'); } catch (e) { canale = null; }

  // Se nell'archivio ci sono dati salvati da un'altra finestra li carica. -> Promise<true se caricati>
  function controllaAltri() {
    return App.Archivio.leggi().then(function (letti) {
      if (!letti || (letti.ultimaModifica || null) === base) return false;
      App.Stato.dati = normalizza(letti);
      App.Stato.bozze = {};
      base = App.Stato.dati.ultimaModifica || null;
      if (App.UI && App.UI.disegna) App.UI.disegna();
      return true;
    }).catch(function () { return false; });
  }

  // Scrive solo se nessun'altra finestra ha salvato nel frattempo (le scritture vanno in fila)
  function scriviSicuro(dati) {
    coda = coda.then(function () {
      return controllaAltri().then(function (altri) {
        if (altri) {
          if (App.Avvisi) App.Avvisi.toast('⚠️ L\'app era aperta anche in un\'altra finestra: ho caricato i dati più recenti. Controlla e rifai l\'ultima modifica.', 'errore', 9000);
          return;
        }
        return App.Archivio.scrivi(dati).then(function () {
          base = dati.ultimaModifica || null;
          if (canale) canale.postMessage({ ultimaModifica: base });
        }).catch(errore);
      });
    });
    return coda;
  }

  if (canale) canale.onmessage = function () {
    if (App.Stato.dati) controllaAltri().then(function (si) {
      if (si && App.Avvisi) App.Avvisi.toast('🔄 Dati aggiornati da un\'altra finestra dell\'app.', 'info', 5000);
    });
  };

  App.Stato = {
    dati: null,
    bozze: {},

    carica: function () {
      var self = this;
      return App.Archivio.apri()
        .then(function () { return App.Archivio.leggi(); })
        .then(function (letti) { self.dati = normalizza(letti); base = self.dati.ultimaModifica || null; return self.dati; });
    },

    // Salva dopo una modifica dei dati (aggiorna la data dell'ultima modifica)
    salva: function () {
      this.dati.ultimaModifica = new Date().toISOString();
      return scriviSicuro(this.dati);
    },

    // Salva senza cambiare la data dell'ultima modifica (preferenze, backup)
    scrivi: function () {
      return scriviSicuro(this.dati);
    },

    // Quando l'app torna in primo piano: dati più recenti scritti da un'altra finestra?
    controllaAltri: function () {
      return coda.then(controllaAltri).then(function (si) {
        if (si && App.Avvisi) App.Avvisi.toast('🔄 Dati aggiornati da un\'altra finestra dell\'app.', 'info', 5000);
        return si;
      });
    },

    sostituisci: function (d) {
      this.dati = normalizza(d);
      this.bozze = {};
    },

    normalizza: normalizza,

    // Classe attiva (se quella salvata non esiste più, prende la prima)
    classe: function () {
      var d = this.dati, id = d.preferenze.classeAttiva;
      var c = d.classi.filter(function (x) { return x.id === id; })[0];
      if (!c && d.classi.length) { c = d.classi[0]; d.preferenze.classeAttiva = c.id; }
      return c || null;
    },

    // true se ci sono modifiche successive all'ultimo backup esportato
    daSalvareInBackup: function () {
      var d = this.dati;
      if (!d.ultimaModifica) return false;
      return !d.ultimoBackup || d.ultimaModifica > d.ultimoBackup;
    }
  };
})(window.App = window.App || {});
