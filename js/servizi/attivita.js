/* attivita.js
 * Cosa fa: attività valutate di una classe (pagina 📝 Attività): data, titolo, descrizione e note;
 *          per ogni alunno un voto (intero o con mezzo punto, config.js > attivita) e una nota.
 *          Controlli, ordine per data (più recenti prima), media e numero di alunni valutati.
 * Dipende da: App.U, App.Config (attivita, limiti)
 * Usato da: ui/pagina-attivita.js, ui/finestra-attivita.js, ui/pagina-home.js, servizi/classi.js,
 *           dati/unisci-backup.js
 *
 * Dati: classe.attivita = [{ id, data: 'AAAA-MM-GG', titolo, descrizione, note,
 *                             voti: { alunnoId: { voto: 7.5, nota: '' } } }]
 */
(function (App) {
  'use strict';

  function cfg() { return App.Config.attivita; }
  function lista(classe) { classe.attivita = classe.attivita || []; return classe.attivita; }

  // Voti possibili, dal più alto: 10, 9,5, 9 … (config.js > attivita)
  function votiPossibili() {
    var l = [];
    for (var v = cfg().votoMax; v >= cfg().votoMin - 1e-9; v -= cfg().passo) l.push(Math.round(v * 100) / 100);
    return l;
  }

  // Controllo prima di salvare. -> messaggio d'errore oppure null
  function errore(classe, x, escludiId) {
    if (!x.data || !/^\d{4}-\d{2}-\d{2}$/.test(x.data)) return 'Scegli la data dell\'attività.';
    var t = App.U.spazi(x.titolo);
    if (!t) return 'Scrivi il titolo dell\'attività (es. "Circuito di destrezza").';
    if (t.length > cfg().titolo) return 'Il titolo può avere al massimo ' + cfg().titolo + ' caratteri.';
    if (App.U.spazi(x.descrizione).length > cfg().descrizione) return 'La descrizione può avere al massimo ' + cfg().descrizione + ' caratteri.';
    if (App.U.spazi(x.note).length > cfg().descrizione) return 'Le note possono avere al massimo ' + cfg().descrizione + ' caratteri.';
    var possibili = votiPossibili(), voti = x.voti || {};
    var sbagliato = Object.keys(voti).filter(function (a) { return voti[a].voto !== null && possibili.indexOf(voti[a].voto) < 0; })[0];
    if (sbagliato) return 'Un voto non è valido: usa i voti del menu.';
    var lunga = Object.keys(voti).filter(function (a) { return App.U.spazi(voti[a].nota).length > App.Config.limiti.nota; })[0];
    if (lunga) return 'Le note degli alunni possono avere al massimo ' + App.Config.limiti.nota + ' caratteri.';
    var doppia = lista(classe).some(function (y) { return y.id !== escludiId && y.data === x.data && App.U.chiaveNome(y.titolo) === App.U.chiaveNome(t); });
    if (doppia) return 'C\'è già l\'attività "' + t + '" il ' + App.U.dataIT(x.data) + '.';
    return null;
  }

  // Voti puliti: solo gli alunni con un voto o una nota
  function pulisci(voti) {
    var out = {};
    Object.keys(voti || {}).forEach(function (a) {
      var v = voti[a], nota = App.U.spazi(v.nota);
      if (v.voto !== null && v.voto !== undefined || nota) out[a] = { voto: v.voto === undefined ? null : v.voto, nota: nota };
    });
    return out;
  }

  App.Attivita = {
    votiPossibili: votiPossibili,
    errore: errore,

    tutte: function (classe) {
      return lista(classe).slice().sort(function (a, b) { return a.data < b.data ? 1 : a.data > b.data ? -1 : 0; });
    },

    // Nuova attività (x = { data, titolo, descrizione, note, voti }). -> { errore } | { attivita }
    aggiungi: function (classe, x) {
      var e = errore(classe, x);
      if (e) return { errore: e };
      var att = { id: App.U.nuovoId(), data: x.data, titolo: App.U.spazi(x.titolo), descrizione: App.U.spazi(x.descrizione),
        note: App.U.spazi(x.note), voti: pulisci(x.voti) };
      lista(classe).push(att);
      return { attivita: att };
    },

    modifica: function (classe, id, x) {
      var e = errore(classe, x, id);
      if (e) return { errore: e };
      var att = lista(classe).filter(function (y) { return y.id === id; })[0];
      att.data = x.data; att.titolo = App.U.spazi(x.titolo); att.descrizione = App.U.spazi(x.descrizione);
      att.note = App.U.spazi(x.note); att.voti = pulisci(x.voti);
      return { attivita: att };
    },

    elimina: function (classe, id) { classe.attivita = lista(classe).filter(function (y) { return y.id !== id; }); },

    // Toglie i voti di un alunno (quando si toglie l'alunno dalla classe)
    togliAlunno: function (classe, alunnoId) { lista(classe).forEach(function (att) { delete att.voti[alunnoId]; }); },

    valutati: function (att) { return Object.keys(att.voti || {}).filter(function (a) { return att.voti[a].voto !== null; }).length; },

    media: function (att) {
      var v = Object.keys(att.voti || {}).map(function (a) { return att.voti[a].voto; }).filter(function (x) { return x !== null; });
      return v.length ? Math.round(v.reduce(function (s, x) { return s + x; }, 0) / v.length * 100) / 100 : null;
    },

    quante: function (classi) { return classi.reduce(function (n, c) { return n + lista(c).length; }, 0); }
  };
})(window.App = window.App || {});
