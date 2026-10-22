/* leggi-file.js
 * Cosa fa: legge un file scelto dall'utente (.xlsx, .docx, .pdf, .csv, .txt) e restituisce le righe
 *          di testo, ognuna come elenco di celle. Excel: primo foglio. Word: paragrafi e tabelle.
 *          PDF: testo ricomposto in righe e colonne (non le scansioni).
 * Dipende da: App.Zip, App.PdfTesto, App.Nomi (righeDaTesto)
 * Usato da: ui/finestra-importa.js
 */
(function (App) {
  'use strict';

  function errore(msg) { var e = new Error(msg); e.perUtente = true; return e; }

  function xml(testo) { return new DOMParser().parseFromString(testo, 'application/xml'); }
  function tutti(nodo, nome) { return Array.prototype.slice.call(nodo.getElementsByTagNameNS('*', nome)); }
  function figli(nodo, nome) {
    return Array.prototype.filter.call(nodo.childNodes, function (n) { return n.localName === nome; });
  }

  function estensione(nome) { var m = /\.([a-z0-9]+)$/i.exec(nome || ''); return m ? m[1].toLowerCase() : ''; }

  // ---------- Excel (.xlsx) ----------
  function colonna(rif) {
    var lettere = (/^[A-Z]+/.exec(rif || '') || [''])[0], n = 0;
    for (var i = 0; i < lettere.length; i++) n = n * 26 + (lettere.charCodeAt(i) - 64);
    return n - 1;
  }

  function testoNodo(n) { return tutti(n, 't').map(function (t) { return t.textContent; }).join(''); }

  function percorsoPrimoFoglio(zip) {
    return Promise.all([zip.testo('xl/workbook.xml'), zip.testo('xl/_rels/workbook.xml.rels')]).then(function (r) {
      var riserva = zip.nomi.filter(function (n) { return /^xl\/worksheets\/[^/]+\.xml$/i.test(n); }).sort()[0];
      if (!r[0] || !r[1]) return riserva;
      var foglio = tutti(xml(r[0]), 'sheet')[0];
      if (!foglio) return riserva;
      var rid = foglio.getAttribute('r:id') ||
        foglio.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
      var rel = tutti(xml(r[1]), 'Relationship').filter(function (x) { return x.getAttribute('Id') === rid; })[0];
      if (!rel) return riserva;
      var t = rel.getAttribute('Target');
      return t.charAt(0) === '/' ? t.slice(1) : 'xl/' + t.replace(/^\.\//, '');
    });
  }

  function righeExcel(zip) {
    return Promise.all([percorsoPrimoFoglio(zip), zip.testo('xl/sharedStrings.xml')]).then(function (r) {
      var condivisi = r[1] ? tutti(xml(r[1]), 'si').map(testoNodo) : [];
      if (!r[0]) throw errore('Nel file Excel non trovo nessun foglio.');
      return zip.testo(r[0]).then(function (foglio) {
        if (!foglio) throw errore('Nel file Excel non trovo il primo foglio.');
        return tutti(xml(foglio), 'row').map(function (riga) {
          var celle = [];
          tutti(riga, 'c').forEach(function (c, i) {
            var tipo = c.getAttribute('t'), v = figli(c, 'v')[0], val = '';
            if (tipo === 's') val = condivisi[Number(v && v.textContent)] || '';
            else if (tipo === 'inlineStr') val = testoNodo(c);
            else val = v ? v.textContent : '';
            var col = c.getAttribute('r') ? colonna(c.getAttribute('r')) : i;
            celle[col] = val;
          });
          // le celle vuote restano al loro posto: la posizione serve a riconoscere le colonne
          for (var k = 0; k < celle.length; k++) if (celle[k] === undefined) celle[k] = '';
          return celle;
        });
      });
    });
  }

  // ---------- Word (.docx) ----------
  // Testo di un paragrafo; gli "a capo" interni (w:br) dividono in più righe
  function righeParagrafo(p) {
    var testo = '';
    tutti(p, '*').forEach(function (n) {
      if (n.localName === 't') testo += n.textContent;
      else if (n.localName === 'tab') testo += ' ';
      else if (n.localName === 'br' || n.localName === 'cr') testo += '\n';
    });
    return testo.split('\n');
  }

  function righeWord(zip) {
    return zip.testo('word/document.xml').then(function (t) {
      if (!t) throw errore('Il file Word non contiene testo leggibile.');
      var corpo = tutti(xml(t), 'body')[0], righe = [];
      function visita(nodo) {
        Array.prototype.forEach.call(nodo.childNodes, function (n) {
          if (n.localName === 'p') righeParagrafo(n).forEach(function (r) { var riga = [r]; riga.paragrafo = true; righe.push(riga); });
          else if (n.localName === 'tbl') {
            tutti(n, 'tr').forEach(function (tr) {
              righe.push(figli(tr, 'tc').map(function (tc) {
                return figli(tc, 'p').map(function (p) { return righeParagrafo(p).join(' '); }).join(' ');
              }));
            });
          } else if (n.localName === 'sdt' || n.localName === 'sdtContent' || n.localName === 'customXml') visita(n);
        });
      }
      if (corpo) visita(corpo);
      return righe;
    });
  }

  // ---------- PDF ----------
  function righePdf(file) {
    if (!App.Zip.supportato()) {
      return Promise.reject(errore('Questo browser è troppo vecchio per leggere i PDF. Aggiornalo, oppure copia i nomi e usa "Incolla elenco".'));
    }
    return file.arrayBuffer().then(App.PdfTesto.estrai).then(function (r) {
      if (!r.length) {
        throw errore('Nel PDF non trovo testo da leggere: probabilmente è una scansione (un\'immagine). ' +
          'Serve il PDF originale esportato dal registro, oppure copia i nomi e usa "Incolla elenco".');
      }
      return r;
    }, function (e) {
      if (e && e.perUtente) throw e;
      if (e && e.cifrato) throw errore('Il PDF è protetto e non si può leggere. Aprilo e salvalo di nuovo come PDF ("Stampa" → "Salva come PDF"), poi riprova.');
      throw errore('Il file non sembra un PDF valido.');
    });
  }

  // ---------- Ingresso ----------
  function righe(file) {
    var ext = estensione(file.name);
    if (ext === 'csv' || ext === 'txt') {
      return file.text().then(function (t) { return App.Nomi.righeDaTesto(t.replace(/^﻿/, '')); });
    }
    if (ext === 'xls' || ext === 'doc' || ext === 'ods' || ext === 'odt' || ext === 'pages' || ext === 'numbers') {
      return Promise.reject(errore('Il formato .' + ext + ' non si può leggere. Salva il file come .xlsx (Excel) o .docx (Word), ' +
        'oppure copia i nomi e usa "Incolla elenco".'));
    }
    if (ext === 'pdf') return righePdf(file);
    if (ext !== 'xlsx' && ext !== 'docx') {
      return Promise.reject(errore('Scegli un file Excel (.xlsx), Word (.docx), PDF, .csv o .txt.'));
    }
    if (!App.Zip.supportato()) {
      return Promise.reject(errore('Questo browser è troppo vecchio per leggere i file Excel e Word. ' +
        'Aggiornalo, oppure copia i nomi e usa "Incolla elenco".'));
    }
    return file.arrayBuffer().then(function (buf) {
      var zip;
      try { zip = App.Zip.apri(buf); } catch (e) { throw errore('Il file sembra rovinato o non è un vero file .' + ext + '.'); }
      return ext === 'xlsx' ? righeExcel(zip) : righeWord(zip);
    });
  }

  App.LeggiFile = { righe: righe, estensione: estensione };
})(window.App = window.App || {});
