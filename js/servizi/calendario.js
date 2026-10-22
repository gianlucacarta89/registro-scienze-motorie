/* calendario.js
 * Cosa fa: anno scolastico (settembre-giugno) e mesi con le loro date.
 * Dipende da: App.Config (meseInizio, mesi), App.Stato, App.U
 * Usato da: App.Giust, ui/tabella-giust.js, ui/finestra-giust.js, ui/pagina.js
 */
(function (App) {
  'use strict';

  function cfg() { return App.Config; }

  App.Calendario = {
    // Anno di inizio dell'anno scolastico in corso (ott 2026 -> 2026; mar 2027 -> 2026)
    annoCorrente: function (d) {
      d = d || new Date();
      return d.getMonth() + 1 >= cfg().meseInizio ? d.getFullYear() : d.getFullYear() - 1;
    },

    // Anno mostrato (scelto dall'utente, oppure quello in corso)
    annoAttivo: function () {
      var a = App.Stato.dati.preferenze.annoInizio;
      return typeof a === 'number' ? a : this.annoCorrente();
    },

    etichetta: function (a) { return a + '/' + String(a + 1).slice(2); },

    ultimoGiorno: function (anno, mese) { return new Date(anno, mese, 0).getDate(); },

    // Mesi dell'anno scolastico con anno solare, prima e ultima data
    mesi: function (annoInizio) {
      var self = this, p2 = App.U.pad2;
      return cfg().mesi.map(function (m) {
        var anno = m.num >= cfg().meseInizio ? annoInizio : annoInizio + 1;
        var base = anno + '-' + p2(m.num) + '-';
        return {
          num: m.num, nome: m.nome, breve: m.breve, anno: anno,
          chiave: anno + '-' + p2(m.num),
          primo: base + '01',
          ultimo: base + p2(self.ultimoGiorno(anno, m.num)),
          giorni: self.ultimoGiorno(anno, m.num)
        };
      });
    },

    // Prima e ultima data dell'anno scolastico
    limiti: function (annoInizio) {
      var m = this.mesi(annoInizio);
      return { primo: m[0].primo, ultimo: m[m.length - 1].ultimo };
    },

    // Mese (oggetto di mesi()) che contiene la data, oppure null
    meseDi: function (iso, annoInizio) {
      var k = String(iso).slice(0, 7);
      return this.mesi(annoInizio).filter(function (m) { return m.chiave === k; })[0] || null;
    }
  };
})(window.App = window.App || {});
