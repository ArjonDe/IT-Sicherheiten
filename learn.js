/**
 * Lernmodus: Themenübersicht, Kapitelseiten mit Zusammenfassung, Stichpunkten,
 * Definitionen (mit Selbsttest), Abläufen, Formeln, Tabellen und Klausurtipps.
 */
window.App = window.App || {};
App.views = App.views || {};

App.views.learn = (() => {
  const { h, pct } = App.util;
  const icon = App.icons.el;
  const fmt = App.formatSource;

  function renderList(root) {
    const stats = App.content.overallStats();
    root.append(
      h('header.page-head',
        h('h1', 'Lernmodus'),
        h('p.lead', 'Alle Kapitel mit Zusammenfassung, Stichpunkten, Definitionen und Abläufen. Sortiert nach Vorlesungsreihenfolge; die Punkte zeigen die Klausurrelevanz.')),
      h('div.chapter-list', stats.perTopic.map((t, i) => {
        const done = t.chapter.done;
        return h('a.chapter-row', { href: `#/lernen/${t.topic.id}` },
          h('span.chapter-num', done ? icon('check', 18) : String(i + 1)),
          h('span.topic-icon', icon(t.topic.icon, 22)),
          h('div.chapter-text',
            h('strong', t.topic.title),
            h('span.muted', `${t.topic.chapter} · ${t.topic.sources}`),
            App.views.dashboard.progressBar(t.progress)),
          h('div.chapter-side',
            App.views.dashboard.importanceDots(t.topic.importance),
            h('span.muted.small', `${App.content.questionsOf(t.topic.id).length} Fragen`)));
      })),
      h('a.notice', { href: '#/lernen/hinweise' }, icon('info', 20),
        h('div', h('strong', 'Hinweise zur Datenbasis'), h('span.muted', 'Welche Inhalte die Unterlagen nicht abdecken und wo Folien widersprüchlich sind.')),
        icon('right', 18)));
  }

  function section(id, title, ic, ...content) {
    return h('section.card.learn-section', { id },
      h('div.card-head', h('h2', icon(ic, 20), title)), ...content);
  }

  function renderTopic(root, topicId) {
    if (topicId === 'hinweise') return renderGaps(root);
    const topic = App.topicById(topicId);
    if (!topic) {
      root.append(h('p', 'Kapitel nicht gefunden.'), h('a.btn', { href: '#/lernen' }, 'Zur Übersicht'));
      return;
    }
    App.store.visitChapter(topic.id);
    const stats = App.content.topicStats(topic.id);
    const idx = App.TOPICS.indexOf(topic);
    const prev = App.TOPICS[idx - 1];
    const next = App.TOPICS[idx + 1];

    const toc = [
      ['ueberblick', 'Überblick'], ['stichpunkte', 'Stichpunkte'], ['definitionen', 'Definitionen'],
      topic.processes?.length ? ['ablaeufe', 'Abläufe'] : null,
      topic.formulas?.length ? ['formeln', 'Formeln'] : null,
      topic.tables?.length ? ['tabellen', 'Tabellen'] : null,
      ['tipps', 'Klausurtipps'],
    ].filter(Boolean);

    const doneBtn = h('button.btn', {
      type: 'button',
      class: stats.chapter.done ? 'btn-success' : 'btn-secondary',
      onclick: () => {
        const nowDone = !App.store.state.chapters[topic.id]?.done;
        App.store.setChapterDone(topic.id, nowDone);
        doneBtn.className = `btn ${nowDone ? 'btn-success' : 'btn-secondary'}`;
        doneBtn.replaceChildren(icon('check', 18), nowDone ? 'Kapitel abgeschlossen' : 'Als abgeschlossen markieren');
        App.util.toast(nowDone ? 'Kapitel als abgeschlossen markiert' : 'Markierung entfernt', nowDone ? 'good' : 'info');
      },
    }, icon('check', 18), stats.chapter.done ? 'Kapitel abgeschlossen' : 'Als abgeschlossen markieren');

    root.append(
      h('nav.crumbs', h('a', { href: '#/lernen' }, 'Lernmodus'), h('span', '/'), h('span', topic.title)),
      h('header.topic-head',
        h('span.topic-icon.lg', icon(topic.icon, 30)),
        h('div',
          h('p.eyebrow', topic.chapter),
          h('h1', topic.title),
          h('div.topic-head-meta',
            App.views.dashboard.importanceDots(topic.importance),
            h('span.muted', `Fortschritt ${Math.round(stats.progress * 100)} %`),
            Number.isFinite(stats.q.accuracy) ? h('span.muted', `Trefferquote ${pct(stats.q.accuracy)}`) : null))),
      h('div.action-row',
        h('a.btn.btn-primary', { href: `#/quiz?topic=${topic.id}` }, icon('target', 18), 'Quiz zu diesem Kapitel'),
        h('a.btn.btn-secondary', { href: `#/karten?topic=${topic.id}` }, icon('layers', 18), 'Karteikarten'),
        doneBtn),
      h('nav.toc', { 'aria-label': 'Inhalt' }, toc.map(([id, label]) => h('a.toc-link', { href: `#/lernen/${topic.id}`, onclick: (ev) => { ev.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }, label))),

      section('ueberblick', 'Überblick', 'book',
        h('p.summary', topic.summary),
        h('div.callout', icon('flag', 18), h('div', h('strong', 'Klausurrelevanz: '), topic.relevance)),
        h('p.sources', icon('source', 16), h('span', topic.sources))),

      section('stichpunkte', 'Stichpunkte', 'list',
        h('ul.keypoints', topic.keyPoints.map((p) => h('li', p)))),

      definitionsSection(topic),

      topic.processes?.length ? section('ablaeufe', 'Abläufe & Prozesse', 'right',
        h('div.process-grid', topic.processes.map((proc) => h('div.process',
          h('h3', proc.title),
          h('ol.steps', proc.steps.map((s) => h('li', s))),
          h('p.sources.small', icon('source', 14), h('span', fmt(proc.src))))))) : null,

      topic.formulas?.length ? section('formeln', 'Formeln', 'formula',
        h('div.formula-list', topic.formulas.map(([label, f, src]) => h('div.formula',
          h('span.formula-label', label), h('code.formula-code', f), h('span.sources.small', fmt(src)))))) : null,

      topic.tables?.length ? section('tabellen', 'Tabellen', 'grid',
        topic.tables.map((tb) => h('div.table-wrap',
          h('h3', tb.title),
          h('div.table-scroll', h('table.data-table',
            h('thead', h('tr', tb.head.map((c) => h('th', c)))),
            h('tbody', tb.rows.map((row) => h('tr', row.map((c) => h('td', c))))))),
          h('p.sources.small', icon('source', 14), h('span', fmt(tb.src)))))) : null,

      section('tipps', 'Klausurtipps', 'sparkles',
        h('ul.tips', topic.examTips.map((t) => h('li', icon('flag', 16), h('span', t))))),

      h('nav.pager',
        prev ? h('a.btn.btn-ghost', { href: `#/lernen/${prev.id}` }, icon('left', 18), prev.title) : h('span'),
        next ? h('a.btn.btn-ghost', { href: `#/lernen/${next.id}` }, next.title, icon('right', 18)) : h('span')));
  }

  /** Definitionen mit Suchfeld und Selbsttest-Modus (Erklärung verdeckt). */
  function definitionsSection(topic) {
    let selfTest = false;
    const list = h('div.def-list');
    const draw = (filter = '') => {
      const f = filter.trim().toLowerCase();
      list.replaceChildren(...topic.defs
        .filter(([term, def]) => !f || term.toLowerCase().includes(f) || def.toLowerCase().includes(f))
        .map(([term, def, src]) => {
          const dd = h('dd', { class: selfTest ? 'concealed' : '' }, def, h('span.sources.small', fmt(src)));
          return h('div.def', { onclick: () => dd.classList.remove('concealed') },
            h('dt', term), dd);
        }));
      if (!list.children.length) list.append(h('p.muted', 'Keine Treffer.'));
    };
    const search = h('input.search', { type: 'search', placeholder: 'Begriff suchen …', 'aria-label': 'Definitionen durchsuchen', oninput: (e) => draw(e.target.value) });
    const toggle = h('label.switch', h('input', { type: 'checkbox', onchange: (e) => { selfTest = e.target.checked; draw(search.value); } }), h('span.switch-ui'), h('span', 'Selbsttest: Erklärungen verdecken'));
    draw();
    return section('definitionen', `Definitionen (${topic.defs.length})`, 'brain',
      h('div.def-tools', search, toggle), list);
  }

  function renderGaps(root) {
    root.append(
      h('nav.crumbs', h('a', { href: '#/lernen' }, 'Lernmodus'), h('span', '/'), h('span', 'Hinweise zur Datenbasis')),
      h('header.page-head', h('h1', 'Hinweise zur Datenbasis'),
        h('p.lead', 'Alle Inhalte dieser Plattform stammen ausschließlich aus den bereitgestellten Unterlagen. Hier steht transparent, was dort fehlt oder auffällig ist.')),
      h('section.card', h('div.card-head', h('h2', icon('source', 20), 'Verwendete Dokumente')),
        h('ul.plain', Object.values(App.SOURCES).map((s) => h('li', h('strong', s.name), h('span.muted', ` – ${s.file}`))))),
      App.DATA_GAPS.map((g) => h('section.card',
        h('div.card-head', h('h2', icon('alert', 20), g.title)),
        h('p', g.text),
        g.items.length ? h('ul.gap-list', g.items.map((i) => h('li', i))) : null)));
  }

  return { renderList, renderTopic };
})();
