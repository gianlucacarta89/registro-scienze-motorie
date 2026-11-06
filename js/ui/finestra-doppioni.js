/* finestra-doppioni.js
 * Cosa fa: finestra "🔗 Test doppioni" (da 📚 Test): gruppi di test con nomi simili nell'elenco 📚 e in
 *          ogni classe. Per ogni gruppo si sceglie il test da tenere (proposto: quello del libro, con la
 *          tabella dei voti, con più risultati) e si spuntano quelli da unire; "🔗 Unisci" sposta i
 *          risultati nel test tenuto e toglie i doppioni. Non si perde nessun risultato: se due valori
 *          sono diversi il doppione resta con quei valori, e la finestra lo dice. In fondo "✋ Unisci a
 *          mano": due test qualsiasi compatibili (stessa misura e direzione) dell'elenco o di una classe.
 * Dipende da: App.U, App.Doppioni, App.Test, App.Voti, App.ElencoTest, App.Stato, App.Avvisi, App.Finestra,
 *             App.UI.disegnaContenuto
 * Usato da: ui/lista-test.js
 */
(function (App) {
  'use strict';

  App.UI = App.UI || {};
  var el = function () { return App.U.el.apply(null, arguments); };
  var nGruppo = 0;

  function info(t, classe, nellElenco) {
    var p = [];
    p.push(t.libro || t.daLibro || t.fonte ? '📖 libro' : '✏️ mio');
    if (!nellElenco) p.push('dal libro, non ancora nell\'elenco');
    if (classe) { var n = App.Test.quantiRisultati(classe, t.id); p.push(n + (n === 1 ? ' risultato' : ' risultati')); }
    if (App.Voti.haTabella(t) || t.fasce) p.push('📏 voti');
    else p.push('senza tabella dei voti');
    return p.join(' · ');
  }

  // Un gruppo: scelta del test da tenere (radio) e di quelli da unire (spunta)
  function gruppo(gr, classe, rifai) {
    var nome = 'tieni-' + (++nGruppo), elenco = App.ElencoTest.tutti();
    var tieni = App.Doppioni.proposto(gr, classe), unire = {};
    gr.forEach(function (t) { unire[t.nome + '|' + (t.id || '')] = true; });
    function chiave(t) { return t.nome + '|' + (t.id || ''); }
    var righe = el('ul', { class: 'lista lista-doppioni' });
    function disegna() {
      App.U.svuota(righe);
      gr.forEach(function (t) {
        var dentro = classe || elenco.indexOf(t) >= 0;
        var r = el('input', { type: 'radio', name: nome, checked: t === tieni, 'aria-label': 'Tieni ' + t.nome });
        r.addEventListener('change', function () { tieni = t; disegna(); });
        var cb = el('input', { type: 'checkbox', checked: unire[chiave(t)] && t !== tieni, disabled: t === tieni || !dentro, 'aria-label': 'Unisci ' + t.nome });
        cb.addEventListener('change', function () { unire[chiave(t)] = cb.checked; });
        righe.appendChild(el('li', { class: 'riga-lista riga-doppione' + (t === tieni ? ' tenuto' : '') },
          el('label', { class: 'spunta-uso', title: 'Tieni questo' }, r, el('span', { class: 'piccolo', text: 'Tieni' })),
          el('div', { class: 'testo-test' }, el('b', { text: t.nome }), el('span', { class: 'piccolo', text: info(t, classe, dentro) })),
          t === tieni ? el('span', { class: 'piccolo', text: '✔ resta' }) :
            el('label', { class: 'spunta-uso', title: 'Unisci al test tenuto' }, cb, el('span', { class: 'piccolo', text: dentro ? 'Unisci' : '–' }))));
      });
    }
    disegna();
    return el('div', { class: 'riquadro gruppo-doppioni' }, righe,
      el('div', { class: 'riga-btn' }, el('button', { type: 'button', class: 'btn btn-ok piccolo-btn', text: '🔗 Unisci', onclick: function () {
        var altri = gr.filter(function (t) { return t !== tieni && unire[chiave(t)] && (classe || elenco.indexOf(t) >= 0); });
        if (!altri.length) { App.Avvisi.toast('Spunta almeno un test da unire.', 'info'); return; }
        unisci(classe, tieni, altri);
        rifai();
      } })));
  }

  function unisci(classe, tieni, altri) {
    if (classe) {
      var r = App.Doppioni.unisciInClasse(classe, tieni, altri);
      App.ElencoTest.aggiorna(classe, tieni);
      App.Avvisi.toast('✔ ' + classe.nome + ': uniti in "' + tieni.nome + '"; ' + r.spostati + ' risultati spostati' +
        (r.rimasti.length ? '. ⚠️ ' + (r.diversi === 1 ? '1 risultato è diverso da quello già presente: resta' : r.diversi + ' risultati sono diversi da quelli già presenti: restano') + ' in ' + r.rimasti.join(', ') + '. Controllali, correggi o cancella quello sbagliato e poi unisci di nuovo.' : '.'), r.rimasti.length ? 'info' : 'ok', 9000);
    } else {
      var x = App.Doppioni.unisciInElenco(tieni, altri);
      App.Avvisi.toast('✔ Elenco 📚: tolti ' + x.tolti.join(', ') + '; resta "' + x.tieni.nome + '".', 'ok', 6000);
    }
    App.Stato.salva();
    App.UI.disegnaContenuto();
  }

  // ✋ Unisci a mano: dove (elenco o classe), test da tenere, test da unire (compatibili)
  function aMano(rifai) {
    var dove = el('select', { 'aria-label': 'Dove' }, el('option', { value: '', text: '📚 Elenco dei test' }),
      App.Stato.dati.classi.map(function (c) { return el('option', { value: c.id, text: '🏫 Classe ' + c.nome }); }));
    var c0 = App.Stato.classe();
    if (c0) dove.value = c0.id;
    var tieni = el('select', { 'aria-label': 'Test da tenere' }), unire = el('select', { 'aria-label': 'Test da unire' });
    function classe() { return App.Stato.dati.classi.filter(function (c) { return c.id === dove.value; })[0] || null; }
    function lista() { return classe() ? classe().test : App.ElencoTest.tutti(); }
    function opzioni(sel, l, vuoto) {
      App.U.svuota(sel);
      sel.appendChild(el('option', { value: '', text: vuoto }));
      l.forEach(function (t) { sel.appendChild(el('option', { value: t.id, text: t.nome })); });
    }
    function trova(id) { return lista().filter(function (t) { return t.id === id; })[0]; }
    function aggiornaUnire() {
      var t = trova(tieni.value);
      opzioni(unire, t ? lista().filter(function (x) { return App.Doppioni.compatibili(t, x); }) : [], t ? '— scegli il test da unire —' : '— prima scegli quello da tenere —');
    }
    function aggiornaTutto() { opzioni(tieni, lista(), '— scegli il test da tenere —'); aggiornaUnire(); }
    dove.addEventListener('change', aggiornaTutto);
    tieni.addEventListener('change', aggiornaUnire);
    aggiornaTutto();
    return el('div', { class: 'riquadro gruppo-doppioni a-mano' },
      el('p', { class: 'piccolo', text: 'Per test che l\'app non riconosce da sola. Si possono unire solo test con la stessa misura (tempo/distanza…) e la stessa direzione (meglio alto o basso). ⚠️ Unisci solo test fatti nello stesso modo (stessa distanza, stesso peso): altrimenti i voti non tornano.' }),
      el('label', { class: 'campo' }, el('span', { text: 'Dove' }), dove),
      el('label', { class: 'campo' }, el('span', { text: '✔ Test da tenere' }), tieni),
      el('label', { class: 'campo' }, el('span', { text: '🔗 Test da unire (sparisce)' }), unire),
      el('div', { class: 'riga-btn' }, el('button', { type: 'button', class: 'btn btn-ok piccolo-btn', text: '🔗 Unisci', onclick: function () {
        var a = trova(tieni.value), b = trova(unire.value);
        if (!a || !b) { App.Avvisi.toast('Scegli il test da tenere e quello da unire.', 'info'); return; }
        unisci(classe(), a, [b]);
        rifai();
      } })));
  }

  App.UI.FinestraDoppioni = {
    apri: function () {
      var corpo = el('div', { class: 'finestra-doppioni' });
      function disegna() {
        App.U.svuota(corpo);
        var ge = App.Doppioni.gruppiElenco(), tot = ge.length;
        corpo.appendChild(el('p', { class: 'piccolo', text: 'Test con nomi simili (stessa misura e stessi numeri nel nome). Per ogni gruppo scegli quale tenere e tocca "🔗 Unisci": i risultati passano al test tenuto, nessun risultato va perso. Prima, per sicurezza, puoi fare 💾 Backup → ⬇️ Esporta.' }));
        if (ge.length) {
          corpo.appendChild(el('h4', { text: '📚 Elenco dei test' }));
          ge.forEach(function (g) { corpo.appendChild(gruppo(g, null, disegna)); });
        }
        App.Stato.dati.classi.forEach(function (c) {
          var gc = App.Doppioni.gruppi(c.test);
          if (!gc.length) return;
          tot += gc.length;
          corpo.appendChild(el('h4', { text: '🏫 Classe ' + c.nome }));
          gc.forEach(function (g) { corpo.appendChild(gruppo(g, c, disegna)); });
        });
        if (!tot) corpo.appendChild(el('p', { class: 'suggerimento', text: '✓ Nessun doppione trovato dall\'app.' }));
        corpo.appendChild(el('p', { class: 'piccolo', text: 'Un test senza numeri nel nome (es. "Velocità mt piani") che somiglia a test con numeri diversi (30 m e 60/80 m) non viene proposto: uniscilo qui sotto a mano, al test fatto con la stessa distanza.' }));
        corpo.appendChild(el('h4', { text: '✋ Unisci a mano' }));
        corpo.appendChild(aMano(disegna));
      }
      disegna();
      App.Finestra.apri({ titolo: 'Test doppioni', icona: '🔗', corpo: corpo, larga: true, fuoco: false,
        pulsanti: [{ testo: 'Chiudi', tipo: 'neutro' }] });
    }
  };
})(window.App = window.App || {});
