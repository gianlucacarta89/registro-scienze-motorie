/* finestra-importa.js
 * Cosa fa: caricamento dei nomi degli alunni da file (Excel, Word, CSV, testo) o da testo
 *          incollato, con anteprima: si possono togliere i nomi sbagliati prima di aggiungerli.
 * Dipende da: App.U, App.Config (fileNomi), App.LeggiFile, App.Nomi, App.Classi, App.Stato,
 *             App.Avvisi, App.Finestra, App.UI.disegna
 * Usato da: ui/finestra-alunni.js, ui/finestra-classi.js, ui/tabella-test.js, ui/tabella-giust.js
 */
(function (App) {
  'use strict';

  App.UI = App.UI || {};
  var el = function () { return App.U.el.apply(null, arguments); };

  App.UI.FinestraImporta = {
    apri: function (classe) {
      var anteprima = el('div', { class: 'anteprima' });
      var pulsanteAggiungi;
      var nomi = [];          // [{ nome, scelto, doppio }]

      function aggiornaPulsante() {
        var n = nomi.filter(function (x) { return x.scelto; }).length;
        pulsanteAggiungi.textContent = '✔ Aggiungi ' + n + (n === 1 ? ' alunno' : ' alunni');
        pulsanteAggiungi.disabled = n === 0;
      }

      function mostra(lista, origine) {
        nomi = lista.map(function (n) {
          var doppio = App.Classi.esisteAlunno(classe, n);
          return { nome: n, scelto: !doppio, doppio: doppio };
        });
        App.U.svuota(anteprima);
        if (!nomi.length) {
          anteprima.appendChild(el('p', { class: 'avviso-riga', text: '⚠️ In ' + origine + ' non ho trovato nomi. Serve un nome per riga (o per cella nella prima colonna).' }));
          aggiornaPulsante();
          return;
        }
        var doppi = nomi.filter(function (x) { return x.doppio; }).length;
        anteprima.appendChild(el('p', { class: 'piccolo', text: 'Trovati ' + nomi.length + ' nomi in ' + origine + '. Controllali: togli la spunta a quelli da non aggiungere e correggi quelli scritti male.' +
          (doppi ? ' ' + doppi + ' sono già nella classe e verranno saltati.' : '') }));
        anteprima.appendChild(el('ul', { class: 'lista-anteprima' }, nomi.map(function (x) {
          var cb = el('input', { type: 'checkbox', checked: x.scelto, disabled: x.doppio, 'aria-label': 'Aggiungi ' + x.nome });
          cb.addEventListener('change', function () { x.scelto = cb.checked; aggiornaPulsante(); });
          if (x.doppio) {
            return el('li', { class: 'doppio' }, cb, el('span', { text: x.nome }), el('span', { class: 'piccolo', text: ' (già presente)' }));
          }
          // il nome si può correggere prima di aggiungerlo
          var campo = el('input', { type: 'text', class: 'nome-anteprima', value: x.nome, maxlength: App.Config.limiti.nomeAlunno, 'aria-label': 'Nome' });
          campo.addEventListener('input', function () { x.nome = campo.value; });
          return el('li', {}, cb, campo);
        })));
        aggiornaPulsante();
      }

      var scegliFile = el('input', { type: 'file', accept: App.Config.fileNomi, class: 'nascosto', 'aria-label': 'Scegli il file' });
      scegliFile.addEventListener('change', function () {
        var f = scegliFile.files && scegliFile.files[0];
        if (!f) return;
        App.U.svuota(anteprima).appendChild(el('p', { class: 'piccolo', text: '⏳ Leggo ' + f.name + '…' }));
        App.LeggiFile.righe(f).then(function (righe) {
          mostra(App.Nomi.daRighe(righe), '"' + f.name + '"');
        }).catch(function (e) {
          App.U.svuota(anteprima);
          App.Avvisi.toast('❌ ' + (e.perUtente ? e.message : 'Non riesco a leggere il file. Prova a salvarlo di nuovo come .xlsx o .docx, oppure incolla i nomi.'), 'errore', 7000);
        }).then(function () { scegliFile.value = ''; });
      });

      var testo = el('textarea', { rows: 6, placeholder: 'Rossi Mario\nBianchi Laura\nVerdi Luca\n…' });

      var corpo = el('div', { class: 'importa' },
        el('div', { class: 'riquadro' },
          el('h3', { text: '📄 Da un file' }),
          el('p', { class: 'piccolo', text: 'Excel (.xlsx), Word (.docx), PDF, .csv o .txt. Un alunno per riga: si leggono le colonne Cognome e Nome; numeri d\'ordine, date, intestazioni e altre colonne vengono tolti. Il PDF deve essere quello originale (per esempio esportato dal registro elettronico), non una scansione.' }),
          el('button', { type: 'button', class: 'btn btn-info', text: '📂 Scegli il file…', onclick: function () { scegliFile.click(); } }),
          scegliFile),
        el('div', { class: 'riquadro' },
          el('h3', { text: '📋 Incolla l\'elenco' }),
          el('p', { class: 'piccolo', text: 'Copia i nomi dal registro, da un documento o da una mail e incollali qui, uno per riga.' }),
          testo,
          el('button', { type: 'button', class: 'btn btn-info', text: '👀 Leggi i nomi incollati', onclick: function () {
            mostra(App.Nomi.daTesto(testo.value), 'il testo incollato');
          } })),
        anteprima);

      var fin = App.Finestra.apri({
        titolo: 'Carica alunni in ' + classe.nome, icona: '📥', corpo: corpo, larga: true, fuoco: false,
        pulsanti: [
          { testo: 'Chiudi', tipo: 'neutro' },
          { testo: '✔ Aggiungi', tipo: 'ok', azione: function () {
            var scelti = nomi.filter(function (x) { return x.scelto; }).map(function (x) { return x.nome; });
            if (!scelti.length) { App.Avvisi.toast('Prima scegli un file o incolla un elenco.', 'info'); return false; }
            var r = App.Classi.aggiungiAlunni(classe, scelti);
            App.Stato.salva();
            App.UI.disegna();
            App.Avvisi.toast('✔ Aggiunti ' + r.aggiunti + ' alunni in ' + classe.nome + (r.doppi.length ? ' (' + r.doppi.length + ' saltati perché già presenti)' : '') + '.', 'ok', 4500);
          } }
        ]
      });
      pulsanteAggiungi = fin.piede.lastChild;
      aggiornaPulsante();
    }
  };
})(window.App = window.App || {});
