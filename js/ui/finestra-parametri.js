/* finestra-parametri.js
 * Cosa fa: finestra "⚙️ Parametri del test": per i test del libro che li hanno (config.js > parametri)
 *          si sceglie la distanza o il peso per alunni (♂) e alunne (♀); si vede l'anteprima delle soglie
 *          di alcuni voti e, con "✔ Applica", il test cambia nome e strumento e le soglie si ricalcolano
 *          dal libro. Avvisa se ci sono già risultati scritti con il valore di prima.
 * Dipende da: App.U, App.ParametriTest, App.LibroVoti, App.SchedaTest, App.Voti, App.ElencoTest, App.Stato,
 *             App.Avvisi, App.Finestra, App.UI.disegnaContenuto
 * Usato da: ui/finestra-test.js
 */
(function (App) {
  'use strict';

  App.UI = App.UI || {};
  var el = function () { return App.U.el.apply(null, arguments); };

  function quantiRisultati(classe, t) {
    var n = 0;
    Object.keys(classe.risultati || {}).forEach(function (a) { var r = classe.risultati[a][t.id]; if (r) n += Object.keys(r).length; });
    return n;
  }

  App.UI.FinestraParametri = {
    apri: function (classe, t) {
      var P = App.ParametriTest, r = P.regola(t);
      if (!r) return;
      var val = P.valori(t);
      var p = App.LibroVoti.trova(r.libro);
      var fascia = classe.elenco ? 'b1' : (t.fasciaVoti || App.SchedaTest.fasciaDiClasse(classe) || 'b1');
      var tab = App.LibroVoti.tabella(p, fascia) || App.LibroVoti.tabella(p, 'b1');

      function menu(sx) {
        var s = el('select', { 'aria-label': r.nome + (sx === 'M' ? ' alunni' : ' alunne') },
          r.valori.map(function (v) { return el('option', { value: String(v), text: String(v).replace('.', ',') + ' ' + r.unita + (v === r.base ? ' (libro)' : '') }); }));
        s.value = String(val[sx]);
        s.addEventListener('change', anteprima);
        return s;
      }
      var mM = menu('M'), mF = menu('F');
      var prev = el('div', { class: 'anteprima-parametri' });

      function anteprima() {
        var c = { M: P.coefficiente(r, mM.value), F: P.coefficiente(r, mF.value) };
        var nuova = P.scalaTabella(p, tab, c);
        App.U.svuota(prev);
        var pre = t.migliore === 'alto' ? 'da ' : 'fino a ';
        prev.appendChild(el('p', { class: 'piccolo' }, el('b', { text: 'Nuovo nome: ' }), P.nome(r, { M: Number(mM.value), F: Number(mF.value) })));
        prev.appendChild(el('div', { class: 'tabella-zona' }, el('table', { class: 'tabella tabella-parametri' },
          el('thead', {}, el('tr', {}, el('th', { text: 'Voto' }), el('th', { text: '♂ libro → nuovo' }), el('th', { text: '♀ libro → nuovo' }))),
          el('tbody', {}, tab.righe.slice(0, -1).map(function (x, i) {
            var n = nuova.righe[i];
            return el('tr', {}, el('th', { text: App.Voti.testo(x.voto) }),
              el('td', { class: 'cella num-cella', text: pre + x.M + ' → ' + n.M }),
              el('td', { class: 'cella num-cella', text: pre + x.F + ' → ' + n.F }));
          })))));
        prev.appendChild(el('p', { class: 'piccolo', text: (classe.elenco ? 'Esempio con il 1° biennio; nell\'elenco si ricalcolano tutte le fasce.' : 'Tabella della fascia ' + App.SchedaTest.fascia(fascia).nome + '.') +
          ' Coefficienti: ♂ × ' + String(Math.round(c.M * 1000) / 1000).replace('.', ',') + ', ♀ × ' + String(Math.round(c.F * 1000) / 1000).replace('.', ',') + '.' }));
      }

      var spiegazione = { sprint: 'Dopo la partenza da fermi si corre più veloci: tempo × (1 + ' + String(r.k).replace('.', ',') + ' × metri in più / ' + r.base + ').',
        lancio: 'Con una palla più pesante si lancia meno lontano, ma non in proporzione: distanza × √(' + r.base + ' / peso).',
        corsa: 'Formula di Riegel (atletica): tempo × (distanza / ' + r.base + ')^' + String(r.e).replace('.', ',') + '.' }[r.modello];
      var n = classe.elenco ? 0 : quantiRisultati(classe, t);

      var corpo = el('div', { class: 'finestra-parametri' },
        el('p', { class: 'piccolo', text: 'Test del libro: ' + r.libro + '. Scegli ' + r.nome.toLowerCase() + ' per alunni e alunne: il nome del test e le soglie dei voti si ricalcolano dalla tabella del libro.' }),
        el('div', { class: 'riga-parametri' },
          el('label', { class: 'campo' }, el('span', { text: '♂ Alunni' }), mM),
          el('label', { class: 'campo' }, el('span', { text: '♀ Alunne' }), mF)),
        el('p', { class: 'piccolo', text: '📐 ' + spiegazione + ' È una stima: se i voti non ti tornano si possono ritoccare a mano o cambiare il coefficiente.' }),
        prev,
        n ? el('p', { class: 'suggerimento avviso-sesso', text: '⚠️ Ci sono già ' + n + ' risultati scritti: restano come sono, ma verranno valutati con le soglie nuove. Cambia il parametro solo se quei risultati sono stati presi con il valore nuovo.' }) : null);
      anteprima();

      App.Finestra.apri({
        titolo: 'Parametri – ' + t.nome, icona: '⚙️', corpo: corpo, larga: true, fuoco: false,
        pulsanti: [
          { testo: 'Annulla', tipo: 'neutro' },
          { testo: '✔ Applica', tipo: 'ok', azione: function () {
            var x = P.applica(classe, t, { M: mM.value, F: mF.value });
            if (x.errore) { App.Avvisi.toast('❌ ' + x.errore, 'errore', 5000); return false; }
            if (!classe.elenco) App.ElencoTest.aggiorna(classe, t);
            App.Stato.salva();
            App.UI.disegnaContenuto();
            App.Avvisi.toast('✔ ' + x.nome + ': soglie dei voti ricalcolate.', 'ok', 5000);
          } }
        ]
      });
    }
  };
})(window.App = window.App || {});
