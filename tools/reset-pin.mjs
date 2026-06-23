#!/usr/bin/env node
// Admin tool: reset another player's PIN (e.g. they forgot it). Run it
// yourself — it asks for YOUR admin PIN and the player's new PIN locally,
// with the keystrokes muted, and never stores either anywhere.
//
//   node tools/reset-pin.mjs <username>
//   node tools/reset-pin.mjs JoseRestrepo
//
// Requires: the league-admin account (the first account that registered) on
// the live site. The target player is logged out of any old sessions and
// must use the new PIN you set — share it with them privately.

import readline from 'node:readline';

const BASE = process.env.LEAGUE_URL || 'https://fifa-wc26-production-2160.up.railway.app';
const ADMIN_USER = process.env.ADMIN_USER || 'Dumit';
const TARGET = process.argv[2];

if (!TARGET) {
  console.error('Usage: node tools/reset-pin.mjs <username>');
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
  console.error(`✗ "${ADMIN_USER}" is not the league admin — only the first registered account can reset PINs.`);
  process.exit(1);
}
const token = login.data.token;

const newPin = await askHidden(`New PIN for "${TARGET}" (min 4 chars): `);
const confirm = await askHidden(`Confirm new PIN for "${TARGET}": `);
if (newPin !== confirm) {
  console.error('✗ PINs do not match — nothing changed.');
  process.exit(1);
}
if (newPin.length < 4) {
  console.error('✗ PIN must be at least 4 characters — nothing changed.');
  process.exit(1);
}

const r = await api('/api/admin/resetpin', { username: TARGET, pin: newPin }, token);
if (r.status !== 200) {
  console.error(`✗ Reset failed: ${r.data.error}`);
  process.exit(1);
}

console.log(`\n✓ PIN reset for "${r.data.username}".`);
console.log('  They were logged out of any old sessions — share the new PIN with them privately.');
console.log('  They can change it themselves anytime with the 🔑 button.');
