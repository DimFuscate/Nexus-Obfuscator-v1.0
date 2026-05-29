import type { VMInstruction } from "../vm/bytecode.js";

export function flattenInstructions(blocks: Array<{ instructions: VMInstruction[] }>): VMInstruction[] {
  return blocks.flatMap((block) => block.instructions);
}

export function countInstructions(instructions: VMInstruction[]): number {
  return instructions.length;
}
