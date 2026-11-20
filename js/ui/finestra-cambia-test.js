/* finestra-cambia-test.js
 * Cosa fa: finestra "🔄 Cambia con un test affine": elenco dei test della stessa tipologia (📚 elenco,
 *          📖 libro della classe) con la misura; dice che cosa succede ai risultati già scritti e
 *          "🔄 Cambia" (servizi/cambia-test.js).
 * Dipende da: App.U, App.CambiaTest, App.Test, App.Stato, App.Avvisi, App.Finestra, App.UI.disegnaContenuto
 * Usato da: ui/finestra-test.js
 */
(function (App) {
  'use strict';

  App.UI = App.UI || {};
  var el = function () { return App.U.el.apply(null, arguments); };

  function misura(t) {
    if (t.tipo === 'tempo') return t.formatoTempo === 'min' ? 'tempo min:sec' : 'tempo in secondi';
    return (t.unita || 'numero') + (t.migliore === 'alto' ? ' ↑' : ' ↓');
  }

  App.UI.FinestraCambiaTest = {
    apri: function (classe, vecchio) {
      var lista = App.CambiaTest.affini(classe, vecchio), scelto = null;
      var n = App.Test.quantiRisultati(classe, vecchio.id);
      if (!lista.length) {
        App.Avvisi.toast('Nessun altro test "' + (vecchio.tipologia || 'della stessa tipologia') + '" nell\'elenco 📚 o nel libro della classe. Puoi crearne uno in 📚 Test.', 'info', 6000);
        return;
      }
      var esito = el('p', { class: 'suggerimento' });
      function spiega() {
        if (!scelto) { esito.textContent = 'Scegli il test nuovo.'; return; }
        if (!n) esito.textContent = '"' + vecchio.nome + '" non ha risultati: viene sostituito da "' + scelto.nome + '".';
        else if (App.CambiaTest.stessaMisura(vecchio, scelto)) esito.textContent = 'Stessa misura: i ' + n + ' risultati già scritti passano a "' + scelto.nome + '".';
        else esito.textContent = '⚠️ Misura diversa (' + misura(vecchio) + ' → ' + misura(scelto) + '): i ' + n + ' risultati di "' + vecchio.nome + '" non si possono convertire. "' + vecchio.nome + '" resta nella classe con i suoi risultati, accanto al nuovo: lo togli tu quando vuoi.';
      }
      var ul = el('ul', { class: 'lista lista-cambia' }, lista.map(function (x, i) {
        var r = el('input', { type: 'radio', name: 'cambia-' + vecchio.id, 'aria-label': x.t.nome });
        r.addEventListener('change', function () { scelto = x.t; spiega(); });
        return el('li', {}, el('label', { class: 'scelta' }, r, ' ', el('b', { text: x.t.nome }),
          el('span', { class: 'piccolo', text: ' · ' + misura(x.t) + ' · ' + (x.fonte === 'libro' ? '📖 libro' : '📚 elenco') +
            (App.CambiaTest.stessaMisura(vecchio, x.t) ? ' · stessa misura' : '') })));
      }));
      spiega();
      App.Finestra.apri({
        titolo: 'Cambia "' + vecchio.nome + '"', icona: '🔄', fuoco: false,
        corpo: el('div', { class: 'modulo' },
          el('p', { class: 'piccolo', text: 'Test affini (' + (vecchio.tipologia || 'stessa tipologia') + ') dall\'elenco 📚 e dal libro della classe. Il nuovo prende lo stesso posto nella tabella.' }),
          ul, esito),
        pulsanti: [{ testo: 'Annulla', tipo: 'neutro' }, { testo: '🔄 Cambia', tipo: 'ok', azione: function () {
          if (!scelto) { App.Avvisi.toast('Scegli il test nuovo.', 'info'); return false; }
          var r = App.CambiaTest.cambia(classe, vecchio, scelto);
          App.Stato.salva();
          App.UI.disegnaContenuto();
          App.Avvisi.toast('✔ ' + classe.nome + ': "' + r.nuovo.nome + '" al posto di "' + vecchio.nome + '"' +
            (r.spostati ? '; ' + r.spostati + ' risultati spostati' : '') +
            (r.vecchioResta ? '. "' + vecchio.nome + '" resta con i suoi risultati (misura diversa).' : '.'), r.vecchioResta ? 'info' : 'ok', 8000);
        } }]
      });
    }
  };
})(window.App = window.App || {});
