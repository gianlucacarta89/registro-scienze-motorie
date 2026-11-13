/* pagina-backup.js
 * Cosa fa: pagina 💾 Backup: spiega come passare i dati tra telefono, tablet e computer,
 *          esporta il file di backup e lo reimporta scegliendo "➕ Unisci" (aggiunge solo ciò che manca,
 *          non cancella nulla: dati/unisci-backup.js) oppure "⬆️ Sostituisci tutto" (con conferma).
 * Dipende da: App.U, App.Backup, App.UnisciBackup, App.Stato, App.Avvisi, App.Finestra,
 *             App.UI (disegna, piede, titoloPagina)
 * Usato da: ui/pagina.js (menu e avviso nel piè di pagina)
 */
(function (App) {
  'use strict';

  App.UI = App.UI || {};
  var el = function () { return App.U.el.apply(null, arguments); };

  function n(x, uno, tanti) { return x + ' ' + (x === 1 ? uno : tanti); }

  // ➕ Unisci: aggiunge dal backup solo ciò che manca, poi mostra cosa è stato aggiunto
  function unisci(b) {
    var r = App.UnisciBackup.unisci(b);
    if (r.niente) {
      (App.Foto ? App.Foto.importa(b.foto) : Promise.resolve(0)).then(function (nf) {
        App.Avvisi.toast(nf ? '✔ Aggiunte ' + nf + ' foto delle attività; il resto c\'era già.' : '✓ Niente da aggiungere: in questo backup non c\'è nulla che manchi qui.', nf ? 'ok' : 'info', 6000);
      });
      return;
    }
    App.Stato.salva().then(function () { return App.Foto ? App.Foto.importa(b.foto) : 0; }).then(function (nf) {
      if (nf) r.fotoNuove = nf;
      App.UI.disegna();
      var righe = [];
      if (r.giust) righe.push('📋 ' + n(r.giust, 'giustificazione', 'giustificazioni'));
      if (r.risultati) righe.push('⏱️ ' + n(r.risultati, 'risultato', 'risultati'));
      if (r.classi) righe.push('🏫 ' + n(r.classi, 'classe', 'classi'));
      if (r.alunni) righe.push('🧑‍🎓 ' + n(r.alunni, 'alunno', 'alunni'));
      if (r.test) righe.push('📚 ' + n(r.test, 'test nelle classi', 'test nelle classi'));
      if (r.attivita) righe.push('⛹️ ' + n(r.attivita, 'attività', 'attività'));
      if (r.votiAttivita) righe.push('⛹️ ' + n(r.votiAttivita, 'voto delle attività', 'voti delle attività'));
      if (r.fotoNuove) righe.push('📷 ' + n(r.fotoNuove, 'foto delle attività', 'foto delle attività'));
      if (r.osservazioni) righe.push('🗒️ ' + n(r.osservazioni, 'osservazione', 'osservazioni'));
      if (r.testElenco) righe.push('📚 ' + n(r.testElenco, 'test nell\'elenco', 'test nell\'elenco'));
      App.Finestra.apri({
        titolo: 'Backup unito', icona: '➕',
        corpo: el('div', {},
          el('p', { text: 'Aggiunti dal backup del ' + App.U.dataOraIT(b.esportato) + ':' }),
          el('ul', {}, righe.map(function (t) { return el('li', { text: t }); })),
          r.diversi ? el('p', { class: 'piccolo', text: 'ℹ️ ' + n(r.diversi, 'risultato è diverso', 'risultati sono diversi') + ' tra il backup e questo dispositivo: ho lasciato quelli di questo dispositivo.' }) : null,
          el('p', { class: 'piccolo', text: 'Non è stato cancellato né cambiato nulla. Se hai altri backup puoi unire anche quelli.' })),
        pulsanti: [{ testo: 'OK', tipo: 'ok' }]
      });
    });
  }

  // ⬆️ Sostituisci: tutti i dati diventano quelli del backup (con conferma)
  function sostituisci(b) {
    App.Avvisi.conferma({
      titolo: 'Sostituire tutti i dati?', pericolo: true, testoOk: '⬆️ Sostituisci tutto',
      testo: [
        '⚠️ Tutti i dati di questo dispositivo saranno cancellati e sostituiti da quelli del backup.',
        App.Backup.localiPiuRecenti(b) ? '⚠️ Su questo dispositivo ci sono modifiche fatte DOPO questo backup: andranno perse. Se non sei sicuro usa "➕ Unisci".' : ''
      ]
    }).then(function (si) {
      if (!si) return;
      return App.Backup.applica(b).then(function () {
        App.UI.disegna();
        App.Avvisi.toast('✔ Backup importato.', 'ok');
      });
    });
  }

  function importa(file) {
    App.Backup.leggi(file).then(function (r) {
      if (r.errore) { App.Avvisi.toast('❌ ' + r.errore, 'errore', 6000); return; }
      var b = r.backup, x = App.Backup.riepilogo(b.dati);
      App.Finestra.apri({
        titolo: 'Importare il backup', icona: '⬆️', fuoco: false,
        corpo: el('div', {},
          el('p', { text: 'Backup del ' + App.U.dataOraIT(b.esportato) + ': ' + n(x.classi, 'classe', 'classi') + ', ' + n(x.alunni, 'alunno', 'alunni') + ', ' +
            n(x.test, 'test', 'test') + ', ' + n(x.giust, 'giustificazione', 'giustificazioni') + '.' }),
          el('p', {}, el('b', { text: '➕ Unisci (consigliato): ' }), 'aggiunge solo ciò che qui manca (giustificazioni, risultati nelle caselle vuote, alunni, classi, test). Non cancella e non cambia nulla.'),
          el('p', {}, el('b', { text: '⬆️ Sostituisci tutto: ' }), 'cancella i dati di questo dispositivo e mette quelli del backup.')),
        pulsanti: [
          { testo: '⬆️ Sostituisci tutto', tipo: 'pericolo', azione: function () { setTimeout(function () { sostituisci(b); }, 0); } },
          { testo: 'Annulla', tipo: 'neutro' },
          { testo: '➕ Unisci', tipo: 'ok', azione: function () { unisci(b); } }
        ]
      });
    });
  }

  App.UI.Pagine = App.UI.Pagine || {};

  App.UI.Pagine.backup = {
    disegna: function (cont) {
      var d = App.Stato.dati;
      var stato = el('p', { class: 'stato-riquadro ' + (App.Stato.daSalvareInBackup() ? 'avviso' : 'ok'),
        text: d.ultimoBackup
          ? (App.Stato.daSalvareInBackup() ? '⚠️ Ultimo backup: ' + App.U.dataOraIT(d.ultimoBackup) + '. Ci sono modifiche successive.'
            : '✓ Ultimo backup: ' + App.U.dataOraIT(d.ultimoBackup) + '. È aggiornato.')
          : (d.classi.length ? '⚠️ Non hai ancora esportato nessun backup.' : 'Non ci sono ancora dati da salvare.') });

      var scegli = el('input', { type: 'file', class: 'nascosto', 'aria-label': 'Scegli il backup' });
      scegli.addEventListener('change', function () {
        var f = scegli.files && scegli.files[0];
        if (f) importa(f);
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
              App.UI.disegnaContenuto();
              App.Avvisi.toast('✔ Backup esportato: lo trovi nei Download (o dove hai scelto di salvarlo).', 'ok', 4500);
            }).catch(function (e) {
              App.Avvisi.toast('❌ ' + (e && e.message ? e.message : 'Non riesco a salvare il backup.'), 'errore', 6000);
            });
          } }),
          el('button', { type: 'button', class: 'btn btn-neutro', text: '⬆️ Importa backup', onclick: function () { scegli.click(); } }),
          scegli));

      cont.appendChild(App.UI.titoloPagina('💾 Backup'));
      cont.appendChild(el('div', { class: 'pagina-riquadro' }, corpo));
    }
  };
})(window.App = window.App || {});
