/**
 * App-Shell: Hash-Router, Navigation, Theme-Umschaltung (Hell/Dunkel/System).
 * Hash-Routing funktioniert ohne Server-Konfiguration – ideal für GitHub Pages.
 */
window.App = window.App || {};

App.router = (() => {
  const { h } = App.util;
  const icon = App.icons.svg;

  const NAV = [
    ['', 'Start', 'home'],
    ['lernen', 'Lernen', 'book'],
    ['quiz', 'Quiz', 'target'],
    ['karten', 'Karten', 'layers'],
    ['pruefung', 'Prüfung', 'timer'],
    ['statistik', 'Statistik', 'chart'],
  ];

  const ROUTES = {
    '': (root) => App.views.dashboard.render(root),
    lernen: (root, [id]) => (id ? App.views.learn.renderTopic(root, id) : App.views.learn.renderList(root)),
    quiz: (root, _, params) => App.views.quiz.render(root, params),
    karten: (root, _, params) => App.views.cards.render(root, params),
    pruefung: (root) => App.views.exam.render(root),
    statistik: (root) => App.views.stats.render(root),
  };

  const TITLES = { '': 'Start', lernen: 'Lernmodus', quiz: 'Quiz', karten: 'Karteikarten', pruefung: 'Prüfungsmodus', statistik: 'Statistik' };

  function parse() {
    const raw = location.hash.replace(/^#\/?/, '');
    const [path, query = ''] = raw.split('?');
    const [section = '', ...rest] = path.split('/').filter(Boolean);
    const params = Object.fromEntries(new URLSearchParams(query));
    return { section, rest, params };
  }

  function refresh() {
    const { section, rest, params } = parse();
    const view = ROUTES[section] || ROUTES[''];
    const root = document.getElementById('view');
    root.replaceChildren();
    root.classList.remove('view-enter');
    void root.offsetWidth;
    root.classList.add('view-enter');
    try {
      view(root, rest, params);
    } catch (err) {
      console.error(err);
      root.append(h('section.empty', h('h2', 'Hoppla – hier ist etwas schiefgelaufen.'), h('p.muted', String(err.message || err)), h('a.btn.btn-primary', { href: '#/' }, 'Zur Startseite')));
    }
    document.querySelectorAll('[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === section));
    document.title = `${TITLES[section] || 'Start'} · IT-Sicherheit Lernplattform`;
    window.scrollTo({ top: 0 });
  }

  function buildNav() {
    const side = document.getElementById('side-nav');
    const bottom = document.getElementById('bottom-nav');
    NAV.forEach(([route, label, ic]) => {
      const make = (cls) => {
        const a = h(`a.${cls}`, { href: `#/${route}`, 'data-nav': route });
        a.innerHTML = `${icon(ic, 22)}<span>${label}</span>`;
        return a;
      };
      side.append(make('side-link'));
      bottom.append(make('bottom-link'));
    });
  }

  /* ───────────── Theme ───────────── */

  const THEMES = ['system', 'light', 'dark'];
  const THEME_ICON = { system: 'monitor', light: 'sun', dark: 'moon' };
  const THEME_LABEL = { system: 'System', light: 'Hell', dark: 'Dunkel' };

  function applyTheme() {
    const theme = App.store.state.settings.theme;
    const root = document.documentElement;
    if (theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
    document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
      btn.innerHTML = `${icon(THEME_ICON[theme], 20)}<span class="sr-only">Design: ${THEME_LABEL[theme]}</span>`;
      btn.title = `Design: ${THEME_LABEL[theme]} (klicken zum Wechseln)`;
    });
    const dark = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0f1117' : '#f6f7fb');
  }

  function cycleTheme() {
    const cur = App.store.state.settings.theme;
    const next = THEMES[(THEMES.indexOf(cur) + 1) % THEMES.length];
    App.store.setSetting('theme', next);
    applyTheme();
    App.util.toast(`Design: ${THEME_LABEL[next]}`);
  }

  function updateBadges() {
    const stats = App.content.overallStats();
    const due = stats.q.due + stats.c.due;
    const streak = App.store.streak();
    const el = document.getElementById('streak-pill');
    if (el) el.innerHTML = `${icon('flame', 16)}<span>${streak}</span>`;
    document.querySelectorAll('[data-nav="quiz"]').forEach((a) => {
      a.querySelector('.nav-badge')?.remove();
      if (due) a.insertAdjacentHTML('beforeend', `<span class="nav-badge">${due > 99 ? '99+' : due}</span>`);
    });
  }

  function init() {
    buildNav();
    document.querySelectorAll('[data-theme-toggle]').forEach((btn) => btn.addEventListener('click', cycleTheme));
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
    applyTheme();
    window.addEventListener('hashchange', refresh);
    // Klick auf einen Link zur aktuellen Seite soll die Ansicht neu laden (z. B. „Neue Runde“).
    document.addEventListener('click', (ev) => {
      const a = ev.target.closest('a[href^="#"]');
      if (a && a.getAttribute('href') === location.hash) { ev.preventDefault(); refresh(); }
    });
    App.store.onChange(updateBadges);
    updateBadges();
    refresh();
  }

  return { init, refresh };
})();

document.addEventListener('DOMContentLoaded', App.router.init);
