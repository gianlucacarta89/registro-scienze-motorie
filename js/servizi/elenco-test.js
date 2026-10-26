/* elenco-test.js
 * Cosa fa: elenco dei test del docente (archivio permanente, fuori dalle classi): ogni test si
 *          crea una volta con nome, tipologia, strumento e tabella dei voti, poi si aggiunge alle
 *          classi. L'elenco non ha risultati. Si può anche riempire con i test di una classe.
 *          Un test creato in una classe entra da solo nell'elenco (registra) e la sua copia
 *          nell'elenco resta allineata (aggiorna) finché non la si modifica nell'elenco stesso.
 * Dipende da: App.Stato, App.Test (copia)
 * Usato da: ui/finestra-elenco-test.js, ui/finestra-test.js
 *
 * Dati: App.Stato.dati.archivio.test = [ test come in classe.test, + origine: { c: classeId, t: testId } ]
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

    // Aggiunge test dell'elenco a una classe (senza doppioni). -> { copiati, saltati }
    aggiungiAClasse: function (ids, classe) {
      return App.Test.copia(this.contenitore(), ids, classe);
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
