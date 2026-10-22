/* pdf-caratteri.js
 * Cosa fa: traduce i codici dei caratteri di un PDF in testo leggibile, font per font:
 *          tabelle ToUnicode, codifica WinAnsi, /Differences, font composti (Type0),
 *          e larghezze dei caratteri (per sapere dove finisce una parola).
 * Dipende da: App.PdfOggetti (valore, rif, binaria)
 * Usato da: App.PdfTesto (pdf-testo.js)
 */
(function (App) {
  'use strict';

  var O = function () { return App.PdfOggetti; };

  // Caratteri 0x80-0x9F della codifica WinAnsi (cp1252)
  var CP1252 = { 128: 8364, 130: 8218, 131: 402, 132: 8222, 133: 8230, 134: 8224, 135: 8225, 136: 710, 137: 8240,
    138: 352, 139: 8249, 140: 338, 142: 381, 145: 8216, 146: 8217, 147: 8220, 148: 8221, 149: 8226, 150: 8211,
    151: 8212, 152: 732, 153: 8482, 154: 353, 155: 8250, 156: 339, 158: 382, 159: 376 };

  // Nomi dei glifi più comuni (per /Differences)
  var GLIFI = { space: ' ', quoteright: '’', quotesingle: "'", quoteleft: '‘', hyphen: '-', period: '.',
    comma: ',', colon: ':', semicolon: ';', slash: '/', parenleft: '(', parenright: ')', endash: '–',
    emdash: '—', zero: '0', one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7',
    eight: '8', nine: '9', degree: '°', ordmasculine: 'º', ordfeminine: 'ª', ampersand: '&',
    bullet: '•', numbersign: '#', underscore: '_', nbspace: ' ' };
  var ACCENTI = { grave: '̀', acute: '́', circumflex: '̂', dieresis: '̈', tilde: '̃', cedilla: '̧' };

  function daGlifo(nome) {
    if (GLIFI[nome]) return GLIFI[nome];
    if (/^[A-Za-z]$/.test(nome)) return nome;
    var m = /^uni([0-9A-Fa-f]{4})/.exec(nome) || /^u([0-9A-Fa-f]{4,6})$/.exec(nome);
    if (m) return String.fromCodePoint(parseInt(m[1], 16));
    m = /^([A-Za-z])(grave|acute|circumflex|dieresis|tilde|cedilla)$/.exec(nome);
    if (m) return (m[1] + ACCENTI[m[2]]).normalize('NFC');
    return null;
  }

  function utf16(hex) {
    var s = '';
    for (var i = 0; i + 4 <= hex.length; i += 4) s += String.fromCharCode(parseInt(hex.substr(i, 4), 16));
    if (hex.length === 2) s = String.fromCharCode(parseInt(hex, 16));
    return s;
  }

  // Tabella ToUnicode -> { mappa: {codice: testo}, byte: 1|2 }
  function leggiCMap(testo) {
    var mappa = {}, byte = 0, m;
    var cs = /<([0-9A-Fa-f]+)>\s*<[0-9A-Fa-f]+>/.exec((/begincodespacerange([\s\S]*?)endcodespacerange/.exec(testo) || [])[1] || '');
    if (cs) byte = cs[1].length / 2;
    var blocchi = testo.match(/beginbfchar[\s\S]*?endbfchar/g) || [];
    blocchi.forEach(function (b) {
      var re = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]*)>/g;
      while ((m = re.exec(b))) { mappa[parseInt(m[1], 16)] = utf16(m[2]); if (!byte) byte = m[1].length / 2; }
    });
    (testo.match(/beginbfrange[\s\S]*?endbfrange/g) || []).forEach(function (b) {
      var re = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*(<[0-9A-Fa-f]*>|\[[^\]]*\])/g;
      while ((m = re.exec(b))) {
        var a = parseInt(m[1], 16), z = parseInt(m[2], 16);
        if (!byte) byte = m[1].length / 2;
        if (z - a > 65535) continue;
        if (m[3].charAt(0) === '[') {
          var lista = m[3].match(/<([0-9A-Fa-f]*)>/g) || [];
          lista.forEach(function (h, i) { mappa[a + i] = utf16(h.slice(1, -1)); });
        } else {
          var base = m[3].slice(1, -1), ultimo = parseInt(base.slice(-4) || '0', 16), prefisso = base.slice(0, -4);
          for (var c = a; c <= z; c++) {
            var v = (ultimo + c - a).toString(16);
            mappa[c] = utf16(prefisso + ('0000' + v).slice(-4));
          }
        }
      }
    });
    return { mappa: mappa, byte: byte || 1 };
  }

  function numeri(t) { return (String(t || '').match(/-?\d*\.?\d+/g) || []).map(Number); }

  // Larghezze del font composto: /W [ c [w w ...] c1 c2 w ... ]
  function larghezzeCID(w) {
    var out = {}, t = String(w || '').replace(/^\[|\]$/g, ''), re = /(\d+)\s*\[([^\]]*)\]|(\d+)\s+(\d+)\s+(-?[\d.]+)/g, m;
    while ((m = re.exec(t))) {
      if (m[1] !== undefined) numeri(m[2]).forEach(function (v, i) { out[Number(m[1]) + i] = v; });
      else for (var c = Number(m[3]); c <= Number(m[4]) && c - Number(m[3]) < 65536; c++) out[c] = Number(m[5]);
    }
    return out;
  }

  // Prepara un font. -> Promise<{ composto, decodifica(stringaByte) -> [{ t, w, spazio }] }>
  function prepara(doc, rifFont) {
    var d = doc.diz(rifFont), V = O().valore;
    var composto = /\/Subtype\s*\/Type0/.test(d);
    var tu = O().rif(V(d, 'ToUnicode'));
    var pCMap = tu !== null ? doc.flusso(tu).then(function (b) { return leggiCMap(O().binaria(b)); }) : Promise.resolve(null);
    return pCMap.then(function (cmap) {
      var larg = {}, predef = composto ? 1000 : 0, primo = 0, codifica = {};
      if (composto) {
        var dv = V(d, 'DescendantFonts') || '';
        if (O().rif(dv) !== null && doc.diz(dv).trim().charAt(0) === '[') dv = doc.diz(dv);
        var nDesc = O().tuttiRif(dv)[0];
        var desc = nDesc !== undefined ? doc.diz(nDesc + ' 0 R') : '';
        larg = larghezzeCID(doc.diz(V(desc, 'W')) || V(desc, 'W'));
        if (V(desc, 'DW')) predef = Number(V(desc, 'DW'));
      } else {
        primo = Number(V(d, 'FirstChar') || 0);
        var w = V(d, 'Widths');
        numeri(O().rif(w) !== null ? doc.diz(w) : w).forEach(function (v, i) { larg[primo + i] = v; });
        var enc = V(d, 'Encoding');
        var encDiz = O().rif(enc) !== null ? doc.diz(enc) : (enc && enc.indexOf('<<') === 0 ? enc : '');
        var diff = encDiz ? V(encDiz, 'Differences') : null;
        if (diff) {
          var cod = 0;
          (diff.replace(/^\[|\]$/g, '').match(/\d+|\/[^\s\/\[\]]+/g) || []).forEach(function (x) {
            if (x.charAt(0) === '/') { var g = daGlifo(x.slice(1)); if (g !== null) codifica[cod] = g; cod++; }
            else cod = Number(x);
          });
        }
      }
      var byte = composto ? 2 : 1;
      if (cmap && composto) byte = cmap.byte || 2;

      function carattere(c) {
        if (cmap && cmap.mappa[c] !== undefined) return cmap.mappa[c];
        if (composto) return '';
        if (codifica[c] !== undefined) return codifica[c];
        if (CP1252[c]) return String.fromCharCode(CP1252[c]);
        return c >= 32 ? String.fromCharCode(c) : '';
      }

      return {
        composto: composto,
        leggibile: !composto || !!cmap,
        decodifica: function (s) {
          var out = [];
          for (var i = 0; i + byte <= s.length; i += byte) {
            var c = byte === 2 ? (s.charCodeAt(i) << 8) | s.charCodeAt(i + 1) : s.charCodeAt(i);
            var w = larg[c] !== undefined ? larg[c] : (predef || 520);
            out.push({ t: carattere(c), w: w, spazio: byte === 1 && c === 32 });
          }
          return out;
        }
      };
    });
  }

  App.PdfCaratteri = { prepara: prepara, leggiCMap: leggiCMap };
})(window.App = window.App || {});
