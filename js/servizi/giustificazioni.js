/* giustificazioni.js
 * Cosa fa: giustificazioni degli alunni che non fanno la lezione pratica:
 *          controllo della data (mese giusto, niente doppioni), aggiunta, modifica, totali.
 * Dipende da: App.Config (simboli, limiti), App.Calendario, App.U
 * Usato da: ui/tabella-giust.js, ui/finestra-giust.js
 *
 * Dati: classe.giust[alunnoId] = [{ id, data: 'AAAA-MM-GG', simbolo: 'salute', nota: '' }]
 */
(function (App) {
  'use strict';

  function elenco(classe, alunnoId) { return classe.giust[alunnoId] || []; }
  function perData(a, b) { return a.data < b.data ? -1 : a.data > b.data ? 1 : 0; }

  App.Giust = {
    simboli: function () { return App.Config.simboli; },

    simbolo: function (id) {
      return App.Config.simboli.filter(function (s) { return s.id === id; })[0] || null;
    },

    // Giustificazioni di un alunno in un mese (oggetto di App.Calendario.mesi)
    delMese: function (classe, alunnoId, mese) {
      return elenco(classe, alunnoId)
        .filter(function (g) { return g.data >= mese.primo && g.data <= mese.ultimo; })
        .sort(perData);
    },

    // Controlla prima di salvare. -> messaggio d'errore oppure null
    errore: function (classe, alunnoId, g, mese, escludiId) {
      if (!g.data) return 'Scegli la data.';
      if (!/^\d{4}-\d{2}-\d{2}$/.test(g.data) || isNaN(new Date(g.data + 'T12:00:00')))
        return 'La data non è valida.';
      if (g.data < mese.primo || g.data > mese.ultimo)
        return 'La data deve essere di ' + mese.nome + ' ' + mese.anno + ' (dal 1 al ' + mese.giorni + '). ' +
          'Per un altro mese tocca la sua colonna.';
      if (!this.simbolo(g.simbolo)) return 'Scegli il motivo toccando uno dei simboli.';
      var max = App.Config.limiti.nota;
      if (App.U.spazi(g.nota).length > max) return 'La nota può avere al massimo ' + max + ' caratteri.';
      var doppia = elenco(classe, alunnoId).some(function (x) { return x.id !== escludiId && x.data === g.data; });
      if (doppia) return 'C\'è già una giustificazione il ' + App.U.dataIT(g.data) + ': modifica quella invece di aggiungerne un\'altra.';
      return null;
    },

    aggiungi: function (classe, alunnoId, g, mese) {
      var err = this.errore(classe, alunnoId, g, mese);
      if (err) return err;
      classe.giust[alunnoId] = elenco(classe, alunnoId).concat([{
        id: App.U.nuovoId(), data: g.data, simbolo: g.simbolo, nota: App.U.spazi(g.nota)
      }]).sort(perData);
      return null;
    },

    modifica: function (classe, alunnoId, id, g, mese) {
      var err = this.errore(classe, alunnoId, g, mese, id);
      if (err) return err;
      elenco(classe, alunnoId).forEach(function (x) {
        if (x.id === id) { x.data = g.data; x.simbolo = g.simbolo; x.nota = App.U.spazi(g.nota); }
      });
      classe.giust[alunnoId].sort(perData);
      return null;
    },

    elimina: function (classe, alunnoId, id) {
      classe.giust[alunnoId] = elenco(classe, alunnoId).filter(function (x) { return x.id !== id; });
      if (!classe.giust[alunnoId].length) delete classe.giust[alunnoId];
    },

    // Totale dell'alunno nell'anno scolastico
    totaleAnno: function (classe, alunnoId, annoInizio) {
      var l = App.Calendario.limiti(annoInizio);
      return elenco(classe, alunnoId).filter(function (g) { return g.data >= l.primo && g.data <= l.ultimo; }).length;
    },

    // Conteggio per simbolo di tutta la classe nell'anno scolastico -> { salute: 3, ... }
    contaClasse: function (classe, annoInizio) {
      var l = App.Calendario.limiti(annoInizio), out = {};
      App.Config.simboli.forEach(function (s) { out[s.id] = 0; });
      classe.alunni.forEach(function (a) {
        elenco(classe, a.id).forEach(function (g) {
          if (g.data >= l.primo && g.data <= l.ultimo && out[g.simbolo] !== undefined) out[g.simbolo]++;
        });
      });
      return out;
    }
  };
})(window.App = window.App || {});
