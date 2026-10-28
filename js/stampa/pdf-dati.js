/* pdf-dati.js
 * Cosa fa: prepara i testi che vanno nei PDF (uguali per la tabella della classe e per la
 *          scheda dell'alunno): risultati delle prove con il voto, strumento per alunno/alunna,
 *          descrizione dei test per la legenda, giustificazioni con le sigle, periodo.
 *          NB: in questo file solo caratteri ASCII; simboli e accenti come \uXXXX.
 * Dipende da: App.Config, App.Test, App.Voti, App.Giust, App.Calendario, App.U
 * Usato da: stampa/pdf-classe.js, stampa/pdf-alunno.js
 */
(function (App) {
  'use strict';

  function nomeProva(p) { return p.id + 'a'; }

  // Prove con almeno un risultato nella classe (la 3a compare solo se qualcuno l'ha svolta)
  function proveUsate(classe) {
    return App.Config.prove.filter(function (p) {
      return p.id === 1 || classe.alunni.some(function (a) {
        return classe.test.some(function (t) { return App.Test.valore(classe, a.id, t.id, p.id) !== ''; });
      });
    });
  }

  // "400 (7)" oppure "400" se il test non ha voti, '' se manca
  function risultato(classe, a, t, prova) {
    var v = App.Test.valore(classe, a.id, t.id, prova);
    if (!v) return '';
    var x = App.Voti.votoAlunno(classe, a, t, prova);
    return v + (x.voto !== null ? ' (' + App.Voti.testo(x.voto) + ')' : '');
  }

  // Cella della tabella di classe: una riga per prova svolta
  function cellaTest(classe, a, t, prove) {
    var righe = prove.map(function (p) {
      var r = risultato(classe, a, t, p.id);
      return r ? nomeProva(p) + ': ' + r : '';
    }).filter(Boolean);
    return righe.length ? righe.join('\n') : '-';
  }

  function mediaVoti(classe, a, prove) {
    var l = prove.map(function (p) {
      var m = App.Voti.media(classe, a, p.id);
      return m === null ? '' : nomeProva(p) + ': ' + App.Voti.testo(m);
    }).filter(Boolean);
    return l.length ? l.join('\n') : '-';
  }

  function scrittura(t) {
    if (t.tipo !== 'tempo') return t.unita ? t.unita : 'numero';
    return { sec: 'secondi e decimi', min: 'minuti:secondi', auto: 'tempo' }[App.Test.formato(t)];
  }

  // Strumento per un alunno (se diverso per alunni e alunne, quello giusto)
  function strumentoPer(t, sesso) {
    if (!t.perSesso) return t.strumento || '';
    if (sesso === 'M') return t.strumentoM || '';
    if (sesso === 'F') return t.strumentoF || '';
    return App.Test.etichetteStrumento(t).join(' / ');
  }

  // Riga di legenda di un test
  function descrizioneTest(t) {
    var parti = [];
    if (t.tipologia) parti.push(t.tipologia);
    var s = App.Test.etichetteStrumento(t).join(', ');
    if (s) parti.push('strumento: ' + s);
    parti.push('si scrive in ' + scrittura(t));
    parti.push(t.migliore === 'alto' ? 'meglio un valore piu alto' : 'meglio un valore piu basso');
    if (App.Voti.haTabella(t)) parti.push('voto da tabella di riferimento');
    if (t.note) parti.push('note: ' + t.note);
    return t.nome + ' - ' + parti.join('; ') + '.';
  }

  function legendaVoti() {
    var c = App.Config.voti;
    return 'Tra parentesi il voto, calcolato con la tabella di riferimento del test (separata per alunni e alunne): ' +
      'scala da ' + c.min + ' a ' + c.max + ', sufficienza ' + c.sufficienza + '. "-" = prova non svolta.';
  }

  // Periodo delle giustificazioni: { anno, chiaveMese } -> { mesi: [...], primo, ultimo, nome }
  function periodo(anno, chiaveMese) {
    var mesi = App.Calendario.mesi(anno);
    var scelto = mesi.filter(function (m) { return m.chiave === chiaveMese; })[0];
    if (scelto) return { mesi: [scelto], primo: scelto.primo, ultimo: scelto.ultimo, nome: scelto.nome + ' ' + scelto.anno };
    var l = App.Calendario.limiti(anno);
    return { mesi: mesi, primo: l.primo, ultimo: l.ultimo, nome: 'anno scolastico ' + App.Calendario.etichetta(anno) };
  }

  function sigla(id) { var s = App.Giust.simbolo(id); return s ? s.sigla : '?'; }

  // Sigla di una giustificazione: "S", oppure "S+M" se ha il certificato medico
  function siglaGiust(g) { return sigla(g.simbolo) + (App.Giust.conCertificato(g) ? '+' + App.Config.certificato.sigla : ''); }

  // "5 S, 12 A" (giorno + sigla) per un alunno in un mese
  function cellaGiust(classe, a, mese) {
    var l = App.Giust.delMese(classe, a.id, mese);
    return l.length ? l.map(function (g) { return Number(g.data.slice(8, 10)) + ' ' + siglaGiust(g); }).join(', ') : '';
  }

  function giustNelPeriodo(classe, a, per) {
    return (classe.giust[a.id] || []).filter(function (g) { return g.data >= per.primo && g.data <= per.ultimo; })
      .sort(function (x, y) { return x.data < y.data ? -1 : 1; });
  }

  function legendaGiust() {
    var c = App.Config.certificato;
    return App.Config.simboli.map(function (s) { return s.sigla + ' = ' + s.nome; }).join('; ') +
      '; +' + c.sigla + ' = ' + c.nome.toLowerCase() + ' (es. "S+' + c.sigla + '").';
  }

  App.PdfDati = {
    proveUsate: proveUsate, nomeProva: nomeProva, risultato: risultato, cellaTest: cellaTest,
    mediaVoti: mediaVoti, scrittura: scrittura, strumentoPer: strumentoPer, descrizioneTest: descrizioneTest,
    legendaVoti: legendaVoti, periodo: periodo, sigla: sigla, siglaGiust: siglaGiust, cellaGiust: cellaGiust,
    giustNelPeriodo: giustNelPeriodo, legendaGiust: legendaGiust
  };
})(window.App = window.App || {});
