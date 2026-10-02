export type Theme = 'light' | 'dark' | 'system';

const systemDark = window.matchMedia('(prefers-color-scheme: dark)');
let current: Theme = 'light';

function render() {
  const dark = current === 'dark' || (current === 'system' && systemDark.matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}

systemDark.addEventListener('change', render);

export function applyTheme(theme: Theme) {
  current = theme;
  render();
}

// Для страниц без React: берём тему из сохранённых настроек
export async function applyStoredTheme() {
  const { settings } = await chrome.storage.local.get('settings');
  applyTheme((settings as { theme?: Theme } | undefined)?.theme ?? 'light');
}
