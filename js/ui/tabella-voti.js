/* tabella-voti.js
 * Cosa fa: sottosezione "🎯 Voti" della pagina ⏱️ Sessioni: tabella alunni × test con il voto calcolato
 *          dai risultati (tabelle dei voti, separate per alunni e alunne) nella prova scelta, media voti
 *          di ogni alunno e media della classe per ogni test. Sotto, per ogni test, la tabella dei
 *          parametri da cui viene il voto (♂ e ♀), con il pulsante per modificarla.
 * Dipende da: App.U, App.Stato, App.Config (prove, sessi, voti), App.Voti, App.Test, App.SchedaTest,
 *             App.Classi, App.UI (sceltaClasse, vuoto), App.UI.FinestraVoti, App.UI.FinestraAlunno
 * Usato da: ui/pagina-sessioni.js
 */
(function (App) {
  'use strict';

  App.UI = App.UI || {};
  var el = function () { return App.U.el.apply(null, arguments); };

  function etichetta(v) {
    return v === null ? el('span', { class: 'piccolo', text: '–' })
      : el('span', { class: 'voto grande-voto ' + (App.Voti.sufficiente(v) ? 'suff' : 'insuff'), text: App.Voti.testo(v) });
  }

  function mediaDi(l) {
    l = l.filter(function (x) { return x !== null; });
    return l.length ? Math.round(l.reduce(function (s, x) { return s + x; }, 0) / l.length * 100) / 100 : null;
  }

  // Tabella delle soglie: una riga per voto, ♂ e ♀; l'ultima riga (voto più basso) vale per tutto
  // ciò che è peggio della riga sopra ("meno di …" / "oltre …"). Usata anche dalla pagina 📖 Libro.
  function tabellaSoglie(migliore, righe) {
    var alto = migliore === 'alto';
    return el('div', { class: 'tabella-zona' }, el('table', { class: 'tabella tabella-parametri' },
      el('thead', {}, el('tr', {}, el('th', { text: 'Voto' }), el('th', { text: '♂ Alunni' }), el('th', { text: '♀ Alunne' }))),
      el('tbody', {}, righe.map(function (r, i, tutte) {
        var ultima = i === tutte.length - 1 && i > 0;
        function testo(sx) {
          if (ultima) { var sopra = tutte[i - 1][sx]; return sopra ? (alto ? 'meno di ' : 'oltre ') + sopra : '–'; }
          return r[sx] ? (alto ? 'da ' : 'fino a ') + r[sx] : '–';
        }
        return el('tr', {}, el('th', {}, etichetta(r.voto)),
          el('td', { class: 'cella num-cella', text: testo('M') }),
          el('td', { class: 'cella num-cella', text: testo('F') }));
      }))));
  }

  // Parametri di un test: una riga per voto, soglia per alunni e per alunne
  function parametri(classe, t) {
    var alto = t.migliore === 'alto';
    var fascia = t.fasciaVoti && App.SchedaTest.fascia(t.fasciaVoti);
    var unita = t.tipo === 'tempo' ? (App.Test.formato(t) === 'min' ? 'min:sec' : 's') : (t.unita || '');
    return el('details', { class: 'parametri-voti' },
      el('summary', {}, el('b', { text: t.nome }),
        el('span', { class: 'piccolo', text: ' · ' + (alto ? 'voto dal risultato minimo' : 'voto fino al risultato massimo') + (unita ? ' (' + unita + ')' : '') +
          (fascia ? ' · libro, ' + fascia.nome : '') })),
      tabellaSoglie(t.migliore, t.voti.righe),
      el('button', { type: 'button', class: 'btn btn-info piccolo-btn', text: '📏 Modifica la tabella', onclick: function () { App.UI.FinestraVoti.apri(classe, t); } }));
  }

  App.UI.TabellaVoti = {
    tabellaSoglie: tabellaSoglie,

    disegna: function (cont, classe) {
      var pref = App.Stato.dati.preferenze;
      var prova = [1, 2, 3].indexOf(pref.prova) >= 0 ? pref.prova : 1;
      var conTab = classe.test.filter(App.Voti.haTabella);
      cont.appendChild(el('div', { class: 'strumenti' }, App.UI.sceltaClasse(),
        classe.test.length ? el('button', { type: 'button', class: 'btn btn-info', text: '📏 Tabelle dei voti della classe', onclick: function () { App.UI.FinestraVotiClasse.apri(classe); } }) : null,
        el('div', { class: 'segmenti', role: 'tablist', 'aria-label': 'Prova' }, App.Config.prove.map(function (p) {
          return el('button', { type: 'button', class: 'segmento' + (prova === p.id ? ' attivo' : ''), 'aria-pressed': prova === p.id ? 'true' : 'false',
            text: p.nome, onclick: function () { pref.prova = p.id; App.Stato.scrivi(); App.UI.disegnaContenuto(); } });
        }))));

      if (!classe.alunni.length || !conTab.length) {
        cont.appendChild(App.UI.vuoto('🎯', 'Ancora nessun voto',
          !classe.alunni.length ? 'Carica gli alunni della classe in 🏫 Classi.'
            : 'I voti si calcolano dai test che hanno la tabella dei voti: tocca "📏 Tabelle dei voti della classe" per mettere quelle del libro, oppure scegli i test del libro in "✏️ Risultati".'));
        return;
      }
      var senza = App.Classi.senzaSesso(classe);
      if (senza) {
        cont.appendChild(el('p', { class: 'suggerimento avviso-sesso', text: '⚠️ ' + senza + (senza === 1 ? ' alunno non ha' : ' alunni non hanno') +
          ' ♂/♀: senza non si può calcolare il voto. Tocca il nome per indicarlo.' }));
      }

      var perTest = conTab.map(function () { return []; });
      var righe = classe.alunni.map(function (a, i) {
        var voti = conTab.map(function (t, k) { var x = App.Voti.votoAlunno(classe, a, t, prova); perTest[k].push(x.voto); return x; });
        var m = App.Voti.media(classe, a, prova);
        return el('tr', {},
          el('th', { class: 'col-nome', scope: 'row' },
            el('button', { type: 'button', class: 'nome-alunno', onclick: function () { App.UI.FinestraAlunno.apri(classe, a); } },
              el('span', { class: 'num', text: (i + 1) + '.' }), ' ' + a.nome,
              a.sesso ? el('span', { class: 'sesso', text: ' ' + App.Config.sessi[a.sesso].icona } ) : el('span', { class: 'voto manca', text: ' ♂/♀?' }))),
          voti.map(function (x, k) {
            var v = App.Test.valore(classe, a.id, conTab[k].id, prova);
            return el('td', { class: 'cella cella-voto', title: v ? 'Risultato: ' + App.Test.formatta(conTab[k], v) : 'Non svolto' }, etichetta(x.voto));
          }),
          el('td', { class: 'cella col-media cella-voto' }, etichetta(m)));
      });
      var medie = perTest.map(mediaDi);
      var mediaClasse = mediaDi(classe.alunni.map(function (a) { return App.Voti.media(classe, a, prova); }));

      cont.appendChild(el('div', { class: 'tabella-zona' }, el('table', { class: 'tabella tabella-voti-classe' },
        el('thead', {}, el('tr', {}, el('th', { class: 'col-nome', text: 'Alunno (' + classe.alunni.length + ')' }),
          conTab.map(function (t) { return el('th', { class: 'col-test' }, el('span', { class: 'nome-test', text: t.nome }), t.tipologia ? el('span', { class: 'tipologia-test', text: t.tipologia }) : null); }),
          el('th', { class: 'col-media', text: 'Media voti' }))),
        el('tbody', {}, righe),
        el('tfoot', {}, el('tr', { class: 'riga-media' }, el('th', { class: 'col-nome', scope: 'row', text: 'Media della classe' }),
          medie.map(function (m) { return el('td', { class: 'cella cella-voto' }, etichetta(m)); }),
          el('td', { class: 'cella col-media cella-voto' }, etichetta(mediaClasse)))))));

      var senzaTab = classe.test.length - conTab.length;
      cont.appendChild(el('p', { class: 'piccolo', text: 'Voti della ' + App.Config.prove[prova - 1].nome + ', calcolati dai risultati scritti in "✏️ Risultati". Sufficienza: ' +
        App.Config.voti.sufficienza + '. Passa sopra un voto per vedere il risultato.' + (senzaTab ? ' ' + senzaTab + (senzaTab === 1 ? ' test non ha' : ' test non hanno') + ' la tabella dei voti e non compare.' : '') }));

      cont.appendChild(el('section', { class: 'sezione-stat' }, el('h3', { text: '📏 Tabelle dei voti dei test' }),
        el('p', { class: 'piccolo', text: 'Da qui vengono i voti: per ogni voto il risultato minimo (o il tempo massimo) per alunni e alunne.' }),
        conTab.map(function (t) { return parametri(classe, t); })));
    }
  };
})(window.App = window.App || {});
