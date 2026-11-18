/* libri.js
 * Cosa fa: più libri di testo (pagina 📖 Libro). Libri "incorporati" nell'app (App.LibriIncorporati:
 *          il libro d'Istituto e quelli preparati dai PDF, solo lettura) e libri creati dal docente
 *          (dati.libri: si aggiungono, rinominano, eliminano, con i loro test). Ogni classe sceglie il suo
 *          libro (classe.libro; se manca = libro d'Istituto): da lì arrivano le tabelle proposte.
 * Dipende da: App.U, App.Stato, App.LibriIncorporati, App.TestLibro
 * Usato da: ui/pagina-libro.js, ui/finestra-test-libro.js, ui/lista-test.js, ui/pagina-classi.js,
 *           servizi/libro-voti.js, servizi/doppioni.js, dati/unisci-backup.js
 *
 * Dati: dati.libri = [{ id, nome, test: [ test come quelli di App.TestLibro (nome, tipologia, tipo,
 *        migliore, formatoTempo, unita, strumento…, scheda, fonte, fasce { b1, b2, q } oppure voti) ] }]
 */
(function (App) {
  'use strict';

  var ISTITUTO = 'istituto';
  function k(n) { return App.U.chiaveNome(n || ''); }
  function incorporati() {
    var l = (App.LibriIncorporati || []).slice();
    if (!l.some(function (x) { return x.id === ISTITUTO; })) l.unshift({ id: ISTITUTO, nome: 'Libro di testo d\'Istituto', test: App.TestLibro || [] });
    return l.map(function (x) { return { id: x.id, nome: x.nome, test: x.test, incorporato: true }; });
  }
  function miei() { var d = App.Stato.dati; d.libri = d.libri || []; return d.libri; }

  function tutti() { return incorporati().concat(miei()); }
  function trova(id) { return tutti().filter(function (l) { return l.id === id; })[0] || null; }
  function diClasse(classe) { var l = classe && classe.libro && trova(classe.libro); return l ? l.id : ISTITUTO; }

  function errNome(lista, nome, id, cosa) {
    var n = App.U.spazi(nome);
    if (!n) return 'Scrivi il nome ' + cosa + '.';
    if (n.length > 80) return 'Il nome può avere al massimo 80 caratteri.';
    if (lista.some(function (x) { return x.id !== id && k(x.nome) === k(n); })) return 'C\'è già ' + (cosa === 'del libro' ? 'un libro' : 'un test') + ' "' + n + '".';
    return null;
  }

  App.Libri = {
    ISTITUTO: ISTITUTO,
    tutti: tutti,
    miei: miei,
    trova: trova,
    diClasse: diClasse,
    // Test del libro della classe (o del libro id)
    testDi: function (classeOId) {
      var id = typeof classeOId === 'string' ? classeOId : diClasse(classeOId), l = trova(id);
      return l ? l.test : (App.TestLibro || []);
    },
    // Tutti i test di tutti i libri (per i doppioni e le ricerche)
    tuttiITest: function () { var o = []; tutti().forEach(function (l) { o = o.concat(l.test); }); return o; },
    libroDelTest: function (t) { return tutti().filter(function (l) { return l.test.indexOf(t) >= 0; })[0] || null; },

    imposta: function (classe, id) { if (id === ISTITUTO || !trova(id)) delete classe.libro; else classe.libro = id; },

    // -> { errore } | { libro }
    nuovo: function (nome) {
      var e = errNome(tutti(), nome, null, 'del libro');
      if (e) return { errore: e };
      var l = { id: 'L' + App.U.nuovoId(), nome: App.U.spazi(nome), test: [] };
      miei().push(l);
      return { libro: l };
    },
    rinomina: function (id, nome) {
      var l = miei().filter(function (x) { return x.id === id; })[0];
      if (!l) return { errore: 'Questo libro non si può rinominare.' };
      var e = errNome(tutti(), nome, id, 'del libro');
      if (e) return { errore: e };
      l.nome = App.U.spazi(nome);
      return { libro: l };
    },
    // Elimina un libro del docente; le classi che lo usavano tornano al libro d'Istituto
    elimina: function (id) {
      var d = App.Stato.dati;
      d.libri = miei().filter(function (x) { return x.id !== id; });
      d.classi.forEach(function (c) { if (c.libro === id) delete c.libro; });
    },
    classiCon: function (id) { return App.Stato.dati.classi.filter(function (c) { return diClasse(c) === id; }); },

    // Test di un libro del docente: aggiunge o sostituisce (vecchio = il test da cambiare). -> { errore } | { test }
    salvaTest: function (libro, t, vecchio) {
      var e = errNome(libro.test.filter(function (x) { return x !== vecchio; }), t.nome, null, 'del test');
      if (e) return { errore: e };
      t.nome = App.U.spazi(t.nome);
      t.fonte = t.fonte || libro.nome;
      var i = vecchio ? libro.test.indexOf(vecchio) : -1;
      if (i >= 0) libro.test[i] = t; else libro.test.push(t);
      libro.test.sort(function (a, b) { return a.nome.localeCompare(b.nome); });
      return { test: t };
    },
    eliminaTest: function (libro, t) { libro.test = libro.test.filter(function (x) { return x !== t; }); }
  };
})(window.App = window.App || {});
