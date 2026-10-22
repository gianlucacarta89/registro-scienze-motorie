/* nomi.js
 * Cosa fa: ricava i nomi degli alunni dalle righe lette da un file o da un testo incollato.
 *          Toglie numeri d'ordine, righe vuote, intestazioni e nomi doppi.
 * Dipende da: App.Config (limiti, paroleIntestazione), App.U
 * Usato da: ui/finestra-importa.js
 */
(function (App) {
  'use strict';

  var LETTERA = /[A-Za-zÀ-ɏ]/;

  function haLettere(s) { return LETTERA.test(s); }

  // "ROSSI" -> "Rossi", "D'AMICO" -> "D'Amico"; le parole già scritte con le minuscole restano uguali
  function maiuscole(s) {
    return s.split(' ').map(function (p) {
      if (p.length < 2 || p !== p.toUpperCase() || p === p.toLowerCase()) return p;
      return p.toLowerCase().replace(/(^|['’\-])([a-z\u00e0-\u024f])/g, function (m, a, b) { return a + b.toUpperCase(); });
    }).join(' ');
  }

  // Pulisce un nome: spazi, numero d'ordine iniziale ("1.", "12)", "3 -")
  function pulisci(s) {
    s = App.U.spazi(s);
    s = s.replace(/^\d+\s*[.)\-–:°]?\s+/, '').replace(/^[-–•*·]\s*/, '');
    s = s.replace(/^"+|"+$/g, '').trim();
    if (!s || !haLettere(s) || /\d/.test(s)) return null;     // un nome non contiene cifre
    s = maiuscole(s);
    var max = App.Config.limiti.nomeAlunno;
    if (s.length > max) s = s.slice(0, max).trim();
    return s;
  }

  function eIntestazione(testo) {
    var primo = App.U.spazi(testo).toLowerCase().split(' ')[0].replace(/[:;,]$/, '');
    return App.Config.paroleIntestazione.indexOf(primo) >= 0;
  }

  function unici(lista) {
    var visti = {}, out = [];
    lista.forEach(function (n) {
      var k = App.U.chiaveNome(n);
      if (!visti[k]) { visti[k] = true; out.push(n); }
    });
    return out;
  }

  // righe: [[cella, cella, ...], ...]. Di ogni riga usa le prime due celle con lettere e senza
  // cifre (di solito Cognome e Nome): le altre colonne (numeri, date, classi) si ignorano.
  function daRighe(righe) {
    var out = [], quante = 2;
    (righe || []).forEach(function (r) {
      // Una cella con cifre ("Marco 01/01/2012", "2 Rossi") si spezza: le parole con cifre separano le celle
      var celle = [];
      (Array.isArray(r) ? r : [r]).forEach(function (c) {
        var pezzo = [];
        App.U.spazi(c).split(' ').forEach(function (p) {
          if (/\d/.test(p)) { if (pezzo.length) celle.push(pezzo.join(' ')); pezzo = []; }
          else if (p) pezzo.push(p);
        });
        if (pezzo.length) celle.push(pezzo.join(' '));
      });
      // celle di una sola lettera (es. sesso M/F) non sono nomi
      celle = celle.filter(function (c) { return c.replace(/[^A-Za-z\u00C0-\u024F]/g, '').length >= 2; });
      if (!celle.length) return;
      if (eIntestazione(celle.join(' '))) {
        // intestazione: "Cognome e nome" / "Nominativo" / "Alunno" in una colonna sola -> si prende una cella
        // (i titoli come "Elenco alunni classe 2B" non cambiano nulla)
        var prima = celle[0].toLowerCase().replace(/^n[.°]?\s+/, '');
        if (prima.length <= 30 && /^(cognome|nominativo|alunn|studen)/.test(prima)) {
          // una colonna sola solo se è detto chiaramente ("Cognome e nome", "Nominativo", "Alunno")
          quante = /^(cognome\s*(e|ed|\/|-|&)\s*nome|nominativo|alunn|studen)/.test(prima) ? 1 : 2;
        }
        return;
      }
      var testo = celle.slice(0, quante).join(' ');
      var n = pulisci(testo);
      if (n) out.push(n);
    });
    return unici(out);
  }

  // Testo incollato o file .csv/.txt: una riga per alunno; ; tab | e virgola separano le colonne
  function righeDaTesto(testo) {
    return String(testo || '').split(/\r?\n/).map(function (l) { return l.split(/[;\t|,]/); });
  }

  App.Nomi = {
    pulisci: pulisci,
    daRighe: daRighe,
    righeDaTesto: righeDaTesto,
    daTesto: function (t) { return daRighe(righeDaTesto(t)); },
    unici: unici
  };
})(window.App = window.App || {});
