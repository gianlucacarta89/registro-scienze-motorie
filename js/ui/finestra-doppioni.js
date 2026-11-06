/* finestra-doppioni.js
 * Cosa fa: finestra "🔗 Test doppioni" (da 📚 Test): gruppi di test con nomi simili, presi dall'elenco 📚,
 *          dal libro e dalle classi. Per ogni gruppo si sceglie il test da tenere (proposto: quello del
 *          libro, con la tabella dei voti, con più risultati) e si spuntano quelli da unire; "🔗 Unisci"
 *          li unisce nell'elenco E in tutte le classi: lì il test prende il nome di quello tenuto e i
 *          risultati restano tutti. Se due valori sono diversi il doppione resta con quei valori e la
 *          finestra lo dice. In fondo "✋ Unisci a mano" per i test che l'app non riconosce.
 * Dipende da: App.U, App.Doppioni, App.Voti, App.Stato, App.Avvisi, App.Finestra, App.UI.disegnaContenuto
 * Usato da: ui/lista-test.js
 */
(function (App) {
  'use strict';

  App.UI = App.UI || {};
  var el = function () { return App.U.el.apply(null, arguments); };
  var D = function () { return App.Doppioni; };
  var nGruppo = 0;

  function info(t) {
    var p = [], cl = D().nelleClassi(t.nome), n = D().risultatiTotali(t.nome);
    if (D().inElenco(t)) p.push(t.libro || t.fonte ? '📖 libro' : '✏️ mio');
    else if (D().delLibro(t)) p.push('📖 libro, non ancora nell\'elenco');
    else p.push('solo nelle classi');
    p.push(cl.length ? 'classi: ' + cl.map(function (x) { return x.classe.nome; }).join(', ') + ' · ' + n + (n === 1 ? ' risultato' : ' risultati') : 'in nessuna classe');
    if (App.Voti.haTabella(t) || t.fasce) p.push('📏 voti');
    return p.join(' · ');
  }

  function unisci(tieni, altri, rifai) {
    var r = D().unisci(tieni, altri);
    var dif = r.classi.filter(function (c) { return c.rimasti.length; });
    var sp = r.classi.reduce(function (n, c) { return n + c.spostati; }, 0);
    var rin = r.classi.filter(function (c) { return c.rinominato; }).length;
    var cosa = [sp ? sp + (sp === 1 ? ' risultato spostato' : ' risultati spostati') : '', rin ? 'test rinominato in ' + rin + (rin === 1 ? ' classe' : ' classi') : '']
      .filter(Boolean).join(', ');
    App.Stato.salva();
    App.UI.disegnaContenuto();
    App.Avvisi.toast('✔ Uniti in "' + r.nome + '"' + (r.classi.length ? ' nell\'elenco e in ' + r.classi.length + (r.classi.length === 1 ? ' classe (' : ' classi (') +
      r.classi.map(function (c) { return c.nome; }).join(', ') + ')' + (cosa ? '; ' + cosa : '') + '; nessun risultato perso' : ' nell\'elenco') +
      (dif.length ? '. ⚠️ Valori diversi nella stessa prova in ' + dif.map(function (c) { return c.nome + ' (' + c.rimasti.join(', ') + ')'; }).join('; ') +
        ': quei test restano. Correggi o cancella il valore sbagliato e unisci di nuovo.' : '.'), dif.length ? 'info' : 'ok', 10000);
    rifai();
  }

  // Un gruppo: scelta del test da tenere (radio) e di quelli da unire (spunta)
  function gruppo(gr, rifai) {
    var nome = 'tieni-' + (++nGruppo), tieni = D().proposto(gr), no = {};
    function veri(t) { return !D().delLibro(t); }
    var righe = el('ul', { class: 'lista lista-doppioni' });
    function disegna() {
      App.U.svuota(righe);
      gr.forEach(function (t, i) {
        var r = el('input', { type: 'radio', name: nome, checked: t === tieni, 'aria-label': 'Tieni ' + t.nome });
        r.addEventListener('change', function () { tieni = t; disegna(); });
        var cb = el('input', { type: 'checkbox', checked: !no[i], 'aria-label': 'Unisci ' + t.nome });
        cb.addEventListener('change', function () { no[i] = !cb.checked; });
        righe.appendChild(el('li', { class: 'riga-lista riga-doppione' + (t === tieni ? ' tenuto' : '') },
          el('label', { class: 'spunta-uso', title: 'Tieni questo' }, r, el('span', { class: 'piccolo', text: 'Tieni' })),
          el('div', { class: 'testo-test' }, el('b', { text: t.nome }), el('span', { class: 'piccolo', text: info(t) })),
          t === tieni ? el('span', { class: 'piccolo', text: '✔ resta' }) : veri(t) ?
            el('label', { class: 'spunta-uso', title: 'Unisci al test tenuto' }, cb, el('span', { class: 'piccolo', text: 'Unisci' })) :
            el('span', { class: 'piccolo', text: 'resta nel libro' })));
      });
    }
    disegna();
    return el('div', { class: 'riquadro gruppo-doppioni' }, righe,
      el('div', { class: 'riga-btn' }, el('button', { type: 'button', class: 'btn btn-ok piccolo-btn', text: '🔗 Unisci', onclick: function () {
        var altri = gr.filter(function (t, i) { return t !== tieni && !no[i] && veri(t); });
        if (!altri.length) { App.Avvisi.toast('Spunta almeno un test da unire.', 'info'); return; }
        unisci(tieni, altri, rifai);
      } })));
  }

  // ✋ Unisci a mano: test da tenere e test da unire (compatibili), tra elenco, libro e classi
  function aMano(rifai) {
    var tutti = D().voci().slice().sort(function (a, b) { return a.nome.localeCompare(b.nome); });
    var tieni = el('select', { 'aria-label': 'Test da tenere' }), unire = el('select', { 'aria-label': 'Test da unire' });
    function opzioni(sel, l, vuoto) {
      App.U.svuota(sel);
      sel.appendChild(el('option', { value: '', text: vuoto }));
      l.forEach(function (t) { sel.appendChild(el('option', { value: String(tutti.indexOf(t)), text: t.nome })); });
    }
    function aggiornaUnire() {
      var t = tutti[tieni.value];
      opzioni(unire, t ? tutti.filter(function (x) { return !D().delLibro(x) && App.Doppioni.compatibili(t, x); }) : [], t ? '— scegli il test da unire —' : '— prima scegli quello da tenere —');
    }
    opzioni(tieni, tutti, '— scegli il test da tenere —');
    tieni.addEventListener('change', aggiornaUnire);
    aggiornaUnire();
    return el('div', { class: 'riquadro gruppo-doppioni a-mano' },
      el('p', { class: 'piccolo', text: 'Per test che l\'app non riconosce da sola. Si possono unire solo test con la stessa misura (tempo/distanza…) e la stessa direzione (meglio alto o basso). ⚠️ Unisci solo test fatti nello stesso modo (stessa distanza, stesso peso): altrimenti i voti non tornano.' }),
      el('label', { class: 'campo' }, el('span', { text: '✔ Test da tenere (nome che resta)' }), tieni),
      el('label', { class: 'campo' }, el('span', { text: '🔗 Test da unire (sparisce, i risultati passano)' }), unire),
      el('div', { class: 'riga-btn' }, el('button', { type: 'button', class: 'btn btn-ok piccolo-btn', text: '🔗 Unisci', onclick: function () {
        var a = tutti[tieni.value], b = tutti[unire.value];
        if (!a || !b) { App.Avvisi.toast('Scegli il test da tenere e quello da unire.', 'info'); return; }
        unisci(a, [b], rifai);
      } })));
  }

  App.UI.FinestraDoppioni = {
    apri: function () {
      var corpo = el('div', { class: 'finestra-doppioni' });
      function disegna() {
        App.U.svuota(corpo);
        var g = D().gruppiTutti();
        corpo.appendChild(el('p', { class: 'piccolo', text: 'Test con nomi simili (stessa misura e stessi numeri nel nome), dall\'elenco 📚 e dalle classi. Scegli quale tenere e tocca "🔗 Unisci": i doppioni spariscono dall\'elenco e in TUTTE le classi il test prende il nome di quello tenuto, con tutti i risultati. Prima, per sicurezza, puoi fare 💾 Backup → ⬇️ Esporta.' }));
        g.forEach(function (x) { corpo.appendChild(gruppo(x, disegna)); });
        if (!g.length) corpo.appendChild(el('p', { class: 'suggerimento', text: '✓ Nessun doppione trovato dall\'app.' }));
        corpo.appendChild(el('h4', { text: '✋ Unisci a mano' }));
        corpo.appendChild(el('p', { class: 'piccolo', text: 'Un test senza numeri nel nome (es. "Velocità mt piani") che somiglia a test con numeri diversi (30 m e 60/80 m) non viene proposto: uniscilo qui al test fatto con la stessa distanza.' }));
        corpo.appendChild(aMano(disegna));
      }
      disegna();
      App.Finestra.apri({ titolo: 'Test doppioni', icona: '🔗', corpo: corpo, larga: true, fuoco: false,
        pulsanti: [{ testo: 'Chiudi', tipo: 'neutro' }] });
    }
  };
})(window.App = window.App || {});
