const KEY_STORAGE = 'encryption_key';
let cachedKey = null;

async function getOrCreateKey() {
  if (cachedKey) return cachedKey;

  const result = await chrome.storage.local.get(KEY_STORAGE);
  if (result[KEY_STORAGE]) {
    cachedKey = await crypto.subtle.importKey(
      'jwk',
      result[KEY_STORAGE],
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt'],
    );
    return cachedKey;
  }

  cachedKey = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  );
  const exported = await crypto.subtle.exportKey('jwk', cachedKey);
  await chrome.storage.local.set({ [KEY_STORAGE]: exported });
  return cachedKey;
}

export async function encrypt(plaintext) {
  const key = await getOrCreateKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded,
  );
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return btoa(String.fromCharCode(...combined));
}

export async function decrypt(encryptedBase64) {
  const key = await getOrCreateKey();
  const combined = Uint8Array.from(atob(encryptedBase64), (c) =>
    c.charCodeAt(0),
  );
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext,
  );
  return new TextDecoder().decode(decrypted);
}
