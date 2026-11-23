/* tag-attivita.js
 * Cosa fa: tag delle ⛹️ attività (config.js > tagAttivita: 💪 Forza, ⚡ Velocità, 🫀 Resistenza,
 *          🤸 Coordinazione, ⚽ Sport): scelta con un tocco (anche più di uno), etichette nelle liste
 *          e filtro per tag negli elenchi (classe e 📚 archivio; il filtro resta finché l'app è aperta).
 * Dipende da: App.U, App.Config (tagAttivita)
 * Usato da: ui/finestra-attivita.js, ui/finestra-archivio-attivita.js, ui/pagina-attivita.js
 *
 * Dati: attivita.tag = ['forza', 'sport'] (anche nell'archivio)
 */
(function (App) {
  'use strict';

  App.UI = App.UI || {};
  var el = function () { return App.U.el.apply(null, arguments); };
  var filtro = '';

  function voci() { return App.Config.tagAttivita || []; }
  function voce(id) { return voci().filter(function (t) { return t.id === id; })[0]; }

  App.UI.TagAttivita = {
    // Scelta dei tag: -> { nodo, valori() }
    scelta: function (iniziali) {
      var scelti = (iniziali || []).slice(), box = el('div', { class: 'tag-scelta', role: 'group', 'aria-label': 'Tag' });
      function disegna() {
        App.U.svuota(box);
        voci().forEach(function (t) {
          var on = scelti.indexOf(t.id) >= 0;
          box.appendChild(el('button', { type: 'button', class: 'tag-btn' + (on ? ' attivo' : ''), 'aria-pressed': on ? 'true' : 'false',
            text: t.icona + ' ' + t.nome, onclick: function () {
              if (on) scelti.splice(scelti.indexOf(t.id), 1); else scelti.push(t.id);
              disegna();
            } }));
        });
      }
      disegna();
      return { nodo: box, valori: function () { return voci().map(function (t) { return t.id; }).filter(function (id) { return scelti.indexOf(id) >= 0; }); } };
    },

    // Etichette dei tag di un'attività (o null)
    etichette: function (a) {
      var l = (a.tag || []).map(voce).filter(Boolean);
      return l.length ? el('span', { class: 'tag-etichette' }, l.map(function (t) { return el('span', { class: 'tag-mini', text: t.icona + ' ' + t.nome }); })) : null;
    },

    // Filtro per tag sopra un elenco: ridisegna = funzione da chiamare quando cambia
    filtro: function (ridisegna) {
      return el('div', { class: 'tag-scelta tag-filtro', role: 'group', 'aria-label': 'Filtra per tag' },
        [{ id: '', icona: '🔎', nome: 'Tutte' }].concat(voci()).map(function (t) {
          return el('button', { type: 'button', class: 'tag-btn' + (filtro === t.id ? ' attivo' : ''), 'aria-pressed': filtro === t.id ? 'true' : 'false',
            text: t.icona + ' ' + t.nome, onclick: function () { filtro = t.id; ridisegna(); } });
        }));
    },
    passa: function (a) { return !filtro || (a.tag || []).indexOf(filtro) >= 0; },
    filtroAttivo: function () { return filtro ? voce(filtro) : null; }
  };
})(window.App = window.App || {});
