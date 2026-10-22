/* finestra-test.js
 * Cosa fa: finestra per creare, modificare, spostare o cancellare un test (colonna del modulo 1).
 * Dipende da: App.U, App.Config (tipiTest), App.Test, App.Stato, App.Avvisi, App.Finestra,
 *             App.UI.disegnaContenuto
 * Usato da: ui/tabella-test.js (pulsante ➕ Nuovo test e intestazioni delle colonne)
 */
(function (App) {
  'use strict';

  App.UI = App.UI || {};
  var el = function () { return App.U.el.apply(null, arguments); };

  function radio(nome, valore, testo, scelto) {
    return el('label', { class: 'scelta' },
      el('input', { type: 'radio', name: nome, value: valore, checked: scelto }), ' ' + testo);
  }

  function dalModulo(f) {
    var tipo = f.querySelector('input[name=tipo]:checked');
    var meglio = f.querySelector('input[name=migliore]:checked');
    return {
      nome: f.querySelector('[name=nome]').value,
      unita: f.querySelector('[name=unita]').value,
      tipo: tipo ? tipo.value : '',
      migliore: meglio ? meglio.value : ''
    };
  }

  function chiedi(classe, t, fin) {
    var n = App.Test.quantiRisultati(classe, t.id);
    App.Avvisi.conferma({
      titolo: 'Cancellare il test?', pericolo: true, testoOk: '🗑️ Cancella',
      testo: ['Il test "' + t.nome + '" sarà tolto dalla tabella.',
        n ? '⚠️ Verranno cancellati anche ' + n + ' risultati già scritti.' : '']
    }).then(function (si) {
      if (!si) return;
      App.Test.elimina(classe, t.id);
      App.Stato.salva();
      fin.chiudi();
      App.UI.disegnaContenuto();
      App.Avvisi.toast('🗑️ Test cancellato.', 'info');
    });
  }

  App.UI.FinestraTest = {
    apri: function (classe, t) {
      var tipi = App.Config.tipiTest;
      var d = t || { nome: '', unita: '', tipo: 'numero', migliore: tipi.numero.migliore };
      var rigaUnita = el('label', { class: 'campo' }, el('span', { text: 'Unità di misura (facoltativa)' }),
        el('input', { name: 'unita', type: 'text', value: d.unita, maxlength: App.Config.limiti.unita, placeholder: 'es. cm, m, rip., kg' }));
      var esempio = el('p', { class: 'piccolo esempio' });

      var f = el('form', { class: 'modulo', onsubmit: function (ev) { ev.preventDefault(); } },
        el('label', { class: 'campo' }, el('span', { text: 'Nome del test' }),
          el('input', { name: 'nome', type: 'text', value: d.nome, maxlength: App.Config.limiti.nomeTest, placeholder: 'es. Salto in lungo da fermo' })),
        el('fieldset', { class: 'campo' }, el('legend', { text: 'Tipo di risultato' }),
          Object.keys(tipi).map(function (k) { return radio('tipo', k, tipi[k].nome, d.tipo === k); })),
        esempio,
        rigaUnita,
        el('fieldset', { class: 'campo' }, el('legend', { text: 'Che risultato è migliore?' }),
          radio('migliore', 'alto', '↑ Più alto (es. salti, lanci, ripetizioni)', d.migliore === 'alto'),
          radio('migliore', 'basso', '↓ Più basso (es. tempi di corsa)', d.migliore === 'basso')));

      function aggiornaTipo(cambiato) {
        var tipo = f.querySelector('input[name=tipo]:checked').value;
        rigaUnita.style.display = tipo === 'tempo' ? 'none' : '';
        esempio.textContent = 'Come si scrive: ' + tipi[tipo].esempio;
        if (cambiato) f.querySelector('input[name=migliore][value=' + tipi[tipo].migliore + ']').checked = true;
      }
      Array.prototype.forEach.call(f.querySelectorAll('input[name=tipo]'), function (r) {
        r.addEventListener('change', function () { aggiornaTipo(true); });
      });
      aggiornaTipo(false);

      var pulsanti = [];
      if (t) {
        pulsanti.push({ testo: '🗑️ Cancella', tipo: 'pericolo', azione: function (fin) { chiedi(classe, t, fin); return false; } });
        pulsanti.push({ testo: '◀', tipo: 'neutro', azione: function () { App.Test.sposta(classe, t.id, -1); App.Stato.salva(); App.UI.disegnaContenuto(); return false; } });
        pulsanti.push({ testo: '▶', tipo: 'neutro', azione: function () { App.Test.sposta(classe, t.id, 1); App.Stato.salva(); App.UI.disegnaContenuto(); return false; } });
      }
      pulsanti.push({ testo: 'Annulla', tipo: 'neutro' });
      pulsanti.push({
        testo: t ? '✔ Salva' : '✔ Aggiungi', tipo: 'ok',
        azione: function () {
          var dati = dalModulo(f), err;
          if (t) err = App.Test.modifica(classe, t.id, dati);
          else err = App.Test.crea(classe, dati).errore;
          if (err) { App.Avvisi.toast('❌ ' + err, 'errore', 5000); return false; }
          App.Stato.salva();
          App.UI.disegnaContenuto();
          App.Avvisi.toast(t ? '✔ Test aggiornato.' : '✔ Test aggiunto.', 'ok');
        }
      });

      App.Finestra.apri({ titolo: t ? 'Modifica test' : 'Nuovo test', icona: '📊', corpo: f, pulsanti: pulsanti });
    }
  };
})(window.App = window.App || {});
