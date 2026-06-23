#!/usr/bin/env node
// Admin tool: set another player's avatar — an emoji or an image served from
// public/avatars/. Run it yourself — it asks for YOUR admin PIN locally (with
// keystrokes muted) and never stores it anywhere.
//
//   node tools/set-avatar.mjs <username> <avatar>
//   node tools/set-avatar.mjs Emilio /avatars/emilio.png
//   node tools/set-avatar.mjs Emilio 🔥
//
// For an image avatar, the file must already be deployed to public/avatars/ on
// the live site (commit + push first) — this only points the player's avatar at
// it. Requires the league-admin account (the first account that registered).

import readline from 'node:readline';

const BASE = process.env.LEAGUE_URL || 'https://fifa-wc26-production-2160.up.railway.app';
const ADMIN_USER = process.env.ADMIN_USER || 'Dumit';
const TARGET = process.argv[2];
const AVATAR = process.argv[3];

if (!TARGET || !AVATAR) {
  console.error('Usage: node tools/set-avatar.mjs <username> <avatar>');
  console.error('  e.g. node tools/set-avatar.mjs Emilio /avatars/emilio.png');
  process.exit(1);
}

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

const adminPin = await askHidden(`Admin PIN for "${ADMIN_USER}" on ${BASE}: `);
const login = await api('/api/login', { username: ADMIN_USER, pin: adminPin });
if (login.status !== 200) {
  console.error(`✗ Login failed: ${login.data.error}`);
  process.exit(1);
}
if (!login.data.state.me.admin) {
  console.error(`✗ "${ADMIN_USER}" is not the league admin — only the first registered account can set avatars.`);
  process.exit(1);
}
const token = login.data.token;

const r = await api('/api/admin/avatar', { username: TARGET, avatar: AVATAR }, token);
if (r.status !== 200) {
  console.error(`✗ Update failed: ${r.data.error}`);
  process.exit(1);
}

console.log(`\n✓ Avatar for "${r.data.username}" set to ${r.data.avatar}.`);
console.log('  It shows up immediately on next page load — no re-login needed.');
