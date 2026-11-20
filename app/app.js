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
  if (t.disagree) {
    const p = document.createElement('p');
    p.className = 'guide-flag';
    p.textContent = 'Sources disagree here — see both sides in the Sources tab before you commit.';
    d.append(p);
  }
  const srcs = document.createElement('p');
  srcs.className = 'guide-sources';
  srcs.textContent = `Sources: ${(t.sources || []).map((id) => `[${id}] ${sourceName(id)}`).join(' · ')}`;
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
  time.textContent = s.time_estimate;
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

function renderMissables() {
  const wrap = $('missable-list');
  wrap.replaceChildren();
  const flagged = trophies.filter((t) => t.missable_status !== 'not-missable');
  for (const t of flagged) {
    const card = document.createElement('article');
    card.className = 'missable-card' + (t.missable_status === 'watch' ? ' watch' : '');
    const h3 = document.createElement('h3');
    h3.textContent = hiddenNow(t) ? 'Hidden trophy' : t.name;
    const tier = document.createElement('p');
    tier.innerHTML = '';
    const tierB = document.createElement('b');
    tierB.textContent = t.missable_status === 'missable' ? 'MISSABLE' : 'WATCH';
    tier.append(tierB, document.createTextNode(` · ${t.grade} · ${STAGE_LABEL[t.stage] || t.stage} · ${KIND_LABEL[t.kind] || t.kind}`));
    const desc = document.createElement('p');
    desc.textContent = hiddenNow(t) ? 'Hidden trophy — earn to reveal' : t.description;
    const guide = document.createElement('p');
    guide.textContent = t.guide;
    card.append(h3, tier, desc, guide);
    if (t.confirm_status === 'unconfirmed') {
      const flag = document.createElement('p');
      flag.className = 'guide-flag';
      flag.textContent = 'Belum dicek — not yet confirmed in the game.';
      card.append(flag);
    }
    wrap.append(card);
  }
  const safe = document.createElement('p');
  safe.className = 'missable-safe';
  safe.textContent = `The other ${trophies.length - flagged.length} trophies are not missable: they can all be earned in free-roam cleanup after the story.`;
  wrap.append(safe);
}

function renderSources() {
  const totalSteps = trophies.reduce((n, t) => n + (t.steps || []).length, 0);
  const totalCites = trophies.reduce((n, t) => n + (t.steps || []).reduce((m, s) => m + (s.cites || []).length, 0), 0);
  const twoPlus = trophies.filter((t) => (t.steps || []).some((s) => (s.cites || []).length >= 2)).length;
  const unconfirmed = trophies.filter((t) => t.confirm_status === 'unconfirmed').length;
  $('audit-strip').innerHTML = '';
  const stats = [
    [`${totalSteps}`, 'cited steps'],
    [`${totalCites}`, 'citations in steps'],
    [`${twoPlus}`, 'trophies backed by 2+ sources on at least one step'],
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
