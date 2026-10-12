#!/usr/bin/env node
/**
 * scripts/smoke.mjs — zero-dependency end-to-end smoke test (Node 18+, global fetch).
 *
 * Usage:
 *   npm run smoke                     # against http://localhost:3000
 *   BASE_URL=http://host:3000 npm run smoke
 *
 * Runs 11 required steps (health, login, classes, eleves, examens, grille,
 * analyse, export CSV, notebook, search) then best-effort cleanup.
 * Exit code 1 if any required step failed; cleanup failures never fail the run.
 */

const BASE_URL = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
const REQUEST_TIMEOUT_MS = 20000;

const LOGIN = { email: 'enseignant@pedagogen.ma', password: 'pedagogen2024' };

let token = null;
let passed = 0;
let failed = 0;

// Shared fixtures across steps
let classeId = null;
let eleveId = null;
let examId = null;
let entryId = null;

function log(msg) {
  console.log(msg);
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

/** One required step: PASS/FAIL line, counted in the summary. */
async function step(name, fn) {
  try {
    const detail = await fn();
    passed++;
    log(`PASS  ${name}${detail ? ` — ${detail}` : ''}`);
  } catch (err) {
    failed++;
    log(`FAIL  ${name} — ${err && err.message ? err.message : String(err)}`);
  }
}

/** Authenticated fetch against BASE_URL with JSON helpers. */
async function req(method, path, body) {
  const headers = {};
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (token) headers['cookie'] = `auth-token=${token}`;
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  return res;
}

async function json(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`invalid JSON response (status ${res.status}): ${text.slice(0, 120)}`);
  }
}

/** Extract the auth-token cookie value from Set-Cookie (getSetCookie or raw header). */
function extractAuthToken(res) {
  let candidates = [];
  if (typeof res.headers.getSetCookie === 'function') {
    candidates = res.headers.getSetCookie();
  } else {
    const raw = res.headers.get('set-cookie');
    if (raw) candidates = [raw];
  }
  for (const c of candidates) {
    const m = /(?:^|[,;]\s*)auth-token=([^;,\s]+)/.exec(c);
    if (m) return m[1];
  }
  return null;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

async function run() {
  log(`SMOKE — target ${BASE_URL}`);
  const today = todayISO();

  // Step 1 — health
  await step('1. GET /api/health', async () => {
    const res = await req('GET', '/api/health');
    assert(res.status === 200, `expected 200, got ${res.status}`);
    const body = await json(res);
    assert(body?.checks?.database === 'ok', `checks.database=${JSON.stringify(body?.checks?.database)}`);
    return `status=${body.status}`;
  });

  // Step 2 — login, capture auth-token cookie
  await step('2. POST /api/auth/login', async () => {
    const res = await req('POST', '/api/auth/login', LOGIN);
    assert(res.status === 200, `expected 200, got ${res.status}`);
    token = extractAuthToken(res);
    assert(token, 'auth-token cookie not found in Set-Cookie');
    return 'auth-token captured';
  });

  // Step 3 — list classes
  await step('3. GET /api/classes', async () => {
    const res = await req('GET', '/api/classes');
    assert(res.status === 200, `expected 200, got ${res.status}`);
    const body = await json(res);
    assert(Array.isArray(body?.classes), 'response.classes is not an array');
    return `${body.classes.length} classe(s)`;
  });

  // Step 4 — create class (retry once with random suffix on duplicate-name error)
  await step('4. POST /api/classes', async () => {
    assert(token, 'no auth token (login failed)');
    let name = `SMOKE_Classe_${Date.now()}`;
    for (let attempt = 1; attempt <= 2; attempt++) {
      const res = await req('POST', '/api/classes', {
        name,
        niveau: '2AC',
        matiere: 'Informatique',
      });
      const body = await res.text();
      if (res.status === 201 || res.ok) {
        const parsed = JSON.parse(body);
        classeId = parsed?.classe?.id;
        assert(classeId, 'response.classe.id missing');
        return `id=${classeId}`;
      }
      const duplicate = res.status === 409 || /duplicate|unique|already|déjà/i.test(body);
      if (duplicate && attempt === 1) {
        name = `${name}_${Math.random().toString(36).slice(2, 7)}`;
        continue;
      }
      throw new Error(`expected 201, got ${res.status}: ${body.slice(0, 120)}`);
    }
    throw new Error('unreachable');
  });

  // Step 5 — add student to the class
  await step('5. POST /api/classes/{id}/eleves', async () => {
    assert(classeId, 'no classeId (previous step failed)');
    const res = await req('POST', `/api/classes/${classeId}/eleves`, {
      nom: 'SMOKE_Nom',
      prenom: 'SMOKE_Prenom',
      cne: `SMOKE${Date.now()}`,
      genre: 'M',
    });
    assert(res.status === 201, `expected 201, got ${res.status}`);
    const body = await json(res);
    eleveId = body?.eleve?.id;
    assert(eleveId, 'response.eleve.id missing');
    return `id=${eleveId}`;
  });

  // Step 6 — create exam
  await step('6. POST /api/examens', async () => {
    assert(classeId, 'no classeId (previous step failed)');
    const res = await req('POST', '/api/examens', {
      titre: 'SMOKE_Examen',
      exam_date: today,
      duree: 60,
      niveau: '2AC',
      classe_ids: [classeId],
      questions: [
        { numero: 1, type: 'qcm', enonce: '2+2?', bareme: 2 },
        { numero: 2, type: 'ouvert', enonce: 'Explique', bareme: 3 },
      ],
    });
    assert(res.status === 201, `expected 201, got ${res.status}`);
    const body = await json(res);
    examId = body?.examen?.id;
    assert(examId, 'response.examen.id missing');
    return `id=${examId}`;
  });

  // Step 7 — save grades
  await step('7. POST /api/examens/{id}/grille', async () => {
    assert(examId && eleveId, 'missing examId/eleveId (previous step failed)');
    const res = await req('POST', `/api/examens/${examId}/grille`, {
      notes: [
        { studentId: eleveId, numero: 1, note: 2 },
        { studentId: eleveId, numero: 2, note: 1 },
      ],
    });
    assert(res.status === 200, `expected 200, got ${res.status}`);
    const body = await json(res);
    assert(Number(body?.saved) >= 1, `saved=${JSON.stringify(body?.saved)}, expected >= 1`);
    return `saved=${body.saved}`;
  });

  // Step 8 — analysis
  await step('8. GET /api/examens/{id}/analyse', async () => {
    assert(examId, 'no examId (previous step failed)');
    const res = await req('GET', `/api/examens/${examId}/analyse`);
    assert(res.status === 200, `expected 200, got ${res.status}`);
    const body = await json(res);
    assert(typeof body?.moyenne20 === 'number', `moyenne20=${JSON.stringify(body?.moyenne20)}, expected a number`);
    return `moyenne20=${body.moyenne20}`;
  });

  // Step 9 — CSV export
  await step('9. GET /api/examens/{id}/grille/export?format=csv', async () => {
    assert(examId, 'no examId (previous step failed)');
    const res = await req('GET', `/api/examens/${examId}/grille/export?format=csv`);
    assert(res.status === 200, `expected 200, got ${res.status}`);
    const text = await res.text();
    assert(text.includes('SMOKE'), 'CSV body does not contain SMOKE');
    return `${text.length} bytes`;
  });

  // Step 10 — notebook entry + read back
  await step('10. POST /api/notebook + GET /api/notebook?classeId=', async () => {
    assert(classeId, 'no classeId (previous step failed)');
    const res = await req('POST', '/api/notebook', {
      classe_id: classeId,
      date: today,
      titre: 'SMOKE Entrée',
      resume: '## test',
      statut: 'realisee',
      tags: ['smoke'],
    });
    assert(res.status === 201, `expected 201, got ${res.status}`);
    const created = await json(res);
    entryId = created?.entry?.id;
    assert(entryId, 'response.entry.id missing');

    const list = await req('GET', `/api/notebook?classeId=${encodeURIComponent(classeId)}`);
    assert(list.status === 200, `expected 200 on read-back, got ${list.status}`);
    const body = await json(list);
    const found = Array.isArray(body?.entries) && body.entries.some((e) => e.id === entryId);
    assert(found, `entry ${entryId} not found in GET /api/notebook?classeId response`);
    return `entry=${entryId}`;
  });

  // Step 11 — full-text search (results may be empty, endpoint must respond)
  await step('11. GET /api/search?q=SMOKE', async () => {
    const res = await req('GET', `/api/search?q=${encodeURIComponent('SMOKE')}`);
    assert(res.status === 200, `expected 200, got ${res.status}`);
    const body = await json(res);
    const count = Array.isArray(body?.results) ? body.results.length : 0;
    return `${count} result(s)`;
  });

  // Step 12 — cleanup (best-effort, never fails the run)
  const cleanups = [
    ['notebook', entryId ? () => req('DELETE', `/api/notebook/${entryId}`) : null],
    ['examen', examId ? () => req('DELETE', `/api/examens/${examId}`) : null],
    ['classe', classeId ? () => req('DELETE', `/api/classes/${classeId}`) : null],
  ];
  const outcomes = [];
  for (const [label, fn] of cleanups) {
    if (!fn) {
      outcomes.push(`${label}: skipped (not created)`);
      continue;
    }
    try {
      const res = await fn();
      outcomes.push(`${label}: HTTP ${res.status}`);
    } catch (err) {
      outcomes.push(`${label}: error (${err && err.message ? err.message : String(err)})`);
    }
  }
  log(`CLEANUP — ${outcomes.join(' | ')}`);

  const total = passed + failed;
  log(`SMOKE PASSED ${passed}/${total}`);
  process.exitCode = failed > 0 ? 1 : 0;
}

run().catch((err) => {
  log(`FAIL  smoke run crashed — ${err && err.stack ? err.stack : String(err)}`);
  log(`SMOKE PASSED ${passed}/${passed + failed + 1}`);
  process.exitCode = 1;
});
