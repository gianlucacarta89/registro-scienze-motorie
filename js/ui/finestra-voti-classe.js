/* finestra-voti-classe.js
 * Cosa fa: finestra "📏 Tabelle dei voti della classe": le tabelle del libro si mettono per CLASSE.
 *          Fascia della classe proposta dal nome (1G = 1° biennio, 3G = 2° biennio, 5N = quinto anno),
 *          modificabile e ricordata; per ogni test della classe il test del libro proposto (il più
 *          simile) e lo stato della tabella attuale. Sui test spuntati: "📖 Applica le tabelle del libro"
 *          oppure "🗑️ Togli le tabelle". I risultati degli alunni non cambiano mai.
 * Dipende da: App.U, App.Config (fasce), App.LibroVoti, App.SchedaTest, App.Voti, App.ElencoTest,
 *             App.Stato, App.Avvisi, App.Finestra, App.UI.disegnaContenuto, App.UI.FinestraVoti
 * Usato da: ui/pagina-classi.js, ui/tabella-voti.js, ui/profilo-alunno.js
 */
(function (App) {
  'use strict';

  App.UI = App.UI || {};
  var el = function () { return App.U.el.apply(null, arguments); };

  function stato(t) {
    if (!App.Voti.haTabella(t)) return { testo: 'nessuna tabella', cls: 'nessuna' };
    var f = t.fasciaVoti && App.SchedaTest.fascia(t.fasciaVoti);
    if (t.daLibro || f) return { testo: '📖 ' + (t.daLibro || 'dal libro') + (f ? ' · ' + f.nome : ''), cls: 'libro' };
    return { testo: '✏️ tabella scritta a mano', cls: 'mano' };
  }

  App.UI.FinestraVotiClasse = {
    apri: function (classe) {
      if (!classe.test.length) { App.Avvisi.toast('La classe ' + classe.nome + ' non ha ancora test: sceglili in ⏱️ Sessioni.', 'info', 5000); return; }
      var fin, scelte = {};          // testId -> { si: bool, libro: nome }
      classe.test.forEach(function (t) {
        var p = App.LibroVoti.proposto(t);
        scelte[t.id] = { si: !!p, libro: p ? p.nome : '' };
      });
      var fascia = el('select', { 'aria-label': 'Fascia della classe' },
        App.Config.fasce.map(function (f) { return el('option', { value: f.id, text: f.nome }); }));
      fascia.value = App.SchedaTest.fasciaDiClasse(classe) || 'b1';
      var lista = el('ul', { class: 'lista lista-voti-classe' });

      function disegna() {
        App.U.svuota(lista);
        classe.test.forEach(function (t) {
          var sc = scelte[t.id], st = stato(t);
          var cb = el('input', { type: 'checkbox', checked: sc.si, 'aria-label': 'Scegli ' + t.nome });
          cb.addEventListener('change', function () { sc.si = cb.checked; });
          var comp = App.LibroVoti.compatibili(t);
          var menu = el('select', { 'aria-label': 'Test del libro per ' + t.nome },
            el('option', { value: '', text: '— nessun test del libro —' }),
            comp.map(function (x) { return el('option', { value: x.p.nome, text: x.p.nome + (x.p.fasce ? '' : ' (uguale per tutte le classi)') }); }));
          menu.value = sc.libro;
          menu.addEventListener('change', function () { sc.libro = menu.value; if (menu.value) { sc.si = true; cb.checked = true; } });
          lista.appendChild(el('li', { class: 'riga-lista riga-voti-classe' },
            el('label', { class: 'spunta-uso' }, cb),
            el('div', { class: 'testo-test' },
              el('b', { text: t.nome }),
              el('span', { class: 'stato-tabella ' + st.cls, text: 'Ora: ' + st.testo }),
              el('label', { class: 'campo-libro' }, el('span', { class: 'piccolo', text: 'Dal libro: ' }), menu)),
            el('button', { type: 'button', class: 'btn btn-neutro piccolo-btn', 'aria-label': 'Modifica a mano la tabella di ' + t.nome, text: '✏️',
              onclick: function () { App.UI.FinestraVoti.apri(classe, t); } })));
        });
      }
      disegna();

      function spuntati() { return classe.test.filter(function (t) { return scelte[t.id].si; }); }

      function applica() {
        var lista = spuntati(), f = fascia.value, fatti = [], saltati = [];
        if (!lista.length) { App.Avvisi.toast('Spunta almeno un test.', 'info'); return false; }
        classe.fascia = f;                                   // la classe ricorda la sua fascia
        lista.forEach(function (t) {
          var p = scelte[t.id].libro && App.LibroVoti.trova(scelte[t.id].libro);
          if (p && App.LibroVoti.applica(t, p, f)) { fatti.push(t.nome); App.ElencoTest.aggiorna(classe, t); } else saltati.push(t.nome);
        });
        App.Stato.salva();
        App.UI.disegnaContenuto();
        disegna();
        App.Avvisi.toast('✔ Tabelle del libro, ' + App.SchedaTest.fascia(f).nome + ', messe a ' + fatti.length + ' test' +
          (saltati.length ? '. Senza test del libro scelto: ' + saltati.join(', ') : '') + '. I risultati non cambiano.', fatti.length ? 'ok' : 'info', 7000);
        return false;
      }

      function togli() {
        var lista = spuntati().filter(function (t) { return App.Voti.haTabella(t); });
        if (!lista.length) { App.Avvisi.toast('Nessuno dei test spuntati ha una tabella da togliere.', 'info', 4000); return false; }
        App.Avvisi.conferma({ titolo: 'Togliere ' + lista.length + (lista.length === 1 ? ' tabella dei voti?' : ' tabelle dei voti?'), pericolo: true, testoOk: '🗑️ Togli',
          testo: [lista.map(function (t) { return t.nome; }).join(', '), 'I risultati degli alunni restano: spariscono solo i voti calcolati, finché non rimetti una tabella.'] })
          .then(function (si) {
            if (!si) return;
            lista.forEach(function (t) { App.LibroVoti.togli(t); App.ElencoTest.aggiorna(classe, t); });
            App.Stato.salva();
            App.UI.disegnaContenuto();
            disegna();
            App.Avvisi.toast('🗑️ Tolte ' + lista.length + ' tabelle dei voti.', 'info', 4000);
          });
        return false;
      }

      var corpo = el('div', { class: 'finestra-voti-classe' },
        el('p', { class: 'piccolo', text: 'Le tabelle del libro si mettono per classe: scegli la fascia, controlla per ogni test quale test del libro usare e tocca "📖 Applica". I risultati degli alunni non cambiano mai.' }),
        el('label', { class: 'campo scelta-fascia-classe' }, el('span', { text: 'Fascia della classe ' + classe.nome }), fascia),
        el('div', { class: 'riga-btn sinistra' },
          el('button', { type: 'button', class: 'btn btn-neutro piccolo-btn', text: '☑️ Tutti', onclick: function () { classe.test.forEach(function (t) { scelte[t.id].si = true; }); disegna(); } }),
          el('button', { type: 'button', class: 'btn btn-neutro piccolo-btn', text: '⬜ Nessuno', onclick: function () { classe.test.forEach(function (t) { scelte[t.id].si = false; }); disegna(); } })),
        lista);

      fin = App.Finestra.apri({
        titolo: 'Tabelle dei voti – ' + classe.nome, icona: '📏', corpo: corpo, larga: true, fuoco: false,
        pulsanti: [
          { testo: '🗑️ Togli le tabelle', tipo: 'pericolo', azione: togli },
          { testo: 'Chiudi', tipo: 'neutro' },
          { testo: '📖 Applica le tabelle del libro', tipo: 'ok', azione: applica }
        ]
      });
    }
  };
})(window.App = window.App || {});
