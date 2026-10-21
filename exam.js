/**
 * Prüfungsmodus (Probeklausur): zufällige Aufgaben über alle Themen,
 * Punkte nach Schwierigkeit, Countdown, freie Navigation, keine Hilfen
 * während der Bearbeitung – danach ausführliche Ergebnisanalyse.
 */
window.App = window.App || {};
App.views = App.views || {};

App.views.exam = (() => {
  const { h, formatDuration, pct, num } = App.util;
  const icon = App.icons.el;

  const PRESETS = [
    { id: 'kurz', label: 'Kurztest', n: 10, min: 12 },
    { id: 'standard', label: 'Teilprüfung', n: 20, min: 25 },
    { id: 'lang', label: 'Generalprobe', n: 40, min: 50 },
  ];

  /** Punkte je Schwierigkeit (leicht 1 … klausurähnlich 4). */
  const points = (q) => q.d;

  let timerId = null;

  function render(root) {
    clearInterval(timerId);
    const cfg = { preset: 'standard', topics: [] };
    const presetList = h('div.mode-list', PRESETS.map((p) => h('label.mode',
      h('input', { type: 'radio', name: 'preset', value: p.id, checked: cfg.preset === p.id ? true : null, onchange: () => { cfg.preset = p.id; } }),
      h('span.mode-ui', h('strong', p.label), h('span.muted', `${p.n} Aufgaben · ${p.min} Minuten`)))));

    root.append(
      h('header.page-head', h('h1', 'Prüfungsmodus'),
        h('p.lead', 'Simuliere die Klausur: zufällige Aufgaben aus allen Kapiteln, gewichtet nach Klausurrelevanz, mit Zeitlimit und Punktebewertung. Feedback gibt es erst am Ende.')),
      h('section.card.setup',
        h('fieldset.chip-group', h('legend', 'Umfang'), presetList),
        h('fieldset.chip-group', h('legend', 'Themen (leer = alle)'),
          h('div.chips', App.TOPICS.map((t) => {
            const btn = h('button.chip-toggle', {
              type: 'button', 'aria-pressed': 'false',
              onclick: () => {
                const i = cfg.topics.indexOf(t.id);
                i >= 0 ? cfg.topics.splice(i, 1) : cfg.topics.push(t.id);
                btn.setAttribute('aria-pressed', String(cfg.topics.includes(t.id)));
              },
            }, t.title);
            return btn;
          }))),
        h('div.callout', icon('info', 18), h('div',
          h('strong', 'Bewertung: '), 'Leicht 1 · Mittel 2 · Schwer 3 · Klausur 4 Punkte. Teilpunkte bei Mehrfachauswahl, Zuordnung, Lückentext und Reihenfolge. ',
          h('span.muted', 'Laut Modulhandbuch besteht die Portfolioprüfung aus zwei Teilprüfungen (je 50 %). Bestehensgrenze und Notenschlüssel sind in den Unterlagen nicht angegeben.'))),
        h('div.setup-foot', h('span'),
          h('button.btn.btn-primary.btn-lg', { type: 'button', onclick: () => {
            const preset = PRESETS.find((p) => p.id === cfg.preset);
            const qs = App.content.pickExam(preset.n, cfg.topics);
            run(root, qs, preset.min * 60);
          } }, icon('timer', 18), 'Prüfung starten'))));

    const history = App.store.state.exams.slice(-5).reverse();
    if (history.length) {
      root.append(h('section.card',
        h('div.card-head', h('h2', icon('trophy', 20), 'Letzte Prüfungen')),
        h('div.table-scroll', h('table.data-table',
          h('thead', h('tr', h('th', 'Datum'), h('th', 'Ergebnis'), h('th', 'Punkte'), h('th', 'Zeit'))),
          h('tbody', history.map((e) => h('tr',
            h('td', App.util.formatDateTime(e.ts)),
            h('td', h('strong', pct(e.pct))),
            h('td', `${num(e.score)} / ${e.max}`),
            h('td', formatDuration(e.dur)))))))));
    }
  }

  function run(root, questions, seconds) {
    root.replaceChildren();
    const startedAt = Date.now();
    const responses = new Array(questions.length).fill(undefined);
    const orders = new Array(questions.length).fill(undefined);
    const flags = new Set();
    let index = 0;
    let ctrl = null;
    const maxPoints = questions.reduce((s, q) => s + points(q), 0);

    const clock = h('span.exam-clock', { 'aria-live': 'off' });
    const counter = h('span.muted');
    const stage = h('div.stage');
    const grid = h('div.exam-grid', { role: 'navigation', 'aria-label': 'Aufgabenübersicht' });
    const prevBtn = h('button.btn.btn-ghost', { type: 'button', onclick: () => go(index - 1) }, icon('left', 18), 'Zurück');
    const nextBtn = h('button.btn.btn-secondary', { type: 'button', onclick: () => go(index + 1) }, 'Weiter', icon('right', 18));
    const flagBtn = h('button.btn.btn-ghost', { type: 'button', onclick: () => { flags.has(index) ? flags.delete(index) : flags.add(index); drawGrid(); drawFlag(); } });
    const submitBtn = h('button.btn.btn-primary', { type: 'button', onclick: () => confirmSubmit() }, icon('check', 18), 'Abgeben');

    root.append(
      h('div.exam-top', h('div.exam-title', icon('timer', 20), h('strong', 'Probeklausur'), counter), clock, submitBtn),
      h('div.exam-layout',
        h('div.exam-main', stage, h('div.exam-nav', prevBtn, flagBtn, nextBtn)),
        h('aside.exam-side', h('h3', 'Übersicht'), grid,
          h('p.muted.small', h('span.legend.legend-done'), ' beantwortet ', h('span.legend.legend-flag'), ' markiert'),
          h('p.muted.small', `Maximal ${maxPoints} Punkte`))));

    function tick() {
      const left = seconds - (Date.now() - startedAt) / 1000;
      clock.textContent = formatDuration(left);
      clock.classList.toggle('warn', left < 120);
      if (left <= 0) {
        clearInterval(timerId);
        App.util.toast('Zeit abgelaufen – die Prüfung wurde abgegeben.', 'warn');
        submit();
      }
    }
    clearInterval(timerId);
    timerId = setInterval(() => { if (!document.body.contains(clock)) { clearInterval(timerId); return; } tick(); }, 1000);
    tick();

    function drawGrid() {
      grid.replaceChildren(...questions.map((q, i) => h('button.grid-cell', {
        type: 'button',
        class: [i === index ? 'current' : '', App.question.isComplete(q, responses[i]) ? 'done' : '', flags.has(i) ? 'flag' : ''].join(' '),
        'aria-label': `Aufgabe ${i + 1}`,
        onclick: () => go(i),
      }, String(i + 1))));
    }

    function drawFlag() {
      flagBtn.replaceChildren(icon('flag', 18), flags.has(index) ? 'Markiert' : 'Markieren');
      flagBtn.classList.toggle('active', flags.has(index));
    }

    function go(i) {
      if (i < 0 || i >= questions.length) return;
      index = i;
      const q = questions[i];
      ctrl = App.question.renderQuestion(q, {
        response: responses[i],
        order: orders[i],
        onChange: (r) => { responses[i] = r; drawGrid(); },
        exam: true,
      });
      orders[i] = ctrl.optionOrder || orders[i];
      if (q.type === 'order' && responses[i] === undefined) responses[i] = ctrl.response;
      stage.replaceChildren(h('div.exam-points', `Aufgabe ${i + 1} · ${points(q)} ${points(q) === 1 ? 'Punkt' : 'Punkte'}`), ctrl.el);
      counter.textContent = `${i + 1} / ${questions.length}`;
      prevBtn.disabled = i === 0;
      nextBtn.disabled = i === questions.length - 1;
      drawGrid();
      drawFlag();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function confirmSubmit() {
      const open = questions.filter((q, i) => !App.question.isComplete(q, responses[i])).length;
      const msg = open ? `${open} Aufgabe(n) sind noch unbeantwortet. Trotzdem abgeben?` : 'Prüfung jetzt abgeben?';
      if (window.confirm(msg)) submit();
    }

    function submit() {
      clearInterval(timerId);
      const dur = (Date.now() - startedAt) / 1000;
      const evaluated = questions.map((q, i) => {
        const answered = App.question.isComplete(q, responses[i]);
        const res = answered ? App.question.evaluate(q, responses[i]) : { score: 0, correct: false };
        if (answered) App.store.record(q.id, res.score, { topic: q.t, kind: 'q' });
        return { q, res, response: answered ? responses[i] : null, pts: res.score * points(q), max: points(q) };
      });
      const score = evaluated.reduce((s, e) => s + e.pts, 0);
      const perTopic = {};
      evaluated.forEach((e) => {
        perTopic[e.q.t] = perTopic[e.q.t] || { s: 0, m: 0 };
        perTopic[e.q.t].s += e.pts;
        perTopic[e.q.t].m += e.max;
      });
      const result = { ts: Date.now(), score, max: maxPoints, pct: score / maxPoints, dur, n: questions.length, perTopic };
      App.store.addExam(result);
      renderResult(root, evaluated, result);
    }

    go(0);
  }

  function renderResult(root, evaluated, result) {
    const { ring, progressBar } = App.views.dashboard;
    const byDiff = [1, 2, 3, 4].map((d) => {
      const list = evaluated.filter((e) => e.q.d === d);
      return { d, s: list.reduce((a, e) => a + e.pts, 0), m: list.reduce((a, e) => a + e.max, 0), n: list.length };
    }).filter((x) => x.n);
    const topicRows = Object.entries(result.perTopic)
      .map(([id, v]) => ({ topic: App.topicById(id), ...v, r: v.s / v.m }))
      .sort((a, b) => a.r - b.r);
    const weakest = topicRows.filter((t) => t.r < 0.6);

    root.replaceChildren(
      h('section.result-hero',
        ring(result.pct, 150, 13, 'erreicht'),
        h('div',
          h('p.eyebrow', 'Ergebnis der Probeklausur'),
          h('h1', `${num(result.score)} von ${result.max} Punkten`),
          h('p.lead', `${evaluated.filter((e) => e.res.correct).length} von ${result.n} Aufgaben vollständig richtig · Bearbeitungszeit ${formatDuration(result.dur)}`),
          h('p.muted.small', 'Bestehensgrenze und Notenschlüssel sind in den Unterlagen nicht angegeben – das Ergebnis dient als Orientierung.'),
          h('div.action-row',
            h('a.btn.btn-primary', { href: '#/pruefung' }, icon('rotate', 18), 'Neue Prüfung'),
            weakest.length ? h('a.btn.btn-secondary', { href: `#/quiz?topic=${weakest[0].topic.id}` }, icon('target', 18), `${weakest[0].topic.title} üben`) : null,
            h('a.btn.btn-ghost', { href: '#/statistik' }, icon('chart', 18), 'Statistik')))),
      h('div.grid-2',
        h('section.card',
          h('div.card-head', h('h2', icon('chart', 20), 'Ergebnis nach Thema')),
          h('div.bars', topicRows.map((t) => h('div.bar-row',
            h('span.bar-label', t.topic.title),
            progressBar(t.r, t.r >= 0.8 ? 'good' : t.r < 0.5 ? 'bad' : ''),
            h('span.bar-value', `${num(t.s)}/${t.m}`))))),
        h('section.card',
          h('div.card-head', h('h2', icon('sigma', 20), 'Ergebnis nach Schwierigkeit')),
          h('div.bars', byDiff.map((d) => h('div.bar-row',
            h('span.bar-label', App.content.DIFFICULTY[d.d]),
            progressBar(d.s / d.m, d.s / d.m >= 0.8 ? 'good' : d.s / d.m < 0.5 ? 'bad' : ''),
            h('span.bar-value', `${num(d.s)}/${d.m}`)))),
          weakest.length
            ? h('div.callout.callout-warn', icon('alert', 18), h('div', h('strong', 'Wiederholungsbedarf: '), weakest.map((w) => w.topic.title).join(', ')))
            : h('div.callout.callout-good', icon('check', 18), h('div', 'In allen Themen mindestens 60 % – weiter so!')))),
      h('section.card',
        h('div.card-head', h('h2', icon('list', 20), 'Alle Aufgaben mit Lösung')),
        h('div.review-list', evaluated.map((e) => App.views.quiz.reviewItem(e.q, e.response === null ? { score: 0, correct: false, skipped: true } : e.res, e.response)))));
    window.scrollTo({ top: 0 });
  }

  return { render };
})();
