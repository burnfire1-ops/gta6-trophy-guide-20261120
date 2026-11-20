// Vice City Platinum Log — tracker. Local data only: data/trophies.json + data/roadmap.json.
// Progress lives in localStorage; nothing here reaches the network.
const EARNED_KEY = 'vcpl-earned-v1';
const SPOILER_KEY = 'vcpl-spoiler-v1';
const NOTES_KEY = 'vcpl-notes-v1';

const GRADE_ORDER = ['platinum', 'gold', 'silver', 'bronze'];
const STAGE_ORDER = ['prologue', 'chapter 1', 'chapter 2', 'chapter 3', 'chapter 4', 'final', 'cleanup'];
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const stageLabel = (s) => (s === 'final' ? 'Final mission' : cap(s));
const HIDDEN = 'Hidden trophy';
const HIDDEN_REVEAL = 'Hidden trophy — earn to reveal';

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
let notes = {};
try {
  const parsed = JSON.parse(localStorage.getItem(NOTES_KEY) ?? '{}') || {};
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    for (const [k, v] of Object.entries(parsed)) {
      const id = Number(k);
      if (byId.has(id) && typeof v === 'string' && v.trim()) notes[id] = v.trim();
    }
  }
} catch { notes = {}; }
let spoilerOn = localStorage.getItem(SPOILER_KEY) !== 'false';

const $ = (id) => document.getElementById(id);
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

const listEl = $('list');
const searchEl = $('search');
const gradeEl = $('grade');
const statusEl = $('status');
const spoilerEl = $('spoiler');
const hideEarnedEl = $('hide-earned');

// Chips + grade/status options are built here (repetitive markup, not in HTML).
for (const c of ['all', 'Story', 'Strangers', 'Crime', 'Activities', 'Collectibles', 'Money', 'Combat']) {
  const b = el('button', 'chip' + (c === 'all' ? ' active' : ''));
  b.type = 'button';
  b.dataset.category = c;
  b.setAttribute('aria-pressed', c === 'all' ? 'true' : 'false');
  b.textContent = c === 'all' ? 'All' : c;
  $('chip-row').append(b);
}
const fillSelect = (sel, opts) => {
  for (const [v, label] of opts) {
    const o = el('option');
    o.value = v;
    o.textContent = label;
    sel.append(o);
  }
};
fillSelect(gradeEl, [['all', 'All grades'], ['platinum', 'Platinum'], ['gold', 'Gold'], ['silver', 'Silver'], ['bronze', 'Bronze']]);
fillSelect(statusEl, [['all', 'All'], ['earned', 'Earned'], ['remaining', 'Remaining']]);

let activeCategory = 'all';
let secretOnly = false;
let missableOnly = false;

spoilerEl.checked = spoilerOn;

function save() {
  localStorage.setItem(EARNED_KEY, JSON.stringify([...earned].sort((a, b) => a - b)));
}

function saveNotes() {
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}

function hiddenNow(t) {
  return t.hidden && spoilerOn && !earned.has(t.id);
}

// Mask still-hidden trophy names inside data prose while spoilers are on.
function maskHiddenText(str) {
  if (!spoilerOn) return str;
  let out = str;
  for (const t of trophies) {
    if (t.hidden && !earned.has(t.id)) out = out.split(t.name).join(HIDDEN);
  }
  return out;
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
    return barHtml(cap(g), got, ts.length, `dot-${g}`);
  }).join('');
  $('stage-bars').innerHTML = STAGE_ORDER.map((s) => {
    const ts = trophies.filter((t) => t.stage === s);
    const got = ts.filter((t) => earned.has(t.id)).length;
    return barHtml(stageLabel(s), got, ts.length);
  }).join('');

  const next = nextUpTrophy();
  const nextEl = $('next-up');
  nextEl.replaceChildren();
  if (!next) {
    nextEl.textContent = 'All 55 earned — Vice Got a Price! is yours.';
  } else {
    nextEl.append(el('span', 'next-label', 'Next up: '));
    const name = el('b', null, hiddenNow(next) ? HIDDEN : next.name);
// A hidden next trophy leaks nothing — not even stage, grade or description.
    const meta = el('span', null, hiddenNow(next)
      ? ' — earn to reveal'
      : ` — ${stageLabel(next.stage)} · ${next.grade} · ${next.description}`);
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
  if (activeCategory !== 'all' && t.category !== activeCategory) return false;
  if (secretOnly && !t.hidden) return false;
  if (missableOnly && t.missable_status === 'not-missable') return false;
  if (hideEarnedEl.checked && earned.has(t.id)) return false;
  if (gradeEl.value !== 'all' && t.grade !== gradeEl.value) return false;
  if (statusEl.value === 'earned' && !earned.has(t.id)) return false;
  if (statusEl.value === 'remaining' && earned.has(t.id)) return false;
  return true;
}

function badge(text, cls) {
  return el('span', `badge ${cls}`, text);
}

function sourceName(id) {
  const s = sources.find((x) => x.id === id);
  return s ? s.name : `Source ${id}`;
}

function citeEl(c) {
  const cite = el('span', 'cite', `[${c}]`);
  cite.title = sourceName(c);
  return cite;
}

function buildGuideDetail(t) {
  const d = el('div', 'guide-detail');
  d.append(el('p', 'card-guide', t.guide));
// Facts = official-list sources ([1], [2]); Method = union of cites in t.steps.
  const OFFICIAL_IDS = [1, 2];
  const factsIds = (t.sources || []).filter((id) => OFFICIAL_IDS.includes(id));
  let methodIds = [...new Set((t.steps || []).flatMap((s) => s.cites || []))].sort((a, b) => a - b);
  if (!methodIds.length) methodIds = [...(t.sources || [])].sort((a, b) => a - b);
  const shortName = (id) => sourceName(id).split(' — ')[0];
  const srcBlock = el('div', 'guide-srcblock');
  const srcRow = (label, cls, ids) => {
    const p = el('p', `srcblock-row ${cls}`);
    p.append(el('b', null, `${label}: `));
    ids.forEach((id, i) => {
      const s = el('span', 'srcblock-src', `[${id}] ${shortName(id)}`);
      s.title = sourceName(id);
      p.append(s);
      if (i < ids.length - 1) p.append(document.createTextNode(' · '));
    });
    return p;
  };
  if (factsIds.length) srcBlock.append(srcRow('Facts', 'srcblock-facts', factsIds));
  if (methodIds.length) srcBlock.append(srcRow('Method', 'srcblock-method', methodIds));
  d.append(srcBlock);
  if (t.steps && t.steps.length) {
    const ol = el('ol');
    for (const st of t.steps) {
      const li = el('li', null, st.text + ' ');
      for (const c of st.cites || []) li.append(citeEl(c), document.createTextNode(' '));
      ol.append(li);
    }
    d.append(ol);
  }
  if (t.tips && t.tips.length) {
    const ul = el('ul', 'tips');
    for (const tip of t.tips) ul.append(el('li', null, tip));
    d.append(ul);
  }
  if (t.confirm_status === 'unconfirmed') {
    d.append(el('p', 'guide-flag', 'Belum dicek — this step is our own advice from the official description, not yet checked in the game.'));
  }
  if (t.disagree && DISAGREE[t.id]) {
    const box = el('div', 'disagree-box');
    box.append(el('p', 'disagree-head', 'Sources disagree — both sides:'));
    for (const side of DISAGREE[t.id]) {
      const p = el('p', 'disagree-side');
      p.append(el('b', null, `${side.side}: `), document.createTextNode(`${side.text} `));
      for (const c of side.cites) p.append(citeEl(c), document.createTextNode(' '));
      box.append(p);
    }
    box.append(el('p', 'disagree-note', 'Treat both as rough ranges, not promises.'));
    d.append(box);
  }
// Explicit Save, no autosave; clearing + saving deletes the note.
  const notesBox = el('div', 'guide-notes');
  const notesArea = el('textarea', 'notes-input');
  notesArea.rows = 2;
  notesArea.placeholder = 'Your own note for this trophy — strategy, loadout, where you got stuck…';
  notesArea.value = notes[t.id] || '';
  notesArea.setAttribute('aria-label', `My notes for ${t.name}`);
  const notesRow = el('div', 'notes-row');
  const notesSave = el('button', 'notes-save', 'Save note');
  notesSave.type = 'button';
  const notesStatus = el('span', 'notes-status', notes[t.id] ? 'Note saved' : '');
  notesSave.addEventListener('click', () => {
    const val = notesArea.value.trim();
    if (val) notes[t.id] = val;
    else delete notes[t.id];
    saveNotes();
    notesStatus.textContent = val ? 'Note saved' : 'Note deleted';
  });
  notesRow.append(notesSave, notesStatus);
  notesBox.append(el('label', 'notes-label', 'My notes'), notesArea, notesRow);
  d.append(notesBox);
// Sources as plain text, never links: the app stays offline.
  d.append(el('p', 'guide-sources', `Sources: ${(t.sources || []).map((id) => {
    const s = sources.find((x) => x.id === id);
    return s ? `[${id}] ${s.name} — ${s.url}` : `[${id}]`;
  }).join(' · ')}`));
  return d;
}

function renderList() {
  const shown = trophies.filter(matchesFilters);
  listEl.replaceChildren();
  $('list-count').textContent = `Showing ${shown.length} of ${trophies.length} trophies · ${earned.size} earned`;
  if (!shown.length) {
    listEl.append(el('p', 'empty', 'No trophies match these filters.'));
    return;
  }
  for (const t of shown) {
    const card = el('article', 'card' + (earned.has(t.id) ? ' earned' : '') + (hiddenNow(t) ? ' card-hidden' : ''));
    card.dataset.trophyId = t.id;

    const box = el('input');
    box.type = 'checkbox';
    box.checked = earned.has(t.id);
    // The aria-label must not leak the real name while hidden.
    box.setAttribute('aria-label', `Mark ${hiddenNow(t) ? HIDDEN : t.name} as earned`);
    box.addEventListener('change', () => {
      if (box.checked) earned.add(t.id);
      else earned.delete(t.id);
      save();
      renderProgress();
      renderList();
    });
    card.append(box);

    const body = el('div', 'card-body');
    const head = el('div', 'card-head');
    head.append(el('h2', 'card-name' + (hiddenNow(t) ? ' hidden-name' : ''), hiddenNow(t) ? HIDDEN : t.name));
// While hidden, only the neutral "Hidden" badge shows — the rest leak the trophy.
    if (hiddenNow(t)) {
      head.append(badge('Hidden', 'badge-hidden'));
    } else {
      head.append(badge(t.grade, `badge-${t.grade}`));
      head.append(badge(cap(t.kind), 'badge-kind'));
      head.append(badge(stageLabel(t.stage), 'badge-stage'));
      if (t.missable_status === 'missable') head.append(badge('Missable', 'badge-missable'));
      else if (t.missable_status === 'watch') head.append(badge('Watch', 'badge-watch'));
      if (t.confirm_status === 'unconfirmed') head.append(badge('Belum dicek', 'badge-unconfirmed'));
      if (t.hidden) head.append(badge('Hidden', 'badge-hidden'));
    }
    body.append(head);

    body.append(el('p', 'card-desc' + (hiddenNow(t) ? ' hidden-desc' : ''), hiddenNow(t) ? HIDDEN_REVEAL : t.description));

    if (!hiddenNow(t)) {
      const toggle = el('button', 'card-toggle', 'Guide ▸');
      toggle.type = 'button';
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
  const summary = $('roadmap-summary');
  summary.replaceChildren();
  summary.append(
    el('h2', null, roadmapDoc.title),
    el('p', null, `${s.total_trophies} trophies · ${s.grades.platinum} platinum, ${s.grades.gold} gold, ${s.grades.silver} silver, ${s.grades.bronze} bronze · ${s.hidden} hidden · ${s.online_trophies} online trophies · ${s.playthroughs} playthrough`),
    el('p', null, `Time estimate (cited range, not a promise): ${s.time_estimate}`),
    el('p', null, `Difficulty: ${s.difficulty}`),
  );
  const ul = el('ul');
  for (const r of s.rules) ul.append(el('li', null, maskHiddenText(r)));
  summary.append(ul);

  const stagesEl = $('roadmap-stages');
  stagesEl.replaceChildren();
  const saveRule = (s.rules || []).find((r) => r.includes('manual save'));
  for (const st of roadmapDoc.stages) {
    const li = el('li');
    const h3 = el('h3');
    h3.append(el('span', 'stage-n', `Stage ${st.n}`), document.createTextNode(st.title));
    li.append(h3);
    li.append(el('p', 'focus', maskHiddenText(st.focus)));
    const tr = el('p', 'stage-trophies');
    const earnedIn = st.trophies.filter((id) => earned.has(id)).length;
    tr.append(el('b', null, `${earnedIn}/${st.trophies.length} earned: `));
    st.trophies.forEach((id, i) => {
      const t = byId.get(id);
      if (i) tr.append(document.createTextNode(', '));
      if (t && hiddenNow(t)) tr.append(el('span', 'hidden-name', HIDDEN));
      else tr.append(document.createTextNode(t?.name ?? id));
    });
    li.append(tr);
    if (saveRule && st.title.startsWith('Chapter')) {
      li.append(el('p', 'save-note', `Manual save: ${saveRule}`));
    }
    if (st.notes && st.notes.length) {
      const notes = el('ul');
      for (const note of st.notes) notes.append(el('li', null, maskHiddenText(note)));
      li.append(notes);
    }
    if (st.warning) li.append(el('p', 'warning', maskHiddenText(st.warning)));
    stagesEl.append(li);
  }
}

const MISSABLE = {
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

const DISAGREE = {
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

  wrap.append(el('p', 'missable-counts', `${missableCount} missable · ${watchCount} watch · ${safeCount} safe — counted from trophies.json, not guessed.`));

  const legend = el('div', 'missable-legend');
  for (const [cls, label, def] of [
    ['badge-missable', 'MISSABLE', 'can be lost for this playthrough if the moment passes'],
    ['badge-watch', 'WATCH', 'a failable moment — retryable with a manual save, not yet confirmed missable'],
    ['badge-safe', 'AMAN', 'cannot be missed; earnable in free-roam cleanup after the story'],
  ]) {
    const item = el('p');
    item.append(el('span', `badge ${cls}`, label), document.createTextNode(` — ${def}`));
    legend.append(item);
  }
  wrap.append(legend);

  const table = el('table', 'missable-table');
  const thead = el('thead');
  const headRow = el('tr');
  for (const h of ['Chapter', 'Mission / moment', 'Trophy', 'When it can be missed', 'Tier']) {
    headRow.append(el('th', null, h));
  }
  thead.append(headRow);
  table.append(thead);
  const tbody = el('tbody');
  for (const t of flagged) {
    const d = MISSABLE[t.id] || { mission: '—', when: t.guide };
// Hidden flagged trophy (id 48): every cell masked, the row stays so counts stay exact.
    const hid = hiddenNow(t);
    const row = el('tr', (t.missable_status === 'missable' ? 'row-missable' : 'row-watch') + (hid ? ' row-hidden' : ''));

    row.append(el('td', null, hid ? '—' : (t.stage === 'cleanup' ? 'Cleanup (free-roam)' : (stageLabel(t.stage)))));
    row.append(el('td', hid ? 'hidden-cell' : null, hid ? HIDDEN_REVEAL : d.mission));
    const trophy = el('td');
    trophy.append(
      el('b', null, hiddenNow(t) ? HIDDEN : t.name),
      el('div', 'missable-desc', hiddenNow(t) ? HIDDEN_REVEAL : t.description),
    );
    row.append(trophy);
    const when = el('td', hid ? 'hidden-cell' : null);
    if (hid) {
      when.textContent = HIDDEN_REVEAL;
    } else {
      when.textContent = d.when + ' ';
      for (const c of t.sources || []) when.append(citeEl(c), document.createTextNode(' '));
      if (t.confirm_status === 'unconfirmed') {
        when.append(el('div', 'guide-flag', 'Belum dicek — not yet confirmed in the game.'));
      }
    }
    row.append(when);
    const tier = el('td');
    tier.append(el('span',
      hid ? 'badge badge-hidden' : `badge ${t.missable_status === 'missable' ? 'badge-missable' : 'badge-watch'}`,
      hid ? 'Hidden' : (t.missable_status === 'missable' ? 'MISSABLE' : 'WATCH')));
    row.append(tier);
    tbody.append(row);
  }
  table.append(tbody);
  wrap.append(table);

  wrap.append(el('p', 'missable-safe', `The other ${safeCount} trophies are not missable: they can all be earned in free-roam cleanup after the story.`));
}

function renderSources() {
  const totalSteps = trophies.reduce((n, t) => n + (t.steps || []).length, 0);
  const totalCites = trophies.reduce((n, t) => n + (t.steps || []).reduce((m, s) => m + (s.cites || []).length, 0), 0);
  const stepsTwoPlus = trophies.reduce(
    (n, t) => n + (t.steps || []).filter((s) => (s.cites || []).length >= 2).length, 0);
  const unconfirmed = trophies.filter((t) => t.confirm_status === 'unconfirmed').length;
  const strip = $('audit-strip');
  strip.replaceChildren();
  for (const [num, label] of [
    [`${totalSteps}`, 'cited steps'],
    [`${totalCites}`, 'citations in steps'],
    [`${stepsTwoPlus}`, 'steps backed by 2+ sources'],
    [`${sources.length}`, 'sources, read 20 Nov 2026'],
    [`${unconfirmed}`, 'trophies labelled belum dicek'],
  ]) {
    const span = el('span');
    span.append(el('b', null, num), document.createTextNode(label));
    strip.append(span);
  }

  const matrix = $('source-matrix');
  matrix.replaceChildren();
  const thead = el('thead');
  const headRow = el('tr');
  for (const h of ['Source', 'Guides citing it (of 55)', 'Steps citing it', 'Citations', 'Read']) {
    headRow.append(el('th', null, h));
  }
  thead.append(headRow);
  matrix.append(thead);
  const tbody = el('tbody');
  for (const src of sources) {
    let guides = 0, steps = 0, cites = 0;
    for (const t of trophies) {
      if ((t.sources || []).includes(src.id)) guides++;
      for (const s of t.steps || []) {
        if ((s.cites || []).includes(src.id)) {
          steps++;
          cites += s.cites.filter((c) => c === src.id).length;
        }
      }
    }
    const row = el('tr');
    const name = el('td');
    name.append(
      el('b', null, `[${src.id}] ${src.name}`),
      // Source 5's covers blurb names hidden id 47 — mask it while spoilers are on.
      el('div', 'matrix-covers', maskHiddenText(src.covers)),
      el('div', 'matrix-url', src.url),
    );
    row.append(
      name,
      el('td', null, `${guides} / ${trophies.length}`),
      el('td', null, String(steps)),
      el('td', null, String(cites)),
      el('td', null, src.read_date),
    );
    tbody.append(row);
  }
  matrix.append(tbody);

  const list = $('source-list');
  list.replaceChildren();
  for (const src of sources) {
    const li = el('li');
    const usedBy = trophies.filter((t) => (t.sources || []).includes(src.id)).length;
    li.append(
      el('div', 'src-name', `[${src.id}] ${src.name}`),
      el('div', 'src-meta', `Read ${src.read_date} · cited by ${usedBy} of ${trophies.length} trophy guides`),
      el('div', 'src-covers', maskHiddenText(src.covers)),
    );
    list.append(li);
  }

  const ex = $('worked-example');
  ex.replaceChildren();
  ex.append(
    el('h2', null, 'Worked example — one guide, cited step by step'),
    el('p', null, 'Vice Got a Price! (platinum). Every step below carries its sources; where the sources disagree on time, both sides are shown.'),
    buildGuideDetail(byId.get(1)),
  );
}

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

searchEl.addEventListener('input', renderList);
for (const chip of document.querySelectorAll('#chip-row .chip')) {
  chip.addEventListener('click', () => {
    activeCategory = chip.dataset.category;
    for (const c of document.querySelectorAll('#chip-row .chip')) {
      const on = c === chip;
      c.classList.toggle('active', on);
      c.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    renderList();
  });
}
hideEarnedEl.addEventListener('change', renderList);
for (const [btnId, get, set] of [
  ['flag-secret', () => secretOnly, (v) => { secretOnly = v; }],
  ['flag-missable', () => missableOnly, (v) => { missableOnly = v; }],
]) {
  const btn = document.getElementById(btnId);
  btn.addEventListener('click', () => {
    set(!get());
    btn.classList.toggle('active', get());
    btn.setAttribute('aria-pressed', get() ? 'true' : 'false');
    renderList();
  });
}
gradeEl.addEventListener('change', renderList);
statusEl.addEventListener('change', renderList);
spoilerEl.addEventListener('change', () => {
  spoilerOn = spoilerEl.checked;
  localStorage.setItem(SPOILER_KEY, String(spoilerOn));
// Spoiler state feeds every tab — re-render all of them on toggle.
  renderProgress();
  renderList();
  renderRoadmap();
  renderMissables();
  renderSources();
});

$('export').addEventListener('click', () => {
  const payload = {
    app: 'Vice City Platinum Log',
    exported_at: new Date().toISOString(),
    earned: [...earned].sort((a, b) => a - b),
    notes,
  };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  a.download = 'vice-city-platinum-log-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
});

// Import {earned, notes} or a bare id/name array; missing notes leave current notes alone.
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
    if (raw && typeof raw === 'object' && !Array.isArray(raw)
      && raw.notes && typeof raw.notes === 'object' && !Array.isArray(raw.notes)) {
      const nextNotes = {};
      for (const [k, v] of Object.entries(raw.notes)) {
        const id = Number(k);
        if (byId.has(id) && typeof v === 'string' && v.trim()) nextNotes[id] = v.trim();
      }
      notes = nextNotes;
      saveNotes();
    }
    renderProgress();
    renderList();
    renderSources();
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
