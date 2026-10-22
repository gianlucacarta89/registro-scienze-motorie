/* finestra-copia-test.js
 * Cosa fa: finestra "📋 Copia test": copia i test scelti (con tipologia, strumento e tabella
 *          dei voti, senza risultati) in un'altra classe. Utile per avere la stessa batteria
 *          di test in più classi e cambiare poi solo strumento o tabella dove serve.
 * Dipende da: App.U, App.Classi, App.Test, App.Stato, App.Avvisi, App.Finestra
 * Usato da: ui/tabella-test.js (pulsante 📋 Copia test)
 */
(function (App) {
  'use strict';

  App.UI = App.UI || {};
  var el = function () { return App.U.el.apply(null, arguments); };

  App.UI.FinestraCopiaTest = {
    apri: function (classe) {
      var altre = App.Classi.tutte().filter(function (c) { return c.id !== classe.id; });
      if (!altre.length) { App.Avvisi.toast('Crea prima un\'altra classe (🏫 Classi) in cui copiare i test.', 'info', 5000); return; }
      if (!classe.test.length) { App.Avvisi.toast('In questa classe non ci sono ancora test da copiare.', 'info'); return; }

      var verso = el('select', { 'aria-label': 'Classe di arrivo' }, altre.map(function (c) { return el('option', { value: c.id, text: c.nome }); }));
      var caselle = classe.test.map(function (t) {
        return { t: t, cb: el('input', { type: 'checkbox', checked: true, 'aria-label': t.nome }) };
      });

      App.Finestra.apri({
        titolo: 'Copia test da ' + classe.nome, icona: '📋',
        corpo: el('div', { class: 'modulo' },
          el('label', { class: 'campo' }, el('span', { text: 'Copia nella classe' }), verso),
          el('fieldset', { class: 'campo' }, el('legend', { text: 'Test da copiare' }),
            caselle.map(function (x) {
              return el('label', { class: 'scelta' }, x.cb, ' ' + x.t.nome + (App.Voti.haTabella(x.t) ? ' 📏' : ''));
            })),
          el('p', { class: 'piccolo', text: 'Si copiano nome, tipologia, strumento e tabella dei voti (📏), non i risultati. I test con lo stesso nome già presenti nell\'altra classe non si toccano.' })),
        pulsanti: [
          { testo: 'Annulla', tipo: 'neutro' },
          { testo: '📋 Copia', tipo: 'ok', azione: function () {
            var ids = caselle.filter(function (x) { return x.cb.checked; }).map(function (x) { return x.t.id; });
            if (!ids.length) { App.Avvisi.toast('Scegli almeno un test.', 'info'); return false; }
            var dest = App.Classi.trova(verso.value);
            var r = App.Test.copia(classe, ids, dest);
            App.Stato.salva();
            App.Avvisi.toast('✔ Copiati ' + r.copiati + ' test in ' + dest.nome +
              (r.saltati.length ? '. Già presenti, non copiati: ' + r.saltati.join(', ') : '') + '.', r.copiati ? 'ok' : 'info', 6000);
          } }
        ]
      });
    }
  };
})(window.App = window.App || {});
