// Random có seed: cùng seed thì ra cùng dãy số trên mọi máy (cần cho chơi nhiều người).

export interface Rng {
  /** Số thực trong [0, 1). */
  next(): number;
  /** Số nguyên trong [min, max] (tính cả hai đầu). */
  int(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  chance(probability: number): boolean;
  /** Chọn theo trọng số, trả về chỉ số. */
  weighted(weights: readonly number[]): number;
}

/** Thuật toán mulberry32: nhỏ, nhanh, đủ tốt cho game. */
export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    pick: (items) => {
      if (items.length === 0) throw new Error('pick: mảng rỗng');
      return items[Math.floor(next() * items.length)];
    },
    chance: (probability) => next() < probability,
    weighted: (weights) => {
      const total = weights.reduce((s, w) => s + w, 0);
      let r = next() * total;
      for (let i = 0; i < weights.length; i++) {
        r -= weights[i];
        if (r < 0) return i;
      }
      return weights.length - 1;
    },
  };
}

/** Trộn nhiều số thành một seed mới (ví dụ seed ngày + số thứ tự khách). */
export function hashSeed(...parts: number[]): number {
  let h = 2166136261 >>> 0;
  for (const part of parts) {
    h ^= part >>> 0;
    h = Math.imul(h, 16777619) >>> 0;
    h ^= h >>> 13;
  }
  return h >>> 0;
}
