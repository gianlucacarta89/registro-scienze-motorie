/* foto-attivita.js
 * Cosa fa: riquadro "📷 Foto" della finestra di un'attività: "📷 Scatta foto" (sul telefono apre la
 *          fotocamera), "🖼️ Dalla galleria", anteprime (tocco = foto grande) con 🗑️. Le modifiche restano
 *          in sospeso finché l'attività non si salva: salva() scrive le foto nuove e cancella quelle tolte.
 * Dipende da: App.U, App.Config (foto), App.Foto, App.Avvisi, App.Finestra
 * Usato da: ui/finestra-attivita.js
 */
(function (App) {
  'use strict';

  App.UI = App.UI || {};
  var el = function () { return App.U.el.apply(null, arguments); };

  function grande(url, titolo) {
    App.Finestra.apri({ titolo: titolo, icona: '📷', larga: true, fuoco: false,
      corpo: el('img', { class: 'foto-grande', src: url, alt: titolo }), pulsanti: [{ testo: 'Chiudi', tipo: 'neutro' }] });
  }

  App.UI.FotoAttivita = {
    // att = attività (o null se nuova) -> { nodo, ids(), salva() -> Promise }
    crea: function (att, titolo) {
      var max = App.Config.foto.max;
      var voci = ((att && att.foto) || []).map(function (id) { return { id: id, url: null, nuova: false }; });
      var tolte = [];
      var griglia = el('div', { class: 'foto-griglia' });

      function scegli(conCamera) {
        var inp = el('input', { type: 'file', accept: 'image/*', class: 'nascosto' });
        if (conCamera) inp.setAttribute('capture', 'environment'); else inp.multiple = true;
        inp.addEventListener('change', function () {
          var files = [].slice.call(inp.files || []), posto = max - voci.length;
          if (files.length > posto) App.Avvisi.toast('Al massimo ' + max + ' foto per attività.', 'info', 4000);
          Promise.all(files.slice(0, Math.max(0, posto)).map(function (f) {
            return App.Foto.riduci(f).then(function (url) { voci.push({ id: App.U.nuovoId(), url: url, nuova: true }); })
              .catch(function () { App.Avvisi.toast('❌ Non riesco a leggere una delle immagini.', 'errore', 4000); });
          })).then(disegna);
          inp.remove();
        });
        document.body.appendChild(inp);
        inp.click();
      }

      function disegna() {
        App.U.svuota(griglia);
        voci.forEach(function (v, i) {
          var img = el('img', { alt: 'Foto ' + (i + 1), src: v.url || '' });
          if (!v.url) App.Foto.leggi(v.id).then(function (u) { v.url = u || ''; if (u) img.src = u; else img.alt = 'foto non trovata'; }).catch(function () { img.alt = 'foto non disponibile'; });
          griglia.appendChild(el('div', { class: 'foto-mini' },
            el('button', { type: 'button', class: 'foto-apri', 'aria-label': 'Apri la foto ' + (i + 1), onclick: function () { if (v.url) grande(v.url, (titolo || 'Foto') + ' – ' + (i + 1)); } }, img),
            el('button', { type: 'button', class: 'foto-togli', 'aria-label': 'Togli la foto ' + (i + 1), text: '🗑️', onclick: function () {
              voci.splice(i, 1);
              if (!v.nuova) tolte.push(v.id);
              disegna();
            } })));
        });
        bottoni.hidden = voci.length >= max;
      }

      var bottoni = el('div', { class: 'riga-btn sinistra' },
        el('button', { type: 'button', class: 'btn btn-ok piccolo-btn', text: '📷 Scatta foto', onclick: function () { scegli(true); } }),
        el('button', { type: 'button', class: 'btn btn-neutro piccolo-btn', text: '🖼️ Dalla galleria', onclick: function () { scegli(false); } }));
      disegna();

      return {
        nodo: el('div', { class: 'foto-attivita' }, griglia, bottoni,
          el('p', { class: 'piccolo', text: 'Es. il campo o la disposizione dell\'attività. Le foto si rimpiccioliscono e restano su questo dispositivo (e nel backup). Al massimo ' + max + '.' })),
        ids: function () { return voci.map(function (v) { return v.id; }); },
        salva: function () {
          return Promise.all(voci.filter(function (v) { return v.nuova; }).map(function (v) { return App.Foto.salva(v.id, v.url).then(function () { v.nuova = false; }); })
            .concat(tolte.map(function (id) { return App.Foto.elimina(id); }))).then(function () { tolte = []; });
        }
      };
    }
  };
})(window.App = window.App || {});
