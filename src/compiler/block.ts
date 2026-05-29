import type { VMInstruction } from "../vm/bytecode.js";

export interface CompileBlock {
  id: number;
  instructions: VMInstruction[];
}

export function createBlock(id: number): CompileBlock {
  return { id, instructions: [] };
}

export function shuffleBlocks(blocks: CompileBlock[], seed: number): CompileBlock[] {
  const out = [...blocks];
  let state = seed || 1;
  for (let i = out.length - 1; i > 0; i -= 1) {
    state = Math.imul(state ^ 0x9e3779b9, 1664525) >>> 0;
    const j = state % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
