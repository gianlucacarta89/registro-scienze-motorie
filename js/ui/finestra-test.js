/* finestra-test.js
 * Cosa fa: finestra per creare, modificare, spostare o cancellare un test (colonna del modulo 1).
 * Dipende da: App.U, App.Config (tipiTest), App.Test, App.Voti, App.ElencoTest, App.UI.FinestraVoti, App.Stato, App.Avvisi, App.Finestra,
 *             App.UI.disegnaContenuto
 * Usato da: ui/tabella-test.js (pulsante ➕ Nuovo test e intestazioni delle colonne),
 *           ui/finestra-elenco-test.js (test dell'elenco: "classe" = App.ElencoTest.contenitore())
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
      tipologia: f.querySelector('[name=tipologia]').value === ALTRO ? f.querySelector('[name=tipologiaAltro]').value : f.querySelector('[name=tipologia]').value,
      note: f.querySelector('[name=note]').value,
      perSesso: f.querySelector('[name=perSesso]').checked,
      strumento: f.querySelector('[name=strumento]').value,
      strumentoM: f.querySelector('[name=strumentoM]').value,
      strumentoF: f.querySelector('[name=strumentoF]').value,
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

  var ALTRO = '__altro';

  // Menu a tendina delle tipologie (da config.js) + "Altro…" con campo libero.
  // Una tipologia già scritta che coincide con una voce (maiuscole a parte) si riconosce.
  function sceltaTipologia(valore) {
    var lista = App.Config.tipologie;
    var trovata = lista.filter(function (x) { return App.U.chiaveNome(x) === App.U.chiaveNome(valore); })[0];
    var altro = !!valore && !trovata;
    var sel = el('select', { name: 'tipologia', 'aria-label': 'Tipologia', value: altro ? ALTRO : (trovata || '') },
      el('option', { value: '', text: '— scegli —' }),
      lista.map(function (x) { return el('option', { value: x, text: x }); }),
      el('option', { value: ALTRO, text: 'Altro… (scrivi tu)' }));
    var libero = el('input', { name: 'tipologiaAltro', type: 'text', value: altro ? valore : '', maxlength: App.Config.limiti.tipologia, 'aria-label': 'Altra tipologia' });
    libero.hidden = !altro;
    sel.addEventListener('change', function () {
      libero.hidden = sel.value !== ALTRO;
      if (!libero.hidden) libero.focus();
    });
    return el('div', { class: 'scelta-tipologia' }, sel, libero);
  }

  App.UI.FinestraTest = {
    apri: function (classe, t) {
      var tipi = App.Config.tipiTest;
      var d = t || { nome: '', tipologia: '', strumento: '', unita: '', tipo: 'numero', migliore: tipi.numero.migliore };
      var rigaUnita = el('label', { class: 'campo' }, el('span', { text: 'Unità di misura (facoltativa)' }),
        el('input', { name: 'unita', type: 'text', value: d.unita, maxlength: App.Config.limiti.unita, placeholder: 'es. cm, m, rip., kg' }));
      var esempio = el('p', { class: 'piccolo esempio' });

      var f = el('form', { class: 'modulo', onsubmit: function (ev) { ev.preventDefault(); } },
        el('label', { class: 'campo' }, el('span', { text: 'Nome del test' }),
          el('input', { name: 'nome', type: 'text', value: d.nome, maxlength: App.Config.limiti.nomeTest, placeholder: 'es. Salto in lungo da fermo' })),
        // Tipologia (menu a tendina, parte da "scegli") e strumento (campo vuoto): facoltativi
        el('div', { class: 'campo' }, el('span', { text: 'Tipologia (cosa valuta il test)' }),
          sceltaTipologia(d.tipologia || '')),
        el('label', { class: 'campo' }, el('span', { text: 'Note (es. mese in cui è stato svolto il test)' }),
          el('textarea', { name: 'note', rows: 2, maxlength: App.Config.limiti.noteTest, value: d.note || '' })),
        el('fieldset', { class: 'campo' }, el('legend', { text: 'Strumento utilizzato' }),
          el('label', { class: 'scelta' }, el('input', { type: 'checkbox', name: 'perSesso', checked: !!d.perSesso }), ' Diverso per alunni e alunne'),
          el('div', { class: 'strumento-unico' },
            el('input', { name: 'strumento', type: 'text', value: d.strumento || '', maxlength: App.Config.limiti.strumento, 'aria-label': 'Strumento' })),
          el('div', { class: 'strumento-sesso' },
            el('label', { class: 'campo' }, el('span', { text: '♂ Alunni' }),
              el('input', { name: 'strumentoM', type: 'text', value: d.strumentoM || '', maxlength: App.Config.limiti.strumento })),
            el('label', { class: 'campo' }, el('span', { text: '♀ Alunne' }),
              el('input', { name: 'strumentoF', type: 'text', value: d.strumentoF || '', maxlength: App.Config.limiti.strumento }))),
          el('p', { class: 'piccolo', text: 'Per età diverse (es. prima o quinta) scrivi lo strumento nel test di ciascuna classe.' })),
        el('fieldset', { class: 'campo' }, el('legend', { text: 'Tipo di risultato' }),
          Object.keys(tipi).map(function (k) { return radio('tipo', k, tipi[k].nome, d.tipo === k); })),
        esempio,
        rigaUnita,
        el('fieldset', { class: 'campo' }, el('legend', { text: 'Che risultato è migliore?' }),
          radio('migliore', 'alto', '↑ Più alto (es. salti, lanci, ripetizioni)', d.migliore === 'alto'),
          radio('migliore', 'basso', '↓ Più basso (es. tempi di corsa)', d.migliore === 'basso')),
        el('fieldset', { class: 'campo' }, el('legend', { text: 'Voto automatico' }),
          el('p', { class: 'piccolo', text: t && App.Voti.haTabella(t)
            ? '📏 Tabella inserita: ' + t.voti.righe.length + ' voti, separati per alunni e alunne.'
            : 'Inserisci i parametri di riferimento (es. del libro) per calcolare il voto da solo.' }),
          el('button', { type: 'button', class: 'btn btn-info', text: '📏 Tabella dei voti', onclick: function () { salva(true); } })),
        // un test di una classe si può rimettere nell'elenco (es. se dall'elenco era stato cancellato)
        t && !classe.elenco ? el('div', { class: 'riga-btn sinistra' },
          el('button', { type: 'button', class: 'btn btn-neutro piccolo-btn', text: '📚 Salva nell\'elenco dei test', onclick: function () {
            if (!salva(false)) return;
            var r = App.ElencoTest.prendiDaClasse(classe, [t.id]);
            App.Stato.salva();
            App.Avvisi.toast(r.copiati ? '✔ "' + t.nome + '" salvato nell\'elenco dei test (📚).' : 'Nell\'elenco c\'è già un test "' + t.nome + '".', r.copiati ? 'ok' : 'info', 4500);
          } })) : null);

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

      // mostra un campo per tutti oppure i due campi alunni / alunne
      var perSesso = f.querySelector('[name=perSesso]');
      function aggiornaStrumento() {
        f.querySelector('.strumento-unico').hidden = perSesso.checked;
        f.querySelector('.strumento-sesso').hidden = !perSesso.checked;
      }
      perSesso.addEventListener('change', aggiornaStrumento);
      aggiornaStrumento();

      var fin;
      // Salva il test; con apriVoti = true poi apre la tabella dei voti. -> false se c'è un errore
      var esitoElenco = null;
      function salva(apriVoti) {
        var dati = dalModulo(f), err, test = t, r = null;
        if (t) err = App.Test.modifica(classe, t.id, dati);
        else { r = App.Test.crea(classe, dati); err = r.errore; test = r.test; t = test; }
        if (err) { App.Avvisi.toast('❌ ' + err, 'errore', 5000); return false; }
        // Elenco 📚: un test nuovo di una classe ci entra da solo; poi la sua copia resta allineata
        if (classe.elenco) App.ElencoTest.stacca(test);
        else if (r) esitoElenco = App.ElencoTest.registra(classe, test);
        else App.ElencoTest.aggiorna(classe, test);
        App.Stato.salva();
        App.UI.disegnaContenuto();
        // se cambia "che risultato è migliore" la tabella dei voti può non tornare più
        if (App.Voti.haTabella(test) && App.Voti.controlla(test, test.voti.righe).errore) {
          App.Avvisi.toast('⚠️ Controlla la tabella dei voti: non torna più con le impostazioni del test.', 'errore', 6000);
        }
        if (apriVoti) { fin.chiudi(); App.UI.FinestraVoti.apri(classe, test); }
        return true;
      }

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
          var nuovo = !t;
          if (!salva(false)) return false;
          if (!nuovo) App.Avvisi.toast('✔ Test aggiornato.', 'ok');
          else if (classe.elenco) App.Avvisi.toast('✔ Test aggiunto all\'elenco.', 'ok');
          else App.Avvisi.toast(esitoElenco === 'presente' ? '✔ Test aggiunto. Nell\'elenco 📚 c\'era già un test con questo nome: non l\'ho duplicato.'
            : '✔ Test aggiunto e salvato nell\'elenco 📚.', 'ok', 4500);
        }
      });

      fin = App.Finestra.apri({ titolo: (classe.elenco ? 'Elenco · ' : '') + (t ? 'Modifica test' : 'Nuovo test'), icona: classe.elenco ? '📚' : '📊', corpo: f, pulsanti: pulsanti });
    }
  };
})(window.App = window.App || {});
