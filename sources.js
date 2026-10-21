/**
 * Quellenverzeichnis der Lernplattform.
 *
 * Jede Frage, Karteikarte und Definition verweist über ein Kürzel auf eines
 * dieser Dokumente. Seitenangaben entsprechen der PDF-Seite; bei den
 * Vorlesungsunterlagen ist die PDF-Seite identisch mit der Foliennummer.
 */
window.App = window.App || {};

App.SOURCES = {
  VL: { name: 'Vorlesungsunterlagen (Böcker)', unit: 'Folie', file: 'Vorlesungsunterlagen.pdf' },
  UE: { name: 'Übungsblätter 1–5', unit: '', file: 'Übungsblätter 1 Gesamt.pdf' },
  LF: { name: 'BSI-Leitfaden Basis-Absicherung', unit: 'S.', file: 'Leitfaden Basis-Absicherung nach IT-Grundschutz.pdf' },
  SK: { name: 'Skript „Installation eines sicheren Linux-Servers“', unit: 'S.', file: 'ServerSkit.pdf' },
  MH: { name: 'Modulhandbuch', unit: 'S.', file: 'Modulhandbuch IT Sicherheiten.pdf' },
  GU: { name: 'Gesamtübersicht Moodle-Kurs', unit: 'S.', file: 'Gesamtübersicht.pdf' },
};

/**
 * Formatiert eine Quellenangabe [kürzel, seite] als lesbaren Text.
 * @param {[string, (number|string)]} ref
 * @returns {string}
 */
App.formatSource = function formatSource(ref) {
  const [code, loc] = ref;
  const src = App.SOURCES[code];
  if (!src) return String(loc);
  if (code === 'UE') return `${src.name}: ${loc}`;
  return `${src.name}, ${src.unit} ${loc}`;
};

/**
 * Hinweise zur Datenbasis: Was die Unterlagen NICHT abdecken.
 * Diese Punkte werden im Lernmodus transparent angezeigt, damit klar ist,
 * wo eigenständige Nacharbeit (z. B. Literatur) nötig ist.
 */
App.DATA_GAPS = [
  {
    title: 'Übungsfragen ohne Lösung in den Unterlagen',
    text: 'Die Übungsblätter enthalten keine Musterlösungen. Folgende Fragen lassen sich mit den Folien und Skripten nicht eindeutig beantworten und wurden deshalb nicht in den Fragenpool übernommen:',
    items: [
      'Blatt 1, 1.1 Nr. 7 – Kategorie für „kein unbefugter Zutritt zu internen Systemen“ (Folien trennen physisch/technisch nicht eindeutig für diesen Fall)',
      'Blatt 1, 1.1 Nr. 9 – Bedeutung von Common Criteria EAL4 (steht nur in einer Abbildung auf Folie 34, nicht im Text)',
      'Blatt 3, 3.1 Nr. 5 – Sicherheitsrichtlinie für Mobiltelefone',
      'Blatt 3, 3.1 Nr. 10 – Authentifikationstyp eines Hardware-Tokens',
      'Blatt 3, 3.3 – Linux-Dateirechte (drwxr-xr-x, chmod 644): Die Bedeutung der Rechte-Notation wird in den Unterlagen nicht erklärt',
      'Blatt 4, 4.1 Nr. 2, 3, 7, 8 – Temperaturschwankungen, Aufgabentrennung, elektromagnetische Abschirmung, „fail open“',
      'Blatt 5, 5.1 Nr. 5, 7, 8 – Shoulder Surfing, Kontosperrung (Lockout), Tailgating als Begriff',
      'Blatt 2, 2.4 c) – Aufgabenstellung im PDF nicht eindeutig lesbar (Exponent/Inverse)',
      'Blatt 2, 2.9 – Urheber des Zitats „first the sentence and then the evidence“ ist in den Unterlagen nicht angegeben',
    ],
  },
  {
    title: 'Quellenstudium-Aufgaben',
    text: 'Die Aufgaben zum Quellenstudium (z. B. weitere Funktionsklassen der Common Criteria, Palm-Secure™, Bell-LaPadula, Biba, LoMAC, MLS, Cyber-Sicherheits-Check, Stanislaw Lem) verweisen auf externe Quellen. Deren Inhalte liegen nicht vor und sind hier nicht abgebildet.',
    items: [],
  },
  {
    title: 'Abbildungen ohne Textinhalt',
    text: 'Einige Folien bestehen nur aus Grafiken (z. B. Bitkom-Statistik Folie 12, CC-Vertrauensstufen Folie 34, AES-Ablauf Folie 110, ShiftRows Folie 112, SSO-Varianten Folie 197, Personenschleuse Folie 229, Brandklassen-Tabelle Folie 232). Deren Inhalte konnten nicht extrahiert werden.',
    items: [],
  },
  {
    title: 'Auffälligkeiten in den Folien',
    text: 'Beim Nachrechnen sind zwei Stellen aufgefallen, die du kennen solltest:',
    items: [
      'Folie 134 (ℤ₆): Dort steht, eine Inverse existiere „nur für a = 1“. Nach dem Satz auf Folie 135 (ggT(a, 6) = 1) hat auch 5 eine Inverse: 5 · 5 = 25 ≡ 1 mod 6. Die Tabelle auf der Folie zeigt die Zeile für 5 nicht.',
      'Folie 238 (USV): Mit P = S · cos φ und cos φ = 0,7 ergibt sich für 850 W rechnerisch S = 850 / 0,7 ≈ 1214 W. Die Folie nennt 1190 W (= 850 · 1,4).',
    ],
  },
  {
    title: 'IT-Recht',
    text: 'Die Gesamtübersicht des Moodle-Kurses listet auch Inhalte zum IT-Recht (Vertragsschluss, AGB, Gewährleistung). Das zugehörige Skript liegt nicht vor; diese Themen sind deshalb nicht Teil der Plattform.',
    items: [],
  },
];
