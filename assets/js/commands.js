/* Terminal commands, the SQL easter egg and the intro script. */
(function () {
  'use strict';

  const { Core, MiniSQL, SITE } = window;
  const { h } = Core;
  const LEVELS = ['', 'familiar', 'comfortable', 'strong'];
  const SECTIONS = ['stack', 'certs', 'projects', 'contact'];

  const earned = () => SITE.certifications.filter((c) => c.status === 'earned');
  const pending = () => SITE.certifications.filter((c) => c.status !== 'earned');
  const visibleRepos = () => (Core.repos || []).filter((r) => !SITE.hiddenRepos.includes(r.name));

  function scrollToSection(id) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: Core.prefersReducedMotion() ? 'auto' : 'smooth' });
  }

  function openUrl(url) {
    if (url.startsWith('mailto:')) window.location.href = url;
    else window.open(url, '_blank', 'noopener');
  }

  /** Synchronous lookup so window.open still counts as a user gesture. */
  function findTarget(name) {
    const key = name.toLowerCase();
    const link = SITE.links.find((l) => l.key === key || l.label.toLowerCase() === key);
    if (link) return { label: link.label, url: link.url };
    const repo = visibleRepos().find((r) => r.name.toLowerCase() === key)
      || Core.featuredProjects().find((p) => p.name.toLowerCase() === key);
    if (repo) return { label: repo.name, url: repo.url };
    return null;
  }

  // ── SQL tables ─────────────────────────────────────────────────────────────
  function tables() {
    const repos = visibleRepos();
    const projectRows = repos.length
      ? repos.map((r) => ({ name: r.name, language: r.language || null, stars: r.stars, forks: r.forks, fork: r.fork, updated: r.pushed ? r.pushed.slice(0, 10) : null }))
      : Core.featuredProjects().map((p) => ({ name: p.name, language: p.language, stars: p.stars, forks: p.forks, fork: false, updated: null }));
    return {
      skills: {
        columns: [{ name: 'name', type: 'text' }, { name: 'category', type: 'text' }, { name: 'level', type: 'integer' }],
        rows: SITE.stack.flatMap((c) => c.items.map((i) => ({ name: i.name, category: c.key, level: i.level }))),
      },
      certs: {
        columns: [{ name: 'code', type: 'text' }, { name: 'name', type: 'text' }, { name: 'issuer', type: 'text' }, { name: 'status', type: 'text' }],
        rows: SITE.certifications.map(({ code, name, issuer, status }) => ({ code, name, issuer, status })),
      },
      projects: {
        columns: [
          { name: 'name', type: 'text' }, { name: 'language', type: 'text' }, { name: 'stars', type: 'integer' },
          { name: 'forks', type: 'integer' }, { name: 'fork', type: 'boolean' }, { name: 'updated', type: 'date' },
        ],
        rows: projectRows,
      },
    };
  }

  const SQL_EXAMPLES = [
    'SELECT * FROM skills WHERE level = 3;',
    'SELECT category, COUNT(*) AS n, AVG(level) FROM skills GROUP BY category ORDER BY n DESC;',
    'SELECT name, stars, language FROM projects WHERE fork = false ORDER BY stars DESC LIMIT 5;',
    "SELECT code, name FROM certs WHERE status = 'earned';",
  ];

  function sqlHelp(t) {
    t.print(t.span('MiniSQL', 't-accent'), t.span(' — query this portfolio. Read-only, Postgres-flavoured.', 't-muted'));
    t.print('Tables: ', t.cmd('skills', '\\d skills'), ' · ', t.cmd('certs', '\\d certs'), ' · ', t.cmd('projects', '\\d projects'),
      t.span('   (', 't-muted'), t.cmd('\\dt'), t.span(' lists them, \\d <table> describes one)', 't-muted'));
    t.print(t.span('Try one (click to run):', 't-muted'));
    for (const q of SQL_EXAMPLES) t.print('  ', t.cmd(q));
  }

  async function runSql(t, raw) {
    const src = raw.trim();
    if (/^\\(\?|h(elp)?)$/i.test(src)) return sqlHelp(t), true;
    if (/^\\q$/i.test(src)) return t.print(t.span("There's no quitting data. Try ", 't-muted'), t.cmd('help')), true;
    if (/\bprojects\b/i.test(src)) await Core.loadRepos().catch(() => null);
    const db = tables();

    if (/^\\dt\+?$/i.test(src)) {
      const rows = Object.keys(db).sort().map((n) => ['public', n, 'table', SITE.user]);
      t.pre(['         List of relations', ...MiniSQL.format({ columns: ['Schema', 'Name', 'Type', 'Owner'], rows })]);
      return true;
    }
    const describe = /^\\d\+?(?:\s+(\w+))?\s*;?$/i.exec(src);
    if (describe) {
      if (!describe[1]) return runSql(t, '\\dt');
      const name = describe[1].toLowerCase();
      const table = db[name];
      if (!table) return t.error(`Did not find any relation named "${describe[1]}".`), true;
      const lines = MiniSQL.format({ columns: ['Column', 'Type'], rows: table.columns.map((c) => [c.name, c.type]) }, { footer: false });
      t.pre([`   Table "public.${name}"`, ...lines]);
      t.print(t.span(`${table.rows.length} rows · `, 't-muted'), t.cmd(`SELECT * FROM ${name} LIMIT 5;`));
      return true;
    }
    if (!/^select\b/i.test(src)) return false;

    try {
      const result = MiniSQL.execute(src, db);
      t.pre(MiniSQL.format(result), 't-table');
    } catch (err) {
      if (!(err instanceof MiniSQL.SQLError)) throw err;
      t.error(`ERROR:  ${err.message}`);
      if (/does not exist/.test(err.message)) t.print(t.span('HINT:  tables are skills, certs, projects — try ', 't-muted'), t.cmd('\\dt'));
    }
    return true;
  }

  // ── neofetch ───────────────────────────────────────────────────────────────
  const ART = [
    '      _.-------._      ',
    '   .-\'           \'-.   ',
    '  |\'-._         _.-\'|  ',
    '  |    \'-------\'    |  ',
    '  |\'-._         _.-\'|  ',
    '  |    \'-------\'    |  ',
    '  |\'-._         _.-\'|  ',
    '  |    \'-------\'    |  ',
    '   \'-._         _.-\'   ',
    '       \'-------\'       ',
  ];

  async function neofetch(t) {
    await Core.loadRepos().catch(() => null);
    const repos = visibleRepos();
    const top = SITE.stack.flatMap((c) => c.items).filter((i) => i.level === 3).map((i) => i.name);
    const rows = [
      ['Name', SITE.name],
      ['Role', SITE.role],
      ['Education', SITE.education],
      ['Location', SITE.location],
      ['Shell', 'psql + python'],
      ['Top skills', top.join(', ')],
      ['Certs', `${earned().length} earned · ${pending().length} in progress`],
      ['Repos', repos.length ? `${repos.filter((r) => !r.fork).length} own · ${repos.filter((r) => r.fork).length} forks` : 'github.com/' + SITE.github],
      ['Theme', Core.getTheme()],
      ['Uptime', t.uptime],
    ];
    const title = `${SITE.user}@${SITE.host}`;
    const info = h('div', { class: 'nf-info' },
      h('div', null, t.span(SITE.user, 't-user'), '@', t.span(SITE.host, 't-host')),
      h('div', { class: 't-muted' }, '-'.repeat(title.length)),
      rows.map(([k, v]) => h('div', null, t.span(k, 'nf-key'), ': ', v)),
      h('div', { class: 'nf-colors', 'aria-hidden': 'true' },
        ['err', 'warn', 'accent', 'host', 'path', 'cyan', 'muted', 'fg'].map((c) => h('span', { class: `nf-swatch nf-${c}` }))));
    t.print(h('div', { class: 'neofetch' }, h('pre', { class: 't-pre nf-art', 'aria-hidden': 'true' }, ART.join('\n')), info));
  }

  // ── commands ───────────────────────────────────────────────────────────────
  const FILES = {
    'about.txt': 'about',
    'skills.txt': 'skills',
    'certs.txt': 'certs',
    'contact.txt': 'contact',
    'status.txt': null,
    'projects/': null,
  };

  const commands = {
    help: {
      desc: 'show this list',
      run(t) {
        const groups = [
          ['me', ['about', 'whoami', 'skills', 'certs', 'projects', 'contact']],
          ['data', ['sql', '\\dt']],
          ['shell', ['neofetch', 'open', 'cd', 'ls', 'theme', 'history', 'clear']],
        ];
        for (const [title, names] of groups) {
          t.print(t.span(`# ${title}`, 't-muted'));
          const grid = h('div', { class: 't-help' });
          for (const name of names) {
            const c = commands[name] || { desc: 'list SQL tables' };
            grid.append(t.cmd(c.usage || name, name), h('span', { class: 't-muted' }, c.desc));
          }
          t.print(grid);
        }
        t.print(t.span('Tip: ↑/↓ browse history · Tab completes · Ctrl+L clears · any SELECT runs as SQL', 't-muted'));
      },
    },

    whoami: {
      desc: 'one-line bio',
      run(t) {
        t.print(t.span(SITE.name, 't-accent'), t.span(' — ', 't-muted'), SITE.role, t.span(' · ', 't-muted'), t.span(SITE.education, 't-path'));
      },
    },

    about: {
      desc: 'a few words about me',
      run(t) {
        SITE.about.forEach((p, i) => { if (i) t.blank(); t.print(p); });
      },
    },

    skills: {
      usage: 'skills [area]',
      desc: 'my stack — try skills cloud',
      complete: () => SITE.stack.map((c) => c.key),
      run(t, [area]) {
        const groups = area ? SITE.stack.filter((c) => c.key === area.toLowerCase() || c.name.toLowerCase().startsWith(area.toLowerCase())) : SITE.stack;
        if (!groups.length) {
          t.error(`skills: unknown area "${area}"`);
          t.print(t.span('areas: ', 't-muted'), SITE.stack.map((c, i) => [i ? ' · ' : '', t.cmd(c.key, `skills ${c.key}`)]));
          return;
        }
        for (const g of groups) {
          t.print(t.span(g.name, 't-host'), t.span(`  (${g.key})`, 't-muted'));
          for (const item of g.items) {
            t.print(h('span', { class: 't-skill' }, item.name),
              h('span', { class: 't-bar', 'aria-label': LEVELS[item.level] }, t.span('■'.repeat(item.level), 't-accent'), t.span('■'.repeat(3 - item.level), 't-dim')),
              t.span(` ${LEVELS[item.level]}`, 't-muted'));
          }
        }
        if (!area) t.print(t.span('or as a query: ', 't-muted'), t.cmd('SELECT name, level FROM skills ORDER BY level DESC LIMIT 5;'));
      },
    },

    certs: {
      desc: 'certifications',
      run(t) {
        for (const c of SITE.certifications) {
          const done = c.status === 'earned';
          t.print(t.span(done ? '✔ ' : '◌ ', done ? 't-accent' : 't-warn'), c.name, t.span(` (${c.code}) — ${c.issuer}`, 't-muted'),
            done && c.url ? [' ', t.link('verify ↗', c.url)] : t.span(done ? '' : ' · in progress', 't-warn'));
        }
      },
    },

    projects: {
      desc: 'featured repositories',
      async run(t) {
        await Core.loadRepos().catch(() => null);
        for (const p of Core.featuredProjects()) {
          t.print(t.link(p.name, p.url), t.span(`  ★ ${p.stars}`, 't-warn'), p.language ? t.span(`  ${p.language}`, 't-muted') : '');
          t.print(h('span', { class: 't-indent t-muted' }, p.description));
        }
        t.print(t.span('open one with ', 't-muted'), t.cmd(`open ${SITE.featured[0].name}`), t.span(' · see all with ', 't-muted'), t.cmd('cd projects'));
      },
    },

    contact: {
      desc: 'ways to reach me',
      run(t) {
        for (const l of SITE.links) {
          t.print(h('span', { class: 't-skill' }, l.label), t.link(l.text || l.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''), l.url));
        }
      },
    },

    open: {
      usage: 'open <name>',
      desc: 'open a project or link',
      complete: () => [...SITE.links.map((l) => l.key), ...(visibleRepos().length ? visibleRepos() : Core.featuredProjects()).map((r) => r.name)],
      run(t, [name]) {
        if (!name) {
          t.print(t.span('usage: open <name>  ·  e.g. ', 't-muted'), SITE.links.map((l, i) => [i ? ' ' : '', t.cmd(l.key, `open ${l.key}`)]));
          return;
        }
        const target = findTarget(name);
        if (!target) return t.error(`open: nothing called "${name}" (Tab lists options)`);
        t.print(t.span('opening ', 't-muted'), t.link(target.url, target.url), t.span(' …', 't-muted'));
        openUrl(target.url);
      },
    },

    neofetch: { desc: 'system info, data edition', run: neofetch },

    sql: { desc: 'query me with SQL', run: (t) => sqlHelp(t) },
    psql: {
      hidden: true,
      run(t, args, raw) {
        const inline = /-c\s+["'](.+)["']\s*$/.exec(raw);
        if (inline) return runSql(t, inline[1]);
        t.print('psql (16.4, MiniSQL edition)');
        t.print(t.span('Type ', 't-muted'), t.cmd('\\?'), t.span(' for help. Queries run straight from this prompt.', 't-muted'));
      },
    },

    cd: {
      usage: 'cd <section>',
      desc: 'scroll the page to a section',
      complete: () => [...SECTIONS, '~'],
      run(t, [dir = '~']) {
        const target = dir.replace(/\/$/, '').toLowerCase();
        if (target === '~' || target === '/') return scrollToSection('top');
        if (target === '..') return t.print(t.span("you're already at the top of my portfolio", 't-muted'));
        if (!SECTIONS.includes(target)) return t.error(`cd: no such file or directory: ${dir}`);
        t.print(t.span(`→ /${target}`, 't-muted'));
        scrollToSection(target);
      },
    },

    ls: {
      desc: 'list files',
      complete: () => ['projects/'],
      run(t, args) {
        const dir = args.filter((a) => !a.startsWith('-'))[0];
        if (dir && dir.replace(/\/$/, '') === 'projects') {
          t.print(Core.featuredProjects().map((p, i) => [i ? '  ' : '', t.cmd(p.name, `open ${p.name}`)]));
          return;
        }
        if (dir) return t.error(`ls: cannot access '${dir}': No such file or directory`);
        t.print(Object.keys(FILES).map((f, i) => [i ? '  ' : '', f.endsWith('/') ? t.cmd(f, `ls ${f}`) : t.cmd(f, `cat ${f}`)]));
      },
    },

    cat: {
      hidden: true,
      complete: () => Object.keys(FILES).filter((f) => !f.endsWith('/')),
      run(t, [file]) {
        if (!file) return t.error('cat: missing file operand — try ls');
        if (file === 'status.txt') {
          const phrase = SITE.rotating[Math.floor(Math.random() * SITE.rotating.length)];
          return t.print(t.span('→ ', 't-muted'), t.span(phrase, 't-warn'));
        }
        if (file.replace(/\/$/, '') === 'projects') return t.error('cat: projects/: Is a directory');
        if (!FILES[file]) return t.error(`cat: ${file}: No such file or directory`);
        return commands[FILES[file]].run(t, []);
      },
    },

    theme: {
      usage: 'theme [name]',
      desc: 'switch color theme',
      complete: () => Core.THEMES,
      run(t, [name]) {
        if (!name) {
          t.print(t.span('current: ', 't-muted'), Core.getTheme(), t.span('  ·  available: ', 't-muted'), Core.THEMES.map((n, i) => [i ? ' ' : '', t.cmd(n, `theme ${n}`)]));
          return;
        }
        const next = name === 'toggle' ? (Core.getTheme() === 'dark' ? 'light' : 'dark') : name.toLowerCase();
        if (!Core.setTheme(next)) return t.error(`theme: unknown theme "${name}" (${Core.THEMES.join(', ')})`);
        t.print(t.span(`theme set to ${next}`, 't-muted'));
      },
    },

    history: {
      desc: 'previous commands',
      run(t) {
        if (!t.history.length) return t.print(t.span('no history yet', 't-muted'));
        t.history.forEach((c, i) => t.print(t.span(String(i + 1).padStart(4) + '  ', 't-muted'), t.cmd(c)));
      },
    },

    clear: { desc: 'clear the screen', run: (t) => t.clear() },

    echo: { hidden: true, run: (t, args, raw) => t.print(raw.replace(/^echo\s?/i, '')) },
    date: { hidden: true, run: (t) => t.print(new Date().toString()) },
    pwd: { hidden: true, run: (t) => t.print(`/home/${SITE.user}`) },
    exit: {
      hidden: true,
      run(t) {
        t.print(t.span("logout… just kidding. Here's the rest of the page ↓", 't-muted'));
        scrollToSection('stack');
      },
    },
    sudo: {
      hidden: true,
      run(t, args) {
        if (args.join(' ').toLowerCase().startsWith('hire')) return commands.hire.run(t);
        t.print(t.span(`${SITE.user} is not in the sudoers file. This incident will be reported.`, 't-err'));
      },
    },
    rm: { hidden: true, run: (t) => t.error('rm: permission denied — this portfolio is a read-only replica') },
    vim: { hidden: true, run: (t) => t.print(t.span("No editors here. (You'd never get out anyway.) Try ", 't-muted'), t.cmd('sql')) },
    hire: {
      hidden: true,
      run(t) {
        t.print(t.span('Excellent decision. Let\'s talk:', 't-accent'));
        commands.contact.run(t);
      },
    },
  };

  // ── intro ──────────────────────────────────────────────────────────────────
  async function intro(t) {
    const now = new Date();
    const stamp = now.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
    t.print(t.span(`Last login: ${stamp} on ttys001`, 't-muted'));
    await t.pause(500);
    await t.typeCommand('whoami');
    await t.run('whoami');
    await t.pause(400);
    await t.typeCommand('cat status.txt');
    const status = t.span('', 't-warn');
    t.print(t.span('→ ', 't-muted'), status);
    t.rotate(status, SITE.rotating);
    await t.pause(300);
    t.print(t.span('Type ', 't-muted'), t.cmd('help'), t.span(' to look around — or just query me: ', 't-muted'), t.cmd('SELECT * FROM skills;'));
  }

  window.Commands = { commands, runSql, intro };
})();
