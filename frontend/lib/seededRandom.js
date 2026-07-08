/** Deterministic 0–1 float from index (stable across SSR + client). */
export function seededUnit(index, salt = 0) {
  const x = Math.sin((index + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}
