/* =========================================================
   PW STRENGTH LAB — script.js
   A privacy-first password strength estimator.

   RULES OBSERVED HERE
   • The password never leaves this file: no fetch, no XHR,
     no analytics, no console logging, no storage of any kind.
   • No eval(), no innerHTML with user data — text nodes only.
   • Everything is wrapped in an IIFE so nothing leaks into
     the global scope.
   ========================================================= */

(function () {
  'use strict';

  /* ---------------------------------------------------------
     1. ELEMENT REFERENCES
     --------------------------------------------------------- */
  const input        = document.getElementById('pw');
  const toggleBtn    = document.getElementById('togglePw');
  const clearBtn     = document.getElementById('clearPw');
  const copyBtn      = document.getElementById('copyPw');
  const lenValue     = document.getElementById('lenValue');
  const actionMsg    = document.getElementById('actionMsg');
  const gaugeBlock   = document.querySelector('.gauge-block');
  const gauge        = document.getElementById('gauge');
  const needle       = document.getElementById('needle');
  const strengthLabel = document.getElementById('strengthLabel');
  const strengthText = document.getElementById('strengthText');
  const stateCode    = document.getElementById('stateCode');
  const liveRegion   = document.getElementById('liveRegion');
  const metricLen    = document.getElementById('mLen');
  const metricUnique = document.getElementById('mUnique');
  const metricClass  = document.getElementById('mClasses');
  const metricBits   = document.getElementById('mEntropy');
  const checklist    = document.getElementById('checklist');
  const suggestionList = document.getElementById('suggestions');

  /* If any of these are missing the page is not ours — bail out. */
  if (!input || !gauge || !checklist || !suggestionList) { return; }

  const checkRows = {};
  Array.prototype.forEach.call(checklist.querySelectorAll('.check-row'), function (row) {
    checkRows[row.getAttribute('data-check')] = row;
  });

  /* ---------------------------------------------------------
     2. REFERENCE DATA
     --------------------------------------------------------- */

  /* Very common passwords / famous example passwords.
     Normalised (lowercased, leet-speak folded) before matching. */
  const COMMON_PASSWORDS = [
    '123456', '1234567', '12345678', '123456789', '1234567890', '111111', '000000',
    'password', 'password1', 'password123', 'passw0rd', 'p@ssw0rd', 'p@ssword',
    'qwerty', 'qwerty123', 'qwertyuiop', 'asdfgh', 'asdfghjkl', 'zxcvbnm', '1qaz2wsx',
    'iloveyou', 'admin', 'administrator', 'root', 'welcome', 'welcome1', 'letmein',
    'monkey', 'dragon', 'sunshine', 'princess', 'football', 'baseball', 'basketball',
    'starwars', 'superman', 'batman', 'pokemon', 'minecraft', 'shadow', 'master',
    'trustno1', 'hello', 'helloworld', 'freedom', 'whatever', 'computer', 'internet',
    'samsung', 'google', 'facebook', 'linkedin', 'twitter', 'instagram', 'youtube',
    'michael', 'jennifer', 'jordan', 'harley', 'ranger', 'hunter', 'buster', 'matrix',
    'thomas', 'robert', 'daniel', 'charlie', 'summer', 'winter', 'chocolate', 'cookie',
    'flower', 'sunflower', 'butterfly', 'purple', 'orange', 'silver', 'golden',
    'secret', 'security', 'letmein1', 'login', 'abc123', 'abcd1234', 'a1b2c3',
    '1111', '1234', '12345', '654321', '112233', '696969', 'batman', 'access',
    'mustang', 'nintendo', 'arsenal', 'chelsea', 'liverpool', 'barcelona',
    'tr0ub4dor', 'correcthorsebatterystaple', 'keyboard', 'test', 'testing',
    'guest', 'default', 'changeme', 'secret123', 'admin123', 'root123',
    'lovely', 'happy', 'smile', 'angel', 'money', 'killer', 'ninja', 'soccer',
    'fuckyou', 'ashley', 'nicole', 'hunter2', 'starwars1', 'superman1'
  ];

  /* Keyboard rows used to detect walks such as "qwerty" or "1qaz". */
  const KEYBOARD_ROWS = [
    'qwertyuiop', 'asdfghjkl', 'zxcvbnm',
    '1234567890', '!@#$%^&*()', '`1234567890-=', 'qwertzuiop', 'azertyuiop',
    '1qaz2wsx3edc', 'zaq12wsx'
  ];

  const LEET_MAP = { '@': 'a', '4': 'a', '$': 's', '5': 's', '0': 'o', '1': 'i', '!': 'i', '3': 'e', '7': 't', '8': 'b', '9': 'g', '+': 't', '(': 'c' };

  /* The five measured states plus the untouched state. */
  const STATES = [
    { code: 'S0', key: 'empty',      label: 'Empty',      value: 0 },
    { code: 'S1', key: 'very-weak',  label: 'Very weak',  value: 1 },
    { code: 'S2', key: 'weak',       label: 'Weak',       value: 2 },
    { code: 'S3', key: 'medium',     label: 'Medium',     value: 3 },
    { code: 'S4', key: 'strong',     label: 'Strong',     value: 4 },
    { code: 'S5', key: 'very-strong',label: 'Very strong',value: 5 }
  ];

  const SEGMENTS = gauge.querySelectorAll('.seg');

  /* ---------------------------------------------------------
     3. PATTERN DETECTION
     --------------------------------------------------------- */

  /** Fold leet-speak and case so "P@ssw0rd" matches "password". */
  function normalize(value) {
    let out = '';
    for (let i = 0; i < value.length; i++) {
      const ch = value.charAt(i).toLowerCase();
      out += LEET_MAP[ch] || ch;
    }
    return out;
  }

  /** Longest run of consecutive characters: "abcd" -> 4, "1234" -> 4. */
  function longestSequentialRun(value) {
    let best = 1;
    let run = 1;
    let direction = 0;
    for (let i = 1; i < value.length; i++) {
      const delta = value.charCodeAt(i) - value.charCodeAt(i - 1);
      if (delta === 1 || delta === -1) {
        if (delta === direction) {
          run += 1;
        } else {
          direction = delta;
          run = 2;
        }
        if (run > best) { best = run; }
      } else {
        direction = 0;
        run = 1;
      }
    }
    return value.length ? best : 0;
  }

  /** True when the whole password is one unit repeated: "abcabcabc". */
  function isRepeatedBlock(value) {
    for (let unit = 1; unit <= 4; unit++) {
      if (value.length % unit !== 0 || value.length / unit < 3) { continue; }
      const head = value.slice(0, unit);
      if (value === new Array(value.length / unit + 1).join(head)) { return true; }
    }
    return false;
  }

  /** Keyboard walk detection ("qwerty", "asdf", "1qaz"...) in both directions. */
  function hasKeyboardWalk(normalized) {
    for (let i = 0; i < KEYBOARD_ROWS.length; i++) {
      const row = KEYBOARD_ROWS[i];
      const reversed = row.split('').reverse().join('');
      for (let j = 0; j + 4 <= row.length; j++) {
        const slice = row.substr(j, 4);
        if (slice.length >= 4 && (normalized.indexOf(slice) !== -1 || normalized.indexOf(reversed.substr(j, 4)) !== -1)) {
          return true;
        }
      }
    }
    return false;
  }

  /** Common / obvious password detection on the normalised string.
   *  hit  = the password essentially IS a known weak password.
   *  word = a longer password that merely contains a common chunk. */
  function matchCommon(normalized) {
    const found = { hit: false, word: false };
    if (!normalized) { return found; }
    for (let i = 0; i < COMMON_PASSWORDS.length; i++) {
      const common = normalize(COMMON_PASSWORDS[i]);
      if (common.length < 4) { continue; }
      if (normalized.indexOf(common) === -1) { continue; }
      if (normalized.length <= common.length + 4) {
        found.hit = true;
        return found;
      }
      if (common.length >= 6) { found.word = true; }
    }
    return found;
  }

  /* ---------------------------------------------------------
     4. THE ANALYSIS
     --------------------------------------------------------- */

  function analyze(password) {
    const length = password.length;
    const normalized = normalize(password);

    const hasUpper   = /[A-Z]/.test(password);
    const hasLower   = /[a-z]/.test(password);
    const hasDigit   = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);

    let distinct = 0;
    const seen = Object.create(null);
    for (let i = 0; i < length; i++) {
      if (!seen[password.charAt(i)]) {
        seen[password.charAt(i)] = true;
        distinct += 1;
      }
    }
    const uniqueRatio = length ? distinct / length : 0;
    const classCount = (hasUpper ? 1 : 0) + (hasLower ? 1 : 0) + (hasDigit ? 1 : 0) + (hasSpecial ? 1 : 0);

    /* --- risks --- */
    const common         = matchCommon(normalized);
    const commonHit      = common.hit;
    const commonWord     = common.word;
    const repeatRun      = /(.)\1{2,}/.test(password) || isRepeatedBlock(password);
    const sequenceRun    = longestSequentialRun(password) >= 4;
    const keyboardWalk   = hasKeyboardWalk(normalized);
    const singleWord     = /^[A-Za-z]+$/.test(password) && length <= 14;

    const riskyPattern = commonHit || commonWord || repeatRun || sequenceRun || keyboardWalk;

    /* --- score: length carries most of the weight, on purpose --- */
    let score = 0;
    score += Math.min(length, 18) * 4;      /* length dominates: 0 - 72 */
    score += classCount * 6;                /* variety: 0 - 24          */
    score += Math.round(uniqueRatio * 12);  /* distinct characters: 0 - 12 */

    if (commonHit)    { score -= 55; }
    if (commonWord)   { score -= 22; }
    if (repeatRun)    { score -= 25; }
    if (sequenceRun)  { score -= 25; }
    if (keyboardWalk) { score -= 25; }
    if (classCount === 1) { score -= 8; }
    if (singleWord)       { score -= 14; }
    if (uniqueRatio < 0.5 && length < 14) { score -= 10; }

    /* Length gates: nothing short can ever read as "strong". */
    if (length > 0 && length < 6) { score = Math.min(score, 15); }
    else if (length < 8)          { score = Math.min(score, 22); }
    else if (length < 12)         { score = Math.min(score, 64); }
    else if (length < 16)         { score = Math.min(score, 84); }

    score = Math.max(0, Math.min(100, Math.round(score)));

    /* --- classification --- */
    let state = STATES[0];
    if (length > 0) {
      if (score < 25)      { state = STATES[1]; }
      else if (score < 45) { state = STATES[2]; }
      else if (score < 65) { state = STATES[3]; }
      else if (score < 85) { state = STATES[4]; }
      else                 { state = STATES[5]; }
    }

    /* --- rough entropy estimate (heuristic, clearly labelled) --- */
    const pool = (hasLower ? 26 : 0) + (hasUpper ? 26 : 0) + (hasDigit ? 10 : 0) + (hasSpecial ? 33 : 0);
    let bits = pool && length ? length * (Math.log(pool) / Math.LN2) : 0;
    if (commonHit) { bits *= 0.45; }
    else if (riskyPattern || singleWord) { bits *= 0.7; }
    bits = Math.round(bits);

    /* --- checklist --- */
    const checks = {
      len8:     length >= 8,
      len12:    length >= 12,
      upper:    hasUpper,
      lower:    hasLower,
      digit:    hasDigit,
      special:  hasSpecial,
      uncommon: length > 0 && !commonHit && !commonWord,
      nopattern: length > 0 && !riskyPattern
    };

    return {
      length: length,
      distinct: distinct,
      uniqueRatio: uniqueRatio,
      classCount: classCount,
      score: score,
      state: state,
      bits: bits,
      checks: checks,
      risks: {
        common: commonHit,
        word: commonWord,
        repeat: repeatRun,
        sequence: sequenceRun,
        keyboard: keyboardWalk,
        singleWord: singleWord
      }
    };
  }

  /* ---------------------------------------------------------
     5. SUGGESTIONS
     --------------------------------------------------------- */

  function buildSuggestions(password, result) {
    const items = [];

    if (result.length === 0) {
      return [{ text: 'Nothing typed yet — the analysis starts on your first keystroke.', tone: 'idle' }];
    }

    const risks = result.risks;

    if (risks.common) {
      items.push({ text: 'This looks like a common or well-known password. Choose something only you would think of.', tone: 'warn' });
    } else if (risks.word) {
      items.push({ text: 'It contains a common word — predictable chunks weaken the whole password.', tone: 'warn' });
    }
    if (risks.repeat) {
      items.push({ text: 'Avoid repeated characters and blocks like “aaaa” or “abcabc”.', tone: 'warn' });
    }
    if (risks.sequence) {
      items.push({ text: 'Avoid predictable sequences like “123456” or “zyx”.', tone: 'warn' });
    }
    if (risks.keyboard) {
      items.push({ text: 'Avoid keyboard patterns like “qwerty” or “1qaz”.', tone: 'warn' });
    }

    if (result.length < 8) {
      items.push({ text: 'Start with at least 8 characters — 12 or more is much better.', tone: 'warn' });
    } else if (result.length < 12) {
      items.push({ text: 'Try using at least 12 characters. Length does most of the work.', tone: 'warn' });
    }

    const missing = [];
    if (!result.checks.upper)   { missing.push('uppercase letters'); }
    if (!result.checks.lower)   { missing.push('lowercase letters'); }
    if (!result.checks.digit)   { missing.push('numbers'); }
    if (!result.checks.special) { missing.push('special characters such as ! ? # or -'); }
    if (missing.length === 1) {
      items.push({ text: 'Add some ' + missing[0] + ' for more variety.', tone: 'warn' });
    } else if (missing.length > 1) {
      items.push({ text: 'Mix in ' + missing.slice(0, -1).join(', ') + ' and ' + missing[missing.length - 1] + '.', tone: 'warn' });
    }

    if (risks.singleWord && result.length >= 8) {
      items.push({ text: 'Consider using a unique passphrase of three or four unrelated words.', tone: 'warn' });
    }
    if (result.uniqueRatio < 0.5 && result.length >= 8) {
      items.push({ text: 'Use more distinct characters instead of repeating a small set.', tone: 'warn' });
    }

    if (items.length === 0) {
      items.push({ text: 'Your password meets the main checks, but length and unpredictability still matter.', tone: 'good' });
    }
    if (result.state.value >= 4) {
      items.push({ text: 'Good result. Still: never reuse this password on another account.', tone: 'good' });
    }
    if (result.length >= 12 && result.state.value < 3) {
      items.push({ text: 'Length is fine — now work on unpredictability and character variety.', tone: 'warn' });
    }

    return items;
  }

  /* ---------------------------------------------------------
     6. RENDERING (text nodes only — never innerHTML)
     --------------------------------------------------------- */

  let lastStateKey = '';

  function render(result) {
    /* --- gauge --- */
    const state = result.state;
    gaugeBlock.style.setProperty('--state-color', 'var(--s-' + state.value + ')');

    for (let i = 0; i < SEGMENTS.length; i++) {
      SEGMENTS[i].classList.toggle('is-on', i < state.value);
    }

    needle.style.left = (result.length === 0 ? 0 : Math.max(2, result.score)) + '%';

    if (strengthText) { strengthText.textContent = state.label; }
    stateCode.textContent = state.code;

    gauge.setAttribute('aria-valuenow', String(state.value));
    gauge.setAttribute('aria-valuetext',
      state.label + ' — score ' + result.score + ' out of 100');

    /* Announce only when the state actually changes. */
    if (state.key !== lastStateKey) {
      lastStateKey = state.key;
      liveRegion.textContent = result.length === 0
        ? 'Password strength: empty.'
        : 'Password strength: ' + state.label + '. Score ' + result.score + ' out of 100.';
    }

    /* --- readouts --- */
    lenValue.textContent = String(result.length);
    metricLen.textContent = String(result.length);
    metricUnique.textContent = String(result.distinct);
    metricClass.textContent = result.classCount + '/4';
    metricBits.textContent = result.length ? '~' + result.bits : '0';

    /* --- checklist --- */
    Object.keys(checkRows).forEach(function (key) {
      const row = checkRows[key];
      const met = result.checks[key];
      const idle = result.length === 0;
      const status = row.querySelector('.check-state');
      row.classList.toggle('is-met', met);
      row.classList.toggle('is-fail', !met && !idle);
      row.classList.toggle('is-idle', idle);
      status.textContent = idle ? 'Waiting' : (met ? 'Met' : 'Not met');
    });

    /* --- suggestions --- */
    const suggestions = buildSuggestions(input.value, result);
    while (suggestionList.firstChild) {
      suggestionList.removeChild(suggestionList.firstChild);
    }
    suggestions.forEach(function (item, index) {
      const li = document.createElement('li');
      li.textContent = item.text;
      if (item.tone === 'warn') { li.classList.add('is-warn'); }
      if (item.tone === 'good') { li.classList.add('is-good'); }
      if (item.tone === 'idle') { li.classList.add('advice-empty'); }
      li.style.animationDelay = (index * 45) + 'ms';
      suggestionList.appendChild(li);
    });
  }

  /* ---------------------------------------------------------
     7. FEEDBACK MESSAGES
     --------------------------------------------------------- */

  let messageTimer = null;

  function showMessage(text, isError) {
    if (!actionMsg) { return; }
    window.clearTimeout(messageTimer);
    actionMsg.textContent = text;
    actionMsg.classList.toggle('is-error', Boolean(isError));
    actionMsg.classList.add('is-visible');
    messageTimer = window.setTimeout(function () {
      actionMsg.classList.remove('is-visible');
    }, 1900);
  }

  function resetCopyButton() {
    if (!copyBtn) { return; }
    copyBtn.querySelector('.ico-copy').hidden = false;
    copyBtn.querySelector('.ico-check').hidden = true;
    copyBtn.setAttribute('aria-label', 'Copy the password to the clipboard');
  }

  /* ---------------------------------------------------------
     8. EVENT WIRING
     --------------------------------------------------------- */

  function update() {
    render(analyze(input.value));
    if (copyBtn) {
      copyBtn.disabled = input.value.length === 0;
      resetCopyButton();
    }
    if (clearBtn) {
      clearBtn.disabled = input.value.length === 0;
    }
  }

  input.addEventListener('input', update);
  input.addEventListener('change', update);

  /* --- show / hide --- */
  if (toggleBtn) {
    toggleBtn.addEventListener('click', function () {
      const showing = input.type === 'text';
      input.type = showing ? 'password' : 'text';
      toggleBtn.setAttribute('aria-pressed', showing ? 'false' : 'true');
      toggleBtn.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
      toggleBtn.querySelector('.ico-eye').hidden = !showing;
      toggleBtn.querySelector('.ico-eye-off').hidden = showing;
      input.focus();
    });
  }

  /* --- clear --- */
  if (clearBtn) {
    clearBtn.addEventListener('click', function () {
      input.value = '';
      update();
      resetCopyButton();
      input.focus();
      showMessage('Field cleared');
    });
  }

  /* --- copy (explicit click only) --- */
  function legacyCopy(text) {
    const helper = document.createElement('textarea');
    helper.value = text;
    helper.setAttribute('readonly', '');
    helper.setAttribute('aria-hidden', 'true');
    helper.style.position = 'fixed';
    helper.style.top = '-1000px';
    helper.style.opacity = '0';
    document.body.appendChild(helper);
    helper.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(helper);
    return ok;
  }

  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      const value = input.value;
      if (!value) {
        showMessage('Nothing to copy', true);
        return;
      }

      const finish = function () {
        copyBtn.querySelector('.ico-copy').hidden = true;
        copyBtn.querySelector('.ico-check').hidden = false;
        copyBtn.setAttribute('aria-label', 'Password copied');
        showMessage('Copied to clipboard');
        window.setTimeout(resetCopyButton, 1800);
      };

      const fail = function () {
        showMessage('Copy blocked — select the text and copy manually', true);
      };

      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function' && window.isSecureContext) {
        navigator.clipboard.writeText(value).then(finish).catch(function () {
          try {
            if (legacyCopy(value)) { finish(); } else { fail(); }
          } catch (err) { fail(); }
        });
      } else {
        try {
          if (legacyCopy(value)) { finish(); } else { fail(); }
        } catch (err) { fail(); }
      }
    });
  }

  /* --- verification vectors --- */
  Array.prototype.forEach.call(document.querySelectorAll('.run-btn'), function (btn) {
    btn.addEventListener('click', function () {
      input.value = btn.getAttribute('data-pw') || '';
      update();
      input.focus();
      const panel = document.querySelector('.instrument');
      if (panel && panel.scrollIntoView) {
        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      showMessage('Sample loaded — nothing is stored');
    });
  });

  /* --- first paint --- */
  update();
})();
