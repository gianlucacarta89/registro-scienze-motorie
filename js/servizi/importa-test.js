/* importa-test.js
 * Cosa fa: riconosce i test e le tabelle dei voti di un libro da righe di testo (Excel, Word, PDF,
 *          testo incollato, foto lette con l'OCR) oppure da un file .json preparato apposta.
 *          Restituisce test DA CONTROLLARE nel formato dei libri del docente, ognuno con i suoi avvisi:
 *          niente si salva da solo, la revisione è in ui/finestra-importa-test.js.
 *          Tabelle capite:
 *           - righe = livelli o voti, colonne = ♂/♀ (anche ripetute per fascia): "Ottimo | 214 | 188"
 *           - righe = ♂/♀ (e fascia), colonne = livelli o voti: "M | 214 | 190 | 165 | 141"
 *           - livello con ♂/♀ sulla stessa riga: "Ottimo M > 214 F > 188"
 *           - un test per riga sotto un'intestazione di livelli: "Salto in lungo | 214 | 190 | 165"
 *          Soglie: intervalli "190-213" (si prende il bordo giusto), "> 214", "oltre 214", tempi 3'55".
 *          Il livello "scarso" (4) non diventa una soglia: il 4 vale da solo oltre l'ultima.
 * Dipende da: App.U, App.Config (importaTest, tipologie, fasce, schedaTest, voti, limiti), App.Voti
 * Usato da: ui/finestra-importa-test.js
 *
 * App.ImportaTest.daRighe(righe, { posizionale }) -> [{ test, avvisi: [testo], nonCapite: [testo] }]
 * App.ImportaTest.daTesto(testo)                  -> come sopra (testo incollato o dell'OCR)
 * App.ImportaTest.daJson(testo)                   -> come sopra (file .json)
 * App.ImportaTest.prepara(test)                   -> { errore } | { test } pronto per App.Libri.salvaTest
 */
(function (App) {
  'use strict';

  var VOTI = [10, 9, 8, 7, 6, 5];
  var FASCE = ['b1', 'b2', 'q'];

  // ---------- testo ----------
  function norm(s) {
    return String(s == null ? '' : s).toLowerCase().replace(/[ªº]/g, '°')
      .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
  }
  function pulisci(s) {
    return String(s == null ? '' : s).replace(/ /g, ' ').replace(/[’`´]/g, "'").replace(/[″”“]/g, '"')
      .replace(/[−–—]/g, '-').replace(/≥/g, '>=').replace(/≤/g, '<=').replace(/[()[\]{}]/g, ' ')
      .replace(/(\d)\s*([:'])\s*(\d)/g, '$1$2$3').replace(/(\d)\s+"/g, '$1"')
      .replace(/(\d"?)(?:\s+-\s+|-\s+)(\d)/g, '$1-$2')   // "190 - 213" sì, "5 -5" no (due numeri).replace(/(>=|<=|>|<)\s+/g, '$1');
  }
  function maiuscola(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

  // ---------- riconoscimento delle parole ----------
  // più parole: valgono solo i livelli scritti con più parole ("molto scarso", non "Ottimo M")
  function livello(t) {
    var n = norm(t).replace(/[:.;,]+$/, ''), multi = n.indexOf(' ') >= 0;
    if (!n || n.split(' ').length > 3) return null;
    var l = App.Config.importaTest.livelli;
    for (var i = 0; i < l.length; i++) if ((!multi || l[i][0].indexOf(' ') >= 0) && new RegExp(l[i][0]).test(n)) return l[i][1];
    return null;
  }
  function sesso(t) {
    var s = String(t).trim().replace(/[:.;,]+$/, '');
    if (/^(M|U|♂)$/.test(s)) return 'M';
    if (/^(F|D|♀)$/.test(s)) return 'F';
    var n = norm(s);
    if (/^(maschi|maschile|maschio|ragazzi|alunni|uomini|studenti)$/.test(n)) return 'M';
    if (/^(femmine|femminile|femmina|ragazze|alunne|donne|studentesse)$/.test(n)) return 'F';
    return null;
  }
  function fascia(t) {
    var n = norm(t);
    if (!n || n.split(' ').length > 6) return null;
    if (/(2 ?°|secondo|seconda) ?biennio|terz[ae] (e|-) ?quart|class[ie] terz|3 ?°? ?(e|-) ?4|\b(16|17)\b.*anni|triennio/.test(n)) return 'b2';
    if (/quint[oa]|5 ?° ?anno|class[ie] quint|\b(18|19)\b.*anni|^v anno/.test(n)) return 'q';
    if (/(1 ?°|primo|prima) ?biennio|^biennio$|prim[ae] (e|-) ?second|class[ie] prim|1 ?°? ?(e|-) ?2 ?°?|\b(14|15)\b.*anni/.test(n)) return 'b1';
    return null;
  }
  var PAROLE_VOTO = /^(voto|voti|livello|livelli|valutazione|giudizio|giudizi|punteggio|risultato|risultati|prestazione|classe|classi|sesso|eta|anni|fascia|prova|soglia|soglie)$/;
  function parolaVoto(t) { return PAROLE_VOTO.test(norm(t).replace(/[:.;,]+$/, '')); }
  function votoEsplicito(t) {
    var n = norm(t), m = /^voto ?(\d{1,2})$/.exec(n) || /^(\d{1,2}) ?\/ ?10$/.exec(n);
    if (/^10 e lode$/.test(n)) return 10;
    return m && Number(m[1]) >= 1 && Number(m[1]) <= 10 ? Number(m[1]) : null;
  }

  // Un numero o un tempo -> { n, tempo: true se minuti:secondi, sec: true se scritto con " }
  function numero(s) {
    var m = /^(\d+)[:'](\d{1,2})(?:[.,](\d+))?"?$/.exec(s);
    if (m) return Number(m[2]) < 60 ? { n: Number(m[1]) * 60 + Number(m[2] + (m[3] ? '.' + m[3] : '')), tempo: true } : null;
    m = /^([+-]?)(\d+)(?:[.,](\d+))?("?)$/.exec(s);
    if (!m) return null;
    var n = Number(m[2] + (m[3] ? '.' + m[3] : ''));
    return { n: m[1] === '-' ? -n : n, sec: !!m[4] };
  }
  var UNITA = /^(cm|mt|metri|m|secondi|sec|s|minuti|min|ripetizioni|rip|volte|kg|punti|pt)\.?$/i;
  // Valore di una cella: "214", "4,38", "3'55\"", "190-213", ">214", "214 cm" -> { n, a, b, op, tempo, unita }
  function valore(raw) {
    var s = String(raw).trim(), op = '', u = '';
    var mo = /^(>=|<=|>|<|=)/.exec(s);
    if (mo) { op = mo[1]; s = s.slice(op.length).trim(); }
    var mu = /^(.*?\d"?)\s*(cm|mt|metri|m|secondi|sec|s|minuti|min|ripetizioni|rip|volte|kg|punti|pt)\.?$/i.exec(s);
    if (mu) { s = mu[1]; u = mu[2].toLowerCase(); }
    var r = /^(-?[\d.,:'"]+?)-(-?[\d.,:'"]+)$/.exec(s);
    if (r) {
      var a = numero(r[1]), b = numero(r[2]);
      if (!a || !b) return null;
      return { a: Math.min(a.n, b.n), b: Math.max(a.n, b.n), tempo: a.tempo || b.tempo, sec: a.sec || b.sec, unita: u, op: op };
    }
    var x = numero(s);
    if (!x) return null;
    return { n: x.n, tempo: x.tempo, sec: x.sec, unita: u, op: op };
  }
  function intero(v) { return v && v.n !== undefined && !v.op && !v.tempo && Math.round(v.n) === v.n ? v.n : null; }

  // ---------- da una cella (o riga di testo) a "pezzi" con il loro tipo ----------
  // k: 'valore' | 'livello' | 'sesso' | 'fascia' | 'parola' (voto, livello…) | 'voto' | 'testo' | 'vuoto'
  var OPERATORI = { 'oltre': '>', 'sopra': '>', 'almeno': '>=', 'piu di': '>', 'meno di': '<', 'sotto': '<', 'fino a': '<=', 'entro': '<=' };
  function pezzi(cella, col) {
    var s = pulisci(cella).trim();
    if (!s) return [{ k: 'vuoto', t: '', col: col }];
    var w = s.split(/\s+/), out = [], i, j;
    for (i = 0; i < w.length; i++) {
      var preso = false;
      // frasi di più parole: livelli, fasce, operatori, "da X a Y", "tra X e Y", "14-15 anni"
      for (j = i + 2; j <= Math.min(w.length, i + 4) && !preso; j++) {      // prima le frasi più corte
        var fr = w.slice(i, j).join(' '), nf = norm(fr);
        var ultimo = w[j - 1];
        if (w.slice(i, j).some(function (p) { return valore(p); }) && !/^anni\.?$/i.test(ultimo)) continue;
        if (j - i <= 3 && livello(fr) !== null) { out.push({ k: 'livello', t: fr, voto: livello(fr) }); i = j - 1; preso = true; }
        else if (fascia(fr)) { out.push({ k: 'fascia', t: fr, f: fascia(fr) }); i = j - 1; preso = true; }
        else if (j - i === 2 && OPERATORI[nf] && w[j] && valore(w[j]) && !valore(w[j]).op) {
          out.push({ k: 'valore', t: fr + ' ' + w[j], v: valore(OPERATORI[nf] + w[j]) }); i = j; preso = true;
        }
      }
      if (preso) continue;
      var n = norm(w[i]);
      if ((n === 'da' || n === 'tra') && w[i + 3] && valore(w[i + 1]) && /^(a|e)$/.test(norm(w[i + 2])) && valore(w[i + 3])) {
        out.push({ k: 'valore', t: w.slice(i, i + 4).join(' '), v: valore(w[i + 1] + '-' + w[i + 3]) }); i += 3; continue;
      }
      if (OPERATORI[n] && w[i + 1] && valore(w[i + 1]) && !valore(w[i + 1]).op) {
        out.push({ k: 'valore', t: w[i] + ' ' + w[i + 1], v: valore(OPERATORI[n] + w[i + 1]) }); i++; continue;
      }
      var v = valore(w[i]);
      if (v) { out.push({ k: 'valore', t: w[i], v: v }); continue; }
      var ve = votoEsplicito(w[i] + (w[i + 1] && /^\/10$/.test(w[i + 1]) ? ' ' + w[i + 1] : ''));
      // "voto 8" è un voto solo se dopo non c'è un altro numero ("Voto 10 8 6 5" è un'intestazione)
      if (n === 'voto' && w[i + 1] && intero(valore(w[i + 1])) !== null && intero(valore(w[i + 1])) <= 10 && !(w[i + 2] && valore(w[i + 2]))) {
        out.push({ k: 'voto', t: w[i] + ' ' + w[i + 1], voto: intero(valore(w[i + 1])) }); i++; continue;
      }
      if (ve !== null) { out.push({ k: 'voto', t: w[i], voto: ve }); continue; }
      if (livello(w[i]) !== null) { out.push({ k: 'livello', t: w[i], voto: livello(w[i]) }); continue; }
      if (sesso(w[i])) { out.push({ k: 'sesso', t: w[i], s: sesso(w[i]) }); continue; }
      if (fascia(w[i])) { out.push({ k: 'fascia', t: w[i], f: fascia(w[i]) }); continue; }
      if (parolaVoto(w[i])) { out.push({ k: 'parola', t: w[i] }); continue; }
      out.push({ k: 'testo', t: w[i] });
    }
    // unità dopo un numero ("214 cm"); le parole di testo vicine diventano una sola
    var uniti = [];
    out.forEach(function (p) {
      var prec = uniti[uniti.length - 1];
      if (p.k === 'testo' && prec && prec.k === 'valore' && UNITA.test(p.t) && p.t !== 'M' && !iniziaConTesto(uniti)) {
        prec.v.unita = prec.v.unita || p.t.replace(/\.$/, '').toLowerCase(); prec.t += ' ' + p.t; return;
      }
      if (p.k === 'testo' && prec && prec.k === 'testo') { prec.t += ' ' + p.t; return; }
      // dentro un titolo ("Sprint 30 metri", "Corsa di 1000 m") i numeri seguiti da parole restano testo
      if (p.k === 'testo' && prec && prec.k === 'valore' && iniziaConTesto(uniti)) {
        var t0 = uniti[uniti.length - 2];
        if (t0 && t0.k === 'testo') { uniti.pop(); t0.t += ' ' + prec.t + ' ' + p.t; return; }
      }
      uniti.push(p);
    });
    uniti.forEach(function (p) { p.col = col; });
    return uniti;
  }
  function iniziaConTesto(lista) { return lista.length && lista[0].k === 'testo'; }

  // ---------- scheda del test ----------
  var CAMPI = [
    ['descrizione', /^(scopo|obiettiv[oi]|finalita|a che cosa serve|cosa valuta|capacita valutat[ae]|capacita)$/],
    ['materiale', /^(materiale|materiali|attrezzatura|attrezzi|occorrente|strumenti)$/],
    ['esecuzione', /^(esecuzione|come si fa|svolgimento|descrizione|procedura|modalita|modalita di esecuzione)$/],
    ['misura', /^(misurazione|come si misura|rilevazione|regole|note|avvertenze|misura)$/],
    ['differenze', /^(differenze|variant[ei]|per le alunne|per le ragazze)$/]
  ];
  function etichetta(testo) {
    var m = /^([^:]{2,40}):\s*(.*)$/.exec(testo);
    if (!m) return null;
    var n = norm(m[1]);
    for (var i = 0; i < CAMPI.length; i++) if (CAMPI[i][1].test(n)) return { campo: CAMPI[i][0], testo: m[2] };
    return null;
  }

  // ---------- tipologia, misura e nome ----------
  var TIPOLOGIE = [
    [/cooper|leger|resistenz|\b(600|800|1000|1200|1500|2000|3000) ?m|\b\d+ ?km\b|ruffier|step test|harvard/, 'Resistenza'],
    [/flessib|mobilita|sit and reach|seat and reach|flessione (del|avanti del) busto|busto avanti|allungament|spaccat/, 'Flessibilità'],
    [/equilibri|flamingo|fenicottero|trave/, 'Equilibrio'],
    [/coordinaz|destrezz|slalom|agilita|funicella|corda|palleggi|percorso|giocoleria/, 'Coordinazione'],
    [/addominal|sit ?-?up|crunch|plank|tenuta|dorsal|core/, 'Core'],
    [/lanci|palla medica|medball|getto|piegament|flession[ie] (sulle|delle) braccia|push ?-?up|trazion|sospension|dinamometr|hand ?grip/, 'Forza arti superiori'],
    [/salt|balz|squat|sargent|abalakov|detente|quintupl|triplo/, 'Forza arti inferiori'],
    [/sprint|velocita|navetta|shuttle|scatto|\b\d{2,3} ?m(etri)?\b|corsa veloce/, 'Velocità']
  ];
  function tipologiaDa(nome) {
    var n = norm(nome);
    for (var i = 0; i < TIPOLOGIE.length; i++) if (TIPOLOGIE[i][0].test(n)) return TIPOLOGIE[i][1];
    return '';
  }
  function tipologiaEsatta(t) {
    var n = norm(t);
    return App.Config.tipologie.filter(function (x) { return norm(x) === n; })[0] || null;
  }
  function pulisciNome(t, cur) {
    var s = String(t).replace(/\s+/g, ' ').trim();
    s = s.replace(/^(test|prova)?\s*(n\.?|n°|nr\.?)?\s*\d{1,2}\s*[.)\-:]\s+/i, '').replace(/[\s:–-]+$/, '');
    var mu = /\s*\b(cm|metri|m|secondi|sec|s|ripetizioni|rip|n\.|numero|kg|punti)\s*$/i.exec(pulisci(t).trim());
    if (mu && /\(\s*\w+\.?\s*\)\s*$/.test(t)) { cur.unitaHint.push(mu[1].toLowerCase()); s = s.replace(/\s*\([^)]*\)\s*$/, ''); }
    if (s === s.toUpperCase() && /[A-Z]/.test(s)) s = maiuscola(s.toLowerCase());
    return s.slice(0, 80);
  }

  // ---------- lettura: da righe a test ----------
  function nuovoTest(nome) {
    return { nome: nome || '', tipologia: '', dati: [], unitaHint: [], scheda: {}, campo: null, avvisi: [], nonCapite: [], testoAperto: false };
  }

  function daRighe(righe, opz) {
    opz = opz || {};
    var tests = [], cur = null;
    var fasciaCorrente = null, sessoCorrente = null, colonne = null, intVoti = null, ultimeFasce = null, tipologiaSezione = '';

    function attuale() {
      if (!cur) { cur = nuovoTest(''); tests.push(cur); }
      return cur;
    }
    function haDati(t) { return t.dati.length || Object.keys(t.scheda).length; }
    function titolo(nome) {
      var prova = nuovoTest(''), n = pulisciNome(nome, prova);
      // lo stesso test già trovato (es. tabella dei maschi e poi delle femmine): si continua quello
      var gia = tests.filter(function (t) { return t !== cur && t.nome && norm(t.nome) === norm(n); })[0];
      fasciaCorrente = null;
      if (gia) { cur = gia; return; }
      if (cur && !haDati(cur)) { cur.nome = n; cur.unitaHint = cur.unitaHint.concat(prova.unitaHint); if (tipologiaSezione) cur.tipologia = tipologiaSezione; return; }
      cur = prova; cur.nome = n; cur.tipologia = tipologiaSezione; tests.push(cur);
    }
    function scheda(campo, testo) {
      var t = attuale();
      if (!testo) { t.campo = campo; return; }
      t.scheda[campo] = (t.scheda[campo] ? t.scheda[campo] + ' ' : '') + testo;
      t.campo = campo;
      t.testoAperto = !/[.!?]$/.test(testo);
    }
    function aggiungi(f, s, voto, v, origine) {
      if (!v) return;
      attuale().dati.push({ f: f || null, s: s || sessoCorrente || null, voto: voto, v: v, origine: origine });
    }

    // Intestazione: colonne ♂/♀ (e fasce) oppure livelli/voti
    function intestazione(p) {
      var liv = p.filter(function (x) { return x.k === 'livello' || x.k === 'voto'; });
      var valori = p.filter(function (x) { return x.k === 'valore'; });
      var resto = p.filter(function (x) { return x.k !== 'vuoto'; });
      // livelli in colonna: "Livello | Ottimo | Buono | Medio…" oppure "Voto | 10 | 8 | 6 | 5"
      if (liv.length >= 2 && !valori.length) {
        intVoti = liv.map(function (x) { return { voto: x.voto, col: x.col }; }); colonne = null; return true;
      }
      if (resto.length >= 3 && resto[0].k === 'parola' && /^vot/.test(norm(resto[0].t)) && valori.length === resto.length - 1 &&
          valori.every(function (x) { var n = intero(x.v); return n !== null && n >= 1 && n <= 10; })) {
        intVoti = valori.map(function (x) { return { voto: x.v.n, col: x.col }; }); colonne = null; return true;
      }
      if (valori.length || p.some(function (x) { return x.k === 'testo' && x.t.length > 3; })) return false;
      var sessi = p.filter(function (x) { return x.k === 'sesso'; }), fasce = p.filter(function (x) { return x.k === 'fascia'; });
      if (!sessi.length && fasce.length < 2) return false;
      if (!sessi.length) {                       // solo fasce: "| 1° biennio | 2° biennio | quinto |"
        ultimeFasce = fasce.map(function (x) { return { f: x.f, col: x.col }; });
        colonne = fasce.map(function (x) { return { f: x.f, s: null, col: x.col }; }); intVoti = null; return true;
      }
      var cols = [], fUlt = null;
      p.forEach(function (x) {
        if (x.k === 'fascia') fUlt = x.f;
        if (x.k === 'sesso') cols.push({ s: x.s, f: fUlt, col: x.col });
      });
      // fasce nella riga sopra: per posizione (Excel/Word) o a coppie ♂ ♀
      if (ultimeFasce && cols.every(function (c) { return !c.f; })) {
        if (opz.posizionale) {
          if (ultimeFasce.length >= 2) cols.forEach(function (c) {
            var f = ultimeFasce.filter(function (u) { return u.col <= c.col; }).pop();
            if (f) c.f = f.f;
          });
        } else if (ultimeFasce.length >= 2 && cols.length === ultimeFasce.length * 2) {
          cols.forEach(function (c, i) { c.f = ultimeFasce[Math.floor(i / 2)].f; });
        }
      }
      colonne = cols; intVoti = null; ultimeFasce = null;
      return true;
    }

    righe.forEach(function (riga) {
      var celle = (riga || []).map(function (c) { return c && typeof c === 'object' ? c.t : c; });
      var pos = !!opz.posizionale && !riga.paragrafo && celle.length > 1;
      var p = [];
      celle.forEach(function (c, i) { p = p.concat(pezzi(c, pos ? i : null)); });
      while (p.length && p[p.length - 1].k === 'vuoto') p.pop();
      var pieni = p.filter(function (x) { return x.k !== 'vuoto'; });
      if (!pieni.length) return;
      var testoRiga = pieni.map(function (x) { return x.t; }).join(' ');
      var valori = pieni.filter(function (x) { return x.k === 'valore'; });

      // ----- righe senza valori: fascia, intestazioni, titoli, scheda -----
      if (!valori.length) {
        if (pieni.length === 1 && pieni[0].k === 'fascia') { fasciaCorrente = pieni[0].f; ultimeFasce = [{ f: pieni[0].f, col: pieni[0].col }]; return; }
        if (intestazione(p)) return;
        var testo = celle.map(function (c) { return String(c == null ? '' : c).trim(); }).filter(Boolean).join(' ').replace(/\s+/g, ' ');
        var et = etichetta(testo);
        if (et) { scheda(et.campo, et.testo); return; }
        var nt = norm(testo);
        if (tipologiaEsatta(testo)) { if (cur && !cur.dati.length) cur.tipologia = tipologiaEsatta(testo); tipologiaSezione = tipologiaEsatta(testo); return; }
        // "Tabella di valutazione – maschi": vale per le righe che seguono
        var sv = pieni.filter(function (x) { return x.k === 'sesso'; });
        if (/^(tabella|tabelle|parametri|griglia|valori di riferimento|punteggi|valutazione)\b/.test(nt) && testo.length < 80) {
          if (sv.length === 1) sessoCorrente = sv[0].s;
          var fv = pieni.filter(function (x) { return x.k === 'fascia'; });
          if (fv.length === 1) fasciaCorrente = fv[0].f;
          return;
        }
        if (pieni.length <= 2 && sv.length === 1 && pieni.every(function (x) { return x.k === 'sesso' || x.k === 'parola' || x.k === 'fascia'; })) {
          sessoCorrente = sv[0].s; var f1 = pieni.filter(function (x) { return x.k === 'fascia'; })[0]; if (f1) fasciaCorrente = f1.f; return;
        }
        var parole = testo.split(' ').length;
        var sembraTitolo = testo.length <= 60 && parole <= 9 && !/[,;]/.test(testo) && !/[.!?]$/.test(testo) &&
          /^[A-ZÀ-Ý0-9]/.test(testo) && !(cur && cur.testoAperto);
        if (sembraTitolo) { titolo(testo); return; }
        if (cur || tests.length) scheda(cur && cur.campo ? cur.campo : 'esecuzione', testo);
        return;
      }
      if (cur) cur.testoAperto = false;

      // intestazione con i voti in numero ("Voto 10 8 6 5")
      if (intestazione(p)) return;

      // ----- righe con valori -----
      var iPrimo = p.indexOf(valori[0]);
      var testa = p.slice(0, iPrimo).filter(function (x) { return x.k !== 'vuoto'; });
      var coda = p.slice(iPrimo);
      var voto = null, sx = null, fx = null, nomeRiga = null;
      testa.forEach(function (x) {
        if (x.k === 'livello' || x.k === 'voto') voto = x.voto;
        else if (x.k === 'sesso') sx = x.s;
        else if (x.k === 'fascia') fx = x.f;
        else if (x.k === 'testo') nomeRiga = (nomeRiga ? nomeRiga + ' ' : '') + x.t;
      });
      // "10 – Ottimo 214 188": il numero davanti al livello non è una soglia
      if (voto === null && !testa.length && coda[1] && (coda[1].k === 'livello' || coda[1].k === 'voto') && intero(coda[0].v) !== null) {
        voto = coda[1].voto; coda = coda.slice(2);
      }
      var valCoda = coda.filter(function (x) { return x.k === 'valore'; });
      // voto scritto come numero in testa alla riga ("8 | 190 | 165")
      if (voto === null && !testa.length && !intVoti) {
        var n0 = intero(valCoda[0].v), resto = valCoda.length - 1;
        if (n0 !== null && n0 >= 4 && n0 <= 10 && resto >= 1 && (colonne ? resto <= colonne.length : [1, 2, 3, 6].indexOf(resto) >= 0)) {
          voto = n0; coda = coda.slice(coda.indexOf(valCoda[0]) + 1); valCoda = valCoda.slice(1);
        }
      }

      if (voto !== null) {
        if (voto < 5 || voto > 10) return;                         // scarso (4): vale da solo oltre l'ultima soglia
        if (Math.round(voto) !== voto) { attuale().avvisi.push('Voto ' + voto + ' saltato (solo voti interi da 5 a 10).'); return; }
        // ♂/♀ sulla stessa riga: "Ottimo M > 214 F > 188"
        if (coda.some(function (x) { return x.k === 'sesso'; })) {
          var s = sx, f = fx;
          coda.forEach(function (x) {
            if (x.k === 'sesso') s = x.s; else if (x.k === 'fascia') f = x.f;
            else if (x.k === 'valore') aggiungi(f || fasciaCorrente, s, voto, x.v, testoRiga);
          });
          return;
        }
        var cols = colonne;
        if (cols && opz.posizionale && pos) {
          coda.forEach(function (x) {
            if (x.k !== 'valore') return;
            var c = cols.filter(function (cc) { return cc.col === x.col; })[0];
            if (c) aggiungi(c.f || fx || fasciaCorrente, c.s || sx, voto, x.v, testoRiga);
          });
          return;
        }
        if (!cols) {
          var nv = valCoda.length;
          if (nv === 1) cols = [{ s: sx }];
          else if (nv === 2) cols = [{ s: 'M' }, { s: 'F' }];
          else if (nv === 3) { cols = [{ f: 'b1' }, { f: 'b2' }, { f: 'q' }]; attuale().avvisi.push('Tre colonne senza intestazione: lette come 1° biennio, 2° biennio, quinto (uguali per ♂ e ♀).'); }
          else if (nv === 6) cols = [{ f: 'b1', s: 'M' }, { f: 'b1', s: 'F' }, { f: 'b2', s: 'M' }, { f: 'b2', s: 'F' }, { f: 'q', s: 'M' }, { f: 'q', s: 'F' }];
          else { attuale().nonCapite.push(testoRiga); return; }
        }
        valCoda.forEach(function (x, i) {
          var c = cols[i];
          if (c) aggiungi(c.f || fx || fasciaCorrente, c.s || sx, voto, x.v, testoRiga);
        });
        return;
      }

      // righe = ♂/♀ (o un test) e colonne = livelli
      if (intVoti) {
        if (nomeRiga && testa.every(function (x) { return x.k === 'testo' || x.k === 'sesso' || x.k === 'fascia'; }) && !sx) {
          titolo(nomeRiga);
        } else if (nomeRiga) { attuale().nonCapite.push(testoRiga); return; }
        var usate = 0;
        coda.forEach(function (x) {
          if (x.k !== 'valore') return;
          var c = pos && opz.posizionale ? intVoti.filter(function (iv) { return iv.col === x.col; })[0] : intVoti[usate];
          usate++;
          if (c && c.voto >= 5 && c.voto <= 10) aggiungi(fx || fasciaCorrente, sx, c.voto, x.v, testoRiga);
        });
        return;
      }

      // un numero solo senza altro: numero di pagina o simile
      if (valori.length === 1 && pieni.length === 1) return;
      if (testa.length && nomeRiga && !voto) {
        // titolo con un numero in fondo ("Salto in lungo da fermo 3") o riga di testo con numeri
        if (valori.length <= 1 && /^[A-ZÀ-Ý]/.test(testoRiga) && testoRiga.length <= 60) { titolo(testoRiga); return; }
        if (cur && cur.campo) { scheda(cur.campo, testoRiga); return; }
      }
      attuale().nonCapite.push(testoRiga);
    });

    return tests.filter(function (t) { return t.nome || t.dati.length; }).map(completa);
  }

  // ---------- da dati grezzi a test ----------
  function testoNumero(n) { return String(Math.round(n * 100) / 100).replace('.', ','); }
  function testoTempoMin(n) {
    var m = Math.floor(n / 60), s = Math.round((n - m * 60) * 100) / 100;
    return m + ':' + (s < 10 ? '0' : '') + String(s).replace('.', ',');
  }

  function completa(c) {
    var avvisi = c.avvisi.slice();
    var t = { nome: c.nome || 'Test senza nome', tipologia: c.tipologia || '' };
    if (!c.nome) avvisi.push('Nome del test non trovato: scrivilo.');
    if (!t.tipologia) { t.tipologia = tipologiaDa(t.nome); if (t.tipologia) avvisi.push('Tipologia proposta dal nome: controllala.'); }

    // misura
    var nomeN = norm(t.nome), unita = c.unitaHint.slice();
    c.dati.forEach(function (d) { if (d.v.unita) unita.push(d.v.unita); if (d.v.sec) unita.push('s'); });
    var haTempo = c.dati.some(function (d) { return d.v.tempo; });
    var nums = c.dati.map(function (d) { return d.v.n !== undefined ? d.v.n : d.v.b; });
    var max = nums.length ? Math.max.apply(null, nums) : 0;
    var u = function (re) { return unita.some(function (x) { return re.test(x); }); };
    if (haTempo || (u(/^min/) && max < 60)) { t.tipo = 'tempo'; t.formatoTempo = 'min'; }
    else if (u(/^(s|sec|secondi)$/) || (/sprint|velocita|navetta|shuttle|scatto|4 ?x ?10|10 ?x ?5|corsa veloce|\b\d{2,3} ?m(etri)?\b/.test(nomeN) &&
      !/salt|lanci|getto|cooper|minuti/.test(nomeN) && max < 60 && nums.length)) { t.tipo = 'tempo'; t.formatoTempo = 'sec'; }
    else {
      t.tipo = 'numero';
      var un = unita.filter(function (x) { return !/^(s|sec|secondi|min|minuti)$/.test(x); })[0] || '';
      t.unita = { mt: 'm', metri: 'm', rip: 'ripetizioni', volte: 'ripetizioni', pt: 'punti' }[un] || un;
      if (!t.unita) {
        if (/salt|lungo|lanci|getto|sargent|reach|busto|flession/.test(nomeN)) t.unita = max && max < 30 && !/reach|busto|flession/.test(nomeN) ? 'm' : 'cm';
        else if (/cooper|metri percorsi/.test(nomeN)) t.unita = 'm';
        else if (/addominal|piegament|sit ?-?up|push|trazion|ripetizion|squat|balz/.test(nomeN)) t.unita = 'ripetizioni';
      }
    }
    if (c.dati.some(function (d) { return (d.v.n !== undefined ? d.v.n : d.v.a) < 0; })) t.negativi = true;

    // meglio più alto o più basso: dal confronto tra il voto più alto e il più basso di ogni serie
    var serie = {}, su = 0, giu = 0;
    c.dati.forEach(function (d) {
      var k = (d.f || '') + (d.s || ''), m = d.v.n !== undefined ? d.v.n : (d.v.a + d.v.b) / 2;
      (serie[k] = serie[k] || []).push({ voto: d.voto, n: m });
      if (d.v.op && d.voto >= 8) { if (d.v.op.charAt(0) === '>') su++; else giu++; }
    });
    Object.keys(serie).forEach(function (k) {
      var s = serie[k].sort(function (a, b) { return b.voto - a.voto; });
      if (s.length < 2 || s[0].voto === s[s.length - 1].voto) return;
      if (s[0].n > s[s.length - 1].n) su += 2; else if (s[0].n < s[s.length - 1].n) giu += 2;
    });
    t.migliore = su > giu ? 'alto' : giu > su ? 'basso' : (t.tipo === 'tempo' ? 'basso' : 'alto');

    // soglie
    var tab = {}, doppie = 0;
    c.dati.forEach(function (d) {
      var n = d.v.n !== undefined ? d.v.n : (t.migliore === 'alto' ? d.v.a : d.v.b);
      var testo = t.tipo === 'tempo' && t.formatoTempo === 'min' ? testoTempoMin(n) : testoNumero(n);
      var chiave = d.f || 'unica';
      tab[chiave] = tab[chiave] || {};
      (d.s ? [d.s] : ['M', 'F']).forEach(function (sx) {
        var r = tab[chiave][d.voto] = tab[chiave][d.voto] || {};
        if (r[sx] !== undefined && r[sx] !== testo) doppie++;
        else r[sx] = testo;
      });
    });
    if (doppie) avvisi.push(doppie + (doppie === 1 ? ' soglia trovata due volte' : ' soglie trovate due volte') + ': tenuta la prima, controlla.');
    function righe(x) {
      return VOTI.filter(function (v) { return x[v]; }).map(function (v) { return { voto: v, M: x[v].M || '', F: x[v].F || '' }; });
    }
    var fasce = FASCE.filter(function (f) { return tab[f]; });
    if (fasce.length) {
      t.fasce = {};
      fasce.forEach(function (f) { t.fasce[f] = { righe: righe(tab[f]) }; });
      if (tab.unica) {
        FASCE.forEach(function (f) { if (!t.fasce[f]) t.fasce[f] = { righe: righe(tab.unica) }; });
        avvisi.push('Una tabella senza fascia è stata messa nelle fasce mancanti: controlla.');
      }
      var nomiF = App.Config.fasce.filter(function (f) { return t.fasce[f.id]; }).map(function (f) { return f.nome; });
      if (nomiF.length < 3) avvisi.push('Tabelle trovate solo per: ' + nomiF.join(', ') + '.');
    } else if (tab.unica) {
      t.voti = { righe: righe(tab.unica) };
    } else {
      avvisi.push('Nessuna tabella dei voti trovata: scrivila a mano.');
    }
    var tutte = t.fasce ? Object.keys(t.fasce).map(function (f) { return t.fasce[f].righe; }) : t.voti ? [t.voti.righe] : [];
    tutte.forEach(function (rr) {
      var soloM = rr.some(function (r) { return r.M; }) && !rr.some(function (r) { return r.F; });
      var soloF = rr.some(function (r) { return r.F; }) && !rr.some(function (r) { return r.M; });
      if (soloM || soloF) avvisi.push('In una tabella ci sono solo le soglie ' + (soloM ? 'degli alunni (♂)' : 'delle alunne (♀)') + '.');
    });
    if (c.dati.length) avvisi.push('Misura letta come ' + (t.tipo === 'tempo' ? (t.formatoTempo === 'min' ? 'tempo in minuti:secondi' : 'tempo in secondi') :
      'numero' + (t.unita ? ' (' + t.unita + ')' : '')) + ', ' + (t.migliore === 'alto' ? 'meglio più alto' : 'meglio più basso') + '.');

    // scheda
    var lim = (App.Config.limiti && App.Config.limiti.schedaTest) || 800;
    Object.keys(c.scheda).forEach(function (k) { t[k] = c.scheda[k].slice(0, lim); });
    return { test: t, avvisi: avvisi, nonCapite: c.nonCapite };
  }

  // ---------- testo incollato o letto dalle foto ----------
  function righeDaTesto(testo) {
    return String(testo || '').replace(/\r/g, '').split('\n').map(function (r) {
      if (/\t|\||;/.test(r)) return r.split(/\t|\||;/);
      return r.split(/\s{3,}/);
    }).filter(function (r) { return r.join('').trim(); });
  }

  // ---------- file .json ----------
  var CAMPI_JSON = ['nome', 'tipologia', 'tipo', 'formatoTempo', 'migliore', 'unita', 'strumento', 'perSesso', 'strumentoM', 'strumentoF',
    'negativi', 'descrizione', 'materiale', 'esecuzione', 'misura', 'differenze', 'fonte'];
  function righeJson(x) {
    if (!x) return null;
    var rr = Array.isArray(x) ? x : x.righe;
    if (!Array.isArray(rr)) return null;
    var out = [];
    rr.forEach(function (r) {
      var v = typeof r.voto === 'number' ? r.voto : (livello(r.voto) !== null ? livello(r.voto) : Number(String(r.voto).replace(',', '.')));
      if (VOTI.indexOf(v) < 0) return;
      out.push({ voto: v, M: r.M == null ? '' : String(r.M), F: r.F == null ? '' : String(r.F) });
    });
    return { righe: out };
  }
  function daJson(testo) {
    var d;
    try { d = JSON.parse(String(testo).replace(/^﻿/, '')); } catch (e) { var er = new Error('Il file .json non è scritto bene.'); er.perUtente = true; throw er; }
    var lista = Array.isArray(d) ? d : (d && (d.test || d.tests)) || [];
    if (!Array.isArray(lista) || !lista.length) { var e2 = new Error('Nel file .json non trovo test ("test": [ … ]).'); e2.perUtente = true; throw e2; }
    return lista.map(function (x) {
      var t = {}, avvisi = [];
      CAMPI_JSON.forEach(function (k) { if (x[k] !== undefined && x[k] !== null && x[k] !== '') t[k] = typeof x[k] === 'string' ? x[k].slice(0, 800) : x[k]; });
      t.nome = String(t.nome || 'Test senza nome').slice(0, 80);
      if (t.tipo !== 'tempo') { t.tipo = 'numero'; delete t.formatoTempo; } else if (t.formatoTempo !== 'min') t.formatoTempo = 'sec';
      if (t.migliore !== 'basso') t.migliore = t.migliore === 'alto' ? 'alto' : (t.tipo === 'tempo' ? 'basso' : 'alto');
      if (x.fasce) {
        t.fasce = {};
        FASCE.forEach(function (f) { var r = righeJson(x.fasce[f]); if (r && r.righe.length) t.fasce[f] = r; });
        if (!Object.keys(t.fasce).length) delete t.fasce;
      }
      if (!t.fasce && x.voti) { var rv = righeJson(x.voti); if (rv && rv.righe.length) t.voti = rv; }
      if (!t.fasce && !t.voti) avvisi.push('Nessuna tabella dei voti: scrivila a mano.');
      if (!t.tipologia) { t.tipologia = tipologiaDa(t.nome); if (t.tipologia) avvisi.push('Tipologia proposta dal nome: controllala.'); }
      return { test: t, avvisi: avvisi, nonCapite: [] };
    });
  }

  // ---------- controllo finale (come il ✔ Salva della finestra del test) ----------
  function comodo(t) { return t.migliore === 'alto' ? (t.negativi ? '-100' : '0') : (t.tipo === 'tempo' ? (t.formatoTempo === 'min' ? '99:59' : '999') : '999'); }
  function prepara(orig) {
    var x = App.U.copia(orig), errore = null;
    if (!App.U.spazi(x.nome)) return { errore: 'Scrivi il nome del test.' };
    function tabella(tab, etichetta) {
      var righe = ((tab && tab.righe) || []).filter(function (r) { return VOTI.indexOf(r.voto) >= 0; });
      var r = App.Voti.controlla(x, righe);
      if (r.errore) { errore = etichetta + ': ' + r.errore; return null; }
      if (!r.righe.length) return null;
      r.righe.push({ voto: App.Config.voti.min, M: comodo(x), F: comodo(x) });
      return { righe: r.righe };
    }
    if (x.fasce) {
      var f = {};
      App.Config.fasce.forEach(function (fc) { var tb = !errore && tabella(x.fasce[fc.id], fc.nome); if (tb) f[fc.id] = tb; });
      x.fasce = f;
      if (!errore && !Object.keys(f).length) errore = 'Manca la tabella dei voti.';
      delete x.voti;
    } else {
      x.voti = tabella(x.voti, 'Tabella');
      if (!errore && !x.voti) errore = 'Manca la tabella dei voti.';
    }
    if (x.tipo !== 'numero') delete x.unita;
    return errore ? { errore: errore } : { test: x };
  }

  App.ImportaTest = {
    daRighe: daRighe,
    daTesto: function (testo) { return daRighe(righeDaTesto(testo), {}); },
    daJson: daJson,
    prepara: prepara,
    // per le prove
    _valore: valore, _pezzi: pezzi
  };
})(window.App = window.App || {});
