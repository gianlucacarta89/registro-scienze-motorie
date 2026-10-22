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

  // ---------- Celle con posizione ----------
  // Ogni cella diventa { t, x, x1 }: per Excel, Word e testo x è il numero di colonna,
  // per il PDF è la posizione sulla pagina. Così le colonne si riconoscono allo stesso modo.
  function celleDi(r) {
    return (Array.isArray(r) ? r : [r]).map(function (c, i) {
      if (c && typeof c === 'object') return { t: App.U.spazi(c.t), x: c.x, x1: c.x1 };
      return { t: App.U.spazi(c), x: i, x1: i + 0.9 };
    });
  }

  // Una cella con cifre ("Marco 01/01/2012", "2 Rossi") si spezza: le parole con cifre separano i pezzi
  function pezzi(testo) {
    var out = [], pezzo = [];
    String(testo || '').split(' ').forEach(function (p) {
      if (/\d/.test(p)) { if (pezzo.length) out.push(pezzo.join(' ')); pezzo = []; }
      else if (p) pezzo.push(p);
    });
    if (pezzo.length) out.push(pezzo.join(' '));
    // pezzi di una sola lettera (es. sesso M/F) o di sola punteggiatura non sono nomi
    return out.filter(function (c) { return c.replace(/[^A-Za-zÀ-ɏ]/g, '').length >= 2; });
  }

  // ---------- Intestazione ----------
  var COL_COGNOME = /^(n[.°]?\s+)?(cognome|cognomi)$/;
  var COL_NOME = /^(nome|nomi)$/;
  var COL_INTERA = /^(n[.°]?\s+)?(cognome\s*(e|ed|\/|-|&)?\s*nome|nome\s*(e|ed|\/|-|&)?\s*cognome|nominativo|nominativi|alunn[oaie]|studente|studentessa|studenti)$/;

  // Se la riga è un'intestazione con le colonne dei nomi, restituisce quelle colonne; altrimenti null
  function colonneNomi(celle) {
    var cols = celle.filter(function (c) {
      var t = c.t.toLowerCase().replace(/[:.]$/, '');
      return COL_COGNOME.test(t) || COL_NOME.test(t) || COL_INTERA.test(t);
    });
    var forte = cols.some(function (c) { var t = c.t.toLowerCase(); return !COL_NOME.test(t.replace(/[:.]$/, '')); });
    return forte ? { nomi: cols, tutte: celle } : null;
  }

  function sovrapposizione(a, b) { return Math.min(a.x1, b.x1) - Math.max(a.x, b.x); }

  // Colonna dell'intestazione a cui appartiene una cella: quella che le sta più "sopra"
  function colonnaDi(cella, intest) {
    var migliore = null, valore = 0;
    intest.tutte.forEach(function (h) {
      var o = sovrapposizione(cella, h);
      if (o > valore) { valore = o; migliore = h; }
    });
    return migliore;
  }

  // ---------- Lettura ----------
  // Con intestazione: solo le righe sotto l'intestazione e solo le colonne Cognome / Nome
  // (o "Cognome e nome", "Alunno", "Nominativo"). Senza intestazione: un nome per riga,
  // prese le prime due celle con lettere (di solito Cognome e Nome).
  function daRighe(righe) {
    var out = [], intest = null;
    righe = righe || [];
    // se nel file c'è un'intestazione, tutto quello che sta sopra (titoli, scuola, classe...) si salta
    var primaIntest = righe.findIndex(function (r) { return colonneNomi(celleDi(r).filter(function (c) { return c.t; })); });
    righe.forEach(function (r, ir) {
      if (ir < primaIntest) return;
      var celle = celleDi(r).filter(function (c) { return c.t; });
      if (!celle.length) return;
      var h = colonneNomi(celle);
      if (h) { intest = h; intest.tabella = !r.paragrafo; return; }
      var testo;
      if (intest) {
        if (r.paragrafo && intest.tabella) return;     // testo fuori dalla tabella dell'intestazione
        testo = celle.filter(function (c) { return intest.nomi.indexOf(colonnaDi(c, intest)) >= 0; })
          .map(function (c) { return pezzi(c.t).join(' '); }).filter(Boolean).join(' ');
        if (!testo) return;
      } else {
        var lista = [];
        celle.forEach(function (c) { lista = lista.concat(pezzi(c.t)); });
        if (!lista.length) return;
        testo = lista.slice(0, 2).join(' ');
      }
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
