#!/usr/bin/env node
// One-time: load the Day-1 picks (made on WhatsApp before the app existed)
// into the live league. Run it yourself — it asks for YOUR admin PIN locally
// and never stores it anywhere.
//
//   node tools/backfill-day1.mjs
//
// Requires: the "Dumit" account on the live site must be the league admin
// (the first account that registered).

import crypto from 'node:crypto';
import readline from 'node:readline';

const BASE = process.env.LEAGUE_URL || 'https://fifa-wc26-production-2160.up.railway.app';
const ADMIN_USER = 'Dumit';

// Day-1 picks — match 1 = Mexico vs South Africa, match 2 = South Korea vs Czechia
const PICKS = [
  { username: 'Desco2',       avatar: '🎯', predictions: { 1: { h: 2, a: 1 }, 2: { h: 2, a: 1 } } },
  { username: 'JoseRestrepo', avatar: '🦁', predictions: { 1: { h: 2, a: 1 }, 2: { h: 1, a: 1 } } },
  { username: 'Norio',        avatar: '🐺', predictions: { 1: { h: 1, a: 1 }, 2: { h: 2, a: 1 } } },
  { username: 'Emilio',       avatar: '🔥', predictions: { 1: { h: 1, a: 0 }, 2: { h: 2, a: 0 } } },
  { username: 'Dumit',        avatar: '👑', predictions: { 1: { h: 2, a: 1 }, 2: { h: 2, a: 1 } } },
];

function askHidden(question) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    process.stdout.write(question);
    rl._writeToOutput = () => {}; // mute echo so the PIN stays off the screen
    rl.question('', answer => { rl.close(); process.stdout.write('\n'); resolve(answer); });
  });
}

async function api(route, body, token) {
  const res = await fetch(BASE + route, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json() };
}

const pin = await askHidden(`PIN for "${ADMIN_USER}" on ${BASE}: `);
const login = await api('/api/login', { username: ADMIN_USER, pin });
if (login.status !== 200) {
  console.error(`✗ Login failed: ${login.data.error}`);
  process.exit(1);
}
if (!login.data.state.me.admin) {
  console.error(`✗ "${ADMIN_USER}" is not the league admin — only the first registered account can backfill.`);
  process.exit(1);
}
const token = login.data.token;

// fresh random temp PINs for any friend who doesn't have an account yet
const entries = PICKS.map(p => ({ ...p, pin: `${p.username.toLowerCase()}-${crypto.randomInt(1000, 10000)}` }));

const bf = await api('/api/backfill', { entries }, token);
if (bf.status !== 200) {
  console.error(`✗ Backfill failed: ${bf.data.error}`);
  process.exit(1);
}

console.log('\n✓ Day-1 picks loaded!\n');
if (bf.data.created.length) {
  console.log('New accounts created — share each temp PIN privately; they can change it with the 🔑 button:');
  for (const name of bf.data.created) {
    console.log(`   ${name}:  ${entries.find(e => e.username === name).pin}`);
  }
  console.log('');
}
if (bf.data.updated.length) {
  console.log(`Already registered (kept their own PIN): ${bf.data.updated.join(', ')}\n`);
}
console.log('LEADERBOARD:');
bf.data.state.leaderboard.forEach((u, i) =>
  console.log(`   ${i + 1}. ${u.avatar} ${u.username} — ${u.total} pts (🎯${u.counts.exact} 📏${u.counts.diff} ✅${u.counts.outcome})`));
