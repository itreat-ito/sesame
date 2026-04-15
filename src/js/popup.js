import '../sass/popup.scss';
import { addAuthEntry, findMatchingAuth } from './storage.js';

const domainInput = document.getElementById('domain');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const authForm = document.getElementById('authForm');
const currentDomainEl = document.getElementById('currentDomain');
const statusBadge = document.getElementById('statusBadge');
const openOptionsLink = document.getElementById('openOptions');

async function init() {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab?.url) {
      const url = new URL(tab.url);
      const hostname = url.hostname;
      currentDomainEl.textContent = hostname;
      domainInput.value = hostname;

      const match = await findMatchingAuth(tab.url);
      if (match) {
        statusBadge.classList.add('is-visible');
        statusBadge.setAttribute('aria-hidden', 'false');
      } else {
        statusBadge.classList.remove('is-visible');
        statusBadge.setAttribute('aria-hidden', 'true');
      }
    }
  } catch {
    currentDomainEl.textContent = '取得できません';
  }
}

authForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const url = domainInput.value.trim();
  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  if (!url || !username || !password) return;

  await addAuthEntry({ url, username, password });

  authForm.reset();
  showSavedMessage();
  statusBadge.classList.add('is-visible');
  statusBadge.setAttribute('aria-hidden', 'false');
});

function showSavedMessage() {
  const btn = document.getElementById('saveBtn');
  const original = btn.textContent;
  btn.textContent = '保存しました';
  btn.classList.add('btn--success');
  setTimeout(() => {
    btn.textContent = original;
    btn.classList.remove('btn--success');
  }, 1500);
}

openOptionsLink.addEventListener('click', (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

init();
