/* avvio.js — SEMPRE l'ultimo file caricato
 * Cosa fa: fa partire l'app: carica i dati salvati e poi disegna la pagina.
 * Dipende da: tutti i moduli (App.Config, App.Stato, App.UI, App.Pwa, App.Tema)
 * Usato da: index.html
 */
(function (App) {
  'use strict';

  App.avvia = function () {
    var c = App.Config;
    document.title = c.nome;
    document.getElementById('titolo-app').textContent = c.nome;
    App.Tema.pulsante(document.getElementById('tema'));   // ☀️/🌙 nella testata

    App.TestDerivati.aggiungi();      // test ricavati da quelli del libro (es. 60 m / 80 m)
    App.Stato.carica().then(function () {
      App.Test.ordinaTutti();
      App.Test.riscriviTutti();
      App.UI.disegna();
      App.Pwa.avvia(App.UI.piede);
      // App aperta anche in un'altra finestra: al ritorno in primo piano prende i dati più recenti
      document.addEventListener('visibilitychange', function () { if (!document.hidden) App.Stato.controllaAltri(); });
    }).catch(function (e) {
      console.error(e);
      var main = document.getElementById('contenuto');
      main.textContent = '⚠️ Non riesco ad avviare l\'app. Ricarica la pagina; se il problema resta, prova un altro browser.';
    });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', App.avvia);
  else App.avvia();
})(window.App = window.App || {});
