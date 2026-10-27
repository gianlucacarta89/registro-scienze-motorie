/* pdf-alunno.js
 * Cosa fa: PDF "scheda dell'alunno" (per la famiglia), pagina verticale, SOLO i dati di
 *          quell'alunno: test (con lo strumento usato e il voto di ogni prova), media voti,
 *          giustificazioni del periodo con data, tipologia e nota, legende. Niente dati della classe.
 *          NB: in questo file solo caratteri ASCII; simboli e accenti come \uXXXX.
 * Dipende da: App.PdfBase, App.PdfDati, App.Voti, App.Config, App.Calendario, App.Giust, App.U
 * Usato da: ui/finestra-pdf.js
 */
(function (App) {
  'use strict';

  var B = function () { return App.PdfBase; };
  var D = function () { return App.PdfDati; };

  function nomeFile(classe, a) {
    return B().nomeFile(classe.nome) + '_' + B().nomeFile(a.nome) + '.pdf';
  }

  // opz: { test, giust, anno, mese, docente }
  function crea(Pdf, classe, a, opz) {
    var doc = B().nuovo(Pdf, false);
    var per = D().periodo(opz.anno, opz.mese);
    B().intestazione(doc, 'Scheda di Scienze Motorie', [
      (a.sesso === 'F' ? 'Alunna: ' : 'Alunno: ') + a.nome + '   |   Classe ' + classe.nome,
      'Anno scolastico ' + App.Calendario.etichetta(opz.anno) + (opz.docente ? '   |   Docente: ' + opz.docente : ''),
      'Stampato il ' + App.U.dataIT(App.U.oggiISO())]);

    if (opz.test) {
      B().sezione(doc, 'Test');
      if (!classe.test.length) B().nota(doc, 'Nessun test inserito.');
      else {
        var prove = D().proveUsate(classe), conVoti = classe.test.some(App.Voti.haTabella);
        var corpo = classe.test.map(function (t) {
          return [t.nome, t.tipologia || '', D().strumentoPer(t, a.sesso), D().scrittura(t)]
            .concat(prove.map(function (p) { return D().risultato(classe, a, t, p.id) || '-'; }));
        });
        B().tabella(doc, {
          testa: [['Test', 'Tipologia', 'Strumento', 'Si scrive in'].concat(prove.map(function (p) { return p.nome; }))],
          corpo: corpo, colonne: { 0: { fontStyle: 'bold', cellWidth: 34 } }, dimensione: 8.5
        });
        if (conVoti) {
          var medie = prove.map(function (p) {
            var m = App.Voti.media(classe, a, p.id);
            return m === null ? '' : p.nome + ': ' + App.Voti.testo(m);
          }).filter(Boolean);
          B().nota(doc, 'Media dei voti dei test - ' + (medie.length ? medie.join('   |   ') : 'nessun voto'));
        }
        var note = classe.test.filter(function (t) { return t.note; }).map(function (t) { return t.nome + ': ' + t.note; });
        B().legenda(doc, 'Legenda', [
          conVoti ? D().legendaVoti() : '"-" = prova non svolta.',
          'Per ogni test: "meglio piu alto" (es. salti, lanci) o "meglio piu basso" (es. tempi di corsa): ' +
            classe.test.map(function (t) { return t.nome + ' ' + (t.migliore === 'alto' ? '(piu alto)' : '(piu basso)'); }).join(', ') + '.',
          note.length ? 'Note: ' + note.join('; ') + '.' : '']);
      }
    }

    if (opz.giust) {
      B().sezione(doc, 'Giustificazioni - ' + per.nome);
      var l = D().giustNelPeriodo(classe, a, per);
      if (!l.length) B().nota(doc, 'Nessuna giustificazione nel periodo.');
      else {
        B().tabella(doc, {
          testa: [['Data', 'Sigla', 'Motivo', 'Nota']],
          corpo: l.map(function (g) {
            var s = App.Giust.simbolo(g.simbolo) || { sigla: '?', nome: '' };
            return [App.U.dataIT(g.data), s.sigla, s.nome, g.nota || ''];
          }),
          colonne: { 0: { cellWidth: 24 }, 1: { cellWidth: 14, halign: 'center' }, 2: { cellWidth: 48 } }, dimensione: 9
        });
        var conti = App.Config.simboli.map(function (s) {
          var n = l.filter(function (g) { return g.simbolo === s.id; }).length;
          return n ? s.nome + ': ' + n : '';
        }).filter(Boolean);
        B().nota(doc, 'Totale: ' + l.length + (conti.length ? '  (' + conti.join(', ') + ')' : ''));
      }
      B().legenda(doc, 'Legenda delle giustificazioni', [D().legendaGiust()]);
    }

    B().piede(doc);
    return doc;
  }

  App.PdfAlunno = { crea: crea, nomeFile: nomeFile };
})(window.App = window.App || {});
