/* pagina-sessioni.js
 * Cosa fa: pagina ⏱️ Sessioni, la parte operativa: si sceglie la classe, si scelgono i test (tra quelli
 *          in uso in 📚 Test) e si scrivono i risultati nella tabella, prova per prova.
 * Dipende da: App.Stato, App.UI (titoloPagina, senzaClassi), App.UI.TabellaTest
 * Usato da: ui/pagina.js
 */
(function (App) {
  'use strict';

  App.UI = App.UI || {};
  App.UI.Pagine = App.UI.Pagine || {};

  App.UI.Pagine.sessioni = {
    disegna: function (cont) {
      cont.appendChild(App.UI.titoloPagina('⏱️ Sessione di test'));
      if (App.UI.senzaClassi(cont)) return;
      App.UI.TabellaTest.disegna(cont, App.Stato.classe());
    }
  };
})(window.App = window.App || {});
