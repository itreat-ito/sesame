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
const pagination = document.getElementById('pagination');

const LOGS_PER_PAGE = 30;
let authLogs = [];
let currentPage = 1;

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

function renderPagination(totalPages) {
  if (totalPages <= 1) {
    pagination.hidden = true;
    pagination.innerHTML = '';
    return;
  }

  pagination.hidden = false;
  pagination.innerHTML = `
    <button type="button" class="pagination__button pagination__button--nav" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>前へ</button>
    <span class="pagination__pages">
      ${Array.from({ length: totalPages }, (_, index) => {
        const page = index + 1;
        return `<button type="button" class="pagination__button${page === currentPage ? ' pagination__button--active' : ''}" data-page="${page}" aria-label="${page}ページ"${page === currentPage ? ' aria-current="page"' : ''}>${page}</button>`;
      }).join('')}
    </span>
    <button type="button" class="pagination__button pagination__button--nav" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>次へ</button>
  `;
}

function renderLogPage() {
  if (authLogs.length === 0) {
    logList.innerHTML = `
      <div class="empty-state">
        <p>認証ログはありません</p>
      </div>
    `;
    pagination.hidden = true;
    pagination.innerHTML = '';
    return;
  }

  const totalPages = Math.ceil(authLogs.length / LOGS_PER_PAGE);
  currentPage = Math.min(currentPage, totalPages);
  const pageStart = (currentPage - 1) * LOGS_PER_PAGE;
  const logs = authLogs.slice(pageStart, pageStart + LOGS_PER_PAGE);

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

  renderPagination(totalPages);
}

async function renderLogs() {
  authLogs = await getAuthLogs();
  currentPage = Math.min(currentPage, Math.max(1, Math.ceil(authLogs.length / LOGS_PER_PAGE)));
  renderLogPage();
}

showCredentialsToggle.addEventListener('change', async () => {
  renderLogPage();
  triggerCredentialRevealFlash(logList);
});

pagination.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-page]');
  if (!button || button.disabled) return;

  currentPage = Number(button.dataset.page);
  renderLogPage();
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
