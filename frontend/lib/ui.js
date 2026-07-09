/**
 * Shared UI helpers — single source of truth for:
 *   - Avatar gradient palette
 *   - getAvatarBg(username) → CSS gradient string
 *   - timeAgo(date) → relative time string
 *
 * Import from here instead of copy-pasting into every component.
 */

export const avatarGradients = [
  "linear-gradient(135deg,#ff4500,#ff6534)",
  "linear-gradient(135deg,#4f8cff,#9b6cff)",
  "linear-gradient(135deg,#10d48e,#14b8a6)",
  "linear-gradient(135deg,#fb4785,#f5a623)",
  "linear-gradient(135deg,#9b6cff,#4f8cff)",
  "linear-gradient(135deg,#f5a623,#ff4500)",
  "linear-gradient(135deg,#22d3ee,#4f8cff)",
  "linear-gradient(135deg,#2ecc71,#10d48e)",
];

/**
 * Deterministic avatar background gradient derived from a username string.
 * Consistent across all re-renders and across components.
 */
export function getAvatarBg(username) {
  const i =
    (username || "").split("").reduce((a, c) => a + c.charCodeAt(0), 0) ?? 0;
  return avatarGradients[i % avatarGradients.length];
}

/**
 * Relative time string.
 * @param {string|Date} date
 * @returns {string}  e.g. "now", "5m", "2h", "Jul 4"
 */
export function timeAgo(date) {
  if (!date) return "";
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return "now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}
