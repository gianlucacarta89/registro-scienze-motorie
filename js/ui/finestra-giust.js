/* finestra-giust.js
 * Cosa fa: finestra di un alunno in un mese: elenco delle giustificazioni e modulo per
 *          aggiungere o modificare (data, simbolo, nota). Si possono inserirne più di seguito.
 * Dipende da: App.U, App.Config (simboli, limiti, testi), App.Giust, App.Stato, App.Avvisi,
 *             App.Finestra, App.UI.disegnaContenuto
 * Usato da: ui/tabella-giust.js (tocco su una casella)
 */
(function (App) {
  'use strict';

  App.UI = App.UI || {};
  var el = function () { return App.U.el.apply(null, arguments); };

  App.UI.FinestraGiust = {
    apri: function (classe, alunno, mese) {
      var oggi = App.U.oggiISO();
      var inModifica = null;          // id della giustificazione in modifica
      var simboloScelto = null;
      var kBozza = ['giust', classe.id, alunno.id, mese.chiave].join('|');
      var elenco = el('div', { class: 'elenco-giust' });

      var data = el('input', { type: 'date', name: 'data', min: mese.primo, max: mese.ultimo,
        value: oggi >= mese.primo && oggi <= mese.ultimo ? oggi : '' });
      var nota = el('input', { type: 'text', name: 'nota', maxlength: App.Config.limiti.nota,
        placeholder: 'facoltativa (es. "giustificata dal genitore")' });
      var simboli = el('div', { class: 'scelta-simboli', role: 'radiogroup', 'aria-label': 'Motivo' },
        App.Config.simboli.map(function (s) {
          return el('button', { type: 'button', class: 'simbolo', 'data-id': s.id, role: 'radio', 'aria-checked': 'false',
            onclick: function () { scegli(s.id); } },
            el('span', { class: 'simbolo-icona', text: s.icona }), el('span', { class: 'simbolo-nome', text: s.nome }));
        }));
      var titoloModulo = el('h3', { text: 'Nuova giustificazione' });
      var salva = el('button', { type: 'button', class: 'btn btn-ok', text: '✔ Aggiungi', onclick: conferma });
      var annulla = el('button', { type: 'button', class: 'btn btn-neutro', text: 'Annulla modifica', style: 'display:none',
        onclick: function () { pulisci(); } });

      // Ciò che è scritto e non salvato resta come bozza, anche chiudendo la finestra
      function salvaBozza() {
        if (!simboloScelto && !nota.value.trim() && !inModifica) { delete App.Stato.bozze[kBozza]; return; }
        App.Stato.bozze[kBozza] = { data: data.value, simbolo: simboloScelto, nota: nota.value, inModifica: inModifica };
      }

      function scegli(id) {
        simboloScelto = id;
        Array.prototype.forEach.call(simboli.children, function (b) {
          var si = b.getAttribute('data-id') === id;
          b.classList.toggle('scelto', si);
          b.setAttribute('aria-checked', si ? 'true' : 'false');
        });
        salvaBozza();
      }

      function pulisci() {
        inModifica = null;
        data.value = oggi >= mese.primo && oggi <= mese.ultimo ? oggi : '';
        nota.value = '';
        scegli(null);
        titoloModulo.textContent = 'Nuova giustificazione';
        salva.textContent = '✔ Aggiungi';
        annulla.style.display = 'none';
        delete App.Stato.bozze[kBozza];
        if (elenco.firstChild) disegnaElenco();
      }

      function modifica(g) {
        inModifica = g.id;
        data.value = g.data;
        nota.value = g.nota || '';
        scegli(g.simbolo);
        titoloModulo.textContent = 'Modifica del ' + App.U.dataIT(g.data);
        salva.textContent = '✔ Salva modifica';
        annulla.style.display = '';
        salvaBozza();
        disegnaElenco();
        data.focus();
      }

      function elimina(g) {
        App.Avvisi.conferma({ titolo: 'Cancellare la giustificazione?', pericolo: true, testoOk: '🗑️ Cancella',
          testo: alunno.nome + ' – ' + App.U.dataIT(g.data) + ' ' + (App.Giust.simbolo(g.simbolo) || {}).nome })
          .then(function (si) {
            if (!si) return;
            App.Giust.elimina(classe, alunno.id, g.id);
            if (inModifica === g.id) pulisci();
            dopo('🗑️ Giustificazione cancellata.', 'info');
          });
      }

      function disegnaElenco() {
        App.U.svuota(elenco);
        var lista = App.Giust.delMese(classe, alunno.id, mese);
        if (!lista.length) { elenco.appendChild(el('p', { class: 'piccolo', text: 'Nessuna giustificazione in questo mese.' })); return; }
        elenco.appendChild(el('ul', {}, lista.map(function (g) {
          var s = App.Giust.simbolo(g.simbolo) || { icona: '?', nome: '' };
          return el('li', { class: 'voce-giust' + (inModifica === g.id ? ' in-modifica' : '') },
            el('span', { class: 'voce-data', text: App.U.dataIT(g.data).slice(0, 5) }),
            el('span', { class: 'voce-icona', text: s.icona }),
            el('span', { class: 'voce-testo' }, el('b', { text: s.nome }), g.nota ? el('span', { class: 'voce-nota', text: g.nota }) : null),
            el('button', { type: 'button', class: 'btn btn-neutro piccolo-btn', 'aria-label': 'Modifica', text: '✏️', onclick: function () { modifica(g); } }),
            el('button', { type: 'button', class: 'btn btn-pericolo piccolo-btn', 'aria-label': 'Cancella', text: '🗑️', onclick: function () { elimina(g); } }));
        })));
      }

      function dopo(msg, tipo) {
        App.Stato.salva();
        disegnaElenco();
        App.UI.disegnaContenuto();
        App.Avvisi.toast(msg, tipo || 'ok');
      }

      function conferma() {
        var g = { data: data.value, simbolo: simboloScelto, nota: nota.value };
        var err = inModifica ? App.Giust.modifica(classe, alunno.id, inModifica, g, mese)
          : App.Giust.aggiungi(classe, alunno.id, g, mese);
        if (err) { App.Avvisi.toast('❌ ' + err, 'errore', 5500); return; }
        var msg = inModifica ? '✔ Modifica salvata.' : '✔ Giustificazione aggiunta.';
        pulisci();
        dopo(msg, 'ok');
      }

      var corpo = el('div', { class: 'finestra-giust' },
        elenco,
        el('div', { class: 'modulo riquadro' },
          titoloModulo,
          el('label', { class: 'campo' }, el('span', { text: 'Data (' + mese.nome + ' ' + mese.anno + ')' }), data),
          el('div', { class: 'campo' }, el('span', { text: 'Motivo' }), simboli),
          el('label', { class: 'campo' }, el('span', { text: 'Nota' }), nota),
          el('p', { class: 'piccolo nota-privacy', text: '🔒 ' + App.Config.testi.notaPrivacy }),
          el('div', { class: 'riga-btn' }, annulla, salva)));

      data.addEventListener('input', salvaBozza);
      nota.addEventListener('input', salvaBozza);

      var b = App.Stato.bozze[kBozza];
      if (b) {
        if (b.inModifica && App.Giust.delMese(classe, alunno.id, mese).some(function (g) { return g.id === b.inModifica; })) {
          modifica({ id: b.inModifica, data: b.data, simbolo: b.simbolo, nota: b.nota });
        } else {
          data.value = b.data; nota.value = b.nota; scegli(b.simbolo);
        }
        titoloModulo.textContent += ' (ripresa la bozza non salvata)';
      }

      disegnaElenco();
      App.Finestra.apri({ titolo: alunno.nome + ' – ' + mese.nome + ' ' + mese.anno, icona: '📋', corpo: corpo, fuoco: false,
        pulsanti: [{ testo: 'Chiudi', tipo: 'neutro' }] });
    }
  };
})(window.App = window.App || {});
