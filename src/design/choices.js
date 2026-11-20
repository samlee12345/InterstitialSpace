// Design choices made in the sandbox (sandbox.html).
// DEFAULTS is what everyone sees, including the GitHub Pages link.
// "Preview in the app" in the sandbox saves an override in this browser only.
import { useSyncExternalStore } from 'react';

export const DEFAULTS = {
  spaceCard: 'label', // see SPACE_CARD_VARIANTS in components/domain.jsx
  landing: 'steps', // see LANDING_VARIANTS in pages/Public.jsx
  createFlow: 'popover', // Create new space: 'inline' (A), 'overlay' (B: photos first in an overlay), 'confirm' (C: nearby-space confirmation overlay after the area)
  landingLayout: 'map', // the map is the landing page (round 10: map first only)
  spaceHeader: 'portrait', // space page header: 'portrait' (photo right of the title), 'strip' (photo strip under it), 'compact' (thumbnail in the title row)
  theme: 'grayscale', // 'grayscale' (default) or 'editorial' (styles/theme-editorial.css), switched in Demo controls › Theme
  contestEligibility: 'both', // who can enter contests: 'both', 'licensed' (licensed architects only), 'students' (students, paired with a licensed architect)
};

const KEY = 'isp-design-choices';
const listeners = new Set();

function read() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return { ...DEFAULTS };
  }
}

let current = read();

// The theme is a data-theme attribute on <html>; theme CSS files scope to it.
export const THEMES = [
  { id: 'grayscale', label: 'Grayscale (default)' },
  { id: 'editorial', label: 'Editorial: serif, pill buttons, soft cards' },
];
function applyTheme() {
  if (typeof document === 'undefined') return;
  if (current.theme && current.theme !== 'grayscale') document.documentElement.dataset.theme = current.theme;
  else delete document.documentElement.dataset.theme;
}
applyTheme();

export function setChoice(name, value) {
  const overrides = { ...current, [name]: value };
  Object.keys(overrides).forEach((k) => { if (overrides[k] === DEFAULTS[k]) delete overrides[k]; });
  try { localStorage.setItem(KEY, JSON.stringify(overrides)); } catch { /* storage unavailable: choice lasts this visit */ }
  current = { ...DEFAULTS, ...overrides };
  applyTheme();
  listeners.forEach((l) => l());
}

export function resetChoices() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  current = { ...DEFAULTS };
  applyTheme();
  listeners.forEach((l) => l());
}

const subscribe = (l) => {
  listeners.add(l);
  const onStorage = (e) => { if (e.key === KEY) { current = read(); applyTheme(); l(); } };
  window.addEventListener('storage', onStorage);
  return () => { listeners.delete(l); window.removeEventListener('storage', onStorage); };
};

export const useChoices = () => useSyncExternalStore(subscribe, () => current);
