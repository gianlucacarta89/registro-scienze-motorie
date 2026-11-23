/* finestra-archivio-attivita.js
 * Cosa fa: finestra di un'attività dell'📚 Archivio (nuova o da modificare): titolo, descrizione, note e
 *          🏷️ tag, 📷 foto; "📌 Assegna alle classi" (classi e data: ui/finestra-copia-attivita.js) e "🗑️ Elimina"
 *          (con conferma: le attività già assegnate alle classi restano).
 * Dipende da: App.U, App.Config (attivita), App.ArchivioAttivita, App.Foto, App.Stato, App.Avvisi,
 *             App.Finestra, App.UI.FotoAttivita, App.UI.FinestraCopiaAttivita, App.UI.disegnaContenuto
 * Usato da: ui/pagina-attivita.js
 */
(function (App) {
  'use strict';

  App.UI = App.UI || {};
  var el = function () { return App.U.el.apply(null, arguments); };

  App.UI.FinestraArchivioAttivita = {
    apri: function (voce) {
      var cfg = App.Config.attivita;
      var titolo = el('input', { type: 'text', maxlength: cfg.titolo, value: voce ? voce.titolo : '', 'aria-label': 'Titolo', placeholder: 'es. Circuito di destrezza' });
      var descr = el('textarea', { rows: 3, maxlength: cfg.descrizione, 'aria-label': 'Descrizione', placeholder: 'Che cosa si fa e che cosa si valuta' });
      descr.value = voce ? voce.descrizione : '';
      var note = el('textarea', { rows: 2, maxlength: cfg.descrizione, 'aria-label': 'Note', placeholder: 'facoltative (criteri, materiale…)' });
      note.value = voce ? voce.note : '';
      var foto = App.UI.FotoAttivita.crea(voce, voce ? voce.titolo : 'Foto');
      var tag = App.UI.TagAttivita.scelta(voce && voce.tag);

      function salva(dopo) {
        var r = App.ArchivioAttivita.salva({ titolo: titolo.value, descrizione: descr.value, note: note.value, foto: foto.ids(), tag: tag.valori() }, voce && voce.id);
        if (r.errore) { App.Avvisi.toast('❌ ' + r.errore, 'errore', 5000); return false; }
        App.Stato.salva();
        foto.salva().then(function () { if (dopo) dopo(r.voce); }).catch(function () { App.Avvisi.toast('⚠️ Non riesco a salvare le foto su questo dispositivo.', 'errore', 6000); if (dopo) dopo(r.voce); });
        App.UI.disegnaContenuto();
        return r.voce;
      }

      var pulsanti = [];
      if (voce) pulsanti.push({ testo: '🗑️ Elimina', tipo: 'pericolo', azione: function (f) {
        App.Avvisi.conferma({ titolo: 'Togliere "' + voce.titolo + '" dall\'archivio?', pericolo: true, testoOk: '🗑️ Elimina',
          testo: ['Le attività già assegnate alle classi, con i loro voti, restano. Non tornerà nell\'archivio da sola: se la vuoi di nuovo, ricreala qui.'] })
          .then(function (si) {
            if (!si) return;
            (voce.foto || []).forEach(function (id) { App.Foto.elimina(id).catch(function () {}); });
            App.ArchivioAttivita.elimina(voce.id); App.Stato.salva(); f.chiudi(); App.UI.disegnaContenuto();
            App.Avvisi.toast('🗑️ Tolta dall\'archivio.', 'info', 4000);
          });
        return false;
      } });
      pulsanti.push({ testo: 'Annulla', tipo: 'neutro' });
      pulsanti.push({ testo: '📌 Salva e assegna', tipo: 'info', azione: function () {
        var v = salva(function (x) { App.UI.FinestraCopiaAttivita.apri(null, x); });
        return v ? undefined : false;
      } });
      pulsanti.push({ testo: '✔ Salva', tipo: 'ok', azione: function () {
        if (!salva()) return false;
        App.Avvisi.toast('✔ Attività salvata nell\'archivio.', 'ok', 3000);
      } });

      App.Finestra.apri({
        titolo: voce ? voce.titolo : 'Nuova attività nell\'archivio', icona: '📚', larga: true, fuoco: !voce,
        corpo: el('div', { class: 'modulo finestra-attivita' },
          el('label', { class: 'campo' }, el('span', { text: 'Titolo' }), titolo),
          el('label', { class: 'campo' }, el('span', { text: 'Descrizione' }), descr),
          el('div', { class: 'campo' }, el('span', { text: 'Tag (anche più di uno)' }), tag.nodo),
          el('label', { class: 'campo' }, el('span', { text: 'Note' }), note),
          el('h4', { text: '📷 Foto' }), foto.nodo,
          el('p', { class: 'piccolo', text: 'Con "📌 Salva e assegna" scegli le classi e la data: in ognuna nasce l\'attività, pronta per i voti.' })),
        pulsanti: pulsanti
      });
    }
  };
})(window.App = window.App || {});
