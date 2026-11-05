/* pagina-sessioni.js
 * Cosa fa: pagina ⏱️ Sessioni, la parte operativa: si sceglie la classe, si scelgono i test (tra quelli
 *          in uso in 📚 Test) e si scrivono i risultati nella tabella, prova per prova.
 *          Sottosezioni: "✏️ Risultati" (tabella da compilare) e "🎯 Voti" (voti calcolati e tabelle dei voti).
 * Dipende da: App.Stato, App.UI (titoloPagina, senzaClassi, sottoSchede), App.UI.TabellaTest, App.UI.TabellaVoti
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
      var pref = App.Stato.dati.preferenze;
      cont.appendChild(App.UI.sottoSchede([['risultati', '✏️ Risultati'], ['voti', '🎯 Voti']], pref.sottoSessioni, function (s) {
        pref.sottoSessioni = s; App.Stato.scrivi(); App.UI.disegnaContenuto();
      }));
      if (pref.sottoSessioni === 'voti') App.UI.TabellaVoti.disegna(cont, App.Stato.classe());
      else App.UI.TabellaTest.disegna(cont, App.Stato.classe());
    }
  };
})(window.App = window.App || {});
