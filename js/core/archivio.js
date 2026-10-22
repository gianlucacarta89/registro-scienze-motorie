/* archivio.js — core 1.0
 * Cosa fa: salva e legge i dati nel browser. Usa IndexedDB; se non è disponibile
 *          (o dà errore) passa da solo alla riserva localStorage.
 * Dipende da: App.Config.archivio
 * Usato da: App.Stato
 */
(function (App) {
  'use strict';

  var db = null;
  var tipo = 'nessuno';     // 'indexeddb' | 'localstorage' | 'nessuno'

  function cfg() { return App.Config.archivio; }

  function riservaOk() {
    try {
      var k = cfg().chiaveRiserva + '__prova';
      localStorage.setItem(k, '1');
      localStorage.removeItem(k);
      return true;
    } catch (e) { return false; }
  }

  function usaRiserva() { db = null; tipo = riservaOk() ? 'localstorage' : 'nessuno'; return tipo; }

  function apri() {
    return new Promise(function (risolvi) {
      var finito = false;
      function fine(t) { if (!finito) { finito = true; risolvi(t); } }
      try {
        if (!window.indexedDB || cfg().soloRiserva) return fine(usaRiserva());
        var rq = indexedDB.open(cfg().db, 1);
        rq.onupgradeneeded = function () { rq.result.createObjectStore(cfg().store); };
        rq.onsuccess = function () {
          if (finito) return;
          db = rq.result; tipo = 'indexeddb'; fine(tipo);
        };
        rq.onerror = function () { fine(usaRiserva()); };
        rq.onblocked = function () { fine(usaRiserva()); };
        setTimeout(function () { if (!finito) fine(usaRiserva()); }, 4000);
      } catch (e) { fine(usaRiserva()); }
    });
  }

  function leggiIDB() {
    return new Promise(function (risolvi) {
      if (!db) return risolvi(null);
      try {
        var rq = db.transaction(cfg().store, 'readonly').objectStore(cfg().store).get(cfg().chiave);
        rq.onsuccess = function () { risolvi(rq.result || null); };
        rq.onerror = function () { risolvi(null); };
      } catch (e) { risolvi(null); }
    });
  }

  function leggiRiserva() {
    try { return localStorage.getItem(cfg().chiaveRiserva); } catch (e) { return null; }
  }

  function analizza(testo) {
    if (!testo) return null;
    try { return JSON.parse(testo); } catch (e) { return null; }
  }

  // Legge i dati: se esistono sia in IndexedDB sia nella riserva, prende i più recenti.
  function leggi() {
    return leggiIDB().then(function (t) {
      var a = analizza(t), b = analizza(leggiRiserva());
      if (a && b) return (b.ultimaModifica || '') > (a.ultimaModifica || '') ? b : a;
      return a || b;
    });
  }

  function scriviRiserva(testo) {
    try { localStorage.setItem(cfg().chiaveRiserva, testo); return true; } catch (e) { return false; }
  }

  // Scrive i dati. Restituisce una promessa che si risolve con il tipo di archivio usato.
  function scrivi(dati) {
    var testo = JSON.stringify(dati);
    if (tipo !== 'indexeddb' || !db) {
      if (scriviRiserva(testo)) return Promise.resolve(tipo);
      return Promise.reject(new Error('salvataggio'));
    }
    return new Promise(function (risolvi, rifiuta) {
      try {
        var tx = db.transaction(cfg().store, 'readwrite');
        tx.objectStore(cfg().store).put(testo, cfg().chiave);
        tx.oncomplete = function () { risolvi(tipo); };
        tx.onerror = tx.onabort = function () {
          usaRiserva();
          if (scriviRiserva(testo)) risolvi(tipo); else rifiuta(new Error('salvataggio'));
        };
      } catch (e) {
        usaRiserva();
        if (scriviRiserva(testo)) risolvi(tipo); else rifiuta(e);
      }
    });
  }

  App.Archivio = {
    apri: apri,
    leggi: leggi,
    scrivi: scrivi,
    tipo: function () { return tipo; }
  };
})(window.App = window.App || {});
