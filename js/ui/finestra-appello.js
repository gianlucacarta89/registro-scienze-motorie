/* finestra-appello.js
 * Cosa fa: finestra "⚡ Appello rapido" (📋 Giustificazioni): un giorno, tutta la classe in lista; accanto
 *          a ogni alunno i simboli dei motivi (un tocco per sceglierlo, un altro tocco per toglierlo;
 *          🌸 solo per le alunne e per chi non ha ♂/♀). Se il motivo lo ammette compare 📄 (certificato);
 *          per la giustificazione generica compare la nota (obbligatoria). Chi ha già una giustificazione
 *          quel giorno è indicato e non si tocca. "✔ Salva" le aggiunge tutte insieme, dopo averle
 *          controllate tutte (se una ha un errore non se ne salva nessuna).
 * Dipende da: App.U, App.Config (simboli, certificato, limiti), App.Giust, App.Calendario, App.Stato,
 *             App.Avvisi, App.Finestra, App.UI.disegnaContenuto
 * Usato da: ui/tabella-giust.js
 */
(function (App) {
  'use strict';

  App.UI = App.UI || {};
  var el = function () { return App.U.el.apply(null, arguments); };

  App.UI.FinestraAppello = {
    apri: function (classe) {
      var anno = App.Calendario.annoAttivo(), lim = App.Calendario.limiti(anno), oggi = App.U.oggiISO();
      var scelte = {};                    // alunnoId -> { simbolo, certificato, nota }
      var data = el('input', { type: 'date', 'aria-label': 'Giorno', min: lim.primo, max: lim.ultimo,
        value: oggi >= lim.primo && oggi <= lim.ultimo ? oggi : lim.primo });
      var lista = el('ul', { class: 'lista lista-appello' });
      var conto = el('p', { class: 'conto-appello' });

      function gia(a) { return (classe.giust[a.id] || []).filter(function (g) { return g.data === data.value; })[0]; }

      function aggiornaConto() {
        var n = Object.keys(scelte).length, per = {};
        Object.keys(scelte).forEach(function (id) { var s = App.Giust.simbolo(scelte[id].simbolo); per[s.icona] = (per[s.icona] || 0) + 1; });
        conto.textContent = n ? '✔ ' + n + (n === 1 ? ' giustificazione da salvare: ' : ' giustificazioni da salvare: ') +
          Object.keys(per).map(function (i) { return i + ' ' + per[i]; }).join('  ') : 'Tocca il motivo accanto agli alunni giustificati.';
      }

      function riga(a, r) {
        var g = gia(a), sc = scelte[a.id];
        var testa = el('div', { class: 'appello-nome' }, el('span', { class: 'num', text: (r + 1) + '.' }), ' ' + a.nome +
          (a.sesso ? ' ' + App.Config.sessi[a.sesso].icona : ''));
        if (g) {
          var s = App.Giust.simbolo(g.simbolo);
          return el('li', { class: 'riga-appello gia' }, testa,
            el('span', { class: 'piccolo', text: 'già segnata: ' + (s ? s.icona + ' ' + s.nome : g.simbolo) + (g.certificato ? ' ' + App.Config.certificato.icona : '') }));
        }
        var bottoni = App.Config.simboli.filter(function (s) { return s.id !== 'ciclo' || a.sesso !== 'M'; }).map(function (s) {
          var on = sc && sc.simbolo === s.id;
          return el('button', { type: 'button', class: 'simbolo-appello' + (on ? ' scelto' : ''), title: s.nome, 'aria-label': s.nome + ' – ' + a.nome,
            'aria-pressed': on ? 'true' : 'false', text: s.icona, onclick: function () {
              if (on) delete scelte[a.id]; else scelte[a.id] = { simbolo: s.id, certificato: false, nota: sc ? sc.nota : '' };
              ridisegna();
            } });
        });
        var extra = null;
        if (sc) {
          var simb = App.Giust.simbolo(sc.simbolo), parti = [];
          if (simb.certificato) {
            var cb = el('input', { type: 'checkbox', checked: sc.certificato, 'aria-label': 'Con certificato medico – ' + a.nome });
            cb.addEventListener('change', function () { sc.certificato = cb.checked; });
            parti.push(el('label', { class: 'scelta spunta-cert' }, cb, ' ' + App.Config.certificato.icona + ' certificato'));
          }
          var nota = el('input', { type: 'text', maxlength: App.Config.limiti.nota, value: sc.nota || '', 'aria-label': 'Nota – ' + a.nome,
            placeholder: simb.notaObbligatoria ? 'motivo (obbligatorio)' : 'nota (facoltativa)' });
          nota.addEventListener('input', function () { sc.nota = nota.value; });
          parti.push(nota);
          extra = el('div', { class: 'appello-extra' }, parti);
        }
        return el('li', { class: 'riga-appello' + (sc ? ' con-scelta' : '') }, testa, el('div', { class: 'appello-simboli' }, bottoni), extra);
      }

      function ridisegna() {
        App.U.svuota(lista);
        classe.alunni.forEach(function (a, r) { lista.appendChild(riga(a, r)); });
        aggiornaConto();
      }
      data.addEventListener('change', function () {
        Object.keys(scelte).forEach(function (id) { if (gia({ id: id })) delete scelte[id]; });
        ridisegna();
      });
      ridisegna();

      function salva() {
        var ids = Object.keys(scelte);
        if (!ids.length) { App.Avvisi.toast('Tocca il motivo accanto agli alunni giustificati.', 'info'); return false; }
        var mese = App.Calendario.meseDi(data.value, anno);
        if (!mese) { App.Avvisi.toast('Il giorno deve essere dell\'anno scolastico ' + App.Calendario.etichetta(anno) + '.', 'errore', 5000); return false; }
        var errori = ids.map(function (id) {
          var a = classe.alunni.filter(function (x) { return x.id === id; })[0];
          var e = App.Giust.errore(classe, id, { data: data.value, simbolo: scelte[id].simbolo, nota: scelte[id].nota }, mese);
          return e ? a.nome + ': ' + e : null;
        }).filter(Boolean);
        if (errori.length) { App.Avvisi.toast('❌ ' + errori.join(' · '), 'errore', 7000); return false; }
        ids.forEach(function (id) {
          var s = scelte[id];
          App.Giust.aggiungi(classe, id, { data: data.value, simbolo: s.simbolo, certificato: s.certificato, nota: s.nota }, mese);
        });
        App.Stato.salva();
        App.UI.disegnaContenuto();
        App.Avvisi.toast('✔ ' + ids.length + (ids.length === 1 ? ' giustificazione salvata' : ' giustificazioni salvate') + ' per il ' + App.U.dataIT(data.value) + '.', 'ok', 5000);
      }

      App.Finestra.apri({
        titolo: 'Appello rapido – ' + classe.nome, icona: '⚡', larga: true, fuoco: false,
        corpo: el('div', { class: 'finestra-appello' },
          el('label', { class: 'campo' }, el('span', { text: 'Giorno' }), data),
          el('p', { class: 'piccolo', text: App.Config.simboli.map(function (s) { return s.icona + ' ' + s.nome; }).join(' · ') + '. Un tocco sceglie, un altro toglie.' }),
          lista, conto),
        pulsanti: [{ testo: 'Annulla', tipo: 'neutro' }, { testo: '✔ Salva', tipo: 'ok', azione: salva }]
      });
    }
  };
})(window.App = window.App || {});
