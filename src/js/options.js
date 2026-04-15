import '../sass/options.scss';
import MicroModal from 'micromodal';
import Sortable from 'sortablejs';
import { showSuccessToast, showMutedToast } from './toast.js';
import {
  maskCredentialForDisplay,
  isShowCredentialsChecked,
  triggerCredentialRevealFlash,
} from './credentialDisplay.js';
import {
  getAuthEntries,
  addAuthEntry,
  updateAuthEntry,
  deleteAuthEntry,
  importAuthEntries,
  previewImportAuthEntries,
  reorderAuthEntries,
  resolvePasswordTemplate,
} from './storage.js';

const entriesList = document.getElementById('entriesList');
const addNewBtn = document.getElementById('addNewBtn');
const importBtn = document.getElementById('importBtn');
const exportBtn = document.getElementById('exportBtn');
const importFile = document.getElementById('importFile');
const editForm = document.getElementById('editForm');
const editIdInput = document.getElementById('editId');
const editDomainInput = document.getElementById('editDomain');
const editUsernameInput = document.getElementById('editUsername');
const editPasswordInput = document.getElementById('editPassword');
const editDynamicPasswordInput = document.getElementById('editDynamicPassword');
const modalTitle = document.getElementById('modalTitle');
const deleteTarget = document.getElementById('deleteTarget');
const deleteConfirmBtn = document.getElementById('deleteConfirmBtn');
const importPreviewAdded = document.getElementById('importPreviewAdded');
const importPreviewUpdated = document.getElementById('importPreviewUpdated');
const importConfirmBtn = document.getElementById('importConfirmBtn');
const showCredentialsToggle = document.getElementById('showCredentialsToggle');
let pendingDeleteId = null;
let pendingImportJson = null;
let entriesSortable = null;

const modalConfig = {
  awaitCloseAnimation: true,
  onShow: (modal) => modal.classList.remove('is-closing'),
  onClose: (modal) => modal.classList.add('is-closing'),
};

async function renderEntries() {
  entriesSortable?.destroy();
  entriesSortable = null;

  const entries = await getAuthEntries();

  if (entries.length === 0) {
    entriesList.innerHTML = `
      <div class="empty-state">
        <p>サイトが登録されていません</p>
      </div>
    `;
    return;
  }

  const showPlain = isShowCredentialsChecked(showCredentialsToggle);

  entriesList.innerHTML = entries
    .map((entry) => {
      const displayPassword = entry.dynamicPassword
        ? resolvePasswordTemplate(entry.password)
        : entry.password;
      const usernameShown = showPlain
        ? entry.username
        : maskCredentialForDisplay(entry.username);
      const passwordShown = showPlain
        ? displayPassword
        : maskCredentialForDisplay(displayPassword);

      return `
    <div class="entry-card" data-id="${entry.id}">
      <div class="entry-card__header">
        <span class="entry-card__drag-handle" aria-label="ドラッグして並び替え" title="ドラッグして並び替え">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>
        </span>
        <label class="toggle-switch">
          <input
            type="checkbox"
            class="toggle-input"
            data-action="toggle"
            data-id="${entry.id}"
            ${entry.enabled ? 'checked' : ''}
          />
          <span class="toggle-slider"></span>
        </label>
        <div class="entry-card__domain-wrap">
          <span class="entry-card__domain">${escapeHtml(entry.url)}</span>
          ${
            entry.dynamicPassword
              ? '<span class="entry-card__badge" title="認証時にテンプレート（例: {{YYYYMM}}）が現在の日付に置き換わります">動的パスワード</span>'
              : ''
          }
        </div>
        <div class="entry-card__actions">
          <button class="btn btn-edit" data-action="edit" data-id="${entry.id}">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" class="btn-icon btn-icon-small"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg>
            編集
          </button>
          <button class="btn btn-danger" data-action="delete" data-id="${entry.id}">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="btn-icon btn-icon-small"><path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            削除
          </button>
        </div>
      </div>
      <dl class="entry-card__detail">
        <div>
          <dt class="entry-card__label">ユーザー名</dt>
          <dd class="entry-card__value ff-mono">${escapeHtml(usernameShown)}</dd>
        </div>
        <div>
          <dt class="entry-card__label">パスワード</dt>
          <dd class="entry-card__value ff-mono">${escapeHtml(passwordShown)}</dd>
        </div>
      </dl>
      <p class="entry-card__last-auth" aria-label="最終認証成功日時">
        <span class="entry-card__last-auth-label">最終認証成功日時: </span>
        <span class="entry-card__last-auth-value">${escapeHtml(formatLastAuthSuccess(entry.lastAuthSuccessAt))}</span>
      </p>
    </div>
  `;
    })
    .join('');

  entriesSortable = Sortable.create(entriesList, {
    animation: 150,
    handle: '.entry-card__drag-handle',
    draggable: '.entry-card',
    ghostClass: 'entry-card--sortable-ghost',
    chosenClass: 'entry-card--sortable-chosen',
    onEnd: async (evt) => {
      if (evt.oldIndex === evt.newIndex) return;
      const ids = [
        ...entriesList.querySelectorAll('.entry-card[data-id]'),
      ].map((el) => el.dataset.id);
      await reorderAuthEntries(ids);
    },
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatLastAuthSuccess(timestamp) {
  if (timestamp == null || Number.isNaN(Number(timestamp))) return '-';
  const d = new Date(Number(timestamp));
  const yyyy = d.getFullYear();
  const MM = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${yyyy}/${MM}/${dd} ${hh}:${mm}:${ss}`;
}

function openEditModal(mode, entry = null) {
  editForm.reset();
  if (mode === 'add') {
    modalTitle.textContent = 'ウェブサイトを追加';
    editIdInput.value = '';
    editDynamicPasswordInput.checked = false;
  } else {
    modalTitle.textContent = 'ウェブサイトを編集';
    editIdInput.value = entry.id;
    editDomainInput.value = entry.url;
    editUsernameInput.value = entry.username;
    editPasswordInput.value = entry.password;
    editDynamicPasswordInput.checked = Boolean(entry.dynamicPassword);
  }
  MicroModal.show('editModal', {
    ...modalConfig,
    onShow: (modal) => {
      modal.classList.remove('is-closing');
      editDomainInput.focus();
    },
  });
}

function openDeleteModal(id, domain) {
  pendingDeleteId = id;
  deleteTarget.textContent = domain;
  MicroModal.show('deleteModal', {
    ...modalConfig,
    onClose: (modal) => {
      modal.classList.add('is-closing');
      pendingDeleteId = null;
    },
  });
}

function openImportConfirmModal(json, preview) {
  pendingImportJson = json;
  importPreviewAdded.textContent = String(preview.added);
  importPreviewUpdated.textContent = String(preview.updated);
  MicroModal.show('importModal', {
    ...modalConfig,
    onClose: (modal) => {
      modal.classList.add('is-closing');
      pendingImportJson = null;
    },
  });
}

// 新規追加
addNewBtn.addEventListener('click', () => openEditModal('add'));

showCredentialsToggle.addEventListener('change', async () => {
  await renderEntries();
  triggerCredentialRevealFlash(entriesList);
});

editForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const url = editDomainInput.value.trim();
  const username = editUsernameInput.value.trim();
  const password = editPasswordInput.value;
  const id = editIdInput.value;

  if (!url || !username || !password) return;

  const dynamicPassword = editDynamicPasswordInput.checked;

  if (id) {
    await updateAuthEntry(id, { url, username, password, dynamicPassword });
    showSuccessToast('ウェブサイトの編集が完了しました', { duration: 4000 });
  } else {
    await addAuthEntry({ url, username, password, dynamicPassword });
    showSuccessToast('ウェブサイトの登録が完了しました', { duration: 4000 });
  }

  MicroModal.close('editModal');
  renderEntries();
});

function downloadJsonFile(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportFilenameDate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

// エクスポート
exportBtn.addEventListener('click', async () => {
  const entries = await getAuthEntries();
  if (entries.length === 0) {
    showMutedToast('エクスポートする登録がありません');
    return;
  }

  const payload = entries.map((e) => {
    const row = {
      url: e.url,
      username: e.username,
      password: e.password,
    };
    if (e.dynamicPassword) {
      row.dynamicPassword = true;
    }
    return row;
  });

  downloadJsonFile(payload, `sesame-settings-${exportFilenameDate()}.json`);
  showSuccessToast('エクスポートが完了しました', { duration: 4000 });
});

// インポート
importBtn.addEventListener('click', () => importFile.click());

importFile.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const json = JSON.parse(text);

    if (!Array.isArray(json)) {
      alert('JSONファイルの形式が正しくありません。配列形式で記述してください。');
      return;
    }

    const valid = json.every((item) => item.url && item.username && item.password);
    if (!valid) {
      alert('各エントリーに url, username, password が必要です。');
      return;
    }

    const preview = await previewImportAuthEntries(json);
    if (preview.added === 0 && preview.updated === 0) {
      alert(
        '取り込めるエントリーがありません。各項目に url, username, password が必要です。',
      );
      return;
    }

    openImportConfirmModal(json, preview);
  } catch {
    alert('JSONファイルの読み込みに失敗しました。');
  } finally {
    importFile.value = '';
  }
});

importConfirmBtn.addEventListener('click', async () => {
  const json = pendingImportJson;
  if (!json) return;

  try {
    await importAuthEntries(json);
    pendingImportJson = null;
    MicroModal.close('importModal');
    showSuccessToast('インポートが完了しました', { duration: 4000 });
    renderEntries();
  } catch {
    alert('インポートの保存に失敗しました。');
  }
});

// エントリー操作（編集・削除・トグル）
entriesList.addEventListener('click', async (e) => {
  const target = e.target;
  const action = target.dataset.action;
  const id = target.dataset.id;

  if (!action || !id) return;

  if (action === 'delete') {
    const entries = await getAuthEntries();
    const entry = entries.find((en) => en.id === id);
    openDeleteModal(id, entry ? entry.url : '');
    return;
  }

  if (action === 'edit') {
    const entries = await getAuthEntries();
    const entry = entries.find((en) => en.id === id);
    if (entry) openEditModal('edit', entry);
  }
});

entriesList.addEventListener('change', async (e) => {
  const target = e.target;
  if (target.dataset.action !== 'toggle') return;
  await updateAuthEntry(target.dataset.id, { enabled: target.checked });
});

// 削除確定
deleteConfirmBtn.addEventListener('click', async () => {
  if (pendingDeleteId) {
    await deleteAuthEntry(pendingDeleteId);
    MicroModal.close('deleteModal');
    renderEntries();
    showSuccessToast('ウェブサイトの削除が完了しました', { duration: 4000 });
  }
});

renderEntries();
