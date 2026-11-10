export type Theme = 'light' | 'dark';

const STORAGE_KEY = '@ReservaLab:theme';

export function getStoredTheme(): Theme | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' ? stored : null;
}

export function getCurrentTheme(): Theme {
  const attribute = document.documentElement.dataset.theme;
  if (attribute === 'light' || attribute === 'dark') return attribute;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(STORAGE_KEY, theme);
}

// Aplica o tema salvo antes do primeiro render, para evitar piscar no tema errado.
export function initTheme(): void {
  const stored = getStoredTheme();
  if (stored) document.documentElement.dataset.theme = stored;
}
