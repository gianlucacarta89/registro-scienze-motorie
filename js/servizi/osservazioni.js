/* osservazioni.js
 * Cosa fa: osservazioni quotidiane per alunno (👍 positiva / 👎 negativa + breve nota), per seguire
 *          l'andamento e decidere il voto di fine quadrimestre. Conteggi per quadrimestre (config.js >
 *          quadrimestri: giorno/mese di inizio e fine, il 1° va da settembre a gennaio).
 *          L'app non calcola nessun voto dalle osservazioni.
 * Dipende da: App.U, App.Config (osservazioni, quadrimestri), App.Calendario
 * Usato da: ui/finestra-osservazioni.js, ui/osservazioni-alunno.js, servizi/classi.js, dati/unisci-backup.js
 *
 * Dati: classe.osservazioni = { alunnoId: [{ id, data: 'AAAA-MM-GG', tipo: 'pos'|'neg', testo }] }
 */
(function (App) {
  'use strict';

  function cfg() { return App.Config.osservazioni; }
  function tutte(classe) { classe.osservazioni = classe.osservazioni || {}; return classe.osservazioni; }

  // Quadrimestri dell'anno scolastico che inizia a settembre di "anno" -> [{ id, nome, primo, ultimo }]
  function quadrimestri(anno) {
    return App.Config.quadrimestri.map(function (q) {
      var a1 = Number(q.da.slice(0, 2)) >= 9 ? anno : anno + 1, a2 = Number(q.a.slice(0, 2)) >= 9 ? anno : anno + 1;
      return { id: q.id, nome: q.nome, primo: a1 + '-' + q.da, ultimo: a2 + '-' + q.a };
    });
  }

  function tipo(id) { return cfg().tipi.filter(function (t) { return t.id === id; })[0] || null; }

  App.Osservazioni = {
    tipo: tipo,
    quadrimestri: quadrimestri,

    // Osservazioni di un alunno, più recenti prima
    di: function (classe, alunnoId) {
      return (tutte(classe)[alunnoId] || []).slice().sort(function (a, b) { return a.data < b.data ? 1 : a.data > b.data ? -1 : 0; });
    },

    delGiorno: function (classe, alunnoId, data) { return (tutte(classe)[alunnoId] || []).filter(function (o) { return o.data === data; }); },

    errore: function (x) {
      if (!x.data || !/^\d{4}-\d{2}-\d{2}$/.test(x.data)) return 'Scegli il giorno.';
      if (!tipo(x.tipo)) return 'Scegli 👍 o 👎.';
      if (App.U.spazi(x.testo).length > cfg().testo) return 'La nota può avere al massimo ' + cfg().testo + ' caratteri.';
      return null;
    },

    // -> { errore } | { osservazione }
    aggiungi: function (classe, alunnoId, x) {
      var e = App.Osservazioni.errore(x);
      if (e) return { errore: e };
      var o = { id: App.U.nuovoId(), data: x.data, tipo: x.tipo, testo: App.U.spazi(x.testo) };
      var t = tutte(classe);
      t[alunnoId] = (t[alunnoId] || []).concat([o]);
      return { osservazione: o };
    },

    elimina: function (classe, alunnoId, id) {
      var t = tutte(classe);
      t[alunnoId] = (t[alunnoId] || []).filter(function (o) { return o.id !== id; });
      if (!t[alunnoId].length) delete t[alunnoId];
    },

    togliAlunno: function (classe, alunnoId) { delete tutte(classe)[alunnoId]; },

    // Quante positive e negative in un periodo { primo, ultimo } (o in tutto l'anno se manca)
    conta: function (classe, alunnoId, per) {
      var c = { pos: 0, neg: 0 };
      (tutte(classe)[alunnoId] || []).forEach(function (o) {
        if (!per || (o.data >= per.primo && o.data <= per.ultimo)) c[o.tipo] = (c[o.tipo] || 0) + 1;
      });
      return c;
    }
  };
})(window.App = window.App || {});
