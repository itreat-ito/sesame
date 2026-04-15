// Toast notification utility
import Toastify from 'toastify-js';
import 'toastify-js/src/toastify.css';

const DEFAULT_OFFSET = { x: 16, y: 16 };

function toastOffset(options = {}) {
  return {
    x: options.offsetX ?? DEFAULT_OFFSET.x,
    y: options.offsetY ?? options.offsetTop ?? DEFAULT_OFFSET.y,
  };
}

const baseChrome = {
  fontSize: '.9rem',
  fontWeight: '700',
  borderRadius: '4px',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
};

/**
 * Show a success toast notification
 * @param {string} message - The message to display
 * @param {Object} [options] - Optional. e.g. { duration, offsetTop, offsetX, offsetY }
 */
export function showSuccessToast(message, options = {}) {
  Toastify({
    text: message,
    duration: options.duration ?? 3000,
    gravity: 'top',
    position: 'right',
    stopOnFocus: true,
    style: {
      ...baseChrome,
      background: 'linear-gradient(to right, #fd79ae, #ffa17d)',
    },
    offset: toastOffset(options),
  }).showToast();
}

/**
 * Show an error toast notification
 * @param {string} message - The message to display
 * @param {Object} [options] - Optional. e.g. { duration, offsetTop }
 */
export function showErrorToast(message, options = {}) {
  Toastify({
    text: message,
    duration: options.duration ?? 4000,
    gravity: 'top',
    position: 'right',
    stopOnFocus: true,
    style: {
      ...baseChrome,
      background: 'linear-gradient(to right, #f44336, #d32f2f)',
    },
    offset: toastOffset(options),
  }).showToast();
}

/**
 * Show an info toast notification
 * @param {string} message - The message to display
 * @param {Object} [options] - Optional. e.g. { duration, offsetTop }
 */
export function showInfoToast(message, options = {}) {
  Toastify({
    text: message,
    duration: options.duration ?? 3000,
    gravity: 'top',
    position: 'right',
    stopOnFocus: true,
    style: {
      ...baseChrome,
      background: 'linear-gradient(to right, #3498db, #2980b9)',
    },
    offset: toastOffset(options),
  }).showToast();
}

/**
 * Muted / secondary info (e.g. nothing to export)
 * @param {string} message
 * @param {Object} [options] - Optional. e.g. { duration, offsetTop }
 */
export function showMutedToast(message, options = {}) {
  Toastify({
    text: message,
    duration: options.duration ?? 3000,
    gravity: 'top',
    position: 'right',
    stopOnFocus: true,
    style: {
      ...baseChrome,
      background: '#718197',
    },
    offset: toastOffset(options),
  }).showToast();
}
