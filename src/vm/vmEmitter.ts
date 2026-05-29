import type { ProgramNode } from "../parser/astTypes.js";
import type { ObfuscationOptions } from "../pipeline/config.js";
import { compileFunctionToIR } from "./ir.js";
import { lowerIRToCustomBytecode, type VMChunk } from "./bytecode.js";
import { randomizeOpcodeMap } from "./opcodeRandomizer.js";
import { generateVMInterpreter } from "./vmRuntimeTemplate.js";

export function virtualizeFunctions(ast: ProgramNode, options: ObfuscationOptions): VMChunk[] {
  const selected = selectFunctionsForVirtualization(ast, options.virtualizeFunctions);
  ast.metadata ??= {};
  ast.metadata.virtualizationCandidates = selected.length;
  const spec = randomizeOpcodeMap(options.seed);
  return selected.map((node) => lowerIRToCustomBytecode(compileFunctionToIR(node), spec));
}

export function virtualizeSelectedFunctions(ast: ProgramNode, options: ObfuscationOptions): VMChunk[] {
  return virtualizeFunctions(ast, options);
}

export function selectFunctionsForVirtualization(ast: ProgramNode, policy: ObfuscationOptions["virtualizeFunctions"]): unknown[] {
  if (!policy) {
    return [];
  }
  const hotCallbacks = Number(ast.metadata?.hotCallbacks ?? 0);
  const functionCount = ast.tokens.filter((token) => token.value === "function").length;
  const safeCount = Math.max(0, functionCount - hotCallbacks);
  const selectedCount = policy === "selected" ? Math.min(1, safeCount) : safeCount;
  return Array.from({ length: selectedCount }, (_, index) => ({ index }));
}

export function generateVMRuntime(options: ObfuscationOptions): string {
  return generateVMInterpreter(randomizeOpcodeMap(options.seed));
}

export function replaceFunctionWithVMThunk<T>(functionNode: T, _vmChunk: VMChunk): T {
  return functionNode;
}
