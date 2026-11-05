/* finestra-elenco-test.js
 * Cosa fa: finestra "📚 Scegli i test" della pagina ⏱️ Sessioni: mostra i test in uso (spuntati in
 *          📚 Test), divisi per tipologia; si spuntano quelli da fare e si aggiungono alla classe,
 *          con la tabella dei voti della fascia della classe (dal nome: 1G = 1° biennio).
 *          I test già nella classe sono segnati e non si aggiungono due volte.
 *          "➕ Nuovo test" crea un test solo per questa classe (entra anche nell'elenco, in uso).
 * Dipende da: App.U, App.ElencoTest, App.Voti, App.SchedaTest, App.Config (fasce, tipologie),
 *             App.Stato, App.Avvisi, App.Finestra, App.UI (vai, disegna), App.UI.FinestraTest
 * Usato da: ui/tabella-test.js
 */
(function (App) {
  'use strict';

  App.UI = App.UI || {};
  var el = function () { return App.U.el.apply(null, arguments); };

  App.UI.FinestraElencoTest = {
    ridisegna: null,

    apri: function (classe) {
      var self = this, scelti = {}, fin;
      var corpo = el('div', { class: 'scegli-test' });
      var presenti = function (t) {
        var k = App.U.chiaveNome(t.nome);
        return classe.test.some(function (x) { return App.U.chiaveNome(x.nome) === k; });
      };

      function disegna() {
        App.U.svuota(corpo);
        var uso = App.ElencoTest.inUsoTutti();
        corpo.appendChild(el('p', { class: 'piccolo', text: 'Spunta i test da fare con la ' + classe.nome + ': diventano colonne della tabella. Qui ci sono i test che hai spuntato "Lo uso" in 📚 Test.' }));
        corpo.appendChild(el('div', { class: 'riga-btn sinistra' },
          el('button', { type: 'button', class: 'btn btn-neutro piccolo-btn', text: '➕ Nuovo test', onclick: function () { fin.chiudi(); App.UI.FinestraTest.apri(classe, null); } }),
          el('button', { type: 'button', class: 'btn btn-neutro piccolo-btn', text: '📚 Vai a Test', onclick: function () { fin.chiudi(); App.UI.vai('test', 'elenco'); } })));
        if (!uso.length) {
          corpo.appendChild(el('p', { class: 'suggerimento' }, 'Non hai ancora scelto i test che usi. ',
            el('button', { type: 'button', class: 'btn btn-info piccolo-btn', text: '📚 Vai a Test', onclick: function () { fin.chiudi(); App.UI.vai('test', 'elenco'); } })));
          return;
        }
        var ordine = App.Config.tipologie.slice();
        uso.forEach(function (t) { var tip = t.tipologia || 'Senza tipologia'; if (ordine.indexOf(tip) < 0) ordine.push(tip); });
        ordine.forEach(function (tip) {
          var gr = uso.filter(function (t) { return (t.tipologia || 'Senza tipologia') === tip; });
          if (!gr.length) return;
          corpo.appendChild(el('section', { class: 'libro-gruppo' }, el('h4', { text: tip }),
            el('ul', { class: 'lista' }, gr.map(function (t) {
              var gia = presenti(t);
              var cb = el('input', { type: 'checkbox', checked: gia || !!scelti[t.id], disabled: gia, 'aria-label': 'Scegli ' + t.nome });
              cb.addEventListener('change', function () { if (cb.checked) scelti[t.id] = true; else delete scelti[t.id]; piede(); });
              return el('li', { class: 'riga-lista riga-test' + (gia ? ' gia' : '') },
                el('label', { class: 'spunta-uso' }, cb),
                el('div', { class: 'testo-test' }, el('b', { text: t.nome }),
                  el('span', { class: 'piccolo', text: gia ? '✓ già nella classe' : (t.descrizione || t.tipologia || '') })));
            }))));
        });
        corpo.appendChild(zonaFascia);
        piede();
      }

      var zonaFascia = el('div', { class: 'aggiungi-a-classe' });
      var fascia = el('select', { 'aria-label': 'Tabella dei voti per' },
        App.Config.fasce.map(function (f) { return el('option', { value: f.id, text: f.nome }); }),
        el('option', { value: '', text: 'nessuna tabella' }));
      fascia.value = App.SchedaTest.fasciaDiClasse(classe) || '';

      function piede() {
        App.U.svuota(zonaFascia);
        var lista = App.ElencoTest.inUsoTutti().filter(function (t) { return scelti[t.id]; });
        if (lista.some(function (t) { return App.SchedaTest.haFasce(t); })) {
          zonaFascia.appendChild(el('label', { class: 'scelta-fascia' }, el('span', { class: 'piccolo', text: 'Voti del libro per: ' }), fascia));
        }
        if (fin) {
          var b = fin.piede.lastChild;
          b.textContent = '➕ Aggiungi ' + (lista.length ? lista.length + ' ' : '') + 'a ' + classe.nome;
          b.disabled = !lista.length;
        }
      }

      self.ridisegna = disegna;
      disegna();
      fin = App.Finestra.apri({
        titolo: 'Scegli i test', icona: '📚', larga: true, fuoco: false, corpo: corpo,
        pulsanti: [
          { testo: 'Chiudi', tipo: 'neutro' },
          { testo: '➕ Aggiungi', tipo: 'ok', azione: function () {
            var ids = Object.keys(scelti);
            if (!ids.length) return false;
            var conFasce = App.ElencoTest.tutti().some(function (t) { return scelti[t.id] && App.SchedaTest.haFasce(t); });
            var r = App.ElencoTest.aggiungiAClasse(ids, classe, conFasce ? fascia.value : null);
            App.Stato.salva();
            App.UI.disegna();
            App.Avvisi.toast('✔ Aggiunti ' + r.copiati + ' test a ' + classe.nome +
              (r.saltati.length ? '. Già presenti: ' + r.saltati.join(', ') : '') + '.', r.copiati ? 'ok' : 'info', 6000);
          } }
        ],
        allaChiusura: function () { self.ridisegna = null; }
      });
      piede();
    }
  };
})(window.App = window.App || {});
