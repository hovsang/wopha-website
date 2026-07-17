// Minimal programmable stand-in for the D1 binding (env.DB). Handlers in this
// codebase only use prepare().bind().all()/.first()/.run() and batch().
// Routes are matched by SQL substring; first match wins. Each route may set:
//   results — array (or fn(bindArgs) → array) returned as { results } from all()
//   first   — row (or fn(bindArgs) → row) returned from first(); default null
//   run     — { meta } (or fn(bindArgs) → { meta }) returned from run();
//             default { meta: { changes: 1, last_row_id: 1 } }
//   error   — message string; makes all()/first()/run() throw
// Every executed statement is recorded on db.calls as { sql, args }.
export function fakeDb(routes) {
  const calls = [];
  function route(sql) {
    const r = routes.find((x) => sql.includes(x.match));
    if (!r) throw new Error("fakeDb: no route matches SQL: " + sql);
    return r;
  }
  function resolve(spec, args, fallback) {
    if (spec === undefined) return fallback;
    return typeof spec === "function" ? spec(args) : spec;
  }
  return {
    calls,
    prepare(sql) {
      let args = [];
      const stmt = {
        bind(...a) { args = a; return stmt; },
        async all() {
          const r = route(sql);
          calls.push({ sql, args });
          if (r.error) throw new Error(r.error);
          return { results: resolve(r.results, args, []) };
        },
        async first() {
          const r = route(sql);
          calls.push({ sql, args });
          if (r.error) throw new Error(r.error);
          return resolve(r.first, args, null);
        },
        async run() {
          const r = route(sql);
          calls.push({ sql, args });
          if (r.error) throw new Error(r.error);
          return resolve(r.run, args, { meta: { changes: 1, last_row_id: 1 } });
        },
      };
      return stmt;
    },
    async batch(stmts) {
      calls.push({ batch: stmts.length });
      return stmts.map(() => ({ meta: { changes: 1 } }));
    },
  };
}
