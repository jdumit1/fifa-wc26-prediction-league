# ⚽ FIFA World Cup 26 — Prediction League

A prediction game for you and your friends, built around the **real 2026 FIFA World Cup**
(all 12 groups, all 104 matches, real fixtures, venues, and kickoff times — Day 1 results
already loaded).

Everyone predicts the score of every match. When the real result lands, the app scores
everybody automatically, updates the group tables, fills in the knockout bracket, and
keeps a live leaderboard. The winner gets the (bragging-rights) trophy. 🏆

## Run it

```bash
node server.js
```

That's it — **zero dependencies**, no `npm install`. Then open:

```
http://localhost:4226
```

To play with friends on the same Wi-Fi, find your IP (`ipconfig getifaddr en0` on Mac)
and have them open `http://<your-ip>:4226`. To play over the internet, expose the port
with something like [Tailscale](https://tailscale.com), `ngrok http 4226`, or host it on
any box with Node.

### Deploy on Railway

The app runs as-is on [Railway](https://railway.com) (`npm start`, binds `$PORT`).
One thing matters: Railway's filesystem is wiped on every deploy, so attach a
**volume** mounted at `/data` and set the environment variable:

```
DB_FILE=/data/db.json
```

That keeps the league (users, picks, results) safe across deploys and restarts.

## How it works

- **Sign up once** with a username + PIN, log back in any time to continue.
- **The first person to register becomes the ADMIN** — they enter the official results
  after each match (an "Admin: enter official result" link appears on every match card).
- **Picks lock at kickoff.** Until then, nobody can see your prediction. After kickoff,
  everyone's picks are revealed on the match card.
- **Group tables compute themselves** from official results, including the
  8-best-third-placed-teams race.
- **The bracket fills itself**: group winners/runners-up flow into the official Round of 32
  slots, third-place slots are assigned automatically when the group stage completes, and
  every knockout winner advances into the next round. The admin can override any knockout
  slot manually if needed.
- **Knockout draws**: if you predict a draw in a knockout match, you also pick who
  advances on penalties. Same for official results.

## Scoring

| Result of your pick                  | Points |
| ------------------------------------ | ------ |
| 🎯 Exact score                       | **+5** |
| 📏 Right goal difference (e.g. 2–1 when it ends 3–2) | **+3** |
| ✅ Right winner (or a draw)          | **+2** |
| ⚡ Knockout only: right team advances | **+1** (stacks with the above) |

## Files

| File | What it is |
| ---- | ---------- |
| `server.js` | Zero-dependency Node server: auth, predictions, scoring, standings, bracket engine |
| `data/worldcup.js` | The real 2026 tournament: 48 teams, 12 groups, 104 matches, official bracket slots |
| `data/db.json` | The league database (users, picks, results) — delete it to start the league over |
| `public/` | The web app (UI, styles, logic, logo) |

## Notes

- Match results are entered by the admin (no paid sports API needed); everything else is automatic.
- Flags are loaded from [flagcdn.com](https://flagcdn.com); the FIFA-style logo is a custom
  SVG made for this personal project.
- Built June 12, 2026 — the day after Mexico 2–0 South Africa opened the tournament.
