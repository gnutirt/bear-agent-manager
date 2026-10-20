// BAM as its own window: the web app manifest + icon the hub serves, and the browser command that opens the hub in app mode (no address bar).

export const APP_NAME = 'Bear Agent Manager';

const ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" rx="26" fill="#1f2937"/><circle cx="34" cy="38" r="14" fill="#f59e0b"/><circle cx="94" cy="38" r="14" fill="#f59e0b"/><circle cx="64" cy="70" r="38" fill="#f59e0b"/><circle cx="50" cy="64" r="5" fill="#1f2937"/><circle cx="78" cy="64" r="5" fill="#1f2937"/><ellipse cx="64" cy="82" rx="12" ry="9" fill="#1f2937"/></svg>`;

export function manifest(): Record<string, unknown> {
  return {
    name: APP_NAME,
    short_name: 'BAM',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#1f2937',
    theme_color: '#1f2937',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  };
}

/** Static files that need no token (they hold nothing private). Null when `path` is not one of them. */
export function appAsset(path: string): { type: string; body: string } | null {
  if (path === '/manifest.webmanifest') return { type: 'application/manifest+json; charset=utf-8', body: JSON.stringify(manifest()) };
  if (path === '/icon.svg') return { type: 'image/svg+xml', body: ICON };
  return null;
}

export const withManifest = (html: string): string =>
  html.includes('rel="manifest"') ? html : html.replace('</head>', '<link rel="manifest" href="/manifest.webmanifest"><link rel="icon" href="/icon.svg" type="image/svg+xml">\n</head>');

/** Arguments that open `url` as an app window in Chrome / Edge. */
export const appArgs = (url: string): string[] => [`--app=${url}`];
