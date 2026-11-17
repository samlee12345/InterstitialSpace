/* Notes: inline annotation tool, ported from the portfolio's components/notes-tool.js.
 * Press N (or "Notes" in the Demo bar) to start. Notes are saved in this browser,
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

let page = '/';
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

// Note counts for every page key, e.g. { '/browse': 2, '/space/s2~tabs': 1 }.
export function notesCounts() {
  const out = {};
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k.startsWith(PREFIX)) out[k.slice(PREFIX.length)] = (store.get(k, []) || []).length;
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
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k.startsWith(PREFIX) && k !== pageKey()) n += (store.get(k, []) || []).length;
    }
  } catch { /* ignore */ }
  return n;
}

function refreshToolbar() {
  const tb = document.getElementById('nt-toolbar');
  if (!tb) return;
  tb.innerHTML = '';
  if (isHidden) {
    tb.appendChild(button(`Show notes (${notes.length})`, 'nt-btn nt-secondary', toggleHide));
    return;
  }
  const count = el('span', 'nt-count');
  count.textContent = notes.length;
  const label = el('span', 'nt-label');
  const others = countOtherPages();
  label.textContent = others ? `Notes on this page (${others} on other pages)` : 'Notes on this page';
  tb.append(count, label);
  tb.appendChild(button(isSelectMode ? 'Cancel' : 'Add note', `nt-btn${isSelectMode ? ' nt-active' : ''}`, toggleSelectMode, 'N'));
  if (notes.length) tb.appendChild(button('Copy', 'nt-btn nt-secondary', (e) => copyNotes(e.currentTarget, false)));
  if (notes.length || others) tb.appendChild(button('Copy all pages', 'nt-btn nt-secondary', (e) => copyNotes(e.currentTarget, true)));
  if (notes.length) tb.appendChild(button('Clear', 'nt-btn nt-danger', clearNotes));
  tb.appendChild(button('Hide', 'nt-btn nt-secondary', toggleHide));
  tb.appendChild(button('Turn off', 'nt-btn nt-secondary', deactivate));
  if (isSelectMode) {
    const hint = el('span', 'nt-hint');
    hint.textContent = 'Click any text to attach a note. Esc to cancel.';
    tb.appendChild(hint);
  }
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
  if (e.metaKey || e.ctrlKey || e.altKey || e.key !== 'n') return;
  e.preventDefault();
  if (!isActive) { activate(); return; }
  if (isHidden) toggleHide();
  toggleSelectMode();
}

// ── Select mode ──────────────────────────────────────────────────────────────
function toggleSelectMode() {
  if (isSelectMode) { exitSelectMode(); refreshToolbar(); return; }
  isSelectMode = true;
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
  pop.setAttribute('aria-label', 'Add a note');
  pop.style.left = `${Math.max(8, Math.min(x, window.innerWidth - 300))}px`;
  pop.style.top = `${Math.max(8, Math.min(y + 12, window.innerHeight - 150))}px`;

  const ta = el('textarea', 'nt-popover-input');
  ta.rows = 3;
  ta.placeholder = 'Your note';
  ta.setAttribute('aria-label', 'Note');
  const hint = el('p', 'nt-popover-hint');
  hint.textContent = '⌘↵ to save, Esc to cancel';
  const actions = el('div', 'nt-popover-actions');
  const doSave = () => {
    const text = ta.value.trim();
    if (text) {
      notes.push({ id: uid(), fp: fingerprint(targetEl), text });
      saveNotes();
      rerenderAll();
    }
    closePopover();
  };
  actions.append(button('Cancel', 'nt-btn nt-ghost', closePopover), button('Save note', 'nt-btn', doSave));
  pop.append(ta, hint, actions);
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

  notes.forEach((note, i) => {
    const card = el('div', 'nt-card');
    card.dataset.noteId = note.id;
    const badge = el('span', 'nt-badge');
    badge.textContent = i + 1;
    const body = el('div', 'nt-card-body');
    const text = el('span', 'nt-card-text');
    text.textContent = note.text;
    text.title = 'Double-click to edit';
    const del = el('button', 'nt-delete');
    del.type = 'button';
    del.textContent = '×';
    del.setAttribute('aria-label', `Delete note ${i + 1}`);
    body.append(text, del);
    card.append(badge, body);
    rail.appendChild(card);
    del.addEventListener('click', (e) => { e.stopPropagation(); deleteNote(note.id); });
    text.addEventListener('dblclick', (e) => { e.stopPropagation(); startEdit(note, text); });
    card.addEventListener('click', (e) => {
      if (e.target.closest('button, textarea')) return;
      findByFingerprint(note.fp)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  });
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
  notes.forEach((note, i) => {
    if (!findByFingerprint(note.fp)) return;
    const marker = el('span', 'nt-marker');
    marker.setAttribute('data-note-tool', '');
    marker.setAttribute('aria-hidden', 'true');
    marker.dataset.noteId = note.id;
    marker.textContent = i + 1;
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
}

// ── Hide, copy, clear, delete ────────────────────────────────────────────────
function toggleHide() {
  isHidden = !isHidden;
  store.set(HIDDEN_KEY, isHidden);
  if (isHidden) exitSelectMode();
  rerenderAll();
}

function describe(list, path) {
  const lines = [`Notes: ${path}`];
  list.forEach((note, i) => {
    const where = [];
    if (note.fp.screenId) where.push(note.fp.screenId);
    const snippet = (note.fp.text || '').slice(0, 50);
    where.push(`${note.fp.tag}${snippet ? ` "${snippet}${note.fp.text.length > 50 ? '…' : ''}"` : ''}`);
    lines.push(`${i + 1}. [${where.join(' › ')}] ${note.text}`);
  });
  return lines.join('\n');
}

function copyNotes(btn, all) {
  let text = describe(notes, page);
  if (all) {
    const blocks = [];
    try {
      for (let i = 0; i < localStorage.length; i += 1) {
        const k = localStorage.key(i);
        const list = k.startsWith(PREFIX) ? store.get(k, []) : [];
        if (list.length) blocks.push(describe(list, k.slice(PREFIX.length)));
      }
    } catch { /* ignore */ }
    text = blocks.sort().join('\n\n');
  }
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

function clearNotes() {
  if (!window.confirm(`Delete all ${notes.length} note${notes.length === 1 ? '' : 's'} on this page? This can’t be undone.`)) return;
  notes = [];
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
