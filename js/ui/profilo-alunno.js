/* profilo-alunno.js
 * Cosa fa: sezione "🕸️ Profilo dell'alunno" delle 📈 Statistiche (pagina 📚 Test): grafico a ragnatela
 *          (SVG, senza librerie) con la media dei voti per capacità nella prova scelta; dalla 2ª prova
 *          in poi c'è anche la 1ª prova tratteggiata per vedere i progressi. Sotto, i voti test per test.
 * Dipende da: App.U, App.Stato, App.Config (capacita, voti, prove), App.Profilo, App.Voti, App.UI.FinestraVoti
 * Usato da: ui/statistiche.js
 */
(function (App) {
  'use strict';

  App.UI = App.UI || {};
  var el = function () { return App.U.el.apply(null, arguments); };
  var NS = 'http://www.w3.org/2000/svg';
  var MIN = 2;        // centro del grafico (sotto il voto più basso, 4, così il 4 si vede)

  function svg(nome, attr, figli) {
    var n = document.createElementNS(NS, nome);
    Object.keys(attr || {}).forEach(function (k) { n.setAttribute(k, attr[k]); });
    (figli || []).forEach(function (f) { if (f) n.appendChild(f); });
    return n;
  }

  // serie: [{ valori: [voto|null per asse], classe: 'serie-ora'|'serie-prima' }]
  function ragnatela(assi, serie, descrizione) {
    var L = 440, H = 320, cx = L / 2, cy = 160, R = 118, n = assi.length;
    var max = App.Config.voti.max;
    function punto(i, v) {
      var a = -Math.PI / 2 + i * 2 * Math.PI / n, r = R * Math.max(0, (v - MIN)) / (max - MIN);
      return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    }
    function poligono(valori) {
      return valori.map(function (v, i) { return punto(i, v === null ? MIN : v).map(function (x) { return x.toFixed(1); }).join(','); }).join(' ');
    }
    var parti = [];
    [4, 6, 8, 10].forEach(function (v) {
      parti.push(svg('polygon', { points: poligono(assi.map(function () { return v; })),
        class: 'anello' + (v === App.Config.voti.sufficienza ? ' sufficienza' : '') }));
      var p = punto(0, v);
      parti.push(svg('text', { x: p[0] + 4, y: p[1] + 4, class: 'tacca' }, [document.createTextNode(String(v))]));
    });
    assi.forEach(function (a, i) {
      var fine = punto(i, max), testo = punto(i, max + 1.6);
      parti.push(svg('line', { x1: cx, y1: cy, x2: fine[0], y2: fine[1], class: 'raggio' }));
      var ancora = Math.abs(testo[0] - cx) < 10 ? 'middle' : testo[0] > cx ? 'start' : 'end';
      parti.push(svg('text', { x: testo[0], y: testo[1], 'text-anchor': ancora, class: 'etichetta-asse' }, [
        svg('tspan', { x: testo[0], dy: '0' }, [document.createTextNode(a.nome)]),
        svg('tspan', { x: testo[0], dy: '1.2em', class: 'valore-asse' }, [document.createTextNode(a.testo)])]));
    });
    serie.forEach(function (s) {
      parti.push(svg('polygon', { points: poligono(s.valori), class: s.classe }));
      s.valori.forEach(function (v, i) {
        if (v === null) return;
        var p = punto(i, v);
        parti.push(svg('circle', { cx: p[0], cy: p[1], r: 4, class: s.classe + ' punto' }));
      });
    });
    return svg('svg', { viewBox: '0 0 ' + L + ' ' + H, class: 'ragnatela', role: 'img', 'aria-label': descrizione }, parti);
  }

  App.UI.ProfiloAlunno = {
    disegna: function (classe, prova) {
      var pref = App.Stato.dati.preferenze;
      var a = classe.alunni.filter(function (x) { return x.id === pref.statAlunno; })[0] || classe.alunni[0];
      var nomeProva = App.Config.prove[prova - 1].nome;
      var scelta = el('select', { 'aria-label': 'Alunno', value: a.id, onchange: function (ev) {
        pref.statAlunno = ev.target.value; App.Stato.scrivi(); App.UI.disegnaContenuto();
      } }, classe.alunni.map(function (x) {
        return el('option', { value: x.id, text: x.nome + (x.sesso ? ' ' + App.Config.sessi[x.sesso].icona : '') });
      }));
      var testa = el('label', { class: 'scelta-test' }, el('span', { text: 'Alunno' }), scelta);
      var caps = App.Profilo.capacitaClasse(classe);

      if (caps.length < 3) {
        // Per ogni capacità: quanti test ci sono e quali non hanno la tabella dei voti
        var senzaTab = classe.test.filter(function (t) { return App.Profilo.capacitaDi(t) && !App.Voti.haTabella(t); });
        var senzaCap = classe.test.filter(function (t) { return !App.Profilo.capacitaDi(t); });
        return el('div', {}, testa,
          el('p', { class: 'piccolo', text: 'Il grafico mette su ogni asse la media dei voti di una capacità: servono test di almeno 3 capacità (' +
            App.Config.capacita.map(function (c) { return c.nome.toLowerCase(); }).join(', ') + ') con la tabella dei voti. ' +
            'Ora ' + (caps.length ? 'sono pronte: ' + caps.map(function (c) { return c.nome.toLowerCase(); }).join(', ') : 'non è pronta nessuna capacità') + '.' }),
          senzaTab.length ? el('div', { class: 'suggerimento' },
            el('p', { text: '📏 Questi test non hanno la tabella dei voti, quindi non danno voti:' }),
            el('ul', { class: 'lista-mancanti' }, senzaTab.map(function (t) {
              return el('li', {}, el('b', { text: t.nome }), ' (' + App.Profilo.capacitaDi(t).nome.toLowerCase() + ') ',
                el('button', { type: 'button', class: 'btn btn-info piccolo-btn', text: '📏 Inserisci tabella', onclick: function () { App.UI.FinestraVoti.apri(classe, t); } }));
            })),
            el('p', { class: 'piccolo', text: 'In alternativa usa il test equivalente del libro (📚 Test → spunta "Lo uso", poi ⏱️ Sessioni → 📚 Scegli i test): ha già le tabelle per alunni e alunne.' })) : null,
          senzaCap.length ? el('p', { class: 'piccolo', text: 'Senza tipologia (o con una tipologia scritta a mano) non contano: ' + senzaCap.map(function (t) { return t.nome; }).join(', ') + '. Scegli la tipologia toccando il nome del test in ⏱️ Sessioni.' }) : null);
      }
      if (!a.sesso) return el('div', {}, testa, el('p', { class: 'piccolo avviso-riga', text: '⚠️ Indica ♂/♀ dell\'alunno (🏫 Classi, tocca il nome): servono per calcolare i voti.' }));

      var ora = App.Profilo.alunno(classe, a, prova);
      var prima = prova > 1 ? App.Profilo.alunno(classe, a, 1) : null;
      var conPrima = prima && prima.some(function (x) { return x.media !== null; });
      var assi = ora.map(function (x) { return { nome: x.capacita.nome, testo: x.media !== null ? App.Voti.testo(x.media) : '–' }; });
      var serie = [];
      if (conPrima) serie.push({ valori: prima.map(function (x) { return x.media; }), classe: 'serie-prima' });
      serie.push({ valori: ora.map(function (x) { return x.media; }), classe: 'serie-ora' });
      var nessuno = !ora.some(function (x) { return x.media !== null; });

      return el('div', { class: 'profilo-alunno' }, testa,
        nessuno ? el('p', { class: 'piccolo', text: 'Nessun voto per ' + a.nome + ' nella ' + nomeProva + '.' }) : el('figure', { class: 'grafico-ragnatela' },
          ragnatela(assi, serie, 'Profilo di ' + a.nome + ' per capacità'),
          el('figcaption', { class: 'legenda-ragnatela' },
            el('span', {}, el('i', { class: 'seg serie-ora' }), ' ' + nomeProva),
            conPrima ? el('span', {}, el('i', { class: 'seg serie-prima' }), ' 1ª prova') : null,
            el('span', {}, el('i', { class: 'seg sufficienza' }), ' sufficienza (' + App.Config.voti.sufficienza + ')'))),
        el('ul', { class: 'profilo-voti' }, ora.map(function (x) {
          return el('li', {}, el('b', { text: x.capacita.nome + ': ' + (x.media !== null ? App.Voti.testo(x.media) : '–') }),
            el('span', { class: 'piccolo', text: x.voti.length ? ' · ' + x.voti.map(function (v) { return v.test.nome + ' ' + App.Voti.testo(v.voto); }).join(' · ')
              : ' · nessun test svolto' }));
        })),
        el('p', { class: 'piccolo', text: 'Ogni punto è la media dei voti dei test di quella capacità nella ' + nomeProva +
          '. Forza = forza arti superiori, inferiori e core; coordinazione = coordinazione, equilibrio e abilità miste. Il centro del grafico è il ' + MIN + '.' }));
    }
  };
})(window.App = window.App || {});
