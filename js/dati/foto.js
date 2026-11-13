/* foto.js
 * Cosa fa: foto delle ⛹️ attività (es. il campo dove si svolgono). Le foto si rimpiccioliscono
 *          (lato lungo max config.foto.lato, JPEG qualità config.foto.qualita) e si salvano in un
 *          archivio IndexedDB A PARTE ("registro-scienze-motorie-foto"), così i salvataggi del
 *          registro restano veloci. L'archivio principale non si tocca.
 *          Nel backup le foto delle attività viaggiano nel campo "foto" ({ id: dataURL }).
 * Dipende da: App.Config (foto)
 * Usato da: ui/finestra-attivita.js, ui/foto-attivita.js, dati/backup.js, ui/pagina-backup.js
 *
 * Dati: attivita.foto = [id, id, …]; le immagini sono nell'archivio delle foto con quell'id.
 */
(function (App) {
  'use strict';

  var db = null, apertura = null;
  function cfg() { return App.Config.foto; }

  function apri() {
    if (db) return Promise.resolve(db);
    if (apertura) return apertura;
    apertura = new Promise(function (ok, no) {
      try {
        var rq = indexedDB.open(cfg().db, 1);
        rq.onupgradeneeded = function () { rq.result.createObjectStore('foto'); };
        rq.onsuccess = function () { db = rq.result; ok(db); };
        rq.onerror = function () { apertura = null; no(rq.error); };
        rq.onblocked = function () { apertura = null; no(new Error('bloccato')); };
      } catch (e) { apertura = null; no(e); }
    });
    return apertura;
  }

  function op(modo, fai) {
    return apri().then(function (d) {
      return new Promise(function (ok, no) {
        var tx = d.transaction('foto', modo), st = tx.objectStore('foto'), r = fai(st);
        tx.oncomplete = function () { ok(r && r.result !== undefined ? r.result : undefined); };
        tx.onerror = function () { no(tx.error); };
      });
    });
  }

  // File immagine -> Promise<dataURL JPEG rimpicciolito>
  function riduci(file) {
    return new Promise(function (ok, no) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var s = Math.min(1, cfg().lato / Math.max(img.naturalWidth, img.naturalHeight));
        var c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        ok(c.toDataURL('image/jpeg', cfg().qualita));
      };
      img.onerror = function () { URL.revokeObjectURL(url); no(new Error('immagine')); };
      img.src = url;
    });
  }

  App.Foto = {
    riduci: riduci,
    salva: function (id, dataURL) { return op('readwrite', function (st) { st.put(dataURL, id); }); },
    leggi: function (id) { return op('readonly', function (st) { return st.get(id); }); },
    elimina: function (id) { return op('readwrite', function (st) { st.delete(id); }); },

    // Più foto -> Promise<{ id: dataURL }> (quelle che mancano non ci sono)
    leggiMolte: function (ids) {
      var out = {};
      return Promise.all(ids.map(function (id) {
        return App.Foto.leggi(id).then(function (u) { if (u) out[id] = u; }).catch(function () {});
      })).then(function () { return out; });
    },

    // Foto di un backup: aggiunge solo quelle che qui mancano. -> Promise<numero aggiunte>
    importa: function (mappa) {
      var ids = Object.keys(mappa || {}), n = 0;
      if (!ids.length) return Promise.resolve(0);
      return Promise.all(ids.map(function (id) {
        return App.Foto.leggi(id).then(function (u) {
          if (u || !/^data:image\//.test(mappa[id])) return;
          n++;
          return App.Foto.salva(id, mappa[id]);
        });
      })).then(function () { return n; }).catch(function () { return n; });
    },

    // Tutti gli id delle foto delle attività
    idDelleAttivita: function (dati) {
      var l = [];
      dati.classi.forEach(function (c) { (c.attivita || []).forEach(function (a) { l = l.concat(a.foto || []); }); });
      return l;
    }
  };
})(window.App = window.App || {});
