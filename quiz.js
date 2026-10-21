/**
 * Quiz-Modus: Auswahl von Themen, Schwierigkeit, Fragetyp und Lernmodus;
 * danach Fragen mit sofortigem Feedback, Erklärung und Fundstelle.
 * Jede Antwort fließt in das Leitner-System ein.
 */
window.App = window.App || {};
App.views = App.views || {};

App.views.quiz = (() => {
  const { h, num } = App.util;
  const icon = App.icons.el;
  const { DIFFICULTY, TYPE_LABEL } = App.content;

  const MODES = [
    ['mixed', 'Gemischt', 'Neue und schwache Fragen, gewichtet nach Fehlern'],
    ['due', 'Fällig', 'Nur Fragen, deren Wiederholung ansteht'],
    ['mistakes', 'Fehler', 'Nur Fragen, die du schon einmal falsch hattest'],
    ['new', 'Neu', 'Nur noch nie bearbeitete Fragen'],
    ['exercise', 'Übungsblätter', 'Nur Originalfragen der Übungsblätter'],
  ];

  let lastConfig = null;

  function render(root, params) {
    const cfg = {
      topics: params.topic ? [params.topic] : [],
      diffs: [], types: [], count: 10,
      mode: params.mode || 'mixed',
    };
    if (params.topic || params.mode) return start(root, cfg);
    renderSetup(root, cfg);
  }

  /** Mehrfachauswahl als Chip-Gruppe. */
  function chipGroup(label, entries, selected, onToggle) {
    return h('fieldset.chip-group',
      h('legend', label),
      h('div.chips', entries.map(([value, text]) => {
        const btn = h('button.chip-toggle', {
          type: 'button', 'aria-pressed': String(selected.includes(value)),
          onclick: () => {
            onToggle(value);
            btn.setAttribute('aria-pressed', String(selected.includes(value)));
          },
        }, text);
        return btn;
      })));
  }

  function renderSetup(root, cfg) {
    const toggle = (arr) => (v) => { const i = arr.indexOf(v); i >= 0 ? arr.splice(i, 1) : arr.push(v); updateCount(); };
    const countOut = h('output.count-out', String(cfg.count));
    const avail = h('span.muted');
    const updateCount = () => {
      const n = App.content.pickQuestions({ ...cfg, count: 9999 }).length;
      avail.textContent = `${n} passende Fragen verfügbar`;
      startBtn.disabled = n === 0;
    };
    const startBtn = h('button.btn.btn-primary.btn-lg', { type: 'button', onclick: () => start(root, cfg) }, icon('play', 18), 'Quiz starten');

    const modeList = h('div.mode-list', MODES.map(([value, title, desc]) => h('label.mode',
      h('input', { type: 'radio', name: 'mode', value, checked: cfg.mode === value ? true : null, onchange: () => { cfg.mode = value; updateCount(); } }),
      h('span.mode-ui', h('strong', title), h('span.muted', desc)))));

    root.append(
      h('header.page-head', h('h1', 'Quiz-Modus'),
        h('p.lead', 'Aktives Abrufen mit sofortigem Feedback. Falsch beantwortete Fragen kommen automatisch häufiger dran.')),
      h('section.card.setup',
        h('fieldset.chip-group', h('legend', 'Lernmodus'), modeList),
        chipGroup('Themen (leer = alle)', App.TOPICS.map((t) => [t.id, t.title]), cfg.topics, toggle(cfg.topics)),
        chipGroup('Schwierigkeit (leer = alle)', [1, 2, 3, 4].map((d) => [d, DIFFICULTY[d]]), cfg.diffs, toggle(cfg.diffs)),
        chipGroup('Fragetyp (leer = alle)', Object.entries(TYPE_LABEL), cfg.types, toggle(cfg.types)),
        h('div.range-row',
          h('label', { for: 'q-count' }, 'Anzahl Fragen'),
          h('input#q-count', { type: 'range', min: 5, max: 40, step: 5, value: cfg.count, oninput: (e) => { cfg.count = Number(e.target.value); countOut.textContent = e.target.value; } }),
          countOut),
        h('div.setup-foot', avail, startBtn)));
    updateCount();
  }

  function start(root, cfg) {
    lastConfig = cfg;
    const questions = App.content.pickQuestions(cfg);
    root.replaceChildren();
    if (!questions.length) {
      root.append(h('section.empty',
        icon('check', 40),
        h('h2', cfg.mode === 'due' ? 'Nichts fällig!' : 'Keine passenden Fragen'),
        h('p.muted', cfg.mode === 'due' ? 'Alle Wiederholungen sind erledigt. Übe neue Fragen oder starte eine Probeklausur.' : 'Passe die Filter an.'),
        h('div.action-row', h('a.btn.btn-primary', { href: '#/quiz' }, 'Quiz konfigurieren'), h('a.btn.btn-ghost', { href: '#/' }, 'Zur Startseite'))));
      return;
    }
    session(root, questions);
  }

  function session(root, questions) {
    let index = 0;
    const results = [];
    let ctrl = null;
    let checked = false;

    const progress = App.views.dashboard.progressBar(0);
    const counter = h('span.muted');
    const streakBadge = h('span.combo');
    const stage = h('div.stage');
    const actionBtn = h('button.btn.btn-primary.btn-lg.btn-block', { type: 'button', onclick: () => act() });
    const skipBtn = h('button.btn.btn-ghost', { type: 'button', onclick: () => skip() }, 'Überspringen');

    root.append(
      h('div.session-top',
        h('a.icon-btn', { href: '#/quiz', 'aria-label': 'Quiz beenden' }, icon('x', 22)),
        progress, counter, streakBadge),
      stage,
      h('div.session-actions', skipBtn, actionBtn));

    const keyHandler = (ev) => {
      if (!document.body.contains(stage)) { document.removeEventListener('keydown', keyHandler); return; }
      if (ev.target.matches('input, select, textarea') && ev.key !== 'Enter') return;
      if (ev.key === 'Enter') { ev.preventDefault(); act(); }
      const n = Number(ev.key);
      if (!checked && n >= 1 && n <= 9) {
        const opts = stage.querySelectorAll('.option');
        if (opts[n - 1]) opts[n - 1].click();
      }
    };
    document.addEventListener('keydown', keyHandler);

    function show() {
      checked = false;
      const q = questions[index];
      ctrl = App.question.renderQuestion(q, { onChange: updateButton, onEnter: () => act() });
      stage.replaceChildren(ctrl.el);
      stage.classList.remove('slide-in');
      void stage.offsetWidth; // Animation neu starten
      stage.classList.add('slide-in');
      counter.textContent = `${index + 1} / ${questions.length}`;
      progress.firstChild.style.width = `${(index / questions.length) * 100}%`;
      skipBtn.hidden = false;
      updateButton();
      ctrl.el.querySelector('input')?.focus({ preventScroll: true });
    }

    function updateButton() {
      if (checked) return;
      actionBtn.replaceChildren('Prüfen');
      actionBtn.disabled = !ctrl.isComplete();
      actionBtn.className = 'btn btn-primary btn-lg btn-block';
    }

    function act() {
      if (!checked) {
        if (!ctrl.isComplete()) return;
        const q = questions[index];
        const res = App.question.evaluate(q, ctrl.response);
        App.store.record(q.id, res.score, { topic: q.t, kind: 'q' });
        results.push({ q, res, response: ctrl.response });
        ctrl.showFeedback(res);
        checked = true;
        skipBtn.hidden = true;
        actionBtn.disabled = false;
        actionBtn.className = `btn btn-lg btn-block ${res.correct ? 'btn-success' : 'btn-danger'}`;
        actionBtn.replaceChildren(index === questions.length - 1 ? 'Auswertung' : 'Weiter', icon('right', 18));
        updateCombo();
        ctrl.el.querySelector('.feedback')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
      }
      next();
    }

    function skip() {
      const q = questions[index];
      results.push({ q, res: { score: 0, correct: false, skipped: true }, response: null });
      next();
    }

    function next() {
      index += 1;
      if (index >= questions.length) return finish();
      show();
    }

    function updateCombo() {
      let combo = 0;
      for (let i = results.length - 1; i >= 0 && results[i].res.correct; i -= 1) combo += 1;
      streakBadge.replaceChildren(combo >= 2 ? h('span.combo-badge', icon('flame', 16), `${combo}er-Serie`) : '');
    }

    function finish() {
      document.removeEventListener('keydown', keyHandler);
      const score = results.reduce((s, r) => s + r.res.score, 0);
      const ratio = score / results.length;
      const wrong = results.filter((r) => !r.res.correct);
      root.replaceChildren(
        h('section.result-hero',
          App.views.dashboard.ring(ratio, 140, 12, 'richtig'),
          h('div',
            h('h1', ratio >= 0.9 ? 'Hervorragend!' : ratio >= 0.7 ? 'Gut gemacht!' : ratio >= 0.5 ? 'Solide Basis' : 'Dranbleiben!'),
            h('p.lead', `${results.filter((r) => r.res.correct).length} von ${results.length} vollständig richtig · ${num(score)} Punkte.`),
            h('p.muted', wrong.length ? 'Die falschen Fragen landen in Box 1 und werden bald wiederholt.' : 'Alle Fragen sind eine Leitner-Box aufgestiegen.'),
            h('div.action-row',
              wrong.length ? h('button.btn.btn-primary', { type: 'button', onclick: () => { root.replaceChildren(); session(root, wrong.map((w) => w.q)); } }, icon('rotate', 18), 'Fehler sofort wiederholen') : null,
              h('button.btn.btn-secondary', { type: 'button', onclick: () => start(root, lastConfig) }, icon('play', 18), 'Neue Runde'),
              h('a.btn.btn-ghost', { href: '#/' }, 'Startseite')))),
        h('section.card',
          h('div.card-head', h('h2', icon('list', 20), 'Deine Antworten')),
          h('div.review-list', results.map(({ q, res, response }) => reviewItem(q, res, response)))));
    }

    show();
  }

  /** Zusammenklappbarer Rückblick auf eine beantwortete Frage. */
  function reviewItem(q, res, response) {
    const status = res.skipped ? 'skip' : res.correct ? 'right' : res.score > 0 ? 'partial' : 'wrong';
    return h(`details.review.review-${status}`,
      h('summary',
        h('span.review-icon', icon(status === 'right' ? 'check' : status === 'skip' ? 'right' : status === 'partial' ? 'info' : 'x', 16)),
        h('span.review-q', q.q.replace(/___/g, '…')),
        h('span.review-score', res.skipped ? 'übersprungen' : `${Math.round(res.score * 100)} %`)),
      h('div.review-body',
        h('div.review-cols',
          h('div', h('span.label', 'Deine Antwort'), h('pre.answer', App.question.responseText(q, response))),
          h('div', h('span.label', 'Richtig'), h('pre.answer', App.question.solutionText(q)))),
        h('p', q.e),
        App.question.sourceList(q)));
  }

  return { render, reviewItem };
})();
