/* Differences between the browser and the Android app (Capacitor). */
import { Capacitor } from '@capacitor/core';

export const isNative = Capacitor.isNativePlatform();

const SERVER_KEY = 'sfm_server';

/** The college's online fee server, suggested on the app's first start */
export const DEFAULT_SERVER_URL: string = import.meta.env.VITE_DEFAULT_SERVER ?? 'https://feesapi.ahscollege.ac.in';

/** Set by the front page hosted on the college's web hosting (deploy/godaddy/index.html),
    which loads this app from the fee server: all data then comes from that server. */
export const REMOTE_SERVER: string | null = ((window as any).__SFM_SERVER__ as string | undefined)?.replace(/\/+$/, '') || null;

function store(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** College server address used by the Android app, e.g. http://192.168.1.10:4000 */
export function getServerUrl(): string | null {
  return store()?.getItem(SERVER_KEY) || null;
}
export function setServerUrl(url: string | null) {
  const s = store();
  if (!s) return;
  if (url) s.setItem(SERVER_KEY, normaliseServerUrl(url));
  else s.removeItem(SERVER_KEY);
}
export function normaliseServerUrl(url: string): string {
  let u = url.trim().replace(/\/+$/, '').replace(/\/api$/, '');
  /* a bare domain means the online server (HTTPS); an IP, localhost or explicit port means the local network */
  if (!/^https?:\/\//i.test(u)) u = (/^(localhost|\d{1,3}(\.\d{1,3}){3})(:|$)|:\d+$/i.test(u) ? 'http://' : 'https://') + u;
  return u;
}

/** Base URL for API calls: same origin on the web, the configured server in the app. */
export function apiBase(): string {
  if (isNative) return (getServerUrl() ?? '') + '/api';
  if (REMOTE_SERVER) return REMOTE_SERVER + '/api';
  return '/api';
}

export async function testServer(url: string): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch(normaliseServerUrl(url) + '/api/health', { signal: ctrl.signal });
    clearTimeout(t);
    if (!r.ok) return `Server answered ${r.status}.`;
    const j = await r.json();
    return j.ok ? null : 'Unexpected answer from server.';
  } catch {
    return 'Cannot reach the server. Check the address and the internet connection (a local address like 192.168.x.x works only on the college Wi-Fi).';
  }
}

/** Share text (receipt, statement summary) via WhatsApp, SMS, email ... */
export async function shareText(title: string, text: string): Promise<boolean> {
  if (isNative) {
    const { Share } = await import('@capacitor/share');
    await Share.share({ title, text, dialogTitle: title });
    return true;
  }
  if (navigator.share) {
    await navigator.share({ title, text });
    return true;
  }
  await navigator.clipboard?.writeText(text);
  return false;
}

/** Save a file and open the Android share sheet (Excel, Drive, WhatsApp ...). */
export async function shareFile(fileName: string, content: string, mime = 'text/csv') {
  const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
  const { Share } = await import('@capacitor/share');
  const res = await Filesystem.writeFile({ path: fileName, data: content, directory: Directory.Cache, encoding: Encoding.UTF8 });
  await Share.share({ title: fileName, files: [res.uri], dialogTitle: `Share ${fileName}` });
  void mime;
}

/** Android hardware back button: go back, or leave the app from the home screen. */
export async function initNative() {
  if (!isNative) return;
  document.documentElement.classList.add('native');
  const { App } = await import('@capacitor/app');
  App.addListener('backButton', () => {
    const modalClose = document.querySelector<HTMLButtonElement>('.modal-backdrop .btn-icon');
    if (modalClose) return modalClose.click();
    const h = window.location.hash;
    if (!h || h === '#/' || h === '#') App.exitApp();
    else window.history.back();
  });
}
