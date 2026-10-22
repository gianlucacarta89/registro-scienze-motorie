/* sw.js — service worker (deve stare nella cartella principale)
 * Cosa fa: salva sul dispositivo tutti i file dell'app, così si apre anche senza internet.
 *          A ogni nuova versione cambia VERSIONE: il browser scarica i file nuovi
 *          e cancella quelli vecchi. I DATI degli alunni non stanno qui (sono in IndexedDB).
 * Dipende da: nulla. Registrato da js/core/pwa.js.
 * ⚠️ Se aggiungi, togli o rinomini un file dell'app, aggiorna l'elenco FILE qui sotto.
 */
'use strict';

var VERSIONE = 'registro-sm-v3.3';

var FILE = [
  './',
  'index.html',
  'manifest.webmanifest',
  'icone/icona-192.png',
  'icone/apple-touch-icon.png',
  'css/base.css',
  'css/componenti.css',
  'css/telefono.css',
  'js/config.js',
  'js/core/utils.js',
  'js/core/archivio.js',
  'js/core/stato.js',
  'js/core/finestra.js',
  'js/core/avvisi.js',
  'js/core/pwa.js',
  'js/servizi/calendario.js',
  'js/servizi/nomi.js',
  'js/servizi/classi.js',
  'js/servizi/test.js',
  'js/servizi/giustificazioni.js',
  'js/servizi/voti.js',
  'js/servizi/statistiche.js',
  'js/servizi/elenco-test.js',
  'js/servizi/statistiche-giust.js',
  'js/dati/zip.js',
  'js/dati/pdf-oggetti.js',
  'js/dati/pdf-caratteri.js',
  'js/dati/pdf-testo.js',
  'js/dati/leggi-file.js',
  'js/dati/backup.js',
  'js/ui/pagina.js',
  'js/ui/barra.js',
  'js/ui/tabella-test.js',
  'js/ui/finestra-test.js',
  'js/ui/finestra-voti.js',
  'js/ui/finestra-copia-test.js',
  'js/ui/finestra-elenco-test.js',
  'js/ui/tabella-giust.js',
  'js/ui/finestra-giust.js',
  'js/ui/finestra-classi.js',
  'js/ui/finestra-alunno.js',
  'js/ui/finestra-alunni.js',
  'js/ui/finestra-importa.js',
  'js/ui/finestra-backup.js',
  'js/ui/grafici.js',
  'js/ui/statistiche.js',
  'js/ui/statistiche-giust.js',
  'js/avvio.js',
  'icone/icona-512.png',
  'icone/icona-maskable-512.png'
];

self.addEventListener('install', function (ev) {
  ev.waitUntil(
    caches.open(VERSIONE)
      .then(function (c) { return c.addAll(FILE.map(function (f) { return new Request(f, { cache: 'reload' }); })); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (ev) {
  ev.waitUntil(
    caches.keys().then(function (nomi) {
      return Promise.all(nomi.filter(function (n) { return n.indexOf('registro-sm-') === 0 && n !== VERSIONE; })
        .map(function (n) { return caches.delete(n); }));
    }).then(function () { return self.clients.claim(); })
  );
});

// Prima la copia salvata (funziona offline); se manca, la rete
self.addEventListener('fetch', function (ev) {
  var rq = ev.request;
  if (rq.method !== 'GET' || new URL(rq.url).origin !== self.location.origin) return;
  ev.respondWith(
    caches.match(rq, { ignoreSearch: true }).then(function (salvata) {
      if (salvata) return salvata;
      return fetch(rq).catch(function () {
        if (rq.mode === 'navigate') return caches.match('index.html');
        return Response.error();
      });
    })
  );
});
