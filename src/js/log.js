import '../sass/log.scss';
import MicroModal from 'micromodal';
import { showSuccessToast } from './toast.js';
import {
  maskCredentialForDisplay,
  isShowCredentialsChecked,
  triggerCredentialRevealFlash,
} from './credentialDisplay.js';
import { getAuthLogs, clearAuthLogs } from './storage.js';

const logList = document.getElementById('logList');
const clearLogsBtn = document.getElementById('clearLogsBtn');
const clearConfirmBtn = document.getElementById('clearConfirmBtn');
const showCredentialsToggle = document.getElementById('showCredentialsToggle');

const modalConfig = {
  awaitCloseAnimation: true,
  onShow: (modal) => modal.classList.remove('is-closing'),
  onClose: (modal) => modal.classList.add('is-closing'),
};

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDateTime(timestamp) {
  const d = new Date(timestamp);
  const yyyy = d.getFullYear();
  const MM = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${yyyy}/${MM}/${dd} ${hh}:${mm}:${ss}`;
}

function truncateUrl(url, maxLength = 80) {
  if (url.length <= maxLength) return url;
  return url.slice(0, maxLength) + '…';
}

async function renderLogs() {
  const logs = await getAuthLogs();

  if (logs.length === 0) {
    logList.innerHTML = `
      <div class="empty-state">
        <p>認証ログはありません</p>
      </div>
    `;
    return;
  }

  const showPlain = isShowCredentialsChecked(showCredentialsToggle);

  logList.innerHTML = `
    <div class="log-table-wrap">
      <table class="log-table">
        <thead>
          <tr>
            <th class="log-table__th log-table__th--datetime">施行日時</th>
            <th class="log-table__th log-table__th--status">認証結果</th>
            <th class="log-table__th log-table__th--url">URL</th>
            <th class="log-table__th log-table__th--credential">ユーザーID</th>
            <th class="log-table__th log-table__th--credential">パスワード</th>
          </tr>
        </thead>
        <tbody>
          ${logs
            .map((log) => {
              const userCell =
                !log.username
                  ? '-'
                  : showPlain
                    ? escapeHtml(log.username)
                    : escapeHtml(maskCredentialForDisplay(log.username));
              const passCell =
                !log.password
                  ? '-'
                  : showPlain
                    ? escapeHtml(log.password)
                    : escapeHtml(maskCredentialForDisplay(log.password));
              return `
            <tr class="log-table__row">
              <td class="log-table__td log-table__td--datetime">${escapeHtml(formatDateTime(log.timestamp))}</td>
              <td class="log-table__td log-table__td--status">
                <span class="badge ${log.success ? 'badge--success' : 'badge--failure'}">${log.success ? '成功' : '失敗'}</span>
              </td>
              <td class="log-table__td log-table__td--url ff-mono" title="${escapeHtml(log.url)}">${escapeHtml(truncateUrl(log.url))}</td>
              <td class="log-table__td log-table__td--credential ff-mono">${userCell}</td>
              <td class="log-table__td log-table__td--credential ff-mono">${passCell}</td>
            </tr>
          `;
            })
            .join('')}
        </tbody>
      </table>
    </div>
  `;
}

showCredentialsToggle.addEventListener('change', async () => {
  await renderLogs();
  triggerCredentialRevealFlash(logList);
});

clearLogsBtn.addEventListener('click', () => {
  MicroModal.show('clearModal', modalConfig);
});

clearConfirmBtn.addEventListener('click', async () => {
  await clearAuthLogs();
  MicroModal.close('clearModal');
  renderLogs();
  showSuccessToast('ログを削除しました', { duration: 4000 });
});

renderLogs();
