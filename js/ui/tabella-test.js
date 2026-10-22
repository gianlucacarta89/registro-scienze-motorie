/* tabella-test.js
 * Cosa fa: modulo 1 "Test": tabella alunni × test, scelta della prova (1ª, 2ª, Confronto),
 *          scrittura dei risultati con salvataggio immediato e controllo dei valori.
 * Dipende da: App.U, App.Stato, App.Config, App.Test, App.Avvisi, App.UI.FinestraTest,
 *             App.UI.FinestraImporta, App.UI.vuoto, App.UI.regole, App.UI.piede
 * Usato da: ui/pagina.js
 */
(function (App) {
  'use strict';

  App.UI = App.UI || {};
  var el = function () { return App.U.el.apply(null, arguments); };

  function chiave(classe, a, t, p) { return [classe.id, a.id, t.id, p].join('|'); }

  function scegliProva(p) {
    App.Stato.dati.preferenze.prova = p;
    App.Stato.scrivi();
    App.UI.disegnaContenuto();
  }

  function barraProve(attuale) {
    var voci = App.Config.prove.map(function (p) { return [p.id, p.nome]; }).concat([['c', '⇄ Confronto']]);
    return el('div', { class: 'segmenti', role: 'tablist', 'aria-label': 'Prova' }, voci.map(function (v) {
      return el('button', { type: 'button', class: 'segmento' + (attuale === v[0] ? ' attivo' : ''),
        'aria-pressed': attuale === v[0] ? 'true' : 'false', text: v[1], onclick: function () { scegliProva(v[0]); } });
    }));
  }

  function intestazioneTest(classe, t) {
    var tipo = t.tipo === 'tempo' ? 'min:sec' : (t.unita || '');
    return el('th', { class: 'col-test' },
      el('button', { type: 'button', class: 'testa-test', title: 'Modifica il test',
        onclick: function () { App.UI.FinestraTest.apri(classe, t); } },
        el('span', { class: 'nome-test', text: t.nome }),
        el('span', { class: 'info-test', text: (tipo ? tipo + ' ' : '') + (t.migliore === 'alto' ? '↑' : '↓') + ' ✏️' })));
  }

  // Casella con il risultato di una prova
  function casella(classe, a, t, prova, r, c) {
    var k = chiave(classe, a, t, prova);
    var bozza = App.Stato.bozze[k];
    var inp = el('input', {
      class: 'cella-input' + (bozza !== undefined ? ' errore' : ''), type: 'text',
      inputmode: t.tipo === 'tempo' ? 'text' : 'decimal', enterkeyhint: 'next', autocomplete: 'off',
      'aria-label': t.nome + ' – ' + a.nome, 'data-r': r, 'data-c': c,
      value: bozza !== undefined ? bozza : App.Test.valore(classe, a.id, t.id, prova)
    });
    // Mentre scrivi: se il valore è valido si salva subito, altrimenti resta come bozza
    inp.addEventListener('input', function () {
      var v = App.Test.valida(t, inp.value);
      if (v.ok) {
        delete App.Stato.bozze[k];
        inp.classList.remove('errore');
        if (App.Test.valore(classe, a.id, t.id, prova) !== v.valore) {
          App.Test.imposta(classe, a.id, t.id, prova, v.valore);
          App.Stato.salva().then(App.UI.piede);
        }
      } else {
        App.Stato.bozze[k] = inp.value;
      }
    });
    // Uscendo dalla casella: scrive il valore in forma ordinata o spiega l'errore
    inp.addEventListener('change', function () {
      var v = App.Test.valida(t, inp.value);
      if (v.ok) { inp.value = v.valore; inp.classList.remove('errore'); }
      else { inp.classList.add('errore'); App.Avvisi.toast('❌ ' + v.errore + ' Il valore non è stato salvato.', 'errore', 5000); }
    });
    inp.addEventListener('keydown', function (ev) {
      if (ev.key !== 'Enter') return;
      ev.preventDefault();
      var sotto = document.querySelector('.cella-input[data-r="' + (r + 1) + '"][data-c="' + c + '"]');
      if (sotto) sotto.focus(); else inp.blur();
    });
    return el('td', { class: 'cella' }, inp);
  }

  function casellaConfronto(classe, a, t) {
    var x = App.Test.confronto(classe, a.id, t);
    if (!x.v1 && !x.v2) return el('td', { class: 'cella confronto vuota', text: '–' });
    return el('td', { class: 'cella confronto' },
      el('span', { class: 'valori', text: (x.v1 || '–') + ' → ' + (x.v2 || '–') }),
      x.esito ? el('span', { class: 'delta ' + x.esito, text: x.delta }) : null);
  }

  App.UI.TabellaTest = {
    disegna: function (cont, classe) {
      var prova = App.Stato.dati.preferenze.prova;
      cont.appendChild(el('div', { class: 'strumenti' },
        el('button', { type: 'button', class: 'btn btn-ok', text: '➕ Nuovo test',
          onclick: function () { App.UI.FinestraTest.apri(classe, null); } }),
        barraProve(prova)));

      if (!classe.alunni.length) {
        cont.appendChild(App.UI.vuoto('👥', 'Nessun alunno in ' + classe.nome,
          'Carica i nomi da un file Excel o Word, oppure incollali.',
          el('button', { type: 'button', class: 'btn btn-ok grande', text: '📥 Carica i nomi',
            onclick: function () { App.UI.FinestraImporta.apri(classe); } })));
        return;
      }
      if (!classe.test.length) {
        cont.appendChild(el('p', { class: 'suggerimento', text: '👉 Aggiungi il primo test con "➕ Nuovo test": comparirà come colonna.' }));
      }

      var testa = el('tr', {}, el('th', { class: 'col-nome', text: 'Alunno (' + classe.alunni.length + ')' }),
        classe.test.map(function (t) { return intestazioneTest(classe, t); }));
      var corpo = el('tbody', {}, classe.alunni.map(function (a, r) {
        return el('tr', {},
          el('th', { class: 'col-nome', scope: 'row' }, el('span', { class: 'num', text: (r + 1) + '.' }), ' ' + a.nome),
          classe.test.map(function (t, c) {
            return prova === 'c' ? casellaConfronto(classe, a, t) : casella(classe, a, t, prova, r, c);
          }));
      }));
      cont.appendChild(el('div', { class: 'tabella-zona' },
        el('table', { class: 'tabella tabella-test' }, el('thead', {}, testa), corpo)));

      if (prova === 'c') {
        cont.appendChild(el('p', { class: 'legenda-confronto' },
          el('span', { class: 'delta meglio', text: '+ / −' }), ' miglioramento   ',
          el('span', { class: 'delta peggio', text: '+ / −' }), ' peggioramento   ',
          el('span', { class: 'delta uguale', text: '=' }), ' uguale'));
      }
      cont.appendChild(App.UI.regole('Come funziona', App.Config.testi.regoleTest));
    }
  };
})(window.App = window.App || {});
