import type { IROpcode } from "./opcodeSpec.js";

export interface IRInstruction {
  op: IROpcode;
  a?: number;
  b?: number;
  c?: number;
  value?: unknown;
}

export interface IRFunction {
  params: string[];
  constants: unknown[];
  instructions: IRInstruction[];
  vararg: boolean;
}

export function compileFunctionToIR(_functionNode: unknown): IRFunction {
  return {
    params: [],
    constants: [],
    instructions: [{ op: "RETURN", a: 0, b: 0 }],
    vararg: true,
  };
}
