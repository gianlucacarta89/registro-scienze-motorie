/* finestra-attivita.js
 * Cosa fa: finestra di un'attività valutata (nuova o da modificare): data, titolo, descrizione, note e,
 *          per ogni alunno, voto (menu: interi e mezzi punti, "–" = nessun voto) e nota. "✔ Salva" controlla
 *          e salva tutto; "🗑️ Elimina" (solo per un'attività già salvata) chiede conferma.
 * Dipende da: App.U, App.Config (sessi, attivita, limiti), App.Attivita, App.Voti, App.Stato, App.Avvisi,
 *             App.Finestra, App.UI.disegnaContenuto
 * Usato da: ui/pagina-attivita.js
 */
(function (App) {
  'use strict';

  App.UI = App.UI || {};
  var el = function () { return App.U.el.apply(null, arguments); };

  App.UI.FinestraAttivita = {
    apri: function (classe, att) {
      var cfg = App.Config.attivita, voti = App.U.copia((att && att.voti) || {});
      var data = el('input', { type: 'date', 'aria-label': 'Data', value: att ? att.data : App.U.oggiISO() });
      var titolo = el('input', { type: 'text', 'aria-label': 'Titolo', maxlength: cfg.titolo, value: att ? att.titolo : '',
        placeholder: 'es. Circuito di destrezza, Partita 3 contro 3' });
      var descr = el('textarea', { 'aria-label': 'Descrizione', maxlength: cfg.descrizione, rows: 3, placeholder: 'Che cosa si fa e che cosa si valuta' });
      descr.value = att ? att.descrizione : '';
      var note = el('textarea', { 'aria-label': 'Note', maxlength: cfg.descrizione, rows: 2, placeholder: 'facoltative (es. criteri, materiale, osservazioni)' });
      note.value = att ? att.note : '';

      function voce(a) { voti[a.id] = voti[a.id] || { voto: null, nota: '' }; return voti[a.id]; }
      var righe = classe.alunni.map(function (a, i) {
        var v = voti[a.id] || { voto: null, nota: '' };
        var menu = el('select', { 'aria-label': 'Voto – ' + a.nome },
          el('option', { value: '', text: '–' }),
          App.Attivita.votiPossibili().map(function (x) { return el('option', { value: String(x), text: App.Voti.testo(x) }); }));
        menu.value = v.voto === null || v.voto === undefined ? '' : String(v.voto);
        menu.addEventListener('change', function () { voce(a).voto = menu.value === '' ? null : Number(menu.value); });
        var nota = el('input', { type: 'text', maxlength: App.Config.limiti.nota, 'aria-label': 'Nota – ' + a.nome, value: v.nota || '', placeholder: 'nota' });
        nota.addEventListener('input', function () { voce(a).nota = nota.value; });
        return el('li', { class: 'riga-voto-attivita' },
          el('span', { class: 'appello-nome' }, el('span', { class: 'num', text: (i + 1) + '.' }), ' ' + a.nome + (a.sesso ? ' ' + App.Config.sessi[a.sesso].icona : '')),
          menu, nota);
      });

      function dati() { return { data: data.value, titolo: titolo.value, descrizione: descr.value, note: note.value, voti: voti }; }

      function salva() {
        var r = att ? App.Attivita.modifica(classe, att.id, dati()) : App.Attivita.aggiungi(classe, dati());
        if (r.errore) { App.Avvisi.toast('❌ ' + r.errore, 'errore', 6000); return false; }
        App.Stato.salva();
        App.UI.disegnaContenuto();
        App.Avvisi.toast('✔ Attività "' + r.attivita.titolo + '" salvata: ' + App.Attivita.valutati(r.attivita) + ' alunni valutati.', 'ok', 5000);
      }

      function elimina(f) {
        var n = App.Attivita.valutati(att);
        App.Avvisi.conferma({ titolo: 'Eliminare l\'attività "' + att.titolo + '"?', pericolo: true, testoOk: '🗑️ Elimina',
          testo: [n ? 'Si cancellano anche i ' + n + ' voti degli alunni.' : 'Non ha ancora voti.', 'Se poi ti serve: 💾 Backup → ⬆️ Importa il backup di prima.'] })
          .then(function (si) {
            if (!si) return;
            App.Attivita.elimina(classe, att.id);
            App.Stato.salva();
            f.chiudi();
            App.UI.disegnaContenuto();
            App.Avvisi.toast('🗑️ Attività eliminata.', 'info', 4000);
          });
        return false;
      }

      App.Finestra.apri({
        titolo: att ? att.titolo : 'Nuova attività – ' + classe.nome, icona: '📝', larga: true, fuoco: !att,
        corpo: el('div', { class: 'modulo finestra-attivita' },
          el('div', { class: 'riga-att-testa' },
            el('label', { class: 'campo' }, el('span', { text: 'Data' }), data),
            el('label', { class: 'campo' }, el('span', { text: 'Titolo' }), titolo)),
          el('label', { class: 'campo' }, el('span', { text: 'Descrizione' }), descr),
          el('label', { class: 'campo' }, el('span', { text: 'Note' }), note),
          el('h4', { text: '🎯 Voti degli alunni (da ' + App.Voti.testo(cfg.votoMin) + ' a ' + App.Voti.testo(cfg.votoMax) + ', anche mezzi punti; "–" = non valutato)' }),
          classe.alunni.length ? el('ul', { class: 'lista lista-voti-attivita' }, righe) :
            el('p', { class: 'suggerimento', text: 'La classe non ha ancora alunni: caricali in 🏫 Classi.' })),
        pulsanti: (att ? [{ testo: '🗑️ Elimina', tipo: 'pericolo', azione: elimina }] : []).concat([
          { testo: 'Annulla', tipo: 'neutro' }, { testo: '✔ Salva', tipo: 'ok', azione: salva }])
      });
    }
  };
})(window.App = window.App || {});
