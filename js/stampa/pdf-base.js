/* pdf-base.js
 * Cosa fa: base comune dei PDF: carica jsPDF e AutoTable dalla cartella lib/ solo quando
 *          servono (funziona anche offline), filtra i testi per i font standard dei PDF,
 *          intestazione, titoli di sezione, tabelle, legende e numeri di pagina.
 *          NB: in questo file solo caratteri ASCII; simboli e accenti come \uXXXX.
 * Dipende da: App.Config (pdf, nome, versione), App.U
 * Usato da: stampa/pdf-classe.js, stampa/pdf-alunno.js, ui/finestra-pdf.js
 */
(function (App) {
  'use strict';

  var caricamento = null;
  var BLU = [44, 62, 80], GRIGIO = [95, 107, 122], CHIARO = [236, 240, 244];
  var MARGINE = 12;

  // Carica le librerie una volta sola (script locali, messi anche nella cache offline)
  function carica() {
    if (window.jspdf && window.jspdf.jsPDF && window.jspdf.jsPDF.API.autoTable) return Promise.resolve(window.jspdf.jsPDF);
    if (caricamento) return caricamento;
    caricamento = App.Config.pdf.librerie.reduce(function (p, src) {
      return p.then(function () {
        return new Promise(function (ok, ko) {
          var s = document.createElement('script');
          s.src = src;
          s.onload = ok;
          s.onerror = function () { ko(new Error('libreria')); };
          document.head.appendChild(s);
        });
      });
    }, Promise.resolve()).then(function () {
      if (!window.jspdf || !window.jspdf.jsPDF || !window.jspdf.jsPDF.API.autoTable) throw new Error('libreria');
      return window.jspdf.jsPDF;
    }).catch(function (e) { caricamento = null; throw e; });
    return caricamento;
  }

  // Testo adatto ai font standard dei PDF (WinAnsi): niente emoji, apostrofi curvi, frecce...
  var SOSTITUZIONI = {
    '\u2018': "'", '\u2019': "'", '\u201C': '"', '\u201D': '"', '\u2013': '-', '\u2014': '-',
    '\u2192': '->', '\u2026': '...', '\u2022': '-', '\u00A0': ' ', '\u2642': 'M', '\u2640': 'F',
    '\u2191': '(piu alto)', '\u2193': '(piu basso)', '\u2212': '-', '\u2265': '>=', '\u2264': '<='
  };
  function testo(s) {
    if (s === null || s === undefined) return '';
    var t = String(s).normalize('NFC').replace(/[\u2018\u2019\u201C\u201D\u2013\u2014\u2192\u2026\u2022\u00A0\u2642\u2640\u2191\u2193\u2212\u2265\u2264]/g,
      function (c) { return SOSTITUZIONI[c]; });
    // toglie emoji e tutto cio' che i font standard non conoscono (oltre Latin-1)
    t = t.replace(/[\uD800-\uDFFF]/g, '').replace(/[^\u0000-\u00FF]/g, '');
    return t.replace(/\s{2,}/g, ' ').trim();
  }

  function nuovo(Pdf, orizzontale) {
    var doc = new Pdf({ orientation: orizzontale ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' });
    doc.setFont('helvetica', 'normal');
    doc.y = MARGINE;
    return doc;
  }

  function larghezza(doc) { return doc.internal.pageSize.getWidth(); }
  function altezza(doc) { return doc.internal.pageSize.getHeight(); }

  // Se non c'e' posto per "serve" mm, nuova pagina
  function spazio(doc, serve) {
    if (doc.y + serve > altezza(doc) - 14) { doc.addPage(); doc.y = MARGINE; }
  }

  // Intestazione: titolo grande + righe di informazioni + linea
  function intestazione(doc, titolo, righe) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(BLU[0], BLU[1], BLU[2]);
    doc.text(testo(titolo), MARGINE, doc.y + 5);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(GRIGIO[0], GRIGIO[1], GRIGIO[2]);
    var y = doc.y + 11;
    (righe || []).filter(Boolean).forEach(function (r) { doc.text(testo(r), MARGINE, y); y += 4.6; });
    doc.setDrawColor(BLU[0], BLU[1], BLU[2]); doc.setLineWidth(0.5);
    doc.line(MARGINE, y - 1, larghezza(doc) - MARGINE, y - 1);
    doc.setTextColor(0, 0, 0);
    doc.y = y + 4;
  }

  function sezione(doc, titolo) {
    spazio(doc, 20);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11.5); doc.setTextColor(BLU[0], BLU[1], BLU[2]);
    doc.text(testo(titolo), MARGINE, doc.y + 4);
    doc.setTextColor(0, 0, 0); doc.setFont('helvetica', 'normal');
    doc.y += 7;
  }

  // Tabella con lo stile dell'app. o: { testa: [[...]], corpo: [[...]], piede, colonne, dimensione }
  function tabella(doc, o) {
    function pulisci(righe) { return (righe || []).map(function (r) { return r.map(function (c) { return typeof c === 'object' && c !== null ? Object.assign({}, c, { content: testo(c.content) }) : testo(c); }); }); }
    doc.autoTable({
      startY: doc.y,
      head: pulisci(o.testa),
      body: pulisci(o.corpo),
      foot: o.piede ? pulisci(o.piede) : undefined,
      margin: { left: MARGINE, right: MARGINE, top: MARGINE, bottom: 16 },
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: o.dimensione || 8.5, cellPadding: 1.4, lineColor: [200, 206, 214], lineWidth: 0.15, valign: 'middle', overflow: 'linebreak' },
      headStyles: { fillColor: BLU, textColor: 255, fontStyle: 'bold', halign: 'center' },
      footStyles: { fillColor: CHIARO, textColor: [30, 30, 30], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 249, 251] },
      columnStyles: o.colonne || {},
      showHead: 'everyPage',
      rowPageBreak: 'avoid'
    });
    doc.y = doc.lastAutoTable.finalY + 5;
  }

  // Legenda: titolo piccolo e righe di testo che vanno a capo da sole
  function legenda(doc, titolo, righe) {
    var largo = larghezza(doc) - 2 * MARGINE;
    spazio(doc, 12);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(GRIGIO[0], GRIGIO[1], GRIGIO[2]);
    doc.text(testo(titolo), MARGINE, doc.y + 3);
    doc.y += 6;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    righe.filter(Boolean).forEach(function (r) {
      var linee = doc.splitTextToSize(testo(r), largo);
      spazio(doc, linee.length * 3.6);
      doc.text(linee, MARGINE, doc.y + 2.5);
      doc.y += linee.length * 3.6;
    });
    doc.setTextColor(0, 0, 0);
    doc.y += 3;
  }

  function nota(doc, s) {
    var linee = doc.splitTextToSize(testo(s), larghezza(doc) - 2 * MARGINE);
    spazio(doc, linee.length * 4);
    doc.setFont('helvetica', 'italic'); doc.setFontSize(8.5); doc.setTextColor(GRIGIO[0], GRIGIO[1], GRIGIO[2]);
    doc.text(linee, MARGINE, doc.y + 3);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(0, 0, 0);
    doc.y += linee.length * 4 + 2;
  }

  // Numeri di pagina e nome dell'app in fondo a ogni pagina (alla fine, quando le pagine sono tutte)
  function piede(doc) {
    var n = doc.getNumberOfPages();
    for (var i = 1; i <= n; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(GRIGIO[0], GRIGIO[1], GRIGIO[2]);
      doc.text(testo(App.Config.nome + ' v' + App.Config.versione), MARGINE, altezza(doc) - 7);
      doc.text('Pagina ' + i + ' di ' + n, larghezza(doc) - MARGINE, altezza(doc) - 7, { align: 'right' });
    }
    doc.setTextColor(0, 0, 0);
  }

  // Nome di file sicuro: lettere, numeri, trattini
  function nomeFile(s) {
    return testo(s).normalize('NFD').replace(/[\u0300-\u036F]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  App.PdfBase = {
    carica: carica, testo: testo, nuovo: nuovo, intestazione: intestazione, sezione: sezione,
    tabella: tabella, legenda: legenda, nota: nota, piede: piede, spazio: spazio, nomeFile: nomeFile,
    MARGINE: MARGINE
  };
})(window.App = window.App || {});
