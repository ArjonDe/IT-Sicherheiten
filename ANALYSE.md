# Dokumentenanalyse und Lernkonzept

## 1. Analysierte Dokumente

| Dokument | Umfang | Rolle für die Klausur |
|---|---|---|
| Vorlesungsunterlagen (Böcker, WS 2026/27) | 269 Folien | **Hauptquelle** – alle sechs Kapitel |
| Übungsblätter 1–5 | 18 Seiten | **Prüfungsnah** – 49 Wissensfragen (Multiple Choice) und 8 Rechenaufgaben, keine Musterlösungen |
| Modulhandbuch | 2 Seiten | Lehrinhalte, Lernziele, Prüfungsform (Portfolio aus zwei Teilprüfungen, je 50 %) |
| BSI-Leitfaden Basis-Absicherung | 96 Seiten | Vertiefung IT-Grundschutz; Kapitel 1–2 sind laut Übungsblatt 1.2 Pflichtlektüre |
| Skript „Installation eines sicheren Linux-Servers“ (Entwurf) | 53 Seiten | Praxis: Härtung, TLS, Mailserver-Sicherheit (SPF/DKIM/DMARC) |
| Gesamtübersicht Moodle-Kurs | 6 Seiten | Kursstruktur; listet auch IT-Recht-Material, das nicht vorliegt |

## 2. Themen, Kapitel und Klausurrelevanz

Die Relevanz (1–5) ergibt sich aus der Nennung im Modulhandbuch, der Abdeckung durch Übungsblätter und den Lernzielfolien.

| # | Themenblock | Quelle | Relevanz | Begründung |
|---|---|---|---|---|
| 1 | Grundlagen der IT-Sicherheit (CIA, Kategorien, TCSEC/CC/ISO 27000, Grundschutz-Kompendium, ISMS) | Folien 6–48 | ★★★★★ | Modulhandbuch + Übungsblatt 1 |
| 2 | BSI Basis-Absicherung (ISB, Leitlinie, Grundschutz-Check, R1–R3) | Leitfaden | ★★★★☆ | Übungsblatt 1.2, Modulhandbuch „IT-Grundschutz des BSI“ |
| 3 | Netzwerke & Protokollsicherheit (TCP/IP, IPsec, TLS, DNS, Firewalls, VPN) | Folien 49–79 | ★★★★☆ | Modulhandbuch „TCP/IP-Modell“, kein Übungsblatt |
| 4 | Kryptografie: Grundlagen & symmetrisch (Caesar, XOR/OTP, Kerckhoffs, DES, 3DES, AES) | Folien 80–117 | ★★★★★ | Übungsblatt 2 (Verfahrenswahl) |
| 5 | Mathematische Grundlagen (Restklassen, Inverse, Euklid, Gruppen, Körper, GF(2ⁿ), φ, DH) | Folien 118–163 | ★★★★★ | Übungsblatt 2.3–2.10 – Rechenaufgaben |
| 6 | Asymmetrisch, Hash & PKI (RSA, ECC, Hashes, Signaturen, hybride Verfahren) | Folien 164–188 | ★★★★★ | Übungsblatt 2 und 3 |
| 7 | Identität & Zugriffskontrolle (AuthN-Faktoren, MFA, MAC/DAC/RBAC, Kerberos, PAP/CHAP/NTLM) | Folien 189–220 | ★★★★★ | Übungsblatt 3 |
| 8 | Physische Sicherheit (Zutritt, Schleusen, Brand, ESD, USV) | Folien 221–238 | ★★★★☆ | Übungsblatt 4 |
| 9 | Angriffsszenarien (Malware, Social Engineering, Exploits, Post-Exploitation, APT, WLAN) | Folien 239–269 | ★★★★★ | Übungsblatt 5 |
| 10 | Sicherer Linux-Server (SSH, Fail2Ban, ufw, Let’s Encrypt, TLS-Profile, SPF/DKIM/DMARC) | Skript | ★★★☆☆ | Praxisbezug, nicht ausdrücklich im Modulhandbuch |

### Wiederkehrende Konzepte
- **CIA + Verbindlichkeit** taucht in Grundlagen, Identität (Non-Repudiation), Zugriffssteuerung (Vertraulichkeit/Integrität) und im BSI-Leitfaden (Grundwerte) auf.
- **Diffie-Hellman / PFS** erscheint in IPsec/IKE, TLS 1.3, hybrider Verschlüsselung und im Server-Skript (DH-Parameter).
- **Hash-Verfahren** zurück bei CHAP/NTLM, Passwortspeicherung, digitaler Signatur und DKIM.
- **Least Privilege** verknüpft Identität (Folie 212) mit Angriffsszenarien (Schadcode erbt Rechte, Folie 255).
- **Schichtenmodell** im TCP/IP-Kapitel und als 10 Schichten im IT-Grundschutz-Kompendium.

### Typische Prüfungsaufgaben (abgeleitet aus den Übungsblättern)
- Szenario → richtige Maßnahme/Kategorie/Malware wählen (Multiple Choice)
- Verfahrenswahl: welcher Algorithmus für welchen Zweck (Geschwindigkeit, Integrität, Schlüsselaustausch)
- Rechnen in ℤₘ, multiplikative Inverse, Potenzen mit Satz von Euler, diskreter Logarithmus, φ-Funktion
- Multiplikation in GF(2⁴) modulo eines irreduziblen Polynoms
- Entschlüsseln einer affinen Chiffre

## 3. Lernkonzept

Leitfrage bei jeder Entscheidung: *Welche Darstellung hilft am meisten, die Klausur zu bestehen?*

1. **Verstehen (Lernmodus).** Jedes Kapitel beginnt mit einer Zusammenfassung und der Begründung seiner Klausurrelevanz, gefolgt von Stichpunkten mit Foliennummer. Definitionen lassen sich im **Selbsttest-Modus** verdecken (Active Recall statt Wiederlesen). Abläufe werden als nummerierte Schrittfolgen gezeigt, weil Reihenfolgen (TLS-Handshake, Kerberos, Signatur) oft abgefragt werden.
2. **Abrufen (Quiz).** Sechs Formate trainieren unterschiedliche Abrufarten: Wiedererkennen (Single/Multiple Choice, Wahr/Falsch), Zuordnen (Begriff ↔ Definition), freies Erinnern (Lückentext, Rechenaufgaben) und Prozesswissen (Reihenfolge). Jede Frage hat vier Schwierigkeitsstufen bis „klausurähnlich“, eine Erklärung und eine Fundstelle zum Nachschlagen.
3. **Behalten (Spaced Repetition).** Ein Leitner-System mit 5 Boxen plant Wiederholungen. Fehler setzen eine Frage zurück in Box 1, und die Auswahl gewichtet fehlerhafte Fragen stärker. So landen Schwachstellen automatisch häufiger im Quiz.
4. **Anwenden unter Prüfungsbedingungen (Prüfungsmodus).** Zeitlimit, keine Hilfen, Punkte nach Schwierigkeit, Aufgabenverteilung nach Klausurrelevanz. Die Ergebnisanalyse zeigt die Punkte je Thema und je Schwierigkeit und verlinkt direkt auf das schwächste Thema.
5. **Steuern (Lernanalytik).** Das Themen-Ranking kombiniert Trefferquote, Fortschritt und Relevanz. Die Fehleranalyse zeigt die meistverfehlten Fragen, die Leitner-Verteilung den Wiederholungsbedarf. Tagesziel, Lernserie und Heatmap halten die Motivation hoch.

## 4. Transparenz: fehlende Informationen

Die Plattform nutzt kein externes Fachwissen. Was die Unterlagen nicht hergeben, ist in der App unter **Lernmodus → Hinweise zur Datenbasis** aufgeführt, unter anderem:

- Übungsfragen ohne eindeutige Lösung in den Unterlagen (z. B. EAL4, Linux-Dateirechte, Shoulder Surfing, „fail open“) wurden **nicht** in den Fragenpool übernommen.
- Folien, die nur aus Abbildungen bestehen (z. B. CC-Vertrauensstufen, ShiftRows, Brandklassentabelle), konnten nicht ausgewertet werden.
- Zwei Auffälligkeiten beim Nachrechnen: Folie 134 (ℤ₆ – auch 5 ist invertierbar) und Folie 238 (850 W / 0,7 ≈ 1214 W statt 1190 W).
- Bestehensgrenze und Notenschlüssel sind nicht angegeben; das Prüfungsergebnis dient nur der Orientierung.
- IT-Recht-Inhalte der Moodle-Übersicht sind nicht enthalten, da das Skript nicht vorliegt.
