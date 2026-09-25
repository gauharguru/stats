/* Differences between the browser and the Android app (Capacitor). */
import { Capacitor } from '@capacitor/core';

export const isNative = Capacitor.isNativePlatform();

const SERVER_KEY = 'sfm_server';

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
  if (!/^https?:\/\//i.test(u)) u = 'http://' + u;
  return u;
}

/** Base URL for API calls: same origin on the web, the configured server in the app. */
export function apiBase(): string {
  if (isNative) return (getServerUrl() ?? '') + '/api';
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
    return 'Cannot reach the server. Check the address and that the phone is on the college Wi-Fi.';
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
