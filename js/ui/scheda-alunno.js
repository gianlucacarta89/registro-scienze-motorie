/* scheda-alunno.js
 * Cosa fa: finestra "👤 Scheda dell'alunno" (si apre toccando il nome in 🏫 Classi): per ogni test
 *          della classe il risultato e il voto in ogni prova svolta, la media dei voti di ogni prova
 *          e il grafico a ragnatela per capacità della prova scelta (ui/profilo-alunno.js).
 *          Spunte 🏐 torneo scolastico / 🏅 giochi della gioventù (ui/spunte-partecipa.js).
 *          "✏️ Correggi" apre la finestra per correggere il nome, indicare ♂/♀ o togliere l'alunno.
 * Dipende da: App.U, App.Config (prove, sessi), App.Test, App.Voti, App.Finestra,
 *             App.UI.ProfiloAlunno, App.UI.FinestraAlunno
 * Usato da: ui/pagina-classi.js
 */
(function (App) {
  'use strict';

  App.UI = App.UI || {};
  var el = function () { return App.U.el.apply(null, arguments); };

  function etichettaVoto(v) {
    return v === null ? null : el('span', { class: 'voto ' + (App.Voti.sufficiente(v) ? 'suff' : 'insuff'), text: App.Voti.testo(v) });
  }

  // Prove con almeno un risultato dell'alunno (la 1ª sempre)
  function proveSvolte(classe, a) {
    return App.Config.prove.filter(function (p) {
      return p.id === 1 || classe.test.some(function (t) { return App.Test.valore(classe, a.id, t.id, p.id); });
    });
  }

  function tabellaVoti(classe, a, prove) {
    if (!classe.test.length) return el('p', { class: 'piccolo', text: 'La classe non ha ancora test: sceglili in ⏱️ Sessioni.' });
    return el('div', { class: 'tabella-zona' }, el('table', { class: 'tabella tabella-scheda-alunno' },
      el('thead', {}, el('tr', {}, el('th', { text: 'Test' }), prove.map(function (p) { return el('th', { text: p.nome }); }))),
      el('tbody', {}, classe.test.map(function (t) {
        return el('tr', {}, el('th', { class: 'nome-test-scheda' }, t.nome, t.tipologia ? el('span', { class: 'piccolo', text: t.tipologia }) : null),
          prove.map(function (p) {
            var v = App.Test.valore(classe, a.id, t.id, p.id);
            var x = App.Voti.votoAlunno(classe, a, t, p.id);
            return el('td', { class: 'cella num-cella' }, v ? el('span', { class: 'risultato', text: v }) : el('span', { class: 'piccolo', text: '–' }),
              etichettaVoto(x.voto));
          }));
      })),
      el('tfoot', {}, el('tr', {}, el('th', { text: 'Media voti' }), prove.map(function (p) {
        var m = App.Voti.media(classe, a, p.id);
        return el('td', { class: 'cella num-cella' }, m === null ? el('span', { class: 'piccolo', text: '–' }) : etichettaVoto(m));
      })))));
  }

  App.UI.SchedaAlunno = {
    apri: function (classe, a) {
      var prove = proveSvolte(classe, a);
      var prova = prove[prove.length - 1].id;          // parte dall'ultima prova svolta
      var zona = el('div', { class: 'scheda-alunno' });

      function disegna() {
        App.U.svuota(zona);
        zona.appendChild(el('p', { class: 'piccolo' }, 'Classe ' + classe.nome + ' · ' +
          (a.sesso ? App.Config.sessi[a.sesso].icona + ' ' + (a.sesso === 'M' ? 'alunno' : 'alunna') : '♂/♀ non indicato: tocca "✏️ Correggi" per indicarlo (serve per i voti)')));
        zona.appendChild(el('h4', { text: '🏆 Partecipazioni' }));
        zona.appendChild(App.UI.spuntePartecipa(a));
        zona.appendChild(el('h4', { text: '🎯 Risultati e voti dei test' }));
        zona.appendChild(tabellaVoti(classe, a, prove));
        zona.appendChild(el('h4', { text: '🕸️ Profilo per capacità' }));
        if (prove.length > 1) {
          zona.appendChild(el('div', { class: 'segmenti', role: 'tablist', 'aria-label': 'Prova del grafico' }, prove.map(function (p) {
            return el('button', { type: 'button', class: 'segmento' + (prova === p.id ? ' attivo' : ''), 'aria-pressed': prova === p.id ? 'true' : 'false',
              text: p.nome, onclick: function () { prova = p.id; disegna(); } });
          })));
        }
        zona.appendChild(App.UI.ProfiloAlunno.disegna(classe, a, prova));
      }
      disegna();

      App.Finestra.apri({
        titolo: a.nome, icona: '👤', corpo: zona, larga: true, fuoco: false,
        pulsanti: [
          { testo: '✏️ Correggi', tipo: 'neutro', azione: function () { App.UI.FinestraAlunno.apri(classe, a); } },
          { testo: 'Chiudi', tipo: 'neutro' }
        ]
      });
    }
  };
})(window.App = window.App || {});
