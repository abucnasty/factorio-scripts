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
  const result = Array(segments).fill(0);

  for (let i = 0; i < total; i++) {
    const index = Math.floor(i * segments / total);
    result[index]++;
  }

  return result;
}