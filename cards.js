/**
 * Karteikarten mit Flip-Animation und Leitner-Bewertung.
 * Vorderseite = Begriff/Frage, Rückseite = Antwort mit Fundstelle.
 */
window.App = window.App || {};
App.views = App.views || {};

App.views.cards = (() => {
  const { h } = App.util;
  const icon = App.icons.el;

  function render(root, params) {
    const cfg = { topics: params.topic ? [params.topic] : [], mode: params.mode || 'due', count: 20 };
    if (params.topic || params.mode) return start(root, cfg);
    renderSetup(root, cfg);
  }

  function renderSetup(root, cfg) {
    const stats = App.content.itemStats(App.content.FLASHCARDS.map((c) => c.id));
    const info = h('span.muted');
    const update = () => {
      info.textContent = `${App.content.pickCards(cfg.topics, cfg.mode, 9999).length} Karten verfügbar`;
    };

    const modes = [['due', 'Fällig & neu', 'Leitner: fällige und noch unbekannte Karten'], ['all', 'Alle', 'Freies Durchgehen, gewichtet nach Fehlern'], ['weak', 'Schwach', 'Nur Karten in Box 1–2']];

    root.append(
      h('header.page-head', h('h1', 'Karteikarten'),
        h('p.lead', `${App.content.FLASHCARDS.length} Karten aus allen Definitionen, Formeln und Abläufen. Umdrehen, ehrlich bewerten – das Leitner-System plant die Wiederholung.`)),
      h('section.card',
        h('div.card-head', h('h2', icon('layers', 20), 'Leitner-Boxen')),
        h('div.box-strip.box-strip-lg', [1, 2, 3, 4, 5].map((b) => h('div.box-cell',
          h('strong', String(stats.boxes[b])), h('span', `Box ${b}`),
          h('small.muted', b === 1 ? 'sofort' : `${App.store.BOX_INTERVAL_DAYS[b]} Tg.`)))),
        h('p.muted.small', `${stats.boxes[0]} Karten noch nie gesehen. Richtig → eine Box höher, falsch → zurück in Box 1.`)),
      h('section.card.setup',
        h('fieldset.chip-group', h('legend', 'Auswahl'),
          h('div.mode-list', modes.map(([value, title, desc]) => h('label.mode',
            h('input', { type: 'radio', name: 'cmode', value, checked: cfg.mode === value ? true : null, onchange: () => { cfg.mode = value; update(); } }),
            h('span.mode-ui', h('strong', title), h('span.muted', desc)))))),
        h('fieldset.chip-group', h('legend', 'Themen (leer = alle)'),
          h('div.chips', App.TOPICS.map((t) => {
            const btn = h('button.chip-toggle', {
              type: 'button', 'aria-pressed': 'false',
              onclick: () => {
                const i = cfg.topics.indexOf(t.id);
                i >= 0 ? cfg.topics.splice(i, 1) : cfg.topics.push(t.id);
                btn.setAttribute('aria-pressed', String(cfg.topics.includes(t.id)));
                update();
              },
            }, `${t.title} (${App.content.cardsOf(t.id).length})`);
            return btn;
          }))),
        h('div.setup-foot', info, h('button.btn.btn-primary.btn-lg', { type: 'button', onclick: () => start(root, cfg) }, icon('play', 18), 'Lernen starten'))));
    update();
  }

  function start(root, cfg) {
    const mode = cfg.mode === 'all' ? null : cfg.mode;
    const cards = App.content.pickCards(cfg.topics, mode, cfg.count);
    root.replaceChildren();
    if (!cards.length) {
      root.append(h('section.empty', icon('check', 40), h('h2', 'Keine Karten fällig'),
        h('p.muted', 'Du bist auf dem aktuellen Stand. Wähle „Alle“, um frei weiterzulernen.'),
        h('a.btn.btn-primary', { href: '#/karten' }, 'Zur Auswahl')));
      return;
    }
    session(root, cards);
  }

  function session(root, cards) {
    let index = 0;
    let flipped = false;
    const tally = { again: 0, hard: 0, good: 0 };

    const progress = App.views.dashboard.progressBar(0);
    const counter = h('span.muted');
    const stage = h('div.flash-stage');
    const rateRow = h('div.rate-row');

    root.append(
      h('div.session-top', h('a.icon-btn', { href: '#/karten', 'aria-label': 'Beenden' }, icon('x', 22)), progress, counter),
      stage, rateRow,
      h('p.muted.small.center.kbd-hint', 'Tastatur: Leertaste = umdrehen · 1 = nochmal · 2 = schwer · 3 = gewusst'));

    const keyHandler = (ev) => {
      if (!document.body.contains(stage)) { document.removeEventListener('keydown', keyHandler); return; }
      if (ev.key === ' ') { ev.preventDefault(); flip(); }
      if (flipped && ['1', '2', '3'].includes(ev.key)) rate(['again', 'hard', 'good'][Number(ev.key) - 1]);
    };
    document.addEventListener('keydown', keyHandler);

    function show() {
      flipped = false;
      const c = cards[index];
      const topic = App.topicById(c.t);
      const back = c.list
        ? h('ol.card-list', c.back.split('\n').map((l) => h('li', l.replace(/^\d+\.\s*/, ''))))
        : h(c.mono ? 'code.card-formula' : 'p.card-answer', c.back);
      const card = h('button.flashcard', { type: 'button', 'aria-label': 'Karte umdrehen', onclick: flip },
        h('div.flash-inner',
          h('div.flash-face.flash-front',
            h('div.flash-meta', h('span.chip', topic.title), h('span.chip.chip-ghost', c.kind)),
            h('p.flash-term', c.front),
            h('span.flash-hint', icon('rotate', 16), 'Tippen zum Umdrehen')),
          h('div.flash-face.flash-back',
            h('div.flash-meta', h('span.chip', c.front)),
            back,
            h('p.sources.small', icon('source', 14), h('span', App.formatSource(c.s))))));
      stage.replaceChildren(card);
      counter.textContent = `${index + 1} / ${cards.length}`;
      progress.firstChild.style.width = `${(index / cards.length) * 100}%`;
      rateRow.replaceChildren(h('button.btn.btn-primary.btn-lg.btn-block', { type: 'button', onclick: flip }, icon('rotate', 18), 'Antwort zeigen'));
    }

    function flip() {
      flipped = !flipped;
      stage.querySelector('.flashcard')?.classList.toggle('flipped', flipped);
      if (flipped) {
        rateRow.replaceChildren(
          h('button.btn.btn-danger.rate', { type: 'button', onclick: () => rate('again') }, h('strong', 'Nochmal'), h('small', 'Box 1')),
          h('button.btn.btn-warn.rate', { type: 'button', onclick: () => rate('hard') }, h('strong', 'Schwer'), h('small', 'Box bleibt')),
          h('button.btn.btn-success.rate', { type: 'button', onclick: () => rate('good') }, h('strong', 'Gewusst'), h('small', 'Box +1')));
      }
    }

    function rate(kind) {
      const c = cards[index];
      tally[kind] += 1;
      App.store.record(c.id, kind === 'again' ? 0 : 1, { topic: c.t, kind: 'card', keepBox: kind === 'hard' });
      index += 1;
      if (index >= cards.length) return finish();
      show();
    }

    function finish() {
      document.removeEventListener('keydown', keyHandler);
      const total = cards.length;
      root.replaceChildren(h('section.result-hero',
        App.views.dashboard.ring((tally.good + tally.hard * 0.5) / total, 140, 12, 'gewusst'),
        h('div',
          h('h1', 'Runde geschafft!'),
          h('p.lead', `${tally.good} gewusst · ${tally.hard} schwer · ${tally.again} nochmal`),
          h('p.muted', 'Nicht gewusste Karten erscheinen in Kürze erneut.'),
          h('div.action-row',
            h('a.btn.btn-primary', { href: '#/karten?mode=due' }, icon('play', 18), 'Weiter lernen'),
            h('a.btn.btn-ghost', { href: '#/' }, 'Startseite')))));
    }

    show();
  }

  return { render };
})();
