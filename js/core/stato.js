/* stato.js — core 1.0
 * Cosa fa: tiene i dati in memoria, li carica all'avvio e li salva a ogni modifica.
 *          Tiene anche le "bozze": ciò che è stato scritto ma non è ancora valido,
 *          così non si perde quando la pagina si ridisegna.
 * Dipende da: App.Archivio, App.Avvisi (solo per segnalare un errore di salvataggio)
 * Usato da: servizi, dati, ui, avvio
 */
(function (App) {
  'use strict';

  function nuovi() {
    return {
      schema: 1,
      classi: [],
      archivio: { test: [] },            // elenco dei test del docente (fuori dalle classi)
      preferenze: { classeAttiva: null, modulo: 'test', prova: 1, annoInizio: null, statTest: null },
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
    });
    var p = d.preferenze || {};
    n.preferenze.classeAttiva = p.classeAttiva || null;
    n.preferenze.modulo = p.modulo === 'giust' || p.modulo === 'stat' ? p.modulo : 'test';
    n.preferenze.statTest = p.statTest || null;
    n.preferenze.prova = p.prova === 2 || p.prova === 'c' ? p.prova : 1;
    n.preferenze.annoInizio = typeof p.annoInizio === 'number' ? p.annoInizio : null;
    n.ultimaModifica = d.ultimaModifica || null;
    n.ultimoBackup = d.ultimoBackup || null;
    n.archivio = { test: d.archivio && Array.isArray(d.archivio.test) ? d.archivio.test : [] };
    return n;
  }

  function errore() {
    if (App.Avvisi) App.Avvisi.toast('⚠️ Non riesco a salvare nel browser. Esporta subito un backup.', 'errore', 6000);
  }

  App.Stato = {
    dati: null,
    bozze: {},

    carica: function () {
      var self = this;
      return App.Archivio.apri()
        .then(function () { return App.Archivio.leggi(); })
        .then(function (letti) { self.dati = normalizza(letti); return self.dati; });
    },

    // Salva dopo una modifica dei dati (aggiorna la data dell'ultima modifica)
    salva: function () {
      this.dati.ultimaModifica = new Date().toISOString();
      return App.Archivio.scrivi(this.dati).catch(errore);
    },

    // Salva senza cambiare la data dell'ultima modifica (preferenze, backup)
    scrivi: function () {
      return App.Archivio.scrivi(this.dati).catch(errore);
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
