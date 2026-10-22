/* barra.js
 * Cosa fa: barra in alto (scelta della classe, pulsanti Alunni, Classi, Backup)
 *          e schede dei due moduli (Test, Giustificazioni).
 * Dipende da: App.U, App.Stato, App.Classi, App.UI.FinestraClassi, App.UI.FinestraAlunni,
 *             App.UI.FinestraBackup, App.UI.disegna
 * Usato da: ui/pagina.js
 */
(function (App) {
  'use strict';

  App.UI = App.UI || {};

  function cambiaClasse(ev) {
    App.Stato.dati.preferenze.classeAttiva = ev.target.value;
    App.Stato.scrivi();
    App.UI.disegna();
  }

  function cambiaModulo(m) {
    App.Stato.dati.preferenze.modulo = m;
    App.Stato.scrivi();
    App.UI.disegna();
  }

  App.UI.Barra = {
    disegna: function () {
      var el = App.U.el, d = App.Stato.dati, classe = App.Stato.classe();
      var barra = App.U.svuota(document.getElementById('barra'));

      if (d.classi.length) {
        barra.appendChild(el('label', { class: 'scelta-classe' },
          el('span', { class: 'etichetta', text: 'Classe' }),
          el('select', { 'aria-label': 'Classe', onchange: cambiaClasse, value: classe ? classe.id : '' },
            d.classi.map(function (c) { return el('option', { value: c.id, text: c.nome }); }))));
      }
      barra.appendChild(el('div', { class: 'gruppo-btn' },
        classe ? el('button', { type: 'button', class: 'btn btn-neutro', text: '👥 Alunni',
          onclick: function () { App.UI.FinestraAlunni.apri(App.Stato.classe()); } }) : null,
        el('button', { type: 'button', class: 'btn btn-neutro', text: '📚 Test',
          onclick: function () { App.UI.FinestraElencoTest.apri(App.Stato.classe()); } }),
        el('button', { type: 'button', class: 'btn btn-neutro', text: '🏫 Classi',
          onclick: function () { App.UI.FinestraClassi.apri(); } }),
        el('button', { type: 'button', class: 'btn btn-info', text: '💾 Backup',
          onclick: function () { App.UI.FinestraBackup.apri(); } })));

      var schede = App.U.svuota(document.getElementById('schede'));
      if (!classe) { schede.style.display = 'none'; return; }
      schede.style.display = '';
      [['test', '📊 Test'], ['giust', '📋 Giustificazioni'], ['stat', '📈 Statistiche']].forEach(function (s) {
        var attiva = d.preferenze.modulo === s[0];
        schede.appendChild(el('button', {
          type: 'button', role: 'tab', class: 'scheda' + (attiva ? ' attiva' : ''),
          'aria-selected': attiva ? 'true' : 'false', text: s[1],
          onclick: function () { cambiaModulo(s[0]); }
        }));
      });
    }
  };
})(window.App = window.App || {});
