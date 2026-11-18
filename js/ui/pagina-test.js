/* pagina-test.js
 * Cosa fa: pagina 📚 Test con tre sottoschede: "Elenco dei test" (libro + miei, spunta "Lo uso"),
 *          "📖 Libri" (i libri di testo con schede e tabelle, nuovi libri, 📥 Importa test: ui/pagina-libro.js;
 *          fino alla v7.24 era una voce del menu) e "Statistiche" della classe scelta (per test e prova, primi 3).
 * Dipende da: App.U, App.Stato, App.UI (titoloPagina, sottoSchede, sceltaClasse, senzaClassi),
 *             App.UI.ListaTest, App.UI.Statistiche, App.UI.Pagine.libro
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
      cont.appendChild(App.UI.sottoSchede([['elenco', '📚 Elenco dei test'], ['libro', '📖 Libri'], ['stat', '📈 Statistiche']], sotto, function (s) {
        pref.sottoTest = s; App.Stato.scrivi(); App.UI.disegnaContenuto();
      }));
      if (sotto === 'stat') {
        if (App.UI.senzaClassi(cont)) return;
        cont.appendChild(el('div', { class: 'strumenti' }, App.UI.sceltaClasse()));
        App.UI.Statistiche.disegna(cont, App.Stato.classe());
        return;
      }
      if (sotto === 'libro') { App.UI.Pagine.libro.disegna(cont, true); return; }
      App.UI.ListaTest.disegna(cont);
    }
  };
})(window.App = window.App || {});
