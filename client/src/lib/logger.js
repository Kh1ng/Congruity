/* eslint-disable no-console */
export function devLog(...args) {
  if (import.meta.env.DEV) {
    console.log(...args);
  }
}

export function devWarn(...args) {
  if (import.meta.env.DEV) {
    console.warn(...args);
  }
}

export function appError(...args) {
  console.error(...args);
}

