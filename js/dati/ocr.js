/* ocr.js
 * Cosa fa: legge il testo dalle foto (OCR) direttamente sul dispositivo, con Tesseract.js.
 *          Le foto NON vengono inviate a nessuno: da internet si scaricano solo il programma e
 *          l'italiano (la prima volta, circa 10–15 MB; poi il browser li tiene in memoria).
 *          Restituisce righe di celle come App.LeggiFile: le parole lontane tra loro sulla stessa
 *          riga diventano celle diverse (le colonne delle tabelle).
 * Dipende da: App.Config (importaTest.ocr)
 * Usato da: ui/finestra-importa-test.js
 *
 * App.Ocr.righe(files, avanzamento(testo)) -> Promise<{ righe, fiducia (0-100) }>
 */
(function (App) {
  'use strict';

  var caricamento = null;

  function errore(msg) { var e = new Error(msg); e.perUtente = true; return e; }

  function carica() {
    if (window.Tesseract) return Promise.resolve(window.Tesseract);
    if (caricamento) return caricamento;
    caricamento = new Promise(function (ok, no) {
      var s = document.createElement('script');
      s.src = App.Config.importaTest.ocr.script;
      s.async = true;
      s.onload = function () { if (window.Tesseract) ok(window.Tesseract); else no(errore('Il lettore delle foto non si è avviato.')); };
      s.onerror = function () {
        caricamento = null; s.remove();
        no(errore('Per leggere le foto serve internet (la prima volta si scarica il lettore). Collegati e riprova, oppure usa un file o incolla il testo.'));
      };
      document.head.appendChild(s);
    });
    return caricamento;
  }

  // Foto -> tela in bianco e nero, abbastanza grande per leggere i numeri piccoli delle tabelle
  function prepara(file) {
    return new Promise(function (ok, no) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var lato = App.Config.importaTest.ocr.lato, w = img.naturalWidth, h = img.naturalHeight;
        var k = Math.min(lato / Math.max(w, h), 2);
        if (Math.max(w, h) * k < 1600) k = 1600 / Math.max(w, h);
        var c = document.createElement('canvas');
        c.width = Math.round(w * k); c.height = Math.round(h * k);
        var x = c.getContext('2d');
        x.drawImage(img, 0, 0, c.width, c.height);
        try {
          var d = x.getImageData(0, 0, c.width, c.height), p = d.data, min = 255, max = 0, i, g;
          for (i = 0; i < p.length; i += 4) { g = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2]; p[i] = g; if (g < min) min = g; if (g > max) max = g; }
          var sc = max > min ? 255 / (max - min) : 1;
          for (i = 0; i < p.length; i += 4) { g = (p[i] - min) * sc; p[i] = p[i + 1] = p[i + 2] = g; }
          x.putImageData(d, 0, 0);
        } catch (e) { /* tela non leggibile: si usa la foto com'è */ }
        URL.revokeObjectURL(url);
        ok(c);
      };
      img.onerror = function () { URL.revokeObjectURL(url); no(errore('Non riesco ad aprire la foto "' + file.name + '". Usa una foto JPG o PNG.')); };
      img.src = url;
    });
  }

  // Parole di una riga -> celle: si va a capo di cella quando lo spazio è largo
  function righeDa(data) {
    var righe = [];
    (data.lines || []).forEach(function (l) {
      var parole = (l.words || []).filter(function (w) { return w.text && w.text.trim(); });
      if (!parole.length) return;
      parole.sort(function (a, b) { return a.bbox.x0 - b.bbox.x0; });
      var alt = Math.max(8, l.bbox.y1 - l.bbox.y0), celle = [], cella = null, fine = 0;
      parole.forEach(function (w) {
        if (!cella || w.bbox.x0 - fine > alt * 0.9) { cella = w.text; celle.push(cella); }
        else celle[celle.length - 1] += ' ' + w.text;
        fine = w.bbox.x1;
      });
      righe.push(celle);
    });
    if (!righe.length && data.text) {
      data.text.split('\n').forEach(function (r) { if (r.trim()) righe.push(r.split(/\s{3,}/)); });
    }
    return righe;
  }

  function righe(files, avanzamento) {
    avanzamento = avanzamento || function () {};
    var cfg = App.Config.importaTest.ocr, worker = null, tutte = [], fiducie = [], n = files.length, attuale = 0;
    avanzamento('⏳ Preparo il lettore delle foto…');
    return carica().then(function (T) {
      return T.createWorker(cfg.lingua, 1, {
        logger: function (m) {
          if (m.status === 'recognizing text') avanzamento('🔎 Leggo la foto ' + (attuale + 1) + ' di ' + n + '… ' + Math.round((m.progress || 0) * 100) + '%');
          else if (/load|download/i.test(m.status || '')) avanzamento('⏳ Scarico il lettore (solo la prima volta)… ' + Math.round((m.progress || 0) * 100) + '%');
        }
      });
    }).then(function (w) {
      worker = w;
      return worker.setParameters({ tessedit_pageseg_mode: '6', preserve_interword_spaces: '1' });
    }).then(function () {
      return Array.prototype.reduce.call(files, function (p, f, i) {
        return p.then(function () {
          attuale = i;
          return prepara(f).then(function (tela) { return worker.recognize(tela); }).then(function (r) {
            tutte = tutte.concat(righeDa(r.data || {}));
            if (r.data && typeof r.data.confidence === 'number') fiducie.push(r.data.confidence);
          });
        });
      }, Promise.resolve());
    }).then(function () {
      return worker.terminate().then(function () {
        return { righe: tutte, fiducia: fiducie.length ? Math.round(fiducie.reduce(function (a, b) { return a + b; }, 0) / fiducie.length) : null };
      });
    }, function (e) {
      if (worker) worker.terminate();
      if (e && e.perUtente) throw e;
      throw errore('Non sono riuscito a leggere le foto' + (navigator.onLine === false ? ': manca internet (serve la prima volta).' : '. Riprova con una foto più nitida e dritta.'));
    });
  }

  App.Ocr = { righe: righe, carica: carica };
})(window.App = window.App || {});
