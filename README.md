# IT-Sicherheit und Netzwerke – Lernplattform

Interaktive Lernplattform zur Klausurvorbereitung im Modul **IT-Sicherheit und Netzwerke** (FH Südwestfalen, Prof. Dr. Böcker).
Alle Inhalte stammen ausschließlich aus den bereitgestellten Unterlagen (Vorlesungsfolien, Übungsblätter 1–5, BSI-Leitfaden Basis-Absicherung, Skript „Sicherer Linux-Server“, Modulhandbuch).

**Umfang:** 10 Kapitel · 294 Fragen (51 aus den Übungsblättern) · 224 Karteikarten · 6 Fragetypen

| Modus | Was er macht |
|---|---|
| **Lernmodus** | Kapitel mit Zusammenfassung, Stichpunkten, Definitionen (mit Selbsttest), Abläufen, Formeln, Tabellen, Klausurtipps |
| **Quiz** | Single/Multiple Choice, Wahr/Falsch, Zuordnung, Lückentext, Reihenfolge – sofortiges Feedback mit Erklärung und Fundstelle |
| **Karteikarten** | Flip-Animation, Leitner-Bewertung (Nochmal/Schwer/Gewusst) |
| **Prüfung** | Zufällige Aufgaben nach Klausurrelevanz, Countdown, Punkte nach Schwierigkeit, Ergebnisanalyse |
| **Statistik** | Fortschritt, Erfolgsquote, Fehleranalyse, Schwachstellen-Ranking, Leitner-Boxen, Prüfungsverlauf, Heatmap |

Der Lernstand liegt nur im `localStorage` deines Browsers; über **Statistik → Daten** kannst du ihn exportieren und importieren.

---

## Lokal starten

Kein Build nötig. Die App läuft direkt aus dem Ordner:

```bash
python3 -m http.server 8000
```

Dann <http://localhost:8000> öffnen. (Ein Doppelklick auf `index.html` funktioniert ebenfalls, da keine ES-Module verwendet werden.)

## Deployment auf GitHub Pages

1. Neues Repository auf GitHub anlegen, z. B. `itsec-lernplattform` (öffentlich).
2. Im Projektordner ausführen:

```bash
git init
```

```bash
git add .
```

```bash
git commit -m "Lernplattform IT-Sicherheit"
```

```bash
git branch -M main
```

```bash
git remote add origin https://github.com/DEIN-NAME/itsec-lernplattform.git
```

```bash
git push -u origin main
```

3. Auf GitHub: **Settings → Pages → Build and deployment → Source: „Deploy from a branch“**, Branch **`main`**, Ordner **`/ (root)`** → **Save**.
4. Nach ca. einer Minute ist die Seite erreichbar unter `https://DEIN-NAME.github.io/itsec-lernplattform/`.

> Die Datei `.nojekyll` sorgt dafür, dass GitHub Pages die Dateien unverändert ausliefert.
> Nach Änderungen die Versionsnummer `?v=…` in `index.html` erhöhen, damit Browser keine alten Dateien aus dem Cache laden.

## Projektstruktur

```
itsec-lernplattform/
├── index.html                 App-Shell, Navigation, Skript-Reihenfolge
├── .nojekyll                  GitHub Pages: Jekyll deaktivieren
├── README.md
├── docs/
│   └── ANALYSE.md             Dokumentenanalyse und Lernkonzept
├── assets/
│   └── favicon.svg
├── css/
│   └── styles.css             Design-Tokens (Hell/Dunkel), Layout, Komponenten, Animationen
└── js/
    ├── data/
    │   ├── sources.js         Quellenverzeichnis + Hinweise zu Lücken in den Unterlagen
    │   ├── topics.js          Wissensbasis: 10 Kapitel (Zusammenfassung, Definitionen, Abläufe, Formeln …)
    │   └── questions.js       Fragenpool mit Lösung, Erklärung und Fundstelle
    ├── core/
    │   ├── utils.js           DOM-Helfer, Zufall, Normalisierung, Formatierung
    │   ├── icons.js           Inline-SVG-Icons
    │   ├── store.js           localStorage + Leitner-System (Spaced Repetition)
    │   └── content.js         Kartengenerierung, Fragenauswahl, Lernanalytik
    ├── components/
    │   └── question.js        Rendering und Auswertung aller Fragetypen
    ├── views/
    │   ├── dashboard.js       Startseite
    │   ├── learn.js           Lernmodus
    │   ├── quiz.js            Quiz-Modus
    │   ├── cards.js           Karteikarten
    │   ├── exam.js            Prüfungsmodus
    │   └── stats.js           Lernanalytik
    └── app.js                 Hash-Router, Theme, Navigation
```

## Architektur in Kürze

- **Vanilla JavaScript ohne Build-Schritt.** Für GitHub Pages ideal: nichts zu kompilieren, keine Abhängigkeiten, die veralten können. Jede Datei registriert sich im Namespace `window.App`.
- **Daten getrennt von Logik.** Neue Fragen oder Definitionen ergänzt man nur in `js/data/*.js`; Karteikarten werden automatisch aus Definitionen, Formeln und Abläufen erzeugt.
- **Hash-Routing** (`#/quiz`, `#/lernen/krypto`) – funktioniert auf GitHub Pages ohne Server-Konfiguration.
- **Leitner-System** mit 5 Boxen (Intervalle 0 · 1 · 3 · 7 · 16 Tage). Falsch → Box 1 und nach 10 Minuten wieder fällig. Die Fragenauswahl gewichtet Fehler, niedrige Boxen und fällige Items höher.
- **Barrierearm:** Tastaturbedienung (Enter = prüfen/weiter, 1–9 = Option wählen, Leertaste = Karte umdrehen), ARIA-Rollen, `prefers-reduced-motion`.

## Fragen ergänzen

```js
// js/data/questions.js
{ id: 'k99', t: 'krypto', d: 2, type: 'single',
  q: 'Fragetext …', o: ['A', 'B', 'C', 'D'], a: 1,
  e: 'Erklärung …', s: [['VL', 107]] },
```

Typen: `single` (a = Index), `multi` (a = Index-Array), `tf` (a = true/false), `match` (`pairs`), `cloze` (`___` im Text, a = Array akzeptierter Antworten je Lücke), `order` (`items` in richtiger Reihenfolge).
Quellenkürzel: `VL` Folien, `UE` Übungsblätter, `LF` BSI-Leitfaden, `SK` Server-Skript, `MH` Modulhandbuch.
