/* finestra-test-libro.js
 * Cosa fa: finestra "📖 Test del libro": i test già pronti (App.TestLibro) divisi per tipologia,
 *          con la scheda da leggere; si spuntano e si mettono nell'elenco 📚. I test con lo stesso
 *          nome già nell'elenco si saltano, a meno di scegliere "aggiorna". Non tocca le classi.
 * Dipende da: App.U, App.TestLibro, App.ElencoTest, App.SchedaTest, App.Config (tipologie),
 *             App.Stato, App.Avvisi, App.Finestra, App.UI.FinestraElencoTest
 * Usato da: ui/finestra-elenco-test.js
 */
(function (App) {
  'use strict';

  App.UI = App.UI || {};
  var el = function () { return App.U.el.apply(null, arguments); };

  function giaPresente(t) {
    var k = App.U.chiaveNome(t.nome);
    return App.ElencoTest.tutti().some(function (x) { return App.U.chiaveNome(x.nome) === k; });
  }

  // Scheda del test da leggere (chiusa)
  function dettagli(t) {
    return el('details', { class: 'libro-dettagli' }, el('summary', { text: 'Scheda' }),
      App.SchedaTest.campi().filter(function (c) { return t[c.id]; }).map(function (c) {
        return el('p', {}, el('b', { text: c.nome + ': ' }), t[c.id]);
      }),
      el('p', { class: 'piccolo', text: 'Fonte: ' + t.fonte + (App.SchedaTest.haFasce(t) ? ' · tabelle dei voti per 1° biennio, 2° biennio e quinto anno' : ' · tabella dei voti uguale per tutte le classi') }));
  }

  App.UI.FinestraTestLibro = {
    apri: function () {
      var scelti = {};
      var libro = App.TestLibro;
      var aggiorna = el('input', { type: 'checkbox' });
      var conto = el('span', { class: 'piccolo' });
      var pulsante;

      function aggiornaConto() {
        var n = Object.keys(scelti).length;
        conto.textContent = n + ' scelti su ' + libro.length;
        if (pulsante) { pulsante.textContent = '➕ Metti nell\'elenco (' + n + ')'; pulsante.disabled = !n; }
      }

      // gruppi nell'ordine delle tipologie
      var ordine = App.Config.tipologie;
      var gruppi = ordine.map(function (tip) {
        return { tip: tip, test: libro.filter(function (t) { return t.tipologia === tip; }) };
      }).filter(function (g) { return g.test.length; });

      var caselle = [];
      var lista = el('div', { class: 'libro-lista' }, gruppi.map(function (g) {
        return el('section', { class: 'libro-gruppo' },
          el('h4', { text: g.tip + ' (' + g.test.length + ')' }),
          el('ul', { class: 'lista' }, g.test.map(function (t) {
            var i = libro.indexOf(t);
            var cb = el('input', { type: 'checkbox', 'aria-label': 'Scegli ' + t.nome });
            cb.addEventListener('change', function () { if (cb.checked) scelti[i] = true; else delete scelti[i]; aggiornaConto(); });
            caselle.push({ cb: cb, i: i });
            return el('li', { class: 'riga-lista riga-libro' }, cb,
              el('div', { class: 'testo-test' },
                el('b', { text: t.nome }),
                el('span', { class: 'piccolo', text: t.descrizione + (giaPresente(t) ? ' · già nell\'elenco' : '') }),
                dettagli(t)));
          })));
      }));

      function tutti(si) {
        caselle.forEach(function (x) { x.cb.checked = si; if (si) scelti[x.i] = true; else delete scelti[x.i]; });
        aggiornaConto();
      }

      var corpo = el('div', { class: 'finestra-libro' },
        el('p', { class: 'piccolo', text: libro.length + ' test del libro di testo d\'Istituto (più la corsa di 1 km), con la scheda e le tabelle dei voti per alunni e alunne. ' +
          'Spunta quelli che usi: vanno nell\'elenco 📚 e da lì li aggiungi alle classi, ognuna con la tabella della sua fascia (1ª-2ª, 3ª-4ª, 5ª). I tuoi dati non cambiano.' }),
        el('div', { class: 'riga-btn sinistra' },
          el('button', { type: 'button', class: 'btn btn-neutro piccolo-btn', text: '☑️ Tutti', onclick: function () { tutti(true); } }),
          el('button', { type: 'button', class: 'btn btn-neutro piccolo-btn', text: '⬜ Nessuno', onclick: function () { tutti(false); } }),
          conto),
        lista,
        el('label', { class: 'scelta' }, aggiorna, ' Aggiorna i test con lo stesso nome già nell\'elenco (altrimenti restano come sono)'));

      var fin = App.Finestra.apri({
        titolo: 'Test del libro', icona: '📖', corpo: corpo, larga: true, fuoco: false,
        pulsanti: [
          { testo: 'Chiudi', tipo: 'neutro' },
          { testo: '➕ Metti nell\'elenco', tipo: 'ok', azione: function () {
            var lista = Object.keys(scelti).map(function (i) { return libro[i]; });
            if (!lista.length) return false;
            var r = App.ElencoTest.aggiungiPronti(lista, aggiorna.checked);
            App.Stato.salva();
            if (App.UI.FinestraElencoTest.ridisegna) App.UI.FinestraElencoTest.ridisegna();
            App.Avvisi.toast('✔ Nell\'elenco 📚: ' + r.aggiunti + ' aggiunti' + (r.aggiornati ? ', ' + r.aggiornati + ' aggiornati' : '') +
              (r.saltati.length ? '. Già presenti, lasciati come sono: ' + r.saltati.join(', ') : '') + '.', 'ok', 7000);
          } }
        ]
      });
      pulsante = fin.piede.lastChild;
      aggiornaConto();
    }
  };
})(window.App = window.App || {});
