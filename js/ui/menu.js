/* menu.js
 * Cosa fa: menu principale (Home, Classi, Test, Sessioni, Giustificazioni, Riepilogo, Backup:
 *          voci in config.js > menu). Sul computer è una barra sotto la testata, sul telefono
 *          una barra fissa in basso con icona ed etichetta corta. Offre App.UI.vai(pagina).
 * Dipende da: App.U, App.Config (menu), App.Stato, App.UI.disegna
 * Usato da: ui/pagina.js e dalle pagine che portano altrove (es. "Vai a Classi")
 */
(function (App) {
  'use strict';

  App.UI = App.UI || {};

  // Apre una pagina del menu (e una sua sottoscheda: 'stat' per Test o Giustificazioni)
  App.UI.vai = function (pagina, sotto) {
    var p = App.Stato.dati.preferenze;
    p.pagina = pagina;
    if (sotto && pagina === 'test') p.sottoTest = sotto;
    if (sotto && pagina === 'giust') p.sottoGiust = sotto;
    App.Stato.scrivi();
    App.UI.disegna();
    window.scrollTo(0, 0);
  };

  App.UI.Menu = {
    disegna: function () {
      var el = App.U.el, attiva = App.Stato.dati.preferenze.pagina;
      var nav = App.U.svuota(document.getElementById('menu'));
      App.Config.menu.forEach(function (m) {
        var si = m.id === attiva;
        nav.appendChild(el('button', {
          type: 'button', class: 'voce-menu' + (si ? ' attiva' : ''), 'aria-current': si ? 'page' : 'false',
          'data-pagina': m.id, title: m.nome, onclick: function () { App.UI.vai(m.id); }
        }, el('span', { class: 'voce-icona', 'aria-hidden': 'true', text: m.icona }),
          el('span', { class: 'voce-nome', text: m.nome }),
          el('span', { class: 'voce-corto', 'aria-hidden': 'true', text: m.corto })));
      });
    }
  };
})(window.App = window.App || {});
