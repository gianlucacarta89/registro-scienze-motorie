/* finestra-voti.js
 * Cosa fa: finestra "Tabella dei voti" di un test: si copiano i parametri di riferimento
 *          (es. del libro di testo), una riga per voto, con la soglia per alunni (♂) e alunne (♀).
 *          Le soglie partono vuote; le righe senza soglie si ignorano.
 *          "📖 Riempi dal libro": prende la tabella di un test del libro compatibile (stesso tipo e
 *          stessa direzione), della fascia della classe; salvando arriva anche la scheda (campi vuoti).
 * Dipende da: App.U, App.Config (voti, fasce), App.TestLibro, App.SchedaTest, App.Voti, App.ElencoTest, App.Stato, App.Avvisi, App.Finestra,
 *             App.UI.disegnaContenuto
 * Usato da: ui/finestra-test.js (pulsante 📏 Tabella dei voti)
 */
(function (App) {
  'use strict';

  App.UI = App.UI || {};
  var el = function () { return App.U.el.apply(null, arguments); };

  // Parole di un nome di test, con qualche sinonimo (medball = palla medica, m = metri, velocità = sprint)
  var SINONIMI = { medball: 'palla medica', mb: 'palla medica', m: 'metri', mt: 'metri', velocita: 'sprint', addominali: 'addominali sit',
    flessibilita: 'flessibilita', navetta: 'navetta', funicella: 'funicella', corda: 'funicella', piegamenti: 'piegamenti', flessioni: 'piegamenti' };
  function parole(n) {
    var l = String(n || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[^a-z0-9]+/);
    return l.map(function (w) { return SINONIMI[w] || w; }).join(' ').split(' ')
      .filter(function (w) { return w.length > 2 || /^[0-9]+$/.test(w); });
  }

  // Test del libro compatibili con t (stesso tipo e direzione), il più simile per primo
  function compatibili(t) {
    var mie = parole(t.nome);
    return (App.TestLibro || []).filter(function (p) { return p.tipo === t.tipo && p.migliore === t.migliore; })
      .map(function (p) {
        var punti = parole(p.nome).filter(function (w) { return mie.some(function (m) { return m === w || (m.length > 4 && w.indexOf(m.slice(0, 5)) === 0); }); }).length * 2 +
          (App.U.chiaveNome(p.tipologia) === App.U.chiaveNome(t.tipologia || '') ? 1 : 0);
        return { p: p, punti: punti };
      })
      .sort(function (a, b) { return b.punti - a.punti || a.p.nome.localeCompare(b.p.nome); });
  }

  App.UI.FinestraVoti = {
    apri: function (classe, t) {
      var corpo = el('tbody');
      var esistenti = (t.voti && t.voti.righe) || [];
      var iniziali = esistenti.length ? esistenti : App.Config.voti.righeIniziali.map(function (v) { return { voto: v, M: '', F: '' }; });
      var direzione = t.migliore === 'alto' ? 'almeno' : 'al massimo';
      var esempio = t.tipo === 'tempo' ? { sec: 'secondi e decimi, es. 12,8', min: 'minuti:secondi, es. 3:45', auto: 'es. 3:45 o 12,8' }[App.Test.formato(t)] : (t.unita || 'valore');

      function riga(r) {
        var sel = el('select', { 'aria-label': 'Voto', value: r.voto === undefined ? '' : String(r.voto) },
          el('option', { value: '', text: '–' }),
          App.Voti.scala().map(function (v) { return el('option', { value: String(v), text: App.Voti.testo(v) }); }));
        var tr = el('tr', {},
          el('td', {}, sel),
          el('td', {}, el('input', { type: 'text', class: 'soglia', 'data-s': 'M', value: r.M || '', inputmode: App.Test.formato(t) === 'auto' || t.negativi ? 'text' : 'decimal', 'aria-label': 'Soglia alunni' })),
          el('td', {}, el('input', { type: 'text', class: 'soglia', 'data-s': 'F', value: r.F || '', inputmode: App.Test.formato(t) === 'auto' || t.negativi ? 'text' : 'decimal', 'aria-label': 'Soglia alunne' })),
          el('td', {}, el('button', { type: 'button', class: 'btn btn-neutro piccolo-btn', 'aria-label': 'Togli riga', text: '✕',
            onclick: function () { tr.remove(); } })));
        return tr;
      }
      iniziali.forEach(function (r) { corpo.appendChild(riga(r)); });

      // 📖 Riempi dal libro
      var daLibro = null;
      var lista = compatibili(t);
      var zonaLibro = null;
      if (lista.length && !classe.elenco) {
        var scegliLibro = el('select', { 'aria-label': 'Test del libro' }, lista.map(function (x, i) {
          return el('option', { value: String(i), text: x.p.nome + ' · ' + x.p.tipologia });
        }));
        var fascia = el('select', { 'aria-label': 'Fascia della tabella del libro' },
          App.Config.fasce.map(function (f) { return el('option', { value: f.id, text: f.nome }); }));
        fascia.value = App.SchedaTest.fasciaDiClasse(classe) || 'b1';
        var zonaFascia = el('label', { class: 'scelta-fascia' }, el('span', { class: 'piccolo', text: 'Fascia: ' }), fascia);
        function aggiornaFascia() { zonaFascia.style.display = lista[Number(scegliLibro.value)].p.fasce ? '' : 'none'; }
        scegliLibro.addEventListener('change', aggiornaFascia);
        aggiornaFascia();
        zonaLibro = el('div', { class: 'riquadro-libro' },
          el('p', { class: 'piccolo' }, el('b', { text: '📖 Stessa prova di un test del libro? ' }), 'Sceglilo e riempi la tabella con i suoi voti (i tuoi risultati restano).'),
          el('div', { class: 'riga-btn sinistra' }, scegliLibro, zonaFascia,
            el('button', { type: 'button', class: 'btn btn-info piccolo-btn', text: '📖 Riempi dal libro', onclick: function () {
              var p = lista[Number(scegliLibro.value)].p;
              var f = p.fasce ? fascia.value : null;
              var tab = p.fasce ? p.fasce[f] : p.voti;
              App.U.svuota(corpo);
              tab.righe.forEach(function (x) { corpo.appendChild(riga(x)); });
              daLibro = { p: p, fascia: f };
              App.Avvisi.toast('📖 Tabella di "' + p.nome + '"' + (f ? ' (' + App.SchedaTest.fascia(f).nome + ')' : '') + ' inserita: controlla e tocca ✔ Salva tabella.', 'info', 5000);
            } })));
      }

      function leggi() {
        return Array.prototype.map.call(corpo.querySelectorAll('tr'), function (tr) {
          return { voto: tr.querySelector('select').value, M: tr.querySelector('[data-s=M]').value, F: tr.querySelector('[data-s=F]').value };
        });
      }

      var contenuto = el('div', { class: 'finestra-voti' },
        zonaLibro,
        el('p', { class: 'piccolo', text: 'Copia la tabella del libro: per ogni voto scrivi il risultato ' + direzione +
          ' necessario (' + esempio + '), separato per alunni e alunne. Un risultato peggiore dell\'ultima riga prende il voto più basso della tabella. Le righe vuote non contano.' }),
        el('div', { class: 'tabella-zona tabella-voti-zona' },
          el('table', { class: 'tabella tabella-voti' },
            el('thead', {}, el('tr', {},
              el('th', { text: 'Voto' }),
              el('th', { text: '♂ Alunni (' + direzione + ')' }),
              el('th', { text: '♀ Alunne (' + direzione + ')' }),
              el('th', { text: '' }))),
            corpo)),
        el('div', { class: 'riga-btn sinistra' },
          el('button', { type: 'button', class: 'btn btn-neutro piccolo-btn', text: '➕ Aggiungi riga (es. mezzo voto)',
            onclick: function () { corpo.appendChild(riga({})); } })),
        el('p', { class: 'piccolo', text: 'Per età diverse (prima, quinta…) ogni classe ha la sua tabella: con "📋 Copia test" la porti in un\'altra classe e poi la correggi.' }));

      App.Finestra.apri({
        titolo: 'Tabella dei voti – ' + t.nome, icona: '📏', corpo: contenuto, larga: true, fuoco: false,
        pulsanti: [
          { testo: '🗑️ Svuota', tipo: 'pericolo', azione: function () {
            App.Avvisi.conferma({ titolo: 'Svuotare la tabella dei voti?', pericolo: true, testoOk: '🗑️ Svuota',
              testo: 'I voti di "' + t.nome + '" non saranno più calcolati. I risultati restano.' })
              .then(function (si) {
                if (!si) return;
                App.U.svuota(corpo);
                App.Config.voti.righeIniziali.forEach(function (v) { corpo.appendChild(riga({ voto: v })); });
              });
            return false;
          } },
          { testo: 'Annulla', tipo: 'neutro' },
          { testo: '✔ Salva tabella', tipo: 'ok', azione: function () {
            var r = App.Voti.controlla(t, leggi());
            if (r.errore) { App.Avvisi.toast('❌ ' + r.errore, 'errore', 7000); return false; }
            t.voti = { righe: r.righe };
            if (daLibro) {
              // dal libro: fascia della tabella e scheda del test (solo nei campi ancora vuoti)
              if (daLibro.fascia) t.fasciaVoti = daLibro.fascia; else delete t.fasciaVoti;
              App.SchedaTest.campi().forEach(function (c) { if (!t[c.id] && daLibro.p[c.id]) t[c.id] = daLibro.p[c.id]; });
              if (!t.fonte && daLibro.p.fonte) t.fonte = daLibro.p.fonte;
              if (daLibro.p.negativi) t.negativi = true;
            }
            // tabella di un test di classe: si aggiorna anche la sua copia nell'elenco 📚 (se collegata)
            if (classe.elenco) App.ElencoTest.stacca(t); else App.ElencoTest.aggiorna(classe, t);
            App.Stato.salva();
            App.UI.disegnaContenuto();
            App.Avvisi.toast(r.righe.length ? '✔ Tabella salvata: ' + r.righe.length + ' voti.' : 'Tabella vuota: nessun voto automatico.', 'ok', 4000);
          } }
        ]
      });
    }
  };
})(window.App = window.App || {});
