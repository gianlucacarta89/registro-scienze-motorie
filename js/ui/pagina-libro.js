/* pagina-libro.js
 * Cosa fa: pagina 📖 Libro: i test del libro di testo d'Istituto (App.TestLibro) da consultare,
 *          divisi per tipologia. Per ognuno: caratteristiche (misura, meglio alto/basso, strumento,
 *          fonte), scheda (a che cosa serve, materiale, come si fa, come si misura, differenze
 *          alunni/alunne) e tabella di valutazione ♂/♀ della fascia scelta (1° biennio, 2° biennio,
 *          quinto anno; alcuni test hanno una tabella unica). Ricerca per nome. Solo lettura.
 * Dipende da: App.U, App.Stato, App.Config (fasce, tipologie), App.TestLibro, App.SchedaTest, App.Test,
 *             App.UI (titoloPagina), App.UI.TabellaVoti.tabellaSoglie
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

  function scheda(t, fascia) {
    var f = App.SchedaTest.fascia(fascia);
    var tab = t.fasce ? t.fasce[fascia] : t.voti;
    var strumenti = App.Test.etichetteStrumento(t);
    return el('details', { class: 'libro-test', open: tuttiAperti || !!cerca },
      el('summary', {}, el('b', { text: t.nome }),
        el('span', { class: 'piccolo', text: ' · ' + misura(t) + ' · ' + (t.migliore === 'alto' ? 'meglio più alto ↑' : 'meglio più basso ↓') })),
      el('div', { class: 'libro-corpo' },
        el('p', { class: 'libro-caratteristiche' },
          el('span', { class: 'etichetta-test libro', text: t.tipologia }),
          strumenti.length ? el('span', { class: 'piccolo', text: ' 🔧 ' + strumenti.join(' · ') }) : null,
          t.negativi ? el('span', { class: 'piccolo', text: ' · ammette valori negativi' }) : null),
        App.SchedaTest.campi().filter(function (c) { return t[c.id]; }).map(function (c) {
          return el('p', {}, el('b', { text: c.nome + ': ' }), t[c.id]);
        }),
        el('h5', { text: '📏 Tabella di valutazione – ' + (t.fasce ? f.nome : 'uguale per tutte le classi') }),
        tab ? App.UI.TabellaVoti.tabellaSoglie(t.migliore, tab.righe) : el('p', { class: 'piccolo', text: 'Nessuna tabella.' }),
        t.fonte ? el('p', { class: 'piccolo', text: 'Fonte: ' + t.fonte }) : null));
  }

  App.UI.Pagine.libro = {
    disegna: function (cont) {
      var pref = App.Stato.dati.preferenze;
      if (!App.SchedaTest.fascia(pref.fasciaLibro)) pref.fasciaLibro = App.SchedaTest.fasciaDiClasse(App.Stato.classe()) || 'b1';
      var fascia = pref.fasciaLibro;
      var libro = App.TestLibro || [];
      cont.appendChild(App.UI.titoloPagina('📖 Libro – test e tabelle di valutazione'));

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
      cont.appendChild(el('p', { class: 'piccolo', text: libro.length + ' test del libro di testo d\'Istituto (più la corsa di 1 km). Tocca un test per leggere la scheda e la tabella di valutazione della fascia scelta. Per usarli: 📚 Test → "Lo uso".' }));
      cont.appendChild(zona);

      function disegnaElenco() {
        App.U.svuota(zona);
        var k = App.U.chiaveNome(cerca);
        var lista = libro.filter(function (t) { return !k || App.U.chiaveNome(t.nome + ' ' + t.tipologia).indexOf(k) >= 0; });
        if (!lista.length) { zona.appendChild(el('p', { class: 'suggerimento', text: 'Nessun test trovato.' })); return; }
        App.Config.tipologie.forEach(function (tip) {
          var gr = lista.filter(function (t) { return t.tipologia === tip; });
          if (!gr.length) return;
          zona.appendChild(el('section', { class: 'libro-gruppo' }, el('h4', { text: tip + ' (' + gr.length + ')' }),
            gr.map(function (t) { return scheda(t, fascia); })));
        });
      }
      campo.addEventListener('input', function () { cerca = campo.value; disegnaElenco(); });
      disegnaElenco();
    }
  };
})(window.App = window.App || {});
