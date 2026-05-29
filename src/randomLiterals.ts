import { createSeededRng, type SeededRng } from "./pipeline/random.js";

export interface RandomLiteralFactory {
  number(min?: number, max?: number): number;
  string(length?: number): string;
  boolean(): boolean;
  fakeUrl(): string;
  fakeKey(): string;
}

export function createRandomLiteralFactory(seed?: string): RandomLiteralFactory {
  const rng = createSeededRng(seed);
  return {
    number(min = 0, max = 1_000_000) {
      return rng.int(min, max);
    },
    string(length = rng.int(8, 32)) {
      return randomString(rng, length);
    },
    boolean() {
      return rng.int(0, 1) === 1;
    },
    fakeUrl() {
      return `https://${randomString(rng, 8)}.invalid/${randomString(rng, 12)}`;
    },
    fakeKey() {
      return `${randomString(rng, 5)}-${randomString(rng, 5)}-${randomString(rng, 5)}`.toUpperCase();
    },
  };
}

function randomString(rng: SeededRng, length: number): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length }, () => chars.charAt(rng.int(0, chars.length - 1))).join("");
}
