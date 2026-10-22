/* pagina.js
 * Cosa fa: disegna la pagina intera (barra, modulo scelto, piè di pagina) e offre
 *          pezzi comuni: riquadro "vuoto" e riquadro delle regole.
 * Dipende da: App.U, App.Stato, App.Config, App.Archivio, App.UI.Barra,
 *             App.UI.TabellaTest, App.UI.TabellaGiust, App.UI.Statistiche, App.UI.FinestraClassi, App.UI.FinestraBackup, App.Pwa
 * Usato da: avvio.js e da tutte le parti che cambiano i dati
 */
(function (App) {
  'use strict';

  App.UI = App.UI || {};
  var el = function () { return App.U.el.apply(null, arguments); };

  // Riquadro per le schermate senza dati
  App.UI.vuoto = function (icona, titolo, testo, pulsante) {
    return el('div', { class: 'vuoto' },
      el('div', { class: 'vuoto-icona', text: icona }),
      el('h2', { text: titolo }),
      testo ? el('p', { text: testo }) : null,
      pulsante || null);
  };

  // Riquadro informativo con le regole (testi da config.js)
  App.UI.regole = function (titolo, righe, extra) {
    return el('details', { class: 'regole' },
      el('summary', { text: 'ℹ️ ' + titolo }),
      el('ul', {}, righe.map(function (r) { return el('li', { text: r }); })),
      extra || null);
  };

  function piede() {
    var d = App.Stato.dati, p = App.U.svuota(document.getElementById('piede'));
    var tipo = App.Archivio.tipo();
    p.appendChild(el('span', { class: 'versione', text: App.Config.nome + ' v' + App.Config.versione }));
    var stato;
    if (tipo === 'nessuno') {
      stato = el('span', { class: 'stato-backup avviso', text: '⚠️ Questo browser non permette di salvare: esporta il backup prima di chiudere' });
    } else if (!d.classi.length) {
      stato = null;
    } else if (App.Stato.daSalvareInBackup()) {
      stato = el('button', { type: 'button', class: 'stato-backup avviso', text: '⚠️ Modifiche non ancora nel backup',
        onclick: function () { App.UI.FinestraBackup.apri(); } });
    } else {
      stato = el('span', { class: 'stato-backup ok', text: '✓ Backup aggiornato (' + App.U.dataOraIT(d.ultimoBackup) + ')' });
    }
    if (stato) p.appendChild(stato);
    if (tipo === 'localstorage') p.appendChild(el('span', { class: 'piccolo', text: 'salvataggio di riserva attivo' }));
    if (App.Pwa && App.Pwa.puoInstallare()) {
      p.appendChild(el('button', { type: 'button', class: 'btn btn-info piccolo-btn', text: '📲 Installa l\'app',
        onclick: function () { App.Pwa.installa(); } }));
    }
  }

  // Ridisegna solo il modulo (dopo una modifica fatta in una finestra)
  App.UI.disegnaContenuto = function () {
    var main = App.U.svuota(document.getElementById('contenuto'));
    var classe = App.Stato.classe();
    if (!classe) {
      main.appendChild(App.UI.vuoto('🏫', 'Benvenuto!', 'Per iniziare crea una classe, poi carica i nomi degli alunni da Excel o Word.',
        el('button', { type: 'button', class: 'btn btn-ok grande', text: '➕ Crea la prima classe',
          onclick: function () { App.UI.FinestraClassi.apri(true); } })));
    } else if (App.Stato.dati.preferenze.modulo === 'statg') {
      App.UI.StatisticheGiust.disegna(main, classe);
    } else if (App.Stato.dati.preferenze.modulo === 'stat') {
      App.UI.Statistiche.disegna(main, classe);
    } else if (App.Stato.dati.preferenze.modulo === 'giust') {
      App.UI.TabellaGiust.disegna(main, classe);
    } else {
      App.UI.TabellaTest.disegna(main, classe);
    }
    piede();
    // se la finestra dell'elenco dei test è aperta, si aggiorna anche lei
    if (App.UI.FinestraElencoTest && App.UI.FinestraElencoTest.ridisegna) App.UI.FinestraElencoTest.ridisegna();
  };

  App.UI.piede = piede;

  App.UI.disegna = function () {
    App.UI.Barra.disegna();
    App.UI.disegnaContenuto();
  };
})(window.App = window.App || {});
