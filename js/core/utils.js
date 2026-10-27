/* utils.js — core 1.0
 * Cosa fa: funzioni di servizio comuni: creazione di elementi, protezione del testo,
 *          date, confronto dei nomi, download di file.
 * Dipende da: nulla.
 * Usato da: tutti i moduli.
 */
(function (App) {
  'use strict';

  function aggiungi(e, c) {
    if (c === null || c === undefined || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { aggiungi(e, x); }); return; }
    if (typeof c === 'string' || typeof c === 'number') c = document.createTextNode(String(c));
    e.appendChild(c);
  }

  // Crea un elemento: el('button', {class:'btn', text:'Ok', onclick: fn}, figli...)
  function el(tag, props) {
    var e = document.createElement(tag);
    var valore;
    props = props || {};
    Object.keys(props).forEach(function (k) {
      var v = props[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else if (k === 'style') e.style.cssText = v;
      else if (k === 'value') valore = v;
      else if (k === 'checked' || k === 'disabled' || k === 'selected') e[k] = true;
      else if (k.indexOf('on') === 0 && typeof v === 'function') e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    });
    for (var i = 2; i < arguments.length; i++) aggiungi(e, arguments[i]);
    if (valore !== undefined) e.value = valore;   // dopo i figli: serve per <select>
    return e;
  }

  function svuota(e) { while (e && e.firstChild) e.removeChild(e.firstChild); return e; }

  // Protezione del testo per l'HTML (non usarla nei PDF)
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function nuovoId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  function isoData(d) {
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function oggiISO() { return isoData(new Date()); }

  // "2026-10-12" -> "12/10/2026"
  function dataIT(iso) {
    if (!iso) return '';
    var p = String(iso).slice(0, 10).split('-');
    return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : iso;
  }

  // timestamp ISO -> "19/10/2026 16:30"
  function dataOraIT(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d)) return '';
    return pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + '/' + d.getFullYear() +
      ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  }

  function spazi(s) {
    return String(s == null ? '' : s).replace(/[ \t\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  // Chiave per riconoscere nomi uguali (maiuscole, accenti e spazi non contano)
  function chiaveNome(s) {
    return spazi(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  function confronta(a, b) {
    return String(a).localeCompare(String(b), 'it', { sensitivity: 'base' });
  }

  // Scarica un file di testo (usato per il backup). -> Promise<boolean> (true = salvato)
  // Nella pagina pubblicata su claude.ai usa la funzione "downloads" (chiede conferma);
  // aperta da file usa il download normale del browser.
  function scarica(nomeFile, testo, tipo) {
    var claude = window.claude;
    if (claude && typeof claude.use === 'function') {
      return claude.use('downloads').then(function (d) {
        if (!d) return scaricaBrowser(nomeFile, testo, tipo);
        return d.save({ filename: nomeFile, data: testo }).then(function () { return true; }, function (e) {
          var codice = e && e.code;
          if (codice === 'declined') return false;
          if (codice === 'rate_limited') throw new Error('C\'è già una richiesta di salvataggio aperta: rispondi a quella e riprova.');
          throw new Error('Il salvataggio del file non è disponibile qui (' + (codice || 'errore') + ').');
        });
      });
    }
    return scaricaBrowser(nomeFile, testo, tipo);
  }

  function scaricaBrowser(nomeFile, testo, tipo) {
    var blob = testo instanceof Blob ? testo : new Blob([testo], { type: tipo || 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = el('a', { href: url, download: nomeFile, style: 'display:none' });
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1500);
    return Promise.resolve(true);
  }

  function copia(obj) { return JSON.parse(JSON.stringify(obj)); }

  App.U = {
    el: el, svuota: svuota, esc: esc, nuovoId: nuovoId, pad2: pad2,
    isoData: isoData, oggiISO: oggiISO, dataIT: dataIT, dataOraIT: dataOraIT,
    spazi: spazi, chiaveNome: chiaveNome, confronta: confronta, scarica: scarica, copia: copia
  };
})(window.App = window.App || {});
