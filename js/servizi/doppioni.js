/* doppioni.js
 * Cosa fa: trova i test "doppioni" (nomi simili) nell'elenco 📚 e nelle classi e li unisce in uno.
 *          Simili = stesso tipo di misura, stessa direzione (meglio alto/basso), stessa unità (o non
 *          scritta), stessi numeri nel nome (Sprint 30 ≠ Sprint 60, palla 3 kg ≠ 4 kg; numeri in un nome
 *          solo = va bene) e parole uguali o una contenuta nell'altra (con i sinonimi di libro-voti.js: m = metri, medball = palla medica…).
 *          Unione in una classe: i risultati degli altri test passano a quello tenuto nelle caselle
 *          vuote; se una casella è già piena con un valore diverso NON si perde nulla: quel test resta
 *          con i soli valori diversi. Scheda e tabella dei voti: si riempiono solo i campi vuoti.
 *          Si unisce una volta sola, dall'elenco 📚: i doppioni si tolgono dall'elenco e IN OGNI CLASSE
 *          i test con quei nomi diventano uno, con il nome del test tenuto e tutti i risultati.
 *          Si confrontano anche i test che ci sono solo nelle classi (non nell'elenco).
 * Dipende da: App.LibroVoti (parole, converti), App.ElencoTest, App.Test, App.Voti, App.SchedaTest, App.U
 *          Si può anche unire "a mano" (compatibili: stesso tipo di misura e stessa direzione).
 * Usato da: ui/finestra-doppioni.js, ui/lista-test.js
 */
(function (App) {
  'use strict';

  var VUOTE = ['con', 'dei', 'del', 'della', 'delle', 'dal', 'dalla', 'alla', 'per', 'tra', 'sul', 'sui', 'test', 'prova'];

  function parole(n) {
    n = String(n || '').replace(/([0-9]+(?:[.,][0-9]+)?)\s*km\b/gi, function (x, v) { return Math.round(parseFloat(v.replace(',', '.')) * 1000) + ' m'; })   // 1 km = 1000 m
      .replace(/([0-9])([a-zA-Z])/g, '$1 $2').replace(/([a-zA-Z])([0-9])/g, '$1 $2');   // 3kg = 3 kg
    return App.LibroVoti.parole(n).filter(function (w) { return VUOTE.indexOf(w) < 0; });
  }
  // Parole uguali, o di almeno 5 lettere che differiscono per una lettera sola (Sergent = Sargent)
  function quasi(x, y) {
    if (x === y) return true;
    if (x.length < 5 || y.length < 5 || Math.abs(x.length - y.length) > 1) return false;
    var i = 0, j = 0, dif = 0;
    while (i < x.length && j < y.length) {
      if (x[i] === y[j]) { i++; j++; continue; }
      if (++dif > 1) return false;
      if (x.length > y.length) i++; else if (y.length > x.length) j++; else { i++; j++; }
    }
    return dif + (x.length - i) + (y.length - j) <= 1;
  }
  function contenuto(a, b) { return a.every(function (w) { return b.some(function (v) { return quasi(w, v); }); }); }

  function simili(a, b) {
    if (a.tipo !== b.tipo || a.migliore !== b.migliore) return false;
    var ua = App.U.chiaveNome(a.unita || ''), ub = App.U.chiaveNome(b.unita || '');
    if (a.tipo !== 'tempo' && ua && ub && ua !== ub) return false;      // unità non scritta: va bene
    var pa = parole(a.nome), pb = parole(b.nome);
    var na = pa.filter(function (w) { return /^[0-9]+$/.test(w); }).sort().join(' ');
    var nb = pb.filter(function (w) { return /^[0-9]+$/.test(w); }).sort().join(' ');
    if (na && nb && na !== nb) return false;                            // numeri solo in un nome: va bene
    pa = pa.filter(function (w) { return !/^[0-9]+$/.test(w); });
    pb = pb.filter(function (w) { return !/^[0-9]+$/.test(w); });
    if (!pa.length || !pb.length) return App.U.chiaveNome(a.nome) === App.U.chiaveNome(b.nome);
    return contenuto(pa, pb) || contenuto(pb, pa);
  }

  function numeri(t) { return parole(t.nome).filter(function (w) { return /^[0-9]+$/.test(w); }).sort().join(' '); }

  // Gruppi di test simili (almeno 2) -> [[t, t…], …]. In un gruppo non finiscono mai test con numeri
  // diversi (Sprint 30 e Velocità 60/80); un test senza numeri simile a test con numeri diversi
  // (es. "Velocità mt piani") è ambiguo: resta fuori, si unisce a mano.
  function gruppi(lista) {
    var ambigui = lista.filter(function (t) {
      if (numeri(t)) return false;
      var n = {};
      lista.forEach(function (x) { if (x !== t && numeri(x) && simili(t, x)) n[numeri(x)] = true; });
      return Object.keys(n).length > 1;
    });
    var l = lista.filter(function (t) { return ambigui.indexOf(t) < 0; }), gr = [];
    l.forEach(function (t) {
      var g = gr.filter(function (g) {
        return g.some(function (x) { return simili(t, x); }) &&
          g.every(function (x) { return !numeri(x) || !numeri(t) || numeri(x) === numeri(t); });
      })[0];
      if (g) g.push(t); else gr.push([t]);
    });
    return gr.filter(function (g) { return g.length > 1; });
  }

  // Il test da tenere proposto: del libro, con la tabella dei voti, con più risultati (in tutte le classi), nome più lungo
  function risultatiTotali(nome) {
    return nelleClassi(nome).reduce(function (n, x) { return n + App.Test.quantiRisultati(x.classe, x.test.id); }, 0);
  }

  function proposto(gr) {
    function punti(t) {
      return (t.libro || t.daLibro || t.fonte ? 1000 : 0) + (App.Voti.haTabella(t) || t.fasce ? 500 : 0) +
        risultatiTotali(t.nome) * 2 + t.nome.length / 100;
    }
    return gr.slice().sort(function (a, b) { return punti(b) - punti(a); })[0];
  }

  // Campi vuoti del test tenuto riempiti da un altro
  function completa(tieni, t) {
    App.SchedaTest.campi().forEach(function (c) { if (!tieni[c.id] && t[c.id]) tieni[c.id] = t[c.id]; });
    ['tipologia', 'fonte', 'strumento', 'note'].forEach(function (c) { if (!tieni[c] && t[c]) tieni[c] = t[c]; });
    if (!App.Voti.haTabella(tieni) && !tieni.fasce) {
      if (t.fasce) tieni.fasce = App.U.copia(t.fasce);
      if (t.voti) { tieni.voti = App.U.copia(t.voti); if (t.fasciaVoti) tieni.fasciaVoti = t.fasciaVoti; if (t.daLibro) tieni.daLibro = t.daLibro; }
    }
  }

  // Unisce nella classe i test "altri" dentro "tieni". -> { spostati, uguali, diversi, tolti: [nomi], rimasti: [nomi] }
  function unisciInClasse(classe, tieni, altri) {
    var r = { spostati: 0, uguali: 0, diversi: 0, tolti: [], rimasti: [] };
    altri.forEach(function (t) {
      completa(tieni, t);
      var resta = false;
      Object.keys(classe.risultati).forEach(function (a) {
        var prove = classe.risultati[a][t.id];
        if (!prove) return;
        Object.keys(prove).forEach(function (p) {
          var v = prove[p], nv = App.LibroVoti.converti(t, tieni, v), ora = App.Test.valore(classe, a, tieni.id, p);
          if (nv === null) { resta = true; r.diversi++; return; }
          if (!ora) { App.Test.imposta(classe, a, tieni.id, p, nv); App.Test.imposta(classe, a, t.id, p, ''); r.spostati++; }
          else if (App.Test.numero(tieni, ora) === App.Test.numero(tieni, nv)) { App.Test.imposta(classe, a, t.id, p, ''); r.uguali++; }
          else { resta = true; r.diversi++; }
        });
      });
      if (resta) r.rimasti.push(t.nome);
      else { App.Test.elimina(classe, t.id); r.tolti.push(t.nome); }
      App.ElencoTest.tutti().forEach(function (e) { if (e.origine && e.origine.c === classe.id && e.origine.t === t.id) delete e.origine; });
    });
    App.Test.ordina(classe);
    return r;
  }

  function inElenco(t) { return App.ElencoTest.tutti().indexOf(t) >= 0; }
  function delLibro(t) { return (App.TestLibro || []).indexOf(t) >= 0; }

  // Voci da confrontare: test dell'elenco, test del libro non ancora nell'elenco e test che ci sono
  // solo nelle classi (uno per nome)
  function voci() {
    var l = App.ElencoTest.tutti().slice(), visti = {};
    l.forEach(function (t) { visti[k(t.nome)] = true; });
    (App.TestLibro || []).forEach(function (p) { if (!visti[k(p.nome)]) { l.push(p); visti[k(p.nome)] = true; } });
    App.Stato.dati.classi.forEach(function (c) {
      c.test.forEach(function (t) { if (!visti[k(t.nome)]) { l.push(t); visti[k(t.nome)] = true; } });
    });
    return l;
  }
  function k(n) { return App.U.chiaveNome(n || ''); }

  // Classi con un test di quel nome -> [{ classe, test }]
  function nelleClassi(nome) {
    var out = [];
    App.Stato.dati.classi.forEach(function (c) {
      c.test.forEach(function (t) { if (k(t.nome) === k(nome)) out.push({ classe: c, test: t }); });
    });
    return out;
  }

  // Gruppi da proporre: almeno 2 test "veri" (elenco o classi), oppure un mio test simile a uno del libro
  function gruppiTutti() {
    return gruppi(voci()).filter(function (g) {
      var veri = g.filter(function (t) { return !delLibro(t); });
      return veri.length > 1 || veri.some(function (t) { return !t.libro; });
    });
  }

  // Unisce nell'elenco 📚 E in tutte le classi: i test "altri" diventano "tieni" (stesso nome).
  // Nelle classi il test che resta prende il nome di "tieni" e riceve i risultati degli altri.
  // -> { nome, tolti: [nomi tolti dall'elenco], classi: [{ nome, spostati, diversi, rimasti, rinominato }] }
  function unisci(tieni, altri) {
    var elenco = App.ElencoTest.tutti(), nome = tieni.nome, out = { nome: nome, tolti: [], classi: [] };
    var nomi = [k(nome)].concat(altri.map(function (t) { return k(t.nome); }));
    // classi
    App.Stato.dati.classi.forEach(function (c) {
      var ct = c.test.filter(function (t) { return nomi.indexOf(k(t.nome)) >= 0; });
      if (!ct.length) return;
      var dest = ct.filter(function (t) { return k(t.nome) === k(nome); })[0] ||
        ct.slice().sort(function (a, b) { return App.Test.quantiRisultati(c, b.id) - App.Test.quantiRisultati(c, a.id); })[0];
      var r = { nome: c.nome, spostati: 0, diversi: 0, rimasti: [], rinominato: dest.nome !== nome };
      dest.nome = nome;
      App.SchedaTest.campi().forEach(function (x) { if (!dest[x.id] && tieni[x.id]) dest[x.id] = tieni[x.id]; });
      if (!dest.tipologia && tieni.tipologia) dest.tipologia = tieni.tipologia;
      var resto = ct.filter(function (t) { return t !== dest; });
      if (resto.length) { var x = unisciInClasse(c, dest, resto); r.spostati = x.spostati; r.diversi = x.diversi; r.rimasti = x.rimasti; }
      App.Test.ordina(c);
      out.classi.push(r);
    });
    // elenco
    var usato = [tieni].concat(altri).some(function (t) { return inElenco(t) && App.ElencoTest.inUso(t); });
    var tieniE = inElenco(tieni) ? tieni : null;
    if (!tieniE && delLibro(tieni)) tieniE = App.ElencoTest.usaDalLibro(tieni);
    if (!tieniE && altri.some(inElenco)) {                    // test che c'era solo nelle classi
      tieniE = App.U.copia(tieni); tieniE.id = App.U.nuovoId();
      delete tieniE.fasciaVoti; delete tieniE.origine; elenco.push(tieniE);
    }
    altri.forEach(function (t) {
      var i = elenco.indexOf(t);
      if (i < 0 || t === tieniE) return;
      if (tieniE) completa(tieniE, t);
      elenco.splice(i, 1);
      out.tolti.push(t.nome);
    });
    if (tieniE && usato) delete tieniE.inUso;
    App.Test.ordina(App.ElencoTest.contenitore());
    return out;
  }

  function quanti() { return gruppiTutti().length; }

  // Unibili a mano: stesso tipo di misura, stessa direzione, unità uguale (o non scritta)
  function perche(a, b) {
    var ua = k(a.unita), ub = k(b.unita);
    if (a.tipo !== b.tipo) return 'uno è ' + (a.tipo === 'tempo' ? 'un tempo' : 'una misura') + ', l\'altro ' + (b.tipo === 'tempo' ? 'un tempo' : 'una misura');
    if (a.migliore !== b.migliore) return 'in uno è meglio ' + (a.migliore === 'alto' ? 'più alto' : 'più basso') + ', nell\'altro il contrario';
    if (a.tipo !== 'tempo' && ua && ub && ua !== ub) return 'unità diverse (' + a.unita + ' e ' + b.unita + ')';
    return '';
  }
  function compatibili(a, b) { return a !== b && !perche(a, b); }

  App.Doppioni = { simili: simili, compatibili: compatibili, gruppi: gruppi, proposto: proposto, unisciInClasse: unisciInClasse,
    perche: perche, voci: voci, nelleClassi: nelleClassi, risultatiTotali: risultatiTotali, gruppiTutti: gruppiTutti, unisci: unisci, inElenco: inElenco, delLibro: delLibro, quanti: quanti };
})(window.App = window.App || {});
