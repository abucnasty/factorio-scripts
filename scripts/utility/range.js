/**
 * 
 * @param {number} start_inclusive 
 * @param {number} end_inclusive 
 * @returns 
 */
export function createRange(start_inclusive, end_inclusive) {
    return {
        start_inclusive,
        end_inclusive
    }
}

export function distributeEvenly(total, segments) {
  const base = Math.floor(total / segments);
  const remainder = total % segments;
  const result = [];

  for (let i = 0; i < segments; i++) {
    result.push(i < remainder ? base + 1 : base);
  }

  return result;
}