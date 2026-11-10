/* unisci-backup.js
 * Cosa fa: "➕ Unisci" un file di backup ai dati di questo dispositivo SENZA cancellare né cambiare
 *          nulla: aggiunge solo ciò che manca. Serve per recuperare dati persi e per mettere insieme
 *          il lavoro fatto su dispositivi diversi.
 *            - classi: stessa classe = stesso id o stesso nome; se manca si aggiunge intera
 *            - alunni: stesso id o stesso nome; se manca si aggiunge
 *            - test della classe e test dell'elenco 📚: stesso id o stesso nome; se manca si aggiunge
 *            - risultati: si scrivono solo nelle caselle vuote (se qui c'è già un valore resta questo)
 *            - giustificazioni: si aggiungono quelle che mancano (stesso id o stesso giorno = già presente)
 *            - ⛹️ attività: si aggiungono quelle che mancano (stesso id o stessa data e titolo); voti
 *              degli alunni solo dove qui non ci sono
 *          Le preferenze e la data dell'ultimo backup non cambiano.
 * Dipende da: App.Stato (dati, normalizza), App.U (copia, chiaveNome, nuovoId), App.Classi, App.Test
 * Usato da: ui/pagina-backup.js
 */
(function (App) {
  'use strict';

  function k(n) { return App.U.chiaveNome(n || ''); }

  // Elemento di lista con lo stesso id, oppure con lo stesso nome
  function trova(lista, x) {
    return lista.filter(function (y) { return y.id === x.id; })[0] ||
      lista.filter(function (y) { return k(y.nome) === k(x.nome); })[0] || null;
  }

  // Aggiunge x (copia) a lista; se l'id è già usato ne prende uno nuovo. -> l'elemento aggiunto
  function aggiungi(lista, x) {
    var c = App.U.copia(x);
    if (lista.some(function (y) { return y.id === c.id; })) c.id = App.U.nuovoId();
    lista.push(c);
    return c;
  }

  function contaGiust(c) {
    var n = 0;
    Object.keys(c.giust || {}).forEach(function (a) { n += (c.giust[a] || []).length; });
    return n;
  }

  function unisciClasse(qui, la, r) {
    if (!qui.fascia && la.fascia) qui.fascia = la.fascia;
    var alunni = {}, test = {};            // id nel backup -> id qui
    la.alunni.forEach(function (a) {
      var x = trova(qui.alunni, a);
      if (!x) { x = aggiungi(qui.alunni, a); r.alunni++; }
      else {
        if (!x.sesso && a.sesso) x.sesso = a.sesso;
        if (!x.partecipa && a.partecipa) x.partecipa = App.U.copia(a.partecipa);   // 🏐 🏅
      }
      alunni[a.id] = x.id;
    });
    la.test.forEach(function (t) {
      var x = trova(qui.test, t);
      if (!x) { x = aggiungi(qui.test, t); r.test++; }
      test[t.id] = x.id;
    });
    // risultati: solo nelle caselle vuote
    Object.keys(la.risultati).forEach(function (a) {
      var aq = alunni[a];
      if (!aq) return;
      Object.keys(la.risultati[a] || {}).forEach(function (t) {
        var tq = test[t], prove = la.risultati[a][t] || {};
        if (!tq) return;
        Object.keys(prove).forEach(function (p) {
          var v = prove[p];
          if (v === '' || v === null || v === undefined) return;
          qui.risultati[aq] = qui.risultati[aq] || {};
          qui.risultati[aq][tq] = qui.risultati[aq][tq] || {};
          var ora = qui.risultati[aq][tq][p];
          if (ora === '' || ora === null || ora === undefined) { qui.risultati[aq][tq][p] = v; r.risultati++; }
          else if (String(ora) !== String(v)) r.diversi++;
        });
      });
    });
    // giustificazioni: si aggiungono quelle mancanti
    Object.keys(la.giust).forEach(function (a) {
      var aq = alunni[a];
      if (!aq) return;
      (la.giust[a] || []).forEach(function (g) {
        var mie = qui.giust[aq] || [];
        if (mie.some(function (x) { return x.id === g.id || x.data === g.data; })) return;
        var c = App.U.copia(g);
        if (!c.id) c.id = App.U.nuovoId();
        qui.giust[aq] = mie.concat([c]);
        r.giust++;
      });
    });
    // ⛹️ attività: stessa attività = stesso id o stessa data e titolo; voti solo dove mancano
    qui.attivita = qui.attivita || [];
    (la.attivita || []).forEach(function (x) {
      var y = qui.attivita.filter(function (z) { return z.id === x.id || (z.data === x.data && k(z.titolo) === k(x.titolo)); })[0];
      if (!y) { y = App.U.copia(x); y.voti = {}; if (qui.attivita.some(function (z) { return z.id === y.id; })) y.id = App.U.nuovoId(); qui.attivita.push(y); r.attivita++; }
      Object.keys(x.voti || {}).forEach(function (a) {
        var aq = alunni[a];
        if (!aq) return;
        if (!y.voti[aq]) { y.voti[aq] = App.U.copia(x.voti[a]); r.votiAttivita++; }
      });
    });
    Object.keys(qui.giust).forEach(function (a) {
      qui.giust[a].sort(function (x, y) { return x.data < y.data ? -1 : x.data > y.data ? 1 : 0; });
    });
  }

  App.UnisciBackup = {
    // Unisce i dati del backup b ai dati attuali. -> { classi, alunni, test, testElenco, risultati, giust, diversi, niente }
    unisci: function (b) {
      var d = App.Stato.dati, la = App.Stato.normalizza(App.U.copia(b.dati));
      var r = { classi: 0, alunni: 0, test: 0, testElenco: 0, risultati: 0, giust: 0, diversi: 0, attivita: 0, votiAttivita: 0 };
      la.classi.forEach(function (c) {
        var x = trova(d.classi, c);
        if (!x) {
          x = aggiungi(d.classi, c);
          r.classi++; r.alunni += x.alunni.length; r.test += x.test.length; r.giust += contaGiust(x); r.attivita += (x.attivita || []).length;
          Object.keys(x.risultati).forEach(function (a) { Object.keys(x.risultati[a] || {}).forEach(function (t) { r.risultati += Object.keys(x.risultati[a][t] || {}).length; }); });
          return;
        }
        unisciClasse(x, c, r);
      });
      la.archivio.test.forEach(function (t) { if (!trova(d.archivio.test, t)) { aggiungi(d.archivio.test, t); r.testElenco++; } });
      r.niente = !(r.classi || r.alunni || r.test || r.testElenco || r.risultati || r.giust || r.attivita || r.votiAttivita);
      if (!r.niente) {
        App.Classi.ordinaClassi();
        d.classi.forEach(function (c) { App.Classi.ordina(c); });
        App.Test.ordinaTutti();
        App.Test.riscriviTutti();
      }
      return r;
    }
  };
})(window.App = window.App || {});
