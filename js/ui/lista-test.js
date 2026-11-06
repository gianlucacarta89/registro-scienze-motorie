/* lista-test.js
 * Cosa fa: elenco unico dei test della pagina 📚 Test: quelli del libro (App.TestLibro) e quelli
 *          creati dal docente, divisi per tipologia, con la spunta "Lo uso". Solo i test in uso
 *          si scelgono poi in ⏱️ Sessioni. Filtri: tutti, in uso, del libro, miei.
 *          Spuntando un test del libro lo si copia nell'elenco 📚 (dove si può modificare).
 *          "🔗 Doppioni (n)" se ci sono test con nomi simili (ui/finestra-doppioni.js).
 * Dipende da: App.U, App.Config (tipologie), App.TestLibro, App.ElencoTest, App.SchedaTest, App.Test,
 *             App.Voti, App.Stato, App.Classi, App.Avvisi, App.Doppioni, App.UI.FinestraTest, App.UI.FinestraDoppioni
 * Usato da: ui/pagina-test.js
 */
(function (App) {
  'use strict';

  App.UI = App.UI || {};
  var el = function () { return App.U.el.apply(null, arguments); };

  function deLibro(t) { return !!(t.libro || t.fonte); }

  function descrizione(t) {
    var parti = [];
    if (t.descrizione) parti.push(t.descrizione);
    var s = App.Test.etichetteStrumento(t);
    if (s.length) parti.push('🔧 ' + s.join(' · '));
    if (App.SchedaTest.haFasce(t)) parti.push('📏 voti per 1° biennio, 2° biennio, 5° anno');
    else if (App.Voti.haTabella(t)) parti.push('📏 tabella dei voti');
    if (t.note) parti.push('📝 ' + t.note);
    return parti.join(' · ');
  }

  // Tutte le voci: test dell'elenco + test del libro non ancora nell'elenco
  function voci() {
    var lista = App.ElencoTest.tutti().map(function (t) { return { t: t, elenco: true, libro: deLibro(t), uso: App.ElencoTest.inUso(t) }; });
    (App.TestLibro || []).forEach(function (p) {
      if (!App.ElencoTest.nellElenco(p.nome)) lista.push({ t: p, elenco: false, libro: true, uso: false });
    });
    return lista;
  }

  function dettagli(t) {
    return el('details', { class: 'libro-dettagli' }, el('summary', { text: 'Scheda' }),
      App.SchedaTest.campi().filter(function (c) { return t[c.id]; }).map(function (c) {
        return el('p', {}, el('b', { text: c.nome + ': ' }), t[c.id]);
      }),
      t.fonte ? el('p', { class: 'piccolo', text: 'Fonte: ' + t.fonte }) : null);
  }

  function riga(v) {
    var t = v.t;
    var cb = el('input', { type: 'checkbox', checked: v.uso, 'aria-label': 'Lo uso: ' + t.nome });
    cb.addEventListener('change', function () {
      if (v.elenco) App.ElencoTest.impostaUso(t.id, cb.checked);
      else App.ElencoTest.usaDalLibro(t);
      App.Stato.salva();
      App.UI.disegnaContenuto();
    });
    return el('li', { class: 'riga-lista riga-test' + (v.uso ? ' in-uso' : '') },
      el('label', { class: 'spunta-uso', title: 'Lo uso' }, cb, el('span', { class: 'piccolo', text: 'Lo uso' })),
      el('div', { class: 'testo-test' },
        el('b', { text: t.nome }),
        el('span', { class: 'etichette-test' },
          el('span', { class: 'etichetta-test ' + (v.libro ? 'libro' : 'mio'), text: v.libro ? '📖 libro' : '✏️ mio' })),
        el('span', { class: 'piccolo', text: descrizione(t) }),
        App.SchedaTest.haScheda(t) ? dettagli(t) : null),
      v.elenco ? el('button', { type: 'button', class: 'btn btn-neutro piccolo-btn', 'aria-label': 'Modifica ' + t.nome, text: '✏️',
        onclick: function () { App.UI.FinestraTest.apri(App.ElencoTest.contenitore(), t); } }) : null);
  }

  App.UI.ListaTest = {
    disegna: function (cont) {
      var pref = App.Stato.dati.preferenze, filtro = pref.filtroTest;
      var tutte = voci();
      var filtri = [['tutti', 'Tutti (' + tutte.length + ')'],
        ['uso', 'In uso (' + tutte.filter(function (v) { return v.uso; }).length + ')'],
        ['libro', '📖 Libro'], ['miei', '✏️ Miei']];
      var mostra = tutte.filter(function (v) {
        return filtro === 'uso' ? v.uso : filtro === 'libro' ? v.libro : filtro === 'miei' ? !v.libro : true;
      });
      var classe = App.Stato.classe();

      cont.appendChild(el('p', { class: 'piccolo', text: 'Qui ci sono i test del libro e quelli che crei tu. Spunta "Lo uso" per quelli che usi: in ⏱️ Sessioni sceglierai tra questi. Con ✏️ modifichi scheda, strumento e tabella dei voti.' }));
      cont.appendChild(el('div', { class: 'strumenti' },
        el('button', { type: 'button', class: 'btn btn-ok', text: '➕ Nuovo test', onclick: function () { App.UI.FinestraTest.apri(App.ElencoTest.contenitore(), null); } }),
        classe && classe.test.length ? el('button', { type: 'button', class: 'btn btn-neutro', text: '📥 Prendi i test di ' + classe.nome, onclick: function () {
          var r = App.ElencoTest.prendiDaClasse(classe);
          App.Stato.salva();
          App.UI.disegnaContenuto();
          App.Avvisi.toast('✔ ' + r.copiati + ' test messi nell\'elenco' + (r.saltati.length ? ' (già presenti: ' + r.saltati.join(', ') + ')' : '') + '.', 'ok', 5000);
        } }) : null,
        App.Doppioni.quanti() ? el('button', { type: 'button', class: 'btn btn-neutro', text: '🔗 Doppioni (' + App.Doppioni.quanti() + ')',
          title: 'Unisci i test con nomi simili', onclick: function () { App.UI.FinestraDoppioni.apri(); } }) : null,
        el('div', { class: 'segmenti', role: 'tablist', 'aria-label': 'Filtro' }, filtri.map(function (f) {
          return el('button', { type: 'button', class: 'segmento' + (filtro === f[0] ? ' attivo' : ''), 'aria-pressed': filtro === f[0] ? 'true' : 'false',
            text: f[1], onclick: function () { pref.filtroTest = f[0]; App.Stato.scrivi(); App.UI.disegnaContenuto(); } });
        }))));

      if (!mostra.length) {
        cont.appendChild(el('p', { class: 'suggerimento', text: filtro === 'uso' ? 'Non usi ancora nessun test: spunta "Lo uso" in "Tutti".' : 'Nessun test.' }));
        return;
      }
      // gruppi per tipologia, nell'ordine di config.js; poi le altre
      var ordine = App.Config.tipologie.slice();
      mostra.forEach(function (v) { var tip = v.t.tipologia || 'Senza tipologia'; if (ordine.indexOf(tip) < 0) ordine.push(tip); });
      cont.appendChild(el('div', { class: 'elenco-test lista-test' }, ordine.map(function (tip) {
        var gr = mostra.filter(function (v) { return (v.t.tipologia || 'Senza tipologia') === tip; });
        if (!gr.length) return null;
        return el('section', { class: 'libro-gruppo' }, el('h4', { text: tip + ' (' + gr.length + ')' }),
          el('ul', { class: 'lista' }, gr.map(riga)));
      })));
    }
  };
})(window.App = window.App || {});
