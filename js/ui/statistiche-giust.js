/* statistiche-giust.js (ui)
 * Cosa fa: scheda 📈 Statistiche giustificazioni: per l'anno scolastico e il mese scelto
 *          (o tutto l'anno) quante giustificazioni ha ogni alunno/alunna e di che tipologia;
 *          totali della classe (anche ♂/♀), grafico per mese e per tipologia.
 * Dipende da: App.U, App.Stato, App.Config (simboli), App.Calendario, App.StatGiust,
 *             App.UI.Grafici, App.UI.TabellaGiust (barraAnno), App.UI.vuoto
 * Usato da: ui/pagina.js
 */
(function (App) {
  'use strict';

  App.UI = App.UI || {};
  var el = function () { return App.U.el.apply(null, arguments); };

  function pref() { return App.Stato.dati.preferenze; }

  function riquadro(etichetta, valore, nota) {
    return el('div', { class: 'tessera' },
      el('span', { class: 'tessera-etichetta', text: etichetta }),
      el('span', { class: 'tessera-valore', text: valore }),
      nota ? el('span', { class: 'tessera-nota', text: nota }) : null);
  }

  function sezione(titolo, contenuto) {
    return el('section', { class: 'sezione-stat' }, el('h3', { text: titolo }), contenuto);
  }

  function imposta(k, v) { pref()[k] = v; App.Stato.scrivi(); App.UI.disegnaContenuto(); }

  // Tabella: una riga per alunno, una colonna per tipologia + totale
  function tabellaAlunni(righe) {
    var simboli = App.Config.simboli;
    return el('div', { class: 'tabella-zona tabella-statg-zona' },
      el('table', { class: 'tabella tabella-statg' },
        el('thead', {}, el('tr', {},
          el('th', { class: 'col-nome', text: 'Alunno' }),
          simboli.map(function (s) { return el('th', { class: 'col-simbolo', title: s.nome, text: s.icona }); }),
          el('th', { class: 'col-tot', text: 'Tot.' }))),
        el('tbody', {}, righe.map(function (r, i) {
          return el('tr', { class: r.tot ? '' : 'senza' },
            el('th', { class: 'col-nome', scope: 'row' }, el('span', { class: 'num', text: (i + 1) + '.' }), ' ' + r.alunno.nome,
              r.alunno.sesso ? el('span', { class: 'sesso', text: ' ' + App.Config.sessi[r.alunno.sesso].icona }) : null),
            simboli.map(function (s) { return el('td', { class: 'cella num-cella', text: r[s.id] ? String(r[s.id]) : '–' }); }),
            el('td', { class: 'cella col-tot' + (r.tot ? ' con-tot' : ''), text: String(r.tot) }));
        }))));
  }

  App.UI.StatisticheGiust = {
    disegna: function (cont, classe) {
      var anno = App.Calendario.annoAttivo(), mesi = App.Calendario.mesi(anno);
      var chiave = mesi.some(function (m) { return m.chiave === pref().statgMese; }) ? pref().statgMese : '';
      var meseScelto = mesi.filter(function (m) { return m.chiave === chiave; })[0];
      var periodo = meseScelto ? meseScelto.nome + ' ' + meseScelto.anno : 'tutto l\'anno ' + App.Calendario.etichetta(anno);

      var sceltaMese = el('select', { 'aria-label': 'Mese', value: chiave, onchange: function (ev) { imposta('statgMese', ev.target.value); } },
        el('option', { value: '', text: 'Tutto l\'anno' }),
        mesi.map(function (m) { return el('option', { value: m.chiave, text: m.nome + ' ' + m.anno }); }));
      var ordine = el('div', { class: 'segmenti', role: 'tablist', 'aria-label': 'Ordine' },
        [['nome', 'A–Z'], ['tot', 'Più giustificati']].map(function (o) {
          return el('button', { type: 'button', class: 'segmento' + (pref().statgOrdine === o[0] ? ' attivo' : ''), text: o[1],
            'aria-pressed': pref().statgOrdine === o[0] ? 'true' : 'false', onclick: function () { imposta('statgOrdine', o[0]); } });
        }));
      cont.appendChild(el('div', { class: 'strumenti' }, App.UI.TabellaGiust.barraAnno(anno),
        el('label', { class: 'scelta-test' }, el('span', { text: 'Mese' }), sceltaMese), ordine));

      if (!classe.alunni.length) {
        cont.appendChild(App.UI.vuoto('👥', 'Nessun alunno in ' + classe.nome, 'Le statistiche compaiono quando la classe ha alunni e giustificazioni.'));
        return;
      }

      var righe = App.StatGiust.perAlunno(classe, anno, chiave);
      var tot = App.StatGiust.totali(righe);
      if (pref().statgOrdine === 'tot') righe = righe.slice().sort(function (a, b) { return b.tot - a.tot || App.U.confronta(a.alunno.nome, b.alunno.nome); });

      // Riepilogo
      cont.appendChild(sezione('Giustificazioni – ' + periodo, el('div', { class: 'tessere' },
        riquadro('Totale', String(tot.tot)),
        riquadro('Alunni con almeno una', tot.conAlmenoUna + ' / ' + righe.length),
        riquadro('Media per alunno', String(tot.mediaPerAlunno).replace('.', ',')),
        riquadro('♂ Alunni', String(tot.M)),
        riquadro('♀ Alunne', String(tot.F)))));

      // Per tipologia
      cont.appendChild(sezione('Per tipologia – ' + periodo, tot.tot
        ? App.UI.Grafici.barre(App.Config.simboli.map(function (s) {
          return { etichetta: s.icona + ' ' + s.nome, valore: tot[s.id], testo: String(tot[s.id]), tipo: 'buono',
            titolo: s.nome + ': ' + tot[s.id] + ' (' + (tot.tot ? Math.round(tot[s.id] / tot.tot * 100) : 0) + '%)' };
        }), { descrizione: 'Giustificazioni per tipologia' })
        : el('p', { class: 'piccolo', text: 'Nessuna giustificazione in questo periodo.' })));

      // Per mese (sempre tutto l'anno: il mese scelto è evidenziato)
      var pm = App.StatGiust.perMese(classe, anno);
      cont.appendChild(sezione('Per mese – anno ' + App.Calendario.etichetta(anno),
        App.UI.Grafici.colonne(pm.map(function (x) {
          return { etichetta: x.mese.breve, valore: x.tot, tipo: x.mese.chiave === chiave ? 'scelto' : 'buono',
            titolo: x.mese.nome + ' ' + x.mese.anno + ': ' + x.tot + ' giustificazioni' +
              App.Config.simboli.filter(function (s) { return x[s.id]; }).map(function (s) { return ' · ' + s.icona + ' ' + x[s.id]; }).join('') };
        }), { asse: 'Giustificazioni della classe in ogni mese' + (meseScelto ? ' · in evidenza ' + meseScelto.nome : ''), descrizione: 'Giustificazioni per mese' })));

      // Per alunno
      cont.appendChild(sezione('Per alunno – ' + periodo, el('div', {},
        tabellaAlunni(righe),
        el('p', { class: 'piccolo', text: App.Config.simboli.map(function (s) { return s.icona + ' ' + s.nome; }).join(' · ') }))));
    }
  };
})(window.App = window.App || {});
