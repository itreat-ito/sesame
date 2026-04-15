import { findMatchingAuth, addAuthLog, recordLastAuthSuccess } from './storage.js';

const attemptedRequests = new Map();

chrome.webRequest.onAuthRequired.addListener(
  (details, asyncCallback) => {
    if (attemptedRequests.has(details.requestId)) {
      const pending = attemptedRequests.get(details.requestId);
      attemptedRequests.delete(details.requestId);
      addAuthLog({
        url: pending.url,
        timestamp: pending.timestamp,
        username: pending.username,
        password: pending.password,
        success: false,
      });
      asyncCallback();
      return;
    }

    findMatchingAuth(details.url).then((authInfo) => {
      if (!authInfo) {
        asyncCallback();
        return;
      }

      attemptedRequests.set(details.requestId, {
        url: details.url,
        timestamp: Date.now(),
        username: authInfo.username,
        password: authInfo.password,
        entryId: authInfo.entryId,
      });

      asyncCallback({
        authCredentials: {
          username: authInfo.username,
          password: authInfo.password,
        },
      });
    });
  },
  { urls: ['<all_urls>'] },
  ['asyncBlocking'],
);

chrome.webRequest.onCompleted.addListener(
  async (details) => {
    if (!attemptedRequests.has(details.requestId)) return;
    const pending = attemptedRequests.get(details.requestId);
    attemptedRequests.delete(details.requestId);
    await addAuthLog({
      url: pending.url,
      timestamp: pending.timestamp,
      username: pending.username,
      password: pending.password,
      success: true,
    });
    const successAt = Date.now();
    if (pending.entryId) {
      await recordLastAuthSuccess(pending.entryId, successAt);
    }
  },
  { urls: ['<all_urls>'] },
);

chrome.webRequest.onErrorOccurred.addListener(
  (details) => {
    if (attemptedRequests.has(details.requestId)) {
      const pending = attemptedRequests.get(details.requestId);
      attemptedRequests.delete(details.requestId);
      addAuthLog({
        url: pending.url,
        timestamp: pending.timestamp,
        username: pending.username,
        password: pending.password,
        success: false,
      });
    }
  },
  { urls: ['<all_urls>'] },
);
