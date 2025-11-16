(function () {
  const STORAGE_KEY = 'savi-theme';
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  const getStoredTheme = () => localStorage.getItem(STORAGE_KEY);

  const applyTheme = (theme) => {
    const isDark = theme === 'dark';
    document.body.classList.toggle('dark-theme', isDark);
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';

    document
      .querySelectorAll('[data-theme-icon="sun"]')
      .forEach((el) => el.classList.toggle('hidden', !isDark));
    document
      .querySelectorAll('[data-theme-icon="moon"]')
      .forEach((el) => el.classList.toggle('hidden', isDark));
  };

  const getPreferredTheme = () => {
    const stored = getStoredTheme();
    if (stored) {
      return stored;
    }
    return mediaQuery.matches ? 'dark' : 'light';
  };

  const setTheme = (theme, persist = true) => {
    if (persist) {
      localStorage.setItem(STORAGE_KEY, theme);
    }
    applyTheme(theme);
  };

  const toggleTheme = () => {
    const nextTheme = document.body.classList.contains('dark-theme')
      ? 'light'
      : 'dark';
    setTheme(nextTheme);
  };

  const init = () => {
    applyTheme(getPreferredTheme());

    document
      .querySelectorAll('[data-theme-toggle]')
      .forEach((btn) => {
        btn.addEventListener('click', toggleTheme);
      });
  };

  document.addEventListener('DOMContentLoaded', init);

  mediaQuery.addEventListener('change', (event) => {
    const stored = getStoredTheme();
    if (!stored) {
      applyTheme(event.matches ? 'dark' : 'light');
    }
  });
})();
