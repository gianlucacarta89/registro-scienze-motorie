/* classi.js
 * Cosa fa: classi e alunni: creazione, nomi, ordine alfabetico, nomi doppi, cancellazione.
 *          Le funzioni restituiscono un messaggio d'errore (stringa) oppure null se va bene.
 * Dipende da: App.Stato, App.Config (limiti), App.U
 * Usato da: ui/finestra-classi.js, ui/finestra-alunni.js, ui/finestra-importa.js, ui/barra.js
 */
(function (App) {
  'use strict';

  function dati() { return App.Stato.dati; }
  function lim() { return App.Config.limiti; }

  App.Classi = {
    tutte: function () { return dati().classi; },

    trova: function (id) {
      return dati().classi.filter(function (c) { return c.id === id; })[0] || null;
    },

    erroreNomeClasse: function (nome, escludiId) {
      nome = App.U.spazi(nome);
      if (!nome) return 'Scrivi il nome della classe (es. 2B).';
      if (nome.length > lim().nomeClasse) return 'Il nome della classe può avere al massimo ' + lim().nomeClasse + ' caratteri.';
      var k = App.U.chiaveNome(nome);
      var doppia = dati().classi.some(function (c) { return c.id !== escludiId && App.U.chiaveNome(c.nome) === k; });
      if (doppia) return 'Esiste già una classe "' + nome + '".';
      return null;
    },

    crea: function (nome) {
      var err = this.erroreNomeClasse(nome);
      if (err) return { errore: err };
      var c = { id: App.U.nuovoId(), nome: App.U.spazi(nome), alunni: [], test: [], risultati: {}, giust: {} };
      dati().classi.push(c);
      this.ordinaClassi();
      dati().preferenze.classeAttiva = c.id;
      return { classe: c };
    },

    rinomina: function (id, nome) {
      var err = this.erroreNomeClasse(nome, id);
      if (err) return err;
      this.trova(id).nome = App.U.spazi(nome);
      this.ordinaClassi();
      return null;
    },

    elimina: function (id) {
      dati().classi = dati().classi.filter(function (c) { return c.id !== id; });
      if (dati().preferenze.classeAttiva === id) dati().preferenze.classeAttiva = null;
    },

    ordinaClassi: function () {
      dati().classi.sort(function (a, b) { return App.U.confronta(a.nome, b.nome); });
    },

    // --- Alunni ---------------------------------------------------------
    ordina: function (classe) {
      classe.alunni.sort(function (a, b) { return App.U.confronta(a.nome, b.nome); });
    },

    esisteAlunno: function (classe, nome, escludiId) {
      var k = App.U.chiaveNome(nome);
      return classe.alunni.some(function (a) { return a.id !== escludiId && App.U.chiaveNome(a.nome) === k; });
    },

    erroreNomeAlunno: function (classe, nome, escludiId) {
      nome = App.U.spazi(nome);
      if (!nome) return 'Scrivi cognome e nome dell\'alunno.';
      if (!/[A-Za-zÀ-ɏ]/.test(nome)) return 'Il nome deve contenere delle lettere.';
      if (nome.length > lim().nomeAlunno) return 'Il nome può avere al massimo ' + lim().nomeAlunno + ' caratteri.';
      if (this.esisteAlunno(classe, nome, escludiId)) return '"' + nome + '" è già in questa classe.';
      return null;
    },

    // Aggiunge una lista di nomi; salta quelli già presenti. -> { aggiunti, doppi: [] }
    aggiungiAlunni: function (classe, nomi) {
      var self = this, aggiunti = 0, doppi = [];
      nomi.forEach(function (n) {
        n = App.U.spazi(n);
        if (!n) return;
        if (self.erroreNomeAlunno(classe, n)) { doppi.push(n); return; }
        classe.alunni.push({ id: App.U.nuovoId(), nome: n });
        aggiunti++;
      });
      this.ordina(classe);
      return { aggiunti: aggiunti, doppi: doppi };
    },

    rinominaAlunno: function (classe, id, nome) {
      var err = this.erroreNomeAlunno(classe, nome, id);
      if (err) return err;
      classe.alunni.forEach(function (a) { if (a.id === id) a.nome = App.U.spazi(nome); });
      this.ordina(classe);
      return null;
    },

    // Cancella l'alunno con i suoi risultati e le sue giustificazioni
    eliminaAlunno: function (classe, id) {
      classe.alunni = classe.alunni.filter(function (a) { return a.id !== id; });
      delete classe.risultati[id];
      delete classe.giust[id];
    },

    // Quanti dati ha un alunno (per avvisare prima di cancellarlo)
    datiAlunno: function (classe, id) {
      var r = classe.risultati[id] || {}, n = 0;
      Object.keys(r).forEach(function (t) { n += Object.keys(r[t] || {}).length; });
      return { risultati: n, giust: (classe.giust[id] || []).length };
    }
  };
})(window.App = window.App || {});
