/* zip-scrivi.js
 * Cosa fa: crea un file ZIP (senza compressione) con più file dentro: serve per consegnare
 *          in un solo download le schede PDF di più alunni, una per alunno.
 * Dipende da: nulla
 * Usato da: ui/finestra-pdf.js
 */
(function (App) {
  'use strict';

  var TABELLA = null;
  function crc32(u8) {
    if (!TABELLA) {
      TABELLA = new Uint32Array(256);
      for (var n = 0; n < 256; n++) {
        var c = n;
        for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
        TABELLA[n] = c >>> 0;
      }
    }
    var crc = 0xFFFFFFFF;
    for (var i = 0; i < u8.length; i++) crc = TABELLA[(crc ^ u8[i]) & 0xFF] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  // file: [{ nome: 'cartella/nome.pdf', dati: Uint8Array }] -> Blob ZIP
  function crea(file) {
    var parti = [], centrale = [], pos = 0, enc = new TextEncoder();
    var d = new Date();
    var ora = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    var data = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    file.forEach(function (f) {
      var nome = enc.encode(f.nome), dati = f.dati, crc = crc32(dati);
      var loc = new DataView(new ArrayBuffer(30));
      loc.setUint32(0, 0x04034b50, true); loc.setUint16(4, 20, true); loc.setUint16(6, 0x0800, true);
      loc.setUint16(8, 0, true); loc.setUint16(10, ora, true); loc.setUint16(12, data, true);
      loc.setUint32(14, crc, true); loc.setUint32(18, dati.length, true); loc.setUint32(22, dati.length, true);
      loc.setUint16(26, nome.length, true); loc.setUint16(28, 0, true);
      parti.push(new Uint8Array(loc.buffer), nome, dati);
      var cen = new DataView(new ArrayBuffer(46));
      cen.setUint32(0, 0x02014b50, true); cen.setUint16(4, 20, true); cen.setUint16(6, 20, true);
      cen.setUint16(8, 0x0800, true); cen.setUint16(10, 0, true); cen.setUint16(12, ora, true); cen.setUint16(14, data, true);
      cen.setUint32(16, crc, true); cen.setUint32(20, dati.length, true); cen.setUint32(24, dati.length, true);
      cen.setUint16(28, nome.length, true); cen.setUint32(42, pos, true);
      centrale.push(new Uint8Array(cen.buffer), nome);
      pos += 30 + nome.length + dati.length;
    });
    var dimCentrale = centrale.reduce(function (s, x) { return s + x.length; }, 0);
    var fine = new DataView(new ArrayBuffer(22));
    fine.setUint32(0, 0x06054b50, true); fine.setUint16(8, file.length, true); fine.setUint16(10, file.length, true);
    fine.setUint32(12, dimCentrale, true); fine.setUint32(16, pos, true);
    return new Blob(parti.concat(centrale, [new Uint8Array(fine.buffer)]), { type: 'application/zip' });
  }

  App.ZipScrivi = { crea: crea, crc32: crc32 };
})(window.App = window.App || {});
