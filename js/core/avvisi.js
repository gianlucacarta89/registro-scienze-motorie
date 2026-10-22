/* avvisi.js — core 1.0
 * Cosa fa: avvisi brevi in basso (toast) e finestre di conferma, al posto di alert/confirm.
 * Dipende da: App.U, App.Finestra
 * Usato da: tutti i moduli che devono avvisare o chiedere conferma.
 */
(function (App) {
  'use strict';

  var contenitore = null;

  // tipo: 'info' | 'ok' | 'errore'
  function toast(testo, tipo, durata) {
    if (!contenitore || !contenitore.isConnected) {
      contenitore = App.U.el('div', { class: 'toast-zona', 'aria-live': 'polite' });
      document.body.appendChild(contenitore);
    }
    var t = App.U.el('div', { class: 'toast toast-' + (tipo || 'info'), text: testo, role: 'status' });
    contenitore.appendChild(t);
    setTimeout(function () { t.classList.add('via'); }, (durata || 3200));
    setTimeout(function () { t.remove(); }, (durata || 3200) + 400);
  }

  // conferma({ titolo, testo, icona, testoOk, testoNo, pericolo }) -> Promise<boolean>
  function conferma(o) {
    return new Promise(function (risolvi) {
      var el = App.U.el;
      var risposto = false;
      var righe = Array.isArray(o.testo) ? o.testo : [o.testo];
      App.Finestra.apri({
        titolo: o.titolo || 'Conferma',
        icona: o.icona || (o.pericolo ? '⚠️' : '❔'),
        corpo: el('div', { class: 'conferma' }, righe.map(function (r) {
          return r ? el('p', { class: r.indexOf('⚠️') === 0 ? 'avviso-riga' : '', text: r }) : null;
        })),
        pulsanti: [
          { testo: o.testoNo || 'Annulla', tipo: 'neutro', azione: function () { risposto = true; risolvi(false); } },
          { testo: o.testoOk || 'Conferma', tipo: o.pericolo ? 'pericolo' : 'ok', azione: function () { risposto = true; risolvi(true); } }
        ],
        allaChiusura: function () { if (!risposto) risolvi(false); }
      });
    });
  }

  App.Avvisi = { toast: toast, conferma: conferma };
})(window.App = window.App || {});
