/* finestra-classi.js
 * Cosa fa: finestra "Classi": crea, rinomina, apre e cancella le classi.
 * Dipende da: App.U, App.Classi, App.Stato, App.Avvisi, App.Finestra, App.UI.disegna,
 *             App.UI.FinestraImporta
 * Usato da: ui/barra.js (pulsante 🏫 Classi), ui/pagina.js (➕ Crea la prima classe)
 */
(function (App) {
  'use strict';

  App.UI = App.UI || {};
  var el = function () { return App.U.el.apply(null, arguments); };

  App.UI.FinestraClassi = {
    apri: function () {
      var elenco = el('div', { class: 'elenco-classi' });
      var nuova = el('input', { type: 'text', placeholder: 'es. 2B', maxlength: App.Config.limiti.nomeClasse, 'aria-label': 'Nome della nuova classe' });
      var fin;

      function crea() {
        var r = App.Classi.crea(nuova.value);
        if (r.errore) { App.Avvisi.toast('❌ ' + r.errore, 'errore', 4500); return; }
        App.Stato.salva();
        nuova.value = '';
        App.UI.disegna();
        disegnaElenco();
        App.Avvisi.toast('✔ Classe ' + r.classe.nome + ' creata.', 'ok');
        // Classe nuova: propone subito il caricamento dei nomi
        fin.chiudi();
        App.UI.FinestraImporta.apri(r.classe);
      }

      function elimina(c) {
        var n = c.alunni.length;
        App.Avvisi.conferma({ titolo: 'Cancellare la classe ' + c.nome + '?', pericolo: true, testoOk: '🗑️ Cancella classe',
          testo: ['⚠️ Saranno cancellati ' + n + ' alunni con tutti i loro risultati e le giustificazioni.',
            'Se non sei sicuro, esporta prima un backup.'] })
          .then(function (si) {
            if (!si) return;
            App.Classi.elimina(c.id);
            App.Stato.salva();
            App.UI.disegna();
            disegnaElenco();
            App.Avvisi.toast('🗑️ Classe cancellata.', 'info');
          });
      }

      function disegnaElenco() {
        App.U.svuota(elenco);
        var tutte = App.Classi.tutte(), attiva = App.Stato.classe();
        if (!tutte.length) { elenco.appendChild(el('p', { class: 'piccolo', text: 'Non ci sono ancora classi.' })); return; }
        elenco.appendChild(el('ul', { class: 'lista' }, tutte.map(function (c) {
          var nome = el('input', { type: 'text', value: c.nome, maxlength: App.Config.limiti.nomeClasse, 'aria-label': 'Nome della classe' });
          nome.addEventListener('change', function () {
            var err = App.Classi.rinomina(c.id, nome.value);
            if (err) { nome.value = c.nome; App.Avvisi.toast('❌ ' + err, 'errore', 4500); return; }
            App.Stato.salva();
            App.UI.disegna();
            App.Avvisi.toast('✔ Nome salvato.', 'ok');
          });
          return el('li', { class: 'riga-lista' + (attiva && attiva.id === c.id ? ' attiva' : '') },
            nome,
            el('span', { class: 'piccolo conta', text: c.alunni.length + ' alunni' }),
            el('button', { type: 'button', class: 'btn btn-neutro piccolo-btn', text: 'Apri', onclick: function () {
              App.Stato.dati.preferenze.classeAttiva = c.id; App.Stato.scrivi(); App.UI.disegna(); fin.chiudi();
            } }),
            el('button', { type: 'button', class: 'btn btn-pericolo piccolo-btn', 'aria-label': 'Cancella ' + c.nome, text: '🗑️',
              onclick: function () { elimina(c); } }));
        })));
      }

      nuova.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); crea(); } });
      disegnaElenco();
      fin = App.Finestra.apri({
        titolo: 'Classi', icona: '🏫',
        corpo: el('div', {},
          el('div', { class: 'riga-aggiungi' }, nuova,
            el('button', { type: 'button', class: 'btn btn-ok', text: '➕ Crea classe', onclick: crea })),
          elenco),
        pulsanti: [{ testo: 'Chiudi', tipo: 'neutro' }]
      });
    }
  };
})(window.App = window.App || {});
