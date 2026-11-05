/* pwa.js — core 1.0
 * Cosa fa: rende l'app installabile e utilizzabile senza internet quando è pubblicata
 *          su un sito (es. GitHub Pages): registra il service worker (sw.js), chiede al
 *          browser di non cancellare i dati, gestisce il pulsante "📲 Installa".
 *          Aggiornamenti: controlla se c'è una versione nuova all'avvio e ogni volta che l'app torna
 *          in primo piano (sul telefono riaprirla dalle app recenti non la ricarica); quando la
 *          nuova versione è pronta ricarica la pagina da sola. "🔄 Cerca aggiornamenti" lo fa a mano.
 *          Aperta da file o dentro claude.ai non fa nulla.
 * Dipende da: App.U, App.Avvisi, App.Finestra
 * Usato da: avvio.js (App.Pwa.avvia), ui/pagina.js (pulsante nel piè di pagina)
 */
(function (App) {
  'use strict';

  var invito = null;            // evento beforeinstallprompt (Android, Chrome/Edge su PC)
  var allCambio = null;         // funzione da chiamare quando cambia lo stato
  var registrazione = null;     // ServiceWorkerRegistration
  var ricarico = false;

  function suSito() {
    var p = location.protocol;
    var inCornice = false;
    try { inCornice = window.self !== window.top; } catch (e) { inCornice = true; }
    return (p === 'https:' || (p === 'http:' && /^(localhost|127\.0\.0\.1)$/.test(location.hostname))) && !inCornice;
  }

  function installata() {
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  }

  function ios() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  function registra() {
    if (!('serviceWorker' in navigator)) return;
    var cera = !!navigator.serviceWorker.controller;   // false alla prima installazione
    // La nuova versione ha preso il comando: ricarico per usarla (i dati sono già salvati)
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (!cera || ricarico) return;
      ricarico = true;
      App.Avvisi.toast('🔄 Nuova versione: aggiorno l\'app…', 'info', 3000);
      setTimeout(function () { location.reload(); }, 600);
    });
    navigator.serviceWorker.register(App.U.base() + 'sw.js').then(function (reg) {
      registrazione = reg;
      reg.update().catch(function () {});
    }).catch(function (e) { console.warn('Service worker non registrato', e); });
    // Al ritorno in primo piano (es. riaperta dalle app recenti) controlla di nuovo
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible' && registrazione) registrazione.update().catch(function () {});
    });
  }

  // Chiede al browser di non cancellare i dati quando lo spazio scarseggia
  function datiPersistenti() {
    try {
      if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {});
    } catch (e) { /* non disponibile */ }
  }

  function istruzioni() {
    var el = App.U.el;
    var righe = ios()
      ? ['Apri questa pagina con Safari.', 'Tocca il pulsante Condividi (il quadrato con la freccia in su).',
        'Scorri e tocca "Aggiungi alla schermata Home", poi "Aggiungi".']
      : ['Android: menu ⋮ di Chrome → "Installa app" oppure "Aggiungi a schermata Home".',
        'Computer: nella barra dell\'indirizzo di Chrome o Edge tocca l\'icona di installazione (un monitor con la freccia), oppure menu → "Installa Registro S.Mot".'];
    App.Finestra.apri({
      titolo: 'Installa l\'app', icona: '📲',
      corpo: el('div', {},
        el('ol', {}, righe.map(function (r) { return el('li', { text: r }); })),
        el('p', { class: 'piccolo', text: 'Dopo l\'installazione apri l\'app dall\'icona: funziona anche senza internet. I dati restano su questo dispositivo; per passarli agli altri usa il 💾 Backup.' })),
      pulsanti: [{ testo: 'Chiudi', tipo: 'neutro' }]
    });
  }

  App.Pwa = {
    attiva: false,

    avvia: function (aggiorna) {
      allCambio = aggiorna || null;
      if (!suSito()) return;
      this.attiva = true;
      registra();
      datiPersistenti();
      window.addEventListener('beforeinstallprompt', function (ev) {
        ev.preventDefault();
        invito = ev;
        if (allCambio) allCambio();
      });
      window.addEventListener('appinstalled', function () {
        invito = null;
        App.Avvisi.toast('✔ App installata: la trovi tra le tue app.', 'ok', 5000);
        if (allCambio) allCambio();
      });
      if (allCambio) allCambio();   // mostra subito il pulsante "📲 Installa"
    },

    // Controllo a mano (pulsante nel piè di pagina)
    cercaAggiornamenti: function () {
      if (!registrazione) { App.Avvisi.toast('Gli aggiornamenti arrivano solo dall\'app pubblicata (sito).', 'info', 4000); return; }
      App.Avvisi.toast('🔄 Controllo…', 'info', 1500);
      registrazione.update().then(function () {
        var r = registrazione;
        if (r.installing || r.waiting) App.Avvisi.toast('⬇️ Scarico la nuova versione: tra pochi secondi l\'app si aggiorna da sola.', 'info', 6000);
        else App.Avvisi.toast('✔ Hai l\'ultima versione (v' + App.Config.versione + ').', 'ok', 4000);
      }).catch(function () {
        App.Avvisi.toast('Non riesco a controllare: serve internet.', 'errore', 4000);
      });
    },

    // true se ha senso mostrare il pulsante "📲 Installa"
    puoInstallare: function () { return this.attiva && !installata(); },

    installa: function () {
      if (!invito) { istruzioni(); return; }
      var ev = invito;
      invito = null;
      ev.prompt();
      if (ev.userChoice) ev.userChoice.then(function () { if (allCambio) allCambio(); });
    }
  };
})(window.App = window.App || {});
