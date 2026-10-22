/* voti.js
 * Cosa fa: tabelle dei voti dei test (parametri di riferimento, es. del libro di testo),
 *          separate per alunni (♂) e alunne (♀); controllo delle tabelle prima di salvarle;
 *          calcolo automatico del voto di un risultato e media dei voti di un alunno.
 * Dipende da: App.Config (voti), App.Test (valida, valore), App.U
 * Usato da: ui/finestra-voti.js, ui/tabella-test.js, servizi/statistiche.js
 *
 * Dati: test.voti = { righe: [{ voto: 8, M: '440', F: '380' }, ...] }
 *       M / F = soglia scritta come i risultati (numero o tempo). Per "meglio più alto"
 *       la soglia è il risultato MINIMO per quel voto, per "meglio più basso" il MASSIMO.
 */
(function (App) {
  'use strict';

  var SESSI = ['M', 'F'];

  function cfg() { return App.Config.voti; }

  // Voti possibili, dal più alto al più basso (es. 10, 9,5, 9 ... 4)
  function scala() {
    var out = [], c = cfg();
    for (var v = c.max; v >= c.min - 1e-9; v -= c.passo) out.push(Math.round(v * 10) / 10);
    return out;
  }

  function testoVoto(v) {
    if (v === null || v === undefined) return '';
    return String(v).replace('.', ',');
  }

  function haTabella(test, sesso) {
    var r = (test.voti && test.voti.righe) || [];
    return r.some(function (x) { return sesso ? x[sesso] : (x.M || x.F); });
  }

  // Controlla la tabella. righe: [{ voto, M: 'testo', F: 'testo' }]
  // -> { errore } oppure { righe } pulite e ordinate dal voto più alto
  function controlla(test, righe) {
    var pulite = [], visti = {};
    for (var i = 0; i < righe.length; i++) {
      var r = righe[i], riga = { voto: Number(r.voto) };
      var vuota = !String(r.M || '').trim() && !String(r.F || '').trim();
      if (vuota) continue;
      if (scala().indexOf(riga.voto) < 0) return { errore: 'Scegli il voto della riga ' + (i + 1) + '.' };
      if (visti[riga.voto]) return { errore: 'Il voto ' + testoVoto(riga.voto) + ' compare due volte: tienine una riga sola.' };
      visti[riga.voto] = true;
      for (var s = 0; s < SESSI.length; s++) {
        var k = SESSI[s], v = App.Test.valida(test, r[k]);
        if (!v.ok) return { errore: 'Voto ' + testoVoto(riga.voto) + (k === 'M' ? ' (alunni)' : ' (alunne)') + ': ' + v.errore };
        riga[k] = v.valore;
      }
      pulite.push(riga);
    }
    pulite.sort(function (a, b) { return b.voto - a.voto; });
    // le soglie devono andare nella direzione giusta: voto più alto = risultato migliore
    for (s = 0; s < SESSI.length; s++) {
      var prec = null;
      for (i = 0; i < pulite.length; i++) {
        var n = pulite[i][SESSI[s]] === '' ? null : App.Test.numero(test, pulite[i][SESSI[s]]);
        if (n === null) continue;
        if (prec) {
          var sbagliata = test.migliore === 'alto' ? n > prec.n : n < prec.n;
          if (sbagliata) {
            return { errore: (SESSI[s] === 'M' ? 'Alunni' : 'Alunne') + ': il ' + testoVoto(pulite[i].voto) +
              ' chiede ' + pulite[i][SESSI[s]] + ', ' + (test.migliore === 'alto' ? 'più' : 'meno') + ' del ' + testoVoto(prec.voto) +
              ' (' + prec.t + '). Con "' + (test.migliore === 'alto' ? 'meglio più alto' : 'meglio più basso') +
              '" un voto più alto deve chiedere un risultato ' + (test.migliore === 'alto' ? 'maggiore o uguale.' : 'minore o uguale.') };
          }
        }
        prec = { n: n, voto: pulite[i].voto, t: pulite[i][SESSI[s]] };
      }
    }
    return { righe: pulite };
  }

  // Voto di un risultato. -> { voto } | { voto: null, manca: 'risultato'|'sesso'|'tabella' }
  function calcola(test, sesso, valore) {
    if (!valore) return { voto: null, manca: 'risultato' };
    if (!haTabella(test)) return { voto: null, manca: 'tabella' };
    if (sesso !== 'M' && sesso !== 'F') return { voto: null, manca: 'sesso' };
    var righe = test.voti.righe.filter(function (r) { return r[sesso]; });
    if (!righe.length) return { voto: null, manca: 'tabella' };
    var n = App.Test.numero(test, valore);
    if (n === null) return { voto: null, manca: 'risultato' };
    for (var i = 0; i < righe.length; i++) {
      var soglia = App.Test.numero(test, righe[i][sesso]);
      if (test.migliore === 'alto' ? n >= soglia : n <= soglia) return { voto: righe[i].voto };
    }
    return { voto: righe[righe.length - 1].voto };          // sotto l'ultima fascia: voto più basso
  }

  function votoAlunno(classe, alunno, test, prova) {
    return calcola(test, alunno.sesso, App.Test.valore(classe, alunno.id, test.id, prova));
  }

  // Media dei voti di un alunno in una prova (solo i test con un voto)
  function media(classe, alunno, prova) {
    var voti = classe.test.map(function (t) { return votoAlunno(classe, alunno, t, prova).voto; })
      .filter(function (v) { return v !== null; });
    if (!voti.length) return null;
    return Math.round(voti.reduce(function (a, b) { return a + b; }, 0) / voti.length * 100) / 100;
  }

  App.Voti = {
    scala: scala,
    testo: testoVoto,
    haTabella: haTabella,
    controlla: controlla,
    calcola: calcola,
    votoAlunno: votoAlunno,
    media: media,
    sufficiente: function (v) { return v !== null && v >= cfg().sufficienza; }
  };
})(window.App = window.App || {});
