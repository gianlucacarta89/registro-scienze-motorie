/* grafici.js
 * Cosa fa: grafici semplici a barre, fatti con HTML e CSS (niente librerie, funzionano offline
 *          e si adattano al telefono): colonne verticali e barre orizzontali, con il valore scritto
 *          e il dettaglio al passaggio del dito/mouse.
 * Dipende da: App.U
 * Usato da: ui/statistiche.js
 */
(function (App) {
  'use strict';

  App.UI = App.UI || {};
  var el = function () { return App.U.el.apply(null, arguments); };

  function tacche(max) {
    var passo = max <= 5 ? 1 : max <= 10 ? 2 : Math.ceil(max / 5);
    var out = [];
    for (var v = 0; v <= max; v += passo) out.push(v);
    return out;
  }

  App.UI.Grafici = {
    // dati: [{ etichetta, valore, tipo: 'buono'|'scarso'|'', titolo }]
    colonne: function (dati, opz) {
      opz = opz || {};
      var max = Math.max(1, Math.max.apply(null, dati.map(function (d) { return d.valore; })));
      var scala = tacche(max), alto = scala[scala.length - 1] < max ? max : scala[scala.length - 1];
      return el('figure', { class: 'grafico colonne', role: 'img', 'aria-label': opz.descrizione || '' },
        el('div', { class: 'area' },
          el('div', { class: 'griglia' }, scala.map(function (v) {
            return el('div', { class: 'linea', style: 'bottom:' + (v / alto * 100) + '%' }, el('span', { text: String(v) }));
          })),
          el('div', { class: 'barre' }, dati.map(function (d) {
            return el('div', { class: 'colonna', title: d.titolo || (d.etichetta + ': ' + d.valore), tabindex: '0' },
              el('span', { class: 'valore', text: d.valore ? String(d.valore) : '' }),
              el('div', { class: 'barra ' + (d.tipo || ''), style: 'height:' + (d.valore / alto * 100) + '%' }));
          }))),
        el('div', { class: 'etichette' }, dati.map(function (d) { return el('span', { text: d.etichetta }); })),
        opz.asse ? el('figcaption', { class: 'asse', text: opz.asse }) : null);
    },

    // dati: [{ etichetta, valore, testo, tipo }]; max = fondo scala; riferimento = linea (es. 6)
    barre: function (dati, opz) {
      opz = opz || {};
      var max = opz.max || Math.max.apply(null, dati.map(function (d) { return d.valore; })) || 1;
      return el('figure', { class: 'grafico barre-orizz', role: 'img', 'aria-label': opz.descrizione || '' },
        dati.map(function (d) {
          return el('div', { class: 'riga-barra', title: d.titolo || (d.etichetta + ': ' + d.testo), tabindex: '0' },
            el('span', { class: 'etichetta', text: d.etichetta }),
            el('div', { class: 'binario' },
              opz.riferimento ? el('div', { class: 'riferimento', style: 'left:' + (opz.riferimento / max * 100) + '%' }) : null,
              el('div', { class: 'barra ' + (d.tipo || ''), style: 'width:' + Math.max(0, Math.min(100, d.valore / max * 100)) + '%' })),
            el('span', { class: 'valore', text: d.testo }));
        }),
        opz.nota ? el('figcaption', { class: 'asse', text: opz.nota }) : null);
    }
  };
})(window.App = window.App || {});
