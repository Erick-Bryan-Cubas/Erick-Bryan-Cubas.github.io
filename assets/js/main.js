/* Page wiring: renders sections from SITE, theme toggle, nav, repo browser, terminal. */
(function () {
  'use strict';

  const { Core, SITE, Terminal, Commands } = window;
  const { h, icon } = Core;
  const $ = (id) => document.getElementById(id);
  const LEVELS = ['', 'familiar', 'comfortable', 'strong'];

  // ── reveal-on-scroll ───────────────────────────────────────────────────────
  const revealer = 'IntersectionObserver' in window && !Core.prefersReducedMotion()
    ? new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('is-visible');
          revealer.unobserve(e.target);
        }
      }
    }, { rootMargin: '0px 0px -8% 0px' })
    : null;

  function reveal(root = document) {
    root.querySelectorAll('.reveal:not(.is-visible)').forEach((el) => {
      if (revealer) revealer.observe(el);
      else el.classList.add('is-visible');
    });
  }

  // ── links ──────────────────────────────────────────────────────────────────
  function linkButton(l, cls) {
    const external = /^https?:/.test(l.url);
    return h('a', { class: cls, href: l.url, ...(external && { target: '_blank', rel: 'noopener' }) },
      icon(l.icon, 18), h('span', null, l.label));
  }

  function renderLinks() {
    const hero = $('hero-links');
    SITE.links.slice(0, 4).forEach((l) => hero.append(linkButton(l, 'btn btn-ghost')));
    const contact = $('contact-links');
    SITE.links.forEach((l) => contact.append(linkButton(l, l.key === 'email' ? 'btn btn-primary' : 'btn btn-ghost')));
  }

  // ── stack ──────────────────────────────────────────────────────────────────
  function renderStack() {
    const grid = $('stack-grid');
    SITE.stack.forEach((group, i) => {
      grid.append(h('article', { class: 'panel stack-panel reveal', style: `--delay:${i * 60}ms` },
        h('header', { class: 'panel-head' },
          h('span', { class: 'panel-icon' }, icon(group.icon, 18)),
          h('h3', null, group.name),
          h('code', { class: 'panel-key' }, group.key)),
        h('ul', { class: 'chips' }, group.items.map((item) =>
          h('li', { class: 'chip', title: `${item.name} · ${LEVELS[item.level]}` },
            h('span', { class: 'chip-logo' }, h('img', { src: item.logo, alt: '', width: 20, height: 20, loading: 'lazy', decoding: 'async' })),
            h('span', { class: 'chip-name' }, item.name),
            h('span', { class: 'level', role: 'img', 'aria-label': `${LEVELS[item.level]} (${item.level} of 3)` },
              [1, 2, 3].map((n) => h('i', { class: n <= item.level ? 'on' : '' }))))))));
    });
  }

  // ── certifications ─────────────────────────────────────────────────────────
  function renderCerts() {
    const grid = $('certs-grid');
    SITE.certifications.forEach((c, i) => {
      const earned = c.status === 'earned';
      const tag = c.url ? 'a' : 'div';
      grid.append(h(tag, {
        class: `panel cert reveal${earned ? '' : ' is-pending'}`,
        style: `--delay:${i * 60}ms`,
        ...(c.url && { href: c.url, target: '_blank', rel: 'noopener' }),
      },
      h('div', { class: 'cert-img' }, h('img', { src: c.image, alt: `${c.name} badge`, loading: 'lazy', decoding: 'async' })),
      h('div', { class: 'cert-body' },
        h('span', { class: `pill ${earned ? 'pill-ok' : 'pill-wip'}` }, earned ? 'Earned' : 'In progress'),
        h('h3', null, c.name),
        h('p', { class: 'muted' }, `${c.issuer} · ${c.code}`),
        c.url && h('span', { class: 'cert-verify' }, 'Verify ', icon('external', 13)))));
    });
  }

  // ── projects ───────────────────────────────────────────────────────────────
  function projectCard(p, featured) {
    const color = Core.LANG_COLORS[p.language];
    return h('article', { class: `panel project${featured ? ' is-featured' : ''}${p.fork ? ' is-fork' : ''}` },
      h('header', { class: 'project-head' },
        icon(p.fork ? 'fork' : 'code', 16),
        h('h3', null, h('a', { class: 'project-link', href: p.url, target: '_blank', rel: 'noopener' }, p.name)),
        p.homepage && h('a', { class: 'project-demo', href: p.homepage, target: '_blank', rel: 'noopener', title: 'Live site', 'aria-label': `${p.name} live site` }, icon('external', 15))),
      h('p', { class: 'project-desc' }, p.description || 'No description yet.'),
      featured && p.tags && p.tags.length > 0 && h('ul', { class: 'tags' }, p.tags.map((t) => h('li', null, t))),
      h('footer', { class: 'project-meta' },
        p.language && h('span', { class: 'lang' }, h('i', { class: 'lang-dot', style: color ? `background:${color}` : '' }), p.language),
        h('span', { class: 'meta', title: 'Stars' }, icon('star', 14), String(p.stars)),
        h('span', { class: 'meta', title: 'Forks' }, icon('fork', 14), String(p.forks)),
        p.pushed && h('span', { class: 'meta meta-date' }, `updated ${Core.timeAgo(p.pushed)}`)));
  }

  function renderFeatured(repos) {
    $('featured-grid').replaceChildren(...Core.featuredProjects(repos).map((p) => projectCard(p, true)));
  }

  const browser = { query: '', language: '', sort: 'pushed', forks: false, shown: 9, repos: [] };

  function setupRepoBrowser(repos) {
    const featured = new Set(SITE.featured.map((f) => f.name.toLowerCase()));
    browser.repos = repos.filter((r) => !SITE.hiddenRepos.includes(r.name) && !featured.has(r.name.toLowerCase()));

    const languages = [...new Set(browser.repos.map((r) => r.language).filter(Boolean))].sort();
    $('repo-lang').append(...languages.map((l) => h('option', { value: l }, l)));

    const update = (patch) => {
      Object.assign(browser, { shown: 9 }, patch);
      renderRepos();
    };
    $('repo-search').addEventListener('input', (e) => update({ query: e.target.value.trim().toLowerCase() }));
    $('repo-lang').addEventListener('change', (e) => update({ language: e.target.value }));
    $('repo-sort').addEventListener('change', (e) => update({ sort: e.target.value }));
    $('repo-forks').addEventListener('change', (e) => update({ forks: e.target.checked }));
    $('repo-more').addEventListener('click', () => {
      browser.shown += 9;
      renderRepos();
    });
    $('repo-controls').hidden = false;
    renderRepos();
  }

  function renderRepos() {
    const { query, language, sort, forks, shown } = browser;
    const sorters = {
      pushed: (a, b) => (b.pushed || '').localeCompare(a.pushed || ''),
      stars: (a, b) => b.stars - a.stars || (b.pushed || '').localeCompare(a.pushed || ''),
      name: (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
    };
    const list = browser.repos
      .filter((r) => (forks || !r.fork)
        && (!language || r.language === language)
        && (!query || `${r.name} ${r.description} ${r.topics.join(' ')}`.toLowerCase().includes(query)))
      .sort(sorters[sort]);

    const grid = $('repo-grid');
    grid.replaceChildren(...list.slice(0, shown).map((r) => projectCard(r, false)));
    if (!list.length) grid.append(h('p', { class: 'empty' }, 'No repositories match these filters.'));
    $('repo-status').textContent = list.length ? `Showing ${Math.min(shown, list.length)} of ${list.length} repositories` : '';
    $('repo-more').hidden = shown >= list.length;
  }

  function loadProjects() {
    renderFeatured([]);
    Core.loadRepos()
      .then((repos) => {
        renderFeatured(repos);
        setupRepoBrowser(repos);
      })
      .catch(() => {
        $('repo-grid').replaceChildren(h('p', { class: 'empty' },
          "Couldn't reach the GitHub API right now (rate limit?). ",
          h('a', { href: `https://github.com/${SITE.github}?tab=repositories`, target: '_blank', rel: 'noopener' }, 'Browse all repositories on GitHub →')));
      });
  }

  // ── chrome: theme, nav, progress ───────────────────────────────────────────
  function setupTheme() {
    const btn = $('theme-toggle');
    const sync = () => {
      const dark = Core.getTheme() === 'dark';
      btn.replaceChildren(icon(dark ? 'sun' : 'moon', 18));
      btn.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
      btn.title = btn.getAttribute('aria-label');
    };
    btn.addEventListener('click', () => Core.setTheme(Core.getTheme() === 'dark' ? 'light' : 'dark'));
    document.addEventListener('themechange', sync);
    sync();
  }

  function setupNav() {
    const links = [...document.querySelectorAll('.nav-links a')];
    const byId = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
    if ('IntersectionObserver' in window) {
      const spy = new IntersectionObserver((entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          links.forEach((a) => a.removeAttribute('aria-current'));
          const active = byId.get(e.target.id);
          if (active) active.setAttribute('aria-current', 'true');
        }
      }, { rootMargin: '-45% 0px -50% 0px' });
      document.querySelectorAll('main > section, main > header').forEach((s) => spy.observe(s));
    }

    const bar = $('scroll-progress');
    const topbar = document.querySelector('.topbar');
    let ticking = false;
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
      topbar.classList.toggle('is-scrolled', window.scrollY > 8);
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(onScroll);
      }
    }, { passive: true });
    onScroll();
  }

  function setupTerminal() {
    const term = new Terminal({
      root: $('terminal'),
      output: $('terminal-output'),
      form: $('terminal-form'),
      input: $('terminal-input'),
      scroller: $('terminal-body'),
      commands: Commands.commands,
      fallback: Commands.runSql,
    });
    $('terminal-form').prepend(term.prompt());
    term.playIntro(Commands.intro);
  }

  // ── boot ───────────────────────────────────────────────────────────────────
  setupTheme();
  setupNav();
  renderLinks();
  renderStack();
  renderCerts();
  loadProjects();
  setupTerminal();
  reveal();
  $('year').textContent = new Date().getFullYear();
})();
