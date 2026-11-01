/* Interactive terminal: rendering, input, history, completion and the typed intro. */
(function () {
  'use strict';

  const { h, prefersReducedMotion } = window.Core;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  class Terminal {
    /**
     * @param {object} opts
     * @param {HTMLElement} opts.root     element that focuses the input when clicked
     * @param {HTMLElement} opts.output   scrollback container
     * @param {HTMLFormElement} opts.form
     * @param {HTMLInputElement} opts.input
     * @param {HTMLElement} opts.scroller element that scrolls
     * @param {object} opts.commands      name -> { run(term, args, raw), complete?(args), hidden? }
     * @param {Function} opts.fallback    (term, raw) => handled? for input no command matched
     */
    constructor(opts) {
      Object.assign(this, opts);
      this.history = [];
      this.historyIndex = 0;
      this.busy = false;
      this.skipIntro = false;
      this.startedAt = Date.now();

      this.form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.submit(this.input.value);
      });
      this.input.addEventListener('keydown', (e) => this.onKey(e));
      this.root.addEventListener('click', () => {
        if (!window.getSelection().toString()) this.input.focus({ preventScroll: true });
      });
    }

    // ── output helpers ─────────────────────────────────────────────────────
    prompt() {
      const { user, host } = window.SITE;
      return h('span', { class: 'prompt', 'aria-hidden': 'true' },
        h('span', { class: 't-user' }, user), '@',
        h('span', { class: 't-host' }, host), ':',
        h('span', { class: 't-path' }, '~'), '$ ');
    }

    /** Append one line. Accepts strings, nodes or arrays of them. */
    print(...content) {
      const line = h('div', { class: 't-line' }, ...content);
      this.output.append(line);
      this.scrollToBottom();
      return line;
    }

    /** Preformatted block (tables, ASCII art). */
    pre(text, cls = '') {
      return this.print(h('pre', { class: `t-pre ${cls}`.trim() }, Array.isArray(text) ? text.join('\n') : text));
    }

    blank() {
      return this.print(' ');
    }

    span(text, cls) {
      return h('span', { class: cls }, text);
    }

    link(text, url) {
      const external = /^https?:/.test(url);
      return h('a', { href: url, class: 't-link', ...(external && { target: '_blank', rel: 'noopener' }) }, text);
    }

    /** A command name visitors can click to run. */
    cmd(text, run = text) {
      return h('button', { type: 'button', class: 't-cmd', onclick: (e) => { e.stopPropagation(); this.submit(run); } }, text);
    }

    error(text) {
      return this.print(this.span(text, 't-err'));
    }

    clear() {
      this.output.replaceChildren();
    }

    scrollToBottom() {
      this.scroller.scrollTop = this.scroller.scrollHeight;
    }

    // ── execution ──────────────────────────────────────────────────────────
    async submit(raw) {
      this.input.value = '';
      if (this.introPromise) {
        this.skipIntro = true;
        await this.introPromise;
      }
      if (this.busy) return;
      const value = raw.trim();
      this.print(this.prompt(), this.span(raw, 't-typed'));
      if (!value) return;
      if (this.history[this.history.length - 1] !== value) this.history.push(value);
      this.historyIndex = this.history.length;
      await this.run(value);
    }

    async run(value) {
      const [name, ...args] = value.split(/\s+/);
      const command = this.commands[name.toLowerCase()];
      this.busy = true;
      this.form.classList.add('is-busy');
      try {
        if (command) await command.run(this, args, value);
        else if (!(this.fallback && (await this.fallback(this, value)))) {
          this.print(this.span('zsh: command not found: ', 't-err'), name, this.span(' — try ', 't-muted'), this.cmd('help'));
        }
      } catch (err) {
        this.error(String(err && err.message ? err.message : err));
      } finally {
        this.busy = false;
        this.form.classList.remove('is-busy');
        this.scrollToBottom();
      }
    }

    onKey(e) {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        if (!this.history.length) return;
        e.preventDefault();
        this.historyIndex = Math.max(0, Math.min(this.history.length, this.historyIndex + (e.key === 'ArrowUp' ? -1 : 1)));
        this.input.value = this.history[this.historyIndex] || '';
        requestAnimationFrame(() => this.input.setSelectionRange(this.input.value.length, this.input.value.length));
      } else if (e.key === 'Tab') {
        e.preventDefault();
        this.complete();
      } else if (e.key === 'l' && e.ctrlKey) {
        e.preventDefault();
        this.clear();
      } else if (e.key === 'c' && e.ctrlKey && !window.getSelection().toString()) {
        e.preventDefault();
        this.print(this.prompt(), this.span(this.input.value + '^C', 't-typed'));
        this.input.value = '';
      }
    }

    complete() {
      const value = this.input.value.replace(/^\s+/, '');
      const parts = value.split(/\s+/);
      let candidates, prefix;
      if (parts.length <= 1) {
        prefix = parts[0] || '';
        candidates = Object.keys(this.commands).filter((c) => !this.commands[c].hidden);
      } else {
        const command = this.commands[parts[0].toLowerCase()];
        if (!command || !command.complete) return;
        prefix = parts[parts.length - 1];
        candidates = command.complete(parts.slice(1));
      }
      const matches = candidates.filter((c) => c.toLowerCase().startsWith(prefix.toLowerCase()));
      if (matches.length === 1) {
        parts[parts.length - 1] = matches[0];
        this.input.value = parts.join(' ') + ' ';
      } else if (matches.length > 1) {
        const common = matches.reduce((a, b) => {
          let i = 0;
          while (i < a.length && a[i].toLowerCase() === (b[i] || '').toLowerCase()) i++;
          return a.slice(0, i);
        });
        if (common.length > prefix.length) {
          parts[parts.length - 1] = common;
          this.input.value = parts.join(' ');
        } else {
          this.print(this.prompt(), this.span(this.input.value, 't-typed'));
          this.print(this.span(matches.join('   '), 't-muted'));
        }
      }
    }

    // ── intro ──────────────────────────────────────────────────────────────
    /** Runs `fn(term)` as the intro; typing or submitting fast-forwards it. */
    playIntro(fn) {
      this.skipIntro = prefersReducedMotion();
      this.input.addEventListener('input', () => { this.skipIntro = true; }, { once: true });
      this.introPromise = (async () => {
        try { await fn(this); } finally { this.introPromise = null; }
      })();
      return this.introPromise;
    }

    /** Sleep that is skipped once the intro is fast-forwarded. */
    async pause(ms) {
      if (!this.skipIntro) await sleep(ms);
    }

    /** Types `text` into a fresh prompt line, char by char (instant when skipped). */
    async typeCommand(text) {
      const typed = this.span('', 't-typed');
      const caret = this.span('', 't-caret');
      const line = this.print(this.prompt(), typed, caret);
      for (const ch of text) {
        if (this.skipIntro) break;
        typed.textContent += ch;
        await sleep(45 + Math.random() * 70);
      }
      typed.textContent = text;
      caret.remove();
      if (!this.skipIntro) await sleep(280);
      return line;
    }

    /** Loops through phrases inside `el`, typing and erasing them. */
    rotate(el, phrases) {
      if (!phrases.length) return;
      if (prefersReducedMotion()) {
        el.textContent = phrases[0];
        return;
      }
      let i = 0;
      const loop = async () => {
        for (;;) {
          const word = phrases[i++ % phrases.length];
          for (let n = 1; n <= word.length; n++) {
            el.textContent = word.slice(0, n);
            await sleep(55 + Math.random() * 50);
          }
          await sleep(2200);
          for (let n = word.length - 1; n >= 0; n--) {
            el.textContent = word.slice(0, n);
            await sleep(28);
          }
          await sleep(350);
        }
      };
      loop();
    }

    get uptime() {
      const s = Math.floor((Date.now() - this.startedAt) / 1000);
      const m = Math.floor(s / 60);
      return m ? `${m} min${m > 1 ? 's' : ''}, ${s % 60} secs` : `${s} secs`;
    }
  }

  window.Terminal = Terminal;
})();
