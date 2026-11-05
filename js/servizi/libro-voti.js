/* libro-voti.js
 * Cosa fa: collega i test di una classe ai test del libro (App.TestLibro) per le tabelle dei voti:
 *          trova i test del libro compatibili (stesso tipo e direzione), il più simile per primo
 *          (nome con qualche sinonimo + tipologia), applica a un test la tabella del libro della
 *          fascia scelta (e la scheda nei campi vuoti) oppure la toglie. I risultati non si toccano.
 * Dipende da: App.TestLibro, App.SchedaTest, App.U
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

  App.LibroVoti = { parole: parole, compatibili: compatibili, proposto: proposto, trova: trova, tabella: tabella, applica: applica, togli: togli };
})(window.App = window.App || {});
