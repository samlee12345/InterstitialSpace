/* Notes and Discussions: inline annotation tool, ported from the portfolio's
 * components/notes-tool.js, with a second kind of annotation.
 * Note (N): your own review notes. Discussion (D): points to raise with the team.
 * Each kind has its own colour, numbering, copy and clear.
 * Press N or D (or "Notes" in the Demo bar) to start. Notes are saved in this browser,
 * one list per page, and shown as numbered markers plus cards in the right margin.
 * Changes from the original, for a React single-page app:
 *  - the page key follows the in-app route (setNotesPage), not the file name
 *  - markers and cards re-attach when React redraws the page (MutationObserver)
 *  - once started, the toolbar stays on after reloads until you turn it off
 *  - "Copy all" exports notes from every page, labelled by page
 */
import './notes-tool.css';

const PREFIX = 'isp-notes:';
const ACTIVE_KEY = 'isp-notes-active';
const HIDDEN_KEY = 'isp-notes-hidden';

const store = {
  get(k, fallback) { try { const v = localStorage.getItem(k); return v === null ? fallback : JSON.parse(v); } catch { return fallback; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage full or blocked: notes last this visit */ } },
};

export const KINDS = {
  note: { label: 'Note', plural: 'Notes', key: 'n' },
  discussion: { label: 'Discussion', plural: 'Discussions', key: 'd' },
};
const kindOf = (n) => (n.kind === 'discussion' ? 'discussion' : 'note');

let page = '/';
let addKind = 'note';
let notes = [];
let isActive = false;
let isSelectMode = false;
let isHidden = store.get(HIDDEN_KEY, false);
let hovered = null;
let frame = null;
let observer = null;
let started = false;

const pageKey = () => PREFIX + page;
const loadNotes = () => { notes = store.get(pageKey(), []); };
const announce = () => window.dispatchEvent(new CustomEvent('isp-notes-change'));
const saveNotes = () => { store.set(pageKey(), notes); announce(); };

// A discussion counts as discussed once it has at least one response.
export const isDiscussed = (n) => kindOf(n) === 'discussion' && (n.replies || []).length > 0;

// Counts for every page key by kind, e.g. { '/browse': { note: 2, discussion: 3, discussed: 1 } }.
export function notesCounts() {
  const out = {};
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (!k.startsWith(PREFIX)) continue;
      const c = { note: 0, discussion: 0, discussed: 0 };
      (store.get(k, []) || []).forEach((n) => { c[kindOf(n)] += 1; if (isDiscussed(n)) c.discussed += 1; });
      out[k.slice(PREFIX.length)] = c;
    }
  } catch { /* ignore */ }
  return out;
}

// ── Element fingerprint: nearest labelled section + tag + start of its text ──
function fingerprint(el) {
  const screen = el.closest('[data-screen-label]');
  const screenId = screen ? screen.dataset.screenLabel : '';
  const text = (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80);
  return { screenId, text, tag: el.tagName.toLowerCase() };
}

function findByFingerprint(fp) {
  const root = document.getElementById('root') || document.body;
  let container = root;
  if (fp.screenId) container = root.querySelector(`[data-screen-label="${CSS.escape(fp.screenId)}"]`) || root;
  const search = fp.text.trim().slice(0, 50);
  if (!search) return null;
  return Array.from(container.querySelectorAll(fp.tag)).find(
    (el) => !el.closest('[data-note-tool]') && (el.textContent || '').replace(/\s+/g, ' ').trim().startsWith(search),
  ) || null;
}

// ── Public API ───────────────────────────────────────────────────────────────
export function startNotesTool() {
  if (started) return;
  started = true;
  document.addEventListener('keydown', onGlobalKey);
  if (store.get(ACTIVE_KEY, false)) activate();
}

export function setNotesPage(path) {
  page = path || '/';
  exitSelectMode();
  closePopover();
  loadNotes();
  if (isActive) rerenderAll();
}

export function activateNotes() {
  if (!isActive) activate();
  else if (isHidden) toggleHide();
}

function activate() {
  isActive = true;
  isHidden = false;
  store.set(ACTIVE_KEY, true);
  store.set(HIDDEN_KEY, false);
  loadNotes();
  renderToolbar();
  rerenderAll();
  document.addEventListener('scroll', schedule, { passive: true, capture: true });
  window.addEventListener('resize', schedule);
  const root = document.getElementById('root');
  if (root && !observer) {
    observer = new MutationObserver(() => schedule(true));
    observer.observe(root, { childList: true, subtree: true, characterData: true });
  }
  announce();
}

function deactivate() {
  exitSelectMode();
  closePopover();
  isActive = false;
  store.set(ACTIVE_KEY, false);
  document.removeEventListener('scroll', schedule, { capture: true });
  window.removeEventListener('resize', schedule);
  if (observer) { observer.disconnect(); observer = null; }
  ['nt-toolbar', 'nt-rail'].forEach((id) => document.getElementById(id)?.remove());
  document.querySelectorAll('.nt-marker').forEach((m) => m.remove());
  announce();
}

export const notesActive = () => isActive;

// ── Redraw scheduling ────────────────────────────────────────────────────────
let needsBadges = false;
function schedule(redrawBadges) {
  if (redrawBadges === true) needsBadges = true;
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = null;
    if (needsBadges) { needsBadges = false; renderBadges(); }
    updatePositions();
  });
}

// ── Toolbar ──────────────────────────────────────────────────────────────────
function renderToolbar() {
  document.getElementById('nt-toolbar')?.remove();
  const tb = el('div', 'nt-toolbar');
  tb.id = 'nt-toolbar';
  tb.setAttribute('data-note-tool', '');
  tb.setAttribute('role', 'region');
  tb.setAttribute('aria-label', 'Notes');
  document.body.appendChild(tb);
  refreshToolbar();
}

function countOtherPages() {
  let n = 0;
  Object.entries(notesCounts()).forEach(([k, c]) => { if (PREFIX + k !== pageKey()) n += c.note + c.discussion; });
  return n;
}

function refreshToolbar() {
  const tb = document.getElementById('nt-toolbar');
  if (!tb) return;
  tb.innerHTML = '';
  const counts = { note: 0, discussion: 0, discussed: 0 };
  notes.forEach((n) => { counts[kindOf(n)] += 1; if (isDiscussed(n)) counts.discussed += 1; });
  if (isHidden) {
    tb.appendChild(button(`Show notes (${counts.note}) and discussions (${counts.discussion})`, 'nt-btn nt-secondary', toggleHide));
    return;
  }
  // One group per kind: count, add, and Copy / Clear menus (this page or all pages).
  const all = { note: 0, discussion: 0, discussed: 0 };
  Object.values(notesCounts()).forEach((c) => { all.note += c.note; all.discussion += c.discussion; all.discussed += c.discussed; });
  Object.entries(KINDS).forEach(([kind, k]) => {
    const g = el('div', `nt-group nt-kind-${kind}`);
    g.setAttribute('role', 'group');
    g.setAttribute('aria-label', k.plural);
    const count = el('span', 'nt-count');
    const isD = kind === 'discussion';
    count.textContent = isD ? `${counts.discussed}/${counts.discussion}` : counts[kind];
    count.setAttribute('aria-label', isD ? `${counts.discussed} of ${counts.discussion} discussions on this page have a response` : `${counts[kind]} notes on this page`);
    const label = el('span', 'nt-label');
    const allText = isD ? `${all.discussed}/${all.discussion} discussed on all pages` : `${all[kind]} on all pages`;
    label.textContent = all[kind] > counts[kind] || (isD && all.discussed !== counts.discussed) ? `${k.plural} (${allText})` : k.plural;
    const adding = isSelectMode && addKind === kind;
    g.append(count, label, button(adding ? 'Cancel' : `Add ${k.label.toLowerCase()}`, `nt-btn${adding ? ' nt-active' : ''}`, () => toggleSelectMode(kind), k.key.toUpperCase()));
    const plural = k.plural.toLowerCase();
    if (all[kind]) {
      g.appendChild(menu(`Copy ${plural}`, 'nt-btn nt-secondary', [
        [`This page (${counts[kind]})`, counts[kind] > 0, (btn) => copyKind(btn, kind)],
        [`All pages (${all[kind]})`, true, (btn) => copyKindAll(btn, kind)],
      ]));
      g.appendChild(menu(`Clear ${plural}`, 'nt-btn nt-danger', [
        [`This page (${counts[kind]})`, counts[kind] > 0, () => clearKind(kind)],
        [`All pages (${all[kind]})`, true, () => clearKindAll(kind)],
      ]));
    }
    tb.appendChild(g);
  });
  const rest = el('div', 'nt-group');
  if (all.note + all.discussion) {
    rest.appendChild(button('Copy everything', 'nt-btn nt-secondary', (e) => copyAll(e.currentTarget)));
    rest.appendChild(button('Clear everything', 'nt-btn nt-danger', clearEverything));
  }
  // Demo helper: fill every empty field on the page (or the open dialog) so you can click Next.
  rest.appendChild(button('Fill fields', 'nt-btn nt-secondary', (e) => fillFields(e.currentTarget)));
  rest.appendChild(button('Hide', 'nt-btn nt-secondary', toggleHide));
  rest.appendChild(button('Turn off', 'nt-btn nt-secondary', deactivate));
  tb.appendChild(rest);
  if (isSelectMode) {
    const hint = el('span', 'nt-hint');
    hint.textContent = `Click any text to attach a ${KINDS[addKind].label.toLowerCase()}. Esc to cancel.`;
    tb.appendChild(hint);
  }
}

// ── Fill fields: put sample answers in every empty field so the demo moves fast ──
const SAMPLE = [
  [/e-?mail/i, 'you@example.com'], [/linkedin/i, 'linkedin.com/in/sample'], [/instagram/i, '@sample'], [/website|link|url/i, 'example.com'],
  [/city/i, 'Jaipur'], [/country/i, 'India'], [/postal|zip/i, '302001'], [/phone/i, '+91 98765 43210'],
  [/licen[cs]e|register|number/i, 'AR-12345 (placeholder)'], [/price|amount|prize/i, '100'],
  [/name|title/i, 'Sample name (filled for the demo)'],
];
function labelOf(f) {
  const own = f.id && document.querySelector(`label[for="${CSS.escape(f.id)}"]`);
  return [f.getAttribute('aria-label'), own?.textContent, f.closest('label')?.textContent, f.closest('.field')?.querySelector('label, .label')?.textContent, f.placeholder, f.name].filter(Boolean).join(' ');
}
function setNative(f, value) {
  const proto = f instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : f instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(f, value);
  f.dispatchEvent(new Event('input', { bubbles: true }));
  f.dispatchEvent(new Event('change', { bubbles: true }));
}
const visible = (x) => x.offsetParent !== null && !x.disabled && !x.readOnly && !x.closest('[id^="nt-"], .nt-popover, .demo-drawer, .demo-panel');
function fillFields(btn) {
  const dialogs = [...document.querySelectorAll('[role="dialog"], dialog[open]')].filter((d) => d.offsetParent !== null && !d.closest('[id^="nt-"]'));
  const root = dialogs[dialogs.length - 1] || document.querySelector('main') || document.body;
  let n = 0;
  // Buttons the app already offers for sample input.
  root.querySelectorAll('button').forEach((b) => {
    if (visible(b) && /^(fill test card|use sample files)$/i.test(b.textContent.trim())) { b.click(); n += 1; }
  });
  if (!root.querySelector('.photo-tile')) { const add = [...root.querySelectorAll('.photo-add')].find(visible); if (add) { add.click(); n += 1; } }
  root.querySelectorAll('input, textarea, select').forEach((f) => {
    if (!visible(f)) return;
    const type = (f.type || '').toLowerCase();
    if (f instanceof HTMLSelectElement) {
      const cur = f.options[f.selectedIndex];
      if (cur && cur.value && !cur.disabled) return;
      const opt = [...f.options].find((o) => o.value && !o.disabled);
      if (opt) { setNative(f, opt.value); n += 1; }
      return;
    }
    if (type === 'radio') {
      const group = f.name ? root.querySelectorAll(`input[type="radio"][name="${CSS.escape(f.name)}"]`) : [f];
      if (![...group].some((r) => r.checked) && f === [...group].find(visible)) { f.click(); n += 1; }
      return;
    }
    if (type === 'checkbox') {
      if (!f.checked && (f.required || /agree|i have read|i made|i confirm|i own/i.test(labelOf(f)))) { f.click(); n += 1; }
      return;
    }
    if (['file', 'hidden', 'search', 'submit', 'button', 'range', 'color'].includes(type) || f.value) return;
    const label = labelOf(f);
    let v = (SAMPLE.find(([re]) => re.test(label)) || [])[1];
    if (type === 'email') v = 'you@example.com';
    else if (type === 'url') v = 'https://example.com';
    else if (type === 'number') v = f.min || '1';
    else if (type === 'date') v = new Date().toISOString().slice(0, 10);
    else if (type === 'password') v = 'demo-password-1';
    else if (!v) v = f instanceof HTMLTextAreaElement ? 'Sample answer filled in for the demo. It describes the space and how it is used.' : 'Sample answer';
    setNative(f, v);
    n += 1;
  });
  const old = btn.textContent;
  btn.textContent = n ? `Filled ${n}` : 'Nothing to fill';
  setTimeout(() => { btn.textContent = old; }, 1500);
}

// A button that opens a short list of choices above it. items: [label, enabled, onPick(button)].
function menu(text, cls, items) {
  const wrap = el('div', 'nt-menu-wrap');
  const trigger = button(`${text} ▾`, cls, () => {
    const open = wrap.querySelector('.nt-menu');
    document.querySelectorAll('.nt-menu').forEach((m) => m.remove());
    document.querySelectorAll('.nt-menu-wrap > button[aria-expanded="true"]').forEach((b) => b.setAttribute('aria-expanded', 'false'));
    if (open) return;
    const list = el('div', 'nt-menu');
    items.forEach(([label, enabled, onPick]) => {
      const item = button(label, 'nt-menu-item', () => { onPick(trigger); list.remove(); trigger.setAttribute('aria-expanded', 'false'); });
      item.disabled = !enabled;
      list.appendChild(item);
    });
    wrap.appendChild(list);
    trigger.setAttribute('aria-expanded', 'true');
    list.querySelector('button:not(:disabled)')?.focus();
    const close = (e) => {
      if (e.type === 'keydown' && e.key !== 'Escape') return;
      if (e.type === 'mousedown' && wrap.contains(e.target)) return;
      list.remove();
      trigger.setAttribute('aria-expanded', 'false');
      if (e.type === 'keydown') trigger.focus();
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
    setTimeout(() => { document.addEventListener('mousedown', close); document.addEventListener('keydown', close); }, 0);
  });
  trigger.setAttribute('aria-haspopup', 'true');
  trigger.setAttribute('aria-expanded', 'false');
  wrap.appendChild(trigger);
  return wrap;
}

function button(text, cls, onClick, shortcut) {
  const b = el('button', cls);
  b.type = 'button';
  b.textContent = text;
  if (shortcut) b.setAttribute('aria-keyshortcuts', shortcut);
  b.addEventListener('click', onClick);
  return b;
}

// ── Keyboard: N starts the tool, then toggles "add note" ─────────────────────
function onGlobalKey(e) {
  const tag = (e.target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const kind = e.key === 'n' ? 'note' : e.key === 'd' ? 'discussion' : null;
  if (!kind) return;
  e.preventDefault();
  if (!isActive) { activate(); addKind = kind; refreshToolbar(); return; }
  if (isHidden) toggleHide();
  toggleSelectMode(kind);
}

// ── Select mode ──────────────────────────────────────────────────────────────
function toggleSelectMode(kind = addKind) {
  if (isSelectMode && kind === addKind) { exitSelectMode(); refreshToolbar(); return; }
  if (isSelectMode) exitSelectMode();
  addKind = kind;
  isSelectMode = true;
  document.body.dataset.ntKind = kind;
  document.body.classList.add('nt-select-mode');
  document.addEventListener('mouseover', onHover);
  document.addEventListener('mouseout', onOut);
  document.addEventListener('click', onSelect, true);
  document.addEventListener('keydown', onEsc);
  refreshToolbar();
}

function exitSelectMode() {
  isSelectMode = false;
  document.body.classList.remove('nt-select-mode');
  delete document.body.dataset.ntKind;
  document.removeEventListener('mouseover', onHover);
  document.removeEventListener('mouseout', onOut);
  document.removeEventListener('click', onSelect, true);
  document.removeEventListener('keydown', onEsc);
  if (hovered) { hovered.classList.remove('nt-hovered'); hovered = null; }
}

function onHover(e) {
  if (!isSelectable(e.target)) return;
  if (hovered) hovered.classList.remove('nt-hovered');
  hovered = e.target;
  hovered.classList.add('nt-hovered');
}
function onOut() { if (hovered) { hovered.classList.remove('nt-hovered'); hovered = null; } }
function onEsc(e) { if (e.key === 'Escape') { exitSelectMode(); closePopover(); refreshToolbar(); } }

function onSelect(e) {
  if (e.target.closest('[data-note-tool]')) return;
  // Swallow the click so the prototype doesn't navigate or submit.
  e.preventDefault();
  e.stopPropagation();
  if (!isSelectable(e.target)) return;
  const target = e.target;
  exitSelectMode();
  refreshToolbar();
  openAddPopover(target, e.clientX, e.clientY);
}

function isSelectable(node) {
  if (!node || node === document.body || node === document.documentElement || !node.closest) return false;
  if (node.closest('[data-note-tool]') || !node.closest('#root')) return false;
  const skip = ['html', 'body', 'script', 'style', 'head', 'svg', 'path', 'ul', 'ol'];
  if (skip.includes(node.tagName.toLowerCase())) return false;
  return (node.textContent || '').trim().length > 2;
}

// ── Add popover ──────────────────────────────────────────────────────────────
function openAddPopover(targetEl, x, y) {
  closePopover();
  const pop = el('div', 'nt-popover');
  pop.setAttribute('data-note-tool', '');
  pop.setAttribute('role', 'dialog');
  const kind = addKind;
  const k = KINDS[kind];
  pop.classList.add(`nt-kind-${kind}`);
  pop.setAttribute('aria-label', `Add a ${k.label.toLowerCase()}`);
  pop.style.left = `${Math.max(8, Math.min(x, window.innerWidth - 300))}px`;
  pop.style.top = `${Math.max(8, Math.min(y + 12, window.innerHeight - 150))}px`;

  const ta = el('textarea', 'nt-popover-input');
  ta.rows = 3;
  ta.placeholder = kind === 'discussion' ? 'What should the team discuss?' : 'Your note';
  ta.setAttribute('aria-label', k.label);
  const title = el('p', 'nt-popover-title');
  title.textContent = `New ${k.label.toLowerCase()}`;
  const hint = el('p', 'nt-popover-hint');
  hint.textContent = '⌘↵ to save, Esc to cancel';
  const actions = el('div', 'nt-popover-actions');
  const doSave = () => {
    const text = ta.value.trim();
    if (text) {
      notes.push({ id: uid(), kind, fp: fingerprint(targetEl), text });
      saveNotes();
      rerenderAll();
    }
    closePopover();
  };
  actions.append(button('Cancel', 'nt-btn nt-ghost', closePopover), button(`Save ${k.label.toLowerCase()}`, 'nt-btn', doSave));
  pop.append(title, ta, hint, actions);
  document.body.appendChild(pop);
  ta.focus();
  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) doSave();
    if (e.key === 'Escape') closePopover();
  });
  setTimeout(() => {
    document.addEventListener('mousedown', function outside(e) {
      if (!pop.contains(e.target)) { closePopover(); document.removeEventListener('mousedown', outside); }
    });
  }, 0);
}

function closePopover() { document.querySelectorAll('.nt-popover').forEach((p) => p.remove()); }

// ── Rail of cards in the right margin ────────────────────────────────────────
function renderRail() {
  document.getElementById('nt-rail')?.remove();
  if (!isActive || isHidden || notes.length === 0) return;
  const rail = el('div', 'nt-rail');
  rail.id = 'nt-rail';
  rail.setAttribute('data-note-tool', '');
  document.body.appendChild(rail);

  const numbers = numberByKind();
  notes.forEach((note) => {
    const i = numbers[note.id] - 1;
    const kind = kindOf(note);
    const card = el('div', `nt-card nt-kind-${kind}`);
    card.dataset.noteId = note.id;
    const badge = el('span', 'nt-badge');
    badge.textContent = i + 1;
    badge.setAttribute('aria-label', `${KINDS[kind].label} ${i + 1}`);
    const body = el('div', 'nt-card-body');
    const text = el('span', 'nt-card-text');
    text.textContent = note.text;
    text.title = 'Double-click to edit';
    const del = el('button', 'nt-delete');
    del.type = 'button';
    del.textContent = '×';
    del.setAttribute('aria-label', `Delete ${KINDS[kind].label.toLowerCase()} ${i + 1}`);
    body.append(text, del);
    const col = el('div', 'nt-card-col');
    col.appendChild(body);
    if (kind === 'discussion') col.appendChild(renderReplies(note, i + 1));
    card.classList.toggle('nt-discussed', isDiscussed(note));
    card.append(badge, col);
    rail.appendChild(card);
    del.addEventListener('click', (e) => { e.stopPropagation(); deleteNote(note.id); });
    text.addEventListener('dblclick', (e) => { e.stopPropagation(); startEdit(note, text); });
    card.addEventListener('click', (e) => {
      if (e.target.closest('button, textarea')) return;
      findByFingerprint(note.fp)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  });
}

// Responses under a discussion. Any response marks it as discussed.
function renderReplies(note, number) {
  const wrap = el('div', 'nt-replies');
  const list = note.replies || [];
  if (list.length) {
    const ul = el('ul', 'nt-reply-list');
    ul.setAttribute('aria-label', `Responses to discussion ${number}`);
    list.forEach((r, j) => {
      const li = el('li', 'nt-reply');
      const t = el('span', 'nt-card-text');
      t.textContent = r.text;
      const del = el('button', 'nt-delete');
      del.type = 'button';
      del.textContent = '×';
      del.setAttribute('aria-label', `Delete response ${j + 1} to discussion ${number}`);
      del.addEventListener('click', (e) => { e.stopPropagation(); note.replies = list.filter((x) => x.id !== r.id); saveNotes(); rerenderAll(); });
      li.append(t, del);
      ul.appendChild(li);
    });
    wrap.appendChild(ul);
  }
  const add = el('button', 'nt-reply-btn');
  add.type = 'button';
  add.textContent = list.length ? 'Add a response' : 'Respond';
  add.setAttribute('aria-label', `${add.textContent} to discussion ${number}`);
  add.addEventListener('click', (e) => {
    e.stopPropagation();
    const ta = el('textarea', 'nt-edit-input');
    ta.rows = 2;
    ta.placeholder = 'What did you decide? ⌘↵ to save';
    ta.setAttribute('aria-label', `Response to discussion ${number}`);
    add.replaceWith(ta);
    ta.focus();
    const save = () => {
      const v = ta.value.trim();
      if (v) { note.replies = [...list, { id: uid(), text: v, at: new Date().toISOString() }]; saveNotes(); }
      rerenderAll();
    };
    ta.addEventListener('blur', save);
    ta.addEventListener('keydown', (ev) => {
      ev.stopPropagation();
      if (ev.key === 'Enter' && (ev.metaKey || ev.ctrlKey)) ta.blur();
      if (ev.key === 'Escape') { ta.removeEventListener('blur', save); rerenderAll(); }
    });
  });
  wrap.appendChild(add);
  return wrap;
}

function startEdit(note, textEl) {
  const ta = el('textarea', 'nt-edit-input');
  ta.value = note.text;
  ta.rows = 2;
  ta.setAttribute('aria-label', 'Edit note');
  textEl.replaceWith(ta);
  ta.focus();
  ta.select();
  const commit = () => { const v = ta.value.trim(); if (v) { note.text = v; saveNotes(); } rerenderAll(); };
  ta.addEventListener('blur', commit);
  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) ta.blur();
    if (e.key === 'Escape') { ta.removeEventListener('blur', commit); rerenderAll(); }
  });
}

// ── Numbered markers beside the noted element ────────────────────────────────
function renderBadges() {
  document.querySelectorAll('.nt-marker').forEach((m) => m.remove());
  if (!isActive || isHidden) return;
  const numbers = numberByKind();
  notes.forEach((note) => {
    if (!findByFingerprint(note.fp)) return;
    const marker = el('span', `nt-marker nt-kind-${kindOf(note)}${isDiscussed(note) ? ' nt-discussed' : ''}`);
    marker.setAttribute('data-note-tool', '');
    marker.setAttribute('aria-hidden', 'true');
    marker.dataset.noteId = note.id;
    marker.textContent = numbers[note.id];
    document.body.appendChild(marker);
  });
}

function updatePositions() {
  if (!isActive) return;
  const rail = document.getElementById('nt-rail');
  notes.forEach((note) => {
    const target = findByFingerprint(note.fp);
    const marker = document.querySelector(`.nt-marker[data-note-id="${note.id}"]`);
    const card = rail?.querySelector(`.nt-card[data-note-id="${note.id}"]`);
    if (!target) {
      if (marker) marker.style.display = 'none';
      if (card) card.classList.add('nt-card-missing');
      return;
    }
    const r = target.getBoundingClientRect();
    const midY = r.top + r.height / 2;
    const inView = r.bottom > 0 && r.top < window.innerHeight;
    if (marker) {
      marker.style.display = inView ? '' : 'none';
      marker.style.top = `${midY - 9}px`;
      marker.style.left = `${Math.min(r.right + 6, window.innerWidth - 240)}px`;
    }
    if (card) {
      card.classList.remove('nt-card-missing');
      card.style.top = `${Math.max(8, Math.min(midY - 16, window.innerHeight - 120))}px`;
      card.classList.toggle('nt-card-off', !inView);
    }
  });
  // Cards grow with responses: push later cards down so none overlap.
  const cards = [...(rail?.querySelectorAll('.nt-card:not(.nt-card-missing):not(.nt-card-off)') || [])]
    .sort((a, b) => parseFloat(a.style.top) - parseFloat(b.style.top));
  let floor = 0;
  cards.forEach((c) => {
    const top = Math.max(parseFloat(c.style.top), floor);
    c.style.top = `${top}px`;
    floor = top + c.offsetHeight + 6;
  });
}

// ── Hide, copy, clear, delete ────────────────────────────────────────────────
function toggleHide() {
  isHidden = !isHidden;
  store.set(HIDDEN_KEY, isHidden);
  if (isHidden) exitSelectMode();
  rerenderAll();
}

// Numbers run separately for each kind: Note 1, 2… and Discussion 1, 2…
function numberByKind(list = notes) {
  const seen = { note: 0, discussion: 0 };
  const out = {};
  list.forEach((n) => { seen[kindOf(n)] += 1; out[n.id] = seen[kindOf(n)]; });
  return out;
}

function describe(list, path, kind) {
  const items = list.filter((n) => kindOf(n) === kind);
  if (!items.length) return '';
  const done = items.filter(isDiscussed).length;
  const lines = [`${KINDS[kind].plural}: ${path}${kind === 'discussion' ? ` (${done}/${items.length} discussed)` : ''}`];
  items.forEach((note, i) => {
    const where = [];
    if (note.fp.screenId) where.push(note.fp.screenId);
    const snippet = (note.fp.text || '').slice(0, 50);
    where.push(`${note.fp.tag}${snippet ? ` "${snippet}${note.fp.text.length > 50 ? '…' : ''}"` : ''}`);
    lines.push(`${i + 1}. [${where.join(' › ')}] ${note.text}`);
    (note.replies || []).forEach((r) => lines.push(`   ↳ ${r.text}`));
  });
  return lines.join('\n');
}

function writeClipboard(btn, text) {
  const done = () => { const old = btn.textContent; btn.textContent = 'Copied'; setTimeout(() => { btn.textContent = old; }, 1800); };
  navigator.clipboard?.writeText(text).then(done).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    done();
  });
}

function copyKind(btn, kind) { writeClipboard(btn, describe(notes, page, kind)); }

// Every page, notes first then discussions, each block labelled with its page.
function copyAll(btn) {
  const pages = [];
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k.startsWith(PREFIX)) pages.push([k.slice(PREFIX.length), store.get(k, []) || []]);
    }
  } catch { /* ignore */ }
  pages.sort((a, b) => a[0].localeCompare(b[0]));
  const blocks = Object.keys(KINDS).flatMap((kind) => pages.map(([path, list]) => describe(list, path, kind)).filter(Boolean));
  writeClipboard(btn, blocks.join('\n\n'));
}

// Every page's list, sorted by page.
function allPages() {
  const pages = [];
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k.startsWith(PREFIX)) pages.push([k, k.slice(PREFIX.length), store.get(k, []) || []]);
    }
  } catch { /* ignore */ }
  return pages.sort((a, b) => a[1].localeCompare(b[1]));
}

// Remove items matching `drop` on every page, after one confirmation.
function clearEverywhere(drop, what) {
  const pages = allPages().filter(([, , list]) => list.some(drop));
  const total = pages.reduce((n, [, , list]) => n + list.filter(drop).length, 0);
  if (!total) return;
  if (!window.confirm(`Delete ${total} ${what(total)} on ${pages.length} ${pages.length === 1 ? 'page' : 'pages'}? Copy them first if you need them. This can’t be undone.`)) return;
  pages.forEach(([key, , list]) => {
    const kept = list.filter((n) => !drop(n));
    try { if (kept.length) store.set(key, kept); else localStorage.removeItem(key); } catch { /* ignore */ }
  });
  notes = notes.filter((n) => !drop(n));
  announce();
  rerenderAll();
}

function clearKindAll(kind) {
  const k = KINDS[kind];
  clearEverywhere((n) => kindOf(n) === kind, (t) => `${t === 1 ? k.label.toLowerCase() : k.plural.toLowerCase()} (${kind === 'note' ? 'discussions' : 'notes'} are kept)`);
}

function clearEverything() {
  clearEverywhere(() => true, (t) => `${t === 1 ? 'note or discussion' : 'notes and discussions'}`);
}

function copyKindAll(btn, kind) {
  writeClipboard(btn, allPages().map(([, path, list]) => describe(list, path, kind)).filter(Boolean).join('\n\n'));
}

function clearKind(kind) {
  const n = notes.filter((x) => kindOf(x) === kind).length;
  const k = KINDS[kind];
  if (!window.confirm(`Delete all ${n} ${n === 1 ? k.label.toLowerCase() : k.plural.toLowerCase()} on this page? This can’t be undone.`)) return;
  notes = notes.filter((x) => kindOf(x) !== kind);
  saveNotes();
  rerenderAll();
}

function deleteNote(id) {
  notes = notes.filter((n) => n.id !== id);
  saveNotes();
  rerenderAll();
}

function rerenderAll() {
  renderRail();
  renderBadges();
  refreshToolbar();
  schedule();
}

function el(tag, cls) { const e = document.createElement(tag); if (cls) e.className = cls; return e; }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
