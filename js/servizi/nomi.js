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

  // Pulisce un nome: spazi, numero d'ordine iniziale ("1.", "12)", "3 -")
  function pulisci(s) {
    s = App.U.spazi(s);
    s = s.replace(/^\d+\s*[.)\-–:°]?\s+/, '').replace(/^[-–•*·]\s*/, '');
    s = s.replace(/^"+|"+$/g, '').trim();
    if (!s || !haLettere(s)) return null;
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

  // righe: [[cella, cella, ...], ...]. Di ogni riga usa le prime due celle con lettere
  // (di solito Cognome e Nome): le altre colonne (date, numeri, indirizzi) si ignorano.
  function daRighe(righe) {
    var out = [];
    (righe || []).forEach(function (r) {
      var celle = (Array.isArray(r) ? r : [r])
        .map(function (c) { return App.U.spazi(c); })
        .filter(function (c) { return c && haLettere(c); })
        .slice(0, 2);
      if (!celle.length) return;
      var testo = celle.join(' ');
      if (eIntestazione(testo)) return;
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
