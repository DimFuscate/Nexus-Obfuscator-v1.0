import { createSeededRng, randomOpcodeMap, type SeededRng } from "../pipeline/random.js";
import { IR_OPCODES, type IROpcode, type OpcodeSpec } from "./opcodeSpec.js";

export function randomizeOpcodeMap(seedOrRng?: string | SeededRng): OpcodeSpec {
  const rng = typeof seedOrRng === "object" && seedOrRng !== null ? seedOrRng : createSeededRng(seedOrRng);
  return {
    map: randomOpcodeMap(IR_OPCODES, rng) as Record<IROpcode, number>,
    fakeOpcodes: Array.from({ length: 8 }, () => rng.int(241, 4095)),
    dispatchStyle: rng.pick(["if-chain", "table"] as const),
  };
}
