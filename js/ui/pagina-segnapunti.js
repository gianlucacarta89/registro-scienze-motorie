/* pagina-segnapunti.js
 * Cosa fa: pagina 🏆 Segnapunti (dal riquadro della Home): tabellone grande con le due squadre (colori
 *          diversi); tocco sul punteggio = +1, "−1" per correggere; set vinti e punteggi dei set finiti;
 *          "🏁 Fine set", "↩️ Annulla", "⇄ Cambia campo", "🔄 Nuova partita" (con conferma), "⛶ Schermo intero";
 *          nomi delle squadre modificabili. Si salva da solo (App.Stato.scrivi).
 * Dipende da: App.U, App.Stato, App.Segnapunti, App.Avvisi, App.UI (titoloPagina, vai)
 * Usato da: ui/pagina.js (App.UI.Pagine.segnapunti), ui/pagina-home.js
 */
(function (App) {
  'use strict';

  App.UI = App.UI || {};
  App.UI.Pagine = App.UI.Pagine || {};
  var el = function () { return App.U.el.apply(null, arguments); };

  App.UI.Pagine.segnapunti = {
    disegna: function (cont) {
      var d = App.Stato.dati, S = App.Segnapunti;
      var zona = el('div', { class: 'segnapunti' });
      cont.appendChild(App.UI.titoloPagina('🏆 Segnapunti'));
      cont.appendChild(zona);

      function salva() { App.Stato.scrivi(); }

      function disegna() {
        var s = S.stato(d);
        App.U.svuota(zona);
        zona.appendChild(el('div', { class: 'sp-campo' }, [0, 1].map(function (i) {
          var nome = el('input', { type: 'text', class: 'sp-nome', value: s.nomi[i], 'aria-label': 'Nome squadra ' + (i + 1), maxlength: 24 });
          nome.addEventListener('change', function () { S.rinomina(d, i, nome.value); salva(); disegna(); });
          return el('section', { class: 'sp-squadra sp-' + i },
            nome,
            el('button', { type: 'button', class: 'sp-punti', 'aria-label': '+1 punto a ' + s.nomi[i] + ' (ora ' + s.punti[i] + ')', text: String(s.punti[i]),
              onclick: function () { S.punto(d, i, 1); salva(); disegna(); } }),
            el('div', { class: 'sp-riga' },
              el('button', { type: 'button', class: 'sp-meno', 'aria-label': '−1 punto a ' + s.nomi[i], text: '−1',
                onclick: function () { if (S.punto(d, i, -1)) { salva(); disegna(); } } }),
              el('span', { class: 'sp-set', text: 'Set ' + s.set[i] })));
        })));
        if (s.finiti.length) {
          zona.appendChild(el('p', { class: 'sp-storico' }, 'Set finiti: ' + s.finiti.map(function (f, k) { return (k + 1) + '° ' + f[0] + '–' + f[1]; }).join(' · ')));
        }
        zona.appendChild(el('div', { class: 'riga-btn sp-comandi' },
          el('button', { type: 'button', class: 'btn btn-ok', text: '🏁 Fine set', onclick: function () {
            if (!S.fineSet(d)) { App.Avvisi.toast('Punteggio pari: il set non ha un vincitore.', 'info'); return; }
            salva(); disegna();
          } }),
          el('button', { type: 'button', class: 'btn btn-neutro', text: '↩️ Annulla', disabled: !s.indietro.length,
            onclick: function () { if (S.annulla(d)) { salva(); disegna(); } } }),
          el('button', { type: 'button', class: 'btn btn-neutro', text: '⇄ Cambia campo', onclick: function () { S.scambia(d); salva(); disegna(); } }),
          document.fullscreenEnabled ? el('button', { type: 'button', class: 'btn btn-neutro', text: '⛶ Schermo intero', onclick: function () {
            if (document.fullscreenElement) document.exitFullscreen(); else zona.requestFullscreen().catch(function () {});
          } }) : null,
          el('button', { type: 'button', class: 'btn btn-pericolo', text: '🔄 Nuova partita', onclick: function () {
            App.Avvisi.conferma({ titolo: 'Nuova partita?', pericolo: true, testoOk: '🔄 Azzera', testo: ['Punti e set tornano a zero; i nomi delle squadre restano.'] })
              .then(function (si) { if (si) { S.nuova(d); salva(); disegna(); } });
          } })));
      }
      disegna();
    }
  };
})(window.App = window.App || {});
