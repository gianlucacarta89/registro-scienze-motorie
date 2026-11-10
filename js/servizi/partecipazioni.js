/* partecipazioni.js
 * Cosa fa: spunte per alunno "🏐 Partecipa al torneo scolastico" e "🏅 Partecipa ai giochi della gioventù"
 *          (config.js > partecipazioni). Solo un promemoria per il docente: l'app non cambia nessun voto,
 *          mostra le icone accanto al nome (risultati, voti, classi, scheda) e il bonus lo decide il docente.
 * Dipende da: App.Config (partecipazioni)
 * Usato da: ui/spunte-partecipa.js, ui/tabella-test.js, ui/tabella-voti.js, ui/pagina-classi.js, ui/scheda-alunno.js
 *
 * Dati: alunno.partecipa = { torneo: true, giochi: true }
 */
(function (App) {
  'use strict';

  function voci() { return App.Config.partecipazioni || []; }

  App.Partecipa = {
    voci: voci,
    ha: function (a, id) { return !!(a.partecipa && a.partecipa[id]); },
    imposta: function (a, id, si) {
      a.partecipa = a.partecipa || {};
      if (si) a.partecipa[id] = true; else delete a.partecipa[id];
      if (!Object.keys(a.partecipa).length) delete a.partecipa;
    },
    // Icone delle partecipazioni dell'alunno ('' se nessuna), con il titolo per il passaggio del mouse
    icone: function (a) { return voci().filter(function (v) { return App.Partecipa.ha(a, v.id); }).map(function (v) { return v.icona; }).join(''); },
    titolo: function (a) { return voci().filter(function (v) { return App.Partecipa.ha(a, v.id); }).map(function (v) { return v.nome; }).join(' · '); }
  };
})(window.App = window.App || {});
