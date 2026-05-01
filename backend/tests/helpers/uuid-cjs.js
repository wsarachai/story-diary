/**
 * CJS-compatible shim for uuid used only in the test environment.
 * Generates deterministic unique IDs without ESM overhead.
 */
let counter = 0;

exports.v4 = function v4() {
  return `test-uuid-${Date.now()}-${++counter}`;
};
