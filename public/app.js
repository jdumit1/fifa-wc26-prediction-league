/* FIFA World Cup 26 — Prediction League (frontend) */
'use strict';

// ---------- state ----------
let TOKEN = localStorage.getItem('wc26_token') || null;
let S = null;                 // server state
let tab = 'matches';
let drafts = {};              // matchNo -> {h, a, adv} unsaved picks
let statusFilter = 'all';
let stageFilter = 'all';
let adminOpen = {};           // matchNo -> bool (result form expanded)
let authMode = 'login';
let pickedAvatar = '⚽';
let celebratedLeader = false;
let celebratedChampion = false;

const AVATARS = ['⚽','🏆','🔥','⚡','🎯','🦁','🐯','🦅','🐺','🦈','🐂','🦂','🐸','🦊','🐼','🦄','👑','💎','🍀','🌟','🚀','🥇','🧤','🥅'];

const ROUND_LABEL = { GROUP: 'Group', R32: 'Round of 32', R16: 'Round of 16', QF: 'Quarter-final', SF: 'Semi-final', TP: '3rd Place', F: 'FINAL' };

// Bracket column orders aligned so feeders sit next to their target match
const BR_R32 = [74, 77, 73, 75, 83, 84, 81, 82, 76, 78, 79, 80, 86, 88, 85, 87];
const BR_R16 = [89, 90, 93, 94, 91, 92, 95, 96];
const BR_QF = [97, 98, 99, 100];
const BR_SF = [101, 102];

// ---------- tiny dom helpers ----------
const $ = sel => document.querySelector(sel);
function el(htmlTag, cls, html) {
  const e = document.createElement(htmlTag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}
function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

function flagImg(code, cls = 'flag') {
  if (!code) return `<span class="flag-unknown">⚽</span>`;
  const f = S.teams[code].flag;
  return `<img class="${cls}" src="https://flagcdn.com/w160/${f}.png" alt="${esc(S.teams[code].name)}" loading="lazy">`;
}
function teamName(code) { return code ? S.teams[code].name : ''; }

function fmtDateHead(ts) {
  return new Date(ts).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
}
function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function toast(msg, kind = '') {
  const t = $('#toast');
  t.textContent = msg;
  t.className = `toast ${kind}`;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.add('hidden'), 3200);
}

// ---------- api ----------
async function api(route, body) {
  const opts = {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json' },
  };
  if (TOKEN) opts.headers.Authorization = `Bearer ${TOKEN}`;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(route, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && route !== '/api/login') logout(true);
    throw new Error(data.error || 'Something went wrong.');
  }
  return data;
}

// ---------- auth ----------
function showAuth() {
  $('#auth').classList.remove('hidden');
  $('#app').classList.add('hidden');
  const grid = $('#avatar-grid');
  if (!grid.children.length) {
    AVATARS.forEach(a => {
      const b = el('button', a === pickedAvatar ? 'sel' : '', a);
      b.type = 'button';
      b.onclick = () => {
        pickedAvatar = a;
        grid.querySelectorAll('button').forEach(x => x.classList.toggle('sel', x.textContent === a));
      };
      grid.appendChild(b);
    });
  }
}

function setAuthMode(mode) {
  authMode = mode;
  $('#tab-login').classList.toggle('active', mode === 'login');
  $('#tab-register').classList.toggle('active', mode === 'register');
  $('#avatar-block').classList.toggle('hidden', mode === 'login');
  $('#auth-submit').textContent = mode === 'login' ? 'Log in' : 'Join the league ⚽';
  $('#auth-error').textContent = '';
}

$('#tab-login').onclick = () => setAuthMode('login');
$('#tab-register').onclick = () => setAuthMode('register');

$('#auth-form').onsubmit = async e => {
  e.preventDefault();
  const username = $('#auth-user').value.trim();
  const pin = $('#auth-pin').value;
  $('#auth-error').textContent = '';
  try {
    const route = authMode === 'login' ? '/api/login' : '/api/register';
    const data = await api(route, { username, pin, avatar: pickedAvatar });
    TOKEN = data.token;
    localStorage.setItem('wc26_token', TOKEN);
    S = data.state;
    enterApp();
    if (authMode === 'register') {
      toast(S.me.admin
        ? `Welcome, ${S.me.username}! You're the league ADMIN — you enter the official results. 🛡️`
        : `Welcome to the league, ${S.me.username}! Time to make some picks ⚽`, 'ok');
      confettiBurst(innerWidth / 2, innerHeight / 3, 90);
    }
  } catch (err) {
    $('#auth-error').textContent = err.message;
  }
};

function logout(silent) {
  if (!silent && TOKEN) api('/api/logout', {}).catch(() => {});
  TOKEN = null; S = null; drafts = {};
  localStorage.removeItem('wc26_token');
  showAuth();
}

function enterApp() {
  $('#auth').classList.add('hidden');
  $('#app').classList.remove('hidden');
  render();
}

// ---------- render root ----------
function render() {
  if (!S) return;
  renderUserChip();
  const view = $('#view');
  view.innerHTML = '';
  if (tab === 'matches') renderMatches(view);
  else if (tab === 'groups') renderGroups(view);
  else if (tab === 'bracket') renderBracket(view);
  else renderLeaderboard(view);
}

function renderUserChip() {
  const me = S.leaderboard.find(u => u.username === S.me.username);
  const rank = S.leaderboard.findIndex(u => u.username === S.me.username) + 1;
  $('#user-chip').innerHTML = `
    <span class="uc-av">${esc(S.me.avatar)}</span>
    <span class="uc-name">${esc(S.me.username)}<small>${me ? me.total : 0} pts · #${rank}</small></span>
    ${S.me.admin ? '<span class="uc-admin">ADMIN</span>' : ''}
    <button id="btn-logout">Log out</button>`;
  $('#btn-logout').onclick = () => logout(false);
}

document.querySelectorAll('#tabs button').forEach(b => {
  b.onclick = () => {
    tab = b.dataset.tab;
    document.querySelectorAll('#tabs button').forEach(x => x.classList.toggle('active', x === b));
    render();
    window.scrollTo({ top: 0 });
  };
});

// ---------- MATCHES ----------
function matchVisible(m) {
  if (statusFilter === 'open' && (m.locked || !m.home || !m.away)) return false;
  if (statusFilter === 'today') {
    const d = new Date(m.kickoff), n = new Date();
    if (d.toDateString() !== n.toDateString()) return false;
  }
  if (statusFilter === 'played' && !m.result) return false;
  if (stageFilter !== 'all') {
    if (stageFilter.startsWith('G-')) {
      if (m.round !== 'GROUP' || m.group !== stageFilter.slice(2)) return false;
    } else if (m.round !== stageFilter) return false;
  }
  return true;
}

function renderMatches(view) {
  // filters
  const filters = el('div', 'filters');
  const chips = [['all', 'All'], ['open', '🟢 Open for picks'], ['today', '📍 Today'], ['played', '✅ Played']];
  for (const [key, label] of chips) {
    const c = el('button', `fchip${statusFilter === key ? ' active' : ''}`, label);
    c.onclick = () => { statusFilter = key; render(); };
    filters.appendChild(c);
  }
  const sel = el('select');
  const opts = [['all', 'All stages'], ...Object.keys(S.groups).map(g => [`G-${g}`, `Group ${g}`]),
    ['R32', 'Round of 32'], ['R16', 'Round of 16'], ['QF', 'Quarter-finals'], ['SF', 'Semi-finals'], ['TP', '3rd Place'], ['F', 'Final']];
  sel.innerHTML = opts.map(([v, l]) => `<option value="${v}"${stageFilter === v ? ' selected' : ''}>${l}</option>`).join('');
  sel.onchange = () => { stageFilter = sel.value; render(); };
  filters.appendChild(sel);
  view.appendChild(filters);

  const visible = S.matches.filter(matchVisible);
  if (!visible.length) {
    view.appendChild(el('div', 'empty-note', 'No matches here. Try another filter ⚽'));
    return;
  }

  let lastDate = '';
  let grid = null;
  for (const m of visible) {
    const dh = fmtDateHead(m.kickoff);
    if (dh !== lastDate) {
      lastDate = dh;
      view.appendChild(el('div', 'date-head', esc(dh)));
      grid = el('div', 'match-grid');
      view.appendChild(grid);
    }
    grid.appendChild(matchCard(m));
  }
}

function draftFor(m) {
  if (drafts[m.no]) return drafts[m.no];
  if (m.myPred) return { h: m.myPred.h, a: m.myPred.a, adv: m.myPred.adv };
  return { h: 0, a: 0 };
}
function draftDirty(m) {
  const d = drafts[m.no];
  if (!d) return false;
  if (!m.myPred) return true;
  return d.h !== m.myPred.h || d.a !== m.myPred.a || (d.adv || null) !== (m.myPred.adv || null);
}

function ptsBadge(score) {
  if (!score) return '';
  const label = score.kind === 'exact' ? `EXACT! +${score.pts}` :
    score.kind === 'diff' ? `DIFF +${score.pts}` :
    score.kind === 'outcome' ? `WINNER +${score.pts}` :
    score.pts > 0 ? `BONUS +${score.pts}` : 'MISS +0';
  const cls = score.kind === 'exact' ? 'pts-exact' : score.kind === 'diff' ? 'pts-diff' :
    score.kind === 'outcome' ? 'pts-outcome' : score.pts > 0 ? 'pts-outcome' : 'pts-miss';
  return `<span class="pts-badge ${cls}">${score.kind === 'exact' ? '🎯 ' : ''}${label}</span>`;
}

function matchCard(m) {
  const card = el('div', `mcard${m.result ? ' finished' : ''}`);
  card.id = `match-${m.no}`;
  const isKO = m.round !== 'GROUP';
  const stage = isKO ? ROUND_LABEL[m.round] : `Group ${m.group}`;
  const status = m.result
    ? `<span class="status-chip status-ft">FT</span>`
    : m.locked
      ? `<span class="status-chip status-locked">🔒 LOCKED</span>`
      : `<span class="status-chip status-open">⏳ <span class="countdown" data-cd="${m.kickoff}"></span></span>`;

  card.innerHTML = `
    <div class="mhead">
      <span class="stage-chip${isKO ? ' ko' : ''}">${esc(stage)}</span>
      <span>M${m.no} · ${esc(m.venue)}</span>
      <span class="mtime">${fmtTime(m.kickoff)}</span>
      ${status}
    </div>`;

  const d = draftFor(m);
  const open = !m.locked && m.home && m.away;

  const row = (code, label, side) => {
    const r = el('div', 'team-row');
    let right = '';
    if (m.result) {
      const my = side === 'h' ? m.result.h : m.result.a;
      const other = side === 'h' ? m.result.a : m.result.h;
      const advWin = m.result.h === m.result.a && m.result.adv === side;
      right = `<span class="big-score${my > other || advWin ? ' win' : ''}">${my}</span>`;
    } else if (open) {
      right = `
        <div class="stepper" data-side="${side}">
          <button type="button" data-step="-1">−</button>
          <span class="sval">${side === 'h' ? d.h : d.a}</span>
          <button type="button" data-step="1">+</button>
        </div>`;
    } else if (m.locked && m.myPred) {
      right = `<span class="big-score">${side === 'h' ? m.myPred.h : m.myPred.a}</span>`;
    }
    r.innerHTML = `
      ${flagImg(code)}
      <span class="tname${code ? '' : ' tbd'}">${code ? esc(teamName(code)) : esc(label || 'TBD')}</span>
      ${right}`;
    return r;
  };

  card.appendChild(row(m.home, m.homeLabel, 'h'));
  card.appendChild(row(m.away, m.awayLabel, 'a'));

  if (m.result && m.result.h === m.result.a && m.result.adv) {
    const advTeam = m.result.adv === 'h' ? m.home : m.away;
    card.appendChild(el('div', 'pen-note', `🥅 ${esc(teamName(advTeam))} advance on penalties`));
  }

  // steppers
  if (open) {
    card.querySelectorAll('.stepper button').forEach(b => {
      b.onclick = () => {
        const side = b.closest('.stepper').dataset.side;
        const cur = draftFor(m);
        const next = { ...cur };
        next[side] = Math.max(0, Math.min(20, (next[side] || 0) + Number(b.dataset.step)));
        drafts[m.no] = next;
        card.replaceWith(matchCard(m));
      };
    });

    // knockout draw → pick who advances
    if (isKO && d.h === d.a) {
      const advWrap = el('div', 'adv-pick', `<div class="adv-label">⚖️ Tied pick — who advances on penalties?</div>`);
      const btns = el('div', 'adv-btns');
      for (const [side, code] of [['h', m.home], ['a', m.away]]) {
        const b = el('button', d.adv === side ? 'sel' : '', esc(teamName(code)));
        b.onclick = () => { drafts[m.no] = { ...draftFor(m), adv: side }; card.replaceWith(matchCard(m)); };
        btns.appendChild(b);
      }
      advWrap.appendChild(btns);
      card.appendChild(advWrap);
    }

    const conflict = (m.taken || []).find(t => t.h === d.h && t.a === d.a);
    const foot = el('div', 'mfoot');
    const dirty = draftDirty(m);
    if (m.myPred && !dirty) {
      foot.appendChild(el('span', 'mypick-chip', `Your pick: <b>${m.myPred.h} – ${m.myPred.a}</b>${m.myPred.adv ? ` <small>(${esc(teamName(m.myPred.adv === 'h' ? m.home : m.away))} adv.)</small>` : ''} ✏️ tap +/− to change`));
    } else if (conflict) {
      foot.appendChild(el('span', 'conflict-note', `⛔ ${d.h}–${d.a} is claimed by ${esc(conflict.avatar || '')} <b>${esc(conflict.user)}</b> — pick another score`));
    } else {
      const save = el('button', 'btn-save', m.myPred ? 'Update pick' : 'Lock in my pick 🎯');
      save.disabled = !dirty && !!m.myPred;
      if (isKO && d.h === d.a && !d.adv) save.disabled = true;
      save.onclick = async () => {
        try {
          const body = { matchId: m.no, h: d.h, a: d.a };
          if (isKO && d.h === d.a) body.adv = d.adv;
          S = await api('/api/predict', body);
          delete drafts[m.no];
          const rect = save.getBoundingClientRect();
          confettiBurst(rect.left + rect.width / 2, rect.top, 28);
          toast('Pick saved! Good luck 🍀', 'ok');
          render();
        } catch (err) {
          toast(err.message, 'err');
          refresh(); // someone may have just claimed this score — pull fresh state
        }
      };
      foot.appendChild(save);
    }
    card.appendChild(foot);

    // scorelines other players have already claimed (unique-score rule)
    if (m.taken && m.taken.length) {
      const tk = el('div', 'fpicks', `<div class="fp-label">🏁 Claimed scores — first come, first served</div>`);
      const list = el('div', 'fp-list');
      for (const t of m.taken) {
        list.insertAdjacentHTML('beforeend', `
          <span class="fp-chip${conflict && t.user === conflict.user && t.h === conflict.h && t.a === conflict.a ? ' taken-conflict' : ''}" title="${esc(t.user)}">
            <span>${esc(t.avatar || '⚽')}</span> ${esc(t.user)}
            <span class="fp-score">${t.h}–${t.a}</span>
          </span>`);
      }
      tk.appendChild(list);
      card.appendChild(tk);
    }
  }

  // my pick + points on locked/finished
  if (m.locked && m.myPred) {
    const foot = el('div', 'mfoot');
    foot.appendChild(el('span', 'mypick-chip',
      `Your pick: <b>${m.myPred.h} – ${m.myPred.a}</b>${m.myPred.adv ? ` <small>(${esc(teamName(m.myPred.adv === 'h' ? m.home : m.away) || 'TBD')} adv.)</small>` : ''}`));
    if (m.myScore) foot.insertAdjacentHTML('beforeend', ptsBadge(m.myScore));
    card.appendChild(foot);
  } else if (m.locked && !m.myPred && m.home && m.away) {
    card.appendChild(el('div', 'mfoot', `<span class="mypick-chip">😴 You missed this one — no pick</span>`));
  }

  // friends' picks (revealed after lock)
  if (m.allPreds && m.allPreds.length) {
    const fp = el('div', 'fpicks', `<div class="fp-label">League picks</div>`);
    const list = el('div', 'fp-list');
    for (const p of m.allPreds) {
      const ptsCls = !p.score ? '' : p.score.kind === 'exact' ? 'g' : p.score.kind === 'diff' ? 'gr' : p.score.pts > 0 ? 'b' : 'z';
      list.insertAdjacentHTML('beforeend', `
        <span class="fp-chip" title="${esc(p.user)}">
          <span>${esc(p.avatar || '⚽')}</span> ${esc(p.user)}
          <span class="fp-score">${p.h}–${p.a}</span>
          ${p.score ? `<span class="fp-pts ${ptsCls}">+${p.score.pts}</span>` : ''}
        </span>`);
    }
    fp.appendChild(list);
    card.appendChild(fp);
  }

  // admin zone
  if (S.me.admin) card.appendChild(adminZone(m));

  return card;
}

function adminZone(m) {
  const zone = el('div', 'admin-zone');
  const t = el('button', 'admin-toggle', adminOpen[m.no] ? '▾ Admin: official result' : '▸ Admin: enter official result');
  t.onclick = () => { adminOpen[m.no] = !adminOpen[m.no]; render(); };
  zone.appendChild(t);
  if (!adminOpen[m.no]) return zone;

  const form = el('div', 'admin-form');
  const isKO = m.round !== 'GROUP';

  // knockout team override
  if (isKO) {
    const teamSel = side => {
      const cur = side === 'home' ? m.home : m.away;
      const codes = Object.keys(S.teams).sort((a, b) => S.teams[a].name.localeCompare(S.teams[b].name));
      return `<select data-ovr="${side}">
        <option value="">— auto / TBD —</option>
        ${codes.map(c => `<option value="${c}"${cur === c ? ' selected' : ''}>${esc(S.teams[c].name)}</option>`).join('')}
      </select>`;
    };
    form.insertAdjacentHTML('beforeend', `
      <div class="ar-row">Teams: ${teamSel('home')} vs ${teamSel('away')}</div>`);
  }

  const r = m.result || { h: '', a: '' };
  form.insertAdjacentHTML('beforeend', `
    <div class="ar-row">
      Score:
      <input type="number" min="0" max="20" data-res="h" value="${r.h}" placeholder="0">
      –
      <input type="number" min="0" max="20" data-res="a" value="${r.a}" placeholder="0">
      ${isKO ? `<select data-res="adv">
        <option value="">pens: n/a</option>
        <option value="h"${r.adv === 'h' ? ' selected' : ''}>pens: ${esc(teamName(m.home) || 'home')}</option>
        <option value="a"${r.adv === 'a' ? ' selected' : ''}>pens: ${esc(teamName(m.away) || 'away')}</option>
      </select>` : ''}
    </div>
    <div class="ar-row">
      <button class="btn-admin" data-act="save">Save result</button>
      ${m.result ? '<button class="btn-admin danger" data-act="clear">Clear result</button>' : ''}
    </div>`);

  form.querySelectorAll('[data-ovr]').forEach(sel => {
    sel.onchange = async () => {
      try {
        S = await api('/api/teamoverride', { matchId: m.no, side: sel.dataset.ovr, team: sel.value || null });
        toast('Teams updated.', 'ok');
        render();
      } catch (err) { toast(err.message, 'err'); }
    };
  });

  form.querySelector('[data-act="save"]').onclick = async () => {
    const h = form.querySelector('[data-res="h"]').value;
    const a = form.querySelector('[data-res="a"]').value;
    const advSel = form.querySelector('[data-res="adv"]');
    try {
      S = await api('/api/result', { matchId: m.no, h: Number(h), a: Number(a), adv: advSel ? advSel.value || null : null });
      toast(`Official result saved: ${teamName(m.home)} ${h}–${a} ${teamName(m.away)} ✅`, 'ok');
      render();
    } catch (err) { toast(err.message, 'err'); }
  };
  const clearBtn = form.querySelector('[data-act="clear"]');
  if (clearBtn) clearBtn.onclick = async () => {
    try {
      S = await api('/api/result', { matchId: m.no, clear: true });
      toast('Result cleared.', 'ok');
      render();
    } catch (err) { toast(err.message, 'err'); }
  };

  zone.appendChild(form);
  return zone;
}

// ---------- GROUPS ----------
function renderGroups(view) {
  const grid = el('div', 'group-grid');
  for (const g of Object.keys(S.groups)) {
    const st = S.standings[g];
    const card = el('div', 'gcard');
    card.innerHTML = `<h3><span class="gc-letter">${g}</span> GROUP ${g} ${st.complete ? '<span class="done-chip">✓ COMPLETE</span>' : ''}</h3>`;
    const table = el('table', 'gtable');
    table.innerHTML = `<tr><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th></tr>`;
    st.rows.forEach((r, i) => {
      const tr = el('tr', i < 2 ? 'q1' : i === 2 ? 'q3' : '');
      tr.innerHTML = `
        <td><span class="gt-team">${flagImg(r.team, '')}${esc(teamName(r.team))}</span></td>
        <td>${r.p}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td>
        <td>${r.gd > 0 ? '+' : ''}${r.gd}</td><td class="pts">${r.pts}</td>`;
      table.appendChild(tr);
    });
    card.appendChild(table);
    grid.appendChild(card);
  }

  // best thirds card
  const tc = el('div', 'gcard thirds-card');
  tc.innerHTML = `<h3><span class="gc-letter">3</span> BEST 3RD-PLACED</h3>
    <div class="thirds-note">Top two of each group qualify, plus the <b>8 best third-placed teams</b>. ${S.thirdsFinal ? 'All groups complete — these 8 are through! ✅' : 'Updates live as groups finish.'}</div>`;
  if (!S.thirds.length) {
    tc.insertAdjacentHTML('beforeend', `<div class="thirds-note">No groups completed yet — standings appear as final group matches are played.</div>`);
  }
  S.thirds.forEach((t, i) => {
    if (i === 8) tc.appendChild(el('div', 'cutline'));
    tc.insertAdjacentHTML('beforeend', `
      <div class="third-row ${i < 8 ? 'in' : 'out'}">
        <span style="color:var(--text-faint);width:18px">${i + 1}</span>
        ${flagImg(t.team, '')} ${esc(teamName(t.team))}
        <span style="color:var(--text-faint);font-size:.72rem">Grp ${t.group}</span>
        <span class="tr-pts">${t.pts} pts</span>
      </div>`);
  });
  grid.appendChild(tc);
  view.appendChild(grid);
}

// ---------- BRACKET ----------
function bracketNode(no) {
  const m = S.matches.find(x => x.no === no);
  const node = el('div', 'bnode');
  const r = m.result;
  const winSide = r ? (r.h > r.a ? 'h' : r.a > r.h ? 'a' : r.adv) : null;
  const trow = (code, label, side) => {
    const cls = winSide ? (winSide === side ? 'w' : 'l') : '';
    return `<div class="bn-team ${cls}">
      ${code ? flagImg(code, '') : '<span class="bn-unk">?</span>'}
      <span class="bn-name${code ? '' : ' tbd'}">${code ? esc(teamName(code)) : esc(label || 'TBD')}</span>
      ${r ? `<span class="bn-score">${side === 'h' ? r.h : r.a}</span>` : ''}
    </div>`;
  };
  node.innerHTML = `
    <div class="bn-meta"><span>M${m.no}</span><span>${new Date(m.kickoff).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span></div>
    ${trow(m.home, m.homeLabel, 'h')}
    ${trow(m.away, m.awayLabel, 'a')}`;
  node.onclick = () => {
    tab = 'matches'; statusFilter = 'all'; stageFilter = m.round;
    document.querySelectorAll('#tabs button').forEach(x => x.classList.toggle('active', x.dataset.tab === 'matches'));
    render();
    setTimeout(() => {
      const target = $(`#match-${m.no}`);
      if (target) { target.scrollIntoView({ block: 'center' }); target.style.borderColor = 'var(--gold)'; }
    }, 60);
  };
  return node;
}

function renderBracket(view) {
  const wrap = el('div', 'bracket-wrap');
  const br = el('div', 'bracket');

  const col = (title, nos) => {
    const c = el('div', 'bcol', `<div class="bcol-title">${title}</div>`);
    const nodes = el('div', 'bcol-nodes');
    nos.forEach(no => nodes.appendChild(bracketNode(no)));
    c.appendChild(nodes);
    return c;
  };

  br.appendChild(col('Round of 32', BR_R32));
  br.appendChild(col('Round of 16', BR_R16));
  br.appendChild(col('Quarter-finals', BR_QF));
  br.appendChild(col('Semi-finals', BR_SF));

  // final column: final + champion + 3rd place
  const fc = el('div', 'bcol', `<div class="bcol-title">🏆 Final · Jul 19</div>`);
  const fnodes = el('div', 'bcol-nodes');
  fnodes.appendChild(bracketNode(104));

  const champ = el('div', 'champ-card');
  if (S.champion) {
    champ.innerHTML = `
      <span class="cc-trophy">🏆</span>
      <div class="cc-label">World Champion</div>
      ${flagImg(S.champion, '')}
      <div class="cc-name">${esc(teamName(S.champion))}</div>`;
    if (!celebratedChampion) { celebratedChampion = true; confettiRain(); }
  } else {
    champ.innerHTML = `
      <span class="cc-trophy">🏆</span>
      <div class="cc-label">World Champion</div>
      <div class="cc-tbd">To be crowned — July 19, New York / NJ</div>`;
  }
  fnodes.appendChild(champ);

  const tp = el('div');
  tp.innerHTML = `<div class="bcol-title" style="margin:16px 0 10px">🥉 3rd Place · Jul 18</div>`;
  tp.appendChild(bracketNode(103));
  fnodes.appendChild(tp);

  fc.appendChild(fnodes);
  br.appendChild(fc);
  wrap.appendChild(br);
  view.appendChild(wrap);
  view.insertAdjacentHTML('beforeend',
    `<div class="empty-note" style="padding:18px">Tap any tie to jump to its match card and make your pick. Teams fill in automatically as groups finish and results land.</div>`);
}

// ---------- LEADERBOARD ----------
function renderLeaderboard(view) {
  const lb = S.leaderboard;
  if (!lb.length) {
    view.appendChild(el('div', 'empty-note', 'Nobody here yet.'));
    return;
  }

  // podium (only show users with at least the top spot meaningful)
  const podOrder = [1, 0, 2]; // silver, gold, bronze visual order
  const podium = el('div', 'podium');
  for (const idx of podOrder) {
    const u = lb[idx];
    if (!u) continue;
    const medal = ['🥇', '🥈', '🥉'][idx];
    const pod = el('div', `pod pod-${idx + 1}`);
    pod.innerHTML = `
      <span class="pod-medal">${medal}</span>
      <span class="pod-av">${esc(u.avatar)}</span>
      <div class="pod-name">${esc(u.username)}</div>
      <div class="pod-pts">${u.total}</div>
      <div style="font-size:.66rem;color:var(--text-faint);letter-spacing:.1em">POINTS</div>`;
    podium.appendChild(pod);
  }
  view.appendChild(podium);

  const list = el('div', 'lb-list');
  lb.forEach((u, i) => {
    const isMe = u.username === S.me.username;
    const row = el('div', `lb-row${isMe ? ' me' : ''}`);
    row.style.animationDelay = `${i * 0.05}s`;
    row.innerHTML = `
      <span class="lb-rank">${i + 1}</span>
      <span class="lb-av">${esc(u.avatar)}</span>
      <span class="lb-name">${esc(u.username)} ${isMe ? '<span class="you">YOU</span>' : ''}${u.admin ? ' <span class="you" style="color:var(--text-faint)">ADMIN</span>' : ''}</span>
      <span class="lb-stats">
        <span class="lb-stat" title="Exact scores">🎯 ${u.counts.exact}</span>
        <span class="lb-stat" title="Right goal difference">📏 ${u.counts.diff}</span>
        <span class="lb-stat" title="Right winner">✅ ${u.counts.outcome}</span>
        <span class="lb-stat" title="Knockout advance bonus">⚡ ${u.counts.bonus}</span>
      </span>
      <span class="lb-pts">${u.total}<small>PTS</small></span>`;
    list.appendChild(row);
  });
  view.appendChild(list);

  if (lb[0] && lb[0].username === S.me.username && lb[0].total > 0 && !celebratedLeader) {
    celebratedLeader = true;
    confettiRain(120);
    toast("👑 You're top of the league!", 'ok');
  }
}

// ---------- countdown ticker ----------
function fmtCountdown(ms) {
  if (ms <= 0) return 'kickoff!';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600),
    m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${String(sec).padStart(2, '0')}s`;
}

setInterval(() => {
  let crossed = false;
  document.querySelectorAll('[data-cd]').forEach(e => {
    const left = Number(e.dataset.cd) - Date.now();
    e.textContent = fmtCountdown(left);
    if (left <= 0 && left > -2000) crossed = true;
  });
  if (crossed) refresh();
}, 1000);

// ---------- polling ----------
async function refresh() {
  if (!TOKEN || document.hidden) return;
  try {
    S = await api('/api/state');
    render();
  } catch { /* ignore transient errors */ }
}
setInterval(refresh, 45000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });

// ---------- confetti ----------
const canvas = $('#confetti');
const ctx = canvas.getContext('2d');
let particles = [];
function sizeCanvas() { canvas.width = innerWidth; canvas.height = innerHeight; }
sizeCanvas();
addEventListener('resize', sizeCanvas);

const CCOLORS = ['#ffd24a', '#4f7cff', '#1fd082', '#ff5d7a', '#ffffff', '#ffb648'];

function confettiBurst(x, y, n = 40) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = 3 + Math.random() * 6;
    particles.push({
      x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 3,
      w: 5 + Math.random() * 6, h: 3 + Math.random() * 4,
      rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
      color: CCOLORS[(Math.random() * CCOLORS.length) | 0], life: 70 + Math.random() * 40,
    });
  }
  if (!confettiBurst._raf) tickConfetti();
}

function confettiRain(n = 160) {
  for (let i = 0; i < n; i++) {
    particles.push({
      x: Math.random() * innerWidth, y: -20 - Math.random() * innerHeight * 0.5,
      vx: (Math.random() - 0.5) * 2, vy: 2 + Math.random() * 3.5,
      w: 6 + Math.random() * 7, h: 4 + Math.random() * 5,
      rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.25,
      color: CCOLORS[(Math.random() * CCOLORS.length) | 0], life: 220 + Math.random() * 120,
    });
  }
  if (!confettiBurst._raf) tickConfetti();
}

function tickConfetti() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles = particles.filter(p => p.life > 0 && p.y < canvas.height + 30);
  for (const p of particles) {
    p.x += p.vx; p.y += p.vy; p.vy += 0.12; p.rot += p.vr; p.life--;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.globalAlpha = Math.min(1, p.life / 40);
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    ctx.restore();
  }
  if (particles.length) {
    confettiBurst._raf = requestAnimationFrame(tickConfetti);
  } else {
    confettiBurst._raf = null;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

// ---------- boot ----------
(async function boot() {
  if (TOKEN) {
    try {
      S = await api('/api/state');
      enterApp();
      return;
    } catch { /* fall through to auth */ }
  }
  showAuth();
})();
