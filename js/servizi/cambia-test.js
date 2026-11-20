/* cambia-test.js
 * Cosa fa: "🔄 Cambia con un test affine" (⏱️ Sessioni): sostituisce un test della classe con un altro
 *          della stessa tipologia preso dall'elenco 📚 o dal libro della classe (es. Corsa di 1 km ->
 *          Corsa 6 minuti). Il test nuovo prende lo stesso posto. Risultati, senza perdere nulla:
 *            - stessa misura (tipo, direzione, unità): passano al test nuovo (riscritti nel suo formato);
 *            - misura diversa (es. minuti -> metri): non si possono convertire, il test vecchio RESTA
 *              con i suoi risultati accanto al nuovo (lo toglie il docente se vuole);
 *            - senza risultati: il test vecchio si toglie.
 * Dipende da: App.U, App.Libri, App.ElencoTest, App.Test, App.LibroVoti (converti), App.SchedaTest
 * Usato da: ui/finestra-cambia-test.js
 */
(function (App) {
  'use strict';

  function k(n) { return App.U.chiaveNome(n || ''); }

  // Stessa misura: i risultati si possono riscrivere nel test nuovo
  function stessaMisura(a, b) {
    return a.tipo === b.tipo && a.migliore === b.migliore && (a.tipo === 'tempo' || k(a.unita) === k(b.unita) || !a.unita || !b.unita);
  }

  App.CambiaTest = {
    stessaMisura: stessaMisura,

    // Test affini a t (stessa tipologia), non già nella classe: dall'elenco e dal libro della classe
    // -> [{ t, fonte: 'elenco'|'libro' }], prima quelli con la stessa misura
    affini: function (classe, t) {
      var nella = {}, visti = {}, out = [];
      classe.test.forEach(function (x) { nella[k(x.nome)] = true; });
      function prendi(x, fonte) {
        var kk = k(x.nome);
        if (nella[kk] || visti[kk] || !x.tipologia || x.tipologia !== t.tipologia) return;
        visti[kk] = true; out.push({ t: x, fonte: fonte });
      }
      App.ElencoTest.tutti().forEach(function (x) { prendi(x, 'elenco'); });
      App.Libri.testDi(classe).forEach(function (x) { prendi(x, 'libro'); });
      return out.sort(function (a, b) { return (stessaMisura(t, b.t) ? 1 : 0) - (stessaMisura(t, a.t) ? 1 : 0) || a.t.nome.localeCompare(b.t.nome); });
    },

    // -> { nuovo, spostati, nonConvertiti, vecchioResta }
    cambia: function (classe, vecchio, scelto) {
      var e = App.ElencoTest.tutti().indexOf(scelto) >= 0 ? scelto : App.ElencoTest.usaDalLibro(scelto);
      delete e.inUso;                                                   // ora è in uso
      var pos = classe.test.indexOf(vecchio);
      App.ElencoTest.aggiungiAClasse([e.id], classe, App.SchedaTest.fasciaDiClasse(classe) || 'b1');
      var nuovo = classe.test.filter(function (x) { return k(x.nome) === k(e.nome); })[0];
      var out = { nuovo: nuovo, spostati: 0, nonConvertiti: 0, vecchioResta: false };
      // lo stesso posto del vecchio
      classe.test.splice(classe.test.indexOf(nuovo), 1);
      classe.test.splice(Math.max(0, Math.min(pos, classe.test.length)), 0, nuovo);
      var conRisultati = App.Test.quantiRisultati(classe, vecchio.id) > 0;
      if (conRisultati && stessaMisura(vecchio, nuovo)) {
        Object.keys(classe.risultati).forEach(function (a) {
          var r = classe.risultati[a][vecchio.id];
          if (!r) return;
          Object.keys(r).forEach(function (p) {
            var nv = App.LibroVoti.converti(vecchio, nuovo, r[p]);
            if (nv === null) { out.nonConvertiti++; return; }
            App.Test.imposta(classe, a, nuovo.id, p, nv); out.spostati++;
          });
        });
      }
      if (!conRisultati || (stessaMisura(vecchio, nuovo) && !out.nonConvertiti)) App.Test.elimina(classe, vecchio.id);
      else out.vecchioResta = true;
      App.Test.ordina(classe);
      return out;
    }
  };
})(window.App = window.App || {});
