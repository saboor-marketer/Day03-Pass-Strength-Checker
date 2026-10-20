# Design & Development Report — PW Strength Lab

Password Strength Checker · HTML5 / CSS3 / Vanilla JavaScript · single-page, client-side only.

---

## 1. Objective

Build an interactive tool that estimates password strength in real time and explains **why** a password is weak, with a premium visual identity that is worth putting in a frontend portfolio — while keeping the entire analysis private, dependency-free and beginner-readable.

The hard constraint that shaped the product: **the password must never leave the browser**. That ruled out server-side scoring and any breach-database lookup, so the tool is explicitly positioned as a *heuristic estimator*, never as a security guarantee.

---

## 2. Creative direction

### 2.1 What it is in the real world
Not "a security website" — a **precision laboratory measuring instrument documented on a technical spec sheet**. Think a Braun product panel or a Tektronix front plate: white enamel housing, hard-edged segment scales, engraved tick marks, monospaced tabular readouts.

### 2.2 Reference
Swiss technical documentation of the 1970s (Müller-Brockmann grid + Braun instrument panels), plus the margin-note convention of an aerospace spec sheet. The single borrowed characteristic: **measurement scales drawn as discrete hard segments with engraved ticks and tabular numerals** — never a soft rounded gradient bar.

### 2.3 Surface & palette
| Token | Value | Role |
| --- | --- | --- |
| `--paper` | `#EDF0F7` | Blueprint paper background with a 32px engineering grid |
| `--card` | `#FFFFFF` | Enamel-white instrument housing |
| `--ink` | `#0B1233` | Navy ink (never pure black) |
| `--ink-soft` / `--ink-faint` | `#5B6485` / `#8E97B4` | Tinted neutrals |
| `--blue` | `#2B44FF` | Electric instrument blue — the anchor hue |
| `--amber` | `#E0A32B` | Single accent, warnings only |
| `--s-1 … --s-5` | `#C8322F · #E0703B · #E0A32B · #2B44FF · #0E6E62` | The gauge ramp |

### 2.4 Typography
- **Instrument Serif** (display, `clamp(3.1rem, 6.2vw, 5.15rem)`, italic used as a voice on the word *Strength*)
- **IBM Plex Sans** (UI/body, 400–700)
- **IBM Plex Mono** (all data, labels, status codes, the password field itself)

Scale ratio ≈ 1.25. Personality detail: 10–11px uppercase labels tracked at `.2em`, and `font-variant-numeric: tabular-nums` everywhere a number can change, so readouts never jitter while typing.

### 2.5 Layout decision
An **asymmetric two-column shell**: a sticky editorial rail (type, spec figures, FIG. 01 photograph, privacy note) against a wider instrument card that is itself split into measurement (left) and checklist gutter (right). A full-bleed dark band below breaks the card grid for the verification vectors. Collapses to one column at 1080px.

### 2.6 Rejected defaults
No gradient hero with centred headline + two buttons; no near-black "cyber" page with neon terminal green (the cliché for this category); no grid of identical rounded cards with emoji; no Inter-only typography; no soft rainbow progress bar.

### 2.7 Motion
"Machined precision": 180–260ms `cubic-bezier(.2,.8,.2,1)`; segments light up with a 40ms stagger; the needle snaps along the scale; suggestion rows rise 6px on arrival. Everything is disabled under `prefers-reduced-motion: reduce`.

### 2.8 The memorable moment
The gauge: five hard segments, engraved ticks, and a mono `0.0 — 1.0` scale with a needle that snaps as you type. The password stops feeling like a form field and starts feeling like it is being **measured**.

---

## 3. Information architecture

1. Top bar — mark, wordmark, "100% in-browser · zero network requests" pill.
2. Editorial rail — eyebrow, H1, subtitle, 08 / 05 / 00 spec figures, FIG. 01, privacy note.
3. Instrument card — input row → gauge → four readouts → checklist + suggestions.
4. Verification vectors — full-bleed band, 10-row test table with one-click `Run`.
5. Footer — the "educational heuristic, not a guarantee" disclaimer.

---

## 4. The algorithm

### 4.1 Pattern detection
- **Normalization:** case-folded and leet-speak folded (`@ → a`, `0 → o`, `1 → i`, `3 → e`, `7 → t`, `$ → s`, …), so `P@ssw0rd` is recognised as `password`.
- **Common passwords:** ~110-entry list. A *hit* means the password essentially **is** a known password (normalised length ≤ matched word + 4); a *word* means a longer password merely **contains** a common chunk of 6+ characters.
- **Repeated characters:** `/(.)\1{2,}/` for `aaa`, plus a repeated-block test for `abcabcabc`.
- **Predictable sequences:** longest run of consecutive code points (`abcd`, `1234`, `zyxw`) — a run of 4 or more triggers the penalty.
- **Keyboard walks:** sliding 4-character windows over rows such as `qwertyuiop`, `1234567890`, `1qaz2wsx`, in both directions.
- **Single word:** `[A-Za-z]+` up to 14 characters — a lone dictionary word is a dictionary attack away from broken.

### 4.2 Scoring
Length carries most of the weight deliberately — the brief requires that strength is **not** determined by counting character types.

| Component | Range |
| --- | --- |
| `min(length, 18) × 4` | 0–72 |
| character classes × 6 | 0–24 |
| `round(distinctRatio × 12)` | 0–12 |
| known weak password | −55 |
| contains a common chunk | −22 |
| repeated characters/blocks | −25 |
| predictable sequence | −25 |
| keyboard walk | −25 |
| single dictionary word | −14 |
| one character class only | −8 |
| low variety (`< 0.5`) on short input | −10 |

**Length gates** (nothing short may read as strong): `<6` chars caps at 15, `<8` at 22, `<12` at 64, `<16` at 84.

| Score | State |
| --- | --- |
| 0–24 | Very weak |
| 25–44 | Weak |
| 45–64 | Medium |
| 65–84 | Strong |
| 85–100 | Very strong |

### 4.3 Entropy readout
`length × log2(pool)`, where the pool is 26/26/10/33 per present character class, reduced ×0.45 for a known weak password and ×0.7 for other predictability. Presented as `~N bits` and labelled **heuristic** in the UI, since a naive pool estimate overstates real-world strength.

---

## 5. Test results

All ten cases are loadable from the Verification vectors table in the page itself.

| # | Case | Input | Expected | Observed | Verdict |
| --- | --- | --- | --- | --- | --- |
| 1 | Empty field | *(empty)* | Empty (S0) | Empty, all rows `Waiting`, empty-state hint shown | Pass |
| 2 | Very short | `abc` | Very weak (S1) | Very weak — length gate caps the score at 15 | Pass |
| 3 | Lowercase dictionary word | `sunflower` | Very weak (S1) | Very weak — common word hit (−55) | Pass |
| 4 | Lowercase only, 12 chars | `copperkettle` | Weak (S2) | Weak — length helps, but one class (−8) and single word (−14) | Pass |
| 5 | Mixed but short | `Ab1!xQ` | Very weak (S1) | Very weak — variety cannot rescue 6 characters | Pass |
| 6 | Repeated characters | `aaaaaaaa` | Very weak (S1) | Very weak — repeat run (−25), one class (−8), single word (−14) | Pass |
| 7 | Predictable sequence | `12345678` | Very weak (S1) | Very weak — sequence (−25) + common password (−55) | Pass |
| 8 | Common password | `Password1` | Very weak (S1) | Very weak — `password` hit (−55) | Pass |
| 9 | Long passphrase | `correct horse battery staple` | Strong (S4) | Strong — 28 characters dominate, single class only costs 8 | Pass |
| 10 | Long & varied | `My-Cat-Loves-7-Boxes!` | Very strong (S5) | Very strong — 21 characters, all four classes, high variety | Pass |

Interaction tests: show/hide toggles `type` and the icon; clear resets the gauge, checklist, readouts and suggestions and restores focus; copy shows `Copied to clipboard` (and `Copy blocked — select the text and copy manually` when the Clipboard API refuses); the counter updates on every keystroke; `Run` loads a sample without storing anything. No console output contains the password at any point.

---

## 6. Accessibility audit

- Landmarks: `header`, `main`, `aside`, `section`, `footer`; real `<table>` with `<caption>`, `scope="col"` / `scope="row"`.
- Skip link to the password field; `:focus-visible` outline on every control.
- Icon buttons carry explicit `aria-label`s; the eye toggle exposes `aria-pressed`.
- Gauge is `role="progressbar"` with `aria-valuemin/max/now` and a descriptive `aria-valuetext`.
- A single polite `aria-live` region announces strength **only on state change** — not on every keystroke.
- The checklist states `Met` / `Not met` / `Waiting` in text, so colour is never the only channel.
- Contrast: navy `#0B1233` on `#EDF0F7` ≈ 15:1; muted `#5B6485` on white ≈ 6.4:1; white on the navy band ≈ 17:1.
- `prefers-reduced-motion` honoured.

---

## 7. Security & privacy

- Zero network calls with the password; no analytics, no telemetry, no third-party scripts that could see it.
- No `eval()`, no `innerHTML` with dynamic data — `createElement` + `textContent` only.
- No `localStorage`, `sessionStorage`, `cookies`, or URL/query-string exposure.
- Copy is strictly user-initiated; the clipboard is never read or written automatically.
- The UI states plainly that this is an educational heuristic and that it has **not** checked the password against leaked-password databases. Such a claim is not made anywhere in the product.

---

## 8. Limitations & future work

- The weak-password list is a local sample (~110 entries), not a full dictionary. A genuine offline bloom filter of the Have I Been Pwned k-anonymity set would improve detection while preserving privacy.
- Entropy is a pool-based estimate; it does not model real cracking tooling.
- Localisation: the interface is English-only.
- Possible additions: password generator, passphrase builder, strength history sparkline, and a "how long would this take" readout presented with the same caveats.

---

## 9. Assets

- Photography (Pexels, free licence): vintage control panel with analogue gauges — Andranik Paradyan; hand holding a brass padlock — Nathan Thomas. Both are desaturated and duotoned toward the navy/blue palette so they read as material rather than stock imagery.
- Type: Instrument Serif, IBM Plex Sans, IBM Plex Mono (Google Fonts).
- All icons are hand-written inline SVG (lock/shield mark, eye, eye-off, cross, tick, copy) — no icon font, no sprite sheet.
