/* tema.js
 * Cosa fa: tema dell'app, ☀️ chiaro (predefinito, sfondo bianco) o 🌙 scuro, con il pulsante nella
 *          testata. La scelta resta su questo dispositivo (localStorage, chiave "registro-sm-tema"):
 *          non va nel backup, così telefono e computer possono avere temi diversi.
 *          ECCEZIONE alla regola "i file definiscono e avvio.js esegue": questo file si carica nel
 *          <head> e mette subito <html data-theme>, così la pagina non lampeggia di bianco al buio.
 * Dipende da: niente (il pulsante lo collega avvio.js con App.Tema.pulsante)
 * Usato da: app/index.html (head), js/avvio.js; colori in css/base.css (:root[data-theme="dark"])
 */
(function (App) {
  'use strict';

  var CHIAVE = 'registro-sm-tema';

  function leggi() {
    try { return localStorage.getItem(CHIAVE) === 'dark' ? 'dark' : 'light'; } catch (e) { return 'light'; }
  }

  function applica(t) {
    document.documentElement.setAttribute('data-theme', t);
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', t === 'dark' ? '#0e1216' : '#2b3440');
  }

  function imposta(t) {
    try { localStorage.setItem(CHIAVE, t); } catch (e) { /* senza memoria vale finché l'app è aperta */ }
    applica(t);
  }

  // Collega il pulsante ☀️/🌙 della testata
  function pulsante(b) {
    if (!b) return;
    function etichetta() {
      var scuro = leggi() === 'dark' || document.documentElement.getAttribute('data-theme') === 'dark';
      b.textContent = scuro ? '☀️' : '🌙';
      b.setAttribute('aria-label', scuro ? 'Passa al tema chiaro' : 'Passa al tema scuro');
      b.title = b.getAttribute('aria-label');
    }
    b.addEventListener('click', function () {
      imposta(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
      etichetta();
    });
    etichetta();
  }

  applica(leggi());
  App.Tema = { leggi: leggi, imposta: imposta, pulsante: pulsante };
})(window.App = window.App || {});
