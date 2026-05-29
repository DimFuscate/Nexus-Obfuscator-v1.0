export interface SeededRng {
  next(): number;
  int(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  fork(label: string): SeededRng;
}

export function hashSeed(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function createSeededRng(seed = `${Date.now()}:${Math.random()}`): SeededRng {
  let state = hashSeed(seed) || 0x9e3779b9;
  const rng: SeededRng = {
    next(): number {
      state += 0x6d2b79f5;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    },
    int(min: number, max: number): number {
      return Math.floor(rng.next() * (max - min + 1)) + min;
    },
    pick<T>(items: readonly T[]): T {
      if (items.length === 0) {
        throw new Error("Cannot pick from an empty array");
      }
      return items[rng.int(0, items.length - 1)];
    },
    fork(label: string): SeededRng {
      return createSeededRng(`${state}:${label}`);
    },
  };
  return rng;
}

export function createMutationEngine(seed?: string): SeededRng {
  return createSeededRng(seed);
}

export function randomIdentifier(rng: SeededRng, length = 8): string {
  const first = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_";
  const rest = `${first}0123456789`;
  let out = first.charAt(rng.int(0, first.length - 1));
  for (let i = 1; i < length; i += 1) {
    out += rest.charAt(rng.int(0, rest.length - 1));
  }
  return out;
}

export function randomOpcodeMap(opcodes: readonly string[], rng: SeededRng): Record<string, number> {
  const ids = new Set<number>();
  const map: Record<string, number> = {};
  for (const opcode of opcodes) {
    let id = rng.int(17, 240);
    while (ids.has(id)) {
      id = rng.int(17, 240);
    }
    ids.add(id);
    map[opcode] = id;
  }
  return map;
}

export function randomStateIds(count: number, rng: SeededRng): number[] {
  const values = new Set<number>();
  while (values.size < count) {
    values.add(rng.int(10000, 99999));
  }
  return [...values];
}

export function randomStringKeys(count: number, rng: SeededRng): number[] {
  return Array.from({ length: count }, () => rng.int(1, 255));
}

export function randomDecryptorLayout(rng: SeededRng): "array" | "closure" | "split" {
  return rng.pick(["array", "closure", "split"] as const);
}

export function randomVMDispatchStyle(rng: SeededRng): "if-chain" | "table" {
  return rng.pick(["if-chain", "table"] as const);
}

export function randomDeadCodeLayout(rng: SeededRng): "branch" | "function" | "table" {
  return rng.pick(["branch", "function", "table"] as const);
}

export function randomTableLayout(rng: SeededRng): "plain" | "shuffled" | "computed" {
  return rng.pick(["plain", "shuffled", "computed"] as const);
}

export function randomWatermarkLayout(rng: SeededRng): "identifier" | "constant" | "chunk-order" {
  return rng.pick(["identifier", "constant", "chunk-order"] as const);
}

export function generateUniqueBuild(source: string, seed?: string): string {
  return hashSeed(`${seed ?? ""}:${source}:${Date.now()}:${Math.random()}`).toString(16);
}
