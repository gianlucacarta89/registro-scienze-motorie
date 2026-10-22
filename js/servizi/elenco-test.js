/* elenco-test.js
 * Cosa fa: elenco dei test del docente (archivio permanente, fuori dalle classi): ogni test si
 *          crea una volta con nome, tipologia, strumento e tabella dei voti, poi si aggiunge alle
 *          classi. L'elenco non ha risultati. Si può anche riempire con i test di una classe.
 * Dipende da: App.Stato, App.Test (copia)
 * Usato da: ui/finestra-elenco-test.js, ui/finestra-test.js
 *
 * Dati: App.Stato.dati.archivio.test = [ test come in classe.test ]
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

    // Mette nell'elenco test di una classe (senza risultati). -> { copiati, saltati }
    prendiDaClasse: function (classe, ids) {
      return App.Test.copia(classe, ids || classe.test.map(function (t) { return t.id; }), this.contenitore());
    }
  };
})(window.App = window.App || {});
