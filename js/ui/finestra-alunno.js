/* finestra-alunno.js
 * Cosa fa: finestra di UN alunno, aperta toccando il suo nome nelle tabelle:
 *          correggere il nome, indicare ♂/♀ (per le tabelle dei voti) oppure togliere l'alunno (per esempio un "non alunno"
 *          entrato per errore dal file).
 * Dipende da: App.U, App.Config (limiti), App.Classi, App.Stato, App.Avvisi, App.Finestra,
 *             App.UI.disegnaContenuto
 * Usato da: ui/tabella-test.js, ui/tabella-giust.js (tocco sul nome)
 */
(function (App) {
  'use strict';

  App.UI = App.UI || {};
  var el = function () { return App.U.el.apply(null, arguments); };

  // Chiede conferma e toglie l'alunno. -> Promise<boolean>
  function togli(classe, a) {
    var d = App.Classi.datiAlunno(classe, a.id);
    return App.Avvisi.conferma({
      titolo: 'Togliere ' + a.nome + '?', pericolo: true, testoOk: '🗑️ Togli',
      testo: [a.nome + ' sarà tolto dalla classe ' + classe.nome + '.',
        d.risultati || d.giust ? '⚠️ Verranno cancellati anche ' + d.risultati + ' risultati dei test e ' + d.giust + ' giustificazioni.' : '']
    }).then(function (si) {
      if (!si) return false;
      App.Classi.eliminaAlunno(classe, a.id);
      App.Stato.salva();
      App.UI.disegnaContenuto();
      App.Avvisi.toast('🗑️ ' + a.nome + ' tolto dalla classe.', 'info');
      return true;
    });
  }

  App.UI.FinestraAlunno = {
    togli: togli,

    apri: function (classe, a) {
      var d = App.Classi.datiAlunno(classe, a.id);
      var nome = el('input', { type: 'text', value: a.nome, maxlength: App.Config.limiti.nomeAlunno, 'aria-label': 'Cognome e nome' });
      var fin;

      var sesso = el('div', { class: 'segmenti sesso-segmenti', role: 'radiogroup', 'aria-label': 'Alunno o alunna' },
        [['M', '♂ Alunno'], ['F', '♀ Alunna'], ['', 'Non indicato']].map(function (x) {
          return el('label', { class: 'segmento' + ((a.sesso || '') === x[0] ? ' attivo' : '') },
            el('input', { type: 'radio', name: 'sesso', value: x[0], checked: (a.sesso || '') === x[0], class: 'nascosto' }), x[1]);
        }));
      sesso.addEventListener('change', function () {
        Array.prototype.forEach.call(sesso.children, function (l) { l.classList.toggle('attivo', l.querySelector('input').checked); });
      });

      function salva() {
        var s = sesso.querySelector('input:checked');
        if (s && s.value !== (a.sesso || '')) {
          App.Classi.impostaSesso(classe, a.id, s.value);
          App.Stato.salva();
          App.UI.disegnaContenuto();
        }
        if (App.U.spazi(nome.value) === a.nome) return true;
        var err = App.Classi.rinominaAlunno(classe, a.id, nome.value);
        if (err) { App.Avvisi.toast('❌ ' + err, 'errore', 4500); return false; }
        App.Stato.salva();
        App.UI.disegnaContenuto();
        App.Avvisi.toast('✔ Nome corretto.', 'ok');
        return true;
      }
      nome.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter') { ev.preventDefault(); if (salva()) fin.chiudi(); }
      });

      fin = App.Finestra.apri({
        titolo: 'Alunno', icona: '👤',
        corpo: el('div', { class: 'modulo' },
          el('label', { class: 'campo' }, el('span', { text: 'Cognome e nome' }), nome),
          el('div', { class: 'campo' }, el('span', { text: 'Per le tabelle dei voti' }), sesso),
          el('p', { class: 'piccolo', text: 'Classe ' + classe.nome + ' · ' + d.risultati + ' risultati dei test · ' + d.giust + ' giustificazioni' })),
        pulsanti: [
          { testo: '🗑️ Togli', tipo: 'pericolo', azione: function (f) { togli(classe, a).then(function (ok) { if (ok) f.chiudi(); }); return false; } },
          { testo: 'Annulla', tipo: 'neutro' },
          { testo: '✔ Salva', tipo: 'ok', azione: salva }
        ]
      });
    }
  };
})(window.App = window.App || {});
