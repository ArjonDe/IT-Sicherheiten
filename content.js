/**
 * Inhaltsschicht: Karteikarten aus der Wissensbasis erzeugen, Fragen
 * auswählen und Lernanalytik (Fortschritt, Schwachstellen, Ranking) berechnen.
 */
window.App = window.App || {};

App.content = (() => {
  const { shuffle, weightedSample } = App.util;
  const store = App.store;

  const DIFFICULTY = { 1: 'Leicht', 2: 'Mittel', 3: 'Schwer', 4: 'Klausur' };
  const TYPE_LABEL = { single: 'Single Choice', multi: 'Multiple Choice', tf: 'Wahr/Falsch', match: 'Zuordnung', cloze: 'Lückentext', order: 'Reihenfolge' };

  /** Karteikarten: jede Definition und jede Formel der Wissensbasis. */
  const FLASHCARDS = App.TOPICS.flatMap((topic) => [
    ...topic.defs.map(([term, def, src], i) => ({
      id: `fc:${topic.id}:d${i}`, t: topic.id, front: term, back: def, s: src, kind: 'Definition',
    })),
    ...(topic.formulas || []).map(([label, formula, src], i) => ({
      id: `fc:${topic.id}:f${i}`, t: topic.id, front: label, back: formula, s: src, kind: 'Formel', mono: true,
    })),
    ...(topic.processes || []).map((proc, i) => ({
      id: `fc:${topic.id}:p${i}`, t: topic.id, front: proc.title, back: proc.steps.map((s, n) => `${n + 1}. ${s}`).join('\n'), s: proc.src, kind: 'Ablauf', list: true,
    })),
  ]);

  const questionsOf = (topicId) => App.QUESTIONS.filter((q) => q.t === topicId);
  const cardsOf = (topicId) => FLASHCARDS.filter((c) => c.t === topicId);

  /**
   * Fragen für eine Lerneinheit auswählen.
   * @param {object} cfg { topics:[], diffs:[], types:[], count, mode: 'mixed'|'due'|'mistakes'|'new'|'exercise' }
   */
  function pickQuestions(cfg) {
    const now = Date.now();
    let pool = App.QUESTIONS.filter((q) =>
      (!cfg.topics?.length || cfg.topics.includes(q.t)) &&
      (!cfg.diffs?.length || cfg.diffs.includes(q.d)) &&
      (!cfg.types?.length || cfg.types.includes(q.type)));

    if (cfg.mode === 'due') pool = pool.filter((q) => store.isDue(q.id, now));
    if (cfg.mode === 'mistakes') pool = pool.filter((q) => (store.item(q.id)?.bad || 0) > 0);
    if (cfg.mode === 'new') pool = pool.filter((q) => !store.item(q.id));
    if (cfg.mode === 'exercise') pool = pool.filter((q) => q.ex);

    const count = Math.min(cfg.count || 10, pool.length);
    return weightedSample(pool, (q) => store.weightOf(q.id), count);
  }

  /**
   * Prüfungsaufgaben: gewichtet nach Wichtigkeit des Themas, alle Themen
   * vertreten, Schwerpunkt auf mittleren bis klausurähnlichen Fragen.
   */
  function pickExam(count, topicIds) {
    const topics = App.TOPICS.filter((t) => !topicIds?.length || topicIds.includes(t.id));
    const totalImportance = topics.reduce((s, t) => s + t.importance, 0);
    const examWeight = (q) => (q.d >= 3 ? 3 : q.d === 2 ? 2 : 1) * (q.ex ? 1.3 : 1);

    // Anteile nach dem Verfahren der größten Reste, damit die Summe exakt stimmt.
    const raw = topics.map((t) => ({ t, exact: (t.importance / totalImportance) * count }));
    raw.forEach((r) => { r.share = Math.floor(r.exact); });
    let rest = count - raw.reduce((s, r) => s + r.share, 0);
    [...raw].sort((a, b) => (b.exact - b.share) - (a.exact - a.share)).forEach((r) => { if (rest > 0) { r.share += 1; rest -= 1; } });

    const chosen = [];
    raw.forEach(({ t, share }) => chosen.push(...weightedSample(questionsOf(t.id), examWeight, share)));
    // Falls ein Thema zu wenige Fragen hat: mit Fragen der übrigen Themen auffüllen.
    if (chosen.length < count) {
      const taken = new Set(chosen.map((q) => q.id));
      const pool = App.QUESTIONS.filter((q) => !taken.has(q.id) && topics.some((t) => t.id === q.t));
      chosen.push(...weightedSample(pool, examWeight, count - chosen.length));
    }
    return shuffle(chosen);
  }

  /** Fällige Karteikarten (oder neue, wenn noch nie gesehen). */
  function pickCards(topicIds, mode, count = 20) {
    const now = Date.now();
    let pool = FLASHCARDS.filter((c) => !topicIds?.length || topicIds.includes(c.t));
    if (mode === 'due') pool = pool.filter((c) => !store.item(c.id) || store.isDue(c.id, now));
    if (mode === 'weak') pool = pool.filter((c) => (store.item(c.id)?.box || 1) <= 2 && store.item(c.id));
    return weightedSample(pool, (c) => store.weightOf(c.id), Math.min(count, pool.length));
  }

  /* ───────────── Analytik ───────────── */

  function itemStats(ids) {
    const now = Date.now();
    let seen = 0; let ok = 0; let bad = 0; let due = 0; let boxSum = 0;
    const boxes = [0, 0, 0, 0, 0, 0];
    ids.forEach((id) => {
      const it = store.item(id);
      if (!it) { boxes[0] += 1; return; }
      seen += 1;
      ok += it.ok;
      bad += it.bad;
      boxSum += it.box;
      boxes[it.box] += 1;
      if (it.due <= now) due += 1;
    });
    const attempts = ok + bad;
    // Beherrschung: Box 1 = 0 %, Box 5 = 100 %, ungesehen = 0 %
    const mastery = ids.length ? ids.reduce((s, id) => s + ((store.item(id)?.box || 1) - 1) / (store.MAX_BOX - 1), 0) / ids.length : 0;
    return { total: ids.length, seen, ok, bad, attempts, accuracy: attempts ? ok / attempts : NaN, due, mastery, boxes, avgBox: seen ? boxSum / seen : 0 };
  }

  function topicStats(topicId) {
    const q = itemStats(questionsOf(topicId).map((x) => x.id));
    const c = itemStats(cardsOf(topicId).map((x) => x.id));
    const chapter = store.state.chapters[topicId] || {};
    // Fortschritt: 60 % Fragen-Beherrschung, 30 % Karten, 10 % Kapitel gelesen
    const progress = 0.6 * q.mastery + 0.3 * c.mastery + (chapter.done ? 0.1 : 0);
    return { q, c, chapter, progress };
  }

  function overallStats() {
    const q = itemStats(App.QUESTIONS.map((x) => x.id));
    const c = itemStats(FLASHCARDS.map((x) => x.id));
    const perTopic = App.TOPICS.map((t) => ({ topic: t, ...topicStats(t.id) }));
    const progress = perTopic.reduce((s, t) => s + t.progress * t.topic.importance, 0) / perTopic.reduce((s, t) => s + t.topic.importance, 0);
    const chaptersDone = perTopic.filter((t) => t.chapter.done).length;
    return { q, c, perTopic, progress, chaptersDone };
  }

  /**
   * Schwachstellen: Themen mit niedriger Trefferquote (bei genügend Versuchen)
   * oder vielen fälligen Wiederholungen, gewichtet mit der Klausurrelevanz.
   */
  function weakTopics() {
    return overallStats().perTopic
      .map((t) => {
        const acc = Number.isFinite(t.q.accuracy) ? t.q.accuracy : null;
        const need = (acc === null ? 0.5 : 1 - acc) * 0.6 + (1 - t.progress) * 0.4;
        return { ...t, acc, need: need * (0.6 + t.topic.importance * 0.1) };
      })
      .sort((a, b) => b.need - a.need);
  }

  /** Fragen mit den meisten Fehlern. */
  function mistakeList(limit = 10) {
    return App.QUESTIONS
      .map((q) => ({ q, it: store.item(q.id) }))
      .filter((x) => x.it && x.it.bad > 0)
      .sort((a, b) => (b.it.bad - b.it.ok) - (a.it.bad - a.it.ok) || b.it.bad - a.it.bad)
      .slice(0, limit);
  }

  /** Fehlerquote je Fragetyp – zeigt, welche Aufgabenformate schwerfallen. */
  function typeStats() {
    return Object.keys(TYPE_LABEL).map((type) => {
      const s = itemStats(App.QUESTIONS.filter((q) => q.type === type).map((q) => q.id));
      return { type, label: TYPE_LABEL[type], ...s };
    });
  }

  function difficultyStats() {
    return [1, 2, 3, 4].map((d) => ({ d, label: DIFFICULTY[d], ...itemStats(App.QUESTIONS.filter((q) => q.d === d).map((q) => q.id)) }));
  }

  return { DIFFICULTY, TYPE_LABEL, FLASHCARDS, questionsOf, cardsOf, pickQuestions, pickExam, pickCards, itemStats, topicStats, overallStats, weakTopics, mistakeList, typeStats, difficultyStats };
})();
