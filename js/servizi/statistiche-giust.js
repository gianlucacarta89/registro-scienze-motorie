/* statistiche-giust.js
 * Cosa fa: conteggi delle giustificazioni per la scheda 📈 Statistiche giustificazioni:
 *          per alunno (totale e per tipologia) nel mese scelto o in tutto l'anno,
 *          per mese (tutto l'anno scolastico) e per tipologia, totali alunni / alunne;
 *          "certificato" conta quelle con certificato medico.
 * Dipende da: App.Config (simboli), App.Calendario, App.Giust
 * Usato da: ui/statistiche-giust.js
 */
(function (App) {
  'use strict';

  function vuoto() {
    var o = { tot: 0, certificato: 0 };
    App.Config.simboli.forEach(function (s) { o[s.id] = 0; });
    return o;
  }

  // Intervallo di date: un mese (chiave "2026-10") oppure tutto l'anno scolastico
  function intervallo(anno, chiaveMese) {
    if (chiaveMese) {
      var m = App.Calendario.mesi(anno).filter(function (x) { return x.chiave === chiaveMese; })[0];
      if (m) return { primo: m.primo, ultimo: m.ultimo };
    }
    return App.Calendario.limiti(anno);
  }

  function dentro(g, l) { return g.data >= l.primo && g.data <= l.ultimo; }

  App.StatGiust = {
    // [{ alunno, tot, salute: n, ... }] nell'intervallo
    perAlunno: function (classe, anno, chiaveMese) {
      var l = intervallo(anno, chiaveMese);
      return classe.alunni.map(function (a) {
        var c = vuoto();
        c.alunno = a;
        (classe.giust[a.id] || []).forEach(function (g) {
          if (!dentro(g, l)) return;
          c.tot++;
          if (c[g.simbolo] !== undefined) c[g.simbolo]++;
          if (App.Giust.conCertificato(g)) c.certificato++;
        });
        return c;
      });
    },

    // [{ mese, tot, salute: n, ... }] per tutti i mesi dell'anno scolastico
    perMese: function (classe, anno) {
      return App.Calendario.mesi(anno).map(function (m) {
        var c = vuoto();
        c.mese = m;
        classe.alunni.forEach(function (a) {
          App.Giust.delMese(classe, a.id, m).forEach(function (g) {
            c.tot++;
            if (c[g.simbolo] !== undefined) c[g.simbolo]++;
            if (App.Giust.conCertificato(g)) c.certificato++;
          });
        });
        return c;
      });
    },

    // Totali della classe nell'intervallo, anche separati per alunni e alunne
    totali: function (righe) {
      var t = vuoto(), M = 0, F = 0, conAlmenoUna = 0;
      righe.forEach(function (r) {
        Object.keys(t).forEach(function (k) { t[k] += r[k]; });
        if (r.tot) conAlmenoUna++;
        if (r.alunno.sesso === 'M') M += r.tot;
        if (r.alunno.sesso === 'F') F += r.tot;
      });
      t.M = M; t.F = F; t.conAlmenoUna = conAlmenoUna;
      t.mediaPerAlunno = righe.length ? Math.round(t.tot / righe.length * 10) / 10 : 0;
      return t;
    }
  };
})(window.App = window.App || {});
