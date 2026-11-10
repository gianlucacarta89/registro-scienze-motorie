/* pagina-attivita.js
 * Cosa fa: pagina 📝 Attività: per la classe scelta l'elenco delle attività valutate (più recenti prima)
 *          con data, titolo, inizio della descrizione, alunni valutati e media; "➕ Nuova attività" e tocco
 *          su un'attività per aprirla (ui/finestra-attivita.js).
 * Dipende da: App.U, App.Stato, App.Attivita, App.Voti (testo, sufficiente), App.UI (titoloPagina,
 *             sceltaClasse, senzaClassi, vuoto), App.UI.FinestraAttivita
 * Usato da: ui/pagina.js
 */
(function (App) {
  'use strict';

  App.UI = App.UI || {};
  App.UI.Pagine = App.UI.Pagine || {};
  var el = function () { return App.U.el.apply(null, arguments); };

  function riga(classe, att) {
    var m = App.Attivita.media(att), n = App.Attivita.valutati(att);
    return el('li', {}, el('button', { type: 'button', class: 'riga-attivita', onclick: function () { App.UI.FinestraAttivita.apri(classe, att); } },
      el('span', { class: 'att-data', text: App.U.dataIT(att.data) }),
      el('span', { class: 'att-testo' },
        el('b', { text: att.titolo }),
        att.descrizione ? el('span', { class: 'piccolo att-descr', text: att.descrizione }) : null,
        el('span', { class: 'piccolo', text: n + ' / ' + classe.alunni.length + ' valutati' + (att.note ? ' · 🗒️ note' : '') })),
      m === null ? el('span', { class: 'piccolo', text: '–' }) :
        el('span', { class: 'voto grande-voto ' + (App.Voti.sufficiente(m) ? 'suff' : 'insuff'), title: 'Media della classe', text: App.Voti.testo(m) })));
  }

  App.UI.Pagine.attivita = {
    disegna: function (cont) {
      cont.appendChild(App.UI.titoloPagina('📝 Attività'));
      if (App.UI.senzaClassi(cont)) return;
      var classe = App.Stato.classe();
      cont.appendChild(el('div', { class: 'strumenti' }, App.UI.sceltaClasse(),
        el('button', { type: 'button', class: 'btn btn-ok', text: '➕ Nuova attività', onclick: function () { App.UI.FinestraAttivita.apri(classe, null); } })));
      var l = App.Attivita.tutte(classe);
      if (!l.length) {
        cont.appendChild(App.UI.vuoto('📝', 'Nessuna attività in ' + classe.nome,
          'Un\'attività valutata: scrivi titolo, descrizione e note, poi dai il voto agli alunni (interi o con mezzo punto).',
          el('button', { type: 'button', class: 'btn btn-ok grande', text: '➕ Nuova attività', onclick: function () { App.UI.FinestraAttivita.apri(classe, null); } })));
        return;
      }
      cont.appendChild(el('ul', { class: 'lista lista-attivita' }, l.map(function (a) { return riga(classe, a); })));
      cont.appendChild(el('p', { class: 'piccolo', text: l.length + (l.length === 1 ? ' attività' : ' attività') + ' in ' + classe.nome + '. Tocca un\'attività per vederla, dare o correggere i voti.' }));
    }
  };
})(window.App = window.App || {});
