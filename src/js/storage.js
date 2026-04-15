import { encrypt, decrypt } from './crypto.js';

const STORAGE_KEY = 'auth_entries';
const AUTH_LOG_KEY = 'auth_logs';
const AUTH_LOG_MAX = 200;

export function resolvePasswordTemplate(password) {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  return password.replace(/\{\{YYYYMM\}\}/g, `${yyyy}${mm}`);
}

function normalizeAuthEntry(entry) {
  const dynamicPassword = Boolean(
    entry.dynamicPassword ?? entry.passwordTemplate,
  );
  const { passwordTemplate: _legacy, ...rest } = entry;
  return { ...rest, dynamicPassword };
}

export async function getAuthEntries() {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const raw = result[STORAGE_KEY] || [];

  const entries = await Promise.all(
    raw.map(async (entry) => {
      const base =
        entry.encrypted === true
          ? { ...entry, password: await decrypt(entry.password) }
          : entry;
      return normalizeAuthEntry(base);
    }),
  );

  const needsEncryptionMigration = raw.some((e) => !e.encrypted);
  const needsDynamicPasswordKeyMigration = raw.some((e) =>
    Object.prototype.hasOwnProperty.call(e, 'passwordTemplate'),
  );
  if (needsEncryptionMigration || needsDynamicPasswordKeyMigration) {
    await saveAuthEntries(entries);
  }

  return entries;
}

export async function saveAuthEntries(entries) {
  const encrypted = await Promise.all(
    entries.map(async (entry) => ({
      ...entry,
      password: await encrypt(entry.password),
      encrypted: true,
    })),
  );
  await chrome.storage.local.set({ [STORAGE_KEY]: encrypted });
}

export async function addAuthEntry(entry) {
  const entries = await getAuthEntries();
  entry.id = Date.now().toString();
  entry.enabled = true;
  entries.unshift(entry);
  await saveAuthEntries(entries);
  return entry;
}

export async function updateAuthEntry(id, updates) {
  const entries = await getAuthEntries();
  const index = entries.findIndex((e) => e.id === id);
  if (index === -1) return;
  entries[index] = { ...entries[index], ...updates };
  await saveAuthEntries(entries);
}

export async function deleteAuthEntry(id) {
  const entries = await getAuthEntries();
  await saveAuthEntries(entries.filter((e) => e.id !== id));
}

/** UI の並び順を保存（先頭からの id 配列） */
export async function reorderAuthEntries(orderedIds) {
  const entries = await getAuthEntries();
  const byId = new Map(entries.map((e) => [e.id, e]));
  const next = orderedIds.map((id) => byId.get(id)).filter(Boolean);
  for (const e of entries) {
    if (!orderedIds.includes(e.id)) next.push(e);
  }
  await saveAuthEntries(next);
}

/** インポート内容を entries に反映する（保存はしない）。 */
function applyImportToEntries(entries, jsonEntries) {
  let added = 0;
  let updated = 0;
  const newEntries = [];

  for (const item of jsonEntries) {
    if (!item.url || !item.username || !item.password) continue;

    const existingIdx = entries.findIndex((e) => e.url === item.url);
    const dynamicPassword = Boolean(
      item.dynamicPassword ?? item.passwordTemplate,
    );
    if (existingIdx !== -1) {
      entries[existingIdx] = {
        ...entries[existingIdx],
        username: item.username,
        password: item.password,
        dynamicPassword,
      };
      updated++;
    } else {
      newEntries.push({
        id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
        url: item.url,
        username: item.username,
        password: item.password,
        dynamicPassword,
        enabled: true,
      });
      added++;
    }
  }

  if (newEntries.length > 0) {
    entries.splice(0, 0, ...newEntries);
  }

  return { added, updated };
}

/** 保存せず、インポート時の新規追加・更新件数だけ計算する */
export async function previewImportAuthEntries(jsonEntries) {
  const entries = (await getAuthEntries()).map((e) => ({ ...e }));
  return applyImportToEntries(entries, jsonEntries);
}

export async function importAuthEntries(jsonEntries) {
  const entries = await getAuthEntries();
  const result = applyImportToEntries(entries, jsonEntries);
  await saveAuthEntries(entries);
  return result;
}

export async function findMatchingAuth(url) {
  const entries = await getAuthEntries();
  const match = entries.find((entry) => {
    if (!entry.enabled) return false;
    return matchUrl(url, entry.url);
  });

  if (!match) return undefined;

  const password = match.dynamicPassword
    ? resolvePasswordTemplate(match.password)
    : match.password;

  return { username: match.username, password, entryId: match.id };
}

/** 認証成功時にエントリーへ直近成功日時を記録（background から呼び出し） */
export async function recordLastAuthSuccess(entryId, timestamp = Date.now()) {
  if (!entryId) return;
  const entries = await getAuthEntries();
  const index = entries.findIndex((e) => e.id === entryId);
  if (index === -1) return;
  entries[index] = { ...entries[index], lastAuthSuccessAt: timestamp };
  await saveAuthEntries(entries);
}

export async function addAuthLog(entry) {
  const result = await chrome.storage.local.get(AUTH_LOG_KEY);
  const logs = result[AUTH_LOG_KEY] || [];
  logs.unshift(entry);
  if (logs.length > AUTH_LOG_MAX) logs.length = AUTH_LOG_MAX;
  await chrome.storage.local.set({ [AUTH_LOG_KEY]: logs });
}

export async function getAuthLogs() {
  const result = await chrome.storage.local.get(AUTH_LOG_KEY);
  return result[AUTH_LOG_KEY] || [];
}

export async function clearAuthLogs() {
  await chrome.storage.local.remove(AUTH_LOG_KEY);
}

function matchUrl(requestUrl, pattern) {
  try {
    const hostname = new URL(requestUrl).hostname;

    if (hostname === pattern) return true;

    if (pattern.includes('*')) {
      const regex = new RegExp(
        '^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$',
      );
      return regex.test(hostname) || regex.test(requestUrl);
    }

    return hostname.includes(pattern);
  } catch {
    return false;
  }
}
