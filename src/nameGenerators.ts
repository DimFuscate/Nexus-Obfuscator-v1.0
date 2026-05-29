import { createSeededRng, randomIdentifier, type SeededRng } from "./pipeline/random.js";

export type NameGeneratorStyle = "confusing" | "hex" | "numeric" | "mangled" | "shuffled";

export interface NameGenerator {
  next(): string;
  reserve(name: string): void;
}

export function createNameGenerator(style: NameGeneratorStyle, seed?: string): NameGenerator {
  const rng = createSeededRng(seed);
  const used = new Set<string>();
  return {
    next() {
      let name = "";
      do {
        name = generateName(style, rng);
      } while (used.has(name));
      used.add(name);
      return name;
    },
    reserve(name: string) {
      used.add(name);
    },
  };
}

export function generateName(style: NameGeneratorStyle, rng: SeededRng): string {
  if (style === "confusing") {
    const chars = "lI1O0";
    return `_${Array.from({ length: rng.int(10, 18) }, () => chars.charAt(rng.int(0, chars.length - 1))).join("")}`;
  }
  if (style === "hex") {
    return `_0x${rng.int(0x10000000, 0x7fffffff).toString(16)}`;
  }
  if (style === "numeric") {
    return `_${rng.int(10_000_000, 999_999_999)}`;
  }
  if (style === "shuffled") {
    return shuffleIdentifier(randomIdentifier(rng, rng.int(8, 16)), rng);
  }
  return randomIdentifier(rng, rng.int(10, 18));
}

function shuffleIdentifier(value: string, rng: SeededRng): string {
  const chars = [...value];
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = rng.int(0, i);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}
