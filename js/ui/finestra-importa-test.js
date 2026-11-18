/* finestra-importa-test.js
 * Cosa fa: 📥 Importa test in un libro del docente (📖 Libro). Si carica un file (Excel, Word, PDF,
 *          testo, .json), si scattano o si scelgono foto delle pagine, oppure si incolla il testo:
 *          l'app riconosce i test e le tabelle dei voti (App.ImportaTest, foto con App.Ocr) e li mostra
 *          UNO PER UNO DA CONTROLLARE. Niente si salva da solo: per ogni test "✏️ Controlla e salva"
 *          (scheda completa, modificabile) oppure "✔ Salva così", oppure "🗑️ Scarta".
 *          Se nel libro c'è già un test con lo stesso nome, salvando lo si sostituisce (con avviso).
 * Dipende da: App.U, App.Config (importaTest, fasce, sessi), App.LeggiFile, App.ImportaTest, App.Ocr,
 *             App.Libri, App.Stato, App.Avvisi, App.Finestra, App.UI.FinestraTestLibro, App.UI.disegnaContenuto
 * Usato da: ui/pagina-libro.js
 */
(function (App) {
  'use strict';

  App.UI = App.UI || {};
  var el = function () { return App.U.el.apply(null, arguments); };

  function misura(t) {
    var m = t.tipo === 'tempo' ? (t.formatoTempo === 'min' ? 'tempo min:sec' : 'tempo in secondi') : (t.unita || 'numero');
    return m + ' · ' + (t.migliore === 'alto' ? 'meglio più alto ↑' : 'meglio più basso ↓');
  }

  function anteprima(t) {
    var tabelle = t.fasce ? App.Config.fasce.filter(function (f) { return t.fasce[f.id]; }).map(function (f) { return { nome: f.nome, righe: t.fasce[f.id].righe }; }) :
      t.voti ? [{ nome: 'Uguale per tutte le classi', righe: t.voti.righe }] : [];
    if (!tabelle.length) return null;
    return el('div', { class: 'importa-tabelle' }, tabelle.map(function (tb) {
      return el('table', { class: 'tabella importa-tabella' },
        el('caption', { text: tb.nome }),
        el('thead', {}, el('tr', {}, el('th', { text: 'Voto' }), el('th', { text: '♂' }), el('th', { text: '♀' }))),
        el('tbody', {}, tb.righe.filter(function (r) { return r.voto >= 5; }).map(function (r) {
          return el('tr', {}, el('th', { text: String(r.voto) }),
            el('td', { class: r.M ? '' : 'manca', text: r.M || '—' }), el('td', { class: r.F ? '' : 'manca', text: r.F || '—' }));
        })));
    }));
  }

  App.UI.FinestraImportaTest = {
    apri: function (libro) {
      var cfg = App.Config.importaTest;
      var stato = el('p', { class: 'piccolo importa-stato', 'aria-live': 'polite' });
      var zona = el('div', { class: 'importa-risultati' });
      var occupato = false, incolla = null;

      function scrivi(t) { stato.textContent = t || ''; }
      function giaNelLibro(nome) {
        var k = App.U.chiaveNome(nome);
        return libro.test.filter(function (x) { return App.U.chiaveNome(x.nome) === k; })[0] || null;
      }

      // ----- risultati da controllare -----
      function mostra(lista, origine, fiducia) {
        App.U.svuota(zona);
        scrivi('');
        if (!lista.length) {
          zona.appendChild(el('p', { class: 'avviso-riga', text: '⚠️ In ' + origine + ' non ho trovato test con tabelle dei voti. ' +
            'Prova con una foto più nitida (una pagina alla volta), oppure scrivi il test a mano con "➕ Nuovo test".' }));
          return;
        }
        var conta = el('p', { class: 'piccolo' });
        function aggiornaConta() {
          var s = lista.filter(function (x) { return x.stato === 'salvato'; }).length;
          var d = lista.filter(function (x) { return x.stato === 'da'; }).length;
          conta.textContent = '✔ Salvati ' + s + ' di ' + lista.length + (d ? ' · da controllare ' + d : ' · finito');
        }
        zona.appendChild(el('p', { class: 'suggerimento', text: 'Trovati ' + lista.length + (lista.length === 1 ? ' test' : ' test') + ' in ' + origine + '. ' +
          'Controlla ognuno prima di salvarlo: "✏️ Controlla e salva" apre la scheda completa, dove correggi nome, misura e soglie; ' +
          '"✔ Salva così" lo salva com\'è se l\'anteprima è giusta.' }));
        if (fiducia !== null && fiducia !== undefined && fiducia < 80) {
          zona.appendChild(el('p', { class: 'avviso-riga', text: '⚠️ Le foto si leggono male (qualità ' + fiducia + '%): controlla ogni numero, oppure rifai la foto più dritta e con più luce.' }));
        }
        zona.appendChild(conta);
        lista.forEach(function (x) { zona.appendChild(carta(x, aggiornaConta)); });
        aggiornaConta();
        if (incolla) incolla.classList.add('nascosto');
        if (zona.scrollIntoView) zona.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      function carta(x, aggiornaConta) {
        var box = el('div', { class: 'importa-carta' });
        function disegna() {
          App.U.svuota(box);
          var t = x.salvato || x.test, gia = x.salvato ? null : giaNelLibro(t.nome);
          box.className = 'importa-carta' + (x.stato === 'salvato' ? ' salvato' : x.stato === 'scartato' ? ' scartato' : '');
          box.appendChild(el('h4', {}, el('span', { text: t.nome }),
            el('span', { class: 'chip', text: x.stato === 'salvato' ? '✔ salvato' : x.stato === 'scartato' ? 'scartato' : 'da controllare' })));
          box.appendChild(el('p', { class: 'piccolo', text: (t.tipologia || 'senza tipologia') + ' · ' + misura(t) }));
          if (x.stato === 'scartato') {
            box.appendChild(el('div', { class: 'riga-btn sinistra' }, el('button', { type: 'button', class: 'btn btn-neutro piccolo-btn', text: '↩️ Recupera',
              onclick: function () { x.stato = 'da'; disegna(); aggiornaConta(); } })));
            return;
          }
          if (x.stato !== 'salvato') {
            var avvisi = x.avvisi.slice();
            if (gia) avvisi.unshift('Nel libro c\'è già "' + gia.nome + '": salvando lo sostituisci.');
            if (avvisi.length) box.appendChild(el('ul', { class: 'importa-avvisi' }, avvisi.map(function (a) { return el('li', { text: a }); })));
            if (x.nonCapite.length) {
              box.appendChild(el('details', { class: 'importa-noncapite' }, el('summary', { class: 'piccolo', text: 'Righe non capite (' + x.nonCapite.length + ')' }),
                el('ul', { class: 'piccolo' }, x.nonCapite.slice(0, 30).map(function (r) { return el('li', { text: r }); }))));
            }
          }
          var ant = anteprima(t);
          if (ant) box.appendChild(ant);
          var btn = el('div', { class: 'riga-btn sinistra' });
          if (x.stato === 'salvato') {
            btn.appendChild(el('button', { type: 'button', class: 'btn btn-neutro piccolo-btn', text: '✏️ Modifica',
              onclick: function () { App.UI.FinestraTestLibro.apri(libro, x.salvato); } }));
          } else {
            btn.appendChild(el('button', { type: 'button', class: 'btn btn-ok piccolo-btn', text: '✏️ Controlla e salva', onclick: function () {
              App.UI.FinestraTestLibro.rivedi(libro, x.test, giaNelLibro(x.test.nome), function (salvato) {
                x.stato = 'salvato'; x.salvato = salvato; disegna(); aggiornaConta();
              });
            } }));
            btn.appendChild(el('button', { type: 'button', class: 'btn btn-neutro piccolo-btn', text: '✔ Salva così', onclick: function () {
              var p = App.ImportaTest.prepara(x.test);
              if (p.errore) { App.Avvisi.toast('❌ ' + x.test.nome + ': ' + p.errore + ' Tocca "✏️ Controlla e salva" per correggere.', 'errore', 7000); return; }
              var r = App.Libri.salvaTest(libro, p.test, giaNelLibro(p.test.nome));
              if (r.errore) { App.Avvisi.toast('❌ ' + r.errore, 'errore', 5000); return; }
              App.Stato.salva();
              App.Stato.dati.preferenze.libroAperto = libro.id;
              App.UI.disegnaContenuto();
              x.stato = 'salvato'; x.salvato = r.test; disegna(); aggiornaConta();
              App.Avvisi.toast('✔ "' + r.test.nome + '" salvato in "' + libro.nome + '".', 'ok', 3000);
            } }));
            btn.appendChild(el('button', { type: 'button', class: 'btn btn-neutro piccolo-btn', text: '🗑️ Scarta',
              onclick: function () { x.stato = 'scartato'; disegna(); aggiornaConta(); } }));
          }
          box.appendChild(btn);
        }
        disegna();
        return box;
      }

      // ----- lettura -----
      function prepara(risultati) { return risultati.map(function (r) { r.stato = 'da'; return r; }); }
      function errore(e, cosa) {
        occupato = false; scrivi('');
        App.Avvisi.toast('❌ ' + (e && e.perUtente ? e.message : 'Non riesco a leggere ' + cosa + '. Prova a salvarlo come .xlsx, .docx o PDF, oppure incolla il testo.'), 'errore', 8000);
      }
      function inizio() {
        if (occupato) { App.Avvisi.toast('Aspetta: sto ancora leggendo.', 'info', 3000); return false; }
        occupato = true; App.U.svuota(zona); return true;
      }
      function eFoto(f) { return /^image\//.test(f.type || '') || /\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i.test(f.name || ''); }

      function leggiFoto(files) {
        if (!files.length || !inizio()) return;
        App.Ocr.righe(files, scrivi).then(function (r) {
          occupato = false;
          mostra(prepara(App.ImportaTest.daRighe(r.righe, {})), files.length === 1 ? 'la foto' : 'le ' + files.length + ' foto', r.fiducia);
        }).catch(function (e) { errore(e, 'le foto'); });
      }

      function leggiFile(f) {
        if (eFoto(f)) { leggiFoto([f]); return; }
        if (!inizio()) return;
        var ext = App.LeggiFile.estensione(f.name);
        scrivi('⏳ Leggo ' + f.name + '…');
        var lavoro = ext === 'json' ? f.text().then(App.ImportaTest.daJson) :
          App.LeggiFile.righe(f).then(function (righe) {
            return App.ImportaTest.daRighe(righe, { posizionale: ext === 'xlsx' || ext === 'docx' });
          });
        lavoro.then(function (lista) {
          occupato = false;
          mostra(prepara(lista), '"' + f.name + '"');
        }).catch(function (e) { errore(e, 'il file'); });
      }

      var inFile = el('input', { type: 'file', accept: cfg.file, class: 'nascosto', 'aria-label': 'Scegli il file' });
      var inCamera = el('input', { type: 'file', accept: 'image/*', capture: 'environment', class: 'nascosto', 'aria-label': 'Scatta la foto' });
      var inGalleria = el('input', { type: 'file', accept: 'image/*', multiple: true, class: 'nascosto', 'aria-label': 'Scegli le foto' });
      inFile.addEventListener('change', function () { var f = inFile.files && inFile.files[0]; inFile.value = ''; if (f) leggiFile(f); });
      inCamera.addEventListener('change', function () { var f = Array.prototype.slice.call(inCamera.files || []); inCamera.value = ''; leggiFoto(f); });
      inGalleria.addEventListener('change', function () { var f = Array.prototype.slice.call(inGalleria.files || []); inGalleria.value = ''; leggiFoto(f); });

      var area = el('textarea', { rows: 7, 'aria-label': 'Testo da leggere', placeholder: 'Incolla qui il testo dei test con le tabelle, per esempio:\nSalto in lungo da fermo (cm)\nLivello   M   F\nOttimo   214   188\nBuono   190   165\nMedio   165   141' });
      incolla = el('div', { class: 'nascosto' }, area,
        el('div', { class: 'riga-btn sinistra' }, el('button', { type: 'button', class: 'btn btn-ok piccolo-btn', text: '🔎 Leggi il testo', onclick: function () {
          if (!App.U.spazi(area.value)) { App.Avvisi.toast('Incolla prima il testo.', 'info', 3000); return; }
          if (!inizio()) return;
          occupato = false;
          mostra(prepara(App.ImportaTest.daTesto(area.value)), 'il testo incollato');
        } })));

      App.Finestra.apri({
        titolo: 'Importa test · ' + libro.nome, icona: '📥', larga: true, fuoco: false,
        corpo: el('div', { class: 'modulo finestra-importa-test' },
          el('p', { class: 'piccolo', text: 'Carica le pagine del libro con i test e le tabelle dei voti: l\'app prova a riconoscere nome del test, ' +
            'misura, fasce (1° biennio, 2° biennio, quinto), soglie ♂/♀ e scheda. Poi controlli ogni test prima di salvarlo.' }),
          el('div', { class: 'riga-btn sinistra' },
            el('button', { type: 'button', class: 'btn btn-ok', text: '📂 File', title: 'Excel, Word, PDF, testo o .json', onclick: function () { inFile.click(); } }),
            el('button', { type: 'button', class: 'btn btn-ok', text: '📷 Fotografa', onclick: function () { inCamera.click(); } }),
            el('button', { type: 'button', class: 'btn btn-ok', text: '🖼️ Foto dalla galleria', onclick: function () { inGalleria.click(); } }),
            el('button', { type: 'button', class: 'btn btn-neutro', text: '📋 Incolla testo', onclick: function () { incolla.classList.toggle('nascosto'); if (!incolla.classList.contains('nascosto')) area.focus(); } })),
          inFile, inCamera, inGalleria, incolla,
          el('details', { class: 'piccolo importa-aiuto' }, el('summary', { text: 'Consigli' }),
            el('ul', {},
              el('li', { text: '📂 File: Excel (.xlsx, primo foglio), Word (.docx), PDF con testo (non scansionato), .csv/.txt, oppure un file .json già pronto.' }),
              el('li', { text: '📷 Foto: una pagina per foto, dritta, nitida e con buona luce; puoi sceglierne più di una dalla galleria. La lettura avviene sul dispositivo (le foto non vengono inviate); la prima volta serve internet per scaricare il lettore.' }),
              el('li', { text: 'Dalle foto i numeri delle tabelle possono uscire sbagliati: controllali sempre con il libro aperto.' }),
              el('li', { text: 'Pagine difficili (tabelle fitte, colonne unite): manda le foto a Claude e chiedi "il file .json dei test per Registro S.Mot", poi caricalo qui con 📂 File.' }))),
          stato, zona),
        pulsanti: [{ testo: 'Chiudi', tipo: 'neutro' }]
      });
    }
  };
})(window.App = window.App || {});
