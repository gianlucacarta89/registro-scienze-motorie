/* profilo.js
 * Cosa fa: profilo di un alunno per capacità (forza, velocità, resistenza, coordinazione,
 *          flessibilità: config.js > capacita): per ogni capacità la media dei voti dei suoi
 *          test in una prova. Serve al grafico a ragnatela delle 📈 Statistiche (pagina 📚 Test).
 * Dipende da: App.Config (capacita), App.Voti, App.U
 * Usato da: ui/profilo-alunno.js
 */
(function (App) {
  'use strict';

  function arrot(n) { return Math.round(n * 10) / 10; }

  // Capacità di un test dalla sua tipologia (null se nessuna)
  function capacitaDi(t) {
    var k = App.U.chiaveNome(t.tipologia || '');
    return App.Config.capacita.filter(function (c) {
      return c.tipologie.some(function (x) { return App.U.chiaveNome(x) === k; });
    })[0] || null;
  }

  // Capacità presenti nella classe: quelle con almeno un test con la tabella dei voti
  function capacitaClasse(classe) {
    return App.Config.capacita.filter(function (c) {
      return classe.test.some(function (t) { return capacitaDi(t) === c && App.Voti.haTabella(t); });
    });
  }

  // -> [{ capacita, media: 7.5 | null, voti: [{ test, voto }] }] nelle capacità della classe
  function alunno(classe, a, prova) {
    return capacitaClasse(classe).map(function (c) {
      var voti = classe.test.filter(function (t) { return capacitaDi(t) === c; }).map(function (t) {
        return { test: t, voto: App.Voti.votoAlunno(classe, a, t, prova).voto };
      }).filter(function (x) { return x.voto !== null; });
      var media = voti.length ? arrot(voti.reduce(function (s, x) { return s + x.voto; }, 0) / voti.length) : null;
      return { capacita: c, media: media, voti: voti };
    });
  }

  App.Profilo = { capacitaDi: capacitaDi, capacitaClasse: capacitaClasse, alunno: alunno };
})(window.App = window.App || {});
