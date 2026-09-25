import { Db } from '../db';

export async function getSetting(d: Db, key: string, fallback = ''): Promise<string> {
  const r = await d.one<{ SettingValue: string | null }>(
    'SELECT SettingValue FROM dbo.SystemSettings WHERE SettingKey = @key AND IsActive = 1',
    { key },
  );
  return r?.SettingValue ?? fallback;
}

export async function getBoolSetting(d: Db, key: string, fallback = false): Promise<boolean> {
  const v = (await getSetting(d, key, String(fallback))).trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

export async function getAllSettings(d: Db): Promise<Record<string, string>> {
  const rows = await d.query<{ SettingKey: string; SettingValue: string }>(
    'SELECT SettingKey, SettingValue FROM dbo.SystemSettings WHERE IsActive = 1',
  );
  return Object.fromEntries(rows.map((r) => [r.SettingKey, r.SettingValue ?? '']));
}
