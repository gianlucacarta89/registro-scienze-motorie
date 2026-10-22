/* pdf-oggetti.js
 * Cosa fa: apre la struttura di un file PDF senza librerie esterne: trova gli oggetti
 *          (anche dentro gli "object stream"), decomprime i flussi FlateDecode,
 *          risolve i riferimenti "12 0 R" e restituisce le pagine in ordine.
 * Dipende da: nulla (usa DecompressionStream del browser)
 * Usato da: App.PdfTesto (pdf-testo.js)
 */
(function (App) {
  'use strict';

  // byte -> stringa "binaria" (1 carattere = 1 byte), comoda per le ricerche
  function binaria(u8) {
    var out = '', BLOCCO = 0x8000;
    for (var i = 0; i < u8.length; i += BLOCCO) out += String.fromCharCode.apply(null, u8.subarray(i, i + BLOCCO));
    return out;
  }

  function byteDa(s) {
    var u8 = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) u8[i] = s.charCodeAt(i) & 255;
    return u8;
  }

  function ascii85(u8) {
    var s = binaria(u8).replace(/\s+/g, ''), out = [], i = 0;
    if (s.slice(0, 2) === '<~') s = s.slice(2);
    var fine = s.indexOf('~>');
    if (fine >= 0) s = s.slice(0, fine);
    while (i < s.length) {
      if (s.charAt(i) === 'z') { out.push(0, 0, 0, 0); i++; continue; }
      var gruppo = s.substr(i, 5), n = gruppo.length, v = 0;
      while (gruppo.length < 5) gruppo += 'u';
      for (var k = 0; k < 5; k++) v = v * 85 + (gruppo.charCodeAt(k) - 33);
      var b = [(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255];
      for (k = 0; k < n - 1; k++) out.push(b[k]);
      i += 5;
    }
    return new Uint8Array(out);
  }

  function asciiHex(u8) {
    var h = binaria(u8).replace(/[^0-9A-Fa-f>]/g, ''), fine = h.indexOf('>');
    if (fine >= 0) h = h.slice(0, fine);
    if (h.length % 2) h += '0';
    var out = new Uint8Array(h.length / 2);
    for (var i = 0; i < out.length; i++) out[i] = parseInt(h.substr(i * 2, 2), 16);
    return out;
  }

  function decomprimi(u8) {
    // zlib (deflate) con riserva su deflate "grezzo" per i flussi senza intestazione
    function prova(formato) {
      var ds = new Blob([u8]).stream().pipeThrough(new DecompressionStream(formato));
      return new Response(ds).arrayBuffer().then(function (b) { return new Uint8Array(b); });
    }
    return prova('deflate').catch(function () { return prova('deflate-raw'); })
      .catch(function () { return new Uint8Array(0); });
  }

  // Legge il valore di una chiave in un dizionario testuale: "/Chiave 12 0 R", "/Chiave /Nome", "/Chiave [..]", "/Chiave <<..>>"
  function valore(diz, chiave) {
    var re = new RegExp('/' + chiave + '(?![A-Za-z0-9])\\s*');
    var m = re.exec(diz);
    if (!m) return null;
    var i = m.index + m[0].length, c = diz.charAt(i);
    if (c === '[' || (c === '<' && diz.charAt(i + 1) === '<')) {
      var apri = c === '[' ? '[' : '<<', chiudi = c === '[' ? ']' : '>>', liv = 0, j = i;
      while (j < diz.length) {
        if (diz.substr(j, apri.length) === apri) { liv++; j += apri.length; continue; }
        if (diz.substr(j, chiudi.length) === chiudi) { liv--; j += chiudi.length; if (!liv) break; continue; }
        j++;
      }
      return diz.slice(i, j);
    }
    var r = /^(\d+)\s+(\d+)\s+R/.exec(diz.slice(i, i + 30));
    if (r) return r[0];
    var t = /^(\/[^\s\/\[\]<>()]+|[^\s\/\[\]<>()]+)/.exec(diz.slice(i, i + 200));
    return t ? t[1] : null;
  }

  function rif(v) { var m = /^(\d+)\s+\d+\s+R$/.exec(String(v || '').trim()); return m ? Number(m[1]) : null; }
  function tuttiRif(v) {
    var out = [], re = /(\d+)\s+\d+\s+R/g, m;
    while ((m = re.exec(v || ''))) out.push(Number(m[1]));
    return out;
  }

  // Apre il documento. -> Promise<doc> con doc.ogg(n), doc.diz(v), doc.flusso(n), doc.pagine
  function apri(buffer) {
    var u8 = new Uint8Array(buffer), s = binaria(u8);
    if (s.slice(0, 1024).indexOf('%PDF') < 0) return Promise.reject(new Error('non-pdf'));
    if (/\/Encrypt\s/.test(s.slice(-4096)) || /\/Encrypt\s+\d+\s+\d+\s+R/.test(s)) {
      var e = new Error('cifrato'); e.cifrato = true; return Promise.reject(e);
    }
    var oggetti = {};          // n -> { diz: '...', grezzo: Uint8Array|null }
    var re = /(\d+)\s+(\d+)\s+obj\b/g, m;
    while ((m = re.exec(s))) {
      var inizio = m.index + m[0].length;
      var fine = s.indexOf('endobj', inizio);
      if (fine < 0) fine = s.length;
      var corpo = s.slice(inizio, fine), grezzo = null;
      var ps = corpo.search(/\bstream\r?\n/);
      if (ps >= 0) {
        var da = inizio + ps + (corpo.charAt(ps + 6) === '\r' ? 8 : 7);
        var a = s.indexOf('endstream', da);
        if (a < 0) a = s.length;
        // toglie l'"a capo" prima di endstream (non fa parte dei dati)
        if (s.charAt(a - 1) === '\n') a--;
        if (s.charAt(a - 1) === '\r') a--;
        var vl = valore(corpo.slice(0, ps), 'Length');
        grezzo = { da: da, a: a, lung: vl };
        corpo = corpo.slice(0, ps);
      }
      oggetti[Number(m[1])] = { diz: corpo, grezzo: grezzo };   // l'ultima versione vince
      re.lastIndex = fine;
    }

    var decodificati = {};
    // Byte del flusso: usa /Length (anche se è un riferimento "3 0 R") quando è coerente
    function grezzi(o) {
      var g = o.grezzo, l = g.lung, n = rif(l);
      if (n !== null) l = oggetti[n] ? String(oggetti[n].diz).trim() : '';
      l = Number(l);
      var a = l > 0 && g.da + l <= u8.length && Math.abs(g.da + l - g.a) <= 2 ? g.da + l : g.a;
      return u8.subarray(g.da, a);
    }
    function flusso(n) {
      var o = oggetti[n];
      if (!o || !o.grezzo) return Promise.resolve(new Uint8Array(0));
      if (decodificati[n]) return decodificati[n];
      var filtri = (valore(o.diz, 'Filter') || '').match(/[A-Za-z0-9]+Decode|A85|AHx|Fl/g) || [];
      if (filtri.some(function (f) { return !/^(FlateDecode|Fl|ASCII85Decode|A85|ASCIIHexDecode|AHx)$/.test(f); })) {
        decodificati[n] = Promise.resolve(new Uint8Array(0));  // immagini o filtri non gestiti
        return decodificati[n];
      }
      var p = Promise.resolve(grezzi(o));
      filtri.forEach(function (f) {
        p = p.then(function (b) {
          if (f === 'ASCII85Decode' || f === 'A85') return ascii85(b);
          if (f === 'ASCIIHexDecode' || f === 'AHx') return asciiHex(b);
          return decomprimi(b);
        });
      });
      decodificati[n] = p;
      return p;
    }

    // Oggetti compressi dentro gli "object stream" (PDF 1.5+)
    var objStm = Object.keys(oggetti).filter(function (n) { return /\/Type\s*\/ObjStm/.test(oggetti[n].diz); });
    return Promise.all(objStm.map(function (n) {
      return flusso(Number(n)).then(function (b) {
        var t = binaria(b), d = oggetti[n].diz;
        var quanti = Number(valore(d, 'N')), primo = Number(valore(d, 'First'));
        var nums = t.slice(0, primo).trim().split(/\s+/).map(Number);
        for (var i = 0; i < quanti; i++) {
          var num = nums[i * 2], da = primo + nums[i * 2 + 1];
          var a = i + 1 < quanti ? primo + nums[i * 2 + 3] : t.length;
          if (!oggetti[num]) oggetti[num] = { diz: t.slice(da, a), grezzo: null };
        }
      });
    })).then(function () {
      function ogg(n) { return oggetti[n] || null; }
      // Restituisce un dizionario testuale, seguendo il riferimento se serve
      function diz(v) {
        var n = rif(v);
        if (n !== null) return ogg(n) ? ogg(n).diz : '';
        return v || '';
      }

      // Pagine in ordine, seguendo l'albero /Pages; ogni pagina eredita /Resources
      var pagine = [];
      function visita(n, risorse, visti) {
        if (visti[n] || !ogg(n)) return;
        visti[n] = true;
        var d = ogg(n).diz, r = valore(d, 'Resources') || risorse;
        if (/\/Type\s*\/Pages\b/.test(d)) tuttiRif(valore(d, 'Kids')).forEach(function (k) { visita(k, r, visti); });
        else if (/\/Type\s*\/Page\b/.test(d)) pagine.push({ n: n, diz: d, risorse: r });
      }
      var radice = Object.keys(oggetti).filter(function (n) { return /\/Type\s*\/Catalog\b/.test(oggetti[n].diz); })[0];
      if (radice) visita(rif(valore(oggetti[radice].diz, 'Pages')), null, {});
      if (!pagine.length) {
        Object.keys(oggetti).forEach(function (n) {
          var d = oggetti[n].diz;
          if (/\/Type\s*\/Page\b/.test(d)) pagine.push({ n: Number(n), diz: d, risorse: valore(d, 'Resources') });
        });
      }
      return { ogg: ogg, diz: diz, flusso: flusso, pagine: pagine, valore: valore, rif: rif, tuttiRif: tuttiRif, binaria: binaria, byteDa: byteDa };
    });
  }

  App.PdfOggetti = { apri: apri, valore: valore, rif: rif, tuttiRif: tuttiRif, binaria: binaria };
})(window.App = window.App || {});
