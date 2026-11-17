/* segnapunti.js
 * Cosa fa: tabellone segnapunti (pagina 🏆 Segnapunti, dalla Home): due squadre con nome, punti del set
 *          in corso, set vinti, punteggi dei set finiti; "Fine set" dà il set a chi ha più punti;
 *          "Annulla" torna indietro di un'azione (fino a config.segnapunti.annulla); "Nuova partita".
 *          Lo stato resta su questo dispositivo (dati.segnapunti) anche se si chiude l'app.
 * Dipende da: App.Config (segnapunti)
 * Usato da: ui/pagina-segnapunti.js, ui/pagina-home.js
 *
 * Dati: dati.segnapunti = { nomi: [A, B], punti: [0, 0], set: [0, 0], finiti: [[25, 20], …], indietro: [stati] }
 */
(function (App) {
  'use strict';

  function cfg() { return App.Config.segnapunti; }
  function nuovo(nomi) { return { nomi: (nomi || cfg().nomi).slice(), punti: [0, 0], set: [0, 0], finiti: [], indietro: [] }; }

  function stato(d) {
    if (!d.segnapunti || !Array.isArray(d.segnapunti.punti)) d.segnapunti = nuovo();
    return d.segnapunti;
  }

  // Ricorda lo stato prima di un'azione (per "Annulla")
  function ricorda(s) {
    s.indietro.push(JSON.stringify({ punti: s.punti, set: s.set, finiti: s.finiti }));
    if (s.indietro.length > cfg().annulla) s.indietro.shift();
  }

  App.Segnapunti = {
    stato: stato,

    punto: function (d, i, quanti) {
      var s = stato(d);
      if (quanti < 0 && s.punti[i] <= 0) return false;
      ricorda(s);
      s.punti[i] += quanti;
      return true;
    },

    // Il set va a chi ha più punti. -> false se pari (nessuno ha vinto)
    fineSet: function (d) {
      var s = stato(d);
      if (s.punti[0] === s.punti[1]) return false;
      ricorda(s);
      s.set[s.punti[0] > s.punti[1] ? 0 : 1]++;
      s.finiti.push(s.punti.slice());
      s.punti = [0, 0];
      return true;
    },

    annulla: function (d) {
      var s = stato(d), x = s.indietro.pop();
      if (!x) return false;
      x = JSON.parse(x);
      s.punti = x.punti; s.set = x.set; s.finiti = x.finiti;
      return true;
    },

    // Scambia le squadre di posto (cambio campo)
    scambia: function (d) {
      var s = stato(d);
      s.nomi.reverse(); s.punti.reverse(); s.set.reverse();
      s.finiti = s.finiti.map(function (f) { return f.slice().reverse(); });
      s.indietro = [];
    },

    nuova: function (d) { d.segnapunti = nuovo(stato(d).nomi); },

    rinomina: function (d, i, nome) {
      var s = stato(d), n = String(nome || '').trim().slice(0, cfg().lunghezzaNome);
      s.nomi[i] = n || cfg().nomi[i];
    },

    // Breve riassunto per la Home ("12 – 8 · set 1–0") o null se non è iniziata
    riassunto: function (d) {
      var s = d.segnapunti;
      if (!s || !Array.isArray(s.punti) || (!s.punti[0] && !s.punti[1] && !s.set[0] && !s.set[1])) return null;
      return s.punti[0] + ' – ' + s.punti[1] + ' · set ' + s.set[0] + '–' + s.set[1];
    }
  };
})(window.App = window.App || {});
