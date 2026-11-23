/* archivio-attivita.js
 * Cosa fa: 📚 Archivio delle attività (⛹️ Attività → 📚 Archivio): attività scritte una volta (titolo,
 *          descrizione, note, foto) da assegnare poi alle classi con una data (diventano attività della
 *          classe, senza voti, con le foto duplicate). Un'attività di una classe si può salvare
 *          nell'archivio per riusarla.
 * Dipende da: App.U, App.Stato, App.Config (attivita), App.Attivita
 * Usato da: ui/pagina-attivita.js, ui/finestra-archivio-attivita.js, ui/finestra-attivita.js,
 *           ui/finestra-copia-attivita.js, dati/foto.js, dati/unisci-backup.js
 *
 * Dati: dati.archivioAttivita = [{ id, titolo, descrizione, note, foto: [id…] }]
 */
(function (App) {
  'use strict';

  function lista() { var d = App.Stato.dati; d.archivioAttivita = d.archivioAttivita || []; return d.archivioAttivita; }
  function k(n) { return App.U.chiaveNome(n || ''); }

  function errore(x, escludiId) {
    var c = App.Config.attivita, t = App.U.spazi(x.titolo);
    if (!t) return 'Scrivi il titolo dell\'attività.';
    if (t.length > c.titolo) return 'Il titolo può avere al massimo ' + c.titolo + ' caratteri.';
    if (App.U.spazi(x.descrizione).length > c.descrizione || App.U.spazi(x.note).length > c.descrizione) return 'Descrizione e note: al massimo ' + c.descrizione + ' caratteri.';
    if (lista().some(function (y) { return y.id !== escludiId && k(y.titolo) === k(t); })) return 'Nell\'archivio c\'è già "' + t + '".';
    return null;
  }

  App.ArchivioAttivita = {
    errore: errore,
    tutte: function () { return lista().slice().sort(function (a, b) { return a.titolo.localeCompare(b.titolo); }); },
    trova: function (id) { return lista().filter(function (x) { return x.id === id; })[0] || null; },

    // -> { errore } | { voce }
    salva: function (x, id) {
      var e = errore(x, id);
      if (e) return { errore: e };
      var v = id ? App.ArchivioAttivita.trova(id) : { id: App.U.nuovoId() };
      v.titolo = App.U.spazi(x.titolo); v.descrizione = App.U.spazi(x.descrizione); v.note = App.U.spazi(x.note); v.foto = (x.foto || []).slice();
      if (!id) lista().push(v);
      return { voce: v };
    },

    elimina: function (id) { App.Stato.dati.archivioAttivita = lista().filter(function (x) { return x.id !== id; }); },

    // Classi in cui è stata assegnata (stesso titolo)
    usataIn: function (v) {
      return App.Stato.dati.classi.filter(function (c) { return (c.attivita || []).some(function (a) { return k(a.titolo) === k(v.titolo); }); })
        .map(function (c) { return c.nome; });
    },

    // Da un'attività di una classe: copia nell'archivio (foto con id nuovi). -> { errore } | { voce, foto: [{ da, a }] }
    daAttivita: function (att) {
      var foto = (att.foto || []).map(function (id) { return { da: id, a: App.U.nuovoId() }; });
      var r = App.ArchivioAttivita.salva({ titolo: att.titolo, descrizione: att.descrizione, note: att.note, foto: foto.map(function (f) { return f.a; }) });
      return r.errore ? r : { voce: r.voce, foto: foto };
    }
  };
})(window.App = window.App || {});
