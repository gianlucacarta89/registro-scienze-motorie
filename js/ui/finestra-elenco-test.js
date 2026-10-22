/* finestra-elenco-test.js
 * Cosa fa: finestra "📚 Elenco dei test": la lista dei test del docente, valida per tutte le classi.
 *          Si crea un test nuovo, si modifica (✏️, anche la tabella dei voti), si cancella, e si
 *          aggiungono i test scelti a una classe. Si può riempire con i test già fatti in una classe.
 * Dipende da: App.U, App.ElencoTest, App.Classi, App.Test, App.Voti, App.Stato, App.Avvisi,
 *             App.Finestra, App.UI.FinestraTest
 * Usato da: ui/barra.js (📚 Test), ui/tabella-test.js (📚 Dall'elenco)
 */
(function (App) {
  'use strict';

  App.UI = App.UI || {};
  var el = function () { return App.U.el.apply(null, arguments); };

  function descrizione(t) {
    var parti = [];
    if (t.tipologia) parti.push(t.tipologia);
    var s = App.Test.etichetteStrumento(t);
    if (s.length) parti.push('🔧 ' + s.join(' · '));
    parti.push(t.tipo === 'tempo' ? 'min:sec ↓' : (t.unita || 'numero') + (t.migliore === 'alto' ? ' ↑' : ' ↓'));
    if (App.Voti.haTabella(t)) parti.push('📏 ' + t.voti.righe.length + ' voti');
    return parti.join(' · ');
  }

  App.UI.FinestraElencoTest = {
    ridisegna: null,

    apri: function (classeIniziale) {
      var self = this, scelti = {};
      var lista = el('div', { class: 'elenco-test' });
      var piede = el('div', { class: 'aggiungi-a-classe' });

      function contenitore() { return App.ElencoTest.contenitore(); }

      function disegnaLista() {
        App.U.svuota(lista);
        var tutti = App.ElencoTest.tutti();
        if (!tutti.length) {
          lista.appendChild(el('p', { class: 'suggerimento', text: 'L\'elenco è vuoto. Crea il primo test con "➕ Nuovo test nell\'elenco"' +
            (classeIniziale && classeIniziale.test.length ? ' oppure prendi quelli che hai già nella classe ' + classeIniziale.nome + '.' : '.') }));
        } else {
          lista.appendChild(el('ul', { class: 'lista' }, tutti.map(function (t) {
            var cb = el('input', { type: 'checkbox', checked: !!scelti[t.id], 'aria-label': 'Scegli ' + t.nome });
            cb.addEventListener('change', function () { if (cb.checked) scelti[t.id] = true; else delete scelti[t.id]; disegnaPiede(); });
            return el('li', { class: 'riga-lista riga-test' },
              cb,
              el('div', { class: 'testo-test' }, el('b', { text: t.nome }), el('span', { class: 'piccolo', text: descrizione(t) })),
              el('button', { type: 'button', class: 'btn btn-neutro piccolo-btn', 'aria-label': 'Modifica ' + t.nome, text: '✏️',
                onclick: function () { App.UI.FinestraTest.apri(contenitore(), t); } }));
          })));
        }
        disegnaPiede();
      }

      function disegnaPiede() {
        App.U.svuota(piede);
        var classi = App.Classi.tutte(), n = App.ElencoTest.tutti().filter(function (t) { return scelti[t.id]; }).length;
        if (!App.ElencoTest.tutti().length) return;
        if (!classi.length) { piede.appendChild(el('p', { class: 'piccolo', text: 'Crea una classe (🏫 Classi) per aggiungerci i test.' })); return; }
        var attiva = classeIniziale || App.Stato.classe();
        var verso = el('select', { 'aria-label': 'Classe', value: attiva ? attiva.id : classi[0].id },
          classi.map(function (c) { return el('option', { value: c.id, text: c.nome }); }));
        piede.appendChild(el('span', { class: 'piccolo', text: n ? n + ' scelti →' : 'Spunta i test da aggiungere →' }));
        piede.appendChild(verso);
        piede.appendChild(el('button', { type: 'button', class: 'btn btn-ok', disabled: !n, text: '➕ Aggiungi alla classe',
          onclick: function () {
            var classe = App.Classi.trova(verso.value);
            var r = App.ElencoTest.aggiungiAClasse(Object.keys(scelti), classe);
            App.Stato.salva();
            scelti = {};
            App.UI.disegna();
            App.Avvisi.toast('✔ Aggiunti ' + r.copiati + ' test a ' + classe.nome +
              (r.saltati.length ? '. Già presenti, non aggiunti: ' + r.saltati.join(', ') : '') + '.', r.copiati ? 'ok' : 'info', 6000);
          } }));
      }

      var prendi = classeIniziale && classeIniziale.test.length ? el('button', { type: 'button', class: 'btn btn-neutro', text: '📥 Prendi i test di ' + classeIniziale.nome,
        onclick: function () {
          var r = App.ElencoTest.prendiDaClasse(classeIniziale);
          App.Stato.salva();
          disegnaLista();
          App.Avvisi.toast('✔ ' + r.copiati + ' test messi nell\'elenco' + (r.saltati.length ? ' (già presenti: ' + r.saltati.join(', ') + ')' : '') + '.', 'ok', 5000);
        } }) : null;

      self.ridisegna = disegnaLista;
      disegnaLista();
      App.Finestra.apri({
        titolo: 'Elenco dei test', icona: '📚', larga: true, fuoco: false,
        corpo: el('div', {},
          el('p', { class: 'piccolo', text: 'I tuoi test, validi per tutte le classi: li crei una volta (nome, tipologia, strumento, tabella dei voti) e li aggiungi alle classi. Nella classe ricevono una copia: lì puoi cambiare strumento o tabella per l\'età, senza toccare l\'elenco.' }),
          el('div', { class: 'riga-btn sinistra' },
            el('button', { type: 'button', class: 'btn btn-ok', text: '➕ Nuovo test nell\'elenco', onclick: function () { App.UI.FinestraTest.apri(contenitore(), null); } }),
            prendi),
          lista,
          piede),
        pulsanti: [{ testo: 'Chiudi', tipo: 'neutro' }],
        allaChiusura: function () { self.ridisegna = null; }
      });
    }
  };
})(window.App = window.App || {});
