/* pagina-home.js
 * Cosa fa: pagina 🏠 Home: saluto, tessere quadrate colorate per ogni sezione con i numeri dal vivo
 *          (classi e alunni, test in uso, sessione, attività valutate, giustificazioni del mese, PDF, stato del backup), una scheda per ogni classe con i numeri principali e i
 *          collegamenti rapidi a Sessioni e Giustificazioni.
 * Dipende da: App.U, App.Stato, App.Config, App.Classi, App.ElencoTest, App.Giust, App.Calendario,
 *             App.Voti, App.Attivita, App.UI (vai, vuoto, titoloPagina)
 * Usato da: ui/pagina.js
 */
(function (App) {
  'use strict';

  App.UI = App.UI || {};
  App.UI.Pagine = App.UI.Pagine || {};
  var el = function () { return App.U.el.apply(null, arguments); };

  // Numeri di una classe: alunni, test, risultati, giustificazioni del mese, media voti dell'ultima prova svolta
  function numeri(classe, mese) {
    var risultati = 0, giustMese = 0, ultima = 0;
    classe.alunni.forEach(function (a) {
      var r = (classe.risultati || {})[a.id] || {};
      Object.keys(r).forEach(function (t) {
        Object.keys(r[t] || {}).forEach(function (p) { if (r[t][p] !== '' && r[t][p] !== undefined) { risultati++; ultima = Math.max(ultima, Number(p) || 0); } });
      });
      if (mese) giustMese += App.Giust.delMese(classe, a.id, mese).length;
    });
    var media = null;
    if (ultima) {
      var m = classe.alunni.map(function (a) { return App.Voti.media(classe, a, ultima); }).filter(function (x) { return x !== null; });
      if (m.length) media = Math.round(m.reduce(function (s, x) { return s + x; }, 0) / m.length * 10) / 10;
    }
    return { risultati: risultati, giustMese: giustMese, ultima: ultima, media: media };
  }

  function apriClasse(c, pagina) {
    App.Stato.dati.preferenze.classeAttiva = c.id;
    App.UI.vai(pagina);
  }

  App.UI.Pagine.home = {
    disegna: function (cont) {
      var d = App.Stato.dati, classi = App.Classi.tutte();
      var oggi = App.U.oggiISO(), anno = App.Calendario.annoAttivo();
      var mese = App.Calendario.meseDi(oggi, anno);
      var ora = new Date().getHours();
      var saluto = ora < 13 ? 'Buongiorno' : ora < 18 ? 'Buon pomeriggio' : 'Buonasera';
      var docente = d.preferenze.docente !== null ? d.preferenze.docente : App.Config.pdf.docente;

      var alunni = 0, maschi = 0, femmine = 0, giustMese = 0;
      var perClasse = classi.map(function (c) {
        alunni += c.alunni.length;
        c.alunni.forEach(function (a) { if (a.sesso === 'M') maschi++; else if (a.sesso === 'F') femmine++; });
        var n = numeri(c, mese);
        giustMese += n.giustMese;
        return { classe: c, n: n };
      });
      var inUso = App.ElencoTest.inUsoTutti().length;
      var backupOk = d.ultimoBackup && !App.Stato.daSalvareInBackup();
      var attiva = App.Stato.classe();

      cont.appendChild(el('div', { class: 'home-saluto' },
        el('h2', { text: saluto + (docente ? ', ' + docente : '') + '!' }),
        el('p', { text: App.U.dataIT(oggi) + ' · anno scolastico ' + App.Calendario.etichetta(anno) })));

      // Tessere quadrate colorate: una per sezione, con i numeri dal vivo
      var voci = [
        { id: 'classi', icona: '🏫', titolo: 'Classi', grande: String(classi.length),
          nota: classi.length ? alunni + ' alunni · ♂ ' + maschi + ' · ♀ ' + femmine : 'Crea la prima classe' },
        { id: 'test', icona: '📚', titolo: 'Test', grande: String(inUso), nota: inUso ? 'in uso · elenco e statistiche' : 'Scegli i test che usi' },
        { id: 'sessioni', icona: '⏱️', titolo: 'Sessioni', grande: attiva ? attiva.nome : '–', nota: attiva ? 'Scrivi i risultati' : 'Serve una classe' },
        { id: 'attivita', icona: '⛹️', titolo: 'Attività', grande: String(App.Attivita.quante(classi)), nota: 'valutate · voti e note' },
        { id: 'giust', icona: '📋', titolo: 'Giustificazioni', grande: String(giustMese), nota: mese ? 'a ' + mese.nome.toLowerCase() : 'fuori dall\'anno scolastico' },
        { id: 'riepilogo', icona: '📄', titolo: 'Riepilogo', grande: 'PDF', nota: 'per famiglie e colleghi' },
        { id: 'backup', icona: '💾', titolo: 'Backup', grande: backupOk ? '✓' : '!', avviso: !backupOk && classi.length > 0,
          nota: d.ultimoBackup ? (backupOk ? 'aggiornato ' : 'modifiche dopo il ') + App.U.dataIT(d.ultimoBackup.slice(0, 10)) : 'mai fatto' }
      ];
      cont.appendChild(el('nav', { class: 'home-tessere', 'aria-label': 'Sezioni' }, voci.map(function (v, i) {
        return el('button', { type: 'button', class: 'home-tessera t-' + v.id + (v.avviso ? ' t-avviso' : ''), style: '--i:' + i,
          'data-pagina': v.id, onclick: function () { App.UI.vai(v.id); } },
          el('span', { class: 't-icona', 'aria-hidden': 'true', text: v.icona }),
          el('span', { class: 't-grande', text: v.grande }),
          el('span', { class: 't-titolo', text: v.titolo }),
          el('span', { class: 't-nota', text: v.nota }));
      })));

      if (!classi.length) {
        cont.appendChild(App.UI.vuoto('🏃', 'Benvenuto!', 'Per iniziare crea una classe in 🏫 Classi e carica i nomi degli alunni da Excel, Word o PDF. Poi in 📚 Test scegli i test che usi.',
          el('button', { type: 'button', class: 'btn btn-ok grande', text: '➕ Crea la prima classe', onclick: function () { App.UI.vai('classi'); } })));
        return;
      }

      cont.appendChild(el('section', { class: 'sezione-stat' }, el('h3', { text: 'Le tue classi' }),
        el('div', { class: 'schede-classi' }, perClasse.map(function (x) {
          var c = x.classe, n = x.n;
          return el('article', { class: 'scheda-classe' + (attiva && attiva.id === c.id ? ' attiva' : '') },
            el('h4', { text: c.nome }),
            el('ul', { class: 'numeri-classe' },
              el('li', { text: '👥 ' + c.alunni.length + (c.alunni.length === 1 ? ' alunno' : ' alunni') }),
              el('li', { text: '📊 ' + c.test.length + ' test · ' + n.risultati + ' risultati' }),
              el('li', { text: '📈 Media voti: ' + (n.media !== null ? App.Voti.testo(n.media) + ' (' + App.Config.prove[n.ultima - 1].nome + ')' : '–') }),
              el('li', { text: '📋 ' + n.giustMese + (n.giustMese === 1 ? ' giustificazione ' : ' giustificazioni ') + (mese ? 'a ' + mese.nome.toLowerCase() : '') })),
            el('div', { class: 'riga-btn sinistra' },
              el('button', { type: 'button', class: 'btn btn-ok piccolo-btn', text: '⏱️ Sessione', onclick: function () { apriClasse(c, 'sessioni'); } }),
              el('button', { type: 'button', class: 'btn btn-neutro piccolo-btn', text: '📋 Giustificazioni', onclick: function () { apriClasse(c, 'giust'); } })));
        }))));
    }
  };
})(window.App = window.App || {});
