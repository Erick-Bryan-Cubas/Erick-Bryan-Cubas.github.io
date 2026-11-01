/* Shared helpers: DOM builder, storage, theme and the GitHub data loader. */
(function () {
  'use strict';

  /** Tiny hyperscript: h('a', { href, class }, 'text', childNode, [more]) */
  function h(tag, props, ...children) {
    const el = document.createElement(tag);
    for (const [key, value] of Object.entries(props || {})) {
      if (value == null || value === false) continue;
      if (key === 'class') el.className = value;
      else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2), value);
      else el.setAttribute(key, value === true ? '' : value);
    }
    for (const child of children.flat(Infinity)) {
      if (child == null || child === false) continue;
      el.append(child instanceof Node ? child : String(child));
    }
    return el;
  }

  const store = {
    get(key) {
      try { return JSON.parse(localStorage.getItem(key)); } catch (_) { return null; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) { /* private mode */ }
    },
  };

  const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── theme ────────────────────────────────────────────────────────────────
  const THEMES = ['dark', 'light'];
  const THEME_COLORS = { dark: '#0d1117', light: '#f6f8fa' };

  function getTheme() {
    return document.documentElement.dataset.theme || 'dark';
  }

  function setTheme(theme) {
    if (!THEMES.includes(theme)) return false;
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('theme', theme); } catch (_) { /* ignore */ }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = THEME_COLORS[theme];
    document.dispatchEvent(new CustomEvent('themechange', { detail: theme }));
    return true;
  }

  // ── GitHub ───────────────────────────────────────────────────────────────
  const CACHE_KEY = 'gh-repos-v1';
  const CACHE_TTL = 60 * 60 * 1000; // stay well under the 60 req/h anonymous limit
  let reposPromise = null;
  let reposSnapshot = null;

  const slim = (r) => ({
    name: r.name,
    description: r.description || '',
    url: r.html_url,
    homepage: r.homepage || '',
    language: r.language || '',
    stars: r.stargazers_count,
    forks: r.forks_count,
    fork: r.fork,
    archived: r.archived,
    topics: r.topics || [],
    pushed: r.pushed_at,
  });

  async function fetchAllRepos(user) {
    const repos = [];
    for (let page = 1; page <= 5; page++) {
      const res = await fetch(
        `https://api.github.com/users/${user}/repos?per_page=100&sort=pushed&page=${page}`,
        { headers: { Accept: 'application/vnd.github+json' } },
      );
      if (!res.ok) throw new Error(`GitHub API responded ${res.status}`);
      const batch = await res.json();
      repos.push(...batch.map(slim));
      if (batch.length < 100) break;
    }
    return repos;
  }

  /** Resolves to the user's public repos (cached for an hour in localStorage). */
  function loadRepos() {
    if (reposPromise) return reposPromise;
    const cached = store.get(CACHE_KEY);
    if (cached && Date.now() - cached.at < CACHE_TTL) {
      reposSnapshot = cached.repos;
      reposPromise = Promise.resolve(cached.repos);
      return reposPromise;
    }
    reposPromise = fetchAllRepos(window.SITE.github)
      .then((repos) => {
        store.set(CACHE_KEY, { at: Date.now(), repos });
        return repos;
      })
      .catch((err) => {
        if (cached) return cached.repos; // stale beats nothing
        throw err;
      })
      .then((repos) => (reposSnapshot = repos));
    return reposPromise;
  }

  /** Featured projects merged with live data when it is available. */
  function featuredProjects(repos = reposSnapshot) {
    const byName = new Map((repos || []).map((r) => [r.name.toLowerCase(), r]));
    return window.SITE.featured.map((f) => {
      const live = byName.get(f.name.toLowerCase());
      return {
        url: `https://github.com/${window.SITE.github}/${f.name}`,
        stars: 0, forks: 0, homepage: '', pushed: null,
        ...f,
        ...(live && {
          url: live.url, stars: live.stars, forks: live.forks, homepage: live.homepage,
          pushed: live.pushed, language: live.language || f.language,
          description: f.description || live.description,
        }),
        tags: f.tags || (live ? live.topics : []),
      };
    });
  }

  function timeAgo(iso) {
    if (!iso) return '';
    const s = (Date.now() - new Date(iso).getTime()) / 1000;
    const units = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]];
    for (const [unit, secs] of units) {
      const n = Math.floor(s / secs);
      if (n >= 1) return `${n} ${unit}${n > 1 ? 's' : ''} ago`;
    }
    return 'just now';
  }

  const LANG_COLORS = {
    Python: '#3572A5', TypeScript: '#3178c6', JavaScript: '#f1e05a', Go: '#00ADD8', Vue: '#41b883',
    C: '#555555', 'C++': '#f34b7d', Java: '#b07219', HTML: '#e34c26', CSS: '#563d7c', Shell: '#89e051',
    'Jupyter Notebook': '#DA5B0B', Rust: '#dea584', Dockerfile: '#384d54', PowerShell: '#012456',
  };

  const ICONS = {
    github: 'M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.7 5.4-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z',
    linkedin: 'M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z',
    mail: 'M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm.8 2v.3l8.2 5.4 8.2-5.4V7l-8.2 5.3L3.8 7Z',
    globe: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm6.9 6h-2.95a15.7 15.7 0 0 0-1.38-3.56A8.03 8.03 0 0 1 18.9 8ZM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96ZM4.26 14a8.2 8.2 0 0 1 0-4h3.38a16.5 16.5 0 0 0 0 4H4.26Zm.84 2h2.95c.32 1.25.78 2.45 1.38 3.56A7.99 7.99 0 0 1 5.1 16Zm2.95-8H5.1a7.99 7.99 0 0 1 4.33-3.56A15.7 15.7 0 0 0 8.05 8ZM12 19.96A14.1 14.1 0 0 1 10.09 16h3.82A14.1 14.1 0 0 1 12 19.96ZM14.34 14H9.66a14.7 14.7 0 0 1 0-4h4.68a14.7 14.7 0 0 1 0 4Zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95a8.03 8.03 0 0 1-4.33 3.56ZM16.36 14a16.5 16.5 0 0 0 0-4h3.38a8.2 8.2 0 0 1 0 4h-3.38Z',
    school: 'M12 3 1 9l11 6 9-4.91V17h2V9L12 3Zm-6.82 9.18v4L12 20l6.82-3.82v-4L12 16l-6.82-3.82Z',
    chart: 'M4 19h16v2H2V3h2v16Zm3-2V10h3v7H7Zm5 0V6h3v11h-3Zm5 0v-5h3v5h-3Z',
    cloud: 'M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.99 5.99 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96Z',
    database: 'M12 2C7.58 2 4 3.79 4 6v12c0 2.21 3.58 4 8 4s8-1.79 8-4V6c0-2.21-3.58-4-8-4Zm6 16c0 .5-2.13 2-6 2s-6-1.5-6-2v-2.23c1.61.78 3.72 1.23 6 1.23s4.39-.45 6-1.23V18Zm0-4.55c-1.3.95-3.58 1.55-6 1.55s-4.7-.6-6-1.55V10.9c1.47.75 3.61 1.1 6 1.1s4.53-.35 6-1.1v2.55ZM12 10c-3.87 0-6-1.5-6-2s2.13-2 6-2 6 1.5 6 2-2.13 2-6 2Z',
    code: 'm9.4 16.6-4.6-4.6 4.6-4.6L8 6l-6 6 6 6 1.4-1.4Zm5.2 0 4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4Z',
    chip: 'M9 9h6v6H9V9Zm12 2V9h-2V7a2 2 0 0 0-2-2h-2V3h-2v2h-2V3H9v2H7a2 2 0 0 0-2 2v2H3v2h2v2H3v2h2v2a2 2 0 0 0 2 2h2v2h2v-2h2v2h2v-2h2a2 2 0 0 0 2-2v-2h2v-2h-2v-2h2Zm-4 6H7V7h10v10Z',
    star: 'M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27Z',
    fork: 'M6 3a3 3 0 0 1 1 5.83V10a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V8.83a3 3 0 1 1 2 0V10a4 4 0 0 1-4 4h-2v1.17a3 3 0 1 1-2 0V14H9a4 4 0 0 1-4-4V8.83A3 3 0 0 1 6 3Z',
    external: 'M14 3h7v7h-2V6.41l-9.29 9.3-1.42-1.42L17.59 5H14V3ZM5 5h6v2H5v12h12v-6h2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z',
    sun: 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0-5 1 3h-2l1-3Zm0 20-1-3h2l-1 3ZM2 12l3-1v2l-3-1Zm20 0-3 1v-2l3 1ZM4.93 4.93l2.83 1.41-1.42 1.42-1.41-2.83Zm14.14 14.14-2.83-1.41 1.42-1.42 1.41 2.83Zm0-14.14-1.41 2.83-1.42-1.42 2.83-1.41ZM4.93 19.07l1.41-2.83 1.42 1.42-2.83 1.41Z',
    moon: 'M12.3 2a9.98 9.98 0 1 0 9.7 12.4A8 8 0 0 1 12.3 2Z',
  };

  function icon(name, size = 18) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    svg.setAttribute('fill', 'currentColor');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', ICONS[name] || '');
    svg.append(path);
    return svg;
  }

  window.Core = {
    h, icon, store, prefersReducedMotion,
    THEMES, getTheme, setTheme,
    loadRepos, featuredProjects, timeAgo, LANG_COLORS,
    get repos() { return reposSnapshot; },
  };
})();
