/* finestra-copia-attivita.js
 * Cosa fa: "📋 Copia in altre classi" di un'attività già salvata: data (proposta quella dell'attività)
 *          e spunte delle altre classi; in ognuna nasce una copia con titolo, descrizione, note e foto
 *          (foto duplicate, così eliminarne una non tocca le altre). I voti non si copiano.
 *          Le classi che hanno già la stessa attività quel giorno sono indicate e non si possono spuntare.
 * Dipende da: App.U, App.Stato, App.Classi, App.Attivita, App.Foto, App.Avvisi, App.Finestra,
 *             App.UI.disegnaContenuto
 *          Con classe = null la usa l'📚 Archivio delle attività per assegnarle alle classi.
 * Usato da: ui/finestra-attivita.js, ui/finestra-archivio-attivita.js
 */
(function (App) {
  'use strict';

  App.UI = App.UI || {};
  var el = function () { return App.U.el.apply(null, arguments); };

  App.UI.FinestraCopiaAttivita = {
    apri: function (classe, att) {
      // classe = null: dall'📚 Archivio, tutte le classi (v7.27)
      var altre = App.Classi.tutte().filter(function (c) { return !classe || c.id !== classe.id; });
      if (!altre.length) { App.Avvisi.toast(classe ? 'Non ci sono altre classi: creale in 🏫 Classi.' : 'Non ci sono classi: creale in 🏫 Classi.', 'info', 4000); return; }
      var scelte = {}, data = el('input', { type: 'date', 'aria-label': 'Data nelle altre classi', value: att.data || App.U.oggiISO() });
      var lista = el('ul', { class: 'lista lista-copia' });

      function gia(c) { return App.Attivita.errore(c, { data: data.value, titolo: att.titolo }) !== null; }
      function disegna() {
        App.U.svuota(lista);
        altre.forEach(function (c) {
          var no = gia(c);
          if (no) delete scelte[c.id];
          var cb = el('input', { type: 'checkbox', checked: !!scelte[c.id], disabled: no, 'aria-label': 'Copia in ' + c.nome });
          cb.addEventListener('change', function () { if (cb.checked) scelte[c.id] = true; else delete scelte[c.id]; });
          lista.appendChild(el('li', {}, el('label', { class: 'scelta' }, cb, ' 🏫 ' + c.nome,
            no ? el('span', { class: 'piccolo', text: ' – c\'è già "' + att.titolo + '" quel giorno' }) : null)));
        });
      }
      data.addEventListener('change', disegna);
      disegna();

      function copia() {
        var dest = altre.filter(function (c) { return scelte[c.id]; });
        if (!dest.length) { App.Avvisi.toast('Spunta almeno una classe.', 'info'); return false; }
        var fatte = [], foto = [], errori = [];
        dest.forEach(function (c) {
          var r = App.Attivita.copia(att, c, data.value);
          if (r.errore) errori.push(c.nome + ': ' + r.errore); else { fatte.push(c.nome); foto = foto.concat(r.foto); }
        });
        App.Stato.salva();
        Promise.all(foto.map(function (f) { return App.Foto.leggi(f.da).then(function (u) { if (u) return App.Foto.salva(f.a, u); }); }))
          .catch(function () { App.Avvisi.toast('⚠️ Alcune foto non sono state copiate.', 'errore', 5000); });
        App.UI.disegnaContenuto();
        App.Avvisi.toast((fatte.length ? '✔ "' + att.titolo + '" copiata in ' + fatte.join(', ') + ' (senza voti).' : '') +
          (errori.length ? ' ❌ ' + errori.join(' · ') : ''), errori.length ? 'errore' : 'ok', 6000);
      }

      App.Finestra.apri({
        titolo: (classe ? 'Copia "' : 'Assegna "') + att.titolo + '"', icona: classe ? '📋' : '📌', fuoco: false,
        corpo: el('div', { class: 'modulo' },
          el('p', { class: 'piccolo', text: 'Si copiano titolo, descrizione, note e foto (come sono salvati). I voti no: li darai nella classe nuova.' }),
          el('label', { class: 'campo' }, el('span', { text: 'Data' }), data),
          el('h4', { text: 'In quali classi?' }), lista),
        pulsanti: [{ testo: 'Annulla', tipo: 'neutro' }, { testo: classe ? '📋 Copia' : '📌 Assegna', tipo: 'ok', azione: copia }]
      });
    }
  };
})(window.App = window.App || {});
