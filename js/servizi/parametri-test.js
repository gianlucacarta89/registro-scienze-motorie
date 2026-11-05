/* parametri-test.js
 * Cosa fa: parametri modificabili dei test del libro (config.js > parametri): distanza dello sprint e
 *          della corsa, peso della palla medica, anche diversi per alunni e alunne. Cambiandoli, il test
 *          prende nome e strumento nuovi e le soglie dei voti si ricalcolano SEMPRE dalla tabella del libro
 *          originale (non da quella già cambiata) con il modello della prova:
 *            sprint: tempo × (1 + k × (d − base) / base)   lancio: distanza × (base / peso)^e
 *            corsa:  tempo × (d / base)^e  (Riegel)
 *          La soglia "di comodo" del voto più basso (999, 0, 99:59) resta com'è.
 * Dipende da: App.Config (parametri, testDerivati), App.LibroVoti, App.SchedaTest, App.Test, App.U
 * Usato da: ui/finestra-parametri.js, ui/pagina-libro.js
 *
 * Dati: test.parametro = { libro: 'Sprint 30 metri', M: 80, F: 60 }
 */
(function (App) {
  'use strict';

  function regole() { return App.Config.parametri || []; }

  // Regola del test (o null): dal parametro già scelto, dal test del libro da cui viene o dal nome
  function regola(t) {
    var nomi = [t.parametro && t.parametro.libro, t.daLibro, t.nome];
    (App.Config.testDerivati || []).forEach(function (d) { if (d.nome === t.nome) nomi.push(d.base); });
    return regole().filter(function (r) { return nomi.indexOf(r.libro) >= 0; })[0] || null;
  }

  function coefficiente(r, v) {
    v = Number(v);
    if (r.modello === 'sprint') return v >= r.base ? 1 + r.k * (v - r.base) / r.base : v / r.base;
    if (r.modello === 'lancio') return Math.pow(r.base / v, r.e);
    if (r.modello === 'corsa') return Math.pow(v / r.base, r.e);
    return 1;
  }

  function testoNum(n, dec) { return String(Number(n.toFixed(dec))).replace('.', ','); }

  // Un valore di soglia moltiplicato per c, scritto come lo scrive il test
  function scalaValore(t, s, c) {
    if (!s) return s;
    var n = App.Test.numero(t, s);
    if (n === null || isNaN(n)) return s;
    var m = n * c;
    if (t.tipo === 'tempo' && App.Test.formato(t) === 'min') {
      var sec = Math.round(m);
      return Math.floor(sec / 60) + ':' + App.U.pad2(sec % 60);
    }
    if (t.tipo === 'tempo') return m.toFixed(2).replace('.', ',');
    return /[.,]/.test(String(s)) ? testoNum(m, 1) : String(Math.round(m));
  }

  // Tabella {righe} del libro -> tabella con le soglie scalate (coefficienti per M e F)
  function scalaTabella(t, tab, c) {
    return { righe: tab.righe.map(function (r, i, tutte) {
      var comodo = i === tutte.length - 1 && i > 0;
      var x = { voto: r.voto };
      ['M', 'F'].forEach(function (sx) { x[sx] = comodo ? r[sx] : scalaValore(t, r[sx], c[sx]); });
      return x;
    }) };
  }

  function sostituisci(modello, v) { return modello.replace('{v}', String(v).replace('.', ',')); }

  // Nome del test con i valori scelti ("Sprint 60 metri", "Sprint 80/60 metri" se ♂ e ♀ diversi)
  function nome(r, val) { return sostituisci(r.titolo, val.M === val.F ? val.M : val.M + '/' + val.F); }

  function valori(t) {
    var r = regola(t);
    return t.parametro ? { M: t.parametro.M, F: t.parametro.F } : { M: r.base, F: r.base };
  }

  // Applica i valori al test t (contenitore = classe o elenco). -> { errore } | { nome }
  function applica(contenitore, t, val) {
    var r = regola(t);
    if (!r) return { errore: 'Questo test non ha parametri modificabili.' };
    var p = App.LibroVoti.trova(r.libro);
    if (!p) return { errore: 'Non trovo il test del libro "' + r.libro + '".' };
    val = { M: Number(val.M), F: Number(val.F) };
    var n = nome(r, val), k = App.U.chiaveNome(n);
    if (contenitore.test.some(function (x) { return x.id !== t.id && App.U.chiaveNome(x.nome) === k; })) {
      return { errore: 'C\'è già un test "' + n + '" qui.' };
    }
    var c = { M: coefficiente(r, val.M), F: coefficiente(r, val.F) };
    if (t.fasce || contenitore.elenco) {
      if (p.fasce) {
        t.fasce = {};
        Object.keys(p.fasce).forEach(function (f) { t.fasce[f] = scalaTabella(p, p.fasce[f], c); });
        delete t.voti;
      } else if (p.voti) t.voti = scalaTabella(p, p.voti, c);
    } else {
      var f = t.fasciaVoti || App.SchedaTest.fasciaDiClasse(contenitore) || 'b1';
      var tab = App.LibroVoti.tabella(p, f);
      if (tab) { t.voti = scalaTabella(p, tab, c); if (p.fasce) t.fasciaVoti = f; }
    }
    t.nome = n;
    if (val.M === val.F) { t.perSesso = false; t.strumento = sostituisci(r.strumento, val.M); t.strumentoM = ''; t.strumentoF = ''; }
    else { t.perSesso = true; t.strumento = ''; t.strumentoM = sostituisci(r.strumento, val.M); t.strumentoF = sostituisci(r.strumento, val.F); }
    t.parametro = { libro: r.libro, M: val.M, F: val.F };
    if (!contenitore.elenco) t.daLibro = r.libro;
    var cambiato = val.M !== r.base || val.F !== r.base;
    t.fonte = p.fonte + (cambiato ? ' – voti ricalcolati da "' + r.libro + '" (♂ ' + sostituisci(r.strumento, val.M) + ', ♀ ' + sostituisci(r.strumento, val.F) + ')' : '');
    return { nome: n };
  }

  App.ParametriTest = { regola: regola, coefficiente: coefficiente, scalaValore: scalaValore, scalaTabella: scalaTabella, nome: nome, valori: valori, applica: applica };
})(window.App = window.App || {});
