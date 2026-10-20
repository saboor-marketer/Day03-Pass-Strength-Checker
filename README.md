# PW Strength Lab — Password Strength Checker

A modern, responsive **Password Strength Checker** built with semantic **HTML5**, **CSS3** and **Vanilla JavaScript** — no frameworks, no build step, no dependencies.

It analyses a password entirely inside the browser as you type, and shows a five-state strength gauge, a live checklist of eight criteria, four measurement readouts and contextual improvement suggestions.

> **Privacy first:** the password is never uploaded, logged, stored, or written to `localStorage`, `sessionStorage`, cookies or the URL. Analysis happens in memory, in your tab, and disappears when the page does.

---

## 1. Files

| File | Purpose |
| --- | --- |
| `index.html` | Semantic structure of the whole interface (header, editorial rail, instrument card, verification vectors, footer). |
| `style.css` | The complete design system: tokens, layout, components, responsive rules, motion. |
| `script.js` | Pattern detection, scoring, classification and all UI interaction logic. |
| `README.md` | This file — usage and customization. |
| `report.md` | Design + development report: decisions, algorithm, test results, limitations. |

Open `index.html` in any modern browser. That's it — no server, no install.

---

## 2. Features

**Password input**
- Placeholder `Enter your password`, monospaced typeface so every character is legible.
- **Show / Hide** toggle with an eye icon (`aria-pressed`, label switches between "Show password" and "Hide password").
- **Clear** button — empties the field, resets every readout and returns focus to the input.
- **Copy** button — copies **only on an explicit click**, shows a temporary `Copied to clipboard` confirmation and falls back to a hidden-textarea copy when the async Clipboard API is unavailable. Clipboard errors are handled gracefully.
- Live **character counter**.

**Real-time analysis (8 criteria)**
1. At least 8 characters
2. At least 12 characters (recommended)
3. Contains an uppercase letter
4. Contains a lowercase letter
5. Contains a number
6. Contains a special character
7. Not a common or obvious password
8. No repeated characters or predictable sequences

Every row shows a text status (`Met` / `Not met` / `Waiting`) as well as a colour and icon, so the checklist never relies on colour alone.

**Strength meter** — five states after *Empty*: **Very weak · Weak · Medium · Strong · Very strong**. Rendered as five hard-edged instrument segments with tick marks and a snapping needle; the bar width, segment count, needle position and colour all animate on every keystroke.

**Readouts** — length, distinct characters, character classes (`n/4`) and a rough entropy estimate in bits (explicitly labelled a heuristic).

**Suggestions** — contextual and dynamic, e.g. *"Try using at least 12 characters."*, *"Avoid predictable sequences like '123456'."*, *"Avoid repeated characters and blocks like 'aaaa'."*, *"Consider using a unique passphrase of three or four unrelated words."*, and *"Your password meets the main checks, but length and unpredictability still matter."*

**Verification vectors** — the full test plan from the brief, loadable into the field with one click so anyone can reproduce the expected states.

---

## 3. How the scoring works (summary)

Length carries most of the weight; character variety is a bonus; predictability is a penalty.

```
score  = min(length, 18) × 4            // 0–72  — length dominates
       + characterClasses × 6           // 0–24
       + round(distinctRatio × 12)      // 0–12
       − 55  if it is a known weak password
       − 22  if it contains a common chunk
       − 25  repeated characters / repeated blocks
       − 25  predictable sequence (abcd, 1234)
       − 25  keyboard walk (qwerty, 1qaz)
       − 14  a single dictionary-style word
       −  8  only one character class
       − 10  very low character variety

length gates: <6 chars can never exceed 15 · <8 → 22 · <12 → 64 · <16 → 84
```

The final number (0–100) maps to the five states. See `report.md` for the full worked examples.

---

## 4. Customising

Everything visual lives in the `:root` block of `style.css`:

```css
--paper:#EDF0F7;   /* blueprint paper background */
--ink:#0B1233;     /* navy text — never pure black */
--blue:#2B44FF;    /* the instrument accent */
--amber:#E0A32B;   /* warnings */
--s-1 … --s-5      /* the five gauge states */
```

Typefaces are loaded from Google Fonts (Instrument Serif, IBM Plex Sans, IBM Plex Mono). To self-host, drop the `<link>` in `index.html` and add `@font-face` rules instead.

In `script.js`:
- `COMMON_PASSWORDS` — extend the weak-password list (values are matched after case-folding and leet-speak folding, so `P@ssw0rd` matches `password`).
- `KEYBOARD_ROWS` — keyboard walks to reject.
- The scoring block inside `analyze()` — weights and thresholds.
- `STATES` — labels and codes shown next to the gauge.

---

## 5. Accessibility

- Semantic landmarks: `header`, `main`, `aside`, `section`, `footer`, real `table` markup for the test vectors.
- Visible skip link to the password field.
- Every control has an explicit `aria-label`; the toggle exposes `aria-pressed`.
- The gauge is a `role="progressbar"` with `aria-valuenow` / `aria-valuetext`.
- Strength changes are announced through a polite live region **only when the state changes**, so screen-reader users are not flooded while typing.
- Strong visible focus rings (`:focus-visible`) on every interactive element.
- All text meets WCAG AA contrast on its surface.
- Full keyboard operation; nothing requires a mouse.
- `prefers-reduced-motion: reduce` disables all transitions and animation.

---

## 6. Privacy & security notes

- No network requests are made with your password — no API, no analytics, no telemetry.
- No `eval()`, no `innerHTML` with user data: all dynamic text is inserted with `textContent`.
- Nothing is written to storage of any kind, and the password never appears in the page URL.
- This is an **educational strength estimator**. It is a heuristic, not a guarantee, and it does **not** check your password against leaked-password databases (no such integration exists here, and none is claimed).

---

## 7. Browser support

Latest Chrome, Edge, Firefox and Safari, desktop and mobile. Uses only widely supported APIs; the Clipboard API is feature-detected with a legacy `execCommand` fallback and a friendly failure message.

---

## 8. Credits

- Photography: Pexels (free licence) — vintage control panel by Andranik Paradyan; padlock by Nathan Thomas.
- Type: Instrument Serif, IBM Plex Sans, IBM Plex Mono (Google Fonts, SIL Open Font License).
