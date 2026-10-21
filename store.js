/**
 * Persistenz (localStorage) und Spaced Repetition nach dem Leitner-System.
 *
 * Jede Frage und jede Karteikarte ist ein „Item“ mit Leitner-Box 1–5.
 *  - richtig  → eine Box höher, nächste Fälligkeit nach BOX_INTERVAL_DAYS
 *  - falsch   → zurück in Box 1, nach kurzer Pause wieder fällig
 * Fehlerhafte Items erhalten zusätzlich ein höheres Auswahlgewicht (siehe weightOf).
 */
window.App = window.App || {};

App.store = (() => {
  const KEY = 'itsec-lernplattform:v1';
  const { DAY, dayKey } = App.util;

  /** Wiederholungsintervalle je Leitner-Box in Tagen (Index = Box). */
  const BOX_INTERVAL_DAYS = [0, 0, 1, 3, 7, 16];
  const RETRY_AFTER_WRONG_MS = 10 * 60 * 1000;
  const MAX_BOX = 5;

  const defaults = () => ({
    v: 1,
    items: {},
    chapters: {},
    exams: [],
    activity: {},
    settings: { theme: 'system', dailyGoal: 20 },
    createdAt: Date.now(),
  });

  let state = load();
  const listeners = new Set();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaults();
      const parsed = JSON.parse(raw);
      return { ...defaults(), ...parsed, settings: { ...defaults().settings, ...(parsed.settings || {}) } };
    } catch (err) {
      console.warn('Lernstand konnte nicht geladen werden – starte neu.', err);
      return defaults();
    }
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (err) {
      console.warn('Lernstand konnte nicht gespeichert werden.', err);
    }
    listeners.forEach((fn) => fn(state));
  }

  function onChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  /* ───────────── Items & Leitner ───────────── */

  function item(id) {
    return state.items[id] || null;
  }

  /**
   * Verbucht eine Antwort.
   * @param {string} id      Item-ID
   * @param {number} score   0…1 (Teilpunkte möglich)
   * @param {object} [opts]  { topic, kind: 'q'|'card', keepBox: boolean }
   */
  function record(id, score, opts = {}) {
    const now = Date.now();
    const it = state.items[id] || { box: 1, due: now, seen: 0, ok: 0, bad: 0, last: 0, topic: opts.topic, kind: opts.kind || 'q' };
    const correct = score >= 0.999;
    it.seen += 1;
    it.last = now;
    it.topic = opts.topic || it.topic;
    it.kind = opts.kind || it.kind;
    if (correct) {
      it.ok += 1;
      if (!opts.keepBox) it.box = Math.min(MAX_BOX, it.box + 1);
      it.due = now + BOX_INTERVAL_DAYS[it.box] * DAY;
    } else {
      it.bad += 1;
      it.box = 1;
      it.due = now + RETRY_AFTER_WRONG_MS;
    }
    if (opts.keepBox && correct) it.due = now + Math.max(1, BOX_INTERVAL_DAYS[it.box]) * DAY * 0.5;
    state.items[id] = it;
    const key = dayKey();
    state.activity[key] = (state.activity[key] || 0) + 1;
    save();
    return it;
  }

  function isDue(id, now = Date.now()) {
    const it = state.items[id];
    return !!it && it.due <= now;
  }

  /**
   * Auswahlgewicht: häufige Fehler, niedrige Box und Fälligkeit erhöhen
   * die Wahrscheinlichkeit, dass ein Item erneut erscheint.
   */
  function weightOf(id) {
    const it = state.items[id];
    if (!it) return 2.5; // neue Items bevorzugt einstreuen
    let w = 1 + it.bad * 2.5 + (MAX_BOX - it.box) * 0.8;
    if (it.due <= Date.now()) w *= 2;
    if (it.bad > it.ok) w *= 1.5;
    return w;
  }

  /* ───────────── Kapitel ───────────── */

  function visitChapter(topicId) {
    const c = state.chapters[topicId] || { visited: 0, done: false };
    c.visited = Date.now();
    state.chapters[topicId] = c;
    save();
  }

  function setChapterDone(topicId, done) {
    const c = state.chapters[topicId] || { visited: Date.now(), done: false };
    c.done = done;
    state.chapters[topicId] = c;
    save();
  }

  /* ───────────── Prüfungen ───────────── */

  function addExam(result) {
    state.exams.push(result);
    if (state.exams.length > 50) state.exams = state.exams.slice(-50);
    save();
  }

  /* ───────────── Einstellungen ───────────── */

  function setSetting(key, value) {
    state.settings[key] = value;
    save();
  }

  /* ───────────── Auswertungen ───────────── */

  /** Lernserie in Tagen (heute oder gestern muss aktiv sein). */
  function streak() {
    let count = 0;
    const d = new Date();
    if (!state.activity[dayKey(d)]) d.setDate(d.getDate() - 1);
    while (state.activity[dayKey(d)]) {
      count += 1;
      d.setDate(d.getDate() - 1);
    }
    return count;
  }

  function todayCount() {
    return state.activity[dayKey()] || 0;
  }

  function reset() {
    state = defaults();
    save();
  }

  function exportJSON() {
    return JSON.stringify(state, null, 2);
  }

  function importJSON(text) {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || !parsed.items) throw new Error('Ungültige Datei');
    state = { ...defaults(), ...parsed };
    save();
  }

  return {
    get state() { return state; },
    onChange, item, record, isDue, weightOf,
    visitChapter, setChapterDone, addExam, setSetting,
    streak, todayCount, reset, exportJSON, importJSON,
    MAX_BOX, BOX_INTERVAL_DAYS,
  };
})();
