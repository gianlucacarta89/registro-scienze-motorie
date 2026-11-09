/* sw.js — service worker (deve stare nella cartella principale)
 * Cosa fa: salva sul dispositivo tutti i file dell'app, così si apre anche senza internet.
 *          A ogni nuova versione cambia VERSIONE: il browser scarica i file nuovi
 *          e cancella quelli vecchi. I DATI degli alunni non stanno qui (sono in IndexedDB).
 * Dipende da: nulla. Registrato da js/core/pwa.js.
 * ⚠️ Se aggiungi, togli o rinomini un file dell'app, aggiorna l'elenco FILE qui sotto.
 */
'use strict';

var VERSIONE = 'registro-sm-v7.5';

var FILE = [
  './',
  'index.html',
  'app/',
  'app/index.html',
  'manifest.webmanifest',
  'css/base.css',
  'css/componenti.css',
  'css/statistiche.css',
  'css/elenco-test.css',
  'css/pagine.css',
  'css/telefono.css',
  'js/config.js',
  'js/core/utils.js',
  'js/core/archivio.js',
  'js/core/stato.js',
  'js/core/finestra.js',
  'js/core/avvisi.js',
  'js/core/pwa.js',
  'js/core/tema.js',
  'js/servizi/calendario.js',
  'js/servizi/nomi.js',
  'js/servizi/nomi-sesso.js',
  'js/servizi/scheda-test.js',
  'js/servizi/libro-voti.js',
  'js/servizi/parametri-test.js',
  'js/servizi/doppioni.js',
  'js/servizi/profilo.js',
  'js/servizi/classi.js',
  'js/servizi/test.js',
  'js/servizi/giustificazioni.js',
  'js/servizi/voti.js',
  'js/servizi/statistiche.js',
  'js/servizi/elenco-test.js',
  'js/servizi/statistiche-giust.js',
  'js/stampa/pdf-base.js',
  'js/stampa/pdf-dati.js',
  'js/stampa/pdf-classe.js',
  'js/stampa/pdf-alunno.js',
  'js/dati/test-libro.js',
  'js/dati/zip.js',
  'js/dati/zip-scrivi.js',
  'js/dati/pdf-oggetti.js',
  'js/dati/pdf-caratteri.js',
  'js/dati/pdf-testo.js',
  'js/dati/leggi-file.js',
  'js/dati/backup.js',
  'js/dati/unisci-backup.js',
  'js/dati/migra-sprint.js',
  'js/ui/pagina.js',
  'js/ui/menu.js',
  'js/ui/pagina-home.js',
  'js/ui/pagina-classi.js',
  'js/ui/lista-test.js',
  'js/ui/pagina-test.js',
  'js/ui/pagina-libro.js',
  'js/ui/pagina-sessioni.js',
  'js/ui/pagina-giust.js',
  'js/ui/pagina-riepilogo.js',
  'js/ui/pagina-backup.js',
  'js/ui/tabella-test.js',
  'js/ui/tabella-voti.js',
  'js/ui/finestra-test.js',
  'js/ui/finestra-voti.js',
  'js/ui/finestra-voti-classe.js',
  'js/ui/finestra-parametri.js',
  'js/ui/finestra-doppioni.js',
  'js/ui/finestra-copia-test.js',
  'js/ui/finestra-elenco-test.js',
  'js/ui/tabella-giust.js',
  'js/ui/finestra-giust.js',
  'js/ui/finestra-alunno.js',
  'js/ui/finestra-alunni.js',
  'js/ui/finestra-importa.js',
  'js/ui/grafici.js',
  'js/ui/profilo-alunno.js',
  'js/ui/scheda-alunno.js',
  'js/ui/statistiche.js',
  'js/ui/statistiche-giust.js',
  'js/avvio.js',
  'icone/icona.svg',
  'icone/icona-192.png',
  'icone/apple-touch-icon.png',
  'icone/icona-512.png',
  'icone/icona-maskable-512.png',
  'lib/jspdf-2.5.1.umd.min.js',
  'lib/jspdf-autotable-3.8.2.min.js'
];

self.addEventListener('install', function (ev) {
  ev.waitUntil(
    caches.open(VERSIONE)
      // Ogni file si scarica con "?v=VERSIONE": così GitHub non può dare una copia vecchia
      // (file vecchi mescolati ai nuovi bloccherebbero parti dell'app).
      .then(function (c) {
        return Promise.all(FILE.map(function (f) {
          var url = f + (f.indexOf('?') < 0 ? '?' : '&') + 'v=' + encodeURIComponent(VERSIONE);
          return fetch(new Request(url, { cache: 'reload' })).then(function (r) {
            if (!r.ok) throw new Error('File non scaricato: ' + f);
            return c.put(f, r);
          });
        }));
      })
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
        if (rq.mode === 'navigate') return caches.match('app/index.html');
        return Response.error();
      });
    })
  );
});
