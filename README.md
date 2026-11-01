# erick-bryan-cubas.github.io

Personal portfolio: static HTML/CSS/vanilla JS, no build step, served by GitHub Pages.

The hero is an interactive terminal (`help`, `neofetch`, `skills`, `cd projects`…) that also runs
read-only SQL over the portfolio itself:

```sql
SELECT category, COUNT(*) AS n, AVG(level) FROM skills GROUP BY category ORDER BY n DESC;
SELECT name, stars FROM projects WHERE fork = false ORDER BY stars DESC LIMIT 5;
```

## Editing content

Everything personal is in [`assets/js/config.js`](assets/js/config.js): bio, links, stack and levels,
certifications, featured projects and the rotating status phrases. Sections, terminal commands and SQL
tables all read from it. Repositories are fetched live from the GitHub API and cached for an hour in
`localStorage`.

| File | Role |
| --- | --- |
| `assets/js/config.js` | content |
| `assets/js/core.js` | DOM helper, theme, GitHub loader |
| `assets/js/sql.js` | MiniSQL engine (SELECT / WHERE / GROUP BY / ORDER BY / LIMIT) |
| `assets/js/terminal.js` | terminal engine: input, history, Tab completion, intro |
| `assets/js/commands.js` | terminal commands and the intro script |
| `assets/js/main.js` | renders the sections and wires the page |

## Running locally

```bash
python -m http.server 8000   # then open http://localhost:8000
```

## Publishing

Push to the `main` branch of `Erick-Bryan-Cubas/Erick-Bryan-Cubas.github.io`, then in
**Settings → Pages** choose *Deploy from a branch → main / (root)*.

GitHub Pages lets browsers cache files for 10 minutes. After changing any CSS/JS file, bump the
`?v=` number on the `<link>`/`<script>` tags in `index.html` so visitors get the new version right away.
