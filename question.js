/**
 * Darstellung und Auswertung aller Fragetypen.
 *
 * Antwortformate (response):
 *  single → Index der Option          multi → Array von Indizes
 *  tf     → true | false              match → Array gewählter rechter Texte
 *  cloze  → Array eingegebener Texte  order → Array der Original-Indizes
 *
 * renderQuestion() liefert einen Controller, mit dem Quiz und Prüfung
 * die Antwort lesen, die Eingabe sperren und Feedback anzeigen.
 */
window.App = window.App || {};

App.question = (() => {
  const { h, shuffle, normalize } = App.util;
  const icon = App.icons.el;

  /* ───────────── Auswertung ───────────── */

  /**
   * @returns {{score:number, correct:boolean, detail:any}}
   *  score: 0…1 (Teilpunkte bei multi/match/cloze/order)
   */
  function evaluate(q, response) {
    switch (q.type) {
      case 'single': {
        const ok = response === q.a;
        return { score: ok ? 1 : 0, correct: ok };
      }
      case 'tf': {
        const ok = response === q.a;
        return { score: ok ? 1 : 0, correct: ok };
      }
      case 'multi': {
        const chosen = new Set(response || []);
        const right = new Set(q.a);
        let hits = 0; let wrong = 0;
        chosen.forEach((i) => (right.has(i) ? (hits += 1) : (wrong += 1)));
        const score = Math.max(0, (hits - wrong) / right.size);
        const ok = hits === right.size && wrong === 0;
        return { score: ok ? 1 : score, correct: ok };
      }
      case 'match': {
        const detail = q.pairs.map(([, right], i) => (response || [])[i] === right);
        const hits = detail.filter(Boolean).length;
        return { score: hits / q.pairs.length, correct: hits === q.pairs.length, detail };
      }
      case 'cloze': {
        const detail = q.a.map((accepted, i) => accepted.some((acc) => normalize(acc) === normalize((response || [])[i])));
        const hits = detail.filter(Boolean).length;
        return { score: hits / q.a.length, correct: hits === q.a.length, detail };
      }
      case 'order': {
        const order = response || q.items.map((_, i) => i);
        const detail = order.map((orig, pos) => orig === pos);
        const hits = detail.filter(Boolean).length;
        return { score: hits / q.items.length, correct: hits === q.items.length, detail };
      }
      default:
        return { score: 0, correct: false };
    }
  }

  /** Lesbare Darstellung der richtigen Lösung. */
  function solutionText(q) {
    switch (q.type) {
      case 'single': return q.o[q.a];
      case 'multi': return q.a.map((i) => q.o[i]).join(' · ');
      case 'tf': return q.a ? 'Wahr' : 'Falsch';
      case 'match': return q.pairs.map(([l, r]) => `${l} → ${r}`).join('\n');
      case 'cloze': return q.a.map((acc, i) => `${i + 1}: ${acc[0]}`).join(' · ');
      case 'order': return q.items.map((it, i) => `${i + 1}. ${it}`).join('\n');
      default: return '';
    }
  }

  /** Lesbare Darstellung der eigenen Antwort (für die Ergebnisanalyse). */
  function responseText(q, r) {
    if (r === undefined || r === null || (Array.isArray(r) && !r.length)) return '— keine Antwort —';
    switch (q.type) {
      case 'single': return q.o[r];
      case 'multi': return r.map((i) => q.o[i]).join(' · ');
      case 'tf': return r ? 'Wahr' : 'Falsch';
      case 'match': return q.pairs.map(([l], i) => `${l} → ${r[i] || '—'}`).join('\n');
      case 'cloze': return r.map((v, i) => `${i + 1}: ${v || '—'}`).join(' · ');
      case 'order': return r.map((orig, i) => `${i + 1}. ${q.items[orig]}`).join('\n');
      default: return '';
    }
  }

  function isComplete(q, r) {
    switch (q.type) {
      case 'single': return Number.isInteger(r);
      case 'tf': return typeof r === 'boolean';
      case 'multi': return Array.isArray(r) && r.length > 0;
      case 'match': return Array.isArray(r) && r.length === q.pairs.length && r.every(Boolean);
      case 'cloze': return Array.isArray(r) && r.length === q.a.length && r.every((v) => String(v || '').trim());
      case 'order': return Array.isArray(r);
      default: return false;
    }
  }

  /* ───────────── Darstellung ───────────── */

  function metaBar(q) {
    const topic = App.topicById(q.t);
    return h('div.q-meta',
      h('span.chip', topic ? topic.title : q.t),
      h(`span.chip.diff-${q.d}`, App.content.DIFFICULTY[q.d]),
      h('span.chip.chip-ghost', App.content.TYPE_LABEL[q.type]),
      q.ex ? h('span.chip.chip-accent', { title: q.ex }, 'Übungsblatt') : null);
  }

  /** Fundstellen-Liste. */
  function sourceList(q) {
    const refs = [...q.s];
    if (q.ex) refs.unshift(['UE', q.ex]);
    return h('div.sources', icon('source', 16),
      h('span', refs.map((r) => App.formatSource(r)).join(' · ')));
  }

  /**
   * Rendert eine Frage.
   * @param {object} q
   * @param {object} [opts] { response, onChange(response), exam:boolean }
   */
  function renderQuestion(q, opts = {}) {
    let response = opts.response !== undefined ? structuredClone(opts.response) : undefined;
    let locked = false;
    const emit = () => opts.onChange && opts.onChange(response);

    const body = h('div.q-body');
    const root = h('div.question', { 'data-type': q.type }, metaBar(q));

    const prompt = q.type === 'cloze' ? null : h('h2.q-prompt', q.q);
    if (prompt) root.append(prompt);
    root.append(body);

    // Gemischte Darstellung, aber Antworten beziehen sich auf Original-Indizes.
    const optionOrder = q.o ? (opts.order || shuffle(q.o.map((_, i) => i))) : null;
    const widgets = [];

    if (q.type === 'single' || q.type === 'multi') {
      const multi = q.type === 'multi';
      if (multi) body.append(h('p.q-hint', 'Mehrere Antworten können richtig sein.'));
      if (multi && !Array.isArray(response)) response = [];
      const list = h('div.options', { role: multi ? 'group' : 'radiogroup' });
      optionOrder.forEach((origIdx, displayIdx) => {
        const btn = h('button.option', {
          type: 'button',
          role: multi ? 'checkbox' : 'radio',
          'aria-checked': 'false',
          onclick: () => {
            if (locked) return;
            if (multi) {
              const set = new Set(response);
              set.has(origIdx) ? set.delete(origIdx) : set.add(origIdx);
              response = [...set];
            } else {
              response = origIdx;
            }
            sync();
            emit();
          },
        }, h('span.option-key', String.fromCharCode(65 + displayIdx)), h('span.option-text', q.o[origIdx]));
        widgets.push({ btn, origIdx });
        list.append(btn);
      });
      body.append(list);
      function sync() {
        widgets.forEach(({ btn, origIdx }) => {
          const on = multi ? response.includes(origIdx) : response === origIdx;
          btn.classList.toggle('selected', on);
          btn.setAttribute('aria-checked', String(on));
        });
      }
      sync();
      root._sync = sync;
    }

    if (q.type === 'tf') {
      const list = h('div.options.options-tf', { role: 'radiogroup' });
      [[true, 'Wahr', 'check'], [false, 'Falsch', 'x']].forEach(([val, label, ic]) => {
        const btn = h('button.option.option-tf', {
          type: 'button', role: 'radio', 'aria-checked': 'false',
          onclick: () => { if (locked) return; response = val; sync(); emit(); },
        }, icon(ic, 22), h('span', label));
        widgets.push({ btn, val });
        list.append(btn);
      });
      body.append(list);
      function sync() {
        widgets.forEach(({ btn, val }) => {
          btn.classList.toggle('selected', response === val);
          btn.setAttribute('aria-checked', String(response === val));
        });
      }
      sync();
    }

    if (q.type === 'match') {
      const rights = opts.rights || shuffle([...new Set(q.pairs.map(([, r]) => r))]);
      if (!Array.isArray(response)) response = q.pairs.map(() => '');
      const table = h('div.match');
      q.pairs.forEach(([left], i) => {
        const select = h('select.match-select', {
          'aria-label': `Zuordnung für ${left}`,
          onchange: (ev) => { response[i] = ev.target.value; emit(); },
        }, h('option', { value: '' }, '– bitte wählen –'), rights.map((r) => h('option', { value: r }, r)));
        select.value = response[i] || '';
        widgets.push({ select, i });
        table.append(h('div.match-row', h('div.match-left', left), h('div.match-arrow', icon('right', 18)), h('div.match-right', select)));
      });
      body.append(table);
    }

    if (q.type === 'cloze') {
      const parts = q.q.split('___');
      if (!Array.isArray(response)) response = q.a.map(() => '');
      const para = h('p.cloze');
      parts.forEach((part, i) => {
        para.append(part);
        if (i < parts.length - 1) {
          const input = h('input.cloze-input', {
            type: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false',
            'aria-label': `Lücke ${i + 1}`, value: response[i] || '',
            size: Math.max(4, Math.min(22, (q.a[i][0] || '').length + 2)),
            oninput: (ev) => { response[i] = ev.target.value; emit(); },
            onkeydown: (ev) => { if (ev.key === 'Enter' && opts.onEnter) opts.onEnter(); },
          });
          widgets.push({ input, i });
          para.append(input);
        }
      });
      root.insertBefore(h('h2.q-prompt.q-prompt-small', 'Fülle die Lücken aus.'), body);
      body.append(para);
    }

    if (q.type === 'order') {
      if (!Array.isArray(response)) {
        // Nie bereits korrekt sortiert starten
        let start = shuffle(q.items.map((_, i) => i));
        if (start.every((v, i) => v === i) && start.length > 1) start = [...start.slice(1), start[0]];
        response = start;
        emit();
      }
      const list = h('ol.order-list');
      const draw = () => {
        list.innerHTML = '';
        response.forEach((orig, pos) => {
          const li = h('li.order-item', { 'data-pos': pos },
            h('span.order-num', String(pos + 1)),
            h('span.order-text', q.items[orig]),
            h('span.order-btns',
              h('button.icon-btn', { type: 'button', 'aria-label': 'Nach oben', disabled: pos === 0 || locked ? true : null, onclick: () => move(pos, -1) }, icon('up', 18)),
              h('button.icon-btn', { type: 'button', 'aria-label': 'Nach unten', disabled: pos === response.length - 1 || locked ? true : null, onclick: () => move(pos, 1) }, icon('down', 18))));
          list.append(li);
        });
      };
      const move = (pos, dir) => {
        if (locked) return;
        const target = pos + dir;
        if (target < 0 || target >= response.length) return;
        [response[pos], response[target]] = [response[target], response[pos]];
        draw();
        emit();
      };
      draw();
      body.append(h('p.q-hint', 'Sortiere mit den Pfeilen in die richtige Reihenfolge.'), list);
      root._draw = draw;
    }

    const feedbackHost = h('div.feedback-host');
    root.append(feedbackHost);

    /* Controller */
    return {
      el: root,
      optionOrder,
      get response() { return response; },
      isComplete: () => isComplete(q, response),
      lock() {
        locked = true;
        root.classList.add('locked');
        root.querySelectorAll('input, select').forEach((n) => { n.disabled = true; });
        if (root._draw) root._draw();
      },
      /** Markiert richtig/falsch und zeigt Erklärung + Fundstelle. */
      showFeedback(result) {
        this.lock();
        if (q.type === 'single' || q.type === 'multi') {
          const right = q.type === 'single' ? [q.a] : q.a;
          widgets.forEach(({ btn, origIdx }) => {
            if (right.includes(origIdx)) btn.classList.add('is-right');
            else if (btn.classList.contains('selected')) btn.classList.add('is-wrong');
          });
        }
        if (q.type === 'tf') {
          widgets.forEach(({ btn, val }) => {
            if (val === q.a) btn.classList.add('is-right');
            else if (btn.classList.contains('selected')) btn.classList.add('is-wrong');
          });
        }
        if (q.type === 'match') {
          widgets.forEach(({ select, i }) => {
            const ok = result.detail[i];
            select.classList.add(ok ? 'is-right' : 'is-wrong');
            if (!ok) select.parentElement.append(h('div.correction', `Richtig: ${q.pairs[i][1]}`));
          });
        }
        if (q.type === 'cloze') {
          widgets.forEach(({ input, i }) => {
            const ok = result.detail[i];
            input.classList.add(ok ? 'is-right' : 'is-wrong');
            if (!ok) input.after(h('span.correction-inline', q.a[i][0]));
          });
        }
        if (q.type === 'order') {
          root.querySelectorAll('.order-item').forEach((li, pos) => li.classList.add(result.detail[pos] ? 'is-right' : 'is-wrong'));
          if (!result.correct) {
            root.querySelector('.q-body').append(h('div.correction-block', h('strong', 'Richtige Reihenfolge:'), h('ol', q.items.map((it) => h('li', it)))));
          }
        }
        feedbackHost.innerHTML = '';
        feedbackHost.append(feedbackPanel(q, result));
      },
    };
  }

  function feedbackPanel(q, result) {
    const partial = !result.correct && result.score > 0;
    const kind = result.correct ? 'right' : partial ? 'partial' : 'wrong';
    const title = result.correct ? 'Richtig!' : partial ? `Teilweise richtig (${Math.round(result.score * 100)} %)` : 'Leider falsch';
    return h(`div.feedback.feedback-${kind}`, { role: 'status', 'aria-live': 'polite' },
      h('div.feedback-title', icon(result.correct ? 'check' : partial ? 'info' : 'x', 20), h('span', title)),
      !result.correct && (q.type === 'single' || q.type === 'tf' || q.type === 'multi')
        ? h('p.feedback-solution', h('strong', 'Lösung: '), solutionText(q)) : null,
      h('p.feedback-expl', q.e),
      sourceList(q));
  }

  return { renderQuestion, evaluate, solutionText, responseText, isComplete, sourceList, feedbackPanel };
})();
