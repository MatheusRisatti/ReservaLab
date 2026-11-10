import React, { useState } from 'react';
import { applyTheme, getCurrentTheme } from '../theme';
import type { Theme } from '../theme';

export const ThemeToggle: React.FC = () => {
  const [theme, setTheme] = useState<Theme>(getCurrentTheme);

  const handleToggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    setTheme(next);
  };

  return (
    <button
      type="button"
      className="btn btn-outline"
      onClick={handleToggle}
      aria-label={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
      style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
    >
      {theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
    </button>
  );
};
