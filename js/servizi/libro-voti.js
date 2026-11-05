/* libro-voti.js
 * Cosa fa: collega i test di una classe ai test del libro (App.TestLibro) per le tabelle dei voti:
 *          trova i test del libro compatibili (stesso tipo e direzione), il più simile per primo
 *          (nome con qualche sinonimo + tipologia), applica a un test la tabella del libro della
 *          fascia scelta (e la scheda nei campi vuoti) oppure la toglie. I risultati non si toccano.
 *          "Sostituisci": il test della classe diventa del tutto il test del libro, con i suoi risultati.
 * Dipende da: App.TestLibro, App.SchedaTest, App.U, App.Test, App.Voti, App.ElencoTest
 * Usato da: ui/finestra-voti.js, ui/finestra-voti-classe.js
 *
 * Dati: test.daLibro = nome del test del libro da cui viene la tabella; test.fasciaVoti = 'b1'|'b2'|'q'
 */
(function (App) {
  'use strict';

  // Parole di un nome di test, con qualche sinonimo (medball = palla medica, m = metri, velocità = sprint)
  var SINONIMI = { medball: 'palla medica', mb: 'palla medica', m: 'metri', mt: 'metri', velocita: 'sprint',
    corda: 'funicella', flessioni: 'piegamenti', addominali: 'addominali' };

  function parole(n) {
    var l = String(n || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[^a-z0-9]+/);
    return l.map(function (w) { return SINONIMI[w] || w; }).join(' ').split(' ')
      .filter(function (w) { return w.length > 2 || /^[0-9]+$/.test(w); });
  }

  // Test del libro compatibili con t (stesso tipo e direzione), il più simile per primo -> [{ p, punti }]
  function compatibili(t) {
    var mie = parole(t.nome);
    return (App.TestLibro || []).filter(function (p) { return p.tipo === t.tipo && p.migliore === t.migliore; })
      .map(function (p) {
        var uguale = App.U.chiaveNome(p.nome) === App.U.chiaveNome(t.nome) || p.nome === t.daLibro;
        var punti = (uguale ? 100 : 0) +
          parole(p.nome).filter(function (w) { return mie.some(function (m) { return m === w || (m.length > 4 && w.indexOf(m.slice(0, 5)) === 0); }); }).length * 2 +
          (App.U.chiaveNome(p.tipologia) === App.U.chiaveNome(t.tipologia || '') ? 1 : 0);
        return { p: p, punti: punti };
      })
      .sort(function (a, b) { return b.punti - a.punti || a.p.nome.localeCompare(b.p.nome); });
  }

  // Il test del libro proposto per t (o null se nessuno è compatibile o somigliante)
  function proposto(t) {
    var l = compatibili(t);
    return l.length && l[0].punti > 1 ? l[0].p : null;
  }

  function trova(nome) { return (App.TestLibro || []).filter(function (p) { return p.nome === nome; })[0] || null; }

  // Tabella del libro per una fascia (o quella unica)
  function tabella(p, fascia) { return p.fasce ? (p.fasce[fascia] || null) : (p.voti || null); }

  // Applica a t la tabella del libro p nella fascia; la scheda solo nei campi vuoti. -> true se fatto
  function applica(t, p, fascia) {
    var tab = tabella(p, fascia);
    if (!tab) return false;
    t.voti = App.U.copia(tab);
    if (p.fasce) t.fasciaVoti = fascia; else delete t.fasciaVoti;
    t.daLibro = p.nome;
    App.SchedaTest.campi().forEach(function (c) { if (!t[c.id] && p[c.id]) t[c.id] = p[c.id]; });
    if (!t.fonte && p.fonte) t.fonte = p.fonte;
    if (p.negativi) t.negativi = true;
    return true;
  }

  // Toglie la tabella dei voti (i risultati restano)
  function togli(t) { delete t.voti; delete t.fasciaVoti; delete t.daLibro; }

  var CAMPI_TEST = ['nome', 'tipologia', 'tipo', 'formatoTempo', 'unita', 'migliore', 'perSesso', 'strumento', 'strumentoM', 'strumentoF', 'negativi', 'fonte'];

  // Il test del libro da usare: la copia nell'elenco 📚 (se c'è, magari ritoccata) o quella del libro
  function modello(nome) {
    var k = App.U.chiaveNome(nome);
    var e = App.ElencoTest.tutti().filter(function (x) { return App.U.chiaveNome(x.nome) === k; })[0];
    return e && (e.fasce || e.voti) ? e : trova(nome);
  }

  // Un risultato del vecchio test riscritto per il nuovo ('' se non si può)
  function converti(vecchio, nuovo, v) {
    var n = App.Test.numero(vecchio, v);
    if (n === null || isNaN(n)) return null;
    var testo = String(Math.round(n * 100) / 100).replace('.', ',');
    if (nuovo.tipo === 'tempo' && App.Test.formato(nuovo) === 'min') {
      var s = Math.round(n * 100) / 100, m = Math.floor(s / 60), r = Math.round((s - m * 60) * 100) / 100;
      testo = m + ':' + (r < 10 ? '0' : '') + String(r).replace('.', ',');
    }
    var x = App.Test.valida(nuovo, testo);
    return x.ok ? x.valore : null;
  }

  // Sostituisce il test t della classe con il test del libro p (fascia della classe): il test prende
  // nome, misura, strumento, scheda e tabella del libro; i risultati restano (riscritti nel formato nuovo).
  // Se nella classe c'è già il test del libro, i risultati si uniscono lì e t sparisce.
  // -> { nome, unito, spostati, nonConvertiti }
  function sostituisci(classe, t, p, fascia) {
    var vecchio = App.U.copia(t), out = { nome: p.nome, unito: false, spostati: 0, nonConvertiti: 0 };
    var k = App.U.chiaveNome(p.nome);
    var gia = classe.test.filter(function (x) { return x.id !== t.id && App.U.chiaveNome(x.nome) === k; })[0];
    var dest = gia || t;
    if (!gia) {
      CAMPI_TEST.forEach(function (c) { if (p[c] !== undefined) t[c] = App.U.copia(p[c]); else delete t[c]; });
      App.SchedaTest.campi().forEach(function (c) { if (p[c.id]) t[c.id] = p[c.id]; });
      applica(t, p, fascia);
    } else if (!App.Voti.haTabella(gia)) applica(gia, p, fascia);
    // risultati: riscritti per il test di arrivo
    Object.keys(classe.risultati).forEach(function (a) {
      var r = classe.risultati[a][vecchio.id];
      if (!r) return;
      Object.keys(r).forEach(function (prova) {
        var v = r[prova], nv = converti(vecchio, dest, v);
        if (nv === null) { out.nonConvertiti++; return; }
        if (gia) {
          if (!App.Test.valore(classe, a, gia.id, prova)) { App.Test.imposta(classe, a, gia.id, prova, nv); out.spostati++; }
        } else { App.Test.imposta(classe, a, t.id, prova, nv); out.spostati++; }
      });
    });
    if (gia && !out.nonConvertiti) { App.Test.elimina(classe, t.id); out.unito = true; }
    // il test non è più "suo": la copia nell'elenco 📚 non lo segue più
    App.ElencoTest.tutti().forEach(function (e) { if (e.origine && e.origine.c === classe.id && e.origine.t === vecchio.id) delete e.origine; });
    App.Test.ordina(classe);
    return out;
  }

  App.LibroVoti = { parole: parole, compatibili: compatibili, proposto: proposto, trova: trova, modello: modello, tabella: tabella,
    applica: applica, togli: togli, converti: converti, sostituisci: sostituisci };
})(window.App = window.App || {});
