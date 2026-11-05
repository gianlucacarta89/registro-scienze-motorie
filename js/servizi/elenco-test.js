/* elenco-test.js
 * Cosa fa: elenco dei test del docente (archivio permanente, fuori dalle classi): ogni test si
 *          crea una volta con nome, tipologia, strumento e tabella dei voti, poi si aggiunge alle
 *          classi. L'elenco non ha risultati. Si può anche riempire con i test di una classe.
 *          Un test creato in una classe entra da solo nell'elenco (registra) e la sua copia
 *          nell'elenco resta allineata (aggiorna) finché non la si modifica nell'elenco stesso.
 * Dipende da: App.Stato, App.Test (copia), App.SchedaTest (fasce)
 * Usato da: ui/finestra-elenco-test.js, ui/finestra-test.js
 *
 * Dati: App.Stato.dati.archivio.test = [ test come in classe.test, + origine: { c: classeId, t: testId },
 *         + inUso: false se il docente non lo usa (manca = lo usa), + libro: true se viene da App.TestLibro ]
 *       origine = il test della classe da cui è nato; si toglie quando il test si modifica nell'elenco.
 */
(function (App) {
  'use strict';

  App.ElencoTest = {
    // "Contenitore" con la stessa forma di una classe: così le funzioni dei test valgono anche qui
    contenitore: function () {
      return { id: 'elenco', nome: 'Elenco test', test: App.Stato.dati.archivio.test, risultati: {}, alunni: [], giust: {}, elenco: true };
    },

    tutti: function () { return App.Stato.dati.archivio.test; },

    inUso: function (t) { return t.inUso !== false; },
    inUsoTutti: function () { var self = this; return this.tutti().filter(function (t) { return self.inUso(t); }); },

    // Spunta "lo uso" di un test dell'elenco
    impostaUso: function (id, si) {
      this.tutti().forEach(function (t) { if (t.id === id) { if (si) delete t.inUso; else t.inUso = false; } });
    },

    // Test del libro con lo stesso nome di uno già nell'elenco (o null)
    nellElenco: function (nome) {
      var k = App.U.chiaveNome(nome);
      return this.tutti().filter(function (x) { return App.U.chiaveNome(x.nome) === k; })[0] || null;
    },

    // Mette nell'elenco un test del libro (lo usa): -> il test dell'elenco
    usaDalLibro: function (p) {
      var c = this.nellElenco(p.nome);
      if (c) { delete c.inUso; return c; }
      c = App.U.copia(p);
      c.id = App.U.nuovoId();
      c.libro = true;
      this.tutti().push(c);
      App.Test.ordina(this.contenitore());
      return c;
    },

    // Aggiunge test dell'elenco a una classe (senza doppioni). I test con le tabelle per fascia
    // ricevono quella della fascia scelta (di solito dal nome della classe). -> { copiati, saltati }
    aggiungiAClasse: function (ids, classe, fascia) {
      var r = App.Test.copia(this.contenitore(), ids, classe);
      classe.test.forEach(function (t) { App.SchedaTest.applicaFascia(t, fascia); delete t.inUso; delete t.libro; });
      return r;
    },

    // Mette nell'elenco test già pronti (es. quelli del libro). Con "sostituisci" un test con lo
    // stesso nome viene aggiornato, altrimenti si salta. -> { aggiunti, aggiornati, saltati }
    aggiungiPronti: function (lista, sostituisci) {
      var elenco = this.tutti(), out = { aggiunti: 0, aggiornati: 0, saltati: [] };
      lista.forEach(function (p) {
        var k = App.U.chiaveNome(p.nome);
        var c = App.U.copia(p);
        var i = elenco.findIndex(function (x) { return App.U.chiaveNome(x.nome) === k; });
        if (i >= 0 && !sostituisci) { out.saltati.push(p.nome); return; }
        c.id = i >= 0 ? elenco[i].id : App.U.nuovoId();
        if (i >= 0) { elenco[i] = c; out.aggiornati++; } else { elenco.push(c); out.aggiunti++; }
      });
      App.Test.ordina(this.contenitore());
      return out;
    },

    // Test appena creato in una classe: lo mette nell'elenco, collegato al test d'origine.
    // -> 'aggiunto' | 'presente' (nell'elenco c'è già un test con lo stesso nome)
    registra: function (classe, t) {
      var k = App.U.chiaveNome(t.nome), elenco = this.tutti();
      if (elenco.some(function (x) { return App.U.chiaveNome(x.nome) === k; })) return 'presente';
      var copia = App.U.copia(t);
      copia.id = App.U.nuovoId();
      copia.origine = { c: classe.id, t: t.id };
      elenco.push(copia);
      App.Test.ordina(this.contenitore());
      return 'aggiunto';
    },

    // Il test d'origine è stato modificato nella classe: aggiorna la sua copia nell'elenco
    aggiorna: function (classe, t) {
      var elenco = this.tutti();
      var x = elenco.filter(function (e) { return e.origine && e.origine.c === classe.id && e.origine.t === t.id; })[0];
      if (!x) return false;
      var nomeLibero = !elenco.some(function (e) { return e !== x && App.U.chiaveNome(e.nome) === App.U.chiaveNome(t.nome); });
      var copia = App.U.copia(t);
      Object.keys(copia).forEach(function (k) {
        if (k === 'id' || (k === 'nome' && !nomeLibero)) return;
        x[k] = copia[k];
      });
      App.Test.ordina(this.contenitore());
      return true;
    },

    // Il test è stato modificato direttamente nell'elenco: da ora è indipendente dalla classe
    stacca: function (t) { delete t.origine; },

    // Mette nell'elenco test di una classe (senza risultati). -> { copiati, saltati }
    prendiDaClasse: function (classe, ids) {
      return App.Test.copia(classe, ids || classe.test.map(function (t) { return t.id; }), this.contenitore());
    }
  };
})(window.App = window.App || {});
