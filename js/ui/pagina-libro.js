/* pagina-libro.js
 * Cosa fa: pagina 📖 Libro: i libri di testo (App.Libri: quello d'Istituto e gli altri incorporati, solo
 *          lettura, più quelli creati dal docente) con i loro test da consultare, divisi per tipologia.
 *          Per ogni test: caratteristiche, scheda e tabella di valutazione completa ♂/♀ della fascia
 *          scelta. Ricerca per nome. Scelta del libro (proposto quello della classe attiva), classi che
 *          lo usano, "➕ Nuovo libro"; nei libri del docente ➕ Nuovo test, ✏️ / 🗑️ test, ✏️ Rinomina,
 *          🗑️ Elimina libro; nei libri incorporati "📋 Copia in un mio libro". ✏️ Rinomina vale per tutti i libri.
 * Dipende da: App.U, App.Stato, App.Config (fasce, tipologie), App.Libri, App.SchedaTest, App.Test,
 *             App.ParametriTest, App.Avvisi, App.Finestra, App.UI (titoloPagina), App.UI.TabellaVoti,
 *             App.UI.FinestraTestLibro
 * Usato da: ui/pagina.js
 */
(function (App) {
  'use strict';

  App.UI = App.UI || {};
  App.UI.Pagine = App.UI.Pagine || {};
  var el = function () { return App.U.el.apply(null, arguments); };
  var cerca = '';          // testo cercato (resta finché l'app è aperta)
  var tuttiAperti = false;

  function misura(t) {
    if (t.tipo === 'tempo') return t.formatoTempo === 'min' ? 'tempo in minuti:secondi' : 'tempo in secondi';
    return t.unita || 'numero';
  }

  function salvaEDisegna(msg) { App.Stato.salva(); App.UI.disegnaContenuto(); if (msg) App.Avvisi.toast(msg, 'ok', 4000); }

  function comandiTest(libro, t) {
    if (libro.incorporato) {
      return App.Libri.miei().length ? el('div', { class: 'riga-btn sinistra' }, el('button', { type: 'button', class: 'btn btn-neutro piccolo-btn',
        text: '📋 Copia in un mio libro', onclick: function () { App.UI.FinestraTestLibro.copia(t); } })) : null;
    }
    return el('div', { class: 'riga-btn sinistra' },
      el('button', { type: 'button', class: 'btn btn-neutro piccolo-btn', text: '✏️ Modifica', onclick: function () { App.UI.FinestraTestLibro.apri(libro, t); } }),
      el('button', { type: 'button', class: 'btn btn-pericolo piccolo-btn', text: '🗑️ Elimina', onclick: function () {
        App.Avvisi.conferma({ titolo: 'Eliminare "' + t.nome + '" dal libro?', pericolo: true, testoOk: '🗑️ Elimina',
          testo: ['Il test sparisce da "' + libro.nome + '". I test delle classi e i loro risultati non cambiano.'] })
          .then(function (si) { if (si) { App.Libri.eliminaTest(libro, t); salvaEDisegna('🗑️ Test eliminato dal libro.'); } });
      } }));
  }

  function scheda(libro, t, fascia) {
    var f = App.SchedaTest.fascia(fascia);
    var tab = t.fasce ? t.fasce[fascia] : t.voti;
    var strumenti = App.Test.etichetteStrumento(t);
    var reg = App.ParametriTest.regola(t);
    return el('details', { class: 'libro-test', open: tuttiAperti || !!cerca },
      el('summary', {}, el('b', { text: t.nome }),
        el('span', { class: 'piccolo', text: ' · ' + misura(t) + ' · ' + (t.migliore === 'alto' ? 'meglio più alto ↑' : 'meglio più basso ↓') })),
      el('div', { class: 'libro-corpo' },
        el('p', { class: 'libro-caratteristiche' },
          t.tipologia ? el('span', { class: 'etichetta-test libro', text: t.tipologia }) : null,
          strumenti.length ? el('span', { class: 'piccolo', text: ' 🔧 ' + strumenti.join(' · ') }) : null,
          t.negativi ? el('span', { class: 'piccolo', text: ' · ammette valori negativi' }) : null),
        reg && libro.id === App.Libri.ISTITUTO ? el('p', { class: 'piccolo' }, '⚙️ ' + reg.nome + ' modificabile (' + reg.valori.join(', ') + ' ' + reg.unita +
          '): in 📚 Test o in ⏱️ Sessioni apri il test e tocca "⚙️ Cambia…"; i voti si ricalcolano.') : null,
        App.SchedaTest.campi().filter(function (c) { return t[c.id]; }).map(function (c) {
          return el('p', {}, el('b', { text: c.nome + ': ' }), t[c.id]);
        }),
        el('h5', { text: '📏 Tabella di valutazione – ' + (t.fasce ? f.nome : 'uguale per tutte le classi') }),
        tab && tab.righe && tab.righe.length ? App.UI.TabellaVoti.tabellaSoglie(t.migliore, tab.righe, t) :
          el('p', { class: 'piccolo', text: t.fasce ? 'Nessuna tabella per questa fascia.' : 'Nessuna tabella.' }),
        t.fonte ? el('p', { class: 'piccolo', text: 'Fonte: ' + t.fonte }) : null,
        comandiTest(libro, t)));
  }

  function nuovoLibro() {
    var nome = el('input', { type: 'text', maxlength: 80, 'aria-label': 'Nome del libro', placeholder: 'es. Più movimento – Marietti' });
    App.Finestra.apri({ titolo: 'Nuovo libro', icona: '📖', corpo: el('label', { class: 'campo' }, el('span', { text: 'Nome del libro' }), nome),
      pulsanti: [{ testo: 'Annulla', tipo: 'neutro' }, { testo: '✔ Crea', tipo: 'ok', azione: function () {
        var r = App.Libri.nuovo(nome.value);
        if (r.errore) { App.Avvisi.toast('❌ ' + r.errore, 'errore', 5000); return false; }
        App.Stato.dati.preferenze.libroAperto = r.libro.id;
        salvaEDisegna('✔ Libro "' + r.libro.nome + '" creato: ora aggiungi i suoi test.');
      } }] });
  }

  function rinomina(libro) {
    var nome = el('input', { type: 'text', maxlength: 80, value: libro.nome, 'aria-label': 'Nome del libro' });
    App.Finestra.apri({ titolo: 'Rinomina il libro', icona: '✏️', corpo: el('div', {}, el('label', { class: 'campo' }, el('span', { text: 'Nome del libro' }), nome),
        libro.incorporato ? el('p', { class: 'piccolo', text: 'Cambia solo il nome che vedi: test e tabelle restano gli stessi. Lascia vuoto per tornare a "' + libro.nomeOriginale + '".' }) : null),
      pulsanti: [{ testo: 'Annulla', tipo: 'neutro' }, { testo: '✔ Salva', tipo: 'ok', azione: function () {
        var r = App.Libri.rinomina(libro.id, nome.value);
        if (r.errore) { App.Avvisi.toast('❌ ' + r.errore, 'errore', 5000); return false; }
        salvaEDisegna('✔ Libro rinominato.');
      } }] });
  }

  function elimina(libro) {
    var cl = App.Libri.classiCon(libro.id).map(function (c) { return c.nome; });
    App.Avvisi.conferma({ titolo: 'Eliminare il libro "' + libro.nome + '"?', pericolo: true, testoOk: '🗑️ Elimina',
      testo: ['Si cancellano i suoi ' + libro.test.length + ' test (solo dal libro: i test delle classi e i risultati restano).',
        cl.length ? 'Le classi ' + cl.join(', ') + ' torneranno al libro d\'Istituto.' : ''] })
      .then(function (si) { if (si) { App.Libri.elimina(libro.id); App.Stato.dati.preferenze.libroAperto = null; salvaEDisegna('🗑️ Libro eliminato.'); } });
  }

  App.UI.Pagine.libro = {
    disegna: function (cont) {
      var pref = App.Stato.dati.preferenze;
      if (!App.SchedaTest.fascia(pref.fasciaLibro)) pref.fasciaLibro = App.SchedaTest.fasciaDiClasse(App.Stato.classe()) || 'b1';
      var fascia = pref.fasciaLibro;
      var libro = (pref.libroAperto && App.Libri.trova(pref.libroAperto)) || App.Libri.trova(App.Libri.diClasse(App.Stato.classe()));
      var lista = libro.test;
      cont.appendChild(App.UI.titoloPagina('📖 Libro – test e tabelle di valutazione'));

      var scelta = el('select', { 'aria-label': 'Libro' }, App.Libri.tutti().map(function (l) {
        return el('option', { value: l.id, text: (l.incorporato ? '📘 ' : '📗 ') + l.nome + ' (' + l.test.length + ' test)' });
      }));
      scelta.value = libro.id;
      scelta.addEventListener('change', function () { pref.libroAperto = scelta.value; App.Stato.scrivi(); App.UI.disegnaContenuto(); });
      var usato = App.Libri.classiCon(libro.id).map(function (c) { return c.nome; });
      cont.appendChild(el('div', { class: 'strumenti scelta-libro' },
        el('label', { class: 'campo' }, el('span', { text: 'Libro' }), scelta),
        el('button', { type: 'button', class: 'btn btn-ok', text: '➕ Nuovo libro', onclick: nuovoLibro }),
        libro.incorporato ? null : el('button', { type: 'button', class: 'btn btn-ok', text: '➕ Nuovo test', onclick: function () { App.UI.FinestraTestLibro.apri(libro, null); } }),
        el('button', { type: 'button', class: 'btn btn-neutro', text: '✏️ Rinomina', onclick: function () { rinomina(libro); } }),
        libro.incorporato ? null : el('button', { type: 'button', class: 'btn btn-pericolo', text: '🗑️ Elimina libro', onclick: function () { elimina(libro); } })));
      cont.appendChild(el('p', { class: 'piccolo', text: (usato.length ? 'Usato dalle classi: ' + usato.join(', ') + '.' : 'Nessuna classe usa questo libro.') +
        ' Il libro di ogni classe si sceglie in 🏫 Classi.' + (libro.incorporato ? '' : ' Questo è un tuo libro: i test si aggiungono e si modificano qui.') }));

      var campo = el('input', { type: 'search', placeholder: 'Cerca un test (es. salto, navetta)', value: cerca, 'aria-label': 'Cerca un test' });
      var zona = el('div', { class: 'libro-elenco' });
      cont.appendChild(el('div', { class: 'strumenti' },
        el('div', { class: 'segmenti', role: 'tablist', 'aria-label': 'Fascia' }, App.Config.fasce.map(function (f) {
          return el('button', { type: 'button', class: 'segmento' + (fascia === f.id ? ' attivo' : ''), 'aria-pressed': fascia === f.id ? 'true' : 'false',
            text: f.nome, onclick: function () { pref.fasciaLibro = f.id; App.Stato.scrivi(); App.UI.disegnaContenuto(); } });
        })),
        campo,
        el('button', { type: 'button', class: 'btn btn-neutro piccolo-btn', text: tuttiAperti ? '▲ Chiudi tutti' : '▼ Apri tutti',
          onclick: function () { tuttiAperti = !tuttiAperti; App.UI.disegnaContenuto(); } })));
      cont.appendChild(el('p', { class: 'piccolo', text: lista.length + ' test in "' + libro.nome + '". Tocca un test per leggere la scheda e la tabella di valutazione della fascia scelta. Per usarli: 📚 Test → "Lo uso".' }));
      cont.appendChild(zona);

      function disegnaElenco() {
        App.U.svuota(zona);
        if (!lista.length) { zona.appendChild(el('p', { class: 'suggerimento', text: libro.incorporato ? 'Nessun test.' : 'Il libro è vuoto: tocca "➕ Nuovo test" oppure copia un test da un altro libro (📋).' })); return; }
        var kk = App.U.chiaveNome(cerca);
        var trovati = lista.filter(function (t) { return !kk || App.U.chiaveNome(t.nome + ' ' + (t.tipologia || '')).indexOf(kk) >= 0; });
        if (!trovati.length) { zona.appendChild(el('p', { class: 'suggerimento', text: 'Nessun test trovato.' })); return; }
        var tipi = App.Config.tipologie.concat(['']);
        tipi.forEach(function (tip) {
          var gr = trovati.filter(function (t) { return tip ? t.tipologia === tip : App.Config.tipologie.indexOf(t.tipologia) < 0; });
          if (!gr.length) return;
          zona.appendChild(el('section', { class: 'libro-gruppo' }, el('h4', { text: (tip || 'Altro') + ' (' + gr.length + ')' }),
            gr.map(function (t) { return scheda(libro, t, fascia); })));
        });
      }
      campo.addEventListener('input', function () { cerca = campo.value; disegnaElenco(); });
      disegnaElenco();
    }
  };
})(window.App = window.App || {});
