/* finestra-alunni.js
 * Cosa fa: finestra "Alunni" della classe attiva: aggiunge un alunno, corregge i nomi,
 *          cancella; apre il caricamento da file o da testo incollato.
 * Dipende da: App.U, App.Config (limiti), App.Classi, App.Stato, App.Avvisi, App.Finestra,
 *             App.UI.FinestraImporta, App.UI.disegnaContenuto
 * Usato da: ui/barra.js (pulsante 👥 Alunni)
 */
(function (App) {
  'use strict';

  App.UI = App.UI || {};
  var el = function () { return App.U.el.apply(null, arguments); };

  App.UI.FinestraAlunni = {
    apri: function (classe) {
      if (!classe) return;
      var elenco = el('div', { class: 'elenco-alunni' });
      var nuovo = el('input', { type: 'text', placeholder: 'Cognome Nome', maxlength: App.Config.limiti.nomeAlunno, 'aria-label': 'Nuovo alunno' });
      var fin;

      function aggiungi() {
        var err = App.Classi.erroreNomeAlunno(classe, nuovo.value);
        if (err) { App.Avvisi.toast('❌ ' + err, 'errore', 4500); return; }
        App.Classi.aggiungiAlunni(classe, [nuovo.value]);
        App.Stato.salva();
        nuovo.value = '';
        disegnaElenco();
        App.UI.disegnaContenuto();
        App.Avvisi.toast('✔ Alunno aggiunto.', 'ok');
        nuovo.focus();
      }

      function elimina(a) {
        var d = App.Classi.datiAlunno(classe, a.id);
        var avviso = d.risultati || d.giust
          ? '⚠️ Verranno cancellati anche ' + d.risultati + ' risultati dei test e ' + d.giust + ' giustificazioni.' : '';
        App.Avvisi.conferma({ titolo: 'Togliere ' + a.nome + '?', pericolo: true, testoOk: '🗑️ Togli', testo: [a.nome + ' sarà tolto dalla classe ' + classe.nome + '.', avviso] })
          .then(function (si) {
            if (!si) return;
            App.Classi.eliminaAlunno(classe, a.id);
            App.Stato.salva();
            disegnaElenco();
            App.UI.disegnaContenuto();
            App.Avvisi.toast('🗑️ Alunno tolto.', 'info');
          });
      }

      function disegnaElenco() {
        App.U.svuota(elenco);
        if (!classe.alunni.length) { elenco.appendChild(el('p', { class: 'piccolo', text: 'Nessun alunno: aggiungili qui sopra o caricali da un file.' })); return; }
        elenco.appendChild(el('p', { class: 'piccolo', text: classe.alunni.length + ' alunni, in ordine alfabetico. Tocca un nome per correggerlo.' }));
        elenco.appendChild(el('ul', { class: 'lista' }, classe.alunni.map(function (a, i) {
          var nome = el('input', { type: 'text', value: a.nome, maxlength: App.Config.limiti.nomeAlunno, 'aria-label': 'Nome alunno' });
          nome.addEventListener('change', function () {
            var err = App.Classi.rinominaAlunno(classe, a.id, nome.value);
            if (err) { nome.value = a.nome; App.Avvisi.toast('❌ ' + err, 'errore', 4500); return; }
            App.Stato.salva();
            disegnaElenco();
            App.UI.disegnaContenuto();
            App.Avvisi.toast('✔ Nome corretto.', 'ok');
          });
          return el('li', { class: 'riga-lista' },
            el('span', { class: 'num', text: (i + 1) + '.' }), nome,
            el('button', { type: 'button', class: 'btn btn-pericolo piccolo-btn', 'aria-label': 'Togli ' + a.nome, text: '🗑️',
              onclick: function () { elimina(a); } }));
        })));
      }

      function importa() { fin.chiudi(); App.UI.FinestraImporta.apri(classe); }

      nuovo.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); aggiungi(); } });
      disegnaElenco();
      fin = App.Finestra.apri({
        titolo: 'Alunni di ' + classe.nome, icona: '👥',
        corpo: el('div', {},
          el('div', { class: 'riga-btn sinistra' },
            el('button', { type: 'button', class: 'btn btn-ok', text: '📥 Carica da file o incolla', onclick: importa })),
          el('div', { class: 'riga-aggiungi' }, nuovo,
            el('button', { type: 'button', class: 'btn btn-ok', text: '➕ Aggiungi', onclick: aggiungi })),
          elenco),
        pulsanti: [{ testo: 'Chiudi', tipo: 'neutro' }]
      });
    }
  };
})(window.App = window.App || {});
