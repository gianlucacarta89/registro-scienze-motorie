/* backup.js
 * Cosa fa: esporta tutti i dati in un file .json e li reimporta, anche su un altro
 *          dispositivo (telefono, tablet, computer). L'importazione sostituisce i dati.
 * Dipende da: App.Stato, App.Config (backup, versione), App.U
 * Usato da: ui/finestra-backup.js
 */
(function (App) {
  'use strict';

  function cfg() { return App.Config; }

  function nomeFile() {
    var d = new Date(), p = App.U.pad2;
    return cfg().backup.nomeFile + '_' + App.U.isoData(d) + '_' + p(d.getHours()) + 'h' + p(d.getMinutes()) + '.json';
  }

  App.Backup = {
    // Scarica il file di backup e, se è stato salvato, ricorda la data dell'esportazione.
    // -> Promise<boolean> (false = l'utente ha rinunciato)
    esporta: function () {
      var adesso = new Date().toISOString();
      var d = App.Stato.dati;
      var copia = App.U.copia(d);
      copia.ultimoBackup = adesso;
      if (!copia.ultimaModifica) copia.ultimaModifica = adesso;
      var contenuto = { app: cfg().backup.id, versioneApp: cfg().versione, esportato: adesso, dati: copia };
      return App.U.scarica(nomeFile(), JSON.stringify(contenuto, null, 1), 'application/json').then(function (salvato) {
        if (!salvato) return false;
        d.ultimoBackup = adesso;
        if (!d.ultimaModifica) d.ultimaModifica = adesso;
        return App.Stato.scrivi().then(function () { return true; });
      });
    },

    // Legge un file di backup. -> Promise<{ backup } | { errore }>
    leggi: function (file) {
      return file.text().then(function (t) {
        var b;
        try { b = JSON.parse(t.replace(/^﻿/, '')); } catch (e) {
          return { errore: 'Il file non è un backup valido (non riesco a leggerlo).' };
        }
        if (!b || b.app !== cfg().backup.id || !b.dati || !Array.isArray(b.dati.classi)) {
          return { errore: 'Questo file non è un backup del ' + cfg().nome + '.' };
        }
        return { backup: b };
      }).catch(function () { return { errore: 'Non riesco ad aprire il file.' }; });
    },

    riepilogo: function (dati) {
      var r = { classi: 0, alunni: 0, test: 0, giust: 0 };
      (dati.classi || []).forEach(function (c) {
        r.classi++;
        r.alunni += (c.alunni || []).length;
        r.test += (c.test || []).length;
        Object.keys(c.giust || {}).forEach(function (k) { r.giust += (c.giust[k] || []).length; });
      });
      return r;
    },

    // true se i dati di questo dispositivo sono stati modificati dopo quelli del backup
    localiPiuRecenti: function (b) {
      var loc = App.Stato.dati.ultimaModifica, bk = b.dati.ultimaModifica || b.esportato;
      return !!loc && loc > bk && App.Stato.dati.classi.length > 0;
    },

    // Sostituisce tutti i dati con quelli del backup
    applica: function (b) {
      var prefPrima = App.Stato.dati.preferenze;
      App.Stato.sostituisci(b.dati);
      var d = App.Stato.dati;
      d.ultimoBackup = b.esportato;
      d.ultimaModifica = b.dati.ultimaModifica || b.esportato;
      if (!App.Classi.trova(d.preferenze.classeAttiva)) d.preferenze.classeAttiva = prefPrima.classeAttiva;
      return App.Stato.scrivi();
    }
  };
})(window.App = window.App || {});
