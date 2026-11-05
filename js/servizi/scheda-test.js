/* scheda-test.js
 * Cosa fa: scheda descrittiva di un test (a che cosa serve, materiale, come si fa, come si misura,
 *          differenze tra alunni e alunne: campi in config.js > schedaTest) e tabelle dei voti
 *          per fascia d'età (1° biennio, 2° biennio, quinto anno: config.js > fasce).
 *          Un test dell'elenco 📚 può avere "fasce": quando si aggiunge a una classe riceve la
 *          tabella della fascia della classe (dal numero nel nome: 1G -> 1° biennio).
 * Dipende da: App.Config (schedaTest, fasce, limiti), App.U
 * Usato da: servizi/test.js, servizi/elenco-test.js, ui/finestra-test.js, ui/finestra-elenco-test.js,
 *           ui/lista-test.js, stampa/pdf-dati.js
 *
 * Dati: test.descrizione, .materiale, .esecuzione, .misura, .differenze, .fonte (testi)
 *       test.fasce = { b1: { righe }, b2: { righe }, q: { righe } }   (solo nell'elenco)
 *       test.fasciaVoti = 'b1' | 'b2' | 'q'   (in classe: da quale fascia viene la tabella)
 *       test.negativi = true   (il risultato può essere negativo, es. flessibilità -4 cm)
 */
(function (App) {
  'use strict';

  function campi() { return App.Config.schedaTest; }

  App.SchedaTest = {
    campi: campi,

    // Copia i campi della scheda dal modulo nel test
    imposta: function (t, d) {
      campi().forEach(function (c) {
        if (d[c.id] === undefined) return;
        var v = String(d[c.id] || '').trim();
        if (v) t[c.id] = v; else delete t[c.id];
      });
    },

    errore: function (d) {
      var max = App.Config.limiti.schedaTest;
      var troppo = campi().filter(function (c) { return String(d[c.id] || '').trim().length > max; })[0];
      return troppo ? '"' + troppo.nome + '" può avere al massimo ' + max + ' caratteri.' : null;
    },

    haScheda: function (t) { return campi().some(function (c) { return !!t[c.id]; }); },

    fascia: function (id) { return App.Config.fasce.filter(function (f) { return f.id === id; })[0] || null; },

    // Fascia della classe dal primo numero nel nome ("1G" -> b1, "3A" -> b2, "5N" -> q). null se non c'è
    fasciaDiClasse: function (classe) {
      var m = String(classe && classe.nome || '').match(/[1-5]/);
      if (!m) return null;
      var anno = Number(m[0]);
      var f = App.Config.fasce.filter(function (x) { return x.anni.indexOf(anno) >= 0; })[0];
      return f ? f.id : null;
    },

    haFasce: function (t) { return !!(t.fasce && Object.keys(t.fasce).length); },

    // Test copiato in una classe: tiene solo la tabella della fascia scelta (senza fascia: nessuna tabella)
    applicaFascia: function (t, fasciaId) {
      if (!this.haFasce(t)) return;
      var tab = fasciaId && t.fasce[fasciaId];
      if (tab) { t.voti = App.U.copia(tab); t.fasciaVoti = fasciaId; }
      delete t.fasce;
    }
  };
})(window.App = window.App || {});
