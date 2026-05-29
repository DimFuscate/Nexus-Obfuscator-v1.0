import type { IRFunction, IRInstruction } from "./ir.js";
import type { OpcodeSpec } from "./opcodeSpec.js";

export interface VMInstruction {
  op: number;
  a?: number;
  b?: number;
  c?: number;
}

export interface VMChunk {
  c: VMInstruction[];
  k: unknown[];
  u: string[];
}

export function lowerIRToCustomBytecode(ir: IRFunction, vmSpec: OpcodeSpec): VMChunk {
  return {
    c: ir.instructions.map((ins) => encodeInstruction(ins, vmSpec)),
    k: ir.constants,
    u: [],
  };
}

export function packVMChunk(bytecode: VMInstruction[], constants: unknown[], upvalues: string[] = []): VMChunk {
  return { c: bytecode, k: constants, u: upvalues };
}

function encodeInstruction(ins: IRInstruction, vmSpec: OpcodeSpec): VMInstruction {
  return {
    op: vmSpec.map[ins.op],
    a: ins.a,
    b: ins.b,
    c: ins.c,
  };
}
