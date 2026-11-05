/* pagina.js
 * Cosa fa: disegna la pagina intera: menu, la pagina scelta (App.UI.Pagine[id]) e il piè di pagina.
 *          Offre pezzi comuni alle pagine: titolo, scelta della classe, sottoschede, riquadro "vuoto",
 *          riquadro delle regole.
 * Dipende da: App.U, App.Stato, App.Config, App.Archivio, App.Classi, App.UI.Menu, App.UI.Pagine.*, App.Pwa
 * Usato da: avvio.js e da tutte le parti che cambiano i dati (App.UI.disegnaContenuto)
 */
(function (App) {
  'use strict';

  App.UI = App.UI || {};
  App.UI.Pagine = App.UI.Pagine || {};
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

  // Titolo della pagina, con eventuali comandi a destra
  App.UI.titoloPagina = function (testo, destra) {
    return el('div', { class: 'titolo-pagina' }, el('h2', { text: testo }), destra || null);
  };

  // Menu a tendina della classe su cui lavorare (classe attiva, ricordata)
  App.UI.sceltaClasse = function () {
    var classe = App.Stato.classe();
    return el('label', { class: 'scelta-classe' }, el('span', { class: 'etichetta', text: 'Classe' }),
      el('select', { 'aria-label': 'Classe', value: classe ? classe.id : '', onchange: function (ev) {
        App.Stato.dati.preferenze.classeAttiva = ev.target.value;
        App.Stato.scrivi();
        App.UI.disegnaContenuto();
      } }, App.Classi.tutte().map(function (c) { return el('option', { value: c.id, text: c.nome }); })));
  };

  // Sottoschede di una pagina: voci [[id, testo]], quella attiva, cosa fare al tocco
  App.UI.sottoSchede = function (voci, attiva, scegli) {
    return el('div', { class: 'sottoschede', role: 'tablist' }, voci.map(function (v) {
      var si = v[0] === attiva;
      return el('button', { type: 'button', role: 'tab', class: 'sottoscheda' + (si ? ' attiva' : ''),
        'aria-selected': si ? 'true' : 'false', text: v[1], onclick: function () { scegli(v[0]); } });
    }));
  };

  // Pagina che ha bisogno di una classe: se non ce ne sono, invita a crearla
  App.UI.senzaClassi = function (cont) {
    if (App.Classi.tutte().length) return false;
    cont.appendChild(App.UI.vuoto('🏫', 'Nessuna classe', 'Crea prima una classe e carica gli alunni.',
      el('button', { type: 'button', class: 'btn btn-ok grande', text: '🏫 Vai a Classi', onclick: function () { App.UI.vai('classi'); } })));
    return true;
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
        onclick: function () { App.UI.vai('backup'); } });
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

  // Ridisegna solo la pagina aperta (dopo una modifica fatta in una finestra)
  App.UI.disegnaContenuto = function () {
    var main = App.U.svuota(document.getElementById('contenuto'));
    var id = App.Stato.dati.preferenze.pagina;
    main.setAttribute('data-pagina', id);
    var pagina = App.UI.Pagine[id] || App.UI.Pagine.home;
    pagina.disegna(main);
    piede();
    // se la finestra di scelta dei test è aperta, si aggiorna anche lei
    if (App.UI.FinestraElencoTest && App.UI.FinestraElencoTest.ridisegna) App.UI.FinestraElencoTest.ridisegna();
  };

  App.UI.piede = piede;

  App.UI.disegna = function () {
    App.UI.Menu.disegna();
    App.UI.disegnaContenuto();
  };
})(window.App = window.App || {});
