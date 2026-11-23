/* pagina-attivita.js
 * Cosa fa: pagina ⛹️ Attività: per la classe scelta l'elenco delle attività valutate (più recenti prima)
 *          con data, titolo, inizio della descrizione, alunni valutati e media; "➕ Nuova attività" e tocco
 *          su un'attività per aprirla (ui/finestra-attivita.js).
 * Dipende da: App.U, App.Stato, App.Attivita, App.Voti (testo, sufficiente), App.UI (titoloPagina,
 *             sceltaClasse, senzaClassi, vuoto), App.UI.FinestraAttivita, App.UI.FinestraOsservazioni, App.ArchivioAttivita,
 *             App.UI.FinestraArchivioAttivita, App.UI.FinestraCopiaAttivita, App.UI.sottoSchede, App.UI.TagAttivita
 *          🏷️ Tag e filtro per tag (ui/tag-attivita.js, v7.29). Sottoscheda 📚 Archivio (v7.27): attività da assegnare alle classi (servizi/archivio-attivita.js).
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
        App.UI.TagAttivita.etichette(att),
        att.descrizione ? el('span', { class: 'piccolo att-descr', text: att.descrizione }) : null,
        el('span', { class: 'piccolo', text: n + ' / ' + classe.alunni.length + ' valutati' + (att.note ? ' · 🗒️ note' : '') + ((att.foto || []).length ? ' · 📷 ' + att.foto.length : '') })),
      m === null ? el('span', { class: 'piccolo', text: '–' }) :
        el('span', { class: 'voto grande-voto ' + (App.Voti.sufficiente(m) ? 'suff' : 'insuff'), title: 'Media della classe', text: App.Voti.testo(m) })));
  }

  // 📚 Archivio: attività scritte una volta, da assegnare alle classi (v7.27)
  function archivio(cont) {
    var l = App.ArchivioAttivita.tutte();
    cont.appendChild(el('div', { class: 'strumenti' },
      el('button', { type: 'button', class: 'btn btn-ok', text: '➕ Nuova attività nell\'archivio', onclick: function () { App.UI.FinestraArchivioAttivita.apri(null); } })));
    if (!l.length) {
      cont.appendChild(App.UI.vuoto('📚', 'L\'archivio è vuoto',
        'Scrivi qui le attività che usi spesso (titolo, descrizione, note, foto) e assegnale alle classi con una data. Le attività che crei nelle classi entrano qui da sole.',
        el('button', { type: 'button', class: 'btn btn-ok grande', text: '➕ Nuova attività nell\'archivio', onclick: function () { App.UI.FinestraArchivioAttivita.apri(null); } })));
      return;
    }
    cont.appendChild(App.UI.TagAttivita.filtro(App.UI.disegnaContenuto));
    var tutte = l.length;
    l = l.filter(App.UI.TagAttivita.passa);
    if (!l.length) { cont.appendChild(el('p', { class: 'suggerimento', text: 'Nessuna attività con il tag ' + App.UI.TagAttivita.filtroAttivo().nome + '.' })); return; }
    cont.appendChild(el('ul', { class: 'lista lista-attivita' }, l.map(function (v) {
      var usata = App.ArchivioAttivita.usataIn(v);
      return el('li', {}, el('div', { class: 'riga-attivita riga-archivio' },
        el('button', { type: 'button', class: 'att-testo att-apri', onclick: function () { App.UI.FinestraArchivioAttivita.apri(v); } },
          el('b', { text: v.titolo }),
          App.UI.TagAttivita.etichette(v),
          v.descrizione ? el('span', { class: 'piccolo att-descr', text: v.descrizione }) : null,
          el('span', { class: 'piccolo', text: (usata.length ? 'Assegnata a: ' + usata.join(', ') : 'Non ancora assegnata') + ((v.foto || []).length ? ' · 📷 ' + v.foto.length : '') })),
        el('button', { type: 'button', class: 'btn btn-ok piccolo-btn', text: '📌 Assegna', onclick: function () { App.UI.FinestraCopiaAttivita.apri(null, v); } })));
    })));
    cont.appendChild(el('p', { class: 'piccolo', text: (l.length < tutte ? l.length + ' di ' : '') + tutte + ' attività nell\'archivio. "📌 Assegna": scegli classi e data; in ogni classe nasce l\'attività pronta per i voti. Le attività create nelle classi entrano qui da sole.' }));
  }

  App.UI.Pagine.attivita = {
    disegna: function (cont) {
      var pref = App.Stato.dati.preferenze;
      cont.appendChild(App.UI.titoloPagina('⛹️ Attività'));
      cont.appendChild(App.UI.sottoSchede([['classe', '🏫 Classe'], ['archivio', '📚 Archivio']], pref.sottoAttivita || 'classe',
        function (id) { pref.sottoAttivita = id; App.Stato.scrivi(); App.UI.disegnaContenuto(); }));
      if (pref.sottoAttivita === 'archivio') { archivio(cont); return; }
      if (App.UI.senzaClassi(cont)) return;
      var classe = App.Stato.classe();
      cont.appendChild(el('div', { class: 'strumenti' }, App.UI.sceltaClasse(),
        el('button', { type: 'button', class: 'btn btn-ok', text: '➕ Nuova attività', onclick: function () { App.UI.FinestraAttivita.apri(classe, null); } }),
        classe.alunni.length ? el('button', { type: 'button', class: 'btn btn-neutro', text: '🗒️ Osservazioni della lezione', onclick: function () { App.UI.FinestraOsservazioni.apri(classe); } }) : null));
      var l = App.Attivita.tutte(classe);
      if (!l.length) {
        cont.appendChild(App.UI.vuoto('⛹️', 'Nessuna attività in ' + classe.nome,
          'Un\'attività valutata: scrivi titolo, descrizione e note, poi dai il voto agli alunni (interi o con mezzo punto).',
          el('button', { type: 'button', class: 'btn btn-ok grande', text: '➕ Nuova attività', onclick: function () { App.UI.FinestraAttivita.apri(classe, null); } })));
        return;
      }
      cont.appendChild(App.UI.TagAttivita.filtro(App.UI.disegnaContenuto));
      var filtrate = l.filter(App.UI.TagAttivita.passa);
      if (!filtrate.length) cont.appendChild(el('p', { class: 'suggerimento', text: 'Nessuna attività con il tag ' + App.UI.TagAttivita.filtroAttivo().nome + ' in ' + classe.nome + '.' }));
      else cont.appendChild(el('ul', { class: 'lista lista-attivita' }, filtrate.map(function (a) { return riga(classe, a); })));
      cont.appendChild(el('p', { class: 'piccolo', text: l.length + (l.length === 1 ? ' attività' : ' attività') + ' in ' + classe.nome + '. Tocca un\'attività per vederla, dare o correggere i voti.' }));
    }
  };
})(window.App = window.App || {});
