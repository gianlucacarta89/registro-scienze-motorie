/* doppioni.js
 * Cosa fa: trova i test "doppioni" (nomi simili) nell'elenco 📚 e nelle classi e li unisce in uno.
 *          Simili = stesso tipo di misura, stessa direzione (meglio alto/basso), stessa unità (o non
 *          scritta), stessi numeri nel nome (Sprint 30 ≠ Sprint 60, palla 3 kg ≠ 4 kg; numeri in un nome
 *          solo = va bene) e parole uguali o una contenuta nell'altra (con i sinonimi di libro-voti.js: m = metri, medball = palla medica…).
 *          Unione in una classe: i risultati degli altri test passano a quello tenuto nelle caselle
 *          vuote; se una casella è già piena con un valore diverso NON si perde nulla: quel test resta
 *          con i soli valori diversi. Scheda e tabella dei voti: si riempiono solo i campi vuoti.
 *          Unione nell'elenco: i test non tenuti si tolgono (non hanno risultati).
 * Dipende da: App.LibroVoti (parole, converti), App.ElencoTest, App.Test, App.Voti, App.SchedaTest, App.U
 *          Si può anche unire "a mano" (compatibili: stesso tipo di misura e stessa direzione).
 * Usato da: ui/finestra-doppioni.js, ui/lista-test.js
 */
(function (App) {
  'use strict';

  var VUOTE = ['con', 'dei', 'del', 'della', 'delle', 'dal', 'dalla', 'alla', 'per', 'tra', 'sul', 'sui', 'test', 'prova'];

  function parole(n) {
    n = String(n || '').replace(/([0-9])([a-zA-Z])/g, '$1 $2').replace(/([a-zA-Z])([0-9])/g, '$1 $2');   // 3kg = 3 kg
    return App.LibroVoti.parole(n).filter(function (w) { return VUOTE.indexOf(w) < 0; });
  }
  function contenuto(a, b) { return a.every(function (w) { return b.indexOf(w) >= 0; }); }

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

  // Il test da tenere proposto: del libro, con la tabella dei voti, con più risultati, nome più lungo
  function proposto(gr, classe) {
    function punti(t) {
      return (t.libro || t.daLibro || t.fonte ? 1000 : 0) + (App.Voti.haTabella(t) || t.fasce ? 500 : 0) +
        (classe ? App.Test.quantiRisultati(classe, t.id) * 2 : 0) + t.nome.length / 100;
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

  // Unisce nell'elenco 📚. tieni può essere un test del libro non ancora nell'elenco. -> { tieni, tolti: [nomi] }
  function unisciInElenco(tieni, altri) {
    var elenco = App.ElencoTest.tutti(), usato = [tieni].concat(altri).some(function (t) { return elenco.indexOf(t) >= 0 && App.ElencoTest.inUso(t); });
    if (elenco.indexOf(tieni) < 0) tieni = App.ElencoTest.usaDalLibro(tieni);
    var tolti = [];
    altri.forEach(function (t) {
      var i = elenco.indexOf(t);
      if (i < 0 || t === tieni) return;                 // test del libro fuori dall'elenco: niente da togliere
      completa(tieni, t);
      if (!tieni.origine && t.origine) tieni.origine = t.origine;
      elenco.splice(i, 1);
      tolti.push(t.nome);
    });
    if (usato) delete tieni.inUso;
    App.Test.ordina(App.ElencoTest.contenitore());
    return { tieni: tieni, tolti: tolti };
  }

  // Voci dell'elenco da confrontare: test dell'elenco + test del libro non ancora nell'elenco
  function vociElenco() {
    var l = App.ElencoTest.tutti().slice();
    (App.TestLibro || []).forEach(function (p) { if (!App.ElencoTest.nellElenco(p.nome)) l.push(p); });
    return l;
  }

  // Gruppi dell'elenco da proporre: almeno 2 test nell'elenco, oppure un mio test simile a uno del libro
  function gruppiElenco() {
    var el = App.ElencoTest.tutti();
    return gruppi(vociElenco()).filter(function (g) {
      var dentro = g.filter(function (t) { return el.indexOf(t) >= 0; });
      return dentro.length > 1 || dentro.some(function (t) { return !t.libro; });
    });
  }

  function quanti() {
    var n = gruppiElenco().length;
    App.Stato.dati.classi.forEach(function (c) { n += gruppi(c.test).length; });
    return n;
  }

  // Unibili a mano: stesso tipo di misura e stessa direzione
  function compatibili(a, b) { return a !== b && a.tipo === b.tipo && a.migliore === b.migliore; }

  App.Doppioni = { simili: simili, compatibili: compatibili, gruppi: gruppi, proposto: proposto, unisciInClasse: unisciInClasse,
    unisciInElenco: unisciInElenco, gruppiElenco: gruppiElenco, quanti: quanti };
})(window.App = window.App || {});
