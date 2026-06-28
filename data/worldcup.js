// FIFA World Cup 2026 — official tournament data
// Groups & schedule per the final draw (Dec 5, 2025) and FIFA match calendar.
// Kickoff times are UTC. Knockout slots use official FIFA match numbers 73-104.

const TEAMS = {
  // Group A
  MEX: { name: 'Mexico',               flag: 'mx',     group: 'A' },
  RSA: { name: 'South Africa',         flag: 'za',     group: 'A' },
  KOR: { name: 'South Korea',          flag: 'kr',     group: 'A' },
  CZE: { name: 'Czechia',              flag: 'cz',     group: 'A' },
  // Group B
  CAN: { name: 'Canada',               flag: 'ca',     group: 'B' },
  BIH: { name: 'Bosnia & Herzegovina', flag: 'ba',     group: 'B' },
  QAT: { name: 'Qatar',                flag: 'qa',     group: 'B' },
  SUI: { name: 'Switzerland',          flag: 'ch',     group: 'B' },
  // Group C
  BRA: { name: 'Brazil',               flag: 'br',     group: 'C' },
  MAR: { name: 'Morocco',              flag: 'ma',     group: 'C' },
  HAI: { name: 'Haiti',                flag: 'ht',     group: 'C' },
  SCO: { name: 'Scotland',             flag: 'gb-sct', group: 'C' },
  // Group D
  USA: { name: 'United States',        flag: 'us',     group: 'D' },
  PAR: { name: 'Paraguay',             flag: 'py',     group: 'D' },
  AUS: { name: 'Australia',            flag: 'au',     group: 'D' },
  TUR: { name: 'Türkiye',              flag: 'tr',     group: 'D' },
  // Group E
  GER: { name: 'Germany',              flag: 'de',     group: 'E' },
  CUW: { name: 'Curaçao',              flag: 'cw',     group: 'E' },
  CIV: { name: 'Ivory Coast',          flag: 'ci',     group: 'E' },
  ECU: { name: 'Ecuador',              flag: 'ec',     group: 'E' },
  // Group F
  NED: { name: 'Netherlands',          flag: 'nl',     group: 'F' },
  JPN: { name: 'Japan',                flag: 'jp',     group: 'F' },
  SWE: { name: 'Sweden',               flag: 'se',     group: 'F' },
  TUN: { name: 'Tunisia',              flag: 'tn',     group: 'F' },
  // Group G
  BEL: { name: 'Belgium',              flag: 'be',     group: 'G' },
  EGY: { name: 'Egypt',                flag: 'eg',     group: 'G' },
  IRN: { name: 'Iran',                 flag: 'ir',     group: 'G' },
  NZL: { name: 'New Zealand',          flag: 'nz',     group: 'G' },
  // Group H
  ESP: { name: 'Spain',                flag: 'es',     group: 'H' },
  CPV: { name: 'Cape Verde',           flag: 'cv',     group: 'H' },
  KSA: { name: 'Saudi Arabia',         flag: 'sa',     group: 'H' },
  URU: { name: 'Uruguay',              flag: 'uy',     group: 'H' },
  // Group I
  FRA: { name: 'France',               flag: 'fr',     group: 'I' },
  SEN: { name: 'Senegal',              flag: 'sn',     group: 'I' },
  IRQ: { name: 'Iraq',                 flag: 'iq',     group: 'I' },
  NOR: { name: 'Norway',               flag: 'no',     group: 'I' },
  // Group J
  ARG: { name: 'Argentina',            flag: 'ar',     group: 'J' },
  ALG: { name: 'Algeria',              flag: 'dz',     group: 'J' },
  AUT: { name: 'Austria',              flag: 'at',     group: 'J' },
  JOR: { name: 'Jordan',               flag: 'jo',     group: 'J' },
  // Group K
  POR: { name: 'Portugal',             flag: 'pt',     group: 'K' },
  COD: { name: 'DR Congo',             flag: 'cd',     group: 'K' },
  UZB: { name: 'Uzbekistan',           flag: 'uz',     group: 'K' },
  COL: { name: 'Colombia',             flag: 'co',     group: 'K' },
  // Group L
  ENG: { name: 'England',              flag: 'gb-eng', group: 'L' },
  CRO: { name: 'Croatia',              flag: 'hr',     group: 'L' },
  GHA: { name: 'Ghana',                flag: 'gh',     group: 'L' },
  PAN: { name: 'Panama',               flag: 'pa',     group: 'L' },
};

const GROUPS = {
  A: ['MEX', 'RSA', 'KOR', 'CZE'],
  B: ['CAN', 'BIH', 'QAT', 'SUI'],
  C: ['BRA', 'MAR', 'HAI', 'SCO'],
  D: ['USA', 'PAR', 'AUS', 'TUR'],
  E: ['GER', 'CUW', 'CIV', 'ECU'],
  F: ['NED', 'JPN', 'SWE', 'TUN'],
  G: ['BEL', 'EGY', 'IRN', 'NZL'],
  H: ['ESP', 'CPV', 'KSA', 'URU'],
  I: ['FRA', 'SEN', 'IRQ', 'NOR'],
  J: ['ARG', 'ALG', 'AUT', 'JOR'],
  K: ['POR', 'COD', 'UZB', 'COL'],
  L: ['ENG', 'CRO', 'GHA', 'PAN'],
};

// Group stage: [matchNo, kickoffUTC, home, away, group, venue]
const GROUP_MATCHES = [
  [1,  '2026-06-11T19:00Z', 'MEX', 'RSA', 'A', 'Mexico City'],
  [2,  '2026-06-12T02:00Z', 'KOR', 'CZE', 'A', 'Guadalajara'],
  [3,  '2026-06-12T19:00Z', 'CAN', 'BIH', 'B', 'Toronto'],
  [4,  '2026-06-13T01:00Z', 'USA', 'PAR', 'D', 'Los Angeles'],
  [5,  '2026-06-13T19:00Z', 'QAT', 'SUI', 'B', 'San Francisco'],
  [6,  '2026-06-13T22:00Z', 'BRA', 'MAR', 'C', 'New York / NJ'],
  [7,  '2026-06-14T01:00Z', 'HAI', 'SCO', 'C', 'Boston'],
  [8,  '2026-06-14T04:00Z', 'AUS', 'TUR', 'D', 'Vancouver'],
  [9,  '2026-06-14T17:00Z', 'GER', 'CUW', 'E', 'Houston'],
  [10, '2026-06-14T20:00Z', 'NED', 'JPN', 'F', 'Dallas'],
  [11, '2026-06-14T23:00Z', 'CIV', 'ECU', 'E', 'Philadelphia'],
  [12, '2026-06-15T02:00Z', 'SWE', 'TUN', 'F', 'Monterrey'],
  [13, '2026-06-15T16:00Z', 'ESP', 'CPV', 'H', 'Atlanta'],
  [14, '2026-06-15T19:00Z', 'BEL', 'EGY', 'G', 'Seattle'],
  [15, '2026-06-15T22:00Z', 'KSA', 'URU', 'H', 'Miami'],
  [16, '2026-06-16T01:00Z', 'IRN', 'NZL', 'G', 'Los Angeles'],
  [17, '2026-06-16T19:00Z', 'FRA', 'SEN', 'I', 'New York / NJ'],
  [18, '2026-06-16T22:00Z', 'IRQ', 'NOR', 'I', 'Boston'],
  [19, '2026-06-17T01:00Z', 'ARG', 'ALG', 'J', 'Kansas City'],
  [20, '2026-06-17T04:00Z', 'AUT', 'JOR', 'J', 'San Francisco'],
  [21, '2026-06-17T17:00Z', 'POR', 'COD', 'K', 'Houston'],
  [22, '2026-06-17T20:00Z', 'ENG', 'CRO', 'L', 'Dallas'],
  [23, '2026-06-17T23:00Z', 'GHA', 'PAN', 'L', 'Toronto'],
  [24, '2026-06-18T02:00Z', 'UZB', 'COL', 'K', 'Mexico City'],
  [25, '2026-06-18T16:00Z', 'CZE', 'RSA', 'A', 'Atlanta'],
  [26, '2026-06-18T19:00Z', 'SUI', 'BIH', 'B', 'Los Angeles'],
  [27, '2026-06-18T22:00Z', 'CAN', 'QAT', 'B', 'Vancouver'],
  [28, '2026-06-19T01:00Z', 'MEX', 'KOR', 'A', 'Guadalajara'],
  [29, '2026-06-19T19:00Z', 'USA', 'AUS', 'D', 'Seattle'],
  [30, '2026-06-19T22:00Z', 'SCO', 'MAR', 'C', 'Boston'],
  [31, '2026-06-20T00:30Z', 'BRA', 'HAI', 'C', 'Philadelphia'],
  [32, '2026-06-20T03:00Z', 'TUR', 'PAR', 'D', 'San Francisco'],
  [33, '2026-06-20T17:00Z', 'NED', 'SWE', 'F', 'Houston'],
  [34, '2026-06-20T20:00Z', 'GER', 'CIV', 'E', 'Toronto'],
  [35, '2026-06-21T00:00Z', 'ECU', 'CUW', 'E', 'Kansas City'],
  [36, '2026-06-21T04:00Z', 'TUN', 'JPN', 'F', 'Monterrey'],
  [37, '2026-06-21T16:00Z', 'ESP', 'KSA', 'H', 'Atlanta'],
  [38, '2026-06-21T19:00Z', 'BEL', 'IRN', 'G', 'Los Angeles'],
  [39, '2026-06-21T22:00Z', 'URU', 'CPV', 'H', 'Miami'],
  [40, '2026-06-22T01:00Z', 'NZL', 'EGY', 'G', 'Vancouver'],
  [41, '2026-06-22T17:00Z', 'ARG', 'AUT', 'J', 'Dallas'],
  [42, '2026-06-22T21:00Z', 'FRA', 'IRQ', 'I', 'Philadelphia'],
  [43, '2026-06-23T00:00Z', 'NOR', 'SEN', 'I', 'New York / NJ'],
  [44, '2026-06-23T03:00Z', 'JOR', 'ALG', 'J', 'San Francisco'],
  [45, '2026-06-23T17:00Z', 'POR', 'UZB', 'K', 'Houston'],
  [46, '2026-06-23T20:00Z', 'ENG', 'GHA', 'L', 'Boston'],
  [47, '2026-06-23T23:00Z', 'PAN', 'CRO', 'L', 'Toronto'],
  [48, '2026-06-24T02:00Z', 'COL', 'COD', 'K', 'Guadalajara'],
  [49, '2026-06-24T19:00Z', 'SUI', 'CAN', 'B', 'Vancouver'],
  [50, '2026-06-24T19:00Z', 'BIH', 'QAT', 'B', 'Seattle'],
  [51, '2026-06-24T22:00Z', 'SCO', 'BRA', 'C', 'Miami'],
  [52, '2026-06-24T22:00Z', 'MAR', 'HAI', 'C', 'Atlanta'],
  [53, '2026-06-25T01:00Z', 'CZE', 'MEX', 'A', 'Mexico City'],
  [54, '2026-06-25T01:00Z', 'RSA', 'KOR', 'A', 'Monterrey'],
  [55, '2026-06-25T20:00Z', 'ECU', 'GER', 'E', 'New York / NJ'],
  [56, '2026-06-25T20:00Z', 'CUW', 'CIV', 'E', 'Philadelphia'],
  [57, '2026-06-25T23:00Z', 'JPN', 'SWE', 'F', 'Dallas'],
  [58, '2026-06-25T23:00Z', 'TUN', 'NED', 'F', 'Kansas City'],
  [59, '2026-06-26T02:00Z', 'TUR', 'USA', 'D', 'Los Angeles'],
  [60, '2026-06-26T02:00Z', 'PAR', 'AUS', 'D', 'San Francisco'],
  [61, '2026-06-26T19:00Z', 'NOR', 'FRA', 'I', 'Boston'],
  [62, '2026-06-26T19:00Z', 'SEN', 'IRQ', 'I', 'Toronto'],
  [63, '2026-06-27T00:00Z', 'CPV', 'KSA', 'H', 'Houston'],
  [64, '2026-06-27T00:00Z', 'URU', 'ESP', 'H', 'Guadalajara'],
  [65, '2026-06-27T03:00Z', 'EGY', 'IRN', 'G', 'Seattle'],
  [66, '2026-06-27T03:00Z', 'NZL', 'BEL', 'G', 'Vancouver'],
  [67, '2026-06-27T21:00Z', 'PAN', 'ENG', 'L', 'New York / NJ'],
  [68, '2026-06-27T21:00Z', 'CRO', 'GHA', 'L', 'Philadelphia'],
  [69, '2026-06-27T23:30Z', 'COL', 'POR', 'K', 'Miami'],
  [70, '2026-06-27T23:30Z', 'COD', 'UZB', 'K', 'Atlanta'],
  [71, '2026-06-28T02:00Z', 'ALG', 'AUT', 'J', 'Kansas City'],
  [72, '2026-06-28T02:00Z', 'JOR', 'ARG', 'J', 'Dallas'],
];

// Knockout: [matchNo, kickoffUTC, round, venue, homeSlot, awaySlot]
// Slot types: {t:'W',g:'E'} group winner | {t:'R',g:'A'} runner-up
//             {t:'T',gs:[...]} best third from listed groups
//             {t:'WM',m:74} winner of match | {t:'LM',m:101} loser of match
const KO_MATCHES = [
  [73,  '2026-06-28T20:00Z', 'R32', 'Los Angeles',   { t: 'R', g: 'A' },           { t: 'R', g: 'B' }],
  [74,  '2026-06-29T17:00Z', 'R32', 'Boston',        { t: 'W', g: 'E' },           { t: 'T', gs: ['A','B','C','D','F'] }],
  [75,  '2026-06-29T20:00Z', 'R32', 'Monterrey',     { t: 'W', g: 'F' },           { t: 'R', g: 'C' }],
  [76,  '2026-06-29T23:00Z', 'R32', 'Houston',       { t: 'W', g: 'C' },           { t: 'R', g: 'F' }],
  [77,  '2026-06-30T17:00Z', 'R32', 'New York / NJ', { t: 'W', g: 'I' },           { t: 'T', gs: ['C','D','F','G','H'] }],
  [78,  '2026-06-30T20:00Z', 'R32', 'Dallas',        { t: 'R', g: 'E' },           { t: 'R', g: 'I' }],
  [79,  '2026-06-30T23:00Z', 'R32', 'Mexico City',   { t: 'W', g: 'A' },           { t: 'T', gs: ['C','E','F','H','I'] }],
  [80,  '2026-07-01T17:00Z', 'R32', 'Atlanta',       { t: 'W', g: 'L' },           { t: 'T', gs: ['E','H','I','J','K'] }],
  [81,  '2026-07-01T20:00Z', 'R32', 'San Francisco', { t: 'W', g: 'D' },           { t: 'T', gs: ['B','E','F','I','J'] }],
  [82,  '2026-07-01T23:00Z', 'R32', 'Seattle',       { t: 'W', g: 'G' },           { t: 'T', gs: ['A','E','H','I','J'] }],
  [83,  '2026-07-02T17:00Z', 'R32', 'Toronto',       { t: 'R', g: 'K' },           { t: 'R', g: 'L' }],
  [84,  '2026-07-02T20:00Z', 'R32', 'Los Angeles',   { t: 'W', g: 'H' },           { t: 'R', g: 'J' }],
  [85,  '2026-07-02T23:00Z', 'R32', 'Vancouver',     { t: 'W', g: 'B' },           { t: 'T', gs: ['E','F','G','I','J'] }],
  [86,  '2026-07-03T17:00Z', 'R32', 'Miami',         { t: 'W', g: 'J' },           { t: 'R', g: 'H' }],
  [87,  '2026-07-03T20:00Z', 'R32', 'Kansas City',   { t: 'W', g: 'K' },           { t: 'T', gs: ['D','E','I','J','L'] }],
  [88,  '2026-07-03T23:00Z', 'R32', 'Dallas',        { t: 'R', g: 'D' },           { t: 'R', g: 'G' }],
  [89,  '2026-07-04T17:00Z', 'R16', 'Philadelphia',  { t: 'WM', m: 74 },           { t: 'WM', m: 77 }],
  [90,  '2026-07-04T21:00Z', 'R16', 'Houston',       { t: 'WM', m: 73 },           { t: 'WM', m: 75 }],
  [91,  '2026-07-05T17:00Z', 'R16', 'New York / NJ', { t: 'WM', m: 76 },           { t: 'WM', m: 78 }],
  [92,  '2026-07-05T21:00Z', 'R16', 'Mexico City',   { t: 'WM', m: 79 },           { t: 'WM', m: 80 }],
  [93,  '2026-07-06T17:00Z', 'R16', 'Dallas',        { t: 'WM', m: 83 },           { t: 'WM', m: 84 }],
  [94,  '2026-07-06T21:00Z', 'R16', 'Seattle',       { t: 'WM', m: 81 },           { t: 'WM', m: 82 }],
  [95,  '2026-07-07T17:00Z', 'R16', 'Atlanta',       { t: 'WM', m: 86 },           { t: 'WM', m: 88 }],
  [96,  '2026-07-07T21:00Z', 'R16', 'Vancouver',     { t: 'WM', m: 85 },           { t: 'WM', m: 87 }],
  [97,  '2026-07-09T20:00Z', 'QF',  'Boston',        { t: 'WM', m: 89 },           { t: 'WM', m: 90 }],
  [98,  '2026-07-10T20:00Z', 'QF',  'Los Angeles',   { t: 'WM', m: 93 },           { t: 'WM', m: 94 }],
  [99,  '2026-07-11T17:00Z', 'QF',  'Miami',         { t: 'WM', m: 91 },           { t: 'WM', m: 92 }],
  [100, '2026-07-11T21:00Z', 'QF',  'Kansas City',   { t: 'WM', m: 95 },           { t: 'WM', m: 96 }],
  [101, '2026-07-14T20:00Z', 'SF',  'Dallas',        { t: 'WM', m: 97 },           { t: 'WM', m: 98 }],
  [102, '2026-07-15T20:00Z', 'SF',  'Atlanta',       { t: 'WM', m: 99 },           { t: 'WM', m: 100 }],
  [103, '2026-07-18T20:00Z', 'TP',  'Miami',         { t: 'LM', m: 101 },          { t: 'LM', m: 102 }],
  [104, '2026-07-19T19:00Z', 'F',   'New York / NJ', { t: 'WM', m: 101 },          { t: 'WM', m: 102 }],
];

// Final group-stage results (all 72), entered as official admin results.
const SEED_RESULTS = {
  // Group A
  1: { h: 2, a: 0 },   // MEX 2-0 RSA
  2: { h: 2, a: 1 },   // KOR 2-1 CZE
  25: { h: 1, a: 1 },  // CZE 1-1 RSA
  28: { h: 1, a: 0 },  // MEX 1-0 KOR
  53: { h: 0, a: 3 },  // CZE 0-3 MEX
  54: { h: 1, a: 0 },  // RSA 1-0 KOR
  // Group B
  3: { h: 1, a: 1 },   // CAN 1-1 BIH
  5: { h: 1, a: 1 },   // QAT 1-1 SUI
  26: { h: 4, a: 1 },  // SUI 4-1 BIH
  27: { h: 6, a: 0 },  // CAN 6-0 QAT
  49: { h: 2, a: 1 },  // SUI 2-1 CAN
  50: { h: 3, a: 1 },  // BIH 3-1 QAT
  // Group D
  4: { h: 4, a: 1 },   // USA 4-1 PAR
  8: { h: 2, a: 0 },   // AUS 2-0 TUR
  29: { h: 2, a: 0 },  // USA 2-0 AUS
  32: { h: 0, a: 1 },  // TUR 0-1 PAR
  59: { h: 3, a: 2 },  // TUR 3-2 USA
  60: { h: 0, a: 0 },  // PAR 0-0 AUS
  // Group C
  6: { h: 1, a: 1 },   // BRA 1-1 MAR
  7: { h: 0, a: 1 },   // HAI 0-1 SCO
  30: { h: 0, a: 1 },  // SCO 0-1 MAR
  31: { h: 3, a: 0 },  // BRA 3-0 HAI
  51: { h: 0, a: 3 },  // SCO 0-3 BRA
  52: { h: 4, a: 2 },  // MAR 4-2 HAI
  // Group E
  9: { h: 7, a: 1 },   // GER 7-1 CUW
  11: { h: 1, a: 0 },  // CIV 1-0 ECU
  34: { h: 2, a: 1 },  // GER 2-1 CIV
  35: { h: 0, a: 0 },  // ECU 0-0 CUW
  55: { h: 2, a: 1 },  // ECU 2-1 GER
  56: { h: 0, a: 2 },  // CUW 0-2 CIV
  // Group F
  10: { h: 2, a: 2 },  // NED 2-2 JPN
  12: { h: 5, a: 1 },  // SWE 5-1 TUN
  33: { h: 5, a: 1 },  // NED 5-1 SWE
  36: { h: 0, a: 4 },  // TUN 0-4 JPN
  57: { h: 1, a: 1 },  // JPN 1-1 SWE
  58: { h: 1, a: 3 },  // TUN 1-3 NED
  // Group H
  13: { h: 0, a: 0 },  // ESP 0-0 CPV
  15: { h: 1, a: 1 },  // KSA 1-1 URU
  37: { h: 4, a: 0 },  // ESP 4-0 KSA
  39: { h: 2, a: 2 },  // URU 2-2 CPV
  63: { h: 0, a: 0 },  // CPV 0-0 KSA
  64: { h: 0, a: 1 },  // URU 0-1 ESP
  // Group G
  14: { h: 1, a: 1 },  // BEL 1-1 EGY
  16: { h: 2, a: 2 },  // IRN 2-2 NZL
  38: { h: 0, a: 0 },  // BEL 0-0 IRN
  40: { h: 1, a: 3 },  // NZL 1-3 EGY
  65: { h: 1, a: 1 },  // EGY 1-1 IRN
  66: { h: 1, a: 5 },  // NZL 1-5 BEL
  // Group I
  17: { h: 3, a: 1 },  // FRA 3-1 SEN
  18: { h: 1, a: 4 },  // IRQ 1-4 NOR
  42: { h: 3, a: 0 },  // FRA 3-0 IRQ
  43: { h: 3, a: 2 },  // NOR 3-2 SEN
  61: { h: 1, a: 4 },  // NOR 1-4 FRA
  62: { h: 5, a: 0 },  // SEN 5-0 IRQ
  // Group J
  19: { h: 3, a: 0 },  // ARG 3-0 ALG
  20: { h: 3, a: 1 },  // AUT 3-1 JOR
  41: { h: 2, a: 0 },  // ARG 2-0 AUT
  44: { h: 1, a: 2 },  // JOR 1-2 ALG
  71: { h: 3, a: 3 },  // ALG 3-3 AUT
  72: { h: 1, a: 3 },  // JOR 1-3 ARG
  // Group K
  21: { h: 1, a: 1 },  // POR 1-1 COD
  24: { h: 1, a: 3 },  // UZB 1-3 COL
  45: { h: 5, a: 0 },  // POR 5-0 UZB
  48: { h: 1, a: 0 },  // COL 1-0 COD
  69: { h: 0, a: 0 },  // COL 0-0 POR
  70: { h: 3, a: 1 },  // COD 3-1 UZB
  // Group L
  22: { h: 4, a: 2 },  // ENG 4-2 CRO
  23: { h: 1, a: 0 },  // GHA 1-0 PAN
  46: { h: 0, a: 0 },  // ENG 0-0 GHA
  47: { h: 0, a: 1 },  // PAN 0-1 CRO
  67: { h: 0, a: 2 },  // PAN 0-2 ENG
  68: { h: 2, a: 1 },  // CRO 2-1 GHA
};

// Official R32 third-place slottings the constraint-matcher can't infer on its
// own (FIFA uses a fixed allocation table). Away slot is the third in each.
const SEED_OVERRIDES = {
  74: { home: null, away: 'PAR' }, // Germany vs Paraguay (3rd D)
  77: { home: null, away: 'SWE' }, // France vs Sweden (3rd F)
  82: { home: null, away: 'SEN' }, // Belgium vs Senegal (3rd I)
  85: { home: null, away: 'ALG' }, // Switzerland vs Algeria (3rd J)
};

module.exports = { TEAMS, GROUPS, GROUP_MATCHES, KO_MATCHES, SEED_RESULTS, SEED_OVERRIDES };
