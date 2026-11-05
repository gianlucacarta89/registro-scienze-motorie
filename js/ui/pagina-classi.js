/* pagina-classi.js
 * Cosa fa: pagina 🏫 Classi: crea le classi e per ognuna mostra gli alunni (♂/♀). Da qui si
 *          caricano i nomi da file, si gestiscono gli alunni (aggiungi, ♂/♀, togli più insieme),
 *          si corregge un alunno toccandone il nome, si rinomina o si cancella la classe.
 * Dipende da: App.U, App.Config (limiti, sessi), App.Classi, App.Stato, App.Avvisi,
 *             App.UI.FinestraImporta, App.UI.FinestraAlunni, App.UI.FinestraAlunno, App.UI (vai, titoloPagina, vuoto)
 * Usato da: ui/pagina.js
 */
(function (App) {
  'use strict';

  App.UI = App.UI || {};
  App.UI.Pagine = App.UI.Pagine || {};
  var el = function () { return App.U.el.apply(null, arguments); };
  var aperte = {};     // classi aperte in questa sessione (id -> true)

  function crea(campo) {
    var r = App.Classi.crea(campo.value);
    if (r.errore) { App.Avvisi.toast('❌ ' + r.errore, 'errore', 4500); return; }
    App.Stato.dati.preferenze.classeAttiva = r.classe.id;
    App.Stato.salva();
    aperte[r.classe.id] = true;
    App.UI.disegna();
    App.Avvisi.toast('✔ Classe ' + r.classe.nome + ' creata.', 'ok');
    App.UI.FinestraImporta.apri(r.classe);     // classe nuova: propone subito il caricamento dei nomi
  }

  function elimina(c) {
    App.Avvisi.conferma({ titolo: 'Cancellare la classe ' + c.nome + '?', pericolo: true, testoOk: '🗑️ Cancella classe',
      testo: ['⚠️ Saranno cancellati ' + c.alunni.length + ' alunni con tutti i loro risultati e le giustificazioni.',
        'Se non sei sicuro, esporta prima un backup.'] })
      .then(function (si) {
        if (!si) return;
        App.Classi.elimina(c.id);
        App.Stato.salva();
        App.UI.disegna();
        App.Avvisi.toast('🗑️ Classe cancellata.', 'info');
      });
  }

  function rinomina(c, campo) {
    var err = App.Classi.rinomina(c.id, campo.value);
    if (err) { campo.value = c.nome; App.Avvisi.toast('❌ ' + err, 'errore', 4500); return; }
    App.Stato.salva();
    App.UI.disegna();
    App.Avvisi.toast('✔ Nome salvato.', 'ok');
  }

  function schedaClasse(c, attiva) {
    var nome = el('input', { type: 'text', class: 'nome-classe', value: c.nome, maxlength: App.Config.limiti.nomeClasse, 'aria-label': 'Nome della classe ' + c.nome });
    nome.addEventListener('change', function () { rinomina(c, nome); });
    nome.addEventListener('click', function (ev) { ev.preventDefault(); ev.stopPropagation(); });
    nome.addEventListener('keydown', function (ev) { if (ev.key === ' ' || ev.key === 'Enter') ev.stopPropagation(); });
    var m = c.alunni.filter(function (a) { return a.sesso === 'M'; }).length;
    var f = c.alunni.filter(function (a) { return a.sesso === 'F'; }).length;
    var senza = c.alunni.length - m - f;
    var aperta = aperte[c.id] !== undefined ? aperte[c.id] : attiva;
    var box = el('details', { class: 'classe-box' + (attiva ? ' attiva' : ''), open: aperta },
      el('summary', {}, nome,
        el('span', { class: 'piccolo conta', text: c.alunni.length + (c.alunni.length === 1 ? ' alunno' : ' alunni') + ' · ♂ ' + m + ' · ♀ ' + f + (senza ? ' · ' + senza + ' senza ♂/♀' : '') })),
      el('div', { class: 'riga-btn sinistra' },
        el('button', { type: 'button', class: 'btn btn-ok piccolo-btn', text: '📥 Carica alunni', onclick: function () { App.UI.FinestraImporta.apri(c); } }),
        el('button', { type: 'button', class: 'btn btn-neutro piccolo-btn', text: '👥 Gestisci alunni', onclick: function () { App.UI.FinestraAlunni.apri(c); } }),
        el('button', { type: 'button', class: 'btn btn-pericolo piccolo-btn', text: '🗑️ Cancella classe', onclick: function () { elimina(c); } })),
      c.alunni.length
        ? el('ol', { class: 'alunni-classe' }, c.alunni.map(function (a) {
          return el('li', {}, el('button', { type: 'button', class: 'nome-alunno', title: 'Correggi, indica ♂/♀ o togli',
            onclick: function () { App.UI.FinestraAlunno.apri(c, a); } },
            a.nome, el('span', { class: 'sesso' + (a.sesso ? '' : ' manca'), text: ' ' + (a.sesso ? App.Config.sessi[a.sesso].icona : '♂/♀?') })));
        }))
        : el('p', { class: 'piccolo', text: 'Nessun alunno: tocca "📥 Carica alunni" per prenderli da Excel, Word, PDF o incollarli.' }));
    box.addEventListener('toggle', function () { aperte[c.id] = box.open; });
    return box;
  }

  App.UI.Pagine.classi = {
    disegna: function (cont) {
      var classi = App.Classi.tutte(), attiva = App.Stato.classe();
      var campo = el('input', { type: 'text', placeholder: 'es. 2B', maxlength: App.Config.limiti.nomeClasse, 'aria-label': 'Nome della nuova classe' });
      campo.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); crea(campo); } });
      cont.appendChild(App.UI.titoloPagina('🏫 Classi e alunni'));
      cont.appendChild(el('div', { class: 'riga-aggiungi' }, campo,
        el('button', { type: 'button', class: 'btn btn-ok', text: '➕ Crea classe', onclick: function () { crea(campo); } })));
      if (!classi.length) {
        cont.appendChild(App.UI.vuoto('🏫', 'Nessuna classe', 'Scrivi il nome (es. 1G) e tocca "➕ Crea classe": poi potrai caricare i nomi degli alunni.'));
        return;
      }
      cont.appendChild(el('p', { class: 'piccolo', text: 'Tocca una classe per vedere i suoi alunni; tocca il nome di un alunno per correggerlo, indicare ♂/♀ o toglierlo. Il nome della classe si cambia scrivendo sopra.' }));
      cont.appendChild(el('div', { class: 'elenco-classi' }, classi.map(function (c) { return schedaClasse(c, attiva && attiva.id === c.id); })));
    }
  };
})(window.App = window.App || {});
