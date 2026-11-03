/* nomi-sesso.js
 * Cosa fa: propone ♂ o ♀ dal nome di battesimo quando si caricano gli alunni.
 *          Il nome completo è "Cognome Nome": si salta il cognome (anche "De Luca", "Lo Monaco")
 *          e si cerca il primo nome conosciuto negli elenchi qui sotto ("Tola Leonardo Maria" = ♂).
 *          Se nessun nome è conosciuto si usa la finale dell'ultimo nome (regole in config.js:
 *          sessoDaiNomi). Se non è sicuro restituisce '' (non indicato): l'insegnante controlla.
 * Dipende da: App.Config (sessoDaiNomi)
 * Usato da: ui/finestra-importa.js
 */
(function (App) {
  'use strict';

  var MASCHI = ('aaron achille adam adamo adrian adriano agostino ahmed alan alberto aldo alessandro alessio alex alexandru ' +
    'alfio alfonso alfredo ali amedeo andrea andrei angelo antonello antonino antonio aurelio battista benedetto bernardo ' +
    'biagio brian bruno bryan calogero carlo carlos carmelo cesare christian christopher claudio corrado cosimo costantino ' +
    'cristian cristiano damiano daniel daniele dario david davide denis dennis diego domenico dominik donato dylan edoardo ' +
    'efisio egidio elia elias elio emanuele emil emiliano emilio emmanuel enea enrico enzo eric erik ernesto ethan ettore ' +
    'eugenio ezio fabio fabrizio fausto federico felice ferdinando filippo flavio florin francesco franco gabriel gabriele ' +
    'gaetano gavino geremia gerardo giacomo giancarlo gianluca gianmarco gianni gino gioele giona giorgio giosue giovanni ' +
    'giulio giuliano giuseppe gregorio guido hamza ian ignazio igor ilario ionut isacco ismaele ivan ivano jacob jacopo ' +
    'iacopo jakub joel joele jonathan jose juan karim kevin kristian lapo leandro leo leonardo leone liam lino livio lorenzo ' +
    'loris luca luciano lucio luigi luis lukas manuel marcello marco marcos mario marino marius martin massimiliano massimo ' +
    'mattheo matteo mattia mattias maurizio mauro maximilian michael michele mihai mirco mirko mohamed mohammed nathan ' +
    'nazareno nicholas nicola nicolas nicolo nino noah noel nunzio omar orlando oscar ottavio pablo paolo pasquale patrick ' +
    'pierluigi piergiorgio pierpaolo pietro pio raffaele raimondo rayan renato renzo riccardo rinaldo roberto rocco rodolfo ' +
    'romano romeo rosario ruben sabino salvatore samir samuel samuele sandro santiago saverio sebastian sebastiano sergio ' +
    'severino silvio simone stefan stefano tancredi teodoro thomas tiziano tobia tomas tommaso tullio ugo umberto valentino ' +
    'valerio valter vincenzo vito vittorio vlad walter william youssef yuri zaccaria zeno').split(' ');

  var FEMMINE = ('ada adele agata agnese aisha alba alessandra alessia alexandra alice amanda amira anastasia andreea angela ' +
    'angelica anita anna annalisa annamaria antonella antonia antonietta arianna asia aurelia aurora azzurra barbara beatrice ' +
    'benedetta bianca camilla carla carlotta carola caterina cecilia celeste chiara chloe cinzia clara claudia cloe cristina ' +
    'dalila daniela debora deborah delia denise desiree diana dora ecaterina elena elenora eleonora elettra elisa elisabetta ' +
    'ella elodie emanuela emily emma erica erika erminia ester eugenia eva fabiola fatima fatma federica fiamma flavia ' +
    'francesca gabriella gaia gemma giada gilda ginevra gioia giorgia giovanna giulia giuliana gloria grazia greta ilaria ' +
    'ilenia ines ioana irene iris isabel isabella isotta jasmine jasmin jennifer jessica karen kristina lara laura lavinia ' +
    'letizia linda lisa lorena luana lucia lucrezia ludovica luisa luna maddalena maia manuela marcella margherita maria ' +
    'marianna mariangela marika marina maristella marta martina matilde maya melissa mia michela mirea mirella miriam monica ' +
    'morena nadia natalia nicole nicoletta nina noemi nora olivia ornella paola patrizia perla priscilla rachele ramona ' +
    'rebecca rita roberta rosa rosaria rossella sabrina salma samanta samantha sara sarah serena sharon silvia simona sofia ' +
    'sole sonia sophia stefania stella susanna tamara teresa tiziana valentina valeria vanessa veronica viola virginia ' +
    'vittoria yasmin yasmine ylenia zoe').split(' ');

  var elenco = {};
  MASCHI.forEach(function (n) { elenco[n] = 'M'; });
  FEMMINE.forEach(function (n) { elenco[n] = 'F'; });

  // minuscolo e senza accenti: "Nicolò" -> "nicolo"
  function semplice(p) {
    return p.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');
  }

  // "Cognome Nome Secondo" -> 'M' | 'F' | ''
  function indovina(nomeCompleto) {
    var r = App.Config.sessoDaiNomi;
    var parole = String(nomeCompleto || '').split(/[\s-]+/).map(semplice).filter(Boolean);
    if (parole.length < 2) return '';
    // il cognome è la prima parola; con una particella ("De Luca", "Lo Monaco") anche la seconda
    var da = r.particelle.indexOf(parole[0]) >= 0 && parole.length > 2 ? 2 : 1;
    for (var i = da; i < parole.length; i++) if (elenco[parole[i]]) return elenco[parole[i]];
    // nessun nome conosciuto: finale dell'ultimo nome
    var ultimo = parole[parole.length - 1];
    if (parole.length - 1 < da) return '';
    if (r.eccezioniM.indexOf(ultimo) >= 0) return 'M';
    var fine = ultimo.slice(-1);
    if (r.finaliF.indexOf(fine) >= 0) return 'F';
    if (r.finaliM.indexOf(fine) >= 0) return 'M';
    return '';
  }

  App.NomiSesso = { indovina: indovina };
})(window.App = window.App || {});
