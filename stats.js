/**
 * Lernanalytik: Fortschritt, Erfolgsquote, Fehleranalyse, Schwachstellen,
 * Themen-Ranking, Wiederholungsbedarf, Prüfungsverlauf und Datenverwaltung.
 */
window.App = window.App || {};
App.views = App.views || {};

App.views.stats = (() => {
  const { h, pct, dayKey } = App.util;
  const icon = App.icons.el;

  /** Aktivität der letzten 12 Wochen als Heatmap. */
  function heatmap() {
    const activity = App.store.state.activity;
    const cells = [];
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - 7 * 12 + 1);
    // auf Montag ausrichten
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
      const n = activity[dayKey(d)] || 0;
      const level = n === 0 ? 0 : n < 10 ? 1 : n < 25 ? 2 : n < 50 ? 3 : 4;
      cells.push(h(`span.heat.heat-${level}`, { title: `${d.toLocaleDateString('de-DE')}: ${n} Antworten` }));
    }
    return h('div.heatmap-wrap', h('div.heatmap', cells),
      h('div.heat-legend', h('span.muted.small', 'weniger'), [0, 1, 2, 3, 4].map((l) => h(`span.heat.heat-${l}`)), h('span.muted.small', 'mehr')));
  }

  /** Verlauf der Prüfungsergebnisse als SVG-Liniendiagramm. */
  function examChart(exams) {
    const w = 600; const hgt = 180; const pad = 28;
    const pts = exams.map((e, i) => {
      const x = exams.length === 1 ? w / 2 : pad + (i * (w - 2 * pad)) / (exams.length - 1);
      const y = hgt - pad - e.pct * (hgt - 2 * pad);
      return { x, y, e };
    });
    const path = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const grid = [0, 0.5, 1].map((v) => {
      const y = hgt - pad - v * (hgt - 2 * pad);
      return `<line x1="${pad}" x2="${w - pad}" y1="${y}" y2="${y}" stroke="var(--border)" stroke-dasharray="3 4"/><text x="4" y="${y + 4}" font-size="11" fill="var(--muted)">${v * 100}%</text>`;
    }).join('');
    const dots = pts.map((p) => `<circle cx="${p.x}" cy="${p.y}" r="5" fill="var(--surface)" stroke="var(--primary)" stroke-width="2.5"><title>${App.util.formatDateTime(p.e.ts)}: ${Math.round(p.e.pct * 100)} %</title></circle>`).join('');
    const box = h('div.chart');
    box.innerHTML = `<svg viewBox="0 0 ${w} ${hgt}" role="img" aria-label="Verlauf der Prüfungsergebnisse" preserveAspectRatio="none">${grid}<path d="${path}" fill="none" stroke="var(--primary)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>${dots}</svg>`;
    return box;
  }

  function render(root) {
    const { progressBar } = App.views.dashboard;
    const stats = App.content.overallStats();
    const ranking = App.content.weakTopics();
    const mistakes = App.content.mistakeList(12);
    const types = App.content.typeStats();
    const diffs = App.content.difficultyStats();
    const exams = App.store.state.exams;

    const tone = (r) => (!Number.isFinite(r) ? '' : r >= 0.8 ? 'good' : r < 0.5 ? 'bad' : '');

    root.append(
      h('header.page-head', h('h1', 'Lernanalytik'),
        h('p.lead', 'Wo stehst du – und was solltest du als Nächstes wiederholen?')),

      h('section.kpis',
        kpi('chart', `${Math.round(stats.progress * 100)} %`, 'Gesamtfortschritt'),
        kpi('check', pct(stats.q.accuracy), 'Erfolgsquote'),
        kpi('target', `${stats.q.seen}/${stats.q.total}`, 'Fragen bearbeitet'),
        kpi('book', `${stats.chaptersDone}/${App.TOPICS.length}`, 'Kapitel abgeschlossen'),
        kpi('rotate', `${stats.q.due + stats.c.due}`, 'Wiederholungen fällig'),
        kpi('trophy', exams.length ? pct(Math.max(...exams.map((e) => e.pct))) : '–', 'Beste Prüfung')),

      h('div.grid-2',
        h('section.card',
          h('div.card-head', h('h2', icon('alert', 20), 'Schwachstellen & Themen-Ranking')),
          h('p.muted.small', 'Sortiert nach Wiederholungsbedarf (Trefferquote, Fortschritt und Klausurrelevanz). Oben = zuerst lernen.'),
          h('ol.rank-list', ranking.map((t, i) => h('li.rank',
            h('span.rank-num', { class: i < 3 && t.q.attempts ? 'hot' : '' }, String(i + 1)),
            h('div.rank-main',
              h('a', { href: `#/lernen/${t.topic.id}` }, t.topic.title),
              progressBar(t.progress, tone(t.acc))),
            h('div.rank-side',
              h('strong', t.acc === null ? 'neu' : pct(t.acc)),
              h('a.icon-btn', { href: `#/quiz?topic=${t.topic.id}`, 'aria-label': `${t.topic.title} üben` }, icon('play', 16))))))),
        h('section.card',
          h('div.card-head', h('h2', icon('rotate', 20), 'Wiederholungsbedarf (Leitner)')),
          h('p.muted.small', 'Fragen je Box: Box 1 = unsicher, Box 5 = sicher. Fällige Items sind nach Thema aufgeschlüsselt.'),
          boxChart(stats.q.boxes),
          h('div.bars', stats.perTopic.map((t) => h('div.bar-row',
            h('span.bar-label', t.topic.title),
            progressBar(t.q.mastery),
            h('span.bar-value', t.q.due + t.c.due ? h('span.badge', `${t.q.due + t.c.due} fällig`) : `${Math.round(t.q.mastery * 100)} %`)))),
          h('div.action-row', h('a.btn.btn-primary', { href: '#/quiz?mode=due' }, icon('play', 18), 'Fällige Fragen'), h('a.btn.btn-secondary', { href: '#/karten?mode=due' }, icon('layers', 18), 'Fällige Karten')))),

      h('div.grid-2',
        h('section.card',
          h('div.card-head', h('h2', icon('x', 20), 'Fehleranalyse')),
          mistakes.length
            ? h('div',
              h('ul.mistake-list', mistakes.map(({ q, it }) => h('li',
                h('div.mistake-q', h('span.chip', App.topicById(q.t).title), h('p', q.q.replace(/___/g, '…'))),
                h('span.mistake-count', { title: 'falsch / richtig' }, `${it.bad}× falsch · ${it.ok}× richtig`)))),
              h('a.btn.btn-primary', { href: '#/quiz?mode=mistakes' }, icon('rotate', 18), 'Alle Fehler wiederholen'))
            : h('p.muted', 'Noch keine Fehler erfasst. Starte ein Quiz, um deine Schwachstellen zu finden.')),
        h('section.card',
          h('div.card-head', h('h2', icon('grid', 20), 'Erfolgsquote nach Format & Schwierigkeit')),
          h('h3.sub', 'Fragetyp'),
          h('div.bars', types.map((t) => h('div.bar-row',
            h('span.bar-label', t.label),
            progressBar(Number.isFinite(t.accuracy) ? t.accuracy : 0, tone(t.accuracy)),
            h('span.bar-value', t.attempts ? pct(t.accuracy) : '–')))),
          h('h3.sub', 'Schwierigkeit'),
          h('div.bars', diffs.map((d) => h('div.bar-row',
            h('span.bar-label', d.label),
            progressBar(Number.isFinite(d.accuracy) ? d.accuracy : 0, tone(d.accuracy)),
            h('span.bar-value', d.attempts ? pct(d.accuracy) : '–')))))),

      h('div.grid-2',
        h('section.card',
          h('div.card-head', h('h2', icon('trophy', 20), 'Prüfungsverlauf')),
          exams.length
            ? h('div', examChart(exams.slice(-12)),
              h('p.muted.small', `${exams.length} Probeklausur(en) · Durchschnitt ${pct(exams.reduce((s, e) => s + e.pct, 0) / exams.length)}`))
            : h('p.muted', 'Noch keine Probeklausur geschrieben.', h('br'), h('a.link', { href: '#/pruefung' }, 'Jetzt starten'))),
        h('section.card',
          h('div.card-head', h('h2', icon('flame', 20), 'Lernaktivität')),
          heatmap(),
          h('p.muted.small', `Lernserie: ${App.store.streak()} Tag(e) · heute ${App.store.todayCount()} Antworten`))),

      dataCard(root));

    function kpi(ic, value, label) {
      return h('div.kpi', icon(ic, 20), h('strong', value), h('span', label));
    }
  }

  function boxChart(boxes) {
    const max = Math.max(1, ...boxes);
    return h('div.box-chart', boxes.map((n, b) => h('div.box-col',
      h('div.box-bar', { style: { height: `${(n / max) * 100}%` }, class: `box-${b}` }),
      h('strong', String(n)),
      h('span.muted.small', b === 0 ? 'neu' : `Box ${b}`))));
  }

  /** Export, Import und Zurücksetzen des Lernstands. */
  function dataCard(root) {
    const fileInput = h('input', { type: 'file', accept: 'application/json', hidden: true, onchange: async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        App.store.importJSON(await file.text());
        App.util.toast('Lernstand importiert', 'good');
        App.router.refresh();
      } catch (err) {
        App.util.toast(`Import fehlgeschlagen: ${err.message}`, 'bad');
      }
    } });
    const goal = h('input', { type: 'number', min: 5, max: 200, step: 5, value: App.store.state.settings.dailyGoal, 'aria-label': 'Tagesziel', onchange: (e) => {
      App.store.setSetting('dailyGoal', App.util.clamp(Number(e.target.value) || 20, 5, 200));
      App.util.toast('Tagesziel gespeichert', 'good');
    } });
    return h('section.card',
      h('div.card-head', h('h2', icon('download', 20), 'Daten & Einstellungen')),
      h('p.muted.small', 'Dein Lernstand wird ausschließlich lokal in diesem Browser (localStorage) gespeichert. Exportiere ihn, um das Gerät zu wechseln.'),
      h('div.settings-row', h('label', 'Tagesziel (Antworten pro Tag)'), goal),
      h('div.action-row',
        h('button.btn.btn-secondary', { type: 'button', onclick: () => {
          const blob = new Blob([App.store.exportJSON()], { type: 'application/json' });
          const a = h('a', { href: URL.createObjectURL(blob), download: `itsec-lernstand-${dayKey()}.json` });
          document.body.append(a); a.click(); a.remove();
        } }, icon('download', 18), 'Exportieren'),
        h('button.btn.btn-secondary', { type: 'button', onclick: () => fileInput.click() }, icon('upload', 18), 'Importieren'),
        h('button.btn.btn-danger-ghost', { type: 'button', onclick: () => {
          if (window.confirm('Gesamten Lernstand unwiderruflich löschen?')) {
            App.store.reset();
            App.util.toast('Lernstand zurückgesetzt');
            App.router.refresh();
          }
        } }, icon('trash', 18), 'Zurücksetzen'),
        fileInput));
  }

  return { render };
})();
