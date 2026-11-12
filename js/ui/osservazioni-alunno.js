/* osservazioni-alunno.js
 * Cosa fa: sezione "🗒️ Osservazioni" della 👤 scheda dell'alunno: conteggio 👍/👎 per quadrimestre,
 *          modulo per aggiungerne una (giorno, 👍/👎, nota) e l'elenco (più recenti prima), ognuna con
 *          🗑️ (con conferma).
 * Dipende da: App.U, App.Config (osservazioni), App.Osservazioni, App.Calendario, App.Stato, App.Avvisi
 * Usato da: ui/scheda-alunno.js
 */
(function (App) {
  'use strict';

  App.UI = App.UI || {};
  var el = function () { return App.U.el.apply(null, arguments); };

  App.UI.OsservazioniAlunno = {
    // -> Node; rifai() ridisegna la sezione
    disegna: function (classe, a, rifai) {
      var cfg = App.Config.osservazioni, anno = App.Calendario.annoAttivo(), tipoScelto = 'pos';
      var quad = App.Osservazioni.quadrimestri(anno);
      var conti = el('div', { class: 'oss-conti' }, quad.map(function (q) {
        var c = App.Osservazioni.conta(classe, a.id, q);
        return el('div', { class: 'oss-conto' }, el('b', { text: q.nome }), el('span', { text: ' 👍 ' + c.pos + '   👎 ' + c.neg }));
      }));

      var data = el('input', { type: 'date', 'aria-label': 'Giorno dell\'osservazione', value: App.U.oggiISO() });
      var testo = el('input', { type: 'text', maxlength: cfg.testo, 'aria-label': 'Nota dell\'osservazione', placeholder: 'nota (facoltativa)' });
      var tipi = el('div', { class: 'segmenti', role: 'radiogroup', 'aria-label': 'Positiva o negativa' });
      function disegnaTipi() {
        App.U.svuota(tipi);
        cfg.tipi.forEach(function (t) {
          tipi.appendChild(el('button', { type: 'button', class: 'segmento' + (tipoScelto === t.id ? ' attivo' : ''), 'aria-pressed': tipoScelto === t.id ? 'true' : 'false',
            text: t.icona + ' ' + t.nome, onclick: function () { tipoScelto = t.id; disegnaTipi(); } }));
        });
      }
      disegnaTipi();

      function aggiungi() {
        var r = App.Osservazioni.aggiungi(classe, a.id, { data: data.value, tipo: tipoScelto, testo: testo.value });
        if (r.errore) { App.Avvisi.toast('❌ ' + r.errore, 'errore', 5000); return; }
        App.Stato.salva();
        App.Avvisi.toast('✔ Osservazione aggiunta.', 'ok', 3000);
        rifai();
      }

      function elimina(o) {
        App.Avvisi.conferma({ titolo: 'Eliminare questa osservazione?', pericolo: true, testoOk: '🗑️ Elimina',
          testo: [App.U.dataIT(o.data) + ' ' + App.Osservazioni.tipo(o.tipo).icona + (o.testo ? ' ' + o.testo : '')] })
          .then(function (si) { if (!si) return; App.Osservazioni.elimina(classe, a.id, o.id); App.Stato.salva(); rifai(); });
      }

      var l = App.Osservazioni.di(classe, a.id);
      return el('div', { class: 'oss-alunno' }, conti,
        el('div', { class: 'oss-nuova' }, tipi, data, testo,
          el('button', { type: 'button', class: 'btn btn-ok piccolo-btn', text: '➕ Aggiungi', onclick: aggiungi })),
        l.length ? el('ul', { class: 'lista oss-lista' }, l.map(function (o) {
          var t = App.Osservazioni.tipo(o.tipo);
          return el('li', { class: 'oss-riga oss-' + o.tipo },
            el('span', { class: 'oss-data', text: App.U.dataIT(o.data) }),
            el('span', { class: 'oss-testo' }, t.icona + ' ' + (o.testo || (o.tipo === 'pos' ? 'positiva' : 'negativa'))),
            el('button', { type: 'button', class: 'btn btn-neutro piccolo-btn', 'aria-label': 'Elimina osservazione del ' + App.U.dataIT(o.data), text: '🗑️',
              onclick: function () { elimina(o); } }));
        })) : el('p', { class: 'piccolo', text: 'Nessuna osservazione. Per tutta la classe insieme: 🏫 Classi → "🗒️ Osservazioni".' }));
    }
  };
})(window.App = window.App || {});
