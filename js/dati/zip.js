/* zip.js
 * Cosa fa: apre i file .xlsx e .docx, che sono archivi ZIP, usando solo il browser
 *          (DecompressionStream), senza librerie esterne: funziona anche offline.
 * Dipende da: nulla
 * Usato da: App.LeggiFile
 */
(function (App) {
  'use strict';

  var FIRMA_FINE = 0x06054b50, FIRMA_VOCE = 0x02014b50;

  function supportato() { return typeof DecompressionStream === 'function'; }

  function decomprimi(byte) {
    var flusso = new Blob([byte]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Response(flusso).arrayBuffer().then(function (b) { return new Uint8Array(b); });
  }

  // -> { nomi: [...], testo(nome) -> Promise<string|null> }
  function apri(buffer) {
    var v = new DataView(buffer), u8 = new Uint8Array(buffer);
    var fine = -1, i;
    for (i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) {
      if (v.getUint32(i, true) === FIRMA_FINE) { fine = i; break; }
    }
    if (fine < 0) throw new Error('non-zip');

    var quante = v.getUint16(fine + 10, true), pos = v.getUint32(fine + 16, true);
    var voci = {}, dec = new TextDecoder('utf-8');
    for (i = 0; i < quante; i++) {
      if (pos + 46 > u8.length || v.getUint32(pos, true) !== FIRMA_VOCE) break;
      var lNome = v.getUint16(pos + 28, true), lExtra = v.getUint16(pos + 30, true), lNota = v.getUint16(pos + 32, true);
      var nome = dec.decode(u8.subarray(pos + 46, pos + 46 + lNome));
      voci[nome.toLowerCase()] = {
        nome: nome,
        metodo: v.getUint16(pos + 10, true),
        compresso: v.getUint32(pos + 20, true),
        locale: v.getUint32(pos + 42, true)
      };
      pos += 46 + lNome + lExtra + lNota;
    }

    function byte(nome) {
      var e = voci[String(nome).replace(/^\//, '').toLowerCase()];
      if (!e) return Promise.resolve(null);
      var inizio = e.locale + 30 + v.getUint16(e.locale + 26, true) + v.getUint16(e.locale + 28, true);
      var dati = u8.subarray(inizio, inizio + e.compresso);
      if (e.metodo === 0) return Promise.resolve(dati);
      if (e.metodo === 8) return decomprimi(dati);
      return Promise.reject(new Error('metodo'));
    }

    return {
      nomi: Object.keys(voci).map(function (k) { return voci[k].nome; }),
      testo: function (nome) {
        return byte(nome).then(function (b) { return b ? dec.decode(b) : null; });
      }
    };
  }

  App.Zip = { supportato: supportato, apri: apri };
})(window.App = window.App || {});
