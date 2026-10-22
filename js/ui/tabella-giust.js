/* tabella-giust.js
 * Cosa fa: modulo 2 "Giustificazioni": tabella alunni × mesi (settembre-giugno) con i simboli,
 *          totale per alunno, scelta dell'anno scolastico, legenda con i conteggi della classe.
 * Dipende da: App.U, App.UI.FinestraAlunno (tocco sul nome), App.Stato, App.Config, App.Calendario, App.Giust, App.UI.FinestraGiust,
 *             App.UI.FinestraImporta, App.UI.vuoto, App.UI.regole
 * Usato da: ui/pagina.js
 */
(function (App) {
  'use strict';

  App.UI = App.UI || {};
  var el = function () { return App.U.el.apply(null, arguments); };

  function cambiaAnno(verso) {
    App.Stato.dati.preferenze.annoInizio = App.Calendario.annoAttivo() + verso;
    App.Stato.scrivi();
    App.UI.disegnaContenuto();
  }

  function barraAnno(anno) {
    var corrente = App.Calendario.annoCorrente();
    return el('div', { class: 'scelta-anno' },
      el('button', { type: 'button', class: 'btn btn-neutro piccolo-btn', 'aria-label': 'Anno precedente', text: '◀',
        onclick: function () { cambiaAnno(-1); } }),
      el('span', { class: 'anno', text: 'Anno scolastico ' + App.Calendario.etichetta(anno) + (anno === corrente ? '' : ' ⚠️') }),
      el('button', { type: 'button', class: 'btn btn-neutro piccolo-btn', 'aria-label': 'Anno successivo', text: '▶',
        onclick: function () { cambiaAnno(1); } }),
      anno !== corrente ? el('button', { type: 'button', class: 'btn btn-neutro piccolo-btn', text: 'Torna all\'anno in corso',
        onclick: function () { App.Stato.dati.preferenze.annoInizio = null; App.Stato.scrivi(); App.UI.disegnaContenuto(); } }) : null);
  }

  function casella(classe, a, mese) {
    var lista = App.Giust.delMese(classe, a.id, mese);
    var titolo = a.nome + ' – ' + mese.nome + ' ' + mese.anno;
    return el('td', { class: 'cella' },
      el('button', { type: 'button', class: 'cella-giust' + (lista.length ? ' piena' : ''),
        'aria-label': titolo + ': ' + lista.length + ' giustificazioni',
        onclick: function () { App.UI.FinestraGiust.apri(classe, a, mese); } },
        lista.length ? lista.map(function (g) {
          var s = App.Giust.simbolo(g.simbolo);
          return el('span', { class: 'chip', title: App.U.dataIT(g.data) + ' ' + (s ? s.nome : '') + (g.nota ? ' – ' + g.nota : '') },
            el('b', { text: String(Number(g.data.slice(8, 10))) }), s ? s.icona : '?');
        }) : el('span', { class: 'piu', text: '+' })));
  }

  function legenda(classe, anno) {
    var conti = App.Giust.contaClasse(classe, anno);
    return el('div', { class: 'legenda' },
      el('h3', { text: 'Legenda' }),
      el('ul', {}, App.Config.simboli.map(function (s) {
        return el('li', {}, el('span', { class: 'leg-icona', text: s.icona }), ' ' + s.nome,
          el('span', { class: 'leg-conto', text: conti[s.id] ? '(' + conti[s.id] + ' in classe)' : '' }));
      })),
      el('p', { class: 'piccolo nota-privacy', text: '🔒 ' + App.Config.testi.notaPrivacy }));
  }

  App.UI.TabellaGiust = {
    barraAnno: barraAnno,     // usata anche da ui/statistiche-giust.js

    disegna: function (cont, classe) {
      var anno = App.Calendario.annoAttivo(), mesi = App.Calendario.mesi(anno);
      cont.appendChild(el('div', { class: 'strumenti' }, barraAnno(anno)));

      if (!classe.alunni.length) {
        cont.appendChild(App.UI.vuoto('👥', 'Nessun alunno in ' + classe.nome,
          'Carica i nomi da un file Excel o Word, oppure incollali.',
          el('button', { type: 'button', class: 'btn btn-ok grande', text: '📥 Carica i nomi',
            onclick: function () { App.UI.FinestraImporta.apri(classe); } })));
        return;
      }

      var testa = el('tr', {}, el('th', { class: 'col-nome', text: 'Alunno (' + classe.alunni.length + ')' }),
        mesi.map(function (m) { return el('th', { class: 'col-mese', title: m.nome + ' ' + m.anno, text: m.breve }); }),
        el('th', { class: 'col-tot', title: 'Totale anno', text: 'Tot.' }));
      var corpo = el('tbody', {}, classe.alunni.map(function (a, r) {
        var tot = App.Giust.totaleAnno(classe, a.id, anno);
        return el('tr', {},
          el('th', { class: 'col-nome', scope: 'row' },
            el('button', { type: 'button', class: 'nome-alunno', title: 'Correggi o togli', onclick: function () { App.UI.FinestraAlunno.apri(classe, a); } },
              el('span', { class: 'num', text: (r + 1) + '.' }), ' ' + a.nome)),
          mesi.map(function (m) { return casella(classe, a, m); }),
          el('td', { class: 'cella col-tot' + (tot ? ' con-tot' : ''), text: String(tot) }));
      }));
      cont.appendChild(el('div', { class: 'tabella-zona' },
        el('table', { class: 'tabella tabella-giust' }, el('thead', {}, testa), corpo)));
      cont.appendChild(legenda(classe, anno));
      cont.appendChild(App.UI.regole('Come funziona', App.Config.testi.regoleGiust));
    }
  };
})(window.App = window.App || {});
