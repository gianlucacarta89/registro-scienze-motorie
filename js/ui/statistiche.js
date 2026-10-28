/* statistiche.js (ui)
 * Cosa fa: scheda 📈 Statistiche della classe: scelta del test e della prova, riquadri con
 *          svolti / media / migliore / peggiore (anche ♂ e ♀), grafico di quanti alunni per voto,
 *          miglioramenti 1ª → 2ª prova, media voti della classe per ogni test,
 *          primi 3 alunni e alunne di ogni test (per scegliere chi mandare ai giochi studenteschi).
 * Dipende da: App.U, App.Stato, App.Config, App.Statistiche, App.Voti, App.UI.Grafici,
 *             App.UI.FinestraVoti, App.UI.vuoto
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

  // Elenco dei primi di un sesso per un test
  function listaPrimi(classe, t, sesso) {
    var l = App.Statistiche.primi(classe, t, sesso, 3), sx = App.Config.sessi[sesso];
    var medaglie = ['🥇', '🥈', '🥉'];
    return el('div', { class: 'primi-gruppo' },
      el('h5', { text: sx.icona + ' ' + (sesso === 'M' ? 'Alunni' : 'Alunne') }),
      l.length ? el('ol', { class: 'primi-lista' }, l.map(function (r) {
        return el('li', {},
          el('span', { class: 'primi-posto', text: medaglie[r.posto - 1] || r.posto + '.' }),
          el('span', { class: 'primi-nome', text: r.alunno.nome }),
          el('span', { class: 'primi-valore', text: App.Statistiche.testoValore(t, r.n) +
            (r.voto !== null ? ' · voto ' + App.Voti.testo(r.voto) : '') + ' · ' + r.prova.nome }));
      })) : el('p', { class: 'piccolo', text: 'Nessun risultato.' }));
  }

  function sezionePrimi(classe) {
    var senza = classe.alunni.filter(function (a) { return !a.sesso; }).length;
    return sezione('🏅 Primi 3 di ogni test – alunni e alunne (giochi studenteschi)', el('div', {},
      el('p', { class: 'piccolo', text: 'Per ogni alunno conta il suo miglior risultato tra le prove svolte (1ª, 2ª, 3ª). A pari risultato stessa posizione.' }),
      senza ? el('p', { class: 'piccolo avviso-riga', text: '⚠️ ' + senza + (senza === 1 ? ' alunno senza' : ' alunni senza') + ' ♂/♀ non ' + (senza === 1 ? 'compare' : 'compaiono') + ': indicalo in 👥 Alunni.' }) : null,
      el('div', { class: 'primi-griglia' }, classe.test.map(function (t) {
        return el('div', { class: 'primi-test' },
          el('h4', { text: t.nome }, t.tipologia ? el('span', { class: 'piccolo', text: ' · ' + t.tipologia }) : null),
          el('div', { class: 'primi-sessi' }, listaPrimi(classe, t, 'M'), listaPrimi(classe, t, 'F')));
      }))));
  }

  function percento(a, b) { return b ? Math.round(a / b * 100) + '%' : '–'; }

  App.UI.Statistiche = {
    disegna: function (cont, classe) {
      if (!classe.test.length || !classe.alunni.length) {
        cont.appendChild(App.UI.vuoto('📈', 'Ancora niente da mostrare',
          'Le statistiche compaiono quando la classe ha alunni, test e risultati.'));
        return;
      }
      var t = classe.test.filter(function (x) { return x.id === pref().statTest; })[0] || classe.test[0];
      var prova = [1, 2, 3].indexOf(pref().prova) >= 0 ? pref().prova : 1;
      var S = App.Statistiche, s = S.test(classe, t, prova), V = function (n) { return S.testoValore(t, n); };

      var scelta = el('select', { 'aria-label': 'Test', value: t.id, onchange: function (ev) {
        pref().statTest = ev.target.value; App.Stato.scrivi(); App.UI.disegnaContenuto();
      } }, classe.test.map(function (x) { return el('option', { value: x.id, text: x.nome }); }));
      var prove = el('div', { class: 'segmenti', role: 'tablist', 'aria-label': 'Prova' }, App.Config.prove.map(function (p) {
        return el('button', { type: 'button', class: 'segmento' + (prova === p.id ? ' attivo' : ''), text: p.nome,
          'aria-pressed': prova === p.id ? 'true' : 'false',
          onclick: function () { pref().prova = p.id; App.Stato.scrivi(); App.UI.disegnaContenuto(); } });
      }));
      cont.appendChild(el('div', { class: 'strumenti' }, el('label', { class: 'scelta-test' }, el('span', { text: 'Test' }), scelta), prove));

      // Riepilogo del test
      cont.appendChild(sezione(t.nome + (t.tipologia ? ' · ' + t.tipologia : '') + ' – ' + App.Config.prove[prova - 1].nome,
        el('div', { class: 'tessere' },
          riquadro('Hanno svolto', s.svolti + ' / ' + s.totale, percento(s.svolti, s.totale)),
          riquadro('Media', V(s.media)),
          riquadro('Migliore', V(s.migliore)),
          riquadro('Peggiore', V(s.peggiore)),
          riquadro('♂ Media alunni', V(s.M.media), s.M.svolti + ' svolti'),
          riquadro('♀ Media alunne', V(s.F.media), s.F.svolti + ' svolti'))));

      // Distribuzione dei voti
      var votiCont;
      if (!s.tabella) {
        votiCont = el('div', { class: 'suggerimento' }, 'Questo test non ha ancora la tabella dei voti. ',
          el('button', { type: 'button', class: 'btn btn-info piccolo-btn', text: '📏 Inserisci tabella',
            onclick: function () { App.UI.FinestraVoti.apri(classe, t); } }));
      } else if (!s.conVoto) {
        votiCont = el('p', { class: 'piccolo', text: s.senzaSesso ? 'Indica ♂/♀ degli alunni (👥 Alunni) per calcolare i voti.' : 'Nessun voto: mancano i risultati di questa prova.' });
      } else {
        votiCont = el('div', {},
          el('div', { class: 'tessere' },
            riquadro('Media voti', App.Voti.testo(s.mediaVoti)),
            riquadro('Sufficienti (≥ ' + App.Config.voti.sufficienza + ')', s.sufficienti + ' / ' + s.conVoto, percento(s.sufficienti, s.conVoto))),
          App.UI.Grafici.colonne(s.distribuzione.map(function (d) {
            return { etichetta: String(d.voto), valore: d.quanti, tipo: d.voto >= App.Config.voti.sufficienza ? 'buono' : 'scarso',
              titolo: 'Voto ' + d.voto + (d.voto < App.Config.voti.max ? ' (e ' + d.voto + ',5)' : '') + ': ' + d.quanti + (d.quanti === 1 ? ' alunno' : ' alunni') };
          }), { asse: 'Voto (il mezzo voto conta nel voto intero) · in rosso le insufficienze', descrizione: 'Quanti alunni per ogni voto' }),
          s.senzaSesso ? el('p', { class: 'piccolo avviso-riga', text: '⚠️ ' + s.senzaSesso + (s.senzaSesso === 1 ? ' risultato senza voto' : ' risultati senza voto') + ': manca ♂/♀ dell\'alunno (👥 Alunni).' }) : null);
      }
      cont.appendChild(sezione('Quanti alunni per ogni voto', votiCont));

      // Andamento nelle prove (anche la 3ª, se svolta)
      var an = S.andamento(classe, t).filter(function (x) { return x.svolti; });
      if (an.length > 1) {
        var conVoti = s.tabella && an.every(function (x) { return x.mediaVoti !== null; });
        cont.appendChild(sezione('Andamento della classe nelle prove', el('div', {},
          el('div', { class: 'tessere' }, an.map(function (x) {
            return riquadro(x.prova.nome, V(x.media), x.svolti + ' svolti' + (x.mediaVoti !== null ? ' · voto medio ' + App.Voti.testo(x.mediaVoti) : ''));
          })),
          App.UI.Grafici.colonne(an.map(function (x) {
            var val = conVoti ? x.mediaVoti : x.media;
            return { etichetta: x.prova.nome, valore: val, testo: conVoti ? App.Voti.testo(val) : V(val), tipo: 'buono',
              titolo: x.prova.nome + ': media ' + V(x.media) + (x.mediaVoti !== null ? ', voto medio ' + App.Voti.testo(x.mediaVoti) : '') };
          }), { asse: conVoti ? 'Voto medio della classe in ogni prova' : 'Risultato medio della classe in ogni prova', descrizione: 'Andamento nelle prove' }))));
      }

      // Miglioramenti
      var m = S.miglioramenti(classe, t);
      cont.appendChild(sezione('Dalla 1ª all\'ultima prova svolta', m.confrontabili ? el('div', { class: 'tessere' },
        riquadro('⬆ Migliorati', String(m.meglio), percento(m.meglio, m.confrontabili)),
        riquadro('⬇ Peggiorati', String(m.peggio), percento(m.peggio, m.confrontabili)),
        riquadro('= Uguali', String(m.uguale), percento(m.uguale, m.confrontabili)),
        riquadro('Con almeno due prove', m.confrontabili + ' / ' + classe.alunni.length))
        : el('p', { class: 'piccolo', text: 'Servono alunni con il risultato della 1ª prova e di una prova successiva (2ª o 3ª).' })));

      // Media voti per test
      var mv = S.mediaVotiPerTest(classe, prova).filter(function (x) { return x.media !== null; });
      cont.appendChild(sezione('Media voti della classe per test – ' + App.Config.prove[prova - 1].nome, mv.length
        ? App.UI.Grafici.barre(mv.map(function (x) {
          return { etichetta: x.test.nome, valore: x.media, testo: App.Voti.testo(x.media),
            tipo: x.media >= App.Config.voti.sufficienza ? 'buono' : 'scarso', titolo: x.test.nome + ': media ' + App.Voti.testo(x.media) + ' (' + x.quanti + ' voti)' };
        }), { max: App.Config.voti.max, riferimento: App.Config.voti.sufficienza, nota: 'Scala 0–10 · la linea segna la sufficienza (' + App.Config.voti.sufficienza + ')', descrizione: 'Media voti per test' })
        : el('p', { class: 'piccolo', text: 'Compare quando almeno un test ha la tabella dei voti e dei risultati.' })));

      // Primi 3 di ogni test, alunni e alunne
      cont.appendChild(sezionePrimi(classe));
    }
  };
})(window.App = window.App || {});
