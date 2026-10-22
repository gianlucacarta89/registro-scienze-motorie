/* finestra-alunni.js
 * Cosa fa: finestra "Alunni" della classe attiva: aggiunge un alunno, corregge i nomi,
 *          toglie un alunno o più alunni selezionati insieme (es. righe entrate per errore
 *          dal file); apre il caricamento da file o da testo incollato.
 * Dipende da: App.U, App.Config (limiti), App.Classi, App.Stato, App.Avvisi, App.Finestra,
 *             App.UI.FinestraImporta, App.UI.FinestraAlunno, App.UI.disegnaContenuto
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

      var scelti = {};          // id degli alunni selezionati
      var barraSel = el('div', { class: 'barra-selezione' });

      function elimina(a) {
        App.UI.FinestraAlunno.togli(classe, a).then(function (ok) {
          if (ok) { delete scelti[a.id]; disegnaElenco(); }
        });
      }

      function quantiScelti() {
        return classe.alunni.filter(function (a) { return scelti[a.id]; });
      }

      function togliScelti() {
        var lista = quantiScelti();
        if (!lista.length) return;
        var r = 0, g = 0;
        lista.forEach(function (a) { var d = App.Classi.datiAlunno(classe, a.id); r += d.risultati; g += d.giust; });
        var nomi = lista.slice(0, 8).map(function (a) { return a.nome; }).join(', ') + (lista.length > 8 ? '…' : '');
        App.Avvisi.conferma({
          titolo: 'Togliere ' + lista.length + (lista.length === 1 ? ' alunno?' : ' alunni?'), pericolo: true, testoOk: '🗑️ Togli',
          testo: [nomi, r || g ? '⚠️ Verranno cancellati anche ' + r + ' risultati dei test e ' + g + ' giustificazioni.' : '']
        }).then(function (si) {
          if (!si) return;
          lista.forEach(function (a) { App.Classi.eliminaAlunno(classe, a.id); });
          scelti = {};
          App.Stato.salva();
          disegnaElenco();
          App.UI.disegnaContenuto();
          App.Avvisi.toast('🗑️ Tolti ' + lista.length + (lista.length === 1 ? ' alunno.' : ' alunni.'), 'info');
        });
      }

      function aggiornaBarra() {
        var n = quantiScelti().length, tutti = n && n === classe.alunni.length;
        App.U.svuota(barraSel);
        if (!classe.alunni.length) return;
        var cbTutti = el('input', { type: 'checkbox', checked: tutti, 'aria-label': 'Seleziona tutti' });
        cbTutti.addEventListener('change', function () {
          scelti = {};
          if (cbTutti.checked) classe.alunni.forEach(function (a) { scelti[a.id] = true; });
          disegnaElenco();
        });
        barraSel.appendChild(el('label', { class: 'scelta' }, cbTutti, ' Seleziona tutti'));
        barraSel.appendChild(el('button', { type: 'button', class: 'btn btn-pericolo piccolo-btn', disabled: !n,
          text: '🗑️ Togli selezionati' + (n ? ' (' + n + ')' : ''), onclick: togliScelti }));
      }

      // ♂ / ♀ con un tocco (serve per le tabelle dei voti); un secondo tocco lo toglie
      function sceltaSesso(a) {
        var box = el('span', { class: 'sesso-scelta', role: 'group', 'aria-label': 'Alunno o alunna' });
        ['M', 'F'].forEach(function (k) {
          var info = App.Config.sessi[k];
          box.appendChild(el('button', { type: 'button', class: 'sesso-btn' + (a.sesso === k ? ' attivo' : ''),
            'aria-pressed': a.sesso === k ? 'true' : 'false', title: info.nome, text: info.icona,
            onclick: function () {
              App.Classi.impostaSesso(classe, a.id, a.sesso === k ? '' : k);
              App.Stato.salva();
              Array.prototype.forEach.call(box.children, function (b, j) {
                var on = a.sesso === ['M', 'F'][j];
                b.classList.toggle('attivo', on); b.setAttribute('aria-pressed', on ? 'true' : 'false');
              });
              aggiornaConteggio();
              App.UI.disegnaContenuto();
            } }));
        });
        return box;
      }

      var conteggio = el('p', { class: 'piccolo' });
      function aggiornaConteggio() {
        var n = App.Classi.senzaSesso(classe);
        conteggio.textContent = classe.alunni.length + ' alunni, in ordine alfabetico. Tocca un nome per correggerlo; spunta più nomi per toglierli insieme.' +
          (n ? ' ♂/♀ da indicare: ' + n + '.' : ' ♂/♀ indicato per tutti.');
      }

      function disegnaElenco() {
        App.U.svuota(elenco);
        aggiornaBarra();
        if (!classe.alunni.length) { elenco.appendChild(el('p', { class: 'piccolo', text: 'Nessun alunno: aggiungili qui sopra o caricali da un file.' })); return; }
        aggiornaConteggio();
        elenco.appendChild(conteggio);
        elenco.appendChild(el('ul', { class: 'lista' }, classe.alunni.map(function (a, i) {
          var cb = el('input', { type: 'checkbox', checked: !!scelti[a.id], 'aria-label': 'Seleziona ' + a.nome });
          cb.addEventListener('change', function () {
            if (cb.checked) scelti[a.id] = true; else delete scelti[a.id];
            var riga = cb.closest('li');
            if (riga) riga.classList.toggle('selezionata', cb.checked);
            aggiornaBarra();
          });
          var nome = el('input', { type: 'text', value: a.nome, maxlength: App.Config.limiti.nomeAlunno, 'aria-label': 'Nome alunno' });
          nome.addEventListener('change', function () {
            var err = App.Classi.rinominaAlunno(classe, a.id, nome.value);
            if (err) { nome.value = a.nome; App.Avvisi.toast('❌ ' + err, 'errore', 4500); return; }
            App.Stato.salva();
            disegnaElenco();
            App.UI.disegnaContenuto();
            App.Avvisi.toast('✔ Nome corretto.', 'ok');
          });
          return el('li', { class: 'riga-lista' + (scelti[a.id] ? ' selezionata' : '') },
            cb, el('span', { class: 'num', text: (i + 1) + '.' }), nome, sceltaSesso(a),
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
          barraSel,
          elenco),
        pulsanti: [{ testo: 'Chiudi', tipo: 'neutro' }]
      });
    }
  };
})(window.App = window.App || {});
