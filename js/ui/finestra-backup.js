/* finestra-backup.js
 * Cosa fa: finestra "Backup": spiega come passare i dati tra telefono, tablet e computer,
 *          esporta il file di backup e lo reimporta (con conferma prima di sostituire).
 * Dipende da: App.U, App.Backup, App.Stato, App.Avvisi, App.Finestra, App.UI.disegna, App.UI.piede
 * Usato da: ui/barra.js (💾 Backup), ui/pagina.js (avviso nel piè di pagina)
 */
(function (App) {
  'use strict';

  App.UI = App.UI || {};
  var el = function () { return App.U.el.apply(null, arguments); };

  function importa(file, fin) {
    App.Backup.leggi(file).then(function (r) {
      if (r.errore) { App.Avvisi.toast('❌ ' + r.errore, 'errore', 6000); return; }
      var b = r.backup, n = App.Backup.riepilogo(b.dati);
      return App.Avvisi.conferma({
        titolo: 'Importare il backup?', pericolo: true, testoOk: '⬆️ Sostituisci i dati',
        testo: [
          'Backup del ' + App.U.dataOraIT(b.esportato) + ': ' + n.classi + ' classi, ' + n.alunni + ' alunni, ' +
            n.test + ' test, ' + n.giust + ' giustificazioni.',
          '⚠️ Tutti i dati di questo dispositivo saranno sostituiti da quelli del backup.',
          App.Backup.localiPiuRecenti(b)
            ? '⚠️ Attenzione: su questo dispositivo ci sono modifiche fatte DOPO questo backup. Importandolo andranno perse.'
            : ''
        ]
      }).then(function (si) {
        if (!si) return;
        return App.Backup.applica(b).then(function () {
          fin.chiudi();
          App.UI.disegna();
          App.Avvisi.toast('✔ Backup importato.', 'ok');
        });
      });
    });
  }

  App.UI.FinestraBackup = {
    apri: function () {
      var d = App.Stato.dati;
      var fin;
      var stato = el('p', { class: 'stato-riquadro ' + (App.Stato.daSalvareInBackup() ? 'avviso' : 'ok'),
        text: d.ultimoBackup
          ? (App.Stato.daSalvareInBackup() ? '⚠️ Ultimo backup: ' + App.U.dataOraIT(d.ultimoBackup) + '. Ci sono modifiche successive.'
            : '✓ Ultimo backup: ' + App.U.dataOraIT(d.ultimoBackup) + '. È aggiornato.')
          : (d.classi.length ? '⚠️ Non hai ancora esportato nessun backup.' : 'Non ci sono ancora dati da salvare.') });

      var scegli = el('input', { type: 'file', class: 'nascosto', 'aria-label': 'Scegli il backup' });
      scegli.addEventListener('change', function () {
        var f = scegli.files && scegli.files[0];
        if (f) importa(f, fin);
        scegli.value = '';
      });

      var corpo = el('div', { class: 'backup' },
        stato,
        el('div', { class: 'riquadro' },
          el('h3', { text: '🔄 Passare i dati tra dispositivi con Google Drive' }),
          el('ol', {}, App.Config.testi.backupPassi.map(function (t) { return el('li', { text: t }); })),
          el('details', { class: 'come-drive' },
            el('summary', { text: 'Come si salva e si apre da Drive su ogni dispositivo' }),
            el('ul', {}, App.Config.testi.backupDispositivi.map(function (t) { return el('li', { text: t }); }))),
          el('p', { class: 'piccolo', text: App.Config.testi.backupNota })),
        el('div', { class: 'riga-btn' },
          el('button', { type: 'button', class: 'btn btn-info', text: '⬇️ Esporta backup', onclick: function () {
            App.Backup.esporta().then(function (salvato) {
              if (!salvato) { App.Avvisi.toast('Backup non salvato.', 'info'); return; }
              App.UI.piede();
              App.Avvisi.toast('✔ Backup esportato: lo trovi nei Download (o dove hai scelto di salvarlo).', 'ok', 4500);
              fin.chiudi();
            }).catch(function (e) {
              App.Avvisi.toast('❌ ' + (e && e.message ? e.message : 'Non riesco a salvare il backup.'), 'errore', 6000);
            });
          } }),
          el('button', { type: 'button', class: 'btn btn-neutro', text: '⬆️ Importa backup', onclick: function () { scegli.click(); } }),
          scegli));

      fin = App.Finestra.apri({ titolo: 'Backup', icona: '💾', corpo: corpo, fuoco: false,
        pulsanti: [{ testo: 'Chiudi', tipo: 'neutro' }] });
    }
  };
})(window.App = window.App || {});
