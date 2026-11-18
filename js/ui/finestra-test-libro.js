/* finestra-test-libro.js
 * Cosa fa: finestra per creare o modificare un test di un libro del docente (📖 Libro): nome, tipologia,
 *          misura (tempo in secondi o minuti:secondi, oppure numero con unità), meglio alto/basso,
 *          strumento, scheda (a che cosa serve, materiale, come si fa…), fonte e tabelle dei voti: una
 *          per fascia (1° biennio, 2° biennio, quinto anno) oppure una uguale per tutte. Per ogni voto
 *          (10…5) la soglia ♂ e ♀; le righe vuote non contano; il voto più basso (4) vale per chi sta
 *          oltre l'ultima soglia. Controlla le tabelle con App.Voti.controlla.
 *          copia(t): un test di un altro libro come base per un proprio libro.
 * Dipende da: App.U, App.Config (tipologie, fasce, schedaTest, voti), App.Libri, App.Voti, App.Stato,
 *             App.Avvisi, App.Finestra, App.UI.disegnaContenuto
 * Usato da: ui/pagina-libro.js
 */
(function (App) {
  'use strict';

  App.UI = App.UI || {};
  var el = function () { return App.U.el.apply(null, arguments); };
  var VOTI = [10, 9, 8, 7, 6, 5];

  // Soglia "di comodo" dell'ultima riga (voto più basso per tutto il resto)
  function comodo(t) { return t.migliore === 'alto' ? (t.negativi ? '-100' : '0') : (t.tipo === 'tempo' ? (t.formatoTempo === 'min' ? '99:59' : '999') : '999'); }

  function apri(libro, vecchio, base) {
    var t = App.U.copia(vecchio || base || { nome: '', tipologia: '', tipo: 'tempo', formatoTempo: 'sec', migliore: 'basso', unita: '' });
    var perFascia = !!t.fasce || !t.voti;
    var tabelle = {};                                  // fascia (o 'unica') -> { voto: { M, F } }
    function carica(chiave, tab) {
      tabelle[chiave] = {};
      ((tab && tab.righe) || []).forEach(function (r) { if (VOTI.indexOf(r.voto) >= 0) tabelle[chiave][r.voto] = { M: r.M || '', F: r.F || '' }; });
    }
    App.Config.fasce.forEach(function (f) { carica(f.id, t.fasce && t.fasce[f.id]); });
    carica('unica', t.voti);

    var nome = el('input', { type: 'text', maxlength: 80, value: t.nome, 'aria-label': 'Nome del test', placeholder: 'es. Salto in lungo da fermo' });
    var tipologia = el('select', { 'aria-label': 'Tipologia' }, el('option', { value: '', text: '— tipologia —' }),
      App.Config.tipologie.map(function (x) { return el('option', { value: x, text: x }); }));
    tipologia.value = t.tipologia || '';
    var misura = el('select', { 'aria-label': 'Misura' },
      el('option', { value: 'sec', text: 'Tempo in secondi (es. 4,38)' }), el('option', { value: 'min', text: 'Tempo in minuti:secondi (es. 3:55)' }),
      el('option', { value: 'num', text: 'Numero (cm, ripetizioni…)' }));
    misura.value = t.tipo === 'tempo' ? (t.formatoTempo === 'min' ? 'min' : 'sec') : 'num';
    var unita = el('input', { type: 'text', maxlength: 20, value: t.unita || '', 'aria-label': 'Unità', placeholder: 'es. cm, ripetizioni' });
    var migliore = el('select', { 'aria-label': 'Meglio' }, el('option', { value: 'basso', text: 'Meglio più basso ↓ (tempi)' }), el('option', { value: 'alto', text: 'Meglio più alto ↑ (misure)' }));
    migliore.value = t.migliore || 'basso';
    var strumento = el('input', { type: 'text', maxlength: 60, value: t.strumento || '', 'aria-label': 'Strumento', placeholder: 'es. 30 m, palla medica 3 kg' });
    var campi = App.Config.schedaTest.map(function (c) {
      var a = el('textarea', { rows: c.righe, 'aria-label': c.nome }); a.value = t[c.id] || '';
      return { id: c.id, nome: c.nome, nodo: a };
    });
    var fonte = el('input', { type: 'text', maxlength: 120, value: t.fonte || '', 'aria-label': 'Fonte', placeholder: 'es. libro, pagina 120' });
    var zonaTab = el('div', { class: 'tabelle-libro' });
    var modo = el('div', { class: 'segmenti', role: 'tablist', 'aria-label': 'Tabelle' });

    function testProva() {
      var x = { tipo: misura.value === 'num' ? 'numero' : 'tempo', migliore: migliore.value, unita: unita.value };
      if (x.tipo === 'tempo') x.formatoTempo = misura.value;
      return x;
    }

    function disegnaTab() {
      App.U.svuota(modo); App.U.svuota(zonaTab);
      [[true, 'Una per fascia'], [false, 'Una per tutte le classi']].forEach(function (m) {
        modo.appendChild(el('button', { type: 'button', class: 'segmento' + (perFascia === m[0] ? ' attivo' : ''), text: m[1],
          onclick: function () { perFascia = m[0]; disegnaTab(); } }));
      });
      (perFascia ? App.Config.fasce : [{ id: 'unica', nome: 'Uguale per tutte le classi' }]).forEach(function (f) {
        var tab = tabelle[f.id];
        zonaTab.appendChild(el('div', { class: 'tabella-zona' }, el('table', { class: 'tabella tabella-parametri', 'data-fascia': f.id },
          el('caption', { text: '📏 ' + f.nome }),
          el('thead', {}, el('tr', {}, el('th', { text: 'Voto' }), el('th', { text: '♂ soglia' }), el('th', { text: '♀ soglia' }))),
          el('tbody', {}, VOTI.map(function (v) {
            tab[v] = tab[v] || { M: '', F: '' };
            function cella(sx) {
              var i = el('input', { type: 'text', inputmode: 'decimal', class: 'soglia', value: tab[v][sx], 'aria-label': f.nome + ' voto ' + v + (sx === 'M' ? ' alunni' : ' alunne') });
              i.addEventListener('input', function () { tab[v][sx] = i.value; });
              return el('td', {}, i);
            }
            return el('tr', {}, el('th', { text: String(v) }), cella('M'), cella('F'));
          }).concat([el('tr', {}, el('th', { text: '4' }), el('td', { colspan: 2, class: 'piccolo', text: 'oltre l\'ultima soglia scritta' }))])))));
      });
    }
    disegnaTab();

    function salva() {
      var x = testProva(), libroDest = libro;
      x.nome = nome.value; x.tipologia = tipologia.value; x.strumento = App.U.spazi(strumento.value);
      if (x.tipo !== 'numero') delete x.unita; else x.unita = App.U.spazi(unita.value);
      campi.forEach(function (c) { var v = App.U.spazi(c.nodo.value); if (v) x[c.id] = v; });
      x.fonte = App.U.spazi(fonte.value);
      if (t.negativi) x.negativi = true;
      var errore = null;
      function tabella(chiave, etichetta) {
        var righe = VOTI.map(function (v) { return { voto: v, M: tabelle[chiave][v].M, F: tabelle[chiave][v].F }; });
        var r = App.Voti.controlla(x, righe);
        if (r.errore) { errore = etichetta + ': ' + r.errore; return null; }
        if (!r.righe.length) return null;
        r.righe.push({ voto: App.Config.voti.min, M: comodo(x), F: comodo(x) });
        return { righe: r.righe };
      }
      if (perFascia) {
        x.fasce = {};
        App.Config.fasce.forEach(function (f) { var tb = !errore && tabella(f.id, f.nome); if (tb) x.fasce[f.id] = tb; });
        if (!errore && !Object.keys(x.fasce).length) errore = 'Scrivi almeno una tabella dei voti (anche di una sola fascia).';
      } else {
        x.voti = tabella('unica', 'Tabella');
        if (!errore && !x.voti) errore = 'Scrivi la tabella dei voti.';
      }
      if (errore) { App.Avvisi.toast('❌ ' + errore, 'errore', 7000); return false; }
      var r = App.Libri.salvaTest(libroDest, x, vecchio);
      if (r.errore) { App.Avvisi.toast('❌ ' + r.errore, 'errore', 5000); return false; }
      App.Stato.salva();
      App.Stato.dati.preferenze.libroAperto = libroDest.id;
      App.UI.disegnaContenuto();
      App.Avvisi.toast('✔ "' + r.test.nome + '" salvato in "' + libroDest.nome + '".', 'ok', 4000);
    }

    App.Finestra.apri({
      titolo: (vecchio ? 'Modifica – ' + vecchio.nome : 'Nuovo test') + ' · ' + libro.nome, icona: '📖', larga: true, fuoco: !vecchio,
      corpo: el('div', { class: 'modulo finestra-test-libro' },
        el('label', { class: 'campo' }, el('span', { text: 'Nome' }), nome),
        el('div', { class: 'riga-campi' },
          el('label', { class: 'campo' }, el('span', { text: 'Tipologia' }), tipologia),
          el('label', { class: 'campo' }, el('span', { text: 'Misura' }), misura),
          el('label', { class: 'campo' }, el('span', { text: 'Unità (per i numeri)' }), unita),
          el('label', { class: 'campo' }, el('span', { text: 'Che cosa è meglio' }), migliore),
          el('label', { class: 'campo' }, el('span', { text: 'Strumento' }), strumento)),
        el('h4', { text: '📏 Tabelle dei voti' }), modo,
        el('p', { class: 'piccolo', text: 'Scrivi le soglie che hai (anche solo 10, 8, 6 e 5): tra una e l\'altra il voto si calcola in proporzione. Le righe vuote non contano.' }),
        zonaTab,
        el('h4', { text: '📝 Scheda' }),
        campi.map(function (c) { return el('label', { class: 'campo' }, el('span', { text: c.nome }), c.nodo); }),
        el('label', { class: 'campo' }, el('span', { text: 'Fonte' }), fonte)),
      pulsanti: [{ testo: 'Annulla', tipo: 'neutro' }, { testo: '✔ Salva', tipo: 'ok', azione: salva }]
    });
  }

  App.UI.FinestraTestLibro = {
    apri: function (libro, t) { apri(libro, t, null); },
    // Copia di un test (di un altro libro) in un libro del docente: si sceglie il libro se sono più d'uno
    copia: function (t) {
      var miei = App.Libri.miei();
      if (!miei.length) { App.Avvisi.toast('Prima crea un tuo libro con "➕ Nuovo libro".', 'info', 4000); return; }
      var base = App.U.copia(t);
      base.fonte = t.fonte ? 'Da: ' + t.fonte : '';
      if (miei.length === 1) { apri(miei[0], null, base); return; }
      var s = el('select', { 'aria-label': 'In quale libro' }, miei.map(function (l) { return el('option', { value: l.id, text: l.nome }); }));
      App.Finestra.apri({ titolo: 'Copia "' + t.nome + '"', icona: '📋', corpo: el('label', { class: 'campo' }, el('span', { text: 'In quale tuo libro?' }), s),
        pulsanti: [{ testo: 'Annulla', tipo: 'neutro' }, { testo: 'Avanti', tipo: 'ok', azione: function () { setTimeout(function () { apri(App.Libri.trova(s.value), null, base); }, 0); } }] });
    }
  };
})(window.App = window.App || {});
