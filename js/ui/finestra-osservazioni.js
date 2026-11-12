/* finestra-osservazioni.js
 * Cosa fa: finestra "🗒️ Osservazioni della lezione": un giorno, tutta la classe; accanto a ogni alunno
 *          👍 / 👎 (un tocco sceglie, un altro toglie) e, se scelto, la nota (facoltativa). Sotto il nome
 *          le osservazioni già scritte quel giorno. "✔ Salva" le aggiunge tutte insieme.
 * Dipende da: App.U, App.Config (osservazioni, sessi), App.Osservazioni, App.Stato, App.Avvisi,
 *             App.Finestra, App.UI.disegnaContenuto
 * Usato da: ui/pagina-classi.js, ui/pagina-attivita.js
 */
(function (App) {
  'use strict';

  App.UI = App.UI || {};
  var el = function () { return App.U.el.apply(null, arguments); };

  App.UI.FinestraOsservazioni = {
    apri: function (classe) {
      var cfg = App.Config.osservazioni, scelte = {};         // alunnoId -> { tipo, testo }
      var data = el('input', { type: 'date', 'aria-label': 'Giorno', value: App.U.oggiISO() });
      var lista = el('ul', { class: 'lista lista-appello' }), conto = el('p', { class: 'conto-appello' });

      function aggiornaConto() {
        var n = Object.keys(scelte).length;
        conto.textContent = n ? '✔ ' + n + (n === 1 ? ' osservazione da salvare: ' : ' osservazioni da salvare: ') +
          cfg.tipi.map(function (t) { return t.icona + ' ' + Object.keys(scelte).filter(function (id) { return scelte[id].tipo === t.id; }).length; }).join('  ')
          : 'Tocca 👍 o 👎 accanto agli alunni che si sono distinti.';
      }

      function riga(a, r) {
        var sc = scelte[a.id], gia = App.Osservazioni.delGiorno(classe, a.id, data.value);
        var bottoni = cfg.tipi.map(function (t) {
          var on = sc && sc.tipo === t.id;
          return el('button', { type: 'button', class: 'simbolo-appello oss-' + t.id + (on ? ' scelto' : ''), 'aria-pressed': on ? 'true' : 'false',
            'aria-label': t.nome + ' – ' + a.nome, title: t.nome, text: t.icona, onclick: function () {
              if (on) delete scelte[a.id]; else scelte[a.id] = { tipo: t.id, testo: sc ? sc.testo : '' };
              ridisegna();
            } });
        });
        var extra = null;
        if (sc) {
          var nota = el('input', { type: 'text', maxlength: cfg.testo, value: sc.testo, 'aria-label': 'Nota – ' + a.nome,
            placeholder: sc.tipo === 'pos' ? 'es. ottimo impegno, aiuta i compagni' : 'es. non ha partecipato, disturba' });
          nota.addEventListener('input', function () { sc.testo = nota.value; });
          extra = el('div', { class: 'appello-extra' }, nota);
        }
        return el('li', { class: 'riga-appello' + (sc ? ' con-scelta' : '') },
          el('div', { class: 'appello-nome' }, el('span', { class: 'num', text: (r + 1) + '.' }), ' ' + a.nome + (a.sesso ? ' ' + App.Config.sessi[a.sesso].icona : ''),
            gia.length ? el('span', { class: 'piccolo oss-gia', text: ' già: ' + gia.map(function (o) { return App.Osservazioni.tipo(o.tipo).icona + (o.testo ? ' ' + o.testo : ''); }).join(' · ') }) : null),
          el('div', { class: 'appello-simboli' }, bottoni), extra);
      }

      function ridisegna() {
        App.U.svuota(lista);
        classe.alunni.forEach(function (a, r) { lista.appendChild(riga(a, r)); });
        aggiornaConto();
      }
      data.addEventListener('change', ridisegna);
      ridisegna();

      function salva() {
        var ids = Object.keys(scelte);
        if (!ids.length) { App.Avvisi.toast('Tocca 👍 o 👎 accanto agli alunni.', 'info'); return false; }
        var err = ids.map(function (id) { return App.Osservazioni.errore({ data: data.value, tipo: scelte[id].tipo, testo: scelte[id].testo }); }).filter(Boolean)[0];
        if (err) { App.Avvisi.toast('❌ ' + err, 'errore', 5000); return false; }
        ids.forEach(function (id) { App.Osservazioni.aggiungi(classe, id, { data: data.value, tipo: scelte[id].tipo, testo: scelte[id].testo }); });
        App.Stato.salva();
        App.UI.disegnaContenuto();
        App.Avvisi.toast('✔ ' + ids.length + (ids.length === 1 ? ' osservazione salvata' : ' osservazioni salvate') + ' per il ' + App.U.dataIT(data.value) + '.', 'ok', 5000);
      }

      App.Finestra.apri({
        titolo: 'Osservazioni – ' + classe.nome, icona: '🗒️', larga: true, fuoco: false,
        corpo: el('div', { class: 'finestra-appello' },
          el('label', { class: 'campo' }, el('span', { text: 'Giorno della lezione' }), data),
          el('p', { class: 'piccolo', text: '👍 si è distinto in positivo · 👎 in negativo. La nota è facoltativa. Le trovi poi nella scheda di ogni alunno (🏫 Classi → nome), contate per quadrimestre.' }),
          lista, conto),
        pulsanti: [{ testo: 'Annulla', tipo: 'neutro' }, { testo: '✔ Salva', tipo: 'ok', azione: salva }]
      });
    }
  };
})(window.App = window.App || {});
