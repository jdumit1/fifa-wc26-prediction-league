#!/usr/bin/env node
// FIFA World Cup 26 — Prediction League server
// Zero dependencies: run with `node server.js`

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { TEAMS, GROUPS, GROUP_MATCHES, KO_MATCHES, SEED_RESULTS } = require('./data/worldcup');

const PORT = process.env.PORT || 4226;
// On Railway/production, set DB_FILE to a path on a persistent volume (e.g. /data/db.json)
const DB_FILE = process.env.DB_FILE || path.join(__dirname, 'data', 'db.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

// ---------- persistence ----------

let db = {
  users: {},        // username -> { hash, salt, avatar, admin, created }
  tokens: {},       // token -> username
  predictions: {},  // username -> { matchId -> {h, a, adv} }
  results: {},      // matchId -> { h, a, adv }
  overrides: {},    // matchId -> { home: code|null, away: code|null }
};

function loadDb() {
  try {
    db = Object.assign(db, JSON.parse(fs.readFileSync(DB_FILE, 'utf8')));
  } catch {
    db.results = { ...SEED_RESULTS };
    saveDb();
  }
}

function saveDb() {
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

// ---------- auth ----------

function hashPin(pin, salt) {
  return crypto.scryptSync(pin, salt, 32).toString('hex');
}

function authUser(req) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  const username = token && db.tokens[token];
  return username ? { username, ...db.users[username] } : null;
}

// ---------- tournament engine ----------

const ALL_MATCHES = [
  ...GROUP_MATCHES.map(([no, ko, h, a, g, venue]) => ({
    no, kickoff: Date.parse(ko), round: 'GROUP', group: g, venue,
    homeSlot: { t: 'X', team: h }, awaySlot: { t: 'X', team: a },
  })),
  ...KO_MATCHES.map(([no, ko, round, venue, homeSlot, awaySlot]) => ({
    no, kickoff: Date.parse(ko), round, venue, homeSlot, awaySlot,
  })),
];
const MATCH_BY_NO = Object.fromEntries(ALL_MATCHES.map(m => [m.no, m]));

function groupStandings(group) {
  const rows = Object.fromEntries(GROUPS[group].map(t =>
    [t, { team: t, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 }]));
  let played = 0;
  for (const m of GROUP_MATCHES) {
    if (m[4] !== group) continue;
    const r = db.results[m[0]];
    if (!r) continue;
    played++;
    const H = rows[m[2]], A = rows[m[3]];
    H.p++; A.p++; H.gf += r.h; H.ga += r.a; A.gf += r.a; A.ga += r.h;
    if (r.h > r.a) { H.w++; A.l++; H.pts += 3; }
    else if (r.h < r.a) { A.w++; H.l++; A.pts += 3; }
    else { H.d++; A.d++; H.pts++; A.pts++; }
  }
  const list = Object.values(rows);
  for (const r of list) r.gd = r.gf - r.ga;
  list.sort((x, y) => y.pts - x.pts || y.gd - x.gd || y.gf - x.gf ||
    TEAMS[x.team].name.localeCompare(TEAMS[y.team].name));
  return { rows: list, complete: played === 6 };
}

function allStandings() {
  const out = {};
  for (const g of Object.keys(GROUPS)) out[g] = groupStandings(g);
  return out;
}

// Rank third-placed teams of completed groups; top 8 advance (only final once all groups done).
function rankedThirds(standings) {
  const thirds = [];
  for (const g of Object.keys(GROUPS)) {
    if (standings[g].complete) thirds.push({ group: g, ...standings[g].rows[2] });
  }
  thirds.sort((x, y) => y.pts - x.pts || y.gd - x.gd || y.gf - x.gf ||
    TEAMS[x.team].name.localeCompare(TEAMS[y.team].name));
  return thirds;
}

// Assign the 8 qualified third-placed groups to the 8 R32 third-slots,
// honoring each slot's allowed-group list (backtracking perfect matching).
function assignThirds(standings) {
  const allComplete = Object.values(standings).every(s => s.complete);
  if (!allComplete) return null;
  const qualified = rankedThirds(standings).slice(0, 8); // [{group, team}]
  const slots = KO_MATCHES.filter(m => m[5].t === 'T').map(m => ({ no: m[0], gs: m[5].gs }));
  const assignment = {};
  const used = new Set();
  function solve(i) {
    if (i === slots.length) return true;
    const slot = slots[i];
    for (const q of qualified) {
      if (used.has(q.group) || !slot.gs.includes(q.group)) continue;
      used.add(q.group);
      assignment[slot.no] = q.team;
      if (solve(i + 1)) return true;
      used.delete(q.group);
      delete assignment[slot.no];
    }
    return false;
  }
  return solve(0) ? assignment : null;
}

function matchWinner(no) {
  const r = db.results[no];
  if (!r) return null;
  const teams = resolveTeams(no);
  if (!teams.home || !teams.away) return null;
  if (r.h > r.a) return { winner: teams.home, loser: teams.away };
  if (r.h < r.a) return { winner: teams.away, loser: teams.home };
  if (r.adv === 'h') return { winner: teams.home, loser: teams.away };
  if (r.adv === 'a') return { winner: teams.away, loser: teams.home };
  return null;
}

let _resolveCache = null; // rebuilt per request batch

function resolveSlot(slot, no, side, ctx) {
  const ov = db.overrides[no];
  if (ov && ov[side]) return { team: ov[side] };
  switch (slot.t) {
    case 'X': return { team: slot.team };
    case 'W': {
      const s = ctx.standings[slot.g];
      return s.complete ? { team: s.rows[0].team } : { label: `Winner Group ${slot.g}` };
    }
    case 'R': {
      const s = ctx.standings[slot.g];
      return s.complete ? { team: s.rows[1].team } : { label: `2nd Group ${slot.g}` };
    }
    case 'T': {
      const team = ctx.thirdsAssignment && ctx.thirdsAssignment[no];
      return team ? { team } : { label: `3rd ${slot.gs.join('/')}` };
    }
    case 'WM': {
      const w = matchWinner(slot.m);
      return w ? { team: w.winner } : { label: `Winner M${slot.m}` };
    }
    case 'LM': {
      const w = matchWinner(slot.m);
      return w ? { team: w.loser } : { label: `Loser M${slot.m}` };
    }
  }
}

function resolveTeams(no) {
  if (_resolveCache && _resolveCache[no]) return _resolveCache[no];
  const m = MATCH_BY_NO[no];
  const ctx = _resolveCtx;
  const home = resolveSlot(m.homeSlot, no, 'home', ctx);
  const away = resolveSlot(m.awaySlot, no, 'away', ctx);
  const out = {
    home: home.team || null, away: away.team || null,
    homeLabel: home.label || null, awayLabel: away.label || null,
  };
  if (_resolveCache) _resolveCache[no] = out;
  return out;
}

let _resolveCtx = null;
function buildContext() {
  const standings = allStandings();
  _resolveCtx = { standings, thirdsAssignment: null };
  _resolveCtx.thirdsAssignment = assignThirds(standings);
  _resolveCache = {};
  return _resolveCtx;
}

// ---------- scoring ----------
// Exact score: 5 | correct goal difference: 3 | correct winner/draw: 2
// Knockout bonus: +1 for correctly picking who advances

function scorePrediction(match, pred, result) {
  let pts = 0, kind = null;
  if (pred.h === result.h && pred.a === result.a) { pts = 5; kind = 'exact'; }
  else if (pred.h - pred.a === result.h - result.a) { pts = 3; kind = 'diff'; }
  else if (Math.sign(pred.h - pred.a) === Math.sign(result.h - result.a)) { pts = 2; kind = 'outcome'; }
  let bonus = 0;
  if (match.round !== 'GROUP') {
    const predAdv = pred.h > pred.a ? 'h' : pred.a > pred.h ? 'a' : pred.adv;
    const realAdv = result.h > result.a ? 'h' : result.a > result.h ? 'a' : result.adv;
    if (predAdv && realAdv && predAdv === realAdv) bonus = 1;
  }
  return { pts: pts + bonus, kind, bonus };
}

function leaderboard() {
  return Object.keys(db.users).map(username => {
    const preds = db.predictions[username] || {};
    let total = 0;
    const counts = { exact: 0, diff: 0, outcome: 0, bonus: 0, scored: 0 };
    const perMatch = {};
    for (const [noStr, pred] of Object.entries(preds)) {
      const no = Number(noStr);
      const result = db.results[no];
      const match = MATCH_BY_NO[no];
      if (!result || !match) continue;
      const s = scorePrediction(match, pred, result);
      total += s.pts;
      if (s.kind) counts[s.kind === 'diff' ? 'diff' : s.kind]++;
      if (s.bonus) counts.bonus++;
      counts.scored++;
      perMatch[no] = s;
    }
    const u = db.users[username];
    return { username, avatar: u.avatar, admin: !!u.admin, total, counts, perMatch };
  }).sort((x, y) => y.total - x.total || y.counts.exact - x.counts.exact ||
    x.username.localeCompare(y.username));
}

// ---------- state payload ----------

function buildState(me) {
  const ctx = buildContext();
  const now = Date.now();
  const board = leaderboard();
  const myScores = board.find(u => u.username === me.username) || { perMatch: {} };

  const matches = ALL_MATCHES.map(m => {
    const teams = resolveTeams(m.no);
    const locked = now >= m.kickoff;
    const result = db.results[m.no] || null;
    const myPred = (db.predictions[me.username] || {})[m.no] || null;
    let allPreds = null;
    if (locked) {
      allPreds = [];
      for (const [user, preds] of Object.entries(db.predictions)) {
        if (preds[m.no]) {
          const s = result ? scorePrediction(m, preds[m.no], result) : null;
          allPreds.push({ user, avatar: db.users[user]?.avatar, ...preds[m.no], score: s });
        }
      }
    }
    return {
      no: m.no, kickoff: m.kickoff, round: m.round, group: m.group || null,
      venue: m.venue, ...teams, locked, result,
      myPred, myScore: result && myPred ? myScores.perMatch[m.no] : null,
      allPreds,
      canOverride: m.round !== 'GROUP',
    };
  });

  const standings = {};
  for (const [g, s] of Object.entries(ctx.standings)) standings[g] = s;

  let champion = null;
  const finalWin = matchWinner(104);
  if (finalWin) champion = finalWin.winner;

  return {
    me: { username: me.username, avatar: me.avatar, admin: !!me.admin },
    teams: TEAMS,
    groups: GROUPS,
    matches,
    standings,
    thirds: rankedThirds(ctx.standings),
    thirdsFinal: !!ctx.thirdsAssignment,
    leaderboard: board.map(({ perMatch, ...u }) => u),
    champion,
    now,
  };
}

// ---------- http helpers ----------

function json(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 1e5) req.destroy(); });
    req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
  '.json': 'application/json', '.woff2': 'font/woff2',
};

function serveStatic(req, res) {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  const file = path.join(PUBLIC_DIR, path.normalize(urlPath));
  if (!file.startsWith(PUBLIC_DIR)) return json(res, 404, { error: 'not found' });
  fs.readFile(file, (err, data) => {
    if (err) return json(res, 404, { error: 'not found' });
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
}

// ---------- api ----------

const VALID_USER = /^[\p{L}\p{N} _.-]{2,20}$/u;

async function handleApi(req, res) {
  const route = req.url.split('?')[0];

  if (req.method === 'POST' && route === '/api/register') {
    const { username, pin, avatar } = await readBody(req);
    const name = String(username || '').trim();
    if (!VALID_USER.test(name)) return json(res, 400, { error: 'Username must be 2-20 characters (letters, numbers, spaces).' });
    if (String(pin || '').length < 4) return json(res, 400, { error: 'PIN must be at least 4 characters.' });
    const key = name.toLowerCase();
    const existing = Object.keys(db.users).find(u => u.toLowerCase() === key);
    if (existing) return json(res, 409, { error: 'That username is taken — try logging in instead.' });
    const salt = crypto.randomBytes(16).toString('hex');
    const isFirst = Object.keys(db.users).length === 0;
    db.users[name] = { hash: hashPin(String(pin), salt), salt, avatar: String(avatar || '⚽').slice(0, 8), admin: isFirst, created: Date.now() };
    const token = crypto.randomBytes(32).toString('hex');
    db.tokens[token] = name;
    saveDb();
    return json(res, 200, { token, state: buildState({ username: name, ...db.users[name] }) });
  }

  if (req.method === 'POST' && route === '/api/login') {
    const { username, pin } = await readBody(req);
    const name = Object.keys(db.users).find(u => u.toLowerCase() === String(username || '').trim().toLowerCase());
    const u = name && db.users[name];
    if (!u || hashPin(String(pin || ''), u.salt) !== u.hash) {
      return json(res, 401, { error: 'Wrong username or PIN.' });
    }
    const token = crypto.randomBytes(32).toString('hex');
    db.tokens[token] = name;
    saveDb();
    return json(res, 200, { token, state: buildState({ username: name, ...u }) });
  }

  // authenticated routes
  const me = authUser(req);
  if (!me) return json(res, 401, { error: 'Not logged in.' });

  if (req.method === 'GET' && route === '/api/state') {
    return json(res, 200, buildState(me));
  }

  if (req.method === 'POST' && route === '/api/logout') {
    const h = req.headers.authorization || '';
    delete db.tokens[h.slice(7)];
    saveDb();
    return json(res, 200, { ok: true });
  }

  if (req.method === 'POST' && route === '/api/predict') {
    const { matchId, h, a, adv } = await readBody(req);
    const m = MATCH_BY_NO[matchId];
    if (!m) return json(res, 400, { error: 'Unknown match.' });
    if (Date.now() >= m.kickoff) return json(res, 403, { error: 'Predictions are locked — the match has kicked off!' });
    buildContext();
    const teams = resolveTeams(m.no);
    if (!teams.home || !teams.away) return json(res, 400, { error: 'Teams are not decided yet for this match.' });
    const H = Math.round(Number(h)), A = Math.round(Number(a));
    if (!Number.isFinite(H) || !Number.isFinite(A) || H < 0 || A < 0 || H > 20 || A > 20) {
      return json(res, 400, { error: 'Scores must be between 0 and 20.' });
    }
    const pred = { h: H, a: A };
    if (m.round !== 'GROUP' && H === A) {
      if (adv !== 'h' && adv !== 'a') return json(res, 400, { error: 'Pick who advances on penalties.' });
      pred.adv = adv;
    }
    (db.predictions[me.username] = db.predictions[me.username] || {})[m.no] = pred;
    saveDb();
    return json(res, 200, buildState(me));
  }

  if (req.method === 'POST' && route === '/api/result') {
    if (!me.admin) return json(res, 403, { error: 'Only the admin can enter official results.' });
    const { matchId, h, a, adv, clear } = await readBody(req);
    const m = MATCH_BY_NO[matchId];
    if (!m) return json(res, 400, { error: 'Unknown match.' });
    if (clear) {
      delete db.results[m.no];
      saveDb();
      return json(res, 200, buildState(me));
    }
    buildContext();
    const teams = resolveTeams(m.no);
    if (!teams.home || !teams.away) return json(res, 400, { error: 'Set both teams before entering a result.' });
    const H = Math.round(Number(h)), A = Math.round(Number(a));
    if (!Number.isFinite(H) || !Number.isFinite(A) || H < 0 || A < 0 || H > 20 || A > 20) {
      return json(res, 400, { error: 'Scores must be between 0 and 20.' });
    }
    const result = { h: H, a: A };
    if (m.round !== 'GROUP' && H === A) {
      if (adv !== 'h' && adv !== 'a') return json(res, 400, { error: 'A knockout draw needs a penalty winner.' });
      result.adv = adv;
    }
    db.results[m.no] = result;
    saveDb();
    return json(res, 200, buildState(me));
  }

  if (req.method === 'POST' && route === '/api/changepin') {
    const { pin } = await readBody(req);
    if (String(pin || '').length < 4) return json(res, 400, { error: 'PIN must be at least 4 characters.' });
    const u = db.users[me.username];
    u.salt = crypto.randomBytes(16).toString('hex');
    u.hash = hashPin(String(pin), u.salt);
    const myToken = (req.headers.authorization || '').slice(7);
    for (const [tok, name] of Object.entries(db.tokens)) {
      if (name === me.username && tok !== myToken) delete db.tokens[tok];
    }
    saveDb();
    return json(res, 200, { ok: true });
  }

  // Admin: record pre-app picks for friends — creates accounts if needed and
  // writes predictions even for locked matches (migration of off-app picks).
  if (req.method === 'POST' && route === '/api/backfill') {
    if (!me.admin) return json(res, 403, { error: 'Only the admin can backfill picks.' });
    const { entries } = await readBody(req);
    if (!Array.isArray(entries)) return json(res, 400, { error: 'entries must be an array.' });
    const created = [], updated = [];
    for (const e of entries) {
      const name = String(e.username || '').trim();
      if (!VALID_USER.test(name)) return json(res, 400, { error: `Invalid username: ${name}` });
      let existing = Object.keys(db.users).find(u => u.toLowerCase() === name.toLowerCase());
      if (!existing) {
        if (String(e.pin || '').length < 4) return json(res, 400, { error: `Temp PIN for ${name} must be at least 4 characters.` });
        const salt = crypto.randomBytes(16).toString('hex');
        db.users[name] = { hash: hashPin(String(e.pin), salt), salt, avatar: String(e.avatar || '⚽').slice(0, 8), admin: false, created: Date.now() };
        existing = name;
        created.push(name);
      } else {
        updated.push(existing);
      }
      for (const [noStr, p] of Object.entries(e.predictions || {})) {
        const m = MATCH_BY_NO[Number(noStr)];
        if (!m) return json(res, 400, { error: `Unknown match ${noStr}` });
        const H = Math.round(Number(p.h)), A = Math.round(Number(p.a));
        if (!Number.isFinite(H) || !Number.isFinite(A) || H < 0 || A < 0 || H > 20 || A > 20) {
          return json(res, 400, { error: `Bad score for ${name} on match ${noStr}` });
        }
        const pred = { h: H, a: A };
        if (m.round !== 'GROUP' && H === A && (p.adv === 'h' || p.adv === 'a')) pred.adv = p.adv;
        (db.predictions[existing] = db.predictions[existing] || {})[m.no] = pred;
      }
    }
    saveDb();
    return json(res, 200, { ok: true, created, updated, state: buildState(me) });
  }

  if (req.method === 'POST' && route === '/api/teamoverride') {
    if (!me.admin) return json(res, 403, { error: 'Only the admin can set knockout teams.' });
    const { matchId, side, team } = await readBody(req);
    const m = MATCH_BY_NO[matchId];
    if (!m || m.round === 'GROUP') return json(res, 400, { error: 'Invalid match.' });
    if (side !== 'home' && side !== 'away') return json(res, 400, { error: 'Invalid side.' });
    if (team !== null && !TEAMS[team]) return json(res, 400, { error: 'Unknown team.' });
    const ov = db.overrides[m.no] = db.overrides[m.no] || {};
    if (team === null) delete ov[side]; else ov[side] = team;
    if (!ov.home && !ov.away) delete db.overrides[m.no];
    saveDb();
    return json(res, 200, buildState(me));
  }

  return json(res, 404, { error: 'Unknown endpoint.' });
}

// ---------- server ----------

loadDb();

const server = http.createServer(async (req, res) => {
  try {
    if (req.url.startsWith('/api/')) return await handleApi(req, res);
    return serveStatic(req, res);
  } catch (e) {
    console.error(e);
    return json(res, 500, { error: 'Server error.' });
  }
});

server.listen(PORT, () => {
  console.log(`\n  ⚽ FIFA World Cup 26 Prediction League`);
  console.log(`  ➜  http://localhost:${PORT}\n`);
  console.log(`  Share on your network: http://<your-ip>:${PORT}`);
  console.log(`  First user to register becomes the admin (enters official results).\n`);
});
