/* spunte-partecipa.js
 * Cosa fa: le spunte "🏐 torneo scolastico" e "🏅 giochi della gioventù" di un alunno, salvate subito
 *          (scheda dell'alunno e finestra ✏️ Correggi); e l'etichetta con le icone accanto al nome.
 * Dipende da: App.U, App.Partecipa, App.Stato, App.UI.disegnaContenuto
 * Usato da: ui/scheda-alunno.js, ui/finestra-alunno.js, ui/tabella-test.js, ui/tabella-voti.js, ui/pagina-classi.js
 */
(function (App) {
  'use strict';

  App.UI = App.UI || {};
  var el = function () { return App.U.el.apply(null, arguments); };

  // Spunte dell'alunno a -> Node
  App.UI.spuntePartecipa = function (a) {
    return el('div', { class: 'spunte-partecipa' }, App.Partecipa.voci().map(function (v) {
      var cb = el('input', { type: 'checkbox', checked: App.Partecipa.ha(a, v.id), 'aria-label': v.nome + ' – ' + a.nome });
      cb.addEventListener('change', function () {
        App.Partecipa.imposta(a, v.id, cb.checked);
        App.Stato.salva();
        App.UI.disegnaContenuto();
      });
      return el('label', { class: 'scelta' }, cb, ' ' + v.icona + ' ' + v.nome);
    }));
  };

  // Icone accanto al nome (o null)
  App.UI.iconePartecipa = function (a) {
    var i = App.Partecipa.icone(a);
    return i ? el('span', { class: 'icone-partecipa', title: App.Partecipa.titolo(a), text: ' ' + i }) : null;
  };
})(window.App = window.App || {});
