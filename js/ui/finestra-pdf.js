/* finestra-pdf.js
 * Cosa fa: finestra "📄 PDF": si scelgono classi, alunni (tutta la classe o alcuni), contenuto
 *          (test, giustificazioni e periodo), tipo di documento (tabella della classe per i
 *          colleghi, oppure una scheda per ogni alunno per le famiglie) e il docente in testa.
 *          Più schede insieme vengono raccolte in un file ZIP: un PDF per alunno.
 * Dipende da: App.U, App.Stato, App.Classi, App.Calendario, App.PdfBase, App.PdfClasse,
 *             App.PdfAlunno, App.ZipScrivi, App.Avvisi, App.Finestra, App.Config
 * Usato da: ui/barra.js (pulsante 📄 PDF)
 */
(function (App) {
  'use strict';

  App.UI = App.UI || {};
  var el = function () { return App.U.el.apply(null, arguments); };

  function radio(nome, valore, testo, scelto, nota) {
    return el('label', { class: 'scelta' }, el('input', { type: 'radio', name: nome, value: valore, checked: scelto }),
      el('span', {}, ' ' + testo, nota ? el('span', { class: 'piccolo', text: ' — ' + nota }) : null));
  }

  App.UI.FinestraPdf = {
    apri: function () {
      var classi = App.Classi.tutte();
      if (!classi.length) { App.Avvisi.toast('Crea prima una classe (🏫 Classi).', 'info'); return; }
      var attiva = App.Stato.classe();
      var pref = App.Stato.dati.preferenze;
      var stato = {};          // classeId -> { scelta: bool, tutti: bool, alunni: { id: true } }
      classi.forEach(function (c) { stato[c.id] = { scelta: attiva && c.id === attiva.id, tutti: true, alunni: {} }; });

      // ---- Classi e alunni ----
      var blocchiClassi = el('div', { class: 'pdf-classi' });
      function disegnaClassi() {
        App.U.svuota(blocchiClassi);
        classi.forEach(function (c) {
          var st = stato[c.id];
          var cb = el('input', { type: 'checkbox', checked: st.scelta, 'aria-label': 'Classe ' + c.nome });
          cb.addEventListener('change', function () { st.scelta = cb.checked; disegnaClassi(); });
          var blocco = el('div', { class: 'pdf-classe' + (st.scelta ? ' pdf-scelta' : '') },
            el('label', { class: 'scelta pdf-classe-testa' }, cb, el('b', { text: ' ' + c.nome }), el('span', { class: 'piccolo', text: '  ' + c.alunni.length + (c.alunni.length === 1 ? ' alunno' : ' alunni') })));
          if (st.scelta && c.alunni.length) {
            var seg = el('div', { class: 'segmenti' }, [[true, 'Tutta la classe'], [false, 'Scegli alunni']].map(function (o) {
              return el('button', { type: 'button', class: 'segmento' + (st.tutti === o[0] ? ' attivo' : ''), text: o[1],
                onclick: function () { st.tutti = o[0]; disegnaClassi(); } });
            }));
            blocco.appendChild(seg);
            if (!st.tutti) {
              blocco.appendChild(el('div', { class: 'pdf-alunni' }, c.alunni.map(function (a) {
                var ca = el('input', { type: 'checkbox', checked: !!st.alunni[a.id] });
                ca.addEventListener('change', function () { if (ca.checked) st.alunni[a.id] = true; else delete st.alunni[a.id]; });
                return el('label', { class: 'scelta' }, ca, ' ' + a.nome);
              })));
            }
          }
          blocchiClassi.appendChild(blocco);
        });
      }
      disegnaClassi();

      // ---- Contenuto ----
      var cbTest = el('input', { type: 'checkbox', checked: true });
      var cbGiust = el('input', { type: 'checkbox', checked: true });
      var anno = App.Calendario.annoAttivo();
      var mese = el('select', { 'aria-label': 'Periodo delle giustificazioni' },
        el('option', { value: '', text: 'Tutto l\'anno ' + App.Calendario.etichetta(anno) }),
        App.Calendario.mesi(anno).map(function (m) { return el('option', { value: m.chiave, text: m.nome + ' ' + m.anno }); }));
      var docente = el('input', { type: 'text', maxlength: 60, value: pref.docente !== null ? pref.docente : App.Config.pdf.docente, 'aria-label': 'Docente' });

      var corpo = el('div', { class: 'modulo finestra-pdf' },
        el('fieldset', { class: 'campo' }, el('legend', { text: '1. Classi e alunni' }), blocchiClassi),
        el('fieldset', { class: 'campo' }, el('legend', { text: '2. Contenuto' }),
          el('label', { class: 'scelta' }, cbTest, ' 📊 Test (risultati, voti, media voti, legenda)'),
          el('label', { class: 'scelta' }, cbGiust, ' 📋 Giustificazioni (con sigle e legenda)'),
          el('label', { class: 'campo' }, el('span', { text: 'Periodo delle giustificazioni' }), mese)),
        el('fieldset', { class: 'campo' }, el('legend', { text: '3. Tipo di documento' }),
          radio('tipoPdf', 'classe', 'Tabella della classe', true, 'per i colleghi, con il riepilogo della classe'),
          radio('tipoPdf', 'alunni', 'Scheda di ogni alunno', false, 'per le famiglie: ogni scheda ha solo i dati di quell\'alunno; più schede = un file ZIP con un PDF per alunno')),
        el('label', { class: 'campo' }, el('span', { text: '4. Docente (in testa al documento)' }), docente),
        el('p', { class: 'piccolo nota-privacy', text: '🔒 Le schede contengono dati personali (anche le giustificazioni): consegna a ogni famiglia solo la scheda del proprio figlio o figlia.' }));

      function scelte() {
        return classi.filter(function (c) { return stato[c.id].scelta; }).map(function (c) {
          var st = stato[c.id];
          return { classe: c, alunni: st.tutti ? c.alunni.slice() : c.alunni.filter(function (a) { return st.alunni[a.id]; }) };
        });
      }

      function crea() {
        var voci = scelte().filter(function (v) { return v.alunni.length; });
        var tipo = corpo.querySelector('input[name=tipoPdf]:checked').value;
        var opz = { test: cbTest.checked, giust: cbGiust.checked, anno: anno, mese: mese.value, docente: App.U.spazi(docente.value) };
        if (!voci.length) { App.Avvisi.toast('Scegli almeno una classe con degli alunni.', 'info', 4000); return false; }
        if (!opz.test && !opz.giust) { App.Avvisi.toast('Scegli cosa mettere nel PDF: test, giustificazioni o entrambi.', 'info', 4000); return false; }
        pref.docente = opz.docente;
        App.Stato.scrivi();
        App.Avvisi.toast('⏳ Preparo il PDF…', 'info', 2000);
        return App.PdfBase.carica().then(function (Pdf) {
          var oggi = App.U.oggiISO(), cosa = (opz.test ? 'test' : '') + (opz.test && opz.giust ? '-' : '') + (opz.giust ? 'giustificazioni' : '');
          if (tipo === 'classe') {
            var nome = 'registro-sm_' + voci.map(function (v) { return App.PdfBase.nomeFile(v.classe.nome); }).join('-') + '_' + cosa + '_' + oggi + '.pdf';
            return App.U.scarica(nome, App.PdfClasse.crea(Pdf, voci, opz).output('blob'), 'application/pdf').then(function (ok) { return ok ? nome : null; });
          }
          var file = [];
          voci.forEach(function (v) {
            v.alunni.forEach(function (a) {
              var doc = App.PdfAlunno.crea(Pdf, v.classe, a, opz);
              file.push({ nome: App.PdfAlunno.nomeFile(v.classe, a), dati: new Uint8Array(doc.output('arraybuffer')) });
            });
          });
          if (file.length === 1) {
            return App.U.scarica(file[0].nome, new Blob([file[0].dati], { type: 'application/pdf' }), 'application/pdf').then(function (ok) { return ok ? file[0].nome : null; });
          }
          var zip = 'schede_' + voci.map(function (v) { return App.PdfBase.nomeFile(v.classe.nome); }).join('-') + '_' + oggi + '.zip';
          return App.U.scarica(zip, App.ZipScrivi.crea(file), 'application/zip').then(function (ok) { return ok ? zip + ' (' + file.length + ' schede)' : null; });
        }).then(function (fatto) {
          if (fatto) App.Avvisi.toast('✔ Creato: ' + fatto + '. Lo trovi nei Download.', 'ok', 6000);
        }).catch(function (e) {
          console.error(e);
          App.Avvisi.toast('❌ Non riesco a creare il PDF. Se è la prima volta, apri l\'app con internet e riprova.', 'errore', 7000);
        }).then(function () { return false; });
      }

      App.Finestra.apri({
        titolo: 'Crea PDF', icona: '📄', corpo: corpo, larga: true, fuoco: false,
        pulsanti: [{ testo: 'Chiudi', tipo: 'neutro' }, { testo: '📄 Crea PDF', tipo: 'info', azione: crea }]
      });
    }
  };
})(window.App = window.App || {});
