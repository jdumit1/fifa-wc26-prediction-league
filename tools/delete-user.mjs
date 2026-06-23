#!/usr/bin/env node
// Admin tool: permanently delete a player's account (the user, all their
// predictions, and any active sessions). Run it yourself — it asks for YOUR
// admin PIN locally (keystrokes muted) and never stores it anywhere.
//
//   node tools/delete-user.mjs <username>
//   node tools/delete-user.mjs Jose
//
// This is irreversible. It requires the league-admin account, refuses to
// delete an admin or yourself, and makes you retype the exact username to
// confirm before anything is removed.

import readline from 'node:readline';

const BASE = process.env.LEAGUE_URL || 'https://fifa-wc26-production-2160.up.railway.app';
const ADMIN_USER = process.env.ADMIN_USER || 'Dumit';
const TARGET = process.argv[2];

if (!TARGET) {
  console.error('Usage: node tools/delete-user.mjs <username>');
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

function ask(question) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, answer => { rl.close(); resolve(answer); });
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
  console.error(`✗ "${ADMIN_USER}" is not the league admin — only the first registered account can delete players.`);
  process.exit(1);
}
const token = login.data.token;

console.log(`\n⚠️  This will PERMANENTLY delete "${TARGET}" — their account, picks, and sessions. This cannot be undone.`);
const confirm = await ask(`Type the username exactly to confirm deletion: `);
if (confirm !== TARGET) {
  console.error('✗ Confirmation did not match — nothing deleted.');
  process.exit(1);
}

const r = await api('/api/admin/deleteuser', { username: TARGET }, token);
if (r.status !== 200) {
  console.error(`✗ Delete failed: ${r.data.error}`);
  process.exit(1);
}

console.log(`\n✓ Deleted "${r.data.deleted}" — account, predictions, and sessions removed.`);
