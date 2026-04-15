/** 一覧・ログの伏せ字に使うドットの数 */
export const CREDENTIAL_MASK_DOT_COUNT = 5;

/** 伏せ字表示（値が空のときは em dash） */
export function maskCredentialForDisplay(value) {
  const s = String(value ?? '');
  if (s.length === 0) return '—';
  return '\u2022'.repeat(CREDENTIAL_MASK_DOT_COUNT);
}

/** #showCredentialsToggle の checked（要素がなければ false＝伏せ字） */
export function isShowCredentialsChecked(toggleEl) {
  return toggleEl ? toggleEl.checked : false;
}

const CREDENTIAL_FLASH_MS = 400;

/** ユーザー名・パスワード表示の切り替え直後に一覧セルへ短いアニメーションを付与 */
export function triggerCredentialRevealFlash(containerEl) {
  if (!containerEl) return;
  containerEl.classList.remove('credentials-flash');
  void containerEl.offsetWidth;
  containerEl.classList.add('credentials-flash');
  window.setTimeout(() => {
    containerEl.classList.remove('credentials-flash');
  }, CREDENTIAL_FLASH_MS);
}
