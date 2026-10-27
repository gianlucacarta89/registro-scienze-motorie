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
 *       Tempi: formatoTempo 'sec' = secondi e decimi ("12,8", prove di velocità) oppure
 *       'min' = minuti e secondi ("12:30", prove di resistenza). Senza formato (test vecchi):
 *       dalla tipologia (Velocità → sec, Resistenza → min), altrimenti come prima (auto).
 *       I valori salvati si leggono sempre allo stesso modo: con ":" sono minuti:secondi,
 *       senza sono secondi; così cambiare formato non cambia il significato dei dati.
 */
(function (App) {
  'use strict';

  function lim() { return App.Config.limiti; }
  function virgola(n) { return String(n).replace('.', ','); }
  function arrotonda(n) { return Math.round(n * 100) / 100; }

  // Formato del tempo di un test: 'sec' | 'min' | 'auto' (null se il test non è a tempo)
  function formato(test) {
    if (test.tipo !== 'tempo') return null;
    if (test.formatoTempo === 'sec' || test.formatoTempo === 'min') return test.formatoTempo;
    var k = App.U.chiaveNome(test.tipologia || '');
    if (k === 'velocita') return 'sec';
    if (k === 'resistenza') return 'min';
    return 'auto';
  }

  // secondi -> testo nel formato del test
  function formatta(test, sec) {
    sec = arrotonda(sec);
    var f = formato(test);
    if (f === 'sec') return virgola(sec);
    if (f === 'min') {
      var m = Math.floor(sec / 60), s = arrotonda(sec - m * 60);
      return m + ':' + (s < 10 ? '0' : '') + virgola(s);
    }
    return formattaTempo(sec);
  }

  // Lettura di un valore SALVATO (sempre uguale, qualunque sia il formato): "m:ss[,d]" oppure secondi
  function secondiSalvati(v) {
    var t = String(v == null ? '' : v).trim(), m = t.match(/^(\d+):(\d{1,2})(?:,(\d+))?$/);
    if (m) return Number(m[1]) * 60 + Number(m[2] + (m[3] ? '.' + m[3] : ''));
    m = t.match(/^(\d+)(?:[.,](\d+))?$/);
    return m ? Number(m[1] + (m[2] ? '.' + m[2] : '')) : null;
  }

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
      var f = formato(test);
      m = t.match(/^(\d+)\s*[:'’]\s*(\d{1,2})(?:[.,](\d+))?\s*["”″]?$/);
      // Resistenza (minuti e secondi): "12,30", "12.30" o "12 30" valgono 12:30 (comodo dal telefono)
      var mm = !m && f === 'min' ? t.match(/^(\d+)(?:\s*[.,\s]\s*(\d+))?$/) : null;
      if (mm && mm[2] !== undefined && mm[2].length !== 2) {
        return { ok: false, errore: test.nome + ': scrivi i secondi con due cifre (es. 12:05 o 12,05 per 12 minuti e 5 secondi).' };
      }
      if (m || mm) {
        var sec = m ? Number(m[2] + (m[3] ? '.' + m[3] : '')) : Number(mm[2] || 0);
        if (sec >= 60) return { ok: false, errore: test.nome + ': i secondi devono essere meno di 60 (es. 3:45).' };
        n = Number((m || mm)[1]) * 60 + sec;
      } else {
        m = t.match(/^(\d+)(?:[.,](\d+))?\s*(?:s|sec|["”″])?$/i);
        if (!m) return { ok: false, errore: test.nome + (f === 'sec' ? ': scrivi i secondi con la virgola per i decimi (es. 12,8).' : ': scrivi il tempo come 3:45 (minuti:secondi) oppure 12,8 (secondi).') };
        n = Number(m[1] + (m[2] ? '.' + m[2] : ''));
      }
      if (n > lim().valoreMax) return { ok: false, errore: test.nome + ': tempo troppo grande.' };
      return { ok: true, valore: formatta(test, n), numero: arrotonda(n) };
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

  // Numero di un valore salvato (i tempi in secondi, letti allo stesso modo in ogni formato)
  function numero(test, valore) {
    if (test.tipo === 'tempo') {
      var s = secondiSalvati(valore);
      return s === null ? null : arrotonda(s);
    }
    var r = valida(test, valore);
    return r.ok ? r.numero : null;
  }

  // Riscrive risultati e soglie dei voti nel formato attuale del test (es. dopo un cambio di formato)
  function riscrivi(classe, t) {
    if (t.tipo !== 'tempo') return;
    function nuovo(v) { var n = secondiSalvati(v); return n === null ? v : formatta(t, n); }
    Object.keys(classe.risultati || {}).forEach(function (a) {
      var r = classe.risultati[a][t.id];
      if (r) Object.keys(r).forEach(function (p) { r[p] = nuovo(r[p]); });
    });
    ((t.voti && t.voti.righe) || []).forEach(function (riga) {
      if (riga.M) riga.M = nuovo(riga.M);
      if (riga.F) riga.F = nuovo(riga.F);
    });
  }

  App.Test = {
    valida: valida,
    numero: numero,
    formato: formato,
    formatta: formatta,
    riscrivi: riscrivi,

    // Tutti i tempi di tutte le classi e dell'elenco nel formato del loro test (avvio, backup)
    riscriviTutti: function () {
      App.Stato.dati.classi.concat([App.Stato.dati.archivio]).forEach(function (c) {
        (c.test || []).forEach(function (t) { riscrivi(c, t); });
      });
    },
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
      var t = { id: App.U.nuovoId(), nome: App.U.spazi(d.nome), tipologia: App.U.spazi(d.tipologia), note: String(d.note || '').trim(),
        formatoTempo: d.tipo === 'tempo' && (d.formatoTempo === 'sec' || d.formatoTempo === 'min') ? d.formatoTempo : '', unita: d.tipo === 'tempo' ? '' : App.U.spazi(d.unita),
        tipo: d.tipo, migliore: d.migliore };
      impostaStrumento(t, d);
      classe.test.push(t);
      this.ordina(classe);
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
      t.formatoTempo = d.tipo === 'tempo' && (d.formatoTempo === 'sec' || d.formatoTempo === 'min') ? d.formatoTempo : (d.tipo === 'tempo' ? t.formatoTempo : '');
      riscrivi(classe, t);              // i tempi già scritti passano al nuovo formato
      this.ordina(classe);              // la tipologia può essere cambiata
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
      this.ordina(versoClasse);
      return { copiati: copiati, saltati: saltati };
    },

    elimina: function (classe, id) {
      // si toglie dall'elenco stesso (non una copia): vale anche per l'elenco dei test 📚
      var i = classe.test.findIndex(function (t) { return t.id === id; });
      if (i >= 0) classe.test.splice(i, 1);
      Object.keys(classe.risultati).forEach(function (a) { delete classe.risultati[a][id]; });
    },

    // Posizione della tipologia nell'ordine di config.js (tipologie a mano / nessuna: in fondo)
    gruppo: function (t) {
      var k = App.U.chiaveNome(t.tipologia || ''), lista = App.Config.tipologie;
      for (var i = 0; i < lista.length; i++) if (App.U.chiaveNome(lista[i]) === k) return i;
      return lista.length;
    },

    // Tutte le classi e l'elenco 📚 in ordine (all'avvio e dopo l'importazione di un backup)
    ordinaTutti: function () {
      var self = this;
      App.Stato.dati.classi.forEach(function (c) { self.ordina(c); });
      self.ordina(App.Stato.dati.archivio);
    },

    // Mette i test in ordine di tipologia; dentro la stessa tipologia resta l'ordine che c'era.
    // Ordina l'elenco stesso (non una copia): vale anche per l'elenco dei test 📚.
    ordina: function (classe) {
      var self = this, pos = {};
      classe.test.forEach(function (t, i) { pos[t.id] = i; });
      classe.test.sort(function (a, b) { return self.gruppo(a) - self.gruppo(b) || pos[a.id] - pos[b.id]; });
    },

    // Sposta un test di un posto, solo tra test della stessa tipologia. -> false se non si può
    sposta: function (classe, id, verso) {
      var i = classe.test.findIndex(function (t) { return t.id === id; }), j = i + verso;
      if (i < 0 || j < 0 || j >= classe.test.length) return false;
      if (this.gruppo(classe.test[i]) !== this.gruppo(classe.test[j])) return false;
      var x = classe.test[i]; classe.test[i] = classe.test[j]; classe.test[j] = x;
      return true;
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
      out.delta = segno + (test.tipo === 'tempo' ? formatta(test, ass) + (formato(test) === 'sec' || (formato(test) === 'auto' && ass < 60) ? ' s' : '') : virgola(ass));
      var meglio = test.migliore === 'alto' ? d > 0 : d < 0;
      out.esito = meglio ? 'meglio' : 'peggio';
      return out;
    }
  };
})(window.App = window.App || {});
