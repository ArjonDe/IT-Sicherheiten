/**
 * Allgemeine Hilfsfunktionen: DOM-Erzeugung, Zufall, Text-Normalisierung,
 * Datums- und Zeitformatierung.
 */
window.App = window.App || {};

App.util = (() => {
  /**
   * Erzeugt ein DOM-Element.
   * @param {string} tag   z. B. 'div.card.primary' (Klassen per Punkt)
   * @param {object} [attrs] Attribute; on*-Keys werden als Event-Listener gesetzt
   * @param {...(Node|string|null|false|Array)} children
   */
  function h(tag, attrs, ...children) {
    const [name, ...classes] = tag.split('.');
    const node = document.createElement(name || 'div');
    if (classes.length) node.className = classes.join(' ');
    if (attrs && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) {
      children.unshift(attrs);
      attrs = null;
    }
    if (attrs) {
      for (const [key, value] of Object.entries(attrs)) {
        if (value === undefined || value === null || value === false) continue;
        if (key.startsWith('on') && typeof value === 'function') {
          node.addEventListener(key.slice(2).toLowerCase(), value);
        } else if (key === 'class') {
          node.className += (node.className ? ' ' : '') + value;
        } else if (key === 'html') {
          node.innerHTML = value;
        } else if (key === 'style' && typeof value === 'object') {
          Object.assign(node.style, value);
        } else if (key === 'dataset') {
          Object.assign(node.dataset, value);
        } else {
          node.setAttribute(key, value === true ? '' : value);
        }
      }
    }
    appendChildren(node, children);
    return node;
  }

  function appendChildren(node, children) {
    for (const child of children.flat(Infinity)) {
      if (child === null || child === undefined || child === false) continue;
      node.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
  }

  /** Fisher-Yates-Mischen (liefert eine Kopie). */
  function shuffle(list) {
    const arr = [...list];
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /**
   * Gewichtete Zufallsauswahl ohne Zurücklegen.
   * @param {Array} list
   * @param {(item) => number} weightOf
   * @param {number} count
   */
  function weightedSample(list, weightOf, count) {
    const pool = list.map((item) => ({ item, w: Math.max(0.01, weightOf(item)) }));
    const result = [];
    while (result.length < count && pool.length) {
      const total = pool.reduce((sum, p) => sum + p.w, 0);
      let r = Math.random() * total;
      let idx = 0;
      for (; idx < pool.length - 1; idx += 1) {
        r -= pool[idx].w;
        if (r <= 0) break;
      }
      result.push(pool[idx].item);
      pool.splice(idx, 1);
    }
    return result;
  }

  /**
   * Normalisiert Freitext-Antworten für tolerante Vergleiche
   * (Groß-/Kleinschreibung, Umlaute, Leer- und Bindestriche, Satzzeichen).
   */
  function normalize(text) {
    return String(text ?? '')
      .toLowerCase()
      .trim()
      .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
      .replace(/[\s\-–_.,;:!?"'„“()]/g, '');
  }

  const DAY = 24 * 60 * 60 * 1000;

  /** Lokales Datum als Schlüssel YYYY-MM-DD. */
  function dayKey(date = new Date()) {
    const d = new Date(date);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  }

  function formatDuration(seconds) {
    const s = Math.max(0, Math.round(seconds));
    const m = Math.floor(s / 60);
    const rest = String(s % 60).padStart(2, '0');
    return `${m}:${rest}`;
  }

  function formatDate(ts) {
    return new Date(ts).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function formatDateTime(ts) {
    return new Date(ts).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  function pct(value, digits = 0) {
    if (!Number.isFinite(value)) return '–';
    return `${(value * 100).toFixed(digits)} %`;
  }

  /** Zahl im deutschen Format mit höchstens einer Nachkommastelle. */
  function num(value) {
    return Number(value).toLocaleString('de-DE', { maximumFractionDigits: 1 });
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  /** Kurzer Live-Hinweis unten am Bildschirm. */
  function toast(message, kind = 'info') {
    const host = document.getElementById('toast-host');
    if (!host) return;
    const node = h(`div.toast.toast-${kind}`, { role: 'status' }, message);
    host.append(node);
    requestAnimationFrame(() => node.classList.add('show'));
    setTimeout(() => {
      node.classList.remove('show');
      setTimeout(() => node.remove(), 300);
    }, 2600);
  }

  return { h, shuffle, weightedSample, normalize, dayKey, formatDuration, formatDate, formatDateTime, pct, num, clamp, toast, DAY };
})();
