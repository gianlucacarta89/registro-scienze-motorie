/* pdf-testo.js
 * Cosa fa: estrae il testo dalle pagine di un PDF e lo ricompone in righe e celle,
 *          usando la posizione delle scritte (stessa altezza = stessa riga, spazio
 *          largo = colonna diversa). Così un elenco o una tabella diventano righe di nomi.
 * Dipende da: App.PdfOggetti, App.PdfCaratteri
 * Usato da: App.LeggiFile (leggi-file.js)
 */
(function (App) {
  'use strict';

  var MAX_PROF = 5;

  function mul(m, n) {
    return [m[0] * n[0] + m[1] * n[2], m[0] * n[1] + m[1] * n[3], m[2] * n[0] + m[3] * n[2],
      m[2] * n[1] + m[3] * n[3], m[4] * n[0] + m[5] * n[2] + n[4], m[4] * n[1] + m[5] * n[3] + n[5]];
  }

  // Prepara font e moduli (XObject) di un dizionario di risorse, anche annidati
  function preparaRisorse(doc, risorse, cache, prof) {
    var V = App.PdfOggetti.valore;
    var diz = doc.diz(risorse || ''), out = { font: {}, moduli: {} }, attese = [];
    var fd = doc.diz(V(diz, 'Font') || ''), re = /\/([^\s\/<>\[\]()]+)\s+(\d+)\s+\d+\s+R/g, m;
    while ((m = re.exec(fd))) {
      (function (nome, n) {
        if (!cache[n]) cache[n] = App.PdfCaratteri.prepara(doc, n + ' 0 R').catch(function () { return null; });
        attese.push(cache[n].then(function (f) { out.font[nome] = f; }));
      })(m[1], Number(m[2]));
    }
    if (prof < MAX_PROF) {
      var xd = doc.diz(V(diz, 'XObject') || '');
      re = /\/([^\s\/<>\[\]()]+)\s+(\d+)\s+\d+\s+R/g;
      while ((m = re.exec(xd))) {
        (function (nome, n) {
          var o = doc.ogg(n);
          if (!o || !/\/Subtype\s*\/Form/.test(o.diz)) return;
          var mat = (V(o.diz, 'Matrix') || '').replace(/[\[\]]/g, '').trim().split(/\s+/).map(Number);
          attese.push(Promise.all([doc.flusso(n), preparaRisorse(doc, V(o.diz, 'Resources') || risorse, cache, prof + 1)])
            .then(function (r) {
              out.moduli[nome] = { contenuto: App.PdfOggetti.binaria(r[0]), risorse: r[1],
                matrice: mat.length === 6 && !mat.some(isNaN) ? mat : [1, 0, 0, 1, 0, 0] };
            }));
        })(m[1], Number(m[2]));
      }
    }
    return Promise.all(attese).then(function () { return out; });
  }

  // Legge il flusso dei comandi di una pagina e raccoglie le scritte con la loro posizione
  function interpreta(c, ris, ctm0, scritte, prof) {
    var i = 0, n = c.length, pila = [], ctm = ctm0.slice(), salvati = [];
    var tm = [1, 0, 0, 1, 0, 0], tlm = tm.slice(), font = null, dim = 0, tc = 0, tw = 0, th = 1, tl = 0, rise = 0;

    function mostra(s) {
      if (!font || !font.leggibile) return;
      var m = mul(tm, ctm), dimEff = Math.abs(dim * Math.hypot(m[2], m[3])) || Math.abs(dim) || 10;
      var x0 = m[4], y0 = m[5] + rise, testo = '';
      font.decodifica(s).forEach(function (g) {
        testo += g.t;
        var tx = ((g.w / 1000) * dim + tc + (g.spazio ? tw : 0)) * th;
        tm = [tm[0], tm[1], tm[2], tm[3], tm[4] + tx * tm[0], tm[5] + tx * tm[1]];
      });
      var fine = mul(tm, ctm);
      if (testo) scritte.push({ x: x0, y: y0, x1: fine[4], t: testo, d: dimEff });
    }
    function sposta(tx, ty) { tlm = mul([1, 0, 0, 1, tx, ty], tlm); tm = tlm.slice(); }

    while (i < n) {
      var ch = c.charAt(i);
      if (/\s/.test(ch)) { i++; continue; }
      if (ch === '%') { while (i < n && c.charAt(i) !== '\n' && c.charAt(i) !== '\r') i++; continue; }
      if (ch === '(') {
        var liv = 1, s = '';
        i++;
        while (i < n && liv) {
          var k = c.charAt(i);
          if (k === '\\') {
            var nx = c.charAt(i + 1);
            if (/[0-7]/.test(nx)) { var ott = /^[0-7]{1,3}/.exec(c.substr(i + 1, 3))[0]; s += String.fromCharCode(parseInt(ott, 8) & 255); i += 1 + ott.length; continue; }
            var esc = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f' }[nx];
            if (nx === '\r' || nx === '\n') { i += (nx === '\r' && c.charAt(i + 2) === '\n') ? 3 : 2; continue; }
            s += esc !== undefined ? esc : nx; i += 2; continue;
          }
          if (k === '(') liv++;
          else if (k === ')') { liv--; if (!liv) { i++; break; } }
          s += k; i++;
        }
        pila.push({ str: s }); continue;
      }
      if (ch === '<' && c.charAt(i + 1) === '<') {
        var l2 = 0;
        while (i < n) {
          if (c.substr(i, 2) === '<<') { l2++; i += 2; } else if (c.substr(i, 2) === '>>') { l2--; i += 2; if (!l2) break; } else i++;
        }
        pila.push({ diz: true }); continue;
      }
      if (ch === '<') {
        var j = c.indexOf('>', i), hex = c.slice(i + 1, j).replace(/[^0-9A-Fa-f]/g, ''), b = '';
        if (hex.length % 2) hex += '0';
        for (var h = 0; h < hex.length; h += 2) b += String.fromCharCode(parseInt(hex.substr(h, 2), 16));
        pila.push({ str: b }); i = j + 1; continue;
      }
      if (ch === '[') { pila.push({ inizio: true }); i++; continue; }
      if (ch === ']') {
        var arr = [];
        while (pila.length && !pila[pila.length - 1].inizio) arr.unshift(pila.pop());
        pila.pop(); pila.push({ arr: arr }); i++; continue;
      }
      if (ch === '/') {
        var mn = /^\/[^\s\/\[\]<>()%{}]*/.exec(c.substr(i, 128))[0];
        pila.push({ nome: mn.slice(1) }); i += mn.length; continue;
      }
      var num = /^[+-]?(\d+\.?\d*|\.\d+)/.exec(c.substr(i, 32));
      if (num) { pila.push(Number(num[0])); i += num[0].length; continue; }
      var op = /^[A-Za-z'"*0-9]+/.exec(c.substr(i, 16));
      if (!op) { i++; continue; }
      op = op[0]; i += op.length;
      var a = pila; pila = [];
      var nums = a.filter(function (x) { return typeof x === 'number'; });
      switch (op) {
        case 'q': salvati.push(ctm.slice()); break;
        case 'Q': if (salvati.length) ctm = salvati.pop(); break;
        case 'cm': if (nums.length === 6) ctm = mul(nums, ctm); break;
        case 'BT': tm = [1, 0, 0, 1, 0, 0]; tlm = tm.slice(); break;
        case 'Tf': var fn = a.filter(function (x) { return x && x.nome !== undefined; })[0]; font = fn ? ris.font[fn.nome] : null; dim = nums[0] || 0; break;
        case 'Td': sposta(nums[0] || 0, nums[1] || 0); break;
        case 'TD': tl = -(nums[1] || 0); sposta(nums[0] || 0, nums[1] || 0); break;
        case 'Tm': if (nums.length === 6) { tlm = nums.slice(); tm = nums.slice(); } break;
        case 'T*': sposta(0, -tl); break;
        case 'TL': tl = nums[0] || 0; break;
        case 'Tc': tc = nums[0] || 0; break;
        case 'Tw': tw = nums[0] || 0; break;
        case 'Tz': th = (nums[0] === undefined ? 100 : nums[0]) / 100; break;
        case 'Ts': rise = nums[0] || 0; break;
        case 'Tj': if (a.length && a[a.length - 1].str !== undefined) mostra(a[a.length - 1].str); break;
        case "'": sposta(0, -tl); if (a.length && a[a.length - 1].str !== undefined) mostra(a[a.length - 1].str); break;
        case '"': tw = nums[0] || 0; tc = nums[1] || 0; sposta(0, -tl); if (a.length && a[a.length - 1].str !== undefined) mostra(a[a.length - 1].str); break;
        case 'TJ':
          var el = a.length && a[a.length - 1].arr;
          (el || []).forEach(function (x) {
            if (typeof x === 'number') { var tx = (-x / 1000) * dim * th; tm = [tm[0], tm[1], tm[2], tm[3], tm[4] + tx * tm[0], tm[5] + tx * tm[1]]; }
            else if (x.str !== undefined) mostra(x.str);
          });
          break;
        case 'Do':
          var xn = a.filter(function (x) { return x && x.nome !== undefined; })[0];
          var mod = xn && ris.moduli[xn.nome];
          if (mod && prof < MAX_PROF) interpreta(mod.contenuto, mod.risorse, mul(mod.matrice, ctm), scritte, prof + 1);
          break;
        case 'BI':
          var fineImg = c.slice(i).search(/\sEI\s/);
          i = fineImg < 0 ? n : i + fineImg + 4;
          break;
        default: break;
      }
    }
  }

  // Scritte di una pagina -> righe di celle { t, x, x1 } (x = dove inizia la cella, x1 = dove finisce)
  // Una cella si chiude quando c'è uno spazio largo oppure quando si passa da numeri a lettere
  // (così "1" e "Rossi" restano celle separate anche se sono vicini).
  function soloNumeri(t) { return !/[A-Za-z\u00C0-\u024F]/.test(t); }

  function righe(scritte) {
    scritte = scritte.filter(function (s) { return s.t.replace(/\s/g, ''); });
    scritte.sort(function (p, q) { return q.y - p.y || p.x - q.x; });
    var gruppi = [];
    scritte.forEach(function (s) {
      var g = gruppi[gruppi.length - 1];
      if (g && Math.abs(g.y - s.y) <= Math.max(2, Math.min(g.d, s.d) * 0.5)) g.voci.push(s);
      else gruppi.push({ y: s.y, d: s.d, voci: [s] });
    });
    return gruppi.map(function (g) {
      g.voci.sort(function (p, q) { return p.x - q.x; });
      var celle = [], cella = null;
      g.voci.forEach(function (s) {
        var spazio = cella ? s.x - cella.x1 : 0;
        if (!cella || spazio > s.d * 1.2 || soloNumeri(s.t) !== soloNumeri(cella.t)) {
          cella = { t: s.t, x: s.x, x1: s.x1 };
          celle.push(cella);
          return;
        }
        if (spazio > s.d * 0.15 && !/\s$/.test(cella.t) && !/^\s/.test(s.t)) cella.t += ' ';
        cella.t += s.t;
        cella.x1 = Math.max(cella.x1, s.x1);
      });
      celle.forEach(function (c) { c.t = c.t.replace(/\s+/g, ' ').trim(); });
      return celle.filter(function (c) { return c.t; });
    }).filter(function (r) { return r.length; });
  }

  // -> Promise<[[cella, ...], ...]>
  function estrai(buffer) {
    return App.PdfOggetti.apri(buffer).then(function (doc) {
      var cache = {}, tutte = [];
      return doc.pagine.reduce(function (p, pag) {
        return p.then(function () {
          var V = App.PdfOggetti.valore;
          var rifs = App.PdfOggetti.tuttiRif(V(pag.diz, 'Contents'));
          var cv = V(pag.diz, 'Contents');
          if (rifs.length === 1 && doc.diz(cv).trim().charAt(0) === '[') rifs = App.PdfOggetti.tuttiRif(doc.diz(cv));
          return Promise.all([Promise.all(rifs.map(doc.flusso)), preparaRisorse(doc, pag.risorse, cache, 0)]).then(function (r) {
            var contenuto = r[0].map(App.PdfOggetti.binaria).join('\n'), scritte = [];
            interpreta(contenuto, r[1], [1, 0, 0, 1, 0, 0], scritte, 0);
            tutte = tutte.concat(righe(scritte));
          });
        });
      }, Promise.resolve()).then(function () { return tutte; });
    });
  }

  App.PdfTesto = { estrai: estrai, righe: righe };
})(window.App = window.App || {});
