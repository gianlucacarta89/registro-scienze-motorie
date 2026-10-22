/* statistiche.js
 * Cosa fa: calcola le statistiche della classe per la scheda 📈 Statistiche:
 *          per un test e una prova (svolti, media, migliore, peggiore, alunni/alunne,
 *          quanti per ogni voto), miglioramenti 1ª → 2ª prova, media voti per test.
 * Dipende da: App.Test (valore, numero, formattaTempo, confronto), App.Voti, App.Config
 * Usato da: ui/statistiche.js
 */
(function (App) {
  'use strict';

  function arrot(n, c) { var f = Math.pow(10, c === undefined ? 1 : c); return Math.round(n * f) / f; }
  function mediaDi(l) { return l.length ? l.reduce(function (a, b) { return a + b; }, 0) / l.length : null; }

  // Numero -> testo come lo scrive il test (tempo in min:sec, numeri con la virgola)
  function testoValore(test, n) {
    if (n === null || n === undefined) return '–';
    if (test.tipo === 'tempo') return App.Test.formattaTempo(arrot(n, 2));
    return String(arrot(n, 2)).replace('.', ',') + (test.unita ? ' ' + test.unita : '');
  }

  // Statistiche di un test in una prova
  function test(classe, t, prova) {
    var righe = classe.alunni.map(function (a) {
      var v = App.Test.valore(classe, a.id, t.id, prova);
      return { alunno: a, n: v ? App.Test.numero(t, v) : null, voto: App.Voti.votoAlunno(classe, a, t, prova) };
    });
    var svolti = righe.filter(function (r) { return r.n !== null; });
    var numeri = svolti.map(function (r) { return r.n; });
    var meglio = t.migliore === 'alto' ? Math.max : Math.min, peggio = t.migliore === 'alto' ? Math.min : Math.max;

    function perSesso(s) {
      var l = svolti.filter(function (r) { return r.alunno.sesso === s; }).map(function (r) { return r.n; });
      return { svolti: l.length, media: l.length ? mediaDi(l) : null };
    }

    // quanti per ogni voto intero (6,5 conta nel 6)
    var conVoto = righe.filter(function (r) { return r.voto.voto !== null; });
    var c = App.Config.voti, distribuzione = [];
    for (var v = Math.floor(c.min); v <= Math.floor(c.max); v++) {
      distribuzione.push({ voto: v, quanti: conVoto.filter(function (r) { return Math.floor(r.voto.voto) === v; }).length });
    }
    var voti = conVoto.map(function (r) { return r.voto.voto; });

    return {
      totale: classe.alunni.length,
      svolti: svolti.length,
      media: numeri.length ? mediaDi(numeri) : null,
      migliore: numeri.length ? meglio.apply(null, numeri) : null,
      peggiore: numeri.length ? peggio.apply(null, numeri) : null,
      M: perSesso('M'),
      F: perSesso('F'),
      tabella: App.Voti.haTabella(t),
      distribuzione: distribuzione,
      mediaVoti: voti.length ? arrot(mediaDi(voti), 2) : null,
      sufficienti: voti.filter(App.Voti.sufficiente).length,
      conVoto: voti.length,
      senzaSesso: svolti.filter(function (r) { return r.voto.manca === 'sesso'; }).length
    };
  }

  // Miglioramenti dalla 1ª alla 2ª prova
  function miglioramenti(classe, t) {
    var out = { meglio: 0, peggio: 0, uguale: 0, confrontabili: 0 };
    classe.alunni.forEach(function (a) {
      var x = App.Test.confronto(classe, a.id, t);
      if (!x.esito) return;
      out.confrontabili++;
      out[x.esito]++;
    });
    return out;
  }

  // Media dei voti della classe per ogni test con tabella
  function mediaVotiPerTest(classe, prova) {
    return classe.test.map(function (t) {
      var voti = classe.alunni.map(function (a) { return App.Voti.votoAlunno(classe, a, t, prova).voto; })
        .filter(function (v) { return v !== null; });
      return { test: t, media: voti.length ? arrot(mediaDi(voti), 2) : null, quanti: voti.length };
    }).filter(function (x) { return App.Voti.haTabella(x.test); });
  }

  App.Statistiche = { test: test, miglioramenti: miglioramenti, mediaVotiPerTest: mediaVotiPerTest, testoValore: testoValore };
})(window.App = window.App || {});
