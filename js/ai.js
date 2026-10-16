// The one place where live AI help could plug in later.
//
// Version 1 has no back-end and holds no API key (a key in a public static site could be
// copied by anyone). Claude's deep analysis is done by the Chief Learning Officer from exported
// progress files instead. This module therefore reports itself unavailable, and the app hides
// every AI button while `available` is false.
//
// To add live explanations later: host a small back-end (for example a serverless function)
// that holds the key and calls Claude, then implement `explainMistake` and `analyseProgress`
// below to call that back-end with fetch(). Nothing else in the app needs to change, and the
// service worker already leaves requests to other sites alone. Never put a key in this file.

const provider = {
  available: false,
  name: 'none',
};

export function aiAvailable() {
  return provider.available;
}

/**
 * Explain one wrong answer in child-friendly words.
 * @param {{question: object, response: any, responseText: string}} _input
 * @returns {Promise<string|null>} the explanation, or null when no AI is connected
 */
export async function explainMistake(_input) {
  return null;
}

/**
 * Write a parent-facing analysis from progress data (the same shape as the export file).
 * @param {object} _progress
 * @returns {Promise<string|null>}
 */
export async function analyseProgress(_progress) {
  return null;
}
