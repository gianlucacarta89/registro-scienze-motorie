/* pagina-test.js
 * Cosa fa: pagina 📚 Test con due sottoschede: "Elenco dei test" (libro + miei, spunta "Lo uso")
 *          e "Statistiche" della classe scelta (per test e prova, primi 3, profilo a ragnatela).
 * Dipende da: App.U, App.Stato, App.UI (titoloPagina, sottoSchede, sceltaClasse, senzaClassi),
 *             App.UI.ListaTest, App.UI.Statistiche
 * Usato da: ui/pagina.js
 */
(function (App) {
  'use strict';

  App.UI = App.UI || {};
  App.UI.Pagine = App.UI.Pagine || {};
  var el = function () { return App.U.el.apply(null, arguments); };

  App.UI.Pagine.test = {
    disegna: function (cont) {
      var pref = App.Stato.dati.preferenze, sotto = pref.sottoTest;
      cont.appendChild(App.UI.titoloPagina('📚 Test'));
      cont.appendChild(App.UI.sottoSchede([['elenco', '📚 Elenco dei test'], ['stat', '📈 Statistiche']], sotto, function (s) {
        pref.sottoTest = s; App.Stato.scrivi(); App.UI.disegnaContenuto();
      }));
      if (sotto === 'stat') {
        if (App.UI.senzaClassi(cont)) return;
        cont.appendChild(el('div', { class: 'strumenti' }, App.UI.sceltaClasse()));
        App.UI.Statistiche.disegna(cont, App.Stato.classe());
        return;
      }
      App.UI.ListaTest.disegna(cont);
    }
  };
})(window.App = window.App || {});
