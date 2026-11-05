/* test-derivati.js
 * Cosa fa: aggiunge ai test del libro quelli ricavati da un test del libro (config.js > testDerivati),
 *          per esempio "Velocità 60 m ♀ / 80 m ♂" dallo Sprint 30 metri: ogni soglia della tabella
 *          della base (per fascia, alunni e alunne) moltiplicata per il coefficiente di quel sesso.
 *          La soglia "di comodo" del voto più basso (999, 0…) resta com'è.
 * Dipende da: App.Config (testDerivati), App.TestLibro, App.U
 * Usato da: avvio.js (App.TestDerivati.aggiungi)
 */
(function (App) {
  'use strict';

  function numero(s) { return Number(String(s).replace(',', '.')); }
  function testo(n) { return String(Math.round(n * 100) / 100).replace('.', ','); }

  // Tabella {righe} della base -> tabella scalata con i coefficienti per M e F
  function scala(tab, coeff) {
    return { righe: tab.righe.map(function (r, i, tutte) {
      var ultima = i === tutte.length - 1 && i > 0;          // soglia di comodo: non si scala
      var x = { voto: r.voto };
      ['M', 'F'].forEach(function (sx) { x[sx] = ultima || !r[sx] ? r[sx] : testo(numero(r[sx]) * coeff[sx]); });
      return x;
    }) };
  }

  function crea(d, base) {
    var t = App.U.copia(base);
    t.nome = d.nome;
    t.perSesso = true; t.strumento = ''; t.strumentoM = d.distanza.M; t.strumentoF = d.distanza.F;
    ['descrizione', 'materiale', 'esecuzione', 'misura', 'differenze'].forEach(function (k) { if (d[k]) t[k] = d[k]; });
    t.fonte = 'Calcolato dal test "' + base.nome + '" (' + base.fonte + '): ♀ × ' + testo(d.coeff.F) + ', ♂ × ' + testo(d.coeff.M);
    t.derivato = true;
    if (base.fasce) {
      t.fasce = {};
      Object.keys(base.fasce).forEach(function (f) { t.fasce[f] = scala(base.fasce[f], d.coeff); });
    } else if (base.voti) t.voti = scala(base.voti, d.coeff);
    return t;
  }

  App.TestDerivati = {
    scala: scala,
    // Una volta all'avvio: mette i test derivati in App.TestLibro, subito dopo la loro base
    aggiungi: function () {
      var libro = App.TestLibro || [];
      (App.Config.testDerivati || []).forEach(function (d) {
        if (libro.some(function (t) { return t.nome === d.nome; })) return;
        var i = libro.findIndex(function (t) { return t.nome === d.base; });
        if (i < 0) return;
        libro.splice(i + 1, 0, crea(d, libro[i]));
      });
    }
  };
})(window.App = window.App || {});
