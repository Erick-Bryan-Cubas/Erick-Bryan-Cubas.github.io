/*
 * MiniSQL — a tiny read-only SQL engine for the terminal easter egg.
 *
 *   SELECT [DISTINCT] * | col [AS alias] | COUNT(*) | SUM/AVG/MIN/MAX(col), ...
 *   FROM table
 *   [WHERE cond [AND|OR cond] ...]      -- =, !=, <>, <, >, <=, >=, [NOT] LIKE/ILIKE, IS [NOT] NULL, ( )
 *   [GROUP BY col]
 *   [ORDER BY col|alias|position [ASC|DESC], ...]
 *   [LIMIT n]
 *
 * Results are printed psql-style by MiniSQL.format().
 */
(function () {
  'use strict';

  class SQLError extends Error {}

  const KEYWORDS = new Set([
    'SELECT', 'DISTINCT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'LIKE', 'ILIKE', 'IS', 'NULL',
    'TRUE', 'FALSE', 'GROUP', 'ORDER', 'BY', 'ASC', 'DESC', 'LIMIT', 'AS',
  ]);
  const AGGREGATES = new Set(['COUNT', 'SUM', 'AVG', 'MIN', 'MAX']);
  const COMPARATORS = new Set(['=', '!=', '<>', '<', '>', '<=', '>=']);

  function tokenize(src) {
    const tokens = [];
    let i = 0;
    while (i < src.length) {
      const rest = src.slice(i);
      if (/^\s/.test(rest)) { i++; continue; }
      if (rest[0] === "'" || rest[0] === '"') {
        const quote = rest[0];
        let j = 1, value = '';
        for (;;) {
          if (j >= rest.length) throw new SQLError(`unterminated quoted ${quote === "'" ? 'string' : 'identifier'} at or near "${rest}"`);
          if (rest[j] === quote) {
            if (rest[j + 1] === quote) { value += quote; j += 2; continue; }
            break;
          }
          value += rest[j++];
        }
        const raw = rest.slice(0, j + 1);
        tokens.push(quote === "'" ? { type: 'str', value, raw } : { type: 'id', value: value.toLowerCase(), raw });
        i += j + 1;
        continue;
      }
      let m;
      if ((m = /^\d+(\.\d+)?/.exec(rest))) {
        tokens.push({ type: 'num', value: Number(m[0]), raw: m[0] });
      } else if ((m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(rest))) {
        const upper = m[0].toUpperCase();
        tokens.push(KEYWORDS.has(upper)
          ? { type: 'kw', value: upper, raw: m[0] }
          : { type: 'id', value: m[0].toLowerCase(), raw: m[0] });
      } else if ((m = /^(<>|!=|>=|<=|[=<>*(),;])/.exec(rest))) {
        tokens.push({ type: 'op', value: m[0], raw: m[0] });
      } else {
        throw new SQLError(`syntax error at or near "${rest[0]}"`);
      }
      i += m[0].length;
    }
    tokens.push({ type: 'eof', raw: '' });
    return tokens;
  }

  function parse(src) {
    const tokens = tokenize(src);
    let pos = 0;
    const peek = (o = 0) => tokens[pos + o];
    const next = () => tokens[pos++];
    const fail = (tok = peek()) => {
      throw new SQLError(tok.type === 'eof' ? 'syntax error at end of input' : `syntax error at or near "${tok.raw}"`);
    };
    const isKw = (v) => peek().type === 'kw' && peek().value === v;
    const isOp = (v) => peek().type === 'op' && peek().value === v;
    const expectKw = (v) => (isKw(v) ? next() : fail());
    const expectOp = (v) => (isOp(v) ? next() : fail());
    const ident = () => (peek().type === 'id' ? next().value : fail());

    function selectItem() {
      const tok = peek();
      let item;
      if (tok.type === 'id' && AGGREGATES.has(tok.raw.toUpperCase()) && peek(1).type === 'op' && peek(1).value === '(') {
        next(); next();
        const fn = tok.raw.toUpperCase();
        let arg;
        if (isOp('*')) {
          if (fn !== 'COUNT') fail();
          next();
          arg = '*';
        } else {
          arg = ident();
        }
        expectOp(')');
        item = { agg: fn, arg, label: fn.toLowerCase() };
      } else {
        const col = ident();
        item = { col, label: col };
      }
      if (isKw('AS')) { next(); item.label = ident(); }
      return item;
    }

    function literal() {
      const tok = next();
      if (tok.type === 'str' || tok.type === 'num') return tok.value;
      if (tok.type === 'kw' && tok.value === 'TRUE') return true;
      if (tok.type === 'kw' && tok.value === 'FALSE') return false;
      if (tok.type === 'kw' && tok.value === 'NULL') return null;
      return fail(tok);
    }

    function condition() {
      if (isOp('(')) { next(); const e = orExpr(); expectOp(')'); return e; }
      const col = ident();
      if (isKw('IS')) {
        next();
        const negate = isKw('NOT') ? (next(), true) : false;
        expectKw('NULL');
        return { type: 'null', col, negate };
      }
      const negate = isKw('NOT') ? (next(), true) : false;
      if (isKw('LIKE') || isKw('ILIKE')) {
        const insensitive = next().value === 'ILIKE';
        if (peek().type !== 'str') fail();
        return { type: 'like', col, pattern: next().value, insensitive, negate };
      }
      if (negate) fail();
      if (peek().type !== 'op' || !COMPARATORS.has(peek().value)) fail();
      return { type: 'cmp', col, op: next().value, value: literal() };
    }

    function notExpr() {
      if (isKw('NOT')) { next(); return { type: 'not', expr: notExpr() }; }
      return condition();
    }

    function andExpr() {
      let left = notExpr();
      while (isKw('AND')) { next(); left = { type: 'and', left, right: notExpr() }; }
      return left;
    }

    function orExpr() {
      let left = andExpr();
      while (isKw('OR')) { next(); left = { type: 'or', left, right: andExpr() }; }
      return left;
    }

    function orderItem() {
      let key;
      if (peek().type === 'num') key = { position: next().value };
      else if (peek().type === 'id' && AGGREGATES.has(peek().raw.toUpperCase()) && peek(1).value === '(') key = { label: selectItem().label };
      else key = { label: ident() };
      key.desc = isKw('DESC') ? (next(), true) : (isKw('ASC') && next(), false);
      return key;
    }

    expectKw('SELECT');
    const distinct = isKw('DISTINCT') ? (next(), true) : false;
    const columns = [];
    if (isOp('*')) { next(); columns.push({ star: true }); } else {
      columns.push(selectItem());
      while (isOp(',')) { next(); columns.push(selectItem()); }
    }
    expectKw('FROM');
    const table = ident();
    const query = { distinct, columns, table, where: null, groupBy: null, orderBy: [], limit: null };
    if (isKw('WHERE')) { next(); query.where = orExpr(); }
    if (isKw('GROUP')) { next(); expectKw('BY'); query.groupBy = ident(); }
    if (isKw('ORDER')) {
      next(); expectKw('BY');
      query.orderBy.push(orderItem());
      while (isOp(',')) { next(); query.orderBy.push(orderItem()); }
    }
    if (isKw('LIMIT')) {
      next();
      if (peek().type !== 'num') fail();
      query.limit = next().value;
    }
    if (isOp(';')) next();
    if (peek().type !== 'eof') fail();
    return query;
  }

  function likeToRegex(pattern, insensitive) {
    const body = pattern.replace(/[.+?^${}()|[\]\\*]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.');
    return new RegExp(`^${body}$`, insensitive ? 'is' : 's');
  }

  function compare(a, b) {
    if (a == null && b == null) return 0;
    if (a == null) return 1; // NULLS LAST, like Postgres for ASC
    if (b == null) return -1;
    if (typeof a === 'number' && typeof b === 'number') return a - b;
    return String(a).localeCompare(String(b));
  }

  function execute(query, tables) {
    if (typeof query === 'string') query = parse(query);
    const table = tables[query.table];
    if (!table) throw new SQLError(`relation "${query.table}" does not exist`);
    const names = table.columns.map((c) => c.name);
    const need = (col) => {
      if (!names.includes(col)) throw new SQLError(`column "${col}" does not exist`);
      return col;
    };

    function test(node, row) {
      switch (node.type) {
        case 'and': return test(node.left, row) && test(node.right, row);
        case 'or': return test(node.left, row) || test(node.right, row);
        case 'not': return !test(node.expr, row);
        case 'null': return (row[need(node.col)] == null) !== node.negate;
        case 'like': {
          const v = row[need(node.col)];
          if (v == null) return false;
          return likeToRegex(node.pattern, node.insensitive).test(String(v)) !== node.negate;
        }
        case 'cmp': {
          let v = row[need(node.col)];
          let target = node.value;
          if (v == null || target == null) return false;
          if (typeof v === 'number' && typeof target === 'string' && target.trim() !== '' && !isNaN(target)) target = Number(target);
          if (typeof v === 'string' && typeof target === 'number') v = isNaN(v) ? v : Number(v);
          const c = compare(v, target);
          return { '=': c === 0, '!=': c !== 0, '<>': c !== 0, '<': c < 0, '>': c > 0, '<=': c <= 0, '>=': c >= 0 }[node.op];
        }
        default: return true;
      }
    }

    const rows = query.where ? table.rows.filter((r) => test(query.where, r)) : table.rows.slice();
    const grouped = query.groupBy != null || query.columns.some((c) => c.agg);
    let labels, records; // records: [{ src, out }]

    if (grouped) {
      if (query.columns.some((c) => c.star)) throw new SQLError(`column "${query.table}.${names[0]}" must appear in the GROUP BY clause or be used in an aggregate function`);
      const key = query.groupBy && need(query.groupBy);
      for (const c of query.columns) {
        if (c.agg && c.arg !== '*') need(c.arg);
        if (c.col && need(c.col) !== key) {
          throw new SQLError(`column "${query.table}.${c.col}" must appear in the GROUP BY clause or be used in an aggregate function`);
        }
      }
      const groups = new Map();
      for (const r of rows) {
        const k = key ? r[key] : '';
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k).push(r);
      }
      if (!key && groups.size === 0) groups.set('', []);
      labels = query.columns.map((c) => c.label);
      records = [...groups.values()].map((group) => ({
        src: null,
        out: query.columns.map((c) => (c.agg ? aggregate(c, group) : group[0][c.col])),
      }));
    } else {
      const selected = query.columns.flatMap((c) =>
        c.star ? names.map((n) => ({ col: n, label: n })) : [{ col: need(c.col), label: c.label }]);
      labels = selected.map((c) => c.label);
      records = rows.map((r) => ({ src: r, out: selected.map((c) => r[c.col]) }));
    }

    if (query.distinct) {
      const seen = new Set();
      records = records.filter((rec) => {
        const k = JSON.stringify(rec.out);
        return seen.has(k) ? false : (seen.add(k), true);
      });
    }

    if (query.orderBy.length) {
      const getters = query.orderBy.map((o) => {
        if (o.position != null) {
          if (o.position < 1 || o.position > labels.length) throw new SQLError(`ORDER BY position ${o.position} is not in select list`);
          return { desc: o.desc, get: (rec) => rec.out[o.position - 1] };
        }
        const idx = labels.indexOf(o.label);
        if (idx >= 0) return { desc: o.desc, get: (rec) => rec.out[idx] };
        if (!grouped && names.includes(o.label)) return { desc: o.desc, get: (rec) => rec.src[o.label] };
        throw new SQLError(`column "${o.label}" does not exist`);
      });
      records.sort((a, b) => {
        for (const g of getters) {
          const c = compare(g.get(a), g.get(b));
          if (c !== 0) return g.desc ? -c : c;
        }
        return 0;
      });
    }

    if (query.limit != null) records = records.slice(0, query.limit);
    return { columns: labels, rows: records.map((r) => r.out) };
  }

  function aggregate(col, rows) {
    if (col.agg === 'COUNT') return col.arg === '*' ? rows.length : rows.filter((r) => r[col.arg] != null).length;
    const values = rows.map((r) => r[col.arg]).filter((v) => v != null);
    if (!values.length) return null;
    switch (col.agg) {
      case 'SUM': return values.reduce((a, b) => a + Number(b), 0);
      case 'AVG': return values.reduce((a, b) => a + Number(b), 0) / values.length;
      case 'MIN': return values.reduce((a, b) => (compare(a, b) <= 0 ? a : b));
      case 'MAX': return values.reduce((a, b) => (compare(a, b) >= 0 ? a : b));
      default: return null;
    }
  }

  function cell(v) {
    if (v == null) return '';
    if (typeof v === 'boolean') return v ? 't' : 'f';
    if (typeof v === 'number') return Number.isInteger(v) ? String(v) : v.toFixed(2);
    return String(v);
  }

  /** psql-style aligned table, returned as an array of lines. */
  function format({ columns, rows }, { footer = true } = {}) {
    const cells = rows.map((r) => r.map(cell));
    const numeric = columns.map((_, i) => rows.some((r) => typeof r[i] === 'number') && rows.every((r) => r[i] == null || typeof r[i] === 'number'));
    const widths = columns.map((c, i) => Math.max(c.length, ...cells.map((r) => r[i].length)));
    const center = (s, w) => {
      const left = Math.floor((w - s.length) / 2);
      return ' '.repeat(left) + s + ' '.repeat(w - s.length - left);
    };
    const line = (parts) => parts.map((p) => ` ${p} `).join('|').replace(/\s+$/, '');
    const out = [
      line(columns.map((c, i) => center(c, widths[i]))),
      widths.map((w) => '-'.repeat(w + 2)).join('+'),
      ...cells.map((r) => line(r.map((v, i) => (numeric[i] ? v.padStart(widths[i]) : v.padEnd(widths[i]))))),
    ];
    if (footer) out.push(`(${rows.length} row${rows.length === 1 ? '' : 's'})`);
    return out;
  }

  window.MiniSQL = { parse, execute, format, SQLError };
})();
