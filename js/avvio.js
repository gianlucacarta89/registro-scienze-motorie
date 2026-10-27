/* avvio.js — SEMPRE l'ultimo file caricato
 * Cosa fa: fa partire l'app: carica i dati salvati e poi disegna la pagina.
 * Dipende da: tutti i moduli (App.Config, App.Stato, App.UI, App.Pwa)
 * Usato da: index.html
 */
(function (App) {
  'use strict';

  App.avvia = function () {
    var c = App.Config;
    document.title = c.nome;
    document.getElementById('titolo-app').textContent = c.nome;
    document.getElementById('logo').textContent = c.icona;

    App.Stato.carica().then(function () {
      App.Test.ordinaTutti();
      App.Test.riscriviTutti();
      App.UI.disegna();
      App.Pwa.avvia(App.UI.piede);
    }).catch(function (e) {
      console.error(e);
      var main = document.getElementById('contenuto');
      main.textContent = '⚠️ Non riesco ad avviare l\'app. Ricarica la pagina; se il problema resta, prova un altro browser.';
    });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', App.avvia);
  else App.avvia();
})(window.App = window.App || {});
