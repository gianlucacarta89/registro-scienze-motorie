/* finestra.js — core 1.0
 * Cosa fa: finestre dell'app (al posto delle finestre del browser). Si possono
 *          aprire una sopra l'altra; Esc o ✕ chiudono quella in primo piano.
 * Dipende da: App.U
 * Usato da: App.Avvisi e da tutte le finestre in ui/
 *
 * App.Finestra.apri({ titolo, icona, corpo: Node, larga: bool,
 *   pulsanti: [{ testo, tipo: 'ok'|'pericolo'|'info'|'neutro', azione: fn(api) }],
 *   allaChiusura: fn })
 * Se azione restituisce false (o una promessa di false) la finestra resta aperta.
 */
(function (App) {
  'use strict';

  var pila = [];

  function suEsc(ev) {
    if (ev.key === 'Escape' && pila.length) { ev.preventDefault(); pila[pila.length - 1].chiudi(); }
  }

  function apri(o) {
    var el = App.U.el;
    var api = {};
    var sfondo = el('div', { class: 'sfondo' });
    var corpo = el('div', { class: 'finestra-corpo' }, o.corpo);
    var piede = el('div', { class: 'finestra-piede' });
    var box = el('div', { class: 'finestra' + (o.larga ? ' larga' : ''), role: 'dialog', 'aria-modal': 'true' },
      el('div', { class: 'finestra-testa' },
        o.icona ? el('span', { class: 'finestra-icona', text: o.icona }) : null,
        el('h2', { text: o.titolo || '' }),
        el('button', { class: 'chiudi', type: 'button', 'aria-label': 'Chiudi', text: '✕', onclick: function () { api.chiudi(); } })),
      corpo, piede);

    (o.pulsanti || []).forEach(function (p) {
      piede.appendChild(el('button', {
        type: 'button', class: 'btn btn-' + (p.tipo || 'neutro'), text: p.testo,
        onclick: function () {
          var r = p.azione ? p.azione(api) : true;
          Promise.resolve(r).then(function (v) { if (v !== false) api.chiudi(); });
        }
      }));
    });
    if (!piede.childNodes.length) piede.style.display = 'none';

    var chiusa = false;
    api.chiudi = function () {
      if (chiusa) return;
      chiusa = true;
      sfondo.remove();
      pila = pila.filter(function (x) { return x !== api; });
      if (!pila.length) document.removeEventListener('keydown', suEsc);
      if (o.allaChiusura) o.allaChiusura();
    };
    api.corpo = corpo;
    api.box = box;
    api.piede = piede;

    sfondo.appendChild(box);
    document.body.appendChild(sfondo);
    if (!pila.length) document.addEventListener('keydown', suEsc);
    pila.push(api);

    var primo = box.querySelector('.finestra-corpo input:not([type=hidden]):not([type=checkbox]), .finestra-corpo textarea');
    if (primo && o.fuoco !== false && window.matchMedia('(pointer:fine)').matches) primo.focus();
    return api;
  }

  App.Finestra = {
    apri: apri,
    aperte: function () { return pila.length; }
  };
})(window.App = window.App || {});
