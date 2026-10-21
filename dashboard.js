/**
 * Startseite: Tagesziel, Lernserie, Gesamtfortschritt, fällige Wiederholungen,
 * empfohlene nächste Schritte und Themenübersicht.
 */
window.App = window.App || {};
App.views = App.views || {};

App.views.dashboard = (() => {
  const { h, pct } = App.util;
  const icon = App.icons.el;

  /** Fortschrittsring als SVG. */
  function ring(value, size = 120, stroke = 10, label) {
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const v = Math.max(0, Math.min(1, value || 0));
    const wrap = h('div.ring', { style: { width: `${size}px`, height: `${size}px` } });
    wrap.innerHTML = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${label || ''} ${Math.round(v * 100)} Prozent">
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--track)" stroke-width="${stroke}"/>
      <circle class="ring-value" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--primary)" stroke-width="${stroke}"
        stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - v)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
    </svg>`;
    wrap.append(h('div.ring-label', h('strong', `${Math.round(v * 100)}%`), label ? h('span', label) : null));
    return wrap;
  }

  function progressBar(value, kind = '') {
    const v = Math.max(0, Math.min(1, value || 0));
    return h(`div.bar${kind ? `.bar-${kind}` : ''}`, { role: 'progressbar', 'aria-valuenow': Math.round(v * 100), 'aria-valuemin': 0, 'aria-valuemax': 100 },
      h('div.bar-fill', { style: { width: `${v * 100}%` } }));
  }

  function topicCard(t) {
    const topic = t.topic;
    return h('a.topic-card', { href: `#/lernen/${topic.id}` },
      h('div.topic-card-head',
        h('span.topic-icon', icon(topic.icon, 22)),
        h('div.topic-card-title', h('strong', topic.title), h('span', topic.short))),
      progressBar(t.progress),
      h('div.topic-card-foot',
        h('span', `${Math.round(t.progress * 100)} % gelernt`),
        importanceDots(topic.importance)));
  }

  function importanceDots(n) {
    return h('span.importance', { title: `Klausurrelevanz ${n}/5`, 'aria-label': `Klausurrelevanz ${n} von 5` },
      [1, 2, 3, 4, 5].map((i) => h(`span.dot${i <= n ? '.on' : ''}`)));
  }

  function render(root) {
    const store = App.store;
    const stats = App.content.overallStats();
    const due = stats.q.due + stats.c.due;
    const goal = store.state.settings.dailyGoal;
    const today = store.todayCount();
    const streak = store.streak();
    const weak = App.content.weakTopics().slice(0, 3);
    const lastExam = store.state.exams[store.state.exams.length - 1];

    const hero = h('section.hero',
      h('div.hero-text',
        h('p.eyebrow', 'IT-Sicherheit und Netzwerke · Klausurvorbereitung'),
        h('h1', stats.q.seen ? 'Weiter geht’s!' : 'Willkommen!'),
        h('p.lead', stats.q.seen
          ? `Du hast ${stats.q.seen} von ${stats.q.total} Fragen bearbeitet. ${due ? `${due} Wiederholungen sind fällig.` : 'Aktuell ist nichts fällig – Zeit für Neues.'}`
          : `${App.QUESTIONS.length} Fragen, ${App.content.FLASHCARDS.length} Karteikarten und ${App.TOPICS.length} Kapitel – alles direkt aus deinen Vorlesungsunterlagen.`),
        h('div.hero-actions',
          h('a.btn.btn-primary.btn-lg', { href: due ? '#/quiz?mode=due' : '#/quiz?mode=mixed' }, icon('play', 18), due ? 'Wiederholen' : 'Jetzt üben'),
          h('a.btn.btn-ghost.btn-lg', { href: '#/pruefung' }, icon('timer', 18), 'Probeklausur'))),
      ring(stats.progress, 132, 12, 'Gesamt'));

    const kpis = h('section.kpis',
      kpi('flame', `${streak}`, streak === 1 ? 'Tag Serie' : 'Tage Serie', 'warm'),
      kpi('target', `${today}/${goal}`, 'Tagesziel', today >= goal ? 'good' : ''),
      kpi('rotate', `${due}`, 'fällig', due ? 'accent' : ''),
      kpi('check', Number.isFinite(stats.q.accuracy) ? pct(stats.q.accuracy) : '–', 'Erfolgsquote', ''));

    const goalBar = h('div.goal', progressBar(today / goal, today >= goal ? 'good' : ''),
      h('span.muted', today >= goal ? 'Tagesziel erreicht – stark!' : `Noch ${goal - today} Antworten bis zum Tagesziel.`));

    const next = h('section.card',
      h('div.card-head', h('h2', icon('sparkles', 20), 'Empfohlen für dich')),
      h('div.reco-list',
        weak.map((w) => h('a.reco', { href: `#/quiz?topic=${w.topic.id}` },
          h('span.topic-icon.sm', icon(w.topic.icon, 18)),
          h('div.reco-text', h('strong', w.topic.title),
            h('span.muted', w.acc === null ? 'Noch nicht geübt' : `Trefferquote ${pct(w.acc)} · ${w.q.due} fällig`)),
          icon('right', 18))),
        h('a.reco', { href: '#/quiz?mode=exercise' },
          h('span.topic-icon.sm', icon('flag', 18)),
          h('div.reco-text', h('strong', 'Übungsblatt-Fragen'), h('span.muted', `${App.QUESTIONS.filter((q) => q.ex).length} Originalfragen aus den Übungsblättern`)),
          icon('right', 18)),
        lastExam ? h('a.reco', { href: '#/statistik' },
          h('span.topic-icon.sm', icon('trophy', 18)),
          h('div.reco-text', h('strong', `Letzte Probeklausur: ${Math.round(lastExam.pct * 100)} %`), h('span.muted', 'Zur Ergebnisanalyse')),
          icon('right', 18)) : null));

    const topics = h('section',
      h('div.section-head', h('h2', 'Themen'), h('a.link', { href: '#/lernen' }, 'Alle Kapitel', icon('right', 16))),
      h('div.topic-grid', stats.perTopic.map(topicCard)));

    root.append(hero, kpis, goalBar, h('div.grid-2', next, cardsTeaser(stats)), topics);
  }

  function cardsTeaser(stats) {
    return h('section.card',
      h('div.card-head', h('h2', icon('layers', 20), 'Karteikarten')),
      h('p.muted', `${stats.c.seen} von ${stats.c.total} Karten gesehen · ${stats.c.due} fällig`),
      h('div.box-strip', [1, 2, 3, 4, 5].map((b) => h('div.box-cell', h('strong', String(stats.c.boxes[b])), h('span', `Box ${b}`)))),
      h('a.btn.btn-secondary', { href: '#/karten' }, icon('layers', 18), 'Karten lernen'));
  }

  function kpi(ic, value, label, tone) {
    return h(`div.kpi${tone ? `.kpi-${tone}` : ''}`, icon(ic, 20), h('strong', value), h('span', label));
  }

  return { render, ring, progressBar, importanceDots };
})();
