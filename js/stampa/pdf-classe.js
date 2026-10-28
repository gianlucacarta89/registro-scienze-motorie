/* pdf-classe.js
 * Cosa fa: PDF "tabella della classe" (per i colleghi), pagina orizzontale, una parte per classe:
 *          risultati dei test con voti e media voti, legenda dei test, riepilogo statistico,
 *          giustificazioni per mese con le sigle e i totali per tipologia, legenda.
 *          NB: in questo file solo caratteri ASCII; simboli e accenti come \uXXXX.
 * Dipende da: App.PdfBase, App.PdfDati, App.Statistiche, App.Voti, App.Config, App.Calendario, App.U
 * Usato da: ui/finestra-pdf.js
 */
(function (App) {
  'use strict';

  var B = function () { return App.PdfBase; };
  var D = function () { return App.PdfDati; };

  function sottoClasse(classe, alunni) {
    // stessa classe ma solo con gli alunni scelti (per tabelle e riepilogo)
    return Object.assign({}, classe, { alunni: alunni });
  }

  function parteTest(doc, c) {
    B().sezione(doc, 'Test');
    if (!c.test.length) { B().nota(doc, 'Nessun test inserito per questa classe.'); return; }
    var prove = D().proveUsate(c), conVoti = c.test.some(App.Voti.haTabella);
    var testa = ['N.', 'Alunno'].concat(c.test.map(function (t) { return t.nome + '\n(' + D().scrittura(t) + ')'; }));
    if (conVoti) testa.push('Media voti');
    var corpo = c.alunni.map(function (a, i) {
      var r = [String(i + 1), a.nome].concat(c.test.map(function (t) { return D().cellaTest(c, a, t, prove); }));
      if (conVoti) r.push(D().mediaVoti(c, a, prove));
      return r;
    });
    var col = { 0: { cellWidth: 8, halign: 'right' }, 1: { cellWidth: 42, fontStyle: 'bold' } };
    B().tabella(doc, { testa: [testa], corpo: corpo, colonne: col, dimensione: c.test.length > 8 ? 6.5 : 7.5 });
    B().legenda(doc, 'Legenda dei test', c.test.map(D().descrizioneTest).concat([
      'Prove: ' + prove.map(function (p) { return D().nomeProva(p) + ' = ' + p.nome; }).join(', ') + '.',
      conVoti ? D().legendaVoti() : '']));

    // Riepilogo della classe (solo per i colleghi)
    var righe = [];
    c.test.forEach(function (t) {
      prove.forEach(function (p) {
        var s = App.Statistiche.test(c, t, p.id);
        if (!s.svolti) return;
        var V = function (n) { return App.Statistiche.testoValore(t, n); };
        righe.push([t.nome, D().nomeProva(p), s.svolti + ' / ' + s.totale, V(s.media), V(s.migliore), V(s.peggiore),
          s.mediaVoti !== null ? App.Voti.testo(s.mediaVoti) : '-',
          s.conVoto ? s.sufficienti + ' / ' + s.conVoto : '-']);
      });
    });
    if (righe.length) {
      B().sezione(doc, 'Riepilogo della classe');
      B().tabella(doc, { testa: [['Test', 'Prova', 'Svolto', 'Media', 'Migliore', 'Peggiore', 'Media voti', 'Sufficienti']],
        corpo: righe, colonne: { 0: { fontStyle: 'bold' }, 1: { halign: 'center' } }, dimensione: 8 });
      B().nota(doc, 'Il riepilogo considera solo gli alunni presenti in questo documento.');
    }
  }

  function parteGiust(doc, c, per) {
    B().sezione(doc, 'Giustificazioni - ' + per.nome);
    var simboli = App.Config.simboli;
    var testa = ['N.', 'Alunno'].concat(per.mesi.map(function (m) { return per.mesi.length > 1 ? m.breve : m.nome; }),
      simboli.map(function (s) { return s.sigla; }), ['+' + App.Config.certificato.sigla, 'Tot.']);
    var totCert = 0;
    var totali = simboli.map(function () { return 0; }), totMesi = per.mesi.map(function () { return 0; }), tot = 0;
    var corpo = c.alunni.map(function (a, i) {
      var l = D().giustNelPeriodo(c, a, per);
      var perSimbolo = simboli.map(function (s, k) { var n = l.filter(function (g) { return g.simbolo === s.id; }).length; totali[k] += n; return n ? String(n) : ''; });
      tot += l.length;
      var nc = l.filter(function (g) { return App.Giust.conCertificato(g); }).length;
      totCert += nc;
      return [String(i + 1), a.nome].concat(per.mesi.map(function (m, k) {
        totMesi[k] += App.Giust.delMese(c, a.id, m).length;
        return D().cellaGiust(c, a, m);
      }), perSimbolo, [nc ? String(nc) : '', String(l.length)]);
    });
    var piede = [['', 'Totale classe'].concat(totMesi.map(String), totali.map(String), [String(totCert), String(tot)])];
    var col = { 0: { cellWidth: 8, halign: 'right' }, 1: { cellWidth: 42, fontStyle: 'bold' } };
    var primaSigla = 2 + per.mesi.length;
    for (var k = primaSigla; k <= primaSigla + simboli.length + 1; k++) col[k] = { halign: 'center', cellWidth: 9 };
    B().tabella(doc, { testa: [testa], corpo: corpo, piede: piede, colonne: col, dimensione: per.mesi.length > 1 ? 7 : 8 });
    B().legenda(doc, 'Legenda delle giustificazioni', [
      D().legendaGiust(),
      per.mesi.length > 1 ? 'Nei mesi: giorno + sigla (es. "5 S" = giorno 5, problemi di salute). Le colonne con le sigle contano le giustificazioni di quel tipo nel periodo; +' + App.Config.certificato.sigla + ' conta quelle con certificato medico.' :
        'Nel mese: giorno + sigla (es. "5 S" = giorno 5, problemi di salute).']);
  }

  // voci: [{ classe, alunni: [...] }], opz: { test, giust, anno, mese, docente }
  function crea(Pdf, voci, opz) {
    var doc = B().nuovo(Pdf, true), primo = true;
    var per = D().periodo(opz.anno, opz.mese);
    voci.forEach(function (v) {
      if (!primo) { doc.addPage(); doc.y = B().MARGINE; }
      primo = false;
      var c = sottoClasse(v.classe, v.alunni);
      B().intestazione(doc, 'Registro di Scienze Motorie - Classe ' + c.nome, [
        'Anno scolastico ' + App.Calendario.etichetta(opz.anno) + (opz.docente ? '   |   Docente: ' + opz.docente : ''),
        'Alunni nel documento: ' + c.alunni.length + (c.alunni.length < v.classe.alunni.length ? ' su ' + v.classe.alunni.length : '') +
          '   |   Stampato il ' + App.U.dataIT(App.U.oggiISO())]);
      if (opz.test) parteTest(doc, c);
      if (opz.giust) parteGiust(doc, c, per);
    });
    B().piede(doc);
    return doc;
  }

  App.PdfClasse = { crea: crea };
})(window.App = window.App || {});
