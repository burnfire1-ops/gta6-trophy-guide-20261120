// Vice City Platinum Log — tracker (M2). Local data only: data/trophies.json + data/roadmap.json.
// Progress lives in localStorage; nothing here reaches the network.
const EARNED_KEY = 'vcpl-earned-v1';
const SPOILER_KEY = 'vcpl-spoiler-v1';

const GRADE_ORDER = ['platinum', 'gold', 'silver', 'bronze'];
const STAGE_ORDER = ['prologue', 'chapter 1', 'chapter 2', 'chapter 3', 'chapter 4', 'final', 'cleanup'];
const STAGE_LABEL = {
  prologue: 'Prologue', 'chapter 1': 'Chapter 1', 'chapter 2': 'Chapter 2',
  'chapter 3': 'Chapter 3', 'chapter 4': 'Chapter 4', final: 'Final mission', cleanup: 'Cleanup',
};
const KIND_LABEL = { story: 'Story', challenge: 'Challenge', activity: 'Activity', collectible: 'Collectible' };

const [trophiesDoc, roadmapDoc] = await Promise.all([
  (await fetch('data/trophies.json')).json(),
  (await fetch('data/roadmap.json')).json(),
]);
const trophies = trophiesDoc.trophies;
const sources = trophiesDoc.sources;
const byId = new Map(trophies.map((t) => [t.id, t]));
const byName = new Map(trophies.map((t) => [t.name, t]));

let earned = new Set();
try {
  earned = new Set((JSON.parse(localStorage.getItem(EARNED_KEY) ?? '[]') || []).filter((id) => byId.has(id)));
} catch { earned = new Set(); }
let spoilerOn = localStorage.getItem(SPOILER_KEY) !== 'false';

const $ = (id) => document.getElementById(id);
const listEl = $('list');
const searchEl = $('search');
const kindEl = $('kind');
const gradeEl = $('grade');
const statusEl = $('status');
const spoilerEl = $('spoiler');

spoilerEl.checked = spoilerOn;

function save() {
  localStorage.setItem(EARNED_KEY, JSON.stringify([...earned].sort((a, b) => a - b)));
}

function hiddenNow(t) {
  return t.hidden && spoilerOn && !earned.has(t.id);
}

function barHtml(label, got, total, cls) {
  const pct = total ? Math.round((got / total) * 100) : 0;
  return `<span><span class="${cls || ''}">${label}</span> <span class="mini-bar"><i style="width:${pct}%"></i></span> <b>${got}/${total}</b></span>`;
}

function renderProgress() {
  const total = trophies.length;
  $('progress-count').textContent = `${earned.size} / ${total}`;
  $('progress-fill').style.width = `${total ? (earned.size / total) * 100 : 0}%`;
  $('grade-bars').innerHTML = GRADE_ORDER.map((g) => {
    const ts = trophies.filter((t) => t.grade === g);
    const got = ts.filter((t) => earned.has(t.id)).length;
    return barHtml(g[0].toUpperCase() + g.slice(1), got, ts.length, `dot-${g}`);
  }).join('');
  $('stage-bars').innerHTML = STAGE_ORDER.map((s) => {
    const ts = trophies.filter((t) => t.stage === s);
    const got = ts.filter((t) => earned.has(t.id)).length;
    return barHtml(STAGE_LABEL[s], got, ts.length);
  }).join('');

  // Next Up planner (M4): the next unearned trophy, in roadmap order
  // (stage first, then id). Reads only localStorage progress — nothing else.
  const next = nextUpTrophy();
  const nextEl = $('next-up');
  nextEl.replaceChildren();
  if (!next) {
    nextEl.textContent = 'All 55 earned — Vice Got a Price! is yours.';
  } else {
    const label = document.createElement('span');
    label.className = 'next-label';
    label.textContent = 'Next up: ';
    nextEl.append(label);
    const name = document.createElement('b');
    name.textContent = hiddenNow(next) ? 'Hidden trophy' : next.name;
    const meta = document.createElement('span');
    meta.textContent = ` — ${STAGE_LABEL[next.stage] || next.stage} · ${next.grade} · ${hiddenNow(next) ? 'earn to reveal' : next.description}`;
    nextEl.append(name, meta);
  }
}

function nextUpTrophy() {
  for (const s of STAGE_ORDER) {
    const t = trophies
      .filter((x) => x.stage === s && !earned.has(x.id))
      .sort((a, b) => a.id - b.id)[0];
    if (t) return t;
  }
  return null;
}

function matchesFilters(t) {
  const q = searchEl.value.trim().toLowerCase();
  if (q && !`${t.name} ${t.description}`.toLowerCase().includes(q)) return false;
  if (gradeEl.value !== 'all' && t.grade !== gradeEl.value) return false;
  if (statusEl.value === 'earned' && !earned.has(t.id)) return false;
  if (statusEl.value === 'remaining' && earned.has(t.id)) return false;
  if (kindEl.value === 'missable') {
    if (t.missable_status === 'not-missable') return false;
  } else if (kindEl.value !== 'all' && t.kind !== kindEl.value) {
    return false;
  }
  return true;
}

function badge(text, cls) {
  const s = document.createElement('span');
  s.className = `badge ${cls}`;
  s.textContent = text;
  return s;
}

function sourceName(id) {
  const s = sources.find((x) => x.id === id);
  return s ? s.name : `Source ${id}`;
}

function buildGuideDetail(t) {
  const d = document.createElement('div');
  d.className = 'guide-detail';
  const g = document.createElement('p');
  g.className = 'card-guide';
  g.textContent = t.guide;
  d.append(g);
  if (t.steps && t.steps.length) {
    const ol = document.createElement('ol');
    for (const st of t.steps) {
      const li = document.createElement('li');
      li.textContent = st.text + ' ';
      for (const c of st.cites || []) {
        const cite = document.createElement('span');
        cite.className = 'cite';
        cite.textContent = `[${c}]`;
        cite.title = sourceName(c);
        li.append(cite, document.createTextNode(' '));
      }
      ol.append(li);
    }
    d.append(ol);
  }
  if (t.tips && t.tips.length) {
    const ul = document.createElement('ul');
    ul.className = 'tips';
    for (const tip of t.tips) {
      const li = document.createElement('li');
      li.textContent = tip;
      ul.append(li);
    }
    d.append(ul);
  }
  if (t.confirm_status === 'unconfirmed') {
    const p = document.createElement('p');
    p.className = 'guide-flag';
    p.textContent = 'Belum dicek — this step is our own advice from the official description, not yet checked in the game.';
    d.append(p);
  }
  if (t.disagree && DISAGREE_DETAIL[t.id]) {
    const box = document.createElement('div');
    box.className = 'disagree-box';
    const h = document.createElement('p');
    h.className = 'disagree-head';
    h.textContent = 'Sources disagree — both sides:';
    box.append(h);
    for (const side of DISAGREE_DETAIL[t.id]) {
      const p = document.createElement('p');
      p.className = 'disagree-side';
      const b = document.createElement('b');
      b.textContent = `${side.side}: `;
      p.append(b, document.createTextNode(`${side.text} `));
      for (const c of side.cites) {
        const cite = document.createElement('span');
        cite.className = 'cite';
        cite.textContent = `[${c}]`;
        cite.title = sourceName(c);
        p.append(cite, document.createTextNode(' '));
      }
      box.append(p);
    }
    const note = document.createElement('p');
    note.className = 'disagree-note';
    note.textContent = 'Treat both as rough ranges, not promises.';
    box.append(note);
    d.append(box);
  }
  const srcs = document.createElement('p');
  srcs.className = 'guide-sources';
  // URLs as plain text, never <a href>: the app stays offline and the
  // references gate forbids web links anywhere in app/.
  srcs.textContent = `Sources: ${(t.sources || []).map((id) => {
    const s = sources.find((x) => x.id === id);
    return s ? `[${id}] ${s.name} — ${s.url}` : `[${id}]`;
  }).join(' · ')}`;
  d.append(srcs);
  return d;
}

function renderList() {
  const shown = trophies.filter(matchesFilters);
  listEl.replaceChildren();
  $('list-count').textContent = `Showing ${shown.length} of ${trophies.length} trophies · ${earned.size} earned`;
  if (!shown.length) {
    const p = document.createElement('p');
    p.className = 'empty';
    p.textContent = 'No trophies match these filters.';
    listEl.append(p);
    return;
  }
  for (const t of shown) {
    const card = document.createElement('article');
    card.className = 'card' + (earned.has(t.id) ? ' earned' : '');
    card.dataset.trophyId = t.id;

    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = earned.has(t.id);
    box.setAttribute('aria-label', `Mark ${t.name} as earned`);
    box.addEventListener('change', () => {
      if (box.checked) earned.add(t.id);
      else earned.delete(t.id);
      save();
      renderProgress();
      renderList();
    });
    card.append(box);

    const body = document.createElement('div');
    body.className = 'card-body';
    const head = document.createElement('div');
    head.className = 'card-head';
    const name = document.createElement('h2');
    name.className = 'card-name' + (hiddenNow(t) ? ' hidden-name' : '');
    name.textContent = hiddenNow(t) ? 'Hidden trophy' : t.name;
    head.append(name);
    head.append(badge(t.grade, `badge-${t.grade}`));
    head.append(badge(KIND_LABEL[t.kind] || t.kind, 'badge-kind'));
    head.append(badge(STAGE_LABEL[t.stage] || t.stage, 'badge-stage'));
    if (t.missable_status === 'missable') head.append(badge('Missable', 'badge-missable'));
    else if (t.missable_status === 'watch') head.append(badge('Watch', 'badge-watch'));
    if (t.confirm_status === 'unconfirmed') head.append(badge('Belum dicek', 'badge-unconfirmed'));
    if (t.hidden) head.append(badge('Hidden', 'badge-hidden'));
    body.append(head);

    const desc = document.createElement('p');
    desc.className = 'card-desc' + (hiddenNow(t) ? ' hidden-desc' : '');
    desc.textContent = hiddenNow(t) ? 'Hidden trophy — earn to reveal' : t.description;
    body.append(desc);

    if (!hiddenNow(t)) {
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'card-toggle';
      toggle.textContent = 'Guide ▸';
      toggle.setAttribute('aria-expanded', 'false');
      let detail = null;
      toggle.addEventListener('click', () => {
        if (detail) {
          detail.remove();
          detail = null;
          toggle.textContent = 'Guide ▸';
          toggle.setAttribute('aria-expanded', 'false');
        } else {
          detail = buildGuideDetail(t);
          body.append(detail);
          toggle.textContent = 'Guide ▾';
          toggle.setAttribute('aria-expanded', 'true');
        }
      });
      body.append(toggle);
    }
    card.append(body);
    listEl.append(card);
  }
}

function renderRoadmap() {
  const s = roadmapDoc.summary;
  $('roadmap-summary').innerHTML = '';
  const h = document.createElement('h2');
  h.textContent = roadmapDoc.title;
  const meta = document.createElement('p');
  meta.textContent = `${s.total_trophies} trophies · ${s.grades.platinum} platinum, ${s.grades.gold} gold, ${s.grades.silver} silver, ${s.grades.bronze} bronze · ${s.hidden} hidden · ${s.online_trophies} online trophies · ${s.playthroughs} playthrough`;
  const time = document.createElement('p');
  time.textContent = `Time estimate (cited range, not a promise): ${s.time_estimate}`;
  const diff = document.createElement('p');
  diff.textContent = `Difficulty: ${s.difficulty}`;
  const ul = document.createElement('ul');
  for (const r of s.rules) {
    const li = document.createElement('li');
    li.textContent = r;
    ul.append(li);
  }
  $('roadmap-summary').append(h, meta, time, diff, ul);

  const stagesEl = $('roadmap-stages');
  stagesEl.replaceChildren();
  // Manual-save rule, verbatim from roadmap.json summary.rules — shown on every chapter stage.
  const saveRule = (s.rules || []).find((r) => r.includes('manual save'));
  for (const st of roadmapDoc.stages) {
    const li = document.createElement('li');
    const h3 = document.createElement('h3');
    const n = document.createElement('span');
    n.className = 'stage-n';
    n.textContent = `Stage ${st.n}`;
    h3.append(n, document.createTextNode(st.title));
    const focus = document.createElement('p');
    focus.className = 'focus';
    focus.textContent = st.focus;
    const tr = document.createElement('p');
    tr.className = 'stage-trophies';
    const earnedIn = st.trophies.filter((id) => earned.has(id)).length;
    tr.innerHTML = '';
    const b = document.createElement('b');
    b.textContent = `${earnedIn}/${st.trophies.length} earned: `;
    tr.append(b, document.createTextNode(st.trophies.map((id) => byId.get(id)?.name ?? id).join(', ')));
    li.append(h3, focus, tr);
    if (saveRule && st.title.startsWith('Chapter')) {
      const save = document.createElement('p');
      save.className = 'save-note';
      save.textContent = `Manual save: ${saveRule}`;
      li.append(save);
    }
    if (st.notes && st.notes.length) {
      const notes = document.createElement('ul');
      for (const note of st.notes) {
        const nli = document.createElement('li');
        nli.textContent = note;
        notes.append(nli);
      }
      li.append(notes);
    }
    if (st.warning) {
      const w = document.createElement('p');
      w.className = 'warning';
      w.textContent = st.warning;
      li.append(w);
    }
    stagesEl.append(li);
  }
}

// Missable grid (M3): one row per flagged trophy — chapter, mission/moment,
// trophy, when it can be missed, tier. Mission + "when" text is paraphrased
// from that trophy's own steps/tips in trophies.json; nothing new is claimed.
// Unconfirmed trophies stay in WATCH, never MISSABLE.
const MISSABLE_DETAIL = {
  28: {
    mission: 'Down to Earth → balcony meditation at Jason\u2019s house',
    when: 'The invitation becomes unavailable after leaving Chapter 1; whether the balcony spot is required is still unconfirmed.',
  },
  34: {
    mission: 'Free-roam with your partner — rob shops',
    when: 'If the Wanted Level drops between shops, the back-to-back chain breaks.',
  },
  39: {
    mission: 'Yasmani\u2019s Jewelry Jobs (Chapter 3) unlocks the Snap Gun → jewelry store robbery',
    when: 'One alarm, or being spotted, fails the run — save before trying.',
  },
  48: {
    mission: 'Free-roam — Criminal Profile actions across play',
    when: 'The 500-action count is long and opaque; check the Criminal Profile screen regularly.',
  },
};

// Disagree detail (M4): when sources conflict, show BOTH sides, in our own
// words, with the citations attached to each side. Paraphrased from the
// disagreeing trophies' own steps/tips in trophies.json — nothing new claimed.
const DISAGREE_DETAIL = {
  1: [
    { side: 'About 200 hours', text: 'KeenGamer puts the platinum at about 200 hours, and PowerPyx (via EGamers) agrees.', cites: [3, 7] },
    { side: '300+ hours', text: 'Push Square warns the run can pass 300 hours once the 100% checklist is counted.', cites: [4] },
  ],
  14: [
    { side: 'About 200 hours', text: 'KeenGamer puts 100% completion — and the platinum behind it — at about 200 hours.', cites: [3] },
    { side: '300+ hours', text: 'Push Square warns the same checklist can take 300+ hours.', cites: [4] },
  ],
};

function renderMissables() {
  const wrap = $('missable-list');
  wrap.replaceChildren();
  const flagged = trophies
    .filter((t) => t.missable_status !== 'not-missable')
    .sort((a, b) => STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage) || a.id - b.id);
  const missableCount = flagged.filter((t) => t.missable_status === 'missable').length;
  const watchCount = flagged.filter((t) => t.missable_status === 'watch').length;
  const safeCount = trophies.length - flagged.length;

  const counts = document.createElement('p');
  counts.className = 'missable-counts';
  counts.textContent = `${missableCount} missable · ${watchCount} watch · ${safeCount} safe — counted from trophies.json, not guessed.`;
  wrap.append(counts);

  const legend = document.createElement('div');
  legend.className = 'missable-legend';
  for (const [cls, label, def] of [
    ['badge-missable', 'MISSABLE', 'can be lost for this playthrough if the moment passes'],
    ['badge-watch', 'WATCH', 'a failable moment — retryable with a manual save, not yet confirmed missable'],
    ['badge-safe', 'AMAN', 'cannot be missed; earnable in free-roam cleanup after the story'],
  ]) {
    const item = document.createElement('p');
    const b = document.createElement('span');
    b.className = `badge ${cls}`;
    b.textContent = label;
    item.append(b, document.createTextNode(` — ${def}`));
    legend.append(item);
  }
  wrap.append(legend);

  const table = document.createElement('table');
  table.className = 'missable-table';
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  for (const h of ['Chapter', 'Mission / moment', 'Trophy', 'When it can be missed', 'Tier']) {
    const th = document.createElement('th');
    th.textContent = h;
    headRow.append(th);
  }
  thead.append(headRow);
  table.append(thead);
  const tbody = document.createElement('tbody');
  for (const t of flagged) {
    const d = MISSABLE_DETAIL[t.id] || { mission: '—', when: t.guide };
    const row = document.createElement('tr');
    row.className = t.missable_status === 'missable' ? 'row-missable' : 'row-watch';

    const chapter = document.createElement('td');
    chapter.textContent = t.stage === 'cleanup' ? 'Cleanup (free-roam)' : (STAGE_LABEL[t.stage] || t.stage);
    const mission = document.createElement('td');
    mission.textContent = d.mission;
    const trophy = document.createElement('td');
    const tName = document.createElement('b');
    tName.textContent = hiddenNow(t) ? 'Hidden trophy' : t.name;
    const tDesc = document.createElement('div');
    tDesc.className = 'missable-desc';
    tDesc.textContent = hiddenNow(t) ? 'Hidden trophy — earn to reveal' : t.description;
    trophy.append(tName, tDesc);
    const when = document.createElement('td');
    when.textContent = d.when + ' ';
    for (const c of t.sources || []) {
      const cite = document.createElement('span');
      cite.className = 'cite';
      cite.textContent = `[${c}]`;
      cite.title = sourceName(c);
      when.append(cite, document.createTextNode(' '));
    }
    if (t.confirm_status === 'unconfirmed') {
      const flag = document.createElement('div');
      flag.className = 'guide-flag';
      flag.textContent = 'Belum dicek — not yet confirmed in the game.';
      when.append(flag);
    }
    const tier = document.createElement('td');
    const tierBadge = document.createElement('span');
    tierBadge.className = `badge ${t.missable_status === 'missable' ? 'badge-missable' : 'badge-watch'}`;
    tierBadge.textContent = t.missable_status === 'missable' ? 'MISSABLE' : 'WATCH';
    tier.append(tierBadge);
    row.append(chapter, mission, trophy, when, tier);
    tbody.append(row);
  }
  table.append(tbody);
  wrap.append(table);

  const safe = document.createElement('p');
  safe.className = 'missable-safe';
  safe.textContent = `The other ${safeCount} trophies are not missable: they can all be earned in free-roam cleanup after the story.`;
  wrap.append(safe);
}

function renderSources() {
  // Audit numbers, counted from trophies.json — never typed in by hand.
  const totalSteps = trophies.reduce((n, t) => n + (t.steps || []).length, 0);
  const totalCites = trophies.reduce((n, t) => n + (t.steps || []).reduce((m, s) => m + (s.cites || []).length, 0), 0);
  const stepsTwoPlus = trophies.reduce(
    (n, t) => n + (t.steps || []).filter((s) => (s.cites || []).length >= 2).length, 0);
  const unconfirmed = trophies.filter((t) => t.confirm_status === 'unconfirmed').length;
  $('audit-strip').innerHTML = '';
  const stats = [
    [`${totalSteps}`, 'cited steps'],
    [`${totalCites}`, 'citations in steps'],
    [`${stepsTwoPlus}`, 'steps backed by 2+ sources'],
    [`${sources.length}`, 'sources, read 20 Nov 2026'],
    [`${unconfirmed}`, 'trophies labelled belum dicek'],
  ];
  for (const [num, label] of stats) {
    const span = document.createElement('span');
    const b = document.createElement('b');
    b.textContent = num;
    span.append(b, document.createTextNode(label));
    $('audit-strip').append(span);
  }

  // Source matrix (M4): source × coverage — guides, steps and citations
  // counted from the guides themselves.
  const matrix = $('source-matrix');
  matrix.replaceChildren();
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  for (const h of ['Source', 'Guides citing it (of 55)', 'Steps citing it', 'Citations', 'Read']) {
    const th = document.createElement('th');
    th.textContent = h;
    headRow.append(th);
  }
  thead.append(headRow);
  matrix.append(thead);
  const tbody = document.createElement('tbody');
  for (const src of sources) {
    const guides = trophies.filter((t) => (t.sources || []).includes(src.id)).length;
    const steps = trophies.reduce(
      (n, t) => n + (t.steps || []).filter((s) => (s.cites || []).includes(src.id)).length, 0);
    const cites = trophies.reduce(
      (n, t) => n + (t.steps || []).reduce(
        (m, s) => m + (s.cites || []).filter((c) => c === src.id).length, 0), 0);
    const row = document.createElement('tr');
    const name = document.createElement('td');
    const b = document.createElement('b');
    b.textContent = `[${src.id}] ${src.name}`;
    const covers = document.createElement('div');
    covers.className = 'matrix-covers';
    covers.textContent = src.covers;
    const url = document.createElement('div');
    url.className = 'matrix-url';
    url.textContent = src.url;
    name.append(b, covers, url);
    const g = document.createElement('td');
    g.textContent = `${guides} / ${trophies.length}`;
    const st = document.createElement('td');
    st.textContent = String(steps);
    const ci = document.createElement('td');
    ci.textContent = String(cites);
    const rd = document.createElement('td');
    rd.textContent = src.read_date;
    row.append(name, g, st, ci, rd);
    tbody.append(row);
  }
  matrix.append(tbody);

  // Per-source list kept below the matrix for the long-form coverage notes.
  const list = $('source-list');
  list.replaceChildren();
  for (const src of sources) {
    const li = document.createElement('li');
    const name = document.createElement('div');
    name.className = 'src-name';
    name.textContent = `[${src.id}] ${src.name}`;
    const meta = document.createElement('div');
    meta.className = 'src-meta';
    const usedBy = trophies.filter((t) => (t.sources || []).includes(src.id)).length;
    meta.textContent = `Read ${src.read_date} · cited by ${usedBy} of ${trophies.length} trophy guides`;
    const covers = document.createElement('div');
    covers.className = 'src-covers';
    covers.textContent = src.covers;
    li.append(name, meta, covers);
    list.append(li);
  }

  // Worked example (M4): one full guide, steps + citations visible, so the
  // Sources tab itself proves what a cited step looks like. Trophy 1 also
  // shows both sides of its disagreement.
  const ex = $('worked-example');
  ex.replaceChildren();
  const h = document.createElement('h2');
  h.textContent = 'Worked example — one guide, cited step by step';
  const intro = document.createElement('p');
  intro.textContent = 'Vice Got a Price! (platinum). Every step below carries its sources; where the sources disagree on time, both sides are shown.';
  ex.append(h, intro, buildGuideDetail(byId.get(1)));
}

// Tabs
for (const btn of document.querySelectorAll('.tabs button')) {
  btn.addEventListener('click', () => {
    for (const b of document.querySelectorAll('.tabs button')) {
      b.classList.toggle('active', b === btn);
      b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
    }
    for (const panel of document.querySelectorAll('.panel')) {
      const show = panel.id === `panel-${btn.dataset.tab}`;
      panel.classList.toggle('active', show);
      panel.hidden = !show;
    }
    if (btn.dataset.tab === 'roadmap') renderRoadmap();
    if (btn.dataset.tab === 'missables') renderMissables();
    if (btn.dataset.tab === 'sources') renderSources();
  });
}

// Toolbar
searchEl.addEventListener('input', renderList);
kindEl.addEventListener('change', renderList);
gradeEl.addEventListener('change', renderList);
statusEl.addEventListener('change', renderList);
spoilerEl.addEventListener('change', () => {
  spoilerOn = spoilerEl.checked;
  localStorage.setItem(SPOILER_KEY, String(spoilerOn));
  renderList();
});

// Export: download the earned trophy ids as JSON.
$('export').addEventListener('click', () => {
  const payload = {
    app: 'Vice City Platinum Log',
    exported_at: new Date().toISOString(),
    earned: [...earned].sort((a, b) => a - b),
  };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  a.download = 'vice-city-platinum-log-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
});

// Import: accept {earned:[ids]} or a bare array of ids (or names, for old exports).
$('import').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const raw = JSON.parse(await file.text());
    const arr = Array.isArray(raw) ? raw : raw.earned;
    if (!Array.isArray(arr)) throw new Error('no earned list');
    const next = new Set();
    for (const v of arr) {
      if (typeof v === 'number' && byId.has(v)) next.add(v);
      else if (typeof v === 'string' && byName.has(v)) next.add(byName.get(v).id);
    }
    earned = next;
    save();
    renderProgress();
    renderList();
  } catch (err) {
    alert(`Import failed: ${err.message}`);
  }
  e.target.value = '';
});

renderProgress();
renderList();
renderRoadmap();
renderMissables();
renderSources();
