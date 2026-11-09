/* migra-sprint.js
 * Cosa fa: aggiornamento dei dati alla v7.5 (all'avvio e per i backup vecchi, da App.Stato.normalizza).
 *          Lo "Sprint 30 metri" del libro si chiama "Sprint" (i metri si scelgono con ⚙️) e il test
 *          "Velocità 60 m ♀ / 80 m ♂" non c'è più:
 *            - nelle classi e nell'elenco: "Sprint 30 metri" -> "Sprint" (anche i collegamenti al libro)
 *            - nelle classi: "Velocità 60 m ♀ / 80 m ♂" -> "Sprint" con ⚙️ ♂ 80 m / ♀ 60 m; risultati e
 *              tabella dei voti restano quelli di prima. Se nella classe c'è già uno "Sprint" si chiama
 *              "Sprint (♂ 80 m, ♀ 60 m)".
 *            - nell'elenco: la copia di "Velocità 60 m ♀ / 80 m ♂" si toglie (non ha risultati).
 *          Non si cancella nessun risultato.
 * Dipende da: App.U (chiaveNome)
 * Usato da: core/stato.js (normalizza)
 */
(function (App) {
  'use strict';

  var VECCHIO = 'Sprint 30 metri', NUOVO = 'Sprint', DERIVATO = 'Velocità 60 m ♀ / 80 m ♂';

  function k(n) { return App.U.chiaveNome(n || ''); }
  function ceGia(lista, nome, tranne) { return lista.some(function (t) { return t !== tranne && k(t.nome) === k(nome); }); }

  function sistema(lista, classe) {
    lista.forEach(function (t) {
      if (t.daLibro === VECCHIO) t.daLibro = NUOVO;
      if (t.parametro && t.parametro.libro === VECCHIO) t.parametro.libro = NUOVO;
      var sprint = k(t.nome) === k(VECCHIO) || (t.parametro && t.parametro.libro === NUOVO && /^sprint/.test(k(t.nome)));
      if (sprint && k(t.nome) !== k(NUOVO) && !ceGia(lista, NUOVO, t)) {
        if (!t.parametro && !t.strumento && !t.perSesso) t.strumento = '30 m';
        t.nome = NUOVO;
      }
      if (classe && k(t.nome) === k(DERIVATO)) {
        t.nome = ceGia(lista, NUOVO, t) ? 'Sprint (♂ 80 m, ♀ 60 m)' : NUOVO;
        t.parametro = { libro: NUOVO, M: 80, F: 60 };
        t.daLibro = NUOVO;
        t.perSesso = true; t.strumento = ''; t.strumentoM = '80 m'; t.strumentoF = '60 m';
        delete t.derivato;
      }
    });
  }

  App.MigraSprint = {
    applica: function (d) {
      d.classi.forEach(function (c) { sistema(c.test, true); });
      sistema(d.archivio.test, false);
      d.archivio.test = d.archivio.test.filter(function (t) { return k(t.nome) !== k(DERIVATO); });
      return d;
    }
  };
})(window.App = window.App || {});
