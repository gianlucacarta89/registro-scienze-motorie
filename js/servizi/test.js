/* test.js
 * Cosa fa: test della classe e risultati delle prove: controllo dei valori (numeri e tempi),
 *          salvataggio, confronto tra 1ª e 2ª prova.
 * Dipende da: App.Config (tipiTest, prove, limiti), App.U
 * Usato da: ui/tabella-test.js, ui/finestra-test.js
 *
 * Dati: classe.test = [{ id, nome, tipologia, note, strumento, unita, tipo: 'numero'|'tempo', migliore: 'alto'|'basso' }]
 *       tipologia (capacità valutata) e strumento sono testi liberi, facoltativi.
 *       Strumento diverso per alunni e alunne: perSesso = true, strumentoM / strumentoF.
 *       (Per età diverse basta la classe: ogni classe ha i suoi test.)
 *       classe.risultati[alunnoId][testId] = { '1': '145', '2': '152' }
 */
(function (App) {
  'use strict';

  function lim() { return App.Config.limiti; }
  function virgola(n) { return String(n).replace('.', ','); }
  function arrotonda(n) { return Math.round(n * 100) / 100; }

  // secondi -> "3:05,2" (oltre il minuto) o "12,8"
  function formattaTempo(sec) {
    sec = arrotonda(sec);
    if (sec < 60) return virgola(sec);
    var m = Math.floor(sec / 60), s = arrotonda(sec - m * 60);
    var ss = (s < 10 ? '0' : '') + virgola(s);
    return m + ':' + ss;
  }

  // Controlla un valore scritto. -> { ok:true, valore:'testo normalizzato', numero } oppure { ok:false, errore }
  function valida(test, testo) {
    var t = String(testo == null ? '' : testo).trim();
    if (t === '') return { ok: true, valore: '', numero: null };
    var m, n;
    if (test.tipo === 'tempo') {
      m = t.match(/^(\d+)\s*[:'’]\s*(\d{1,2})(?:[.,](\d+))?\s*["”″]?$/);
      if (m) {
        var sec = Number(m[2] + (m[3] ? '.' + m[3] : ''));
        if (sec >= 60) return { ok: false, errore: test.nome + ': i secondi devono essere meno di 60 (es. 3:45).' };
        n = Number(m[1]) * 60 + sec;
      } else {
        m = t.match(/^(\d+)(?:[.,](\d+))?\s*(?:s|sec|["”″])?$/i);
        if (!m) return { ok: false, errore: test.nome + ': scrivi il tempo come 3:45 (minuti:secondi) oppure 12,8 (secondi).' };
        n = Number(m[1] + (m[2] ? '.' + m[2] : ''));
      }
      if (n > lim().valoreMax) return { ok: false, errore: test.nome + ': tempo troppo grande.' };
      return { ok: true, valore: formattaTempo(n), numero: arrotonda(n) };
    }
    m = t.match(/^(\d+)(?:[.,](\d+))?$/);
    if (!m) return { ok: false, errore: test.nome + ': scrivi solo un numero, con la virgola per i decimali (es. 145 oppure 3,5).' };
    n = Number(m[1] + (m[2] ? '.' + m[2] : ''));
    if (n > lim().valoreMax) return { ok: false, errore: test.nome + ': il numero massimo è ' + lim().valoreMax + '.' };
    return { ok: true, valore: virgola(n), numero: n };
  }

  // Strumento: uno per tutti, oppure uno per gli alunni e uno per le alunne
  function impostaStrumento(t, d) {
    t.perSesso = !!d.perSesso;
    t.strumento = t.perSesso ? '' : App.U.spazi(d.strumento);
    t.strumentoM = t.perSesso ? App.U.spazi(d.strumentoM) : '';
    t.strumentoF = t.perSesso ? App.U.spazi(d.strumentoF) : '';
  }

  // Testi dello strumento da mostrare -> ['Medball 3 kg'] oppure ['♂ Medball 4 kg', '♀ Medball 3 kg']
  function etichetteStrumento(t) {
    if (!t.perSesso) return t.strumento ? [t.strumento] : [];
    return [t.strumentoM ? '♂ ' + t.strumentoM : '', t.strumentoF ? '♀ ' + t.strumentoF : ''].filter(Boolean);
  }

  function numero(test, valore) {
    var r = valida(test, valore);
    return r.ok ? r.numero : null;
  }

  App.Test = {
    valida: valida,
    numero: numero,
    etichetteStrumento: etichetteStrumento,
    formattaTempo: formattaTempo,

    trova: function (classe, id) {
      return classe.test.filter(function (t) { return t.id === id; })[0] || null;
    },

    // Controlla i dati del modulo "Nuovo test"
    erroreDati: function (classe, d, escludiId) {
      var nome = App.U.spazi(d.nome);
      if (!nome) return 'Scrivi il nome del test (es. Salto in lungo).';
      if (nome.length > lim().nomeTest) return 'Il nome del test può avere al massimo ' + lim().nomeTest + ' caratteri.';
      var k = App.U.chiaveNome(nome);
      if (classe.test.some(function (t) { return t.id !== escludiId && App.U.chiaveNome(t.nome) === k; }))
        return 'Esiste già un test "' + nome + '" in questa classe.';
      if (!App.Config.tipiTest[d.tipo]) return 'Scegli il tipo di risultato.';
      if (d.migliore !== 'alto' && d.migliore !== 'basso') return 'Scegli se è meglio un valore più alto o più basso.';
      if (String(d.note || '').trim().length > lim().noteTest) return 'Le note possono avere al massimo ' + lim().noteTest + ' caratteri.';
      if (App.U.spazi(d.tipologia).length > lim().tipologia) return 'La tipologia può avere al massimo ' + lim().tipologia + ' caratteri.';
      var troppo = [d.strumento, d.strumentoM, d.strumentoF].some(function (x) { return App.U.spazi(x).length > lim().strumento; });
      if (troppo) return 'Lo strumento può avere al massimo ' + lim().strumento + ' caratteri.';
      if (App.U.spazi(d.unita).length > lim().unita) return 'L\'unità di misura può avere al massimo ' + lim().unita + ' caratteri.';
      return null;
    },

    crea: function (classe, d) {
      var err = this.erroreDati(classe, d);
      if (err) return { errore: err };
      var t = { id: App.U.nuovoId(), nome: App.U.spazi(d.nome), tipologia: App.U.spazi(d.tipologia), note: String(d.note || '').trim(), unita: d.tipo === 'tempo' ? '' : App.U.spazi(d.unita),
        tipo: d.tipo, migliore: d.migliore };
      impostaStrumento(t, d);
      classe.test.push(t);
      return { test: t };
    },

    // Il tipo non si può cambiare se ci sono già risultati (cambierebbe il loro significato)
    modifica: function (classe, id, d) {
      var t = this.trova(classe, id);
      var err = this.erroreDati(classe, d, id);
      if (err) return err;
      if (d.tipo !== t.tipo && this.quantiRisultati(classe, id) > 0)
        return 'Non puoi cambiare il tipo: ci sono già dei risultati. Cancellali o crea un nuovo test.';
      t.nome = App.U.spazi(d.nome);
      t.tipologia = App.U.spazi(d.tipologia);
      t.note = String(d.note || '').trim();
      impostaStrumento(t, d);
      t.tipo = d.tipo;
      t.unita = d.tipo === 'tempo' ? '' : App.U.spazi(d.unita);
      t.migliore = d.migliore;
      return null;
    },

    // Copia i test scelti in un'altra classe (nome, tipologia, strumento, tabella voti; niente risultati).
    // I test con lo stesso nome già presenti nella classe di arrivo si saltano. -> { copiati, saltati: [nomi] }
    copia: function (daClasse, ids, versoClasse) {
      var copiati = 0, saltati = [];
      daClasse.test.filter(function (t) { return ids.indexOf(t.id) >= 0; }).forEach(function (t) {
        var k = App.U.chiaveNome(t.nome);
        if (versoClasse.test.some(function (x) { return App.U.chiaveNome(x.nome) === k; })) { saltati.push(t.nome); return; }
        var nuovo = App.U.copia(t);
        nuovo.id = App.U.nuovoId();
        delete nuovo.origine;             // la copia non è collegata al test d'origine
        versoClasse.test.push(nuovo);
        copiati++;
      });
      return { copiati: copiati, saltati: saltati };
    },

    elimina: function (classe, id) {
      // si toglie dall'elenco stesso (non una copia): vale anche per l'elenco dei test 📚
      var i = classe.test.findIndex(function (t) { return t.id === id; });
      if (i >= 0) classe.test.splice(i, 1);
      Object.keys(classe.risultati).forEach(function (a) { delete classe.risultati[a][id]; });
    },

    sposta: function (classe, id, verso) {
      var i = classe.test.findIndex(function (t) { return t.id === id; }), j = i + verso;
      if (i < 0 || j < 0 || j >= classe.test.length) return;
      var x = classe.test[i]; classe.test[i] = classe.test[j]; classe.test[j] = x;
    },

    quantiRisultati: function (classe, id) {
      var n = 0;
      Object.keys(classe.risultati).forEach(function (a) {
        var r = classe.risultati[a][id];
        if (r) n += Object.keys(r).filter(function (p) { return r[p] !== ''; }).length;
      });
      return n;
    },

    valore: function (classe, alunnoId, testId, prova) {
      var r = classe.risultati[alunnoId] && classe.risultati[alunnoId][testId];
      return (r && r[prova]) || '';
    },

    // Salva un valore già controllato; '' cancella
    imposta: function (classe, alunnoId, testId, prova, valore) {
      var R = classe.risultati;
      if (valore === '') {
        if (R[alunnoId] && R[alunnoId][testId]) {
          delete R[alunnoId][testId][prova];
          if (!Object.keys(R[alunnoId][testId]).length) delete R[alunnoId][testId];
          if (!Object.keys(R[alunnoId]).length) delete R[alunnoId];
        }
        return;
      }
      R[alunnoId] = R[alunnoId] || {};
      R[alunnoId][testId] = R[alunnoId][testId] || {};
      R[alunnoId][testId][prova] = valore;
    },

    // Confronto 1ª -> 2ª prova: { v1, v2, delta: 'testo', esito: 'meglio'|'peggio'|'uguale'|null }
    // Confronto dalla 1ª all'ULTIMA prova svolta (2ª o 3ª):
    // { valori: ['145', '152', ''], v1, vFine, provaFine, delta, esito: 'meglio'|'peggio'|'uguale'|null }
    confronto: function (classe, alunnoId, test) {
      var self = this;
      var valori = App.Config.prove.map(function (p) { return self.valore(classe, alunnoId, test.id, p.id); });
      var v1 = valori[0], provaFine = null, v2 = '';
      for (var i = valori.length - 1; i >= 1; i--) if (valori[i] !== '') { provaFine = i + 1; v2 = valori[i]; break; }
      var n1 = numero(test, v1), n2 = numero(test, v2);
      var out = { valori: valori, v1: v1, vFine: v2, provaFine: provaFine, delta: '', esito: null };
      if (n1 === null || n2 === null || v1 === '' || v2 === '') return out;
      var d = arrotonda(n2 - n1);
      if (d === 0) { out.esito = 'uguale'; out.delta = '='; return out; }
      var segno = d > 0 ? '+' : '−';
      var ass = Math.abs(d);
      out.delta = segno + (test.tipo === 'tempo' ? formattaTempo(ass) + (ass < 60 ? ' s' : '') : virgola(ass));
      var meglio = test.migliore === 'alto' ? d > 0 : d < 0;
      out.esito = meglio ? 'meglio' : 'peggio';
      return out;
    }
  };
})(window.App = window.App || {});
