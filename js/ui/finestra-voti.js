/* finestra-voti.js
 * Cosa fa: finestra "Tabella dei voti" di un test: si copiano i parametri di riferimento
 *          (es. del libro di testo), una riga per voto, con la soglia per alunni (♂) e alunne (♀).
 *          Le soglie partono vuote; le righe senza soglie si ignorano.
 * Dipende da: App.U, App.Config (voti), App.Voti, App.ElencoTest, App.Stato, App.Avvisi, App.Finestra,
 *             App.UI.disegnaContenuto
 * Usato da: ui/finestra-test.js (pulsante 📏 Tabella dei voti)
 */
(function (App) {
  'use strict';

  App.UI = App.UI || {};
  var el = function () { return App.U.el.apply(null, arguments); };

  App.UI.FinestraVoti = {
    apri: function (classe, t) {
      var corpo = el('tbody');
      var esistenti = (t.voti && t.voti.righe) || [];
      var iniziali = esistenti.length ? esistenti : App.Config.voti.righeIniziali.map(function (v) { return { voto: v, M: '', F: '' }; });
      var direzione = t.migliore === 'alto' ? 'almeno' : 'al massimo';
      var esempio = t.tipo === 'tempo' ? 'min:sec' : (t.unita || 'valore');

      function riga(r) {
        var sel = el('select', { 'aria-label': 'Voto', value: r.voto === undefined ? '' : String(r.voto) },
          el('option', { value: '', text: '–' }),
          App.Voti.scala().map(function (v) { return el('option', { value: String(v), text: App.Voti.testo(v) }); }));
        var tr = el('tr', {},
          el('td', {}, sel),
          el('td', {}, el('input', { type: 'text', class: 'soglia', 'data-s': 'M', value: r.M || '', inputmode: t.tipo === 'tempo' ? 'text' : 'decimal', 'aria-label': 'Soglia alunni' })),
          el('td', {}, el('input', { type: 'text', class: 'soglia', 'data-s': 'F', value: r.F || '', inputmode: t.tipo === 'tempo' ? 'text' : 'decimal', 'aria-label': 'Soglia alunne' })),
          el('td', {}, el('button', { type: 'button', class: 'btn btn-neutro piccolo-btn', 'aria-label': 'Togli riga', text: '✕',
            onclick: function () { tr.remove(); } })));
        return tr;
      }
      iniziali.forEach(function (r) { corpo.appendChild(riga(r)); });

      function leggi() {
        return Array.prototype.map.call(corpo.querySelectorAll('tr'), function (tr) {
          return { voto: tr.querySelector('select').value, M: tr.querySelector('[data-s=M]').value, F: tr.querySelector('[data-s=F]').value };
        });
      }

      var contenuto = el('div', { class: 'finestra-voti' },
        el('p', { class: 'piccolo', text: 'Copia la tabella del libro: per ogni voto scrivi il risultato ' + direzione +
          ' necessario (' + esempio + '), separato per alunni e alunne. Un risultato peggiore dell\'ultima riga prende il voto più basso della tabella. Le righe vuote non contano.' }),
        el('div', { class: 'tabella-zona tabella-voti-zona' },
          el('table', { class: 'tabella tabella-voti' },
            el('thead', {}, el('tr', {},
              el('th', { text: 'Voto' }),
              el('th', { text: '♂ Alunni (' + direzione + ')' }),
              el('th', { text: '♀ Alunne (' + direzione + ')' }),
              el('th', { text: '' }))),
            corpo)),
        el('div', { class: 'riga-btn sinistra' },
          el('button', { type: 'button', class: 'btn btn-neutro piccolo-btn', text: '➕ Aggiungi riga (es. mezzo voto)',
            onclick: function () { corpo.appendChild(riga({})); } })),
        el('p', { class: 'piccolo', text: 'Per età diverse (prima, quinta…) ogni classe ha la sua tabella: con "📋 Copia test" la porti in un\'altra classe e poi la correggi.' }));

      App.Finestra.apri({
        titolo: 'Tabella dei voti – ' + t.nome, icona: '📏', corpo: contenuto, larga: true, fuoco: false,
        pulsanti: [
          { testo: '🗑️ Svuota', tipo: 'pericolo', azione: function () {
            App.Avvisi.conferma({ titolo: 'Svuotare la tabella dei voti?', pericolo: true, testoOk: '🗑️ Svuota',
              testo: 'I voti di "' + t.nome + '" non saranno più calcolati. I risultati restano.' })
              .then(function (si) {
                if (!si) return;
                App.U.svuota(corpo);
                App.Config.voti.righeIniziali.forEach(function (v) { corpo.appendChild(riga({ voto: v })); });
              });
            return false;
          } },
          { testo: 'Annulla', tipo: 'neutro' },
          { testo: '✔ Salva tabella', tipo: 'ok', azione: function () {
            var r = App.Voti.controlla(t, leggi());
            if (r.errore) { App.Avvisi.toast('❌ ' + r.errore, 'errore', 7000); return false; }
            t.voti = { righe: r.righe };
            // tabella di un test di classe: si aggiorna anche la sua copia nell'elenco 📚 (se collegata)
            if (classe.elenco) App.ElencoTest.stacca(t); else App.ElencoTest.aggiorna(classe, t);
            App.Stato.salva();
            App.UI.disegnaContenuto();
            App.Avvisi.toast(r.righe.length ? '✔ Tabella salvata: ' + r.righe.length + ' voti.' : 'Tabella vuota: nessun voto automatico.', 'ok', 4000);
          } }
        ]
      });
    }
  };
})(window.App = window.App || {});
