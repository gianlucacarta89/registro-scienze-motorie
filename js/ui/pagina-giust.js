/* pagina-giust.js
 * Cosa fa: pagina 📋 Giustificazioni con due sottoschede: "Registro" (alunni × mesi, tocco per
 *          aggiungere) e "Statistiche" (per mese o anno, per tipologia). Classe scelta in alto.
 * Dipende da: App.U, App.Stato, App.UI (titoloPagina, sottoSchede, sceltaClasse, senzaClassi),
 *             App.UI.TabellaGiust, App.UI.StatisticheGiust
 * Usato da: ui/pagina.js
 */
(function (App) {
  'use strict';

  App.UI = App.UI || {};
  App.UI.Pagine = App.UI.Pagine || {};
  var el = function () { return App.U.el.apply(null, arguments); };

  App.UI.Pagine.giust = {
    disegna: function (cont) {
      var pref = App.Stato.dati.preferenze, sotto = pref.sottoGiust;
      cont.appendChild(App.UI.titoloPagina('📋 Giustificazioni'));
      if (App.UI.senzaClassi(cont)) return;
      cont.appendChild(App.UI.sottoSchede([['registro', '📋 Registro'], ['stat', '📈 Statistiche']], sotto, function (s) {
        pref.sottoGiust = s; App.Stato.scrivi(); App.UI.disegnaContenuto();
      }));
      cont.appendChild(el('div', { class: 'strumenti' }, App.UI.sceltaClasse()));
      var classe = App.Stato.classe();
      if (sotto === 'stat') App.UI.StatisticheGiust.disegna(cont, classe);
      else App.UI.TabellaGiust.disegna(cont, classe);
    }
  };
})(window.App = window.App || {});
