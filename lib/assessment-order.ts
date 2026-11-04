export function shuffleForAssessment<T>(items: readonly T[], assessmentId: string): T[] {
  const shuffled = [...items];
  let seed = 2166136261;

  for (let index = 0; index < assessmentId.length; index += 1) {
    seed = Math.imul(seed ^ assessmentId.charCodeAt(index), 16777619);
  }

  let state = seed || 0x6d2b79f5;
  const random = () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}
